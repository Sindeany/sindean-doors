/**
 * Material Release authorization and idempotency-key gate.
 * InnoDB behavior is rehearsed on a disposable database.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StaffIdentity, StaffRole } from "./staff-sessions.js";
import { assertIdempotencyKey } from "./material-release.js";

const { validateStaffSession } = vi.hoisted(() => ({
  validateStaffSession: vi.fn(),
}));

vi.mock("drizzle-orm/mysql2", async () => {
  const actual = await vi.importActual<typeof import("drizzle-orm/mysql2")>("drizzle-orm/mysql2");
  return {
    ...actual,
    drizzle: () => ({
      transaction: async (run: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          select() {
            return {
              from() {
                return {
                  where() {
                    return {
                      for() {
                        return { limit: async () => [] };
                      },
                      limit: async () => [],
                      orderBy() {
                        return { for: () => [] };
                      },
                    };
                  },
                };
              },
            };
          },
          insert() {
            return { values: async () => ({ insertId: 1 }) };
          },
          update() {
            return { set: () => ({ where: async () => undefined }) };
          },
        };
        return run(tx);
      },
    }),
  };
});

vi.mock("./staff-sessions.js", async () => {
  const actual = await vi.importActual<typeof import("./staff-sessions.js")>("./staff-sessions.js");
  return { ...actual, validateStaffSession };
});

vi.mock("./db.js", async () => {
  const schema = await import("../drizzle/schema.js");
  return {
    schema,
    db: {
      select() {
        return {
          from() {
            return { where: () => ({ limit: async () => [] }) };
          },
        };
      },
    },
    pool: {
      async getConnection() {
        return {
          async query(text: string) {
            if (text.includes("GET_LOCK")) return [[{ locked: 1 }]];
            if (text.includes("RELEASE_LOCK")) return [[{ released: 1 }]];
            throw new Error(text);
          },
          release() {},
          destroy() {},
        };
      },
    },
  };
});

import { appRouter } from "./routers.js";

function staff(roles: StaffRole[], userId = 7): StaffIdentity {
  return {
    userId,
    sessionId: 1,
    name: "أمين مخزون",
    loginName: "release-test",
    roles,
    expiresAt: Date.now() + 60_000,
  };
}

const sessions = new Map<string, StaffIdentity>();

function caller(identity: StaffIdentity | null) {
  const token = identity ? `staff-${identity.userId}-${identity.roles.join(".")}` : undefined;
  if (identity && token) sessions.set(token, identity);
  validateStaffSession.mockImplementation(async (presented: string | undefined) =>
    presented ? sessions.get(presented) ?? null : null
  );
  return appRouter.createCaller({ staffToken: token });
}

const input = { orderId: 1, idempotencyKey: "release-key-1" };

beforeEach(() => {
  sessions.clear();
  validateStaffSession.mockReset();
});

describe("material release authorization", () => {
  it("allows only a stock manager to release", async () => {
    await expect(caller(null).materialRelease.release(input)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    for (const role of ["admin", "production_manager", "sales_coordinator"] as const) {
      await expect(caller(staff([role])).materialRelease.release(input)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    }
    await expect(caller(staff(["stock_manager"])).materialRelease.release(input)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      caller(staff(["admin", "stock_manager"])).materialRelease.release(input)
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a hostile idempotency payload and allows staff readers", async () => {
    await expect(
      caller(staff(["stock_manager"])).materialRelease.release({
        orderId: 1,
        idempotencyKey: "bad key",
        quantity: 4,
      } as never)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller(staff(["sales_person"])).materialRelease.status({ orderId: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      caller(staff(["production_manager"])).materialRelease.status({ orderId: 1 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("material release idempotency key", () => {
  it("accepts a bounded safe key and rejects blanks or spaces", () => {
    expect(assertIdempotencyKey("  release-key-1 ")).toBe("release-key-1");
    expect(() => assertIdempotencyKey("short")).toThrow(/مفتاح/);
    expect(() => assertIdempotencyKey("has space-key")).toThrow(/مفتاح/);
  });
});
