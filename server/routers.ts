import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { db, schema } from "./db.js";
import { eq, desc, like, or, ne } from "drizzle-orm";
import { router, publicProcedure, adminProcedure } from "./trpc.js";
import { suppliersRouter } from "./suppliers.router.js";
import { rfqRouter } from "./rfq.router.js";
import { commentsRouter } from "./comments.router.js";
import {
  productOptionsRouter,
  distributorOrdersRouter,
} from "./productOptions.router.js";
import { paymentsRouter } from "./payments.router.js";
import { zatcaRouter } from "./zatca.router.js";
import { createInvoiceFromOrder } from "./zatca.service.js";
import { adminAuthRouter } from "./admin.router.js";
import { usersRouter } from "./users.router.js";
import { inventoryRouter } from "./inventory.router.js";
import { distributorsAdminRouter } from "./distributors-admin.router.js";
import { distributorsRouter } from "./distributors.router.js";
import { complaintsRouter } from "./complaints.router.js";
import { qcRouter } from "./qc.router.js";
import { packingRouter } from "./packing.router.js";
import { workOrdersRouter } from "./workOrders.router.js";
import { decisionLogRouter } from "./decisionLog.router.js";
import { postOrderReviewRouter } from "./postOrderReview.router.js";
import { dailySummaryRouter } from "./dailySummary.router.js";
import { accountingRouter } from "./accounting.router.js";
import { purchasesRouter } from "./purchases.router.js";
import { productsRouter } from "./products.router.js";
import { productionRouter } from "./production.router.js";
import { analyticsRouter } from "./analytics.router.js";
import { customerPortalRouter } from "./customer-portal.router.js";
import { sendOrderConfirmation } from "./email.js";

