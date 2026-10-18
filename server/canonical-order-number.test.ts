/**
 * Canonical factory order numbers.
 * Sequence format and the Riyadh year are executed directly.
 * Create and update procedures run against an in-memory counter.
 * Real InnoDB locking is rehearsed separately and is not part of pnpm test.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "../drizzle/schema.js";
import {
  CanonicalSequenceExhaustedError,
  allocateCanonicalOrderNumber,
  formatCanonicalOrderNumber,
  nextCanonicalSequence,
} from "./canonical-order-number.js";
import { factoryCalendarYear } from "./factory-time.js";

const state = vi.hoisted(() => ({
  doorInserts: [] as Array<Record<string, unknown>>,
  orderUpdates: [] as unknown[],
  counters: new Map<number, { lastValue: number; updatedAt: number }>(),
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
            return [{ insertId: 100 + state.doorInserts.length }];
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
      return {
        set(values: { lastValue: number; updatedAt: number }) {
          return {
            async where() {
              if (table !== schema.orderNumberCounters) {
                throw new Error("unexpected counter update target");
              }
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

vi.mock("./db.js", async () => {
  const realSchema = await import("../drizzle/schema.js");
  const session = {
    id: 1,
    token: "valid-admin-token",
    expiresAt: Date.now() + 60 * 60 * 1000,
    createdAt: Date.now(),
  };
  return {
    schema: realSchema,
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [session],
          }),
        }),
      }),
      update: () => ({
        set: (values: unknown) => ({
          where: async () => {
            state.orderUpdates.push(values);
          },
        }),
      }),
      query: {
        doorOrders: {
          findFirst: async () => null,
        },
      },
      transaction: async (fn: (tx: ReturnType<typeof counterExecutor>) => Promise<unknown>) =>
        fn(counterExecutor()),
    },
  };
});

import { appRouter } from "./routers.js";

const admin = appRouter.createCaller({ adminToken: "valid-admin-token" });

const orderInput = {
  customerName: "عميل تجريبي",
  customerPhone: "0500000000",
  productId: "door-1",
  productName: "باب سنديان",
  selections: { finish: "oak" },
  subSelections: {},
};

beforeEach(() => {
  state.doorInserts.length = 0;
  state.orderUpdates.length = 0;
  state.counters.clear();
});

describe("canonical order number format", () => {
  it("pads sequences through the six-digit maximum", () => {
    expect(formatCanonicalOrderNumber(2026, 1)).toBe("SD-2026-000001");
    expect(formatCanonicalOrderNumber(2026, 9)).toBe("SD-2026-000009");
    expect(formatCanonicalOrderNumber(2026, 10)).toBe("SD-2026-000010");
    expect(formatCanonicalOrderNumber(2026, 999999)).toBe("SD-2026-999999");
  });

  it("rejects a seven-digit sequence", () => {
    expect(nextCanonicalSequence(2026, 999998)).toBe(999999);
    expect(() => nextCanonicalSequence(2026, 999999)).toThrow(
      CanonicalSequenceExhaustedError
    );
    expect(() => formatCanonicalOrderNumber(2026, 1_000_000)).toThrow(
      CanonicalSequenceExhaustedError
    );
  });
});

describe("factory calendar year", () => {
  it("uses the Asia/Riyadh year across the UTC new-year boundary", () => {
    expect(factoryCalendarYear(new Date("2026-12-31T20:59:59.000Z"))).toBe(2026);
    expect(factoryCalendarYear(new Date("2026-12-31T21:00:00.000Z"))).toBe(2027);
  });
});

describe("allocateCanonicalOrderNumber", () => {
  const in2026 = new Date("2026-06-15T12:00:00.000Z");
  const beforeRiyadh2027 = new Date("2026-12-31T20:59:59.000Z");
  const riyadh2027 = new Date("2026-12-31T21:00:00.000Z");

  it("allocates the next number for the Riyadh year and stops at 999999", async () => {
    const tx = counterExecutor() as never;
    await expect(allocateCanonicalOrderNumber(tx, in2026)).resolves.toBe("SD-2026-000001");
    state.counters.set(2026, { lastValue: 8, updatedAt: 1 });
    await expect(allocateCanonicalOrderNumber(tx, in2026)).resolves.toBe("SD-2026-000009");
    state.counters.set(2026, { lastValue: 9, updatedAt: 1 });
    await expect(allocateCanonicalOrderNumber(tx, in2026)).resolves.toBe("SD-2026-000010");
    state.counters.set(2026, { lastValue: 999998, updatedAt: 1 });
    await expect(allocateCanonicalOrderNumber(tx, in2026)).resolves.toBe("SD-2026-999999");
    state.counters.set(2026, { lastValue: 999999, updatedAt: 1 });
    await expect(allocateCanonicalOrderNumber(tx, in2026)).rejects.toBeInstanceOf(
      CanonicalSequenceExhaustedError
    );
    expect(state.counters.get(2026)?.lastValue).toBe(999999);
  });

  it("chooses the year from the server instant, including the Riyadh boundary", async () => {
    const tx = counterExecutor() as never;
    await expect(allocateCanonicalOrderNumber(tx, beforeRiyadh2027)).resolves.toBe(
      "SD-2026-000001"
    );
    await expect(allocateCanonicalOrderNumber(tx, riyadh2027)).resolves.toBe("SD-2027-000001");
    expect(state.counters.get(2026)?.lastValue).toBe(1);
    expect(state.counters.get(2027)?.lastValue).toBe(1);
  });
});

describe("orders.create canonical number", () => {
  it("stores the server number and ignores a client-supplied number", async () => {
    const result = await admin.orders.create({
      ...orderInput,
      canonicalNumber: "SD-1999-000001",
      canonical_number: "SD-1999-000002",
      year: 1999,
    } as never);
    expect(result.success).toBe(true);
    expect(result.canonicalNumber).toBe(
      `SD-${factoryCalendarYear(new Date())}-000001`
    );
    expect(result.canonicalNumber).not.toBe("SD-1999-000001");
    expect(state.doorInserts).toHaveLength(1);
    expect(state.doorInserts[0]?.canonicalNumber).toBe(result.canonicalNumber);
    expect(JSON.stringify(state.doorInserts[0])).not.toContain("SD-1999-");
  });

  it("does not insert an order when the year sequence is exhausted", async () => {
    const year = factoryCalendarYear(new Date());
    state.counters.set(year, { lastValue: 999999, updatedAt: 1 });
    await expect(admin.orders.create(orderInput)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(state.doorInserts).toHaveLength(0);
    expect(state.counters.get(year)?.lastValue).toBe(999999);
  });
});

describe("order updates cannot change canonical_number", () => {
  it("leaves canonicalNumber out of status, payment, and workflow writes", async () => {
    await admin.orders.updateStatus({
      id: 4,
      status: "reviewing",
      canonicalNumber: "SD-2026-000099",
    } as never);
    await admin.orders.updatePaymentStatus({
      id: 4,
      paymentStatus: "partial",
      canonicalNumber: "SD-2026-000099",
    } as never);
    await admin.orders.updateWorkflowStage({
      id: 4,
      workflowStage: "po_review",
      canonicalNumber: "SD-2026-000099",
    } as never);

    expect(state.orderUpdates).toHaveLength(3);
    const serialized = JSON.stringify(state.orderUpdates);
    expect(serialized).not.toContain("canonicalNumber");
    expect(serialized).not.toContain("canonical_number");
    expect(serialized).not.toContain("SD-2026-000099");
    expect(state.orderUpdates[0]).toMatchObject({ status: "reviewing" });
    expect(state.orderUpdates[1]).toMatchObject({ paymentStatus: "partial" });
    expect(state.orderUpdates[2]).toMatchObject({ workflowStage: "po_review" });
  });
});
