// ============================================================
// Company Account Page - Sindian Doors B2B Portal
// Design: Architectural Luxury | Oak Green + Copper + Beige
// ============================================================

import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import CompanyLayout from "@/components/company/CompanyLayout";
import { Building2, Phone, Mail, MapPin, FileText, CreditCard, User, Shield } from "lucide-react";
import { toast } from "sonner";

const companyTypeLabels: Record<string, string> = {
  contractor: "مقاول",
  developer: "مطور عقاري",
  government: "جهة حكومية",
  hospitality: "ضيافة وفنادق",
  retail: "تجزئة",
};

export default function CompanyAccount() {
  const { company } = useCompanyAuth();

  const creditPercent = Math.round(((company?.creditUsed ?? 0) / (company?.creditLimit ?? 1)) * 100);

  return (
    <CompanyLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "#2C4A3E", fontFamily: "'DM Serif Display', serif" }}>
          حسابي
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">معلومات الشركة وإعدادات الحساب</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Company info */}
        <div className="lg:col-span-2 space-y-4">
          <div
            className="rounded-2xl border p-5"
            style={{ background: "white", borderColor: "#E8DFD0" }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "#2C4A3E" }}
              >
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: "#2C4A3E", fontFamily: "'DM Serif Display', serif" }}>
                  {company?.companyName}
                </h2>
                <p className="text-sm text-gray-500">{companyTypeLabels[company?.companyType ?? ""] ?? company?.companyType}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: User, label: "المسؤول", value: company?.contactName },
                { icon: Mail, label: "البريد الإلكتروني", value: company?.email },
                { icon: Phone, label: "الجوال", value: company?.phone },
                { icon: MapPin, label: "المدينة", value: company?.city },
                { icon: FileText, label: "رقم السجل التجاري", value: company?.registrationNumber },
                { icon: FileText, label: "الرقم الضريبي", value: company?.vatNumber },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: "#FAF8F5" }}
                >
                  <item.icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#2C4A3E" }} />
                  <div>
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="text-sm font-medium mt-0.5" style={{ color: "#2C4A3E" }}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => toast.info("لتعديل بيانات الشركة، يرجى التواصل مع مدير حسابك")}
              className="mt-4 w-full py-2.5 rounded-xl text-sm border font-medium"
              style={{ borderColor: "#E8DFD0", color: "#2C4A3E" }}
            >
              طلب تعديل البيانات
            </button>
          </div>

          {/* Account manager */}
          <div
            className="rounded-2xl border p-5"
            style={{ background: "white", borderColor: "#E8DFD0" }}
          >
            <h3 className="font-semibold text-sm mb-4" style={{ color: "#2C4A3E" }}>مدير الحساب</h3>
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: "#C4956A" }}
              >
                {company?.accountManager?.charAt(0) ?? "م"}
              </div>
              <div>
                <p className="font-semibold" style={{ color: "#2C4A3E" }}>{company?.accountManager}</p>
                <p className="text-xs text-gray-400">مدير حسابات الشركات</p>
              </div>
              <button
                onClick={() => toast.info("جاري فتح المحادثة مع مدير حسابك...")}
                className="mr-auto px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: "#2C4A3E", color: "white" }}
              >
                تواصل
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Credit */}
          <div
            className="rounded-2xl border p-5"
            style={{ background: "white", borderColor: "#E8DFD0" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4" style={{ color: "#2C4A3E" }} />
              <h3 className="font-semibold text-sm" style={{ color: "#2C4A3E" }}>حد الائتمان</h3>
            </div>
            <p className="text-2xl font-bold mb-1" style={{ color: "#C4956A", fontFamily: "'DM Serif Display', serif" }}>
              {(company?.creditLimit ?? 0).toLocaleString("ar-SA")} ر.س
            </p>
            <p className="text-xs text-gray-400 mb-3">الحد الكلي</p>
            <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: "#E8DFD0" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${creditPercent}%`, background: creditPercent > 80 ? "#ef4444" : "#C4956A" }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>مستخدم: {(company?.creditUsed ?? 0).toLocaleString("ar-SA")} ر.س</span>
              <span>{creditPercent}%</span>
            </div>
          </div>

          {/* Security */}
          <div
            className="rounded-2xl border p-5"
            style={{ background: "white", borderColor: "#E8DFD0" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4" style={{ color: "#2C4A3E" }} />
              <h3 className="font-semibold text-sm" style={{ color: "#2C4A3E" }}>الأمان</h3>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => toast.info("تم إرسال رابط تغيير كلمة المرور إلى بريدك الإلكتروني")}
                className="w-full py-2 rounded-xl text-sm border font-medium text-right px-3"
                style={{ borderColor: "#E8DFD0", color: "#2C4A3E" }}
              >
                تغيير كلمة المرور
              </button>
              <button
                onClick={() => toast.info("تم تفعيل المصادقة الثنائية")}
                className="w-full py-2 rounded-xl text-sm border font-medium text-right px-3"
                style={{ borderColor: "#E8DFD0", color: "#2C4A3E" }}
              >
                تفعيل المصادقة الثنائية
              </button>
            </div>
          </div>

          {/* Join date */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "rgba(44,74,62,0.06)", border: "1px solid rgba(44,74,62,0.12)" }}
          >
            <p className="text-xs text-gray-400">عضو منذ</p>
            <p className="font-semibold mt-1" style={{ color: "#2C4A3E" }}>
              {new Date(company?.joinDate ?? "").toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
      </div>
    </CompanyLayout>
  );
}
