// ============================================================
// Company Purchase Orders Page - Sindian Doors B2B Portal
// Design: Architectural Luxury | Oak Green + Copper + Beige
// ============================================================

import { useState } from "react";
import { useParams, Link } from "wouter";
import CompanyLayout from "@/components/company/CompanyLayout";
import {
  mockPurchaseOrders, poStatusLabels, poStatusColors,
  poProgressSteps, getPoProgressIndex, PurchaseOrder, POStatus,
} from "@/lib/companyData";
import {
  Package, Search, Filter, ChevronRight, Calendar, MapPin,
  ArrowLeft, Download, MessageSquare, CheckCircle2, Clock,
  Truck, Factory, ShieldCheck, Star, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── PO List ─────────────────────────────────────────────────

export function CompanyOrdersList() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<POStatus | "all">("all");
  const { dir } = useLanguage();

  const filtered = mockPurchaseOrders.filter((p) => {
    const matchSearch = p.projectName.includes(search) || p.poNumber.includes(search);
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusGroups: { value: POStatus | "all"; label: string }[] = dir === "rtl" ? [
    { value: "all", label: "الكل" },
    { value: "submitted", label: "تم الإرسال" },
    { value: "confirmed", label: "مؤكد" },
    { value: "manufacturing", label: "التصنيع" },
    { value: "quality_check", label: "فحص الجودة" },
    { value: "shipped", label: "تم الشحن" },
    { value: "delivered", label: "مُسلَّم" },
  ] : [
    { value: "all", label: "All" },
    { value: "submitted", label: "Submitted" },
    { value: "confirmed", label: "Confirmed" },
    { value: "manufacturing", label: "Manufacturing" },
    { value: "quality_check", label: "Quality Check" },
    { value: "shipped", label: "Shipped" },
    { value: "delivered", label: "Delivered" },
  ];

  const getStatusIcon = (status: POStatus) => {
    const icons: Partial<Record<POStatus, React.ReactNode>> = {
      submitted: <FileText className="w-4 h-4" />,
      confirmed: <CheckCircle2 className="w-4 h-4" />,
      manufacturing: <Factory className="w-4 h-4" />,
      quality_check: <ShieldCheck className="w-4 h-4" />,
      ready: <Package className="w-4 h-4" />,
      shipped: <Truck className="w-4 h-4" />,
      delivered: <Star className="w-4 h-4" />,
    };
    return icons[status] ?? <Clock className="w-4 h-4" />;
  };

  return (
    <CompanyLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#2C4A3E", fontFamily: "'DM Serif Display', serif" }}>
            {dir === "rtl" ? "أوامر الشراء" : "Purchase Orders"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {mockPurchaseOrders.length} {dir === "rtl" ? "أمر شراء إجمالي" : "total purchase orders"}
          </p>
        </div>
        <Link href="/b2b">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "#2C4A3E", color: "white" }}
          >
            <Package className="w-4 h-4" />
            {dir === "rtl" ? "أمر شراء جديد" : "New Purchase Order"}
          </button>
        </Link>
      </div>

      {/* Filters */}
      <div
        className="rounded-2xl p-4 mb-4 border flex flex-col sm:flex-row gap-3"
        style={{ background: "white", borderColor: "#E8DFD0" }}
      >
        <div className="relative flex-1">
          <Search className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
          <input
            type="text"
            placeholder={dir === "rtl" ? "ابحث باسم المشروع أو رقم الأمر..." : "Search by project name or order number..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full ${dir === "rtl" ? "pr-9 pl-4" : "pl-9 pr-4"} py-2 text-sm rounded-xl border outline-none focus:ring-1`}
            style={{ borderColor: "#E8DFD0", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          {statusGroups.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={
                filterStatus === opt.value
                  ? { background: "#2C4A3E", color: "white" }
                  : { background: "#E8DFD0", color: "#2C4A3E" }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{dir === "rtl" ? "لا توجد نتائج" : "No results found"}</p>
          </div>
        ) : (
          filtered.map((po) => {
            const progressIdx = getPoProgressIndex(po.status);
            const totalSteps = poProgressSteps.length - 1;
            const progressPct = po.status === "delivered" ? 100 : Math.round((progressIdx / totalSteps) * 100);

            return (
              <Link key={po.id} href={`/company/orders/${po.id}`}>
                <div
                  className="rounded-2xl border p-5 hover:shadow-md transition-all cursor-pointer group"
                  style={{ background: "white", borderColor: "#E8DFD0" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(44,74,62,0.08)" }}
                      >
                        <span style={{ color: "#2C4A3E" }}>{getStatusIcon(po.status)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm" style={{ color: "#2C4A3E" }}>{po.projectName}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
                          <span>{po.poNumber}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{po.city}</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(po.submittedDate).toLocaleDateString(dir === "rtl" ? "ar-SA" : "en-US")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={`${dir === "rtl" ? "text-left" : "text-right"} flex-shrink-0 space-y-1`}>
                      <span className={`text-xs px-2 py-0.5 rounded-full block text-center ${poStatusColors[po.status]}`}>
                        {poStatusLabels[po.status]}
                      </span>
                      <p className="font-bold text-sm text-center" style={{ color: "#C4956A", fontFamily: "'DM Serif Display', serif" }}>
                        {po.totalAmount.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 mt-1" />
                  </div>

                  {/* Progress bar */}
                  {po.status !== "cancelled" && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-gray-400">{dir === "rtl" ? "التقدم" : "Progress"}</span>
                        <span className="text-xs font-medium" style={{ color: "#2C4A3E" }}>{progressPct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#E8DFD0" }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${progressPct}%`,
                            background: po.status === "delivered" ? "#16a34a" : "#2C4A3E",
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-400">{dir === "rtl" ? "الإرسال" : "Submitted"}</span>
                        <span className="text-xs text-gray-400">{dir === "rtl" ? "التسليم" : "Delivered"}</span>
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </CompanyLayout>
  );
}

// ─── PO Detail ───────────────────────────────────────────────

export function CompanyOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { dir } = useLanguage();
  const po = mockPurchaseOrders.find((p) => p.id === id);

  if (!po) {
    return (
      <CompanyLayout>
        <div className="text-center py-20 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{dir === "rtl" ? "أمر الشراء غير موجود" : "Purchase order not found"}</p>
          <Link href="/company/orders">
            <button className="mt-4 text-sm underline" style={{ color: "#C4956A" }}>
              {dir === "rtl" ? "العودة للقائمة" : "Back to list"}
            </button>
          </Link>
        </div>
      </CompanyLayout>
    );
  }

  const currentIdx = getPoProgressIndex(po.status);

  const stepIcons: Record<POStatus, React.ReactNode> = {
    draft: <FileText className="w-4 h-4" />,
    submitted: <FileText className="w-4 h-4" />,
    confirmed: <CheckCircle2 className="w-4 h-4" />,
    manufacturing: <Factory className="w-4 h-4" />,
    quality_check: <ShieldCheck className="w-4 h-4" />,
    ready: <Package className="w-4 h-4" />,
    shipped: <Truck className="w-4 h-4" />,
    delivered: <Star className="w-4 h-4" />,
    cancelled: <Clock className="w-4 h-4" />,
  };

  const stepLabels: Record<POStatus, string> = dir === "rtl" ? {
    draft: "مسودة", submitted: "الإرسال", confirmed: "التأكيد",
    manufacturing: "التصنيع", quality_check: "فحص الجودة",
    ready: "جاهز", shipped: "الشحن", delivered: "التسليم", cancelled: "ملغي",
  } : {
    draft: "Draft", submitted: "Submitted", confirmed: "Confirmed",
    manufacturing: "Manufacturing", quality_check: "Quality Check",
    ready: "Ready", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled",
  };

  const paymentStatusLabel = dir === "rtl"
    ? (po.paymentStatus === "paid" ? "مدفوع" : po.paymentStatus === "partial" ? "جزئي" : "غير مدفوع")
    : (po.paymentStatus === "paid" ? "Paid" : po.paymentStatus === "partial" ? "Partial" : "Unpaid");

  const orderDetails = dir === "rtl" ? [
    { label: "رقم الأمر", value: po.poNumber },
    ...(po.rfqRef ? [{ label: "مرجع عرض السعر", value: po.rfqRef }] : []),
    { label: "تاريخ الإرسال", value: new Date(po.submittedDate).toLocaleDateString("ar-SA") },
    { label: "التسليم المتوقع", value: new Date(po.expectedDelivery).toLocaleDateString("ar-SA") },
    ...(po.actualDelivery ? [{ label: "تاريخ التسليم الفعلي", value: new Date(po.actualDelivery).toLocaleDateString("ar-SA") }] : []),
    { label: "شروط الدفع", value: po.paymentTerms },
    { label: "حالة الدفع", value: paymentStatusLabel },
    ...(po.invoiceNumber ? [{ label: "رقم الفاتورة", value: po.invoiceNumber }] : []),
  ] : [
    { label: "Order Number", value: po.poNumber },
    ...(po.rfqRef ? [{ label: "RFQ Reference", value: po.rfqRef }] : []),
    { label: "Submitted Date", value: new Date(po.submittedDate).toLocaleDateString("en-US") },
    { label: "Expected Delivery", value: new Date(po.expectedDelivery).toLocaleDateString("en-US") },
    ...(po.actualDelivery ? [{ label: "Actual Delivery", value: new Date(po.actualDelivery).toLocaleDateString("en-US") }] : []),
    { label: "Payment Terms", value: po.paymentTerms },
    { label: "Payment Status", value: paymentStatusLabel },
    ...(po.invoiceNumber ? [{ label: "Invoice Number", value: po.invoiceNumber }] : []),
  ];

  return (
    <CompanyLayout>
      {/* Header */}
      <div className="mb-6">
        <Link href="/company/orders">
          <button className="flex items-center gap-1 text-sm mb-3 hover:underline" style={{ color: "#C4956A" }}>
            <ArrowLeft className="w-3.5 h-3.5" />
            {dir === "rtl" ? "أوامر الشراء" : "Purchase Orders"}
          </button>
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#2C4A3E", fontFamily: "'DM Serif Display', serif" }}>
              {po.projectName}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{po.poNumber} · {po.city}</p>
          </div>
          <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${poStatusColors[po.status]}`}>
            {poStatusLabels[po.status]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main */}
        <div className="lg:col-span-2 space-y-4">
          {/* Visual progress timeline */}
          <div className="rounded-2xl border p-5" style={{ background: "white", borderColor: "#E8DFD0" }}>
            <h3 className="font-semibold text-sm mb-5" style={{ color: "#2C4A3E" }}>
              {dir === "rtl" ? "مراحل الطلب" : "Order Stages"}
            </h3>

            <div className="relative">
              <div className="absolute top-5 right-5 left-5 h-0.5" style={{ background: "#E8DFD0" }}>
                <div
                  className="h-full transition-all duration-700"
                  style={{
                    width: po.status === "delivered" ? "100%" : `${Math.max(0, (currentIdx / (poProgressSteps.length - 1)) * 100)}%`,
                    background: "#2C4A3E",
                  }}
                />
              </div>

              <div className="flex justify-between relative z-10">
                {poProgressSteps.map((step, i) => {
                  const done = i <= currentIdx;
                  const active = i === currentIdx;
                  return (
                    <div key={step} className="flex flex-col items-center gap-2">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all"
                        style={{
                          background: done ? "#2C4A3E" : "white",
                          borderColor: done ? "#2C4A3E" : "#E8DFD0",
                          boxShadow: active ? "0 0 0 4px rgba(44,74,62,0.15)" : "none",
                        }}
                      >
                        <span style={{ color: done ? "white" : "#9ca3af" }}>
                          {stepIcons[step]}
                        </span>
                      </div>
                      <span
                        className="text-xs text-center hidden sm:block"
                        style={{ color: done ? "#2C4A3E" : "#9ca3af" }}
                      >
                        {stepLabels[step]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* History */}
            <div className="mt-6 space-y-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {dir === "rtl" ? "سجل الأحداث" : "Event History"}
              </p>
              <div className="relative">
                <div className={`absolute top-0 bottom-0 ${dir === "rtl" ? "right-3" : "left-3"} w-0.5`} style={{ background: "#E8DFD0" }} />
                <div className="space-y-4">
                  {[...po.statusHistory].reverse().map((h, i) => (
                    <div key={i} className={`flex items-start gap-4 relative ${dir === "rtl" ? "" : "flex-row-reverse"}`}>
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2"
                        style={{
                          background: i === 0 ? "#2C4A3E" : "white",
                          borderColor: i === 0 ? "#2C4A3E" : "#E8DFD0",
                        }}
                      >
                        {i === 0 ? (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#E8DFD0" }} />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${poStatusColors[h.status]}`}>
                            {poStatusLabels[h.status]}
                          </span>
                          <span className="text-xs text-gray-400">{h.date}</span>
                        </div>
                        {h.note && <p className="text-xs text-gray-600 mt-1">{h.note}</p>}
                        <div className="flex items-center gap-3 mt-1">
                          {h.by && <span className="text-xs text-gray-400">{dir === "rtl" ? "بواسطة:" : "By:"} {h.by}</span>}
                          {h.location && (
                            <span className="text-xs flex items-center gap-1 text-gray-400">
                              <MapPin className="w-3 h-3" />{h.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Items table */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: "white", borderColor: "#E8DFD0" }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: "#E8DFD0" }}>
              <h3 className="font-semibold text-sm" style={{ color: "#2C4A3E" }}>
                {dir === "rtl" ? "تفاصيل المنتجات" : "Product Details"}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#FAF8F5" }}>
                    <th className={`${dir === "rtl" ? "text-right" : "text-left"} px-5 py-2.5 text-xs font-semibold text-gray-500`}>
                      {dir === "rtl" ? "المنتج" : "Product"}
                    </th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500">
                      {dir === "rtl" ? "الكمية" : "Qty"}
                    </th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500">
                      {dir === "rtl" ? "سعر الوحدة" : "Unit Price"}
                    </th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500">
                      {dir === "rtl" ? "الخصم" : "Discount"}
                    </th>
                    <th className={`${dir === "rtl" ? "text-left" : "text-right"} px-5 py-2.5 text-xs font-semibold text-gray-500`}>
                      {dir === "rtl" ? "الإجمالي" : "Total"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {po.items.map((item, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: "#E8DFD0" }}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-sm" style={{ color: "#2C4A3E" }}>{item.productName}</p>
                        <p className="text-xs text-gray-400">{item.sku}</p>
                      </td>
                      <td className="px-4 py-3 text-center text-sm">{item.quantity}</td>
                      <td className="px-4 py-3 text-center text-sm">
                        {item.unitPrice.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">{item.discount}%</span>
                      </td>
                      <td className={`px-5 py-3 ${dir === "rtl" ? "text-left" : "text-right"} font-semibold text-sm`} style={{ color: "#C4956A" }}>
                        {item.total.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t" style={{ borderColor: "#E8DFD0", background: "#FAF8F5" }}>
                    <td colSpan={4} className={`px-5 py-2.5 text-sm text-gray-500 ${dir === "rtl" ? "text-left" : "text-right"}`}>
                      {dir === "rtl" ? "المجموع قبل الضريبة" : "Subtotal before tax"}
                    </td>
                    <td className={`px-5 py-2.5 ${dir === "rtl" ? "text-left" : "text-right"} font-semibold text-sm`} style={{ color: "#2C4A3E" }}>
                      {po.subtotal.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}
                    </td>
                  </tr>
                  <tr className="border-t" style={{ borderColor: "#E8DFD0", background: "#FAF8F5" }}>
                    <td colSpan={4} className={`px-5 py-2 text-sm text-gray-500 ${dir === "rtl" ? "text-left" : "text-right"}`}>
                      {dir === "rtl" ? "ضريبة القيمة المضافة (15%)" : "VAT (15%)"}
                    </td>
                    <td className={`px-5 py-2 ${dir === "rtl" ? "text-left" : "text-right"} text-sm text-gray-500`}>
                      {po.vatAmount.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}
                    </td>
                  </tr>
                  <tr className="border-t-2" style={{ borderColor: "#2C4A3E", background: "#FAF8F5" }}>
                    <td colSpan={4} className={`px-5 py-3 font-bold text-sm ${dir === "rtl" ? "text-left" : "text-right"}`} style={{ color: "#2C4A3E" }}>
                      {dir === "rtl" ? "الإجمالي الكلي" : "Grand Total"}
                    </td>
                    <td className={`px-5 py-3 ${dir === "rtl" ? "text-left" : "text-right"} font-bold text-base`} style={{ color: "#C4956A", fontFamily: "'DM Serif Display', serif" }}>
                      {po.totalAmount.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Tracking */}
          {po.trackingNumber && (
            <div className="rounded-2xl border p-5" style={{ background: "#2C4A3E" }}>
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-4 h-4 text-white/70" />
                <p className="text-sm font-semibold text-white/70">
                  {dir === "rtl" ? "رقم التتبع" : "Tracking Number"}
                </p>
              </div>
              <p className="text-white font-bold text-lg" style={{ fontFamily: "'DM Serif Display', serif", direction: "ltr" }}>
                {po.trackingNumber}
              </p>
              <button
                onClick={() => toast.info(dir === "rtl" ? "جاري فتح صفحة التتبع..." : "Opening tracking page...")}
                className="mt-3 w-full py-2 rounded-xl text-xs font-medium"
                style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
              >
                {dir === "rtl" ? "تتبع الشحنة" : "Track Shipment"}
              </button>
            </div>
          )}

          {/* Order details */}
          <div className="rounded-2xl border p-5" style={{ background: "white", borderColor: "#E8DFD0" }}>
            <h3 className="font-semibold text-sm mb-4" style={{ color: "#2C4A3E" }}>
              {dir === "rtl" ? "تفاصيل الأمر" : "Order Details"}
            </h3>
            <div className="space-y-3">
              {orderDetails.map((d, i) => (
                <div key={i} className="flex justify-between items-start gap-2">
                  <span className="text-xs text-gray-400 flex-shrink-0">{d.label}</span>
                  <span className={`text-xs font-medium ${dir === "rtl" ? "text-left" : "text-right"}`} style={{ color: "#2C4A3E" }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery address */}
          <div className="rounded-2xl border p-4" style={{ background: "rgba(44,74,62,0.04)", borderColor: "rgba(44,74,62,0.12)" }}>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4" style={{ color: "#2C4A3E" }} />
              <p className="text-xs font-semibold" style={{ color: "#2C4A3E" }}>
                {dir === "rtl" ? "عنوان التسليم" : "Delivery Address"}
              </p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{po.deliveryAddress}</p>
            <p className="text-xs text-gray-400 mt-1">{po.city}</p>
          </div>

          {/* Notes */}
          {po.notes && (
            <div className="rounded-2xl border p-4" style={{ background: "rgba(196,149,106,0.06)", borderColor: "rgba(196,149,106,0.2)" }}>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4" style={{ color: "#C4956A" }} />
                <p className="text-xs font-semibold" style={{ color: "#C4956A" }}>
                  {dir === "rtl" ? "ملاحظات" : "Notes"}
                </p>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{po.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={() => toast.info(dir === "rtl" ? "جاري تحميل الفاتورة..." : "Downloading invoice...")}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm border font-medium"
              style={{ borderColor: "#E8DFD0", color: "#2C4A3E" }}
            >
              <Download className="w-4 h-4" />
              {dir === "rtl" ? "تحميل الفاتورة PDF" : "Download Invoice PDF"}
            </button>
            <button
              onClick={() => toast.info(dir === "rtl" ? "تم إرسال رسالتك لمدير الحساب" : "Your message has been sent to the account manager")}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm border font-medium"
              style={{ borderColor: "#E8DFD0", color: "#2C4A3E" }}
            >
              <MessageSquare className="w-4 h-4" />
              {dir === "rtl" ? "تواصل مع الدعم" : "Contact Support"}
            </button>
          </div>
        </div>
      </div>
    </CompanyLayout>
  );
}
