import { z } from "zod/v4";
import { db, schema } from "./db.js";
import { eq, desc } from "drizzle-orm";
import { router, adminProcedure } from "./trpc.js";

const DEFAULT_SCHEDULE = {
  sendTime: "20:00",
  activeDays: ["sun", "mon", "tue", "wed", "thu"],
  enabledSections: ["orders", "decisions", "production", "complaints"],
};

export const dailySummaryRouter = router({
  // ─── Recipients ──────────────────────────────────────────────────────────────
  getRecipients: adminProcedure.query(async () => {
    return db.query.summaryRecipients.findMany({
      orderBy: [desc(schema.summaryRecipients.createdAt)],
    });
  }),

  addRecipient: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        role: z.string().default(""),
        phone: z.string().default(""),
        email: z.string().default(""),
        channels: z.array(z.enum(["whatsapp", "email"])),
      })
    )
    .mutation(async ({ input }) => {
      const now = Date.now();
      await db.insert(schema.summaryRecipients).values({
        name: input.name,
        role: input.role,
        phone: input.phone,
        email: input.email,
        channels: input.channels,
        active: true,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true };
    }),

  toggleRecipient: adminProcedure
    .input(z.object({ id: z.number().int(), active: z.boolean() }))
    .mutation(async ({ input }) => {
      await db
        .update(schema.summaryRecipients)
        .set({ active: input.active, updatedAt: Date.now() })
        .where(eq(schema.summaryRecipients.id, input.id));
      return { success: true };
    }),

  deleteRecipient: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db
        .delete(schema.summaryRecipients)
        .where(eq(schema.summaryRecipients.id, input.id));
      return { success: true };
    }),

  // ─── Schedule ─────────────────────────────────────────────────────────────────
  getSchedule: adminProcedure.query(async () => {
    const row = await db.query.summarySchedule.findFirst();
    if (!row) return DEFAULT_SCHEDULE;
    return {
      sendTime: row.sendTime,
      activeDays: Array.isArray(row.activeDays)
        ? (row.activeDays as string[])
        : DEFAULT_SCHEDULE.activeDays,
      enabledSections: Array.isArray(row.enabledSections)
        ? (row.enabledSections as string[])
        : DEFAULT_SCHEDULE.enabledSections,
    };
  }),

  saveSchedule: adminProcedure
    .input(
      z.object({
        sendTime: z.string().regex(/^\d{2}:\d{2}$/),
        activeDays: z.array(z.string()),
        enabledSections: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      const now = Date.now();
      const existing = await db.query.summarySchedule.findFirst();
      if (existing) {
        await db
          .update(schema.summarySchedule)
          .set({
            sendTime: input.sendTime,
            activeDays: input.activeDays,
            enabledSections: input.enabledSections,
            updatedAt: now,
          })
          .where(eq(schema.summarySchedule.id, existing.id));
      } else {
        await db.insert(schema.summarySchedule).values({
          sendTime: input.sendTime,
          activeDays: input.activeDays,
          enabledSections: input.enabledSections,
          updatedAt: now,
        });
      }
      return { success: true };
    }),

  // ─── Send History ─────────────────────────────────────────────────────────────
  getHistory: adminProcedure.query(async () => {
    return db.query.summarySendHistory.findMany({
      orderBy: [desc(schema.summarySendHistory.sentAt)],
      limit: 10,
    });
  }),

  recordSend: adminProcedure
    .input(
      z.object({
        recipientsCount: z.number().int(),
        channels: z.string(),
        status: z.enum(["success", "partial", "skipped", "failed"]),
        snapshotStats: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const now = Date.now();
      await db.insert(schema.summarySendHistory).values({
        sentAt: now,
        recipientsCount: input.recipientsCount,
        channels: input.channels,
        status: input.status,
        snapshotStats: input.snapshotStats ?? null,
        createdAt: now,
      });
      return { success: true };
    }),

  // ─── Today's Stats ─────────────────────────────────────────────────────────────
  getTodayStats: adminProcedure.query(async () => {
    // Start of today in Riyadh time (UTC+3)
    const now = Date.now();
    const riyadhDate = new Date(now + 3 * 3600_000);
    const todayStr = riyadhDate.toISOString().slice(0, 10); // "YYYY-MM-DD"
    const todayStartMs = new Date(todayStr + "T00:00:00+03:00").getTime();

    const [
      doorOrderRows,
      decisionRows,
      workOrderRows,
      complaintRows,
      distOrderRows,
    ] = await Promise.all([
      db.query.doorOrders.findMany({
        columns: { status: true, totalPrice: true, createdAt: true },
      }),
      db.query.decisionLog.findMany({
        columns: { decision: true, responseTime: true, createdAt: true },
      }),
      db.query.workOrders.findMany({
        columns: { status: true, progressPercent: true },
      }),
      db.query.complaints.findMany({
        columns: { status: true, resolvedAt: true, createdAt: true },
      }),
      db.query.distributorOrders.findMany({
        columns: { totalAmount: true, createdAt: true },
      }),
    ]);

    const todayDoorOrders = doorOrderRows.filter(
      o => o.createdAt >= todayStartMs
    );
    const newOrders = todayDoorOrders.filter(o => o.status === "new").length;
    const pendingOrders = doorOrderRows.filter(
      o => o.status === "new" || o.status === "reviewing"
    ).length;

    const todayDecisions = decisionRows.filter(
      d => d.createdAt >= todayStartMs
    );
    const approvedOrders = todayDecisions.filter(
      d => d.decision === "approved"
    ).length;
    const rejectedOrders = todayDecisions.filter(
      d => d.decision === "rejected"
    ).length;
    const totalDecisions = todayDecisions.length;
    const avgResponseMin =
      totalDecisions > 0
        ? Math.round(
            todayDecisions.reduce((s, d) => s + d.responseTime, 0) /
              totalDecisions
          )
        : 0;

    const inProgressWorkOrders = workOrderRows.filter(
      w => w.status === "in_progress"
    );
    const activeStages = inProgressWorkOrders.length;
    const productionRate =
      inProgressWorkOrders.length > 0
        ? Math.round(
            inProgressWorkOrders.reduce((s, w) => s + w.progressPercent, 0) /
              inProgressWorkOrders.length
          )
        : workOrderRows.length > 0
          ? Math.round(
              workOrderRows.reduce((s, w) => s + w.progressPercent, 0) /
                workOrderRows.length
            )
          : 0;

    const openComplaints = complaintRows.filter(
      c => c.status === "open" || c.status === "under_review"
    ).length;
    const resolvedComplaints = complaintRows.filter(
      c => c.resolvedAt != null && c.resolvedAt >= todayStartMs
    ).length;

    const dailyRevenue = Math.round(
      distOrderRows
        .filter(o => o.createdAt >= todayStartMs)
        .reduce((s, o) => s + (o.totalAmount ?? 0), 0)
    );

    return {
      newOrders,
      approvedOrders,
      rejectedOrders,
      pendingOrders,
      totalDecisions,
      avgResponseMin,
      productionRate,
      activeStages,
      openComplaints,
      resolvedComplaints,
      dailyRevenue,
    };
  }),
});
