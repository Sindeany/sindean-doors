/**
 * Reservation allocation rules and staff authorization.
 * InnoDB races are rehearsed separately.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StaffIdentity, StaffRole } from "./staff-sessions.js";
import { AdvancePaymentError } from "./advance-payment.js";
import {
  conflictFromReservationDatabaseError,
  deriveMaterialState,
  legalAllocation,
} from "./reservation.js";

const { validateStaffSession, memory } = vi.hoisted(() => ({
  validateStaffSession: vi.fn(),
  memory: {
    connections: [] as Array<{ id: number; queries: string[] }>,
    transactionConnectionIds: [] as number[],
    fail: null as unknown,
  },
}));

vi.mock("drizzle-orm/mysql2", async () => {
  const actual = await vi.importActual<typeof import("drizzle-orm/mysql2")>("drizzle-orm/mysql2");
  return {
    ...actual,
    drizzle: (conn: { id: number }) => ({
      transaction: async (run: (tx: unknown) => Promise<unknown>) => {
        memory.transactionConnectionIds.push(conn.id);
        if (memory.fail) throw memory.fail;
        const tx = {
          select() {
            return {
              from() {
                return {
                  where() {
                    return {
                      for() {
                        return { limit: async () => [] };
                      },
                      limit: async () => [],
                      orderBy() {
                        return [];
                      },
                    };
                  },
                };
              },
            };
          },
          insert() {
            return { values: async () => ({ insertId: 1 }) };
          },
          update() {
            return { set: () => ({ where: async () => undefined }) };
          },
        };
        return run(tx);
      },
    }),
  };
});

vi.mock("./staff-sessions.js", async () => {
  const actual = await vi.importActual<typeof import("./staff-sessions.js")>("./staff-sessions.js");
  return { ...actual, validateStaffSession };
});

vi.mock("./db.js", async () => {
  const schema = await import("../drizzle/schema.js");
  const tx = {
    select() {
      return {
        from() {
          return {
            where() {
              return {
                for() {
                  return { limit: async () => [] };
                },
                limit: async () => [],
                orderBy() {
                  return [];
                },
              };
            },
          };
        },
      };
    },
    insert() {
      return { values: async () => ({ insertId: 1 }) };
    },
    update() {
      return { set: () => ({ where: async () => undefined }) };
    },
  };
  return {
    schema,
    db: {
      select() {
        return tx.select();
      },
      transaction: async (run: (inner: typeof tx) => Promise<unknown>) => run(tx),
    },
    pool: {
      async getConnection() {
        const conn = {
          id: memory.connections.length + 1,
          queries: [] as string[],
          async query(text: string) {
            conn.queries.push(text);
            if (text.includes("GET_LOCK")) return [[{ locked: 1 }]];
            if (text.includes("RELEASE_LOCK")) return [[{ released: 1 }]];
            throw new Error(text);
          },
          release() {},
          destroy() {},
        };
        memory.connections.push(conn);
        return conn;
      },
    },
  };
});

import { appRouter } from "./routers.js";

function staff(roles: StaffRole[], userId = 7): StaffIdentity {
  return {
    userId,
    sessionId: 1,
    name: "اختبار",
    loginName: "reservation-test",
    roles,
    expiresAt: Date.now() + 60_000,
  };
}

const sessions = new Map<string, StaffIdentity>();

function caller(identity: StaffIdentity | null) {
  const token = identity ? `staff-${identity.userId}` : undefined;
  if (identity && token) sessions.set(token, identity);
  validateStaffSession.mockImplementation(async (presented: string | undefined) =>
    presented ? sessions.get(presented) ?? null : null
  );
  return appRouter.createCaller({ staffToken: token });
}

beforeEach(() => {
  sessions.clear();
  validateStaffSession.mockReset();
  memory.connections = [];
  memory.transactionConnectionIds = [];
  memory.fail = null;
});

describe("reservation allocation", () => {
  it("keeps stock for an older unmet claim and never goes negative", () => {
    expect(legalAllocation(10, 8, 8)).toBe(2);
    expect(legalAllocation(10, 0, 8)).toBe(8);
    expect(legalAllocation(0, 0, 8)).toBe(0);
    expect(legalAllocation(4, 9, 8)).toBe(0);
    expect(legalAllocation(10, 8, 0)).toBe(0);
  });

  it("derives material state from snapshot requirements", () => {
    expect(deriveMaterialState([{ requiredQty: 4, reservedQty: 0 }])).toBe("pending_materials");
    expect(deriveMaterialState([{ requiredQty: 4, reservedQty: 1 }])).toBe("partially_reserved");
    expect(
      deriveMaterialState([
        { requiredQty: 4, reservedQty: 4 },
        { requiredQty: 2, reservedQty: 2 },
      ])
    ).toBe("fully_reserved");
  });

  it("sorts older commitments by priority, order, line, then reservation id", () => {
    const rows = [
      { priorityAt: 20, orderId: 1, lineNumber: 1, id: 2 },
      { priorityAt: 10, orderId: 9, lineNumber: 2, id: 8 },
      { priorityAt: 10, orderId: 3, lineNumber: 2, id: 4 },
      { priorityAt: 10, orderId: 3, lineNumber: 1, id: 9 },
      { priorityAt: 10, orderId: 3, lineNumber: 1, id: 5 },
    ];
    rows.sort((left, right) => {
      if (left.priorityAt !== right.priorityAt) return left.priorityAt - right.priorityAt;
      if (left.orderId !== right.orderId) return left.orderId - right.orderId;
      if (left.lineNumber !== right.lineNumber) return left.lineNumber - right.lineNumber;
      return left.id - right.id;
    });
    expect(rows.map((row) => row.id)).toEqual([5, 9, 4, 8, 2]);
  });
});

describe("reservation authorization", () => {
  it("allows only a stock manager to reserve", async () => {
    await expect(caller(null).reservation.reserve({ orderId: 1 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    for (const role of ["admin", "production_manager", "sales_coordinator"] as const) {
      await expect(caller(staff([role])).reservation.reserve({ orderId: 1 })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    }
    await expect(
      caller(staff(["stock_manager"])).reservation.reserve({ orderId: 1, quantity: 5 } as never)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller(staff(["stock_manager"])).reservation.reserve({ orderId: 1 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      caller(staff(["admin", "stock_manager"])).reservation.reserve({ orderId: 1 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("allows only admin to override priority and rejects other readers", async () => {
    await expect(
      caller(staff(["stock_manager"])).reservation.overridePriority({ orderId: 1, priorityAt: 10 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller(staff(["admin"])).reservation.overridePriority({ orderId: 1, priorityAt: 1.5 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller(staff(["admin"])).reservation.overridePriority({ orderId: 1, priorityAt: 10 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller(staff(["sales_person"])).reservation.status({ orderId: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(caller(staff(["sales_coordinator"])).reservation.status({ orderId: 1 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("runs priority override and reserve on the lock connection", async () => {
    await expect(
      caller(staff(["admin"])).reservation.overridePriority({ orderId: 1, priorityAt: 10 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(memory.connections).toHaveLength(1);
    expect(memory.transactionConnectionIds).toEqual([1]);
    expect(memory.connections[0]?.queries.some((query) => query.includes("GET_LOCK"))).toBe(true);
    expect(memory.connections[0]?.queries.some((query) => query.includes("RELEASE_LOCK"))).toBe(true);
  });
});

describe("reservation database conflicts", () => {
  it("maps reservation backstops and does not mask unexpected failures", () => {
    for (const errno of [1062, 1205, 1213, 1644, 3819]) {
      expect(conflictFromReservationDatabaseError({ errno })?.code).toBe("CONFLICT");
    }
    expect(conflictFromReservationDatabaseError({ sqlState: "45000" })?.code).toBe("CONFLICT");
    expect(conflictFromReservationDatabaseError({ code: "ER_CHECK_CONSTRAINT_VIOLATED" })?.code).toBe(
      "CONFLICT"
    );
    expect(conflictFromReservationDatabaseError({ cause: { errno: 1644 } })?.code).toBe("CONFLICT");
    expect(conflictFromReservationDatabaseError({ errno: 9999, message: "disk full" })).toBeNull();
  });

  it("maps advance and check failures through reserve", async () => {
    const stock = caller(staff(["stock_manager"]));
    memory.fail = new AdvancePaymentError("BAD_REQUEST", "overflow");
    await expect(stock.reservation.reserve({ orderId: 1 })).rejects.toMatchObject({ code: "CONFLICT" });
    memory.fail = Object.assign(new Error("check"), { errno: 3819 });
    await expect(stock.reservation.reserve({ orderId: 1 })).rejects.toMatchObject({ code: "CONFLICT" });
    memory.fail = Object.assign(new Error("disk full"), { errno: 9999 });
    await expect(stock.reservation.reserve({ orderId: 1 })).rejects.toThrow("disk full");
  });
});
