import { z } from "zod/v4";
import { db, schema } from "./db.js";
import { eq, desc } from "drizzle-orm";
import { router, adminProcedure } from "./trpc.js";

export const qcRouter = router({
  // ── جلب كل الفحوصات ──────────────────────────────────────────
  list: adminProcedure.query(async () => {
    const rows = await db.query.qcInspections.findMany({
      orderBy: [desc(schema.qcInspections.createdAt)],
    });
    return rows;
  }),

  // ── إنشاء فحص جديد ───────────────────────────────────────────
  create: adminProcedure
    .input(
      z.object({
        orderNumber: z.string().min(1),
        orderSource: z
          .enum(["door_order", "distributor_order", "manual"])
          .default("manual"),
        sourceId: z.number().optional(),
        distributorName: z.string().min(1),
        totalDoors: z.number().int().min(1).default(1),
        qcType: z.enum(["incoming", "final", "po_matching"]),
        inspector: z.string().default(""),
        checkItems: z
          .record(z.string(), z.union([z.boolean(), z.null()]))
          .optional(),
        issues: z.array(z.string()).default([]),
        photos: z.number().int().min(0).default(0),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const now = Date.now();

      // تحديد النتيجة بناءً على checkItems
      let result: "pass" | "fail" | "pending" = "pending";
      if (input.checkItems) {
        const vals = Object.values(input.checkItems);
        const answered = vals.filter(v => v !== null);
        if (answered.length === vals.length && vals.length > 0) {
          result = vals.every(v => v === true) ? "pass" : "fail";
        }
      }
      if (input.issues && input.issues.length > 0) result = "fail";

      const [res] = await db.insert(schema.qcInspections).values({
        orderNumber: input.orderNumber,
        orderSource: input.orderSource,
        sourceId: input.sourceId ?? null,
        distributorName: input.distributorName,
        totalDoors: input.totalDoors,
        qcType: input.qcType,
        result,
        inspector: input.inspector,
        checkItems: input.checkItems ?? null,
        issues: input.issues,
        photos: input.photos,
        notes: input.notes ?? null,
        inspectedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      return { id: (res as any).insertId, result };
    }),

  // ── تحديث نتيجة الفحص (اعتماد / عزل) ─────────────────────────
  updateResult: adminProcedure
    .input(
      z.object({
        id: z.number(),
        result: z.enum(["pass", "fail"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(schema.qcInspections)
        .set({
          result: input.result,
          notes: input.notes,
          updatedAt: Date.now(),
        })
        .where(eq(schema.qcInspections.id, input.id));
      return { success: true };
    }),

  // ── بيانات تجريبية ────────────────────────────────────────────
  seed: adminProcedure.mutation(async () => {
    const now = Date.now();
    const seeds = [
      {
        orderNumber: "ORD-2026-0452",
        orderSource: "door_order" as const,
        distributorName: "مؤسسة النخبة للتوريدات",
        totalDoors: 24,
        qcType: "incoming" as const,
        result: "pass" as const,
        inspector: "م. سالم العمري",
        checkItems: {
          color: true,
          thickness: true,
          straightness: true,
          defects: true,
        },
        issues: [] as string[],
        photos: 8,
        notes: "دفعة سليمة - لا ملاحظات",
        inspectedAt: now - 1000 * 60 * 60 * 48,
        createdAt: now - 1000 * 60 * 60 * 48,
        updatedAt: now - 1000 * 60 * 60 * 48,
      },
      {
        orderNumber: "ORD-2026-0453",
        orderSource: "distributor_order" as const,
        distributorName: "مجموعة الراشد العقارية",
        totalDoors: 120,
        qcType: "final" as const,
        result: "pending" as const,
        inspector: "م. فهد الزهراني",
        checkItems: {
          dimensions: true,
          color: true,
          direction: null,
          lockPosition: null,
          defects: false,
          functional: null,
        },
        issues: ["3 أبواب بها خدش طفيف في الحافة", "باب واحد بمقاس مختلف"],
        photos: 24,
        notes: null,
        inspectedAt: now - 1000 * 60 * 60 * 24,
        createdAt: now - 1000 * 60 * 60 * 24,
        updatedAt: now - 1000 * 60 * 60 * 24,
      },
      {
        orderNumber: "ORD-2026-0451",
        orderSource: "door_order" as const,
        distributorName: "شركة الأفق للمقاولات",
        totalDoors: 48,
        qcType: "incoming" as const,
        result: "fail" as const,
        inspector: "م. خالد المطيري",
        checkItems: {
          color: false,
          thickness: true,
          straightness: true,
          defects: true,
        },
        issues: ["دفعة الإطارات لا تطابق المواصفات - اللون مختلف"],
        photos: 12,
        notes: "تم عزل الدفعة - إشعار المورد",
        inspectedAt: now - 1000 * 60 * 60 * 72,
        createdAt: now - 1000 * 60 * 60 * 72,
        updatedAt: now - 1000 * 60 * 60 * 72,
      },
      {
        orderNumber: "ORD-2026-0455",
        orderSource: "distributor_order" as const,
        distributorName: "مؤسسة الإتقان للمقاولات",
        totalDoors: 60,
        qcType: "po_matching" as const,
        result: "pass" as const,
        inspector: "م. أحمد الشمري",
        checkItems: { qtyMatch: true, allItems: true, defects: true },
        issues: [] as string[],
        photos: 6,
        notes: null,
        inspectedAt: now - 1000 * 60 * 60 * 36,
        createdAt: now - 1000 * 60 * 60 * 36,
        updatedAt: now - 1000 * 60 * 60 * 36,
      },
    ];

    for (const s of seeds) {
      await db.insert(schema.qcInspections).values(s as any);
    }
    return { seeded: seeds.length };
  }),
});
