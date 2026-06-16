import { z } from "zod/v4";
import { db, schema } from "./db.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { router, adminProcedure } from "./trpc.js";
import { TRPCError } from "@trpc/server";

// ── Schemas ──────────────────────────────────────────────────────────
const createBOMSchema = z.object({
  productId: z.number().int(),
  description: z.string().optional(),
  laborCost: z.number().min(0).default(0),
  wastagePercentage: z.number().min(0).max(100).default(5),
  items: z.array(
    z.object({
      itemId: z.number().int(), // references inventoryItems.id
      quantity: z.number().min(0.001),
      notes: z.string().optional(),
    })
  ).min(1, "يجب إضافة مادة واحدة على الأقل"),
  notes: z.string().optional(),
});

const updateBOMSchema = z.object({
  bomId: z.number().int(),
  description: z.string().optional(),
  laborCost: z.number().min(0).optional(),
  wastagePercentage: z.number().min(0).max(100).optional(),
  items: z.array(
    z.object({
      itemId: z.number().int(),
      quantity: z.number().min(0.001),
      notes: z.string().optional(),
    })
  ).optional(),
  notes: z.string().optional(),
});

export const bomRouter = router({
  // ── إنشاء قائمة مواد جديدة ────────────────────────────────
  create: adminProcedure
    .input(createBOMSchema)
    .mutation(async ({ input }) => {
      // التحقق من وجود المنتج
      const product = await db.query.products.findFirst({
        where: eq(schema.products.id, input.productId),
      });
      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "المنتج المحدد غير موجود في النظام",
        });
      }

      // حساب تكاليف البنود والمزامنة مع أسعار المخزن
      let totalItemsCost = 0;
      const resolvedItems = [];

      for (let i = 0; i < input.items.length; i++) {
        const item = input.items[i];
        const invItem = await db.query.inventoryItems.findFirst({
          where: eq(schema.inventoryItems.id, item.itemId),
        });

        if (!invItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `المادة الخام ذات المعرف ${item.itemId} غير موجودة في المخزن`,
          });
        }

        const itemCost = invItem.unitCost * item.quantity;
        totalItemsCost += itemCost;

        resolvedItems.push({
          itemId: item.itemId,
          quantity: item.quantity,
          unitCost: invItem.unitCost,
          totalCost: itemCost,
          notes: item.notes || null,
          lineNumber: i + 1,
        });
      }

      // حساب الهدر والتكلفة الكلية
      const wastageAmount = totalItemsCost * (input.wastagePercentage / 100);
      const totalCost = totalItemsCost + wastageAmount + input.laborCost;

      const now = Date.now();

      // إدراج رأس الـ BOM
      const [bomResult] = await db.insert(schema.bom).values({
        productId: input.productId,
        version: 1,
        description: input.description || null,
        totalCost,
        laborCost: input.laborCost,
        wastagePercentage: input.wastagePercentage,
        status: "draft",
        createdBy: 1, // معرف افتراضي للأدمن
        notes: input.notes || null,
        createdAt: now,
        updatedAt: now,
      });

      const bomId = bomResult.insertId;

      // إدراج بنود الـ BOM
      for (const item of resolvedItems) {
        await db.insert(schema.bomItems).values({
          bomId,
          itemId: item.itemId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: item.totalCost,
          notes: item.notes,
          lineNumber: item.lineNumber,
          createdAt: now,
          updatedAt: now,
        });
      }

      // تسجيل السجل التاريخي
      await db.insert(schema.bomHistory).values({
        bomId,
        changeType: "created",
        changedBy: 1,
        newData: {
          productId: input.productId,
          laborCost: input.laborCost,
          wastagePercentage: input.wastagePercentage,
          totalCost,
          itemsCount: resolvedItems.length,
        },
        changedAt: now,
      });

      return { bomId, totalCost };
    }),

  // ── جلب كل قوائم المواد ────────────────────────────────────
  list: adminProcedure
    .input(
      z.object({
        status: z.enum(["draft", "active", "archived"]).optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      let query = db
        .select({
          id: schema.bom.id,
          productId: schema.bom.productId,
          productName: schema.products.name,
          productSku: schema.products.sku,
          version: schema.bom.version,
          totalCost: schema.bom.totalCost,
          laborCost: schema.bom.laborCost,
          wastagePercentage: schema.bom.wastagePercentage,
          status: schema.bom.status,
          createdAt: schema.bom.createdAt,
        })
        .from(schema.bom)
        .innerJoin(schema.products, eq(schema.bom.productId, schema.products.id));

      const conditions = [];

      if (input?.status) {
        conditions.push(eq(schema.bom.status, input.status));
      }

      if (input?.search) {
        conditions.push(
          sql`${schema.products.name} LIKE ${`%${input.search}%`} OR ${schema.products.sku} LIKE ${`%${input.search}%`}`
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      return query.orderBy(desc(schema.bom.createdAt));
    }),

  // ── الحصول على BOM مفصل مع بنوده ──────────────────────────
  get: adminProcedure
    .input(z.object({ bomId: z.number().int() }))
    .query(async ({ input }) => {
      const bomData = await db
        .select({
          id: schema.bom.id,
          productId: schema.bom.productId,
          productName: schema.products.name,
          productSku: schema.products.sku,
          version: schema.bom.version,
          description: schema.bom.description,
          totalCost: schema.bom.totalCost,
          laborCost: schema.bom.laborCost,
          wastagePercentage: schema.bom.wastagePercentage,
          status: schema.bom.status,
          createdBy: schema.bom.createdBy,
          approvedBy: schema.bom.approvedBy,
          approvedAt: schema.bom.approvedAt,
          notes: schema.bom.notes,
          createdAt: schema.bom.createdAt,
          updatedAt: schema.bom.updatedAt,
        })
        .from(schema.bom)
        .innerJoin(schema.products, eq(schema.bom.productId, schema.products.id))
        .where(eq(schema.bom.id, input.bomId))
        .limit(1);

      if (!bomData.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "قائمة المواد المطلوبة غير موجودة",
        });
      }

      const items = await db
        .select({
          id: schema.bomItems.id,
          bomId: schema.bomItems.bomId,
          itemId: schema.bomItems.itemId,
          quantity: schema.bomItems.quantity,
          unitCost: schema.bomItems.unitCost,
          totalCost: schema.bomItems.totalCost,
          notes: schema.bomItems.notes,
          lineNumber: schema.bomItems.lineNumber,
          itemName: schema.inventoryItems.name,
          itemCode: schema.inventoryItems.code,
          itemUnit: schema.inventoryItems.unit,
          itemCategory: schema.inventoryItems.category,
          currentStock: schema.inventoryItems.currentQty,
        })
        .from(schema.bomItems)
        .innerJoin(schema.inventoryItems, eq(schema.bomItems.itemId, schema.inventoryItems.id))
        .where(eq(schema.bomItems.bomId, input.bomId))
        .orderBy(schema.bomItems.lineNumber);

      return {
        ...bomData[0],
        items,
      };
    }),

  // ── تحديث قائمة مواد موجودة ──────────────────────────────
  update: adminProcedure
    .input(updateBOMSchema)
    .mutation(async ({ input }) => {
      const current = await db.query.bom.findFirst({
        where: eq(schema.bom.id, input.bomId),
      });

      if (!current) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "قائمة المواد المطلوبة غير موجودة",
        });
      }

      const now = Date.now();
      const updateData: any = {
        updatedAt: now,
      };

      if (input.description !== undefined) updateData.description = input.description;
      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.laborCost !== undefined) updateData.laborCost = input.laborCost;
      if (input.wastagePercentage !== undefined) updateData.wastagePercentage = input.wastagePercentage;

      const laborCost = input.laborCost !== undefined ? input.laborCost : current.laborCost;
      const wastagePercentage = input.wastagePercentage !== undefined ? input.wastagePercentage : current.wastagePercentage;

      // إذا تم تحديث بنود قائمة المواد
      if (input.items !== undefined) {
        // حذف البنود القديمة
        await db.delete(schema.bomItems).where(eq(schema.bomItems.bomId, input.bomId));

        let totalItemsCost = 0;
        const resolvedItems = [];

        for (let i = 0; i < input.items.length; i++) {
          const item = input.items[i];
          const invItem = await db.query.inventoryItems.findFirst({
            where: eq(schema.inventoryItems.id, item.itemId),
          });

          if (!invItem) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `المادة ذات المعرف ${item.itemId} غير موجودة بالمخزن`,
            });
          }

          const itemCost = invItem.unitCost * item.quantity;
          totalItemsCost += itemCost;

          resolvedItems.push({
            itemId: item.itemId,
            quantity: item.quantity,
            unitCost: invItem.unitCost,
            totalCost: itemCost,
            notes: item.notes || null,
            lineNumber: i + 1,
          });
        }

        const wastageAmount = totalItemsCost * (wastagePercentage / 100);
        const totalCost = totalItemsCost + wastageAmount + laborCost;

        updateData.totalCost = totalCost;

        // إدراج البنود الجديدة
        for (const item of resolvedItems) {
          await db.insert(schema.bomItems).values({
            bomId: input.bomId,
            itemId: item.itemId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
            notes: item.notes,
            lineNumber: item.lineNumber,
            createdAt: now,
            updatedAt: now,
          });
        }
      } else if (input.laborCost !== undefined || input.wastagePercentage !== undefined) {
        // في حال تغيير التكلفة أو نسبة الهدر فقط، نعيد حساب الإجمالي بناءً على البنود الحالية
        const currentItems = await db
          .select({ totalCost: schema.bomItems.totalCost })
          .from(schema.bomItems)
          .where(eq(schema.bomItems.bomId, input.bomId));

        const totalItemsCost = currentItems.reduce((sum, item) => sum + item.totalCost, 0);
        const wastageAmount = totalItemsCost * (wastagePercentage / 100);
        updateData.totalCost = totalItemsCost + wastageAmount + laborCost;
      }

      // تحديث رأس الـ BOM
      await db
        .update(schema.bom)
        .set(updateData)
        .where(eq(schema.bom.id, input.bomId));

      // تسجيل السجل التاريخي
      await db.insert(schema.bomHistory).values({
        bomId: input.bomId,
        changeType: "updated",
        changedBy: 1,
        oldData: current,
        newData: updateData,
        changedAt: now,
      });

      return { success: true };
    }),

  // ── اعتماد قائمة المواد ────────────────────────────────────
  approve: adminProcedure
    .input(z.object({ bomId: z.number().int() }))
    .mutation(async ({ input }) => {
      const now = Date.now();
      await db
        .update(schema.bom)
        .set({
          status: "active",
          approvedBy: 1,
          approvedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.bom.id, input.bomId));

      await db.insert(schema.bomHistory).values({
        bomId: input.bomId,
        changeType: "approved",
        changedBy: 1,
        changedAt: now,
      });

      return { success: true };
    }),

  // ── أرشفة قائمة المواد ─────────────────────────────────────
  archive: adminProcedure
    .input(z.object({ bomId: z.number().int() }))
    .mutation(async ({ input }) => {
      const now = Date.now();
      await db
        .update(schema.bom)
        .set({
          status: "archived",
          updatedAt: now,
        })
        .where(eq(schema.bom.id, input.bomId));

      await db.insert(schema.bomHistory).values({
        bomId: input.bomId,
        changeType: "archived",
        changedBy: 1,
        changedAt: now,
      });

      return { success: true };
    }),

  // ── الحصول على السجل التاريخي لقائمة المواد ─────────────────
  getHistory: adminProcedure
    .input(z.object({ bomId: z.number().int() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(schema.bomHistory)
        .where(eq(schema.bomHistory.bomId, input.bomId))
        .orderBy(desc(schema.bomHistory.changedAt));
    }),
});
