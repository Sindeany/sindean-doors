// ============================================================
// CreateWorkOrderWizard - نموذج إنشاء أمر تشغيل جديد
// 4 خطوات: بيانات PO → إضافة الأبواب → توزيع الأقسام → المراجعة
// ============================================================
import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Trash2,
  Building2,
  Phone,
  User,
  CalendarDays,
  FileText,
  Hash,
  DoorOpen,
  AlertTriangle,
  Zap,
  Star,
  Copy,
  RefreshCw,
  Package,
  Settings,
  Frame,
  CheckSquare,
  Wrench,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp,
  Layers,
  Send,
  Sparkles,
  Warehouse,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type {
  DoorItem,
  DeptTask,
  WorkOrder,
  DeptId,
  Priority,
} from "@/pages/admin/AdminWorkOrders";
import { DEPARTMENTS } from "@/pages/admin/AdminWorkOrders";
import {
  checkMaterialAvailability,
} from "@/stores/inventoryStore";


// ─── أنواع النموذج ────────────────────────────────────────────
interface WizardFormData {
  // الخطوة 1: بيانات PO
  poNumber: string;
  distributorName: string;
  distributorPhone: string;
  supervisorName: string;
  startDate: string;
  dueDate: string;
  priority: Priority;
  orderType: "standard" | "custom";
  notes: string;
  // الخطوة 2: الأبواب
  doors: DoorItem[];
  // الخطوة 3: توزيع الأقسام (يُحسب تلقائياً)
  deptTasks: DeptTask[];
}

// ─── قيم افتراضية لباب جديد ───────────────────────────────────
const EMPTY_DOOR: DoorItem = {
  code: "",
  model: "",
  width: 90,
  height: 210,
  direction: "right",
  frameType: "Standard",
  edgeType: "ABS",
  doorColor: "White",
  frameColor: "White",
  lockType: "Mortise",
  hingeType: "3 مفصلات",
  quantity: 1,
  specialReqs: "",
};

// ─── خيارات الحقول ────────────────────────────────────────────
const MODELS = [
  "Classic 100",
  "Modern 200",
  "Elite 300",
  "Premium 400",
  "Royal 500",
  "Slim 600",
];
const FRAME_TYPES = [
  "Standard",
  "Rebated",
  "Double Rebated",
  "Flush",
  "Fire Rated",
];
const COLORS = [
  "White",
  "Ivory",
  "Beige",
  "Light Grey",
  "Dark Grey",
  "Black",
  "Walnut",
  "Oak",
  "Teak",
  "Gold",
  "Bronze",
];
const LOCK_TYPES = [
  "Mortise",
  "Cylindrical",
  "Deadbolt",
  "Smart Lock",
  "Magnetic",
];
const HINGE_TYPES = ["3 مفصلات", "4 مفصلات", "مفصلات مخفية", "مفصلات بيانو"];
const SUPERVISORS = [
  "م. خالد العتيبي",
  "م. سعد الغامدي",
  "م. فهد الحربي",
  "م. عبدالله الزهراني",
  "م. محمد العسيري",
];

