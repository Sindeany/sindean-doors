// ============================================================
// UserOrders.tsx - Sindian Doors
// Order tracking page for retail customers
// Design: Architectural Luxury — deep oak green + warm beige
// ============================================================

import { useState } from "react";
import { Link, useParams } from "wouter";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { trpc } from "@/lib/trpc";
import { mockOrders, orderStatusLabels, orderStatusColors, CustomerOrder } from "@/lib/userData";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Package, ChevronLeft, ChevronDown, Search, CheckCircle2,
  Truck, Factory, Star, Download, MessageCircle, RotateCcw, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";

type OrderStatus = CustomerOrder["status"];

const statusOrder: Record<OrderStatus, number> = {
  pending: 0,
  confirmed: 1,
  manufacturing: 2,
  quality_check: 2,
  shipping: 3,
  delivered: 4,
  cancelled: -1,
};

const fieldLabelsAr: Record<string, string> = {
  color_choice: "اللون", color: "اللون", wood_type: "نوع الخشب", wood: "الخشب",
  door_direction: "اتجاه الباب", frame_type: "نوع الإطار", hinge_type: "نوع المفصلة",
  lock: "القفل", hinges: "المفصلات", handle: "المقبض", finish: "التشطيب",
  height: "الارتفاع", width: "العرض", wallThickness: "سماكة الجدار", wall_thickness: "سماكة الجدار",
  type: "النوع", brand: "الماركة", count: "العدد",
};
const humanizeValue = (v: any): string => {
  if (v == null) return "";
  if (typeof v === "object") {
    return Object.entries(v)
      .map(([k, val]) => `${fieldLabelsAr[k] ?? k}: ${humanizeValue(val)}`)
      .join("، ");
  }
  return String(v).replace(/_/g, " ");
};
const labelFor = (k: string) => fieldLabelsAr[k] ?? k.replace(/_/g, " ");

