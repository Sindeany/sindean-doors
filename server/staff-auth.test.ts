/**
 * Phase 2B-2 staff authentication.
 * Calls the real staffAuth procedures against an in-memory database.
 */
import { createHash } from "crypto";
import { describe, expect, it, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import { getTableName } from "drizzle-orm";

const { staffState, memoryDb, locks } = vi.hoisted(() => ({
  staffState: {
    users: [] as Array<Record<string, unknown>>,
    roles: [] as Array<Record<string, unknown>>,
    sessions: [] as Array<Record<string, unknown>>,
    adminSessions: [] as Array<Record<string, unknown>>,
    failRoleInsert: false,
    seq: { user: 1, role: 1, session: 1 },
  },
  memoryDb: { current: null as null | ReturnType<typeof createMemoryDb> },
  locks: {
    held: false,
    waiters: [] as Array<() => void>,
    releaseValue: 1 as unknown,
    poolReleased: 0,
    poolDestroyed: 0,
  },
}));

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
  token: "token",
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
      const expected = typeof param === "object" && param && "param" in param ? param.param : undefined;
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
  return {
    select() {
      return {
        from(table: unknown) {
          const key = bucket(table);
          const query: {
            preds: Array<(row: Record<string, unknown>) => boolean>;
            max: number;
            where: (sql: unknown) => typeof query;
            limit: (n: number) => typeof query;
            then: Promise<Record<string, unknown>[]>["then"];
          } = {
            preds: [],
            max: Number.POSITIVE_INFINITY,
            where(sql: unknown) {
              query.preds = matchers(sql);
              return query;
            },
            limit(n: number) {
              query.max = n;
              return query;
            },
            then(onFulfilled, onRejected) {
              const rows = target[key]
                .filter((row) => query.preds.every((pred) => pred(row)))
                .slice(0, query.max)
                .map((row) => ({ ...row }));
              return Promise.resolve(rows).then(onFulfilled, onRejected);
            },
          };
          return query;
        },
      };
    },
    insert(table: unknown) {
      return {
        values(row: Record<string, unknown>) {
          const key = bucket(table);
          if (key === "roles" && staffState.failRoleInsert) {
            staffState.failRoleInsert = false;
            return Promise.reject(new Error("role insert failed"));
          }
          const seqKey = key === "users" ? "user" : key === "roles" ? "role" : "session";
          const id = target.seq[seqKey]++;
          target[key].push({ id, ...row });
          return Promise.resolve([{ insertId: id }]);
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
        failRoleInsert: target.failRoleInsert,
        seq: target.seq,
      });
      try {
        const result = await fn(createMemoryDb(draft));
        target.users = draft.users;
        target.roles = draft.roles;
        target.sessions = draft.sessions;
        target.adminSessions = draft.adminSessions;
        target.seq = draft.seq;
        return result;
      } catch (error) {
        throw error;
      }
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
    pool: {
      async getConnection() {
        return {
          async query(sql: string) {
            if (sql.includes("GET_LOCK")) {
              if (!locks.held) {
                locks.held = true;
                return [[{ locked: 1 }]];
              }
              await new Promise<void>((resolve) => {
                locks.waiters.push(resolve);
              });
              return [[{ locked: 1 }]];
            }
            if (sql.includes("RELEASE_LOCK")) {
              const next = locks.waiters.shift();
              if (next) next();
              else locks.held = false;
              return [[{ released: locks.releaseValue }]];
            }
            throw new Error("unexpected connection sql " + sql);
          },
          release() {
            locks.poolReleased += 1;
          },
          destroy() {
            locks.poolDestroyed += 1;
          },
        };
      },
    },
  };
});

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: () => {
    if (!memoryDb.current) throw new Error("staff memory db is not ready");
    return memoryDb.current;
  },
}));

import { appRouter } from "./routers.js";
import {
  STAFF_COOKIE_NAME,
  STAFF_COOKIE_OPTIONS,
} from "./staff.router.js";
import {
  BCRYPT_COST,
  STAFF_SESSION_TTL_MS,
  normalizeLoginName,
  staffSessionTokenFromRequest,
} from "./staff-sessions.js";

const PASSWORD = "Sindean-staff-1";
const LOGIN_MESSAGE = "بيانات الدخول غير صحيحة";
const ADMIN_MESSAGE = "غير مصرح: يرجى تسجيل الدخول كمدير";

