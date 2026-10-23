/**
 * inventory.delete never removes inventory_transactions.
 * History, balances, and authoritative references block deletion inside one transaction.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";

type Item = { id: number; currentQty: number; reservedQty: number };

const { validateAdminSession, memory } = vi.hoisted(() => ({
  validateAdminSession: vi.fn(),
  memory: {
    item: null as Item | null,
    txs: [] as Array<{ id: number; itemId: number; quantity: number }>,
    refs: {
      bom: false,
      snapshot: false,
      reservation: false,
      issue: false,
      legacyBom: false,
    },
    deletes: [] as string[],
    locks: [] as string[],
    transactions: 0,
    failDelete: null as Error | null,
  },
}));

vi.mock("./admin-sessions.js", () => ({
  validateAdminSession,
}));

vi.mock("./db.js", async () => {
  const schema = await import("../drizzle/schema.js");

  function rowsFor(tableName: string): Array<Record<string, unknown>> {
    if (tableName === "inventory_items") return memory.item ? [memory.item] : [];
    if (tableName === "inventory_transactions") {
      return memory.txs.filter((row) => row.itemId === memory.item?.id).slice(0, 1);
    }
    if (tableName === "bom_rules") return memory.refs.bom ? [{ id: 1 }] : [];
    if (tableName === "bom_snapshot_lines") return memory.refs.snapshot ? [{ id: 1 }] : [];
    if (tableName === "reservation_lines") return memory.refs.reservation ? [{ id: 1 }] : [];
    if (tableName === "material_issue_lines") return memory.refs.issue ? [{ id: 1 }] : [];
    if (tableName === "bom_items") return memory.refs.legacyBom ? [{ id: 1 }] : [];
    throw new Error("unexpected select " + tableName);
  }

  function builder(tableName: string) {
    const api = {
      from(table: unknown) {
        return builder(getTableName(table as never));
      },
      where() {
        return api;
      },
      for(mode: string) {
        memory.locks.push(`${tableName}:${mode}`);
        return api;
      },
      limit() {
        return Promise.resolve(rowsFor(tableName));
      },
    };
    return api;
  }

  const tx = {
    select() {
      return {
        from(table: unknown) {
          return builder(getTableName(table as never));
        },
      };
    },
    delete(table: unknown) {
      const tableName = getTableName(table as never);
      return {
        async where() {
          memory.deletes.push(tableName);
          if (tableName === "inventory_transactions") {
            memory.txs = [];
            return;
          }
          if (tableName !== "inventory_items") {
            throw new Error("unexpected delete " + tableName);
          }
          if (memory.failDelete) throw memory.failDelete;
          memory.item = null;
        },
      };
    },
  };

  return {
    schema,
    pool: {},
    db: {
      async transaction(run: (inner: typeof tx) => Promise<unknown>) {
        memory.transactions += 1;
        const snapshot = {
          item: memory.item ? { ...memory.item } : null,
          txs: memory.txs.map((row) => ({ ...row })),
        };
        try {
          return await run(tx);
        } catch (error) {
          memory.item = snapshot.item;
          memory.txs = snapshot.txs;
          throw error;
        }
      },
      delete() {
        throw new Error("delete outside transaction");
      },
    },
  };
});

import { inventoryRouter } from "./inventory.router.js";

function caller() {
  validateAdminSession.mockImplementation(async (token: string | undefined) => token === "valid-admin-token");
  return inventoryRouter.createCaller({ adminToken: "valid-admin-token" });
}

function signalError(): Error {
  return Object.assign(new Error("Inventory movements are append-only"), {
    errno: 1644,
    code: "ER_SIGNAL_EXCEPTION",
    sqlState: "45000",
  });
}

function fkError(): Error {
  return Object.assign(new Error("Cannot delete or update a parent row"), {
    errno: 1451,
    code: "ER_ROW_IS_REFERENCED_2",
    sqlState: "23000",
  });
}

beforeEach(() => {
  memory.item = { id: 7, currentQty: 0, reservedQty: 0 };
  memory.txs = [];
  memory.refs = { bom: false, snapshot: false, reservation: false, issue: false, legacyBom: false };
  memory.deletes = [];
  memory.locks = [];
  memory.transactions = 0;
  memory.failDelete = null;
  validateAdminSession.mockReset();
});

describe("inventory.delete ledger preservation", () => {
  it("rejects an item that already has movement history", async () => {
    memory.txs = [{ id: 3, itemId: 7, quantity: 5 }];
    await expect(caller().delete({ id: 7 })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(memory.item).toEqual({ id: 7, currentQty: 0, reservedQty: 0 });
    expect(memory.txs).toEqual([{ id: 3, itemId: 7, quantity: 5 }]);
    expect(memory.deletes).not.toContain("inventory_transactions");
    expect(memory.locks).toContain("inventory_items:update");
    expect(memory.transactions).toBe(1);
  });

  it("rejects a BOM reference and leaves movement history intact", async () => {
    memory.txs = [{ id: 4, itemId: 7, quantity: 2 }];
    memory.refs.bom = true;
    await expect(caller().delete({ id: 7 })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(memory.item?.id).toBe(7);
    expect(memory.txs).toHaveLength(1);
    expect(memory.deletes).not.toContain("inventory_transactions");
  });

  it("rejects an active reservation without changing balances", async () => {
    memory.item = { id: 7, currentQty: 10, reservedQty: 4 };
    memory.refs.reservation = true;
    await expect(caller().delete({ id: 7 })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(memory.item).toEqual({ id: 7, currentQty: 10, reservedQty: 4 });
    expect(memory.deletes).toEqual([]);
  });

  it("rejects deletion when only a legacy cost-sheet line references the item", async () => {
    memory.refs.legacyBom = true;
    await expect(caller().delete({ id: 7 })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(memory.item).toEqual({ id: 7, currentQty: 0, reservedQty: 0 });
    expect(memory.deletes).not.toContain("inventory_items");
    expect(memory.deletes).not.toContain("bom_items");
  });

  it("deletes an unused zero-balance item and does not touch the ledger", async () => {
    await expect(caller().delete({ id: 7 })).resolves.toEqual({ ok: true });
    expect(memory.item).toBeNull();
    expect(memory.txs).toEqual([]);
    expect(memory.deletes).toEqual(["inventory_items"]);
  });

  it("returns NOT_FOUND when the item does not exist", async () => {
    memory.item = null;
    await expect(caller().delete({ id: 99 })).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "المادة غير موجودة",
    });
    expect(memory.deletes).toEqual([]);
  });

  it("rolls back when item deletion hits a foreign key", async () => {
    memory.failDelete = fkError();
    await expect(caller().delete({ id: 7 })).rejects.toMatchObject({
      code: "CONFLICT",
      message: "لا يمكن حذف مادة مرتبطة بسجلات أخرى",
    });
    expect(memory.item).toEqual({ id: 7, currentQty: 0, reservedQty: 0 });
    expect(memory.deletes).toEqual(["inventory_items"]);
    expect(memory.deletes).not.toContain("inventory_transactions");
  });

  it("maps an inventory-ledger trigger signal to CONFLICT", async () => {
    memory.failDelete = signalError();
    await expect(caller().delete({ id: 7 })).rejects.toMatchObject({
      code: "CONFLICT",
      message: "لا يمكن حذف سجل حركات المخزون",
    });
    expect(memory.item).toEqual({ id: 7, currentQty: 0, reservedQty: 0 });
    expect(memory.txs).toEqual([]);
    expect(memory.deletes).not.toContain("inventory_transactions");
  });
});
