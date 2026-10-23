/**
 * Legacy cost-sheet writes lock inventory rows before copying a unit-dependent cost.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";

type Inv = { id: number; unit: string; unitCost: number };
type BomItem = {
  id: number;
  bomId: number;
  itemId: number;
  quantity: number;
  unitCost: number;
  totalCost: number;
  lineNumber: number;
};
type Bom = { id: number; totalCost: number; laborCost: number; wastagePercentage: number; productId: number };

const { validateAdminSession, memory } = vi.hoisted(() => ({
  validateAdminSession: vi.fn(),
  memory: {
    products: new Set<number>(),
    items: new Map<number, Inv>(),
    boms: new Map<number, Bom>(),
    lines: [] as BomItem[],
    lockOrder: [] as string[],
    failLineInsertsAfter: null as number | null,
    lineInserts: 0,
  },
}));

vi.mock("./admin-sessions.js", () => ({
  validateAdminSession,
}));

vi.mock("./db.js", async () => {
  const schema = await import("../drizzle/schema.js");

  function idsFrom(clause: unknown): number[] {
    const found: number[] = [];
    const seen = new Set<unknown>();
    const visit = (node: unknown, key?: string) => {
      if (typeof node === "number" && key === "value") found.push(node);
      if (!node || typeof node !== "object" || seen.has(node)) return;
      seen.add(node);
      if (Array.isArray(node)) {
        node.forEach((entry) => visit(entry));
        return;
      }
      for (const [childKey, child] of Object.entries(node as Record<string, unknown>)) visit(child, childKey);
    };
    visit(clause);
    return found;
  }

  function tx() {
    const api = {
      select() {
        return {
          from(table: unknown) {
            const name = getTableName(table as never);
            return {
              where(clause: unknown) {
                const id = idsFrom(clause)[0];
                const read = () => {
                  if (name === "products") return memory.products.has(id ?? -1) ? [{ id }] : [];
                  if (name === "inventory_items") {
                    const row = memory.items.get(id ?? -1);
                    return row ? [{ ...row }] : [];
                  }
                  if (name === "bom") {
                    const row = memory.boms.get(id ?? -1);
                    return row ? [{ ...row }] : [];
                  }
                  if (name === "bom_items") {
                    return memory.lines.filter((line) => line.bomId === id).map((line) => ({ ...line }));
                  }
                  throw new Error("unexpected select " + name);
                };
                const node = {
                  for(mode: string) {
                    if (mode !== "update") throw new Error(mode);
                    if (name === "inventory_items" && id != null) memory.lockOrder.push(`item:${id}`);
                    if (name === "bom" && id != null) memory.lockOrder.push(`bom:${id}`);
                    return node;
                  },
                  limit(count: number) {
                    return Promise.resolve(read().slice(0, count));
                  },
                  then(ok: (rows: unknown[]) => unknown, bad?: (error: unknown) => unknown) {
                    return Promise.resolve(read()).then(ok, bad);
                  },
                };
                return node;
              },
            };
          },
        };
      },
      insert(table: unknown) {
        const name = getTableName(table as never);
        return {
          async values(row: Record<string, unknown>) {
            if (name === "bom") {
              const id = memory.boms.size + 1;
              memory.boms.set(id, {
                id,
                totalCost: Number(row.totalCost),
                laborCost: Number(row.laborCost),
                wastagePercentage: Number(row.wastagePercentage),
                productId: Number(row.productId),
              });
              return [{ insertId: id }];
            }
            if (name === "bom_items") {
              memory.lineInserts += 1;
              if (memory.failLineInsertsAfter != null && memory.lineInserts > memory.failLineInsertsAfter) {
                throw new Error("forced line insert failure");
              }
              memory.lines.push({
                id: memory.lines.length + 1,
                bomId: Number(row.bomId),
                itemId: Number(row.itemId),
                quantity: Number(row.quantity),
                unitCost: Number(row.unitCost),
                totalCost: Number(row.totalCost),
                lineNumber: Number(row.lineNumber),
              });
              return [{ insertId: memory.lines.length }];
            }
            if (name === "bom_history") return [{ insertId: 1 }];
            throw new Error("unexpected insert " + name);
          },
        };
      },
      update(table: unknown) {
        const name = getTableName(table as never);
        return {
          set(values: Record<string, unknown>) {
            return {
              async where(clause: unknown) {
                if (name !== "bom") throw new Error("unexpected update " + name);
                const row = memory.boms.get(idsFrom(clause)[0] ?? -1);
                if (!row) throw new Error("missing bom");
                if ("totalCost" in values) row.totalCost = Number(values.totalCost);
                if ("laborCost" in values) row.laborCost = Number(values.laborCost);
                if ("wastagePercentage" in values) row.wastagePercentage = Number(values.wastagePercentage);
              },
            };
          },
        };
      },
      delete(table: unknown) {
        const name = getTableName(table as never);
        return {
          async where(clause: unknown) {
            if (name !== "bom_items") throw new Error("unexpected delete " + name);
            const bomId = idsFrom(clause)[0];
            memory.lines = memory.lines.filter((line) => line.bomId !== bomId);
          },
        };
      },
    };
    return api;
  }

  return {
    schema,
    pool: {},
    db: {
      async transaction(run: (inner: ReturnType<typeof tx>) => Promise<unknown>) {
        const snap = {
          boms: new Map([...memory.boms].map(([id, row]) => [id, { ...row }])),
          lines: memory.lines.map((line) => ({ ...line })),
          lineInserts: memory.lineInserts,
        };
        try {
          return await run(tx());
        } catch (error) {
          memory.boms = snap.boms;
          memory.lines = snap.lines;
          memory.lineInserts = snap.lineInserts;
          throw error;
        }
      },
    },
  };
});

import { bomRouter } from "./bom.router.js";

function admin() {
  validateAdminSession.mockImplementation(async (token: string | undefined) => token === "admin");
  return bomRouter.createCaller({ adminToken: "admin" });
}

beforeEach(() => {
  memory.products = new Set([1]);
  memory.items = new Map([
    [2, { id: 2, unit: "piece", unitCost: 10 }],
    [5, { id: 5, unit: "mm", unitCost: 4 }],
  ]);
  memory.boms = new Map();
  memory.lines = [];
  memory.lockOrder = [];
  memory.failLineInsertsAfter = null;
  memory.lineInserts = 0;
  validateAdminSession.mockReset();
});

describe("legacy cost-sheet concurrency", () => {
  it("creates a BOM from locked inventory costs and locks ids in ascending order", async () => {
    const result = await admin().create({
      productId: 1,
      laborCost: 5,
      wastagePercentage: 10,
      items: [
        { itemId: 5, quantity: 2, expectedUnit: "mm" },
        { itemId: 2, quantity: 3, expectedUnit: "piece" },
        { itemId: 2, quantity: 1, expectedUnit: "piece" },
      ],
    });
    expect(result).toEqual({ bomId: 1, totalCost: 57.8 });
    expect(memory.lockOrder).toEqual(["item:2", "item:5"]);
    expect(memory.lines.map((line) => [line.itemId, line.unitCost, line.totalCost])).toEqual([
      [5, 4, 8],
      [2, 10, 30],
      [2, 10, 10],
    ]);
  });

  it("rolls back the whole create when an inventory item is missing", async () => {
    await expect(
      admin().create({
        productId: 1,
        items: [
          { itemId: 2, quantity: 1, expectedUnit: "piece" },
          { itemId: 99, quantity: 1, expectedUnit: "piece" },
        ],
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(memory.boms.size).toBe(0);
    expect(memory.lines).toEqual([]);
  });

  it("replaces cost-sheet lines atomically and keeps the original rows when insertion fails", async () => {
    memory.boms.set(7, { id: 7, totalCost: 10, laborCost: 0, wastagePercentage: 0, productId: 1 });
    memory.lines.push({ id: 1, bomId: 7, itemId: 2, quantity: 1, unitCost: 10, totalCost: 10, lineNumber: 1 });
    memory.failLineInsertsAfter = 0;
    await expect(
      admin().update({
        bomId: 7,
        items: [
          { itemId: 5, quantity: 2, expectedUnit: "mm" },
          { itemId: 2, quantity: 1, expectedUnit: "piece" },
        ],
      })
    ).rejects.toThrow("forced line insert failure");
    expect(memory.lines).toEqual([
      { id: 1, bomId: 7, itemId: 2, quantity: 1, unitCost: 10, totalCost: 10, lineNumber: 1 },
    ]);
    expect(memory.boms.get(7)?.totalCost).toBe(10);
  });

  it("updates a BOM from the locked costs after locking the header first", async () => {
    memory.boms.set(7, { id: 7, totalCost: 10, laborCost: 0, wastagePercentage: 0, productId: 1 });
    memory.lines.push({ id: 1, bomId: 7, itemId: 5, quantity: 1, unitCost: 4, totalCost: 4, lineNumber: 1 });
    await expect(
      admin().update({
        bomId: 7,
        laborCost: 1,
        items: [{ itemId: 2, quantity: 2, expectedUnit: "piece" }],
      })
    ).resolves.toEqual({ success: true });
    expect(memory.lockOrder[0]).toBe("bom:7");
    expect(memory.lockOrder.filter((entry) => entry.startsWith("item:"))).toEqual(["item:2", "item:5"]);
    expect(memory.lines).toEqual([
      expect.objectContaining({ bomId: 7, itemId: 2, quantity: 2, unitCost: 10, totalCost: 20 }),
    ]);
    expect(memory.boms.get(7)?.totalCost).toBe(21);
  });

  it("rejects create when the captured unit is piece and the locked unit is mm", async () => {
    await expect(
      admin().create({
        productId: 1,
        items: [{ itemId: 5, quantity: 2, expectedUnit: "piece" }],
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(memory.boms.size).toBe(0);
    expect(memory.lines).toEqual([]);
  });

  it("rejects an update when one replacement line has a stale unit and keeps the original lines", async () => {
    memory.boms.set(7, { id: 7, totalCost: 10, laborCost: 0, wastagePercentage: 0, productId: 1 });
    memory.lines.push({ id: 1, bomId: 7, itemId: 2, quantity: 1, unitCost: 10, totalCost: 10, lineNumber: 1 });
    await expect(
      admin().update({
        bomId: 7,
        laborCost: 99,
        items: [
          { itemId: 2, quantity: 2, expectedUnit: "piece" },
          { itemId: 5, quantity: 1, expectedUnit: "piece" },
        ],
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(memory.lines).toEqual([
      { id: 1, bomId: 7, itemId: 2, quantity: 1, unitCost: 10, totalCost: 10, lineNumber: 1 },
    ]);
    expect(memory.boms.get(7)?.totalCost).toBe(10);
    expect(memory.boms.get(7)?.laborCost).toBe(0);
  });

  it("rejects a line that omits the captured unit before any write", async () => {
    await expect(
      admin().create({
        productId: 1,
        items: [{ itemId: 2, quantity: 1 }],
      } as never)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(memory.boms.size).toBe(0);
    expect(memory.lockOrder).toEqual([]);
  });
});
