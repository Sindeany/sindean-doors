import { z } from "zod/v4";
import { db, schema } from "./db.js";
import { eq, desc } from "drizzle-orm";
import { router, adminProcedure } from "./trpc.js";

const woStatusEnum = z.enum([
  "draft",
  "issued",
  "in_progress",
  "completed",
  "on_hold",
  "cancelled",
]);
const woPriorityEnum = z.enum(["normal", "urgent", "vip"]);

export const workOrdersRouter = router({
  // ── جلب كل أوامر التشغيل ──────────────────────────────────
  list: adminProcedure.query(async () => {
    return db.query.workOrders.findMany({
      orderBy: [desc(schema.workOrders.createdAt)],
    });
  }),

  // ── إنشاء أمر تشغيل جديد ────────────────────────────────
  create: adminProcedure
    .input(
      z.object({
        woNumber: z.string().min(1),
        poNumber: z.string().min(1),
        distributorName: z.string().min(1),
        distributorPhone: z.string().default(""),
        issuedAt: z.number(),
        startDate: z.string(),
        dueDate: z.string(),
        status: woStatusEnum,
        priority: woPriorityEnum,
        orderType: z.enum(["standard", "custom"]),
        totalDoors: z.number().int().min(1),
        totalValue: z.number().min(0),
        doors: z.any(),
        deptTasks: z.any(),
        supervisorName: z.string().default(""),
        notes: z.string().optional(),
        progressPercent: z.number().int().min(0).max(100).default(0),
      })
    )
    .mutation(async ({ input }) => {
      const now = Date.now();
      await db.insert(schema.workOrders).values({
        woNumber: input.woNumber,
        poNumber: input.poNumber,
        distributorName: input.distributorName,
        distributorPhone: input.distributorPhone,
        issuedAt: input.issuedAt,
        startDate: input.startDate,
        dueDate: input.dueDate,
        status: input.status,
        priority: input.priority,
        orderType: input.orderType,
        totalDoors: input.totalDoors,
        totalValue: input.totalValue,
        doors: input.doors,
        deptTasks: input.deptTasks,
        supervisorName: input.supervisorName,
        notes: input.notes ?? null,
        progressPercent: input.progressPercent,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true };
    }),

  // ── تحديث تقدم الأقسام ───────────────────────────────────
  updateProgress: adminProcedure
    .input(
      z.object({
        id: z.number(),
        deptTasks: z.any(),
        progressPercent: z.number().int().min(0).max(100),
        status: woStatusEnum,
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(schema.workOrders)
        .set({
          deptTasks: input.deptTasks,
          progressPercent: input.progressPercent,
          status: input.status,
          updatedAt: Date.now(),
        })
        .where(eq(schema.workOrders.id, input.id));
      return { success: true };
    }),

  // ── تحديث الحالة فقط ─────────────────────────────────────
  updateStatus: adminProcedure
    .input(z.object({ id: z.number(), status: woStatusEnum }))
    .mutation(async ({ input }) => {
      await db
        .update(schema.workOrders)
        .set({ status: input.status, updatedAt: Date.now() })
        .where(eq(schema.workOrders.id, input.id));
      return { success: true };
    }),

  // ── بيانات تجريبية ───────────────────────────────────────
  seed: adminProcedure.mutation(async () => {
    const now = Date.now();
    const d = (days: number) =>
      new Date(now + days * 86_400_000).toISOString().split("T")[0];

    const makeTasks = (
      qty: number,
      status: string,
      pct: number,
      start: string,
      due: string
    ) =>
      ["door_line", "frame_line", "accessories", "qc", "packing"].map(
        deptId => ({
          deptId,
          quantity: qty,
          unit:
            deptId === "frame_line"
              ? "إطار"
              : deptId === "accessories"
                ? "طقم"
                : "باب",
          specs: "حسب الطلب",
          assignedTo:
            deptId === "qc"
              ? "م. سارة"
              : deptId === "packing"
                ? "فريق التغليف"
                : "فريق خط A",
          startDate: start,
          dueDate: due,
          status,
          completedQty: Math.round((qty * pct) / 100),
          notes: "",
        })
      );

    await db.insert(schema.workOrders).values([
      {
        woNumber: "WO-2026-0001",
        poNumber: "SND-0453",
        distributorName: "مجموعة الراشد العقارية",
        distributorPhone: "0501234567",
        issuedAt: now - 8 * 86_400_000,
        startDate: d(-8),
        dueDate: d(6),
        status: "in_progress",
        priority: "urgent",
        orderType: "standard",
        totalDoors: 120,
        totalValue: 216000,
        doors: [],
        deptTasks: makeTasks(120, "in_progress", 60, d(-8), d(6)),
        supervisorName: "م. خالد العتيبي",
        notes: "أولوية قصوى - مشروع سكني",
        progressPercent: 60,
        createdAt: now - 8 * 86_400_000,
        updatedAt: now - 1 * 86_400_000,
      },
      {
        woNumber: "WO-2026-0002",
        poNumber: "SND-0455",
        distributorName: "مؤسسة الإتقان للمقاولات",
        distributorPhone: "0507654321",
        issuedAt: now - 5 * 86_400_000,
        startDate: d(-5),
        dueDate: d(9),
        status: "issued",
        priority: "normal",
        orderType: "standard",
        totalDoors: 60,
        totalValue: 108000,
        doors: [],
        deptTasks: makeTasks(60, "issued", 0, d(-5), d(9)),
        supervisorName: "م. سعد الغامدي",
        notes: "",
        progressPercent: 0,
        createdAt: now - 5 * 86_400_000,
        updatedAt: now - 5 * 86_400_000,
      },
      {
        woNumber: "WO-2026-0003",
        poNumber: "SND-0449",
        distributorName: "شركة الديار للتطوير",
        distributorPhone: "0551112233",
        issuedAt: now - 18 * 86_400_000,
        startDate: d(-18),
        dueDate: d(-4),
        status: "completed",
        priority: "vip",
        orderType: "custom",
        totalDoors: 80,
        totalValue: 180000,
        doors: [],
        deptTasks: makeTasks(80, "completed", 100, d(-18), d(-4)),
        supervisorName: "م. فهد الحربي",
        notes: "تصميم مخصص VIP",
        progressPercent: 100,
        createdAt: now - 18 * 86_400_000,
        updatedAt: now - 4 * 86_400_000,
      },
    ]);
    return { success: true };
  }),
});
