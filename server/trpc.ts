/**
 * Shared tRPC instance — instance مشترك لجميع الـ routers
 * يحل مشكلة تعدد initTRPC.create() في الروترات المنفصلة
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { validateAdminSession } from "./admin-sessions.js";
import type { Response } from "express";

export interface Context {
  supplierToken?: string;
  adminToken?: string;
  userToken?: string;
  res?: Response;
}

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

// ── Admin procedure: يتحقق من صحة الجلسة الإدارية ──────────────────────────
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.adminToken || !(await validateAdminSession(ctx.adminToken))) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "غير مصرح: يرجى تسجيل الدخول كمدير",
    });
  }
  return next({ ctx });
});

export { t };