// ─── حساب توزيع الأقسام تلقائياً ─────────────────────────────
function autoDistribute(
  doors: DoorItem[],
  startDate: string,
  dueDate: string
): DeptTask[] {
  const totalDoors = doors.reduce((s, d) => s + d.quantity, 0);
  if (totalDoors === 0) return [];

  const hasSpecial = doors.some(
    d => d.specialReqs && d.specialReqs.trim() !== ""
  );
  const hasFilm = doors.some(d => d.edgeType === "film");
  const uniqueColors = new Set(doors.map(d => d.doorColor)).size;

  // حساب التواريخ بناءً على المدة الكلية
  const start = new Date(startDate || new Date().toISOString().split("T")[0]);
  const end = new Date(
    dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]
  );
  const totalMs = end.getTime() - start.getTime();

  function addDays(base: Date, days: number): string {
    const d = new Date(base.getTime() + days * 86400000);
    return d.toISOString().split("T")[0];
  }

  // توزيع الوقت: خط الأبواب 40%، خط الإطارات 30%، إكسسوارات 20%، QC 15%، تغليف 10%
  const totalDays = Math.max(1, Math.ceil(totalMs / 86400000));
  const doorDays = Math.ceil(totalDays * 0.4);
  const frameDays = Math.ceil(totalDays * 0.3);
  const accDays = Math.ceil(totalDays * 0.2);
  const qcDays = Math.ceil(totalDays * 0.15);
  const packDays = Math.ceil(totalDays * 0.1);

  // تواريخ متتالية مع تداخل جزئي
  const doorStart = addDays(start, 0);
  const doorEnd = addDays(start, doorDays);
  const frameStart = addDays(start, 1);
  const frameEnd = addDays(start, 1 + frameDays);
  const accStart = addDays(start, Math.floor(doorDays * 0.5));
  const accEnd = addDays(start, Math.floor(doorDays * 0.5) + accDays);
  const qcStart = addDays(start, doorDays);
  const qcEnd = addDays(start, doorDays + qcDays);
  const packStart = addDays(start, doorDays + qcDays - 1);
  const packEnd = end.toISOString().split("T")[0];

  // عدد الإطارات = مجموع الأبواب (كل باب له إطار)
  const totalFrames = totalDoors;
  // الإكسسوارات = قفل + مفصلات لكل باب
  const totalAccessories = totalDoors * 2;

  // مواصفات مُولَّدة تلقائياً
  const colorsList = Array.from(new Set(doors.map(d => d.doorColor))).join(
    "، "
  );
  const frameColorsList = Array.from(
    new Set(doors.map(d => d.frameColor))
  ).join("، ");
  const edgeTypes = Array.from(new Set(doors.map(d => d.edgeType))).join(" + ");
  const lockTypes = Array.from(new Set(doors.map(d => d.lockType))).join("، ");
  const hingeTypes = Array.from(new Set(doors.map(d => d.hingeType))).join(
    "، "
  );

  const tasks: DeptTask[] = [
    {
      deptId: "door_line",
      quantity: totalDoors,
      unit: "باب",
      specs: `ألوان: ${colorsList} · حافة: ${edgeTypes}${hasFilm ? " (فيلم)" : ""}${hasSpecial ? " · متطلبات خاصة" : ""} · ${uniqueColors} لون مختلف`,
      assignedTo: "فريق خط الأبواب",
      startDate: doorStart,
      dueDate: doorEnd,
      status: "draft",
      completedQty: 0,
      notes: hasSpecial
        ? "⚠️ بعض الأبواب تحتوي على متطلبات خاصة — راجع جدول الأبواب"
        : undefined,
    },
    {
      deptId: "frame_line",
      quantity: totalFrames,
      unit: "إطار",
      specs: `ألوان الإطارات: ${frameColorsList} · أنواع الإطارات: ${Array.from(new Set(doors.map(d => d.frameType))).join("، ")}`,
      assignedTo: "فريق خط الإطارات",
      startDate: frameStart,
      dueDate: frameEnd,
      status: "draft",
      completedQty: 0,
    },
    {
      deptId: "accessories",
      quantity: totalAccessories,
      unit: "قطعة",
      specs: `أقفال: ${lockTypes} · مفصلات: ${hingeTypes} · ${totalDoors} طقم كامل`,
      assignedTo: "قسم الإكسسوارات",
      startDate: accStart,
      dueDate: accEnd,
      status: "draft",
      completedQty: 0,
    },
    {
      deptId: "qc",
      quantity: totalDoors,
      unit: "باب",
      specs: `فحص شامل: المقاسات، الألوان، الاتجاه، القفل، المفصلات، العيوب البصرية والوظيفية`,
      assignedTo: "فريق ضبط الجودة",
      startDate: qcStart,
      dueDate: qcEnd,
      status: "draft",
      completedQty: 0,
    },
    {
      deptId: "packing",
      quantity: totalDoors,
      unit: "باب",
      specs: `تغليف فردي · وضع الكود ورقم الطلب والاتجاه على كل طرد`,
      assignedTo: "قسم التغليف",
      startDate: packStart,
      dueDate: packEnd,
      status: "draft",
      completedQty: 0,
    },
  ];

  return tasks;
}

// ─── مؤشر الخطوات ─────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "بيانات الطلب", icon: <FileText className="w-4 h-4" /> },
  { id: 2, label: "جدول الأبواب", icon: <DoorOpen className="w-4 h-4" /> },
  { id: 3, label: "توزيع الأقسام", icon: <Layers className="w-4 h-4" /> },
  { id: 4, label: "المراجعة والتأكيد", icon: <Check className="w-4 h-4" /> },
];

