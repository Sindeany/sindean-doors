// ============================================================
// Company Portal Layout - Sindian Doors
// Design: Architectural Luxury | Oak Green + Copper + Beige
// Uses correct CSS variables: --color-oak, --color-copper, --color-beige
// ============================================================

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import {
  LayoutDashboard, FileText, Package, User, LogOut,
  Menu, X, Bell, ChevronDown, Building2, ChevronRight,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { company, logout } = useCompanyAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { dir } = useLanguage();
  const isRTL = dir === "rtl";

  const navItems = [
    { href: "/company/dashboard", label: isRTL ? "لوحة التحكم" : "Dashboard", icon: LayoutDashboard },
    { href: "/company/rfq", label: isRTL ? "عروض الأسعار" : "Quotations", icon: FileText },
    { href: "/company/orders", label: isRTL ? "أوامر الشراء" : "Purchase Orders", icon: Package },
    { href: "/company/account", label: isRTL ? "حسابي" : "My Account", icon: User },
  ];

  const handleLogout = () => {
    logout();
    navigate("/company");
  };

  const sidebarPos = isRTL ? "right-0" : "left-0";
  const sidebarTranslate = sidebarOpen ? "translate-x-0" : (isRTL ? "translate-x-full" : "-translate-x-full");

  return (
    <div
      className="min-h-screen flex"
      style={{
        background: "#F5F0E8",
        direction: dir,
        fontFamily: isRTL ? "'IBM Plex Sans Arabic', sans-serif" : "'Inter', sans-serif",
      }}
    >
      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 ${sidebarPos} z-50 w-64 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto ${sidebarTranslate}`}
        style={{
          background: "linear-gradient(180deg, #1e3329 0%, #2C4A3E 60%, #243d33 100%)",
          boxShadow: "4px 0 24px rgba(0,0,0,0.18)",
        }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer group">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                style={{ background: "linear-gradient(135deg, #C4956A 0%, #D4A574 100%)" }}
              >
                <span className="text-white font-bold text-lg" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  {isRTL ? "س" : "S"}
                </span>
              </div>
              <div>
                <p className="text-white font-bold text-base leading-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  {isRTL ? "سنديان" : "Sindian"}
                </p>
                <p className="text-white/50 text-xs leading-tight mt-0.5">
                  {isRTL ? "بوابة الشركات" : "Company Portal"}
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Company info card */}
        <div className="mx-3 my-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #C4956A 0%, #D4A574 100%)" }}
            >
              {company?.companyName?.charAt(0) ?? (isRTL ? "ش" : "C")}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate leading-tight">{company?.companyName}</p>
              <p className="text-white/50 text-xs truncate mt-0.5">{company?.contactName}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const active = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
                    active
                      ? "text-white shadow-md"
                      : "text-white/60 hover:text-white hover:bg-white/8"
                  }`}
                  style={active ? {
                    background: "linear-gradient(135deg, rgba(196,149,106,0.25) 0%, rgba(196,149,106,0.12) 100%)",
                    borderLeft: isRTL ? "none" : "3px solid #C4956A",
                    borderRight: isRTL ? "3px solid #C4956A" : "none",
                  } : {}}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon
                    className="flex-shrink-0"
                    style={{ width: "18px", height: "18px", color: active ? "#C4956A" : "inherit" }}
                  />
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  {active && (
                    <ChevronRight
                      className="w-3.5 h-3.5 flex-shrink-0"
                      style={{ color: "#C4956A", transform: isRTL ? "rotate(180deg)" : "none" }}
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-5 pt-2 border-t border-white/10 mt-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-white/50 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">{isRTL ? "تسجيل الخروج" : "Sign Out"}</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 h-16 border-b"
          style={{
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(12px)",
            borderColor: "#E8DFD0",
            boxShadow: "0 1px 12px rgba(44,74,62,0.06)",
          }}
        >
          {/* Left: hamburger + page title */}
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-xl transition-colors"
              style={{ color: "#2C4A3E" }}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden lg:block">
              <p className="text-sm font-bold" style={{ color: "#2C4A3E", fontFamily: "'DM Serif Display', serif" }}>
                {navItems.find((n) => location.startsWith(n.href))?.label ?? (isRTL ? "بوابة الشركات" : "Company Portal")}
              </p>
            </div>
          </div>

          {/* Right: notifications + profile */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button
              className="relative p-2.5 rounded-xl transition-colors"
              style={{ color: "#2C4A3E" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#F5F0E8")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Bell style={{ width: "18px", height: "18px" }} />
              <span
                className="absolute top-2 right-2 w-2 h-2 rounded-full"
                style={{ background: "#C4956A" }}
              />
            </button>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors"
                style={{ color: "#2C4A3E" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F5F0E8")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #2C4A3E 0%, #3d6b5a 100%)" }}
                >
                  {company?.contactName?.charAt(0) ?? (isRTL ? "ش" : "C")}
                </div>
                <span className="hidden sm:block text-sm font-semibold" style={{ color: "#2C4A3E" }}>
                  {company?.contactName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {profileOpen && (
                <div
                  className={`absolute ${isRTL ? "left-0" : "right-0"} mt-2 w-56 rounded-2xl shadow-xl border overflow-hidden z-50`}
                  style={{ background: "white", borderColor: "#E8DFD0", boxShadow: "0 8px 32px rgba(44,74,62,0.12)" }}
                >
                  <div className="px-4 py-3 border-b" style={{ borderColor: "#E8DFD0", background: "#FAF8F5" }}>
                    <p className="text-sm font-bold" style={{ color: "#2C4A3E" }}>{company?.contactName}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{company?.email}</p>
                  </div>
                  <div className="p-2">
                    <Link href="/company/account">
                      <button
                        className={`w-full ${isRTL ? "text-right" : "text-left"} px-3 py-2.5 text-sm rounded-xl hover:bg-[#F5F0E8] flex items-center gap-2.5 transition-colors`}
                        style={{ color: "#2C4A3E" }}
                        onClick={() => setProfileOpen(false)}
                      >
                        <User className="w-4 h-4 text-gray-400" />
                        <span>{isRTL ? "الملف الشخصي" : "Profile"}</span>
                      </button>
                    </Link>
                    <button
                      className={`w-full ${isRTL ? "text-right" : "text-left"} px-3 py-2.5 text-sm rounded-xl hover:bg-red-50 flex items-center gap-2.5 transition-colors text-red-500`}
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{isRTL ? "تسجيل الخروج" : "Sign Out"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
