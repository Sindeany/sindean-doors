/**
 * AdminOrdersDB — صفحة إدارة الطلبات المبنية على بيانات قاعدة البيانات الحقيقية
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  Package, Clock, CheckCircle2, Wrench, Truck, XCircle,
  Eye, Trash2, Phone, Mail, RefreshCw, ChevronDown,
  User, Calendar, DollarSign, FileText, Search, Receipt,
  ChevronRight, Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ── Translation Config ────────────────────────────────────────────────────────
export const KEY_TRANSLATIONS: Record<string, string> = {
  material: "نوع الباب",
  color_choice: "اللون",
  style: "التصميم",
  lock: "القفل",
  hinge: "المفصلات",
  handle: "المقبض",
  door_closer: "رداد إغلاق",
  door_stopper: "مصد الباب",
  smoke_seal: "مانع الدخان",
  delivery_method: "طريقة الاستلام",
  install_choice: "التركيب",
  measurement: "رفع المقاسات",
  sales_consultant: "استشاري المبيعات",
  special_notes: "ملاحظات خاصة",
  door_leaf_height: "طول الدرفة",
  opening_height: "طول الفتحة الإنشائية",
  width: "العرض",
  wall_thickness: "سمك الجدار",
  frame_width: "عرض البرواز",
  frame_height: "طول البرواز",
  molding_side: "جهة التكسية",
  style_molding_side: "جهة التكسية",
  side_width: "عرض التكسية الجانبية",
  style_side_width: "عرض التكسية الجانبية",
  special_file: "ملف التصميم الخاص",
  style_special_file: "ملف التصميم الخاص",
};

export const VALUE_TRANSLATIONS: Record<string, string> = {
  // Door types / styles
  flat: "فلات (مسطح)",
  top_molding: "مع تكسيات (فوق الباب)",
  hidden: "باب مخفي",
  side_molding: "تكسيات جانبية",
  cnc: "مع حفر CNC",
  sliding: "باب سحاب",
  special: "طلبات خاصة",
  
  // Colors
  white: "أبيض",
  beige: "بيج",
  light_oak: "بلوط فاتح",
  dark_walnut: "جوز داكن",
  charcoal: "فحمي",
  grey: "رمادي",
  mahogany: "ماهوجني",
  black: "أسود",
  custom: "لون مخصص",

  // Sub-options / other values
  one_side: "جانب واحد",
  two_sides: "جانبين",
  true: "نعم",
  false: "لا",
};

export const translateValue = (val: unknown): string => {
  if (val === undefined || val === null || val === "") return "—";
  const str = String(val);
  return str
    .split(",")
    .map(v => VALUE_TRANSLATIONS[v.trim()] || v.trim())
    .join("، ");
};

// ── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  new:           { label: "طلب جديد",       color: "text-blue-700",  bg: "bg-blue-50 border-blue-200",   icon: <Package className="w-3.5 h-3.5" /> },
  reviewing:     { label: "قيد المراجعة",   color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", icon: <Clock className="w-3.5 h-3.5" /> },
  confirmed:     { label: "مؤكد",           color: "text-green-700",  bg: "bg-green-50 border-green-200",  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  in_production: { label: "في الإنتاج",     color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: <Wrench className="w-3.5 h-3.5" /> },
  ready:         { label: "جاهز للتسليم",   color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  delivered:     { label: "تم التسليم",     color: "text-gray-700",   bg: "bg-gray-50 border-gray-200",   icon: <Truck className="w-3.5 h-3.5" /> },
  cancelled:     { label: "ملغي",           color: "text-red-700",    bg: "bg-red-50 border-red-200",     icon: <XCircle className="w-3.5 h-3.5" /> },
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  new:           ["reviewing", "cancelled"],
  reviewing:     ["confirmed", "cancelled"],
  confirmed:     ["in_production", "cancelled"],
  in_production: ["ready"],
  ready:         ["delivered"],
  delivered:     [],
  cancelled:     [],
};

// ── Types ────────────────────────────────────────────────────────────────────
type Order = {
  id: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  productId: string;
  productName: string;
  selections: unknown;
  subSelections: unknown;
  dimensions: unknown;
  basePrice: number;
  totalPrice: number;
  status: string;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
};

// ── Create Invoice From Order Modal ─────────────────────────────────────────
function CreateInvoiceFromOrderModal({
  order,
  onClose,
  onCreated,
}: {
  order: Order;
  onClose: () => void;
  onCreated: (invoiceId: number, invoiceNumber: string) => void;
}) {
  const [, navigate] = useLocation();

  // حساب السعر قبل الضريبة (15%)
  const priceWithVat = order.totalPrice;
  const subtotalBeforeVat = parseFloat((priceWithVat / 1.15).toFixed(2));
  const vatAmount = parseFloat((priceWithVat - subtotalBeforeVat).toFixed(2));

  // بناء وصف البند من بيانات الطلب
  const dims = (typeof order.dimensions === "string"
    ? JSON.parse(order.dimensions || "{}")
    : order.dimensions) as Record<string, number> | null;
  const sels = (typeof order.selections === "string"
    ? JSON.parse(order.selections || "{}")
    : order.selections) as Record<string, string> | null;
  const dimsText = dims && Object.keys(dims).length > 0
    ? " - " + Object.entries(dims).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}سم`).join(", ")
    : "";
  const selsText = sels && Object.keys(sels).length > 0
    ? " - " + Object.entries(sels).filter(([_, v]) => Boolean(v)).map(([k, v]) => `${KEY_TRANSLATIONS[k] || k}: ${translateValue(v)}`).join(", ")
    : "";
  const description = `${order.productName}${dimsText}${selsText}`;

  const [buyerName, setBuyerName] = useState(order.customerName);
  const [buyerPhone, setBuyerPhone] = useState(order.customerPhone);
  const [buyerEmail, setBuyerEmail] = useState(order.customerEmail ?? "");
  const [invoiceType, setInvoiceType] = useState<"standard" | "simplified">("simplified");
  const [notes, setNotes] = useState(`مرجع الطلب #${order.id}`);

  const createInvoice = trpc.zatca.create.useMutation();

  const handleCreate = async () => {
    if (!buyerName.trim()) {
      toast.error("اسم المشتري مطلوب");
      return;
    }
    try {
      const result = await createInvoice.mutateAsync({
        invoiceType,
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim() || undefined,
        buyerEmail: buyerEmail.trim() || undefined,
        lineItems: [{
          description: description.slice(0, 200),
          descriptionEn: order.productName,
          quantity: 1,
          unitPrice: subtotalBeforeVat,
          vatRate: 15,
        }],
        sourceType: "door_order",
        sourceId: order.id,
        notes: notes.trim() || undefined,
      });
      toast.success(`تم إنشاء الفاتورة ${result.invoiceNumber} بنجاح`);
      onCreated(result.invoiceId, result.invoiceNumber);
    } catch (e: any) {
      toast.error(e?.message ?? "فشل إنشاء الفاتورة");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.68 0.10 60 / 0.15)" }}>
              <Receipt className="w-5 h-5" style={{ color: "oklch(0.55 0.10 60)" }} />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">إنشاء فاتورة ضريبية</h2>
              <p className="text-xs text-gray-400">طلب #{order.id} • {order.productName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-600 text-lg">×</button>
        </div>

        <div className="p-6 space-y-4">
          {/* معاينة البند */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">بند الفاتورة</p>
            <p className="text-sm font-medium text-gray-700 leading-relaxed">{description.slice(0, 120)}{description.length > 120 ? "..." : ""}</p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div className="bg-white rounded-lg p-2 border border-gray-100">
                <p className="text-xs text-gray-400">قبل الضريبة</p>
                <p className="font-bold text-gray-800 text-sm">{subtotalBeforeVat.toLocaleString()} ر.س</p>
              </div>
              <div className="bg-white rounded-lg p-2 border border-gray-100">
                <p className="text-xs text-gray-400">ضريبة 15%</p>
                <p className="font-bold text-amber-600 text-sm">{vatAmount.toLocaleString()} ر.س</p>
              </div>
              <div className="bg-white rounded-lg p-2 border" style={{ borderColor: "oklch(0.68 0.10 60 / 0.3)" }}>
                <p className="text-xs text-gray-400">الإجمالي</p>
                <p className="font-black text-sm" style={{ color: "oklch(0.45 0.10 60)" }}>{priceWithVat.toLocaleString()} ر.س</p>
              </div>
            </div>
          </div>

          {/* بيانات المشتري */}
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-gray-600">اسم المشتري *</span>
              <input
                type="text"
                value={buyerName}
                onChange={e => setBuyerName(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oak"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">الجوال</span>
                <input
                  type="text"
                  value={buyerPhone}
                  onChange={e => setBuyerPhone(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oak"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">البريد الإلكتروني</span>
                <input
                  type="email"
                  value={buyerEmail}
                  onChange={e => setBuyerEmail(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oak"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">نوع الفاتورة</span>
                <select
                  value={invoiceType}
                  onChange={e => setInvoiceType(e.target.value as any)}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oak bg-white"
                >
                  <option value="simplified">مبسطة (B2C)</option>
                  <option value="standard">قياسية (B2B)</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">ملاحظات</span>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oak"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleCreate}
            disabled={createInvoice.isPending}
            className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "oklch(0.45 0.10 60)" }}
          >
            {createInvoice.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإنشاء...</>
            ) : (
              <><Receipt className="w-4 h-4" /> إنشاء الفاتورة‏</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Order Detail Modal ───────────────────────────────────────────────────────
function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.new;
  const updateStatus = trpc.orders.updateStatus.useMutation();
  const utils = trpc.useUtils();
  const transitions = STATUS_TRANSITIONS[order.status] ?? [];
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [, navigate] = useLocation();

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ id: order.id, status: newStatus as any });
      await utils.orders.list.invalidate();
      toast.success(`تم تحديث حالة الطلب إلى "${STATUS_CONFIG[newStatus]?.label}"`);
      onClose();
    } catch {
      toast.error("فشل تحديث الحالة");
    }
  };

  const dims = (typeof order.dimensions === "string"
    ? JSON.parse(order.dimensions || "{}")
    : order.dimensions) as Record<string, number> | null;
  const sels = (typeof order.selections === "string"
    ? JSON.parse(order.selections || "{}")
    : order.selections) as Record<string, string> | null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">طلب #{order.id}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{new Date(order.createdAt).toLocaleString("ar-SA")}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color}`}>
              {cfg.icon} {cfg.label}
            </span>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-600 text-lg">×</button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Customer Info */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-oak" /> بيانات العميل
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-400 text-xs">الاسم</p>
                <p className="font-medium text-gray-800">{order.customerName}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">الجوال</p>
                <a href={`tel:${order.customerPhone}`} className="font-medium text-oak hover:underline flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {order.customerPhone}
                </a>
              </div>
              {order.customerEmail && (
                <div className="col-span-2">
                  <p className="text-gray-400 text-xs">البريد الإلكتروني</p>
                  <a href={`mailto:${order.customerEmail}`} className="font-medium text-oak hover:underline flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {order.customerEmail}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Product & Price */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-copper" /> المنتج والسعر
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-400 text-xs">المنتج</p>
                <p className="font-medium text-gray-800">{order.productName}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">السعر الإجمالي</p>
                <p className="font-bold text-oak text-lg">{order.totalPrice.toLocaleString()} ر.س</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">السعر الأساسي</p>
                <p className="font-medium text-gray-600">{order.basePrice.toLocaleString()} ر.س</p>
              </div>
            </div>
          </div>

          {/* Dimensions */}
          {dims && Object.keys(dims).length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
                📐 المقاسات
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(dims).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-gray-400 text-xs">{k.replace(/_/g, " ")}</p>
                    <p className="font-medium text-gray-800">{String(v)} سم</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selections */}
          {sels && Object.keys(sels).length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
                🎛️ الخيارات المحددة
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(sels).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-gray-400 text-xs">{KEY_TRANSLATIONS[k] || k.replace(/_/g, " ")}</p>
                    <p className="font-medium text-gray-800">{translateValue(v)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="font-semibold text-amber-700 text-sm mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" /> ملاحظات العميل
              </h3>
              <p className="text-gray-700 text-sm">{order.notes}</p>
            </div>
          )}

          {/* Status Actions */}
          {transitions.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-500 mb-3">تحديث حالة الطلب:</p>
              <div className="flex flex-wrap gap-2">
                {transitions.map((s) => {
                  const c = STATUS_CONFIG[s];
                  return (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      disabled={updateStatus.isPending}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-all hover:opacity-80 disabled:opacity-50 ${c.bg} ${c.color}`}
                    >
                      {c.icon} {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Invoice Action */}
          <div className="border-t border-gray-100 pt-4">
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: "oklch(0.45 0.10 60)" }}
            >
              <Receipt className="w-4 h-4" />
              إنشاء فاتورة ضريبية ZATCA
              <ChevronRight className="w-4 h-4 opacity-60" />
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Creation Modal */}
      {showInvoiceModal && (
        <CreateInvoiceFromOrderModal
          order={order}
          onClose={() => setShowInvoiceModal(false)}
          onCreated={(invoiceId, invoiceNumber) => {
            setShowInvoiceModal(false);
            onClose();
            // الانتقال لصفحة الفواتير بعد الإنشاء
            navigate("/admin/zatca-invoices");
          }}
        />
      )}
    </div>
  );
}

// ── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order, onView, onDelete }: { order: Order; onView: () => void; onDelete: () => void }) {
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.new;
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-gray-800 text-sm">#{order.id}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color}`}>
              {cfg.icon} {cfg.label}
            </span>
          </div>
          <p className="font-semibold text-gray-700 text-sm truncate">{order.customerName}</p>
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <Phone className="w-3 h-3" /> {order.customerPhone}
          </p>
          <p className="text-xs text-gray-500 mt-1 truncate">{order.productName}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-black text-oak text-base">{order.totalPrice.toLocaleString()}</p>
          <p className="text-xs text-gray-400">ر.س</p>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 justify-end">
            <Calendar className="w-3 h-3" />
            {new Date(order.createdAt).toLocaleDateString("ar-SA")}
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
        <button
          onClick={onView}
          className="flex-1 py-1.5 text-xs font-semibold text-oak border border-oak/30 rounded-lg hover:bg-oak/5 transition-colors flex items-center justify-center gap-1"
        >
          <Eye className="w-3 h-3" /> عرض التفاصيل
        </button>
        <button
          onClick={onDelete}
          className="py-1.5 px-3 text-xs font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AdminOrdersDB() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: orders = [], isLoading, refetch } = trpc.orders.list.useQuery(
    filterStatus !== "all" ? { status: filterStatus as any } : undefined
  );

  const deleteOrder = trpc.orders.delete.useMutation();
  const utils = trpc.useUtils();

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return;
    try {
      await deleteOrder.mutateAsync({ id });
      await utils.orders.list.invalidate();
      toast.success("تم حذف الطلب");
    } catch {
      toast.error("فشل حذف الطلب");
    }
  };

  const filtered = orders.filter((o) => {
    if (!search) return true;
    return (
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.customerPhone.includes(search) ||
      o.productName.toLowerCase().includes(search.toLowerCase()) ||
      String(o.id).includes(search)
    );
  });

  // Stats
  const stats = {
    total: orders.length,
    new: orders.filter((o) => o.status === "new").length,
    in_production: orders.filter((o) => o.status === "in_production").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    totalRevenue: orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.totalPrice, 0),
  };

  return (
    <AdminLayout title="إدارة الطلبات" subtitle="جميع طلبات الأبواب من العملاء">
      <div className="p-6 space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-800">إدارة الطلبات</h1>
            <p className="text-gray-500 text-sm mt-1">جميع طلبات الأبواب من العملاء</p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-oak text-white rounded-xl text-sm font-semibold hover:bg-oak/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> تحديث
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "إجمالي الطلبات", value: stats.total, color: "text-gray-800", bg: "bg-gray-50" },
            { label: "طلبات جديدة", value: stats.new, color: "text-blue-700", bg: "bg-blue-50" },
            { label: "في الإنتاج", value: stats.in_production, color: "text-purple-700", bg: "bg-purple-50" },
            { label: "إجمالي الإيرادات", value: `${stats.totalRevenue.toLocaleString()} ر.س`, color: "text-oak", bg: "bg-amber-50" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="بحث بالاسم أو الجوال أو رقم الطلب..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-xl pr-9 pl-4 py-2 text-sm outline-none focus:ring-2 focus:ring-oak/30"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-oak/30 bg-white"
          >
            <option value="all">جميع الحالات</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Orders Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-gray-100 rounded-xl h-40 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 text-lg font-semibold">
              {orders.length === 0 ? "لا توجد طلبات بعد" : "لا توجد نتائج مطابقة"}
            </p>
            <p className="text-gray-300 text-sm mt-1">
              {orders.length === 0 ? "ستظهر الطلبات هنا عند إرسالها من الموقع" : "جرب تغيير معايير البحث"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((order) => (
              <OrderCard
                key={order.id}
                order={order as Order}
                onView={() => setSelectedOrder(order as Order)}
                onDelete={() => handleDelete(order.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </AdminLayout>
  );
}
