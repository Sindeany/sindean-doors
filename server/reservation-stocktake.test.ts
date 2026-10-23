/**
 * Stocktake reconciliation audits only changed reservation lines and
 * leaves the inventory cache write to the caller.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";

vi.mock("./db.js", async () => {
  const schema = await import("../drizzle/schema.js");
  return { schema, db: {}, pool: {} };
});

import { reconcileReservationsAfterStocktake } from "./reservation.js";

type Item = { id: number; currentQty: number; reservedQty: number };
type Line = {
  id: number;
  doorOrderId: number;
  bomSnapshotLineId: number;
  inventoryItemId: number;
  reservedQty: number;
  status: string;
};
type Order = {
  id: number;
  priorityAt: number | null;
  canonicalNumber: string | null;
  materialState: string;
};

const state = {
  items: [] as Item[],
  lines: [] as Line[],
  orders: [] as Order[],
  metas: [] as Array<{ id: number; lineNumber: number; snapshotId: number; requiredQty: number }>,
  snapshots: [] as Array<{ id: number; doorOrderId: number }>,
  requirements: [] as Array<{ id: number; requiredQty: number; snapshotId: number }>,
  audits: [] as Array<Record<string, unknown>>,
  inventoryWrites: 0,
};

function valuesOf(clause: unknown): unknown[] {
  const values: unknown[] = [];
  const seen = new Set<unknown>();
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (seen.has(node)) return;
    seen.add(node);
    const record = node as { value?: unknown; queryChunks?: unknown[] };
    if ("value" in record && "encoder" in record) {
      values.push(record.value);
      return;
    }
    record.queryChunks?.forEach(visit);
  };
  visit(clause);
  return values.flatMap((value) => (Array.isArray(value) ? value : [value]));
}

function numbers(values: unknown[]): number[] {
  return values.filter((value): value is number => typeof value === "number");
}

function rowsFor(table: string, values: unknown[]): unknown[] {
  const ids = numbers(values);
  if (table === "inventory_items") return state.items.filter((item) => ids.includes(item.id));
  if (table === "door_orders") return state.orders.filter((order) => ids.includes(order.id));
  if (table === "bom_snapshots") return state.snapshots.filter((row) => ids.includes(row.doorOrderId));
  if (table === "bom_snapshot_lines") {
    const byId = state.metas.filter((row) => ids.includes(row.id));
    if (byId.length > 0) return byId;
    const requirements = state.requirements.filter((row) => ids.includes(row.snapshotId));
    if (requirements.length > 0) return requirements;
    return state.metas.filter((row) => ids.includes(row.snapshotId));
  }
  if (table === "reservation_lines") {
    let rows = state.lines;
    if (values.includes("active")) rows = rows.filter((row) => row.status === "active");
    const orderIds = new Set(state.orders.map((order) => order.id));
    const itemIds = new Set(state.items.map((item) => item.id));
    if (ids.some((id) => orderIds.has(id)) && !ids.some((id) => itemIds.has(id))) {
      rows = rows.filter((row) => ids.includes(row.doorOrderId));
    } else if (ids.some((id) => itemIds.has(id))) {
      rows = rows.filter((row) => ids.includes(row.inventoryItemId));
    }
    return rows;
  }
  throw new Error(`unexpected table ${table}`);
}

const tx = {
  select() {
    return {
      from(table: unknown) {
        const name = getTableName(table as never);
        return {
          where(condition: unknown) {
            const rows = rowsFor(name, valuesOf(condition));
            return {
              limit: async () => rows.slice(0, 1),
              orderBy() {
                return rows;
              },
              then(onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
                return Promise.resolve(rows).then(onFulfilled, onRejected);
              },
            };
          },
        };
      },
    };
  },
  update(table: unknown) {
    return {
      set(data: Record<string, unknown>) {
        return {
          async where(condition: unknown) {
            const name = getTableName(table as never);
            if (name === "inventory_items") {
              state.inventoryWrites += 1;
              throw new Error("reconciliation wrote inventory before the paired update");
            }
            const id = numbers(valuesOf(condition))[0];
            if (name === "reservation_lines") {
              const row = state.lines.find((line) => line.id === id);
              if (row) Object.assign(row, data);
            }
            if (name === "door_orders") {
              const row = state.orders.find((order) => order.id === id);
              if (row && typeof data.materialState === "string") row.materialState = data.materialState;
            }
          },
        };
      },
    };
  },
  insert(table: unknown) {
    return {
      async values(row: Record<string, unknown>) {
        if (getTableName(table as never) !== "audit_events") throw new Error("unexpected insert");
        state.audits.push(row);
      },
    };
  },
};

beforeEach(() => {
  state.items = [];
  state.lines = [];
  state.orders = [];
  state.metas = [];
  state.snapshots = [];
  state.requirements = [];
  state.audits = [];
  state.inventoryWrites = 0;
});

describe("stocktake reservation reconciliation", () => {
  it("audits only the order whose reservation changed", async () => {
    state.items = [{ id: 1, currentQty: 8, reservedQty: 8 }];
    state.orders = [
      { id: 10, priorityAt: 100, canonicalNumber: "SD-A", materialState: "fully_reserved" },
      { id: 20, priorityAt: 200, canonicalNumber: "SD-B", materialState: "fully_reserved" },
    ];
    state.snapshots = [
      { id: 100, doorOrderId: 10 },
      { id: 200, doorOrderId: 20 },
    ];
    state.metas = [
      { id: 1000, lineNumber: 1, snapshotId: 100, requiredQty: 4 },
      { id: 2000, lineNumber: 1, snapshotId: 200, requiredQty: 4 },
    ];
    state.requirements = [
      { id: 1000, snapshotId: 100, requiredQty: 4 },
      { id: 2000, snapshotId: 200, requiredQty: 4 },
    ];
    state.lines = [
      { id: 501, doorOrderId: 10, bomSnapshotLineId: 1000, inventoryItemId: 1, reservedQty: 4, status: "active" },
      { id: 502, doorOrderId: 20, bomSnapshotLineId: 2000, inventoryItemId: 1, reservedQty: 4, status: "active" },
    ];

    const plan = await reconcileReservationsAfterStocktake(tx, 7, new Map([[1, 5]]), 50);
    expect(plan.finalReservedByItem.get(1)).toBe(5);
    expect(state.lines.find((line) => line.id === 501)).toMatchObject({ reservedQty: 4, status: "active" });
    expect(state.lines.find((line) => line.id === 502)).toMatchObject({ reservedQty: 1, status: "active" });
    expect(state.orders.find((order) => order.id === 10)?.materialState).toBe("fully_reserved");
    expect(state.orders.find((order) => order.id === 20)?.materialState).toBe("partially_reserved");
    expect(state.audits).toHaveLength(1);
    expect(state.audits[0]).toMatchObject({
      eventType: "order.reservation.reallocated",
      entityId: 20,
      canonicalNumber: "SD-B",
    });
    expect(state.audits[0]?.afterJson).toMatchObject({
      reason: "stocktake",
      materialState: "partially_reserved",
      lines: [
        {
          inventoryItemId: 1,
          bomSnapshotLineId: 2000,
          reservationLineId: 502,
          beforeReservedQty: 4,
          afterReservedQty: 1,
          beforeStatus: "active",
          afterStatus: "active",
        },
      ],
    });
    expect(JSON.stringify(state.audits)).not.toContain("customer");
    expect(state.inventoryWrites).toBe(0);
  });

  it("audits a pure cache repair without an order reallocation", async () => {
    state.items = [{ id: 1, currentQty: 2, reservedQty: 2 }];
    state.orders = [{ id: 10, priorityAt: 100, canonicalNumber: "SD-A", materialState: "fully_reserved" }];
    state.snapshots = [{ id: 100, doorOrderId: 10 }];
    state.metas = [{ id: 1000, lineNumber: 1, snapshotId: 100, requiredQty: 5 }];
    state.requirements = [{ id: 1000, snapshotId: 100, requiredQty: 5 }];
    state.lines = [
      { id: 501, doorOrderId: 10, bomSnapshotLineId: 1000, inventoryItemId: 1, reservedQty: 5, status: "active" },
    ];
    const plan = await reconcileReservationsAfterStocktake(tx, 7, new Map([[1, 5]]), 50);
    expect(plan.finalReservedByItem.get(1)).toBe(5);
    expect(state.lines[0]).toMatchObject({ reservedQty: 5, status: "active" });
    expect(state.audits).toHaveLength(1);
    expect(state.audits[0]).toMatchObject({
      eventType: "inventory.reservation_cache.repaired",
      entityType: "inventory_item",
      entityId: 1,
      beforeJson: { reason: "stocktake", reservedQty: 2, currentQty: 2 },
      afterJson: { reason: "stocktake", reservedQty: 5, currentQty: 5 },
    });
    expect(state.inventoryWrites).toBe(0);
  });

  it("reduces duplicate lines of one item in line-number order", async () => {
    state.items = [{ id: 1, currentQty: 6, reservedQty: 6 }];
    state.orders = [{ id: 10, priorityAt: 100, canonicalNumber: "SD-A", materialState: "fully_reserved" }];
    state.snapshots = [{ id: 100, doorOrderId: 10 }];
    state.metas = [
      { id: 1002, lineNumber: 2, snapshotId: 100, requiredQty: 3 },
      { id: 1001, lineNumber: 1, snapshotId: 100, requiredQty: 3 },
    ];
    state.requirements = [
      { id: 1001, snapshotId: 100, requiredQty: 3 },
      { id: 1002, snapshotId: 100, requiredQty: 3 },
    ];
    state.lines = [
      { id: 502, doorOrderId: 10, bomSnapshotLineId: 1002, inventoryItemId: 1, reservedQty: 3, status: "active" },
      { id: 501, doorOrderId: 10, bomSnapshotLineId: 1001, inventoryItemId: 1, reservedQty: 3, status: "active" },
    ];
    const plan = await reconcileReservationsAfterStocktake(tx, 7, new Map([[1, 4]]), 50);
    expect(state.lines.find((line) => line.id === 501)).toMatchObject({ reservedQty: 3, status: "active" });
    expect(state.lines.find((line) => line.id === 502)).toMatchObject({ reservedQty: 1, status: "active" });
    expect(plan.finalReservedByItem.get(1)).toBe(4);
    const audited = state.audits[0]?.afterJson as { lines: Array<{ bomSnapshotLineId: number }> };
    expect(audited.lines.map((line) => line.bomSnapshotLineId)).toEqual([1002]);
  });
});
