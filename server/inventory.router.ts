// ============================================================
// inventory.router.ts - مسارات إدارة المخزون
// ============================================================
import { TRPCError } from "@trpc/server";
import {
  ReservationError,
  reconcileReservationsAfterStocktake,
  withReservationAllocator,
} from "./reservation.js";
import { z } from "zod/v4";
import { db, schema } from "./db.js";
import { eq, desc } from "drizzle-orm";
import { router, adminProcedure, requireStaffRole } from "./trpc.js";

// ─── Zod schemas ─────────────────────────────────────────────
const categoryEnum = z.enum([
  "wpc_board", "film", "edge", "frame", "lock",
  "hinge", "accessory", "packaging", "chemical",
]);

/** Item master metadata — balance is never client-controlled on create/update. */
const itemMetadataInput = z.object({
  code:          z.string().min(1).max(100),
  name:          z.string().min(1).max(255),
  nameEn:        z.string().max(255).optional(),
  category:      categoryEnum,
  unit:          z.string().min(1).max(50),
  minQty:        z.number().int().min(0),
  maxQty:        z.number().int().min(0),
  reorderQty:    z.number().int().min(0),
  unitCost:      z.number().min(0),
  supplier:      z.string().max(255).default(""),
  supplierPhone: z.string().max(50).optional(),
  location:      z.string().max(255).default(""),
  lastReceived:  z.string().max(10).optional(),
  lastConsumed:  z.string().max(10).optional(),
  notes:         z.string().optional(),
});

export const itemCreateInput = itemMetadataInput;
export const itemUpdateInput = itemMetadataInput;

function databaseErrorParts(error: unknown): Array<{ errno: number | null; code: string; sqlState: string }> {
  const found: Array<{ errno: number | null; code: string; sqlState: string }> = [];
  const queue: unknown[] = [error];
  const seen = new Set<unknown>();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    const record = current as { errno?: unknown; code?: unknown; sqlState?: unknown; cause?: unknown };
    found.push({
      errno: typeof record.errno === "number" ? record.errno : null,
      code: typeof record.code === "string" ? record.code : "",
      sqlState: typeof record.sqlState === "string" ? record.sqlState : "",
    });
    if ("cause" in record) queue.push(record.cause);
  }
  return found;
}

function inventoryConstraintError(error: unknown): TRPCError | null {
  if (error instanceof TRPCError || error instanceof ReservationError) return null;
  for (const part of databaseErrorParts(error)) {
    if (
      part.errno === 1644 ||
      part.errno === 3819 ||
      part.sqlState === "45000" ||
      part.code === "ER_SIGNAL_EXCEPTION" ||
      part.code === "ER_CHECK_CONSTRAINT_VIOLATED"
    ) {
      return new TRPCError({
        code: "CONFLICT",
        message: "لا يمكن إنقاص المخزون إلى أقل من الكمية المحجوزة",
      });
    }
    if (
      part.errno === 1205 ||
      part.errno === 1213 ||
      part.code === "ER_LOCK_WAIT_TIMEOUT" ||
      part.code === "ER_LOCK_DEADLOCK"
    ) {
      return new TRPCError({ code: "CONFLICT", message: "تعارض في تحديث المخزون" });
    }
  }
  return null;
}

function rethrowInventoryWrite(error: unknown): never {
  if (error instanceof ReservationError) {
    throw new TRPCError({ code: error.code, message: error.message });
  }
  const constraint = inventoryConstraintError(error);
  if (constraint) throw constraint;
  throw error;
}

const INVENTORY_DELETE_BLOCKED = "لا يمكن حذف مادة مرتبطة بسجلات أخرى";

/**
 * Delete-path mapping stays separate from stock-movement errors.
 * A ledger SIGNAL must not be reported as a reservation shortfall.
 */
