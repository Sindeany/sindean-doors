// ============================================================
// Company Login Page - Sindian Doors B2B Portal
// Design: Architectural Luxury | Oak Green + Copper + Beige
// ============================================================

import { useState } from "react";
import { useLocation } from "wouter";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, Lock, Mail, ArrowRight, Eye, EyeOff, ShieldCheck, FileText, Package } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

export default function CompanyLogin() {
  const [, navigate] = useLocation();
  const { login } = useCompanyAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { dir } = useLanguage();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(dir === "rtl" ? "يرجى إدخال البريد الإلكتروني وكلمة المرور" : "Please enter your email and password");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    const success = login(email, password);
    setLoading(false);
    if (success) {
      toast.success(dir === "rtl" ? "مرحباً بك في بوابة الشركات" : "Welcome to the Company Portal");
      navigate("/company/dashboard");
    } else {
      toast.error(dir === "rtl" ? "بيانات الدخول غير صحيحة" : "Incorrect login credentials");
    }
  };

  const features = dir === "rtl" ? [
    { icon: FileText, title: "تتبع عروض الأسعار", desc: "راقب حالة كل طلب من الإرسال حتى القبول" },
    { icon: Package, title: "متابعة أوامر الشراء", desc: "خط زمني مفصل من التصنيع حتى التسليم" },
    { icon: ShieldCheck, title: "إدارة مركزية", desc: "جميع مشاريعك وطلباتك في لوحة واحدة" },
  ] : [
    { icon: FileText, title: "Track Quotations", desc: "Monitor each request status from submission to approval" },
    { icon: Package, title: "Purchase Order Tracking", desc: "Detailed timeline from manufacturing to delivery" },
    { icon: ShieldCheck, title: "Centralized Management", desc: "All your projects and orders in one dashboard" },
  ];

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "#FAF8F5", direction: dir, fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
    >
      {/* Left panel - info */}
      <div
        className="hidden lg:flex flex-col justify-between w-[45%] p-12 relative overflow-hidden"
        style={{ background: "#2C4A3E" }}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full border-2 border-white" />
          <div className="absolute top-40 left-32 w-40 h-40 rounded-full border border-white" />
          <div className="absolute bottom-32 right-10 w-80 h-80 rounded-full border-2 border-white" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#C4956A" }}>
                <span className="text-white font-bold text-lg" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  {dir === "rtl" ? "س" : "S"}
                </span>
              </div>
              <div>
                <p className="text-white font-bold text-lg" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  {dir === "rtl" ? "سنديان" : "Sindian"}
                </p>
                <p className="text-white/60 text-xs">
                  {dir === "rtl" ? "للأبواب الخشبية" : "Wooden Doors"}
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Main content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
              {dir === "rtl" ? (
                <>بوابة الشركات<br /><span style={{ color: "#D4A574" }}>والمشاريع</span></>
              ) : (
                <>Company &<br /><span style={{ color: "#D4A574" }}>Projects Portal</span></>
              )}
            </h2>
            <p className="text-white/70 text-lg leading-relaxed">
              {dir === "rtl"
                ? "تابع طلباتك وعروض أسعارك وأوامر الشراء في مكان واحد"
                : "Track your orders, quotations, and purchase orders in one place"}
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{f.title}</p>
                  <p className="text-white/60 text-xs mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom note */}
        <div className="relative z-10">
          <p className="text-white/40 text-xs">
            {dir === "rtl" ? "للتسجيل كشركة جديدة، تواصل مع فريق المبيعات على" : "To register as a new company, contact the sales team at"}
            <span className="text-white/70 mx-1">920-000-000</span>
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <Link href="/">
              <div className="flex items-center gap-3 cursor-pointer">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#2C4A3E" }}>
                  <span className="text-white font-bold text-lg">{dir === "rtl" ? "س" : "S"}</span>
                </div>
                <div>
                  <p className="font-bold text-lg" style={{ color: "#2C4A3E", fontFamily: "'DM Serif Display', serif" }}>
                    {dir === "rtl" ? "سنديان" : "Sindian"}
                  </p>
                  <p className="text-xs text-gray-500">{dir === "rtl" ? "للأبواب الخشبية" : "Wooden Doors"}</p>
                </div>
              </div>
            </Link>
          </div>

          <div className="mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "#2C4A3E" }}>
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: "#2C4A3E", fontFamily: "'DM Serif Display', serif" }}>
              {dir === "rtl" ? "دخول الشركات" : "Company Sign In"}
            </h1>
            <p className="text-gray-500 text-sm">
              {dir === "rtl" ? "سجّل دخولك لمتابعة طلباتك وعروض أسعارك" : "Sign in to track your orders and quotations"}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium" style={{ color: "#2C4A3E" }}>
                {dir === "rtl" ? "البريد الإلكتروني للشركة" : "Company Email"}
              </Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="company@example.sa"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pr-10 h-11 text-sm"
                  style={{ borderColor: "#E8DFD0", direction: "ltr", textAlign: "right" }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium" style={{ color: "#2C4A3E" }}>
                {dir === "rtl" ? "كلمة المرور" : "Password"}
              </Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 pl-10 h-11 text-sm"
                  style={{ borderColor: "#E8DFD0" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="text-sm hover:underline"
                style={{ color: "#C4956A" }}
                onClick={() => toast.info(dir === "rtl" ? "يرجى التواصل مع مدير حسابك لإعادة تعيين كلمة المرور" : "Please contact your account manager to reset your password")}
              >
                {dir === "rtl" ? "نسيت كلمة المرور؟" : "Forgot password?"}
              </button>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: "#2C4A3E", color: "white" }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{dir === "rtl" ? "دخول البوابة" : "Enter Portal"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Demo hint */}
          <div className="mt-6 p-4 rounded-xl text-sm" style={{ background: "rgba(44,74,62,0.06)", border: "1px solid rgba(44,74,62,0.12)" }}>
            <p className="font-semibold mb-1" style={{ color: "#2C4A3E" }}>
              {dir === "rtl" ? "للتجربة:" : "Demo:"}
            </p>
            <p className="text-gray-500 text-xs">
              {dir === "rtl" ? "أدخل أي بريد إلكتروني وكلمة مرور للدخول" : "Enter any email and password to sign in"}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {dir === "rtl" ? "مثال: company@test.sa | أي كلمة مرور" : "Example: company@test.sa | any password"}
            </p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              {dir === "rtl" ? "لست شركة مسجلة؟" : "Not a registered company?"}{" "}
              <Link href="/b2b">
                <span className="hover:underline cursor-pointer" style={{ color: "#C4956A" }}>
                  {dir === "rtl" ? "تواصل معنا للتسجيل" : "Contact us to register"}
                </span>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
