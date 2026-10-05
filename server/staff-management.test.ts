/**
 * Phase 2B-5B-1 staff management API.
 * Isolated in-memory DB — does not touch the local bootstrap user.
 */
import { createHash } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { getTableName } from "drizzle-orm";
import { BCRYPT_COST, createStaffSession, validateStaffSession } from "./staff-sessions.js";

const PASSWORD = "Sindean-staff-1";

const { staffState, memoryDb } = vi.hoisted(() => ({
  staffState: {
    users: [] as Array<Record<string, unknown>>,
    roles: [] as Array<Record<string, unknown>>,
    sessions: [] as Array<Record<string, unknown>>,
    adminSessions: [] as Array<Record<string, unknown>>,
    seq: { user: 1, role: 1, session: 1 },
    hideLoginOnSelect: null as string | null,
    selectForUpdateCalls: 0,
  },
  memoryDb: { current: null as null | ReturnType<typeof createMemoryDb> },
}));

function mysqlDuplicateLoginError(loginName: string): Error {
  const error = new Error(
    `Duplicate entry '${loginName}' for key 'staff_users.login_name'`
  ) as Error & { code: string; errno: number };
  error.code = "ER_DUP_ENTRY";
  error.errno = 1062;
  return error;
}

const FIELD: Record<string, string> = {
  id: "id",
  name: "name",
  login_name: "loginName",
  password_hash: "passwordHash",
  is_active: "isActive",
  created_at: "createdAt",
  updated_at: "updatedAt",
  user_id: "userId",
  role: "role",
  token_hash: "tokenHash",
  expires_at: "expiresAt",
  revoked_at: "revokedAt",
};

function flatten(node: unknown, out: Array<string | { col: string } | { param: unknown }> = []) {
  if (!node || typeof node !== "object") return out;
  const value = node as {
    constructor?: { name?: string };
    queryChunks?: unknown[];
    value?: unknown;
    name?: string;
    table?: unknown;
  };
  const ctor = value.constructor?.name;
  if (ctor === "SQL") {
    for (const chunk of value.queryChunks ?? []) flatten(chunk, out);
    return out;
  }
  if (ctor === "StringChunk") {
    out.push(Array.isArray(value.value) ? value.value.join("") : String(value.value));
    return out;
  }
  if (ctor === "Param") {
    out.push({ param: value.value });
    return out;
  }
  if (typeof value.name === "string" && value.table) {
    out.push({ col: value.name });
  }
  return out;
}

function matchers(whereSql: unknown) {
  const flat = flatten(whereSql);
  const preds: Array<(row: Record<string, unknown>) => boolean> = [];
  for (let i = 0; i < flat.length; i++) {
    const item = flat[i];
    if (typeof item !== "object" || !("col" in item)) continue;
    const field = FIELD[item.col] ?? item.col;
    const next = flat[i + 1];
    if (next === " = ") {
      const param = flat[i + 2];
      const expected =
        typeof param === "object" && param && "param" in param ? param.param : undefined;
      preds.push((row) => row[field] === expected);
    } else if (next === " is null") {
      preds.push((row) => row[field] == null);
    }
  }
  return preds;
}

function bucket(table: unknown): "users" | "roles" | "sessions" | "adminSessions" {
  const name = getTableName(table as never);
  if (name === "staff_users") return "users";
  if (name === "staff_user_roles") return "roles";
  if (name === "staff_sessions") return "sessions";
  if (name === "admin_sessions") return "adminSessions";
  throw new Error("unexpected table " + name);
}

