import { z } from "zod/v4";
import { db, schema } from "./db.js";
import { eq, desc } from "drizzle-orm";
import { router, adminProcedure } from "./trpc.js";

export const packingRouter = router({
  // ── جلب كل طلبات التغليف ─────────────────────────────────────
  list: adminProcedure.query(async () => {
    const rows = await db.query.packingOrders.findMany({
      orderBy: [desc(schema.packingOrders.createdAt)],
    });
    return rows;
  }),

  // ── تحديث مرحلة (تغليف / تسليم / محاسبة) ────────────────────
  updateStage: adminProcedure
    .input(
      z.object({
        id: z.number(),
        stage: z.enum(["packing", "delivery", "accounting"]),
        status: z.enum(["pending", "in_progress", "done"]),
      })
    )
    .mutation(async ({ input }) => {
      const now = Date.now();
      if (input.stage === "packing") {
        await db
          .update(schema.packingOrders)
          .set({ packingStatus: input.status, updatedAt: now })
          .where(eq(schema.packingOrders.id, input.id));
      } else if (input.stage === "delivery") {
        await db
          .update(schema.packingOrders)
          .set({ deliveryStatus: input.status, updatedAt: now })
          .where(eq(schema.packingOrders.id, input.id));
      } else {
        await db
          .update(schema.packingOrders)
          .set({ accountingStatus: input.status, updatedAt: now })
          .where(eq(schema.packingOrders.id, input.id));
      }
      return { success: true };
    }),

  // ── إقفال الحساب (تسجيل الدفعة الكاملة) ─────────────────────
  closeAccounting: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [order] = await db.query.packingOrders.findMany({
        where: eq(schema.packingOrders.id, input.id),
        limit: 1,
      });
      if (!order) throw new Error("Packing order not found");
      await db
        .update(schema.packingOrders)
        .set({
          paidAmount: order.totalValue,
          accountingStatus: "done",
          updatedAt: Date.now(),
        })
        .where(eq(schema.packingOrders.id, input.id));
      return { success: true };
    }),

  // ── بيانات تجريبية ───────────────────────────────────────────
  seed: adminProcedure.mutation(async () => {
    const now = Date.now();
    await db.insert(schema.packingOrders).values([
      {
        orderNumber: "ORD-2026-0453",
        distributorName: "مجموعة الراشد العقارية",
        totalDoors: 120,
        packingType: "محلي",
        packingMethod: "فردي",
        packingStatus: "in_progress",
        deliveryDate: "2026-05-25",
        deliveryStatus: "pending",
        accountingStatus: "pending",
        totalValue: 216000,
        paidAmount: 108000,
        doors: [
          {
            code: "DR-001",
            dir: "يمين",
            room: "غرفة رئيسية - دور 1",
            packed: true,
          },
          {
            code: "DR-002",
            dir: "يسار",
            room: "غرفة نوم - دور 1",
            packed: true,
          },
          { code: "DR-003", dir: "يمين", room: "حمام - دور 1", packed: false },
        ],
        documents: {
          packingList: true,
          invoice: true,
          photos: 12,
          certificate: false,
        },
        createdAt: now - 3 * 86_400_000,
        updatedAt: now - 3 * 86_400_000,
      },
      {
        orderNumber: "ORD-2026-0455",
        distributorName: "مؤسسة الإتقان للمقاولات",
        totalDoors: 60,
        packingType: "محلي",
        packingMethod: "جماعي",
        packingStatus: "done",
        deliveryDate: "2026-05-22",
        deliveryStatus: "in_progress",
        accountingStatus: "pending",
        totalValue: 108000,
        paidAmount: 54000,
        doors: [],
        documents: {
          packingList: true,
          invoice: true,
          photos: 18,
          certificate: true,
        },
        createdAt: now - 5 * 86_400_000,
        updatedAt: now - 2 * 86_400_000,
      },
      {
        orderNumber: "ORD-2026-0457",
        distributorName: "مجموعة الأمل العقارية",
        totalDoors: 80,
        packingType: "تصدير",
        packingMethod: "فردي",
        packingStatus: "done",
        deliveryDate: "2026-05-20",
        deliveryStatus: "done",
        accountingStatus: "in_progress",
        totalValue: 144000,
        paidAmount: 144000,
        doors: [],
        documents: {
          packingList: true,
          invoice: true,
          photos: 24,
          certificate: true,
        },
        createdAt: now - 7 * 86_400_000,
        updatedAt: now - 1 * 86_400_000,
      },
    ]);
    return { success: true };
  }),
});
