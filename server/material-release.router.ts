import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { MaterialReleaseError, materialReleaseStatus, releaseMaterials } from "./material-release.js";
import { requireAnyStaffRole, requireStaffRole, router } from "./trpc.js";

const orderId = z.number().int().positive();
const idempotencyKey = z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/);

function rethrow(error: unknown): never {
  if (error instanceof MaterialReleaseError) {
    throw new TRPCError({ code: error.code, message: error.message });
  }
  throw error;
}

export const materialReleaseRouter = router({
  release: requireStaffRole("stock_manager")
    .input(z.object({ orderId, idempotencyKey }).strict())
    .mutation(async ({ input, ctx }) => {
      try {
        return await releaseMaterials(ctx.staff, input.orderId, input.idempotencyKey);
      } catch (error) {
        rethrow(error);
      }
    }),

  status: requireAnyStaffRole(["admin", "stock_manager", "production_manager", "sales_coordinator"])
    .input(z.object({ orderId }).strict())
    .query(async ({ input }) => {
      try {
        return await materialReleaseStatus(input.orderId);
      } catch (error) {
        rethrow(error);
      }
    }),
});
