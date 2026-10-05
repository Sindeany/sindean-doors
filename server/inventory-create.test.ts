/**
 * Phase 2B-4B-4 — inventory.create always starts at current_qty = 0.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import type { StaffIdentity, StaffRole } from "./staff-sessions.js";

const { validateAdminSession, validateStaffSession, memory } = vi.hoisted(() => ({
  validateAdminSession: vi.fn(),
  validateStaffSession: vi.fn(),
  memory: {
    items: [] as Array<Record<string, unknown>>,
    txs: [] as Array<Record<string, unknown>>,
    itemInserts: [] as Array<Record<string, unknown>>,
    updates: [] as Array<Record<string, unknown>>,
    nextId: 1,
  },
}));

vi.mock("./admin-sessions.js", () => ({
  validateAdminSession,
}));

vi.mock("./staff-sessions.js", () => ({
  validateStaffSession,
}));

vi.mock("./db.js", async () => {
  const schema = await import("../drizzle/schema.js");

  function rejectOuter() {
    throw new Error("write outside transaction");
  }

  const tx = {
    select() {
      return {
        from() {
          return {
            where() {
              return {
                for() {
                  return {
                    async limit() {
                      const itemId = memory.items[0]?.id;
                      return memory.items.filter(i => i.id === itemId).slice(0, 1);
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
            throw new Error("unexpected tx insert");
          }
          memory.txs.push({ ...row });
        },
      };
    },
    update(table: unknown) {
      return {
        set(data: Record<string, unknown>) {
          return {
            async where() {
              if (getTableName(table as never) !== "inventory_items") {
                throw new Error("unexpected tx update");
              }
              memory.updates.push({ ...data });
              const item = memory.items.find(i => i.id === memory.items[0]?.id);
              if (item) Object.assign(item, data);
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
        return run(tx);
      },
      insert(table: unknown) {
        return {
          async values(row: Record<string, unknown>) {
            const tableName = getTableName(table as never);
            if (tableName === "inventory_items") {
              const id = memory.nextId++;
              const stored = { id, ...row };
              memory.items.push(stored);
              memory.itemInserts.push({ ...row });
              return [{ insertId: id }];
            }
            if (tableName === "inventory_transactions") {
              memory.txs.push({ ...row });
              return [{}];
            }
            throw new Error("unexpected insert: " + tableName);
          },
        };
      },
      update: rejectOuter,
      delete: rejectOuter,
    },
  };
});

import { itemCreateInput, inventoryRouter } from "./inventory.router.js";

const baseMetadata = {
  code: "NEW-001",
  name: "مادة جديدة",
  nameEn: "New item",
  category: "wpc_board" as const,
  unit: "لوح",
  minQty: 10,
  maxQty: 100,
  reorderQty: 20,
  unitCost: 12,
  supplier: "مورد",
  supplierPhone: "0500000000",
  location: "مستودع A",
  notes: "note",
};

function adminCaller() {
  validateAdminSession.mockImplementation(async (token: string | undefined) => token === "valid-admin-token");
  return inventoryRouter.createCaller({ adminToken: "valid-admin-token" });
}

function staffCaller(roles: StaffRole[], userId: number, name: string) {
  const staff: StaffIdentity = {
    userId,
    sessionId: 600 + userId,
    name,
    loginName: "stock-" + userId,
    roles,
    expiresAt: Date.now() + 60_000,
  };
  validateStaffSession.mockImplementation(async (token: string | undefined) => {
    if (!token) return null;
    return staff;
  });
  return inventoryRouter.createCaller({
    adminToken: "valid-admin-token",
    staffToken: "staff-session",
  });
}

beforeEach(() => {
  memory.items = [];
  memory.txs = [];
  memory.itemInserts = [];
  memory.updates = [];
  memory.nextId = 1;
  validateAdminSession.mockReset();
  validateStaffSession.mockReset();
});

describe("itemCreateInput schema", () => {
  it("strips hostile currentQty from parsed create payloads", () => {
    const parsed = itemCreateInput.parse({
      ...baseMetadata,
      currentQty: 999,
    });
    expect(parsed).not.toHaveProperty("currentQty");
    expect(parsed.code).toBe(baseMetadata.code);
  });
});

describe("inventory.create balance rule", () => {
  it("creates items with current_qty = 0 when currentQty is omitted", async () => {
    const { id } = await adminCaller().create(baseMetadata);
    expect(id).toBe(1);
    expect(memory.itemInserts[0]).toMatchObject(baseMetadata);
    expect(memory.itemInserts[0]?.currentQty).toBe(0);
    expect(memory.items[0]?.currentQty).toBe(0);
  });

  it("ignores hostile currentQty and still inserts zero balance", async () => {
    await adminCaller().create({
      ...baseMetadata,
      currentQty: 5000,
    } as never);

    expect(memory.itemInserts[0]).not.toHaveProperty("currentQty", 5000);
    expect(memory.itemInserts[0]?.currentQty).toBe(0);
    expect(memory.items[0]?.currentQty).toBe(0);
  });

  it("persists normal metadata fields", async () => {
    await adminCaller().create({
      ...baseMetadata,
      name: "اسم محفوظ",
      minQty: 25,
    });

    expect(memory.items[0]).toMatchObject({
      name: "اسم محفوظ",
      minQty: 25,
      currentQty: 0,
    });
  });

  it("does not create inventory_transactions history", async () => {
    await adminCaller().create(baseMetadata);
    expect(memory.txs).toHaveLength(0);
  });

  it("allows addTransaction to raise balance from zero after create", async () => {
    const { id } = await adminCaller().create(baseMetadata);
    expect(memory.items[0]?.currentQty).toBe(0);

    memory.items = [{ id, currentQty: 0, minQty: 10 }];
    await staffCaller(["stock_manager"], 42, "أمين مخزون").addTransaction({
      itemId: id,
      type: "receive",
      quantity: 40,
      reference: "OPEN-1",
      note: "رصيد افتتاحي",
      performedBy: "ignored",
      date: "2026-10-05",
    });

    expect(memory.items[0]?.currentQty).toBe(40);
    expect(memory.txs).toHaveLength(1);
    expect(memory.txs[0]).toMatchObject({
      itemId: id,
      type: "receive",
      quantity: 40,
      balanceBefore: 0,
      balanceAfter: 40,
      staffUserId: 42,
    });
  });
});
