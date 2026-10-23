import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { ReservationError, overrideReservationPriority, reservationStatus, reserveOrder } from "./reservation.js";
import { requireAnyStaffRole, requireStaffRole, router } from "./trpc.js";

const orderId = z.number().int().positive();

function rethrow(error: unknown): never {
  if (error instanceof ReservationError) {
    throw new TRPCError({ code: error.code, message: error.message });
  }
  throw error;
}

export const reservationRouter = router({
  reserve: requireStaffRole("stock_manager")
    .input(z.object({ orderId }).strict())
    .mutation(async ({ input, ctx }) => {
      try {
        return await reserveOrder(ctx.staff.userId, input.orderId);
      } catch (error) {
        rethrow(error);
      }
    }),

  status: requireAnyStaffRole(["admin", "stock_manager", "production_manager", "sales_coordinator"])
    .input(z.object({ orderId }).strict())
    .query(async ({ input }) => {
      try {
        return await reservationStatus(input.orderId);
      } catch (error) {
        rethrow(error);
      }
    }),

  overridePriority: requireStaffRole("admin")
    .input(z.object({ orderId, priorityAt: z.number().int().positive() }).strict())
    .mutation(async ({ input, ctx }) => {
      try {
        return await overrideReservationPriority(ctx.staff.userId, input.orderId, input.priorityAt);
      } catch (error) {
        rethrow(error);
      }
    }),
});
