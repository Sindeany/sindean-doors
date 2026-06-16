// ============================================================
// AdminDecisionLog - سجل القرارات
// عرض تفاصيل كل إجراء موافقة أو رفض أو طلب تعديل
// ============================================================
import { useState, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  Edit3,
  Clock,
  Search,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  User,
  Building2,
  Calendar,
  Hash,
  MessageSquare,
  TrendingUp,
  BarChart2,
  AlertCircle,
  Eye,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";

// ─── Types ───────────────────────────────────────────────────
type DecisionType = "approved" | "rejected" | "revision_requested";

interface DecisionRecord {
  id: string;
  orderNumber: string;
  distributor: string;
  company: string;
  city: string;
  orderTotal: number;
  decision: DecisionType;
  reason?: string;
  decidedBy: string;
  decidedAt: string;
  responseTime: number;
  items: { name: string; qty: number }[];
  notified: boolean;
  followUp?: string;
}

// ─── DB Row → UI Record ───────────────────────────────────────
function mapDbRow(row: any): DecisionRecord {
  return {
    id: String(row.id),
    orderNumber: row.orderNumber,
    distributor: row.distributor,
    company: row.company,
    city: row.city,
    orderTotal: row.orderTotal,
    decision: row.decision as DecisionType,
    reason: row.reason ?? undefined,
    decidedBy: row.decidedBy,
    decidedAt: row.decidedAt,
    responseTime: row.responseTime,
    items: Array.isArray(row.items) ? row.items : [],
    notified: Boolean(row.notified),
    followUp: row.followUp ?? undefined,
  };
}

// ─── Mock Data ───────────────────────────────────────────────
// (data now comes from DB via tRPC decisionLog.list)

// ─── Config ───────────────────────────────────────────────────
const DECISION_CONFIG: Record<
  DecisionType,
  {
    label: string;
    color: string;
    bg: string;
    icon: React.ReactNode;
    badgeBg: string;
  }
> = {
  approved: {
    label: "موافقة",
    color: "#16A34A",
    bg: "#DCFCE7",
    badgeBg: "#F0FDF4",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  rejected: {
    label: "رفض",
    color: "#DC2626",
    bg: "#FEE2E2",
    badgeBg: "#FEF2F2",
    icon: <XCircle className="w-4 h-4" />,
  },
  revision_requested: {
    label: "طلب تعديل",
    color: "#D97706",
    bg: "#FEF3C7",
    badgeBg: "#FFFBEB",
    icon: <Edit3 className="w-4 h-4" />,
  },
};

// ─── Helpers ──────────────────────────────────────────────────
function formatResponseTime(minutes: number): string {
  if (minutes < 60) return `${minutes} دقيقة`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}س ${m}د` : `${h} ساعة`;
}

function getResponseBadge(minutes: number): {
  label: string;
  color: string;
  bg: string;
} {
  if (minutes <= 15)
    return { label: "سريع جداً", color: "#16A34A", bg: "#DCFCE7" };
  if (minutes <= 30) return { label: "سريع", color: "#2563EB", bg: "#DBEAFE" };
  if (minutes <= 60) return { label: "متوسط", color: "#D97706", bg: "#FEF3C7" };
  return { label: "بطيء", color: "#DC2626", bg: "#FEE2E2" };
}

// ─── Detail Row ───────────────────────────────────────────────
function DecisionDetailRow({ record }: { record: DecisionRecord }) {
  const cfg = DECISION_CONFIG[record.decision];
  const rb = getResponseBadge(record.responseTime);
  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors"
    >
      {/* Order */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            {cfg.icon}
          </div>
          <div>
            <p className="font-mono text-sm font-semibold text-gray-800">
              {record.orderNumber}
            </p>
            <p className="text-xs text-gray-400">{record.decidedAt}</p>
          </div>
        </div>
      </td>

      {/* Distributor */}
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-700">
          {record.distributor}
        </p>
        <p className="text-xs text-gray-400">
          {record.company} · {record.city}
        </p>
      </td>

      {/* Decision */}
      <td className="px-4 py-3">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: cfg.bg, color: cfg.color }}
        >
          {cfg.icon}
          {cfg.label}
        </span>
      </td>

      {/* Reason */}
      <td className="px-4 py-3 max-w-[200px]">
        {record.reason ? (
          <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
            {record.reason}
          </p>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
        {record.followUp && (
          <p className="text-xs text-blue-600 mt-1 leading-relaxed">
            ↳ {record.followUp}
          </p>
        )}
      </td>

      {/* Amount */}
      <td className="px-4 py-3 text-end">
        <p className="text-sm font-semibold text-gray-800">
          {record.orderTotal.toLocaleString()} ر.س
        </p>
        <p className="text-xs text-gray-400">{record.items.length} منتج</p>
      </td>

      {/* Response Time */}
      <td className="px-4 py-3 text-center">
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-semibold text-gray-700">
            {formatResponseTime(record.responseTime)}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: rb.bg, color: rb.color }}
          >
            {rb.label}
          </span>
        </div>
      </td>

      {/* Decided By */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: "oklch(0.38 0.06 160)" }}
          >
            {record.decidedBy.charAt(0)}
          </div>
          <p className="text-xs text-gray-600 leading-tight">
            {record.decidedBy.split("(")[0].trim()}
          </p>
        </div>
      </td>

      {/* Notified */}
      <td className="px-4 py-3 text-center">
        {record.notified ? (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: "#DCFCE7", color: "#16A34A" }}
          >
            ✓ أُشعر
          </span>
        ) : (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: "#FEE2E2", color: "#DC2626" }}
          >
            ✗ لم يُشعر
          </span>
        )}
      </td>
    </motion.tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function AdminDecisionLog() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";

  const [search, setSearch] = useState("");
  const [filterDecision, setFilterDecision] = useState<DecisionType | "all">(
    "all"
  );
  const [filterAdmin, setFilterAdmin] = useState("all");
  const [sortField, setSortField] = useState<
    "decidedAt" | "responseTime" | "orderTotal"
  >("decidedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // tRPC data
  const decisionListQ = trpc.decisionLog.list.useQuery();
  const { data: rawDecisions = [], isLoading } = decisionListQ;
  const decisions: DecisionRecord[] = rawDecisions.map(mapDbRow);
  const seedMutation = trpc.decisionLog.seed.useMutation({
    onSuccess: () => void decisionListQ.refetch(),
  });

  // Unique admins
  const admins = useMemo(() => {
    const set = new Set(decisions.map(d => d.decidedBy.split("(")[0].trim()));
    return Array.from(set);
  }, [decisions]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let data = [...decisions];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        d =>
          d.orderNumber.toLowerCase().includes(q) ||
          d.distributor.toLowerCase().includes(q) ||
          d.company.toLowerCase().includes(q)
      );
    }
    if (filterDecision !== "all")
      data = data.filter(d => d.decision === filterDecision);
    if (filterAdmin !== "all")
      data = data.filter(d => d.decidedBy.includes(filterAdmin));
    if (dateFrom) data = data.filter(d => d.decidedAt >= dateFrom);
    if (dateTo) data = data.filter(d => d.decidedAt <= dateTo + " 23:59");
    data.sort((a, b) => {
      let va: number, vb: number;
      if (sortField === "decidedAt") {
        va = new Date(a.decidedAt).getTime();
        vb = new Date(b.decidedAt).getTime();
      } else if (sortField === "responseTime") {
        va = a.responseTime;
        vb = b.responseTime;
      } else {
        va = a.orderTotal;
        vb = b.orderTotal;
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return data;
  }, [
    decisions,
    search,
    filterDecision,
    filterAdmin,
    sortField,
    sortDir,
    dateFrom,
    dateTo,
  ]);

  // Stats
  const stats = useMemo(() => {
    if (decisions.length === 0)
      return {
        total: 0,
        approved: 0,
        rejected: 0,
        revision: 0,
        avgTime: 0,
        fastPct: 0,
        totalVal: 0,
      };
    const total = decisions.length;
    const approved = decisions.filter(d => d.decision === "approved").length;
    const rejected = decisions.filter(d => d.decision === "rejected").length;
    const revision = decisions.filter(
      d => d.decision === "revision_requested"
    ).length;
    const avgTime = Math.round(
      decisions.reduce((s, d) => s + d.responseTime, 0) / total
    );
    const fastPct = Math.round(
      (decisions.filter(d => d.responseTime <= 15).length / total) * 100
    );
    const totalVal = decisions
      .filter(d => d.decision === "approved")
      .reduce((s, d) => s + d.orderTotal, 0);
    return { total, approved, rejected, revision, avgTime, fastPct, totalVal };
  }, [decisions]);

  // Chart data
  const pieData = [
    { name: "موافقة", value: stats.approved, color: "#16A34A" },
    { name: "رفض", value: stats.rejected, color: "#DC2626" },
    { name: "طلب تعديل", value: stats.revision, color: "#D97706" },
  ];

  const barData = useMemo(() => {
    const dayNames = [
      "الأحد",
      "الاثنين",
      "الثلاثاء",
      "الأربعاء",
      "الخميس",
      "الجمعة",
      "السبت",
    ];
    const dayMap = new Map<
      string,
      { day: string; approved: number; rejected: number; revision: number }
    >();
    decisions.forEach(d => {
      const dateKey = d.decidedAt.split(" ")[0];
      if (!dayMap.has(dateKey)) {
        const dt = new Date(dateKey);
        dayMap.set(dateKey, {
          day: dayNames[dt.getDay()],
          approved: 0,
          rejected: 0,
          revision: 0,
        });
      }
      const entry = dayMap.get(dateKey)!;
      if (d.decision === "approved") entry.approved++;
      else if (d.decision === "rejected") entry.rejected++;
      else entry.revision++;
    });
    const sorted = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-5)
      .map(([, v]) => v);
    return sorted.length > 0
      ? sorted
      : [{ day: "لا توجد بيانات", approved: 0, rejected: 0, revision: 0 }];
  }, [decisions]);

  // Sort toggle
  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  // Export
  const handleExport = () => {
    const rows = filtered.map(d => ({
      "رقم الطلب": d.orderNumber,
      الموزع: d.distributor,
      الشركة: d.company,
      المدينة: d.city,
      القرار: DECISION_CONFIG[d.decision].label,
      السبب: d.reason || "—",
      المتابعة: d.followUp || "—",
      "الإجمالي (ر.س)": d.orderTotal,
      "وقت الاستجابة (دقيقة)": d.responseTime,
      المسؤول: d.decidedBy,
      التاريخ: d.decidedAt,
      "أُشعر الموزع": d.notified ? "نعم" : "لا",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "سجل القرارات");
    XLSX.writeFile(
      wb,
      `decision-log-${new Date().toISOString().split("T")[0]}.xlsx`
    );
    toast.success("تم تصدير سجل القرارات بنجاح");
  };

  return (
    <AdminLayout title="سجل القرارات" backHref="/admin/dashboard">
      <div className="space-y-6" dir={dir}>
        {/* ── Loading ───────────────────────────────────────── */}
        {isLoading && (
          <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
            جارٍ التحميل...
          </div>
        )}

        {/* ── Empty State ───────────────────────────────────── */}
        {!isLoading && decisions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <AlertCircle className="w-12 h-12 opacity-20 text-gray-400" />
            <p className="text-gray-400 text-sm">لا توجد سجلات قرارات بعد</p>
            {/* Seed button deleted for production */}
          </div>
        )}

        {!isLoading && decisions.length > 0 && (
          <>
            {/* ── KPI Cards ─────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "إجمالي القرارات",
                  value: stats.total,
                  icon: <Hash className="w-5 h-5" />,
                  color: "#3B82F6",
                  bg: "#EFF6FF",
                },
                {
                  label: "موافقات",
                  value: `${stats.approved} (${stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%)`,
                  icon: <CheckCircle2 className="w-5 h-5" />,
                  color: "#16A34A",
                  bg: "#DCFCE7",
                },
                {
                  label: "رفض وتعديل",
                  value: `${stats.rejected + stats.revision}`,
                  icon: <XCircle className="w-5 h-5" />,
                  color: "#DC2626",
                  bg: "#FEE2E2",
                },
                {
                  label: "متوسط وقت الاستجابة",
                  value: formatResponseTime(stats.avgTime),
                  icon: <Clock className="w-5 h-5" />,
                  color: "#D97706",
                  bg: "#FEF3C7",
                },
              ].map((kpi, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: kpi.bg, color: kpi.color }}
                  >
                    {kpi.icon}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{kpi.label}</p>
                    <p
                      className="text-lg font-bold text-gray-800"
                      style={{ fontFamily: "DM Serif Display, serif" }}
                    >
                      {kpi.value}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* ── Charts Row ────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Bar Chart */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
                <h3
                  className="font-bold text-gray-800 mb-4"
                  style={{ fontFamily: "DM Serif Display, serif" }}
                >
                  القرارات اليومية (آخر 5 أيام)
                </h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={barData}
                    margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: "#9CA3AF" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#9CA3AF" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="approved"
                      name="موافقة"
                      fill="#16A34A"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="rejected"
                      name="رفض"
                      fill="#DC2626"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="revision"
                      name="تعديل"
                      fill="#D97706"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Chart */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3
                  className="font-bold text-gray-800 mb-4"
                  style={{ fontFamily: "DM Serif Display, serif" }}
                >
                  توزيع القرارات
                </h3>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${v} قرار`]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {pieData.map(d => (
                    <div
                      key={d.name}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ background: d.color }}
                        />
                        <span className="text-gray-600">{d.name}</span>
                      </div>
                      <span className="font-semibold text-gray-700">
                        {d.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Filters & Table ───────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-wrap gap-3">
                <div>
                  <h3
                    className="font-bold text-gray-800"
                    style={{ fontFamily: "DM Serif Display, serif" }}
                  >
                    سجل القرارات التفصيلي
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {filtered.length} سجل
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-3.5 h-3.5 text-gray-400" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="بحث برقم الطلب أو الموزع..."
                      className="ps-9 pe-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 w-52"
                      style={
                        {
                          "--tw-ring-color": "oklch(0.38 0.06 160 / 0.3)",
                        } as any
                      }
                    />
                  </div>
                  {/* Filter Toggle */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    فلاتر
                    {showFilters ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {/* Export */}
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white"
                    style={{ background: "oklch(0.38 0.06 160)" }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    تصدير Excel
                  </button>
                </div>
              </div>

              {/* Expanded Filters */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-b border-gray-100"
                  >
                    <div
                      className="p-4 flex flex-wrap gap-3"
                      style={{ background: "#FAFAFA" }}
                    >
                      {/* Decision Filter */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500 font-semibold">
                          نوع القرار
                        </label>
                        <select
                          value={filterDecision}
                          onChange={e =>
                            setFilterDecision(e.target.value as any)
                          }
                          className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none"
                        >
                          <option value="all">الكل</option>
                          <option value="approved">موافقة</option>
                          <option value="rejected">رفض</option>
                          <option value="revision_requested">طلب تعديل</option>
                        </select>
                      </div>
                      {/* Admin Filter */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500 font-semibold">
                          المسؤول
                        </label>
                        <select
                          value={filterAdmin}
                          onChange={e => setFilterAdmin(e.target.value)}
                          className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none"
                        >
                          <option value="all">الكل</option>
                          {admins.map(a => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Date From */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500 font-semibold">
                          من تاريخ
                        </label>
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={e => setDateFrom(e.target.value)}
                          className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none"
                        />
                      </div>
                      {/* Date To */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500 font-semibold">
                          إلى تاريخ
                        </label>
                        <input
                          type="date"
                          value={dateTo}
                          onChange={e => setDateTo(e.target.value)}
                          className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none"
                        />
                      </div>
                      {/* Reset */}
                      <div className="flex items-end">
                        <button
                          onClick={() => {
                            setSearch("");
                            setFilterDecision("all");
                            setFilterAdmin("all");
                            setDateFrom("");
                            setDateTo("");
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-100"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> إعادة تعيين
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr style={{ background: "#F9FAFB" }}>
                      <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500">
                        الطلب
                      </th>
                      <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500">
                        الموزع
                      </th>
                      <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500">
                        القرار
                      </th>
                      <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500">
                        السبب / الملاحظة
                      </th>
                      <th
                        className="text-end px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer select-none"
                        onClick={() => toggleSort("orderTotal")}
                      >
                        <span className="flex items-center justify-end gap-1">
                          الإجمالي
                          {sortField === "orderTotal" ? (
                            sortDir === "asc" ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )
                          ) : null}
                        </span>
                      </th>
                      <th
                        className="text-center px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer select-none"
                        onClick={() => toggleSort("responseTime")}
                      >
                        <span className="flex items-center justify-center gap-1">
                          وقت الاستجابة
                          {sortField === "responseTime" ? (
                            sortDir === "asc" ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )
                          ) : null}
                        </span>
                      </th>
                      <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500">
                        المسؤول
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">
                        الإشعار
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filtered.length > 0 ? (
                        filtered.map(record => (
                          <DecisionDetailRow key={record.id} record={record} />
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-4 py-16 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <div
                                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                                style={{ background: "#F3F4F6" }}
                              >
                                <AlertCircle className="w-7 h-7 text-gray-400" />
                              </div>
                              <p className="text-sm text-gray-500">
                                لا توجد سجلات تطابق الفلاتر المحددة
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* Footer Summary */}
              {filtered.length > 0 && (
                <div
                  className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-xs text-gray-500"
                  style={{ background: "#FAFAFA" }}
                >
                  <span>{filtered.length} سجل</span>
                  <span>
                    إجمالي قيمة الموافقات:&nbsp;
                    <strong className="text-gray-700">
                      {filtered
                        .filter(d => d.decision === "approved")
                        .reduce((s, d) => s + d.orderTotal, 0)
                        .toLocaleString()}{" "}
                      ر.س
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
