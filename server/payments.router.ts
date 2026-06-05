// ============================================================
// Payments Router — تسجيل وعرض دفعات الموزّعين
// ============================================================
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { db, schema } from "./db.js";
import { eq, desc, and } from "drizzle-orm";
import { router, adminProcedure, distributorProcedure } from "./trpc.js";

const paymentMethodEnum = z.enum([
  "cash",
  "bank_transfer",
  "cheque",
  "card",
  "other",
]);

const paymentStatusEnum = z.enum(["confirmed", "pending", "cancelled"]);

// يشتقّ حالة دفع الطلب من مجموع دفعاته المؤكّدة ويحدّثها.
// يُستدعى بعد أي إنشاء/تعديل دفعة مرتبطة بـ orderNumber.
async function recomputeOrderPaymentStatus(orderNumber: string) {
  const order = await db.query.distributorOrders.findFirst({
    where: eq(schema.distributorOrders.orderNumber, orderNumber),
  });
  if (!order) return;

  const payments = await db.query.distributorPayments.findMany({
    where: and(
      eq(schema.distributorPayments.orderNumber, orderNumber),
      eq(schema.distributorPayments.status, "confirmed"),
    ),
  });

  const totalPaid = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
  const orderTotal = order.totalAmount ?? 0;

  let newStatus: "unpaid" | "partial" | "paid";
  if (totalPaid <= 0) newStatus = "unpaid";
  else if (totalPaid < orderTotal) newStatus = "partial";
  else newStatus = "paid";

  await db
    .update(schema.distributorOrders)
    .set({ paymentStatus: newStatus })
    .where(eq(schema.distributorOrders.orderNumber, orderNumber));
}

export const paymentsRouter = router({
  // ── List payments (Admin) ────────────────────────────────
  list: adminProcedure
    .input(z.object({ distributorId: z.number().int() }))
    .query(async ({ input }) => {
      return db.query.distributorPayments.findMany({
        where: eq(schema.distributorPayments.distributorId, input.distributorId),
        orderBy: [desc(schema.distributorPayments.paymentDate)],
      });
    }),

  // ── Create payment (Admin) ───────────────────────────────
  create: adminProcedure
    .input(
      z.object({
        distributorId: z.number().int(),
        orderNumber: z.string().min(1).optional(),
        amount: z.number().nonnegative(),
        method: paymentMethodEnum.default("bank_transfer"),
        reference: z.string().optional(),
        note: z.string().optional(),
        paymentDate: z.string().optional(), // ISO date string
        status: paymentStatusEnum.default("confirmed"),
      }),
    )
    .mutation(async ({ input }) => {
      const [inserted] = await db
        .insert(schema.distributorPayments)
        .values({
          distributorId: input.distributorId,
          orderNumber: input.orderNumber ?? null,
          amount: input.amount,
          method: input.method,
          reference: input.reference ?? null,
          note: input.note ?? null,
          paymentDate: input.paymentDate
            ? new Date(input.paymentDate)
            : new Date(),
          status: input.status,
        })
        .$returningId();

      // اشتقاق حالة دفع الطلب إن كانت الدفعة مرتبطة بطلب
      if (input.orderNumber) {
        await recomputeOrderPaymentStatus(input.orderNumber);
      }

      return { success: true, id: inserted.id };
    }),

  // ── My payments (Distributor, read-only) ─────────────────
  myPayments: distributorProcedure.query(async ({ ctx }) => {
    return db.query.distributorPayments.findMany({
      where: eq(schema.distributorPayments.distributorId, ctx.distributor.id),
      orderBy: [desc(schema.distributorPayments.paymentDate)],
    });
  }),
});
