/**
 * Commercial order lifecycle.
 * Procedures run against an in-memory locked order and audit log.
 * InnoDB concurrency is rehearsed separately and is not part of pnpm test.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "../drizzle/schema.js";
import type { StaffIdentity, StaffRole } from "./staff-sessions.js";

type OrderRow = {
  id: number;
  canonicalNumber: string | null;
  commercialStatus: string | null;
  materialState: string;
};

const state = vi.hoisted(() => ({
  orders: new Map<number, OrderRow>(),
  audits: [] as Array<Record<string, unknown>>,
  failAudit: false,
  touched: [] as string[],
}));

const { validateStaffSession } = vi.hoisted(() => ({
  validateStaffSession: vi.fn(),
}));

function parameterNumber(clause: unknown): number | null {
  const chunks = (clause as { queryChunks?: unknown[] } | undefined)?.queryChunks ?? [];
  for (const chunk of chunks) {
    if (
      chunk &&
      typeof chunk === "object" &&
      "value" in chunk &&
      typeof (chunk as { value: unknown }).value === "number"
    ) {
      return (chunk as { value: number }).value;
    }
  }
  return null;
}

function orderTx() {
  return {
    select() {
      return {
        from(table: unknown) {
          state.touched.push(`select:${table === schema.doorOrders ? "door_orders" : "other"}`);
          if (table !== schema.doorOrders) {
            throw new Error("lifecycle selected an unexpected table");
          }
          return {
            where(clause: unknown) {
              return {
                for(mode: string) {
                  if (mode !== "update") throw new Error(`expected FOR UPDATE, got ${mode}`);
                  return {
                    async limit() {
                      const id = parameterNumber(clause);
                      const row = id == null ? undefined : state.orders.get(id);
                      return row
                        ? [
                            {
                              id: row.id,
                              canonicalNumber: row.canonicalNumber,
                              commercialStatus: row.commercialStatus,
                              materialState: row.materialState,
                            },
                          ]
                        : [];
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
    update(table: unknown) {
      return {
        set(values: Record<string, unknown>) {
          return {
            async where(clause: unknown) {
              if (table !== schema.doorOrders) {
                throw new Error("lifecycle updated an unexpected table");
              }
              const id = parameterNumber(clause);
              const row = id == null ? undefined : state.orders.get(id);
              if (!row) throw new Error("missing locked order");
              if ("canonicalNumber" in values || "canonical_number" in values) {
                throw new Error("canonical number was included in the update");
              }
              if (values.commercialStatus !== undefined) {
                row.commercialStatus = String(values.commercialStatus);
              }
              if (values.materialState !== undefined) {
                row.materialState = String(values.materialState);
              }
            },
          };
        },
      };
    },
    insert(table: unknown) {
      return {
        async values(row: Record<string, unknown>) {
          if (table === schema.auditEvents) {
            if (state.failAudit) throw new Error("forced audit failure");
            state.audits.push(row);
            return [{ insertId: state.audits.length }];
          }
          throw new Error("lifecycle inserted an unexpected table");
        },
      };
    },
  };
}

vi.mock("./staff-sessions.js", async () => {
  const actual = await vi.importActual<typeof import("./staff-sessions.js")>(
    "./staff-sessions.js"
  );
  return { ...actual, validateStaffSession };
});

vi.mock("./db.js", async () => {
  const realSchema = await import("../drizzle/schema.js");
  return {
    schema: realSchema,
    pool: {},
    db: {
      transaction: async (fn: (tx: ReturnType<typeof orderTx>) => Promise<unknown>) => {
        const orders = new Map(
          [...state.orders].map(([id, row]) => [id, { ...row }])
        );
        const audits = state.audits.map((row) => ({ ...row }));
        try {
          return await fn(orderTx());
        } catch (error) {
          state.orders = orders;
          state.audits = audits;
          throw error;
        }
      },
    },
  };
});

vi.mock("./canonical-order-number.js", async () => {
  const actual = await vi.importActual<typeof import("./canonical-order-number.js")>(
    "./canonical-order-number.js"
  );
  return {
    ...actual,
    allocateCanonicalOrderNumber: vi.fn(async () => {
      throw new Error("lifecycle reallocated a canonical number");
    }),
  };
});

import { appRouter } from "./routers.js";

function staff(roles: StaffRole[], userId = 55): StaffIdentity {
  return {
    userId,
    sessionId: 900,
    name: "موظف اختبار",
    loginName: "lifecycle-test",
    roles,
    expiresAt: Date.now() + 60_000,
  };
}

function seed(partial: Partial<OrderRow> = {}) {
  const id = partial.id ?? 7;
  state.orders.set(id, {
    id,
    canonicalNumber: partial.canonicalNumber ?? "SD-2026-000007",
    commercialStatus: partial.commercialStatus === undefined ? "draft" : partial.commercialStatus,
    materialState: partial.materialState ?? "not_started",
  });
}

const sessions = new Map<string, StaffIdentity>();

function caller(identity: StaffIdentity | null, extra: Record<string, unknown> = {}) {
  const token = identity ? `staff-${identity.userId}-${identity.roles.join(".")}` : undefined;
  if (identity && token) sessions.set(token, identity);
  validateStaffSession.mockImplementation(async (presented: string | undefined) => {
    if (!presented) return null;
    return sessions.get(presented) ?? null;
  });
  return appRouter.createCaller({
    staffToken: token,
    ...extra,
  });
}

beforeEach(() => {
  state.orders = new Map();
  state.audits = [];
  state.failAudit = false;
  state.touched = [];
  validateStaffSession.mockReset();
  sessions.clear();
});

describe("commercial lifecycle authorization", () => {
  it("rejects anonymous and legacy-admin sessions", async () => {
    seed();
    await expect(
      caller(null).orders.submitForCoordinatorReview({ orderId: 7 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      caller(null, { adminToken: "legacy-admin" }).orders.approve({ orderId: 7 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(state.audits).toHaveLength(0);
  });

  it("allows sales roles to submit for coordinator review and denies other roles", async () => {
    seed();
    await expect(
      caller(staff(["sales_person"])).orders.submitForCoordinatorReview({ orderId: 7 })
    ).resolves.toMatchObject({ applied: true, commercialStatus: "coordinator_review" });
    state.orders.get(7)!.commercialStatus = "draft";
    state.audits.length = 0;
    await expect(
      caller(staff(["sales_coordinator"])).orders.submitForCoordinatorReview({ orderId: 7 })
    ).resolves.toMatchObject({ commercialStatus: "coordinator_review" });
    state.orders.get(7)!.commercialStatus = "draft";
    await expect(
      caller(staff(["admin"])).orders.submitForCoordinatorReview({ orderId: 7 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller(staff(["stock_manager"])).orders.submitForCoordinatorReview({ orderId: 7 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows only a sales coordinator to submit for admin review", async () => {
    seed({ commercialStatus: "coordinator_review" });
    await expect(
      caller(staff(["sales_person"])).orders.submitForAdminReview({ orderId: 7 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller(staff(["sales_coordinator"])).orders.submitForAdminReview({ orderId: 7 })
    ).resolves.toMatchObject({ commercialStatus: "admin_review" });
  });

  it("allows only admin to approve or reject", async () => {
    seed({ commercialStatus: "admin_review" });
    await expect(
      caller(staff(["sales_coordinator"])).orders.approve({ orderId: 7 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller(staff(["admin"], 55)).orders.approve({
        orderId: 7,
        actorUserId: 999,
        role: "sales_person",
        approvedBy: "عميل",
      } as never)
    ).resolves.toMatchObject({
      applied: true,
      commercialStatus: "approved",
      materialState: "pending_materials",
      canonicalNumber: "SD-2026-000007",
    });
    expect(state.audits[0]).toMatchObject({
      eventType: "order.commercial.approved",
      entityType: "door_order",
      entityId: 7,
      canonicalNumber: "SD-2026-000007",
      actorStaffUserId: 55,
      beforeJson: { commercialStatus: "admin_review", materialState: "not_started" },
      afterJson: { commercialStatus: "approved", materialState: "pending_materials" },
    });
    expect(JSON.stringify(state.audits[0])).not.toContain("999");
    expect(state.touched.every((entry) => entry === "select:door_orders")).toBe(true);
  });
});

describe("commercial state machine", () => {
  it("rejects invalid transitions and historical NULL status", async () => {
    const admin = caller(staff(["admin"]));
    seed();
    await expect(admin.orders.approve({ orderId: 7 })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    seed({ commercialStatus: "coordinator_review" });
    await expect(admin.orders.approve({ orderId: 7 })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    seed({ commercialStatus: "approved", materialState: "pending_materials" });
    await expect(admin.orders.reject({ orderId: 7 })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    seed({ commercialStatus: "rejected" });
    await expect(admin.orders.approve({ orderId: 7 })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    seed({ commercialStatus: "cancelled", materialState: "not_started" });
    await expect(admin.orders.approve({ orderId: 7 })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    seed({ commercialStatus: null });
    await expect(admin.orders.approve({ orderId: 7 })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(state.audits).toHaveLength(0);
    expect(state.orders.get(7)?.commercialStatus).toBeNull();
  });

  it("rejects from admin review without changing material state", async () => {
    seed({ commercialStatus: "admin_review" });
    await expect(
      caller(staff(["admin"])).orders.reject({ orderId: 7 })
    ).resolves.toMatchObject({
      commercialStatus: "rejected",
      materialState: "not_started",
      canonicalNumber: "SD-2026-000007",
    });
  });

  it("cancels only before material reservation", async () => {
    const admin = caller(staff(["admin"]));
    seed({ commercialStatus: "approved", materialState: "pending_materials" });
    await expect(admin.orders.cancel({ orderId: 7 })).resolves.toMatchObject({
      commercialStatus: "cancelled",
      materialState: "not_started",
    });
    seed({ commercialStatus: "approved", materialState: "not_started" });
    state.audits.length = 0;
    await expect(admin.orders.cancel({ orderId: 7 })).resolves.toMatchObject({
      commercialStatus: "cancelled",
      materialState: "not_started",
    });
    for (const materialState of ["partially_reserved", "fully_reserved", "released"]) {
      seed({ commercialStatus: "approved", materialState });
      state.audits.length = 0;
      await expect(admin.orders.cancel({ orderId: 7 })).rejects.toMatchObject({
        code: "CONFLICT",
      });
      expect(state.orders.get(7)?.commercialStatus).toBe("approved");
      expect(state.orders.get(7)?.materialState).toBe(materialState);
      expect(state.audits).toHaveLength(0);
    }
  });

  it("keeps the canonical number through the commercial path and does not allocate another", async () => {
    const sales = caller(staff(["sales_person", "sales_coordinator"]));
    const admin = caller(staff(["admin"]));
    seed();
    await sales.orders.submitForCoordinatorReview({ orderId: 7 });
    await sales.orders.submitForAdminReview({ orderId: 7 });
    await admin.orders.approve({ orderId: 7 });
    expect(state.orders.get(7)?.canonicalNumber).toBe("SD-2026-000007");
    expect(state.audits.map((row) => row.canonicalNumber)).toEqual([
      "SD-2026-000007",
      "SD-2026-000007",
      "SD-2026-000007",
    ]);
  });

  it("does not write a second audit when the same command is repeated", async () => {
    seed({ commercialStatus: "admin_review" });
    const admin = caller(staff(["admin"]));
    await expect(admin.orders.approve({ orderId: 7 })).resolves.toMatchObject({ applied: true });
    await expect(admin.orders.approve({ orderId: 7 })).resolves.toMatchObject({
      applied: false,
      commercialStatus: "approved",
      materialState: "pending_materials",
    });
    expect(state.audits).toHaveLength(1);
  });

  it("rolls the order back when the audit insert fails", async () => {
    seed({ commercialStatus: "admin_review" });
    state.failAudit = true;
    await expect(caller(staff(["admin"])).orders.approve({ orderId: 7 })).rejects.toThrow(
      "forced audit failure"
    );
    expect(state.orders.get(7)).toMatchObject({
      commercialStatus: "admin_review",
      materialState: "not_started",
      canonicalNumber: "SD-2026-000007",
    });
    expect(state.audits).toHaveLength(0);
  });
});
