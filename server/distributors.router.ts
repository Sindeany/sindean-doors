/**
 * Distributors Router — بوابة الموزّع
 * تسجيل الدخول، تسجيل الخروج، الملف الشخصي
 * Batch 3-b: استبدال mock auth بمصادقة حقيقية server-side (httpOnly cookies + bcrypt)
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { db, schema } from "./db.js";
import { eq, and, gt } from "drizzle-orm";
import { publicProcedure, distributorProcedure, router } from "./trpc.js";

const DISTRIBUTOR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "strict" : "lax") as
    | "strict"
    | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 أيام
  path: "/",
};

// ── نوع الملف الشخصي المُعاد للعميل (متوافق مع DistributorProfile في distributorData.ts) ──
function toDistributorProfile(d: typeof schema.distributors.$inferSelect) {
  return {
    id: String(d.id),
    name: d.name,
    company: d.company,
    email: d.email,
    phone: d.phone,
    city: d.city,
    tier: d.tier,
    discount: d.discountRate ?? 0,
    creditLimit: d.creditLimit ?? 0,
    // creditUsed لا يُخزَّن في DB حالياً — يُعاد كـ 0 placeholder
    creditUsed: 0,
    joinDate: d.joinDate,
    // salesRep غير موجود في DB حالياً — يُعاد كسلسلة فارغة placeholder
    salesRep: "",
    status: d.status,
  };
}

export const distributorsRouter = router({
  // ── تسجيل الدخول ────────────────────────────────────────────────────────
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 1. وجود الموزع
      const distributor = await db.query.distributors.findFirst({
        where: eq(schema.distributors.email, input.email),
      });
      if (!distributor)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "البريد أو كلمة المرور غير صحيحة",
        });

      // 2. فحص الحالة
      if (distributor.status === "suspended")
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "تم تعليق حسابك. تواصل مع الإدارة.",
        });
      if (distributor.status === "pending")
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "حسابك قيد المراجعة. سيتم إشعارك عند التفعيل.",
        });
      if (distributor.status === "rejected")
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "تم رفض طلب الانضمام. تواصل مع الإدارة.",
        });

      // 3. فحص وجود passwordHash قبل استدعاء bcrypt (لا نستدعي compare إذا كان null)
      if (!distributor.passwordHash)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "لم يُعيَّن كلمة مرور لهذا الحساب. يرجى التواصل مع الإدارة.",
        });

      // 4. التحقق من كلمة المرور
      const valid = await bcrypt.compare(
        input.password,
        distributor.passwordHash
      );
      if (!valid)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "البريد أو كلمة المرور غير صحيحة",
        });

      // 5. إنشاء جلسة
      const token = nanoid(64);
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
      await db.insert(schema.distributorSessions).values({
        distributorId: distributor.id,
        token,
        expiresAt,
        createdAt: Date.now(),
      });

      // 6. تعيين الـ cookie
      ctx.res!.cookie("distributorSession", token, DISTRIBUTOR_COOKIE_OPTIONS);

      return { distributor: toDistributorProfile(distributor) };
    }),

  // ── تسجيل الخروج ────────────────────────────────────────────────────────
  logout: distributorProcedure.mutation(async ({ ctx }) => {
    const token = ctx.distributorToken!;
    ctx.res!.clearCookie("distributorSession", { path: "/" });
    await db
      .delete(schema.distributorSessions)
      .where(eq(schema.distributorSessions.token, token));
    return { success: true };
  }),

  // ── الملف الشخصي ────────────────────────────────────────────────────────
  me: distributorProcedure.query(async ({ ctx }) => {
    const distributor = (ctx as any)
      .distributor as typeof schema.distributors.$inferSelect;
    return toDistributorProfile(distributor);
  }),
});
