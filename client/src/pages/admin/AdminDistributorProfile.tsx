// ============================================================
// AdminDistributorProfile - ملف الموزع الكامل
// معلومات الموزع + الطلبات + الشكاوى + سجل المدفوعات
// ============================================================
import { useState } from "react";
import { useParams } from "wouter";
import {
  ArrowRight, Phone, Mail, MapPin, Building2, Hash, Globe,
  CreditCard, FileText, Star, TrendingUp, ShoppingBag, AlertCircle,
  CheckCircle2, Clock, Ban, XCircle, Crown, Award, Zap,
  ChevronDown, ChevronUp, Download, MessageSquare, Edit2,
  Package, Truck, CheckCheck, RotateCcw, DollarSign, Calendar,
  BarChart2, Activity, Lock, Filter, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import * as XLSX from "xlsx";
import { trpc } from "@/lib/trpc";
import { DistributorFormModal, type Distributor } from "./AdminDistributors";

// ─── Types ────────────────────────────────────────────────────
type OrderStatus = "pending" | "approved" | "production" | "ready" | "shipped" | "delivered" | "cancelled";
type ComplaintStatus = "open" | "under_review" | "resolved" | "rejected";
type PaymentStatus = "paid" | "pending" | "overdue" | "partial";

interface Order {
  id: string; date: string; status: OrderStatus;
  items: number; total: number; paid: number;
  paymentStatus: PaymentStatus; trackingNumber?: string;
  products: string; dbId?: number;
  rawItems?: any[]; // raw order line items from server
}

interface Complaint {
  id: string; date: string; status: ComplaintStatus;
  type: string; orderId: string; description: string;
  rating?: number; resolvedDate?: string;
}

interface Payment {
  id: string; date: string; amount: number;
  method: string; reference: string;
  status: PaymentStatus; orderId?: string; note?: string;
}

// ─── Data Mappers ──────────────────────────────────────
function mapStatus(s: string): OrderStatus {
  if (s === "confirmed") return "approved";
  if (s === "manufacturing") return "production";
  if (s === "draft") return "pending";
  return s as OrderStatus;
}

function mapOrderFromDB(o: any, paidByOrder?: Record<string, number>): Order { // o is raw order from trpc
  const items = o.items ?? [];
  return {
    id: o.orderNumber,
    dbId: o.id,
    date: new Date(o.createdAt).toISOString().split("T")[0],
    rawItems: items,
    status: mapStatus(o.status),
    items: items.length,
    products: items.map((it: any) => `${it.doorType} × ${it.quantity}`).join("، "),
    total: o.totalAmount,
    paymentStatus: o.paymentStatus as PaymentStatus,
    paid: paidByOrder?.[o.orderNumber] ?? (o.paymentStatus === "paid" ? o.totalAmount : 0),
    trackingNumber: undefined,
  };
}
// طرق الدفع: enum محدد في الخادم
const PAYMENT_METHOD_AR: Record<string, string> = {
  cash: "نقداً",
  bank_transfer: "تحويل بنكي",
  cheque: "شيك",
  card: "بطاقة",
  other: "أخرى",
};

// حالة دفع الخادم: enum مدفوع، في انتظار، إلغاء
function mapPaymentStatus(s: string): PaymentStatus {
  if (s === "confirmed") return "paid";
  if (s === "cancelled") return "overdue";
  return "pending";
}

// mapper: صف الخادم → شكل Payment للواجهة
function mapPaymentFromDB(p: any): Payment { // p is raw server row
  return {
    id: `PAY-${String(p.id).padStart(3, "0")}`,
    date: p.paymentDate ? new Date(p.paymentDate).toISOString().slice(0, 10) : "—",
    amount: p.amount ?? 0,
    method: PAYMENT_METHOD_AR[p.method] ?? p.method ?? "—",
    reference: p.reference ?? "—",
    status: mapPaymentStatus(p.status),
    orderId: p.orderNumber ?? undefined,
    note: p.note ?? undefined,
  };
}

// ─── Config ───────────────────────────────────────────────────
const ORDER_STATUS: Record<OrderStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:    { label: "بانتظار الموافقة", color: "#F59E0B", bg: "#FFFBEB", icon: <Clock className="w-3.5 h-3.5" /> },
  approved:   { label: "موافق عليه",       color: "#3B82F6", bg: "#EFF6FF", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  production: { label: "قيد الإنتاج",      color: "#8B5CF6", bg: "#F5F3FF", icon: <Activity className="w-3.5 h-3.5" /> },
  ready:      { label: "جاهز للشحن",       color: "#06B6D4", bg: "#ECFEFF", icon: <Package className="w-3.5 h-3.5" /> },
  shipped:    { label: "تم الشحن",         color: "#F97316", bg: "#FFF7ED", icon: <Truck className="w-3.5 h-3.5" /> },
  delivered:  { label: "تم التسليم",       color: "#10B981", bg: "#ECFDF5", icon: <CheckCheck className="w-3.5 h-3.5" /> },
  cancelled:  { label: "ملغي",             color: "#6B7280", bg: "#F3F4F6", icon: <XCircle className="w-3.5 h-3.5" /> },
};

const COMPLAINT_STATUS: Record<ComplaintStatus, { label: string; color: string; bg: string }> = {
  open:      { label: "مفتوحة",        color: "#EF4444", bg: "#FEF2F2" },
  under_review: { label: "قيد المراجعة",  color: "#F59E0B", bg: "#FFFBEB" },
  resolved:  { label: "تم الحل",       color: "#10B981", bg: "#ECFDF5" },
  rejected:  { label: "مرفوضة",        color: "#6B7280", bg: "#F3F4F6" },
};

const PAYMENT_STATUS: Record<PaymentStatus, { label: string; color: string; bg: string }> = {
  paid:    { label: "مدفوع",          color: "#10B981", bg: "#ECFDF5" },
  pending: { label: "بانتظار الدفع",  color: "#F59E0B", bg: "#FFFBEB" },
  overdue: { label: "متأخر",          color: "#EF4444", bg: "#FEF2F2" },
  partial: { label: "دفع جزئي",       color: "#3B82F6", bg: "#EFF6FF" },
};

const DEFAULT_ORDER_STATUS = { label: "غير معروف", color: "#6B7280", bg: "#F3F4F6", icon: null };
const DEFAULT_PAYMENT_STATUS = { label: "غير معروف", color: "#6B7280", bg: "#F3F4F6" };

const TIER_CFG = {
  bronze:   { label: "برونزي",  color: "#92400E", bg: "#FEF3C7", icon: <Award className="w-3.5 h-3.5" /> },
  silver:   { label: "فضي",     color: "#6B7280", bg: "#F3F4F6", icon: <Star className="w-3.5 h-3.5" /> },
  gold:     { label: "ذهبي",    color: "#D97706", bg: "#FFFBEB", icon: <Crown className="w-3.5 h-3.5" /> },
  platinum: { label: "بلاتيني", color: "#7C3AED", bg: "#F5F3FF", icon: <Zap className="w-3.5 h-3.5" /> },
};

// ─── Sub-components ───────────────────────────────────────────

function StatCard({ icon, label, value, sub, color, bg }: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; color: string; bg: string;
}) {
  return (
    <div className="rounded-xl p-4 border border-gray-100" style={{ background: bg }}>
      <div className="flex items-center gap-2 mb-2" style={{ color }}>
        {icon}<span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color, fontFamily: "DM Serif Display, serif" }}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color, opacity: 0.7 }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, count, onExport }: { title: string; count?: number; onExport?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <h3 className="font-bold text-gray-800" style={{ fontFamily: "DM Serif Display, serif" }}>{title}</h3>
        {count !== undefined && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">{count}</span>
        )}
      </div>
      {onExport && (
        <Button variant="outline" className="gap-1.5 text-xs h-8" onClick={onExport}>
          <Download className="w-3.5 h-3.5" /> تصدير
        </Button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function AdminDistributorProfile() {
  const params = useParams<{ id: string }>();
  const id = params.id || "";

  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "complaints" | "payments">("overview");
  const [orderFilter, setOrderFilter] = useState<OrderStatus | "all">("all");
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "all">("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const { data: rawOrders, isLoading, isError } = trpc.distributorOrders.list.useQuery(
    { distributorId: String(id) },
    { retry: false }
  );

  const utils = trpc.useUtils();
  const updateStatusMutation = trpc.distributorOrders.updateStatus.useMutation({
    onSuccess: () => { utils.distributorOrders.list.invalidate(); },
  });

  const distId = Number(id);
  const { data: dist, isLoading: distLoading, isError: distError } =
    trpc.distributorsAdmin.getById.useQuery(
      { id: distId },
      { retry: false, enabled: Number.isFinite(distId) && distId > 0 }
    );

  const [showEditForm, setShowEditForm] = useState(false);

  const updateDistributorMutation = trpc.distributorsAdmin.update.useMutation({
    onSuccess: () => {
      utils.distributorsAdmin.getById.invalidate({ id: distId });
      utils.distributorsAdmin.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء تحديث بيانات الموزع");
    },
  });

  const mapToFormDistributor = (d: any): Distributor => {
    return {
      id: String(d.id),
      name: d.name ?? "",
      company: d.company ?? "",
      city: d.city ?? "",
      region: d.region ?? "",
      phone: d.phone ?? "",
      email: d.email ?? "",
      whatsapp: d.whatsapp ?? "",
      website: d.website ?? "",
      commercialReg: d.commercialReg ?? "",
      vatNumber: d.vatNumber ?? "",
      bankName: d.bankName ?? "",
      bankIban: d.bankIban ?? "",
      status: d.status ?? "pending",
      tier: d.tier ?? "bronze",
      joinDate: d.joinDate ?? "",
      contractStart: d.contractStart ?? "",
      contractEnd: d.contractEnd ?? "",
      creditLimit: d.creditLimit ?? 50000,
      discountRate: d.discountRate ?? 5,
      totalOrders: d.totalOrders ?? 0,
      totalRevenue: d.totalRevenue ?? 0,
      avgRating: d.avgRating ?? 0,
      pendingOrders: d.pendingOrders ?? 0,
      openComplaints: d.openComplaints ?? 0,
      notes: d.notes ?? "",
      adminNotes: d.adminNotes ?? "",
    };
  };

  const handleSaveDistributor = (d: Distributor) => {
    const numId = parseInt(d.id);
    const { id: _id, ...payload } = d;
    if (!isNaN(numId)) {
      updateDistributorMutation.mutate({
        id: numId,
        name: payload.name,
        company: payload.company,
        city: payload.city,
        region: payload.region,
        phone: payload.phone,
        email: payload.email,
        whatsapp: payload.whatsapp || undefined,
        website: payload.website || undefined,
        commercialReg: payload.commercialReg || undefined,
        vatNumber: payload.vatNumber || undefined,
        bankName: payload.bankName || undefined,
        bankIban: payload.bankIban || undefined,
        status: payload.status,
        tier: payload.tier,
        joinDate: payload.joinDate,
        contractStart: payload.contractStart || undefined,
        contractEnd: payload.contractEnd || undefined,
        creditLimit: payload.creditLimit ?? 50000,
        discountRate: payload.discountRate ?? 5,
        totalOrders: payload.totalOrders ?? 0,
        totalRevenue: payload.totalRevenue ?? 0,
        avgRating: payload.avgRating ?? 0,
        pendingOrders: payload.pendingOrders ?? 0,
        openComplaints: payload.openComplaints ?? 0,
        notes: payload.notes || undefined,
        adminNotes: payload.adminNotes || undefined,
      });
    }
  };

  const { data: rawComplaints } = trpc.complaints.list.useQuery({ distributorId: distId }, { enabled: Number.isFinite(distId) });
  const { data: rawPayments } = trpc.payments.list.useQuery({ distributorId: distId }, { enabled: Number.isFinite(distId) });

  if (distLoading) {
    return (
      <AdminLayout title="ملف الموزع" subtitle="جاري التحميل" backHref="/admin/distributors">
        <div className="flex items-center justify-center py-20 text-gray-500 gap-2 font-medium">
          <RotateCcw className="w-5 h-5 animate-spin" />
          جارٍ التحميل...
        </div>
      </AdminLayout>
    );
  }

  if (distError || !dist) {
    return (
      <AdminLayout title="ملف الموزع" subtitle="غير موجود" backHref="/admin/distributors">
        <div className="flex items-center justify-center py-20 text-red-500 gap-2 font-medium">
          <AlertCircle className="w-5 h-5" />
          تعذّر العثور على الموزّع
        </div>
      </AdminLayout>
    );
  }

  const tc = TIER_CFG[dist.tier] ?? TIER_CFG.bronze;

  if (isLoading) {
    return (
      <AdminLayout title={`ملف الموزع: ${dist.name}`} subtitle={dist.company} backHref="/admin/distributors">
        <div className="flex items-center justify-center py-20 text-gray-500 gap-2 font-medium">
          <RotateCcw className="w-5 h-5 animate-spin" />
          جارٍ التحميل...
        </div>
      </AdminLayout>
    );
  }

  if (isError) {
    return (
      <AdminLayout title={`ملف الموزع: ${dist.name}`} subtitle={dist.company} backHref="/admin/distributors">
        <div className="flex items-center justify-center py-20 text-red-500 gap-2 font-medium">
          <AlertCircle className="w-5 h-5" />
          تعذّر تحميل الطلبات
        </div>
      </AdminLayout>
    );
  }

  // خريطة المدفوع الفعلي لكل طلب = مجموع الدفعات المؤكّدة المرتبطة بـ orderNumber
  // مصدر الحقيقة: distributor_payments (دفعات confirmed فقط، مطابقةً لاشتقاق paymentStatus في الخادم)
  const paidByOrder: Record<string, number> = {};
  for (const p of rawPayments ?? []) {
    if (p.status === "confirmed" && p.orderNumber) {
      paidByOrder[p.orderNumber] = (paidByOrder[p.orderNumber] ?? 0) + (p.amount ?? 0);
    }
  }

  const orders: Order[] = (rawOrders ?? []).map((o: any) => mapOrderFromDB(o, paidByOrder));

  const COMPLAINT_TYPE_AR: Record<string, string> = {
    size: "مقاس", color: "لون", damage: "كسر", shortage: "نقص", delay: "تأخير", quality: "جودة", other: "أخرى",
  };
  const mapStatus = (s: string): ComplaintStatus =>
    s === "under_review" || s === "return_pending" ? "under_review"
    : s === "open" || s === "resolved" || s === "rejected" ? s
    : "under_review";
  const complaints: Complaint[] = (rawComplaints ?? []).map((c: any) => ({ // any: raw server row
    id: c.ticketNumber,
    date: c.createdAt ? new Date(Number(c.createdAt)).toISOString().slice(0, 10) : "",
    status: mapStatus(c.status),
    type: COMPLAINT_TYPE_AR[c.type] ?? c.type,
    orderId: c.orderNumber || "",
    description: c.description || "",
    rating: c.satisfactionRating ?? undefined,
    resolvedDate: c.resolvedAt ? new Date(Number(c.resolvedAt)).toISOString().slice(0, 10) : undefined,
  }));

  // Computed stats
  const totalRevenue   = dist.totalRevenue;
  const pendingAmount  = orders.filter(o => o.paymentStatus !== "paid").reduce((s, o) => s + (o.total - o.paid), 0);
  const avgRating      = dist.avgRating;
  const openComplaints = dist.openComplaints;

  const filteredOrders = orders.filter(o => orderFilter === "all" || o.status === orderFilter);



  const payments: Payment[] = (rawPayments ?? []).map(mapPaymentFromDB);

  const filteredPayments = payments.filter(p => paymentFilter === "all" || p.status === paymentFilter);
  const totalPaid = payments.filter(p => p.status === "paid" || p.status === "partial").reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter(p => p.status === "pending" || p.status === "overdue").reduce((s, p) => s + p.amount, 0);

  const contractExpiring = dist.contractEnd && new Date(dist.contractEnd) < new Date(Date.now() + 30 * 24 * 3600000);

  const exportOrders = () => {
    const rows = filteredOrders.map(o => ({
      "رقم الطلب": o.id, "التاريخ": o.date, "الحالة": (ORDER_STATUS[o.status] ?? DEFAULT_ORDER_STATUS).label,
      "عدد المنتجات": o.items, "الإجمالي (ر.س)": o.total, "المدفوع (ر.س)": o.paid,
      "حالة الدفع": (PAYMENT_STATUS[o.paymentStatus] ?? DEFAULT_PAYMENT_STATUS).label, "رقم التتبع": o.trackingNumber || "—",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Array(8).fill({ wch: 20 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الطلبات");
    XLSX.writeFile(wb, `طلبات-${dist.name}-${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success("تم تصدير الطلبات");
  };

  const exportPayments = () => {
    const rows = filteredPayments.map(p => ({
      "رقم الدفعة": p.id, "التاريخ": p.date, "المبلغ (ر.س)": p.amount,
      "طريقة الدفع": p.method, "المرجع": p.reference,
      "الحالة": (PAYMENT_STATUS[p.status] ?? DEFAULT_PAYMENT_STATUS).label, "رقم الطلب": p.orderId || "—", "ملاحظة": p.note || "—",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Array(8).fill({ wch: 20 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المدفوعات");
    XLSX.writeFile(wb, `مدفوعات-${dist.name}-${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success("تم تصدير سجل المدفوعات");
  };

  const tabs = [
    { id: "overview",   label: "نظرة عامة",    icon: <BarChart2 className="w-4 h-4" /> },
    { id: "orders",     label: "الطلبات",       icon: <ShoppingBag className="w-4 h-4" />, count: orders.length },
    { id: "complaints", label: "الشكاوى",       icon: <AlertCircle className="w-4 h-4" />, count: complaints.length },
    { id: "payments",   label: "سجل المدفوعات", icon: <DollarSign className="w-4 h-4" />,  count: payments.length },
  ] as const;

  return (
    <AdminLayout
      title={`ملف الموزع: ${dist.name}`}
      subtitle={dist.company}
      backHref="/admin/distributors"
    >
      <div className="space-y-5" dir="rtl">

        {/* Contract expiry warning */}
        {contractExpiring && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-700 font-medium">
              {new Date(dist.contractEnd!) < new Date()
                ? "العقد منتهٍ — يرجى التجديد فوراً"
                : `العقد سينتهي في ${new Date(dist.contractEnd!).toLocaleDateString("ar-SA")} — قريباً`}
            </p>
            <Button className="mr-auto text-xs h-7 text-white" style={{ background: "#F59E0B" }}>
              تجديد العقد
            </Button>
          </motion.div>
        )}

        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex flex-col sm:flex-row gap-5">
            {/* Avatar + Basic */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
                style={{ background: "oklch(0.38 0.06 160)" }}>
                {dist.name[0]}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "DM Serif Display, serif" }}>{dist.name}</h2>
                  <span className="text-xs font-mono text-gray-400">#{id}</span>
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: tc.color, background: tc.bg }}>
                    {tc.icon}{tc.label}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />{dist.company}
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  <a href={`tel:${dist.phone}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-600 transition-colors">
                    <Phone className="w-3.5 h-3.5" />{dist.phone}
                  </a>
                  <a href={`mailto:${dist.email}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-600 transition-colors">
                    <Mail className="w-3.5 h-3.5" />{dist.email}
                  </a>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="w-3.5 h-3.5" />{dist.city}، {dist.region}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="sm:mr-auto flex flex-wrap gap-2 items-start">
              <a href={`https://wa.me/966${dist.whatsapp?.replace(/^0/, "") || dist.phone.replace(/^0/, "")}`}
                target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2 text-xs h-9 border-green-200 text-green-700 hover:bg-green-50">
                  <MessageSquare className="w-4 h-4" /> واتساب
                </Button>
              </a>
              <Button variant="outline" className="gap-2 text-xs h-9" onClick={() => setShowEditForm(true)}>
                <Edit2 className="w-4 h-4" /> تعديل البيانات
              </Button>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-50">
            {[
              { label: "السجل التجاري", value: dist.commercialReg || "—", icon: <Hash className="w-3.5 h-3.5" /> },
              { label: "الرقم الضريبي",  value: dist.vatNumber ? dist.vatNumber.slice(0, 10) + "..." : "—", icon: <FileText className="w-3.5 h-3.5" /> },
              { label: "البنك",          value: dist.bankName || "—", icon: <CreditCard className="w-3.5 h-3.5" /> },
              { label: "تاريخ الانضمام",value: dist.joinDate, icon: <Calendar className="w-3.5 h-3.5" /> },
              { label: "حد الائتمان",   value: `${(dist.creditLimit || 0).toLocaleString()} ر.س`, icon: <DollarSign className="w-3.5 h-3.5" /> },
              { label: "نسبة الخصم",    value: `${dist.discountRate || 0}%`, icon: <TrendingUp className="w-3.5 h-3.5" /> },
              { label: "نهاية العقد",   value: dist.contractEnd || "—", icon: <Calendar className="w-3.5 h-3.5" /> },
              { label: "الموقع",        value: dist.website || "—", icon: <Globe className="w-3.5 h-3.5" /> },
            ].map((c) => (
              <div key={c.label} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-1.5 mb-1 text-gray-400">{c.icon}<span className="text-xs">{c.label}</span></div>
                <div className="text-xs font-semibold text-gray-700 truncate">{c.value}</div>
              </div>
            ))}
          </div>

          {dist.adminNotes && (
            <div className="mt-3 p-3 rounded-xl bg-purple-50 border border-purple-100 flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-purple-700">{dist.adminNotes}</p>
            </div>
          )}
        </div>

        {/* KPI Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={<ShoppingBag className="w-4 h-4" />} label="إجمالي الطلبات"   value={orders.length}                              sub={`${orders.filter(o => o.status === "pending" || o.status === "approved").length} نشط`} color="#3B82F6" bg="#EFF6FF" />
          <StatCard icon={<DollarSign className="w-4 h-4" />}  label="إجمالي الإيرادات" value={`${(totalRevenue/1000).toFixed(0)}K ر.س`}       sub={`متأخر: ${(pendingAmount/1000).toFixed(0)}K`}                                              color="#10B981" bg="#ECFDF5" />
          <StatCard icon={<AlertCircle className="w-4 h-4" />} label="الشكاوى المفتوحة"  value={openComplaints}                                  sub={openComplaints > 0 ? "تحتاج للمتابعة" : "لا توجد شكاوى نشطة"}                              color={openComplaints > 0 ? "#EF4444" : "#10B981"} bg={openComplaints > 0 ? "#FEF2F2" : "#ECFDF5"} />
          <StatCard icon={<Star className="w-4 h-4" />}        label="متوسط التقييم"     value={avgRating > 0 ? avgRating.toFixed(1) + " ★" : "—"} sub="تقييم حل الشكاوى"                                                                          color="#F59E0B" bg="#FFFBEB" />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id as typeof activeTab)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
                  activeTab === t.id
                    ? "border-green-600 text-green-700 bg-green-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}>
                {t.icon}{t.label}
                {"count" in t && <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{t.count}</span>}
              </button>
            ))}
          </div>

          <div className="p-5">
            <AnimatePresence mode="wait">
              {/* ── Overview Tab ── */}
              {activeTab === "overview" && (
                <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Recent Orders */}
                    <div>
                      <SectionHeader title="آخر الطلبات" count={5} />
                      <div className="space-y-2">
                        {orders.slice(-5).reverse().map((o) => {
                          const sc = ORDER_STATUS[o.status] ?? DEFAULT_ORDER_STATUS;
                          return (
                            <div key={o.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                              <div>
                                <div className="text-sm font-medium text-gray-800">{o.id}</div>
                                <div className="text-xs text-gray-400">{o.date} · {o.items} منتج</div>
                              </div>
                              <div className="text-left">
                                <div className="text-sm font-semibold text-gray-700">{o.total.toLocaleString()} ر.س</div>
                                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium w-fit mr-auto" style={{ color: sc.color, background: sc.bg }}>
                                  {sc.icon}{sc.label}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Recent Complaints */}
                    <div>
                      <SectionHeader title="آخر الشكاوى" count={complaints.length} />
                      <div className="space-y-2">
                        {complaints.slice(-5).reverse().map((c) => {
                          const cs = COMPLAINT_STATUS[c.status];
                          return (
                            <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                              <div>
                                <div className="text-sm font-medium text-gray-800">{c.id}</div>
                                <div className="text-xs text-gray-400">{c.date} · {c.type} · {c.orderId}</div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: cs.color, background: cs.bg }}>{cs.label}</span>
                                {c.rating && <div className="flex items-center gap-0.5 text-xs text-amber-500">{"★".repeat(c.rating)}</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Payment Summary */}
                    <div className="sm:col-span-2">
                      <SectionHeader title="ملخص المدفوعات" />
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: "إجمالي المدفوع",    value: `${(totalRevenue/1000).toFixed(0)}K ر.س`,    color: "#10B981", bg: "#ECFDF5" },
                          { label: "المبالغ المعلقة",   value: `${(pendingAmount/1000).toFixed(0)}K ر.س`,   color: "#F59E0B", bg: "#FFFBEB" },
                          { label: "عدد الدفعات",       value: payments.filter(p => p.status === "paid").length, color: "#3B82F6", bg: "#EFF6FF" },
                          { label: "متوسط قيمة الطلب",  value: `${Math.round(totalRevenue / (orders.filter(o => o.status === "delivered").length || 1) / 1000)}K ر.س`, color: "#8B5CF6", bg: "#F5F3FF" },
                        ].map((s) => (
                          <div key={s.label} className="p-3 rounded-xl border border-gray-100" style={{ background: s.bg }}>
                            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                            <div className="text-xl font-bold" style={{ color: s.color, fontFamily: "DM Serif Display, serif" }}>{s.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Orders Tab ── */}
              {activeTab === "orders" && (
                <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs text-gray-400 self-center"><Filter className="w-3.5 h-3.5 inline ml-1" />فلتر:</span>
                      {(["all", "pending", "approved", "production", "shipped", "delivered", "cancelled"] as const).map((s) => (
                        <button key={s} onClick={() => setOrderFilter(s)}
                          className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
                          style={orderFilter === s
                            ? { background: "oklch(0.38 0.06 160)", color: "white" }
                            : { background: "#F3F4F6", color: "#6B7280" }}>
                          {s === "all" ? "الكل" : (ORDER_STATUS[s as OrderStatus] ?? DEFAULT_ORDER_STATUS).label}
                        </button>
                      ))}
                    </div>
                    <Button variant="outline" className="gap-1.5 text-xs h-8" onClick={exportOrders}>
                      <Download className="w-3.5 h-3.5" /> تصدير Excel
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {filteredOrders.map((o) => {
                      const sc = ORDER_STATUS[o.status] ?? DEFAULT_ORDER_STATUS;
                      const pc = PAYMENT_STATUS[o.paymentStatus] ?? DEFAULT_PAYMENT_STATUS;
                      const isExpanded = expandedOrder === o.id;
                      return (
                        <div key={o.id} className="border border-gray-100 rounded-xl overflow-hidden">
                          <div className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => setExpandedOrder(isExpanded ? null : o.id)}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-gray-800">{o.id}</span>
                                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: sc.color, background: sc.bg }}>
                                  {sc.icon}{sc.label}
                                </span>
                                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: pc.color, background: pc.bg }}>
                                  {pc.label}
                                </span>
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5">{o.date} · {o.items} منتج</div>
                            </div>
                            <div className="text-left flex-shrink-0">
                              <div className="text-sm font-bold text-gray-800">{o.total.toLocaleString()} ر.س</div>
                              {o.paid > 0 && o.paid < o.total && (
                                <div className="text-xs text-blue-500">مدفوع: {o.paid.toLocaleString()}</div>
                              )}
                            </div>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                          </div>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                                className="overflow-hidden border-t border-gray-100">
                                <div className="p-3 bg-gray-50 space-y-2">
                                  <div className="text-xs text-gray-600"><span className="font-medium">المنتجات:</span> {o.products}</div>
                                  {o.trackingNumber && (
                                    <div className="text-xs text-gray-600"><span className="font-medium">رقم التتبع:</span> <span className="font-mono text-blue-600">{o.trackingNumber}</span></div>
                                  )}

                                  <div className="mt-2 border border-gray-100 rounded-lg overflow-hidden">
                                    {(!o.rawItems || o.rawItems.length === 0) ? (
                                      <div className="text-xs text-center p-3 text-gray-500">لا توجد تفاصيل بنود</div>
                                    ) : (
                                      <table className="w-full text-xs text-right border-collapse">
                                        <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                                          <tr>
                                            <th className="p-2 font-medium">النوع</th>
                                            <th className="p-2 font-medium text-center">الكمية</th>
                                            <th className="p-2 font-medium text-center">السعر</th>
                                            <th className="p-2 font-medium text-center">المقاس</th>
                                            <th className="p-2 font-medium">الخشب</th>
                                            <th className="p-2 font-medium">اللون</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                          {o.rawItems.map((it: any, idx: number) => (
                                            <tr key={idx} className="bg-white hover:bg-gray-50/50 transition-colors">
                                              <td className="p-2 font-medium">{it.doorType || "—"}</td>
                                              <td className="p-2 text-center">{it.quantity || "—"}</td>
                                              <td className="p-2 text-center text-gray-600">{it.unitPrice ? `${it.unitPrice.toLocaleString()} ر.س` : "—"}</td>
                                              <td className="p-2 text-center text-gray-600" dir="ltr">{it.width && it.height ? `${it.width}×${it.height}` : "—"}</td>
                                              <td className="p-2 text-gray-600">{it.woodType || "—"}</td>
                                              <td className="p-2 text-gray-600">{it.color || "—"}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>

                                  <div className="flex gap-2 pt-2">
                                    {o.status === "pending" && (
                                      <>
                                        <Button
                                          className="text-xs h-7 gap-1 text-white"
                                          style={{ background: "#10B981" }}
                                          disabled={updateStatusMutation.isPending}
                                          onClick={(e) => { e.stopPropagation(); if (o.dbId != null) updateStatusMutation.mutate({ id: o.dbId, status: "confirmed" }); }}
                                        >
                                          <CheckCircle2 className="w-3.5 h-3.5" /> موافقة
                                        </Button>
                                        <Button
                                          variant="outline"
                                          className="text-xs h-7 gap-1"
                                          style={{ color: "#EF4444", borderColor: "#EF4444" }}
                                          disabled={updateStatusMutation.isPending}
                                          onClick={(e) => { e.stopPropagation(); if (o.dbId != null) updateStatusMutation.mutate({ id: o.dbId, status: "cancelled" }); }}
                                        >
                                          <XCircle className="w-3.5 h-3.5" /> رفض
                                        </Button>
                                      </>
                                    )}
                                    {o.status === "shipped" && (
                                      <Button className="text-xs h-7 gap-1 text-white" style={{ background: "#10B981" }} onClick={(e) => { e.stopPropagation(); if (o.dbId != null) updateStatusMutation.mutate({ id: o.dbId, status: "delivered" }); }}>
                                        <CheckCheck className="w-3.5 h-3.5" /> تأكيد التسليم
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                    {filteredOrders.length === 0 && (
                      <div className="text-center py-10 text-gray-400">
                        <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">لا توجد طلبات بهذا الفلتر</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── Complaints Tab ── */}
              {activeTab === "complaints" && (
                <motion.div key="complaints" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <SectionHeader title="سجل الشكاوى" count={complaints.length} />
                  <div className="space-y-3">
                    {complaints.map((c) => {
                      const cs = COMPLAINT_STATUS[c.status];
                      return (
                        <div key={c.id} className="p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-sm font-semibold text-gray-800">{c.id}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: cs.color, background: cs.bg }}>{cs.label}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{c.type}</span>
                              </div>
                              <p className="text-sm text-gray-600">{c.description}</p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                <span><Calendar className="w-3.5 h-3.5 inline ml-1" />{c.date}</span>
                                <span><ShoppingBag className="w-3.5 h-3.5 inline ml-1" />{c.orderId}</span>
                                {c.resolvedDate && <span><CheckCircle2 className="w-3.5 h-3.5 inline ml-1 text-green-500" />حُل في {c.resolvedDate}</span>}
                              </div>
                            </div>
                            {c.rating && (
                              <div className="flex flex-col items-center flex-shrink-0">
                                <div className="text-xs text-gray-400 mb-1">التقييم</div>
                                <div className="flex gap-0.5">
                                  {[1,2,3,4,5].map((s) => (
                                    <Star key={s} className={`w-3.5 h-3.5 ${s <= c.rating! ? "fill-amber-400 stroke-amber-400" : "stroke-gray-300"}`} />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ── Payments Tab ── */}
              {activeTab === "payments" && (
                <motion.div key="payments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs text-gray-400 self-center"><Filter className="w-3.5 h-3.5 inline ml-1" />فلتر:</span>
                      {(["all", "paid", "pending", "partial", "overdue"] as const).map((s) => (
                        <button key={s} onClick={() => setPaymentFilter(s)}
                          className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
                          style={paymentFilter === s
                            ? { background: "oklch(0.38 0.06 160)", color: "white" }
                            : { background: "#F3F4F6", color: "#6B7280" }}>
                          {s === "all" ? "الكل" : (PAYMENT_STATUS[s as PaymentStatus] ?? DEFAULT_PAYMENT_STATUS).label}
                        </button>
                      ))}
                    </div>
                    <Button variant="outline" className="gap-1.5 text-xs h-8" onClick={() => setShowAddPayment(true)}>
                      <DollarSign className="w-3.5 h-3.5" /> تسجيل دفعة
                    </Button>
                    <Button variant="outline" className="gap-1.5 text-xs h-8" onClick={exportPayments}>
                      <Download className="w-3.5 h-3.5" /> تصدير Excel
                    </Button>
                  </div>

                  {/* Summary Bar */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: "إجمالي المدفوع", value: `${(totalPaid/1000).toFixed(0)}K ر.س`, color: "#10B981", bg: "#ECFDF5" },
                      { label: "المبالغ المعلقة", value: `${(pendingAmount/1000).toFixed(0)}K ر.س`, color: "#F59E0B", bg: "#FFFBEB" },
                      { label: "عدد الدفعات",    value: payments.filter(p => p.status === "paid").length, color: "#3B82F6", bg: "#EFF6FF" },
                    ].map((s) => (
                      <div key={s.label} className="p-3 rounded-xl border border-gray-100" style={{ background: s.bg }}>
                        <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                        <div className="text-lg font-bold" style={{ color: s.color, fontFamily: "DM Serif Display, serif" }}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Payments Table */}
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          {["رقم الدفعة", "التاريخ", "المبلغ", "طريقة الدفع", "المرجع", "الطلب", "الحالة", "ملاحظة"].map((h) => (
                            <th key={h} className="text-xs font-semibold text-gray-500 px-3 py-2.5 text-start whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPayments.map((p, i) => {
                          const pc = PAYMENT_STATUS[p.status] ?? DEFAULT_PAYMENT_STATUS;
                          return (
                            <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                              className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                              <td className="px-3 py-2.5 text-xs font-mono text-gray-600">{p.id}</td>
                              <td className="px-3 py-2.5 text-xs text-gray-600">{p.date}</td>
                              <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">
                                {p.amount > 0 ? `${p.amount.toLocaleString()} ر.س` : "—"}
                              </td>
                              <td className="px-3 py-2.5 text-xs text-gray-600">{p.method}</td>
                              <td className="px-3 py-2.5 text-xs font-mono text-gray-500">{p.reference}</td>
                              <td className="px-3 py-2.5 text-xs text-blue-600">{p.orderId || "—"}</td>
                              <td className="px-3 py-2.5">
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: pc.color, background: pc.bg }}>{pc.label}</span>
                              </td>
                              <td className="px-3 py-2.5 text-xs text-gray-400">{p.note || "—"}</td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {filteredPayments.length === 0 && (
                      <div className="text-center py-10 text-gray-400">
                        <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">لا توجد مدفوعات بهذا الفلتر</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AddPaymentModal
        isOpen={showAddPayment}
        onClose={() => setShowAddPayment(false)}
        distributorId={distId}
        orders={orders}
        onSuccess={() => {
          utils.payments.list.invalidate();
          utils.distributorOrders.list.invalidate();
        }}
      />

      {showEditForm && (
        <DistributorFormModal
          initial={mapToFormDistributor(dist)}
          onClose={() => setShowEditForm(false)}
          onSave={handleSaveDistributor}
        />
      )}
    </AdminLayout>
  );
}

// ─── Add Payment Modal ────────────────────────────────────
interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  distributorId: number;
  orders: Order[];
  onSuccess: () => void;
}

function AddPaymentModal({ isOpen, onClose, distributorId, orders, onSuccess }: AddPaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "bank_transfer" | "cheque" | "card" | "other">("bank_transfer");
  const [orderNumber, setOrderNumber] = useState(""); // "" = دفعة عامة
  const [reference, setReference] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"confirmed" | "pending" | "cancelled">("confirmed");

  const createMutation = trpc.payments.create.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل الدفعة بنجاح");
      // إعادة ضبط الحقول
      setAmount("");
      setMethod("bank_transfer");
      setOrderNumber("");
      setReference("");
      setPaymentDate("");
      setNote("");
      setStatus("confirmed");
      onSuccess();
      onClose();
    },
    onError: (e) => {
      toast.error(e.message || "تعذّر تسجيل الدفعة");
    },
  });

  const handleSubmit = () => {
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error("الرجاء إدخال مبلغ صحيح أكبر من صفر");
      return;
    }
    createMutation.mutate({
      distributorId,
      amount: amountNum,
      method,
      orderNumber: orderNumber || undefined,
      reference: reference.trim() || undefined,
      paymentDate: paymentDate || undefined,
      note: note.trim() || undefined,
      status,
    });
  };

  const fieldClass =
    "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent";
  const labelClass = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">تسجيل دفعة جديدة</h2>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className={labelClass}>المبلغ (ر.س) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={fieldClass}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className={labelClass}>طريقة الدفع</label>
                <select value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className={fieldClass}>
                  <option value="bank_transfer">تحويل بنكي</option>
                  <option value="cash">نقداً</option>
                  <option value="cheque">شيك</option>
                  <option value="card">بطاقة</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>ربط بطلب (اختياري)</label>
                <select value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} className={fieldClass}>
                  <option value="">دفعة عامة (بلا طلب)</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.id} — {o.total.toLocaleString()} ر.س
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>المرجع (اختياري)</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className={fieldClass}
                  placeholder="رقم التحويل / الشيك"
                />
              </div>

              <div>
                <label className={labelClass}>تاريخ الدفعة (اختياري)</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className={fieldClass}
                />
              </div>

              <div>
                <label className={labelClass}>الحالة</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={fieldClass}>
                  <option value="confirmed">مؤكّدة</option>
                  <option value="pending">معلّقة</option>
                  <option value="cancelled">ملغاة</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>ملاحظة (اختياري)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className={fieldClass}
                  rows={2}
                  placeholder="ملاحظة إضافية"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-6 border-t border-gray-100">
              <Button variant="outline" onClick={onClose} disabled={createMutation.isPending}>
                إلغاء
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? "جارٍ الحفظ..." : "تسجيل الدفعة"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
