// ============================================================
// production.router.ts — تخطيط الإنتاج
// إدارة خطوط الإنتاج، حساب الطاقة، تقدير مواعيد التسليم
// ============================================================
import { z } from "zod/v4";
import { db, schema } from "./db.js";
import { eq, desc, inArray } from "drizzle-orm";
import { router, adminProcedure } from "./trpc.js";

// ── الخطوط الافتراضية ────────────────────────────────────────
const DEFAULT_LINES = [
  {
    lineId: "door_line",
    nameAr: "خط الأبواب",
    nameEn: "Door Line",
    dailyCapacity: 30,
  },
  {
    lineId: "frame_line",
    nameAr: "خط الإطارات",
    nameEn: "Frame Line",
    dailyCapacity: 40,
  },
  {
    lineId: "accessories",
    nameAr: "قسم الإكسسوارات",
    nameEn: "Accessories",
    dailyCapacity: 60,
  },
  {
    lineId: "qc",
    nameAr: "ضبط الجودة",
    nameEn: "Quality Control",
    dailyCapacity: 50,
  },
  {
    lineId: "packing",
    nameAr: "التغليف",
    nameEn: "Packing",
    dailyCapacity: 35,
  },
] as const;

export const productionRouter = router({
  // ── جلب إعدادات الطاقة لجميع الخطوط ────────────────────────
  getCapacity: adminProcedure.query(async () => {
    const rows = await db.query.productionLines.findMany();
    // إذا لم تُهيَّأ الخطوط بعد، نُعيد القيم الافتراضية
    if (rows.length === 0) {
      return DEFAULT_LINES.map(l => ({
        ...l,
        id: 0,
        workDaysPerWeek: 6,
        shiftHours: 8,
        isActive: true,
        notes: null,
        updatedAt: Date.now(),
      }));
    }
    return rows;
  }),

  // ── تحديث طاقة خط معين ──────────────────────────────────────
  upsertLine: adminProcedure
    .input(
      z.object({
        lineId: z.string().min(1),
        nameAr: z.string().min(1),
        nameEn: z.string().default(""),
        dailyCapacity: z.number().int().min(1).max(999),
        workDaysPerWeek: z.number().int().min(1).max(7).default(6),
        shiftHours: z.number().int().min(1).max(24).default(8),
        isActive: z.boolean().default(true),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const now = Date.now();
      const existing = await db.query.productionLines.findFirst({
        where: eq(schema.productionLines.lineId, input.lineId),
      });
      if (existing) {
        await db
          .update(schema.productionLines)
          .set({ ...input, notes: input.notes ?? null, updatedAt: now })
          .where(eq(schema.productionLines.lineId, input.lineId));
      } else {
        await db.insert(schema.productionLines).values({
          ...input,
          notes: input.notes ?? null,
          updatedAt: now,
        });
      }
      return { success: true };
    }),

  // ── حساب موعد التسليم المتوقع ────────────────────────────────
  // الأداة الرئيسية: بناءً على عدد الأبواب والأولوية والطاقة المتاحة
  estimateDelivery: adminProcedure
    .input(
      z.object({
        totalDoors: z.number().int().min(1),
        priority: z.enum(["normal", "urgent", "vip"]).default("normal"),
        startDate: z.string().optional(), // YYYY-MM-DD، الافتراضي اليوم
      })
    )
    .query(async ({ input }) => {
      // جلب الطاقة من DB (أو الافتراضية)
      const lines = await db.query.productionLines.findMany();
      const getCapacity = (lineId: string): number => {
        const row = lines.find(l => l.lineId === lineId);
        if (row) return row.isActive ? row.dailyCapacity : 0;
        const def = DEFAULT_LINES.find(l => l.lineId === lineId);
        return def ? def.dailyCapacity : 20;
      };

      // جلب الأوامر النشطة لحساب الحمل الحالي
      const activeOrders = await db.query.workOrders.findMany();
      const inProgressOrders = activeOrders.filter(
        o => o.status === "in_progress" || o.status === "issued"
      );

      // الحمل الحالي لكل خط (عدد الأبواب المجدولة)
      const lineLoad: Record<string, number> = {};
      for (const wo of inProgressOrders) {
        const tasks = Array.isArray(wo.deptTasks)
          ? (wo.deptTasks as any[])
          : [];
        for (const t of tasks) {
          if (t.deptId) {
            lineLoad[t.deptId] =
              (lineLoad[t.deptId] ?? 0) + (t.quantity - t.completedQty);
          }
        }
      }

      // معامل الأولوية
      const priorityFactor =
        input.priority === "vip"
          ? 1.5
          : input.priority === "urgent"
            ? 1.25
            : 1.0;

      // حساب الأيام اللازمة لكل خط مع مراعاة الحمل الحالي
      const stages = [
        "door_line",
        "frame_line",
        "accessories",
        "qc",
        "packing",
      ];
      const bottlenecks: {
        lineId: string;
        nameAr: string;
        daysNeeded: number;
      }[] = [];

      for (const lineId of stages) {
        const cap = getCapacity(lineId) * priorityFactor;
        if (cap <= 0) continue;
        const currentLoad = lineLoad[lineId] ?? 0;
        const totalUnits = currentLoad + input.totalDoors;
        const daysNeeded = Math.ceil(totalUnits / cap);
        const lineMeta = DEFAULT_LINES.find(l => l.lineId === lineId);
        bottlenecks.push({
          lineId,
          nameAr: lineMeta?.nameAr ?? lineId,
          daysNeeded,
        });
      }

      // الخط الأبطأ هو المحدد
      const maxDays = Math.max(...bottlenecks.map(b => b.daysNeeded), 1);
      const bottleneck = bottlenecks.find(b => b.daysNeeded === maxDays);

      // حساب تاريخ التسليم مع تجاوز أيام الجمعة
      const start = input.startDate ? new Date(input.startDate) : new Date();
      let workDays = 0;
      const cursor = new Date(start);
      while (workDays < maxDays) {
        cursor.setDate(cursor.getDate() + 1);
        if (cursor.getDay() !== 5) workDays++; // تجاوز يوم الجمعة
      }

      return {
        totalDoors: input.totalDoors,
        priority: input.priority,
        estimatedWorkDays: maxDays,
        estimatedDeliveryDate: cursor.toISOString().split("T")[0],
        bottleneck: bottleneck ?? null,
        lineBreakdown: bottlenecks,
      };
    }),

  // ── بيانات مخطط غانت ──────────────────────────────────────
  ganttData: adminProcedure.query(async () => {
    const orders = await db.query.workOrders.findMany({
      orderBy: [desc(schema.workOrders.issuedAt)],
    });

    // نُعيد آخر 30 أمر وما هو في_تنفيذ/صادر/مسودة
    const relevant = orders
      .filter(o => o.status !== "cancelled" && o.status !== "completed")
      .slice(0, 30);

    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() - 14);
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 60);

    return {
      orders: relevant.map(o => ({
        id: o.id,
        woNumber: o.woNumber,
        distributorName: o.distributorName,
        startDate: o.startDate,
        dueDate: o.dueDate,
        status: o.status,
        priority: o.priority,
        progressPercent: o.progressPercent,
        totalDoors: o.totalDoors,
        deptTasks: o.deptTasks,
      })),
      chartRange: {
        from: minDate.toISOString().split("T")[0],
        to: maxDate.toISOString().split("T")[0],
      },
    };
  }),

  // ── ملخص الإنتاج (KPIs) ─────────────────────────────────────
  summary: adminProcedure.query(async () => {
    const orders = await db.query.workOrders.findMany();
    const active = orders.filter(o => o.status === "in_progress");
    const issued = orders.filter(o => o.status === "issued");
    const onHold = orders.filter(o => o.status === "on_hold");
    const completed = orders.filter(o => o.status === "completed");
    const overdue = orders.filter(o => {
      if (o.status === "completed" || o.status === "cancelled") return false;
      return new Date(o.dueDate) < new Date();
    });

    const totalDoorsInProduction = active.reduce((s, o) => s + o.totalDoors, 0);
    const avgProgress =
      active.length > 0
        ? Math.round(
            active.reduce((s, o) => s + o.progressPercent, 0) / active.length
          )
        : 0;

    // توزيع الحمل على خطوط الإنتاج
    const lineLoad: Record<string, number> = {};
    for (const o of active) {
      const tasks = Array.isArray(o.deptTasks) ? (o.deptTasks as any[]) : [];
      for (const t of tasks) {
        if (t.deptId && t.status !== "completed") {
          lineLoad[t.deptId] =
            (lineLoad[t.deptId] ?? 0) + (t.quantity - (t.completedQty ?? 0));
        }
      }
    }

    return {
      activeOrders: active.length,
      issuedOrders: issued.length,
      onHoldOrders: onHold.length,
      completedOrders: completed.length,
      overdueOrders: overdue.length,
      totalDoorsInProduction,
      avgProgress,
      lineLoad,
    };
  }),
});
