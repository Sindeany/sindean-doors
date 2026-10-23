/**
 * consumeForWorkOrder locks the item row and refuses to pass reserved_qty.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { memory } = vi.hoisted(() => ({
  memory: {
    items: [] as Array<Record<string, unknown>>,
    txs: [] as Array<Record<string, unknown>>,
    updates: [] as Array<Record<string, unknown>>,
    lockOrder: [] as number[],
    forUpdate: [] as string[],
    failUpdate: false,
  },
}));

vi.mock("./admin-sessions.js", () => ({
  validateAdminSession: async () => true,
}));

vi.mock("./db.js", async () => {
  const schema = await import("../drizzle/schema.js");
  const { getTableName } = await import("drizzle-orm");

  function itemId(condition: unknown): number {
    const values: number[] = [];
    const seen = new Set<unknown>();
    const visit = (node: unknown) => {
      if (!node || typeof node !== "object" || seen.has(node)) return;
      seen.add(node);
      const record = node as { value?: unknown; queryChunks?: unknown[] };
      if (typeof record.value === "number") values.push(record.value);
      record.queryChunks?.forEach(visit);
    };
    visit(condition);
    const id = values.find((value) => Number.isInteger(value));
    if (id == null) throw new Error("missing item id");
    return id;
  }

  const tx = {
    select() {
      return {
        from() {
          return {
            where(condition: unknown) {
              return {
                for(mode: string) {
                  memory.forUpdate.push(mode);
                  const id = itemId(condition);
                  memory.lockOrder.push(id);
                  return {
                    async limit() {
                      const row = memory.items.find((item) => item.id === id);
                      return row ? [{ ...row }] : [];
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
    insert() {
      return {
        async values(row: Record<string, unknown>) {
          memory.txs.push({ ...row });
        },
      };
    },
    update() {
      return {
        set(data: Record<string, unknown>) {
          return {
            async where(condition: unknown) {
              if (memory.failUpdate) throw Object.assign(new Error("check"), { errno: 3819 });
              const id = itemId(condition);
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
      insert() {
        throw new Error("consume wrote outside the transaction");
      },
      update() {
        throw new Error("consume wrote outside the transaction");
      },
    },
  };
});

import { inventoryRouter } from "./inventory.router.js";

function caller() {
  return inventoryRouter.createCaller({ adminToken: "admin-session" });
}

beforeEach(() => {
  memory.items = [
    { id: 2, name: "لوح", unit: "لوح", currentQty: 10, reservedQty: 8 },
    { id: 5, name: "فيلم", unit: "رول", currentQty: 4, reservedQty: 0 },
  ];
  memory.txs = [];
  memory.updates = [];
  memory.lockOrder = [];
  memory.forUpdate = [];
  memory.failUpdate = false;
});

describe("inventory.consumeForWorkOrder", () => {
  it("locks rows and rejects a balance below the reservation", async () => {
    await expect(
      caller().consumeForWorkOrder({
        workOrderRef: "WO-1",
        consumptions: [
          { itemId: 5, quantity: 1 },
          { itemId: 2, quantity: 3 },
        ],
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(memory.forUpdate).toEqual(["update", "update"]);
    expect(memory.lockOrder).toEqual([2, 5]);
    expect(memory.items.find((item) => item.id === 2)?.currentQty).toBe(10);
    expect(memory.items.find((item) => item.id === 5)?.currentQty).toBe(4);
    expect(memory.txs).toHaveLength(0);
  });

  it("consumes inside the transaction and rolls back a failed update", async () => {
    memory.items = [{ id: 2, name: "لوح", unit: "لوح", currentQty: 10, reservedQty: 0 }];
    const result = await caller().consumeForWorkOrder({
      workOrderRef: "WO-2",
      performedBy: "نظام أوامر التشغيل",
      consumptions: [{ itemId: 2, quantity: 4 }],
    });
    expect(result.warnings).toEqual([]);
    expect(memory.txs[0]).toMatchObject({
      type: "consume",
      quantity: 4,
      balanceBefore: 10,
      balanceAfter: 6,
      performedBy: "نظام أوامر التشغيل",
    });
    expect(memory.txs[0]).not.toHaveProperty("staffUserId");
    expect(memory.items[0]?.currentQty).toBe(6);

    memory.failUpdate = true;
    memory.txs = [];
    await expect(
      caller().consumeForWorkOrder({
        workOrderRef: "WO-3",
        consumptions: [{ itemId: 2, quantity: 1 }],
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(memory.items[0]?.currentQty).toBe(6);
    expect(memory.txs).toHaveLength(0);
  });
});
