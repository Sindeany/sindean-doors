// ============================================================
// AdminSettings - إعدادات النظام
// ============================================================
import { useState } from "react";
import { Save, Bell, Globe, Shield, Users, Palette, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import AdminLayout from "@/components/admin/AdminLayout";

export default function AdminSettings() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";

  const [settings, setSettings] = useState({
    companyName: "سنديان للأبواب الخشبية",
    companyEmail: "info@sindian.sa",
    companyPhone: "920-000-000",
    defaultCurrency: "SAR",
    notifyNewOrder: true,
    notifyNewComplaint: true,
    notifyNewDistributor: true,
    autoApproveDistributor: false,
    minOrderValue: 5000,
    complaintSLAHours: 48,
  });

  const handleSave = () => {
    toast.success(isRtl ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully");
  };

  const sections = [
    {
      icon: <Globe className="w-5 h-5" />,
      title: isRtl ? "معلومات الشركة" : "Company Information",
      color: "#3B82F6",
      fields: [
        { label: isRtl ? "اسم الشركة" : "Company Name", key: "companyName", type: "text" },
        { label: isRtl ? "البريد الإلكتروني" : "Email", key: "companyEmail", type: "email" },
        { label: isRtl ? "رقم الهاتف" : "Phone", key: "companyPhone", type: "text" },
      ],
    },
    {
      icon: <Bell className="w-5 h-5" />,
      title: isRtl ? "إعدادات الإشعارات" : "Notification Settings",
      color: "#F59E0B",
      toggles: [
        { label: isRtl ? "إشعار عند طلب جديد" : "Notify on new order", key: "notifyNewOrder" },
        { label: isRtl ? "إشعار عند شكوى جديدة" : "Notify on new complaint", key: "notifyNewComplaint" },
        { label: isRtl ? "إشعار عند موزع جديد" : "Notify on new distributor", key: "notifyNewDistributor" },
      ],
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: isRtl ? "إعدادات الموزعين" : "Distributor Settings",
      color: "#10B981",
      toggles: [
        { label: isRtl ? "قبول تلقائي للموزعين" : "Auto-approve distributors", key: "autoApproveDistributor" },
      ],
      fields: [
        { label: isRtl ? "الحد الأدنى للطلب (ر.س)" : "Min Order Value (SAR)", key: "minOrderValue", type: "number" },
      ],
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: isRtl ? "إعدادات الشكاوى" : "Complaint Settings",
      color: "#EF4444",
      fields: [
        { label: isRtl ? "مهلة الرد على الشكوى (ساعة)" : "Complaint SLA (hours)", key: "complaintSLAHours", type: "number" },
      ],
    },
  ];

  return (
    <AdminLayout
      title={isRtl ? "إعدادات النظام" : "System Settings"}
      subtitle={isRtl ? "ضبط إعدادات المنصة والإشعارات" : "Configure platform and notification settings"}
    >
      <div className="max-w-2xl space-y-5" dir={dir}>
        {sections.map((section) => (
          <div key={section.title} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${section.color}15`, color: section.color }}>
                {section.icon}
              </div>
              <h3 className="font-bold text-gray-800" style={{ fontFamily: "DM Serif Display, serif" }}>{section.title}</h3>
            </div>

            <div className="space-y-4">
              {section.fields?.map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">{f.label}</label>
                  <input
                    type={f.type}
                    value={(settings as any)[f.key]}
                    onChange={(e) => setSettings({ ...settings, [f.key]: f.type === "number" ? +e.target.value : e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
              ))}

              {section.toggles?.map((t) => (
                <div key={t.key} className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-700">{t.label}</span>
                  <button
                    onClick={() => setSettings({ ...settings, [t.key]: !(settings as any)[t.key] })}
                    className="transition-colors"
                    style={{ color: (settings as any)[t.key] ? "#10B981" : "#D1D5DB" }}
                  >
                    {(settings as any)[t.key]
                      ? <ToggleRight className="w-8 h-8" />
                      : <ToggleLeft className="w-8 h-8" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        <Button onClick={handleSave} className="gap-2 text-white w-full" style={{ background: "oklch(0.38 0.06 160)" }}>
          <Save className="w-4 h-4" />
          {isRtl ? "حفظ جميع الإعدادات" : "Save All Settings"}
        </Button>
      </div>
    </AdminLayout>
  );
}

// Fix missing import
function ToggleLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="5" width="22" height="14" rx="7" />
      <circle cx="8" cy="12" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}
function ToggleRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="5" width="22" height="14" rx="7" />
      <circle cx="16" cy="12" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}
