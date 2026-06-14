// ============================================================
// Distributor Settings Page - Sindian Doors
// Design: Architectural Luxury | Oak Green + Copper + Beige
// ============================================================

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useDistributorAuth } from "@/contexts/DistributorAuthContext";
import DistributorLayout from "@/components/distributor/DistributorLayout";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  User,
  Lock,
  Building2,
  Phone,
  MapPin,
  Globe,
  CreditCard,
  Save,
  Shield,
  Loader2,
  FileText,
  Building,
} from "lucide-react";

export default function DistributorSettings() {
  const { distributor, isLoading: authLoading } = useDistributorAuth();
  const [, navigate] = useLocation();
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const utils = trpc.useUtils();

  const [formData, setFormData] = useState({
    name: "",
    company: "",
    phone: "",
    city: "",
    region: "",
    website: "",
    whatsapp: "",
    commercialReg: "",
    vatNumber: "",
    bankName: "",
    bankIban: "",
  });

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!authLoading && !distributor) {
      navigate("/distributor");
    }
  }, [distributor, authLoading, navigate]);

  useEffect(() => {
    if (distributor) {
      setFormData({
        name: distributor.name || "",
        company: distributor.company || "",
        phone: distributor.phone || "",
        city: distributor.city || "",
        region: distributor.region || "",
        website: distributor.website || "",
        whatsapp: distributor.whatsapp || "",
        commercialReg: distributor.commercialReg || "",
        vatNumber: distributor.vatNumber || "",
        bankName: distributor.bankName || "",
        bankIban: distributor.bankIban || "",
      });
    }
  }, [distributor]);

  const updateProfileMutation = trpc.distributors.updateProfile.useMutation({
    onSuccess: () => {
      toast.success(
        isRtl ? "تم تحديث بيانات الملف الشخصي بنجاح" : "Profile details updated successfully"
      );
      utils.distributors.me.invalidate();
    },
    onError: (error) => {
      toast.error(
        error.message || (isRtl ? "حدث خطأ أثناء حفظ التعديلات" : "An error occurred while saving profile")
      );
    },
  });

  const updatePasswordMutation = trpc.distributors.updatePassword.useMutation({
    onSuccess: () => {
      toast.success(
        isRtl ? "تم تغيير كلمة المرور بنجاح" : "Password changed successfully"
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => {
      toast.error(
        error.message || (isRtl ? "حدث خطأ أثناء تغيير كلمة المرور" : "An error occurred while changing password")
      );
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.company || !formData.phone || !formData.city) {
      toast.error(
        isRtl ? "يرجى تعبئة الحقول الأساسية المطلوبة" : "Please fill in all required basic fields"
      );
      return;
    }
    updateProfileMutation.mutate(formData);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(isRtl ? "يرجى تعبئة كافة حقول كلمة المرور" : "Please fill in all password fields");
      return;
    }
    if (newPassword.length < 8) {
      toast.error(
        isRtl
          ? "يجب ألا تقل كلمة المرور الجديدة عن 8 أحرف"
          : "New password must be at least 8 characters long"
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(
        isRtl
          ? "كلمة المرور الجديدة وتأكيدها غير متطابقين"
          : "New password and confirmation do not match"
      );
      return;
    }
    updatePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  if (authLoading || !distributor) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "oklch(0.38 0.06 160)" }} />
      </div>
    );
  }

  return (
    <DistributorLayout
      title={isRtl ? "الإعدادات" : "Settings"}
      subtitle={isRtl ? "إدارة وتعديل بيانات ملفك الشخصي وكلمة المرور" : "Manage your profile data and password"}
    >
      <div className="max-w-4xl space-y-6" style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>
        <Tabs defaultValue="profile" className="w-full flex flex-col gap-6">
          <TabsList className="bg-white border border-gray-100 p-1 rounded-xl w-fit flex gap-2">
            <TabsTrigger value="profile" className="px-4 py-2 text-sm font-medium rounded-lg animate-fade-in">
              <User className="w-4 h-4 ml-1.5 inline" />
              {isRtl ? "البيانات الشخصية" : "Profile Settings"}
            </TabsTrigger>
            <TabsTrigger value="security" className="px-4 py-2 text-sm font-medium rounded-lg animate-fade-in">
              <Lock className="w-4 h-4 ml-1.5 inline" />
              {isRtl ? "الحماية وكلمة المرور" : "Security & Password"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="outline-none">
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* Card 1: Basic Information */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-5 border-b pb-3 border-gray-50">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.38 0.06 160 / 0.1)", color: "oklch(0.38 0.06 160)" }}>
                    <User className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="font-bold text-gray-800 text-base" style={{ fontFamily: "DM Serif Display, serif" }}>
                    {isRtl ? "البيانات الأساسية" : "Basic Information"}
                  </h3>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-semibold text-gray-500">
                      {isRtl ? "الاسم الكامل *" : "Full Name *"}
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      className="rounded-xl border-gray-200 focus:border-green-600 transition-colors"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="company" className="text-xs font-semibold text-gray-500">
                      {isRtl ? "اسم الشركة *" : "Company Name *"}
                    </Label>
                    <Input
                      id="company"
                      type="text"
                      className="rounded-xl border-gray-200 focus:border-green-600 transition-colors"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold text-gray-500">
                      {isRtl ? "البريد الإلكتروني (غير قابل للتعديل)" : "Email Address (Read-only)"}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      disabled
                      className="rounded-xl bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                      value={distributor.email}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold text-gray-500">
                      {isRtl ? "رقم الجوال *" : "Phone Number *"}
                    </Label>
                    <Input
                      id="phone"
                      type="text"
                      className="rounded-xl border-gray-200 focus:border-green-600 transition-colors"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Contact & Address */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-5 border-b pb-3 border-gray-50">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.38 0.06 160 / 0.1)", color: "oklch(0.38 0.06 160)" }}>
                    <MapPin className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="font-bold text-gray-800 text-base" style={{ fontFamily: "DM Serif Display, serif" }}>
                    {isRtl ? "العنوان والتواصل" : "Address & Communication"}
                  </h3>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-xs font-semibold text-gray-500">
                      {isRtl ? "المدينة *" : "City *"}
                    </Label>
                    <Input
                      id="city"
                      type="text"
                      className="rounded-xl border-gray-200 focus:border-green-600 transition-colors"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="region" className="text-xs font-semibold text-gray-500">
                      {isRtl ? "المنطقة" : "Region"}
                    </Label>
                    <Input
                      id="region"
                      type="text"
                      className="rounded-xl border-gray-200 focus:border-green-600 transition-colors"
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="whatsapp" className="text-xs font-semibold text-gray-500">
                      {isRtl ? "رقم الواتساب" : "WhatsApp"}
                    </Label>
                    <Input
                      id="whatsapp"
                      type="text"
                      placeholder="05xxxxxxx"
                      className="rounded-xl border-gray-200 focus:border-green-600 transition-colors"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="website" className="text-xs font-semibold text-gray-500">
                      {isRtl ? "الموقع الإلكتروني" : "Website"}
                    </Label>
                    <Input
                      id="website"
                      type="text"
                      placeholder="https://example.com"
                      className="rounded-xl border-gray-200 focus:border-green-600 transition-colors"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Financial & Commercial Info */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-5 border-b pb-3 border-gray-50">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.38 0.06 160 / 0.1)", color: "oklch(0.38 0.06 160)" }}>
                    <Building2 className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="font-bold text-gray-800 text-base" style={{ fontFamily: "DM Serif Display, serif" }}>
                    {isRtl ? "البيانات التجارية والمالية" : "Commercial & Financial details"}
                  </h3>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="commercialReg" className="text-xs font-semibold text-gray-500">
                      {isRtl ? "السجل التجاري" : "Commercial Registration"}
                    </Label>
                    <Input
                      id="commercialReg"
                      type="text"
                      className="rounded-xl border-gray-200 focus:border-green-600 transition-colors"
                      value={formData.commercialReg}
                      onChange={(e) => setFormData({ ...formData, commercialReg: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="vatNumber" className="text-xs font-semibold text-gray-500">
                      {isRtl ? "الرقم الضريبي" : "VAT Number"}
                    </Label>
                    <Input
                      id="vatNumber"
                      type="text"
                      className="rounded-xl border-gray-200 focus:border-green-600 transition-colors"
                      value={formData.vatNumber}
                      onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bankName" className="text-xs font-semibold text-gray-500">
                      {isRtl ? "اسم البنك" : "Bank Name"}
                    </Label>
                    <Input
                      id="bankName"
                      type="text"
                      className="rounded-xl border-gray-200 focus:border-green-600 transition-colors"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bankIban" className="text-xs font-semibold text-gray-500">
                      {isRtl ? "رقم الآيبان (IBAN)" : "IBAN"}
                    </Label>
                    <Input
                      id="bankIban"
                      type="text"
                      placeholder="SAxxxxxxxxxxxxxxxxxxxxxx"
                      className="rounded-xl border-gray-200 focus:border-green-600 transition-colors"
                      value={formData.bankIban}
                      onChange={(e) => setFormData({ ...formData, bankIban: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Profile Form Button */}
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="w-full flex items-center justify-center gap-2 text-white h-11 rounded-xl shadow-sm text-sm"
                style={{ background: "oklch(0.38 0.06 160)" }}
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isRtl ? "جاري الحفظ..." : "Saving..."}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isRtl ? "حفظ التغييرات" : "Save Changes"}
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="security" className="outline-none">
            <form onSubmit={handlePasswordSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
              <div className="flex items-center gap-3 mb-1 border-b pb-3 border-gray-50">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.38 0.06 160 / 0.1)", color: "oklch(0.38 0.06 160)" }}>
                  <Shield className="w-4.5 h-4.5" />
                </div>
                <h3 className="font-bold text-gray-800 text-base" style={{ fontFamily: "DM Serif Display, serif" }}>
                  {isRtl ? "تغيير كلمة المرور" : "Change Password"}
                </h3>
              </div>

              <div className="space-y-4 max-w-lg">
                <div className="space-y-1.5">
                  <Label htmlFor="currPass" className="text-xs font-semibold text-gray-500">
                    {isRtl ? "كلمة المرور الحالية" : "Current Password"}
                  </Label>
                  <Input
                    id="currPass"
                    type="password"
                    className="rounded-xl border-gray-200 focus:border-green-600 transition-colors"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="newPass" className="text-xs font-semibold text-gray-500">
                    {isRtl ? "كلمة المرور الجديدة (8 خانات كحد أدنى)" : "New Password (8 characters min)"}
                  </Label>
                  <Input
                    id="newPass"
                    type="password"
                    className="rounded-xl border-gray-200 focus:border-green-600 transition-colors"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPass" className="text-xs font-semibold text-gray-500">
                    {isRtl ? "تأكيد كلمة المرور الجديدة" : "Confirm New Password"}
                  </Label>
                  <Input
                    id="confirmPass"
                    type="password"
                    className="rounded-xl border-gray-200 focus:border-green-600 transition-colors"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={updatePasswordMutation.isPending}
                className="w-full flex items-center justify-center gap-2 text-white h-11 rounded-xl shadow-sm text-sm mt-4"
                style={{ background: "oklch(0.38 0.06 160)" }}
              >
                {updatePasswordMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isRtl ? "جاري التحديث..." : "Updating..."}
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    {isRtl ? "تحديث كلمة المرور" : "Update Password"}
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </DistributorLayout>
  );
}
