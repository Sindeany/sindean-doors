/**
 * Phase 2B-4B-2 — inventory.addTransaction staff actor.
 * Isolated fixtures. Does not touch the local stock_manager account.
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
    transactionCalls: 0,
    outerWrites: 0,
    forUpdateModes: [] as string[],
  },
}));

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
            where() {
              return {
                for(mode: string) {
                  memory.forUpdateModes.push(mode);
                  return {
                    async limit() {
                      return memory.items.slice(0, 1);
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
            async where() {
              if (getTableName(table as never) !== "inventory_items") {
                throw new Error("unexpected update");
              }
              memory.updates.push({ ...data });
              if (memory.items[0]) Object.assign(memory.items[0], data);
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
        return run(tx);
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
    sessionId: 500 + userId,
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

const input = {
  itemId: 7,
  type: "receive" as const,
  quantity: 4,
  reference: "PO-1",
  note: "note",
  performedBy: "اسم مزور",
  date: "2026-10-05",
};

beforeEach(() => {
  memory.items = [{ id: 7, currentQty: 10, minQty: 2 }];
  memory.txs = [];
  memory.updates = [];
  memory.transactionCalls = 0;
  memory.outerWrites = 0;
  memory.forUpdateModes = [];
  validateStaffSession.mockReset();
});

describe("inventory.addTransaction staff authorization", () => {
  it("rejects a missing staff session", async () => {
    await expect(caller({}).addTransaction(input)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects a legacy admin session without a staff session", async () => {
    await expect(
      caller({ adminToken: "legacy-admin" }).addTransaction(input)
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a staff admin who is not a stock manager", async () => {
    await expect(
      caller({ staff: identity(["admin"], 1, "مدير") }).addTransaction(input)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a non-stock staff role", async () => {
    await expect(
      caller({ staff: identity(["production_manager"], 2, "إنتاج") }).addTransaction(input)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a hostile origin before writing", async () => {
    await expect(
      caller({
        staff: identity(["stock_manager"], 3, "أمين"),
        origin: "https://evil.example",
      }).addTransaction(input)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(memory.transactionCalls).toBe(0);
  });

  it("ignores a client role claim and uses the session role", async () => {
    await expect(
      caller({ staff: identity(["packing"], 4, "تعبئة") }).addTransaction({
        ...input,
        roles: ["stock_manager"],
      } as never)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("inventory.addTransaction actor attribution", () => {
  it("writes the authenticated stock manager and updates quantity atomically", async () => {
    const staff = identity(["stock_manager"], 11, "فهد المخزون");
    const result = await caller({ staff }).addTransaction({
      ...input,
      staffUserId: 999,
    } as never);
    expect(result).toMatchObject({ balanceBefore: 10, balanceAfter: 14, status: "in_stock" });
    expect(memory.transactionCalls).toBe(1);
    expect(memory.outerWrites).toBe(0);
    expect(memory.forUpdateModes).toEqual(["update"]);
    expect(memory.txs).toHaveLength(1);
    expect(memory.txs[0]).toMatchObject({
      staffUserId: 11,
      performedBy: "فهد المخزون",
      quantity: 4,
      balanceBefore: 10,
      balanceAfter: 14,
    });
    expect(memory.txs[0]?.staffUserId).not.toBe(999);
    expect(memory.txs[0]?.performedBy).not.toBe("اسم مزور");
    expect(memory.updates[0]).toMatchObject({ currentQty: 14, lastReceived: "2026-10-05" });
    expect(memory.items[0]?.currentQty).toBe(14);
  });

  it("attributes a second stock manager separately", async () => {
    const other = identity(["stock_manager"], 22, "نورة المخزون");
    await caller({ staff: other }).addTransaction({
      ...input,
      type: "consume",
      quantity: 3,
      performedBy: "شخص آخر",
    });
    expect(memory.txs[0]).toMatchObject({
      staffUserId: 22,
      performedBy: "نورة المخزون",
      balanceBefore: 10,
      balanceAfter: 7,
    });
    expect(memory.items[0]?.currentQty).toBe(7);
    expect(memory.updates[0]).toMatchObject({ currentQty: 7, lastConsumed: "2026-10-05" });
  });
});

describe("inventory.addTransaction no negative balance", () => {
  const staff = () => caller({ staff: identity(["stock_manager"], 11, "فهد المخزون") });

  it("rejects a consume that would go below zero and writes nothing", async () => {
    await expect(
      staff().addTransaction({ ...input, type: "consume", quantity: 50 })
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "الكمية المتاحة في المخزون غير كافية",
    });
    expect(memory.items[0]?.currentQty).toBe(10);
    expect(memory.txs).toHaveLength(0);
    expect(memory.updates).toHaveLength(0);
    expect(memory.forUpdateModes).toEqual(["update"]);
  });

  it("allows consuming the full on-hand quantity down to zero", async () => {
    const result = await staff().addTransaction({ ...input, type: "consume", quantity: 10 });
    expect(result).toMatchObject({ balanceBefore: 10, balanceAfter: 0 });
    expect(memory.items[0]?.currentQty).toBe(0);
    expect(memory.txs[0]).toMatchObject({ balanceBefore: 10, balanceAfter: 0, quantity: 10 });
  });

  it("allows a consume that leaves one unit", async () => {
    const result = await staff().addTransaction({ ...input, type: "consume", quantity: 9 });
    expect(result).toMatchObject({ balanceBefore: 10, balanceAfter: 1 });
    expect(memory.items[0]?.currentQty).toBe(1);
  });

  it("rejects a transfer that would go below zero", async () => {
    await expect(
      staff().addTransaction({ ...input, type: "transfer", quantity: 11 })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(memory.items[0]?.currentQty).toBe(10);
    expect(memory.txs).toHaveLength(0);
  });

  it("rejects an adjust delta that would go below zero", async () => {
    await expect(
      staff().addTransaction({ ...input, type: "adjust", quantity: -11 })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(memory.items[0]?.currentQty).toBe(10);
    expect(memory.txs).toHaveLength(0);
  });

  it("keeps receive and return as additions", async () => {
    const received = await staff().addTransaction({ ...input, type: "receive", quantity: 5 });
    expect(received).toMatchObject({ balanceBefore: 10, balanceAfter: 15 });
    expect(memory.updates[0]).toMatchObject({ currentQty: 15, lastReceived: "2026-10-05" });

    memory.items[0].currentQty = 10;
    memory.txs = [];
    memory.updates = [];
    const returned = await staff().addTransaction({ ...input, type: "return", quantity: 3 });
    expect(returned).toMatchObject({ balanceBefore: 10, balanceAfter: 13 });
    expect(memory.updates[0]).toMatchObject({ currentQty: 13 });
    expect(memory.updates[0]).not.toHaveProperty("lastReceived");
  });
});

describe("inventory.addTransaction quantity sign", () => {
  const staff = () => caller({ staff: identity(["stock_manager"], 11, "فهد المخزون") });

  it.each(["consume", "transfer", "receive", "return"] as const)(
    "rejects %s quantity -1 before writing",
    async (type) => {
      await expect(staff().addTransaction({ ...input, type, quantity: -1 })).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "الكمية يجب أن تكون أكبر من صفر",
      });
      expect(memory.transactionCalls).toBe(0);
      expect(memory.items[0]?.currentQty).toBe(10);
      expect(memory.txs).toHaveLength(0);
    }
  );

  it.each(["consume", "transfer", "receive", "return", "adjust"] as const)(
    "rejects zero %s quantity before writing",
    async (type) => {
      await expect(staff().addTransaction({ ...input, type, quantity: 0 })).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
      expect(memory.transactionCalls).toBe(0);
      expect(memory.txs).toHaveLength(0);
    }
  );

  it("accepts a positive transfer and a negative adjust that stays non-negative", async () => {
    const transferred = await staff().addTransaction({ ...input, type: "transfer", quantity: 4 });
    expect(transferred).toMatchObject({ balanceBefore: 10, balanceAfter: 6 });
    memory.items[0].currentQty = 10;
    memory.txs = [];
    memory.updates = [];
    const adjusted = await staff().addTransaction({ ...input, type: "adjust", quantity: -4 });
    expect(adjusted).toMatchObject({ balanceBefore: 10, balanceAfter: 6 });
    expect(memory.txs[0]).toMatchObject({
      staffUserId: 11,
      balanceBefore: 10,
      balanceAfter: 6,
      quantity: -4,
    });
  });
});
