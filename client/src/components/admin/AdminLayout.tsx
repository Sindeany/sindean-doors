// ============================================================
// AdminLayout - لوحة تحكم الإدارة - سنديان للأبواب
// Design: Dark sidebar + clean white content area
// Authoritative, data-dense, professional
// ============================================================
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  AlertCircle,
  Package,
  BarChart3,
  Settings,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  TrendingUp,
  Shield,
  Layers,
  Activity,
  ClipboardList,
  Send,
  GitBranch,
  ShieldCheck,
  Box,
  Star,
  Wrench,
  Warehouse,
  ScanLine,
  Globe,
  Building2,
  ShoppingCart,
  FileText,
  BookOpen,
  Factory,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import type { Language } from "@/contexts/LanguageContext";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

interface NavItem {
  id: string;
  labelAr: string;
  labelEn: string;
  labelZh: string;
  icon: React.ReactNode;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    labelAr: "لوحة التحكم",
    labelEn: "Dashboard",
    labelZh: "控制台",
    icon: <LayoutDashboard className="w-5 h-5" />,
    path: "/admin",
  },
  {
    id: "distributors",
    labelAr: "الموزعون",
    labelEn: "Distributors",
    labelZh: "经销商",
    icon: <Users className="w-5 h-5" />,
    path: "/admin/distributors",
  },
  {
    id: "distributor-orders",
    labelAr: "طلبات الموزعين",
    labelEn: "Distributor Orders",
    labelZh: "经销商订单",
    icon: <Package className="w-5 h-5" />,
    path: "/admin/distributor-orders",
  },
  {
    id: "orders",
    labelAr: "الطلبات",
    labelEn: "Orders",
    labelZh: "订单",
    icon: <ShoppingBag className="w-5 h-5" />,
    path: "/admin/orders",
  },
  {
    id: "workflow",
    labelAr: "سير العمل",
    labelEn: "Workflow",
    labelZh: "工作流程",
    icon: <GitBranch className="w-5 h-5" />,
    path: "/admin/workflow",
  },
  {
    id: "work-orders",
    labelAr: "أوامر التشغيل",
    labelEn: "Work Orders",
    labelZh: "生产工单",
    icon: <Wrench className="w-5 h-5" />,
    path: "/admin/work-orders",
  },
  {
    id: "production",
    labelAr: "تخطيط الإنتاج",
    labelEn: "Production",
    labelZh: "生产计划",
    icon: <Factory className="w-5 h-5" />,
    path: "/admin/production",
  },
  {
    id: "inventory",
    labelAr: "إدارة المخزون",
    labelEn: "Inventory",
    labelZh: "库存管理",
    icon: <Warehouse className="w-5 h-5" />,
    path: "/admin/inventory",
  },
  {
    id: "stocktaking",
    labelAr: "الجرد الدوري",
    labelEn: "Stocktaking",
    labelZh: "定期盘点",
    icon: <ScanLine className="w-5 h-5" />,
    path: "/admin/stocktaking",
  },
  {
    id: "qc",
    labelAr: "فحص الجودة",
    labelEn: "Quality Control",
    labelZh: "质量检验",
    icon: <ShieldCheck className="w-5 h-5" />,
    path: "/admin/qc",
  },
  {
    id: "packing",
    labelAr: "التغليف والتسليم",
    labelEn: "Packing",
    labelZh: "包装与交付",
    icon: <Box className="w-5 h-5" />,
    path: "/admin/packing",
  },
  {
    id: "post-review",
    labelAr: "تقييم الطلبات",
    labelEn: "Post Review",
    labelZh: "订单评估",
    icon: <Star className="w-5 h-5" />,
    path: "/admin/post-review",
  },
  {
    id: "complaints",
    labelAr: "الشكاوى",
    labelEn: "Complaints",
    labelZh: "投诉",
    icon: <AlertCircle className="w-5 h-5" />,
    path: "/admin/complaints",
  },
  {
    id: "products",
    labelAr: "المنتجات",
    labelEn: "Products",
    labelZh: "产品",
    icon: <Package className="w-5 h-5" />,
    path: "/admin/products",
  },
  {
    id: "product-options",
    labelAr: "خيارات الطلب",
    labelEn: "Order Options",
    labelZh: "订单选项",
    icon: <Layers className="w-5 h-5" />,
    path: "/admin/product-options",
  },
  {
    id: "reports",
    labelAr: "التقارير",
    labelEn: "Reports",
    labelZh: "报告",
    icon: <BarChart3 className="w-5 h-5" />,
    path: "/admin/reports",
  },
  {
    id: "bi",
    labelAr: "تحليلات BI",
    labelEn: "BI Analytics",
    labelZh: "BI分析",
    icon: <TrendingUp className="w-5 h-5" />,
    path: "/admin/bi",
  },
  {
    id: "efficiency",
    labelAr: "تقارير الكفاءة",
    labelEn: "Efficiency",
    labelZh: "效率报告",
    icon: <Activity className="w-5 h-5" />,
    path: "/admin/efficiency",
  },
  {
    id: "decision-log",
    labelAr: "سجل القرارات",
    labelEn: "Decision Log",
    labelZh: "决策日志",
    icon: <ClipboardList className="w-5 h-5" />,
    path: "/admin/decision-log",
  },
  {
    id: "daily-summary",
    labelAr: "الملخص اليومي",
    labelEn: "Daily Summary",
    labelZh: "每日摘要",
    icon: <Send className="w-5 h-5" />,
    path: "/admin/daily-summary",
  },
  {
    id: "suppliers",
    labelAr: "الموردون",
    labelEn: "Suppliers",
    labelZh: "供应商",
    icon: <Building2 className="w-5 h-5" />,
    path: "/admin/suppliers",
  },
  {
    id: "rfq",
    labelAr: "طلبات التسعير",
    labelEn: "RFQ",
    labelZh: "询价单",
    icon: <ShoppingCart className="w-5 h-5" />,
    path: "/admin/rfq",
  },
  {
    id: "invoices",
    labelAr: "الفواتير",
    labelEn: "Invoices",
    labelZh: "发票",
    icon: <FileText className="w-5 h-5" />,
    path: "/admin/invoices",
  },
  {
    id: "zatca-invoices",
    labelAr: "فواتير ZATCA",
    labelEn: "ZATCA Invoices",
    labelZh: "ZATCA发票",
    icon: <FileText className="w-5 h-5" />,
    path: "/admin/zatca-invoices",
  },
  {
    id: "accounting",
    labelAr: "النظام المحاسبي",
    labelEn: "Accounting",
    labelZh: "会计系统",
    icon: <BookOpen className="w-5 h-5" />,
    path: "/admin/accounting",
  },
  {
    id: "purchases",
    labelAr: "فواتير المشتريات",
    labelEn: "Purchases",
    labelZh: "采购发票",
    icon: <ShoppingCart className="w-5 h-5" />,
    path: "/admin/purchases",
  },
  {
    id: "settings",
    labelAr: "الإعدادات",
    labelEn: "Settings",
    labelZh: "设置",
    icon: <Settings className="w-5 h-5" />,
    path: "/admin/settings",
  },
];

