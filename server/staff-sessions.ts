/**
 * Staff sessions — individual factory identities.
 * The browser receives only the raw opaque token. The database stores SHA-256(token).
 */
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { db, pool, schema } from "./db.js";

const STAFF_BOOTSTRAP_LOCK = "sindean_staff_bootstrap";
const STAFF_BOOTSTRAP_LOCK_TIMEOUT_SECONDS = 10;

export const BCRYPT_COST = 12;
export const STAFF_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/** Timing pad for unknown login names. This is not a password for any account. */
const DUMMY_PASSWORD_HASH =
  "$2b$12$47G4CsjZI..pqS7V61Swme0WsbsMMNuk0NozFGC1KHgb1h1hvanDW";

export const STAFF_ROLES = [
  "admin",
  "sales_coordinator",
  "sales_person",
  "stock_manager",
  "production_manager",
  "laminating",
  "cutting",
  "auto_line",
  "frame_architrave",
  "packing",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export type StaffIdentity = {
  userId: number;
  sessionId: number;
  name: string;
  loginName: string;
  roles: StaffRole[];
  expiresAt: number;
};

export class InvalidLoginNameError extends Error {
  constructor() {
    super("Invalid staff login name");
    this.name = "InvalidLoginNameError";
  }
}

export class StaffBootstrapClosedError extends Error {
  constructor() {
    super("Staff bootstrap is closed");
    this.name = "StaffBootstrapClosedError";
  }
}

export class StaffBootstrapLockError extends Error {
  constructor() {
    super("Staff bootstrap lock was not acquired");
    this.name = "StaffBootstrapLockError";
  }
}

export function isStaffRole(value: string): value is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(value);
}

/** NFKC, trim, and lowercase. Internal whitespace is preserved, not collapsed. */
export function normalizeLoginName(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase();
}

export function requireLoginName(value: string): string {
  const loginName = normalizeLoginName(value);
  if (loginName.length < 1 || loginName.length > 100) {
    throw new InvalidLoginNameError();
  }
  return loginName;
}

export function hashStaffSessionToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function generateStaffSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Cookie only. The legacy x-admin-token header is not a staff credential. */
export function staffSessionTokenFromRequest(req: {
  cookies?: Record<string, unknown>;
  headers?: Record<string, unknown>;
}): string | undefined {
  const token = req.cookies?.staffSession;
  return typeof token === "string" && token.length > 0 ? token : undefined;
}

function insertIdOf(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  const insertId = Number((header as { insertId?: number } | undefined)?.insertId);
  return Number.isInteger(insertId) ? insertId : 0;
}

export async function listStaffRoles(userId: number): Promise<StaffRole[]> {
  const rows = await db
    .select()
    .from(schema.staffUserRoles)
    .where(eq(schema.staffUserRoles.userId, userId));
  const found = new Set<StaffRole>();
  for (const row of rows) {
    if (isStaffRole(row.role)) found.add(row.role);
  }
  return STAFF_ROLES.filter((role) => found.has(role));
}

