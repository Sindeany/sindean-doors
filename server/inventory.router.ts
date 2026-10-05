// ============================================================
// inventory.router.ts - مسارات إدارة المخزون
// ============================================================
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { db, schema } from "./db.js";
import { eq, desc } from "drizzle-orm";
import { router, adminProcedure, requireStaffRole } from "./trpc.js";

// ─── Zod schemas ─────────────────────────────────────────────
const categoryEnum = z.enum([
  "wpc_board", "film", "edge", "frame", "lock",
  "hinge", "accessory", "packaging", "chemical",
]);

const itemInput = z.object({
  code:          z.string().min(1).max(100),
  name:          z.string().min(1).max(255),
  nameEn:        z.string().max(255).optional(),
  category:      categoryEnum,
  unit:          z.string().min(1).max(50),
  currentQty:    z.number().int().min(0),
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

/** Item master edits — stock balance changes only via inventory movements. */
export const itemUpdateInput = itemInput.omit({ currentQty: true });

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

  // إنشاء مادة جديدة
  create: adminProcedure
    .input(itemInput)
    .mutation(async ({ input }) => {
      const now = Date.now();
      const [result] = await db.insert(schema.inventoryItems).values({
        ...input,
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

  // حذف مادة
  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.delete(schema.inventoryTransactions)
        .where(eq(schema.inventoryTransactions.itemId, input.id));
      await db.delete(schema.inventoryItems)
        .where(eq(schema.inventoryItems.id, input.id));
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

      return db.transaction(async (tx) => {
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
        if (candidateBalance < 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "الكمية المتاحة في المخزون غير كافية",
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
      const today = new Date().toISOString().split("T")[0];
      const warnings: string[] = [];

      for (const c of input.consumptions) {
        const item = await db.query.inventoryItems.findFirst({
          where: eq(schema.inventoryItems.id, c.itemId),
        });
        if (!item) { warnings.push(`مادة رقم ${c.itemId} غير موجودة`); continue; }

        const actualConsume = Math.min(c.quantity, item.currentQty);
        const newQty = item.currentQty - actualConsume;
        const now = Date.now();

        await db.insert(schema.inventoryTransactions).values({
          itemId: item.id, type: "consume",
          quantity: actualConsume,
          balanceBefore: item.currentQty,
          balanceAfter: newQty,
          reference: input.workOrderRef,
          performedBy: input.performedBy,
          date: today, createdAt: now,
        });
        await db.update(schema.inventoryItems)
          .set({ currentQty: newQty, lastConsumed: today, updatedAt: now })
          .where(eq(schema.inventoryItems.id, item.id));

        if (item.currentQty < c.quantity) {
          warnings.push(`${item.name}: نقص ${c.quantity - item.currentQty} ${item.unit}`);
        }
      }
      return { ok: true, warnings };
    }),

  // تعديل جماعي للأرصدة عند اعتماد الجرد الدوري
  bulkAdjustForStocktaking: adminProcedure
    .input(z.object({
      sessionRef:  z.string().max(255),
      performedBy: z.string().max(255).default("مشرف الجرد"),
      date:        z.string().max(10),
      adjustments: z.array(z.object({
        itemId:    z.number().int(),
        actualQty: z.number().int().min(0),
        note:      z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const now = Date.now();
      let count = 0;

      for (const adj of input.adjustments) {
        const item = await db.query.inventoryItems.findFirst({
          where: eq(schema.inventoryItems.id, adj.itemId),
        });
        if (!item) continue;

        const balanceBefore = item.currentQty;
        const balanceAfter  = adj.actualQty;
        const delta         = balanceAfter - balanceBefore;

        await db.insert(schema.inventoryTransactions).values({
          itemId:        adj.itemId,
          type:          "adjust",
          quantity:      delta,
          balanceBefore,
          balanceAfter,
          reference:     input.sessionRef,
          note:          adj.note ?? null,
          performedBy:   input.performedBy,
          date:          input.date,
          createdAt:     now,
        });

        await db.update(schema.inventoryItems)
          .set({ currentQty: balanceAfter, updatedAt: now })
          .where(eq(schema.inventoryItems.id, adj.itemId));

        count++;
      }

      return { ok: true, count };
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
