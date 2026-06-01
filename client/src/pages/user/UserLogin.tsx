// ============================================================
// UserLogin.tsx - Sindian Doors
// Login & Register page for retail customers
// Design: Architectural Luxury — deep oak green + warm beige
// ============================================================

import { useState } from "react";
import { useLocation } from "wouter";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Eye, EyeOff, LogIn, UserPlus, ShieldCheck, Star, Package, Heart } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

export default function UserLogin() {
  const [, navigate] = useLocation();
  const { login, register } = useUserAuth();
  const { dir } = useLanguage();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    const ok = await login(loginEmail, loginPassword);
    setLoginLoading(false);
    if (ok) {
      toast.success(dir === "rtl" ? "مرحباً بك في سنديان!" : "Welcome to Sindian!");
      navigate("/account");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword !== regConfirm) {
      toast.error(dir === "rtl" ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      return;
    }
    setRegLoading(true);
    const ok = await register(regName, regEmail, regPhone, regPassword);
    setRegLoading(false);
    if (ok) {
      toast.success(dir === "rtl" ? "تم إنشاء حسابك بنجاح!" : "Account created successfully!");
      navigate("/account");
    }
  };

  const benefits = dir === "rtl" ? [
    { icon: Package, title: "تتبع طلباتك", desc: "راقب حالة طلباتك لحظة بلحظة من التصنيع حتى التسليم" },
    { icon: Heart, title: "قائمة المفضلة", desc: "احفظ منتجاتك المفضلة وارجع إليها في أي وقت" },
    { icon: Star, title: "نقاط الولاء", desc: "اكسب نقاط مع كل طلب واستبدلها بخصومات حصرية" },
    { icon: ShieldCheck, title: "ضمان مخصص", desc: "تتبع ضمانات منتجاتك وطلبات الصيانة بسهولة" },
  ] : [
    { icon: Package, title: "Track Your Orders", desc: "Monitor your order status in real-time from manufacturing to delivery" },
    { icon: Heart, title: "Wishlist", desc: "Save your favorite products and return to them anytime" },
    { icon: Star, title: "Loyalty Points", desc: "Earn points with every order and redeem them for exclusive discounts" },
    { icon: ShieldCheck, title: "Custom Warranty", desc: "Track your product warranties and maintenance requests easily" },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5]" dir={dir}>
      <Navbar />

      <div className="min-h-[calc(100vh-80px)] flex">
        {/* Left panel — benefits */}
        <div
          className="hidden lg:flex lg:w-5/12 flex-col justify-center px-16 py-20 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #2C4A3E 0%, #1a2e27 100%)" }}
        >
          <div className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-10" style={{ background: "#C4956A", transform: "translate(-50%, -50%)" }} />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-5" style={{ background: "#E8DFD0", transform: "translate(30%, 30%)" }} />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#C4956A" }}>
                <span className="text-white font-bold text-lg">{dir === "rtl" ? "س" : "S"}</span>
              </div>
              <div>
                <div className="text-white font-bold text-xl" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  {dir === "rtl" ? "سنديان" : "Sindian"}
                </div>
                <div className="text-xs" style={{ color: "#C4956A" }}>
                  {dir === "rtl" ? "للأبواب الخشبية" : "Wooden Doors"}
                </div>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              {dir === "rtl" ? "حسابك الشخصي" : "Your Personal Account"}
            </h2>
            <p className="text-base mb-10" style={{ color: "#B8C9C4" }}>
              {dir === "rtl"
                ? "سجّل دخولك للاستمتاع بتجربة تسوق متكاملة ومخصصة لك"
                : "Sign in to enjoy a complete and personalized shopping experience"}
            </p>

            <div className="space-y-6">
              {benefits.map((b) => (
                <div key={b.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(196,149,106,0.2)" }}>
                    <b.icon className="w-5 h-5" style={{ color: "#C4956A" }} />
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm mb-0.5">{b.title}</div>
                    <div className="text-xs leading-relaxed" style={{ color: "#8FA89F" }}>{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 p-4 rounded-xl border" style={{ borderColor: "rgba(196,149,106,0.3)", background: "rgba(196,149,106,0.08)" }}>
              <p className="text-xs font-semibold mb-1" style={{ color: "#C4956A" }}>
                {dir === "rtl" ? "للتجربة" : "Demo"}
              </p>
              <p className="text-xs" style={{ color: "#8FA89F" }}>
                {dir === "rtl"
                  ? "أدخل أي بريد إلكتروني صحيح وأي كلمة مرور للدخول"
                  : "Enter any valid email and any password to sign in"}
              </p>
            </div>
          </div>
        </div>

        {/* Right panel — forms */}
        <div className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-md">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="w-full mb-8 h-12 rounded-xl p-1" style={{ background: "#EDE8E0" }}>
                <TabsTrigger
                  value="login"
                  className="flex-1 h-10 rounded-lg text-sm font-semibold data-[state=active]:text-white transition-all"
                  style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
                >
                  {dir === "rtl" ? "تسجيل الدخول" : "Sign In"}
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="flex-1 h-10 rounded-lg text-sm font-semibold data-[state=active]:text-white transition-all"
                  style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
                >
                  {dir === "rtl" ? "حساب جديد" : "New Account"}
                </TabsTrigger>
              </TabsList>

              {/* ── Login ── */}
              <TabsContent value="login">
                <div className="mb-8">
                  <h1 className="text-2xl font-bold mb-1" style={{ color: "#2C4A3E", fontFamily: "'DM Serif Display', serif" }}>
                    {dir === "rtl" ? "مرحباً بعودتك" : "Welcome Back"}
                  </h1>
                  <p className="text-sm" style={{ color: "#6B7B75" }}>
                    {dir === "rtl" ? "أدخل بياناتك للوصول إلى حسابك" : "Enter your credentials to access your account"}
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <Label htmlFor="login-email" className="text-sm font-semibold mb-1.5 block" style={{ color: "#2C4A3E" }}>
                      {dir === "rtl" ? "البريد الإلكتروني" : "Email Address"}
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="name@example.sa"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="h-11 border-2 focus:border-[#2C4A3E] rounded-xl"
                      style={{ background: "white", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label htmlFor="login-pw" className="text-sm font-semibold" style={{ color: "#2C4A3E" }}>
                        {dir === "rtl" ? "كلمة المرور" : "Password"}
                      </Label>
                      <button type="button" className="text-xs hover:underline" style={{ color: "#C4956A" }}>
                        {dir === "rtl" ? "نسيت كلمة المرور؟" : "Forgot password?"}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="login-pw"
                        type={showLoginPw ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        className="h-11 border-2 focus:border-[#2C4A3E] rounded-xl pl-10"
                        style={{ background: "white" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPw(!showLoginPw)}
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: "#6B7B75" }}
                      >
                        {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full h-12 rounded-xl text-white font-semibold text-base flex items-center justify-center gap-2"
                    style={{ background: loginLoading ? "#6B7B75" : "#2C4A3E", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
                  >
                    {loginLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        {dir === "rtl" ? "دخول" : "Sign In"}
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* ── Register ── */}
              <TabsContent value="register">
                <div className="mb-8">
                  <h1 className="text-2xl font-bold mb-1" style={{ color: "#2C4A3E", fontFamily: "'DM Serif Display', serif" }}>
                    {dir === "rtl" ? "إنشاء حساب جديد" : "Create New Account"}
                  </h1>
                  <p className="text-sm" style={{ color: "#6B7B75" }}>
                    {dir === "rtl" ? "انضم إلى آلاف العملاء الراضين" : "Join thousands of satisfied customers"}
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label htmlFor="reg-name" className="text-sm font-semibold mb-1.5 block" style={{ color: "#2C4A3E" }}>
                      {dir === "rtl" ? "الاسم الكامل *" : "Full Name *"}
                    </Label>
                    <Input
                      id="reg-name"
                      type="text"
                      placeholder={dir === "rtl" ? "محمد العمري" : "John Smith"}
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                      className="h-11 border-2 focus:border-[#2C4A3E] rounded-xl"
                      style={{ background: "white" }}
                    />
                  </div>

                  <div>
                    <Label htmlFor="reg-email" className="text-sm font-semibold mb-1.5 block" style={{ color: "#2C4A3E" }}>
                      {dir === "rtl" ? "البريد الإلكتروني *" : "Email Address *"}
                    </Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="name@example.sa"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                      className="h-11 border-2 focus:border-[#2C4A3E] rounded-xl"
                      style={{ background: "white" }}
                    />
                  </div>

                  <div>
                    <Label htmlFor="reg-phone" className="text-sm font-semibold mb-1.5 block" style={{ color: "#2C4A3E" }}>
                      {dir === "rtl" ? "رقم الجوال *" : "Phone Number *"}
                    </Label>
                    <Input
                      id="reg-phone"
                      type="tel"
                      placeholder="05X-XXX-XXXX"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      required
                      className="h-11 border-2 focus:border-[#2C4A3E] rounded-xl"
                      style={{ background: "white" }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="reg-pw" className="text-sm font-semibold mb-1.5 block" style={{ color: "#2C4A3E" }}>
                        {dir === "rtl" ? "كلمة المرور *" : "Password *"}
                      </Label>
                      <div className="relative">
                        <Input
                          id="reg-pw"
                          type={showRegPw ? "text" : "password"}
                          placeholder="••••••••"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          required
                          className="h-11 border-2 focus:border-[#2C4A3E] rounded-xl pl-10"
                          style={{ background: "white" }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPw(!showRegPw)}
                          className="absolute left-3 top-1/2 -translate-y-1/2"
                          style={{ color: "#6B7B75" }}
                        >
                          {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="reg-confirm" className="text-sm font-semibold mb-1.5 block" style={{ color: "#2C4A3E" }}>
                        {dir === "rtl" ? "تأكيد المرور *" : "Confirm Password *"}
                      </Label>
                      <Input
                        id="reg-confirm"
                        type="password"
                        placeholder="••••••••"
                        value={regConfirm}
                        onChange={(e) => setRegConfirm(e.target.value)}
                        required
                        className="h-11 border-2 focus:border-[#2C4A3E] rounded-xl"
                        style={{ background: "white" }}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={regLoading}
                    className="w-full h-12 rounded-xl text-white font-semibold text-base flex items-center justify-center gap-2 mt-2"
                    style={{ background: regLoading ? "#6B7B75" : "#2C4A3E", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
                  >
                    {regLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        {dir === "rtl" ? "إنشاء الحساب" : "Create Account"}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center" style={{ color: "#6B7B75" }}>
                    {dir === "rtl" ? (
                      <>
                        بالتسجيل، أنت توافق على{" "}
                        <span className="underline cursor-pointer" style={{ color: "#C4956A" }}>الشروط والأحكام</span>
                        {" "}و{" "}
                        <span className="underline cursor-pointer" style={{ color: "#C4956A" }}>سياسة الخصوصية</span>
                      </>
                    ) : (
                      <>
                        By registering, you agree to our{" "}
                        <span className="underline cursor-pointer" style={{ color: "#C4956A" }}>Terms & Conditions</span>
                        {" "}and{" "}
                        <span className="underline cursor-pointer" style={{ color: "#C4956A" }}>Privacy Policy</span>
                      </>
                    )}
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
