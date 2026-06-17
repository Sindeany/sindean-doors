// ============================================================
// AdminWorkOrders - أوامر التشغيل الداخلية - سنديان للأبواب
// توجيه أقسام المصنع: خط الأبواب، خط الإطارات، قسم الإكسسوارات
// تحديد الكميات الدقيقة لكل مرحلة إنتاجية
// ============================================================
import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Download,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Circle,
  RefreshCw,
  ChevronRight,
  BarChart3,
  Users,
  Package,
  Layers,
  DoorOpen,
  Frame,
  Settings,
  Zap,
  Eye,
  Edit3,
  CalendarDays,
  Hash,
  ArrowUpRight,
  X,
  Send,
  ClipboardList,
  TrendingUp,
  AlertCircle,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Printer,
  Copy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import WorkOrderModal from "@/components/admin/WorkOrderModal";
import CreateWorkOrderWizard from "@/components/admin/CreateWorkOrderWizard";

// ─── أنواع البيانات ───────────────────────────────────────────
export type DeptId =
  | "door_line"
  | "frame_line"
  | "accessories"
  | "qc"
  | "packing";
export type WorkOrderStatus =
  | "draft"
  | "issued"
  | "in_progress"
  | "completed"
  | "on_hold"
  | "cancelled";
export type Priority = "normal" | "urgent" | "vip";

export interface DeptTask {
  deptId: DeptId;
  quantity: number;
  unit: string;
  specs: string;
  assignedTo: string;
  startDate: string;
  dueDate: string;
  status: WorkOrderStatus;
  completedQty: number;
  notes?: string;
}

export interface DoorItem {
  code: string;
  model: string;
  width: number;
  height: number;
  direction: "right" | "left";
  frameType: string;
  edgeType: "ABS" | "film";
  doorColor: string;
  frameColor: string;
  lockType: string;
  hingeType: string;
  quantity: number;
  specialReqs?: string;
}

export interface WorkOrder {
  id: string;
  dbId?: number; // DB numeric id — set for DB-backed work orders
  woNumber: string;
  poNumber: string;
  distributorName: string;
  distributorPhone: string;
  issuedAt: string;
  startDate: string;
  dueDate: string;
  status: WorkOrderStatus;
  priority: Priority;
  orderType: "standard" | "custom";
  totalDoors: number;
  totalValue: number;
  doors: DoorItem[];
  deptTasks: DeptTask[];
  supervisorName: string;
  notes?: string;
  progressPercent: number;
  cancelReason?: string;
  cancelledBy?: string;
  cancelledAt?: number;
}

// ─── إعدادات الأقسام ──────────────────────────────────────────
export const DEPARTMENTS: Record<
  DeptId,
  {
    labelAr: string;
    labelEn: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
  }
> = {
  door_line: {
    labelAr: "خط الأبواب",
    labelEn: "Door Line",
    icon: <DoorOpen className="w-4 h-4" />,
    color: "oklch(0.50 0.16 250)",
    bgColor: "oklch(0.95 0.03 250)",
  },
  frame_line: {
    labelAr: "خط الإطارات",
    labelEn: "Frame Line",
    icon: <Frame className="w-4 h-4" />,
    color: "oklch(0.50 0.16 140)",
    bgColor: "oklch(0.95 0.03 140)",
  },
  accessories: {
    labelAr: "قسم الإكسسوارات",
    labelEn: "Accessories",
    icon: <Settings className="w-4 h-4" />,
    color: "oklch(0.50 0.16 50)",
    bgColor: "oklch(0.97 0.03 50)",
  },
  qc: {
    labelAr: "ضبط الجودة",
    labelEn: "QC",
    icon: <CheckSquare className="w-4 h-4" />,
    color: "oklch(0.50 0.16 330)",
    bgColor: "oklch(0.96 0.03 330)",
  },
  packing: {
    labelAr: "التغليف",
    labelEn: "Packing",
    icon: <Package className="w-4 h-4" />,
    color: "oklch(0.50 0.16 20)",
    bgColor: "oklch(0.97 0.03 20)",
  },
};

