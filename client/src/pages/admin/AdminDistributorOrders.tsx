import { useState, useMemo, Fragment } from "react";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import AdminLayout from "@/components/admin/AdminLayout";
import { KEY_TRANSLATIONS } from "@/components/distributor/NewOrderWizard";
import {
  Package, Truck, CheckCircle2, Clock, XCircle, Search, Filter,
  ChevronDown, ChevronUp, CheckCheck, RotateCcw, Activity
} from "lucide-react";

// NOTE: duplicated from AdminDistributorProfile.tsx — extract to shared helper later

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
  distributorName?: string;
  distributorCompany?: string;
}

// ─── Dictionaries ──────────────────────────────────────────────
const ORDER_STATUS: Record<OrderStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:    { label: "بانتظار الموافقة", color: "#F59E0B", bg: "#FFFBEB", icon: <Clock className="w-3.5 h-3.5" /> },
  approved:   { label: "موافق عليه",       color: "#3B82F6", bg: "#EFF6FF", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  production: { label: "قيد الإنتاج",      color: "#8B5CF6", bg: "#F5F3FF", icon: <Activity className="w-3.5 h-3.5" /> },
  ready:      { label: "جاهز للشحن",       color: "#06B6D4", bg: "#ECFEFF", icon: <Package className="w-3.5 h-3.5" /> },
  shipped:    { label: "تم الشحن",         color: "#F97316", bg: "#FFF7ED", icon: <Truck className="w-3.5 h-3.5" /> },
  delivered:  { label: "تم التسليم",       color: "#10B981", bg: "#ECFDF5", icon: <CheckCheck className="w-3.5 h-3.5" /> },
  cancelled:  { label: "ملغي",             color: "#6B7280", bg: "#F3F4F6", icon: <XCircle className="w-3.5 h-3.5" /> },
};

const PAYMENT_STATUS: Record<PaymentStatus, { label: string; color: string; bg: string }> = {
  paid:    { label: "مدفوع",          color: "#10B981", bg: "#ECFDF5" },
  pending: { label: "بانتظار الدفع",  color: "#F59E0B", bg: "#FFFBEB" },
  overdue: { label: "متأخر",          color: "#EF4444", bg: "#FEF2F2" },
  partial: { label: "دفع جزئي",       color: "#3B82F6", bg: "#EFF6FF" },
};

const DEFAULT_ORDER_STATUS = { label: "غير معروف", color: "#6B7280", bg: "#F3F4F6", icon: null };
const DEFAULT_PAYMENT_STATUS = { label: "غير معروف", color: "#6B7280", bg: "#F3F4F6" };

// ─── Data Mappers ──────────────────────────────────────
function mapStatus(s: string): OrderStatus {
  if (s === "confirmed") return "approved";
  if (s === "manufacturing") return "production";
  if (s === "draft") return "pending";
  return s as OrderStatus;
}

function mapOrderFromDB(o: any): Order { // o is raw order from trpc
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
    paid: o.paymentStatus === "paid" ? o.totalAmount : 0,
    trackingNumber: undefined,
    distributorName: o.distributorName,
    distributorCompany: o.distributorCompany,
  };
}