export async function createFirstStaffAdmin(input: {
  name: string;
  loginName: string;
  password: string;
}): Promise<Pick<StaffIdentity, "userId" | "name" | "loginName" | "roles">> {
  const loginName = requireLoginName(input.loginName);
  const name = input.name.trim();
  // GET_LOCK is connection-scoped. Hold it on the same connection that commits,
  // and release it only after commit. A plain SELECT, including FOR UPDATE on an
  // empty table, does not stop two transactions from both observing zero rows.
  const conn = await pool.getConnection();
  let locked = false;
  try {
    const [rows] = await conn.query(
      "SELECT GET_LOCK(?, ?) AS locked",
      [STAFF_BOOTSTRAP_LOCK, STAFF_BOOTSTRAP_LOCK_TIMEOUT_SECONDS]
    );
    locked = Number((rows as Array<{ locked?: number | string }>)[0]?.locked) === 1;
    if (!locked) throw new StaffBootstrapLockError();
    const txDb = drizzle(conn, { schema, mode: "default" });
    return await txDb.transaction(async (tx) => {
      const existing = await tx.select().from(schema.staffUsers).limit(1);
      if (existing.length > 0) throw new StaffBootstrapClosedError();
      const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
      const now = Date.now();
      const inserted = await tx.insert(schema.staffUsers).values({
        name,
        loginName,
        passwordHash,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      const userId = insertIdOf(inserted);
      if (userId <= 0) throw new Error("staff user id was not created");
      await tx.insert(schema.staffUserRoles).values({
        userId,
        role: "admin",
      });
      return { userId, name, loginName, roles: ["admin"] };
    });
  } finally {
    if (!locked) {
      conn.release();
    } else {
      try {
        const [rows] = await conn.query(
          "SELECT RELEASE_LOCK(?) AS released",
          [STAFF_BOOTSTRAP_LOCK]
        );
        const released = (rows as Array<{ released?: unknown }>)[0]?.released;
        if (released === 1) conn.release();
        else conn.destroy();
      } catch {
        conn.destroy();
      }
    }
  }
}

export async function authenticateStaffPassword(
  loginNameInput: string,
  password: string
): Promise<{ userId: number; name: string; loginName: string; roles: StaffRole[] } | null> {
  let loginName: string;
  try {
    loginName = requireLoginName(loginNameInput);
  } catch (error) {
    if (error instanceof InvalidLoginNameError) return null;
    throw error;
  }
  const [user] = await db
    .select()
    .from(schema.staffUsers)
    .where(eq(schema.staffUsers.loginName, loginName))
    .limit(1);
  const passwordOk = await bcrypt.compare(
    password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH
  );
  if (!user || !passwordOk || user.isActive !== true) return null;
  const roles = await listStaffRoles(user.id);
  return { userId: user.id, name: user.name, loginName: user.loginName, roles };
}

export async function createStaffSession(userId: number): Promise<{
  rawToken: string;
  sessionId: number;
  expiresAt: number;
}> {
  const rawToken = generateStaffSessionToken();
  const tokenHash = hashStaffSessionToken(rawToken);
  const now = Date.now();
  const expiresAt = now + STAFF_SESSION_TTL_MS;
  const inserted = await db.insert(schema.staffSessions).values({
    userId,
    tokenHash,
    expiresAt,
    revokedAt: null,
    createdAt: now,
  });
  const sessionId = insertIdOf(inserted);
  if (sessionId <= 0) throw new Error("staff session id was not created");
  return { rawToken, sessionId, expiresAt };
}

export async function validateStaffSession(
  rawToken: string | undefined
): Promise<StaffIdentity | null> {
  if (!rawToken) return null;
  const tokenHash = hashStaffSessionToken(rawToken);
  const [session] = await db
    .select()
    .from(schema.staffSessions)
    .where(eq(schema.staffSessions.tokenHash, tokenHash))
    .limit(1);
  if (!session) return null;
  const now = Date.now();
  if (session.revokedAt != null) return null;
  if (session.expiresAt <= now) {
    await db
      .delete(schema.staffSessions)
      .where(eq(schema.staffSessions.id, session.id))
      .catch(() => undefined);
    return null;
  }
  const [user] = await db
    .select()
    .from(schema.staffUsers)
    .where(eq(schema.staffUsers.id, session.userId))
    .limit(1);
  if (!user || user.isActive !== true) return null;
  const roles = await listStaffRoles(user.id);
  return {
    userId: user.id,
    sessionId: session.id,
    name: user.name,
    loginName: user.loginName,
    roles,
    expiresAt: session.expiresAt,
  };
}

export async function revokeStaffSession(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  const tokenHash = hashStaffSessionToken(rawToken);
  await db
    .update(schema.staffSessions)
    .set({ revokedAt: Date.now() })
    .where(
      and(
        eq(schema.staffSessions.tokenHash, tokenHash),
        isNull(schema.staffSessions.revokedAt)
      )
    );
}
