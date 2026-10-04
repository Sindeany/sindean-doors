/**
 * Staff auth — bootstrap, login, session identity, and logout.
 * Role authorization is intentionally not implemented here.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import {
  adminOriginProcedure,
  originCheckedProcedure,
  router,
  staffProcedure,
} from "./trpc.js";
import {
  InvalidLoginNameError,
  STAFF_SESSION_TTL_MS,
  StaffBootstrapClosedError,
  StaffBootstrapLockError,
  authenticateStaffPassword,
  createFirstStaffAdmin,
  createStaffSession,
  revokeStaffSession,
} from "./staff-sessions.js";

export const STAFF_COOKIE_NAME = "staffSession";

export const STAFF_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "strict" : "lax") as
    | "strict"
    | "lax",
  maxAge: STAFF_SESSION_TTL_MS,
  path: "/",
};

const STAFF_COOKIE_CLEAR_OPTIONS = {
  httpOnly: STAFF_COOKIE_OPTIONS.httpOnly,
  secure: STAFF_COOKIE_OPTIONS.secure,
  sameSite: STAFF_COOKIE_OPTIONS.sameSite,
  path: STAFF_COOKIE_OPTIONS.path,
};

function loginFailure(): TRPCError {
  return new TRPCError({
    code: "UNAUTHORIZED",
    message: "بيانات الدخول غير صحيحة",
  });
}

const credentials = z.object({
  loginName: z.string().min(1).max(100),
  password: z.string().min(8).max(200),
});

export const staffAuthRouter = router({
  bootstrapFirstAdmin: adminOriginProcedure
    .input(
      credentials.extend({
        name: z.string().trim().min(1).max(255),
      })
    )
    .mutation(async ({ input }) => {
      try {
        return await createFirstStaffAdmin(input);
      } catch (error) {
        if (error instanceof StaffBootstrapClosedError) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "تم إنشاء أول حساب إداري مسبقاً",
          });
        }
        if (error instanceof InvalidLoginNameError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "اسم الدخول غير صالح",
          });
        }
        if (error instanceof StaffBootstrapLockError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "تعذر إكمال إنشاء الحساب الأول",
          });
        }
        throw error;
      }
    }),

  login: originCheckedProcedure.input(credentials).mutation(async ({ input, ctx }) => {
    const account = await authenticateStaffPassword(input.loginName, input.password);
    if (!account) throw loginFailure();
    const session = await createStaffSession(account.userId);
    ctx.res?.cookie(STAFF_COOKIE_NAME, session.rawToken, STAFF_COOKIE_OPTIONS);
    return {
      userId: account.userId,
      name: account.name,
      loginName: account.loginName,
      roles: account.roles,
      expiresAt: session.expiresAt,
    };
  }),

  me: staffProcedure.query(({ ctx }) => ({
    userId: ctx.staff.userId,
    sessionId: ctx.staff.sessionId,
    name: ctx.staff.name,
    loginName: ctx.staff.loginName,
    roles: ctx.staff.roles,
    expiresAt: ctx.staff.expiresAt,
  })),

  logout: originCheckedProcedure.mutation(async ({ ctx }) => {
    await revokeStaffSession(ctx.staffToken);
    ctx.res?.clearCookie(STAFF_COOKIE_NAME, STAFF_COOKIE_CLEAR_OPTIONS);
    return { success: true };
  }),
});
