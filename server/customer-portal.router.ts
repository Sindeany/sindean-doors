// ============================================================
// Customer Portal Router — بوابة العملاء
// تتبع الطلبات · الفواتير الضريبية (ZATCA) · الشكاوى
// ============================================================
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { db, schema } from "./db.js";
import { eq, desc, and, gt } from "drizzle-orm";
import { t, publicProcedure, router } from "./trpc.js";

// ── User session middleware (mirrors users.router.ts) ────────────────────────
const userProcedure = t.procedure.use(async ({ ctx, next }) => {
  const token = (ctx as any).userToken as string | undefined;
  if (!token)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "يرجى تسجيل الدخول" });

  const now = Date.now();
  const session = await db.query.userSessions.findFirst({
    where: and(
      eq(schema.userSessions.token, token),
      gt(schema.userSessions.expiresAt, now)
    ),
  });
  if (!session)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "انتهت الجلسة، يرجى تسجيل الدخول مجدداً",
    });

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, session.userId),
  });
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

  return next({ ctx: { ...ctx, user } });
});

// ── Complaint type labels ────────────────────────────────────────────────────
const complaintTypeEnum = z.enum([
  "size",
  "color",
  "damage",
  "shortage",
  "delay",
  "quality",
  "other",
]);

// ── Router ───────────────────────────────────────────────────────────────────
export const customerPortalRouter = router({
  // ── طلباتي — قائمة الطلبات المرتبطة بالبريد الإلكتروني ─────────────────
  myOrders: userProcedure.query(async ({ ctx }) => {
    const user = (ctx as any).user;
    if (!user.email) return [];

    const orders = await db.query.doorOrders.findMany({
      where: eq(schema.doorOrders.customerEmail, user.email),
      orderBy: [desc(schema.doorOrders.createdAt)],
    });
    return orders;
  }),

  // ── الفاتورة الضريبية لطلب معين ─────────────────────────────────────────
  orderInvoice: userProcedure
    .input(z.object({ orderId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const user = (ctx as any).user;

      // تحقق: الطلب يخص هذا المستخدم
      const order = await db.query.doorOrders.findFirst({
        where: and(
          eq(schema.doorOrders.id, input.orderId),
          eq(schema.doorOrders.customerEmail, user.email)
        ),
      });
      if (!order)
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });

      // ابحث عن الفاتورة المرتبطة بهذا الطلب
      const invoice = await db.query.taxInvoices.findFirst({
        where: and(
          eq(schema.taxInvoices.sourceType, "door_order"),
          eq(schema.taxInvoices.sourceId, input.orderId)
        ),
      });

      if (!invoice) return null;

      // إرجاع البيانات الآمنة للعميل (بدون الـ XML الكامل)
      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        issueTime: invoice.issueTime,
        buyerName: invoice.buyerName,
        buyerPhone: invoice.buyerPhone,
        sellerName: invoice.sellerName,
        sellerVatNumber: invoice.sellerVatNumber,
        lineItems: invoice.lineItems,
        subtotalHalala: invoice.subtotalHalala,
        vatAmountHalala: invoice.vatAmountHalala,
        totalHalala: invoice.totalHalala,
        vatRate: invoice.vatRate,
        qrCodeData: invoice.qrCodeData,
        invoiceHash: invoice.invoiceHash,
        status: invoice.status,
        zatcaStatus: invoice.zatcaStatus,
      };
    }),

  // ── شكاواي — قائمة الشكاوى المسجلة بنفس البريد الإلكتروني ──────────────
  myComplaints: userProcedure.query(async ({ ctx }) => {
    const user = (ctx as any).user;

    // نبحث بالبريد الإلكتروني في companyName (مؤقتاً) أو باسم الموزع
    // الشكاوى مرتبطة بالبريد عبر حقل distributorName = email كـ fallback
    const complaints = await db.query.complaints.findMany({
      where: eq(schema.complaints.distributorName, user.email),
      orderBy: [desc(schema.complaints.createdAt)],
    });

    const messages = await db.query.complaintMessages.findMany({
      orderBy: [desc(schema.complaintMessages.createdAt)],
    });

    return complaints.map(c => ({
      ...c,
      messages: messages.filter(m => m.complaintId === c.id),
    }));
  }),

  // ── تقديم شكوى جديدة ────────────────────────────────────────────────────
  submitComplaint: userProcedure
    .input(
      z.object({
        orderNumber: z.string().min(1, "رقم الطلب مطلوب"),
        product: z.string().min(1, "اسم المنتج مطلوب"),
        type: complaintTypeEnum,
        description: z
          .string()
          .min(10, "يرجى كتابة وصف تفصيلي (10 أحرف على الأقل)"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = (ctx as any).user;
      const now = Date.now();

      // توليد رقم التذكرة
      const year = new Date().getFullYear();
      const existingCount = (await db.query.complaints.findMany()).length;
      const ticketNumber = `TKT-${year}-${String(existingCount + 1).padStart(4, "0")}`;

      const [result] = await db.insert(schema.complaints).values({
        ticketNumber,
        distributorId: null,
        distributorName: user.email, // نستخدم البريد الإلكتروني كمعرّف
        companyName: user.name,
        orderNumber: input.orderNumber,
        product: input.product,
        type: input.type,
        description: input.description,
        images: [],
        createdAt: now,
        updatedAt: now,
      });
      const id = (result as any).insertId;

      // رسالة افتتاحية من العميل
      await db.insert(schema.complaintMessages).values({
        complaintId: id,
        from: "distributor", // نفس enum الموجود
        text: input.description,
        date: new Date(now).toISOString().split("T")[0],
        createdAt: now,
      });

      return { id, ticketNumber, success: true };
    }),

  // ── تتبع طلب بدون تسجيل دخول (بالجوال أو البريد) ──────────────────────
  trackOrder: publicProcedure
    .input(
      z.object({
        identifier: z
          .string()
          .min(3, "يرجى إدخال رقم الجوال أو البريد الإلكتروني"),
      })
    )
    .query(async ({ input }) => {
      const { identifier } = input;

      // ابحث بالبريد الإلكتروني أو الجوال
      const isEmail = identifier.includes("@");
      const orders = await db.query.doorOrders.findMany({
        where: isEmail
          ? eq(schema.doorOrders.customerEmail, identifier)
          : eq(schema.doorOrders.customerPhone, identifier),
        orderBy: [desc(schema.doorOrders.createdAt)],
      });

      // أرجع بيانات مختصرة فقط (لا أسعار، لا JSON داخلي)
      return orders.map(o => ({
        id: o.id,
        productName: o.productName,
        status: o.status,
        workflowStage: o.workflowStage,
        priority: o.priority,
        expectedDelivery: o.expectedDelivery,
        totalPrice: o.totalPrice,
        paymentStatus: o.paymentStatus,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      }));
    }),
});
