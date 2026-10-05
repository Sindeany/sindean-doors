/**
 * Staff user administration — explicit admin role only.
 * Legacy adminSession does not grant access.
 */
import { TRPCError } from "@trpc/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod/v4";
import bcrypt from "bcryptjs";
import { db, schema } from "./db.js";
import {
  BCRYPT_COST,
  InvalidLoginNameError,
  STAFF_ROLES,
  type StaffRole,
  isStaffRole,
  requireLoginName,
} from "./staff-sessions.js";
import { requireStaffRole, router } from "./trpc.js";

const adminProcedure = requireStaffRole("admin");

const staffRoleSchema = z.enum(
  STAFF_ROLES as unknown as [StaffRole, ...StaffRole[]]
);

const rolesInputSchema = z
  .array(staffRoleSchema)
  .min(1, "يجب تعيين دور واحد على الأقل")
  .refine((roles) => new Set(roles).size === roles.length, {
    message: "لا يمكن تكرار الأدوار",
  });

function insertIdOf(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  const insertId = Number((header as { insertId?: number } | undefined)?.insertId);
  return Number.isInteger(insertId) ? insertId : 0;
}

function canonicalRoles(roles: StaffRole[]): StaffRole[] {
  const allowed = new Set(roles);
  return STAFF_ROLES.filter((role) => allowed.has(role));
}

async function listStaffRolesInTx(
  tx: Pick<typeof db, "select">,
  userId: number
): Promise<StaffRole[]> {
  const rows = await tx
    .select()
    .from(schema.staffUserRoles)
    .where(eq(schema.staffUserRoles.userId, userId));
  const found = new Set<StaffRole>();
  for (const row of rows) {
    if (isStaffRole(row.role)) found.add(row.role);
  }
  return STAFF_ROLES.filter((role) => found.has(role));
}

/**
 * Locks every active staff user row, then counts other active admins.
 * Serializes concurrent final-admin checks without a separate COUNT-then-UPDATE race.
 */
async function countOtherActiveAdmins(
  tx: Pick<typeof db, "select">,
  excludeUserId: number
): Promise<number> {
  const activeUsers = await tx
    .select({ id: schema.staffUsers.id })
    .from(schema.staffUsers)
    .where(eq(schema.staffUsers.isActive, true))
    .for("update");

  const adminRoles = await tx
    .select({ userId: schema.staffUserRoles.userId })
    .from(schema.staffUserRoles)
    .where(eq(schema.staffUserRoles.role, "admin"));

  const adminIds = new Set(adminRoles.map((row) => row.userId));
  return activeUsers.filter(
    (user) => user.id !== excludeUserId && adminIds.has(user.id)
  ).length;
}

function finalAdminConflict(): TRPCError {
  return new TRPCError({
    code: "CONFLICT",
    message: "لا يمكن إزالة آخر مدير نشط",
  });
}

function duplicateLoginConflict(): TRPCError {
  return new TRPCError({
    code: "CONFLICT",
    message: "اسم الدخول مستخدم مسبقاً",
  });
}

function isDuplicateStaffLoginError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth++) {
    const record = current as { code?: string; errno?: number; message?: string; cause?: unknown };
    if (record.code === "ER_DUP_ENTRY" || record.errno === 1062) {
      const message = String(record.message ?? "");
      return (
        message.includes("login_name") ||
        message.includes("staff_users.login_name") ||
        message.includes("staff_users")
      );
    }
    current = record.cause;
  }
  return false;
}

