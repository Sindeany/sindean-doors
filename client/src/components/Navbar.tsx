/**
 * Design: Architectural Luxury - Warm Minimalism
 * Navbar: Clean, elegant top navigation with oak green + copper accents
 * Bilingual RTL/LTR with language switcher
 */
import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

import { useCart } from "@/contexts/CartContext";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import {
  Menu,
  X,
  ShoppingCart,
  User,
  Building2,
  Truck,
  Phone,
  Heart,
  Package,
  LogOut,
  LayoutDashboard,
  ChevronDown,
  Globe,
} from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [location] = useLocation();
  const { summary, openCart } = useCart();
  const { user, logout, wishlistIds } = useUserAuth();
  const { lang, setLang, t, dir } = useLanguage();
  const userMenuRef = useRef<HTMLDivElement>(null);

  const navLinks = [
    { label: t("nav.home"), href: "/" },
    { label: t("nav.products"), href: "/products" },
    { label: t("nav.projects"), href: "/projects" },
    { label: t("nav.b2b"), href: "/b2b", icon: Building2 },
    { label: t("nav.distributor"), href: "/distributor", icon: Truck },
    { label: t("nav.company"), href: "/company", icon: Building2 },
    { label: t("nav.about"), href: "/about" },
    { label: t("nav.contact"), href: "/contact", icon: Phone },
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const toggleLang = () => setLang(lang === "ar" ? "en" : "ar");

  return (
    <>
      {/* Top bar */}
      <div className="bg-oak text-white text-sm py-2 hidden md:block">
        <div className="container flex justify-between items-center">
          <div
            className={`flex items-center gap-6 ${dir === "ltr" ? "flex-row" : ""}`}
          >
            <span>{t("nav.topbar.discount")}</span>
            <span className="w-px h-4 bg-white/20 inline-block"></span>
            <span>{t("nav.topbar.shipping")}</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="tel:+966500000000"
              className="hover:text-copper-light transition-colors"
            >
              920-000-000
            </a>
            <span className="text-white/30">|</span>
            <span>info@sindian.sa</span>
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <header
        className={`sticky top-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-border"
            : "bg-warm-white"
        }`}
      >
        <div className="container flex items-center justify-between h-18 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-sm bg-oak flex items-center justify-center">
                <svg
                  viewBox="0 0 40 40"
                  className="w-6 h-6 lg:w-7 lg:h-7 text-white"
                  fill="currentColor"
                >
                  <path d="M20 4C20 4 28 10 28 20C28 30 20 36 20 36C20 36 12 30 12 20C12 10 20 4 20 4Z" />
                  <line
                    x1="20"
                    y1="10"
                    x2="20"
                    y2="32"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    opacity="0.5"
                  />
                  <line
                    x1="16"
                    y1="14"
                    x2="20"
                    y2="18"
                    stroke="currentColor"
                    strokeWidth="1"
                    opacity="0.4"
                  />
                  <line
                    x1="24"
                    y1="16"
                    x2="20"
                    y2="20"
                    stroke="currentColor"
                    strokeWidth="1"
                    opacity="0.4"
                  />
                </svg>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl lg:text-2xl font-bold text-oak leading-tight tracking-tight">
                {lang === "ar" ? "سنديان" : "Sindian"}
              </span>
              <span className="text-[10px] lg:text-xs text-muted-foreground tracking-widest">
                {lang === "ar" ? "للأبواب الخشبية" : "Wooden Doors"}
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 ${
                  location === link.href
                    ? "text-oak bg-oak/5"
                    : "text-foreground/70 hover:text-oak hover:bg-oak/5"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Language switcher */}
            <button
              onClick={toggleLang}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:bg-oak/5"
              style={{ borderColor: "#E8DFD0", color: "#2C4A3E" }}
              title={lang === "ar" ? "Switch to English" : "التبديل للعربية"}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === "ar" ? "EN" : "ع"}</span>
            </button>

            {/* Cart */}
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground/70 hover:text-oak hover:bg-oak/5 relative"
              onClick={openCart}
            >
              <ShoppingCart className="w-5 h-5" />
              {summary.totalItems > 0 && (
                <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-[#C4956A] text-white text-[10px] font-bold flex items-center justify-center">
                  {summary.totalItems > 9 ? "9+" : summary.totalItems}
                </span>
              )}
            </Button>

            {/* User account */}
            <div className="relative" ref={userMenuRef}>
              {user ? (
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-oak/5"
                  style={{ color: "#2C4A3E" }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: "#2C4A3E" }}
                  >
                    {user.name.charAt(0)}
                  </div>
                  <span className="hidden md:block max-w-[80px] truncate">
                    {user.name.split(" ")[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </button>
              ) : (
                <Link href="/login">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-foreground/70 hover:text-oak hover:bg-oak/5"
                  >
                    <User className="w-5 h-5" />
                  </Button>
                </Link>
              )}

              {/* User dropdown */}
              {userMenuOpen && user && (
                <div
                  className="absolute top-full mt-2 w-52 rounded-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
                  style={{
                    background: "white",
                    border: "1px solid #E8DFD0",
                    boxShadow: "0 8px 32px rgba(44,74,62,0.12)",
                    [dir === "rtl" ? "left" : "right"]: 0,
                  }}
                >
                  <div
                    className="px-4 py-3"
                    style={{ borderBottom: "1px solid #F0EBE3" }}
                  >
                    <div
                      className="font-semibold text-sm"
                      style={{ color: "#2C4A3E" }}
                    >
                      {user.name}
                    </div>
                    <div
                      className="text-xs mt-0.5"
                      style={{ color: "#6B7B75" }}
                    >
                      {user.email}
                    </div>
                  </div>
                  <div className="py-1.5">
                    <Link
                      href="/account"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <div
                        className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                        style={{ color: "#2C4A3E" }}
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        {t("nav.account")}
                      </div>
                    </Link>
                    <Link
                      href="/account/orders"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <div
                        className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                        style={{ color: "#2C4A3E" }}
                      >
                        <Package className="w-4 h-4" />
                        {t("nav.myOrders")}
                      </div>
                    </Link>
                    <Link
                      href="/account/wishlist"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <div
                        className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                        style={{ color: "#2C4A3E" }}
                      >
                        <Heart className="w-4 h-4" />
                        {t("nav.wishlist")}
                        {wishlistIds.length > 0 && (
                          <span
                            className="mr-auto text-xs font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: "#F0EBE3", color: "#C4956A" }}
                          >
                            {wishlistIds.length}
                          </span>
                        )}
                      </div>
                    </Link>
                  </div>
                  <div
                    className="py-1.5"
                    style={{ borderTop: "1px solid #F0EBE3" }}
                  >
                    <button
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                      }}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm w-full hover:bg-red-50 transition-colors"
                      style={{ color: "#E05C5C" }}
                    >
                      <LogOut className="w-4 h-4" />
                      {t("nav.logout")}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Button
              className="hidden sm:flex bg-oak hover:bg-oak-dark text-white gap-2"
              asChild
            >
              <Link href="/b2b">{t("nav.rfq")}</Link>
            </Button>

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-foreground/70"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden overflow-hidden border-t border-border bg-white animate-in slide-in-from-top-2 duration-200">
            <nav className="container py-4 flex flex-col gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-3 text-base font-medium rounded-md transition-all ${
                    location === link.href
                      ? "text-oak bg-oak/5"
                      : "text-foreground/70 hover:text-oak hover:bg-oak/5"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    {link.icon && <link.icon className="w-5 h-5" />}
                    {link.label}
                  </span>
                </Link>
              ))}
              {/* Mobile language switcher */}
              <button
                onClick={toggleLang}
                className="flex items-center gap-2 px-4 py-3 text-base font-medium rounded-md transition-all text-foreground/70 hover:text-oak hover:bg-oak/5"
              >
                <Globe className="w-5 h-5" />
                {lang === "ar" ? "Switch to English" : "التبديل للعربية"}
              </button>
              <div className="mt-3 pt-3 border-t border-border">
                <Button
                  className="w-full bg-oak hover:bg-oak-dark text-white"
                  asChild
                >
                  <Link href="/b2b">{t("nav.rfq")}</Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