export default function UserOrders() {
  const { user } = useUserAuth();
  const { data: rawOrders = [] } = trpc.customerPortal.myOrders.useQuery();
  const { data: allProducts = [] } = trpc.products.list.useQuery();
  const productImageMap = new Map(
    (allProducts as any[]).map((p) => [String(p.id), p.image || (p.images?.[0] ?? "")])
  );

  const realStatusLabels: Record<string, string> = {
    new: "طلب جديد",
    reviewing: "قيد المراجعة",
    confirmed: "مؤكد",
    in_production: "في الإنتاج",
    ready: "جاهز للتسليم",
    delivered: "تم التسليم",
    cancelled: "ملغي",
  };

  const realStatusColors: Record<string, string> = {
    new: "bg-indigo-100 text-indigo-700",
    reviewing: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-green-100 text-green-700",
    in_production: "bg-blue-100 text-blue-700",
    ready: "bg-purple-100 text-purple-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  const orders = (rawOrders as any[]).map((o) => {
    const img = productImageMap.get(String(o.productId)) ?? "";
    return {
      id: `ORD-${o.id}`,
      rawId: o.id,
      productId: String(o.productId),
      status: o.status as string,
      date: o.createdAt ? new Date(o.createdAt).toLocaleDateString("ar-SA") : "",
      estimatedDelivery: o.expectedDelivery ? new Date(o.expectedDelivery).toLocaleDateString("ar-SA") : "",
      total: Number(o.totalPrice ?? 0),
      selections: (typeof o.selections === "string" ? JSON.parse(o.selections || "{}") : o.selections) ?? {},
      subSelections: (typeof o.subSelections === "string" ? JSON.parse(o.subSelections || "{}") : o.subSelections) ?? {},
      dimensions: (typeof o.dimensions === "string" ? JSON.parse(o.dimensions || "{}") : o.dimensions) ?? {},
      items: [
        {
          name: o.productName ?? "باب",
          image: img,
          quantity: o.totalDoors ?? 1,
          unitPrice: Number(o.basePrice ?? 0) || (Number(o.totalPrice ?? 0) / (o.totalDoors || 1)),
          totalPrice: Number(o.totalPrice ?? 0),
        },
      ],
    };
  });
  const params = useParams<{ id?: string }>();
  const orderId = params.id;
  const { dir } = useLanguage();

  const [search, setSearch] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  const statusFilters: { id: OrderStatus | "all"; label: string }[] = dir === "rtl" ? [
    { id: "all", label: "جميع الطلبات" },
    { id: "pending", label: "في الانتظار" },
    { id: "confirmed", label: "مؤكد" },
    { id: "manufacturing", label: "في التصنيع" },
    { id: "shipping", label: "في الشحن" },
    { id: "delivered", label: "تم التسليم" },
    { id: "cancelled", label: "ملغي" },
  ] : [
    { id: "all", label: "All Orders" },
    { id: "pending", label: "Pending" },
    { id: "confirmed", label: "Confirmed" },
    { id: "manufacturing", label: "Manufacturing" },
    { id: "shipping", label: "Shipping" },
    { id: "delivered", label: "Delivered" },
    { id: "cancelled", label: "Cancelled" },
  ];

  const timelineSteps = dir === "rtl" ? [
    { key: "confirmed", label: "تأكيد الطلب", icon: CheckCircle2 },
    { key: "manufacturing", label: "التصنيع", icon: Factory },
    { key: "shipping", label: "الشحن والتوصيل", icon: Truck },
    { key: "delivered", label: "تم التسليم", icon: Package },
  ] : [
    { key: "confirmed", label: "Order Confirmed", icon: CheckCircle2 },
    { key: "manufacturing", label: "Manufacturing", icon: Factory },
    { key: "shipping", label: "Shipping", icon: Truck },
    { key: "delivered", label: "Delivered", icon: Package },
  ];

  if (!user) return null;

  // ── Single order detail view ──────────────────────────────────────────────
  if (orderId) {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return (
      <div className="min-h-screen bg-[#FAF8F5]" dir={dir}>
        <Navbar />
        <div className="container py-20 text-center">
          <Package className="w-16 h-16 mx-auto mb-4" style={{ color: "#6B7B75" }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: "#2C4A3E" }}>
            {dir === "rtl" ? "الطلب غير موجود" : "Order not found"}
          </h2>
          <Link href="/account/orders">
            <Button className="mt-4" style={{ background: "#2C4A3E", color: "white" }}>
              {dir === "rtl" ? "العودة للطلبات" : "Back to Orders"}
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );

    // خطوات الحالة الحقيقية (تُطابق حالات doorOrders)
    const realStepOrder: Record<string, number> = {
      new: 1, reviewing: 2, confirmed: 3, in_production: 4, ready: 5, delivered: 6, cancelled: 0,
    };
    const realDetailSteps = dir === "rtl" ? [
      { key: "new", label: "طلب جديد", icon: CheckCircle2 },
      { key: "reviewing", label: "قيد المراجعة", icon: CheckCircle2 },
      { key: "confirmed", label: "مؤكد", icon: CheckCircle2 },
      { key: "in_production", label: "في الإنتاج", icon: Factory },
      { key: "ready", label: "جاهز للتسليم", icon: Truck },
      { key: "delivered", label: "تم التسليم", icon: Package },
    ] : [
      { key: "new", label: "New", icon: CheckCircle2 },
      { key: "reviewing", label: "Reviewing", icon: CheckCircle2 },
      { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
      { key: "in_production", label: "In Production", icon: Factory },
      { key: "ready", label: "Ready", icon: Truck },
      { key: "delivered", label: "Delivered", icon: Package },
    ];
    const currentStep = realStepOrder[order.status] ?? 0;

    return (
      <div className="min-h-screen bg-[#FAF8F5]" dir={dir}>
        <Navbar />
        <div className="container py-8 max-w-4xl mx-auto px-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-6" style={{ color: "#6B7B75" }}>
            <Link href="/" className="hover:underline">{dir === "rtl" ? "الرئيسية" : "Home"}</Link>
            <ChevronLeft className="w-3 h-3" />
            <Link href="/account" className="hover:underline">{dir === "rtl" ? "حسابي" : "My Account"}</Link>
            <ChevronLeft className="w-3 h-3" />
            <Link href="/account/orders" className="hover:underline">{dir === "rtl" ? "طلباتي" : "My Orders"}</Link>
            <ChevronLeft className="w-3 h-3" />
            <span style={{ color: "#2C4A3E" }}>{order.id}</span>
          </div>

          {/* Header */}
          <div className="rounded-2xl p-6 mb-6" style={{ background: "white", border: "1px solid #E8DFD0" }}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-xl font-bold" style={{ color: "#2C4A3E", fontFamily: "'DM Serif Display', serif" }}>
                    {dir === "rtl" ? `طلب ${order.id}` : `Order ${order.id}`}
                  </h1>
                  <span className={`text-sm px-3 py-1 rounded-full font-medium ${realStatusColors[order.status] ?? "bg-gray-100 text-gray-700"}`}>
                    {realStatusLabels[order.status] ?? order.status}
                  </span>
                </div>
                <p className="text-sm" style={{ color: "#6B7B75" }}>
                  {dir === "rtl" ? "تاريخ الطلب:" : "Order date:"} {order.date}
                  {order.estimatedDelivery && ` · ${dir === "rtl" ? "التسليم المتوقع:" : "Est. delivery:"} ${order.estimatedDelivery}`}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline (مبني على الحالة الحقيقية) */}
          {order.status !== "cancelled" && (
            <div className="rounded-2xl p-6 mb-6" style={{ background: "white", border: "1px solid #E8DFD0" }}>
              <h2 className="text-base font-bold mb-6" style={{ color: "#2C4A3E" }}>
                {dir === "rtl" ? "تتبع الطلب" : "Order Tracking"}
              </h2>
              <div className="relative flex justify-between mb-2">
                <div className="absolute top-5 right-5 left-5 h-0.5" style={{ background: "#E8DFD0" }} />
                {realDetailSteps.map((step, i) => {
                  const done = currentStep >= i + 1;
                  const active = currentStep === i + 1;
                  return (
                    <div key={step.key} className="flex flex-col items-center gap-2 flex-1 z-10">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                        style={{
                          background: done ? "#2C4A3E" : "#F0EBE3",
                          border: active ? "3px solid #C4956A" : "none",
                        }}
                      >
                        <step.icon className="w-4 h-4" style={{ color: done ? "white" : "#9CA3AF" }} />
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-semibold" style={{ color: done ? "#2C4A3E" : "#9CA3AF" }}>
                          {step.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Products */}
          <div className="rounded-2xl p-6 mb-6" style={{ background: "white", border: "1px solid #E8DFD0" }}>
            <h2 className="text-base font-bold mb-4" style={{ color: "#2C4A3E" }}>
              {dir === "rtl" ? `المنتجات (${order.items.length})` : `Products (${order.items.length})`}
            </h2>
            <div className="space-y-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "#FAF8F5", border: "1px solid #EDE8E0" }}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center bg-gray-100">
                      <Package className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm mb-0.5" style={{ color: "#2C4A3E" }}>{item.name}</div>
                    <div className="text-xs mt-1" style={{ color: "#6B7B75" }}>
                      {dir === "rtl" ? "الكمية:" : "Qty:"} {item.quantity} × {item.unitPrice.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}
                    </div>
                  </div>
                  <div className={`${dir === "rtl" ? "text-right" : "text-left"} flex-shrink-0`}>
                    <div className="font-bold text-sm" style={{ color: "#2C4A3E" }}>
                      {item.totalPrice.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* خيارات الطلب المُختارة (قابلة للطي) */}
            {(Object.keys(order.dimensions).length > 0 ||
              Object.keys(order.selections).length > 0 ||
              Object.keys(order.subSelections).length > 0) && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: "#E8DFD0" }}>
                <button
                  type="button"
                  onClick={() => setOptionsOpen((v) => !v)}
                  className="w-full flex items-center justify-between text-sm font-bold py-1"
                  style={{ color: "#2C4A3E" }}
                >
                  <span>{dir === "rtl" ? "تفاصيل الطلب والخيارات" : "Order Options"}</span>
                  <ChevronDown
                    className="w-4 h-4 transition-transform"
                    style={{ transform: optionsOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                  />
                </button>
                {optionsOpen && (
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mt-3">
                    {Object.entries(order.dimensions).map(([k, v]) => (
                      v != null && v !== "" && (
                        <div key={`d-${k}`} className="flex justify-between">
                          <span style={{ color: "#6B7B75" }}>{labelFor(k)}</span>
                          <span style={{ color: "#2C4A3E" }}>{humanizeValue(v)} {dir === "rtl" ? "سم" : "cm"}</span>
                        </div>
                      )
                    ))}
                    {Object.entries(order.selections).map(([k, v]) => (
                      v != null && v !== "" && (
                        <div key={`s-${k}`} className="flex justify-between">
                          <span style={{ color: "#6B7B75" }}>{labelFor(k)}</span>
                          <span style={{ color: "#2C4A3E" }}>{humanizeValue(v)}</span>
                        </div>
                      )
                    ))}
                    {Object.entries(order.subSelections).map(([k, v]) => (
                      v != null && v !== "" && (
                        <div key={`ss-${k}`} className="flex justify-between sm:col-span-2">
                          <span style={{ color: "#6B7B75" }}>{labelFor(k)}</span>
                          <span style={{ color: "#2C4A3E" }}>{humanizeValue(v)}</span>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Total فقط (الخادم لا يوفّر تفصيل الضريبة/الشحن) */}
            <div className="mt-4 pt-4 border-t" style={{ borderColor: "#E8DFD0" }}>
              <div className="flex justify-between font-bold text-base" style={{ color: "#2C4A3E" }}>
                <span>{dir === "rtl" ? "الإجمالي" : "Total"}</span>
                <span>{order.total.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}</span>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Orders list view ──────────────────────────────────────────────────────
  const filtered = orders.filter((o) => {
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const matchSearch =
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.items.some((i) => i.name.includes(search));
    return matchStatus && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#FAF8F5]" dir={dir}>
      <Navbar />
      <div className="container py-8 max-w-4xl mx-auto px-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6" style={{ color: "#6B7B75" }}>
          <Link href="/" className="hover:underline">{dir === "rtl" ? "الرئيسية" : "Home"}</Link>
          <ChevronLeft className="w-3 h-3" />
          <Link href="/account" className="hover:underline">{dir === "rtl" ? "حسابي" : "My Account"}</Link>
          <ChevronLeft className="w-3 h-3" />
          <span style={{ color: "#2C4A3E" }}>{dir === "rtl" ? "طلباتي" : "My Orders"}</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "#2C4A3E", fontFamily: "'DM Serif Display', serif" }}>
            {dir === "rtl" ? "طلباتي" : "My Orders"}
          </h1>
          <span className="text-sm" style={{ color: "#6B7B75" }}>
            {orders.length} {dir === "rtl" ? "طلب" : "orders"}
          </span>
        </div>

        {/* Search & filters */}
        <div className="rounded-2xl p-4 mb-6" style={{ background: "white", border: "1px solid #E8DFD0" }}>
          <div className="relative mb-4">
            <Search className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4`} style={{ color: "#6B7B75" }} />
            <Input
              placeholder={dir === "rtl" ? "ابحث برقم الطلب أو اسم المنتج..." : "Search by order number or product name..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${dir === "rtl" ? "pr-10" : "pl-10"} h-10 rounded-xl border-2 focus:border-[#2C4A3E]`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                style={{
                  background: statusFilter === f.id ? "#2C4A3E" : "#F0EBE3",
                  color: statusFilter === f.id ? "white" : "#4A5568",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 mx-auto mb-3" style={{ color: "#C8D5D0" }} />
            <p className="text-base font-semibold" style={{ color: "#6B7B75" }}>
              {dir === "rtl" ? "لا توجد طلبات" : "No orders found"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => {
              const currentStep = statusOrder[order.status as keyof typeof statusOrder] ?? 0;
              return (
                <div key={order.id} className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid #E8DFD0" }}>
                  {/* Header */}
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
                    style={{ borderBottom: "1px solid #F0EBE3" }}
                  >
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5" style={{ color: "#2C4A3E" }} />
                      <span className="font-bold text-sm" style={{ color: "#2C4A3E" }}>{order.id}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${realStatusColors[order.status] ?? "bg-gray-100 text-gray-700"}`}>
                        {realStatusLabels[order.status] ?? order.status}
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: "#6B7B75" }}>
                      {order.date}
                      {order.estimatedDelivery && ` · ${dir === "rtl" ? "التسليم:" : "Delivery:"} ${order.estimatedDelivery}`}
                    </div>
                  </div>

                  {/* Items preview */}
                  <div className="px-6 py-4">
                    <div className="flex items-center gap-3 mb-4">
                      {order.items.slice(0, 3).map((item, i) => (
                        <div
                          key={i}
                          className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden"
                          style={{ border: "1px solid #E8DFD0" }}
                        >
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                              <Package className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <div
                          className="w-14 h-14 rounded-xl flex items-center justify-center text-sm font-bold"
                          style={{ background: "#F0EBE3", color: "#6B7B75" }}
                        >
                          +{order.items.length - 3}
                        </div>
                      )}
                      <div className={`${dir === "rtl" ? "mr-auto text-right" : "ml-auto text-left"}`}>
                        <div className="text-xs mb-0.5" style={{ color: "#6B7B75" }}>
                          {order.items.length} {dir === "rtl" ? "منتج" : "items"}
                        </div>
                        <div className="font-bold text-base" style={{ color: "#2C4A3E" }}>
                          {order.total.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}
                        </div>
                      </div>
                    </div>

                    {/* Mini timeline */}
                    {order.status !== "cancelled" && (
                      <div className="flex items-center gap-1 mb-4">
                        {timelineSteps.map((step, i) => {
                          const done = currentStep >= i + 1;
                          return (
                            <div key={step.key} className="flex items-center flex-1">
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ background: done ? "#2C4A3E" : "#E8DFD0" }}
                              >
                                <step.icon className="w-2.5 h-2.5" style={{ color: done ? "white" : "#9CA3AF" }} />
                              </div>
                              {i < timelineSteps.length - 1 && (
                                <div
                                  className="flex-1 h-0.5 mx-0.5"
                                  style={{ background: currentStep > i + 1 ? "#2C4A3E" : "#E8DFD0" }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Link href={`/account/orders/${order.id}`} className="flex-1">
                        <Button
                          size="sm"
                          className="w-full rounded-xl text-xs gap-1.5"
                          style={{ background: "#2C4A3E", color: "white" }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {dir === "rtl" ? "تفاصيل الطلب" : "Order Details"}
                        </Button>
                      </Link>
                      {order.status === "delivered" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl text-xs gap-1.5"
                          style={{ borderColor: "#E8DFD0" }}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          {dir === "rtl" ? "إعادة الطلب" : "Reorder"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
