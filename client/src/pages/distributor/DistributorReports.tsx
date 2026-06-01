// ============================================================
// Distributor Reports Page - Sindian Doors
// Design: Architectural Luxury | Detailed analytics & charts
// ============================================================

import { useState } from "react";
import { useLocation } from "wouter";
import { useDistributorAuth } from "@/contexts/DistributorAuthContext";
import DistributorLayout from "@/components/distributor/DistributorLayout";
import {
  monthlySalesData,
  productPerformanceData,
  mockOrders,
} from "@/lib/distributorData";
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

  if (!distributor) {
    navigate("/distributor");
    return null;
  }

  const totalRevenue = monthlySalesData.reduce((s, m) => s + m.revenue, 0);
  const totalUnits = monthlySalesData.reduce((s, m) => s + m.units, 0);
  const totalOrders = monthlySalesData.reduce((s, m) => s + m.orders, 0);
  const avgOrderValue = Math.round(totalRevenue / totalOrders);

  // Pie data for order status
  const pieData = [
    { name: "تم التسليم", value: mockOrders.filter((o) => o.status === "delivered").length },
    { name: "قيد التصنيع", value: mockOrders.filter((o) => o.status === "manufacturing").length },
    { name: "تم الشحن", value: mockOrders.filter((o) => o.status === "shipped").length },
    { name: "في الانتظار", value: mockOrders.filter((o) => o.status === "pending").length },
  ];

  // Growth data
  const growthData = monthlySalesData.map((m, i) => ({
    ...m,
    growth: i > 0 ? Math.round(((m.revenue - monthlySalesData[i - 1].revenue) / monthlySalesData[i - 1].revenue) * 100) : 0,
  }));

  const summaryKPIs = [
    {
      label: "إجمالي الإيرادات",
      value: `${(totalRevenue / 1000).toFixed(0)}K ر.س`,
      change: "+22%",
      positive: true,
    },
    {
      label: "إجمالي الوحدات",
      value: `${totalUnits} وحدة`,
      change: "+18%",
      positive: true,
    },
    {
      label: "إجمالي الطلبات",
      value: `${totalOrders} طلب`,
      change: "+31%",
      positive: true,
    },
    {
      label: "متوسط قيمة الطلب",
      value: `${(avgOrderValue / 1000).toFixed(1)}K ر.س`,
      change: "-3%",
      positive: false,
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
              <AreaChart data={monthlySalesData}>
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
          {/* Product performance bar */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3
                  className="font-bold text-lg"
                  style={{ color: "oklch(0.25 0.04 160)", fontFamily: "DM Serif Display, serif" }}
                >
                  أداء المنتجات
                </h3>
                <p className="text-sm text-gray-400">المنتجات الأكثر مبيعاً</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={productPerformanceData} layout="vertical" barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                  width={120}
                />
                <Tooltip
                  formatter={(v: number) => [`${v} وحدة`, "المبيعات"]}
                  contentStyle={{ fontFamily: "IBM Plex Sans Arabic, sans-serif", borderRadius: "10px" }}
                />
                <Bar dataKey="units" radius={[0, 6, 6, 0]}>
                  {productPerformanceData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Product table */}
            <div className="mt-4 space-y-2">
              {productPerformanceData.map(({ name, units, revenue, growth }) => (
                <div
                  key={name}
                  className="flex items-center justify-between py-2 border-t border-gray-50"
                >
                  <span className="text-sm text-gray-700 flex-1 truncate">{name}</span>
                  <div className="flex items-center gap-4 text-sm flex-shrink-0">
                    <span className="text-gray-500">{units} وحدة</span>
                    <span className="font-medium" style={{ color: "oklch(0.38 0.06 160)" }}>
                      {(revenue / 1000).toFixed(1)}K
                    </span>
                    <span
                      className="text-xs flex items-center gap-0.5"
                      style={{ color: growth > 0 ? "#059669" : "#dc2626" }}
                    >
                      <TrendingUp className="w-3 h-3" />
                      {growth}%
                    </span>
                  </div>
                </div>
              ))}
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
            <BarChart data={monthlySalesData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <Tooltip
                contentStyle={{ fontFamily: "IBM Plex Sans Arabic, sans-serif", borderRadius: "10px" }}
              />
              <Legend
                wrapperStyle={{ fontFamily: "IBM Plex Sans Arabic, sans-serif", fontSize: "12px" }}
              />
              <Bar dataKey="units" name="الوحدات" fill="oklch(0.38 0.06 160)" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="orders" name="الطلبات" fill="oklch(0.68 0.10 60)" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DistributorLayout>
  );
}
