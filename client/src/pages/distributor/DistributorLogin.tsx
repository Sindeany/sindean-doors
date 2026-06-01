// ============================================================
// Distributor Login Page - Sindian Doors
// Design: Architectural Luxury | Split-screen layout
// Oak Green sidebar + Clean white form panel
// ============================================================

import { useState } from "react";
import { useLocation } from "wouter";
import { useDistributorAuth } from "@/contexts/DistributorAuthContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, ArrowLeft, Shield, Award, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function DistributorLogin() {
  const [, navigate] = useLocation();
  const { login } = useDistributorAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { dir } = useLanguage();

  const loginMutation = trpc.distributors.login.useMutation({
    onSuccess: (data) => {
      login(data.distributor as any);
      toast.success(dir === "rtl" ? "مرحباً بك في بوابة الموزعين!" : "Welcome to the Distributor Portal!");
      navigate("/distributor/dashboard");
    },
    onError: (error) => {
      toast.error(error.message || (dir === "rtl" ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : "Incorrect email or password"));
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(dir === "rtl" ? "يرجى إدخال البريد الإلكتروني وكلمة المرور" : "Please enter your email and password");
      return;
    }
    loginMutation.mutate({ email, password });
  };

  const features = dir === "rtl" ? [
    { icon: Shield, text: "أسعار حصرية للموزعين بخصم يصل إلى 35%" },
    { icon: TrendingUp, text: "تقارير مبيعات تفصيلية وتحليلات أداء" },
    { icon: Award, text: "برنامج نقاط ومكافآت للموزعين المميزين" },
  ] : [
    { icon: Shield, text: "Exclusive distributor pricing with up to 35% discount" },
    { icon: TrendingUp, text: "Detailed sales reports and performance analytics" },
    { icon: Award, text: "Points and rewards program for distinguished distributors" },
  ];

  const stats = dir === "rtl" ? [
    { value: "150+", label: "موزع نشط" },
    { value: "25%", label: "متوسط الخصم" },
    { value: "24h", label: "وقت الاستجابة" },
  ] : [
    { value: "150+", label: "Active Distributors" },
    { value: "25%", label: "Average Discount" },
    { value: "24h", label: "Response Time" },
  ];

  return (
    <div className="min-h-screen flex" dir={dir}>
      {/* Decorative Panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "oklch(0.30 0.06 160)" }}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute border border-white rounded-full"
              style={{ width: `${(i + 1) * 120}px`, height: `${(i + 1) * 120}px`, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
            />
          ))}
        </div>

        {/* Logo */}
        <div>
          <a href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.68 0.10 60)" }}>
              <span className="text-white font-bold text-lg" style={{ fontFamily: "DM Serif Display, serif" }}>
                {dir === "rtl" ? "س" : "S"}
              </span>
            </div>
            <div>
              <span className="text-white font-bold text-xl" style={{ fontFamily: "DM Serif Display, serif" }}>
                {dir === "rtl" ? "سنديان" : "Sindian"}
              </span>
              <p className="text-white/60 text-xs" style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>
                {dir === "rtl" ? "للأبواب الخشبية" : "Wooden Doors"}
              </p>
            </div>
          </a>
        </div>

        {/* Center content */}
        <div className="relative z-10">
          <div className="inline-block px-3 py-1 rounded-full text-xs mb-6" style={{ background: "oklch(0.68 0.10 60 / 0.2)", color: "oklch(0.78 0.08 60)", fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>
            {dir === "rtl" ? "بوابة الموزعين الحصرية" : "Exclusive Distributor Portal"}
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight" style={{ fontFamily: "DM Serif Display, serif" }}>
            {dir === "rtl" ? <>إدارة أعمالك<br /><span style={{ color: "oklch(0.78 0.08 60)" }}>بكل سهولة</span></> : <>Manage Your Business<br /><span style={{ color: "oklch(0.78 0.08 60)" }}>With Ease</span></>}
          </h1>
          <p className="text-white/70 text-base leading-relaxed" style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>
            {dir === "rtl"
              ? "منصة متكاملة لإدارة طلباتك وتتبع شحناتك وعرض تقارير مبيعاتك التفصيلية في مكان واحد."
              : "An integrated platform to manage your orders, track shipments, and view detailed sales reports all in one place."}
          </p>

          <div className="mt-8 space-y-4">
            {features.map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.68 0.10 60 / 0.25)" }}>
                  <Icon className="w-4 h-4" style={{ color: "oklch(0.78 0.08 60)" }} />
                </div>
                <span className="text-white/80 text-sm" style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="grid grid-cols-3 gap-4 relative z-10">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl font-bold" style={{ color: "oklch(0.78 0.08 60)", fontFamily: "DM Serif Display, serif" }}>{stat.value}</div>
              <div className="text-white/50 text-xs mt-1" style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Login Form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 bg-white lg:px-16">
        <div className="mb-8">
          <a href="/" className="inline-flex items-center gap-2 text-sm transition-colors" style={{ color: "oklch(0.55 0.03 160)", fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>
            <ArrowLeft className="w-4 h-4" />
            {dir === "rtl" ? "العودة للموقع الرئيسي" : "Back to Main Site"}
          </a>
        </div>

        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.38 0.06 160)" }}>
            <span className="text-white font-bold text-lg" style={{ fontFamily: "DM Serif Display, serif" }}>
              {dir === "rtl" ? "س" : "S"}
            </span>
          </div>
          <div>
            <span className="font-bold text-xl" style={{ color: "oklch(0.38 0.06 160)", fontFamily: "DM Serif Display, serif" }}>
              {dir === "rtl" ? "سنديان" : "Sindian"}
            </span>
            <p className="text-gray-400 text-xs" style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>
              {dir === "rtl" ? "بوابة الموزعين" : "Distributor Portal"}
            </p>
          </div>
        </div>

        <div className="max-w-sm w-full mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2" style={{ color: "oklch(0.25 0.04 160)", fontFamily: "DM Serif Display, serif" }}>
              {dir === "rtl" ? "تسجيل الدخول" : "Sign In"}
            </h2>
            <p className="text-sm" style={{ color: "oklch(0.55 0.02 160)", fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>
              {dir === "rtl" ? "أدخل بيانات حسابك للوصول إلى بوابة الموزعين" : "Enter your account credentials to access the distributor portal"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium" style={{ color: "oklch(0.35 0.04 160)", fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>
                {dir === "rtl" ? "البريد الإلكتروني" : "Email Address"}
              </Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "oklch(0.55 0.03 160)" }} />
                <Input
                  id="email"
                  type="email"
                  placeholder="distributor@company.sa"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pr-10 text-right border-gray-200"
                  style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium" style={{ color: "oklch(0.35 0.04 160)", fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>
                  {dir === "rtl" ? "كلمة المرور" : "Password"}
                </Label>
                <button
                  type="button"
                  className="text-xs transition-colors"
                  style={{ color: "oklch(0.68 0.10 60)", fontFamily: "IBM Plex Sans Arabic, sans-serif" }}
                  onClick={() => toast.info(dir === "rtl" ? "سيتم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني" : "A password reset link will be sent to your email")}
                >
                  {dir === "rtl" ? "نسيت كلمة المرور؟" : "Forgot password?"}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "oklch(0.55 0.03 160)" }} />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 pl-10 border-gray-200"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "oklch(0.55 0.03 160)" }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="rounded-lg p-3 text-xs" style={{ background: "oklch(0.96 0.01 160)", color: "oklch(0.38 0.06 160)", fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>
              <strong>{dir === "rtl" ? "للتجربة:" : "Demo:"}</strong>{" "}
              {dir === "rtl" ? "أدخل أي بريد إلكتروني صحيح وأي كلمة مرور" : "Enter any valid email and any password"}
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium transition-all"
              style={{ background: "oklch(0.38 0.06 160)", color: "white", fontFamily: "IBM Plex Sans Arabic, sans-serif" }}
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {dir === "rtl" ? "جاري تسجيل الدخول..." : "Signing in..."}
                </span>
              ) : (
                dir === "rtl" ? "دخول البوابة" : "Enter Portal"
              )}
            </Button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "oklch(0.55 0.02 160)", fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>
            {dir === "rtl" ? "لست موزعاً بعد؟" : "Not a distributor yet?"}{" "}
            <button
              onClick={() => toast.info(dir === "rtl" ? "سيتم التواصل معك لمناقشة شروط الموزع" : "We will contact you to discuss distributor terms")}
              className="font-medium hover:underline"
              style={{ color: "oklch(0.68 0.10 60)" }}
            >
              {dir === "rtl" ? "انضم لشبكة الموزعين" : "Join the Distributor Network"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
