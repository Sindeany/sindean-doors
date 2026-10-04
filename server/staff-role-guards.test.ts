/**
 * Phase 2B-3 staff role guards.
 * Uses isolated in-memory identities. It does not read the local bootstrap user.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";
import type { StaffIdentity, StaffRole } from "./staff-sessions.js";

const { validateStaffSession } = vi.hoisted(() => ({
  validateStaffSession: vi.fn(),
}));

vi.mock("./db.js", () => ({
  db: {},
  schema: {},
  pool: {},
}));

vi.mock("./staff-sessions.js", () => ({
  validateStaffSession,
}));

import { requireAnyStaffRole, requireStaffRole, router } from "./trpc.js";

const BUSINESS_ROLES = [
  "stock_manager",
  "production_manager",
  "laminating",
  "cutting",
  "auto_line",
  "frame_architrave",
  "packing",
  "sales_coordinator",
  "sales_person",
] as const satisfies readonly StaffRole[];

const guarded = router({
  admin: requireStaffRole("admin").query(({ ctx }) => ctx.staff.userId),
  sales_coordinator: requireStaffRole("sales_coordinator").query(({ ctx }) => ctx.staff.userId),
  sales_person: requireStaffRole("sales_person").query(({ ctx }) => ctx.staff.userId),
  stock_manager: requireStaffRole("stock_manager").query(({ ctx }) => ctx.staff.userId),
  production_manager: requireStaffRole("production_manager").query(({ ctx }) => ctx.staff.userId),
  laminating: requireStaffRole("laminating").query(({ ctx }) => ctx.staff.userId),
  cutting: requireStaffRole("cutting").query(({ ctx }) => ctx.staff.userId),
  auto_line: requireStaffRole("auto_line").query(({ ctx }) => ctx.staff.userId),
  frame_architrave: requireStaffRole("frame_architrave").query(({ ctx }) => ctx.staff.userId),
  packing: requireStaffRole("packing").query(({ ctx }) => ctx.staff.userId),
  adminOrStock: requireAnyStaffRole(["admin", "stock_manager"]).query(({ ctx }) => ctx.staff),
  claimedStock: requireStaffRole("stock_manager")
    .input(z.object({ roles: z.array(z.string()).optional() }))
    .query(({ ctx }) => ctx.staff),
});

function identity(roles: StaffRole[], userId = 80): StaffIdentity {
  return {
    userId,
    sessionId: 800 + userId,
    name: "Isolated Staff",
    loginName: "isolated-" + userId,
    roles,
    expiresAt: Date.now() + 60_000,
  };
}

function callerFor(staff: StaffIdentity | null) {
  validateStaffSession.mockImplementation(async (token: string | undefined) => {
    if (!token || !staff) return null;
    return staff;
  });
  return guarded.createCaller({
    staffToken: staff ? "isolated-session" : undefined,
    req: { headers: {} },
  });
}

async function expectAllowed(roles: StaffRole[], procedure: Exclude<keyof typeof guarded, "adminOrStock" | "claimedStock">) {
  const staff = identity(roles);
  const api = callerFor(staff);
  await expect(api[procedure]()).resolves.toBe(staff.userId);
}

async function expectForbidden(roles: StaffRole[], procedure: Exclude<keyof typeof guarded, "adminOrStock" | "claimedStock">) {
  const api = callerFor(identity(roles));
  await expect(api[procedure]()).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
}

beforeEach(() => {
  validateStaffSession.mockReset();
});

describe("staff role guards", () => {
  it("rejects a missing staff session", async () => {
    const api = callerFor(null);
    await expect(api.stock_manager()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("allows an exact role and rejects a different role", async () => {
    await expectAllowed(["cutting"], "cutting");
    await expectForbidden(["cutting"], "laminating");
  });

  it("allows a multi-role user when any current role matches", async () => {
    await expectAllowed(["packing", "laminating"], "laminating");
    await expectForbidden(["packing", "laminating"], "cutting");
    await expectForbidden(["packing", "laminating"], "stock_manager");
  });

  it("does not treat admin as an implicit business superuser", async () => {
    for (const role of BUSINESS_ROLES) {
      await expectForbidden(["admin"], role);
    }
    await expectAllowed(["admin"], "admin");
  });

  it("keeps laminating, production, sales, and stock guards separate", async () => {
    await expectAllowed(["laminating"], "laminating");
    await expectForbidden(["laminating"], "cutting");
    await expectForbidden(["laminating"], "stock_manager");

    await expectAllowed(["production_manager"], "production_manager");
    await expectForbidden(["production_manager"], "laminating");

    await expectAllowed(["sales_coordinator"], "sales_coordinator");
    await expectForbidden(["sales_person"], "sales_coordinator");

    await expectAllowed(["stock_manager"], "stock_manager");
    await expectForbidden(["admin"], "stock_manager");
  });

  it("allows admin or stock_manager only when admin is explicitly included", async () => {
    const admin = identity(["admin"], 81);
    const stock = identity(["stock_manager"], 82);
    const laminating = identity(["laminating"], 83);

    await expect(callerFor(admin).adminOrStock()).resolves.toMatchObject({
      userId: 81,
      roles: ["admin"],
    });
    await expect(callerFor(stock).adminOrStock()).resolves.toMatchObject({
      userId: 82,
      roles: ["stock_manager"],
    });
    await expect(callerFor(laminating).adminOrStock()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("uses the session role list instead of a client role claim", async () => {
    const staff = identity(["laminating"], 84);
    const api = callerFor(staff);
    await expect(api.claimedStock({ roles: ["admin", "stock_manager"] })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    const stock = identity(["stock_manager"], 85);
    const allowed = await callerFor(stock).claimedStock({ roles: ["laminating"] });
    expect(allowed).toMatchObject({ userId: 85, roles: ["stock_manager"] });
  });

  it("loads roles again on the next request", async () => {
    validateStaffSession.mockResolvedValueOnce(identity(["laminating"], 86));
    const api = guarded.createCaller({
      staffToken: "same-token",
      req: { headers: {} },
    });
    await expect(api.laminating()).resolves.toBe(86);

    validateStaffSession.mockResolvedValueOnce(identity(["cutting"], 86));
    await expect(api.laminating()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(validateStaffSession).toHaveBeenCalledTimes(2);
    expect(validateStaffSession).toHaveBeenNthCalledWith(1, "same-token");
    expect(validateStaffSession).toHaveBeenNthCalledWith(2, "same-token");
  });
});
