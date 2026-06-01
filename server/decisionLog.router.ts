import { z } from "zod/v4";
import { db, schema } from "./db.js";
import { desc, eq } from "drizzle-orm";
import { router, adminProcedure } from "./trpc.js";

const decisionEnum = z.enum(["approved", "rejected", "revision_requested"]);

export const decisionLogRouter = router({
  // ── جلب كل سجلات القرارات ─────────────────────────────────
  list: adminProcedure.query(async () => {
    return db.query.decisionLog.findMany({
      orderBy: [desc(schema.decisionLog.createdAt)],
    });
  }),

  // ── إضافة سجل قرار جديد ──────────────────────────────────
  add: adminProcedure
    .input(
      z.object({
        orderNumber: z.string().min(1),
        distributor: z.string().min(1),
        company: z.string().min(1),
        city: z.string().default(""),
        orderTotal: z.number().int().min(0),
        decision: decisionEnum,
        reason: z.string().optional(),
        decidedBy: z.string().min(1),
        decidedAt: z.string().min(1),
        responseTime: z.number().int().min(0),
        items: z.any(),
        notified: z.boolean().default(false),
        followUp: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const now = Date.now();
      await db.insert(schema.decisionLog).values({
        orderNumber: input.orderNumber,
        distributor: input.distributor,
        company: input.company,
        city: input.city,
        orderTotal: input.orderTotal,
        decision: input.decision,
        reason: input.reason ?? null,
        decidedBy: input.decidedBy,
        decidedAt: input.decidedAt,
        responseTime: input.responseTime,
        items: input.items ?? [],
        notified: input.notified,
        followUp: input.followUp ?? null,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true };
    }),

  // ── تحديث حقل الإشعار ────────────────────────────────────
  markNotified: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db
        .update(schema.decisionLog)
        .set({ notified: true, updatedAt: Date.now() })
        .where(eq(schema.decisionLog.id, input.id));
      return { success: true };
    }),

  // ── بيانات تجريبية ───────────────────────────────────────
  seed: adminProcedure.mutation(async () => {
    const now = Date.now();
    const samples = [
      {
        orderNumber: "SND-2026-0091",
        distributor: "أحمد الزهراني",
        company: "شركة النخبة",
        city: "الرياض",
        orderTotal: 19100,
        decision: "approved" as const,
        decidedBy: "محمد العتيبي (المدير العام)",
        decidedAt: "2026-04-28 09:22",
        responseTime: 8,
        items: [
          { name: "باب خشبي كلاسيكي", qty: 4 },
          { name: "باب داخلي عصري", qty: 3 },
        ],
        notified: true,
      },
      {
        orderNumber: "SND-2026-0090",
        distributor: "محمد العمري",
        company: "مؤسسة البناء الحديث",
        city: "جدة",
        orderTotal: 9600,
        decision: "revision_requested" as const,
        reason: "يرجى تأكيد اللون قبل بدء الإنتاج",
        decidedBy: "محمد العتيبي (المدير العام)",
        decidedAt: "2026-04-28 08:55",
        responseTime: 13,
        items: [{ name: "باب خارجي فاخر", qty: 2 }],
        notified: true,
        followUp: "أكد الموزع اللون — تم الموافقة لاحقاً",
      },
      {
        orderNumber: "SND-2026-0086",
        distributor: "نورة الشهري",
        company: "مجموعة التطوير العقاري",
        city: "الرياض",
        orderTotal: 34500,
        decision: "approved" as const,
        decidedBy: "سارة القحطاني (مدير العمليات)",
        decidedAt: "2026-04-27 14:10",
        responseTime: 22,
        items: [
          { name: "باب خشبي كلاسيكي", qty: 10 },
          { name: "باب خارجي فاخر", qty: 1 },
        ],
        notified: true,
      },
      {
        orderNumber: "SND-2026-0085",
        distributor: "خالد الغامدي",
        company: "شركة الإعمار",
        city: "الدمام",
        orderTotal: 8400,
        decision: "rejected" as const,
        reason: "الطاقة الإنتاجية ممتلئة لهذه الفترة",
        decidedBy: "محمد العتيبي (المدير العام)",
        decidedAt: "2026-04-27 11:30",
        responseTime: 45,
        items: [{ name: "باب داخلي عصري", qty: 4 }],
        notified: true,
      },
      {
        orderNumber: "SND-2026-0084",
        distributor: "فهد القحطاني",
        company: "مجموعة الفيصل",
        city: "مكة",
        orderTotal: 25600,
        decision: "approved" as const,
        decidedBy: "سارة القحطاني (مدير العمليات)",
        decidedAt: "2026-04-26 16:45",
        responseTime: 5,
        items: [{ name: "باب خشبي كلاسيكي", qty: 8 }],
        notified: true,
      },
      {
        orderNumber: "SND-2026-0083",
        distributor: "سعد المالكي",
        company: "شركة تطوير الخليج",
        city: "أبها",
        orderTotal: 12000,
        decision: "revision_requested" as const,
        reason: "يرجى إرفاق مخطط المشروع",
        decidedBy: "محمد العتيبي (المدير العام)",
        decidedAt: "2026-04-26 09:00",
        responseTime: 30,
        items: [
          { name: "باب داخلي اقتصادي", qty: 6 },
          { name: "باب داخلي عصري", qty: 2 },
        ],
        notified: true,
        followUp: "لم يرد الموزع بعد",
      },
      {
        orderNumber: "SND-2026-0082",
        distributor: "عبدالله الزهراني",
        company: "مؤسسة الوفاء",
        city: "الرياض",
        orderTotal: 6300,
        decision: "rejected" as const,
        reason: "تأخر الموزع في سداد مستحقات سابقة",
        decidedBy: "محمد العتيبي (المدير العام)",
        decidedAt: "2026-04-25 13:20",
        responseTime: 60,
        items: [{ name: "باب داخلي اقتصادي", qty: 3 }],
        notified: true,
      },
      {
        orderNumber: "SND-2026-0081",
        distributor: "ريم العنزي",
        company: "شركة الريم للديكور",
        city: "جدة",
        orderTotal: 18900,
        decision: "approved" as const,
        decidedBy: "سارة القحطاني (مدير العمليات)",
        decidedAt: "2026-04-25 10:05",
        responseTime: 12,
        items: [
          { name: "باب خشبي كلاسيكي", qty: 5 },
          { name: "باب خارجي فاخر", qty: 1 },
        ],
        notified: true,
      },
      {
        orderNumber: "SND-2026-0080",
        distributor: "تركي الحربي",
        company: "مجموعة الحربي",
        city: "الطائف",
        orderTotal: 7200,
        decision: "approved" as const,
        decidedBy: "محمد العتيبي (المدير العام)",
        decidedAt: "2026-04-24 15:30",
        responseTime: 18,
        items: [{ name: "باب داخلي عصري", qty: 3 }],
        notified: true,
      },
      {
        orderNumber: "SND-2026-0079",
        distributor: "منى الشمري",
        company: "مؤسسة الشمري",
        city: "حائل",
        orderTotal: 4800,
        decision: "rejected" as const,
        reason: "المقاسات المطلوبة غير متاحة",
        decidedBy: "سارة القحطاني (مدير العمليات)",
        decidedAt: "2026-04-24 11:00",
        responseTime: 25,
        items: [{ name: "باب خارجي فاخر", qty: 1 }],
        notified: true,
      },
    ];
    for (const r of samples) {
      await db.insert(schema.decisionLog).values({
        orderNumber: r.orderNumber,
        distributor: r.distributor,
        company: r.company,
        city: r.city,
        orderTotal: r.orderTotal,
        decision: r.decision,
        reason: r.reason ?? null,
        decidedBy: r.decidedBy,
        decidedAt: r.decidedAt,
        responseTime: r.responseTime,
        items: r.items,
        notified: r.notified,
        followUp: (r as any).followUp ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }
    return { success: true };
  }),
});