// ── Owner Notification Helper ────────────────────────────────────────────────
async function notifyOwner(title: string, content: string): Promise<void> {
  const apiUrl = process.env.BUILT_IN_FORGE_API_URL;
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  if (!apiUrl || !apiKey || !ownerOpenId) return;
  try {
    await fetch(`${apiUrl}/v1/notification/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ open_id: ownerOpenId, title, content }),
    });
  } catch {
    // Notification failure should not block order creation
  }
}

// ── tRPC init ────────────────────────────────────────────────────────────────
// الـ instance المشترك مُعرَّف في trpc.ts

// ── Orders Router ────────────────────────────────────────────────────────────
function getStatusForStage(stage: string): "confirmed" | "manufacturing" | "shipped" | "delivered" {
  switch (stage) {
    case "po_review":
    case "catalog_match":
    case "job_order_file":
    case "sample_approval":
    case "production_planning":
      return "confirmed";
    case "material_procurement":
    case "incoming_qc":
    case "work_order":
    case "final_qc":
    case "po_matching":
      return "manufacturing";
    case "packing":
    case "delivery_docs":
      return "shipped";
    case "delivery":
    case "accounting_close":
    case "post_order_review":
      return "delivered";
    default:
      return "confirmed";
  }
}

const ordersRouter = router({
  // Create a new door order
  create: publicProcedure
    .input(
      z.object({
        customerName: z.string().min(1),
        customerPhone: z.string().min(1),
        customerEmail: z.string().email().optional().or(z.literal("")),
        productId: z.string(),
        productName: z.string(),
        selections: z.record(z.string(), z.string()),
        subSelections: z.record(z.string(), z.unknown()),
        dimensions: z.record(z.string(), z.unknown()).optional(),
        basePrice: z.number().default(0),
        totalPrice: z.number().default(0),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const now = Date.now();
      const [result] = await db.insert(schema.doorOrders).values({
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail || null,
        productId: input.productId,
        productName: input.productName,
        selections: input.selections,
        subSelections: input.subSelections,
        dimensions: input.dimensions || null,
        basePrice: input.basePrice,
        totalPrice: input.totalPrice,
        notes: input.notes || null,
        status: "new",
        createdAt: now,
        updatedAt: now,
      });
      const orderId = (result as any).insertId;

      // Non-blocking post-insert side effects
      const dimText = input.dimensions
        ? Object.entries(input.dimensions)
            .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v} سم`)
            .join(" | ")
        : "غير محدد";

      // Notify owner
      notifyOwner(
        `🚪 طلب جديد #${orderId} — ${input.productName}`,
        `العميل: ${input.customerName}\nالجوال: ${input.customerPhone}${input.customerEmail ? `\nالبريد: ${input.customerEmail}` : ""}\nالمنتج: ${input.productName}\nالسعر: ${input.totalPrice.toLocaleString()} ر.س\nالمقاسات: ${dimText}${input.notes ? `\nملاحظات: ${input.notes}` : ""}`
      );

      // Send email confirmation to customer (only if email provided)
      if (input.customerEmail) {
        sendOrderConfirmation({
          orderId,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          productName: input.productName,
          selections: input.selections,
          dimensions: input.dimensions,
          totalPrice: input.totalPrice,
          notes: input.notes,
        });
      }

      return { id: orderId, success: true };
    }),

  // Get all orders (admin only)
  list: adminProcedure
    .input(
      z
        .object({
          status: z
            .enum([
              "new",
              "reviewing",
              "confirmed",
              "in_production",
              "ready",
              "delivered",
              "cancelled",
            ])
            .nullable()
            .optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const orders = await db.query.doorOrders.findMany({
        orderBy: [desc(schema.doorOrders.createdAt)],
        where: input?.status
          ? eq(schema.doorOrders.status, input.status)
          : ne(schema.doorOrders.status, "cancelled"),
      });
      return orders.map((order) => ({
        ...order,
        sizes: typeof (order as any).dimensions === "string"
          ? JSON.parse((order as any).dimensions || "{}")
          : (order as any).dimensions,
        options: typeof (order as any).selections === "string"
          ? JSON.parse((order as any).selections || "{}")
          : (order as any).selections,
      }));
    }),

  // Dashboard statistics (admin only)
  stats: adminProcedure.query(async () => {
    const allOrders = await db.query.doorOrders.findMany({
      orderBy: [desc(schema.doorOrders.createdAt)],
    });

    // Status counts
    const statusCounts: Record<string, number> = {};
    for (const o of allOrders)
      statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;

    // Monthly aggregation — last 7 months
    const ARABIC_MONTHS = [
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
    const EN_MONTHS = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const now = new Date();
    const monthlyMap: Record<
      string,
      { revenue: number; orders: number; month: string; monthEn: string }
    > = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] = {
        revenue: 0,
        orders: 0,
        month: ARABIC_MONTHS[d.getMonth()],
        monthEn: EN_MONTHS[d.getMonth()],
      };
    }
    for (const o of allOrders) {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyMap[key]) {
        monthlyMap[key].revenue += o.totalPrice;
        monthlyMap[key].orders += 1;
      }
    }

    const totalRevenue = allOrders.reduce((s, o) => s + o.totalPrice, 0);
    const totalOrders = allOrders.length;
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const cm = monthlyMap[currentKey];

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue:
        totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      thisMonthRevenue: cm?.revenue ?? 0,
      thisMonthOrders: cm?.orders ?? 0,
      statusCounts,
      monthly: Object.values(monthlyMap),
      recentOrders: allOrders.slice(0, 20),
    };
  }),

  // Get single order (admin only)
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const order = await db.query.doorOrders.findFirst({
        where: eq(schema.doorOrders.id, input.id),
      });
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      return {
        ...order,
        sizes: typeof (order as any).dimensions === "string"
          ? JSON.parse((order as any).dimensions || "{}")
          : (order as any).dimensions,
        options: typeof (order as any).selections === "string"
          ? JSON.parse((order as any).selections || "{}")
          : (order as any).selections,
      };
    }),

  // Update order status (admin only)
  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum([
          "new",
          "reviewing",
          "confirmed",
          "in_production",
          "ready",
          "delivered",
          "cancelled",
        ]),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(schema.doorOrders)
        .set({ status: input.status, updatedAt: Date.now() })
        .where(eq(schema.doorOrders.id, input.id));

      // ── إنشاء فاتورة ZATCA تلقائياً عند تأكيد الطلب ─────────────────────────
      if (input.status === "confirmed") {
        // fire-and-forget: فشل إنشاء الفاتورة لا يوقف تحديث حالة الطلب
        createInvoiceFromOrder(input.id).catch(() => {
          /* الخطأ يُحفظ في سجل الفاتورة */
        });
      }

      return { success: true };
    }),

  // Delete order (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db
        .delete(schema.doorOrders)
        .where(eq(schema.doorOrders.id, input.id));
      return { success: true };
    }),

  // Dashboard KPIs — aggregates from all admin tables
  kpis: adminProcedure.query(async () => {
    const [
      distributorRows,
      complaintRows,
      workOrderRows,
      qcRows,
      packingRows,
      reviewRows,
      doorOrderRows,
      inventoryRows,
    ] = await Promise.all([
      db.query.distributors.findMany({ columns: { status: true } }),
      db.query.complaints.findMany({ columns: { status: true } }),
      db.query.workOrders.findMany({ columns: { status: true } }),
      db.query.qcInspections.findMany({ columns: { result: true } }),
      db.query.packingOrders.findMany({ columns: { packingStatus: true } }),
      db.query.postOrderReviews.findMany({
        columns: { status: true, clientRating: true },
      }),
      db.query.doorOrders.findMany({ columns: { status: true } }),
      db.query.inventoryItems.findMany({ columns: { currentQty: true, minQty: true } }),
    ]);

    const activeDistributors = distributorRows.filter(
      d => d.status === "active"
    ).length;
    const pendingDistributors = distributorRows.filter(
      d => d.status === "pending"
    ).length;
    const openComplaints = complaintRows.filter(
      c => c.status === "open" || c.status === "under_review"
    ).length;
    const inProductionWorkOrders = workOrderRows.filter(
      w => w.status === "in_progress"
    ).length;
    const qcTotal = qcRows.length;
    const qcPass = qcRows.filter(q => q.result === "pass").length;
    const qcPassRate = qcTotal > 0 ? Math.round((qcPass / qcTotal) * 100) : 0;
    const pendingQc = qcRows.filter(q => q.result === "pending").length;
    const pendingPacking = packingRows.filter(
      p => p.packingStatus === "pending"
    ).length;
    const pendingReviews = reviewRows.filter(
      r => r.status === "pending_review"
    ).length;
    const avgReviewRating =
      reviewRows.length > 0
        ? Math.round(
            (reviewRows.reduce((sum, r) => sum + r.clientRating, 0) /
              reviewRows.length) *
              10
          ) / 10
        : 0;

    const activeOrdersCount = doorOrderRows.filter(
      o => o.status !== "delivered" && o.status !== "cancelled"
    ).length;
    const inventoryTotalItems = inventoryRows.length;
    const inventoryLowStockAlerts = inventoryRows.filter(
      item => item.currentQty <= item.minQty
    ).length;

    return {
      activeDistributors,
      pendingDistributors,
      openComplaints,
      inProductionWorkOrders,
      qcPassRate,
      qcTotal,
      pendingQc,
      pendingPacking,
      pendingReviews,
      avgReviewRating,
      activeOrdersCount,
      inventoryTotalItems,
      inventoryLowStockAlerts,
    };
  }),

  // Update workflow stage (admin only)
  updateWorkflowStage: adminProcedure
    .input(
      z.object({
        id: z.number(),
        workflowStage: z.string().max(50),
        workflowStagesData: z
          .record(
            z.string(),
            z.object({
              status: z.enum([
                "pending",
                "in_progress",
                "done",
                "blocked",
                "skipped",
              ]),
              completedAt: z.string().optional(),
              notes: z.string().optional(),
              assignee: z.string().optional(),
            })
          )
          .optional(),
        priority: z.enum(["normal", "urgent", "vip"]).optional(),
        expectedDelivery: z.number().optional(),
        totalDoors: z.number().int().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(schema.doorOrders)
        .set({
          workflowStage: input.workflowStage,
          ...(input.workflowStagesData !== undefined && {
            workflowStagesData: input.workflowStagesData,
          }),
          ...(input.priority !== undefined && { priority: input.priority }),
          ...(input.expectedDelivery !== undefined && {
            expectedDelivery: input.expectedDelivery,
          }),
          ...(input.totalDoors !== undefined && {
            totalDoors: input.totalDoors,
          }),
          updatedAt: Date.now(),
        })
        .where(eq(schema.doorOrders.id, input.id));

      // Sync distributor order status if applicable
      const doorOrder = await db.query.doorOrders.findFirst({
        where: eq(schema.doorOrders.id, input.id),
      });

      if (doorOrder && doorOrder.notes && doorOrder.notes.startsWith("DIST_ORDER_ID:")) {
        const prefix = doorOrder.notes.split(" - ")[0]; // "DIST_ORDER_ID:12"
        const distOrderIdStr = prefix.replace("DIST_ORDER_ID:", "");
        const distOrderId = parseInt(distOrderIdStr, 10);
        if (!isNaN(distOrderId)) {
          // Fetch all items linked to this distributor order
          const linkedOrders = await db.query.doorOrders.findMany({
            where: like(schema.doorOrders.notes, `DIST_ORDER_ID:${distOrderId}%`),
          });

          if (linkedOrders.length > 0) {
            const itemStatuses = linkedOrders.map(o => getStatusForStage(o.workflowStage || "po_review"));
            
            let parentStatus: "confirmed" | "manufacturing" | "shipped" | "delivered" = "confirmed";
            const allDelivered = itemStatuses.every(s => s === "delivered");
            const allShippedOrDelivered = itemStatuses.every(s => s === "shipped" || s === "delivered");
            const anyMfgOrHigher = itemStatuses.some(s => s === "manufacturing" || s === "shipped" || s === "delivered");

            if (allDelivered) {
              parentStatus = "delivered";
            } else if (allShippedOrDelivered) {
              parentStatus = "shipped";
            } else if (anyMfgOrHigher) {
              parentStatus = "manufacturing";
            } else {
              parentStatus = "confirmed";
            }

            await db
              .update(schema.distributorOrders)
              .set({ status: parentStatus, updatedAt: Date.now() })
              .where(eq(schema.distributorOrders.id, distOrderId));
          }
        }
      }

      return { success: true };
    }),

  // Update payment status (admin only)
  updatePaymentStatus: adminProcedure
    .input(
      z.object({
        id: z.number(),
        paymentStatus: z.enum(["unpaid", "partial", "paid"]),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(schema.doorOrders)
        .set({ paymentStatus: input.paymentStatus, updatedAt: Date.now() })
        .where(eq(schema.doorOrders.id, input.id));
      return { success: true };
    }),

  // ── Analytics — رسوم بيانية محسّنة ──────────────────────────────────────
  analytics: adminProcedure.query(async () => {
    const allOrders = await db.query.doorOrders.findMany({
      orderBy: [desc(schema.doorOrders.createdAt)],
    });

    const now = Date.now();
    const MS_PER_DAY = 86_400_000;

    // ── Top products (last 90 days) ─────────────────────────────────────
    const cutoff90 = now - 90 * MS_PER_DAY;
    const recent90 = allOrders.filter(o => o.createdAt >= cutoff90);
    const productMap: Record<string, { orders: number; revenue: number }> = {};
    for (const o of recent90) {
      const key = o.productName ?? "غير محدد";
      if (!productMap[key]) productMap[key] = { orders: 0, revenue: 0 };
      productMap[key].orders += 1;
      productMap[key].revenue += o.totalPrice;
    }
    const topProducts = Object.entries(productMap)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 8);

    // ── Daily trend — last 30 days ───────────────────────────────────────
    const daily: { date: string; orders: number; revenue: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(now - i * MS_PER_DAY);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = dayStart.getTime() + MS_PER_DAY;
      const dayOrders = allOrders.filter(
        o => o.createdAt >= dayStart.getTime() && o.createdAt < dayEnd
      );
      daily.push({
        date: dayStart.toLocaleDateString("ar-SA", {
          month: "short",
          day: "numeric",
        }),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((s, o) => s + o.totalPrice, 0),
      });
    }

    // ── Avg order value by month (last 6 months) ─────────────────────────
    const avgByMonth: { month: string; avg: number; orders: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i, 1);
      d.setHours(0, 0, 0, 0);
      const nextMonth = new Date(d);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const bucket = allOrders.filter(
        o => o.createdAt >= d.getTime() && o.createdAt < nextMonth.getTime()
      );
      const avg =
        bucket.length > 0
          ? Math.round(
              bucket.reduce((s, o) => s + o.totalPrice, 0) / bucket.length
            )
          : 0;
      avgByMonth.push({
        month: d.toLocaleDateString("ar-SA", {
          month: "short",
          year: "numeric",
        }),
        avg,
        orders: bucket.length,
      });
    }

    // ── Selection frequency (top-10 most chosen option values) ───────────
    const selFreq: Record<string, number> = {};
    for (const o of recent90) {
      const sels = o.selections as Record<string, string> | null;
      if (!sels) continue;
      for (const val of Object.values(sels)) {
        if (!val || val === "false") continue;
        selFreq[val] = (selFreq[val] ?? 0) + 1;
      }
    }
    const topSelections = Object.entries(selFreq)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ── Status funnel ─────────────────────────────────────────────────────
    const FUNNEL_LABELS: Record<string, string> = {
      new: "جديد",
      reviewing: "قيد المراجعة",
      confirmed: "مؤكد",
      in_production: "قيد التصنيع",
      ready: "جاهز",
      delivered: "تم التسليم",
      cancelled: "ملغي",
    };
    const statusCounts: Record<string, number> = {};
    for (const o of allOrders) {
      statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
    }
    const funnel = Object.entries(FUNNEL_LABELS).map(([status, label]) => ({
      status,
      label,
      count: statusCounts[status] ?? 0,
    }));

    // ── Summary KPIs ──────────────────────────────────────────────────────
    const totalRevenue = allOrders.reduce((s, o) => s + o.totalPrice, 0);
    const totalOrders = allOrders.length;
    const avgOrderValue =
      totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Orders this week vs last week
    const weekAgo = now - 7 * MS_PER_DAY;
    const twoWeeksAgo = now - 14 * MS_PER_DAY;
    const thisWeek = allOrders.filter(o => o.createdAt >= weekAgo).length;
    const lastWeek = allOrders.filter(
      o => o.createdAt >= twoWeeksAgo && o.createdAt < weekAgo
    ).length;
    const weeklyGrowth =
      lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;

    return {
      topProducts,
      daily,
      avgByMonth,
      topSelections,
      funnel,
      totalRevenue,
      totalOrders,
      avgOrderValue,
      thisWeek,
      weeklyGrowth,
    };
  }),
});

// ── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  orders: ordersRouter,
  suppliers: suppliersRouter,
  rfq: rfqRouter,
  comments: commentsRouter,
  productOptions: productOptionsRouter,
  distributorOrders: distributorOrdersRouter,
  payments: paymentsRouter,
  zatca: zatcaRouter,
  adminAuth: adminAuthRouter,
  users: usersRouter,
  inventory: inventoryRouter,
  distributorsAdmin: distributorsAdminRouter,
  distributors: distributorsRouter,
  complaints: complaintsRouter,
  qc: qcRouter,
  packing: packingRouter,
  workOrders: workOrdersRouter,
  decisionLog: decisionLogRouter,
  postOrderReview: postOrderReviewRouter,
  dailySummary: dailySummaryRouter,
  accounting: accountingRouter,
  purchases: purchasesRouter,
  products: productsRouter,
  production: productionRouter,
  analytics: analyticsRouter,
  customerPortal: customerPortalRouter,
});

export type AppRouter = typeof appRouter;
