// ============================================================
// AdminPackingDelivery - نظام التغليف والتسليم
// Packing + Delivery Docs + Delivery + Accounting Close
// ============================================================
import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import {
  Box,
  FileStack,
  Truck,
  DollarSign,
  Search,
  Download,
  Camera,
  Upload,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// ─── أنواع البيانات ───────────────────────────────────────────
type StageStatus = "pending" | "in_progress" | "done";

interface PackingOrder {
  id: string;
  orderNumber: string;
  distributorName: string;
  totalDoors: number;
  packingType: string;
  packingMethod: string;
  packingStatus: StageStatus;
  deliveryDate: string;
  deliveryStatus: StageStatus;
  accountingStatus: StageStatus;
  totalValue: number;
  paidAmount: number;
  doors: { code: string; dir: string; room: string; packed: boolean }[];
  documents: {
    packingList: boolean;
    invoice: boolean;
    photos: number;
    certificate: boolean;
  };
}

// ─── تحويل صف DB إلى PackingOrder ────────────────────────────
function mapDbRow(row: any): PackingOrder {
  return {
    id: String(row.id),
    orderNumber: row.orderNumber,
    distributorName: row.distributorName,
    totalDoors: row.totalDoors,
    packingType: row.packingType,
    packingMethod: row.packingMethod,
    packingStatus: row.packingStatus as StageStatus,
    deliveryDate: row.deliveryDate,
    deliveryStatus: row.deliveryStatus as StageStatus,
    accountingStatus: row.accountingStatus as StageStatus,
    totalValue: row.totalValue,
    paidAmount: row.paidAmount,
    doors: Array.isArray(row.doors) ? row.doors : [],
    documents: row.documents ?? {
      packingList: false,
      invoice: false,
      photos: 0,
      certificate: false,
    },
  };
}

const STATUS_CONFIG: Record<
  StageStatus,
  { label: string; color: string; bg: string }
> = {
  pending: { label: "معلق", color: "#9CA3AF", bg: "#F3F4F6" },
  in_progress: {
    label: "جارٍ",
    color: "oklch(0.55 0.15 250)",
    bg: "oklch(0.95 0.05 250)",
  },
  done: {
    label: "مكتمل",
    color: "oklch(0.55 0.15 140)",
    bg: "oklch(0.95 0.05 140)",
  },
};

// ─── مكوّن بطاقة الطلب ───────────────────────────────────────
function PackingCard({
  order,
  onCompletePackaging,
  onConfirmDelivery,
  onCloseAccounting,
}: {
  order: PackingOrder;
  onCompletePackaging: () => void;
  onConfirmDelivery: () => void;
  onCloseAccounting: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "packing" | "docs" | "delivery" | "accounting"
  >("packing");

  const packingCfg = STATUS_CONFIG[order.packingStatus];
  const deliveryCfg = STATUS_CONFIG[order.deliveryStatus];
  const accountingCfg = STATUS_CONFIG[order.accountingStatus];

  const overallProgress = [
    order.packingStatus === "done",
    order.documents.packingList && order.documents.invoice,
    order.deliveryStatus === "done",
    order.accountingStatus === "done",
  ].filter(Boolean).length;

  return (
    <motion.div
      layout
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
    >
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 text-right min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-gray-900">{order.orderNumber}</span>
            <span className="text-xs px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600">
              {order.packingType}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600">
              {order.packingMethod}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {order.distributorName} · {order.totalDoors} باب
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {[
            {
              icon: <Box className="w-3.5 h-3.5" />,
              cfg: packingCfg,
              label: "تغليف",
            },
            {
              icon: <FileStack className="w-3.5 h-3.5" />,
              cfg: order.documents.packingList
                ? STATUS_CONFIG.done
                : STATUS_CONFIG.pending,
              label: "مستندات",
            },
            {
              icon: <Truck className="w-3.5 h-3.5" />,
              cfg: deliveryCfg,
              label: "تسليم",
            },
            {
              icon: <DollarSign className="w-3.5 h-3.5" />,
              cfg: accountingCfg,
              label: "محاسبة",
            },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className="p-1.5 rounded-lg"
                style={{ background: s.cfg.bg, color: s.cfg.color }}
              >
                {s.icon}
              </div>
              <span className="text-xs text-gray-400">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-center">
            <div className="text-sm font-bold text-gray-900">
              {overallProgress}/4
            </div>
            <div className="text-xs text-gray-400">مراحل</div>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-5">
              {/* Section Tabs */}
              <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 mb-4">
                {[
                  {
                    id: "packing",
                    label: "التغليف",
                    icon: <Box className="w-3.5 h-3.5" />,
                  },
                  {
                    id: "docs",
                    label: "المستندات",
                    icon: <FileStack className="w-3.5 h-3.5" />,
                  },
                  {
                    id: "delivery",
                    label: "التسليم",
                    icon: <Truck className="w-3.5 h-3.5" />,
                  },
                  {
                    id: "accounting",
                    label: "المحاسبة",
                    icon: <DollarSign className="w-3.5 h-3.5" />,
                  },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() =>
                      setActiveSection(tab.id as typeof activeSection)
                    }
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${activeSection === tab.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* ─── التغليف ─── */}
              {activeSection === "packing" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-400 mb-0.5">
                        نوع التغليف
                      </div>
                      <div className="font-bold text-gray-900">
                        {order.packingType}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-400 mb-0.5">
                        طريقة التغليف
                      </div>
                      <div className="font-bold text-gray-900">
                        {order.packingMethod}
                      </div>
                    </div>
                  </div>
                  {order.doors.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-gray-500">
                        بيانات الأبواب
                      </div>
                      {order.doors.map(d => (
                        <div
                          key={d.code}
                          className={`flex items-center justify-between rounded-xl px-3 py-2.5 border ${d.packed ? "bg-green-50 border-green-100" : "bg-gray-50 border-gray-100"}`}
                        >
                          <div>
                            <div className="text-sm font-bold text-gray-800">
                              {d.code}
                            </div>
                            <div className="text-xs text-gray-400">
                              {d.room}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {d.dir}
                            </span>
                            {d.packed ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <button
                                className="text-xs px-2 py-1 rounded-lg bg-blue-100 text-blue-700 font-medium"
                                onClick={() =>
                                  toast.success(`تم تغليف ${d.code}`)
                                }
                              >
                                تغليف
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {order.packingStatus !== "done" && (
                    <Button
                      size="sm"
                      className="w-full gap-1.5"
                      style={{ background: "oklch(0.55 0.15 140)" }}
                      onClick={() => {
                        onCompletePackaging();
                        toast.success("تم إتمام التغليف");
                      }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      تأكيد إتمام التغليف
                    </Button>
                  )}
                </div>
              )}

              {/* ─── المستندات ─── */}
              {activeSection === "docs" && (
                <div className="space-y-2">
                  {[
                    {
                      name: "Packing List",
                      ready: order.documents.packingList,
                    },
                    {
                      name: "Invoice (فاتورة)",
                      ready: order.documents.invoice,
                    },
                    {
                      name: `صور المنتج (${order.documents.photos} صورة)`,
                      ready: order.documents.photos > 0,
                    },
                    { name: "شهادة الفحص", ready: order.documents.certificate },
                  ].map(doc => (
                    <div
                      key={doc.name}
                      className={`flex items-center justify-between rounded-xl px-3 py-2.5 border ${doc.ready ? "bg-green-50 border-green-100" : "bg-gray-50 border-gray-100"}`}
                    >
                      <div className="flex items-center gap-2">
                        <FileStack className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">
                          {doc.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.ready ? (
                          <>
                            <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                              جاهز
                            </span>
                            <button className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                              <Download className="w-3 h-3" /> تنزيل
                            </button>
                          </>
                        ) : (
                          <button className="text-xs px-2 py-1 rounded-lg bg-amber-100 text-amber-700 font-medium">
                            إنشاء
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-gray-300 transition-colors">
                    <Upload className="w-4 h-4" />
                    رفع مستند إضافي
                  </button>
                </div>
              )}

              {/* ─── التسليم ─── */}
              {activeSection === "delivery" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-400 mb-0.5">
                        موعد التسليم
                      </div>
                      <div className="font-bold text-gray-900">
                        {order.deliveryDate}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-400 mb-0.5">
                        حالة التسليم
                      </div>
                      <div
                        className="font-bold"
                        style={{ color: deliveryCfg.color }}
                      >
                        {deliveryCfg.label}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <button className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-gray-300 transition-colors">
                      <Camera className="w-4 h-4" />
                      رفع صور التحميل
                    </button>
                    <button className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-gray-300 transition-colors">
                      <Upload className="w-4 h-4" />
                      رفع توقيع الاستلام
                    </button>
                  </div>
                  {order.deliveryStatus !== "done" && (
                    <Button
                      size="sm"
                      className="w-full gap-1.5"
                      style={{ background: "oklch(0.55 0.15 330)" }}
                      onClick={() => {
                        onConfirmDelivery();
                        toast.success("تم تأكيد التسليم");
                      }}
                    >
                      <Truck className="w-3.5 h-3.5" />
                      تأكيد التسليم
                    </Button>
                  )}
                </div>
              )}

              {/* ─── المحاسبة ─── */}
              {activeSection === "accounting" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-400 mb-1">
                        إجمالي الفاتورة
                      </div>
                      <div className="text-xl font-bold text-gray-900">
                        {order.totalValue.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400">ر.س</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-400 mb-1">
                        المبلغ المحصّل
                      </div>
                      <div className="text-xl font-bold text-green-600">
                        {order.paidAmount.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400">ر.س</div>
                    </div>
                  </div>
                  {order.paidAmount < order.totalValue && (
                    <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                      <div className="text-xs font-semibold text-amber-700 mb-1">
                        الدفعة المتبقية
                      </div>
                      <div className="text-lg font-bold text-amber-800">
                        {(order.totalValue - order.paidAmount).toLocaleString()}{" "}
                        ر.س
                      </div>
                    </div>
                  )}
                  {order.paidAmount >= order.totalValue ? (
                    <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2.5 border border-green-100">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-700">
                        تم السداد الكامل - الطلب مقفل
                      </span>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full gap-1.5"
                      style={{ background: "oklch(0.55 0.15 140)" }}
                      onClick={() => {
                        onCloseAccounting();
                        toast.success("تم تسجيل الدفعة وإقفال الطلب");
                      }}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      تسجيل استلام الدفعة وإقفال الطلب
                    </Button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── الصفحة الرئيسية ─────────────────────────────────────────
export default function AdminPackingDelivery() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const {
    data: dbRows = [],
    isLoading,
    refetch,
  } = trpc.packing.list.useQuery();
  const seedMutation = trpc.packing.seed.useMutation({
    onSuccess: () => refetch(),
  });
  const updateStage = trpc.packing.updateStage.useMutation({
    onSuccess: () => refetch(),
  });
  const closeAccounting = trpc.packing.closeAccounting.useMutation({
    onSuccess: () => refetch(),
  });

  const PACKING_ORDERS = dbRows.map(mapDbRow);

  const filtered = PACKING_ORDERS.filter(o => {
    if (
      search &&
      !o.orderNumber.includes(search) &&
      !o.distributorName.includes(search)
    )
      return false;
    if (activeFilter === "packing" && o.packingStatus === "done") return false;
    if (activeFilter === "delivery" && o.deliveryStatus !== "in_progress")
      return false;
    if (activeFilter === "accounting" && o.accountingStatus !== "in_progress")
      return false;
    return true;
  });

  const kpis = [
    {
      label: "قيد التغليف",
      value: PACKING_ORDERS.filter(o => o.packingStatus === "in_progress")
        .length,
      color: "oklch(0.55 0.15 50)",
    },
    {
      label: "جاهز للشحن",
      value: PACKING_ORDERS.filter(
        o => o.packingStatus === "done" && o.deliveryStatus === "pending"
      ).length,
      color: "oklch(0.55 0.15 140)",
    },
    {
      label: "قيد التسليم",
      value: PACKING_ORDERS.filter(o => o.deliveryStatus === "in_progress")
        .length,
      color: "oklch(0.55 0.15 330)",
    },
    {
      label: "انتظار الدفعة",
      value: PACKING_ORDERS.filter(o => o.accountingStatus === "in_progress")
        .length,
      color: "oklch(0.55 0.15 25)",
    },
  ];

  return (
    <AdminLayout
      title="التغليف والتسليم"
      subtitle="Packing · Delivery Docs · Delivery · Accounting Close"
    >
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
            { id: "packing", label: "التغليف" },
            { id: "delivery", label: "التسليم" },
            { id: "accounting", label: "المحاسبة" },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeFilter === f.id ? "text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              style={
                activeFilter === f.id
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
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
          جاري التحميل...
        </div>
      )}

      {/* Empty state */}
      {!isLoading && PACKING_ORDERS.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-gray-400 text-sm">لا توجد طلبات تغليف حتى الآن</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
          >
            {seedMutation.isPending
              ? "جاري الإضافة..."
              : "إضافة بيانات تجريبية"}
          </Button>
        </div>
      )}

      {/* Orders */}
      {!isLoading && PACKING_ORDERS.length > 0 && (
        <div className="space-y-3">
          {filtered.map(order => (
            <PackingCard
              key={order.id}
              order={order}
              onCompletePackaging={() =>
                updateStage.mutate({
                  id: Number(order.id),
                  stage: "packing",
                  status: "done",
                })
              }
              onConfirmDelivery={() =>
                updateStage.mutate({
                  id: Number(order.id),
                  stage: "delivery",
                  status: "done",
                })
              }
              onCloseAccounting={() =>
                closeAccounting.mutate({ id: Number(order.id) })
              }
            />
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
