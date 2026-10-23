/**
 * Legacy workflow and payment writes stop at the commercial lifecycle boundary.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";

type Order = {
  id: number;
  commercialStatus: string | null;
  notes: string | null;
  workflowStage: string;
  totalDoors: number;
  paymentStatus: string;
  materialState: string;
  acceptedTotalMinor: bigint | null;
  status: string;
};

const { validateAdminSession, memory } = vi.hoisted(() => ({
  validateAdminSession: vi.fn(),
  memory: {
    orders: new Map<number, Order>(),
    distributors: new Map<number, { id: number; status: string }>(),
    payments: [] as Array<{ id: number; amount: bigint }>,
    locks: [] as number[],
    inventoryTouches: 0,
  },
}));

vi.mock("./admin-sessions.js", () => ({
  validateAdminSession,
}));

vi.mock("./db.js", async () => {
  const schema = await import("../drizzle/schema.js");

  function clauseParts(clause: unknown): { numbers: number[]; strings: string[] } {
    const numbers: number[] = [];
    const strings: string[] = [];
    const seen = new Set<unknown>();
    const visit = (node: unknown, key?: string) => {
      if (typeof node === "string") {
        strings.push(node);
        return;
      }
      if (typeof node === "number" && key === "value" && Number.isFinite(node)) {
        numbers.push(node);
        return;
      }
      if (!node || typeof node !== "object" || seen.has(node)) return;
      seen.add(node);
      if (Array.isArray(node)) {
        node.forEach((entry) => visit(entry));
        return;
      }
      for (const [childKey, child] of Object.entries(node as Record<string, unknown>)) {
        visit(child, childKey);
      }
    };
    visit(clause);
    return { numbers, strings };
  }

  function readOrders(clause: unknown): Order[] {
    const parts = clauseParts(clause);
    const prefix = parts.strings.find((value) => value.startsWith("DIST_ORDER_ID:"));
    if (prefix) {
      const needle = prefix.replace(/%$/, "");
      return [...memory.orders.values()].filter((order) => order.notes?.startsWith(needle));
    }
    const id = parts.numbers[0];
    const order = id == null ? undefined : memory.orders.get(id);
    return order ? [order] : [];
  }

  function txApi() {
    const locked = new Set<number>();
    return {
      select() {
        return {
          from(table: unknown) {
            const name = getTableName(table as never);
            return {
              where(clause: unknown) {
                const rows = () => {
                  if (name === "inventory_items" || name === "inventory_transactions" || name === "material_releases") {
                    memory.inventoryTouches += 1;
                    return [];
                  }
                  if (name !== "door_orders") throw new Error("unexpected select " + name);
                  return readOrders(clause);
                };
                const api = {
                  for(mode: string) {
                    if (mode !== "update") throw new Error(mode);
                    const id = clauseParts(clause).numbers[0];
                    if (id != null) {
                      locked.add(id);
                      memory.locks.push(id);
                    }
                    return { limit: async () => rows() };
                  },
                  then(onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
                    return Promise.resolve(rows()).then(onFulfilled, onRejected);
                  },
                };
                return api;
              },
            };
          },
        };
      },
      update(table: unknown) {
        const name = getTableName(table as never);
        return {
          set(values: Record<string, unknown>) {
            return {
              async where(clause: unknown) {
                if (name === "inventory_items" || name === "inventory_transactions" || name === "order_payments") {
                  memory.inventoryTouches += 1;
                  throw new Error("legacy mutation touched a protected table");
                }
                if (name === "distributor_orders") {
                  const id = clauseParts(clause).numbers[0];
                  const row = id == null ? undefined : memory.distributors.get(id);
                  if (!row) throw new Error("missing distributor");
                  row.status = String(values.status);
                  return;
                }
                if (name !== "door_orders") throw new Error("unexpected update " + name);
                const id = clauseParts(clause).numbers[0];
                if (id == null || !locked.has(id)) throw new Error("order update without row lock");
                const row = memory.orders.get(id);
                if (!row) throw new Error("missing order");
                if ("totalDoors" in values) row.totalDoors = Number(values.totalDoors);
                if ("workflowStage" in values) row.workflowStage = String(values.workflowStage);
                if ("paymentStatus" in values) row.paymentStatus = String(values.paymentStatus);
                if ("priority" in values) (row as Order & { priority?: string }).priority = String(values.priority);
                if ("commercialStatus" in values || "acceptedTotalMinor" in values || "materialState" in values) {
                  throw new Error("legacy mutation changed a canonical field");
                }
              },
            };
          },
        };
      },
    };
  }

  return {
    schema,
    pool: {},
    db: {
      async transaction(run: (tx: ReturnType<typeof txApi>) => Promise<unknown>) {
        const orders = new Map([...memory.orders].map(([id, row]) => [id, { ...row }]));
        const distributors = new Map([...memory.distributors].map(([id, row]) => [id, { ...row }]));
        const payments = memory.payments.map((row) => ({ ...row }));
        try {
          return await run(txApi());
        } catch (error) {
          memory.orders = orders;
          memory.distributors = distributors;
          memory.payments = payments;
          throw error;
        }
      },
    },
  };
});

import { appRouter } from "./routers.js";

function admin() {
  validateAdminSession.mockImplementation(async (token: string | undefined) => token === "legacy-admin");
  return appRouter.createCaller({ adminToken: "legacy-admin" });
}

function seed(order: Order) {
  memory.orders.set(order.id, { ...order });
}

beforeEach(() => {
  memory.orders = new Map();
  memory.distributors = new Map([[4, { id: 4, status: "confirmed" }]]);
  memory.payments = [{ id: 1, amount: 2500n }];
  memory.locks = [];
  memory.inventoryTouches = 0;
  validateAdminSession.mockReset();
});

describe("legacy order mutations", () => {
  it("rejects a quantity change on an approved canonical order", async () => {
    seed({
      id: 7,
      commercialStatus: "approved",
      notes: null,
      workflowStage: "po_review",
      totalDoors: 2,
      paymentStatus: "unpaid",
      materialState: "pending_materials",
      acceptedTotalMinor: 9000n,
      status: "new",
    });
    await expect(
      admin().orders.updateWorkflowStage({ id: 7, workflowStage: "packing", totalDoors: 9 })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(memory.orders.get(7)?.totalDoors).toBe(2);
    expect(memory.orders.get(7)?.workflowStage).toBe("po_review");
  });

  it("rejects the same legacy mutation on a canonical draft", async () => {
    seed({
      id: 7,
      commercialStatus: "draft",
      notes: null,
      workflowStage: "po_review",
      totalDoors: 2,
      paymentStatus: "unpaid",
      materialState: "not_started",
      acceptedTotalMinor: null,
      status: "new",
    });
    await expect(
      admin().orders.updateWorkflowStage({ id: 7, workflowStage: "work_order", totalDoors: 4, priority: "urgent" })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(memory.orders.get(7)).toMatchObject({ totalDoors: 2, workflowStage: "po_review" });
  });

  it("rejects workflow changes after material release without touching inventory", async () => {
    seed({
      id: 7,
      commercialStatus: "approved",
      notes: null,
      workflowStage: "work_order",
      totalDoors: 2,
      paymentStatus: "partial",
      materialState: "released",
      acceptedTotalMinor: 9000n,
      status: "in_production",
    });
    await expect(
      admin().orders.updateWorkflowStage({ id: 7, workflowStage: "delivery", totalDoors: 1 })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(memory.orders.get(7)).toMatchObject({
      totalDoors: 2,
      workflowStage: "work_order",
      materialState: "released",
      status: "in_production",
    });
    expect(memory.inventoryTouches).toBe(0);
  });

  it("still updates a historical order and its distributor parent", async () => {
    seed({
      id: 8,
      commercialStatus: null,
      notes: "DIST_ORDER_ID:4 - legacy",
      workflowStage: "po_review",
      totalDoors: 1,
      paymentStatus: "unpaid",
      materialState: "not_started",
      acceptedTotalMinor: null,
      status: "confirmed",
    });
    await expect(
      admin().orders.updateWorkflowStage({ id: 8, workflowStage: "packing", totalDoors: 3 })
    ).resolves.toEqual({ success: true });
    expect(memory.orders.get(8)).toMatchObject({ workflowStage: "packing", totalDoors: 3 });
    expect(memory.distributors.get(4)?.status).toBe("shipped");
    expect(memory.locks).toContain(8);
  });

  it("returns NOT_FOUND for an unknown order and writes nothing", async () => {
    await expect(
      admin().orders.updateWorkflowStage({ id: 99, workflowStage: "packing", totalDoors: 5 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(memory.distributors.get(4)?.status).toBe("confirmed");
  });

  it("does not update a distributor when the canonical mutation is denied", async () => {
    seed({
      id: 8,
      commercialStatus: "approved",
      notes: "DIST_ORDER_ID:4 - canonical",
      workflowStage: "po_review",
      totalDoors: 2,
      paymentStatus: "unpaid",
      materialState: "pending_materials",
      acceptedTotalMinor: null,
      status: "new",
    });
    await expect(
      admin().orders.updateWorkflowStage({ id: 8, workflowStage: "delivery", totalDoors: 8 })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(memory.distributors.get(4)?.status).toBe("confirmed");
    expect(memory.orders.get(8)?.totalDoors).toBe(2);
  });

  it("rejects legacy payment status on a canonical order without touching payments", async () => {
    seed({
      id: 7,
      commercialStatus: "approved",
      notes: null,
      workflowStage: "po_review",
      totalDoors: 2,
      paymentStatus: "unpaid",
      materialState: "pending_materials",
      acceptedTotalMinor: 9000n,
      status: "new",
    });
    await expect(
      admin().orders.updatePaymentStatus({ id: 7, paymentStatus: "paid" })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(memory.orders.get(7)).toMatchObject({
      paymentStatus: "unpaid",
      acceptedTotalMinor: 9000n,
    });
    expect(memory.payments).toEqual([{ id: 1, amount: 2500n }]);
  });

  it("still updates payment status on a historical order", async () => {
    seed({
      id: 3,
      commercialStatus: null,
      notes: null,
      workflowStage: "po_review",
      totalDoors: 1,
      paymentStatus: "unpaid",
      materialState: "not_started",
      acceptedTotalMinor: null,
      status: "confirmed",
    });
    await expect(admin().orders.updatePaymentStatus({ id: 3, paymentStatus: "partial" })).resolves.toEqual({
      success: true,
    });
    expect(memory.orders.get(3)?.paymentStatus).toBe("partial");
    expect(memory.orders.get(3)?.acceptedTotalMinor).toBeNull();
    expect(memory.payments).toEqual([{ id: 1, amount: 2500n }]);
  });
});
