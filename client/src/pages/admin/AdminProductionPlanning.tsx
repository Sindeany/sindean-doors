// ============================================================
// AdminProductionPlanning - تخطيط الإنتاج - سنديان للأبواب
// مخطط غانت + إدارة الطاقة الإنتاجية + حاسبة التسليم
// ============================================================
import { useState, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import {
  Factory,
  CalendarDays,
  BarChart3,
  Settings2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Zap,
  Package,
  DoorOpen,
  Frame,
  Settings,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save,
  X,
  Calculator,
  Gauge,
  Layers,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// ─── أيقونات الأقسام ────────────────────────────────────────
const DEPT_META: Record<
  string,
  { icon: React.ReactNode; color: string; bg: string; label: string }
> = {
  door_line: {
    icon: <DoorOpen className="w-4 h-4" />,
    color: "#2563EB",
    bg: "#EFF6FF",
    label: "خط الأبواب",
  },
  frame_line: {
    icon: <Frame className="w-4 h-4" />,
    color: "#059669",
    bg: "#ECFDF5",
    label: "خط الإطارات",
  },
  accessories: {
    icon: <Settings className="w-4 h-4" />,
    color: "#D97706",
    bg: "#FFFBEB",
    label: "الإكسسوارات",
  },
  qc: {
    icon: <CheckSquare className="w-4 h-4" />,
    color: "#7C3AED",
    bg: "#F5F3FF",
    label: "ضبط الجودة",
  },
  packing: {
    icon: <Package className="w-4 h-4" />,
    color: "#DC2626",
    bg: "#FEF2F2",
    label: "التغليف",
  },
};

const STATUS_COLOR: Record<string, string> = {
  draft: "#6B7280",
  issued: "#2563EB",
  in_progress: "#D97706",
  completed: "#059669",
  on_hold: "#7C3AED",
  cancelled: "#DC2626",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "مسودة",
  issued: "صادر",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  on_hold: "موقوف",
  cancelled: "ملغي",
};

// ─── KPI Card ──────────────────────────────────────────────
function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4 shadow-sm">
      <div
        className="rounded-xl p-3 flex-shrink-0"
        style={{ background: color ? `${color}18` : "#F3F4F6" }}
      >
        <span style={{ color: color ?? "#6B7280" }}>{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

// ─── مخطط غانت ────────────────────────────────────────────
function GanttChart({
  orders,
  chartRange,
}: {
  orders: any[];
  chartRange: { from: string; to: string };
}) {
  const fromDate = new Date(chartRange.from);
  const toDate = new Date(chartRange.to);
  const totalDays = Math.ceil(
    (toDate.getTime() - fromDate.getTime()) / 86400000
  );

  // نُولّد تسميات الأسابيع
  const weekLabels: { label: string; leftPct: number }[] = [];
  const cursor = new Date(fromDate);
  while (cursor <= toDate) {
    const day = cursor.getDay();
    if (day === 0) {
      // الأحد = بداية أسبوع
      const pct =
        ((cursor.getTime() - fromDate.getTime()) / 86400000 / totalDays) * 100;
      weekLabels.push({
        label: cursor.toLocaleDateString("ar-SA", {
          month: "short",
          day: "numeric",
        }),
        leftPct: pct,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // خط اليوم
  const todayPct =
    ((Date.now() - fromDate.getTime()) / 86400000 / totalDays) * 100;

  if (orders.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Factory className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>لا توجد أوامر تشغيل نشطة</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 900 }}>
        {/* رأس الأسابيع */}
        <div
          className="relative h-8 border-b border-gray-200 mb-1"
          style={{ marginRight: 200 }}
        >
          {weekLabels.map((w, i) => (
            <div
              key={i}
              className="absolute top-1 text-xs text-gray-500"
              style={{ left: `${w.leftPct}%`, transform: "translateX(-50%)" }}
            >
              {w.label}
            </div>
          ))}
          {/* خط اليوم */}
          {todayPct >= 0 && todayPct <= 100 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-400 opacity-60"
              style={{ left: `${todayPct}%` }}
            />
          )}
        </div>

        {/* صفوف الأوامر */}
        {orders.map((order, idx) => {
          const start = new Date(order.startDate);
          const end = new Date(order.dueDate);
          const leftPct = Math.max(
            0,
            ((start.getTime() - fromDate.getTime()) / 86400000 / totalDays) *
              100
          );
          const widthPct = Math.min(
            100 - leftPct,
            ((end.getTime() - start.getTime()) / 86400000 / totalDays) * 100
          );
          const isLate = end < new Date() && order.status !== "completed";
          const color = isLate
            ? "#DC2626"
            : (STATUS_COLOR[order.status] ?? "#6B7280");

          return (
            <div
              key={order.id}
              className="flex items-center gap-2 mb-1.5 group"
            >
              {/* اسم الأمر */}
              <div className="flex-shrink-0 text-right" style={{ width: 200 }}>
                <div className="text-xs font-semibold text-gray-700 truncate">
                  {order.woNumber}
                </div>
                <div className="text-xs text-gray-400 truncate">
                  {order.distributorName}
                </div>
              </div>
              {/* شريط الغانت */}
              <div className="flex-1 relative h-8 bg-gray-50 rounded">
                {/* خطوط الشبكة */}
                {weekLabels.map((w, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 w-px bg-gray-200"
                    style={{ left: `${w.leftPct}%` }}
                  />
                ))}
                {/* خط اليوم */}
                {todayPct >= 0 && todayPct <= 100 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-400 opacity-40 z-10"
                    style={{ left: `${todayPct}%` }}
                  />
                )}
                {/* شريط الأمر */}
                <div
                  className="absolute top-1 bottom-1 rounded flex items-center px-2 overflow-hidden"
                  style={{
                    left: `${leftPct}%`,
                    width: `${Math.max(widthPct, 2)}%`,
                    background: color,
                    opacity: 0.85,
                  }}
                >
                  {/* شريط التقدم */}
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-white opacity-20 rounded"
                    style={{ width: `${order.progressPercent}%` }}
                  />
                  <span className="text-white text-xs font-semibold z-10 truncate">
                    {order.totalDoors} باب · {order.progressPercent}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* أسطورة */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 flex-wrap">
          {Object.entries(STATUS_COLOR).map(([k, c]) => (
            <div
              key={k}
              className="flex items-center gap-1.5 text-xs text-gray-500"
            >
              <div className="w-3 h-3 rounded" style={{ background: c }} />
              {STATUS_LABEL[k]}
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-px h-4 bg-red-400" />
            اليوم
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── بطاقة الخط الإنتاجي ────────────────────────────────────
function LineCapacityCard({
  line,
  currentLoad,
  onSave,
}: {
  line: any;
  currentLoad: number;
  onSave: (data: any) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [cap, setCap] = useState(String(line.dailyCapacity));
  const [days, setDays] = useState(String(line.workDaysPerWeek));
  const meta = DEPT_META[line.lineId] ?? {
    color: "#6B7280",
    bg: "#F3F4F6",
    label: line.nameAr,
  };
  const utilPct =
    line.dailyCapacity > 0
      ? Math.min(100, Math.round((currentLoad / line.dailyCapacity) * 100))
      : 0;
  const utilColor =
    utilPct >= 90 ? "#DC2626" : utilPct >= 70 ? "#D97706" : "#059669";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2.5" style={{ background: meta.bg }}>
            <span style={{ color: meta.color }}>{meta.icon}</span>
          </div>
          <div>
            <div className="font-semibold text-gray-900">{line.nameAr}</div>
            <div className="text-xs text-gray-400">
              {line.nameEn || meta.label}
            </div>
          </div>
        </div>
        <button
          onClick={() => setEditing(e => !e)}
          className="text-gray-400 hover:text-gray-700 transition-colors"
        >
          {editing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
        </button>
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              الطاقة اليومية (وحدة/يوم)
            </label>
            <Input
              type="number"
              min={1}
              max={999}
              value={cap}
              onChange={e => setCap(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              أيام العمل / أسبوع
            </label>
            <Input
              type="number"
              min={1}
              max={7}
              value={days}
              onChange={e => setDays(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <Button
            size="sm"
            className="w-full"
            onClick={() => {
              onSave({
                ...line,
                dailyCapacity: Number(cap),
                workDaysPerWeek: Number(days),
              });
              setEditing(false);
            }}
          >
            <Save className="w-3.5 h-3.5 me-1.5" /> حفظ
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">الطاقة اليومية</span>
            <span className="font-semibold">{line.dailyCapacity} وحدة</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">أيام العمل</span>
            <span className="font-semibold">
              {line.workDaysPerWeek} أيام/أسبوع
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">الحمل الحالي</span>
            <span className="font-semibold">{currentLoad} وحدة</span>
          </div>
          {/* شريط الاستخدام */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">نسبة الاستخدام</span>
              <span className="font-semibold" style={{ color: utilColor }}>
                {utilPct}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${utilPct}%`, background: utilColor }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── حاسبة التسليم ──────────────────────────────────────────
function DeliveryCalculator() {
  const [doors, setDoors] = useState("50");
  const [priority, setPriority] = useState<"normal" | "urgent" | "vip">(
    "normal"
  );
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [enabled, setEnabled] = useState(false);

  const { data, isFetching } = trpc.production.estimateDelivery.useQuery(
    { totalDoors: Number(doors) || 1, priority, startDate },
    { enabled }
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <Calculator className="w-5 h-5 text-blue-600" />
        <h3 className="font-bold text-gray-900">حاسبة موعد التسليم</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">
            عدد الأبواب
          </label>
          <Input
            type="number"
            min={1}
            value={doors}
            onChange={e => {
              setDoors(e.target.value);
              setEnabled(false);
            }}
            className="h-9"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">الأولوية</label>
          <select
            className="w-full h-9 border border-gray-200 rounded-lg px-3 text-sm bg-white"
            value={priority}
            onChange={e => {
              setPriority(e.target.value as any);
              setEnabled(false);
            }}
          >
            <option value="normal">عادي</option>
            <option value="urgent">عاجل (+25% طاقة)</option>
            <option value="vip">VIP (+50% طاقة)</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">
            تاريخ البدء
          </label>
          <Input
            type="date"
            value={startDate}
            onChange={e => {
              setStartDate(e.target.value);
              setEnabled(false);
            }}
            className="h-9"
          />
        </div>
      </div>

      <Button
        className="w-full mb-5"
        onClick={() => setEnabled(true)}
        disabled={isFetching}
      >
        {isFetching ? (
          <>
            <RefreshCw className="w-4 h-4 me-2 animate-spin" /> جاري الحساب...
          </>
        ) : (
          <>
            <Calculator className="w-4 h-4 me-2" /> احسب موعد التسليم
          </>
        )}
      </Button>

      {data && enabled && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* النتيجة الرئيسية */}
          <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
            <div className="text-xs text-blue-500 mb-1">
              موعد التسليم المتوقع
            </div>
            <div className="text-2xl font-bold text-blue-700">
              {new Date(data.estimatedDeliveryDate).toLocaleDateString(
                "ar-SA",
                {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }
              )}
            </div>
            <div className="text-sm text-blue-500 mt-1">
              {data.estimatedWorkDays} يوم عمل
            </div>
          </div>

          {/* نقطة الاختناق */}
          {data.bottleneck && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-semibold text-amber-700">
                  نقطة الاختناق:{" "}
                </span>
                <span className="text-amber-600">{data.bottleneck.nameAr}</span>
                <span className="text-amber-500">
                  {" "}
                  ({data.bottleneck.daysNeeded} يوم)
                </span>
              </div>
            </div>
          )}

          {/* توزيع الأيام على الخطوط */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              توزيع الأيام على الخطوط
            </div>
            {data.lineBreakdown.map(l => {
              const meta = DEPT_META[l.lineId];
              const isBottleneck = l.lineId === data.bottleneck?.lineId;
              return (
                <div key={l.lineId} className="flex items-center gap-3">
                  <div className="w-28 text-xs text-gray-500 text-right flex-shrink-0">
                    {l.nameAr}
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (l.daysNeeded / data.estimatedWorkDays) * 100)}%`,
                        background: meta?.color ?? "#6B7280",
                      }}
                    />
                  </div>
                  <div
                    className={`text-xs font-semibold w-14 text-left flex-shrink-0 ${isBottleneck ? "text-red-600" : "text-gray-600"}`}
                  >
                    {l.daysNeeded} يوم {isBottleneck && "⚡"}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── الصفحة الرئيسية ─────────────────────────────────────────
export default function AdminProductionPlanning() {
  const { lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<
    "gantt" | "capacity" | "calculator"
  >("gantt");

  const summaryQ = trpc.production.summary.useQuery();
  const ganttQ = trpc.production.ganttData.useQuery();
  const capacityQ = trpc.production.getCapacity.useQuery();

  const upsertLine = trpc.production.upsertLine.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ إعدادات الخط");
      capacityQ.refetch();
    },
    onError: () => toast.error("فشل الحفظ"),
  });

  const summary = summaryQ.data;
  const gantt = ganttQ.data;
  const capacity = capacityQ.data ?? [];

  // الحمل الحالي لكل خط
  const lineLoad: Record<string, number> = summary?.lineLoad ?? {};

  return (
    <AdminLayout title="تخطيط الإنتاج">
      <div className="p-6 space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 rounded-xl p-2.5">
              <Factory className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">تخطيط الإنتاج</h1>
              <p className="text-sm text-gray-500">
                مخطط غانت · الطاقة الإنتاجية · حاسبة التسليم
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              summaryQ.refetch();
              ganttQ.refetch();
              capacityQ.refetch();
            }}
          >
            <RefreshCw className="w-4 h-4 me-1.5" /> تحديث
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={<Factory className="w-5 h-5" />}
            label="أوامر قيد التنفيذ"
            value={summary?.activeOrders ?? "—"}
            sub={`${summary?.issuedOrders ?? 0} صادرة`}
            color="#2563EB"
          />
          <KpiCard
            icon={<DoorOpen className="w-5 h-5" />}
            label="أبواب في الإنتاج"
            value={summary?.totalDoorsInProduction ?? "—"}
            sub="وحدة نشطة"
            color="#059669"
          />
          <KpiCard
            icon={<Gauge className="w-5 h-5" />}
            label="متوسط التقدم"
            value={`${summary?.avgProgress ?? 0}%`}
            sub="للأوامر النشطة"
            color="#D97706"
          />
          <KpiCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="أوامر متأخرة"
            value={summary?.overdueOrders ?? "—"}
            sub={`${summary?.onHoldOrders ?? 0} موقوفة`}
            color="#DC2626"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {[
            {
              key: "gantt",
              icon: <CalendarDays className="w-4 h-4" />,
              label: "مخطط غانت",
            },
            {
              key: "capacity",
              icon: <BarChart3 className="w-4 h-4" />,
              label: "الطاقة الإنتاجية",
            },
            {
              key: "calculator",
              icon: <Calculator className="w-4 h-4" />,
              label: "حاسبة التسليم",
            },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Gantt */}
        {activeTab === "gantt" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-blue-500" />
                مخطط غانت — أوامر التشغيل النشطة
              </h2>
              {gantt && (
                <span className="text-xs text-gray-400">
                  {gantt.orders.length} أمر · من {gantt.chartRange.from} إلى{" "}
                  {gantt.chartRange.to}
                </span>
              )}
            </div>
            {ganttQ.isLoading ? (
              <div className="text-center py-12 text-gray-400">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                <p>جاري التحميل...</p>
              </div>
            ) : gantt ? (
              <GanttChart orders={gantt.orders} chartRange={gantt.chartRange} />
            ) : null}
          </motion.div>
        )}

        {/* Tab: Capacity */}
        {activeTab === "capacity" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {capacityQ.isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-gray-100 rounded-2xl h-44 animate-pulse"
                    />
                  ))
                : capacity.map(line => (
                    <LineCapacityCard
                      key={line.lineId}
                      line={line}
                      currentLoad={lineLoad[line.lineId] ?? 0}
                      onSave={data => upsertLine.mutate(data)}
                    />
                  ))}
            </div>

            {/* جدول تفصيلي */}
            {capacity.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mt-4">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-500" />
                  ملخص الطاقة الأسبوعية
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">
                          الخط
                        </th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">
                          طاقة يومية
                        </th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">
                          أيام/أسبوع
                        </th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">
                          طاقة أسبوعية
                        </th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">
                          الحمل الحالي
                        </th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium">
                          الاستخدام
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {capacity.map(line => {
                        const weekCap =
                          line.dailyCapacity * line.workDaysPerWeek;
                        const load = lineLoad[line.lineId] ?? 0;
                        const pct =
                          weekCap > 0
                            ? Math.min(100, Math.round((load / weekCap) * 100))
                            : 0;
                        const meta = DEPT_META[line.lineId];
                        return (
                          <tr
                            key={line.lineId}
                            className="border-b border-gray-50 hover:bg-gray-50"
                          >
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <span style={{ color: meta?.color }}>
                                  {meta?.icon}
                                </span>
                                <span className="font-medium text-gray-800">
                                  {line.nameAr}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center text-gray-700">
                              {line.dailyCapacity}
                            </td>
                            <td className="py-3 px-3 text-center text-gray-700">
                              {line.workDaysPerWeek}
                            </td>
                            <td className="py-3 px-3 text-center font-semibold text-gray-800">
                              {weekCap}
                            </td>
                            <td className="py-3 px-3 text-center text-gray-700">
                              {load}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center gap-2 justify-center">
                                <div className="w-16 bg-gray-100 rounded-full h-1.5">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${pct}%`,
                                      background:
                                        pct >= 90
                                          ? "#DC2626"
                                          : pct >= 70
                                            ? "#D97706"
                                            : "#059669",
                                    }}
                                  />
                                </div>
                                <span
                                  className="text-xs font-semibold"
                                  style={{
                                    color:
                                      pct >= 90
                                        ? "#DC2626"
                                        : pct >= 70
                                          ? "#D97706"
                                          : "#059669",
                                  }}
                                >
                                  {pct}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Tab: Calculator */}
        {activeTab === "calculator" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-2xl"
          >
            <DeliveryCalculator />
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
}
