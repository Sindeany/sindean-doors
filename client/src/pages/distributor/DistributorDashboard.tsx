// ============================================================
// Distributor Dashboard - Sindian Doors
// Design: Architectural Luxury | KPI cards + charts + recent orders
// ============================================================

import { useState } from "react";
import { useLocation } from "wouter";
import { useDistributorAuth } from "@/contexts/DistributorAuthContext";
import DistributorLayout from "@/components/distributor/DistributorLayout";
import NewOrderWizard from "@/components/distributor/NewOrderWizard";
import BulkOrderUpload from "@/components/distributor/BulkOrderUpload";
import ProjectFilesUpload from "@/components/distributor/ProjectFilesUpload";
import {
  mockOrders,
  monthlySalesData,
  orderStatusConfig,
  paymentStatusConfig,
  tierConfig,
} from "@/lib/distributorData";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import {
  TrendingUp, ShoppingBag, DollarSign, Package,
  ArrowUpRight, Clock, Truck, CheckCircle2, AlertCircle, ChevronLeft,
  Plus, FileSpreadsheet, FolderOpen, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export default function DistributorDashboard() {
  const { distributor } = useDistributorAuth();
  const [, navigate] = useLocation();
  const { dir } = useLanguage();
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showProjectFiles, setShowProjectFiles] = useState(false);

  if (!distributor) {
    navigate("/distributor");
    return null;
  }

  const tier = tierConfig[distributor.tier];

  const totalRevenue = mockOrders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.totalAmount, 0);
  const thisMonthRevenue = mockOrders.filter((o) => o.date.startsWith("2026-04")).reduce((s, o) => s + o.totalAmount, 0);
  const pendingOrders = mockOrders.filter((o) => ["pending", "confirmed", "manufacturing"].includes(o.status)).length;
  const deliveredOrders = mockOrders.filter((o) => o.status === "delivered").length;

  const recentOrders = mockOrders.slice(0, 5);

  const kpis = [
    {
      label: dir === "rtl" ? "إجمالي المبيعات" : "Total Sales",
      value: `${(totalRevenue / 1000).toFixed(1)}K`,
      unit: dir === "rtl" ? "ر.س" : "SAR",
      change: "+18%",
      positive: true,
      icon: DollarSign,
      color: "oklch(0.38 0.06 160)",
      bg: "oklch(0.96 0.01 160)",
    },
    {
      label: dir === "rtl" ? "مبيعات هذا الشهر" : "This Month's Sales",
      value: `${(thisMonthRevenue / 1000).toFixed(1)}K`,
      unit: dir === "rtl" ? "ر.س" : "SAR",
      change: "+24%",
      positive: true,
      icon: TrendingUp,
      color: "oklch(0.68 0.10 60)",
      bg: "oklch(0.97 0.02 60)",
    },
    {
      label: dir === "rtl" ? "طلبات نشطة" : "Active Orders",
      value: pendingOrders.toString(),
      unit: dir === "rtl" ? "طلب" : "orders",
      change: dir === "rtl" ? "قيد التنفيذ" : "In Progress",
      positive: true,
      icon: ShoppingBag,
      color: "#7c3aed",
      bg: "#f5f3ff",
    },
    {
      label: dir === "rtl" ? "طلبات مُسلَّمة" : "Delivered Orders",
      value: deliveredOrders.toString(),
      unit: dir === "rtl" ? "طلب" : "orders",
      change: dir === "rtl" ? "هذا العام" : "This Year",
      positive: true,
      icon: Package,
      color: "#0891b2",
      bg: "#ecfeff",
    },
  ];

  const statusSummary = [
    { label: dir === "rtl" ? "في الانتظار" : "Pending", count: mockOrders.filter((o) => o.status === "pending").length, icon: Clock, color: "#d97706" },
    { label: dir === "rtl" ? "قيد التصنيع" : "Manufacturing", count: mockOrders.filter((o) => o.status === "manufacturing").length, icon: AlertCircle, color: "#7c3aed" },
    { label: dir === "rtl" ? "تم الشحن" : "Shipped", count: mockOrders.filter((o) => o.status === "shipped").length, icon: Truck, color: "#0891b2" },
    { label: dir === "rtl" ? "تم التسليم" : "Delivered", count: mockOrders.filter((o) => o.status === "delivered").length, icon: CheckCircle2, color: "#059669" },
  ];

  const tableHeaders = dir === "rtl"
    ? ["رقم الطلب", "التاريخ", "المبلغ", "حالة الطلب", "الدفع", ""]
    : ["Order #", "Date", "Amount", "Order Status", "Payment", ""];

  const quickActions = dir === "rtl" ? [
    { label: "طلب جديد", desc: "أمر شراء أو عرض أسعار", color: "oklch(0.38 0.06 160)", icon: Plus, action: () => setShowNewOrder(true) },
    { label: "كتالوج المنتجات", desc: "تصفح واطلب مباشرة", color: "#0891b2", icon: BookOpen, action: () => navigate("/distributor/catalogue") },
    { label: "رفع Excel", desc: "طلبات بالجملة", color: "#059669", icon: FileSpreadsheet, action: () => setShowBulkUpload(true) },
    { label: "ملفات المشروع", desc: "رفع مخططات ومستندات", color: "#7c3aed", icon: FolderOpen, action: () => setShowProjectFiles(true) },
  ] : [
    { label: "New Order", desc: "Purchase order or RFQ", color: "oklch(0.38 0.06 160)", icon: Plus, action: () => setShowNewOrder(true) },
    { label: "Product Catalogue", desc: "Browse & order directly", color: "#0891b2", icon: BookOpen, action: () => navigate("/distributor/catalogue") },
    { label: "Upload Excel", desc: "Bulk orders upload", color: "#059669", icon: FileSpreadsheet, action: () => setShowBulkUpload(true) },
    { label: "Project Files", desc: "Upload plans & documents", color: "#7c3aed", icon: FolderOpen, action: () => setShowProjectFiles(true) },
  ];

  return (
    <DistributorLayout
      title={dir === "rtl" ? `مرحباً، ${distributor.name}` : `Welcome, ${distributor.name}`}
      subtitle={dir === "rtl" ? `${distributor.company} · موزع ${tier.label}` : `${distributor.company} · ${tier.label} Distributor`}
    >
      <div className="space-y-6" style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>

        {/* Tier banner */}
        <div
          className="rounded-2xl p-5 flex items-center justify-between"
          style={{ background: `linear-gradient(135deg, oklch(0.30 0.06 160), oklch(0.38 0.06 160))` }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold"
              style={{ background: "oklch(1 0 0 / 0.1)", color: tier.color }}
            >
              ★
            </div>
            <div>
              <div className="text-white font-bold text-lg" style={{ fontFamily: "DM Serif Display, serif" }}>
                {dir === "rtl" ? `موزع ${tier.label}` : `${tier.label} Distributor`}
              </div>
              <div className="text-white/60 text-sm">
                {dir === "rtl"
                  ? `خصم ${distributor.discount}% على جميع المنتجات · حد ائتماني ${(distributor.creditLimit / 1000).toFixed(0)}K ر.س`
                  : `${distributor.discount}% discount on all products · Credit limit ${(distributor.creditLimit / 1000).toFixed(0)}K SAR`}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 hidden sm:flex"
            onClick={() => toast.info(dir === "rtl" ? "تفاصيل برنامج الموزعين - قريباً" : "Distributor program details - Coming Soon")}
          >
            {dir === "rtl" ? "تفاصيل البرنامج" : "Program Details"}
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(({ label, value, unit, change, positive, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <span className="text-xs font-medium flex items-center gap-1" style={{ color: positive ? "#059669" : "#dc2626" }}>
                  <ArrowUpRight className="w-3 h-3" />
                  {change}
                </span>
              </div>
              <div className="text-2xl font-bold" style={{ color: "oklch(0.25 0.04 160)", fontFamily: "DM Serif Display, serif" }}>
                {value}
                <span className={`text-sm font-normal text-gray-400 ${dir === "rtl" ? "mr-1" : "ml-1"}`}>{unit}</span>
              </div>
              <div className="text-sm text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Revenue chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-lg" style={{ color: "oklch(0.25 0.04 160)", fontFamily: "DM Serif Display, serif" }}>
                  {dir === "rtl" ? "المبيعات الشهرية" : "Monthly Sales"}
                </h3>
                <p className="text-sm text-gray-400">{dir === "rtl" ? "آخر 6 أشهر" : "Last 6 months"}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full" style={{ background: "oklch(0.96 0.01 160)", color: "oklch(0.38 0.06 160)" }}>
                {dir === "rtl" ? "بالريال السعودي" : "In SAR"}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlySalesData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.38 0.06 160)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="oklch(0.38 0.06 160)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(v) => `${v / 1000}K`} />
                <Tooltip
                  formatter={(v: number) => [`${v.toLocaleString()} ${dir === "rtl" ? "ر.س" : "SAR"}`, dir === "rtl" ? "الإيراد" : "Revenue"]}
                  contentStyle={{ fontFamily: "IBM Plex Sans Arabic, sans-serif", borderRadius: "8px" }}
                />
                <Area type="monotone" dataKey="revenue" stroke="oklch(0.38 0.06 160)" strokeWidth={2.5} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Orders by status */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-lg mb-2" style={{ color: "oklch(0.25 0.04 160)", fontFamily: "DM Serif Display, serif" }}>
              {dir === "rtl" ? "حالة الطلبات" : "Order Status"}
            </h3>
            <p className="text-sm text-gray-400 mb-5">{dir === "rtl" ? "توزيع الطلبات الحالية" : "Current orders distribution"}</p>
            <div className="space-y-4">
              {statusSummary.map(({ label, count, icon: Icon, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span style={{ color: "oklch(0.35 0.04 160)" }}>{label}</span>
                      <span className="font-bold" style={{ color: "oklch(0.25 0.04 160)" }}>{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className="h-full rounded-full" style={{ width: `${(count / mockOrders.length) * 100}%`, background: color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Units bar chart */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-3">{dir === "rtl" ? "الوحدات المباعة شهرياً" : "Units sold monthly"}</p>
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={monthlySalesData} barSize={16}>
                  <Bar dataKey="units" radius={[4, 4, 0, 0]}>
                    {monthlySalesData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === monthlySalesData.length - 1 ? "oklch(0.68 0.10 60)" : "oklch(0.38 0.06 160)"}
                        opacity={i === monthlySalesData.length - 1 ? 1 : 0.5}
                      />
                    ))}
                  </Bar>
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#9ca3af" }} />
                  <Tooltip
                    formatter={(v: number) => [`${v} ${dir === "rtl" ? "وحدة" : "units"}`, dir === "rtl" ? "المبيعات" : "Sales"]}
                    contentStyle={{ fontFamily: "IBM Plex Sans Arabic, sans-serif", borderRadius: "8px", fontSize: "12px" }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-lg" style={{ color: "oklch(0.25 0.04 160)", fontFamily: "DM Serif Display, serif" }}>
              {dir === "rtl" ? "آخر الطلبات" : "Recent Orders"}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-sm gap-1"
              style={{ color: "oklch(0.68 0.10 60)" }}
              onClick={() => navigate("/distributor/orders")}
            >
              {dir === "rtl" ? "عرض الكل" : "View All"}
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "oklch(0.98 0.005 80)" }}>
                  {tableHeaders.map((h) => (
                    <th key={h} className={`px-4 py-3 ${dir === "rtl" ? "text-right" : "text-left"} font-medium`} style={{ color: "oklch(0.45 0.03 160)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => {
                  const statusCfg = orderStatusConfig[order.status];
                  const paymentCfg = paymentStatusConfig[order.paymentStatus];
                  return (
                    <tr
                      key={order.id}
                      className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => navigate("/distributor/orders")}
                    >
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: "oklch(0.38 0.06 160)" }}>
                        {order.orderNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{order.date}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: "oklch(0.25 0.04 160)" }}>
                        {order.totalAmount.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${paymentCfg.color}`}>
                          {paymentCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ChevronLeft className="w-4 h-4 text-gray-300" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {quickActions.map(({ label, desc, color, action }) => (
            <button
              key={label}
              onClick={action}
              className={`bg-white rounded-2xl p-4 ${dir === "rtl" ? "text-right" : "text-left"} shadow-sm border border-gray-100 hover:shadow-md transition-all group`}
            >
              <div className="w-8 h-8 rounded-lg mb-3 flex items-center justify-center" style={{ background: `${color}18` }}>
                <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              </div>
              <div className="font-bold text-sm" style={{ color: "oklch(0.25 0.04 160)" }}>{label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Modals */}
      <NewOrderWizard isOpen={showNewOrder} onClose={() => setShowNewOrder(false)} />
      <BulkOrderUpload isOpen={showBulkUpload} onClose={() => setShowBulkUpload(false)} onOpenDraft={() => setShowBulkUpload(false)} />
      <ProjectFilesUpload isOpen={showProjectFiles} onClose={() => setShowProjectFiles(false)} />
    </DistributorLayout>
  );
}
