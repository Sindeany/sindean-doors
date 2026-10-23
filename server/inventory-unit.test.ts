/**
 * inventory.update may not reinterpret a stored quantity or a frozen unit.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { getTableName } from "drizzle-orm";

type Item = {
  id: number;
  unit: string;
  name: string;
  currentQty: number;
  reservedQty: number;
};

const { validateAdminSession, memory } = vi.hoisted(() => ({
  validateAdminSession: vi.fn(),
  memory: {
    item: null as Item | null,
    refs: {
      rule: false,
      snapshot: false,
      reservation: false,
      issue: false,
      movement: false,
      legacyBom: false,
    },
    locks: 0,
  },
}));

vi.mock("./admin-sessions.js", () => ({
  validateAdminSession,
}));

vi.mock("./db.js", async () => {
  const schema = await import("../drizzle/schema.js");

  function dependency(name: string): boolean {
    if (name === "bom_rules") return memory.refs.rule;
    if (name === "bom_snapshot_lines") return memory.refs.snapshot;
    if (name === "reservation_lines") return memory.refs.reservation;
    if (name === "material_issue_lines") return memory.refs.issue;
    if (name === "inventory_transactions") return memory.refs.movement;
    if (name === "bom_items") return memory.refs.legacyBom;
    return false;
  }

  return {
    schema,
    pool: {},
    db: {
      async transaction(run: (tx: {
        select: () => {
          from: (table: unknown) => {
            where: () => {
              for: (mode: string) => { limit: () => Promise<Item[]> };
              limit: () => Promise<Array<{ id: number }>>;
            };
          };
        };
        update: (table: unknown) => {
          set: (data: Record<string, unknown>) => { where: () => Promise<void> };
        };
      }) => Promise<unknown>) {
        const snap = memory.item ? { ...memory.item } : null;
        try {
          return await run({
            select() {
              return {
                from(table: unknown) {
                  const name = getTableName(table as never);
                  return {
                    where() {
                      return {
                        for(mode: string) {
                          if (mode !== "update") throw new Error(mode);
                          memory.locks += 1;
                          return {
                            async limit() {
                              return memory.item ? [{ ...memory.item }] : [];
                            },
                          };
                        },
                        async limit() {
                          return dependency(name) ? [{ id: 1 }] : [];
                        },
                      };
                    },
                  };
                },
              };
            },
            update() {
              return {
                set(data: Record<string, unknown>) {
                  return {
                    async where() {
                      if (!memory.item) throw new Error("missing item");
                      memory.item = {
                        ...memory.item,
                        unit: String(data.unit),
                        name: String(data.name),
                      };
                    },
                  };
                },
              };
            },
          });
        } catch (error) {
          memory.item = snap;
          throw error;
        }
      },
    },
  };
});

import { inventoryRouter } from "./inventory.router.js";

const metadata = {
  code: "BOARD",
  name: "لوح",
  nameEn: "Board",
  category: "wpc_board" as const,
  unit: "piece",
  minQty: 0,
  maxQty: 10,
  reorderQty: 1,
  unitCost: 1,
  supplier: "",
  location: "",
};

function admin() {
  validateAdminSession.mockImplementation(async (token: string | undefined) => token === "admin");
  return inventoryRouter.createCaller({ adminToken: "admin" });
}

beforeEach(() => {
  memory.item = { id: 4, unit: "piece", name: "لوح", currentQty: 0, reservedQty: 0 };
  memory.refs = {
    rule: false,
    snapshot: false,
    reservation: false,
    issue: false,
    movement: false,
    legacyBom: false,
  };
  memory.locks = 0;
  validateAdminSession.mockReset();
});

describe("inventory unit integrity", () => {
  it("rejects a unit change when a BOM rule stores the old unit", async () => {
    memory.refs.rule = true;
    await expect(admin().update({ id: 4, ...metadata, unit: "mm" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(memory.item?.unit).toBe("piece");
  });

  it("rejects a unit change for a snapshot, a zero-quantity reservation, and an issue line", async () => {
    for (const key of ["snapshot", "reservation", "issue"] as const) {
      memory.item = { id: 4, unit: "piece", name: "لوح", currentQty: 0, reservedQty: 0 };
      memory.refs = {
        rule: false,
        snapshot: false,
        reservation: false,
        issue: false,
        movement: false,
        legacyBom: false,
      };
      memory.refs[key] = true;
      await expect(admin().update({ id: 4, ...metadata, unit: "mm" })).rejects.toMatchObject({
        code: "CONFLICT",
      });
      expect(memory.item?.unit).toBe("piece");
    }
  });

  it("rejects a unit change after a physical movement or a legacy cost-sheet line", async () => {
    memory.refs.movement = true;
    await expect(admin().update({ id: 4, ...metadata, unit: "mm" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    memory.refs.movement = false;
    memory.refs.legacyBom = true;
    await expect(admin().update({ id: 4, ...metadata, unit: "mm" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(memory.item?.unit).toBe("piece");
  });

  it("rejects a unit change when the balance is non-zero even without a child row", async () => {
    memory.item = { id: 4, unit: "piece", name: "لوح", currentQty: 3, reservedQty: 0 };
    await expect(admin().update({ id: 4, ...metadata, unit: "mm" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(memory.item.unit).toBe("piece");
    expect(memory.item.currentQty).toBe(3);
  });

  it("allows a same-unit metadata edit while history exists", async () => {
    memory.refs.rule = true;
    memory.refs.movement = true;
    memory.item = { id: 4, unit: "piece", name: "قديم", currentQty: 6, reservedQty: 1 };
    await expect(admin().update({ id: 4, ...metadata, name: "جديد" })).resolves.toEqual({ ok: true });
    expect(memory.item).toMatchObject({ unit: "piece", name: "جديد", currentQty: 6, reservedQty: 1 });
    expect(memory.locks).toBe(1);
  });

  it("allows a unit correction on an unused item", async () => {
    await expect(admin().update({ id: 4, ...metadata, unit: "mm" })).resolves.toEqual({ ok: true });
    expect(memory.item?.unit).toBe("mm");
  });

  it("does not let an anonymous caller change the unit", async () => {
    await expect(
      inventoryRouter.createCaller({}).update({ id: 4, ...metadata, unit: "mm" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(memory.item?.unit).toBe("piece");
    expect(memory.locks).toBe(0);
  });

  it("locks the inventory item before copying its unit into a BOM rule or snapshot", () => {
    const source = readFileSync("server/bom-rules.ts", "utf8");
    const loader = source.slice(source.indexOf("async function loadItemUnits"), source.indexOf("async function throwIfDuplicate"));
    expect(loader).toContain('.for("update")');
    expect(loader).toContain(".sort(");
  });
});
