// ============================================================
// CustomerPortal — بوابة العملاء
// تتبع الطلبات · الفواتير الضريبية ZATCA · الشكاوى
// ============================================================
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Package,
  FileText,
  MessageSquareWarning,
  LogOut,
  User,
  ChevronRight,
  Clock,
  CheckCircle2,
  Truck,
  Factory,
  XCircle,
  AlertTriangle,
  Star,
  QrCode,
  Download,
  Send,
  RefreshCw,
  Search,
  Phone,
  ShieldCheck,
  Layers,
  DoorOpen,
} from "lucide-react";

// ─── ترجمات حالة الطلب ──────────────────────────────────────
const STATUS_MAP: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
    icon: React.ReactNode;
    step: number;
  }
> = {
  new: {
    label: "طلب جديد",
    color: "#6366F1",
    bg: "#EEF2FF",
    icon: <Star className="w-4 h-4" />,
    step: 0,
  },
  reviewing: {
    label: "قيد المراجعة",
    color: "#F59E0B",
    bg: "#FFFBEB",
    icon: <Clock className="w-4 h-4" />,
    step: 1,
  },
  confirmed: {
    label: "مؤكد",
    color: "#10B981",
    bg: "#ECFDF5",
    icon: <CheckCircle2 className="w-4 h-4" />,
    step: 2,
  },
  in_production: {
    label: "في الإنتاج",
    color: "#3B82F6",
    bg: "#EFF6FF",
    icon: <Factory className="w-4 h-4" />,
    step: 3,
  },
  ready: {
    label: "جاهز للتسليم",
    color: "#8B5CF6",
    bg: "#F5F3FF",
    icon: <Package className="w-4 h-4" />,
    step: 4,
  },
  delivered: {
    label: "تم التسليم",
    color: "#059669",
    bg: "#ECFDF5",
    icon: <Truck className="w-4 h-4" />,
    step: 5,
  },
  cancelled: {
    label: "ملغي",
    color: "#EF4444",
    bg: "#FEF2F2",
    icon: <XCircle className="w-4 h-4" />,
    step: -1,
  },
};

const PAYMENT_MAP: Record<string, { label: string; color: string }> = {
  unpaid: { label: "غير مدفوع", color: "#EF4444" },
  partial: { label: "جزئي", color: "#F59E0B" },
  paid: { label: "مدفوع", color: "#10B981" },
};

const COMPLAINT_TYPES: { value: string; label: string }[] = [
  { value: "size", label: "مشكلة في المقاس" },
  { value: "color", label: "مشكلة في اللون" },
  { value: "damage", label: "تلف أو كسر" },
  { value: "shortage", label: "نقص في الكمية" },
  { value: "delay", label: "تأخر في التسليم" },
  { value: "quality", label: "جودة رديئة" },
  { value: "other", label: "أخرى" },
];

const COMPLAINT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  open: { label: "مفتوحة", color: "#6366F1" },
  under_review: { label: "قيد المراجعة", color: "#F59E0B" },
  resolved: { label: "محلولة", color: "#10B981" },
  rejected: { label: "مرفوضة", color: "#EF4444" },
  return_pending: { label: "انتظار إرجاع", color: "#8B5CF6" },
};

const WORKFLOW_STEPS = [
  { key: "new", label: "استلام الطلب" },
  { key: "reviewing", label: "مراجعة المواصفات" },
  { key: "confirmed", label: "تأكيد الطلب" },
  { key: "in_production", label: "الإنتاج" },
  { key: "ready", label: "جاهز للتسليم" },
  { key: "delivered", label: "التسليم" },
];

type Tab = "orders" | "invoices" | "complaints";

