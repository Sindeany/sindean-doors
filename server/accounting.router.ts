/**
 * Accounting Router — النظام المحاسبي
 * دليل الحسابات + القيود اليومية + تقرير ضريبة القيمة المضافة
 */

import { z } from "zod/v4";
import { db, schema } from "./db.js";
import { eq, desc, gte, lte, and, sql } from "drizzle-orm";
import { router, adminProcedure } from "./trpc.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
export const fromHalala = (h: number) => (h / 100).toFixed(2);
export const toHalala = (r: number) => Math.round(r * 100);

export function formatEntryNumber(counter: number, year: number) {
  return `JE-${year}-${String(counter).padStart(6, "0")}`;
}

// ── Default Chart of Accounts (seed data) ─────────────────────────────────────
export const DEFAULT_ACCOUNTS = [
  // ── الأصول ───────────────────────────────────────────────────────────────
  {
    code: "1000",
    name: "الأصول",
    nameEn: "Assets",
    type: "asset" as const,
    normalBalance: "debit" as const,
    parentCode: null,
    isSystem: true,
  },
  {
    code: "1100",
    name: "الأصول المتداولة",
    nameEn: "Current Assets",
    type: "asset" as const,
    normalBalance: "debit" as const,
    parentCode: "1000",
    isSystem: true,
  },
  {
    code: "1110",
    name: "النقد والبنك",
    nameEn: "Cash & Bank",
    type: "asset" as const,
    normalBalance: "debit" as const,
    parentCode: "1100",
    isSystem: true,
  },
  {
    code: "1120",
    name: "الذمم المدينة — العملاء",
    nameEn: "Accounts Receivable",
    type: "asset" as const,
    normalBalance: "debit" as const,
    parentCode: "1100",
    isSystem: true,
  },
  {
    code: "1130",
    name: "المخزون",
    nameEn: "Inventory",
    type: "asset" as const,
    normalBalance: "debit" as const,
    parentCode: "1100",
    isSystem: false,
  },
  {
    code: "1200",
    name: "الأصول الثابتة",
    nameEn: "Fixed Assets",
    type: "asset" as const,
    normalBalance: "debit" as const,
    parentCode: "1000",
    isSystem: false,
  },
  {
    code: "1210",
    name: "الآلات والمعدات",
    nameEn: "Machinery & Equipment",
    type: "asset" as const,
    normalBalance: "debit" as const,
    parentCode: "1200",
    isSystem: false,
  },
  {
    code: "1220",
    name: "مجمع الإهلاك",
    nameEn: "Accumulated Depreciation",
    type: "asset" as const,
    normalBalance: "credit" as const,
    parentCode: "1200",
    isSystem: false,
  },
  // ── الخصوم ───────────────────────────────────────────────────────────────
  {
    code: "2000",
    name: "الخصوم",
    nameEn: "Liabilities",
    type: "liability" as const,
    normalBalance: "credit" as const,
    parentCode: null,
    isSystem: true,
  },
  {
    code: "2100",
    name: "الخصوم المتداولة",
    nameEn: "Current Liabilities",
    type: "liability" as const,
    normalBalance: "credit" as const,
    parentCode: "2000",
    isSystem: true,
  },
  {
    code: "2110",
    name: "الذمم الدائنة — الموردون",
    nameEn: "Accounts Payable",
    type: "liability" as const,
    normalBalance: "credit" as const,
    parentCode: "2100",
    isSystem: false,
  },
  {
    code: "2120",
    name: "ضريبة القيمة المضافة المستحقة",
    nameEn: "VAT Payable",
    type: "liability" as const,
    normalBalance: "credit" as const,
    parentCode: "2100",
    isSystem: true,
  },
  // ── حقوق الملكية ──────────────────────────────────────────────────────────
  {
    code: "3000",
    name: "حقوق الملكية",
    nameEn: "Equity",
    type: "equity" as const,
    normalBalance: "credit" as const,
    parentCode: null,
    isSystem: false,
  },
  {
    code: "3100",
    name: "رأس المال",
    nameEn: "Capital",
    type: "equity" as const,
    normalBalance: "credit" as const,
    parentCode: "3000",
    isSystem: false,
  },
  {
    code: "3200",
    name: "الأرباح المحتجزة",
    nameEn: "Retained Earnings",
    type: "equity" as const,
    normalBalance: "credit" as const,
    parentCode: "3000",
    isSystem: false,
  },
  // ── الإيرادات ─────────────────────────────────────────────────────────────
  {
    code: "4000",
    name: "الإيرادات",
    nameEn: "Revenue",
    type: "revenue" as const,
    normalBalance: "credit" as const,
    parentCode: null,
    isSystem: true,
  },
  {
    code: "4100",
    name: "إيرادات مبيعات الأبواب",
    nameEn: "Door Sales Revenue",
    type: "revenue" as const,
    normalBalance: "credit" as const,
    parentCode: "4000",
    isSystem: true,
  },
  {
    code: "4110",
    name: "مبيعات الموزعين",
    nameEn: "Distributor Sales",
    type: "revenue" as const,
    normalBalance: "credit" as const,
    parentCode: "4100",
    isSystem: false,
  },
  {
    code: "4120",
    name: "مبيعات التجزئة",
    nameEn: "Retail Sales",
    type: "revenue" as const,
    normalBalance: "credit" as const,
    parentCode: "4100",
    isSystem: false,
  },
  // ── المصروفات ─────────────────────────────────────────────────────────────
  {
    code: "5000",
    name: "المصروفات",
    nameEn: "Expenses",
    type: "expense" as const,
    normalBalance: "debit" as const,
    parentCode: null,
    isSystem: false,
  },
  {
    code: "5100",
    name: "تكلفة البضاعة المباعة",
    nameEn: "Cost of Goods Sold",
    type: "expense" as const,
    normalBalance: "debit" as const,
    parentCode: "5000",
    isSystem: false,
  },
  {
    code: "5200",
    name: "مصاريف التشغيل",
    nameEn: "Operating Expenses",
    type: "expense" as const,
    normalBalance: "debit" as const,
    parentCode: "5000",
    isSystem: false,
  },
  {
    code: "5300",
    name: "مصاريف الإدارة والعمومية",
    nameEn: "General & Admin Expenses",
    type: "expense" as const,
    normalBalance: "debit" as const,
    parentCode: "5000",
    isSystem: false,
  },
];