function inventoryDeleteError(error: unknown): TRPCError | null {
  if (error instanceof TRPCError) return error;
  for (const part of databaseErrorParts(error)) {
    if (
      part.errno === 1451 ||
      part.errno === 1217 ||
      part.code === "ER_ROW_IS_REFERENCED_2" ||
      part.code === "ER_ROW_IS_REFERENCED"
    ) {
      return new TRPCError({ code: "CONFLICT", message: INVENTORY_DELETE_BLOCKED });
    }
    if (
      part.errno === 1644 ||
      part.sqlState === "45000" ||
      part.code === "ER_SIGNAL_EXCEPTION"
    ) {
      return new TRPCError({
        code: "CONFLICT",
        message: "لا يمكن حذف سجل حركات المخزون",
      });
    }
    if (
      part.errno === 1205 ||
      part.errno === 1213 ||
      part.code === "ER_LOCK_WAIT_TIMEOUT" ||
      part.code === "ER_LOCK_DEADLOCK"
    ) {
      return new TRPCError({ code: "CONFLICT", message: "تعارض في تحديث المخزون" });
    }
  }
  return null;
}

type InventoryDeleteTx = {
  select: typeof db.select;
};

/** Non-locking reads. The item row lock serializes balance and movement writers. */
async function inventoryItemHasHistory(tx: InventoryDeleteTx, itemId: number): Promise<boolean> {
  const checks = [
    tx
      .select({ id: schema.inventoryTransactions.id })
      .from(schema.inventoryTransactions)
      .where(eq(schema.inventoryTransactions.itemId, itemId))
      .limit(1),
    tx
      .select({ id: schema.bomRules.id })
      .from(schema.bomRules)
      .where(eq(schema.bomRules.inventoryItemId, itemId))
      .limit(1),
    tx
      .select({ id: schema.bomSnapshotLines.id })
      .from(schema.bomSnapshotLines)
      .where(eq(schema.bomSnapshotLines.inventoryItemId, itemId))
      .limit(1),
    tx
      .select({ id: schema.reservationLines.id })
      .from(schema.reservationLines)
      .where(eq(schema.reservationLines.inventoryItemId, itemId))
      .limit(1),
    tx
      .select({ id: schema.materialIssueLines.id })
      .from(schema.materialIssueLines)
      .where(eq(schema.materialIssueLines.inventoryItemId, itemId))
      .limit(1),
  ];
  for (const check of checks) {
    const [row] = await check;
    if (row) return true;
  }
  return false;
}

function calcStatus(qty: number, minQty: number): "in_stock" | "low_stock" | "critical" | "out_of_stock" {
  if (qty <= 0) return "out_of_stock";
  if (qty <= minQty * 0.5) return "critical";
  if (qty <= minQty) return "low_stock";
  return "in_stock";
}