export const staffManagementRouter = router({
  list: adminProcedure.query(async () => {
    const users = await db
      .select({
        id: schema.staffUsers.id,
        name: schema.staffUsers.name,
        loginName: schema.staffUsers.loginName,
        isActive: schema.staffUsers.isActive,
        createdAt: schema.staffUsers.createdAt,
        updatedAt: schema.staffUsers.updatedAt,
      })
      .from(schema.staffUsers)
      .orderBy(asc(schema.staffUsers.loginName));

    const roleRows = await db.select().from(schema.staffUserRoles);
    const rolesByUser = new Map<number, StaffRole[]>();
    for (const row of roleRows) {
      if (!isStaffRole(row.role)) continue;
      const list = rolesByUser.get(row.userId) ?? [];
      list.push(row.role);
      rolesByUser.set(row.userId, list);
    }

    return users.map((user) => ({
      userId: user.id,
      name: user.name,
      loginName: user.loginName,
      isActive: user.isActive,
      roles: canonicalRoles(rolesByUser.get(user.id) ?? []),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(255),
        loginName: z.string().min(1).max(100),
        password: z.string().min(8).max(200),
        roles: rolesInputSchema,
      })
    )
    .mutation(async ({ input }) => {
      let loginName: string;
      try {
        loginName = requireLoginName(input.loginName);
      } catch (error) {
        if (error instanceof InvalidLoginNameError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "اسم الدخول غير صالح",
          });
        }
        throw error;
      }

      const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
      const roles = canonicalRoles(input.roles);
      const now = Date.now();

      try {
        return await db.transaction(async (tx) => {
          const [existing] = await tx
            .select({ id: schema.staffUsers.id })
            .from(schema.staffUsers)
            .where(eq(schema.staffUsers.loginName, loginName))
            .limit(1);
          if (existing) {
            throw duplicateLoginConflict();
          }

          const inserted = await tx.insert(schema.staffUsers).values({
            name: input.name.trim(),
            loginName,
            passwordHash,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          });
          const userId = insertIdOf(inserted);
          if (userId <= 0) throw new Error("staff user id was not created");

          await tx.insert(schema.staffUserRoles).values(
            roles.map((role) => ({ userId, role }))
          );

          return {
            userId,
            name: input.name.trim(),
            loginName,
            isActive: true,
            roles,
            createdAt: now,
            updatedAt: now,
          };
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        if (isDuplicateStaffLoginError(error)) throw duplicateLoginConflict();
        throw error;
      }
    }),

  setRoles: adminProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        roles: rolesInputSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const roles = canonicalRoles(input.roles);
      const now = Date.now();

      if (ctx.staff.userId === input.userId && !roles.includes("admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "لا يمكن إزالة دور المدير عن حسابك",
        });
      }

      return db.transaction(async (tx) => {
        const [target] = await tx
          .select()
          .from(schema.staffUsers)
          .where(eq(schema.staffUsers.id, input.userId))
          .for("update")
          .limit(1);
        if (!target) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "المستخدم غير موجود",
          });
        }

        const currentRoles = await listStaffRolesInTx(tx, target.id);
        const removingAdmin =
          target.isActive === true &&
          currentRoles.includes("admin") &&
          !roles.includes("admin");

        if (removingAdmin) {
          if ((await countOtherActiveAdmins(tx, target.id)) < 1) {
            throw finalAdminConflict();
          }
        }

        await tx
          .delete(schema.staffUserRoles)
          .where(eq(schema.staffUserRoles.userId, target.id));
        if (roles.length > 0) {
          await tx.insert(schema.staffUserRoles).values(
            roles.map((role) => ({ userId: target.id, role }))
          );
        }

        await tx
          .update(schema.staffUsers)
          .set({ updatedAt: now })
          .where(eq(schema.staffUsers.id, target.id));

        return {
          userId: target.id,
          name: target.name,
          loginName: target.loginName,
          isActive: target.isActive,
          roles,
          createdAt: target.createdAt,
          updatedAt: now,
        };
      });
    }),

  setActive: adminProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.staff.userId === input.userId && input.isActive === false) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "لا يمكن إيقاف حسابك",
        });
      }

      const now = Date.now();

      return db.transaction(async (tx) => {
        const [target] = await tx
          .select()
          .from(schema.staffUsers)
          .where(eq(schema.staffUsers.id, input.userId))
          .for("update")
          .limit(1);
        if (!target) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "المستخدم غير موجود",
          });
        }

        if (input.isActive === false && target.isActive === true) {
          const currentRoles = await listStaffRolesInTx(tx, target.id);
          if (currentRoles.includes("admin")) {
            if ((await countOtherActiveAdmins(tx, target.id)) < 1) {
              throw finalAdminConflict();
            }
          }
        }

        await tx
          .update(schema.staffUsers)
          .set({ isActive: input.isActive, updatedAt: now })
          .where(eq(schema.staffUsers.id, target.id));

        if (input.isActive === false) {
          await tx
            .update(schema.staffSessions)
            .set({ revokedAt: now })
            .where(
              and(
                eq(schema.staffSessions.userId, target.id),
                isNull(schema.staffSessions.revokedAt)
              )
            );
        }

        const roles = await listStaffRolesInTx(tx, target.id);
        return {
          userId: target.id,
          name: target.name,
          loginName: target.loginName,
          isActive: input.isActive,
          roles,
          createdAt: target.createdAt,
          updatedAt: now,
        };
      });
    }),
});
