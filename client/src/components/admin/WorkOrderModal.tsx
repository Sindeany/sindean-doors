// ============================================================
// WorkOrderModal - نافذة تفاصيل أمر التشغيل الداخلي
// توزيع الكميات على الأقسام + جدول الأبواب + تتبع التقدم
// ============================================================
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import {
  X,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  Package,
  DoorOpen,
  RefreshCw,
  Send,
  Circle,
  AlertCircle,
  Zap,
  Hash,
  CalendarDays,
  Building2,
  Phone,
  FileText,
  Eye,
  CheckSquare,
  Wrench,
  TrendingUp,
  Save,
  RotateCcw,
  PlusCircle,
  MinusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type {
  WorkOrder,
  DeptId,
  WorkOrderStatus,
} from "@/pages/admin/AdminWorkOrders";
import { DEPARTMENTS, WO_STATUS } from "@/pages/admin/AdminWorkOrders";
import { printWorkOrder } from "@/lib/workOrderPDF";

// ─── تبويبات النافذة ──────────────────────────────────────────
type Tab = "overview" | "doors" | "departments" | "progress" | "timeline";
type ProgressEntry = {
  deptId: DeptId;
  completedQty: number;
  status: WorkOrderStatus;
  note: string;
};

const TABS: { id: Tab; labelAr: string; icon: React.ReactNode }[] = [
  { id: "overview", labelAr: "نظرة عامة", icon: <Eye className="w-4 h-4" /> },
  {
    id: "doors",
    labelAr: "جدول الأبواب",
    icon: <DoorOpen className="w-4 h-4" />,
  },
  {
    id: "departments",
    labelAr: "توزيع الأقسام",
    icon: <Users className="w-4 h-4" />,
  },
  {
    id: "progress",
    labelAr: "تسجيل التقدم",
    icon: <TrendingUp className="w-4 h-4" />,
  },
  {
    id: "timeline",
    labelAr: "الجدول الزمني",
    icon: <CalendarDays className="w-4 h-4" />,
  },
];

// ─── مساعدات ─────────────────────────────────────────────────
function StatusBadge({ status }: { status: WorkOrderStatus }) {
  const cfg = WO_STATUS[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.icon} {cfg.labelAr}
    </span>
  );
}

