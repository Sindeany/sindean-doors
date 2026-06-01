/**
 * Admin Sessions — إدارة جلسات المدير في قاعدة البيانات
 * تبقى الجلسات حتى بعد إعادة تشغيل السيرفر
 * المدة: 8 ساعات لكل جلسة
 */
import { nanoid } from "nanoid";
import { db, schema } from "./db.js";
import { eq, lt } from "drizzle-orm";

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export async function createAdminSession(): Promise<string> {
  const token = nanoid(64);
  const now = Date.now();
  // Remove expired sessions (cleanup)
  await db.delete(schema.adminSessions).where(lt(schema.adminSessions.expiresAt, now));
  await db.insert(schema.adminSessions).values({
    token,
    expiresAt: now + SESSION_TTL_MS,
    createdAt: now,
  });
  return token;
}

export async function validateAdminSession(token: string): Promise<boolean> {
  const [session] = await db
    .select()
    .from(schema.adminSessions)
    .where(eq(schema.adminSessions.token, token))
    .limit(1);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    await db.delete(schema.adminSessions).where(eq(schema.adminSessions.token, token));
    return false;
  }
  return true;
}

export async function deleteAdminSession(token: string): Promise<void> {
  await db.delete(schema.adminSessions).where(eq(schema.adminSessions.token, token));
}
