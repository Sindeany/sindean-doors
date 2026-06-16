// ============================================================
// Distributor Login Page - Sindian Doors
// Design: Architectural Luxury | Split-screen layout
// Oak Green sidebar + Clean white form panel
// ============================================================

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useDistributorAuth } from "@/contexts/DistributorAuthContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowLeft,
  Shield,
  Award,
  TrendingUp,
  Building,
  Phone,
  MapPin,
  Globe,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function DistributorLogin() {
  const [, navigate] = useLocation();
  const { login, distributor } = useDistributorAuth();
  const [view, setView] = useState<"login" | "register">("login");
  const { dir } = useLanguage();

  useEffect(() => {
    if (distributor) {
      navigate("/distributor/dashboard");
    }
  }, [distributor, navigate]);

  // Login States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Registration States
  const [regName, setRegName] = useState("");
  const [regCompany, setRegCompany] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regRegion, setRegRegion] = useState("");
  
  // Optional Registration States
  const [regWhatsapp, setRegWhatsapp] = useState("");
  const [regWebsite, setRegWebsite] = useState("");
  const [regCommercialReg, setRegCommercialReg] = useState("");
  const [regVatNumber, setRegVatNumber] = useState("");
  const [regBankName, setRegBankName] = useState("");
  const [regBankIban, setRegBankIban] = useState("");
  const [showOptional, setShowOptional] = useState(false);

  const loginMutation = trpc.distributors.login.useMutation({
    onSuccess: data => {
      login(data.distributor as any);
      toast.success(
        dir === "rtl"
          ? "مرحباً بك في بوابة الموزعين!"
          : "Welcome to the Distributor Portal!"
      );
      navigate("/distributor/dashboard");
    },
    onError: error => {
      toast.error(
        error.message ||
          (dir === "rtl"
            ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
            : "Incorrect email or password")
      );
    },
  });

  const registerMutation = trpc.distributors.register.useMutation({
    onSuccess: () => {
      toast.success(
        dir === "rtl"
          ? "تم إرسال طلب الانضمام بنجاح! سيتم مراجعة طلبك وتفعيله من الإدارة قريباً."
          : "Registration application submitted successfully! It will be reviewed and activated by admin shortly."
      );
      // Reset form
      setRegName("");
      setRegCompany("");
      setRegEmail("");
      setRegPassword("");
      setRegPhone("");
      setRegCity("");
      setRegRegion("");
      setRegWhatsapp("");
      setRegWebsite("");
      setRegCommercialReg("");
      setRegVatNumber("");
      setRegBankName("");
      setRegBankIban("");
      setView("login");
    },
    onError: error => {
      toast.error(
        error.message ||
          (dir === "rtl"
            ? "حدث خطأ أثناء التسجيل، يرجى المحاولة مرة أخرى"
            : "An error occurred during registration, please try again")
      );
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(
        dir === "rtl"
          ? "يرجى إدخال البريد الإلكتروني وكلمة المرور"
          : "Please enter your email and password"
      );
      return;
    }
    loginMutation.mutate({ email, password });
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regCompany || !regEmail || !regPassword || !regPhone) {
      toast.error(
        dir === "rtl"
          ? "يرجى تعبئة جميع الحقول الأساسية المطلوبة"
          : "Please fill in all required basic fields"
      );
      return;
    }
    if (regPassword.length < 8) {
      toast.error(
        dir === "rtl"
          ? "يجب أن تكون كلمة المرور 8 خانات على الأقل"
          : "Password must be at least 8 characters long"
      );
      return;
    }
    registerMutation.mutate({
      name: regName,
      company: regCompany,
      email: regEmail,
      password: regPassword,
      phone: regPhone,
      city: regCity,
      region: regRegion,
      whatsapp: regWhatsapp || undefined,
      website: regWebsite || undefined,
      commercialReg: regCommercialReg || undefined,
      vatNumber: regVatNumber || undefined,
      bankName: regBankName || undefined,
      bankIban: regBankIban || undefined,
    });
  };

  const features =
    dir === "rtl"
      ? [
          { icon: Shield, text: "أسعار حصرية للموزعين بخصم يصل إلى 35%" },
          { icon: TrendingUp, text: "تقارير مبيعات تفصيلية وتحليلات أداء" },
          { icon: Award, text: "برنامج نقاط ومكافآت للموزعين المميزين" },
        ]
      : [
          {
            icon: Shield,
            text: "Exclusive distributor pricing with up to 35% discount",
          },
          {
            icon: TrendingUp,
            text: "Detailed sales reports and performance analytics",
          },
          {
            icon: Award,
            text: "Points and rewards program for distinguished distributors",
          },
        ];

  const stats =
    dir === "rtl"
      ? [
          { value: "150+", label: "موزع نشط" },
          { value: "25%", label: "متوسط الخصم" },
          { value: "24h", label: "وقت الاستجابة" },
        ]
      : [
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
              style={{
                width: `${(i + 1) * 120}px`,
                height: `${(i + 1) * 120}px`,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </div>

        {/* Logo */}
        <div>
          <a href="/" className="flex items-center gap-3 group">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: "oklch(0.68 0.10 60)" }}
            >
              <span
                className="text-white font-bold text-lg"
                style={{ fontFamily: "DM Serif Display, serif" }}
              >
                {dir === "rtl" ? "س" : "S"}
              </span>
            </div>
            <div>
              <span
                className="text-white font-bold text-xl"
                style={{ fontFamily: "DM Serif Display, serif" }}
              >
                {dir === "rtl" ? "سنديان" : "Sindian"}
              </span>
              <p
                className="text-white/60 text-xs"
                style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}
              >
                {dir === "rtl" ? "للأبواب الخشبية" : "Wooden Doors"}
              </p>
            </div>
          </a>
        </div>

        {/* Center content */}
        <div className="relative z-10">
          <div
            className="inline-block px-3 py-1 rounded-full text-xs mb-6"
            style={{
              background: "oklch(0.68 0.10 60 / 0.2)",
              color: "oklch(0.78 0.08 60)",
              fontFamily: "IBM Plex Sans Arabic, sans-serif",
            }}
          >
            {dir === "rtl"
              ? "بوابة الموزعين الحصرية"
              : "Exclusive Distributor Portal"}
          </div>
          <h1
            className="text-4xl font-bold text-white mb-4 leading-tight"
            style={{ fontFamily: "DM Serif Display, serif" }}
          >
            {dir === "rtl" ? (
              <>
                إدارة أعمالك
                <br />
                <span style={{ color: "oklch(0.78 0.08 60)" }}>بكل سهولة</span>
              </>
            ) : (
              <>
                Manage Your Business
                <br />
                <span style={{ color: "oklch(0.78 0.08 60)" }}>With Ease</span>
              </>
            )}
          </h1>
          <p
            className="text-white/70 text-base leading-relaxed"
            style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}
          >
            {dir === "rtl"
              ? "منصة متكاملة لإدارة طلباتك وتتبع شحناتك وعرض تقارير مبيعاتك التفصيلية في مكان واحد."
              : "An integrated platform to manage your orders, track shipments, and view detailed sales reports all in one place."}
          </p>

          <div className="mt-8 space-y-4">
            {features.map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "oklch(0.68 0.10 60 / 0.25)" }}
                >
                  <Icon
                    className="w-4 h-4"
                    style={{ color: "oklch(0.78 0.08 60)" }}
                  />
                </div>
                <span
                  className="text-white/80 text-sm"
                  style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}
                >
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="grid grid-cols-3 gap-4 relative z-10">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div
                className="text-2xl font-bold"
                style={{
                  color: "oklch(0.78 0.08 60)",
                  fontFamily: "DM Serif Display, serif",
                }}
              >
                {stat.value}
              </div>
              <div
                className="text-white/50 text-xs mt-1"
                style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Login Form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 bg-white lg:px-16 overflow-y-auto">
        <div className="mb-8">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm transition-colors"
            style={{
              color: "oklch(0.55 0.03 160)",
              fontFamily: "IBM Plex Sans Arabic, sans-serif",
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            {dir === "rtl" ? "العودة للموقع الرئيسي" : "Back to Main Site"}
          </a>
        </div>

        {/* Mobile logo */}
        <div className="lg:hidden mb-8 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "oklch(0.38 0.06 160)" }}
          >
            <span
              className="text-white font-bold text-lg"
              style={{ fontFamily: "DM Serif Display, serif" }}
            >
              {dir === "rtl" ? "س" : "S"}
            </span>
          </div>
          <div>
            <span
              className="font-bold text-xl"
              style={{
                color: "oklch(0.38 0.06 160)",
                fontFamily: "DM Serif Display, serif",
              }}
            >
              {dir === "rtl" ? "سنديان" : "Sindian"}
            </span>
            <p
              className="text-gray-400 text-xs"
              style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}
            >
              {dir === "rtl" ? "بوابة الموزعين" : "Distributor Portal"}
            </p>
          </div>
        </div>

        {view === "login" ? (
          <div className="max-w-sm w-full mx-auto">
            <div className="mb-8">
              <h2
                className="text-3xl font-bold mb-2"
                style={{
                  color: "oklch(0.25 0.04 160)",
                  fontFamily: "DM Serif Display, serif",
                }}
              >
                {dir === "rtl" ? "تسجيل الدخول" : "Sign In"}
              </h2>
              <p
                className="text-sm"
                style={{
                  color: "oklch(0.55 0.02 160)",
                  fontFamily: "IBM Plex Sans Arabic, sans-serif",
                }}
              >
                {dir === "rtl"
                  ? "أدخل بيانات حسابك للوصول إلى بوابة الموزعين"
                  : "Enter your account credentials to access the distributor portal"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium"
                  style={{
                    color: "oklch(0.35 0.04 160)",
                    fontFamily: "IBM Plex Sans Arabic, sans-serif",
                  }}
                >
                  {dir === "rtl" ? "البريد الإلكتروني" : "Email Address"}
                </Label>
                <div className="relative">
                  <Mail
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: "oklch(0.55 0.03 160)" }}
                  />
                  <Input
                    id="email"
                    type="email"
                    placeholder="distributor@company.sa"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pr-10 text-right border-gray-200"
                    style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium"
                    style={{
                      color: "oklch(0.35 0.04 160)",
                      fontFamily: "IBM Plex Sans Arabic, sans-serif",
                    }}
                  >
                    {dir === "rtl" ? "كلمة المرور" : "Password"}
                  </Label>
                  <button
                    type="button"
                    className="text-xs transition-colors"
                    style={{
                      color: "oklch(0.68 0.10 60)",
                      fontFamily: "IBM Plex Sans Arabic, sans-serif",
                    }}
                    onClick={() =>
                      toast.info(
                        dir === "rtl"
                          ? "سيتم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني"
                          : "A password reset link will be sent to your email"
                      )
                    }
                  >
                    {dir === "rtl" ? "نسيت كلمة المرور؟" : "Forgot password?"}
                  </button>
                </div>
                <div className="relative">
                  <Lock
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: "oklch(0.55 0.03 160)" }}
                  />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pr-10 pl-10 border-gray-200"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "oklch(0.55 0.03 160)" }}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div
                className="rounded-lg p-3 text-xs"
                style={{
                  background: "oklch(0.96 0.01 160)",
                  color: "oklch(0.38 0.06 160)",
                  fontFamily: "IBM Plex Sans Arabic, sans-serif",
                }}
              >
                <strong>{dir === "rtl" ? "للتجربة:" : "Demo:"}</strong>{" "}
                {dir === "rtl"
                  ? "أدخل أي بريد إلكتروني صحيح وأي كلمة مرور"
                  : "Enter any valid email and any password"}
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-medium transition-all"
                style={{
                  background: "oklch(0.38 0.06 160)",
                  color: "white",
                  fontFamily: "IBM Plex Sans Arabic, sans-serif",
                }}
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {dir === "rtl" ? "جاري تسجيل الدخول..." : "Signing in..."}
                  </span>
                ) : dir === "rtl" ? (
                  "دخول البوابة"
                ) : (
                  "Enter Portal"
                )}
              </Button>
            </form>

            <p
              className="text-center text-sm mt-6"
              style={{
                color: "oklch(0.55 0.02 160)",
                fontFamily: "IBM Plex Sans Arabic, sans-serif",
              }}
            >
              {dir === "rtl" ? "لست موزعاً بعد؟" : "Not a distributor yet?"}{" "}
              <button
                onClick={() => setView("register")}
                className="font-medium hover:underline"
                style={{ color: "oklch(0.68 0.10 60)" }}
              >
                {dir === "rtl"
                  ? "انضم لشبكة الموزعين"
                  : "Join the Distributor Network"}
              </button>
            </p>
          </div>
        ) : (
          <div className="max-w-md w-full mx-auto">
            <div className="mb-6">
              <h2
                className="text-3xl font-bold mb-2"
                style={{
                  color: "oklch(0.25 0.04 160)",
                  fontFamily: "DM Serif Display, serif",
                }}
              >
                {dir === "rtl" ? "طلب انضمام موزع" : "Apply as Distributor"}
              </h2>
              <p
                className="text-sm"
                style={{
                  color: "oklch(0.55 0.02 160)",
                  fontFamily: "IBM Plex Sans Arabic, sans-serif",
                }}
              >
                {dir === "rtl"
                  ? "املأ البيانات أدناه لتقديم طلب الانضمام لشبكة موزعينا المعتمدين"
                  : "Fill in the details below to submit your distributor application"}
              </p>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="regName" className="text-xs font-semibold" style={{ color: "oklch(0.35 0.04 160)" }}>
                    {dir === "rtl" ? "إسم المدير المسؤول *" : "Manager Name *"}
                  </Label>
                  <Input
                    id="regName"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    required
                    placeholder={dir === "rtl" ? "أحمد محمد" : "John Doe"}
                    className="border-gray-200 text-sm h-10"
                    style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="regCompany" className="text-xs font-semibold" style={{ color: "oklch(0.35 0.04 160)" }}>
                    {dir === "rtl" ? "إسم الشركة / المؤسسة *" : "Company Name *"}
                  </Label>
                  <Input
                    id="regCompany"
                    value={regCompany}
                    onChange={e => setRegCompany(e.target.value)}
                    required
                    placeholder={dir === "rtl" ? "مؤسسة سنديان التجارية" : "Sindian Trading"}
                    className="border-gray-200 text-sm h-10"
                    style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="regEmail" className="text-xs font-semibold" style={{ color: "oklch(0.35 0.04 160)" }}>
                  {dir === "rtl" ? "البريد الإلكتروني *" : "Email Address *"}
                </Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="regEmail"
                    type="email"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    required
                    placeholder="distributor@company.com"
                    className="pr-10 border-gray-200 text-sm h-10"
                    style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="regPassword" className="text-xs font-semibold" style={{ color: "oklch(0.35 0.04 160)" }}>
                    {dir === "rtl" ? "كلمة المرور *" : "Password *"}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="regPassword"
                      type={showPassword ? "text" : "password"}
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="pr-10 pl-10 border-gray-200 text-sm h-10"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="regPhone" className="text-xs font-semibold" style={{ color: "oklch(0.35 0.04 160)" }}>
                    {dir === "rtl" ? "رقم الهاتف / الجوال *" : "Phone Number *"}
                  </Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="regPhone"
                      value={regPhone}
                      onChange={e => setRegPhone(e.target.value)}
                      required
                      placeholder="05XXXXXXXX"
                      className="pr-10 border-gray-200 text-sm h-10"
                      style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="regCity" className="text-xs font-semibold" style={{ color: "oklch(0.35 0.04 160)" }}>
                    {dir === "rtl" ? "المدينة" : "City"}
                  </Label>
                  <Input
                    id="regCity"
                    value={regCity}
                    onChange={e => setRegCity(e.target.value)}
                    placeholder={dir === "rtl" ? "الرياض" : "Riyadh"}
                    className="border-gray-200 text-sm h-10"
                    style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="regRegion" className="text-xs font-semibold" style={{ color: "oklch(0.35 0.04 160)" }}>
                    {dir === "rtl" ? "المنطقة" : "Region"}
                  </Label>
                  <Input
                    id="regRegion"
                    value={regRegion}
                    onChange={e => setRegRegion(e.target.value)}
                    placeholder={dir === "rtl" ? "المنطقة الوسطى" : "Central Region"}
                    className="border-gray-200 text-sm h-10"
                    style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}
                  />
                </div>
              </div>

              {/* Collapsible section for optional business details */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowOptional(!showOptional)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                  style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}
                >
                  <span className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5" />
                    {dir === "rtl" ? "تفاصيل تجارية إضافية (اختياري)" : "Additional Business Details (Optional)"}
                  </span>
                  {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showOptional && (
                  <div className="p-4 bg-white border-t border-gray-100 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="regWhatsapp" className="text-[10px] font-semibold text-gray-500" style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>
                          {dir === "rtl" ? "رقم الواتساب" : "WhatsApp Number"}
                        </Label>
                        <Input
                          id="regWhatsapp"
                          value={regWhatsapp}
                          onChange={e => setRegWhatsapp(e.target.value)}
                          placeholder="05XXXXXXXX"
                          className="border-gray-200 text-xs h-9"
                          style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="regWebsite" className="text-[10px] font-semibold text-gray-500" style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>
                          {dir === "rtl" ? "الموقع الإلكتروني" : "Website"}
                        </Label>
                        <Input
                          id="regWebsite"
                          value={regWebsite}
                          onChange={e => setRegWebsite(e.target.value)}
                          placeholder="www.company.com"
                          className="border-gray-200 text-xs h-9"
                          style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="regCommercialReg" className="text-[10px] font-semibold text-gray-500" style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>
                          {dir === "rtl" ? "السجل التجاري" : "Commercial Reg (CR)"}
                        </Label>
                        <Input
                          id="regCommercialReg"
                          value={regCommercialReg}
                          onChange={e => setRegCommercialReg(e.target.value)}
                          placeholder="1010XXXXXX"
                          className="border-gray-200 text-xs h-9"
                          style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="regVatNumber" className="text-[10px] font-semibold text-gray-500" style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>
                          {dir === "rtl" ? "الرقم الضريبي" : "VAT Number"}
                        </Label>
                        <Input
                          id="regVatNumber"
                          value={regVatNumber}
                          onChange={e => setRegVatNumber(e.target.value)}
                          placeholder="3000XXXXXXXXXXX"
                          className="border-gray-200 text-xs h-9"
                          style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="regBankName" className="text-[10px] font-semibold text-gray-500" style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>
                          {dir === "rtl" ? "إسم البنك" : "Bank Name"}
                        </Label>
                        <Input
                          id="regBankName"
                          value={regBankName}
                          onChange={e => setRegBankName(e.target.value)}
                          placeholder={dir === "rtl" ? "مصرف الراجحي" : "Al Rajhi Bank"}
                          className="border-gray-200 text-xs h-9"
                          style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="regBankIban" className="text-[10px] font-semibold text-gray-500" style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>
                          {dir === "rtl" ? "الآيبان البنكي (IBAN)" : "Bank IBAN"}
                        </Label>
                        <Input
                          id="regBankIban"
                          value={regBankIban}
                          onChange={e => setRegBankIban(e.target.value)}
                          placeholder="SAXXXXXXXXXXXXXXXXXXXXXXXX"
                          className="border-gray-200 text-xs h-9"
                          style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-medium transition-all mt-4"
                style={{
                  background: "oklch(0.38 0.06 160)",
                  color: "white",
                  fontFamily: "IBM Plex Sans Arabic, sans-serif",
                }}
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {dir === "rtl" ? "جاري إرسال الطلب..." : "Submitting Application..."}
                  </span>
                ) : dir === "rtl" ? (
                  "تقديم طلب العضوية"
                ) : (
                  "Submit Registration"
                )}
              </Button>
            </form>

            <p
              className="text-center text-sm mt-6"
              style={{
                color: "oklch(0.55 0.02 160)",
                fontFamily: "IBM Plex Sans Arabic, sans-serif",
              }}
            >
              {dir === "rtl" ? "لديك حساب بالفعل؟" : "Already have an account?"}{" "}
              <button
                onClick={() => setView("login")}
                className="font-medium hover:underline text-indigo-600 font-semibold"
                style={{ color: "oklch(0.68 0.10 60)" }}
              >
                {dir === "rtl" ? "تسجيل الدخول هنا" : "Sign In Here"}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
