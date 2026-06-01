// ============================================================
// AdminBIDashboard — لوحة التحليلات المتقدمة BI
// تقارير المبيعات · أداء الموردين · نسبة الالتزام بالمواعيد
// ============================================================
import { useState, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  BarChart3,
  Users,
  Clock,
  DollarSign,
  ShoppingCart,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  CalendarDays,
  Package,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Factory,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── ألوان الرسوم البيانية ───────────────────────────────────
const COLORS = {
  blue: "#2563EB",
  green: "#059669",
  amber: "#D97706",
  red: "#DC2626",
  purple: "#7C3AED",
  teal: "#0891B2",
  pink: "#DB2777",
  gray: "#6B7280",
};

const PIE_COLORS = [
  COLORS.blue,
  COLORS.green,
  COLORS.amber,
  COLORS.purple,
  COLORS.teal,
  COLORS.pink,
];

const CATEGORY_AR: Record<string, string> = {
  materials: "مواد خام",
  equipment: "معدات",
  services: "خدمات",
  utilities: "مرافق",
  other: "أخرى",
};

const PRIORITY_AR: Record<string, string> = {
  vip: "VIP",
  urgent: "عاجل",
  normal: "عادي",
};

// ─── تنسيق الأرقام ──────────────────────────────────────────
function fmt(n: number | null | undefined, suffix = " ر.س") {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}م${suffix}`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}ك${suffix}`;
  return `${n.toLocaleString()}${suffix}`;
}