// Language config
const LANG_OPTIONS: { code: Language; label: string; flag: string }[] = [
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];

function getNavLabel(item: NavItem, lang: Language): string {
  if (lang === "zh") return item.labelZh;
  if (lang === "en") return item.labelEn;
  return item.labelAr;
}

export default function AdminLayout({
  children,
  title,
  subtitle,
  backHref,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  backHref?: string;
}) {
  const { lang, setLang, dir } = useLanguage();
  const { isAdminLoggedIn, isCheckingAuth, clearAdminToken } = useAdminAuth();
  const [location, navigate] = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  // جلب عدد الطلبات الجديدة من قاعدة البيانات
  const { data: newOrders } = trpc.orders.list.useQuery(
    { status: "new" },
    { refetchInterval: 30000, enabled: isAdminLoggedIn } // تحديث كل 30 ثانية
  );
  const newOrdersCount = newOrders?.length ?? 0;

  const { data: kpis } = trpc.orders.kpis.useQuery(undefined, {
    refetchInterval: 30000,
    enabled: isAdminLoggedIn,
  });

  const { data: stats } = trpc.orders.stats.useQuery(undefined, {
    refetchInterval: 30000,
    enabled: isAdminLoggedIn,
  });

  const isRtl = dir === "rtl";

  // While verifying the session cookie, render nothing to avoid flash-redirect
  if (isCheckingAuth) return null;

  // إعادة التوجيه لصفحة الدخول إذا لم يكن مسجلاً
  if (!isAdminLoggedIn) {
    navigate("/admin/login");
    return null;
  }

  const handleAdminLogout = () => {
    clearAdminToken();
    navigate("/admin/login");
  };

  const activeItem = NAV_ITEMS.find(n => {
    if (n.path === "/admin") return location === "/admin";
    return location.startsWith(n.path);
  });

  const currentLangOption =
    LANG_OPTIONS.find(l => l.code === lang) ?? LANG_OPTIONS[0];

  const collapseLabel =
    lang === "zh" ? "收起菜单" : lang === "en" ? "Collapse" : "طي القائمة";
  const siteLabel = lang === "zh" ? "网站" : lang === "en" ? "Site" : "الموقع";
  const searchLabel =
    lang === "zh"
      ? "快速搜索..."
      : lang === "en"
        ? "Quick search..."
        : "بحث سريع...";
  const adminPanelLabel =
    lang === "zh" ? "管理面板" : lang === "en" ? "Admin Panel" : "لوحة الإدارة";
  const sysAdminLabel =
    lang === "zh"
      ? "系统管理员"
      : lang === "en"
        ? "System Admin"
        : "مدير النظام";

  const SidebarContent = () => {
    const getBadgeCount = (itemId: string): number => {
      if (itemId === "orders") return newOrdersCount;
      if (itemId === "distributors") return kpis?.pendingDistributors ?? 0;
      if (itemId === "workflow") return (stats?.statusCounts?.new ?? 0) + (stats?.statusCounts?.reviewing ?? 0);
      if (itemId === "work-orders") return kpis?.inProductionWorkOrders ?? 0;
      if (itemId === "qc") return kpis?.pendingQc ?? 0;
      if (itemId === "packing") return kpis?.pendingPacking ?? 0;
      if (itemId === "complaints") return kpis?.openComplaints ?? 0;
      return 0;
    };

    return (
      <div className="flex flex-col h-full" dir={dir}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
          style={{
            background: "oklch(0.68 0.10 60)",
            color: "oklch(0.15 0.03 160)",
          }}
        >
          {lang === "zh" ? "辛" : "س"}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div
              className="font-bold text-white text-sm"
              style={{
                fontFamily:
                  lang === "zh" ? "inherit" : "DM Serif Display, serif",
              }}
            >
              {lang === "zh" ? "辛迪安" : lang === "en" ? "Sindian" : "سنديان"}
            </div>
            <div
              className="text-xs flex items-center gap-1"
              style={{ color: "oklch(0.68 0.10 60)" }}
            >
              <Shield className="w-3 h-3" />
              {adminPanelLabel}
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const isActive = item.id === activeItem?.id;
          return (
            <Link
              key={item.id}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative ${
                isActive
                  ? "text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              style={
                isActive ? { background: "oklch(0.38 0.06 160 / 0.8)" } : {}
              }
              onClick={() => setMobileOpen(false)}
            >
              <span
                className={`flex-shrink-0 transition-colors ${isActive ? "text-white" : "text-gray-500 group-hover:text-gray-300"}`}
              >
                {item.icon}
              </span>
              {!collapsed && (
                <span className="text-sm font-medium flex-1 truncate">
                  {getNavLabel(item, lang)}
                </span>
              )}
              {!collapsed && getBadgeCount(item.id) > 0 && (
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    background: "oklch(0.68 0.10 60)",
                    color: "oklch(0.15 0.03 160)",
                  }}
                >
                  {getBadgeCount(item.id)}
                </span>
              )}
              {collapsed && getBadgeCount(item.id) > 0 && (
                <span
                  className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full"
                  style={{ background: "oklch(0.68 0.10 60)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle (desktop) */}
      <div className="p-3 border-t border-white/10">
        {/* Admin info */}
        {!collapsed && (
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: "oklch(0.38 0.06 160)", color: "white" }}
            >
              {lang === "zh" ? "管" : "أ"}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-white truncate">
                {sysAdminLabel}
              </div>
              <div className="text-xs text-gray-500 truncate">
                admin@sindian.sa
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(v => !v)}
          className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all text-xs"
        >
          {collapsed ? (
            isRtl ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          ) : isRtl ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
          {!collapsed && collapseLabel}
        </button>
      </div>
    </div>
  );
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#F8F9FA" }}
      dir={dir}
    >
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="hidden lg:flex flex-col flex-shrink-0 overflow-hidden"
        style={{ background: "oklch(0.18 0.03 160)" }}
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 z-50 w-64 flex flex-col lg:hidden overflow-hidden"
              style={{
                background: "oklch(0.18 0.03 160)",
                [isRtl ? "right" : "left"]: 0,
              }}
              initial={{ x: isRtl ? 256 : -256 }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? 256 : -256 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Bar */}
        <header
          className="flex items-center justify-between px-4 sm:px-6 py-4 border-b flex-shrink-0"
          style={{ background: "white", borderColor: "#E5E7EB" }}
        >
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {backHref && (
                  <Link href={backHref}>
                    <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    </button>
                  </Link>
                )}
                <h1
                  className="font-bold text-gray-900 text-lg truncate"
                  style={{
                    fontFamily:
                      lang === "zh" ? "inherit" : "DM Serif Display, serif",
                  }}
                >
                  {title}
                </h1>
              </div>
              {subtitle && (
                <p className="text-xs text-gray-500 truncate">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Search */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-400 cursor-pointer hover:border-gray-300 transition-colors">
              <Search className="w-4 h-4" />
              <span className="text-xs">{searchLabel}</span>
            </div>

            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
                title="Change Language / تغيير اللغة / 切换语言"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {currentLangOption.flag} {currentLangOption.label}
                </span>
                <span className="sm:hidden">{currentLangOption.flag}</span>
              </button>

              <AnimatePresence>
                {langMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden min-w-[140px]"
                    style={{ [isRtl ? "left" : "right"]: 0 }}
                  >
                    {LANG_OPTIONS.map(option => (
                      <button
                        key={option.code}
                        onClick={() => {
                          setLang(option.code);
                          setLangMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 ${
                          lang === option.code
                            ? "font-semibold text-gray-900 bg-gray-50"
                            : "text-gray-600"
                        }`}
                      >
                        <span className="text-base">{option.flag}</span>
                        <span>{option.label}</span>
                        {lang === option.code && (
                          <span
                            className="ms-auto w-1.5 h-1.5 rounded-full"
                            style={{ background: "oklch(0.68 0.10 60)" }}
                          />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Notifications */}
            <button className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
              <span
                className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full"
                style={{ background: "oklch(0.68 0.10 60)" }}
              />
            </button>
            {/* Back to site */}
            <Link
              href="/"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
            >
              <Layers className="w-3.5 h-3.5" />
              {siteLabel}
            </Link>
            {/* Logout */}
            <button
              onClick={handleAdminLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-500 hover:bg-red-50 transition-colors border border-red-200"
              title="تسجيل الخروج"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>

      {/* Close lang menu on outside click */}
      {langMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setLangMenuOpen(false)}
        />
      )}
    </div>
  );
}