// ─── خطوة 1: بيانات PO ────────────────────────────────────────
function Step1POData({
  data,
  onChange,
}: {
  data: WizardFormData;
  onChange: (updates: Partial<WizardFormData>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          أدخل بيانات أمر الشراء المعتمد. سيتم إنشاء رقم أمر التشغيل تلقائياً.
        </p>
      </div>

      {/* PO + Distributor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            رقم أمر الشراء (PO) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Hash className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={data.poNumber}
              onChange={e => onChange({ poNumber: e.target.value })}
              placeholder="ORD-2026-0001"
              className="pr-9 text-right"
              dir="ltr"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            اسم الموزع / الشركة <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={data.distributorName}
              onChange={e => onChange({ distributorName: e.target.value })}
              placeholder="شركة الأفق للمقاولات"
              className="pr-9 text-right"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            رقم الجوال
          </label>
          <div className="relative">
            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={data.distributorPhone}
              onChange={e => onChange({ distributorPhone: e.target.value })}
              placeholder="05xxxxxxxx"
              className="pr-9 text-right"
              dir="ltr"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            المشرف المسؤول <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={data.supervisorName}
              onChange={e => onChange({ supervisorName: e.target.value })}
              className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-right appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختر المشرف...</option>
              {SUPERVISORS.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            تاريخ بدء الإنتاج <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="date"
              value={data.startDate}
              onChange={e => onChange({ startDate: e.target.value })}
              className="pr-9 text-right"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            الموعد النهائي للتسليم <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="date"
              value={data.dueDate}
              onChange={e => onChange({ dueDate: e.target.value })}
              className="pr-9 text-right"
            />
          </div>
        </div>
      </div>

      {/* Priority + Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            الأولوية
          </label>
          <div className="flex gap-2">
            {(["normal", "urgent", "vip"] as Priority[]).map(p => {
              const cfg = {
                normal: {
                  label: "عادي",
                  color: "oklch(0.50 0.16 250)",
                  bg: "oklch(0.95 0.03 250)",
                },
                urgent: {
                  label: "عاجل",
                  color: "oklch(0.50 0.16 25)",
                  bg: "oklch(0.95 0.03 25)",
                },
                vip: {
                  label: "VIP",
                  color: "oklch(0.50 0.16 60)",
                  bg: "oklch(0.95 0.03 60)",
                },
              }[p];
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onChange({ priority: p })}
                  className="flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all"
                  style={
                    data.priority === p
                      ? {
                          background: cfg.bg,
                          borderColor: cfg.color,
                          color: cfg.color,
                        }
                      : {
                          background: "white",
                          borderColor: "#E5E7EB",
                          color: "#6B7280",
                        }
                  }
                >
                  {p === "urgent" && (
                    <Zap className="w-3.5 h-3.5 inline ml-1" />
                  )}
                  {p === "vip" && <Star className="w-3.5 h-3.5 inline ml-1" />}
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            نوع الطلب
          </label>
          <div className="flex gap-2">
            {(["standard", "custom"] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => onChange({ orderType: t })}
                className="flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all"
                style={
                  data.orderType === t
                    ? {
                        background: "oklch(0.95 0.03 160)",
                        borderColor: "oklch(0.50 0.16 160)",
                        color: "oklch(0.38 0.06 160)",
                      }
                    : {
                        background: "white",
                        borderColor: "#E5E7EB",
                        color: "#6B7280",
                      }
                }
              >
                {t === "standard" ? "قياسي" : "مخصص"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1.5">
          ملاحظات خاصة
        </label>
        <textarea
          value={data.notes}
          onChange={e => onChange({ notes: e.target.value })}
          placeholder="أي ملاحظات أو متطلبات خاصة بهذا الطلب..."
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-right resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

// ─── خطوة 2: جدول الأبواب ─────────────────────────────────────
function Step2Doors({
  data,
  onChange,
}: {
  data: WizardFormData;
  onChange: (updates: Partial<WizardFormData>) => void;
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  function addDoor() {
    const idx = data.doors.length + 1;
    const newDoor: DoorItem = {
      ...EMPTY_DOOR,
      code: `D-${String(idx).padStart(3, "0")}`,
    };
    onChange({ doors: [...data.doors, newDoor] });
    setExpandedIdx(data.doors.length);
  }

  function removeDoor(i: number) {
    const updated = data.doors.filter((_, idx) => idx !== i);
    onChange({ doors: updated });
    setExpandedIdx(null);
  }

  function updateDoor(i: number, updates: Partial<DoorItem>) {
    const updated = data.doors.map((d, idx) =>
      idx === i ? { ...d, ...updates } : d
    );
    onChange({ doors: updated });
  }

  function duplicateDoor(i: number) {
    const src = data.doors[i];
    const newDoor: DoorItem = {
      ...src,
      code: `D-${String(data.doors.length + 1).padStart(3, "0")}`,
    };
    const updated = [...data.doors];
    updated.splice(i + 1, 0, newDoor);
    onChange({ doors: updated });
    setExpandedIdx(i + 1);
    toast.success("تم نسخ الباب");
  }

  const totalDoors = data.doors.reduce((s, d) => s + d.quantity, 0);

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {data.doors.length}
            </div>
            <div className="text-xs text-gray-400">موديل</div>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div className="text-center">
            <div
              className="text-2xl font-bold"
              style={{ color: "oklch(0.50 0.16 250)" }}
            >
              {totalDoors}
            </div>
            <div className="text-xs text-gray-400">باب إجمالي</div>
          </div>
          {data.doors.some(d => d.specialReqs) && (
            <>
              <div className="w-px h-10 bg-gray-200" />
              <div className="flex items-center gap-1.5 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {data.doors.filter(d => d.specialReqs).length} متطلبات خاصة
                </span>
              </div>
            </>
          )}
        </div>
        <Button
          type="button"
          onClick={addDoor}
          className="gap-2"
          style={{ background: "oklch(0.38 0.06 160)" }}
        >
          <Plus className="w-4 h-4" />
          إضافة باب
        </Button>
      </div>

      {data.doors.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <DoorOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">لم تُضف أي أبواب بعد</p>
          <p className="text-sm text-gray-400 mt-1">
            اضغط "إضافة باب" لبدء جدول الأبواب
          </p>
        </div>
      )}

      {/* Door Cards */}
      <div className="space-y-3">
        {data.doors.map((door, i) => {
          const isOpen = expandedIdx === i;
          return (
            <motion.div
              key={i}
              layout
              className="border border-gray-200 rounded-2xl overflow-hidden bg-white"
            >
              {/* Door Header */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedIdx(isOpen ? null : i)}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: "oklch(0.50 0.16 250)" }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 text-sm">
                      {door.code || `باب ${i + 1}`}
                    </span>
                    {door.model && (
                      <span className="text-xs text-gray-500">
                        {door.model}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {door.width}×{door.height} سم
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {door.direction === "right" ? "يمين" : "يسار"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${door.edgeType === "ABS" ? "border-green-200 text-green-700" : "border-orange-200 text-orange-700"}`}
                    >
                      {door.edgeType}
                    </Badge>
                    {door.specialReqs && (
                      <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        متطلبات خاصة
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {door.doorColor} · {door.lockType} · {door.hingeType}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">
                      {door.quantity}
                    </div>
                    <div className="text-[10px] text-gray-400">باب</div>
                  </div>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      duplicateDoor(i);
                    }}
                    className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                    title="نسخ"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      removeDoor(i);
                    }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Door Details (Expanded) */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 border-t border-gray-100 pt-4 bg-gray-50">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {/* Code */}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">
                            كود الباب
                          </label>
                          <Input
                            value={door.code}
                            onChange={e =>
                              updateDoor(i, { code: e.target.value })
                            }
                            placeholder="D-001"
                            className="text-sm text-right"
                            dir="ltr"
                          />
                        </div>
                        {/* Model */}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">
                            الموديل
                          </label>
                          <select
                            value={door.model}
                            onChange={e =>
                              updateDoor(i, { model: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-right appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">اختر...</option>
                            {MODELS.map(m => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>
                        {/* Width */}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">
                            العرض (سم)
                          </label>
                          <Input
                            type="number"
                            value={door.width}
                            onChange={e =>
                              updateDoor(i, { width: Number(e.target.value) })
                            }
                            min={60}
                            max={150}
                            className="text-sm text-right"
                          />
                        </div>
                        {/* Height */}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">
                            الارتفاع (سم)
                          </label>
                          <Input
                            type="number"
                            value={door.height}
                            onChange={e =>
                              updateDoor(i, { height: Number(e.target.value) })
                            }
                            min={180}
                            max={260}
                            className="text-sm text-right"
                          />
                        </div>
                        {/* Direction */}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">
                            الاتجاه
                          </label>
                          <div className="flex gap-2">
                            {(["right", "left"] as const).map(d => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => updateDoor(i, { direction: d })}
                                className="flex-1 py-2 text-xs font-bold rounded-lg border-2 transition-all"
                                style={
                                  door.direction === d
                                    ? {
                                        background: "oklch(0.95 0.03 250)",
                                        borderColor: "oklch(0.50 0.16 250)",
                                        color: "oklch(0.38 0.08 250)",
                                      }
                                    : {
                                        background: "white",
                                        borderColor: "#E5E7EB",
                                        color: "#6B7280",
                                      }
                                }
                              >
                                {d === "right" ? "← يمين" : "يسار →"}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Frame Type */}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">
                            نوع الإطار
                          </label>
                          <select
                            value={door.frameType}
                            onChange={e =>
                              updateDoor(i, { frameType: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-right appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {FRAME_TYPES.map(f => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </select>
                        </div>
                        {/* Edge Type */}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">
                            نوع الحافة
                          </label>
                          <div className="flex gap-2">
                            {(["ABS", "film"] as const).map(e => (
                              <button
                                key={e}
                                type="button"
                                onClick={() => updateDoor(i, { edgeType: e })}
                                className="flex-1 py-2 text-xs font-bold rounded-lg border-2 transition-all"
                                style={
                                  door.edgeType === e
                                    ? {
                                        background: "oklch(0.95 0.03 140)",
                                        borderColor: "oklch(0.50 0.16 140)",
                                        color: "oklch(0.38 0.08 140)",
                                      }
                                    : {
                                        background: "white",
                                        borderColor: "#E5E7EB",
                                        color: "#6B7280",
                                      }
                                }
                              >
                                {e === "ABS" ? "ABS" : "فيلم"}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Door Color */}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">
                            لون الباب
                          </label>
                          <select
                            value={door.doorColor}
                            onChange={e =>
                              updateDoor(i, { doorColor: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-right appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {COLORS.map(c => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                        {/* Frame Color */}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">
                            لون الإطار
                          </label>
                          <select
                            value={door.frameColor}
                            onChange={e =>
                              updateDoor(i, { frameColor: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-right appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {COLORS.map(c => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                        {/* Lock */}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">
                            نوع القفل
                          </label>
                          <select
                            value={door.lockType}
                            onChange={e =>
                              updateDoor(i, { lockType: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-right appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {LOCK_TYPES.map(l => (
                              <option key={l} value={l}>
                                {l}
                              </option>
                            ))}
                          </select>
                        </div>
                        {/* Hinge */}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">
                            نوع المفصلات
                          </label>
                          <select
                            value={door.hingeType}
                            onChange={e =>
                              updateDoor(i, { hingeType: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-right appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {HINGE_TYPES.map(h => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </div>
                        {/* Quantity */}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">
                            الكمية
                          </label>
                          <Input
                            type="number"
                            value={door.quantity}
                            onChange={e =>
                              updateDoor(i, {
                                quantity: Math.max(1, Number(e.target.value)),
                              })
                            }
                            min={1}
                            className="text-sm text-right font-bold"
                          />
                        </div>
                        {/* Special Reqs */}
                        <div className="col-span-2 sm:col-span-3 lg:col-span-4">
                          <label className="block text-xs font-bold text-gray-600 mb-1">
                            متطلبات خاصة (اختياري)
                          </label>
                          <Input
                            value={door.specialReqs || ""}
                            onChange={e =>
                              updateDoor(i, { specialReqs: e.target.value })
                            }
                            placeholder="مثال: مقاومة حريق، عزل صوتي، رطوبة..."
                            className="text-sm text-right"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {data.doors.length > 0 && (
        <button
          type="button"
          onClick={addDoor}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm font-medium text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          إضافة موديل آخر
        </button>
      )}
    </div>
  );
}

// ─── خطوة 3: توزيع الأقسام ────────────────────────────────────
function Step3Departments({
  data,
  onChange,
}: {
  data: WizardFormData;
  onChange: (updates: Partial<WizardFormData>) => void;
}) {
  function updateTask(deptId: DeptId, updates: Partial<DeptTask>) {
    const updated = data.deptTasks.map(t =>
      t.deptId === deptId ? { ...t, ...updates } : t
    );
    onChange({ deptTasks: updated });
  }
  const totalDoors = data.doors.reduce((s, d) => s + d.quantity, 0);

  // ── فحص توفر المواد الخام ──────────────────────────────────
  const materialCheck = useMemo(() => {
    if (totalDoors === 0) return [];
    const doorColors = data.doors.map(d => d.doorColor);
    const frameColors = data.doors.map(d => d.frameColor);
    const lockTypes = data.doors.map(d => d.lockType);
    const hingeTypes = data.doors.map(d => d.hingeType);
    const edgeTypes = data.doors.map(d => d.edgeType);
    const hasFilm = data.doors.some(d => d.edgeType === "film");
    return checkMaterialAvailability({
      totalDoors,
      doorColors,
      frameColors,
      lockTypes,
      hingeTypes,
      edgeTypes,
      hasFilm,
    });
  }, [totalDoors, data.doors]);

  const shortages = materialCheck.filter(m => !m.sufficient);
  const allSufficient = shortages.length === 0;

  return (
    <div className="space-y-5">
      {/* ── لوحة فحص المخزون ──────────────────────────────────── */}
      <div
        className={`rounded-2xl border p-4 ${
          allSufficient
            ? "bg-green-50 border-green-100"
            : shortages.length === materialCheck.length
              ? "bg-red-50 border-red-100"
              : "bg-amber-50 border-amber-100"
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          {allSufficient ? (
            <ShieldCheck className="w-4 h-4 text-green-600" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-red-600" />
          )}
          <span
            className={`text-sm font-bold ${
              allSufficient ? "text-green-800" : "text-red-800"
            }`}
          >
            {allSufficient
              ? `✅ المخزون كافٍ لتنفيذ الطلب (${totalDoors} باب)`
              : `⚠️ نقص في ${shortages.length} مادة من أصل ${materialCheck.length} — راجع التفاصيل أدناه`}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {materialCheck.map(m => (
            <div
              key={m.materialId}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
                m.sufficient ? "bg-white/70" : "bg-red-100/60"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  m.sufficient ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-gray-800 truncate">
                  {m.materialName}
                </div>
                <div className="text-xs text-gray-500">
                  مطلوب: <span className="font-bold">{m.required}</span>{" "}
                  {m.unit} · متوفر:{" "}
                  <span
                    className={`font-bold ${m.sufficient ? "text-green-700" : "text-red-700"}`}
                  >
                    {m.available}
                  </span>{" "}
                  {m.unit}
                  {!m.sufficient && (
                    <span className="text-red-600 font-bold">
                      {" "}
                      · نقص: {m.shortage} {m.unit}
                    </span>
                  )}
                </div>
              </div>
              {m.sufficient ? (
                <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
        {!allSufficient && (
          <div className="mt-3 flex items-start gap-2 bg-amber-100/60 rounded-xl px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              يمكنك إنشاء أمر التشغيل مع وجود نقص في المخزون، لكن يُنصح بتأمين
              المواد قبل بدء الإنتاج. صرف المواد يتم لاحقًا من خلال إصدار المواد.
            </p>
          </div>
        )}
      </div>

      {/* Auto-distribution notice */}
      <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-green-800">
            تم التوزيع التلقائي على الأقسام
          </p>
          <p className="text-xs text-green-700 mt-0.5">
            بناءً على {totalDoors} باب إجمالي والمدة من {data.startDate} إلى{" "}
            {data.dueDate}، تم حساب الكميات والمواصفات والجدول الزمني لكل قسم
            تلقائياً. يمكنك تعديل أي قيمة.
          </p>
        </div>
      </div>

      {/* Dept Cards */}
      {data.deptTasks.map((task, i) => {
        const dept = DEPARTMENTS[task.deptId];
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
            <div className="flex items-center gap-3 p-4 bg-white">
              <div
                className="p-2.5 rounded-xl flex-shrink-0"
                style={{ background: dept.bgColor, color: dept.color }}
              >
                {dept.icon}
              </div>
              <div className="flex-1">
                <div className="font-bold text-gray-900">{dept.labelAr}</div>
                <div className="text-xs text-gray-400">{dept.labelEn}</div>
              </div>
              <div className="text-left flex-shrink-0">
                <div
                  className="text-xl font-bold"
                  style={{ color: dept.color }}
                >
                  {task.quantity}
                </div>
                <div className="text-xs text-gray-400">{task.unit}</div>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
                {/* Quantity */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    الكمية المطلوبة
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={task.quantity}
                      onChange={e =>
                        updateTask(task.deptId, {
                          quantity: Math.max(0, Number(e.target.value)),
                        })
                      }
                      min={0}
                      className="text-sm font-bold text-right"
                    />
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {task.unit}
                    </span>
                  </div>
                </div>
                {/* Assigned To */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    المسؤول
                  </label>
                  <Input
                    value={task.assignedTo}
                    onChange={e =>
                      updateTask(task.deptId, { assignedTo: e.target.value })
                    }
                    className="text-sm text-right"
                  />
                </div>
                {/* Start Date */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    تاريخ البدء
                  </label>
                  <Input
                    type="date"
                    value={task.startDate}
                    onChange={e =>
                      updateTask(task.deptId, { startDate: e.target.value })
                    }
                    className="text-sm text-right"
                  />
                </div>
                {/* Due Date */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    الموعد النهائي
                  </label>
                  <Input
                    type="date"
                    value={task.dueDate}
                    onChange={e =>
                      updateTask(task.deptId, { dueDate: e.target.value })
                    }
                    className="text-sm text-right"
                  />
                </div>
                {/* Specs */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    المواصفات المطلوبة
                  </label>
                  <Input
                    value={task.specs}
                    onChange={e =>
                      updateTask(task.deptId, { specs: e.target.value })
                    }
                    className="text-sm text-right"
                  />
                </div>
                {/* Notes */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    ملاحظات للقسم (اختياري)
                  </label>
                  <Input
                    value={task.notes || ""}
                    onChange={e =>
                      updateTask(task.deptId, {
                        notes: e.target.value || undefined,
                      })
                    }
                    placeholder="تعليمات خاصة لهذا القسم..."
                    className="text-sm text-right"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── خطوة 4: المراجعة والتأكيد ────────────────────────────────
function Step4Review({ data }: { data: WizardFormData }) {
  const totalDoors = data.doors.reduce((s, d) => s + d.quantity, 0);
  const priorityLabels: Record<Priority, string> = {
    normal: "عادي",
    urgent: "عاجل",
    vip: "VIP",
  };

  return (
    <div className="space-y-5">
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          راجع جميع البيانات قبل الإصدار. بعد الإصدار سيتم توجيه أمر التشغيل
          لجميع الأقسام المعنية.
        </p>
      </div>

      {/* PO Summary */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-gray-500" />
          <h3 className="font-bold text-gray-800">بيانات أمر الشراء</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          {[
            { label: "رقم PO", value: data.poNumber },
            { label: "الموزع", value: data.distributorName },
            { label: "الجوال", value: data.distributorPhone || "—" },
            { label: "المشرف", value: data.supervisorName },
            { label: "تاريخ البدء", value: data.startDate },
            { label: "الموعد النهائي", value: data.dueDate },
            { label: "الأولوية", value: priorityLabels[data.priority] },
            {
              label: "نوع الطلب",
              value: data.orderType === "standard" ? "قياسي" : "مخصص",
            },
          ].map((item, i) => (
            <div key={i}>
              <div className="text-xs text-gray-400">{item.label}</div>
              <div className="font-bold text-gray-900 mt-0.5">{item.value}</div>
            </div>
          ))}
        </div>
        {data.notes && (
          <div className="mt-4 p-3 bg-gray-50 rounded-xl">
            <div className="text-xs text-gray-400 mb-1">ملاحظات</div>
            <div className="text-sm text-gray-700">{data.notes}</div>
          </div>
        )}
      </div>

      {/* Doors Summary */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DoorOpen className="w-4 h-4 text-gray-500" />
            <h3 className="font-bold text-gray-800">ملخص الأبواب</h3>
          </div>
          <Badge
            className="text-sm font-bold"
            style={{
              background: "oklch(0.95 0.03 250)",
              color: "oklch(0.38 0.08 250)",
            }}
          >
            {totalDoors} باب إجمالي
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                {[
                  "الكود",
                  "الموديل",
                  "المقاس",
                  "الاتجاه",
                  "الحافة",
                  "لون الباب",
                  "القفل",
                  "الكمية",
                ].map((h, i) => (
                  <th
                    key={i}
                    className="pb-2 px-2 font-bold text-gray-500 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.doors.map((door, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2 px-2 font-mono font-bold text-blue-700">
                    {door.code}
                  </td>
                  <td className="py-2 px-2 text-gray-700">
                    {door.model || "—"}
                  </td>
                  <td className="py-2 px-2 font-mono text-gray-600">
                    {door.width}×{door.height}
                  </td>
                  <td className="py-2 px-2">
                    {door.direction === "right" ? "يمين" : "يسار"}
                  </td>
                  <td className="py-2 px-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${door.edgeType === "ABS" ? "border-green-200 text-green-700" : "border-orange-200 text-orange-700"}`}
                    >
                      {door.edgeType}
                    </Badge>
                  </td>
                  <td className="py-2 px-2 text-gray-700">{door.doorColor}</td>
                  <td className="py-2 px-2 text-gray-600">{door.lockType}</td>
                  <td className="py-2 px-2 font-bold text-gray-900 text-center">
                    {door.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Departments Summary */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-gray-500" />
          <h3 className="font-bold text-gray-800">توزيع الأقسام</h3>
        </div>
        <div className="space-y-2">
          {data.deptTasks.map(task => {
            const dept = DEPARTMENTS[task.deptId];
            return (
              <div
                key={task.deptId}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
              >
                <div
                  className="p-2 rounded-lg flex-shrink-0"
                  style={{ background: dept.bgColor, color: dept.color }}
                >
                  {dept.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900">
                      {dept.labelAr}
                    </span>
                    <span className="text-xs text-gray-400">
                      {task.assignedTo}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    {task.specs}
                  </div>
                </div>
                <div className="text-left flex-shrink-0">
                  <div className="font-bold text-gray-900">
                    {task.quantity} {task.unit}
                  </div>
                  <div className="text-xs text-gray-400">
                    {task.startDate} → {task.dueDate}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── المكوّن الرئيسي للـ Wizard ────────────────────────────────
// ─── نوع البيانات المسبقة من طلب الموزع ────────────────────────────────────
export interface WizardPrefillData {
  poNumber?: string;
  distributorName?: string;
  distributorPhone?: string;
  notes?: string;
  priority?: Priority;
  orderType?: "standard" | "custom";
  // أبواب مستخرجة من بنود الطلب
  doors?: Partial<DoorItem>[];
}

export default function CreateWorkOrderWizard({
  onClose,
  onCreated,
  initialData,
}: {
  onClose: () => void;
  onCreated: (wo: { woNumber: string }) => void;
  initialData?: WizardPrefillData;
}) {
  const today = new Date().toISOString().split("T")[0];
  const twoWeeks = new Date(Date.now() + 14 * 86400000)
    .toISOString()
    .split("T")[0];

  // تحويل بنود الطلب إلى أبواب كاملة إن وجدت
  const prefillDoors: DoorItem[] = (initialData?.doors ?? []).map((d, i) => ({
    code: d.code || `DOOR-${String(i + 1).padStart(3, "0")}`,
    model: d.model || MODELS[0],
    width: d.width || 90,
    height: d.height || 210,
    direction: d.direction || "right",
    frameType: d.frameType || "Standard",
    edgeType: d.edgeType || "ABS",
    doorColor: d.doorColor || "White",
    frameColor: d.frameColor || "White",
    lockType: d.lockType || "Mortise",
    hingeType: d.hingeType || "3 مفصلات",
    quantity: d.quantity || 1,
    specialReqs: d.specialReqs || "",
  }));

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardFormData>({
    poNumber: initialData?.poNumber || "",
    distributorName: initialData?.distributorName || "",
    distributorPhone: initialData?.distributorPhone || "",
    supervisorName: "",
    startDate: today,
    dueDate: twoWeeks,
    priority: initialData?.priority || "normal",
    orderType: initialData?.orderType || "standard",
    notes: initialData?.notes || "",
    doors: prefillDoors,
    deptTasks: [],
  });

  const updateForm = useCallback((updates: Partial<WizardFormData>) => {
    setForm(prev => ({ ...prev, ...updates }));
  }, []);

  const isPrefilled = !!initialData?.poNumber;

  // ── التحقق من صحة كل خطوة ────────────────────────────────────
  function validateStep(s: number): { valid: boolean; message?: string } {
    if (s === 1) {
      if (!form.poNumber.trim())
        return { valid: false, message: "أدخل رقم أمر الشراء" };
      if (!form.distributorName.trim())
        return { valid: false, message: "أدخل اسم الموزع" };
      if (!form.supervisorName)
        return { valid: false, message: "اختر المشرف المسؤول" };
      if (!form.startDate)
        return { valid: false, message: "حدد تاريخ بدء الإنتاج" };
      if (!form.dueDate) return { valid: false, message: "حدد الموعد النهائي" };
      if (form.dueDate <= form.startDate)
        return {
          valid: false,
          message: "الموعد النهائي يجب أن يكون بعد تاريخ البدء",
        };
    }
    if (s === 2) {
      if (form.doors.length === 0)
        return { valid: false, message: "أضف باباً واحداً على الأقل" };
      const invalid = form.doors.find(d => !d.model || !d.code);
      if (invalid)
        return {
          valid: false,
          message: "تأكد من إدخال الكود والموديل لجميع الأبواب",
        };
    }
    return { valid: true };
  }

  const createMutation = trpc.workOrders.create.useMutation();

  function handleNext() {
    const { valid, message } = validateStep(step);
    if (!valid) {
      toast.error(message);
      return;
    }

    if (step === 2) {
      // توزيع الأقسام تلقائياً عند الانتقال للخطوة 3
      const tasks = autoDistribute(form.doors, form.startDate, form.dueDate);
      updateForm({ deptTasks: tasks });
    }
    setStep(s => s + 1);
  }

  function handleBack() {
    setStep(s => s - 1);
  }

  async function handleSubmit() {
    const { valid, message } = validateStep(step);
    if (!valid) {
      toast.error(message);
      return;
    }

    // إنشاء رقم أمر التشغيل
    const now = new Date();
    const woNumber = `WO-${now.getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const totalDoors = form.doors.reduce((s, d) => s + d.quantity, 0);

    // ── حفظ في DB ──────────────────────────────────────────────────────────────
    await createMutation.mutateAsync({
      woNumber,
      poNumber: form.poNumber,
      distributorName: form.distributorName,
      distributorPhone: form.distributorPhone,
      issuedAt: now.getTime(),
      startDate: form.startDate,
      dueDate: form.dueDate,
      status: "issued",
      priority: form.priority,
      orderType: form.orderType,
      totalDoors,
      totalValue: totalDoors * 1800,
      doors: form.doors,
      deptTasks: form.deptTasks,
      supervisorName: form.supervisorName,
      notes: form.notes || undefined,
      progressPercent: 0,
    });

    onCreated({ woNumber });

    toast.success(`تم إنشاء أمر التشغيل ${woNumber} بنجاح`, {
      description:
        `${totalDoors} باب · ${form.deptTasks.length} أقسام · صرف المواد يتم لاحقًا من خلال إصدار المواد.`,
    });

    onClose();
  }

  return (
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
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0"
          style={{ borderTop: "4px solid oklch(0.38 0.06 160)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl"
              style={{
                background: "oklch(0.95 0.03 160)",
                color: "oklch(0.38 0.06 160)",
              }}
            >
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2
                className="font-bold text-gray-900 text-lg"
                style={{ fontFamily: "DM Serif Display, serif" }}
              >
                إنشاء أمر تشغيل جديد
              </h2>
              <p className="text-sm text-gray-400">
                الخطوة {step} من {STEPS.length}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Step Indicator ─────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => {
              const isActive = step === s.id;
              const isCompleted = step > s.id;
              return (
                <div key={s.id} className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                      style={
                        isCompleted
                          ? {
                              background: "oklch(0.50 0.16 140)",
                              color: "white",
                            }
                          : isActive
                            ? {
                                background: "oklch(0.38 0.06 160)",
                                color: "white",
                              }
                            : { background: "#F3F4F6", color: "#9CA3AF" }
                      }
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : s.icon}
                    </div>
                    <span
                      className={`text-xs font-medium hidden sm:block ${isActive ? "text-gray-900" : isCompleted ? "text-green-600" : "text-gray-400"}`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className="flex-1 h-0.5 mx-2 rounded-full"
                      style={{
                        background:
                          step > s.id ? "oklch(0.50 0.16 140)" : "#E5E7EB",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Prefill Banner ─────────────────────────────────── */}
        {isPrefilled && (
          <div className="px-6 pt-4 flex-shrink-0">
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
              <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-800">
                  تم الملء التلقائي من طلب الموزع
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  تم نقل بيانات الطلب <strong>{initialData?.poNumber}</strong>{" "}
                  تلقائياً. يمكنك مراجعة وتعديل أي حقل قبل الإصدار.
                </p>
              </div>
            </div>
          </div>
        )}
        {/* ── Step Content ───────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
            >
              {step === 1 && <Step1POData data={form} onChange={updateForm} />}
              {step === 2 && <Step2Doors data={form} onChange={updateForm} />}
              {step === 3 && (
                <Step3Departments data={form} onChange={updateForm} />
              )}
              {step === 4 && <Step4Review data={form} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <Button
            variant="outline"
            onClick={step === 1 ? onClose : handleBack}
            className="gap-2"
          >
            {step === 1 ? (
              <>
                <X className="w-4 h-4" /> إلغاء
              </>
            ) : (
              <>
                <ChevronRight className="w-4 h-4" /> السابق
              </>
            )}
          </Button>

          <div className="flex items-center gap-2">
            {/* Step dots */}
            <div className="flex gap-1.5 ml-3">
              {STEPS.map(s => (
                <div
                  key={s.id}
                  className="rounded-full transition-all"
                  style={{
                    width: step === s.id ? "20px" : "6px",
                    height: "6px",
                    background:
                      step === s.id
                        ? "oklch(0.38 0.06 160)"
                        : step > s.id
                          ? "oklch(0.50 0.16 140)"
                          : "#D1D5DB",
                  }}
                />
              ))}
            </div>

            {step < 4 ? (
              <Button
                onClick={handleNext}
                className="gap-2"
                style={{ background: "oklch(0.38 0.06 160)" }}
              >
                التالي
                <ChevronLeft className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                className="gap-2 px-6"
                style={{ background: "oklch(0.50 0.16 140)" }}
              >
                <Send className="w-4 h-4" />
                إصدار أمر التشغيل
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
