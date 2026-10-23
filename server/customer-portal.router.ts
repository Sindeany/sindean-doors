// ============================================================
// Customer Portal Router — بوابة العملاء
// تتبع الطلبات · الفواتير الضريبية (ZATCA) · الشكاوى
// ============================================================
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { db, schema } from "./db.js";
import { eq, and, gt } from "drizzle-orm";
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

/**
 * door_orders has no customer user id, and registration does not prove
 * control of an email address. Email equality is not ownership.
 * Order, invoice, and complaint reads stay closed until a later verified link.
 */
const CUSTOMER_RECORD_FORBIDDEN = "غير مصرح";

type CustomerOrderRow = typeof schema.doorOrders.$inferSelect;
type CustomerComplaintRow = typeof schema.complaints.$inferSelect & {
  messages: Array<typeof schema.complaintMessages.$inferSelect>;
};
type CustomerInvoiceRow = {
  id: number;
  invoiceNumber: string;
  issueDate: string;
  issueTime: string;
  buyerName: string;
  buyerPhone: string | null;
  sellerName: string;
  sellerVatNumber: string;
  lineItems: unknown;
  subtotalHalala: number;
  vatAmountHalala: number;
  totalHalala: number;
  vatRate: number;
  qrCodeData: string | null;
  invoiceHash: string | null;
  status: string;
  zatcaStatus: string | null;
};

function customerRecordsClosed(): never {
  throw new TRPCError({ code: "FORBIDDEN", message: CUSTOMER_RECORD_FORBIDDEN });
}

// ── Router ───────────────────────────────────────────────────────────────────
export const customerPortalRouter = router({
  // No verified account-to-order link exists. Do not match customer_email.
  myOrders: userProcedure.query(async (): Promise<CustomerOrderRow[]> => {
    return [];
  }),

  // Same refusal for every id. The body does not say whether an order exists.
  orderInvoice: userProcedure
    .input(z.object({ orderId: z.number().int().positive() }))
    .query(async (): Promise<CustomerInvoiceRow | null> => {
      customerRecordsClosed();
    }),

  // Complaints are stored against an email string, not a user id.
  myComplaints: userProcedure.query(async (): Promise<CustomerComplaintRow[]> => {
    return [];
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

  // Disabled until Phase 16. Phone or email is not authentication, and
  // door_orders has no reliable customer user id yet.
  trackOrder: publicProcedure
    .input(
      z.object({
        identifier: z
          .string()
          .min(3, "يرجى إدخال رقم الجوال أو البريد الإلكتروني"),
      })
    )
    .query(() => {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "غير مصرح",
      });
    }),
});