const bootstrapInput = {
  name: "First Admin",
  loginName: " Ａｄｍｉｎ ",
  password: PASSWORD,
};

function mockRes() {
  return {
    cookies: [] as Array<{ name: string; value: string; options: unknown }>,
    cleared: [] as Array<{ name: string; options: unknown }>,
    cookie(name: string, value: string, options: unknown) {
      this.cookies.push({ name, value, options });
    },
    clearCookie(name: string, options: unknown) {
      this.cleared.push({ name, options });
    },
  };
}

function caller(extra: {
  adminToken?: string;
  staffToken?: string;
  req?: { headers: Record<string, string> };
  res?: ReturnType<typeof mockRes>;
} = {}) {
  return appRouter.createCaller({
    adminToken: extra.adminToken,
    staffToken: extra.staffToken,
    req: extra.req ?? { headers: {} },
    res: extra.res as never,
  });
}

const legacyAdmin = () => caller({ adminToken: "valid-admin-token" });

beforeEach(() => {
  staffState.users = [];
  staffState.roles = [];
  staffState.sessions = [];
  staffState.adminSessions = [
    {
      id: 1,
      token: "valid-admin-token",
      expiresAt: Date.now() + 60 * 60 * 1000,
      createdAt: Date.now(),
    },
  ];
  staffState.failRoleInsert = false;
  staffState.seq = { user: 1, role: 1, session: 1 };
  locks.held = false;
  locks.waiters = [];
  locks.releaseValue = 1;
  locks.poolReleased = 0;
  locks.poolDestroyed = 0;
});

describe("staff login name normalization", () => {
  it("preserves internal whitespace and normalizes case and width", () => {
    expect(normalizeLoginName("Ali  Hassan")).toBe("ali  hassan");
    expect(normalizeLoginName(" Ａｄｍｉｎ ")).toBe("admin");
    expect(BCRYPT_COST).toBe(12);
  });
});