// ─── تبويب النظرة العامة ──────────────────────────────────────
function OverviewTab({ wo }: { wo: WorkOrder }) {
  return (
    <div className="space-y-5">
      {wo.status === "cancelled" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg flex-shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 text-right">
              <h4 className="text-sm font-bold text-red-800">أمر تشغيل ملغى</h4>
              <div className="text-xs text-red-700 mt-1 space-y-1">
                <p>
                  <strong>القائم بالإلغاء:</strong> {wo.cancelledBy || "غير محدد"}
                </p>
                <p>
                  <strong>تاريخ ووقت الإلغاء:</strong>{" "}
                  {wo.cancelledAt
                    ? new Date(wo.cancelledAt).toLocaleString("ar-SA")
                    : "غير محدد"}
                </p>
              </div>
              <div className="bg-white/60 rounded-lg p-2.5 mt-2 border border-red-100/50 text-xs text-red-800">
                <strong>سبب الإلغاء:</strong> {wo.cancelReason || "غير محدد"}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Info Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "رقم الأمر",
            value: wo.woNumber,
            icon: <Hash className="w-4 h-4" />,
            color: "oklch(0.50 0.16 250)",
          },
          {
            label: "رقم PO",
            value: wo.poNumber,
            icon: <FileText className="w-4 h-4" />,
            color: "oklch(0.50 0.16 140)",
          },
          {
            label: "إجمالي الأبواب",
            value: `${wo.totalDoors} باب`,
            icon: <DoorOpen className="w-4 h-4" />,
            color: "oklch(0.50 0.16 330)",
          },
          {
            label: "القيمة الإجمالية",
            value: `${wo.totalValue.toLocaleString()} ر.س`,
            icon: <Package className="w-4 h-4" />,
            color: "oklch(0.50 0.16 50)",
          },
        ].map((item, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="p-1.5 rounded-lg"
                style={{ background: `${item.color}15`, color: item.color }}
              >
                {item.icon}
              </div>
            </div>
            <div className="text-sm font-bold text-gray-900">{item.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Distributor + Supervisor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">
            بيانات الموزع
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
              <Building2 className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">
                {wo.distributorName}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                <Phone className="w-3 h-3" />
                <span dir="ltr">{wo.distributorPhone}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">
            المشرف المسؤول
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">
                {wo.supervisorName}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">مشرف الإنتاج</div>
            </div>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "تاريخ الإصدار",
            value: wo.issuedAt.split(" ")[0],
            color: "#6B7280",
          },
          {
            label: "تاريخ البدء",
            value: wo.startDate,
            color: "oklch(0.50 0.16 250)",
          },
          {
            label: "الموعد النهائي",
            value: wo.dueDate,
            color: (() => {
              const d = Math.ceil(
                (new Date(wo.dueDate).getTime() - Date.now()) / 86400000
              );
              return d < 0
                ? "#DC2626"
                : d <= 3
                  ? "#D97706"
                  : "oklch(0.50 0.16 140)";
            })(),
          },
        ].map((d, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="text-sm font-bold" style={{ color: d.color }}>
              {d.value}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{d.label}</div>
          </div>
        ))}
      </div>

      {/* Overall Progress */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold text-gray-800">
            التقدم الكلي لأمر التشغيل
          </div>
          <div
            className="text-2xl font-bold"
            style={{
              color:
                wo.progressPercent === 100
                  ? "oklch(0.50 0.16 140)"
                  : "oklch(0.50 0.16 250)",
            }}
          >
            {wo.progressPercent}%
          </div>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background:
                wo.progressPercent === 100
                  ? "oklch(0.50 0.16 140)"
                  : "oklch(0.50 0.16 250)",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${wo.progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <div className="grid grid-cols-5 gap-2 mt-4">
          {wo.deptTasks.map(task => {
            const dept = DEPARTMENTS[task.deptId];
            const pct =
              task.quantity > 0
                ? Math.round((task.completedQty / task.quantity) * 100)
                : 0;
            return (
              <div key={task.deptId} className="text-center">
                <div className="flex items-center justify-center mb-1.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: dept.bgColor, color: dept.color }}
                  >
                    {dept.icon}
                  </div>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background:
                        pct === 100 ? "oklch(0.50 0.16 140)" : dept.color,
                    }}
                  />
                </div>
                <div className="text-xs font-bold text-gray-600">{pct}%</div>
                <div className="text-[10px] text-gray-400 leading-tight mt-0.5">
                  {dept.labelAr}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      {wo.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-amber-700 mb-1">
                ملاحظات خاصة
              </div>
              <div className="text-sm text-amber-800">{wo.notes}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── تبويب جدول الأبواب ───────────────────────────────────────
function DoorsTab({ wo }: { wo: WorkOrder }) {
  const totalDoors = wo.doors.reduce((s, d) => s + d.quantity, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-blue-700">
            {wo.doors.length}
          </div>
          <div className="text-xs text-blue-500">موديل مختلف</div>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-green-700">{totalDoors}</div>
          <div className="text-xs text-green-500">إجمالي الأبواب</div>
        </div>
        <div className="bg-purple-50 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-purple-700">
            {wo.doors.filter(d => d.specialReqs).length}
          </div>
          <div className="text-xs text-purple-500">متطلبات خاصة</div>
        </div>
      </div>

      {/* Doors Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {[
                "الكود",
                "الموديل",
                "المقاس (عرض×ارتفاع)",
                "الاتجاه",
                "الإطار",
                "الحافة",
                "لون الباب",
                "لون الإطار",
                "القفل",
                "المفصلات",
                "الكمية",
                "متطلبات خاصة",
              ].map((h, i) => (
                <th
                  key={i}
                  className="px-3 py-2.5 text-xs font-bold text-gray-500 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {wo.doors.map((door, i) => (
              <tr
                key={i}
                className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
              >
                <td className="px-3 py-3">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {door.code}
                  </span>
                </td>
                <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">
                  {door.model}
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                    {door.width}×{door.height}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <Badge
                    variant="outline"
                    className={`text-xs ${door.direction === "right" ? "border-blue-200 text-blue-700" : "border-purple-200 text-purple-700"}`}
                  >
                    {door.direction === "right" ? "يمين ←" : "→ يسار"}
                  </Badge>
                </td>
                <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
                  {door.frameType}
                </td>
                <td className="px-3 py-3 text-center">
                  <Badge
                    variant="outline"
                    className={`text-xs ${door.edgeType === "ABS" ? "border-green-200 text-green-700" : "border-orange-200 text-orange-700"}`}
                  >
                    {door.edgeType}
                  </Badge>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0"
                      style={{
                        background: door.doorColor
                          .toLowerCase()
                          .includes("white")
                          ? "#F8FAFC"
                          : door.doorColor.toLowerCase().includes("black")
                            ? "#1F2937"
                            : door.doorColor.toLowerCase().includes("walnut")
                              ? "#6B3A2A"
                              : door.doorColor.toLowerCase().includes("oak")
                                ? "#B8860B"
                                : door.doorColor.toLowerCase().includes("gold")
                                  ? "#D4AF37"
                                  : door.doorColor
                                        .toLowerCase()
                                        .includes("grey") ||
                                      door.doorColor
                                        .toLowerCase()
                                        .includes("gray")
                                    ? "#6B7280"
                                    : door.doorColor
                                          .toLowerCase()
                                          .includes("ivory")
                                      ? "#FFFFF0"
                                      : door.doorColor
                                            .toLowerCase()
                                            .includes("beige")
                                        ? "#C8B89A"
                                        : "#9CA3AF",
                      }}
                    />
                    <span className="text-xs text-gray-700 whitespace-nowrap">
                      {door.doorColor}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0"
                      style={{
                        background: door.frameColor
                          .toLowerCase()
                          .includes("white")
                          ? "#F8FAFC"
                          : door.frameColor.toLowerCase().includes("black")
                            ? "#1F2937"
                            : door.frameColor.toLowerCase().includes("walnut")
                              ? "#6B3A2A"
                              : door.frameColor.toLowerCase().includes("oak")
                                ? "#B8860B"
                                : door.frameColor.toLowerCase().includes("gold")
                                  ? "#D4AF37"
                                  : door.frameColor
                                        .toLowerCase()
                                        .includes("grey") ||
                                      door.frameColor
                                        .toLowerCase()
                                        .includes("gray")
                                    ? "#6B7280"
                                    : door.frameColor
                                          .toLowerCase()
                                          .includes("ivory")
                                      ? "#FFFFF0"
                                      : door.frameColor
                                            .toLowerCase()
                                            .includes("beige")
                                        ? "#C8B89A"
                                        : "#9CA3AF",
                      }}
                    />
                    <span className="text-xs text-gray-700 whitespace-nowrap">
                      {door.frameColor}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
                  {door.lockType}
                </td>
                <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
                  {door.hingeType}
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="font-bold text-gray-900 text-base">
                    {door.quantity}
                  </span>
                </td>
                <td className="px-3 py-3">
                  {door.specialReqs ? (
                    <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {door.specialReqs}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t border-gray-200">
              <td
                colSpan={10}
                className="px-3 py-2.5 text-xs font-bold text-gray-600 text-left"
              >
                الإجمالي
              </td>
              <td className="px-3 py-2.5 text-center">
                <span className="font-bold text-gray-900 text-base">
                  {totalDoors}
                </span>
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── تبويب تسجيل التقدم ──────────────────────────────────────
function ProgressTab({
  wo,
  onSave,
}: {
  wo: WorkOrder;
  onSave: (updates: ProgressEntry[]) => void;
}) {
  const [entries, setEntries] = useState<ProgressEntry[]>(
    wo.deptTasks.map(t => ({
      deptId: t.deptId,
      completedQty: t.completedQty,
      status: t.status,
      note: t.notes ?? "",
    }))
  );
  const [dirty, setDirty] = useState(false);

  function update(
    deptId: DeptId,
    field: keyof ProgressEntry,
    value: string | number
  ) {
    setEntries(prev =>
      prev.map(e => (e.deptId === deptId ? { ...e, [field]: value } : e))
    );
    setDirty(true);
  }

  function increment(deptId: DeptId, max: number) {
    setEntries(prev =>
      prev.map(e =>
        e.deptId === deptId
          ? { ...e, completedQty: Math.min(e.completedQty + 1, max) }
          : e
      )
    );
    setDirty(true);
  }

  function decrement(deptId: DeptId) {
    setEntries(prev =>
      prev.map(e =>
        e.deptId === deptId
          ? { ...e, completedQty: Math.max(e.completedQty - 1, 0) }
          : e
      )
    );
    setDirty(true);
  }

  function reset() {
    setEntries(
      wo.deptTasks.map(t => ({
        deptId: t.deptId,
        completedQty: t.completedQty,
        status: t.status,
        note: t.notes ?? "",
      }))
    );
    setDirty(false);
  }

  const overallPct = (() => {
    const totalQty = wo.deptTasks.reduce((s, t) => s + t.quantity, 0);
    const totalDone = entries.reduce((s, e) => s + e.completedQty, 0);
    return totalQty > 0 ? Math.round((totalDone / totalQty) * 100) : 0;
  })();

  return (
    <div className="space-y-5">
      {/* مؤشر التقدم الكلي */}
      <div className="bg-gradient-to-l from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-bold text-gray-700">
              التقدم الإجمالي لأمر التشغيل
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              تحديث مباشر لجميع الأقسام
            </div>
          </div>
          <div
            className="text-4xl font-black"
            style={{
              color:
                overallPct === 100
                  ? "oklch(0.50 0.16 140)"
                  : "oklch(0.38 0.06 160)",
            }}
          >
            {overallPct}%
          </div>
        </div>
        <div className="h-3 bg-white/60 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background:
                overallPct === 100
                  ? "oklch(0.50 0.16 140)"
                  : "oklch(0.38 0.06 160)",
            }}
            animate={{ width: `${overallPct}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        {overallPct === 100 && (
          <div className="mt-3 flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-bold">
              جميع الأقسام مكتملة — جاهز للتسليم
            </span>
          </div>
        )}
      </div>

      {/* بطاقات الأقسام */}
      {entries.map((entry, i) => {
        const task = wo.deptTasks.find(t => t.deptId === entry.deptId);
        if (!task) return null;
        const dept = DEPARTMENTS[entry.deptId];
        const pct =
          task.quantity > 0
            ? Math.round((entry.completedQty / task.quantity) * 100)
            : 0;
        const remaining = task.quantity - entry.completedQty;
        const daysLeft = Math.ceil(
          (new Date(task.dueDate).getTime() - Date.now()) / 86400000
        );

        return (
          <motion.div
            key={entry.deptId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-2xl border border-gray-100 overflow-hidden"
            style={{ borderRight: `4px solid ${dept.color}` }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 bg-white">
              <div
                className="p-2.5 rounded-xl flex-shrink-0"
                style={{ background: dept.bgColor, color: dept.color }}
              >
                {dept.icon}
              </div>
              <div className="flex-1">
                <div className="font-bold text-gray-900 text-sm">
                  {dept.labelAr}
                </div>
                <div className="text-xs text-gray-400">{task.assignedTo}</div>
              </div>
              <div className="text-left">
                <div
                  className="text-2xl font-black"
                  style={{
                    color: pct === 100 ? "oklch(0.50 0.16 140)" : dept.color,
                  }}
                >
                  {pct}%
                </div>
                <div className="text-xs text-gray-400">
                  {entry.completedQty}/{task.quantity} {task.unit}
                </div>
              </div>
            </div>

            {/* شريط التقدم */}
            <div className="px-5 pb-1 bg-white">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background:
                      pct === 100 ? "oklch(0.50 0.16 140)" : dept.color,
                  }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* حقول التحديث */}
            <div className="px-5 py-4 bg-white space-y-4">
              {/* الكمية المنجزة */}
              <div>
                <label className="text-xs font-bold text-gray-600 mb-2 block">
                  الكمية المنجزة ({task.unit})
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => decrement(entry.deptId)}
                    disabled={entry.completedQty <= 0}
                    className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <MinusCircle className="w-4 h-4 text-gray-600" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={task.quantity}
                    value={entry.completedQty}
                    onChange={e =>
                      update(
                        entry.deptId,
                        "completedQty",
                        Math.min(
                          Math.max(0, Number(e.target.value)),
                          task.quantity
                        )
                      )
                    }
                    className="flex-1 text-center text-xl font-bold border border-gray-200 rounded-xl py-2.5 focus:outline-none focus:ring-2 focus:border-transparent"
                  />
                  <button
                    onClick={() => increment(entry.deptId, task.quantity)}
                    disabled={entry.completedQty >= task.quantity}
                    className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <PlusCircle className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() =>
                      update(entry.deptId, "completedQty", task.quantity)
                    }
                    className="px-3 py-2 text-xs font-bold rounded-xl border-2 transition-colors hover:opacity-80"
                    style={{ borderColor: dept.color, color: dept.color }}
                  >
                    مكتمل
                  </button>
                </div>
                <div className="flex items-center justify-between mt-1.5 text-xs text-gray-400">
                  <span>
                    متبقي:{" "}
                    <strong className="text-gray-700">{remaining}</strong>{" "}
                    {task.unit}
                  </span>
                  {daysLeft < 0 && (
                    <span className="text-red-500 font-semibold">
                      تأخر {Math.abs(daysLeft)} يوم
                    </span>
                  )}
                  {daysLeft >= 0 && daysLeft <= 3 && (
                    <span className="text-amber-500 font-semibold">
                      {daysLeft === 0
                        ? "الموعد اليوم"
                        : `${daysLeft} يوم متبقي`}
                    </span>
                  )}
                  {daysLeft > 3 && <span>موعد: {task.dueDate}</span>}
                </div>
              </div>

              {/* تغيير الحالة */}
              <div>
                <label className="text-xs font-bold text-gray-600 mb-2 block">
                  حالة القسم
                </label>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "draft",
                      "issued",
                      "in_progress",
                      "completed",
                      "on_hold",
                    ] as WorkOrderStatus[]
                  ).map(s => {
                    const cfg = WO_STATUS[s];
                    const isSelected = entry.status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => update(entry.deptId, "status", s)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all"
                        style={
                          isSelected
                            ? {
                                background: cfg.bg,
                                color: cfg.color,
                                borderColor: cfg.color,
                              }
                            : {
                                background: "white",
                                color: "#9CA3AF",
                                borderColor: "#E5E7EB",
                              }
                        }
                      >
                        {cfg.icon} {cfg.labelAr}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ملاحظة */}
              <div>
                <label className="text-xs font-bold text-gray-600 mb-2 block">
                  ملاحظة (اختياري)
                </label>
                <textarea
                  value={entry.note}
                  onChange={e => update(entry.deptId, "note", e.target.value)}
                  placeholder="أضف ملاحظة عن تقدم هذا القسم..."
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:border-transparent text-right"
                />
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* أزرار الحفظ */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <button
          onClick={reset}
          disabled={!dirty}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <RotateCcw className="w-4 h-4" /> إلغاء التغييرات
        </button>
        <Button
          disabled={!dirty}
          onClick={() => {
            onSave(entries);
            setDirty(false);
          }}
          className="gap-2 px-6"
          style={{ background: "oklch(0.38 0.06 160)" }}
        >
          <Save className="w-4 h-4" /> حفظ التقدم
        </Button>
      </div>
    </div>
  );
}

// ─── تبويب توزيع الأقسام ──────────────────────────────────────
function DepartmentsTab({ wo }: { wo: WorkOrder }) {
  return (
    <div className="space-y-4">
      {/* Dept Cards */}
      {wo.deptTasks.map((task, i) => {
        const dept = DEPARTMENTS[task.deptId];
        const pct =
          task.quantity > 0
            ? Math.round((task.completedQty / task.quantity) * 100)
            : 0;
        const daysLeft = Math.ceil(
          (new Date(task.dueDate).getTime() - Date.now()) / 86400000
        );
        const statusCfg = WO_STATUS[task.status];

        return (
          <motion.div
            key={task.deptId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="rounded-2xl border border-gray-100 overflow-hidden"
            style={{ borderRight: `4px solid ${dept.color}` }}
          >
            {/* Dept Header */}
            <div className="flex items-center gap-4 p-4 bg-white">
              <div
                className="p-2.5 rounded-xl flex-shrink-0"
                style={{ background: dept.bgColor, color: dept.color }}
              >
                {dept.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900">
                    {dept.labelAr}
                  </span>
                  <span className="text-xs text-gray-400">{dept.labelEn}</span>
                  <span
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: statusCfg.bg, color: statusCfg.color }}
                  >
                    {statusCfg.icon} {statusCfg.labelAr}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {task.assignedTo}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    {task.startDate} ← {task.dueDate}
                  </span>
                </div>
              </div>
              <div className="text-left flex-shrink-0">
                <div
                  className="text-2xl font-bold"
                  style={{ color: dept.color }}
                >
                  {pct}%
                </div>
                <div className="text-xs text-gray-400">
                  {task.completedQty}/{task.quantity} {task.unit}
                </div>
              </div>
            </div>

            {/* Progress + Details */}
            <div className="px-4 pb-4 bg-white">
              {/* Progress Bar */}
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background:
                      pct === 100 ? "oklch(0.50 0.16 140)" : dept.color,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{
                    duration: 0.7,
                    ease: "easeOut",
                    delay: i * 0.07,
                  }}
                />
              </div>

              {/* Specs + Deadline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs font-bold text-gray-500 mb-1.5">
                    المواصفات المطلوبة
                  </div>
                  <div className="text-sm text-gray-700">{task.specs}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-gray-900">
                      {task.quantity}
                    </div>
                    <div className="text-xs text-gray-400">
                      {task.unit} مطلوبة
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <div
                      className="text-lg font-bold"
                      style={{
                        color:
                          pct === 100 ? "oklch(0.50 0.16 140)" : dept.color,
                      }}
                    >
                      {task.completedQty}
                    </div>
                    <div className="text-xs text-gray-400">
                      {task.unit} منجزة
                    </div>
                  </div>
                </div>
              </div>

              {/* Deadline Warning */}
              {daysLeft < 0 && (
                <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-xs text-red-700 font-semibold">
                    تأخر {Math.abs(daysLeft)} يوم عن الموعد المحدد
                  </span>
                </div>
              )}
              {daysLeft >= 0 &&
                daysLeft <= 3 &&
                task.status !== "completed" && (
                  <div className="mt-3 flex items-center gap-2 p-3 bg-amber-50 rounded-xl">
                    <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span className="text-xs text-amber-700 font-semibold">
                      {daysLeft === 0
                        ? "الموعد النهائي اليوم"
                        : `${daysLeft} يوم متبقي للموعد النهائي`}
                    </span>
                  </div>
                )}

              {/* Notes */}
              {task.notes && (
                <div className="mt-3 flex items-start gap-2 p-3 bg-blue-50 rounded-xl">
                  <FileText className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-blue-700">{task.notes}</span>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── تبويب الجدول الزمني ──────────────────────────────────────
function TimelineTab({ wo }: { wo: WorkOrder }) {
  // حساب أقدم تاريخ وأحدث تاريخ
  const allDates = wo.deptTasks.flatMap(t => [t.startDate, t.dueDate]);
  const minDate = new Date(
    Math.min(...allDates.map(d => new Date(d).getTime()))
  );
  const maxDate = new Date(
    Math.max(...allDates.map(d => new Date(d).getTime()))
  );
  const totalDays =
    Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000) + 1;

  function getPct(date: string) {
    const d = new Date(date).getTime() - minDate.getTime();
    return Math.max(
      0,
      Math.min(100, (d / (maxDate.getTime() - minDate.getTime() || 1)) * 100)
    );
  }

  function getWidthPct(start: string, end: string) {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const total = maxDate.getTime() - minDate.getTime();
    return total > 0 ? Math.max(2, ((e - s) / total) * 100) : 2;
  }

  const today = new Date();
  const todayPct = Math.max(
    0,
    Math.min(
      100,
      ((today.getTime() - minDate.getTime()) /
        (maxDate.getTime() - minDate.getTime() || 1)) *
        100
    )
  );

  return (
    <div className="space-y-4">
      {/* Timeline Header */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>{minDate.toLocaleDateString("ar-SA")}</span>
          <span className="font-bold text-gray-700">
            {totalDays} يوم إجمالي
          </span>
          <span>{maxDate.toLocaleDateString("ar-SA")}</span>
        </div>
        <div className="relative h-2 bg-gray-200 rounded-full">
          {/* Today marker */}
          {todayPct >= 0 && todayPct <= 100 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm z-10"
              style={{
                left: `${todayPct}%`,
                transform: "translate(-50%, -50%)",
              }}
              title="اليوم"
            />
          )}
        </div>
        <div className="flex justify-center mt-1">
          <span className="text-xs text-red-500 font-medium">● اليوم</span>
        </div>
      </div>

      {/* Gantt-style bars */}
      <div className="space-y-3">
        {wo.deptTasks.map((task, i) => {
          const dept = DEPARTMENTS[task.deptId];
          const leftPct = getPct(task.startDate);
          const widthPct = getWidthPct(task.startDate, task.dueDate);
          const pct =
            task.quantity > 0
              ? Math.round((task.completedQty / task.quantity) * 100)
              : 0;
          const statusCfg = WO_STATUS[task.status];

          return (
            <motion.div
              key={task.deptId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white rounded-xl border border-gray-100 p-4"
            >
              {/* Row Header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="p-2 rounded-lg flex-shrink-0"
                  style={{ background: dept.bgColor, color: dept.color }}
                >
                  {dept.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900">
                      {dept.labelAr}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: statusCfg.bg,
                        color: statusCfg.color,
                      }}
                    >
                      {statusCfg.icon} {statusCfg.labelAr}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {task.assignedTo}
                  </div>
                </div>
                <div className="text-left">
                  <div
                    className="text-sm font-bold"
                    style={{ color: dept.color }}
                  >
                    {pct}%
                  </div>
                  <div className="text-xs text-gray-400">
                    {task.completedQty}/{task.quantity}
                  </div>
                </div>
              </div>

              {/* Gantt Bar */}
              <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                {/* Today line */}
                {todayPct >= 0 && todayPct <= 100 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10"
                    style={{ left: `${todayPct}%` }}
                  />
                )}
                {/* Task bar */}
                <div
                  className="absolute top-1 bottom-1 rounded-md flex items-center px-2 overflow-hidden"
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    background: `${dept.color}20`,
                    border: `1.5px solid ${dept.color}`,
                  }}
                >
                  {/* Progress fill */}
                  <div
                    className="absolute top-0 bottom-0 left-0 rounded-md opacity-30"
                    style={{ width: `${pct}%`, background: dept.color }}
                  />
                  <span
                    className="relative text-[10px] font-bold truncate"
                    style={{ color: dept.color }}
                  >
                    {task.startDate} → {task.dueDate}
                  </span>
                </div>
              </div>

              {/* Dates */}
              <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                <span>بدء: {task.startDate}</span>
                <span>انتهاء: {task.dueDate}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="text-xs font-bold text-gray-500 mb-3">
          مفتاح الألوان
        </div>
        <div className="flex flex-wrap gap-3">
          {(
            Object.entries(DEPARTMENTS) as [
              DeptId,
              (typeof DEPARTMENTS)[DeptId],
            ][]
          ).map(([id, dept]) => (
            <div key={id} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ background: dept.color }}
              />
              <span className="text-xs text-gray-600">{dept.labelAr}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-0.5 h-4 bg-red-400 rounded" />
            <span className="text-xs text-gray-600">اليوم</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── المكوّن الرئيسي للنافذة ──────────────────────────────────
export default function WorkOrderModal({
  wo,
  onClose,
  onUpdate,
}: {
  wo: WorkOrder;
  onClose: () => void;
  onUpdate?: (updatedWO: WorkOrder) => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [localWO, setLocalWO] = useState<WorkOrder>(wo);
  
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState("");
  const [cancelledByInput, setCancelledByInput] = useState("المدير العام");

  const updateProgressMutation = trpc.workOrders.updateProgress.useMutation();
  const cancelWO = trpc.workOrders.cancel.useMutation();

  function handleProgressSave(entries: ProgressEntry[]) {
    // تحديث deptTasks بالكميات الجديدة
    const updatedTasks = localWO.deptTasks.map(task => {
      const entry = entries.find(e => e.deptId === task.deptId);
      if (!entry) return task;
      return {
        ...task,
        completedQty: entry.completedQty,
        status: entry.status,
        notes: entry.note || task.notes,
      };
    });
    // حساب التقدم الإجمالي
    const totalQty = updatedTasks.reduce((s, t) => s + t.quantity, 0);
    const totalDone = updatedTasks.reduce((s, t) => s + t.completedQty, 0);
    const progressPercent =
      totalQty > 0 ? Math.round((totalDone / totalQty) * 100) : 0;
    // تحديث حالة الأمر تلقائياً
    const allDone = updatedTasks.every(t => t.status === "completed");
    const anyInProgress = updatedTasks.some(t => t.status === "in_progress");
    const newStatus: WorkOrderStatus = allDone
      ? "completed"
      : anyInProgress
        ? "in_progress"
        : localWO.status;
    const updated: WorkOrder = {
      ...localWO,
      deptTasks: updatedTasks,
      progressPercent,
      status: newStatus,
    };
    if (localWO.dbId) {
      updateProgressMutation.mutate({
        id: localWO.dbId,
        deptTasks: updatedTasks,
        progressPercent,
        status: newStatus,
      });
    }
    setLocalWO(updated);
    onUpdate?.(updated);
    toast.success("تم حفظ التقدم بنجاح — تم تحديث شريط التقدم");
  }

  const priorityColor =
    wo.priority === "urgent"
      ? "oklch(0.55 0.18 25)"
      : wo.priority === "vip"
        ? "oklch(0.55 0.16 60)"
        : "oklch(0.50 0.16 250)";

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.55)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* ── Modal Header ─────────────────────────────────── */}
          <div
            className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0"
            style={{ borderTop: `4px solid ${priorityColor}` }}
          >
            <div className="flex items-center gap-4">
              <div
                className="p-2.5 rounded-xl"
                style={{ background: `${priorityColor}15`, color: priorityColor }}
              >
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2
                    className="font-bold text-gray-900 text-lg"
                    style={{ fontFamily: "DM Serif Display, serif" }}
                  >
                    {wo.woNumber}
                  </h2>
                  <StatusBadge status={wo.status} />
                  {wo.priority === "urgent" && (
                    <span
                      className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{
                        background: "oklch(0.92 0.15 25)",
                        color: "oklch(0.35 0.15 25)",
                      }}
                    >
                      <Zap className="w-3 h-3" /> عاجل
                    </span>
                  )}
                  {wo.priority === "vip" && (
                    <span
                      className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{
                        background: "oklch(0.92 0.12 60)",
                        color: "oklch(0.35 0.12 60)",
                      }}
                    >
                      VIP
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {wo.distributorName} · {wo.totalDoors} باب ·{" "}
                  {wo.totalValue.toLocaleString()} ر.س
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 hidden sm:flex hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors"
                onClick={() => {
                  printWorkOrder(localWO);
                  toast.success("تم فتح نافذة الطباعة");
                }}
              >
                <Printer className="w-4 h-4" /> طباعة PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 hidden sm:flex hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                onClick={() => {
                  printWorkOrder(localWO);
                  toast.success("تم فتح نافذة التصدير");
                }}
              >
                <Download className="w-4 h-4" /> تصدير
              </Button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── Tabs ─────────────────────────────────────────── */}
          <div className="flex items-center gap-1 px-6 py-3 border-b border-gray-100 flex-shrink-0 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
                style={
                  activeTab === tab.id
                    ? { background: "oklch(0.38 0.06 160)" }
                    : {}
                }
              >
                {tab.icon}
                {tab.labelAr}
              </button>
            ))}
          </div>

          {/* ── Tab Content ──────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                {activeTab === "overview" && <OverviewTab wo={localWO} />}
                {activeTab === "doors" && <DoorsTab wo={localWO} />}
                {activeTab === "departments" && <DepartmentsTab wo={localWO} />}
                {activeTab === "progress" && (
                  <ProgressTab wo={localWO} onSave={handleProgressSave} />
                )}
                {activeTab === "timeline" && <TimelineTab wo={localWO} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Footer Actions ───────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-400">
                صدر بتاريخ: {localWO.issuedAt} · المشرف: {localWO.supervisorName}
              </div>
              {localWO.progressPercent > 0 && (
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5">
                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${localWO.progressPercent}%`,
                        background:
                          localWO.progressPercent === 100
                            ? "oklch(0.50 0.16 140)"
                            : "oklch(0.38 0.06 160)",
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-700">
                    {localWO.progressPercent}%
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50 hover:border-green-400"
                onClick={() => {
                  printWorkOrder(localWO);
                  toast.success("تم فتح نافذة الطباعة");
                }}
              >
                <Printer className="w-4 h-4" />
                طباعة PDF
              </Button>
              {localWO.status !== "completed" &&
                localWO.status !== "cancelled" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-400 hover:text-red-700"
                      onClick={() => setShowCancelDialog(true)}
                    >
                      <X className="w-4 h-4" />
                      إلغاء الأمر
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => setActiveTab("progress")}
                    >
                      <TrendingUp className="w-4 h-4" />
                      تسجيل التقدم
                    </Button>
                  </>
                )}
              <Button variant="outline" size="sm" onClick={onClose}>
                إغلاق
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Cancel Work Order Dialog ────────────────────────── */}
      <AnimatePresence>
        {showCancelDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            onClick={() => setShowCancelDialog(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-100 flex flex-col gap-4 text-right"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">إلغاء أمر التشغيل</h3>
                  <p className="text-xs text-gray-400 mt-0.5">يرجى ملء البيانات المطلوبة لإلغاء هذا الأمر نهائياً</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    القائم بالإلغاء (اسم المسؤول) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    value={cancelledByInput}
                    onChange={e => setCancelledByInput(e.target.value)}
                    placeholder="مثال: المدير العام، أحمد الحربي"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    سبب الإلغاء <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all min-h-[80px]"
                    value={cancelReasonInput}
                    onChange={e => setCancelReasonInput(e.target.value)}
                    placeholder="يرجى كتابة سبب تفصيلي للإلغاء..."
                    required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelDialog(false)}
              >
                تراجع
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
                disabled={!cancelledByInput.trim() || !cancelReasonInput.trim() || cancelWO.isPending}
                onClick={() => {
                  if (localWO.dbId) {
                    cancelWO.mutate(
                      {
                        id: localWO.dbId,
                        cancelReason: cancelReasonInput,
                        cancelledBy: cancelledByInput,
                      },
                      {
                        onSuccess: () => {
                          const updated: WorkOrder = {
                            ...localWO,
                            status: "cancelled",
                            cancelReason: cancelReasonInput,
                            cancelledBy: cancelledByInput,
                            cancelledAt: Date.now(),
                          };
                          setLocalWO(updated);
                          onUpdate?.(updated);
                          setShowCancelDialog(false);
                          toast.success("تم إلغاء أمر التشغيل بنجاح");
                        },
                        onError: err => {
                          toast.error(`فشل إلغاء أمر التشغيل: ${err.message}`);
                        },
                      }
                    );
                  }
                }}
              >
                {cancelWO.isPending ? "جاري الإلغاء..." : "تأكيد الإلغاء"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </>
);
}