// ─── KPI بطاقة ──────────────────────────────────────────────
function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-start gap-4">
      <div
        className="rounded-xl p-3 flex-shrink-0"
        style={{ background: color ? `${color}18` : "#F3F4F6" }}
      >
        <span style={{ color: color ?? "#6B7280" }}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-2xl font-bold text-gray-900 truncate">{value}</div>
        <div className="text-sm text-gray-500 mt-0.5">{label}</div>
        {sub && (
          <div className="flex items-center gap-1 text-xs mt-1">
            {trend === "up" && (
              <ArrowUpRight className="w-3 h-3 text-green-500" />
            )}
            {trend === "down" && (
              <ArrowDownRight className="w-3 h-3 text-red-500" />
            )}
            <span
              className={
                trend === "up"
                  ? "text-green-500"
                  : trend === "down"
                    ? "text-red-500"
                    : "text-gray-400"
              }
            >
              {sub}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tooltip مخصص ───────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-sm"
      dir="rtl"
    >
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-gray-500">{entry.name}:</span>
          <span className="font-semibold">
            {entry.value.toLocaleString()} ر.س
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── تبويبات ────────────────────────────────────────────────
type Tab = "overview" | "sales" | "suppliers" | "ontime";

export default function AdminBIDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [salesPeriod, setSalesPeriod] = useState<
    "monthly" | "quarterly" | "yearly"
  >("monthly");
  const [salesYear, setSalesYear] = useState(new Date().getFullYear());
  const [trendMonths, setTrendMonths] = useState(12);

  // ── Queries ─────────────────────────────────────────────────
  const kpisQ = trpc.analytics.kpis.useQuery();
  const trendQ = trpc.analytics.revenueTrend.useQuery({ months: trendMonths });
  const salesQ = trpc.analytics.salesByPeriod.useQuery({
    period: salesPeriod,
    year: salesYear,
  });
  const supplierQ = trpc.analytics.supplierPerformance.useQuery();
  const onTimeQ = trpc.analytics.onTimeDelivery.useQuery({ months: 12 });

  const kpis = kpisQ.data;
  const trend = trendQ.data ?? [];
  const sales = salesQ.data;
  const supplier = supplierQ.data;
  const onTime = onTimeQ.data;

  const isLoading = kpisQ.isLoading;

  const refetchAll = () => {
    kpisQ.refetch();
    trendQ.refetch();
    salesQ.refetch();
    supplierQ.refetch();
    onTimeQ.refetch();
  };

  // ─── P&L للسنة الحالية ───────────────────────────────────
  const currentYear = new Date().getFullYear();
  const plQ = trpc.analytics.profitLoss.useQuery({
    startDate: `${currentYear}-01-01`,
    endDate: `${currentYear}-12-31`,
  });
  const pl = plQ.data;

  const TABS: { key: Tab; icon: React.ReactNode; label: string }[] = [
    {
      key: "overview",
      icon: <BarChart3 className="w-4 h-4" />,
      label: "نظرة عامة",
    },
    {
      key: "sales",
      icon: <TrendingUp className="w-4 h-4" />,
      label: "تقارير المبيعات",
    },
    {
      key: "suppliers",
      icon: <Users className="w-4 h-4" />,
      label: "الموردون",
    },
    {
      key: "ontime",
      icon: <Clock className="w-4 h-4" />,
      label: "الالتزام بالمواعيد",
    },
  ];

  return (
    <AdminLayout title="لوحة تقارير الأعمال">
      <div className="p-6 space-y-6 min-h-screen bg-gray-50/50" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 rounded-xl p-2.5">
              <BarChart3 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                لوحة التحليلات
              </h1>
              <p className="text-sm text-gray-500">
                تقارير المبيعات · أداء الموردين · الالتزام بالمواعيد
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetchAll}
            disabled={isLoading}
          >
            <RefreshCw
              className={`w-4 h-4 me-1.5 ${isLoading ? "animate-spin" : ""}`}
            />
            تحديث
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: Overview ────────────────────────────────────── */}
        {tab === "overview" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <KpiCard
                icon={<DollarSign className="w-5 h-5" />}
                label="إجمالي الإيرادات"
                value={fmt(kpis?.totalRevenueRiyals)}
                sub={`${fmt(kpis?.paidRevenueRiyals)} محصّل`}
                color={COLORS.blue}
              />
              <KpiCard
                icon={<TrendingUp className="w-5 h-5" />}
                label="هامش الربح الإجمالي"
                value={`${kpis?.grossMarginPct ?? "—"}%`}
                sub={fmt(kpis?.grossMarginRiyals)}
                color={COLORS.green}
                trend={kpis && kpis.grossMarginPct >= 20 ? "up" : "down"}
              />
              <KpiCard
                icon={<ShoppingCart className="w-5 h-5" />}
                label="طلبات الموزعين"
                value={fmt(kpis?.distRevenueRiyals)}
                sub={`${fmt(kpis?.retailRevenueRiyals)} تجزئة`}
                color={COLORS.amber}
              />
              <KpiCard
                icon={<Package className="w-5 h-5" />}
                label="إجمالي المشتريات"
                value={fmt(kpis?.totalPurchasesRiyals)}
                sub={`ضريبة: ${fmt(kpis?.totalVatRiyals)}`}
                color={COLORS.purple}
              />
              <KpiCard
                icon={<Factory className="w-5 h-5" />}
                label="أبواب مُنتجة"
                value={kpis?.totalDoorsProduced?.toLocaleString() ?? "—"}
                sub={`${kpis?.completedWorkOrders ?? 0} أمر مكتمل`}
                color={COLORS.teal}
              />
              <KpiCard
                icon={<Percent className="w-5 h-5" />}
                label="الالتزام بالمواعيد"
                value={kpis?.onTimePct != null ? `${kpis.onTimePct}%` : "—"}
                sub={`${kpis?.onTimeCount ?? 0} أمر في الموعد`}
                color={
                  kpis?.onTimePct != null && kpis.onTimePct >= 80
                    ? COLORS.green
                    : COLORS.red
                }
                trend={
                  kpis?.onTimePct != null && kpis.onTimePct >= 80
                    ? "up"
                    : "down"
                }
              />
              <KpiCard
                icon={<CheckCircle2 className="w-5 h-5" />}
                label="فواتير ضريبية"
                value={kpis?.totalInvoices ?? "—"}
                sub={`ضريبة قيمة مضافة: ${fmt(kpis?.totalVatRiyals)}`}
                color={COLORS.green}
              />
              <KpiCard
                icon={<AlertTriangle className="w-5 h-5" />}
                label="طلبات عروض مفتوحة"
                value={kpis?.openRfqs ?? "—"}
                sub="تحت التقييم"
                color={COLORS.amber}
              />
            </div>

            {/* P&L بطاقة */}
            {pl && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-500" />
                  ملخص الربح والخسارة — {currentYear}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    {
                      label: "الإيرادات",
                      value: fmt(pl.revenueRiyals),
                      color: COLORS.blue,
                    },
                    {
                      label: "التكاليف",
                      value: fmt(pl.costRiyals),
                      color: COLORS.red,
                    },
                    {
                      label: "الربح الإجمالي",
                      value: fmt(pl.grossProfitRiyals),
                      color:
                        pl.grossProfitRiyals >= 0 ? COLORS.green : COLORS.red,
                    },
                    {
                      label: "هامش الربح",
                      value: `${pl.grossMarginPct}%`,
                      color:
                        pl.grossMarginPct >= 20 ? COLORS.green : COLORS.amber,
                    },
                  ].map(item => (
                    <div
                      key={item.label}
                      className="text-center p-3 bg-gray-50 rounded-xl"
                    >
                      <div
                        className="text-xl font-bold"
                        style={{ color: item.color }}
                      >
                        {item.value}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* توزيع التكاليف */}
                {pl.costByCategory.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      توزيع المصروفات
                    </div>
                    <div className="space-y-2">
                      {pl.costByCategory.map(c => {
                        const pct =
                          pl.costRiyals > 0
                            ? Math.round((c.amountRiyals / pl.costRiyals) * 100)
                            : 0;
                        return (
                          <div
                            key={c.category}
                            className="flex items-center gap-3"
                          >
                            <div className="w-20 text-xs text-gray-500 text-right flex-shrink-0">
                              {CATEGORY_AR[c.category] ?? c.category}
                            </div>
                            <div className="flex-1 bg-gray-100 rounded-full h-2">
                              <div
                                className="h-full rounded-full bg-indigo-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="w-20 text-xs text-gray-600 text-left flex-shrink-0">
                              {fmt(c.amountRiyals)} · {pct}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* اتجاه الإيرادات */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  اتجاه الإيرادات الشهري
                </h3>
                <div className="flex gap-1.5">
                  {[6, 12, 24].map(m => (
                    <button
                      key={m}
                      onClick={() => setTrendMonths(m)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        trendMonths === m
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {m === 6 ? "6 أشهر" : m === 12 ? "سنة" : "سنتان"}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={trend}
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    tickFormatter={v =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}ك` : v
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={v =>
                      v === "invoicesRevenue"
                        ? "فواتير ضريبية"
                        : v === "distRevenue"
                          ? "موزعون"
                          : "تجزئة"
                    }
                  />
                  <Bar
                    dataKey="invoicesRevenue"
                    stackId="a"
                    fill={COLORS.blue}
                    radius={[0, 0, 0, 0]}
                    name="invoicesRevenue"
                  />
                  <Bar
                    dataKey="distRevenue"
                    stackId="a"
                    fill={COLORS.teal}
                    radius={[0, 0, 0, 0]}
                    name="distRevenue"
                  />
                  <Bar
                    dataKey="retailRevenue"
                    stackId="a"
                    fill={COLORS.amber}
                    radius={[4, 4, 0, 0]}
                    name="retailRevenue"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* ── TAB: Sales ───────────────────────────────────────── */}
        {tab === "sales" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Controls */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-wrap items-center gap-3">
              <div className="flex gap-1">
                {(["monthly", "quarterly", "yearly"] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setSalesPeriod(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      salesPeriod === p
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {p === "monthly"
                      ? "شهري"
                      : p === "quarterly"
                        ? "فصلي"
                        : "سنوي"}
                  </button>
                ))}
              </div>
              {salesPeriod !== "yearly" && (
                <select
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"
                  value={salesYear}
                  onChange={e => setSalesYear(Number(e.target.value))}
                >
                  {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              )}
              {sales && (
                <div className="flex items-center gap-4 mr-auto text-sm">
                  <span className="text-gray-500">الإجمالي:</span>
                  <span className="font-bold text-indigo-700">
                    {fmt(sales.totals.total)}
                  </span>
                  <span className="text-gray-500">
                    {sales.totals.invoiceCount} فاتورة
                  </span>
                </div>
              )}
            </div>

            {/* Bar Chart */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-500" />
                الإيرادات —{" "}
                {salesPeriod === "monthly"
                  ? `شهرياً ${salesYear}`
                  : salesPeriod === "quarterly"
                    ? `فصلياً ${salesYear}`
                    : "سنوياً"}
              </h3>
              {salesQ.isLoading ? (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={sales?.data ?? []}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#9CA3AF" }}
                      tickFormatter={v =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}ك` : v
                      }
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      formatter={v =>
                        v === "invoiceRevenue"
                          ? "فواتير ضريبية"
                          : v === "distRevenue"
                            ? "طلبات موزعين"
                            : v
                      }
                    />
                    <Bar
                      dataKey="invoiceRevenue"
                      fill={COLORS.blue}
                      name="invoiceRevenue"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="distRevenue"
                      fill={COLORS.teal}
                      name="distRevenue"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* جدول تفصيلي */}
            {sales && sales.data.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4">
                  التفاصيل الجدولية
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">
                          الفترة
                        </th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">
                          فواتير ضريبية
                        </th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">
                          طلبات موزعين
                        </th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">
                          ضريبة القيمة
                        </th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">
                          عدد الفواتير
                        </th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">
                          الإجمالي
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.data.map(row => (
                        <tr
                          key={row.key}
                          className="border-b border-gray-50 hover:bg-gray-50"
                        >
                          <td className="py-2.5 px-3 font-medium text-gray-800">
                            {row.label}
                          </td>
                          <td className="py-2.5 px-3 text-center text-gray-700">
                            {row.invoiceRevenue.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-center text-gray-700">
                            {row.distRevenue.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-center text-gray-500">
                            {row.vatAmount.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge variant="secondary">
                              {row.invoiceCount}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-indigo-700">
                            {row.total.toLocaleString()} ر.س
                          </td>
                        </tr>
                      ))}
                      {/* صف الإجمالي */}
                      <tr className="bg-indigo-50 font-bold">
                        <td className="py-2.5 px-3 text-indigo-800">
                          الإجمالي
                        </td>
                        <td className="py-2.5 px-3 text-center text-indigo-700">
                          {sales.totals.invoiceRevenue.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center text-indigo-700">
                          {sales.totals.distRevenue.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center text-indigo-600">
                          {sales.totals.vatAmount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge className="bg-indigo-200 text-indigo-800 border-0">
                            {sales.totals.invoiceCount}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-center text-indigo-800 text-base">
                          {sales.totals.total.toLocaleString()} ر.س
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── TAB: Suppliers ───────────────────────────────────── */}
        {tab === "suppliers" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* جدول الموردين */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  أكثر الموردين استخداماً
                  {supplier && (
                    <span className="text-xs text-gray-400 font-normal mr-2">
                      ({supplier.totalSuppliers} مورد إجمالاً)
                    </span>
                  )}
                </h3>
                {supplierQ.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-12 bg-gray-100 rounded-lg animate-pulse"
                      />
                    ))}
                  </div>
                ) : supplier?.suppliers.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>لا توجد بيانات موردين بعد</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-right py-2 px-2 text-gray-500 font-medium">
                            #
                          </th>
                          <th className="text-right py-2 px-2 text-gray-500 font-medium">
                            المورد
                          </th>
                          <th className="text-center py-2 px-2 text-gray-500 font-medium">
                            فواتير
                          </th>
                          <th className="text-center py-2 px-2 text-gray-500 font-medium">
                            إجمالي
                          </th>
                          <th className="text-center py-2 px-2 text-gray-500 font-medium">
                            متوسط الفاتورة
                          </th>
                          <th className="text-center py-2 px-2 text-gray-500 font-medium">
                            الدفع
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(supplier?.suppliers ?? []).map((s, idx) => (
                          <tr
                            key={s.supplierName}
                            className="border-b border-gray-50 hover:bg-gray-50"
                          >
                            <td className="py-2.5 px-2 text-gray-400 text-xs">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-2">
                              <div className="font-medium text-gray-800 truncate max-w-[160px]">
                                {s.supplierName}
                              </div>
                              <div className="text-xs text-gray-400">
                                {s.latestDate}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <Badge variant="secondary">
                                {s.invoiceCount}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-2 text-center font-semibold text-gray-800">
                              {s.totalSpentRiyals.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-2 text-center text-gray-600">
                              {s.avgPerInvoiceRiyals.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <div className="flex items-center gap-1.5 justify-center">
                                <div className="w-12 bg-gray-100 rounded-full h-1.5">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${s.paymentRate}%`,
                                      background:
                                        s.paymentRate >= 80
                                          ? COLORS.green
                                          : s.paymentRate >= 50
                                            ? COLORS.amber
                                            : COLORS.red,
                                    }}
                                  />
                                </div>
                                <span className="text-xs">
                                  {s.paymentRate}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* توزيع حسب الفئة */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4">
                  توزيع المشتريات
                </h3>
                {supplier?.categoryBreakdown.length ? (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={supplier.categoryBreakdown}
                          dataKey="amountRiyals"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({
                            cx,
                            cy,
                            midAngle,
                            innerRadius,
                            outerRadius,
                            percent,
                          }) => {
                            if (percent < 0.05) return null;
                            const RADIAN = Math.PI / 180;
                            const radius =
                              innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x =
                              cx + radius * Math.cos(-midAngle * RADIAN);
                            const y =
                              cy + radius * Math.sin(-midAngle * RADIAN);
                            return (
                              <text
                                x={x}
                                y={y}
                                fill="white"
                                textAnchor="middle"
                                dominantBaseline="central"
                                fontSize={11}
                                fontWeight={600}
                              >
                                {`${(percent * 100).toFixed(0)}%`}
                              </text>
                            );
                          }}
                        >
                          {supplier.categoryBreakdown.map((_, i) => (
                            <Cell
                              key={i}
                              fill={PIE_COLORS[i % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number, n: string) => [
                            `${v.toLocaleString()} ر.س`,
                            CATEGORY_AR[n] ?? n,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-3">
                      {supplier.categoryBreakdown.map((c, i) => (
                        <div
                          key={c.category}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{
                                background: PIE_COLORS[i % PIE_COLORS.length],
                              }}
                            />
                            <span className="text-gray-600">
                              {CATEGORY_AR[c.category] ?? c.category}
                            </span>
                          </div>
                          <span className="font-semibold text-gray-800">
                            {c.amountRiyals.toLocaleString()} ر.س
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-10 text-gray-400">
                    لا توجد بيانات
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── TAB: On-Time Delivery ─────────────────────────────── */}
        {tab === "ontime" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* KPIs الالتزام */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiCard
                icon={<CheckCircle2 className="w-5 h-5" />}
                label="في الموعد"
                value={onTime?.onTimePct != null ? `${onTime.onTimePct}%` : "—"}
                sub={`${onTime?.onTimeCount ?? 0} أمر`}
                color={
                  onTime?.onTimePct != null && onTime.onTimePct >= 80
                    ? COLORS.green
                    : COLORS.red
                }
                trend={
                  onTime?.onTimePct != null && onTime.onTimePct >= 80
                    ? "up"
                    : "down"
                }
              />
              <KpiCard
                icon={<Clock className="w-5 h-5" />}
                label="أوامر مكتملة"
                value={onTime?.totalCompleted ?? "—"}
                sub={`${onTime?.lateCount ?? 0} متأخرة`}
                color={COLORS.blue}
              />
              <KpiCard
                icon={<AlertTriangle className="w-5 h-5" />}
                label="متأخرة حالياً"
                value={onTime?.currentlyOverdue?.length ?? "—"}
                sub="تجاوزت تاريخ الاستحقاق"
                color={
                  onTime?.currentlyOverdue?.length ? COLORS.red : COLORS.green
                }
                trend={onTime?.currentlyOverdue?.length ? "down" : "neutral"}
              />
              <KpiCard
                icon={<Percent className="w-5 h-5" />}
                label="هدف الالتزام"
                value="90%"
                sub="المستهدف"
                color={COLORS.gray}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* اتجاه شهري */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  الاتجاه الشهري — الأشهر الستة الأخيرة
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart
                    data={onTime?.monthlyTrend ?? []}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={v => `${v}%`}
                      tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    />
                    <Tooltip
                      formatter={(v: number) => [`${v}%`, "نسبة الالتزام"]}
                    />
                    <ReferenceLine
                      y={90}
                      stroke={COLORS.green}
                      strokeDasharray="4 4"
                      label={{
                        value: "هدف 90%",
                        fill: COLORS.green,
                        fontSize: 10,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pct"
                      stroke={COLORS.blue}
                      strokeWidth={2.5}
                      dot={{ fill: COLORS.blue, r: 4 }}
                      name="نسبة الالتزام"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* حسب الأولوية */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  الالتزام حسب الأولوية
                </h3>
                <div className="space-y-4">
                  {(onTime?.byPriority ?? []).map(p => {
                    const color =
                      p.priority === "vip"
                        ? COLORS.amber
                        : p.priority === "urgent"
                          ? COLORS.red
                          : COLORS.blue;
                    return (
                      <div key={p.priority}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <Badge
                              className="text-xs border-0"
                              style={{ background: `${color}20`, color }}
                            >
                              {PRIORITY_AR[p.priority]}
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {p.total > 0
                                ? `${p.onTime}/${p.total} أمر`
                                : "لا توجد بيانات"}
                            </span>
                          </div>
                          <span
                            className="text-sm font-bold"
                            style={{
                              color:
                                p.pct != null && p.pct >= 80
                                  ? COLORS.green
                                  : color,
                            }}
                          >
                            {p.pct != null ? `${p.pct}%` : "—"}
                          </span>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: p.pct != null ? `${p.pct}%` : "0%",
                              background:
                                p.pct != null && p.pct >= 80
                                  ? COLORS.green
                                  : color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* الأوامر المتأخرة حالياً */}
            {(onTime?.currentlyOverdue?.length ?? 0) > 0 && (
              <div className="bg-white rounded-2xl border border-red-100 p-6 shadow-sm">
                <h3 className="font-bold text-red-700 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  أوامر متأخرة حالياً ({onTime?.currentlyOverdue?.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-red-100">
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">
                          الموزع
                        </th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">
                          تاريخ الاستحقاق
                        </th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">
                          أيام التأخير
                        </th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">
                          الأولوية
                        </th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">
                          الأبواب
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {onTime?.currentlyOverdue?.map((w, i) => (
                        <tr
                          key={i}
                          className="border-b border-red-50 hover:bg-red-50/50"
                        >
                          <td className="py-2.5 px-3 font-medium text-gray-800">
                            {w.distributorName}
                          </td>
                          <td className="py-2.5 px-3 text-center text-gray-600">
                            {w.dueDate}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge className="bg-red-100 text-red-700 border-0">
                              +{w.daysLate} يوم
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge
                              className="border-0 text-xs"
                              style={{
                                background:
                                  w.priority === "vip"
                                    ? `${COLORS.amber}20`
                                    : w.priority === "urgent"
                                      ? `${COLORS.red}20`
                                      : "#F3F4F6",
                                color:
                                  w.priority === "vip"
                                    ? COLORS.amber
                                    : w.priority === "urgent"
                                      ? COLORS.red
                                      : COLORS.gray,
                              }}
                            >
                              {PRIORITY_AR[w.priority]}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-center text-gray-700">
                            {w.totalDoors}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
}