describe("staff bootstrap", () => {
  it("rejects a hostile origin even with a valid legacy admin token", async () => {
    await expect(caller({
      adminToken: "valid-admin-token",
      req: { headers: { origin: "https://evil.example" } },
    }).staffAuth.bootstrapFirstAdmin(bootstrapInput)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(staffState.users).toHaveLength(0);
    expect(staffState.roles).toHaveLength(0);
  });

  it("destroys the connection when RELEASE_LOCK does not return 1", async () => {
    locks.releaseValue = 0;
    await expect(legacyAdmin().staffAuth.bootstrapFirstAdmin(bootstrapInput)).resolves.toMatchObject({
      userId: 1,
      roles: ["admin"],
    });
    expect(locks.poolDestroyed).toBe(1);
    expect(locks.poolReleased).toBe(0);
  });

  it("rejects an unauthenticated caller", async () => {
    await expect(caller().staffAuth.bootstrapFirstAdmin(bootstrapInput)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: ADMIN_MESSAGE,
    });
    expect(staffState.users).toHaveLength(0);
  });

  it("creates exactly one admin when staff_users is empty", async () => {
    const res = mockRes();
    const created = await caller({ adminToken: "valid-admin-token", res }).staffAuth.bootstrapFirstAdmin(bootstrapInput);
    expect(created).toEqual({
      userId: 1,
      name: "First Admin",
      loginName: "admin",
      roles: ["admin"],
    });
    expect(staffState.roles.map((row) => row.role)).toEqual(["admin"]);
    expect(staffState.sessions).toHaveLength(0);
    expect(res.cookies).toHaveLength(0);
    expect(locks.poolReleased).toBe(1);
    expect(locks.poolDestroyed).toBe(0);
    const hash = String(staffState.users[0].passwordHash);
    expect(hash).not.toBe(PASSWORD);
    expect(hash.split("$")[2]).toBe("12");
    expect(await bcrypt.compare(PASSWORD, hash)).toBe(true);
    expect(JSON.stringify(created)).not.toContain(hash);
    expect(JSON.stringify(created)).not.toContain(PASSWORD);
  });

  it("rejects a second bootstrap", async () => {
    await legacyAdmin().staffAuth.bootstrapFirstAdmin(bootstrapInput);
    await expect(legacyAdmin().staffAuth.bootstrapFirstAdmin({
      name: "Second",
      loginName: "other",
      password: PASSWORD,
    })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(staffState.users).toHaveLength(1);
    expect(staffState.roles).toHaveLength(1);
  });

  it("lets only one of two concurrent bootstraps create the first admin", async () => {
    const results = await Promise.allSettled([
      legacyAdmin().staffAuth.bootstrapFirstAdmin({
        name: "Admin A",
        loginName: "admin-a",
        password: PASSWORD,
      }),
      legacyAdmin().staffAuth.bootstrapFirstAdmin({
        name: "Admin B",
        loginName: "admin-b",
        password: PASSWORD,
      }),
    ]);
    const created = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    expect(created).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({
      reason: { code: "CONFLICT" },
    });
    expect(staffState.users).toHaveLength(1);
    expect(staffState.roles).toHaveLength(1);
    expect(staffState.roles[0].role).toBe("admin");
    expect(staffState.roles[0].userId).toBe(staffState.users[0].id);
    expect(locks.held).toBe(false);
    expect(locks.waiters).toHaveLength(0);
  });

  it("rolls back the user when the role insert fails", async () => {
    staffState.failRoleInsert = true;
    await expect(legacyAdmin().staffAuth.bootstrapFirstAdmin(bootstrapInput)).rejects.toThrow();
    expect(staffState.users).toHaveLength(0);
    expect(staffState.roles).toHaveLength(0);
  });
});

describe("staff login", () => {
  beforeEach(async () => {
    await legacyAdmin().staffAuth.bootstrapFirstAdmin(bootstrapInput);
  });

  it("accepts a normalized login name and the correct password", async () => {
    const res = mockRes();
    const before = Date.now();
    const result = await caller({ res }).staffAuth.login({
      loginName: " ADMIN ",
      password: PASSWORD,
    });
    expect(result.loginName).toBe("admin");
    expect(result.roles).toEqual(["admin"]);
    expect(result.expiresAt).toBeGreaterThanOrEqual(before + STAFF_SESSION_TTL_MS - 1000);
    expect(result.expiresAt).toBeLessThanOrEqual(Date.now() + STAFF_SESSION_TTL_MS + 1000);
    expect(staffState.sessions).toHaveLength(1);
    expect(staffState.sessions[0].revokedAt).toBeNull();
    const raw = res.cookies[0].value;
    const tokenHash = createHash("sha256").update(raw).digest("hex");
    expect(staffState.sessions[0].tokenHash).toBe(tokenHash);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).not.toBe(raw);
    expect(JSON.stringify(result)).not.toContain(raw);
    expect(JSON.stringify(result)).not.toContain(String(staffState.sessions[0].tokenHash));
    expect(JSON.stringify(result)).not.toContain(String(staffState.users[0].passwordHash));
    expect(res.cookies[0]).toMatchObject({
      name: STAFF_COOKIE_NAME,
      options: STAFF_COOKIE_OPTIONS,
    });
    expect(STAFF_COOKIE_OPTIONS).toMatchObject({
      httpOnly: true,
      path: "/",
      maxAge: 8 * 60 * 60 * 1000,
    });
  });

  it("rejects an invalid password, an unknown name, and an inactive user with one message", async () => {
    const invalid = caller().staffAuth.login({ loginName: "admin", password: "wrong-password" });
    const unknown = caller().staffAuth.login({ loginName: "missing", password: PASSWORD });
    await expect(invalid).rejects.toMatchObject({ code: "UNAUTHORIZED", message: LOGIN_MESSAGE });
    await expect(unknown).rejects.toMatchObject({ code: "UNAUTHORIZED", message: LOGIN_MESSAGE });
    staffState.users[0].isActive = false;
    await expect(caller().staffAuth.login({ loginName: "admin", password: PASSWORD })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: LOGIN_MESSAGE,
    });
    expect(staffState.sessions).toHaveLength(0);
  });

  it("does not treat a different internal space as the same login name", async () => {
    await caller().staffAuth.bootstrapFirstAdmin({
      name: "Floor",
      loginName: "Ali Hassan",
      password: PASSWORD,
    }).catch(() => undefined);
    staffState.users.push({
      id: 2,
      name: "Floor",
      loginName: "ali hassan",
      passwordHash: staffState.users[0].passwordHash,
      isActive: true,
      createdAt: 1,
      updatedAt: 1,
    });
    await expect(caller().staffAuth.login({
      loginName: "Ali  Hassan",
      password: PASSWORD,
    })).rejects.toMatchObject({ code: "UNAUTHORIZED", message: LOGIN_MESSAGE });
  });

  it("rejects a cross-origin login before creating a session", async () => {
    await expect(caller({
      req: { headers: { origin: "https://evil.example" } },
    }).staffAuth.login({ loginName: "admin", password: PASSWORD })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(staffState.sessions).toHaveLength(0);
  });

  it("ignores a client-supplied role list", async () => {
    staffState.roles.push({ id: 2, userId: 1, role: "laminating" });
    const result = await caller({ res: mockRes() }).staffAuth.login({
      loginName: "admin",
      password: PASSWORD,
      roles: ["stock_manager"],
    } as never);
    expect(result.roles).toEqual(["admin", "laminating"]);
  });
});

