/**
 * Phase 2B-4B-3 — inventory.update must not change current_qty.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";

const { validateAdminSession, memory } = vi.hoisted(() => ({
  validateAdminSession: vi.fn(),
  memory: {
    items: [] as Array<Record<string, unknown>>,
    updates: [] as Array<Record<string, unknown>>,
    inserts: [] as Array<Record<string, unknown>>,
  },
}));

vi.mock("./admin-sessions.js", () => ({
  validateAdminSession,
}));

vi.mock("./db.js", async () => {
  const schema = await import("../drizzle/schema.js");

  function applyUpdate(table: unknown, data: Record<string, unknown>) {
    return {
      async where() {
        if (getTableName(table as never) !== "inventory_items") {
          throw new Error("unexpected update table");
        }
        memory.updates.push({ ...data });
        const row = memory.items[0];
        if (row) {
          for (const [key, val] of Object.entries(data)) {
            if (key !== "updatedAt") row[key] = val;
          }
        }
      },
    };
  }

  return {
    schema,
    pool: {},
    db: {
      async transaction(run: (tx: {
        select: () => unknown;
        update: (table: unknown) => { set: (data: Record<string, unknown>) => ReturnType<typeof applyUpdate> };
      }) => Promise<unknown>) {
        return run({
          select() {
            return {
              from() {
                return {
                  where() {
                    return {
                      for() {
                        return {
                          async limit() {
                            const row = memory.items[0];
                            return row
                              ? [{
                                  id: row.id,
                                  unit: row.unit ?? "لوح",
                                  currentQty: row.currentQty ?? 0,
                                  reservedQty: row.reservedQty ?? 0,
                                }]
                              : [];
                          },
                        };
                      },
                      async limit() {
                        return [];
                      },
                    };
                  },
                };
              },
            };
          },
          update(table: unknown) {
            return { set: (data: Record<string, unknown>) => applyUpdate(table, data) };
          },
        });
      },
      update(table: unknown) {
        return {
          set(data: Record<string, unknown>) {
            return applyUpdate(table, data);
          },
        };
      },
      insert(table: unknown) {
        return {
          async values(row: Record<string, unknown>) {
            memory.inserts.push({ table: getTableName(table as never), row });
          },
        };
      },
    },
  };
});

import { itemUpdateInput, inventoryRouter } from "./inventory.router.js";

const baseMetadata = {
  code: "WPC-45-WHT",
  name: "لوح WPC محدّث",
  nameEn: "Updated board",
  category: "wpc_board" as const,
  unit: "لوح",
  minQty: 100,
  maxQty: 600,
  reorderQty: 200,
  unitCost: 85,
  supplier: "مورد",
  supplierPhone: "0500000000",
  location: "مستودع A",
  notes: "note",
};

function adminCaller() {
  validateAdminSession.mockImplementation(async (token: string | undefined) => token === "valid-admin-token");
  return inventoryRouter.createCaller({ adminToken: "valid-admin-token" });
}

beforeEach(() => {
  memory.items = [{ id: 1, currentQty: 320, minQty: 100, name: "original", unit: "لوح" }];
  memory.updates = [];
  memory.inserts = [];
  validateAdminSession.mockReset();
});

describe("itemUpdateInput schema", () => {
  it("strips hostile currentQty from parsed update payloads", () => {
    const parsed = itemUpdateInput.parse({
      ...baseMetadata,
      currentQty: 999999,
    });
    expect(parsed).not.toHaveProperty("currentQty");
    expect(parsed.name).toBe(baseMetadata.name);
  });
});

describe("inventory.update balance protection", () => {
  it("does not persist currentQty when a hostile client injects it", async () => {
    await adminCaller().update({
      id: 1,
      ...baseMetadata,
      currentQty: 999,
    } as never);

    expect(memory.updates).toHaveLength(1);
    expect(memory.updates[0]).not.toHaveProperty("currentQty");
    expect(memory.items[0]?.currentQty).toBe(320);
  });

  it("still updates normal metadata fields", async () => {
    await adminCaller().update({
      id: 1,
      ...baseMetadata,
      minQty: 110,
      supplier: "مورد جديد",
    });

    expect(memory.updates[0]).toMatchObject({
      name: baseMetadata.name,
      minQty: 110,
      supplier: "مورد جديد",
    });
    expect(memory.items[0]?.minQty).toBe(110);
    expect(memory.items[0]?.currentQty).toBe(320);
  });

  it("does not insert inventory_transactions rows", async () => {
    await adminCaller().update({ id: 1, ...baseMetadata });
    expect(memory.inserts.filter(i => i.table === "inventory_transactions")).toHaveLength(0);
  });

  it("keeps adminProcedure authorization unchanged", async () => {
    validateAdminSession.mockResolvedValue(false);
    await expect(
      inventoryRouter.createCaller({}).update({ id: 1, ...baseMetadata })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
