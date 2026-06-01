// ============================================================
// AdminQCInspection - نظام فحص الجودة الشامل
// Incoming QC + Final QC + PO Matching
// ============================================================
import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Eye,
  CheckSquare,
  AlertTriangle,
  CheckCircle2,
  X,
  Camera,
  Upload,
  Plus,
  Filter,
  Search,
  Download,
  Clock,
  Package,
  Hash,
  User,
  ChevronDown,
  ChevronUp,
  Circle,
  RefreshCw,
  BarChart3,
  Zap,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// ─── أنواع البيانات ───────────────────────────────────────────
type QCType = "incoming" | "final" | "po_matching";
type QCResult = "pass" | "fail" | "pending";

interface QCItem {
  id: string;
  orderNumber: string;
  distributorName: string;
  totalDoors: number;
  qcType: QCType;
  result: QCResult;
  inspector: string;
  inspectedAt: string;
  issues: string[];
  photos: number;
  notes?: string;
}

function mapDbRow(row: any): QCItem {
  return {
    id: String(row.id),
    orderNumber: row.orderNumber,
    distributorName: row.distributorName,
    totalDoors: row.totalDoors ?? 1,
    qcType: row.qcType as QCType,
    result: row.result as QCResult,
    inspector: row.inspector ?? "",
    inspectedAt: new Date(row.inspectedAt).toISOString().split("T")[0],
    issues: Array.isArray(row.issues) ? (row.issues as string[]) : [],
    photos: row.photos ?? 0,
    notes: row.notes ?? undefined,
  };
}