describe("staff session validation", () => {
  async function login() {
    const res = mockRes();
    await caller({ res }).staffAuth.login({ loginName: "admin", password: PASSWORD });
    return res.cookies[0].value;
  }

  beforeEach(async () => {
    await legacyAdmin().staffAuth.bootstrapFirstAdmin(bootstrapInput);
  });

  it("returns the individual user and current roles", async () => {
    const raw = await login();
    staffState.roles.push({ id: 2, userId: 1, role: "packing" });
    const me = await caller({ staffToken: raw }).staffAuth.me();
    expect(me).toMatchObject({
      userId: 1,
      name: "First Admin",
      loginName: "admin",
      roles: ["admin", "packing"],
    });
    staffState.roles.splice(0, staffState.roles.length, { id: 3, userId: 1, role: "cutting" });
    const next = await caller({ staffToken: raw }).staffAuth.me();
    expect(next.roles).toEqual(["cutting"]);
  });

  it("rejects a missing session and an unknown token", async () => {
    await expect(caller().staffAuth.me()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller({ staffToken: "not-a-session" }).staffAuth.me()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects an expired session and a revoked session", async () => {
    const expiredToken = await login();
    staffState.sessions[0].expiresAt = Date.now() - 1;
    await expect(caller({ staffToken: expiredToken }).staffAuth.me()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(staffState.sessions).toHaveLength(0);

    const revokedToken = await login();
    staffState.sessions[0].revokedAt = Date.now();
    await expect(caller({ staffToken: revokedToken }).staffAuth.me()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(staffState.sessions).toHaveLength(1);
  });

  it("rejects a session immediately after the user is disabled", async () => {
    const raw = await login();
    staffState.users[0].isActive = false;
    await expect(caller({ staffToken: raw }).staffAuth.me()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(staffState.users).toHaveLength(1);
    expect(staffState.sessions).toHaveLength(1);
  });
});

describe("staff logout", () => {
  beforeEach(async () => {
    await legacyAdmin().staffAuth.bootstrapFirstAdmin(bootstrapInput);
  });

  it("revokes the session, clears the cookie, and allows a second logout", async () => {
    const res = mockRes();
    await caller({ res }).staffAuth.login({ loginName: "admin", password: PASSWORD });
    const raw = res.cookies[0].value;
    await caller({ staffToken: raw, res }).staffAuth.logout();
    expect(staffState.sessions[0].revokedAt).toEqual(expect.any(Number));
    expect(res.cleared[0]).toMatchObject({ name: STAFF_COOKIE_NAME, options: { path: "/", httpOnly: true } });
    const revokedAt = staffState.sessions[0].revokedAt;
    await expect(caller({ staffToken: raw, res }).staffAuth.logout()).resolves.toEqual({ success: true });
    expect(staffState.sessions[0].revokedAt).toBe(revokedAt);
    expect(res.cleared).toHaveLength(2);
    await expect(caller({ staffToken: raw }).staffAuth.me()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("staff auth boundaries", () => {
  it("does not accept x-admin-token as a staff session", async () => {
    expect(staffSessionTokenFromRequest({
      cookies: {},
      headers: { "x-admin-token": "valid-admin-token" },
    })).toBeUndefined();
    await expect(caller({ adminToken: "valid-admin-token" }).staffAuth.me()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("still accepts the legacy admin session", async () => {
    await expect(legacyAdmin().adminAuth.verify()).resolves.toEqual({ valid: true });
  });
});