// ── Router ────────────────────────────────────────────────────────────────────
export const accountingRouter = router({
  // ── دليل الحسابات ──────────────────────────────────────────────────────────
  getAccounts: adminProcedure.query(async () => {
    return db.query.accounts.findMany({ orderBy: [schema.accounts.code] });
  }),

  seedDefaultAccounts: adminProcedure.mutation(async () => {
    const now = Date.now();
    for (const acc of DEFAULT_ACCOUNTS) {
      // INSERT IGNORE equivalent — skip if code already exists
      await db
        .insert(schema.accounts)
        .values({
          ...acc,
          parentCode: acc.parentCode ?? undefined,
          createdAt: now,
        })
        .onDuplicateKeyUpdate({ set: { name: acc.name } }); // no-op update to satisfy syntax
    }
    return { success: true, count: DEFAULT_ACCOUNTS.length };
  }),

  createAccount: adminProcedure
    .input(
      z.object({
        code: z.string().min(2).max(10),
        name: z.string().min(1),
        nameEn: z.string().default(""),
        type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
        normalBalance: z.enum(["debit", "credit"]),
        parentCode: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await db.insert(schema.accounts).values({
        ...input,
        isSystem: false,
        isActive: true,
        createdAt: Date.now(),
      });
      return { success: true };
    }),

  toggleAccount: adminProcedure
    .input(z.object({ id: z.number().int(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      await db
        .update(schema.accounts)
        .set({ isActive: input.isActive })
        .where(eq(schema.accounts.id, input.id));
      return { success: true };
    }),

  // ── القيود اليومية ─────────────────────────────────────────────────────────
  getJournalEntries: adminProcedure
    .input(
      z
        .object({
          sourceType: z
            .enum(["invoice", "payment", "manual", "vat_settlement"])
            .optional(),
          limit: z.number().int().max(100).default(50),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const entries = await db.query.journalEntries.findMany({
        orderBy: [desc(schema.journalEntries.createdAt)],
        limit: input?.limit ?? 50,
      });
      // attach lines
      const ids = entries.map(e => e.id);
      if (ids.length === 0) return [];
      const lines = await db.query.journalLines.findMany({
        where: t =>
          sql`${t.journalEntryId} IN (${sql.join(
            ids.map(id => sql`${id}`),
            sql`, `
          )})`,
        orderBy: [schema.journalLines.sequence],
      });
      const linesByEntry: Record<number, typeof lines> = {};
      lines.forEach(l => {
        (linesByEntry[l.journalEntryId] ??= []).push(l);
      });
      return entries
        .filter(e => !input?.sourceType || e.sourceType === input.sourceType)
        .map(e => ({
          ...e,
          lines: linesByEntry[e.id] ?? [],
          totalDebitRiyals: fromHalala(e.totalDebitHalala),
          totalCreditRiyals: fromHalala(e.totalCreditHalala),
        }));
    }),

  // ── إنشاء قيد يدوي ─────────────────────────────────────────────────────────
  createManualEntry: adminProcedure
    .input(
      z.object({
        entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        description: z.string().min(1),
        lines: z
          .array(
            z.object({
              accountCode: z.string().min(2),
              accountName: z.string().min(1),
              debitRiyals: z.number().nonnegative().default(0),
              creditRiyals: z.number().nonnegative().default(0),
              description: z.string().default(""),
            })
          )
          .min(2),
      })
    )
    .mutation(async ({ input }) => {
      // Validate balanced entry
      const totalDebit = input.lines.reduce((s, l) => s + l.debitRiyals, 0);
      const totalCredit = input.lines.reduce((s, l) => s + l.creditRiyals, 0);
      if (Math.abs(totalDebit - totalCredit) > 0.001) {
        throw new Error(
          "القيد غير متوازن: مجموع المدين يجب أن يساوي مجموع الدائن"
        );
      }
      const now = Date.now();
      const year = new Date().getFullYear();

      // atomic counter on zatca_settings (reuse existing counter pattern)
      // use journalEntries count + 1 as sequence
      const countResult = await db
        .select({ cnt: sql<number>`COUNT(*)` })
        .from(schema.journalEntries);
      const counter = (countResult[0]?.cnt ?? 0) + 1;
      const entryNumber = formatEntryNumber(counter, year);

      const totalDebitHalala = toHalala(totalDebit);
      const totalCreditHalala = toHalala(totalCredit);

      const [result] = await db.insert(schema.journalEntries).values({
        entryNumber,
        entryDate: input.entryDate,
        description: input.description,
        sourceType: "manual",
        totalDebitHalala,
        totalCreditHalala,
        isPosted: true,
        createdAt: now,
        updatedAt: now,
      });
      const entryId = Number((result as any).insertId);

      await db.insert(schema.journalLines).values(
        input.lines.map((l, i) => ({
          journalEntryId: entryId,
          accountCode: l.accountCode,
          accountName: l.accountName,
          debitHalala: toHalala(l.debitRiyals),
          creditHalala: toHalala(l.creditRiyals),
          description: l.description,
          sequence: i + 1,
        }))
      );
      return { success: true, entryNumber };
    }),

  // ── تسجيل قيد الفاتورة الضريبية (Invoice → Journal Entry) ─────────────────
  postInvoiceEntry: adminProcedure
    .input(z.object({ invoiceId: z.number().int() }))
    .mutation(async ({ input }) => {
      // Check not already posted
      const existing = await db.query.journalEntries.findFirst({
        where: t =>
          and(eq(t.sourceType, "invoice"), eq(t.sourceId, input.invoiceId)),
      });
      if (existing) throw new Error("تم تسجيل قيد لهذه الفاتورة مسبقاً");

      const inv = await db.query.taxInvoices.findFirst({
        where: t => eq(t.id, input.invoiceId),
      });
      if (!inv) throw new Error("الفاتورة غير موجودة");
      if (inv.status === "cancelled")
        throw new Error("لا يمكن تسجيل قيد لفاتورة ملغاة");

      const now = Date.now();
      const year = new Date().getFullYear();
      const countResult = await db
        .select({ cnt: sql<number>`COUNT(*)` })
        .from(schema.journalEntries);
      const counter = (countResult[0]?.cnt ?? 0) + 1;
      const entryNumber = formatEntryNumber(counter, year);

      /*
       * Dr 1120 الذمم المدينة             = totalHalala
       * Cr 4100 إيرادات مبيعات الأبواب   = subtotalHalala
       * Cr 2120 ضريبة القيمة المضافة     = vatAmountHalala
       */
      const [result] = await db.insert(schema.journalEntries).values({
        entryNumber,
        entryDate: inv.issueDate,
        description: `فاتورة ضريبية رقم ${inv.invoiceNumber} — ${inv.buyerName}`,
        sourceType: "invoice",
        sourceId: input.invoiceId,
        totalDebitHalala: inv.totalHalala,
        totalCreditHalala: inv.totalHalala,
        isPosted: true,
        createdAt: now,
        updatedAt: now,
      });
      const entryId = Number((result as any).insertId);

      await db.insert(schema.journalLines).values([
        {
          journalEntryId: entryId,
          accountCode: "1120",
          accountName: "الذمم المدينة — العملاء",
          debitHalala: inv.totalHalala,
          creditHalala: 0,
          description: inv.invoiceNumber,
          sequence: 1,
        },
        {
          journalEntryId: entryId,
          accountCode: "4100",
          accountName: "إيرادات مبيعات الأبواب",
          debitHalala: 0,
          creditHalala: inv.subtotalHalala,
          description: inv.invoiceNumber,
          sequence: 2,
        },
        {
          journalEntryId: entryId,
          accountCode: "2120",
          accountName: "ضريبة القيمة المضافة المستحقة",
          debitHalala: 0,
          creditHalala: inv.vatAmountHalala,
          description: `ضريبة ${inv.invoiceNumber}`,
          sequence: 3,
        },
      ]);
      return { success: true, entryNumber };
    }),

  // ── تسجيل قيد استلام دفعة (Payment Received) ──────────────────────────────
  postPaymentEntry: adminProcedure
    .input(z.object({ invoiceId: z.number().int() }))
    .mutation(async ({ input }) => {
      const existing = await db.query.journalEntries.findFirst({
        where: t =>
          and(eq(t.sourceType, "payment"), eq(t.sourceId, input.invoiceId)),
      });
      if (existing) throw new Error("تم تسجيل قيد الدفع لهذه الفاتورة مسبقاً");

      const inv = await db.query.taxInvoices.findFirst({
        where: t => eq(t.id, input.invoiceId),
      });
      if (!inv) throw new Error("الفاتورة غير موجودة");
      if (inv.paymentStatus !== "paid")
        throw new Error("الفاتورة لم تُدفع بعد");

      const now = Date.now();
      const year = new Date().getFullYear();
      const countResult = await db
        .select({ cnt: sql<number>`COUNT(*)` })
        .from(schema.journalEntries);
      const counter = (countResult[0]?.cnt ?? 0) + 1;
      const entryNumber = formatEntryNumber(counter, year);

      /*
       * Dr 1110 النقد والبنك        = totalHalala
       * Cr 1120 الذمم المدينة       = totalHalala
       */
      const [result] = await db.insert(schema.journalEntries).values({
        entryNumber,
        entryDate: inv.issueDate,
        description: `استلام دفعة — فاتورة ${inv.invoiceNumber} — ${inv.buyerName}`,
        sourceType: "payment",
        sourceId: input.invoiceId,
        totalDebitHalala: inv.totalHalala,
        totalCreditHalala: inv.totalHalala,
        isPosted: true,
        createdAt: now,
        updatedAt: now,
      });
      const entryId = Number((result as any).insertId);

      await db.insert(schema.journalLines).values([
        {
          journalEntryId: entryId,
          accountCode: "1110",
          accountName: "النقد والبنك",
          debitHalala: inv.totalHalala,
          creditHalala: 0,
          description: `دفعة ${inv.invoiceNumber}`,
          sequence: 1,
        },
        {
          journalEntryId: entryId,
          accountCode: "1120",
          accountName: "الذمم المدينة — العملاء",
          debitHalala: 0,
          creditHalala: inv.totalHalala,
          description: `تسوية ${inv.invoiceNumber}`,
          sequence: 2,
        },
      ]);
      return { success: true, entryNumber };
    }),

  // ── تقرير ضريبة القيمة المضافة ─────────────────────────────────────────────
  getVatReport: adminProcedure
    .input(
      z.object({
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
    )
    .query(async ({ input }) => {
      const invoices = await db.query.taxInvoices.findMany({
        where: t =>
          and(
            gte(t.issueDate, input.startDate),
            lte(t.issueDate, input.endDate)
          ),
      });

      const issued = invoices.filter(i => i.status !== "cancelled");
      const outputVatHalala = issued.reduce((s, i) => s + i.vatAmountHalala, 0);
      const salesHalala = issued.reduce((s, i) => s + i.subtotalHalala, 0);
      const totalWithVatHalala = issued.reduce((s, i) => s + i.totalHalala, 0);

      const paidInvoices = issued.filter(i => i.paymentStatus === "paid");
      const collectedVatHalala = paidInvoices.reduce(
        (s, i) => s + i.vatAmountHalala,
        0
      );

      // ضريبة المدخلات — من فواتير المشتريات
      const purchaseRows = await db.query.purchaseInvoices.findMany({
        where: p =>
          and(
            gte(p.issueDate, input.startDate),
            lte(p.issueDate, input.endDate)
          ),
      });
      const inputVatHalala = purchaseRows.reduce(
        (s, p) => s + p.vatAmountHalala,
        0
      );
      const netVatPayableHalala = outputVatHalala - inputVatHalala;

      // Breakdown by invoice type
      const standardInvoices = issued.filter(i => i.invoiceType === "standard");
      const simplifiedInvoices = issued.filter(
        i => i.invoiceType === "simplified"
      );

      return {
        period: { startDate: input.startDate, endDate: input.endDate },
        summary: {
          invoiceCount: issued.length,
          salesRiyals: fromHalala(salesHalala),
          outputVatRiyals: fromHalala(outputVatHalala),
          totalWithVatRiyals: fromHalala(totalWithVatHalala),
          inputVatRiyals: fromHalala(inputVatHalala),
          netVatPayableRiyals: fromHalala(Math.max(0, netVatPayableHalala)),
          netVatRefundRiyals:
            netVatPayableHalala < 0
              ? fromHalala(Math.abs(netVatPayableHalala))
              : "0.00",
          collectedVatRiyals: fromHalala(collectedVatHalala),
          uncollectedVatRiyals: fromHalala(
            outputVatHalala - collectedVatHalala
          ),
          purchaseCount: purchaseRows.length,
        },
        byType: {
          standard: {
            count: standardInvoices.length,
            salesRiyals: fromHalala(
              standardInvoices.reduce((s, i) => s + i.subtotalHalala, 0)
            ),
            vatRiyals: fromHalala(
              standardInvoices.reduce((s, i) => s + i.vatAmountHalala, 0)
            ),
          },
          simplified: {
            count: simplifiedInvoices.length,
            salesRiyals: fromHalala(
              simplifiedInvoices.reduce((s, i) => s + i.subtotalHalala, 0)
            ),
            vatRiyals: fromHalala(
              simplifiedInvoices.reduce((s, i) => s + i.vatAmountHalala, 0)
            ),
          },
        },
        invoices: issued.map(i => ({
          invoiceNumber: i.invoiceNumber,
          issueDate: i.issueDate,
          buyerName: i.buyerName,
          buyerVatNumber: i.buyerVatNumber,
          invoiceType: i.invoiceType,
          salesRiyals: fromHalala(i.subtotalHalala),
          vatRiyals: fromHalala(i.vatAmountHalala),
          totalRiyals: fromHalala(i.totalHalala),
          paymentStatus: i.paymentStatus,
          status: i.status,
        })),
      };
    }),

  // ── أرصدة الحسابات الرئيسية ─────────────────────────────────────────────────
  getAccountBalances: adminProcedure.query(async () => {
    const lines = await db.query.journalLines.findMany();
    const balances: Record<string, { debit: number; credit: number }> = {};
    for (const l of lines) {
      if (!balances[l.accountCode])
        balances[l.accountCode] = { debit: 0, credit: 0 };
      balances[l.accountCode].debit += l.debitHalala;
      balances[l.accountCode].credit += l.creditHalala;
    }
    const accs = await db.query.accounts.findMany({
      orderBy: [schema.accounts.code],
    });
    return accs.map(a => {
      const b = balances[a.code] ?? { debit: 0, credit: 0 };
      const net =
        a.normalBalance === "debit" ? b.debit - b.credit : b.credit - b.debit;
      return {
        ...a,
        debitHalala: b.debit,
        creditHalala: b.credit,
        balanceHalala: net,
        balanceRiyals: fromHalala(Math.abs(net)),
        isNegative: net < 0,
      };
    });
  }),
});
