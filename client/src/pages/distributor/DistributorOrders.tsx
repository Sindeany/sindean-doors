// ============================================================
// Distributor Orders Page - Sindian Doors
// Design: Architectural Luxury | Full order management with tracking
// ============================================================

import { useState } from "react";
import { useLocation } from "wouter";
import { useDistributorAuth } from "@/contexts/DistributorAuthContext";
import DistributorLayout from "@/components/distributor/DistributorLayout";
import NewOrderWizard, { KEY_TRANSLATIONS } from "@/components/distributor/NewOrderWizard";
import {
  orderStatusConfig,
  paymentStatusConfig,
  DistributorOrder,
} from "@/lib/distributorData";
import { trpc } from "@/lib/trpc";
import {
  Search, Filter, ChevronDown, ChevronUp,
  Truck, Package, Clock, CheckCircle2, XCircle,
  Eye, Download, Plus, RefreshCw, Loader2, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const STATUS_STEPS = ["pending", "confirmed", "manufacturing", "shipped", "delivered"];

const STAGE_LABELS: Record<string, { ar: string; en: string }> = {
  po_review: { ar: "مراجعة أمر الشراء", en: "PO Review" },
  catalog_match: { ar: "مطابقة الكتالوج", en: "Catalog Match" },
  job_order_file: { ar: "ملف الطلب الفني", en: "Job Order File" },
  sample_approval: { ar: "اعتماد العينة", en: "Sample Approval" },
  production_planning: { ar: "تخطيط الإنتاج", en: "Production Planning" },
  material_procurement: { ar: "تأمين المواد الخام", en: "Material Procurement" },
  incoming_qc: { ar: "فحص المواد الداخلة", en: "Incoming QC" },
  work_order: { ar: "أمر التشغيل الداخلي", en: "Work Order" },
  final_qc: { ar: "الفحص النهائي", en: "Final QC" },
  po_matching: { ar: "مطابقة أمر الشراء", en: "PO Matching" },
  packing: { ar: "التغليف", en: "Packing" },
  delivery_docs: { ar: "مستندات التسليم", en: "Delivery Docs" },
  delivery: { ar: "التسليم والشحن", en: "Delivery" },
  accounting_close: { ar: "الإغلاق المحاسبي", en: "Accounting Close" },
  post_order_review: { ar: "تقييم الطلب", en: "Post-Order Review" },
};

function OrderTracker({ status }: { status: DistributorOrder["status"] }) {
  const { dir } = useLanguage();
  const currentStep = STATUS_STEPS.indexOf(status);
  const steps = dir === "rtl" ? [
    { label: "استلام الطلب", icon: Clock },
    { label: "تأكيد الطلب", icon: CheckCircle2 },
    { label: "التصنيع", icon: Package },
    { label: "الشحن", icon: Truck },
    { label: "التسليم", icon: CheckCircle2 },
  ] : [
    { label: "Received", icon: Clock },
    { label: "Confirmed", icon: CheckCircle2 },
    { label: "Manufacturing", icon: Package },
    { label: "Shipped", icon: Truck },
    { label: "Delivered", icon: CheckCircle2 },
  ];

  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 text-red-500 text-sm py-2">
        <XCircle className="w-4 h-4" />
        <span>{dir === "rtl" ? "تم إلغاء الطلب" : "Order cancelled"}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {steps.map(({ label, icon: Icon }, i) => {
        const done = i <= currentStep;
        const active = i === currentStep;
        return (
          <div key={i} className="flex items-center gap-1 flex-shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: done ? "oklch(0.38 0.06 160)" : "#e5e7eb",
                  boxShadow: active ? "0 0 0 3px oklch(0.38 0.06 160 / 0.2)" : "none",
                }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: done ? "white" : "#9ca3af" }} />
              </div>
              <span
                className="text-xs whitespace-nowrap"
                style={{
                  color: done ? "oklch(0.38 0.06 160)" : "#9ca3af",
                  fontWeight: active ? "600" : "400",
                }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="h-0.5 w-8 mb-4 flex-shrink-0"
                style={{ background: i < currentStep ? "oklch(0.38 0.06 160)" : "#e5e7eb" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function OrderCard({ order, onReorder }: { order: DistributorOrder; onReorder: (order: DistributorOrder) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { dir } = useLanguage();
  const statusCfg = orderStatusConfig[order.status];
  const paymentCfg = paymentStatusConfig[order.paymentStatus];

  const tableHeaders = dir === "rtl"
    ? ["المنتج", "الكمية", "سعر الوحدة", "الإجمالي"]
    : ["Product", "Qty", "Unit Price", "Total"];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div>
            <div className="font-mono text-sm font-bold" style={{ color: "oklch(0.38 0.06 160)" }}>
              {order.orderNumber}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{order.date}</div>
          </div>
          <div className="hidden sm:block">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
          </div>
          <div className="hidden sm:block">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${paymentCfg.color}`}>
              {paymentCfg.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className={dir === "rtl" ? "text-right" : "text-left"}>
            <div className="font-bold" style={{ color: "oklch(0.25 0.04 160)", fontFamily: "DM Serif Display, serif" }}>
              {order.totalAmount.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}
            </div>
            <div className="text-xs text-gray-400">
              {order.products.reduce((s, p) => s + p.qty, 0)} {dir === "rtl" ? "وحدة" : "units"}
            </div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100">
          {/* Status tracker */}
          <div className="py-4">
            <p className="text-xs text-gray-400 mb-3">{dir === "rtl" ? "تتبع الطلب" : "Order Tracking"}</p>
            <OrderTracker status={order.status} />
          </div>

          {/* Products table */}
          <div className="rounded-xl overflow-hidden border border-gray-100 mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "oklch(0.98 0.005 80)" }}>
                  {tableHeaders.map((h) => (
                    <th
                      key={h}
                      className={`px-3 py-2 ${dir === "rtl" ? "text-right" : "text-left"} text-xs font-medium`}
                      style={{ color: "oklch(0.45 0.03 160)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {order.products.map((p, i) => (
                  <tr key={i} className="border-t border-gray-50">
                    <td className="px-3 py-2 text-gray-700">{p.name}</td>
                    <td className="px-3 py-2 text-gray-500">{p.qty}</td>
                    <td className="px-3 py-2 text-gray-500">
                      {p.unitPrice.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}
                    </td>
                    <td className="px-3 py-2 font-medium" style={{ color: "oklch(0.38 0.06 160)" }}>
                      {p.total.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200">
                  <td colSpan={3} className={`px-3 py-2 ${dir === "rtl" ? "text-left" : "text-right"} font-bold text-sm`} style={{ color: "oklch(0.25 0.04 160)" }}>
                    {dir === "rtl" ? "الإجمالي" : "Total"}
                  </td>
                  <td className="px-3 py-2 font-bold" style={{ color: "oklch(0.38 0.06 160)" }}>
                    {order.totalAmount.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Meta info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg p-3" style={{ background: "oklch(0.98 0.005 80)" }}>
              <div className="text-xs text-gray-400 mb-1">
                {dir === "rtl" ? "تاريخ التسليم المتوقع" : "Expected Delivery"}
              </div>
              <div className="text-sm font-medium" style={{ color: "oklch(0.35 0.04 160)" }}>
                {order.deliveryDate}
              </div>
            </div>
            {order.trackingNumber && (
              <div className="rounded-lg p-3" style={{ background: "oklch(0.98 0.005 80)" }}>
                <div className="text-xs text-gray-400 mb-1">
                  {dir === "rtl" ? "رقم التتبع" : "Tracking Number"}
                </div>
                <div className="text-sm font-mono font-medium" style={{ color: "oklch(0.38 0.06 160)" }}>
                  {order.trackingNumber}
                </div>
              </div>
            )}
            {order.notes && (
              <div className="rounded-lg p-3 col-span-2 sm:col-span-1" style={{ background: "oklch(0.98 0.005 80)" }}>
                <div className="text-xs text-gray-400 mb-1">{dir === "rtl" ? "ملاحظات" : "Notes"}</div>
                <div className="text-sm text-gray-600">{order.notes}</div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => toast.info(dir === "rtl" ? "تحميل الفاتورة - قريباً" : "Download invoice - coming soon")}
            >
              <Download className="w-3.5 h-3.5" />
              {dir === "rtl" ? "تحميل الفاتورة" : "Download Invoice"}
            </Button>
            {order.trackingNumber && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => toast.info(`${dir === "rtl" ? "رقم التتبع:" : "Tracking:"} ${order.trackingNumber}`)}
              >
                <Truck className="w-3.5 h-3.5" />
                {dir === "rtl" ? "تتبع الشحنة" : "Track Shipment"}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => setShowDetails(true)}
            >
              <Eye className="w-3.5 h-3.5" />
              {dir === "rtl" ? "عرض كامل" : "Full View"}
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-xs text-white"
              style={{ background: "oklch(0.38 0.06 160)" }}
              onClick={() => onReorder(order)}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {dir === "rtl" ? "إعادة الطلب" : "Reorder"}
            </Button>
          </div>
        </div>
      )}

      {showDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-right" dir={dir}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold font-mono" style={{ color: "oklch(0.25 0.04 160)" }}>
                  {dir === "rtl" ? `تفاصيل الطلب: ${order.orderNumber}` : `Order Details: ${order.orderNumber}`}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{order.date}</p>
              </div>
              <button onClick={() => setShowDetails(false)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status Section */}
              <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <p className="text-xs font-semibold text-gray-400 mb-3">{dir === "rtl" ? "حالة الطلب" : "Order Status"}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusCfg.color} border`}>
                    {statusCfg.label}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${paymentCfg.color} border`}>
                    {paymentCfg.label}
                  </span>
                </div>
                <OrderTracker status={order.status} />
              </div>

              {/* Items List */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-gray-700">{dir === "rtl" ? "المنتجات المطلوبة" : "Ordered Items"}</h4>
                <div className="space-y-3">
                  {order.products.map((p: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl border border-gray-100 bg-white space-y-3">
                      {/* Product Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-bold text-sm" style={{ color: "oklch(0.25 0.04 160)" }}>
                            {p.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {p.woodType || "—"} · {p.color || "—"} · {p.width && p.height ? `${p.width}×${p.height}×${p.thickness || 4} سم` : "—"}
                          </div>
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-xs text-gray-400">{dir === "rtl" ? "الالكمية" : "Qty"}: {p.qty}</div>
                          <div className="font-bold text-sm" style={{ color: 'oklch(0.38 0.06 160)' }}>{p.total.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}</div>
                        </div>
                      </div>

                      {/* Workflow Stage */}
                      {p.workflowStage && (
                        <div className="flex items-center gap-2 pt-2.5 border-t border-dashed border-gray-100 text-xs">
                          <span className="text-gray-405">{dir === "rtl" ? "مرحلة الإنتاج الحالية:" : "Current Stage:"}</span>
                          <span
                            className="px-2 py-0.5 rounded text-[11px] font-semibold"
                            style={{
                              background: "oklch(0.97 0.02 160)",
                              color: "oklch(0.38 0.06 160)",
                              border: "1px solid oklch(0.90 0.04 160)"
                            }}
                          >
                            {dir === "rtl"
                              ? STAGE_LABELS[p.workflowStage]?.ar || p.workflowStage
                              : STAGE_LABELS[p.workflowStage]?.en || p.workflowStage}
                          </span>
                        </div>
                      )}

                      {/* Custom Selections */}
                      {p.selections && Object.keys(p.selections).length > 0 && (
                        <div className="pt-2.5 border-t border-dashed border-gray-100">
                          <div className="text-xs text-gray-400 mb-1.5 font-medium">{dir === "rtl" ? "الخيارات المحددة:" : "Selected Options:"}</div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(p.selections).map(([key, val]) => {
                              if (["width", "door_leaf_height", "wall_thickness", "material", "color_choice"].includes(key)) return null;
                              const label = KEY_TRANSLATIONS[key] || key.replace(/_/g, " ");
                              const cleanVal = val === "true" ? "نعم" : val === "false" ? "لا" : val;
                              return (
                                <span key={key} className="bg-gray-50 text-[10px] text-gray-650 px-2 py-0.5 rounded border border-gray-150">
                                  {label}: <strong className="text-gray-805">{String(cleanVal)}</strong>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Item-specific Notes */}
                      {p.notes && (
                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100">
                          <span className="font-medium text-gray-700">{dir === "rtl" ? "ملاحظات البند:" : "Item Notes:"} </span>
                          {p.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery and Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                  <div className="text-xs text-gray-400 mb-1">{dir === "rtl" ? "تاريخ الاستلام المتوقع" : "Expected Delivery"}</div>
                  <div className="text-sm font-semibold text-gray-700">{order.deliveryDate}</div>
                </div>
                {order.trackingNumber && (
                  <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                    <div className="text-xs text-gray-400 mb-1">{dir === "rtl" ? "رقم التتبع" : "Tracking Number"}</div>
                    <div className="text-sm font-semibold font-mono text-blue-600">{order.trackingNumber}</div>
                  </div>
                )}
              </div>
              {order.notes && (
                <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                  <div className="text-xs text-gray-400 mb-1">{dir === "rtl" ? "ملاحظات إضافية" : "Additional Notes"}</div>
                  <div className="text-sm text-gray-600">{order.notes}</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center flex-shrink-0">
              <div>
                <span className="text-xs text-gray-400">{dir === "rtl" ? "إجمالي الطلب:" : "Order Total:"}</span>
                <div className="text-lg font-bold" style={{ color: "oklch(0.68 0.10 60)", fontFamily: "DM Serif Display, serif" }}>
                  {order.totalAmount.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}
                </div>
              </div>
              <Button onClick={() => setShowDetails(false)} style={{ background: "oklch(0.38 0.06 160)" }} className="text-white text-xs">
                {dir === "rtl" ? "إغلاق" : "Close"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function mapOrderFromDB(o: any): any {
  return {
    id: String(o.id),
    orderNumber: o.orderNumber,
    date: new Date(o.createdAt).toLocaleDateString("ar-SA"),
    products: (o.items ?? []).map((it: any) => ({
      name: it.doorType,
      qty: it.quantity,
      unitPrice: it.unitPrice,
      total: it.quantity * it.unitPrice,
      selections: it.selections,
      woodType: it.woodType,
      color: it.color,
      width: it.width,
      height: it.height,
      thickness: it.thickness,
      notes: it.notes,
      workflowStage: it.workflowStage,
    })),
    totalAmount: o.totalAmount,
    status: o.status,
    paymentStatus: o.paymentStatus,
    notes: o.notes ?? undefined,
    deliveryDate: "غير محدد",
    trackingNumber: undefined,
  };
}

export default function DistributorOrders() {
  const { distributor } = useDistributorAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [reorderData, setReorderData] = useState<DistributorOrder | null>(null);
  const { dir } = useLanguage();

  const { data: rawOrders, isLoading, isError } = trpc.distributors.myOrders.useQuery(undefined, {
    retry: false,
    enabled: !!distributor,
  });

  const handleReorder = (order: DistributorOrder) => {
    setReorderData(order);
    setShowNewOrder(true);
  };

  if (!distributor) {
    navigate("/distributor");
    return null;
  }

  if (isLoading) {
    return (
      <DistributorLayout title={dir === "rtl" ? "الطلبات" : "Orders"} subtitle={dir === "rtl" ? "إدارة وتتبع جميع طلباتك" : "Manage and track all your orders"}>
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
      </DistributorLayout>
    );
  }

  if (isError) {
    return (
      <DistributorLayout title={dir === "rtl" ? "الطلبات" : "Orders"} subtitle={dir === "rtl" ? "إدارة وتتبع جميع طلباتك" : "Manage and track all your orders"}>
        <div className="text-center py-20 text-red-500">{dir === "rtl" ? "تعذّر تحميل الطلبات" : "Failed to load orders"}</div>
      </DistributorLayout>
    );
  }

  const orders = (rawOrders ?? []).map(mapOrderFromDB);

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.products.some((p: any) => p.name.includes(search));
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusTabs = dir === "rtl" ? [
    { value: "all", label: "الكل", count: orders.length },
    { value: "pending", label: "في الانتظار", count: orders.filter((o) => o.status === "pending").length },
    { value: "manufacturing", label: "قيد التصنيع", count: orders.filter((o) => o.status === "manufacturing").length },
    { value: "shipped", label: "تم الشحن", count: orders.filter((o) => o.status === "shipped").length },
    { value: "delivered", label: "تم التسليم", count: orders.filter((o) => o.status === "delivered").length },
  ] : [
    { value: "all", label: "All", count: orders.length },
    { value: "pending", label: "Pending", count: orders.filter((o) => o.status === "pending").length },
    { value: "manufacturing", label: "Manufacturing", count: orders.filter((o) => o.status === "manufacturing").length },
    { value: "shipped", label: "Shipped", count: orders.filter((o) => o.status === "shipped").length },
    { value: "delivered", label: "Delivered", count: orders.filter((o) => o.status === "delivered").length },
  ];

  return (
    <DistributorLayout
      title={dir === "rtl" ? "الطلبات" : "Orders"}
      subtitle={dir === "rtl" ? "إدارة وتتبع جميع طلباتك" : "Manage and track all your orders"}
    >
      <div className="space-y-5" style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>

        {/* Header actions */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
              <Input
                placeholder={dir === "rtl" ? "بحث برقم الطلب أو المنتج..." : "Search by order number or product..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={dir === "rtl" ? "pr-9 text-sm" : "pl-9 text-sm"}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => toast.info(dir === "rtl" ? "فلاتر متقدمة - قريباً" : "Advanced filters - coming soon")}
            >
              <Filter className="w-4 h-4" />
              {dir === "rtl" ? "فلترة" : "Filter"}
            </Button>
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            style={{ background: "oklch(0.38 0.06 160)" }}
          onClick={() => setShowNewOrder(true)}
        >
          <Plus className="w-4 h-4" />
          {dir === "rtl" ? "طلب جديد" : "New Order"}
        </Button>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {statusTabs.map(({ value, label, count }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all flex-shrink-0"
              style={
                statusFilter === value
                  ? { background: "oklch(0.38 0.06 160)", color: "white" }
                  : { background: "white", color: "oklch(0.45 0.03 160)", border: "1px solid #e5e7eb" }
              }
            >
              {label}
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={
                  statusFilter === value
                    ? { background: "oklch(1 0 0 / 0.2)", color: "white" }
                    : { background: "#f3f4f6", color: "#6b7280" }
                }
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Orders list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{dir === "rtl" ? "لا توجد طلبات تطابق البحث" : "No orders match your search"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => (
              <OrderCard key={order.id} order={order} onReorder={handleReorder} />
            ))}
          </div>
        )}
      </div>

      <NewOrderWizard
        isOpen={showNewOrder}
        onClose={() => { setShowNewOrder(false); setReorderData(null); }}
        prefillItems={reorderData ? reorderData.products.map((p) => ({
          id: Math.random().toString(36).slice(2),
          doorType: "باب داخلي",
          doorTypeEn: "Interior Door",
          woodType: "بلوط",
          woodTypeEn: "Oak",
          color: "طبيعي",
          colorEn: "Natural",
          colorHex: "#c8a96e",
          width: 90,
          height: 210,
          thickness: 4,
          quantity: p.qty,
          unitPrice: p.unitPrice,
          image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
          notes: p.name,
        })) : undefined}
      />
    </DistributorLayout>
  );
}
