/**
 * Suppliers Router — إدارة الموردين
 * تسجيل، تسجيل دخول، إدارة الملف الشخصي
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { db, schema } from "./db.js";
import { eq, and, gt } from "drizzle-orm";
import {
  publicProcedure,
  adminProcedure,
  supplierProcedure,
  router,
} from "./trpc.js";

// ── supplierProcedure is centralized in server/trpc.ts (Batch 2) ─────────────
const SUPPLIER_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "strict" : "lax") as
    | "strict"
    | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

// ── Router ───────────────────────────────────────────────────────────────────
export const suppliersRouter = router({
  // ── تسجيل مورد جديد ─────────────────────────────────────────────────────
  register: publicProcedure
    .input(
      z.object({
        companyName: z.string().min(2, "اسم الشركة مطلوب"),
        contactName: z.string().min(2, "اسم المسؤول مطلوب"),
        email: z.string().email("بريد إلكتروني غير صحيح"),
        phone: z.string().min(9, "رقم الجوال مطلوب"),
        password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
        city: z.string().optional(),
        address: z.string().optional(),
        website: z.string().optional(),
        categories: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // التحقق من عدم تكرار البريد
      const existing = await db.query.suppliers.findFirst({
        where: eq(schema.suppliers.email, input.email),
      });
      if (existing)
        throw new TRPCError({
          code: "CONFLICT",
          message: "البريد الإلكتروني مسجل مسبقاً",
        });

      const passwordHash = await bcrypt.hash(input.password, 10);
      const now = Date.now();
      const [result] = await db.insert(schema.suppliers).values({
        companyName: input.companyName,
        contactName: input.contactName,
        email: input.email,
        phone: input.phone,
        passwordHash,
        city: input.city || null,
        address: input.address || null,
        website: input.website || null,
        categories: input.categories || [],
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
      const supplierId = (result as any).insertId;

      // إشعار الإدارة
      notifyOwnerAboutNewSupplier(
        input.companyName,
        input.contactName,
        input.email
      );

      return {
        success: true,
        supplierId,
        message: "تم التسجيل بنجاح. سيتم مراجعة طلبك وتفعيل حسابك قريباً.",
      };
    }),

  // ── تسجيل الدخول ────────────────────────────────────────────────────────
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const supplier = await db.query.suppliers.findFirst({
        where: eq(schema.suppliers.email, input.email),
      });
      if (!supplier)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "البريد أو كلمة المرور غير صحيحة",
        });
      if (supplier.status === "suspended")
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "تم تعليق حسابك. تواصل مع الإدارة.",
        });
      if (supplier.status === "pending")
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "حسابك قيد المراجعة. سيتم إشعارك عند التفعيل.",
        });

      const valid = await bcrypt.compare(input.password, supplier.passwordHash);
      if (!valid)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "البريد أو كلمة المرور غير صحيحة",
        });

      // إنشاء جلسة
      const token = nanoid(64);
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 أيام
      await db.insert(schema.supplierSessions).values({
        supplierId: supplier.id,
        token,
        expiresAt,
        createdAt: Date.now(),
      });

      const { passwordHash: _, ...safeSupplier } = supplier;
      ctx.res!.cookie("supplierSession", token, SUPPLIER_COOKIE_OPTIONS);
      return { supplier: safeSupplier };
    }),

  // ── تسجيل الخروج ────────────────────────────────────────────────────────
  logout: supplierProcedure.mutation(async ({ ctx }) => {
    const token = ctx.supplierToken!;
    ctx.res!.clearCookie("supplierSession", { path: "/" });
    await db
      .delete(schema.supplierSessions)
      .where(eq(schema.supplierSessions.token, token));
    return { success: true };
  }),

  // ── الملف الشخصي ────────────────────────────────────────────────────────
  me: supplierProcedure.query(async ({ ctx }) => {
    const { passwordHash: _, ...safe } = (ctx as any).supplier;
    return safe;
  }),

  // ── تحديث الملف الشخصي ──────────────────────────────────────────────────
  updateProfile: supplierProcedure
    .input(
      z.object({
        contactName: z.string().min(2).optional(),
        phone: z.string().min(9).optional(),
        city: z.string().optional(),
        address: z.string().optional(),
        website: z.string().optional(),
        categories: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supplier = (ctx as any).supplier;
      await db
        .update(schema.suppliers)
        .set({ ...input, updatedAt: Date.now() })
        .where(eq(schema.suppliers.id, supplier.id));
      return { success: true };
    }),

  // ── قائمة الموردين (للإدارة فقط) ───────────────────────────────────────
  list: adminProcedure
    .input(
      z
        .object({
          status: z.enum(["pending", "active", "suspended"]).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const suppliers = await db.query.suppliers.findMany({
        orderBy: (s, { desc }) => [desc(s.createdAt)],
        where: input?.status
          ? eq(schema.suppliers.status, input.status)
          : undefined,
      });
      return suppliers.map(({ passwordHash: _, ...s }) => s);
    }),

  // ── تفعيل/تعليق مورد (للإدارة فقط) ───────────────────────────────────────
  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "active", "suspended"]),
        adminNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(schema.suppliers)
        .set({
          status: input.status,
          adminNotes: input.adminNotes || null,
          updatedAt: Date.now(),
        })
        .where(eq(schema.suppliers.id, input.id));
      return { success: true };
    }),

  // ── الدعوات المرسلة للمورد ──────────────────────────────────────────────
  myInvitations: supplierProcedure.query(async ({ ctx }) => {
    const supplier = (ctx as any).supplier;
    const invitations = await db.query.rfqInvitations.findMany({
      where: eq(schema.rfqInvitations.supplierId, supplier.id),
      orderBy: (inv, { desc }) => [desc(inv.sentAt)],
    });
    // جلب بيانات الـ RFQ لكل دعوة
    const result = await Promise.all(
      invitations.map(async inv => {
        const rfq = await db.query.rfqs.findFirst({
          where: eq(schema.rfqs.id, inv.rfqId),
        });
        return { ...inv, rfq };
      })
    );
    return result;
  }),

  // ── عروض الأسعار المقدمة من المورد ─────────────────────────────────────
  myQuotes: supplierProcedure.query(async ({ ctx }) => {
    const supplier = (ctx as any).supplier;
    const quotes = await db.query.supplierQuotes.findMany({
      where: eq(schema.supplierQuotes.supplierId, supplier.id),
      orderBy: (q, { desc }) => [desc(q.createdAt)],
    });
    const result = await Promise.all(
      quotes.map(async q => {
        const rfq = await db.query.rfqs.findFirst({
          where: eq(schema.rfqs.id, q.rfqId),
        });
        return { ...q, rfq };
      })
    );
    return result;
  }),

  // ── أوامر الشراء الخاصة بالمورد ─────────────────────────────────────────
  myPurchaseOrders: supplierProcedure.query(async ({ ctx }) => {
    const supplier = (ctx as any).supplier;
    return db.query.purchaseOrders.findMany({
      where: eq(schema.purchaseOrders.supplierId, supplier.id),
      orderBy: (po, { desc }) => [desc(po.createdAt)],
    });
  }),

  // ── تأكيد أمر الشراء من المورد ──────────────────────────────────────────
  confirmPurchaseOrder: supplierProcedure
    .input(z.object({ poId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const supplier = (ctx as any).supplier;
      const po = await db.query.purchaseOrders.findFirst({
        where: and(
          eq(schema.purchaseOrders.id, input.poId),
          eq(schema.purchaseOrders.supplierId, supplier.id)
        ),
      });
      if (!po) throw new TRPCError({ code: "NOT_FOUND" });
      await db
        .update(schema.purchaseOrders)
        .set({
          status: "confirmed",
          confirmedAt: Date.now(),
          updatedAt: Date.now(),
        })
        .where(eq(schema.purchaseOrders.id, input.poId));
      return { success: true };
    }),
});

// ── Helper ───────────────────────────────────────────────────────────────────
async function notifyOwnerAboutNewSupplier(
  company: string,
  contact: string,
  email: string
) {
  const apiUrl = process.env.BUILT_IN_FORGE_API_URL;
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  if (!apiUrl || !apiKey || !ownerOpenId) return;
  try {
    await fetch(`${apiUrl}/v1/notification/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        open_id: ownerOpenId,
        title: `🏭 مورد جديد يطلب التسجيل — ${company}`,
        content: `الشركة: ${company}\nالمسؤول: ${contact}\nالبريد: ${email}\n\nيرجى مراجعة الطلب وتفعيل الحساب من لوحة التحكم.`,
      }),
    });
  } catch {
    /* non-blocking */
  }
}