// ─── Router ───────────────────────────────────────────────────
export const inventoryRouter = router({

  // جلب كل المواد مع حركاتها
  list: adminProcedure.query(async () => {
    const items = await db.query.inventoryItems.findMany({
      orderBy: [desc(schema.inventoryItems.updatedAt)],
    });
    const txs = await db.query.inventoryTransactions.findMany({
      orderBy: [desc(schema.inventoryTransactions.createdAt)],
    });
    const txByItem: Record<number, typeof txs> = {};
    for (const tx of txs) {
      txByItem[tx.itemId] ??= [];
      txByItem[tx.itemId].push(tx);
    }
    return items.map(item => ({
      ...item,
      status: calcStatus(item.currentQty, item.minQty),
      transactions: (txByItem[item.id] ?? []).map(tx => ({
        id: String(tx.id),
        type:          tx.type,
        quantity:      tx.quantity,
        balanceBefore: tx.balanceBefore,
        balanceAfter:  tx.balanceAfter,
        reference:     tx.reference,
        note:          tx.note ?? undefined,
        performedBy:   tx.performedBy,
        date:          tx.date,
      })),
    }));
  }),

  // إنشاء مادة جديدة (currentQty = 0 — الرصيد الافتتاحي عبر حركة مخزون)
  create: adminProcedure
    .input(itemCreateInput)
    .mutation(async ({ input }) => {
      const now = Date.now();
      const [result] = await db.insert(schema.inventoryItems).values({
        ...input,
        currentQty: 0,
        createdAt: now,
        updatedAt: now,
      });
      return { id: result.insertId };
    }),

  // تحديث مادة موجودة (لا يغيّر currentQty — الحركات فقط)
  update: adminProcedure
    .input(z.object({ id: z.number().int() }).merge(itemUpdateInput))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.update(schema.inventoryItems)
        .set({ ...data, updatedAt: Date.now() })
        .where(eq(schema.inventoryItems.id, id));
      return { ok: true };
    }),

  // حذف مادة غير مستخدمة. سجل الحركات لا يُحذف أبداً.
  // Lock only inventory_items. Receipt, consumption, stocktake, reservation,
  // and Material Release take that same row lock before they write, so this
  // check cannot race those writers. Child reads stay non-locking; a later FK
  // failure rolls the item delete back.
  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      try {
        await db.transaction(async (tx) => {
          const [item] = await tx
            .select({
              id: schema.inventoryItems.id,
              currentQty: schema.inventoryItems.currentQty,
              reservedQty: schema.inventoryItems.reservedQty,
            })
            .from(schema.inventoryItems)
            .where(eq(schema.inventoryItems.id, input.id))
            .for("update")
            .limit(1);
          if (!item) {
            throw new TRPCError({ code: "NOT_FOUND", message: "المادة غير موجودة" });
          }
          if (item.currentQty !== 0 || item.reservedQty !== 0) {
            throw new TRPCError({ code: "CONFLICT", message: INVENTORY_DELETE_BLOCKED });
          }
          if (await inventoryItemHasHistory(tx, item.id)) {
            throw new TRPCError({ code: "CONFLICT", message: INVENTORY_DELETE_BLOCKED });
          }
          await tx.delete(schema.inventoryItems).where(eq(schema.inventoryItems.id, item.id));
        });
      } catch (error) {
        const mapped = inventoryDeleteError(error);
        if (mapped) throw mapped;
        throw error;
      }
      return { ok: true };
    }),

  // تسجيل حركة (استلام / صرف / تعديل / إرجاع / نقل)
  // stock_manager only. staff_user_id is the audit actor; performed_by is the staff name.
  addTransaction: requireStaffRole("stock_manager")
    .input(z.object({
      itemId:      z.number().int(),
      type:        z.enum(["receive", "consume", "adjust", "return", "transfer"]),
      quantity:    z.number().int(),
      reference:   z.string().max(255).default(""),
      note:        z.string().optional(),
      performedBy: z.string().max(255).default("الإدارة"),
      date:        z.string().max(10),
    }))
    .mutation(async ({ input, ctx }) => {
      const requiresPositiveQuantity =
        input.type === "receive" ||
        input.type === "return" ||
        input.type === "consume" ||
        input.type === "transfer";
      if (requiresPositiveQuantity && input.quantity <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "الكمية يجب أن تكون أكبر من صفر",
        });
      }
      if (input.type === "adjust" && input.quantity === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لا يمكن تسجيل تعديل بقيمة صفر",
        });
      }

      try {
      return await db.transaction(async (tx) => {
        const [item] = await tx
          .select()
          .from(schema.inventoryItems)
          .where(eq(schema.inventoryItems.id, input.itemId))
          .for("update")
          .limit(1);
        if (!item) throw new Error("المادة غير موجودة");

        const balanceBefore = item.currentQty;
        let candidateBalance: number;
        if (input.type === "receive" || input.type === "return") {
          candidateBalance = balanceBefore + input.quantity;
        } else if (input.type === "consume" || input.type === "transfer") {
          candidateBalance = balanceBefore - input.quantity;
        } else {
          // adjust: quantity is a signed delta, not a replacement balance
          candidateBalance = balanceBefore + input.quantity;
        }
        const reservedQty = item.reservedQty ?? 0;
        if (candidateBalance < 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "الكمية المتاحة في المخزون غير كافية",
          });
        }
        if (candidateBalance < reservedQty) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "لا يمكن إنقاص المخزون إلى أقل من الكمية المحجوزة",
          });
        }

        const now = Date.now();
        await tx.insert(schema.inventoryTransactions).values({
          itemId:        input.itemId,
          type:          input.type,
          quantity:      input.quantity,
          balanceBefore,
          balanceAfter:  candidateBalance,
          reference:     input.reference,
          note:          input.note,
          performedBy:   ctx.staff.name,
          staffUserId:   ctx.staff.userId,
          date:          input.date,
          createdAt:     now,
        });

        const updateData: Record<string, unknown> = {
          currentQty: candidateBalance,
          updatedAt: now,
        };
        if (input.type === "receive") updateData.lastReceived = input.date;
        if (input.type === "consume") updateData.lastConsumed = input.date;

        await tx.update(schema.inventoryItems)
          .set(updateData)
          .where(eq(schema.inventoryItems.id, input.itemId));

        return {
          balanceBefore,
          balanceAfter: candidateBalance,
          status: calcStatus(candidateBalance, item.minQty),
        };
      });
      } catch (error) {
        rethrowInventoryWrite(error);
      }
    }),

  // خصم تلقائي عند إنشاء أمر تشغيل
  consumeForWorkOrder: adminProcedure
    .input(z.object({
      workOrderRef: z.string(),
      performedBy:  z.string().default("نظام أوامر التشغيل"),
      consumptions: z.array(z.object({
        itemId:   z.number().int(),
        quantity: z.number().int(),
      })),
    }))
    .mutation(async ({ input }) => {
      for (const consumption of input.consumptions) {
        if (!Number.isInteger(consumption.quantity) || consumption.quantity <= 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "الكمية يجب أن تكون أكبر من صفر",
          });
        }
      }
      const today = new Date().toISOString().split("T")[0];
      const warnings: string[] = [];
      const sortedIds = [...new Set(input.consumptions.map((row) => row.itemId))].sort((a, b) => a - b);

      try {
        await db.transaction(async (tx) => {
          const locked = new Map<number, {
            id: number;
            name: string;
            unit: string;
            currentQty: number;
            reservedQty: number;
          }>();
          for (const itemId of sortedIds) {
            const [item] = await tx
              .select()
              .from(schema.inventoryItems)
              .where(eq(schema.inventoryItems.id, itemId))
              .for("update")
              .limit(1);
            if (!item) continue;
            locked.set(itemId, {
              id: item.id,
              name: item.name,
              unit: item.unit,
              currentQty: item.currentQty,
              reservedQty: item.reservedQty ?? 0,
            });
          }

          for (const consumption of input.consumptions) {
            const item = locked.get(consumption.itemId);
            if (!item) {
              warnings.push(`مادة رقم ${consumption.itemId} غير موجودة`);
              continue;
            }
            const candidateCurrent = item.currentQty - consumption.quantity;
            if (candidateCurrent < 0) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "الكمية المتاحة في المخزون غير كافية",
              });
            }
            if (candidateCurrent < item.reservedQty) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "لا يمكن إنقاص المخزون إلى أقل من الكمية المحجوزة",
              });
            }
            const now = Date.now();
            await tx.insert(schema.inventoryTransactions).values({
              itemId: item.id,
              type: "consume",
              quantity: consumption.quantity,
              balanceBefore: item.currentQty,
              balanceAfter: candidateCurrent,
              reference: input.workOrderRef,
              performedBy: input.performedBy,
              date: today,
              createdAt: now,
            });
            await tx.update(schema.inventoryItems)
              .set({ currentQty: candidateCurrent, lastConsumed: today, updatedAt: now })
              .where(eq(schema.inventoryItems.id, item.id));
            item.currentQty = candidateCurrent;
          }
        });
      } catch (error) {
        rethrowInventoryWrite(error);
      }
      return { ok: true, warnings };
    }),

  // اعتماد الجرد: stock_manager فقط، دفعة واحدة داخل معاملة مع قفل الصفوف.
  bulkAdjustForStocktaking: requireStaffRole("stock_manager")
    .input(z.object({
      sessionRef:  z.string().min(1).max(255),
      date:        z.string().max(10),
      adjustments: z.array(z.object({
        itemId:    z.number().int(),
        actualQty: z.number().int().min(0),
        note:      z.string().optional(),
      })).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const seen = new Set<number>();
      for (const adj of input.adjustments) {
        if (seen.has(adj.itemId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "لا يمكن تكرار نفس المادة في جلسة الجرد",
          });
        }
        seen.add(adj.itemId);
      }

      const sortedIds = [...seen].sort((a, b) => a - b);
      const byId = new Map(input.adjustments.map((adj) => [adj.itemId, adj]));

      try {
        return await withReservationAllocator((connDb) => connDb.transaction(async (tx) => {
          const locked = new Map<number, { currentQty: number; reservedQty: number }>();
          for (const itemId of sortedIds) {
            const [item] = await tx
              .select()
              .from(schema.inventoryItems)
              .where(eq(schema.inventoryItems.id, itemId))
              .for("update")
              .limit(1);
            if (!item) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "مادة غير موجودة في المخزون",
              });
            }
            locked.set(itemId, { currentQty: item.currentQty, reservedQty: item.reservedQty ?? 0 });
          }

          const now = Date.now();
          const plan = await reconcileReservationsAfterStocktake(
            tx,
            ctx.staff.userId,
            new Map(sortedIds.map((id) => [id, byId.get(id)!.actualQty])),
            now
          );
          let count = 0;
          let unchanged = 0;
          for (const itemId of sortedIds) {
            const item = locked.get(itemId)!;
            const adj = byId.get(itemId)!;
            const balanceBefore = item.currentQty;
            const balanceAfter = adj.actualQty;
            const reservedBefore = item.reservedQty;
            const reservedAfter = plan.finalReservedByItem.get(itemId) ?? 0;
            const delta = balanceAfter - balanceBefore;
            if (delta === 0 && reservedBefore === reservedAfter) {
              unchanged += 1;
              continue;
            }
            if (delta !== 0) {
              await tx.insert(schema.inventoryTransactions).values({
                itemId,
                type: "adjust",
                quantity: delta,
                balanceBefore,
                balanceAfter,
                reference: input.sessionRef,
                note: adj.note ?? null,
                performedBy: ctx.staff.name,
                staffUserId: ctx.staff.userId,
                date: input.date,
                createdAt: now,
              });
              count += 1;
            } else {
              unchanged += 1;
            }
            await tx.update(schema.inventoryItems)
              .set({ currentQty: balanceAfter, reservedQty: reservedAfter, updatedAt: now })
              .where(eq(schema.inventoryItems.id, itemId));
          }

          return { ok: true, count, unchanged };
        }));
      } catch (error) {
        rethrowInventoryWrite(error);
      }
    }),

  // بذر البيانات التجريبية (للإعداد الأول فقط)
  seed: adminProcedure.mutation(async () => {
    const existing = await db.query.inventoryItems.findFirst();
    if (existing) return { skipped: true, message: "البيانات موجودة مسبقاً" };

    const now = Date.now();
    const items = [
      { code: "WPC-45-WHT",    name: "لوح WPC 45mm أبيض مطفي",      nameEn: "WPC Board 45mm White Matt",  category: "wpc_board"  as const, unit: "لوح",   currentQty: 320, minQty: 100, maxQty: 600,  reorderQty: 200, unitCost: 85,  supplier: "شركة البلاستيك المتحدة",    supplierPhone: "0501234567", location: "مستودع A - رف 1", lastReceived: "2026-05-10", lastConsumed: "2026-05-17" },
      { code: "WPC-55-BEG",    name: "لوح WPC 55mm بيج رملي",        nameEn: "WPC Board 55mm Beige Sand",  category: "wpc_board"  as const, unit: "لوح",   currentQty: 78,  minQty: 80,  maxQty: 400,  reorderQty: 150, unitCost: 95,  supplier: "شركة البلاستيك المتحدة",    supplierPhone: "0501234567", location: "مستودع A - رف 2", lastReceived: "2026-04-28", lastConsumed: "2026-05-15" },
      { code: "FILM-WHT-50",   name: "فيلم PVC أبيض مطفي 50 ميكرون", nameEn: "PVC Film White Matt 50µm",  category: "film"       as const, unit: "رول",   currentQty: 45,  minQty: 20,  maxQty: 100,  reorderQty: 40,  unitCost: 320, supplier: "مؤسسة الأفلام الصناعية",    supplierPhone: "0551234567", location: "مستودع B - رف 1", lastReceived: "2026-05-05", lastConsumed: "2026-05-16" },
      { code: "EDGE-ABS-WHT",  name: "حافة ABS أبيض 2mm",            nameEn: "ABS Edge White 2mm",         category: "edge"       as const, unit: "متر",   currentQty: 1200,minQty: 500, maxQty: 3000, reorderQty: 1000,unitCost: 4.5, supplier: "شركة الحواف الصناعية",      supplierPhone: "0561234567", location: "مستودع B - رف 3", lastReceived: "2026-05-08", lastConsumed: "2026-05-18" },
      { code: "FRAME-MDF-90",  name: "إطار MDF 90mm أبيض",           nameEn: "MDF Frame 90mm White",       category: "frame"      as const, unit: "قطعة",  currentQty: 12,  minQty: 50,  maxQty: 300,  reorderQty: 100, unitCost: 45,  supplier: "مصنع الإطارات الخليجي",     supplierPhone: "0571234567", location: "مستودع C - رف 1", lastReceived: "2026-04-20", lastConsumed: "2026-05-14" },
      { code: "LOCK-MOR-STD",  name: "قفل مورتيز قياسي",             nameEn: "Mortise Lock Standard",      category: "lock"       as const, unit: "طقم",   currentQty: 0,   minQty: 30,  maxQty: 200,  reorderQty: 80,  unitCost: 65,  supplier: "شركة الأقفال العالمية",     supplierPhone: "0581234567", location: "مستودع D - رف 1", lastReceived: "2026-04-15", lastConsumed: "2026-05-12" },
      { code: "HINGE-3-STD",   name: "مفصلات 3 مفصلات قياسية",       nameEn: "3-Hinge Set Standard",       category: "hinge"      as const, unit: "طقم",   currentQty: 156, minQty: 60,  maxQty: 400,  reorderQty: 120, unitCost: 28,  supplier: "مؤسسة المفصلات الصناعية",  supplierPhone: "0591234567", location: "مستودع D - رف 2", lastReceived: "2026-05-01", lastConsumed: "2026-05-17" },
      { code: "PACK-FOAM-STD", name: "فوم تغليف قياسي",              nameEn: "Standard Packing Foam",      category: "packaging"  as const, unit: "قطعة",  currentQty: 280, minQty: 100, maxQty: 600,  reorderQty: 200, unitCost: 8,   supplier: "مصنع التغليف الحديث",      supplierPhone: "0501111222", location: "مستودع E - رف 1", lastReceived: "2026-05-12", lastConsumed: "2026-05-18" },
      { code: "SCREW-M6-BOX",  name: "براغي M6 - علبة 100 حبة",      nameEn: "Screws M6 Box 100pcs",       category: "accessory"  as const, unit: "علبة",  currentQty: 38,  minQty: 15,  maxQty: 100,  reorderQty: 40,  unitCost: 22,  supplier: "شركة اللوازم الصناعية",    supplierPhone: "0543210987", location: "مستودع D - رف 3", lastReceived: "2026-04-18" },
      { code: "GLUE-PVC-5L",   name: "غراء PVC 5 لتر",               nameEn: "PVC Glue 5L",                category: "chemical"   as const, unit: "علبة",  currentQty: 24,  minQty: 10,  maxQty: 80,   reorderQty: 30,  unitCost: 55,  supplier: "شركة الكيماويات الصناعية", supplierPhone: "0567890123", location: "مستودع F",         lastReceived: "2026-05-03", lastConsumed: "2026-05-15" },
    ];

    for (const item of items) {
      await db.insert(schema.inventoryItems).values({ ...item, createdAt: now, updatedAt: now });
    }
    return { ok: true, count: items.length };
  }),
});
