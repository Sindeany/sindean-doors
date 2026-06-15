/**
 * Distributors Router — بوابة الموزّع
 * تسجيل الدخول، تسجيل الخروج، الملف الشخصي، الإحصائيات والطلبات
 * Batch 3-b: مصادقة حقيقية server-side (httpOnly cookies + bcrypt)
 * Batch 4-a: endpoints بيانات حقيقية (myStats, myOrders, creditUsed)
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { db, schema } from "./db.js";
import { eq, and, gt, ne, desc, like, or } from "drizzle-orm";
import { publicProcedure, distributorProcedure, router } from "./trpc.js";

const DISTRIBUTOR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "strict" : "lax") as
    | "strict"
    | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 أيام
  path: "/",
};

// ── نوع الملف الشخصي المُعاد للعميل (متوافق مع DistributorProfile في distributorData.ts) ──
function toDistributorProfile(d: typeof schema.distributors.$inferSelect, creditUsed = 0) {
  return {
    id: String(d.id),
    name: d.name,
    company: d.company,
    email: d.email,
    phone: d.phone,
    city: d.city,
    region: d.region ?? "",
    website: d.website ?? "",
    whatsapp: d.whatsapp ?? "",
    commercialReg: d.commercialReg ?? "",
    vatNumber: d.vatNumber ?? "",
    bankName: d.bankName ?? "",
    bankIban: d.bankIban ?? "",
    tier: d.tier,
    discount: d.discountRate ?? 0,
    creditLimit: d.creditLimit ?? 0,
    creditUsed,
    joinDate: d.joinDate,
    // salesRep غير موجود في DB حالياً — يُعاد كسلسلة فارغة
    salesRep: "",
    status: d.status,
  };
}

export const distributorsRouter = router({
  // ── تسجيل الدخول ────────────────────────────────────────────────────────
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 1. وجود الموزع
      const distributor = await db.query.distributors.findFirst({
        where: eq(schema.distributors.email, input.email),
      });
      if (!distributor)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "البريد أو كلمة المرور غير صحيحة",
        });

      // 2. فحص الحالة
      if (distributor.status === "suspended")
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "تم تعليق حسابك. تواصل مع الإدارة.",
        });
      if (distributor.status === "pending")
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "حسابك قيد المراجعة. سيتم إشعارك عند التفعيل.",
        });
      if (distributor.status === "rejected")
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "تم رفض طلب الانضمام. تواصل مع الإدارة.",
        });

      // 3. فحص وجود passwordHash قبل استدعاء bcrypt (لا نستدعي compare إذا كان null)
      if (!distributor.passwordHash)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "لم يُعيَّن كلمة مرور لهذا الحساب. يرجى التواصل مع الإدارة.",
        });

      // 4. التحقق من كلمة المرور
      const valid = await bcrypt.compare(
        input.password,
        distributor.passwordHash
      );
      if (!valid)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "البريد أو كلمة المرور غير صحيحة",
        });

      // 5. إنشاء جلسة
      const token = nanoid(64);
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
      await db.insert(schema.distributorSessions).values({
        distributorId: distributor.id,
        token,
        expiresAt,
        createdAt: Date.now(),
      });

      // 6. تعيين الـ cookie
      ctx.res!.cookie("distributorSession", token, DISTRIBUTOR_COOKIE_OPTIONS);

      return { distributor: toDistributorProfile(distributor) };
    }),

  // ── تسجيل الخروج ────────────────────────────────────────────────────────
  logout: distributorProcedure.mutation(async ({ ctx }) => {
    const token = ctx.distributorToken!;
    ctx.res!.clearCookie("distributorSession", { path: "/" });
    await db
      .delete(schema.distributorSessions)
      .where(eq(schema.distributorSessions.token, token));
    return { success: true };
  }),

  // ── الملف الشخصي (Batch 4-a: creditUsed حقيقي) ────────────────────────────
  me: distributorProcedure.query(async ({ ctx }) => {
    const distributor = ctx.distributor;

    // حساب الرصيد المستخدم = مجموع totalAmount لطلبات غير مدفوعة بالكامل
    const distId = String(distributor.id);
    const unpaidOrders = await db.query.distributorOrders.findMany({
      where: and(
        eq(schema.distributorOrders.distributorId, distId),
        ne(schema.distributorOrders.paymentStatus, "paid"),
      ),
      columns: { totalAmount: true },
    });
    const creditUsed = unpaidOrders.reduce(
      (s, o) => s + (o.totalAmount ?? 0),
      0,
    );

    return toDistributorProfile(distributor, creditUsed);
  }),

  // ── إحصائيات الموزّع (Batch 4-a) ──────────────────────────────────────────
  myStats: distributorProcedure.query(async ({ ctx }) => {
    const distId = String(ctx.distributor.id);
    const allOrders = await db.query.distributorOrders.findMany({
      where: eq(schema.distributorOrders.distributorId, distId),
      orderBy: [desc(schema.distributorOrders.createdAt)],
    });

    // ── حسابات ديناميكية (لا counters مخزّنة) ──
    const totalRevenue = allOrders.reduce(
      (s, o) => s + (o.totalAmount ?? 0),
      0,
    );
    const totalOrders = allOrders.length;
    const activeOrders = allOrders.filter(
      (o) => o.status !== "delivered" && o.status !== "cancelled",
    ).length;
    const deliveredOrders = allOrders.filter(
      (o) => o.status === "delivered",
    ).length;

    // ── إيراد الشهر الحالي والسابق ──
    const now = new Date();
    const thisMonthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).getTime();
    const lastMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    ).getTime();

    const thisMonthRevenue = allOrders
      .filter((o) => o.createdAt >= thisMonthStart)
      .reduce((s, o) => s + (o.totalAmount ?? 0), 0);
    const lastMonthRevenue = allOrders
      .filter(
        (o) => o.createdAt >= lastMonthStart && o.createdAt < thisMonthStart,
      )
      .reduce((s, o) => s + (o.totalAmount ?? 0), 0);
    const revenueGrowthPct =
      lastMonthRevenue > 0
        ? Math.round(
            ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100,
          )
        : 0;

    // ── تجميع شهري (آخر 6 أشهر) — نفس نمط orders.stats ──
    // الطلبات الأقدم من 6 أشهر لا تُحسب (monthlyMap[key] يكون undefined)
    const ARABIC_MONTHS = [
      "يناير",
      "فبراير",
      "مارس",
      "أبريل",
      "مايو",
      "يونيو",
      "يوليو",
      "أغسطس",
      "سبتمبر",
      "أكتوبر",
      "نوفمبر",
      "ديسمبر",
    ];
    const EN_MONTHS = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthlyMap: Record<
      string,
      { month: string; monthEn: string; revenue: number; orders: number }
    > = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] = {
        month: ARABIC_MONTHS[d.getMonth()],
        monthEn: EN_MONTHS[d.getMonth()],
        revenue: 0,
        orders: 0,
      };
    }
    for (const o of allOrders) {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyMap[key]) {
        monthlyMap[key].revenue += o.totalAmount ?? 0;
        monthlyMap[key].orders += 1;
      }
    }

    // ── عدد الطلبات لكل حالة ──
    const statusCounts: Record<string, number> = {};
    for (const o of allOrders) {
      statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
    }

    return {
      totalRevenue,
      totalOrders,
      activeOrders,
      deliveredOrders,
      thisMonthRevenue,
      lastMonthRevenue,
      revenueGrowthPct,
      monthly: Object.values(monthlyMap),
      statusCounts,
    };
  }),

  // ── طلبات الموزّع (Batch 4-a) ─────────────────────────────────────────────
  myOrders: distributorProcedure
    .input(
      z
        .object({
          status: z
            .enum([
              "draft",
              "pending",
              "confirmed",
              "manufacturing",
              "shipped",
              "delivered",
              "cancelled",
            ])
            .optional(),
          limit: z.number().int().min(1).max(200).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const distId = String(ctx.distributor.id);

      const whereClause = input?.status
        ? and(
            eq(schema.distributorOrders.distributorId, distId),
            eq(schema.distributorOrders.status, input.status),
          )
        : eq(schema.distributorOrders.distributorId, distId);

      const orders = await db.query.distributorOrders.findMany({
        where: whereClause,
        orderBy: [desc(schema.distributorOrders.createdAt)],
        limit: input?.limit ?? 50,
      });

      const orderIds = orders.map(o => o.id);
      let linkedDoorOrders: any[] = [];
      if (orderIds.length > 0) {
        const conditions = orderIds.map(id => like(schema.doorOrders.notes, `DIST_ORDER_ID:${id}%`));
        linkedDoorOrders = await db.query.doorOrders.findMany({
          where: or(...conditions),
        });
      }

      return orders.map((o) => {
        let itemsList: any[] = [];
        try {
          itemsList = typeof o.items === "string" ? JSON.parse(o.items) : o.items;
        } catch {
          itemsList = [];
        }

        const oDoorOrders = linkedDoorOrders
          .filter(d => d.notes && d.notes.startsWith(`DIST_ORDER_ID:${o.id}`))
          .sort((a, b) => a.id - b.id);

        const itemsWithStages = itemsList.map((it, idx) => {
          const matchedDoorOrder = oDoorOrders[idx];
          return {
            ...it,
            workflowStage: matchedDoorOrder?.workflowStage || null,
          };
        });

        return {
          ...o,
          items: itemsWithStages,
        };
      });
    }),

  // ── تحديث الملف الشخصي للموزع ─────────────────────────────────────────────
  updateProfile: distributorProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        company: z.string().min(1).max(255),
        phone: z.string().min(1).max(50),
        city: z.string().max(100),
        region: z.string().max(100).optional(),
        website: z.string().max(255).optional(),
        whatsapp: z.string().max(50).optional(),
        commercialReg: z.string().max(50).optional(),
        vatNumber: z.string().max(20).optional(),
        bankName: z.string().max(255).optional(),
        bankIban: z.string().max(40).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const distId = ctx.distributor.id;
      await db
        .update(schema.distributors)
        .set({
          ...input,
          updatedAt: Date.now(),
        })
        .where(eq(schema.distributors.id, distId));
      return { success: true };
    }),

  // ── تحديث كلمة المرور للموزع ─────────────────────────────────────────────
  updatePassword: distributorProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const distId = ctx.distributor.id;
      const distributor = await db.query.distributors.findFirst({
        where: eq(schema.distributors.id, distId),
      });
      if (!distributor || !distributor.passwordHash) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الموزع غير موجود",
        });
      }
      const valid = await bcrypt.compare(
        input.currentPassword,
        distributor.passwordHash
      );
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "كلمة المرور الحالية غير صحيحة",
        });
      }
      const passwordHash = await bcrypt.hash(input.newPassword, 10);
      await db
        .update(schema.distributors)
        .set({
          passwordHash,
          updatedAt: Date.now(),
        })
        .where(eq(schema.distributors.id, distId));
      return { success: true };
    }),
});
