/**
 * Purchases Router — فواتير المشتريات (ضريبة المدخلات)
 * تتبع الفواتير الواردة من الموردين وحساب ضريبة المدخلات
 */

import { z } from "zod/v4";
import { db } from "./db.js";
import * as schema from "../drizzle/schema.js";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { adminProcedure, router } from "./trpc.js";

export const fromHalala = (h: number) => (h / 100).toFixed(2);
export const toHalala = (r: number) => Math.round(r * 100);

export const CATEGORY_LABELS: Record<string, string> = {
  materials: "مواد خام",
  equipment: "معدات وآلات",
  services: "خدمات",
  utilities: "مرافق (كهرباء/ماء/إنترنت)",
  other: "أخرى",
};

export const purchasesRouter = router({
  // ── قائمة فواتير المشتريات ─────────────────────────────────────────────────
  list: adminProcedure
    .input(
      z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          paymentStatus: z.enum(["unpaid", "paid"]).optional(),
          category: z
            .enum(["materials", "equipment", "services", "utilities", "other"])
            .optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const rows = await db
        .select()
        .from(schema.purchaseInvoices)
        .orderBy(desc(schema.purchaseInvoices.issueDate));

      let result = rows;
      if (input?.startDate)
        result = result.filter(r => r.issueDate >= input.startDate!);
      if (input?.endDate)
        result = result.filter(r => r.issueDate <= input.endDate!);
      if (input?.paymentStatus)
        result = result.filter(r => r.paymentStatus === input.paymentStatus);
      if (input?.category)
        result = result.filter(r => r.category === input.category);

      return result.map(r => ({
        ...r,
        subtotalRiyals: fromHalala(r.subtotalHalala),
        vatAmountRiyals: fromHalala(r.vatAmountHalala),
        totalRiyals: fromHalala(r.totalHalala),
        categoryLabel: CATEGORY_LABELS[r.category ?? "other"] ?? r.category,
      }));
    }),

  // ── جلب فاتورة واحدة ─────────────────────────────────────────────────────
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const rows = await db
        .select()
        .from(schema.purchaseInvoices)
        .where(eq(schema.purchaseInvoices.id, input.id));
      if (!rows[0]) throw new Error("فاتورة الشراء غير موجودة");
      const r = rows[0];
      return {
        ...r,
        subtotalRiyals: fromHalala(r.subtotalHalala),
        vatAmountRiyals: fromHalala(r.vatAmountHalala),
        totalRiyals: fromHalala(r.totalHalala),
      };
    }),

  // ── إضافة فاتورة شراء جديدة ───────────────────────────────────────────────
  create: adminProcedure
    .input(
      z.object({
        invoiceNumber: z.string().min(1),
        supplierName: z.string().min(1),
        supplierVatNumber: z.string().length(15).optional(),
        issueDate: z.string().min(10).max(10), // YYYY-MM-DD
        subtotalRiyals: z.number().nonnegative(),
        vatAmountRiyals: z.number().nonnegative(),
        category: z
          .enum(["materials", "equipment", "services", "utilities", "other"])
          .default("materials"),
        description: z.string().min(1),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const subtotalHalala = toHalala(input.subtotalRiyals);
      const vatAmountHalala = toHalala(input.vatAmountRiyals);
      const totalHalala = subtotalHalala + vatAmountHalala;
      const now = Date.now();

      const [result] = await db.insert(schema.purchaseInvoices).values({
        invoiceNumber: input.invoiceNumber,
        supplierName: input.supplierName,
        supplierVatNumber: input.supplierVatNumber,
        issueDate: input.issueDate,
        subtotalHalala,
        vatAmountHalala,
        totalHalala,
        category: input.category,
        description: input.description,
        paymentStatus: "unpaid",
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
      });

      const purchaseId = Number((result as any).insertId);

      // قيد محاسبي تلقائي: Dr مصروفات/أصول / Dr ضريبة مدخلات / Cr حسابات دائنة
      try {
        const year = new Date().getFullYear();
        const jeCountResult = await db
          .select({ cnt: sql<number>`COUNT(*)` })
          .from(schema.journalEntries);
        const jeCounter = (jeCountResult[0]?.cnt ?? 0) + 1;
        const jeNumber = `JE-${year}-${String(jeCounter).padStart(6, "0")}`;

        // حدد حساب المصروف حسب فئة الشراء
        const expenseAccountMap: Record<
          string,
          { code: string; name: string }
        > = {
          materials: { code: "5100", name: "تكلفة المواد الخام" },
          equipment: { code: "5200", name: "مصروفات المعدات والأصول" },
          services: { code: "5300", name: "مصروفات الخدمات" },
          utilities: { code: "5400", name: "مصروفات المرافق" },
          other: { code: "5900", name: "مصروفات أخرى" },
        };
        const expenseAcc =
          expenseAccountMap[input.category] ?? expenseAccountMap.other;

        const [jeResult] = await db.insert(schema.journalEntries).values({
          entryNumber: jeNumber,
          entryDate: input.issueDate,
          description: `فاتورة شراء — ${input.supplierName} — ${input.invoiceNumber}`,
          sourceType: "manual",
          sourceId: purchaseId,
          totalDebitHalala: totalHalala,
          totalCreditHalala: totalHalala,
          isPosted: true,
          createdAt: now,
          updatedAt: now,
        });
        const jeId = Number((jeResult as any).insertId);

        const lines = [
          // Dr مصروف/أصل
          {
            journalEntryId: jeId,
            accountCode: expenseAcc.code,
            accountName: expenseAcc.name,
            debitHalala: subtotalHalala,
            creditHalala: 0,
            description: input.invoiceNumber,
            sequence: 1,
          },
          // Dr ضريبة مدخلات قابلة للاسترداد
          {
            journalEntryId: jeId,
            accountCode: "1130",
            accountName: "ضريبة القيمة المضافة القابلة للاسترداد",
            debitHalala: vatAmountHalala,
            creditHalala: 0,
            description: `ضريبة ${input.invoiceNumber}`,
            sequence: 2,
          },
          // Cr حسابات الدائنين
          {
            journalEntryId: jeId,
            accountCode: "2110",
            accountName: "حسابات دائنة — الموردون",
            debitHalala: 0,
            creditHalala: totalHalala,
            description: input.supplierName,
            sequence: 3,
          },
        ];
        // remove VAT line if zero
        const filteredLines =
          vatAmountHalala > 0 ? lines : [lines[0], lines[2]];
        await db.insert(schema.journalLines).values(filteredLines);
      } catch {
        // القيد اختياري — لا يوقف الحفظ
      }

      return { success: true, id: purchaseId };
    }),

  // ── تحديث حالة الدفع ─────────────────────────────────────────────────────
  updatePaymentStatus: adminProcedure
    .input(
      z.object({ id: z.number(), paymentStatus: z.enum(["unpaid", "paid"]) })
    )
    .mutation(async ({ input }) => {
      await db
        .update(schema.purchaseInvoices)
        .set({ paymentStatus: input.paymentStatus, updatedAt: Date.now() })
        .where(eq(schema.purchaseInvoices.id, input.id));

      // قيد دفع: Dr حسابات دائنة / Cr نقدية
      if (input.paymentStatus === "paid") {
        try {
          const rows = await db
            .select()
            .from(schema.purchaseInvoices)
            .where(eq(schema.purchaseInvoices.id, input.id));
          const inv = rows[0];
          if (inv) {
            const year = new Date().getFullYear();
            const jeCountResult = await db
              .select({ cnt: sql<number>`COUNT(*)` })
              .from(schema.journalEntries);
            const jeCounter = (jeCountResult[0]?.cnt ?? 0) + 1;
            const jeNumber = `JE-${year}-${String(jeCounter).padStart(6, "0")}`;
            const now = Date.now();
            const [jeResult] = await db.insert(schema.journalEntries).values({
              entryNumber: jeNumber,
              entryDate: new Date().toISOString().slice(0, 10),
              description: `دفع فاتورة شراء — ${inv.supplierName} — ${inv.invoiceNumber}`,
              sourceType: "payment",
              sourceId: inv.id,
              totalDebitHalala: inv.totalHalala,
              totalCreditHalala: inv.totalHalala,
              isPosted: true,
              createdAt: now,
              updatedAt: now,
            });
            const jeId = Number((jeResult as any).insertId);
            await db.insert(schema.journalLines).values([
              {
                journalEntryId: jeId,
                accountCode: "2110",
                accountName: "حسابات دائنة — الموردون",
                debitHalala: inv.totalHalala,
                creditHalala: 0,
                description: inv.invoiceNumber,
                sequence: 1,
              },
              {
                journalEntryId: jeId,
                accountCode: "1110",
                accountName: "النقدية والبنوك",
                debitHalala: 0,
                creditHalala: inv.totalHalala,
                description: inv.supplierName,
                sequence: 2,
              },
            ]);
          }
        } catch {
          /* اختياري */
        }
      }

      return { success: true };
    }),

  // ── حذف فاتورة ───────────────────────────────────────────────────────────
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db
        .delete(schema.purchaseInvoices)
        .where(eq(schema.purchaseInvoices.id, input.id));
      return { success: true };
    }),

  // ── ملخص ضريبة المدخلات (للـ VAT Report) ────────────────────────────────
  getInputVatSummary: adminProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ input }) => {
      const rows = await db.select().from(schema.purchaseInvoices);
      const filtered = rows.filter(
        r => r.issueDate >= input.startDate && r.issueDate <= input.endDate
      );

      const totalSubtotalHalala = filtered.reduce(
        (s, r) => s + r.subtotalHalala,
        0
      );
      const totalVatHalala = filtered.reduce(
        (s, r) => s + r.vatAmountHalala,
        0
      );
      const totalHalala = filtered.reduce((s, r) => s + r.totalHalala, 0);

      return {
        count: filtered.length,
        purchasesRiyals: fromHalala(totalSubtotalHalala),
        inputVatRiyals: fromHalala(totalVatHalala),
        totalRiyals: fromHalala(totalHalala),
        invoices: filtered.map(r => ({
          id: r.id,
          invoiceNumber: r.invoiceNumber,
          supplierName: r.supplierName,
          issueDate: r.issueDate,
          category: r.category,
          vatRiyals: fromHalala(r.vatAmountHalala),
          totalRiyals: fromHalala(r.totalHalala),
          paymentStatus: r.paymentStatus,
        })),
      };
    }),
});