// ─── نموذج فحص جديد ──────────────────────────────────────────
function NewInspectionForm({
  onClose,
  onSuccess,
  qcType,
}: {
  onClose: () => void;
  onSuccess: () => void;
  qcType: QCType;
}) {
  const createMutation = trpc.qc.create.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ نتيجة الفحص");
      onSuccess();
      onClose();
    },
    onError: () => toast.error("حدث خطأ أثناء الحفظ"),
  });

  const [orderNumber, setOrderNumber] = useState("");
  const [distributorName, setDistributorName] = useState("");
  const [totalDoors, setTotalDoors] = useState(1);
  const [inspector, setInspector] = useState("");
  const [checkItems, setCheckItems] = useState({
    color: null as boolean | null,
    thickness: null as boolean | null,
    straightness: null as boolean | null,
    defects: null as boolean | null,
    dimensions: null as boolean | null,
    direction: null as boolean | null,
    lockPosition: null as boolean | null,
    functional: null as boolean | null,
    qtyMatch: null as boolean | null,
    allItems: null as boolean | null,
  });
  const [notes, setNotes] = useState("");

  const incomingChecks = [
    { key: "color", label: "اللون مطابق للمواصفات" },
    { key: "thickness", label: "السماكة مطابقة (12mm)" },
    { key: "straightness", label: "الاستقامة سليمة" },
    { key: "defects", label: "لا توجد عيوب بصرية" },
  ];

  const finalChecks = [
    { key: "dimensions", label: "المقاسات مطابقة" },
    { key: "color", label: "اللون مطابق" },
    { key: "direction", label: "الاتجاه صحيح (يمين/يسار)" },
    { key: "lockPosition", label: "أماكن القفل والمفصلات صحيحة" },
    { key: "defects", label: "لا عيوب بصرية" },
    { key: "functional", label: "الوظيفية سليمة (فتح/إغلاق)" },
  ];

  const poChecks = [
    { key: "qtyMatch", label: "الكمية مطابقة تماماً" },
    { key: "allItems", label: "جميع البنود منفذة" },
    { key: "defects", label: "لا نقص ولا زيادة" },
  ];

  const checks =
    qcType === "incoming"
      ? incomingChecks
      : qcType === "final"
        ? finalChecks
        : poChecks;
  const allPassed = checks.every(
    c => checkItems[c.key as keyof typeof checkItems] === true
  );
  const anyFailed = checks.some(
    c => checkItems[c.key as keyof typeof checkItems] === false
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <div className="font-bold text-gray-900">
              {qcType === "incoming"
                ? "فحص المواد الداخلة (Incoming QC)"
                : qcType === "final"
                  ? "الفحص النهائي (Final QC)"
                  : "مطابقة أمر الشراء (PO Matching)"}
            </div>
            <div className="text-xs text-gray-400">فحص جديد</div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                رقم الطلب *
              </label>
              <Input
                value={orderNumber}
                onChange={e => setOrderNumber(e.target.value)}
                placeholder="ORD-2026-XXXX"
                className="text-sm h-9"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                عدد الأبواب
              </label>
              <Input
                type="number"
                min={1}
                value={totalDoors}
                onChange={e => setTotalDoors(Number(e.target.value))}
                className="text-sm h-9"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                الموزع / العميل *
              </label>
              <Input
                value={distributorName}
                onChange={e => setDistributorName(e.target.value)}
                placeholder="اسم الموزع"
                className="text-sm h-9"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                اسم المفتش
              </label>
              <Input
                value={inspector}
                onChange={e => setInspector(e.target.value)}
                placeholder="م. ..."
                className="text-sm h-9"
              />
            </div>
          </div>

          {/* Check Items */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-700 mb-2">
              قائمة الفحص
            </div>
            {checks.map(check => {
              const val = checkItems[check.key as keyof typeof checkItems];
              return (
                <div
                  key={check.key}
                  className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5"
                >
                  <span className="text-sm text-gray-700">{check.label}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setCheckItems(prev => ({ ...prev, [check.key]: true }))
                      }
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${val === true ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-green-100"}`}
                    >
                      ✓ مطابق
                    </button>
                    <button
                      onClick={() =>
                        setCheckItems(prev => ({ ...prev, [check.key]: false }))
                      }
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${val === false ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-red-100"}`}
                    >
                      ✗ غير مطابق
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Result Indicator */}
          {allPassed && (
            <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2.5 border border-green-100">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-green-700">
                جميع البنود مطابقة - نتيجة: ناجح
              </span>
            </div>
          )}
          {anyFailed && (
            <div className="flex items-center gap-2 bg-red-50 rounded-xl px-3 py-2.5 border border-red-100">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-semibold text-red-700">
                توجد بنود غير مطابقة - يلزم عزل المواد
              </span>
            </div>
          )}

          {/* Photos */}
          <button className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-gray-300 transition-colors">
            <Camera className="w-4 h-4" />
            رفع صور التوثيق
          </button>

          {/* Notes */}
          <Textarea
            placeholder="ملاحظات الفحص..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="text-sm resize-none h-20"
          />
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-2">
          <Button
            className="flex-1 gap-1.5"
            style={{
              background: allPassed
                ? "oklch(0.55 0.15 140)"
                : anyFailed
                  ? "oklch(0.55 0.15 25)"
                  : "oklch(0.38 0.06 160)",
            }}
            disabled={
              createMutation.isPending ||
              !orderNumber.trim() ||
              !distributorName.trim()
            }
            onClick={() => {
              createMutation.mutate({
                orderNumber: orderNumber.trim(),
                distributorName: distributorName.trim(),
                totalDoors,
                qcType,
                inspector: inspector.trim(),
                checkItems: checkItems as Record<string, boolean | null>,
                issues: [],
                photos: 0,
                notes: notes.trim() || undefined,
              });
            }}
          >
            <CheckCircle2 className="w-4 h-4" />
            {createMutation.isPending ? "جارٍ الحفظ..." : "حفظ نتيجة الفحص"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── الصفحة الرئيسية ─────────────────────────────────────────
export default function AdminQCInspection() {
  const [activeQCType, setActiveQCType] = useState<QCType | "all">("all");
  const [search, setSearch] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newFormType, setNewFormType] = useState<QCType>("incoming");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const {
    data: dbRows = [],
    isLoading,
    refetch,
  } = trpc.qc.list.useQuery(undefined, { refetchInterval: false });
  const seedMutation = trpc.qc.seed.useMutation({ onSuccess: () => refetch() });
  const updateResult = trpc.qc.updateResult.useMutation({
    onSuccess: () => refetch(),
  });

  const QC_ITEMS = dbRows.map(mapDbRow);

  const filtered = QC_ITEMS.filter(item => {
    if (activeQCType !== "all" && item.qcType !== activeQCType) return false;
    if (
      search &&
      !item.orderNumber.includes(search) &&
      !item.distributorName.includes(search)
    )
      return false;
    return true;
  });

  const kpis = [
    {
      label: "إجمالي الفحوصات",
      value: QC_ITEMS.length,
      color: "oklch(0.55 0.15 250)",
    },
    {
      label: "ناجح",
      value: QC_ITEMS.filter(q => q.result === "pass").length,
      color: "oklch(0.55 0.15 140)",
    },
    {
      label: "معلق",
      value: QC_ITEMS.filter(q => q.result === "pending").length,
      color: "oklch(0.55 0.15 60)",
    },
    {
      label: "فاشل / عزل",
      value: QC_ITEMS.filter(q => q.result === "fail").length,
      color: "oklch(0.55 0.15 25)",
    },
  ];

  const resultConfig = {
    pass: {
      label: "ناجح",
      color: "oklch(0.55 0.15 140)",
      bg: "oklch(0.95 0.05 140)",
    },
    fail: {
      label: "فاشل - عزل",
      color: "oklch(0.55 0.15 25)",
      bg: "oklch(0.95 0.05 25)",
    },
    pending: {
      label: "قيد الفحص",
      color: "oklch(0.55 0.15 60)",
      bg: "oklch(0.95 0.05 60)",
    },
  };

  const qcTypeConfig = {
    incoming: {
      label: "فحص المواد الداخلة",
      color: "oklch(0.55 0.15 250)",
      icon: <Package className="w-4 h-4" />,
    },
    final: {
      label: "الفحص النهائي",
      color: "oklch(0.55 0.15 140)",
      icon: <Eye className="w-4 h-4" />,
    },
    po_matching: {
      label: "مطابقة PO",
      color: "oklch(0.55 0.15 200)",
      icon: <CheckSquare className="w-4 h-4" />,
    },
  };

  return (
    <AdminLayout
      title="فحص الجودة (QC)"
      subtitle="Incoming QC · Final QC · PO Matching"
    >
      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full mr-2" />
          <span className="text-sm">جارٍ تحميل بيانات الفحص...</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && QC_ITEMS.length === 0 && (
        <div className="text-center py-16">
          <ShieldCheck className="w-14 h-14 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 mb-4 text-sm">لا توجد فحوصات بعد</p>
          <button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: "oklch(0.38 0.06 160)" }}
          >
            {seedMutation.isPending
              ? "جارٍ الإضافة..."
              : "إضافة بيانات تجريبية"}
          </button>
        </div>
      )}

      {!isLoading && QC_ITEMS.length > 0 && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {kpis.map((kpi, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-4 border border-gray-100"
              >
                <div className="text-2xl font-bold text-gray-900 mb-0.5">
                  {kpi.value}
                </div>
                <div className="text-xs text-gray-500">{kpi.label}</div>
                <div
                  className="mt-2 h-1 rounded-full"
                  style={{ background: `${kpi.color}30` }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(kpi.value / QC_ITEMS.length) * 100}%`,
                      background: kpi.color,
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex-1 min-w-48">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="بحث برقم الطلب أو الموزع..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pr-9 text-sm h-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1">
              {[
                { id: "all", label: "الكل" },
                { id: "incoming", label: "فحص المواد" },
                { id: "final", label: "فحص نهائي" },
                { id: "po_matching", label: "مطابقة PO" },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveQCType(f.id as typeof activeQCType)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeQCType === f.id ? "text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  style={
                    activeQCType === f.id
                      ? { background: "oklch(0.38 0.06 160)" }
                      : {}
                  }
                >
                  {f.label}
                </button>
              ))}
            </div>

            <Button variant="outline" size="sm" className="gap-1.5 h-9">
              <Download className="w-4 h-4" />
              تصدير
            </Button>

            <div className="flex items-center gap-1">
              {(["incoming", "final", "po_matching"] as QCType[]).map(type => (
                <Button
                  key={type}
                  size="sm"
                  className="gap-1.5 h-9 text-xs"
                  style={{ background: qcTypeConfig[type].color }}
                  onClick={() => {
                    setNewFormType(type);
                    setShowNewForm(true);
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {type === "incoming"
                    ? "فحص مواد"
                    : type === "final"
                      ? "فحص نهائي"
                      : "مطابقة PO"}
                </Button>
              ))}
            </div>
          </div>

          {/* QC Items */}
          <div className="space-y-3">
            {filtered.map(item => {
              const result = resultConfig[item.result];
              const qcType = qcTypeConfig[item.qcType];
              const isExpanded = expandedItem === item.id;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    {/* QC Type Icon */}
                    <div
                      className="p-2.5 rounded-xl flex-shrink-0"
                      style={{
                        background: `${qcType.color}15`,
                        color: qcType.color,
                      }}
                    >
                      {qcType.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-right min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-gray-900">
                          {item.orderNumber}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-lg font-medium"
                          style={{
                            background: `${qcType.color}15`,
                            color: qcType.color,
                          }}
                        >
                          {qcType.label}
                        </span>
                        {item.issues.length > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-lg bg-red-50 text-red-600 font-medium">
                            {item.issues.length} مشكلة
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.distributorName} · {item.totalDoors} باب ·{" "}
                        {item.inspector}
                      </div>
                    </div>

                    {/* Result */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span
                        className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: result.bg, color: result.color }}
                      >
                        {item.result === "pass" ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : item.result === "fail" ? (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        )}
                        {result.label}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Camera className="w-3.5 h-3.5" />
                        {item.photos}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-5 pb-5 space-y-3">
                          {/* Issues */}
                          {item.issues.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs font-semibold text-gray-500">
                                المشاكل المكتشفة
                              </div>
                              {item.issues.map((issue, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-2 bg-red-50 rounded-xl px-3 py-2.5 border border-red-100"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                                  <span className="text-xs text-red-700">
                                    {issue}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Details */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-gray-50 rounded-xl p-3">
                              <div className="text-xs text-gray-400 mb-0.5">
                                المفتش
                              </div>
                              <div className="text-sm font-semibold text-gray-800">
                                {item.inspector}
                              </div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3">
                              <div className="text-xs text-gray-400 mb-0.5">
                                تاريخ الفحص
                              </div>
                              <div className="text-sm font-semibold text-gray-800">
                                {item.inspectedAt}
                              </div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3">
                              <div className="text-xs text-gray-400 mb-0.5">
                                الصور الموثقة
                              </div>
                              <div className="text-sm font-semibold text-gray-800">
                                {item.photos} صورة
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            {item.result === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  className="flex-1 gap-1.5"
                                  style={{ background: "oklch(0.55 0.15 140)" }}
                                  disabled={updateResult.isPending}
                                  onClick={() => {
                                    updateResult.mutate({
                                      id: Number(item.id),
                                      result: "pass",
                                    });
                                    toast.success("تم اعتماد الفحص بنجاح");
                                  }}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  اعتماد الفحص
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 gap-1.5 text-red-600 border-red-200"
                                  disabled={updateResult.isPending}
                                  onClick={() => {
                                    updateResult.mutate({
                                      id: Number(item.id),
                                      result: "fail",
                                    });
                                    toast.error("تم رفض الدفعة وعزلها");
                                  }}
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  عزل الدفعة
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              عرض الصور
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                            >
                              <Download className="w-3.5 h-3.5" />
                              تقرير الفحص
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* New Inspection Form */}
      <AnimatePresence>
        {showNewForm && (
          <NewInspectionForm
            onClose={() => setShowNewForm(false)}
            onSuccess={() => refetch()}
            qcType={newFormType}
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
