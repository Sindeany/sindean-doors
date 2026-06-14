// ============================================================
// Distributor Account Page - Sindian Doors
// Design: Architectural Luxury | Profile + credit + settings
// ============================================================

import { useLocation } from "wouter";
import { useDistributorAuth } from "@/contexts/DistributorAuthContext";
import DistributorLayout from "@/components/distributor/DistributorLayout";
import { tierConfig } from "@/lib/distributorData";
import { User, Building2, Phone, Mail, MapPin, CreditCard, Award, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function DistributorAccount() {
  const { distributor } = useDistributorAuth();
  const [, navigate] = useLocation();

  if (!distributor) {
    navigate("/distributor");
    return null;
  }

  const tier = tierConfig[distributor.tier];
  const creditPercent = Math.round((distributor.creditUsed / distributor.creditLimit) * 100);
  const creditAvailable = distributor.creditLimit - distributor.creditUsed;

  return (
    <DistributorLayout title="حسابي" subtitle="إدارة بيانات حسابك الشخصي">
      <div className="space-y-6 max-w-4xl" style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>

        {/* Profile header */}
        <div
          className="rounded-2xl p-6 flex items-center gap-5"
          style={{ background: "linear-gradient(135deg, oklch(0.30 0.06 160), oklch(0.38 0.06 160))" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
            style={{ background: "oklch(1 0 0 / 0.15)" }}
          >
            {distributor.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="text-white text-xl font-bold" style={{ fontFamily: "DM Serif Display, serif" }}>
              {distributor.name}
            </h2>
            <p className="text-white/60 text-sm">{distributor.company}</p>
            <div className="flex items-center gap-3 mt-2">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: `${tier.color}30`, color: tier.color }}
              >
                موزع {tier.label}
              </span>
              <span className="text-white/40 text-xs">منذ {distributor.joinDate}</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 text-white hover:bg-white/10 gap-1.5 hidden sm:flex"
            onClick={() => navigate("/distributor/settings")}
          >
            <Edit className="w-3.5 h-3.5" />
            تعديل
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Personal info */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3
              className="font-bold text-lg mb-4"
              style={{ color: "oklch(0.25 0.04 160)", fontFamily: "DM Serif Display, serif" }}
            >
              البيانات الشخصية
            </h3>
            <div className="space-y-4">
              {[
                { icon: User, label: "الاسم الكامل", value: distributor.name },
                { icon: Building2, label: "اسم الشركة", value: distributor.company },
                { icon: Mail, label: "البريد الإلكتروني", value: distributor.email },
                { icon: Phone, label: "رقم الجوال", value: distributor.phone },
                { icon: MapPin, label: "المدينة", value: distributor.city },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "oklch(0.96 0.01 160)" }}
                  >
                    <Icon className="w-4 h-4" style={{ color: "oklch(0.38 0.06 160)" }} />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">{label}</div>
                    <div className="text-sm font-medium" style={{ color: "oklch(0.25 0.04 160)" }}>
                      {value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-1.5 text-sm"
              onClick={() => navigate("/distributor/settings")}
            >
              <Edit className="w-3.5 h-3.5" />
              تعديل البيانات
            </Button>
          </div>

          {/* Credit & tier info */}
          <div className="space-y-4">
            {/* Credit card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="font-bold text-lg"
                  style={{ color: "oklch(0.25 0.04 160)", fontFamily: "DM Serif Display, serif" }}
                >
                  الائتمان
                </h3>
                <CreditCard className="w-5 h-5 text-gray-400" />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl p-3" style={{ background: "oklch(0.96 0.01 160)" }}>
                  <div className="text-xs text-gray-400 mb-1">الحد الائتماني</div>
                  <div
                    className="font-bold text-lg"
                    style={{ color: "oklch(0.25 0.04 160)", fontFamily: "DM Serif Display, serif" }}
                  >
                    {(distributor.creditLimit / 1000).toFixed(0)}K
                  </div>
                  <div className="text-xs text-gray-400">ريال سعودي</div>
                </div>
                <div className="rounded-xl p-3" style={{ background: "oklch(0.97 0.02 60)" }}>
                  <div className="text-xs text-gray-400 mb-1">المتاح</div>
                  <div
                    className="font-bold text-lg"
                    style={{ color: "oklch(0.45 0.08 60)", fontFamily: "DM Serif Display, serif" }}
                  >
                    {(creditAvailable / 1000).toFixed(1)}K
                  </div>
                  <div className="text-xs text-gray-400">ريال سعودي</div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500">المستخدم: {(distributor.creditUsed / 1000).toFixed(1)}K ر.س</span>
                  <span style={{ color: creditPercent > 80 ? "#dc2626" : "oklch(0.38 0.06 160)" }}>
                    {creditPercent}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${creditPercent}%`,
                      background: creditPercent > 80 ? "#dc2626" : "oklch(0.38 0.06 160)",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Tier card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="font-bold text-lg"
                  style={{ color: "oklch(0.25 0.04 160)", fontFamily: "DM Serif Display, serif" }}
                >
                  مستوى الموزع
                </h3>
                <Award className="w-5 h-5" style={{ color: tier.color }} />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: `${tier.color}20`, color: tier.color }}
                >
                  ★
                </div>
                <div>
                  <div className="font-bold" style={{ color: tier.color }}>
                    موزع {tier.label}
                  </div>
                  <div className="text-sm text-gray-500">خصم {distributor.discount}% على جميع المنتجات</div>
                </div>
              </div>
              <div className="space-y-2">
                {Object.entries(tierConfig).map(([key, t]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-1.5 px-3 rounded-lg text-sm"
                    style={{
                      background: key === distributor.tier ? `${t.color}15` : "transparent",
                      border: key === distributor.tier ? `1px solid ${t.color}40` : "1px solid transparent",
                    }}
                  >
                    <span style={{ color: key === distributor.tier ? t.color : "#9ca3af" }}>
                      موزع {t.label}
                    </span>
                    <span style={{ color: key === distributor.tier ? t.color : "#9ca3af" }}>
                      خصم {t.discount}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sales rep */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3
            className="font-bold mb-3"
            style={{ color: "oklch(0.25 0.04 160)", fontFamily: "DM Serif Display, serif" }}
          >
            مندوب المبيعات المخصص
          </h3>
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
              style={{ background: "oklch(0.68 0.10 60)" }}
            >
              {distributor.salesRep.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="font-medium" style={{ color: "oklch(0.25 0.04 160)" }}>
                {distributor.salesRep}
              </div>
              <div className="text-sm text-gray-400">مندوب مبيعات - سنديان للأبواب</div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.info("التواصل مع المندوب - قريباً")}
            >
              تواصل
            </Button>
          </div>
        </div>
      </div>
    </DistributorLayout>
  );
}