// ─── إعدادات الحالات ──────────────────────────────────────────
export const WO_STATUS: Record<
  WorkOrderStatus,
  {
    labelAr: string;
    color: string;
    bg: string;
    icon: React.ReactNode;
  }
> = {
  draft: {
    labelAr: "مسودة",
    color: "#6B7280",
    bg: "#F3F4F6",
    icon: <Circle className="w-3.5 h-3.5" />,
  },
  issued: {
    labelAr: "صادر",
    color: "#2563EB",
    bg: "#EFF6FF",
    icon: <Send className="w-3.5 h-3.5" />,
  },
  in_progress: {
    labelAr: "قيد التنفيذ",
    color: "#D97706",
    bg: "#FFFBEB",
    icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
  },
  completed: {
    labelAr: "مكتمل",
    color: "#059669",
    bg: "#ECFDF5",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  on_hold: {
    labelAr: "موقوف",
    color: "#7C3AED",
    bg: "#F5F3FF",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  cancelled: {
    labelAr: "ملغي",
    color: "#DC2626",
    bg: "#FEF2F2",
    icon: <X className="w-3.5 h-3.5" />,
  },
};

function safeParseJsonArray(val: any): any[] {
  if (Array.isArray(val)) {
    return val;
  }
  if (typeof val === "string" && val.trim() !== "") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse JSON field:", e);
      return [];
    }
  }
  return [];
}

// ─── تحويل صف DB إلى WorkOrder ─────────────────────────────────────────────
function mapDbWORow(row: any): WorkOrder {
  return {
    id: row.woNumber,
    dbId: row.id,
    woNumber: row.woNumber,
    poNumber: row.poNumber,
    distributorName: row.distributorName,
    distributorPhone: row.distributorPhone ?? "",
    issuedAt: new Date(row.issuedAt).toLocaleString("ar-SA"),
    startDate: row.startDate,
    dueDate: row.dueDate,
    status: row.status as WorkOrderStatus,
    priority: row.priority as Priority,
    orderType: row.orderType as "standard" | "custom",
    totalDoors: row.totalDoors,
    totalValue: row.totalValue,
    doors: safeParseJsonArray(row.doors),
    deptTasks: safeParseJsonArray(row.deptTasks),
    supervisorName: row.supervisorName ?? "",
    notes: row.notes ?? undefined,
    progressPercent: row.progressPercent,
    cancelReason: row.cancelReason ?? undefined,
    cancelledBy: row.cancelledBy ?? undefined,
    cancelledAt: row.cancelledAt ?? undefined,
  };
}

// ─── بيانات تجريبية ──────────────────────────────────────
// (تُحتفظ بها فارغة — البيانات تأتي من DB)
const SAMPLE_WORK_ORDERS: WorkOrder[] = [];

// ─── مساعدات ─────────────────────────────────────────────────
function getPriorityBadge(p: Priority) {
  if (p === "urgent")
    return (
      <Badge
        className="text-xs"
        style={{
          background: "oklch(0.92 0.15 25)",
          color: "oklch(0.35 0.15 25)",
        }}
      >
        عاجل
      </Badge>
    );
  if (p === "vip")
    return (
      <Badge
        className="text-xs"
        style={{
          background: "oklch(0.92 0.12 60)",
          color: "oklch(0.35 0.12 60)",
        }}
      >
        VIP
      </Badge>
    );
  return (
    <Badge variant="secondary" className="text-xs">
      عادي
    </Badge>
  );
}

function getStatusBadge(s: WorkOrderStatus) {
  const cfg = WO_STATUS[s];
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.icon} {cfg.labelAr}
    </span>
  );
}

function getDeptProgress(tasks: DeptTask[], deptId: DeptId) {
  const t = tasks.find(t => t.deptId === deptId);
  if (!t) return null;
  const pct =
    t.quantity > 0 ? Math.round((t.completedQty / t.quantity) * 100) : 0;
  return { ...t, pct };
}

