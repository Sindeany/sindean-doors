import { z } from "zod/v4";
import { db, schema } from "./db.js";
import { eq, desc } from "drizzle-orm";
import { router, adminProcedure } from "./trpc.js";
import { TRPCError } from "@trpc/server";

const porStatusEnum = z.enum(["pending_review", "reviewed", "closed"]);

export const postOrderReviewRouter = router({
  // ── جلب كل المراجعات ─────────────────────────────────────
  list: adminProcedure.query(async () => {
    return db.query.postOrderReviews.findMany({
      orderBy: [desc(schema.postOrderReviews.createdAt)],
    });
  }),

  // ── تحديث حالة المراجعة ──────────────────────────────────
  updateStatus: adminProcedure
    .input(z.object({ id: z.number(), status: porStatusEnum }))
    .mutation(async ({ input }) => {
      await db
        .update(schema.postOrderReviews)
        .set({ status: input.status, updatedAt: Date.now() })
        .where(eq(schema.postOrderReviews.id, input.id));
      return { success: true };
    }),

  // ── إضافة مقترح تحسين ────────────────────────────────────
  addImprovement: adminProcedure
    .input(z.object({ id: z.number(), improvement: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const existing = await db.query.postOrderReviews.findFirst({
        where: eq(schema.postOrderReviews.id, input.id),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const current = Array.isArray(existing.improvements)
        ? (existing.improvements as string[])
        : [];
      await db
        .update(schema.postOrderReviews)
        .set({
          improvements: [...current, input.improvement],
          updatedAt: Date.now(),
        })
        .where(eq(schema.postOrderReviews.id, input.id));
      return { success: true };
    }),

  // ── بيانات تجريبية ───────────────────────────────────────
  seed: adminProcedure.mutation(async () => {
    const now = Date.now();
    const samples = [
      {
        orderNumber: "ORD-2026-0457",
        distributorName: "مجموعة الأمل العقارية",
        totalDoors: 80,
        completedAt: "2026-05-20",
        plannedDays: 12,
        actualDays: 11,
        clientRating: 5,
        clientFeedback: "ممتاز جداً، الأبواب وصلت في الوقت المحدد وبجودة عالية",
        errors: [],
        improvements: ["تحسين تسمية الطرود بشكل أوضح"],
        status: "reviewed" as const,
      },
      {
        orderNumber: "ORD-2026-0453",
        distributorName: "مجموعة الراشد العقارية",
        totalDoors: 120,
        completedAt: "2026-05-18",
        plannedDays: 14,
        actualDays: 17,
        clientRating: 3,
        clientFeedback: "التأخير في التسليم أثّر على جدول المشروع",
        errors: [
          {
            category: "تخطيط الإنتاج",
            description: "تأخر 3 أيام بسبب نقص في مادة الحافة ABS",
            severity: "high",
          },
          {
            category: "فحص الجودة",
            description: "إعادة تصنيع 4 أبواب بسبب عيوب في الطلاء",
            severity: "medium",
          },
        ],
        improvements: [
          "تأمين مخزون احتياطي من الحواف",
          "تعزيز فحص الجودة في مرحلة الإنتاج",
        ],
        status: "pending_review" as const,
      },
      {
        orderNumber: "ORD-2026-0449",
        distributorName: "شركة المدار للتطوير",
        totalDoors: 36,
        completedAt: "2026-05-12",
        plannedDays: 8,
        actualDays: 8,
        clientRating: 4,
        clientFeedback: "جيد، لكن بعض الأبواب كانت تحتاج ضبط في المفصلات",
        errors: [
          {
            category: "تجميع",
            description: "ضبط المفصلات غير دقيق في 3 أبواب",
            severity: "low",
          },
        ],
        improvements: ["مراجعة معايير ضبط المفصلات في الفحص النهائي"],
        status: "closed" as const,
      },
    ];
    for (const r of samples) {
      await db.insert(schema.postOrderReviews).values({
        orderNumber: r.orderNumber,
        distributorName: r.distributorName,
        totalDoors: r.totalDoors,
        completedAt: r.completedAt,
        plannedDays: r.plannedDays,
        actualDays: r.actualDays,
        clientRating: r.clientRating,
        clientFeedback: r.clientFeedback,
        errors: r.errors,
        improvements: r.improvements,
        status: r.status,
        createdAt: now,
        updatedAt: now,
      });
    }
    return { success: true };
  }),
});
