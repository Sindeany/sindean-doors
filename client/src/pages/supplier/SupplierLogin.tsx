import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useSupplierAuth } from "@/contexts/SupplierAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Building2, Mail, Lock, Phone, User, MapPin, Globe, Tag, AlertCircle, CheckCircle } from "lucide-react";

const CATEGORIES = [
  { id: "wood", label: "أخشاب" },
  { id: "hardware", label: "أجهزة ومعدات" },
  { id: "glass", label: "زجاج" },
  { id: "paint", label: "دهانات وطلاء" },
  { id: "metal", label: "معادن وحديد" },
  { id: "foam", label: "إسفنج وعوازل" },
  { id: "packaging", label: "تغليف وشحن" },
  { id: "tools", label: "أدوات ومعدات" },
  { id: "other", label: "أخرى" },
];

export default function SupplierLogin() {
  const [, navigate] = useLocation();
  const { login } = useSupplierAuth();
  const [activeTab, setActiveTab] = useState("login");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form
  const [reg, setReg] = useState({
    companyName: "", contactName: "", email: "", phone: "",
    password: "", confirmPassword: "", city: "", address: "", website: "",
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const loginMutation = trpc.suppliers.login.useMutation({
    onSuccess: (data) => {
      login(data.supplier as any);
      navigate("/supplier/dashboard");
    },
    onError: (err) => setError(err.message),
  });

  const registerMutation = trpc.suppliers.register.useMutation({
    onSuccess: (data) => {
      setSuccess(data.message);
      setActiveTab("login");
    },
    onError: (err) => setError(err.message),
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ email: loginEmail, password: loginPassword });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (reg.password !== reg.confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    if (selectedCategories.length === 0) {
      setError("يرجى اختيار تصنيف واحد على الأقل");
      return;
    }
    registerMutation.mutate({
      companyName: reg.companyName,
      contactName: reg.contactName,
      email: reg.email,
      phone: reg.phone,
      password: reg.password,
      city: reg.city || undefined,
      address: reg.address || undefined,
      website: reg.website || undefined,
      categories: selectedCategories,
    });
  };

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-amber-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <div className="inline-flex items-center gap-3 cursor-pointer">
              <div className="w-12 h-12 bg-amber-800 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-amber-900">سنديان</div>
                <div className="text-xs text-amber-700">بوابة الموردين</div>
              </div>
            </div>
          </Link>
        </div>

        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl text-stone-800">بوابة الموردين</CardTitle>
            <CardDescription className="text-stone-500">
              سجّل دخولك أو انضم كمورد جديد للمنصة
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle className="w-4 h-4 shrink-0" />
                {success}
              </div>
            )}

            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setError(""); setSuccess(""); }}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
                <TabsTrigger value="register">تسجيل جديد</TabsTrigger>
              </TabsList>

              {/* ── Login ── */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-stone-700">البريد الإلكتروني</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <Input
                        id="email"
                        type="email"
                        value={loginEmail}
                        onChange={e => setLoginEmail(e.target.value)}
                        placeholder="company@example.com"
                        className="pr-10 text-right"
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-stone-700">كلمة المرور</Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <Input
                        id="password"
                        type="password"
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pr-10"
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-amber-800 hover:bg-amber-900 text-white"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
                  </Button>
                </form>
              </TabsContent>

              {/* ── Register ── */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-stone-700 text-sm">اسم الشركة *</Label>
                      <div className="relative">
                        <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                        <Input
                          value={reg.companyName}
                          onChange={e => setReg(p => ({ ...p, companyName: e.target.value }))}
                          placeholder="شركة الأخشاب"
                          className="pr-9 text-sm"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-stone-700 text-sm">اسم المسؤول *</Label>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                        <Input
                          value={reg.contactName}
                          onChange={e => setReg(p => ({ ...p, contactName: e.target.value }))}
                          placeholder="محمد أحمد"
                          className="pr-9 text-sm"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-stone-700 text-sm">البريد الإلكتروني *</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                      <Input
                        type="email"
                        value={reg.email}
                        onChange={e => setReg(p => ({ ...p, email: e.target.value }))}
                        placeholder="info@company.com"
                        className="pr-9 text-sm"
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-stone-700 text-sm">رقم الجوال *</Label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                      <Input
                        value={reg.phone}
                        onChange={e => setReg(p => ({ ...p, phone: e.target.value }))}
                        placeholder="05xxxxxxxx"
                        className="pr-9 text-sm"
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-stone-700 text-sm">المدينة</Label>
                      <div className="relative">
                        <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                        <Input
                          value={reg.city}
                          onChange={e => setReg(p => ({ ...p, city: e.target.value }))}
                          placeholder="الرياض"
                          className="pr-9 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-stone-700 text-sm">الموقع الإلكتروني</Label>
                      <div className="relative">
                        <Globe className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                        <Input
                          value={reg.website}
                          onChange={e => setReg(p => ({ ...p, website: e.target.value }))}
                          placeholder="www.company.com"
                          className="pr-9 text-sm"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-stone-700 text-sm">كلمة المرور *</Label>
                      <Input
                        type="password"
                        value={reg.password}
                        onChange={e => setReg(p => ({ ...p, password: e.target.value }))}
                        placeholder="8 أحرف على الأقل"
                        className="text-sm"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-stone-700 text-sm">تأكيد كلمة المرور *</Label>
                      <Input
                        type="password"
                        value={reg.confirmPassword}
                        onChange={e => setReg(p => ({ ...p, confirmPassword: e.target.value }))}
                        placeholder="أعد كتابة كلمة المرور"
                        className="text-sm"
                        required
                      />
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="space-y-2">
                    <Label className="text-stone-700 text-sm flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" />
                      تصنيفات التوريد *
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                            selectedCategories.includes(cat.id)
                              ? "bg-amber-800 text-white"
                              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-amber-800 hover:bg-amber-900 text-white"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "جاري التسجيل..." : "إرسال طلب التسجيل"}
                  </Button>
                  <p className="text-xs text-stone-500 text-center">
                    سيتم مراجعة طلبك وتفعيل حسابك خلال 24-48 ساعة
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
