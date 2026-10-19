import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import {
  BomDomainError,
  MAX_BOM_QUANTITY,
  conflictFromDatabaseError,
  isDeadlockError,
  createDraftBomRuleSet,
  createNextBomRuleVersion,
  createOrderBomSnapshot,
  publishBomRuleSet,
  setDraftBomRules,
  updateDraftBomRuleSet,
  type BomRuleDraft,
  type BomTx,
} from "./bom-rules.js";
import { db } from "./db.js";
import { requireStaffRole, router } from "./trpc.js";

const lineageCode = z.string().trim().min(1).max(64);
const ruleName = z.string().trim().min(1).max(255);
const productId = z.string().trim().min(1).max(100).nullable();
const configKey = z
  .string()
  .regex(/^(?!__)[A-Za-z][A-Za-z0-9_]{0,63}$/);
const quantity = z.number().int().positive().max(MAX_BOM_QUANTITY);

const wasteFields = {
  enabled: z.boolean().default(true),
  wasteNumerator: z.number().int().min(0).max(MAX_BOM_QUANTITY).default(0),
  wasteDenominator: z.number().int().positive().max(1_000_000).default(1),
};

const ruleInput = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("fixed_per_order"),
      inventoryItemId: z.number().int().positive(),
      quantity,
      ...wasteFields,
    })
    .strict(),
  z
    .object({
      kind: z.literal("fixed_per_door"),
      inventoryItemId: z.number().int().positive(),
      quantity,
      ...wasteFields,
    })
    .strict(),
  z
    .object({
      kind: z.literal("linear_dimension"),
      inventoryItemId: z.number().int().positive(),
      quantity,
      dimensionKey: configKey,
      ...wasteFields,
    })
    .strict(),
  z
    .object({
      kind: z.literal("area_dimensions"),
      inventoryItemId: z.number().int().positive(),
      quantity,
      dimensionKey: configKey,
      secondaryDimensionKey: configKey,
      ...wasteFields,
    })
    .strict(),
  z
    .object({
      kind: z.literal("when_selection"),
      inventoryItemId: z.number().int().positive(),
      quantity,
      selectionKey: configKey,
      selectionValue: z.string().min(1).max(255),
      appliesPer: z.enum(["order", "door"]),
      ...wasteFields,
    })
    .strict(),
]);

function toDraft(rule: z.infer<typeof ruleInput>): BomRuleDraft {
  return {
    inventoryItemId: rule.inventoryItemId,
    enabled: rule.enabled,
    kind: rule.kind,
    quantity: rule.quantity,
    dimensionKey: "dimensionKey" in rule ? rule.dimensionKey : null,
    secondaryDimensionKey: "secondaryDimensionKey" in rule ? rule.secondaryDimensionKey : null,
    selectionKey: "selectionKey" in rule ? rule.selectionKey : null,
    selectionValue: "selectionValue" in rule ? rule.selectionValue : null,
    appliesPer: "appliesPer" in rule ? rule.appliesPer : null,
    wasteNumerator: rule.wasteNumerator,
    wasteDenominator: rule.wasteDenominator,
  };
}

function rethrow(error: unknown): never {
  if (error instanceof BomDomainError) {
    throw new TRPCError({ code: error.code, message: error.message });
  }
  const conflict = conflictFromDatabaseError(error);
  if (conflict) {
    throw new TRPCError({ code: conflict.code, message: conflict.message });
  }
  throw error;
}

async function runBom<T>(work: (tx: BomTx) => Promise<T>): Promise<T> {
  try {
    return await db.transaction((tx) => work(tx));
  } catch (error) {
    if (!isDeadlockError(error)) rethrow(error);
  }
  try {
    return await db.transaction((tx) => work(tx));
  } catch (error) {
    rethrow(error);
  }
}

const adminStaff = requireStaffRole("admin");
const productionManager = requireStaffRole("production_manager");

export const bomRulesRouter = router({
  createDraft: adminStaff
    .input(
      z
        .object({
          lineageCode,
          name: ruleName,
          productId: productId.optional(),
        })
        .strict()
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await runBom((tx) =>
          createDraftBomRuleSet(
            tx,
            {
              lineageCode: input.lineageCode,
              name: input.name,
              productId: input.productId ?? null,
            },
            ctx.staff.userId
          )
        );
      } catch (error) {
        rethrow(error);
      }
    }),

  updateDraft: adminStaff
    .input(
      z
        .object({
          ruleSetId: z.number().int().positive(),
          name: ruleName,
        })
        .strict()
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await runBom((tx) =>
          updateDraftBomRuleSet(tx, input.ruleSetId, { name: input.name }, ctx.staff.userId)
        );
      } catch (error) {
        rethrow(error);
      }
    }),

  setRules: adminStaff
    .input(
      z
        .object({
          ruleSetId: z.number().int().positive(),
          rules: z.array(ruleInput).min(1).max(200),
        })
        .strict()
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await runBom((tx) =>
          setDraftBomRules(tx, input.ruleSetId, input.rules.map(toDraft), ctx.staff.userId)
        );
      } catch (error) {
        rethrow(error);
      }
    }),

  publish: adminStaff
    .input(z.object({ ruleSetId: z.number().int().positive() }).strict())
    .mutation(async ({ input, ctx }) => {
      try {
        return await runBom((tx) =>
          publishBomRuleSet(tx, input.ruleSetId, ctx.staff.userId)
        );
      } catch (error) {
        rethrow(error);
      }
    }),

  createNextVersion: adminStaff
    .input(z.object({ ruleSetId: z.number().int().positive() }).strict())
    .mutation(async ({ input, ctx }) => {
      try {
        return await runBom((tx) =>
          createNextBomRuleVersion(tx, input.ruleSetId, ctx.staff.userId)
        );
      } catch (error) {
        rethrow(error);
      }
    }),

  /**
   * Production Manager starts snapshot creation.
   * The client may send only the order id. Quantities, configuration,
   * rule version, and the actor come from the server.
   */
  createOrderSnapshot: productionManager
    .input(z.object({ orderId: z.number().int().positive() }).strict())
    .mutation(async ({ input, ctx }) => {
      try {
        return await runBom((tx) =>
          createOrderBomSnapshot(tx, input.orderId, ctx.staff.userId)
        );
      } catch (error) {
        rethrow(error);
      }
    }),
});
