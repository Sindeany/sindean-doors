/**
 * Shared tRPC instance — instance مشترك لجميع الـ routers
 * يحل مشكلة تعدد initTRPC.create() في الروترات المنفصلة
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { validateAdminSession } from "./admin-sessions.js";
import { validateStaffSession, type StaffIdentity, type StaffRole } from "./staff-sessions.js";
import type { Request, Response } from "express";
import { db, schema } from "./db.js";
import { eq, and, gt } from "drizzle-orm";

export interface Context {
  supplierToken?: string;
  adminToken?: string;
  userToken?: string;
  distributorToken?: string;
  staffToken?: string;
  staff?: StaffIdentity;
  req?: Request;
  res?: Response;
}

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

export const originCheckedProcedure = t.procedure.use(async ({ ctx, next }) => {
  validateRequestOrigin(ctx.req);
  return next({ ctx });
});

// ── Origin validation (defense-in-depth, complements SameSite cookies) ────────
// CSRF protection relies on SameSite=strict (prod) / lax (dev) + same-origin deployment.
// This Origin check is an additional lightweight layer.
// If any cross-origin path is added in future, an explicit CSRF token layer must be added.
function validateRequestOrigin(req: Request | undefined): void {
  if (!req) return;
  const origin = req.headers["origin"] as string | undefined;
  if (!origin) return; // absent = same-origin or non-browser request → allow
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    // في الإنتاج: APP_URL فقط (fail-closed)
    const appUrl = process.env.APP_URL || "";
    if (!appUrl || origin !== appUrl) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "طلب من مصدر غير مصرح به",
      });
    }
  } else {
    // في dev: نقبل أي localhost أو 127.0.0.1 بأي منفذ (Vite يختار المنفذ ديناميكيًا)
    try {
      const { hostname, protocol } = new URL(origin);
      if (
        protocol !== "http:" ||
        (hostname !== "localhost" && hostname !== "127.0.0.1")
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "طلب من مصدر غير مصرح به",
        });
      }
    } catch (e) {
      if (e instanceof TRPCError) throw e;
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "طلب من مصدر غير مصرح به",
      });
    }
  }
}

// ── Staff procedure (cookie only; roles come from staff_user_roles) ─────────
export const staffProcedure = originCheckedProcedure.use(async ({ ctx, next }) => {
  const staff = await validateStaffSession(ctx.staffToken);
  if (!staff) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "يرجى تسجيل الدخول" });
  }
  return next({ ctx: { ...ctx, staff } });
});

/**
 * Role guards read ctx.staff.roles from the session just validated above.
 * admin is not an implicit member of any other role.
 */
export function requireAnyStaffRole(roles: readonly StaffRole[]) {
  if (roles.length === 0) {
    throw new Error("requireAnyStaffRole needs at least one role");
  }
  const allowed = new Set(roles);
  return staffProcedure.use(async ({ ctx, next }) => {
    const staff = ctx.staff;
    if (!staff) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "يرجى تسجيل الدخول" });
    }
    if (!staff.roles.some((role) => allowed.has(role))) {
      throw new TRPCError({ code: "FORBIDDEN", message: "ليست لديك صلاحية هذا الإجراء" });
    }
    return next({ ctx: { ...ctx, staff } });
  });
}

export function requireStaffRole(role: StaffRole) {
  return requireAnyStaffRole([role]);
}

// ── Admin procedure ──────────────────────────────────────────────────────────
const requireAdminSession = t.middleware(async ({ ctx, next }) => {
  if (!ctx.adminToken || !(await validateAdminSession(ctx.adminToken))) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "غير مصرح: يرجى تسجيل الدخول كمدير",
    });
  }
  return next({ ctx });
});

export const adminProcedure = t.procedure.use(requireAdminSession);

/** Legacy admin session plus the same Origin check used by other cookie mutations. */
export const adminOriginProcedure = originCheckedProcedure.use(requireAdminSession);

// ── User procedure (cookie-based, Batch 2) ───────────────────────────────────
export const userProcedure = t.procedure.use(async ({ ctx, next }) => {
  validateRequestOrigin(ctx.req);
  const token = ctx.userToken;
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

// ── Supplier procedure (cookie-based, Batch 2) ───────────────────────────────
export const supplierProcedure = t.procedure.use(async ({ ctx, next }) => {
  validateRequestOrigin(ctx.req);
  const token = ctx.supplierToken;
  if (!token)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "يرجى تسجيل الدخول" });
  const now = Date.now();
  const session = await db.query.supplierSessions.findFirst({
    where: and(
      eq(schema.supplierSessions.token, token),
      gt(schema.supplierSessions.expiresAt, now)
    ),
  });
  if (!session)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "انتهت صلاحية الجلسة",
    });
  const supplier = await db.query.suppliers.findFirst({
    where: eq(schema.suppliers.id, session.supplierId),
  });
  if (!supplier) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, supplier } });
});

// ── Distributor procedure (cookie-based, Batch 3) ─────────────────────────────
export const distributorProcedure = t.procedure.use(async ({ ctx, next }) => {
  validateRequestOrigin(ctx.req);
  const token = ctx.distributorToken;
  if (!token)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "يرجى تسجيل الدخول" });
  const now = Date.now();
  const session = await db.query.distributorSessions.findFirst({
    where: and(
      eq(schema.distributorSessions.token, token),
      gt(schema.distributorSessions.expiresAt, now)
    ),
  });
  if (!session)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "انتهت صلاحية الجلسة",
    });
  const distributor = await db.query.distributors.findFirst({
    where: eq(schema.distributors.id, session.distributorId),
  });
  if (!distributor) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, distributor } });
});

export { t };
