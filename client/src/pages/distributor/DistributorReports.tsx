// ============================================================
// Distributor Reports Page - Sindian Doors
// Design: Architectural Luxury | Detailed analytics & charts
// ============================================================

import { useState } from "react";
import { useLocation } from "wouter";
import { useDistributorAuth } from "@/contexts/DistributorAuthContext";
import DistributorLayout from "@/components/distributor/DistributorLayout";
import { trpc } from "@/lib/trpc";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { Download, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const COLORS = [
  "oklch(0.38 0.06 160)",
  "oklch(0.68 0.10 60)",
  "#7c3aed",
  "#0891b2",
  "#059669",
];

const periodOptions = ["آخر 3 أشهر", "آخر 6 أشهر", "هذا العام", "العام الماضي"];

export default function DistributorReports() {
  const { distributor } = useDistributorAuth();
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState("آخر 6 أشهر");

  const { data: stats, isLoading, isError } = trpc.distributors.myStats.useQuery(undefined, { retry: false, enabled: !!distributor });

  if (!distributor) {
    navigate("/distributor");
    return null;
  }

  if (isLoading) {
    return (
      <DistributorLayout title="التقارير والتحليلات" subtitle="تحليل مفصل لأداء مبيعاتك">
        <div className="flex items-center justify-center py-20 text-gray-500 font-medium">
          جارٍ التحميل...
        </div>
      </DistributorLayout>
    );
  }

  if (isError || !stats) {
    return (
      <DistributorLayout title="التقارير والتحليلات" subtitle="تحليل مفصل لأداء مبيعاتك">
        <div className="py-20 text-center text-red-500 font-medium">
          تعذّر تحميل التقارير
        </div>
      </DistributorLayout>
    );
  }

  const avgOrderValue = stats.totalOrders > 0 ? Math.round(stats.totalRevenue / stats.totalOrders) : 0;

  // Pie data for order status
  const STATUS_LABELS: Record<string, string> = {
    pending: "في الانتظار",
    manufacturing: "قيد التصنيع",
    shipped: "تم الشحن",
    delivered: "تم التسليم",
    cancelled: "ملغي",
    draft: "مسودة",
    confirmed: "موافق عليه"
  };
  const pieData = Object.entries(stats.statusCounts).map(([key, val]) => ({
    name: STATUS_LABELS[key] || key,
    value: val
  }));

  // Growth data
  const growthData = stats.monthly.map((m, i) => ({
    ...m,
    growth: i > 0 && stats.monthly[i - 1].revenue > 0 ? Math.round(((m.revenue - stats.monthly[i - 1].revenue) / stats.monthly[i - 1].revenue) * 100) : 0,
  }));

  const summaryKPIs = [
    {
      label: "إجمالي الإيرادات",
      value: `${(stats.totalRevenue / 1000).toFixed(0)}K ر.س`,
      change: `${stats.revenueGrowthPct > 0 ? "+" : ""}${stats.revenueGrowthPct}%`,
      positive: stats.revenueGrowthPct >= 0,
    },
    {
      label: "إجمالي الوحدات",
      value: "قريباً", // units per month needs server aggregation (future batch)
      change: "—",
      positive: true,
    },
    {
      label: "إجمالي الطلبات",
      value: `${stats.totalOrders} طلب`,
      change: "—",
      positive: true,
    },
    {
      label: "متوسط قيمة الطلب",
      value: `${(avgOrderValue / 1000).toFixed(1)}K ر.س`,
      change: "—",
      positive: true,
    },
  ];

  return (
    <DistributorLayout title="التقارير والتحليلات" subtitle="تحليل مفصل لأداء مبيعاتك">
      <div className="space-y-6" style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>

        {/* Period selector + export */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2 flex-wrap">
            {periodOptions.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-3 py-1.5 rounded-lg text-sm transition-all"
                style={
                  period === p
                    ? { background: "oklch(0.38 0.06 160)", color: "white" }
                    : { background: "white", color: "oklch(0.45 0.03 160)", border: "1px solid #e5e7eb" }
                }
              >
                {p}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => toast.info("تصدير التقرير - قريباً")}
          >
            <Download className="w-4 h-4" />
            تصدير PDF
          </Button>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryKPIs.map(({ label, value, change, positive }) => (
            <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-500 mb-2">{label}</div>
              <div
                className="text-2xl font-bold mb-1"
                style={{ color: "oklch(0.25 0.04 160)", fontFamily: "DM Serif Display, serif" }}
              >
                {value}
              </div>
              <div
                className="text-xs flex items-center gap-1"
                style={{ color: positive ? "#059669" : "#dc2626" }}
              >
                {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {change} مقارنة بالفترة السابقة
              </div>
            </div>
          ))}
        </div>

        {/* Revenue + Growth charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Revenue area chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3
                  className="font-bold text-lg"
                  style={{ color: "oklch(0.25 0.04 160)", fontFamily: "DM Serif Display, serif" }}
                >
                  الإيرادات الشهرية
                </h3>
                <p className="text-sm text-gray-400">بالريال السعودي</p>
              </div>
              <ArrowUpRight className="w-5 h-5" style={{ color: "#059669" }} />
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.monthly}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.38 0.06 160)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="oklch(0.38 0.06 160)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(v) => `${v / 1000}K`} />
                <Tooltip
                  formatter={(v: number) => [`${v.toLocaleString("ar-SA")} ر.س`, "الإيراد"]}
                  contentStyle={{ fontFamily: "IBM Plex Sans Arabic, sans-serif", borderRadius: "10px" }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="oklch(0.38 0.06 160)"
                  strokeWidth={2.5}
                  fill="url(#revGrad)"
                  dot={{ fill: "oklch(0.38 0.06 160)", r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Growth line chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3
                  className="font-bold text-lg"
                  style={{ color: "oklch(0.25 0.04 160)", fontFamily: "DM Serif Display, serif" }}
                >
                  نمو المبيعات
                </h3>
                <p className="text-sm text-gray-400">نسبة التغيير الشهري</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={growthData.slice(1)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, "نسبة النمو"]}
                  contentStyle={{ fontFamily: "IBM Plex Sans Arabic, sans-serif", borderRadius: "10px" }}
                />
                <Line
                  type="monotone"
                  dataKey="growth"
                  stroke="oklch(0.68 0.10 60)"
                  strokeWidth={2.5}
                  dot={{ fill: "oklch(0.68 0.10 60)", r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product performance + Pie chart */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Product performance bar - HIDDEN pending server support */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <h3 className="font-bold text-lg mb-2" style={{ color: "oklch(0.25 0.04 160)", fontFamily: "DM Serif Display, serif" }}>أداء المنتجات</h3>
              <p className="text-sm text-gray-500">قريباً... (يتطلب دعماً من الخادم لتجميع المنتجات الأكثر مبيعاً)</p>
              {/* // TODO: requires myStats.topProducts from server (future batch). */}
            </div>
          </div>

          {/* Pie chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3
              className="font-bold text-lg mb-1"
              style={{ color: "oklch(0.25 0.04 160)", fontFamily: "DM Serif Display, serif" }}
            >
              توزيع الطلبات
            </h3>
            <p className="text-sm text-gray-400 mb-4">حسب الحالة</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontFamily: "IBM Plex Sans Arabic, sans-serif", borderRadius: "10px" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {pieData.map(({ name, value }, i) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-gray-600">{name}</span>
                  </div>
                  <span className="font-bold" style={{ color: "oklch(0.25 0.04 160)" }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Units vs Orders comparison */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3
                className="font-bold text-lg"
                style={{ color: "oklch(0.25 0.04 160)", fontFamily: "DM Serif Display, serif" }}
              >
                مقارنة الطلبات والوحدات
              </h3>
              <p className="text-sm text-gray-400">شهرياً خلال الفترة المحددة</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.monthly} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <Tooltip
                contentStyle={{ fontFamily: "IBM Plex Sans Arabic, sans-serif", borderRadius: "10px" }}
              />
              <Legend
                wrapperStyle={{ fontFamily: "IBM Plex Sans Arabic, sans-serif", fontSize: "12px" }}
              />
              {/* units per month needs server aggregation (future batch) */}
              {/* <Bar dataKey="units" name="الوحدات" fill="oklch(0.38 0.06 160)" radius={[4, 4, 0, 0]} barSize={20} /> */}
              <Bar dataKey="orders" name="الطلبات" fill="oklch(0.68 0.10 60)" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DistributorLayout>
  );
}
