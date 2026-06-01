// ============================================================
// AdminReports - التقارير والإحصائيات — بيانات حقيقية من DB
// ============================================================
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  DollarSign,
  Hash,
  BarChart2,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";

const OAK = "#2C4A3E";
const COPPER = "#C4956A";
const PALETTE = [
  OAK,
  COPPER,
  "#6B8F71",
  "#A0C4B1",
  "#E8C89A",
  "#8B5CF6",
  "#F59E0B",
  "#3B82F6",
];

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }} className="text-xs">
          {p.name}:{" "}
          {typeof p.value === "number" && p.value >= 1000
            ? `${(p.value / 1000).toFixed(1)}k ر.س`
            : p.value}
        </p>
      ))}
    </div>
  );
}

function Skeleton({ h = "h-48" }: { h?: string }) {
  return <div className={`${h} rounded-xl bg-gray-100 animate-pulse`} />;
}

export default function AdminReports() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";

  const { data, isLoading, refetch, isFetching } =
    trpc.orders.analytics.useQuery(undefined, {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60_000,
    });

  const kpiCards = data
    ? [
        {
          label: "إجمالي الطلبات",
          value: data.totalOrders.toLocaleString("ar-SA"),
          sub: `${data.thisWeek} هذا الأسبوع`,
          trend: data.weeklyGrowth,
          icon: <Hash className="w-5 h-5" />,
          color: OAK,
        },
        {
          label: "إجمالي الإيرادات",
          value:
            data.totalRevenue >= 1_000_000
              ? `${(data.totalRevenue / 1_000_000).toFixed(2)}M`
              : `${(data.totalRevenue / 1000).toFixed(0)}k`,
          sub: "ريال سعودي",
          trend: null,
          icon: <DollarSign className="w-5 h-5" />,
          color: COPPER,
        },
        {
          label: "متوسط قيمة الطلب",
          value: data.avgOrderValue.toLocaleString("ar-SA"),
          sub: "ريال سعودي",
          trend: null,
          icon: <ShoppingBag className="w-5 h-5" />,
          color: "#6B8F71",
        },
        {
          label: "أكثر منتج مطلوباً",
          value: data.topProducts[0]?.name ?? "—",
          sub: `${data.topProducts[0]?.orders ?? 0} طلب`,
          trend: null,
          icon: <BarChart2 className="w-5 h-5" />,
          color: "#8B5CF6",
        },
      ]
    : [];

  return (
    <AdminLayout
      title="التقارير والإحصائيات"
      subtitle="بيانات حقيقية من قاعدة البيانات — آخر 90 يوماً"
    >
      <div className="space-y-6" dir={dir}>
        {/* Header actions */}
        <div className="flex justify-end">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-oak transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
            />
            تحديث
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-gray-100 p-5"
                >
                  <Skeleton h="h-20" />
                </div>
              ))
            : kpiCards.map((k, i) => (
                <motion.div
                  key={k.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-white rounded-2xl border border-gray-100 p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500">{k.label}</span>
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: `${k.color}18`, color: k.color }}
                    >
                      {k.icon}
                    </div>
                  </div>
                  <div
                    className="text-2xl font-bold mb-1 truncate"
                    style={{
                      color: k.color,
                      fontFamily: "DM Serif Display, serif",
                    }}
                  >
                    {k.value}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{k.sub}</span>
                    {k.trend !== null && (
                      <span
                        className={`flex items-center gap-0.5 text-xs font-semibold ${
                          k.trend >= 0 ? "text-green-600" : "text-red-500"
                        }`}
                      >
                        {k.trend >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {k.trend >= 0 ? "+" : ""}
                        {k.trend}%
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
        </div>

        {/* Daily trend (30d) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3
            className="font-bold text-gray-800 mb-4"
            style={{ fontFamily: "DM Serif Display, serif" }}
          >
            الطلبات اليومية — آخر 30 يوماً
          </h3>
          {isLoading ? (
            <Skeleton />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={data?.daily}
                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={OAK} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={OAK} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="orders"
                  name="الطلبات"
                  stroke={OAK}
                  strokeWidth={2}
                  fill="url(#ordersGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top products + Avg order value */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Top products */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3
              className="font-bold text-gray-800 mb-4"
              style={{ fontFamily: "DM Serif Display, serif" }}
            >
              أكثر المنتجات طلباً (90 يوماً)
            </h3>
            {isLoading ? (
              <Skeleton />
            ) : !data?.topProducts.length ? (
              <p className="text-sm text-gray-400 py-8 text-center">
                لا توجد بيانات بعد
              </p>
            ) : (
              <div className="space-y-3">
                {data.topProducts.map((p, i) => {
                  const max = data.topProducts[0].orders;
                  const pct = Math.round((p.orders / max) * 100);
                  return (
                    <div key={p.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700 truncate max-w-[55%]">
                          {p.name}
                        </span>
                        <div className="text-end shrink-0">
                          <span
                            className="text-sm font-bold"
                            style={{ color: OAK }}
                          >
                            {p.orders} طلب
                          </span>
                          <span className="text-xs text-gray-400 ms-2">
                            {(p.revenue / 1000).toFixed(0)}k ر.س
                          </span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: i * 0.08, duration: 0.5 }}
                          className="h-full rounded-full"
                          style={{ background: i === 0 ? COPPER : OAK }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Avg order value by month */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3
              className="font-bold text-gray-800 mb-4"
              style={{ fontFamily: "DM Serif Display, serif" }}
            >
              متوسط قيمة الطلب الشهري
            </h3>
            {isLoading ? (
              <Skeleton />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={data?.avgByMonth}
                  margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="avg"
                    name="متوسط الطلب (ر.س)"
                    stroke={COPPER}
                    strokeWidth={2.5}
                    dot={{ fill: COPPER, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Order status funnel + Top selections */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Funnel */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3
              className="font-bold text-gray-800 mb-4"
              style={{ fontFamily: "DM Serif Display, serif" }}
            >
              مسار تحويل الطلبات
            </h3>
            {isLoading ? (
              <Skeleton />
            ) : (
              <div className="space-y-2">
                {data?.funnel
                  .filter(f => f.count > 0)
                  .map((f, i, arr) => {
                    const maxCount = arr[0].count;
                    const pct =
                      maxCount > 0 ? Math.round((f.count / maxCount) * 100) : 0;
                    const convRate =
                      i > 0 && arr[i - 1].count > 0
                        ? Math.round((f.count / arr[i - 1].count) * 100)
                        : 100;
                    return (
                      <div key={f.status} className="group">
                        <div className="flex items-center justify-between mb-1 text-sm">
                          <span className="text-gray-700 font-medium">
                            {f.label}
                          </span>
                          <div className="flex items-center gap-3">
                            {i > 0 && (
                              <span className="text-xs text-gray-400">
                                معدل التحويل: {convRate}%
                              </span>
                            )}
                            <span className="font-bold" style={{ color: OAK }}>
                              {f.count}
                            </span>
                          </div>
                        </div>
                        <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                            className="h-full rounded-full"
                            style={{
                              background: PALETTE[i % PALETTE.length],
                              opacity: 1 - i * 0.08,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                {data?.funnel.every(f => f.count === 0) && (
                  <p className="text-sm text-gray-400 py-8 text-center">
                    لا توجد بيانات بعد
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Top selections */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3
              className="font-bold text-gray-800 mb-1"
              style={{ fontFamily: "DM Serif Display, serif" }}
            >
              أكثر الخيارات اختياراً
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              قيم الخيارات الأعلى تكراراً في الطلبات
            </p>
            {isLoading ? (
              <Skeleton />
            ) : !data?.topSelections.length ? (
              <p className="text-sm text-gray-400 py-8 text-center">
                لا توجد بيانات بعد
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={data.topSelections}
                  layout="vertical"
                  margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#F3F4F6"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={90}
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="التكرار" radius={[0, 4, 4, 0]}>
                    {data.topSelections.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
