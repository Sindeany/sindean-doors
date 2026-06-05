// ============================================================
// Distributor Layout - Sidebar + Header
// Design: Architectural Luxury | Dark oak sidebar + clean content area
// ============================================================

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useDistributorAuth } from "@/contexts/DistributorAuthContext";
import { tierConfig } from "@/lib/distributorData";
import {
  LayoutDashboard,
  ShoppingBag,
  BarChart3,
  Package,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  User,
  Settings,
  HelpCircle,
  CreditCard,
  AlertCircle,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface DistributorLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function DistributorLayout({ children, title, subtitle }: DistributorLayoutProps) {
  const [location] = useLocation();
  const { distributor, logout } = useDistributorAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [, navigate] = useLocation();
  const { dir } = useLanguage();

  const navItems = [
    { path: "/distributor/dashboard", icon: LayoutDashboard, label: dir === "rtl" ? "لوحة التحكم" : "Dashboard" },
    { path: "/distributor/orders", icon: ShoppingBag, label: dir === "rtl" ? "الطلبات" : "Orders" },
    { path: "/distributor/payments", icon: DollarSign, label: dir === "rtl" ? "المدفوعات" : "Payments" },
    { path: "/distributor/reports", icon: BarChart3, label: dir === "rtl" ? "التقارير" : "Reports" },
    { path: "/distributor/catalogue", icon: Package, label: dir === "rtl" ? "كتالوج المنتجات" : "Product Catalogue" },
    { path: "/distributor/account", icon: User, label: dir === "rtl" ? "حسابي" : "My Account" },
    { path: "/distributor/complaints", icon: AlertCircle, label: dir === "rtl" ? "مركز الشكاوى" : "Complaints" },
  ];

  const bottomNavItems = [
    { icon: Settings, label: dir === "rtl" ? "الإعدادات" : "Settings" },
    { icon: HelpCircle, label: dir === "rtl" ? "المساعدة" : "Help" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/distributor");
    toast.success(dir === "rtl" ? "تم تسجيل الخروج بنجاح" : "Logged out successfully");
  };

  const tier = distributor ? tierConfig[distributor.tier] : null;
  const creditPercent = distributor
    ? Math.round((distributor.creditUsed / distributor.creditLimit) * 100)
    : 0;

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>
      {/* Logo */}
      <div className="p-6 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
        <Link href="/" className="flex items-center gap-3 group">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "oklch(0.68 0.10 60)" }}
          >
            <span className="text-white font-bold text-base" style={{ fontFamily: "DM Serif Display, serif" }}>
              {dir === "rtl" ? "س" : "S"}
            </span>
          </div>
          <div>
            <div className="text-white font-bold text-base" style={{ fontFamily: "DM Serif Display, serif" }}>
              {dir === "rtl" ? "سنديان" : "Sindian"}
            </div>
            <div className="text-white/40 text-xs">
              {dir === "rtl" ? "بوابة الموزعين" : "Distributor Portal"}
            </div>
          </div>
        </Link>
      </div>

      {/* Distributor profile card */}
      {distributor && (
        <div className="p-4 mx-3 mt-4 rounded-xl" style={{ background: "oklch(1 0 0 / 0.06)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: "oklch(0.68 0.10 60)" }}
            >
              {distributor.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-white text-sm font-medium truncate">{distributor.name}</div>
              <div className="text-white/50 text-xs truncate">{distributor.company}</div>
            </div>
          </div>
          {/* Tier badge */}
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${tier?.color}30`, color: tier?.color }}
            >
              {dir === "rtl" ? `موزع ${tier?.label}` : `${tier?.label} Distributor`}
            </span>
            <span className="text-white/50 text-xs">
              {dir === "rtl" ? `خصم ${distributor.discount}%` : `${distributor.discount}% discount`}
            </span>
          </div>
          {/* Credit bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/40">{dir === "rtl" ? "الائتمان المستخدم" : "Credit Used"}</span>
              <span className="text-white/60">{creditPercent}%</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: "oklch(1 0 0 / 0.1)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${creditPercent}%`,
                  background: creditPercent > 80 ? "#ef4444" : "oklch(0.68 0.10 60)",
                }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-white/40">
                {(distributor.creditUsed / 1000).toFixed(0)}K {dir === "rtl" ? "ر.س" : "SAR"}
              </span>
              <span className="text-white/40">
                {(distributor.creditLimit / 1000).toFixed(0)}K {dir === "rtl" ? "ر.س" : "SAR"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-white/30 text-xs px-3 mb-2 uppercase tracking-wider">
          {dir === "rtl" ? "القائمة الرئيسية" : "Main Menu"}
        </div>
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location === path;
          return (
            <Link key={path} href={path}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                  isActive ? "text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
                style={
                  isActive
                    ? { background: "oklch(0.68 0.10 60 / 0.2)", color: "oklch(0.78 0.08 60)" }
                    : {}
                }
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{label}</span>
                {isActive && <ChevronLeft className={`w-3 h-3 ${dir === "ltr" ? "rotate-180" : ""} ${dir === "rtl" ? "mr-auto" : "ml-auto"}`} />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom items */}
      <div className="px-3 pb-4 space-y-1 border-t pt-4" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
        {bottomNavItems.map(({ icon: Icon, label }) => (
          <button
            key={label}
            onClick={() => toast.info(`${label} - ${dir === "rtl" ? "قريباً" : "Coming Soon"}`)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all"
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{label}</span>
          </button>
        ))}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{dir === "rtl" ? "تسجيل الخروج" : "Sign Out"}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50" dir={dir}>
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex w-64 flex-col flex-shrink-0"
        style={{ background: "oklch(0.22 0.05 160)" }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className="relative w-72 flex flex-col z-10"
            style={{ background: "oklch(0.22 0.05 160)" }}
          >
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 left-4 text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header
          className="flex items-center justify-between px-6 py-4 bg-white border-b flex-shrink-0"
          style={{ borderColor: "oklch(0.92 0.004 286.32)" }}
        >
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              style={{ color: "oklch(0.38 0.06 160)" }}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1
                className="text-xl font-bold"
                style={{ color: "oklch(0.25 0.04 160)", fontFamily: "DM Serif Display, serif" }}
              >
                {title}
              </h1>
              {subtitle && (
                <p
                  className="text-sm mt-0.5"
                  style={{ color: "oklch(0.55 0.02 160)", fontFamily: "IBM Plex Sans Arabic, sans-serif" }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => toast.info(dir === "rtl" ? "لديك 3 إشعارات جديدة" : "You have 3 new notifications")}
            >
              <Bell className="w-5 h-5" style={{ color: "oklch(0.45 0.04 160)" }} />
              <span
                className="absolute top-1 right-1 w-2 h-2 rounded-full"
                style={{ background: "oklch(0.68 0.10 60)" }}
              />
            </button>

            {/* Credit indicator */}
            <button
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
              style={{
                background: "oklch(0.96 0.01 160)",
                color: "oklch(0.38 0.06 160)",
                fontFamily: "IBM Plex Sans Arabic, sans-serif",
              }}
              onClick={() => toast.info(dir === "rtl" ? "الائتمان المتاح: 312,500 ر.س" : "Available Credit: SAR 312,500")}
            >
              <CreditCard className="w-4 h-4" />
              <span>{dir === "rtl" ? "312,500 ر.س" : "SAR 312,500"}</span>
            </button>

            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm cursor-pointer"
              style={{ background: "oklch(0.38 0.06 160)" }}
              onClick={() => navigate("/distributor/account")}
            >
              {distributor?.name.charAt(0) ?? (dir === "rtl" ? "م" : "D")}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