// ─── مكوّن بطاقة أمر التشغيل ─────────────────────────────────
function WorkOrderCard({
  wo,
  onClick,
}: {
  wo: WorkOrder;
  onClick: () => void;
}) {
  const daysLeft = Math.ceil(
    (new Date(wo.dueDate).getTime() - Date.now()) / 86400000
  );
  const isLate = daysLeft < 0;
  const isClose = daysLeft >= 0 && daysLeft <= 3;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-all cursor-pointer group"
      style={{ borderRight: `4px solid ${WO_STATUS[wo.status].color}` }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-gray-900 text-sm">
              {wo.woNumber}
            </span>
            {getPriorityBadge(wo.priority)}
            {wo.orderType === "custom" && (
              <Badge
                variant="outline"
                className="text-xs border-purple-200 text-purple-700"
              >
                مخصص
              </Badge>
            )}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {wo.distributorName}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">PO: {wo.poNumber}</div>
        </div>
        <div className="text-left flex-shrink-0">
          <div className="text-sm font-bold text-gray-900">
            {wo.totalDoors} باب
          </div>
          <div className="text-xs text-gray-400">
            {wo.totalValue.toLocaleString()} ر.س
          </div>
        </div>
      </div>

      {/* Status + Supervisor */}
      <div className="flex items-center justify-between mb-4">
        {getStatusBadge(wo.status)}
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Users className="w-3 h-3" />
          <span>{wo.supervisorName}</span>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-500">التقدم الكلي</span>
          <span className="text-xs font-bold text-gray-700">
            {wo.progressPercent}%
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background:
                wo.progressPercent === 100
                  ? "oklch(0.50 0.16 140)"
                  : wo.priority === "urgent"
                    ? "oklch(0.55 0.18 25)"
                    : wo.priority === "vip"
                      ? "oklch(0.55 0.16 60)"
                      : "oklch(0.50 0.16 250)",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${wo.progressPercent}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Dept Mini-Status */}
      <div className="grid grid-cols-5 gap-1.5 mb-4">
        {(Object.keys(DEPARTMENTS) as DeptId[]).map(deptId => {
          const task = wo.deptTasks.find(t => t.deptId === deptId);
          const dept = DEPARTMENTS[deptId];
          const pct = task
            ? Math.round((task.completedQty / task.quantity) * 100)
            : 0;
          const statusColor = !task
            ? "#E5E7EB"
            : task.status === "completed"
              ? "oklch(0.50 0.16 140)"
              : task.status === "in_progress"
                ? dept.color
                : task.status === "issued"
                  ? "#93C5FD"
                  : "#E5E7EB";

          return (
            <div key={deptId} className="flex flex-col items-center gap-1">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{
                  background: task ? dept.bgColor : "#F9FAFB",
                  color: task ? dept.color : "#D1D5DB",
                }}
                title={dept.labelAr}
              >
                {dept.icon}
              </div>
              <div
                className="w-full h-1 rounded-full"
                style={{ background: statusColor, opacity: task ? 1 : 0.3 }}
              />
              <span className="text-[10px] text-gray-400">
                {task ? `${pct}%` : "—"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <div
          className="flex items-center gap-1"
          style={{
            color: isLate ? "#DC2626" : isClose ? "#D97706" : "#9CA3AF",
          }}
        >
          <Clock className="w-3 h-3" />
          <span className={isLate || isClose ? "font-semibold" : ""}>
            {isLate
              ? `تأخر ${Math.abs(daysLeft)} يوم`
              : daysLeft === 0
                ? "اليوم آخر موعد"
                : `${daysLeft} يوم متبقي`}
          </span>
        </div>
        <button
          className="flex items-center gap-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: "oklch(0.45 0.10 160)" }}
        >
          عرض التفاصيل <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── مكوّن صف قائمة ──────────────────────────────────────────
function WorkOrderRow({ wo, onClick }: { wo: WorkOrder; onClick: () => void }) {
  const daysLeft = Math.ceil(
    (new Date(wo.dueDate).getTime() - Date.now()) / 86400000
  );
  const isLate = daysLeft < 0;
  const isClose = daysLeft >= 0 && daysLeft <= 3;

  return (
    <motion.tr
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-8 rounded-full flex-shrink-0"
            style={{ background: WO_STATUS[wo.status].color }}
          />
          <div>
            <div className="font-bold text-sm text-gray-900">{wo.woNumber}</div>
            <div className="text-xs text-gray-400">{wo.poNumber}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-gray-800 font-medium">
          {wo.distributorName}
        </div>
        <div className="text-xs text-gray-400">{wo.supervisorName}</div>
      </td>
      <td className="px-4 py-3 text-center">
        <div className="text-sm font-bold text-gray-900">{wo.totalDoors}</div>
        <div className="text-xs text-gray-400">باب</div>
      </td>
      <td className="px-4 py-3">{getStatusBadge(wo.status)}</td>
      <td className="px-4 py-3">{getPriorityBadge(wo.priority)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-16">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${wo.progressPercent}%`,
                background:
                  wo.progressPercent === 100
                    ? "oklch(0.50 0.16 140)"
                    : "oklch(0.50 0.16 250)",
              }}
            />
          </div>
          <span className="text-xs font-bold text-gray-600 w-8 text-left">
            {wo.progressPercent}%
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={`text-xs font-medium ${isLate ? "text-red-600" : isClose ? "text-amber-600" : "text-gray-500"}`}
        >
          {isLate
            ? `تأخر ${Math.abs(daysLeft)} يوم`
            : daysLeft === 0
              ? "اليوم"
              : `${daysLeft} يوم`}
        </span>
      </td>
      <td className="px-4 py-3">
        <button
          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors hover:bg-gray-100"
          style={{ color: "oklch(0.45 0.10 160)" }}
        >
          <Eye className="w-3.5 h-3.5" /> عرض
        </button>
      </td>
    </motion.tr>
  );
}

// ─── الصفحة الرئيسية ─────────────────────────────────────────
export default function AdminWorkOrders() {
  const { lang } = useLanguage();
  const [view, setView] = useState<"cards" | "list" | "dept">("cards");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Set<DeptId>>(
    new Set<DeptId>(["door_line", "frame_line", "accessories"])
  );

  // ── جلب الطلبات من DB ──
  const {
    data: dbRows = [],
    isLoading,
    refetch,
  } = trpc.workOrders.list.useQuery();
  const seedMutation = trpc.workOrders.seed.useMutation({
    onSuccess: () => refetch(),
  });
  const workOrders = dbRows.map(mapDbWORow);

  // ─── فلترة ───────────────────────────────────────────────
  const filtered = workOrders.filter(wo => {
    if (
      search &&
      !wo.woNumber.includes(search) &&
      !wo.distributorName.includes(search) &&
      !wo.poNumber.includes(search)
    )
      return false;
    if (filterStatus !== "all" && wo.status !== filterStatus) return false;
    if (filterPriority !== "all" && wo.priority !== filterPriority)
      return false;
    if (filterDept !== "all") {
      const hasTask = wo.deptTasks.some(
        t => t.deptId === filterDept && t.status !== "draft"
      );
      if (!hasTask) return false;
    }
    return true;
  });

  // ─── KPIs ─────────────────────────────────────────────────
  const kpis = [
    {
      label: "إجمالي أوامر التشغيل",
      value: workOrders.length,
      sub: "هذا الشهر",
      icon: <ClipboardList className="w-5 h-5" />,
      color: "oklch(0.50 0.16 250)",
    },
    {
      label: "قيد التنفيذ",
      value: workOrders.filter(w => w.status === "in_progress").length,
      sub: "أوامر نشطة",
      icon: <RefreshCw className="w-5 h-5" />,
      color: "oklch(0.55 0.18 50)",
    },
    {
      label: "مكتملة",
      value: workOrders.filter(w => w.status === "completed").length,
      sub: "تم التسليم",
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: "oklch(0.50 0.16 140)",
    },
    {
      label: "إجمالي الأبواب",
      value: workOrders.reduce((s, w) => s + w.totalDoors, 0),
      sub: "في جميع الأوامر",
      icon: <DoorOpen className="w-5 h-5" />,
      color: "oklch(0.50 0.16 330)",
    },
    {
      label: "أوامر عاجلة",
      value: workOrders.filter(
        w => w.priority === "urgent" && w.status !== "completed"
      ).length,
      sub: "تحتاج متابعة فورية",
      icon: <Zap className="w-5 h-5" />,
      color: "oklch(0.55 0.18 25)",
    },
  ];

  const toggleDept = (deptId: DeptId) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
      return next;
    });
  };

  return (
    <AdminLayout
      title={
        lang === "zh"
          ? "生产工单"
          : lang === "en"
            ? "Work Orders"
            : "أوامر التشغيل الداخلية"
      }
      subtitle={
        lang === "zh"
          ? "管理工厂生产工单"
          : lang === "en"
            ? "Manage factory production work orders"
            : "توجيه أقسام المصنع وتحديد الكميات الدقيقة لكل مرحلة إنتاجية"
      }
      backHref="/admin/workflow"
    >
      {/* ── KPIs ───────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
          جارٍ التحميل...
        </div>
      )}

      {!isLoading && workOrders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <ClipboardList className="w-12 h-12 opacity-20 text-gray-400" />
          <p className="text-gray-400 text-sm">لا توجد أوامر تشغيل بعد</p>
          <div className="flex gap-2">
            {/* Seed button deleted for production */}
            <Button
              size="sm"
              style={{ background: "oklch(0.38 0.06 160)" }}
              onClick={() => setShowCreateWizard(true)}
            >
              <Plus className="w-4 h-4 ml-1" /> أمر تشغيل جديد
            </Button>
          </div>
        </div>
      )}

      {!isLoading && workOrders.length > 0 && (
        <>
          {/* ── KPIs ───────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {kpis.map((kpi, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-white rounded-2xl p-4 border border-gray-100"
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="p-2 rounded-xl"
                    style={{ background: `${kpi.color}15`, color: kpi.color }}
                  >
                    {kpi.icon}
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-0.5">
                  {kpi.value}
                </div>
                <div className="text-xs font-semibold text-gray-700 leading-tight">
                  {kpi.label}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{kpi.sub}</div>
              </motion.div>
            ))}
          </div>

          {/* ── Toolbar ────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex-1 min-w-48">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="بحث برقم الأمر أو الموزع أو PO..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pr-9 text-sm h-9"
                />
              </div>
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="h-9 px-3 text-sm border border-gray-200 rounded-xl bg-white text-gray-700"
            >
              <option value="all">كل الحالات</option>
              {(
                Object.entries(WO_STATUS) as [
                  WorkOrderStatus,
                  (typeof WO_STATUS)[WorkOrderStatus],
                ][]
              ).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.labelAr}
                </option>
              ))}
            </select>

            {/* Dept Filter */}
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="h-9 px-3 text-sm border border-gray-200 rounded-xl bg-white text-gray-700"
            >
              <option value="all">كل الأقسام</option>
              {(
                Object.entries(DEPARTMENTS) as [
                  DeptId,
                  (typeof DEPARTMENTS)[DeptId],
                ][]
              ).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.labelAr}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="h-9 px-3 text-sm border border-gray-200 rounded-xl bg-white text-gray-700"
            >
              <option value="all">كل الأولويات</option>
              <option value="urgent">عاجل</option>
              <option value="vip">VIP</option>
              <option value="normal">عادي</option>
            </select>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1">
              {[
                {
                  id: "cards",
                  label: "بطاقات",
                  icon: <Layers className="w-3.5 h-3.5" />,
                },
                {
                  id: "list",
                  label: "قائمة",
                  icon: <BarChart3 className="w-3.5 h-3.5" />,
                },
                {
                  id: "dept",
                  label: "أقسام",
                  icon: <Users className="w-3.5 h-3.5" />,
                },
              ].map(v => (
                <button
                  key={v.id}
                  onClick={() => setView(v.id as typeof view)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === v.id ? "text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  style={
                    view === v.id ? { background: "oklch(0.38 0.06 160)" } : {}
                  }
                >
                  {v.icon} {v.label}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9"
              onClick={() => toast.info("جارٍ تصدير أوامر التشغيل...")}
            >
              <Download className="w-4 h-4" /> تصدير
            </Button>
            <Button
              size="sm"
              className="gap-1.5 h-9"
              style={{ background: "oklch(0.38 0.06 160)" }}
              onClick={() => setShowCreateWizard(true)}
            >
              <Plus className="w-4 h-4" /> أمر تشغيل جديد
            </Button>
          </div>

          {/* ── عرض البطاقات ───────────────────────────────────── */}
          {view === "cards" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence>
                {filtered.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
                    <ClipboardList className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">لا توجد أوامر تشغيل تطابق البحث</p>
                  </div>
                ) : (
                  filtered.map(wo => (
                    <WorkOrderCard
                      key={wo.id}
                      wo={wo}
                      onClick={() => setSelectedWO(wo)}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── عرض القائمة ────────────────────────────────────── */}
          {view === "list" && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {[
                        "رقم الأمر",
                        "الموزع / المشرف",
                        "الأبواب",
                        "الحالة",
                        "الأولوية",
                        "التقدم",
                        "الموعد",
                        "",
                      ].map((h, i) => (
                        <th
                          key={i}
                          className="px-4 py-3 text-xs font-bold text-gray-500 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-16 text-center text-gray-400 text-sm"
                        >
                          لا توجد أوامر تشغيل تطابق البحث
                        </td>
                      </tr>
                    ) : (
                      filtered.map(wo => (
                        <WorkOrderRow
                          key={wo.id}
                          wo={wo}
                          onClick={() => setSelectedWO(wo)}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── عرض الأقسام ────────────────────────────────────── */}
          {view === "dept" && (
            <div className="space-y-4">
              {(
                Object.entries(DEPARTMENTS) as [
                  DeptId,
                  (typeof DEPARTMENTS)[DeptId],
                ][]
              ).map(([deptId, dept]) => {
                const deptTasks = workOrders.flatMap(wo =>
                  wo.deptTasks
                    .filter(t => t.deptId === deptId)
                    .map(t => ({ ...t, wo }))
                );
                const activeTasks = deptTasks.filter(
                  t => t.status === "in_progress" || t.status === "issued"
                );
                const completedTasks = deptTasks.filter(
                  t => t.status === "completed"
                );
                const totalQty = deptTasks.reduce((s, t) => s + t.quantity, 0);
                const completedQty = deptTasks.reduce(
                  (s, t) => s + t.completedQty,
                  0
                );
                const pct =
                  totalQty > 0
                    ? Math.round((completedQty / totalQty) * 100)
                    : 0;
                const isExpanded = expandedDepts.has(deptId);

                return (
                  <motion.div
                    key={deptId}
                    layout
                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                  >
                    {/* Dept Header */}
                    <button
                      onClick={() => toggleDept(deptId)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div
                        className="p-2.5 rounded-xl"
                        style={{ background: dept.bgColor, color: dept.color }}
                      >
                        {dept.icon}
                      </div>
                      <div className="flex-1 text-right">
                        <div className="font-bold text-gray-900">
                          {dept.labelAr}
                        </div>
                        <div className="text-xs text-gray-400">
                          {dept.labelEn} · {deptTasks.length} مهمة
                        </div>
                      </div>

                      {/* Dept Stats */}
                      <div className="hidden sm:flex items-center gap-6 text-center">
                        <div>
                          <div
                            className="text-sm font-bold"
                            style={{ color: dept.color }}
                          >
                            {activeTasks.length}
                          </div>
                          <div className="text-xs text-gray-400">نشطة</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-green-600">
                            {completedTasks.length}
                          </div>
                          <div className="text-xs text-gray-400">مكتملة</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-700">
                            {completedQty}/{totalQty}
                          </div>
                          <div className="text-xs text-gray-400">وحدة</div>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="flex items-center gap-2 min-w-24">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: dept.color }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-600 w-8">
                          {pct}%
                        </span>
                      </div>

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                    </button>

                    {/* Dept Tasks Table */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="px-5 pb-5">
                            <div className="overflow-x-auto rounded-xl border border-gray-100">
                              <table className="w-full text-right text-sm">
                                <thead>
                                  <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-4 py-2.5 text-xs font-bold text-gray-500">
                                      رقم الأمر
                                    </th>
                                    <th className="px-4 py-2.5 text-xs font-bold text-gray-500">
                                      الموزع
                                    </th>
                                    <th className="px-4 py-2.5 text-xs font-bold text-gray-500">
                                      المواصفات
                                    </th>
                                    <th className="px-4 py-2.5 text-xs font-bold text-gray-500 text-center">
                                      الكمية
                                    </th>
                                    <th className="px-4 py-2.5 text-xs font-bold text-gray-500 text-center">
                                      المنجز
                                    </th>
                                    <th className="px-4 py-2.5 text-xs font-bold text-gray-500">
                                      المسؤول
                                    </th>
                                    <th className="px-4 py-2.5 text-xs font-bold text-gray-500">
                                      الموعد
                                    </th>
                                    <th className="px-4 py-2.5 text-xs font-bold text-gray-500">
                                      الحالة
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {deptTasks.map((t, i) => {
                                    const taskPct =
                                      t.quantity > 0
                                        ? Math.round(
                                            (t.completedQty / t.quantity) * 100
                                          )
                                        : 0;
                                    const daysLeft = Math.ceil(
                                      (new Date(t.dueDate).getTime() -
                                        Date.now()) /
                                        86400000
                                    );
                                    return (
                                      <tr
                                        key={i}
                                        className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                                        onClick={() => setSelectedWO(t.wo)}
                                      >
                                        <td className="px-4 py-3">
                                          <div className="font-bold text-gray-900 text-xs">
                                            {t.wo.woNumber}
                                          </div>
                                          <div className="text-xs text-gray-400">
                                            {t.wo.poNumber}
                                          </div>
                                        </td>
                                        <td className="px-4 py-3">
                                          <div className="text-xs text-gray-700 font-medium truncate max-w-32">
                                            {t.wo.distributorName}
                                          </div>
                                          {getPriorityBadge(t.wo.priority)}
                                        </td>
                                        <td className="px-4 py-3">
                                          <div
                                            className="text-xs text-gray-600 max-w-48 truncate"
                                            title={t.specs}
                                          >
                                            {t.specs}
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          <span className="font-bold text-gray-900">
                                            {t.quantity}
                                          </span>
                                          <span className="text-xs text-gray-400 mr-1">
                                            {t.unit}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3">
                                          <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-12">
                                              <div
                                                className="h-full rounded-full"
                                                style={{
                                                  width: `${taskPct}%`,
                                                  background:
                                                    taskPct === 100
                                                      ? "oklch(0.50 0.16 140)"
                                                      : dept.color,
                                                }}
                                              />
                                            </div>
                                            <span className="text-xs font-bold text-gray-600 w-8">
                                              {taskPct}%
                                            </span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-3">
                                          <div className="text-xs text-gray-600">
                                            {t.assignedTo}
                                          </div>
                                        </td>
                                        <td className="px-4 py-3">
                                          <div
                                            className={`text-xs font-medium ${daysLeft < 0 ? "text-red-600" : daysLeft <= 3 ? "text-amber-600" : "text-gray-500"}`}
                                          >
                                            {daysLeft < 0
                                              ? `تأخر ${Math.abs(daysLeft)} يوم`
                                              : daysLeft === 0
                                                ? "اليوم"
                                                : `${daysLeft} يوم`}
                                          </div>
                                        </td>
                                        <td className="px-4 py-3">
                                          {getStatusBadge(t.status)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Work Order Detail Modal ─────────────────────────── */}
      <AnimatePresence>
        {selectedWO && (
          <WorkOrderModal
            wo={selectedWO}
            onClose={() => setSelectedWO(null)}
            onUpdate={updatedWO => {
              refetch();
              setSelectedWO(updatedWO);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Create Work Order Wizard ────────────────────────── */}
      <AnimatePresence>
        {showCreateWizard && (
          <CreateWorkOrderWizard
            onClose={() => setShowCreateWizard(false)}
            onCreated={() => {
              refetch();
              setShowCreateWizard(false);
            }}
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
