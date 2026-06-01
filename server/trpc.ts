/**
 * Shared tRPC instance — instance مشترك لجميع الـ routers
 * يحل مشكلة تعدد initTRPC.create() في الروترات المنفصلة
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { validateAdminSession } from "./admin-sessions.js";
import type { Request, Response } from "express";
import { db, schema } from "./db.js";
import { eq, and, gt } from "drizzle-orm";

export interface Context {
  supplierToken?: string;
  adminToken?: string;
  userToken?: string;
  req?: Request;
  res?: Response;
}

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

// ── Origin validation (defense-in-depth, complements SameSite cookies) ────────
// CSRF protection relies on SameSite=strict (prod) / lax (dev) + same-origin deployment.
// This Origin check is an additional lightweight layer.
// If any cross-origin path is added in future, an explicit CSRF token layer must be added.
function validateRequestOrigin(req: Request | undefined): void {
  if (!req) return;
  const origin = req.headers["origin"] as string | undefined;
  if (!origin) return; // absent = same-origin or non-browser request → allow
  const isProduction = process.env.NODE_ENV === "production";
  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const allowed = isProduction
    ? [appUrl]
    : ["http://localhost:5173", "http://localhost:3000", "http://localhost:3001"];
  if (!allowed.includes(origin)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "طلب من مصدر غير مصرح به" });
  }
}

// ── Admin procedure ──────────────────────────────────────────────────────────
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.adminToken || !(await validateAdminSession(ctx.adminToken))) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "غير مصرح: يرجى تسجيل الدخول كمدير",
    });
  }
  return next({ ctx });
});

// ── User procedure (cookie-based, Batch 2) ───────────────────────────────────
export const userProcedure = t.procedure.use(async ({ ctx, next }) => {
  validateRequestOrigin(ctx.req);
  const token = ctx.userToken;
  if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "يرجى تسجيل الدخول" });
  const now = Date.now();
  const session = await db.query.userSessions.findFirst({
    where: and(eq(schema.userSessions.token, token), gt(schema.userSessions.expiresAt, now)),
  });
  if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "انتهت الجلسة، يرجى تسجيل الدخول مجدداً" });
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, session.userId) });
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, user } });
});

// ── Supplier procedure (cookie-based, Batch 2) ───────────────────────────────
export const supplierProcedure = t.procedure.use(async ({ ctx, next }) => {
  validateRequestOrigin(ctx.req);
  const token = ctx.supplierToken;
  if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "يرجى تسجيل الدخول" });
  const now = Date.now();
  const session = await db.query.supplierSessions.findFirst({
    where: and(eq(schema.supplierSessions.token, token), gt(schema.supplierSessions.expiresAt, now)),
  });
  if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "انتهت صلاحية الجلسة" });
  const supplier = await db.query.suppliers.findFirst({ where: eq(schema.suppliers.id, session.supplierId) });
  if (!supplier) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, supplier } });
});

export { t };
