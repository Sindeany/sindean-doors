/**
 * analytics.router.ts — لوحة تحليلات BI المتقدمة
 * تقارير المبيعات + أداء الموردين + نسبة الالتزام بالمواعيد
 */

import { z } from "zod/v4";
import { db, schema } from "./db.js";
import { desc, and, gte, lte } from "drizzle-orm";
import { router, adminProcedure } from "./trpc.js";

// ── Helpers ──────────────────────────────────────────────────────────────────
const halalaToRiyals = (h: number) => Math.round(h / 100);

/** تحويل timestamp → "YYYY-MM" */
function tsToYM(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** تحويل "YYYY-MM-DD" → "YYYY-MM" */
function dateToYM(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/** "YYYY-MM" → "YYYY-Q" */
function ymToQuarter(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const q = Math.ceil(m / 3);
  return `${y}-Q${q}`;
}

/** اسم الشهر بالعربية */
const MONTH_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];
function ymToLabel(ym: string): string {
  const [, m] = ym.split("-").map(Number);
  return MONTH_AR[(m - 1) % 12] ?? ym;
}

// ── Router ────────────────────────────────────────────────────────────────────
export const analyticsRouter = router({
  // ── 1. مؤشرات KPI الرئيسية ─────────────────────────────────────────────────
  kpis: adminProcedure.query(async () => {
    const [invoices, distOrders, workOrders, doorOrders, purchaseInvs, rfqs] =
      await Promise.all([
        db.query.taxInvoices.findMany({
          columns: {
            subtotalHalala: true,
            vatAmountHalala: true,
            totalHalala: true,
            status: true,
            paymentStatus: true,
            issueDate: true,
          },
        }),
        db.query.distributorOrders.findMany({
          columns: { totalAmount: true, status: true, createdAt: true },
        }),
        db.query.workOrders.findMany({
          columns: {
            status: true,
            dueDate: true,
            updatedAt: true,
            totalDoors: true,
          },
        }),
        db.query.doorOrders.findMany({
          columns: { status: true, totalPrice: true, createdAt: true },
        }),
        db.query.purchaseInvoices.findMany({
          columns: { totalHalala: true, paymentStatus: true },
        }),
        db.query.rfqs.findMany({
          columns: { id: true, status: true },
        }),
      ]);

    // الإيرادات الكلية (من الفواتير الضريبية)
    const issuedInvs = invoices.filter(i => i.status !== "cancelled");
    const totalRevenueRiyals = halalaToRiyals(
      issuedInvs.reduce((s, i) => s + i.subtotalHalala, 0)
    );
    const totalVatRiyals = halalaToRiyals(
      issuedInvs.reduce((s, i) => s + i.vatAmountHalala, 0)
    );
    const paidRevenueRiyals = halalaToRiyals(
      issuedInvs
        .filter(i => i.paymentStatus === "paid")
        .reduce((s, i) => s + i.totalHalala, 0)
    );

    // طلبات الموزعين
    const distRevenue = distOrders
      .filter(o => o.status !== "cancelled")
      .reduce((s, o) => s + (o.totalAmount ?? 0), 0);

    // إجمالي المشتريات
    const totalPurchasesRiyals = halalaToRiyals(
      purchaseInvs.reduce((s, p) => s + p.totalHalala, 0)
    );

    // هامش الربح التقريبي
    const grossMarginRiyals = totalRevenueRiyals - totalPurchasesRiyals;

    // نسبة الطلبات المكتملة في الموعد
    const completedWOs = workOrders.filter(w => w.status === "completed");
    let onTimeCount = 0;
    for (const wo of completedWOs) {
      const dueTs = new Date(wo.dueDate + "T23:59:59").getTime();
      if (wo.updatedAt <= dueTs) onTimeCount++;
    }
    const onTimePct =
      completedWOs.length > 0
        ? Math.round((onTimeCount / completedWOs.length) * 100)
        : null;

    // إجمالي أبواب منتجة
    const totalDoorsProduced = workOrders
      .filter(w => w.status === "completed" || w.status === "in_progress")
      .reduce((s, w) => s + (w.totalDoors ?? 0), 0);

    // طلبات تجزئة
    const retailRevenue = doorOrders
      .filter(o => o.status !== "cancelled")
      .reduce((s, o) => s + (o.totalPrice ?? 0), 0);

    return {
      totalRevenueRiyals,
      totalVatRiyals,
      paidRevenueRiyals,
      distRevenueRiyals: Math.round(distRevenue),
      retailRevenueRiyals: Math.round(retailRevenue),
      totalPurchasesRiyals,
      grossMarginRiyals,
      grossMarginPct:
        totalRevenueRiyals > 0
          ? Math.round((grossMarginRiyals / totalRevenueRiyals) * 100)
          : 0,
      totalInvoices: issuedInvs.length,
      completedWorkOrders: completedWOs.length,
      onTimePct,
      onTimeCount,
      totalDoorsProduced,
      openRfqs: rfqs.filter(
        r => r.status === "published" || r.status === "evaluated"
      ).length,
    };
  }),

  // ── 2. اتجاه الإيرادات — آخر 12 شهراً ──────────────────────────────────────
  revenueTrend: adminProcedure
    .input(z.object({ months: z.number().int().min(3).max(24).default(12) }))
    .query(async ({ input }) => {
      const [invoices, distOrders, doorOrders] = await Promise.all([
        db.query.taxInvoices.findMany({
          columns: { subtotalHalala: true, status: true, issueDate: true },
        }),
        db.query.distributorOrders.findMany({
          columns: { totalAmount: true, status: true, createdAt: true },
        }),
        db.query.doorOrders.findMany({
          columns: { totalPrice: true, status: true, createdAt: true },
        }),
      ]);

      // بناء الـ 12 شهراً الأخيرة
      const now = new Date();
      const months: string[] = [];
      for (let i = input.months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        );
      }

      // تجميع الإيرادات من الفواتير الضريبية
      const invByMonth: Record<string, number> = {};
      for (const inv of invoices.filter(i => i.status !== "cancelled")) {
        const ym = dateToYM(inv.issueDate);
        invByMonth[ym] =
          (invByMonth[ym] ?? 0) + halalaToRiyals(inv.subtotalHalala);
      }

      // تجميع طلبات الموزعين
      const distByMonth: Record<string, number> = {};
      for (const o of distOrders.filter(o => o.status !== "cancelled")) {
        const ym = tsToYM(o.createdAt);
        distByMonth[ym] = (distByMonth[ym] ?? 0) + (o.totalAmount ?? 0);
      }

      // تجميع طلبات التجزئة
      const retailByMonth: Record<string, number> = {};
      for (const o of doorOrders.filter(o => o.status !== "cancelled")) {
        const ym = tsToYM(o.createdAt);
        retailByMonth[ym] = (retailByMonth[ym] ?? 0) + (o.totalPrice ?? 0);
      }

      return months.map(ym => ({
        ym,
        label: ymToLabel(ym),
        invoicesRevenue: invByMonth[ym] ?? 0,
        distRevenue: Math.round(distByMonth[ym] ?? 0),
        retailRevenue: Math.round(retailByMonth[ym] ?? 0),
        total:
          (invByMonth[ym] ?? 0) +
          Math.round(distByMonth[ym] ?? 0) +
          Math.round(retailByMonth[ym] ?? 0),
      }));
    }),

  // ── 3. تقارير المبيعات حسب الفترة ──────────────────────────────────────────
  salesByPeriod: adminProcedure
    .input(
      z.object({
        period: z.enum(["monthly", "quarterly", "yearly"]).default("monthly"),
        year: z
          .number()
          .int()
          .min(2020)
          .max(2030)
          .default(new Date().getFullYear()),
      })
    )
    .query(async ({ input }) => {
      const [invoices, distOrders] = await Promise.all([
        db.query.taxInvoices.findMany({
          columns: {
            subtotalHalala: true,
            vatAmountHalala: true,
            totalHalala: true,
            status: true,
            paymentStatus: true,
            issueDate: true,
          },
        }),
        db.query.distributorOrders.findMany({
          columns: { totalAmount: true, status: true, createdAt: true },
        }),
      ]);

      type Bucket = {
        key: string;
        label: string;
        invoiceRevenue: number;
        distRevenue: number;
        invoiceCount: number;
        vatAmount: number;
      };
      const buckets: Record<string, Bucket> = {};

      const ensureBucket = (key: string, label: string) => {
        if (!buckets[key]) {
          buckets[key] = {
            key,
            label,
            invoiceRevenue: 0,
            distRevenue: 0,
            invoiceCount: 0,
            vatAmount: 0,
          };
        }
        return buckets[key];
      };

      // تجميع الفواتير الضريبية
      for (const inv of invoices.filter(i => i.status !== "cancelled")) {
        const ym = dateToYM(inv.issueDate);
        const invYear = Number(ym.slice(0, 4));
        if (input.period === "yearly") {
          const b = ensureBucket(String(invYear), String(invYear));
          b.invoiceRevenue += halalaToRiyals(inv.subtotalHalala);
          b.vatAmount += halalaToRiyals(inv.vatAmountHalala);
          b.invoiceCount++;
        } else if (input.period === "quarterly") {
          const qKey = ymToQuarter(ym);
          const qYear = Number(qKey.slice(0, 4));
          if (qYear !== input.year) continue;
          const b = ensureBucket(qKey, qKey.replace("-", " "));
          b.invoiceRevenue += halalaToRiyals(inv.subtotalHalala);
          b.vatAmount += halalaToRiyals(inv.vatAmountHalala);
          b.invoiceCount++;
        } else {
          // monthly
          if (invYear !== input.year) continue;
          const b = ensureBucket(ym, ymToLabel(ym));
          b.invoiceRevenue += halalaToRiyals(inv.subtotalHalala);
          b.vatAmount += halalaToRiyals(inv.vatAmountHalala);
          b.invoiceCount++;
        }
      }

      // تجميع طلبات الموزعين
      for (const o of distOrders.filter(o => o.status !== "cancelled")) {
        const ym = tsToYM(o.createdAt);
        const oYear = Number(ym.slice(0, 4));
        if (input.period === "yearly") {
          ensureBucket(String(oYear), String(oYear)).distRevenue += Math.round(
            o.totalAmount ?? 0
          );
        } else if (input.period === "quarterly") {
          const qKey = ymToQuarter(ym);
          const qYear = Number(qKey.slice(0, 4));
          if (qYear !== input.year) continue;
          ensureBucket(qKey, qKey.replace("-", " ")).distRevenue += Math.round(
            o.totalAmount ?? 0
          );
        } else {
          if (oYear !== input.year) continue;
          ensureBucket(ym, ymToLabel(ym)).distRevenue += Math.round(
            o.totalAmount ?? 0
          );
        }
      }

      // ترتيب وإضافة الإجمالي
      const sorted = Object.values(buckets)
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(b => ({
          ...b,
          total: b.invoiceRevenue + b.distRevenue,
        }));

      const grandTotal = sorted.reduce((s, b) => s + b.total, 0);
      const grandInvRevenue = sorted.reduce((s, b) => s + b.invoiceRevenue, 0);
      const grandDistRevenue = sorted.reduce((s, b) => s + b.distRevenue, 0);
      const grandVat = sorted.reduce((s, b) => s + b.vatAmount, 0);
      const grandInvoiceCount = sorted.reduce((s, b) => s + b.invoiceCount, 0);

      return {
        period: input.period,
        year: input.year,
        data: sorted,
        totals: {
          total: grandTotal,
          invoiceRevenue: grandInvRevenue,
          distRevenue: grandDistRevenue,
          vatAmount: grandVat,
          invoiceCount: grandInvoiceCount,
        },
      };
    }),

  // ── 4. أداء الموردين ─────────────────────────────────────────────────────────
  supplierPerformance: adminProcedure.query(async () => {
    const [purchaseInvs, supplierQuotes, rfqInvitations] = await Promise.all([
      db.query.purchaseInvoices.findMany({
        columns: {
          supplierName: true,
          totalHalala: true,
          vatAmountHalala: true,
          paymentStatus: true,
          category: true,
          issueDate: true,
        },
      }),
      db.query.supplierQuotes.findMany({
        columns: {
          supplierId: true,
          rfqId: true,
          totalPrice: true,
          status: true,
        },
      }),
      db.query.rfqInvitations.findMany({
        columns: { supplierId: true, status: true },
      }),
    ]);

    // تجميع بيانات كل مورد من فواتير المشتريات
    const supplierMap: Record<
      string,
      {
        supplierName: string;
        invoiceCount: number;
        totalSpentRiyals: number;
        vatRiyals: number;
        paidCount: number;
        categories: Set<string>;
        latestDate: string;
      }
    > = {};

    for (const inv of purchaseInvs) {
      const key = inv.supplierName;
      if (!supplierMap[key]) {
        supplierMap[key] = {
          supplierName: key,
          invoiceCount: 0,
          totalSpentRiyals: 0,
          vatRiyals: 0,
          paidCount: 0,
          categories: new Set(),
          latestDate: "",
        };
      }
      const s = supplierMap[key];
      s.invoiceCount++;
      s.totalSpentRiyals += halalaToRiyals(inv.totalHalala);
      s.vatRiyals += halalaToRiyals(inv.vatAmountHalala);
      if (inv.paymentStatus === "paid") s.paidCount++;
      if (inv.category) s.categories.add(inv.category);
      if (inv.issueDate > s.latestDate) s.latestDate = inv.issueDate;
    }

    // ترتيب حسب المبلغ الإجمالي تنازلياً
    const sorted = Object.values(supplierMap)
      .sort((a, b) => b.totalSpentRiyals - a.totalSpentRiyals)
      .map(s => ({
        supplierName: s.supplierName,
        invoiceCount: s.invoiceCount,
        totalSpentRiyals: s.totalSpentRiyals,
        avgPerInvoiceRiyals:
          s.invoiceCount > 0
            ? Math.round(s.totalSpentRiyals / s.invoiceCount)
            : 0,
        vatRiyals: s.vatRiyals,
        paidCount: s.paidCount,
        unpaidCount: s.invoiceCount - s.paidCount,
        categories: Array.from(s.categories),
        latestDate: s.latestDate,
        paymentRate:
          s.invoiceCount > 0
            ? Math.round((s.paidCount / s.invoiceCount) * 100)
            : 0,
      }));

    // توزيع المشتريات حسب الفئة
    const categoryMap: Record<string, number> = {};
    for (const inv of purchaseInvs) {
      const cat = inv.category ?? "other";
      categoryMap[cat] =
        (categoryMap[cat] ?? 0) + halalaToRiyals(inv.totalHalala);
    }
    const categoryBreakdown = Object.entries(categoryMap)
      .map(([category, amountRiyals]) => ({ category, amountRiyals }))
      .sort((a, b) => b.amountRiyals - a.amountRiyals);

    return {
      suppliers: sorted.slice(0, 20), // أكثر 20 مورداً
      totalSuppliers: sorted.length,
      categoryBreakdown,
    };
  }),

  // ── 5. نسبة الالتزام بالمواعيد (On-Time Delivery) ───────────────────────────
  onTimeDelivery: adminProcedure
    .input(z.object({ months: z.number().int().min(1).max(24).default(12) }))
    .query(async ({ input }) => {
      const cutoff = Date.now() - input.months * 30 * 24 * 3600_000;

      const workOrders = await db.query.workOrders.findMany({
        columns: {
          status: true,
          dueDate: true,
          updatedAt: true,
          priority: true,
          totalDoors: true,
          distributorName: true,
        },
      });

      const recent = workOrders.filter(w => w.updatedAt >= cutoff);
      const completed = recent.filter(w => w.status === "completed");

      const onTime: typeof completed = [];
      const late: typeof completed = [];
      for (const wo of completed) {
        const dueTs = new Date(wo.dueDate + "T23:59:59").getTime();
        if (wo.updatedAt <= dueTs) onTime.push(wo);
        else late.push(wo);
      }

      const onTimePct =
        completed.length > 0
          ? Math.round((onTime.length / completed.length) * 100)
          : null;

      // نسبة التأخير حسب الأولوية
      const byPriority = (["vip", "urgent", "normal"] as const).map(p => {
        const pOrders = completed.filter(w => w.priority === p);
        const pOnTime = pOrders.filter(w => {
          const dueTs = new Date(w.dueDate + "T23:59:59").getTime();
          return w.updatedAt <= dueTs;
        });
        return {
          priority: p,
          total: pOrders.length,
          onTime: pOnTime.length,
          pct:
            pOrders.length > 0
              ? Math.round((pOnTime.length / pOrders.length) * 100)
              : null,
        };
      });

      // اتجاه شهري للأشهر الستة الأخيرة
      const now = new Date();
      const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const monthStart = d.getTime();
        const monthEnd = new Date(
          d.getFullYear(),
          d.getMonth() + 1,
          0,
          23,
          59,
          59
        ).getTime();
        const mCompleted = completed.filter(
          w => w.updatedAt >= monthStart && w.updatedAt <= monthEnd
        );
        const mOnTime = mCompleted.filter(w => {
          const dueTs = new Date(w.dueDate + "T23:59:59").getTime();
          return w.updatedAt <= dueTs;
        });
        return {
          ym,
          label: ymToLabel(ym),
          completed: mCompleted.length,
          onTime: mOnTime.length,
          pct:
            mCompleted.length > 0
              ? Math.round((mOnTime.length / mCompleted.length) * 100)
              : null,
        };
      });

      // أوامر متأخرة حالياً (لم تكتمل وتجاوزت تاريخ الاستحقاق)
      const currentlyOverdue = workOrders.filter(w => {
        if (w.status === "completed" || w.status === "cancelled") return false;
        return new Date(w.dueDate) < new Date();
      });

      return {
        totalCompleted: completed.length,
        onTimeCount: onTime.length,
        lateCount: late.length,
        onTimePct,
        byPriority,
        monthlyTrend,
        currentlyOverdue: currentlyOverdue.map(w => ({
          distributorName: w.distributorName,
          dueDate: w.dueDate,
          daysLate: Math.ceil(
            (Date.now() - new Date(w.dueDate).getTime()) / 86400000
          ),
          priority: w.priority,
          totalDoors: w.totalDoors,
        })),
      };
    }),

  // ── 6. مقارنة الإيرادات والمصروفات (P&L Overview) ───────────────────────────
  profitLoss: adminProcedure
    .input(
      z.object({
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
    )
    .query(async ({ input }) => {
      const [invoices, purchases] = await Promise.all([
        db.query.taxInvoices.findMany({
          where: t =>
            and(
              gte(t.issueDate, input.startDate),
              lte(t.issueDate, input.endDate)
            ),
          columns: {
            subtotalHalala: true,
            vatAmountHalala: true,
            totalHalala: true,
            status: true,
            paymentStatus: true,
            invoiceType: true,
          },
        }),
        db.query.purchaseInvoices.findMany({
          columns: {
            subtotalHalala: true,
            totalHalala: true,
            category: true,
            paymentStatus: true,
            issueDate: true,
          },
        }),
      ]);

      const filteredPurchases = purchases.filter(
        p => p.issueDate >= input.startDate && p.issueDate <= input.endDate
      );

      const issued = invoices.filter(i => i.status !== "cancelled");
      const totalRevenueHalala = issued.reduce(
        (s, i) => s + i.subtotalHalala,
        0
      );
      const totalVatOutHalala = issued.reduce(
        (s, i) => s + i.vatAmountHalala,
        0
      );
      const totalCostHalala = filteredPurchases.reduce(
        (s, p) => s + p.subtotalHalala,
        0
      );
      const totalVatInHalala = filteredPurchases.reduce(
        (s, p) => s + (p.totalHalala - p.subtotalHalala),
        0
      );
      const grossProfitHalala = totalRevenueHalala - totalCostHalala;
      const netVatHalala = totalVatOutHalala - totalVatInHalala;

      // توزيع المصروفات حسب الفئة
      const costByCategory: Record<string, number> = {};
      for (const p of filteredPurchases) {
        const cat = p.category ?? "other";
        costByCategory[cat] =
          (costByCategory[cat] ?? 0) + halalaToRiyals(p.subtotalHalala);
      }

      return {
        period: { startDate: input.startDate, endDate: input.endDate },
        revenueRiyals: halalaToRiyals(totalRevenueHalala),
        costRiyals: halalaToRiyals(totalCostHalala),
        grossProfitRiyals: halalaToRiyals(grossProfitHalala),
        grossMarginPct:
          totalRevenueHalala > 0
            ? Math.round((grossProfitHalala / totalRevenueHalala) * 100)
            : 0,
        vatOutRiyals: halalaToRiyals(totalVatOutHalala),
        vatInRiyals: halalaToRiyals(totalVatInHalala),
        netVatRiyals: halalaToRiyals(Math.max(0, netVatHalala)),
        invoiceCount: issued.length,
        purchaseCount: filteredPurchases.length,
        costByCategory: Object.entries(costByCategory)
          .map(([category, amountRiyals]) => ({
            category,
            amountRiyals,
          }))
          .sort((a, b) => b.amountRiyals - a.amountRiyals),
      };
    }),
});
