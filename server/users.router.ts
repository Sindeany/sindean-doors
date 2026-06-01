/**
 * Users Router — مصادقة العملاء (التجزئة)
 * تسجيل، تسجيل دخول، تسجيل خروج، جلب البيانات، تحديث المفضلة
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { db, schema } from "./db.js";
import { eq, and, gt } from "drizzle-orm";
import { t, publicProcedure, router } from "./trpc.js";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 يوم

// ── User session middleware ──────────────────────────────────────────────────
const userProcedure = t.procedure.use(async ({ ctx, next }) => {
  const token = (ctx as any).userToken as string | undefined;
  if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "يرجى تسجيل الدخول" });

  const now = Date.now();
  const session = await db.query.userSessions.findFirst({
    where: and(
      eq(schema.userSessions.token, token),
      gt(schema.userSessions.expiresAt, now)
    ),
  });
  if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "انتهت الجلسة، يرجى تسجيل الدخول مجدداً" });

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, session.userId),
  });
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

  return next({ ctx: { ...ctx, user } });
});

// ── Router ───────────────────────────────────────────────────────────────────
export const usersRouter = router({

  // ── تسجيل مستخدم جديد ───────────────────────────────────────────────────
  register: publicProcedure
    .input(z.object({
      name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
      email: z.string().email("بريد إلكتروني غير صحيح"),
      phone: z.string().min(10, "رقم الجوال غير صحيح"),
      password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
    }))
    .mutation(async ({ input }) => {
      const existing = await db.query.users.findFirst({
        where: eq(schema.users.email, input.email),
      });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "البريد الإلكتروني مسجل مسبقاً" });

      const passwordHash = await bcrypt.hash(input.password, 10);
      const now = Date.now();
      const [result] = await db.insert(schema.users).values({
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
        wishlistIds: [],
        createdAt: now,
        updatedAt: now,
      });
      const userId = (result as any).insertId;

      const token = nanoid(64);
      await db.insert(schema.userSessions).values({
        userId,
        token,
        expiresAt: now + SESSION_TTL_MS,
        createdAt: now,
      });

      return { token, user: { id: userId, name: input.name, email: input.email, phone: input.phone, wishlistIds: [] } };
    }),

  // ── تسجيل الدخول ────────────────────────────────────────────────────────
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const user = await db.query.users.findFirst({
        where: eq(schema.users.email, input.email),
      });
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "البريد أو كلمة المرور غير صحيحة" });

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "البريد أو كلمة المرور غير صحيحة" });

      const token = nanoid(64);
      const now = Date.now();
      await db.insert(schema.userSessions).values({
        userId: user.id,
        token,
        expiresAt: now + SESSION_TTL_MS,
        createdAt: now,
      });

      const { passwordHash: _, ...safeUser } = user;
      return { token, user: safeUser };
    }),

  // ── بيانات المستخدم الحالي ──────────────────────────────────────────────
  me: userProcedure.query(async ({ ctx }) => {
    const { passwordHash: _, ...safe } = (ctx as any).user;
    return safe;
  }),

  // ── تسجيل الخروج ────────────────────────────────────────────────────────
  logout: userProcedure.mutation(async ({ ctx }) => {
    const token = (ctx as any).userToken as string;
    await db.delete(schema.userSessions).where(eq(schema.userSessions.token, token));
    return { success: true };
  }),

  // ── تحديث المفضلة ────────────────────────────────────────────────────────
  toggleWishlist: userProcedure
    .input(z.object({ productId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const user = (ctx as any).user;
      const wishlist: number[] = (user.wishlistIds as number[]) ?? [];
      const updated = wishlist.includes(input.productId)
        ? wishlist.filter((id) => id !== input.productId)
        : [...wishlist, input.productId];

      await db.update(schema.users)
        .set({ wishlistIds: updated, updatedAt: Date.now() })
        .where(eq(schema.users.id, user.id));

      return { wishlistIds: updated };
    }),
});