function createMemoryDb(target: typeof staffState) {
  function runSelect(key: keyof typeof staffState, query: {
    preds: Array<(row: Record<string, unknown>) => boolean>;
    max: number;
    sortKey?: string;
  }) {
    let rows = target[key]
      .filter((row) => query.preds.every((pred) => pred(row)))
      .filter((row) => {
        if (key !== "users" || !staffState.hideLoginOnSelect) return true;
        return row.loginName !== staffState.hideLoginOnSelect;
      })
      .map((row) => ({ ...row }));
    if (query.sortKey === "loginName") {
      rows.sort((a, b) => String(a.loginName).localeCompare(String(b.loginName)));
    }
    return rows.slice(0, query.max);
  }

  const buildQuery = (key: "users" | "roles" | "sessions" | "adminSessions") => {
    const query = {
      preds: [] as Array<(row: Record<string, unknown>) => boolean>,
      max: Number.POSITIVE_INFINITY,
      sortKey: undefined as string | undefined,
      where(sql: unknown) {
        query.preds = matchers(sql);
        return query;
      },
      limit(n: number) {
        query.max = n;
        return query;
      },
      orderBy() {
        query.sortKey = "loginName";
        return query;
      },
      for() {
        staffState.selectForUpdateCalls += 1;
        return query;
      },
      innerJoin() {
        return query;
      },
      then(onFulfilled: (value: Record<string, unknown>[]) => unknown, onRejected?: (reason: unknown) => unknown) {
        return Promise.resolve(runSelect(key, query)).then(onFulfilled, onRejected);
      },
    };
    return query;
  };

  return {
    select() {
      return {
        from(table: unknown) {
          return buildQuery(bucket(table));
        },
      };
    },
    insert(table: unknown) {
      return {
        values(row: Record<string, unknown> | Array<Record<string, unknown>>) {
          const key = bucket(table);
          const rows = Array.isArray(row) ? row : [row];
          const seqKey = key === "users" ? "user" : key === "roles" ? "role" : "session";
          const ids: number[] = [];
          for (const entry of rows) {
            if (key === "users") {
              const loginName = entry.loginName;
              if (
                typeof loginName === "string" &&
                target.users.some((row) => row.loginName === loginName)
              ) {
                throw mysqlDuplicateLoginError(loginName);
              }
            }
            const id = target.seq[seqKey]++;
            target[key].push({ id, ...entry });
            ids.push(id);
          }
          return Promise.resolve([{ insertId: ids[0] }]);
        },
      };
    },
    update(table: unknown) {
      return {
        set(patch: Record<string, unknown>) {
          return {
            where(sql: unknown) {
              const preds = matchers(sql);
              for (const row of target[bucket(table)]) {
                if (preds.every((pred) => pred(row))) Object.assign(row, patch);
              }
              return Promise.resolve();
            },
          };
        },
      };
    },
    delete(table: unknown) {
      return {
        where(sql: unknown) {
          const preds = matchers(sql);
          const key = bucket(table);
          target[key] = target[key].filter((row) => !preds.every((pred) => pred(row)));
          return Promise.resolve();
        },
      };
    },
    async transaction<T>(fn: (tx: ReturnType<typeof createMemoryDb>) => Promise<T>): Promise<T> {
      const draft = structuredClone({
        users: target.users,
        roles: target.roles,
        sessions: target.sessions,
        adminSessions: target.adminSessions,
        seq: target.seq,
      });
      const result = await fn(createMemoryDb(draft));
      target.users = draft.users;
      target.roles = draft.roles;
      target.sessions = draft.sessions;
      target.adminSessions = draft.adminSessions;
      target.seq = draft.seq;
      return result;
    },
  };
}

memoryDb.current = createMemoryDb(staffState);

vi.mock("./db.js", async () => {
  const schema = await import("../drizzle/schema.js");
  return {
    schema,
    db: new Proxy({} as ReturnType<typeof createMemoryDb>, {
      get(_target, prop) {
        const db = memoryDb.current;
        if (!db) throw new Error("staff memory db is not ready");
        const value = db[prop as keyof typeof db];
        return typeof value === "function" ? value.bind(db) : value;
      },
    }),
    pool: { async getConnection() { throw new Error("unexpected pool use"); } },
  };
});

import { appRouter } from "./routers.js";

function caller(extra: {
  adminToken?: string;
  staffToken?: string;
} = {}) {
  return appRouter.createCaller({
    adminToken: extra.adminToken,
    staffToken: extra.staffToken,
    req: { headers: {} },
  });
}

async function seedUser(input: {
  id?: number;
  name: string;
  loginName: string;
  password?: string;
  isActive?: boolean;
  roles: string[];
}) {
  const now = Date.now();
  const id = input.id ?? staffState.seq.user++;
  if (id >= staffState.seq.user) {
    staffState.seq.user = id + 1;
  }
  const passwordHash = await bcrypt.hash(input.password ?? PASSWORD, BCRYPT_COST);
  staffState.users.push({
    id,
    name: input.name,
    loginName: input.loginName,
    passwordHash,
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  });
  for (const role of input.roles) {
    staffState.roles.push({
      id: staffState.seq.role++,
      userId: id,
      role,
    });
  }
  return id;
}

