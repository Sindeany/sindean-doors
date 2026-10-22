import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import {
  AdvancePaymentError,
  coercePositiveMinor,
  publishAdvancePolicy,
  readAdvanceEligibility,
  recordConfirmedPayment,
  setOrderAcceptedTotal,
} from "./advance-payment.js";
import { db } from "./db.js";
import { requireAnyStaffRole, requireStaffRole, router } from "./trpc.js";

const orderId = z.number().int().positive();

const positiveMinor = z.unknown().transform((value, ctx) => {
  try {
    return coercePositiveMinor(value);
  } catch (error) {
    ctx.addIssue({
      code: "custom",
      message: error instanceof Error ? error.message : "المبلغ غير صالح",
    });
    return z.NEVER;
  }
});

function rethrow(error: unknown): never {
  if (error instanceof AdvancePaymentError) {
    throw new TRPCError({ code: error.code, message: error.message });
  }
  throw error;
}

export const advanceRouter = router({
  publishPolicy: requireStaffRole("admin")
    .input(z.object({ requiredAdvanceBps: z.number().int().min(0).max(10000) }).strict())
    .mutation(async ({ input, ctx }) => {
      try {
        return await publishAdvancePolicy(ctx.staff.userId, input.requiredAdvanceBps);
      } catch (error) {
        rethrow(error);
      }
    }),

  setAcceptedTotal: requireStaffRole("sales_coordinator")
    .input(z.object({ orderId, acceptedTotalMinor: positiveMinor }).strict())
    .mutation(async ({ input, ctx }) => {
      try {
        return await setOrderAcceptedTotal(
          ctx.staff.userId,
          input.orderId,
          input.acceptedTotalMinor
        );
      } catch (error) {
        rethrow(error);
      }
    }),

  recordPayment: requireStaffRole("sales_coordinator")
    .input(
      z
        .object({
          orderId,
          amountMinor: positiveMinor,
          reference: z.string().max(128).nullable().optional(),
        })
        .strict()
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await recordConfirmedPayment(
          ctx.staff.userId,
          input.orderId,
          input.amountMinor,
          input.reference
        );
      } catch (error) {
        rethrow(error);
      }
    }),

  eligibility: requireAnyStaffRole(["admin", "sales_coordinator"])
    .input(z.object({ orderId }).strict())
    .query(async ({ input }) => {
      try {
        return await readAdvanceEligibility(db, input.orderId);
      } catch (error) {
        rethrow(error);
      }
    }),
});
