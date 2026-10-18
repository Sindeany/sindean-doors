/**
 * Staff-authenticated canonical factory order creation.
 * The role guard is the real requireAnyStaffRole procedure.
 * InnoDB concurrency and audit rollback are rehearsed outside pnpm test.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "../drizzle/schema.js";
import type { StaffIdentity, StaffRole } from "./staff-sessions.js";
import { factoryCalendarYear } from "./factory-time.js";

type CounterRow = { lastValue: number; updatedAt: number };

const state = vi.hoisted(() => ({
  doorInserts: [] as Array<Record<string, unknown>>,
  audits: [] as Array<Record<string, unknown>>,
  counters: new Map<number, CounterRow>(),
  transactionCalls: 0,
  inTransaction: false,
  failAudit: false,
  sideEffects: [] as Array<{ kind: string; inTransaction: boolean }>,
  identity: null as StaffIdentity | null,
}));

const { validateStaffSession, sendOrderConfirmation } = vi.hoisted(() => ({
  validateStaffSession: vi.fn(async (token: string | undefined) => {
    if (!token || !state.identity) return null;
    return state.identity;
  }),
  sendOrderConfirmation: vi.fn(async () => {
    state.sideEffects.push({ kind: "email", inTransaction: state.inTransaction });
  }),
}));

function counterExecutor() {
  let lockedYear: number | null = null;
  return {
    insert(table: unknown) {
      if (table === schema.orderNumberCounters) {
        return {
          values(row: { year: number; lastValue: number; updatedAt: number }) {
            return {
              async onDuplicateKeyUpdate() {
                if (!state.counters.has(row.year)) {
                  state.counters.set(row.year, {
                    lastValue: row.lastValue,
                    updatedAt: row.updatedAt,
                  });
                }
                lockedYear = row.year;
              },
            };
          },
        };
      }
      if (table === schema.doorOrders) {
        return {
          async values(row: Record<string, unknown>) {
            state.doorInserts.push(row);
            return [{ insertId: 700 + state.doorInserts.length }];
          },
        };
      }
      if (table === schema.auditEvents) {
        return {
          async values(row: Record<string, unknown>) {
            if (state.failAudit) throw new Error("forced audit failure");
            state.audits.push(row);
            return [{ insertId: 800 + state.audits.length }];
          },
        };
      }
      throw new Error("unexpected insert target");
    },
    select() {
      return {
        from(table: unknown) {
          if (table !== schema.orderNumberCounters) {
            throw new Error("unexpected select target");
          }
          return {
            where() {
              return {
                for(mode: string) {
                  if (mode !== "update") throw new Error(`expected FOR UPDATE, got ${mode}`);
                  return {
                    async limit() {
                      if (lockedYear === null) return [];
                      const row = state.counters.get(lockedYear);
                      return row ? [{ lastValue: row.lastValue }] : [];
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
      if (table !== schema.orderNumberCounters) {
        throw new Error("unexpected update target");
      }
      return {
        set(values: { lastValue: number; updatedAt: number }) {
          return {
            async where() {
              if (lockedYear === null) throw new Error("counter update without lock");
              const row = state.counters.get(lockedYear);
              if (!row) throw new Error("missing counter row");
              row.lastValue = values.lastValue;
              row.updatedAt = values.updatedAt;
            },
          };
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

vi.mock("./email.js", () => ({
  sendOrderConfirmation,
}));

vi.mock("./db.js", async () => {
  const realSchema = await import("../drizzle/schema.js");
  return {
    schema: realSchema,
    pool: {},
    db: {
      transaction: async (fn: (tx: ReturnType<typeof counterExecutor>) => Promise<unknown>) => {
        state.transactionCalls += 1;
        const counters = new Map(
          [...state.counters].map(([year, row]) => [year, { ...row }])
        );
        const doorInserts = state.doorInserts.map((row) => ({ ...row }));
        const audits = state.audits.map((row) => ({ ...row }));
        state.inTransaction = true;
        try {
          return await fn(counterExecutor());
        } catch (error) {
          state.counters = counters;
          state.doorInserts = doorInserts;
          state.audits = audits;
          throw error;
        } finally {
          state.inTransaction = false;
        }
      },
    },
  };
});

import { appRouter } from "./routers.js";

const orderInput = {
  customerName: "عميل المبيعات",
  customerPhone: "0500000000",
  customerEmail: "buyer@example.com",
  productId: "door-1",
  productName: "باب سنديان",
  selections: { finish: "oak" },
  subSelections: {},
};

const DENIED_ROLES = [
  "admin",
  "stock_manager",
  "production_manager",
  "laminating",
  "cutting",
  "auto_line",
  "frame_architrave",
  "packing",
] as const satisfies readonly StaffRole[];

function identity(roles: StaffRole[], userId = 41): StaffIdentity {
  return {
    userId,
    sessionId: 900,
    name: "موظف مبيعات",
    loginName: "sales.staff",
    roles,
    expiresAt: Date.now() + 60_000,
  };
}

function caller(staff: StaffIdentity | null, extra: Record<string, unknown> = {}) {
  state.identity = staff;
  return appRouter.createCaller({
    staffToken: staff ? "staff-session" : undefined,
    ...extra,
  });
}

const envKeys = [
  "BUILT_IN_FORGE_API_URL",
  "BUILT_IN_FORGE_API_KEY",
  "OWNER_OPEN_ID",
] as const;
const savedEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

beforeEach(() => {
  state.doorInserts = [];
  state.audits = [];
  state.counters = new Map();
  state.transactionCalls = 0;
  state.inTransaction = false;
  state.failAudit = false;
  state.sideEffects = [];
  state.identity = null;
  validateStaffSession.mockClear();
  sendOrderConfirmation.mockClear();
  process.env.BUILT_IN_FORGE_API_URL = "http://notify.test";
  process.env.BUILT_IN_FORGE_API_KEY = "test-key";
  process.env.OWNER_OPEN_ID = "owner-1";
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      state.sideEffects.push({ kind: "notify", inTransaction: state.inTransaction });
      return new Response("ok");
    })
  );
});

afterEach(() => {
  for (const key of envKeys) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  vi.unstubAllGlobals();
});

describe("orders.create staff authorization", () => {
  it("allows sales_person and sales_coordinator, including admin combined with sales", async () => {
    const year = factoryCalendarYear(new Date());
    const salesPerson = await caller(identity(["sales_person"], 41)).orders.create(orderInput);
    expect(salesPerson.canonicalNumber).toBe(`SD-${year}-000001`);
    expect(state.doorInserts[0]).toMatchObject({
      commercialStatus: "draft",
      materialState: "not_started",
      customerEmail: orderInput.customerEmail,
    });
    expect(state.audits[0]).toMatchObject({
      eventType: "order.created",
      entityType: "door_order",
      entityId: salesPerson.id,
      canonicalNumber: salesPerson.canonicalNumber,
      actorStaffUserId: 41,
      beforeJson: null,
      afterJson: { commercialStatus: "draft", materialState: "not_started" },
    });

    const coordinator = await caller(identity(["sales_coordinator"], 42)).orders.create(
      orderInput
    );
    expect(coordinator.canonicalNumber).toBe(`SD-${year}-000002`);
    expect(state.audits[1]).toMatchObject({ actorStaffUserId: 42 });

    const combined = await caller(identity(["admin", "sales_coordinator"], 43)).orders.create(
      orderInput
    );
    expect(combined.canonicalNumber).toBe(`SD-${year}-000003`);
    expect(state.audits[2]).toMatchObject({ actorStaffUserId: 43 });
    expect(state.audits).toHaveLength(3);
    expect(state.counters.get(year)?.lastValue).toBe(3);
  });

  it("denies every non-sales role before any database mutation", async () => {
    for (const role of DENIED_ROLES) {
      const before = state.transactionCalls;
      await expect(
        caller(identity([role], 70)).orders.create(orderInput)
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(state.transactionCalls).toBe(before);
    }
    expect(state.doorInserts).toHaveLength(0);
    expect(state.audits).toHaveLength(0);
    expect(state.counters.size).toBe(0);
    expect(state.sideEffects).toHaveLength(0);
  });

  it("denies anonymous, customer, and legacy-admin callers before any mutation", async () => {
    await expect(caller(null).orders.create(orderInput)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "يرجى تسجيل الدخول",
    });
    await expect(
      caller(null, { userToken: "customer-session" }).orders.create(orderInput)
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      caller(null, { adminToken: "legacy-admin" }).orders.create(orderInput)
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(state.transactionCalls).toBe(0);
    expect(state.doorInserts).toHaveLength(0);
    expect(state.audits).toHaveLength(0);
    expect(state.counters.size).toBe(0);
  });

  it("ignores client authority and lifecycle fields and keeps the session actor", async () => {
    const result = await caller(identity(["sales_person"], 41)).orders.create({
      ...orderInput,
      canonicalNumber: "SD-1999-000001",
      canonical_number: "SD-1999-000002",
      commercialStatus: "approved",
      commercial_status: "approved",
      materialState: "released",
      material_state: "released",
      createdBy: 7,
      staffUserId: 999,
      actorUserId: 998,
      role: "admin",
      year: 1999,
    } as never);
    expect(result.canonicalNumber).not.toContain("1999");
    expect(state.doorInserts[0]).toMatchObject({
      canonicalNumber: result.canonicalNumber,
      commercialStatus: "draft",
      materialState: "not_started",
    });
    expect(JSON.stringify(state.doorInserts[0])).not.toContain("SD-1999-");
    expect(state.audits[0]).toEqual({
      eventType: "order.created",
      entityType: "door_order",
      entityId: result.id,
      canonicalNumber: result.canonicalNumber,
      actorStaffUserId: 41,
      occurredAt: expect.any(Number),
      beforeJson: null,
      afterJson: { commercialStatus: "draft", materialState: "not_started" },
    });
    const auditJson = JSON.stringify(state.audits[0]);
    expect(auditJson).not.toContain(orderInput.customerName);
    expect(auditJson).not.toContain(orderInput.customerEmail);
    expect(auditJson).not.toContain(orderInput.customerPhone);
    expect(auditJson).not.toContain("approved");
    expect(auditJson).not.toContain("released");
  });

  it("keeps a coincident customer session from replacing the submitted email", async () => {
    await caller(identity(["sales_person"], 41), {
      userToken: "customer-session",
    }).orders.create(orderInput);
    expect(state.doorInserts[0]?.customerEmail).toBe(orderInput.customerEmail);
  });

  it("rolls back the order, counter, and audit when audit insert fails, and skips side effects", async () => {
    state.failAudit = true;
    await expect(
      caller(identity(["sales_person"], 41)).orders.create(orderInput)
    ).rejects.toThrow("forced audit failure");
    expect(state.doorInserts).toHaveLength(0);
    expect(state.audits).toHaveLength(0);
    expect(state.counters.size).toBe(0);
    expect(state.sideEffects).toHaveLength(0);
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it("emits notification and email only after the creation transaction commits", async () => {
    await caller(identity(["sales_coordinator"], 42)).orders.create(orderInput);
    expect(state.sideEffects).toEqual([
      { kind: "notify", inTransaction: false },
      { kind: "email", inTransaction: false },
    ]);
    expect(state.audits).toHaveLength(1);
    expect(state.inTransaction).toBe(false);
  });
});