async function staffTokenFor(userId: number) {
  const session = await createStaffSession(userId);
  return session.rawToken;
}

beforeEach(() => {
  staffState.users = [];
  staffState.roles = [];
  staffState.sessions = [];
  staffState.adminSessions = [];
  staffState.seq = { user: 1, role: 1, session: 1 };
  staffState.hideLoginOnSelect = null;
  staffState.selectForUpdateCalls = 0;
});

describe("staff management authorization", () => {
  it("rejects missing staff session", async () => {
    await expect(caller().staffManagement.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects non-admin staff roles", async () => {
    await seedUser({
      id: 10,
      name: "Stock",
      loginName: "stock1",
      roles: ["stock_manager"],
    });
    const token = await staffTokenFor(10);
    await expect(caller({ staffToken: token }).staffManagement.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows explicit admin staff role", async () => {
    await seedUser({ id: 1, name: "Admin One", loginName: "admin1", roles: ["admin"] });
    const token = await staffTokenFor(1);
    const list = await caller({ staffToken: token }).staffManagement.list();
    expect(list).toHaveLength(1);
    expect(list[0]?.roles).toEqual(["admin"]);
  });

  it("does not grant access through legacy adminSession alone", async () => {
    staffState.adminSessions.push({
      id: 1,
      token: "legacy-admin",
      expiresAt: Date.now() + 60_000,
      createdAt: Date.now(),
    });
    await expect(caller({ adminToken: "legacy-admin" }).staffManagement.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

describe("staff management list", () => {
  it("never exposes password_hash or token_hash", async () => {
    await seedUser({ id: 1, name: "Admin", loginName: "admin1", roles: ["admin"] });
    await seedUser({ id: 2, name: "Stock", loginName: "stock1", roles: ["stock_manager"] });
    staffState.sessions.push({
      id: 1,
      userId: 2,
      tokenHash: createHash("sha256").update("session-token").digest("hex"),
      expiresAt: Date.now() + 60_000,
      revokedAt: null,
      createdAt: Date.now(),
    });
    const token = await staffTokenFor(1);
    const list = await caller({ staffToken: token }).staffManagement.list();
    const text = JSON.stringify(list);
    expect(text).not.toMatch(/password_hash|passwordHash|token_hash|tokenHash/i);
    expect(list).toHaveLength(2);
    expect(list[0]?.loginName).toBe("admin1");
  });
});

describe("staff management create", () => {
  beforeEach(async () => {
    await seedUser({ id: 1, name: "Admin", loginName: "admin1", roles: ["admin"] });
  });

  it("normalizes login, hashes password, and creates role rows", async () => {
    const token = await staffTokenFor(1);
    const created = await caller({ staffToken: token }).staffManagement.create({
      name: "Warehouse Lead",
      loginName: "  STOCK  ",
      password: PASSWORD,
      roles: ["stock_manager", "packing"],
    });
    expect(created.loginName).toBe("stock");
    expect(created.roles).toEqual(["stock_manager", "packing"]);
    const hash = staffState.users.find((u) => u.id === created.userId)?.passwordHash as string;
    expect(await bcrypt.compare(PASSWORD, hash)).toBe(true);
    const roleRows = staffState.roles.filter((r) => r.userId === created.userId);
    expect(roleRows.map((r) => r.role).sort()).toEqual(["packing", "stock_manager"]);
  });

  it("maps a duplicate-key insert race to CONFLICT", async () => {
    const token = await staffTokenFor(1);
    await seedUser({
      id: 2,
      name: "Existing",
      loginName: "race-dup",
      roles: ["sales_person"],
    });
    staffState.hideLoginOnSelect = "race-dup";
    await expect(
      caller({ staffToken: token }).staffManagement.create({
        name: "Race",
        loginName: "race-dup",
        password: PASSWORD,
        roles: ["packing"],
      })
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "اسم الدخول مستخدم مسبقاً",
    });
  });

  it("rejects duplicate normalized login", async () => {
    const token = await staffTokenFor(1);
    await caller({ staffToken: token }).staffManagement.create({
      name: "One",
      loginName: "dup",
      password: PASSWORD,
      roles: ["sales_person"],
    });
    await expect(
      caller({ staffToken: token }).staffManagement.create({
        name: "Two",
        loginName: "  DUP ",
        password: PASSWORD,
        roles: ["sales_person"],
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects invalid or empty role lists", async () => {
    const token = await staffTokenFor(1);
    await expect(
      caller({ staffToken: token }).staffManagement.create({
        name: "Bad",
        loginName: "bad1",
        password: PASSWORD,
        roles: [],
      })
    ).rejects.toThrow();
    await expect(
      caller({ staffToken: token }).staffManagement.create({
        name: "Bad",
        loginName: "bad2",
        password: PASSWORD,
        roles: ["qc" as never],
      })
    ).rejects.toThrow();
  });
});

describe("staff management setRoles", () => {
  it("replaces roles and reloads them on the next session validation", async () => {
    await seedUser({ id: 1, name: "Admin", loginName: "admin1", roles: ["admin"] });
    await seedUser({ id: 2, name: "Worker", loginName: "worker", roles: ["packing"] });
    const adminToken = await staffTokenFor(1);
    const workerToken = await staffTokenFor(2);

    await caller({ staffToken: adminToken }).staffManagement.setRoles({
      userId: 2,
      roles: ["stock_manager", "packing"],
    });

    const me = await validateStaffSession(workerToken);
    expect(me?.roles).toEqual(["stock_manager", "packing"]);
  });

  it("prevents removing own admin role", async () => {
    await seedUser({ id: 1, name: "Admin", loginName: "admin1", roles: ["admin"] });
    const token = await staffTokenFor(1);
    await expect(
      caller({ staffToken: token }).staffManagement.setRoles({
        userId: 1,
        roles: ["stock_manager"],
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("protects the final active admin from losing admin through self role change", async () => {
    await seedUser({ id: 1, name: "Only Admin", loginName: "only", roles: ["admin"] });
    const token = await staffTokenFor(1);
    await expect(
      caller({ staffToken: token }).staffManagement.setRoles({
        userId: 1,
        roles: ["stock_manager"],
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows removing admin from another admin when another active admin remains", async () => {
    await seedUser({ id: 1, name: "Admin A", loginName: "admin-a", roles: ["admin"] });
    await seedUser({ id: 2, name: "Admin B", loginName: "admin-b", roles: ["admin"] });
    const token = await staffTokenFor(1);
    staffState.selectForUpdateCalls = 0;
    await expect(
      caller({ staffToken: token }).staffManagement.setRoles({
        userId: 2,
        roles: ["stock_manager"],
      })
    ).resolves.toMatchObject({ userId: 2, roles: ["stock_manager"] });
    expect(staffState.selectForUpdateCalls).toBeGreaterThan(0);
  });
});

describe("staff management setActive", () => {
  it("revokes only the deactivated user's sessions and rejects inactive login", async () => {
    await seedUser({ id: 1, name: "Admin", loginName: "admin1", roles: ["admin"] });
    await seedUser({ id: 2, name: "Stock", loginName: "stock1", roles: ["stock_manager"] });
    const adminToken = await staffTokenFor(1);
    const stockToken = await staffTokenFor(2);

    await caller({ staffToken: adminToken }).staffManagement.setActive({
      userId: 2,
      isActive: false,
    });

    expect(await validateStaffSession(stockToken)).toBeNull();
    expect(await validateStaffSession(adminToken)).not.toBeNull();
    const revoked = staffState.sessions.filter((s) => s.userId === 2 && s.revokedAt != null);
    expect(revoked.length).toBeGreaterThan(0);
  });

  it("prevents self-deactivation and final active admin deactivation", async () => {
    await seedUser({ id: 1, name: "Only Admin", loginName: "only", roles: ["admin"] });
    const token = await staffTokenFor(1);
    await expect(
      caller({ staffToken: token }).staffManagement.setActive({
        userId: 1,
        isActive: false,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows deactivating another admin when another active admin remains", async () => {
    await seedUser({ id: 1, name: "Admin A", loginName: "admin-a", roles: ["admin"] });
    await seedUser({ id: 2, name: "Admin B", loginName: "admin-b", roles: ["admin"] });
    const token = await staffTokenFor(1);
    await expect(
      caller({ staffToken: token }).staffManagement.setActive({
        userId: 2,
        isActive: false,
      })
    ).resolves.toMatchObject({ userId: 2, isActive: false });
  });
});