// ── Halala → SAR ─────────────────────────────────────────────
const halaToSar = (h: number) =>
  (h / 100).toLocaleString("ar-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function CustomerPortal() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, logout } = useUserAuth();
  const [tab, setTab] = useState<Tab>("orders");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // ── شكوى جديدة ──────────────────────────────────────────────
  const [complaintForm, setComplaintForm] = useState({
    orderNumber: "",
    product: "",
    type: "other" as const,
    description: "",
  });
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  // ── Queries ──────────────────────────────────────────────────
  const ordersQ = trpc.customerPortal.myOrders.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const invoiceQ = trpc.customerPortal.orderInvoice.useQuery(
    { orderId: selectedOrderId! },
    { enabled: isAuthenticated && selectedOrderId !== null }
  );
  const complaintsQ = trpc.customerPortal.myComplaints.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const submitComplaintMutation =
    trpc.customerPortal.submitComplaint.useMutation({
      onSuccess: data => {
        toast.success(
          `تم تقديم الشكوى بنجاح — رقم التذكرة: ${data.ticketNumber}`
        );
        setComplaintForm({
          orderNumber: "",
          product: "",
          type: "other",
          description: "",
        });
        setSubmittingComplaint(false);
        complaintsQ.refetch();
      },
      onError: err => {
        toast.error(err.message || "حدث خطأ، يرجى المحاولة لاحقاً");
        setSubmittingComplaint(false);
      },
    });

  // ── إذا لم يسجّل الدخول → توجيه لصفحة الدخول ───────────────
  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-stone-50 flex items-center justify-center p-4"
        dir="rtl"
      >
        <div className="bg-white rounded-3xl shadow-xl border border-stone-100 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <DoorOpen className="w-8 h-8 text-amber-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            بوابة العملاء
          </h1>
          <p className="text-gray-500 mb-8 text-sm leading-relaxed">
            سجّل الدخول لمتابعة طلباتك، استلام فواتيرك الضريبية، وتقديم شكاواك.
          </p>
          <Button
            className="w-full bg-amber-700 hover:bg-amber-800 text-white rounded-xl py-3 font-semibold"
            onClick={() => navigate("/login")}
          >
            تسجيل الدخول
          </Button>
          <p className="text-xs text-gray-400 mt-4">
            ليس لديك حساب؟{" "}
            <button
              className="text-amber-700 font-semibold hover:underline"
              onClick={() => navigate("/login")}
            >
              إنشاء حساب جديد
            </button>
          </p>
        </div>
      </div>
    );
  }

  const orders = ordersQ.data ?? [];
  const complaints = complaintsQ.data ?? [];
  const invoice = invoiceQ.data;

  const TABS: {
    key: Tab;
    icon: React.ReactNode;
    label: string;
    count?: number;
  }[] = [
    {
      key: "orders",
      icon: <Package className="w-4 h-4" />,
      label: "طلباتي",
      count: orders.length,
    },
    {
      key: "invoices",
      icon: <FileText className="w-4 h-4" />,
      label: "الفواتير الضريبية",
    },
    {
      key: "complaints",
      icon: <MessageSquareWarning className="w-4 h-4" />,
      label: "الشكاوى",
      count: complaints.filter(c => c.status === "open").length || undefined,
    },
  ];

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleComplaintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintForm.orderNumber.trim()) {
      toast.error("يرجى إدخال رقم الطلب");
      return;
    }
    if (!complaintForm.product.trim()) {
      toast.error("يرجى إدخال اسم المنتج");
      return;
    }
    if (complaintForm.description.length < 10) {
      toast.error("يرجى كتابة وصف تفصيلي (10 أحرف على الأقل)");
      return;
    }
    setSubmittingComplaint(true);
    submitComplaintMutation.mutate(complaintForm as any);
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50/30"
      dir="rtl"
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <DoorOpen className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">
                بوابة العملاء
              </div>
              <div className="text-xs text-gray-400">
                سنديان للأبواب الخشبية
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-stone-50 rounded-xl px-3 py-2">
              <div className="w-7 h-7 rounded-full bg-amber-200 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-amber-800" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-800">
                  {user?.name}
                </div>
                <div className="text-[10px] text-gray-400">{user?.email}</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline mr-1.5 text-xs">خروج</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* ── Tabs ────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-white border border-stone-200 rounded-2xl p-1 shadow-sm w-fit">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                tab === t.key
                  ? "bg-amber-700 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-stone-100"
              }`}
            >
              {t.icon}
              {t.label}
              {t.count != null && t.count > 0 && (
                <span
                  className={`text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold ${
                    tab === t.key
                      ? "bg-amber-500 text-white"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════ */}
        {/* TAB: طلباتي                                         */}
        {/* ════════════════════════════════════════════════════ */}
        {tab === "orders" && (
          <div className="space-y-4">
            {ordersQ.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="h-28 bg-white rounded-2xl border border-stone-100 animate-pulse"
                  />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-100 p-16 text-center shadow-sm">
                <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-stone-400" />
                </div>
                <h3 className="font-bold text-gray-700 mb-2">
                  لا توجد طلبات بعد
                </h3>
                <p className="text-sm text-gray-400 mb-6">
                  ابدأ بتصفح منتجاتنا وتقديم طلبك الأول
                </p>
                <Button
                  className="bg-amber-700 hover:bg-amber-800 text-white rounded-xl"
                  onClick={() => navigate("/products")}
                >
                  تصفح المنتجات
                </Button>
              </div>
            ) : (
              orders.map(order => {
                const st = STATUS_MAP[order.status] ?? STATUS_MAP.new;
                const pt = PAYMENT_MAP[order.paymentStatus ?? "unpaid"];
                const currentStep = st.step;

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden"
                  >
                    {/* رأس البطاقة */}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-start gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: st.bg, color: st.color }}
                          >
                            {st.icon}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">
                              {order.productName}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-400">
                                طلب #{order.id}
                              </span>
                              <span className="text-gray-200">·</span>
                              <span className="text-xs text-gray-400">
                                {new Date(order.createdAt).toLocaleDateString(
                                  "ar-SA"
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          <span
                            className="text-xs font-semibold px-3 py-1 rounded-full"
                            style={{ background: st.bg, color: st.color }}
                          >
                            {st.label}
                          </span>
                          <span
                            className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                            style={{
                              background: `${pt.color}18`,
                              color: pt.color,
                            }}
                          >
                            {pt.label}
                          </span>
                        </div>
                      </div>

                      {/* تفاصيل */}
                      <div className="flex items-center gap-4 mt-4 text-sm flex-wrap">
                        <div className="text-gray-700 font-semibold">
                          {order.totalPrice.toLocaleString()} ر.س
                        </div>
                        {order.expectedDelivery && (
                          <div className="flex items-center gap-1 text-gray-500">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-xs">
                              التسليم:{" "}
                              {new Date(
                                order.expectedDelivery
                              ).toLocaleDateString("ar-SA")}
                            </span>
                          </div>
                        )}
                        {order.totalDoors && order.totalDoors > 0 && (
                          <div className="flex items-center gap-1 text-gray-500">
                            <Layers className="w-3.5 h-3.5" />
                            <span className="text-xs">
                              {order.totalDoors} باب
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* شريط التقدم — خط زمني */}
                    {order.status !== "cancelled" && (
                      <div className="border-t border-stone-50 px-5 pb-4 pt-3">
                        <div className="flex items-center gap-0">
                          {WORKFLOW_STEPS.map((step, idx) => {
                            const done = currentStep > idx;
                            const active = currentStep === idx;
                            return (
                              <div
                                key={step.key}
                                className="flex items-center flex-1 last:flex-none"
                              >
                                <div className="flex flex-col items-center">
                                  <div
                                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                      done
                                        ? "bg-amber-700 text-white"
                                        : active
                                          ? "bg-amber-200 text-amber-800 ring-2 ring-amber-400"
                                          : "bg-stone-100 text-stone-400"
                                    }`}
                                  >
                                    {done ? (
                                      <CheckCircle2 className="w-3 h-3" />
                                    ) : (
                                      idx + 1
                                    )}
                                  </div>
                                  <div
                                    className={`text-[9px] mt-1 text-center max-w-[48px] leading-tight ${
                                      done || active
                                        ? "text-amber-700 font-semibold"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    {step.label}
                                  </div>
                                </div>
                                {idx < WORKFLOW_STEPS.length - 1 && (
                                  <div
                                    className={`flex-1 h-0.5 mb-5 ${done ? "bg-amber-700" : "bg-stone-100"}`}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* أزرار */}
                    <div className="border-t border-stone-50 px-5 py-3 flex items-center gap-2 bg-stone-50/50">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs rounded-xl border-stone-200 hover:border-amber-300 hover:text-amber-700"
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setTab("invoices");
                        }}
                      >
                        <FileText className="w-3.5 h-3.5 me-1" />
                        الفاتورة الضريبية
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs rounded-xl text-gray-500 hover:text-amber-700"
                        onClick={() => {
                          setComplaintForm(f => ({
                            ...f,
                            orderNumber: String(order.id),
                            product: order.productName,
                          }));
                          setTab("complaints");
                        }}
                      >
                        <MessageSquareWarning className="w-3.5 h-3.5 me-1" />
                        تقديم شكوى
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/* TAB: الفواتير الضريبية                              */}
        {/* ════════════════════════════════════════════════════ */}
        {tab === "invoices" && (
          <div className="space-y-4">
            {/* اختيار الطلب */}
            <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-4 h-4 text-gray-400" />
                <h3 className="font-semibold text-gray-800">
                  اختر الطلب لعرض فاتورته
                </h3>
              </div>
              {orders.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  لا توجد طلبات مسجلة
                </p>
              ) : (
                <div className="grid gap-2">
                  {orders.map(order => (
                    <button
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={`text-right p-3 rounded-xl border transition-all flex items-center justify-between ${
                        selectedOrderId === order.id
                          ? "border-amber-400 bg-amber-50"
                          : "border-stone-100 hover:border-stone-300 hover:bg-stone-50"
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold text-gray-800">
                          {order.productName}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          طلب #{order.id} ·{" "}
                          {new Date(order.createdAt).toLocaleDateString(
                            "ar-SA"
                          )}
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 transition-colors ${
                          selectedOrderId === order.id
                            ? "text-amber-600"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* عرض الفاتورة */}
            {selectedOrderId && (
              <div>
                {invoiceQ.isLoading ? (
                  <div className="bg-white rounded-2xl border border-stone-100 p-10 text-center shadow-sm">
                    <RefreshCw className="w-6 h-6 animate-spin text-amber-600 mx-auto" />
                  </div>
                ) : invoice === null || invoice === undefined ? (
                  <div className="bg-white rounded-2xl border border-stone-100 p-10 text-center shadow-sm">
                    <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-7 h-7 text-amber-400" />
                    </div>
                    <h3 className="font-bold text-gray-700 mb-1">
                      لا توجد فاتورة بعد
                    </h3>
                    <p className="text-sm text-gray-400">
                      يتم إصدار الفاتورة الضريبية تلقائياً بعد تأكيد الطلب
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                    {/* رأس الفاتورة */}
                    <div className="bg-gradient-to-l from-amber-700 to-amber-900 p-6 text-white">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck className="w-5 h-5 text-amber-200" />
                            <span className="text-amber-200 text-sm">
                              فاتورة ضريبية إلكترونية — ZATCA Phase 2
                            </span>
                          </div>
                          <h2 className="text-2xl font-bold">
                            {invoice.invoiceNumber}
                          </h2>
                          <div className="text-amber-200 text-sm mt-1">
                            تاريخ الإصدار: {invoice.issueDate}{" "}
                            {invoice.issueTime}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`${
                              invoice.zatcaStatus === "reported" ||
                              invoice.zatcaStatus === "cleared"
                                ? "bg-green-500"
                                : invoice.zatcaStatus === "error"
                                  ? "bg-red-500"
                                  : "bg-amber-500"
                            } text-white border-0 text-xs`}
                          >
                            {invoice.zatcaStatus === "reported"
                              ? "مُبلَّغ لـ ZATCA"
                              : invoice.zatcaStatus === "cleared"
                                ? "مُقاصة ZATCA"
                                : invoice.zatcaStatus === "error"
                                  ? "خطأ ZATCA"
                                  : invoice.zatcaStatus === "submitted"
                                    ? "مُرسَل"
                                    : "في الانتظار"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* البائع والمشتري */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-stone-50 rounded-xl p-4">
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                            البائع
                          </div>
                          <div className="font-bold text-gray-900">
                            {invoice.sellerName}
                          </div>
                          <div className="text-sm text-gray-500 mt-0.5">
                            رقم ضريبي: {invoice.sellerVatNumber}
                          </div>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-4">
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                            المشتري
                          </div>
                          <div className="font-bold text-gray-900">
                            {invoice.buyerName}
                          </div>
                          {invoice.buyerPhone && (
                            <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                              <Phone className="w-3 h-3" />
                              {invoice.buyerPhone}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* بنود الفاتورة */}
                      {Array.isArray(invoice.lineItems) &&
                        invoice.lineItems.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                              البنود
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-stone-100">
                                    <th className="text-right py-2 px-3 text-gray-500 font-medium">
                                      الوصف
                                    </th>
                                    <th className="text-center py-2 px-3 text-gray-500 font-medium">
                                      الكمية
                                    </th>
                                    <th className="text-center py-2 px-3 text-gray-500 font-medium">
                                      سعر الوحدة
                                    </th>
                                    <th className="text-center py-2 px-3 text-gray-500 font-medium">
                                      الإجمالي
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(invoice.lineItems as any[]).map(
                                    (item: any, idx: number) => (
                                      <tr
                                        key={idx}
                                        className="border-b border-stone-50"
                                      >
                                        <td className="py-2.5 px-3 text-gray-800">
                                          {item.description}
                                        </td>
                                        <td className="py-2.5 px-3 text-center">
                                          {item.qty}
                                        </td>
                                        <td className="py-2.5 px-3 text-center">
                                          {Number(
                                            item.unitPrice
                                          ).toLocaleString()}
                                        </td>
                                        <td className="py-2.5 px-3 text-center font-semibold">
                                          {Number(
                                            item.lineTotal
                                          ).toLocaleString()}
                                        </td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                      {/* الإجماليات */}
                      <div className="bg-gradient-to-r from-stone-50 to-amber-50 rounded-xl p-4">
                        <div className="space-y-2 max-w-xs mr-auto">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              المبلغ قبل الضريبة
                            </span>
                            <span className="font-semibold">
                              {halaToSar(invoice.subtotalHalala)} ر.س
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              ضريبة القيمة المضافة ({invoice.vatRate}%)
                            </span>
                            <span className="font-semibold text-amber-700">
                              {halaToSar(invoice.vatAmountHalala)} ر.س
                            </span>
                          </div>
                          <div className="border-t border-stone-200 pt-2 flex justify-between">
                            <span className="font-bold text-gray-900">
                              الإجمالي
                            </span>
                            <span className="font-bold text-lg text-amber-800">
                              {halaToSar(invoice.totalHalala)} ر.س
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* QR Code */}
                      {invoice.qrCodeData && (
                        <div className="flex flex-col items-center gap-3 py-2">
                          <div className="text-xs text-gray-400 flex items-center gap-1">
                            <QrCode className="w-3.5 h-3.5" />
                            رمز QR للفاتورة (متوافق مع ZATCA)
                          </div>
                          <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-sm">
                            {/* QR كصورة base64 TLV — نعرض placeholder توضيحي */}
                            <div className="w-28 h-28 bg-stone-100 rounded-lg flex items-center justify-center">
                              <QrCode className="w-16 h-16 text-stone-400" />
                            </div>
                          </div>
                          <div className="text-[10px] text-gray-300 font-mono break-all max-w-xs text-center">
                            {invoice.qrCodeData.slice(0, 40)}…
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/* TAB: الشكاوى                                        */}
        {/* ════════════════════════════════════════════════════ */}
        {tab === "complaints" && (
          <div className="space-y-5">
            {/* نموذج شكوى جديدة */}
            {!submittingComplaint && (
              <div className="bg-white rounded-2xl border border-stone-100 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
                    <MessageSquareWarning className="w-4 h-4 text-red-500" />
                  </div>
                  <h3 className="font-bold text-gray-900">تقديم شكوى جديدة</h3>
                </div>

                <form onSubmit={handleComplaintSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm text-gray-700">
                        رقم الطلب *
                      </Label>
                      <Input
                        placeholder="مثال: 123"
                        value={complaintForm.orderNumber}
                        onChange={e =>
                          setComplaintForm(f => ({
                            ...f,
                            orderNumber: e.target.value,
                          }))
                        }
                        className="rounded-xl border-stone-200 focus:border-amber-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-gray-700">المنتج *</Label>
                      <Input
                        placeholder="اسم المنتج"
                        value={complaintForm.product}
                        onChange={e =>
                          setComplaintForm(f => ({
                            ...f,
                            product: e.target.value,
                          }))
                        }
                        className="rounded-xl border-stone-200 focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm text-gray-700">
                      نوع الشكوى *
                    </Label>
                    <select
                      value={complaintForm.type}
                      onChange={e =>
                        setComplaintForm(f => ({
                          ...f,
                          type: e.target.value as any,
                        }))
                      }
                      className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    >
                      {COMPLAINT_TYPES.map(ct => (
                        <option key={ct.value} value={ct.value}>
                          {ct.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm text-gray-700">
                      تفاصيل الشكوى *
                    </Label>
                    <Textarea
                      placeholder="اشرح مشكلتك بالتفصيل..."
                      value={complaintForm.description}
                      onChange={e =>
                        setComplaintForm(f => ({
                          ...f,
                          description: e.target.value,
                        }))
                      }
                      rows={4}
                      className="rounded-xl border-stone-200 focus:border-amber-400 resize-none"
                    />
                    <div className="text-xs text-gray-400 text-left">
                      {complaintForm.description.length} حرف
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitComplaintMutation.isPending}
                    className="w-full bg-amber-700 hover:bg-amber-800 text-white rounded-xl py-3 font-semibold"
                  >
                    {submitComplaintMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin me-2" />
                    ) : (
                      <Send className="w-4 h-4 me-2" />
                    )}
                    {submitComplaintMutation.isPending
                      ? "جاري الإرسال..."
                      : "إرسال الشكوى"}
                  </Button>
                </form>
              </div>
            )}

            {/* سجل الشكاوى */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                سجل شكاواي ({complaints.length})
              </h3>

              {complaintsQ.isLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <div
                      key={i}
                      className="h-24 bg-white rounded-2xl border border-stone-100 animate-pulse"
                    />
                  ))}
                </div>
              ) : complaints.length === 0 ? (
                <div className="bg-white rounded-2xl border border-stone-100 p-10 text-center shadow-sm">
                  <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    لا توجد شكاوى مسجلة — شكراً على ثقتك بنا!
                  </p>
                </div>
              ) : (
                complaints.map(complaint => {
                  const cs =
                    COMPLAINT_STATUS_MAP[complaint.status] ??
                    COMPLAINT_STATUS_MAP.open;
                  const complaintType =
                    COMPLAINT_TYPES.find(ct => ct.value === complaint.type)
                      ?.label ?? complaint.type;

                  return (
                    <div
                      key={complaint.id}
                      className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-gray-400">
                              {complaint.ticketNumber}
                            </span>
                            <Badge
                              className="text-xs border-0 px-2 py-0.5"
                              style={{
                                background: `${cs.color}18`,
                                color: cs.color,
                              }}
                            >
                              {cs.label}
                            </Badge>
                          </div>
                          <div className="font-semibold text-gray-900">
                            {complaint.product}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            طلب #{complaint.orderNumber} · {complaintType}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 flex-shrink-0">
                          {new Date(complaint.createdAt).toLocaleDateString(
                            "ar-SA"
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mt-3 leading-relaxed line-clamp-2">
                        {complaint.description}
                      </p>

                      {/* الردود */}
                      {complaint.messages.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                            المحادثة
                          </div>
                          {complaint.messages.map(msg => (
                            <div
                              key={msg.id}
                              className={`flex gap-2 ${msg.from === "admin" ? "" : "flex-row-reverse"}`}
                            >
                              <div
                                className={`text-xs px-3 py-2 rounded-xl max-w-[80%] leading-relaxed ${
                                  msg.from === "admin"
                                    ? "bg-blue-50 text-blue-800"
                                    : "bg-stone-100 text-gray-700"
                                }`}
                              >
                                <div
                                  className={`text-[10px] mb-1 font-semibold ${
                                    msg.from === "admin"
                                      ? "text-blue-400"
                                      : "text-gray-400"
                                  }`}
                                >
                                  {msg.from === "admin" ? "فريق سنديان" : "أنت"}{" "}
                                  · {msg.date}
                                </div>
                                {msg.text}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {complaint.status === "resolved" &&
                        complaint.satisfactionRating != null && (
                          <div className="flex items-center gap-1 mt-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < (complaint.satisfactionRating ?? 0)
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-gray-200"
                                }`}
                              />
                            ))}
                            <span className="text-xs text-gray-400 mr-1">
                              تقييمك
                            </span>
                          </div>
                        )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 pb-8 pt-4 text-center">
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} سنديان للأبواب الخشبية · جميع الحقوق
          محفوظة
        </p>
      </div>
    </div>
  );
}
