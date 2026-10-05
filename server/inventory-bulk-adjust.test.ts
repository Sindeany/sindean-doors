/**
 * Phase 2B-4B-6 — inventory.bulkAdjustForStocktaking.
 * Isolated fixtures. Does not touch local inventory data.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import type { StaffIdentity, StaffRole } from "./staff-sessions.js";

const { validateStaffSession, memory } = vi.hoisted(() => ({
  validateStaffSession: vi.fn(),
  memory: {
    items: [] as Array<Record<string, unknown>>,
    txs: [] as Array<Record<string, unknown>>,
    updates: [] as Array<Record<string, unknown>>,
    lockOrder: [] as number[],
    forUpdateModes: [] as string[],
    transactionCalls: 0,
    outerWrites: 0,
    failOnUpdateId: null as number | null,
  },
}));

function collectNumbers(node: unknown, out: number[] = []): number[] {
  if (!node || typeof node !== "object") return out;
  const record = node as { value?: unknown; queryChunks?: unknown[] };
  if (typeof record.value === "number") out.push(record.value);
  if (Array.isArray(record.queryChunks)) {
    for (const chunk of record.queryChunks) collectNumbers(chunk, out);
  }
  return out;
}

function itemIdFrom(condition: unknown): number {
  const ids = collectNumbers(condition);
  const id = ids.find((value) => Number.isInteger(value));
  if (id == null) throw new Error("could not read item id from query");
  return id;
}

vi.mock("./db.js", async () => {
  const schema = await import("../drizzle/schema.js");

  function rejectOuter() {
    memory.outerWrites += 1;
    throw new Error("write outside transaction");
  }

  const tx = {
    select() {
      return {
        from() {
          return {
            where(condition: unknown) {
              return {
                for(mode: string) {
                  const id = itemIdFrom(condition);
                  memory.lockOrder.push(id);
                  memory.forUpdateModes.push(mode);
                  return {
                    async limit() {
                      const row = memory.items.find((item) => item.id === id);
                      return row ? [row] : [];
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
    insert(table: unknown) {
      return {
        async values(row: Record<string, unknown>) {
          if (getTableName(table as never) !== "inventory_transactions") {
            throw new Error("unexpected insert");
          }
          memory.txs.push({ ...row });
        },
      };
    },
    update(table: unknown) {
      return {
        set(data: Record<string, unknown>) {
          return {
            async where(condition: unknown) {
              if (getTableName(table as never) !== "inventory_items") {
                throw new Error("unexpected update");
              }
              const id = itemIdFrom(condition);
              if (memory.failOnUpdateId === id) throw new Error("forced item failure");
              memory.updates.push({ id, ...data });
              const row = memory.items.find((item) => item.id === id);
              if (row) Object.assign(row, data);
            },
          };
        },
      };
    },
  };

  return {
    schema,
    pool: {},
    db: {
      async transaction(run: (inner: typeof tx) => Promise<unknown>) {
        memory.transactionCalls += 1;
        const items = structuredClone(memory.items);
        const txs = structuredClone(memory.txs);
        const updates = structuredClone(memory.updates);
        try {
          return await run(tx);
        } catch (error) {
          memory.items = items;
          memory.txs = txs;
          memory.updates = updates;
          throw error;
        }
      },
      insert: rejectOuter,
      update: rejectOuter,
      delete: rejectOuter,
    },
  };
});

vi.mock("./staff-sessions.js", () => ({
  validateStaffSession,
}));

import { inventoryRouter } from "./inventory.router.js";

function identity(roles: StaffRole[], userId: number, name: string): StaffIdentity {
  return {
    userId,
    sessionId: 700 + userId,
    name,
    loginName: "stock-" + userId,
    roles,
    expiresAt: Date.now() + 60_000,
  };
}

function caller(options: {
  staff?: StaffIdentity | null;
  adminToken?: string;
  origin?: string;
}) {
  validateStaffSession.mockImplementation(async (token: string | undefined) => {
    if (!token || !options.staff) return null;
    return options.staff;
  });
  return inventoryRouter.createCaller({
    adminToken: options.adminToken,
    staffToken: options.staff ? "staff-session" : undefined,
    req: { headers: options.origin ? { origin: options.origin } : {} } as never,
  });
}

const stockManager = () => identity(["stock_manager"], 11, "فهد المخزون");

function payload(adjustments: Array<{ itemId: number; actualQty: number; note?: string }>) {
  return {
    sessionRef: "ST-TEST-1",
    date: "2026-10-05",
    adjustments,
  };
}

beforeEach(() => {
  memory.items = [
    { id: 2, currentQty: 10 },
    { id: 5, currentQty: 10 },
  ];
  memory.txs = [];
  memory.updates = [];
  memory.lockOrder = [];
  memory.forUpdateModes = [];
  memory.transactionCalls = 0;
  memory.outerWrites = 0;
  memory.failOnUpdateId = null;
  validateStaffSession.mockReset();
});

describe("inventory.bulkAdjustForStocktaking authorization", () => {
  const input = payload([{ itemId: 2, actualQty: 7 }]);

  it("rejects a missing staff session", async () => {
    await expect(caller({}).bulkAdjustForStocktaking(input)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects a legacy admin session without staff identity", async () => {
    await expect(
      caller({ adminToken: "legacy-admin" }).bulkAdjustForStocktaking(input)
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a staff admin who is not a stock manager", async () => {
    await expect(
      caller({ staff: identity(["admin"], 1, "مدير") }).bulkAdjustForStocktaking(input)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects an unrelated staff role", async () => {
    await expect(
      caller({ staff: identity(["packing"], 4, "تعبئة") }).bulkAdjustForStocktaking(input)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a hostile origin before writing", async () => {
    await expect(
      caller({
        staff: stockManager(),
        origin: "https://evil.example",
      }).bulkAdjustForStocktaking(input)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(memory.transactionCalls).toBe(0);
    expect(memory.txs).toHaveLength(0);
  });

  it("allows a stock manager", async () => {
    await expect(
      caller({ staff: stockManager() }).bulkAdjustForStocktaking(input)
    ).resolves.toMatchObject({ ok: true, count: 1, unchanged: 0 });
  });
});

describe("inventory.bulkAdjustForStocktaking actor and input", () => {
  it("stores the authenticated staff actor and ignores a spoofed performedBy", async () => {
    await caller({ staff: stockManager() }).bulkAdjustForStocktaking({
      ...payload([{ itemId: 2, actualQty: 7, note: "نقص" }]),
      performedBy: "اسم مزور",
    } as never);

    expect(memory.txs[0]).toMatchObject({
      staffUserId: 11,
      performedBy: "فهد المخزون",
      type: "adjust",
      quantity: -3,
      balanceBefore: 10,
      balanceAfter: 7,
      reference: "ST-TEST-1",
      note: "نقص",
      date: "2026-10-05",
    });
    expect(memory.txs[0]?.performedBy).not.toBe("اسم مزور");
    expect(memory.items.find((item) => item.id === 2)?.currentQty).toBe(7);
  });

  it("rejects duplicate item ids before any write", async () => {
    await expect(
      caller({ staff: stockManager() }).bulkAdjustForStocktaking(
        payload([
          { itemId: 2, actualQty: 7 },
          { itemId: 2, actualQty: 4 },
        ])
      )
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(memory.transactionCalls).toBe(0);
    expect(memory.txs).toHaveLength(0);
    expect(memory.updates).toHaveLength(0);
    expect(memory.items.find((item) => item.id === 2)?.currentQty).toBe(10);
  });

  it("rejects a negative counted quantity", async () => {
    await expect(
      caller({ staff: stockManager() }).bulkAdjustForStocktaking(
        payload([{ itemId: 2, actualQty: -1 }])
      )
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(memory.transactionCalls).toBe(0);
  });

  it("rejects an empty adjustment list", async () => {
    await expect(
      caller({ staff: stockManager() }).bulkAdjustForStocktaking(payload([]))
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(memory.transactionCalls).toBe(0);
  });
});

describe("inventory.bulkAdjustForStocktaking batch behavior", () => {
  it("commits two changed items together", async () => {
    const result = await caller({ staff: stockManager() }).bulkAdjustForStocktaking(
      payload([
        { itemId: 5, actualQty: 15 },
        { itemId: 2, actualQty: 7 },
      ])
    );
    expect(result).toEqual({ ok: true, count: 2, unchanged: 0 });
    expect(memory.outerWrites).toBe(0);
    expect(memory.items.find((item) => item.id === 2)?.currentQty).toBe(7);
    expect(memory.items.find((item) => item.id === 5)?.currentQty).toBe(15);
    expect(memory.txs).toEqual([
      expect.objectContaining({ itemId: 2, quantity: -3, balanceBefore: 10, balanceAfter: 7 }),
      expect.objectContaining({ itemId: 5, quantity: 5, balanceBefore: 10, balanceAfter: 15 }),
    ]);
  });

  it("rolls back the first item when a later item update fails", async () => {
    memory.failOnUpdateId = 5;
    await expect(
      caller({ staff: stockManager() }).bulkAdjustForStocktaking(
        payload([
          { itemId: 2, actualQty: 7 },
          { itemId: 5, actualQty: 4 },
        ])
      )
    ).rejects.toThrow("forced item failure");
    expect(memory.items.find((item) => item.id === 2)?.currentQty).toBe(10);
    expect(memory.items.find((item) => item.id === 5)?.currentQty).toBe(10);
    expect(memory.txs).toHaveLength(0);
    expect(memory.updates).toHaveLength(0);
  });

  it("rolls back the whole batch when an item is missing", async () => {
    await expect(
      caller({ staff: stockManager() }).bulkAdjustForStocktaking(
        payload([
          { itemId: 2, actualQty: 7 },
          { itemId: 99, actualQty: 1 },
        ])
      )
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(memory.items.find((item) => item.id === 2)?.currentQty).toBe(10);
    expect(memory.txs).toHaveLength(0);
    expect(memory.updates).toHaveLength(0);
  });

  it("does not write a transaction or quantity update for a zero delta", async () => {
    const result = await caller({ staff: stockManager() }).bulkAdjustForStocktaking(
      payload([
        { itemId: 2, actualQty: 10 },
        { itemId: 5, actualQty: 7 },
      ])
    );
    expect(result).toEqual({ ok: true, count: 1, unchanged: 1 });
    expect(memory.txs).toHaveLength(1);
    expect(memory.txs[0]?.itemId).toBe(5);
    expect(memory.updates.map((row) => row.id)).toEqual([5]);
    expect(memory.items.find((item) => item.id === 2)?.currentQty).toBe(10);
  });

  it("locks every affected row FOR UPDATE in ascending id order", async () => {
    await caller({ staff: stockManager() }).bulkAdjustForStocktaking(
      payload([
        { itemId: 5, actualQty: 8 },
        { itemId: 2, actualQty: 9 },
      ])
    );
    expect(memory.forUpdateModes).toEqual(["update", "update"]);
    expect(memory.lockOrder).toEqual([2, 5]);
  });
});
