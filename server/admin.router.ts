/**
 * Admin Auth Router — تسجيل الدخول والخروج للمدير
 */
import { TRPCError } from "@trpc/server";
import { timingSafeEqual } from "crypto";
import { z } from "zod/v4";
import bcrypt from "bcryptjs";
import { router, publicProcedure, adminProcedure } from "./trpc.js";
import { createAdminSession, deleteAdminSession } from "./admin-sessions.js";

const COOKIE_NAME = "adminSession";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "strict" : "lax") as
    | "strict"
    | "lax",
  maxAge: 8 * 60 * 60 * 1000, // 8 hours in ms
  path: "/",
};

/** Constant-time string comparison to prevent timing attacks */
function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Run comparison anyway to avoid leaking length via timing
    timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export const adminAuthRouter = router({
  // تسجيل دخول المدير
  // Supports ADMIN_PASSWORD_HASH (bcrypt) or ADMIN_INTERNAL_KEY (plaintext fallback)
  login: publicProcedure
    .input(z.object({ password: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const passwordHash = process.env.ADMIN_PASSWORD_HASH;
      const internalKey = process.env.ADMIN_INTERNAL_KEY;

      let valid = false;
      if (passwordHash) {
        valid = await bcrypt.compare(input.password, passwordHash);
      } else if (internalKey) {
        valid = timingSafeStringEqual(input.password, internalKey);
      } else {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "لم يتم إعداد كلمة مرور المدير في بيئة الخادم",
        });
      }

      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "كلمة المرور غير صحيحة",
        });
      }

      const token = await createAdminSession();
      ctx.res?.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
      return { success: true };
    }),

  // التحقق من صحة الجلسة الحالية
  verify: adminProcedure.query(() => {
    return { valid: true };
  }),

  // تسجيل الخروج
  logout: adminProcedure.mutation(async ({ ctx }) => {
    if (ctx.adminToken) await deleteAdminSession(ctx.adminToken);
    ctx.res?.clearCookie(COOKIE_NAME, { path: "/" });
    return { success: true };
  }),
});