export default function AdminDistributorOrders() {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  const { data: rawOrders, isLoading, isError } = trpc.distributorOrders.list.useQuery({}, { retry: false });
  const utils = trpc.useUtils();
  const updateStatusMutation = trpc.distributorOrders.updateStatus.useMutation({
    onSuccess: () => { utils.distributorOrders.list.invalidate(); },
  });

  const orders = useMemo(() => {
    if (!rawOrders) return [];
    let mapped = rawOrders.map(mapOrderFromDB);
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      mapped = mapped.filter(o => 
        o.id?.toLowerCase().includes(q) ||
        o.distributorName?.toLowerCase().includes(q) ||
        o.distributorCompany?.toLowerCase().includes(q)
      );
    }
    
    if (statusFilter !== "all") {
      mapped = mapped.filter(o => o.status === statusFilter);
    }
    
    return mapped;
  }, [rawOrders, searchQuery, statusFilter]);

  if (isLoading) {
    return (
      <AdminLayout title="طلبات الموزعين">
        <div className="flex items-center justify-center py-20 text-gray-500 gap-2 font-medium">
          <RotateCcw className="w-5 h-5 animate-spin" />
          جارٍ التحميل...
        </div>
      </AdminLayout>
    );
  }

  if (isError) {
    return (
      <AdminLayout title="طلبات الموزعين">
        <div className="py-20 text-center text-red-500">
          <XCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>تعذّر تحميل الطلبات.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="طلبات الموزعين">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        
        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="رقم الطلب أو الموزع..." 
                className="pl-4 pr-9 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B7355] w-full md:w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <div className="flex gap-1 overflow-x-auto pb-1 md:pb-0">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    statusFilter === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  الكل
                </button>
                {(Object.entries(ORDER_STATUS) as [OrderStatus, any][]).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key as OrderStatus)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      statusFilter === key ? "bg-[#8B7355] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-500 font-medium">
            {orders.length} طلب
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-3">
          {orders.map((o) => {
            const sc = ORDER_STATUS[o.status] || DEFAULT_ORDER_STATUS;
            const pc = PAYMENT_STATUS[o.paymentStatus] || DEFAULT_PAYMENT_STATUS;
            const isExpanded = expandedOrder === o.id;

            return (
              <div key={o.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedOrder(isExpanded ? null : o.id)}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-bold text-gray-800 tracking-tight">{o.id}</span>
                      <span className="text-sm font-medium text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                        {o.distributorCompany ? `${o.distributorName} (${o.distributorCompany})` : o.distributorName}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1 border"
                        style={{ color: sc.color, backgroundColor: sc.bg, borderColor: sc.color + '30' }}>
                        {sc.icon} {sc.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border"
                        style={{ color: pc.color, backgroundColor: pc.bg, borderColor: pc.color + '30' }}>
                        {pc.label}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{o.date} · {o.items} منتج</div>
                  </div>
                  <div className="text-left flex-shrink-0 flex items-center gap-4">
                    <div className="text-left">
                      <div className="text-sm font-bold text-gray-800">{o.total.toLocaleString()} ر.س</div>
                      {o.paid > 0 && o.paid < o.total && (
                        <div className="text-xs text-blue-500">مدفوع: {o.paid.toLocaleString()}</div>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
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
                                  <Fragment key={idx}>
                                    <tr className="bg-white hover:bg-gray-50/50 transition-colors">
                                      <td className="p-2 font-medium">{it.doorType || "—"}</td>
                                      <td className="p-2 text-center">{it.quantity || "—"}</td>
                                      <td className="p-2 text-center text-gray-600">{it.unitPrice ? `${it.unitPrice.toLocaleString()} ر.س` : "—"}</td>
                                      <td className="p-2 text-center text-gray-600" dir="ltr">{it.width && it.height ? `${it.width}×${it.height}` : "—"}</td>
                                      <td className="p-2 text-gray-600">{it.woodType || "—"}</td>
                                      <td className="p-2 text-gray-600">{it.color || "—"}</td>
                                    </tr>
                                    {it.selections && Object.keys(it.selections).length > 0 && (
                                      <tr className="bg-white">
                                        <td colSpan={6} className="p-2 bg-gray-50/30 text-[10px] text-gray-500 border-t border-dashed border-gray-100">
                                          <div className="flex flex-wrap gap-x-3 gap-y-1">
                                            <span className="font-semibold text-gray-700">خيارات مخصصة:</span>
                                            {Object.entries(it.selections).map(([key, val]) => {
                                              if (["width", "door_leaf_height", "wall_thickness", "material", "color_choice"].includes(key)) return null;
                                              const label = KEY_TRANSLATIONS[key] || key.replace(/_/g, " ");
                                              const cleanVal = val === "true" ? "نعم" : val === "false" ? "لا" : val;
                                              return (
                                                <span key={key} className="bg-white px-1.5 py-0.5 rounded border border-gray-205">
                                                  {label}: <strong className="text-gray-700">{String(cleanVal)}</strong>
                                                </span>
                                              );
                                            })}
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </Fragment>
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
          
          {orders.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p>لا توجد طلبات مطابقة.</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
