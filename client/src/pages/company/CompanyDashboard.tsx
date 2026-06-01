// ============================================================
// Company Dashboard - Sindian Doors B2B Portal
// Design: Architectural Luxury | Oak Green + Copper + Beige
// Fixed: uses hardcoded hex colors instead of missing CSS vars
// ============================================================

import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import CompanyLayout from "@/components/company/CompanyLayout";
import { mockRFQs, mockPurchaseOrders, rfqStatusLabels, rfqStatusColors, poStatusLabels, poStatusColors } from "@/lib/companyData";
import { Link } from "wouter";
import {
  FileText, Package, CheckCircle2, AlertCircle, ArrowLeft,
  TrendingUp, CreditCard, Building2, ArrowRight, Sparkles,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4 } }),
};

export default function CompanyDashboard() {
  const { company } = useCompanyAuth();
  const { dir } = useLanguage();
  const isRTL = dir === "rtl";

  const activeRFQs = mockRFQs.filter((r) => ["submitted", "under_review", "quoted", "negotiating"].includes(r.status)).length;
  const acceptedRFQs = mockRFQs.filter((r) => r.status === "accepted").length;
  const activeOrders = mockPurchaseOrders.filter((p) => !["delivered", "cancelled"].includes(p.status)).length;
  const deliveredOrders = mockPurchaseOrders.filter((p) => p.status === "delivered").length;
  const totalSpent = mockPurchaseOrders.filter((p) => p.status === "delivered").reduce((s, p) => s + p.totalAmount, 0);
  const creditAvailable = (company?.creditLimit ?? 0) - (company?.creditUsed ?? 0);
  const creditPercent = Math.round(((company?.creditUsed ?? 0) / (company?.creditLimit ?? 1)) * 100);

  const recentRFQs = [...mockRFQs].sort((a, b) => b.submittedDate.localeCompare(a.submittedDate)).slice(0, 3);
  const recentOrders = [...mockPurchaseOrders].sort((a, b) => b.submittedDate.localeCompare(a.submittedDate)).slice(0, 3);
  const quotedRFQsCount = mockRFQs.filter((r) => r.status === "quoted").length;

  const stats = [
    {
      label: isRTL ? "عروض أسعار نشطة" : "Active Quotations",
      value: activeRFQs,
      icon: FileText,
      gradient: "linear-gradient(135deg, #C4956A 0%, #D4A574 100%)",
      iconBg: "rgba(196,149,106,0.15)",
      iconColor: "#C4956A",
      href: "/company/rfq",
    },
    {
      label: isRTL ? "عروض مقبولة" : "Accepted Quotes",
      value: acceptedRFQs,
      icon: CheckCircle2,
      gradient: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
      iconBg: "rgba(22,163,74,0.12)",
      iconColor: "#16a34a",
      href: "/company/rfq",
    },
    {
      label: isRTL ? "أوامر شراء جارية" : "Active Orders",
      value: activeOrders,
      icon: Package,
      gradient: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
      iconBg: "rgba(124,58,237,0.12)",
      iconColor: "#7c3aed",
      href: "/company/orders",
    },
    {
      label: isRTL ? "طلبات مُسلَّمة" : "Delivered Orders",
      value: deliveredOrders,
      icon: TrendingUp,
      gradient: "linear-gradient(135deg, #2C4A3E 0%, #3d6b5a 100%)",
      iconBg: "rgba(44,74,62,0.12)",
      iconColor: "#2C4A3E",
      href: "/company/orders",
    },
  ];

  return (
    <CompanyLayout>
      {/* ── Welcome header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-7 flex items-start justify-between gap-4 flex-wrap"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5" style={{ color: "#C4956A" }} />
            <h1
              className="text-2xl lg:text-3xl font-bold"
              style={{ color: "#2C4A3E", fontFamily: "'DM Serif Display', serif" }}
            >
              {isRTL ? `مرحباً، ${company?.contactName}` : `Welcome, ${company?.contactName}`}
            </h1>
          </div>
          <p className="text-sm" style={{ color: "#6B7B75" }}>
            {company?.companyName} — {isRTL ? "آخر تحديث: اليوم" : "Last updated: Today"}
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: "rgba(44,74,62,0.08)", color: "#2C4A3E" }}
        >
          <Building2 className="w-4 h-4" />
          <span>{isRTL ? "شركة موثقة" : "Verified Company"}</span>
        </div>
      </motion.div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            <Link href={s.href}>
              <div
                className="rounded-2xl p-5 cursor-pointer group transition-all duration-200 hover:-translate-y-1"
                style={{
                  background: "white",
                  border: "1px solid #E8DFD0",
                  boxShadow: "0 2px 12px rgba(44,74,62,0.06)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 8px 24px rgba(44,74,62,0.12)")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(44,74,62,0.06)")}
              >
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: s.iconBg }}
                >
                  <s.icon className="w-5 h-5" style={{ color: s.iconColor }} />
                </div>
                {/* Value */}
                <p
                  className="text-3xl font-bold mb-1 leading-none"
                  style={{ color: "#2C4A3E", fontFamily: "'DM Serif Display', serif" }}
                >
                  {s.value}
                </p>
                {/* Label */}
                <p className="text-xs font-medium leading-tight" style={{ color: "#6B7B75" }}>
                  {s.label}
                </p>
                {/* Bottom accent bar */}
                <div
                  className="mt-4 h-1 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
                  style={{ background: s.gradient }}
                />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* ── Credit + Total Spent ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Credit limit card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
          className="rounded-2xl p-6"
          style={{
            background: "white",
            border: "1px solid #E8DFD0",
            boxShadow: "0 2px 12px rgba(44,74,62,0.06)",
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(44,74,62,0.08)" }}
              >
                <CreditCard className="w-4.5 h-4.5" style={{ width: "18px", height: "18px", color: "#2C4A3E" }} />
              </div>
              <p className="font-bold text-sm" style={{ color: "#2C4A3E" }}>
                {isRTL ? "حد الائتمان" : "Credit Limit"}
              </p>
            </div>
            <span
              className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{
                background: creditPercent > 80 ? "rgba(239,68,68,0.1)" : "rgba(44,74,62,0.08)",
                color: creditPercent > 80 ? "#ef4444" : "#2C4A3E",
              }}
            >
              {creditPercent}% {isRTL ? "مستخدم" : "used"}
            </span>
          </div>

          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-xs mb-1" style={{ color: "#9CA3AF" }}>{isRTL ? "المستخدم" : "Used"}</p>
              <p
                className="text-2xl font-bold"
                style={{ color: "#C4956A", fontFamily: "'DM Serif Display', serif" }}
              >
                {(company?.creditUsed ?? 0).toLocaleString()}
                <span className="text-sm font-normal ml-1">{isRTL ? "ر.س" : "SAR"}</span>
              </p>
            </div>
            <div className={isRTL ? "text-left" : "text-right"}>
              <p className="text-xs mb-1" style={{ color: "#9CA3AF" }}>{isRTL ? "المتاح" : "Available"}</p>
              <p
                className="text-2xl font-bold"
                style={{ color: "#2C4A3E", fontFamily: "'DM Serif Display', serif" }}
              >
                {creditAvailable.toLocaleString()}
                <span className="text-sm font-normal ml-1">{isRTL ? "ر.س" : "SAR"}</span>
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#F0EBE0" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${creditPercent}%`,
                background: creditPercent > 80
                  ? "linear-gradient(90deg, #ef4444, #f87171)"
                  : "linear-gradient(90deg, #C4956A, #D4A574)",
              }}
            />
          </div>
          <p className="text-xs mt-2" style={{ color: "#9CA3AF" }}>
            {isRTL ? "الحد الكلي:" : "Total limit:"}{" "}
            <span style={{ color: "#2C4A3E", fontWeight: 600 }}>
              {(company?.creditLimit ?? 0).toLocaleString()} {isRTL ? "ر.س" : "SAR"}
            </span>
          </p>
        </motion.div>

        {/* Total spent card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.38 } }}
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #1e3329 0%, #2C4A3E 50%, #243d33 100%)",
            boxShadow: "0 8px 32px rgba(44,74,62,0.25)",
          }}
        >
          {/* Decorative circle */}
          <div
            className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10"
            style={{ background: "#C4956A" }}
          />
          <div
            className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-10"
            style={{ background: "#C4956A" }}
          />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4" style={{ color: "rgba(255,255,255,0.6)" }} />
              <p className="font-semibold text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                {isRTL ? "إجمالي المشتريات" : "Total Purchases"}
              </p>
            </div>
            <p
              className="text-4xl font-bold text-white mb-1"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              {totalSpent.toLocaleString()}
            </p>
            <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.5)" }}>
              {isRTL ? "ريال سعودي — الطلبات المُسلَّمة" : "SAR — Delivered Orders"}
            </p>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs mb-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {isRTL ? "مدير الحساب" : "Account Manager"}
                </p>
                <p className="text-sm font-semibold text-white">{company?.accountManager}</p>
              </div>
              <div className={isRTL ? "text-left" : "text-right"}>
                <p className="text-xs mb-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {isRTL ? "عضو منذ" : "Member since"}
                </p>
                <p className="text-sm font-semibold text-white">
                  {new Date(company?.joinDate ?? "").toLocaleDateString(isRTL ? "ar-SA" : "en-US", { year: "numeric", month: "long" })}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Recent RFQs + Recent Orders ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Recent RFQs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.45 } }}
          className="rounded-2xl overflow-hidden"
          style={{
            background: "white",
            border: "1px solid #E8DFD0",
            boxShadow: "0 2px 12px rgba(44,74,62,0.06)",
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: "#E8DFD0", background: "#FAF8F5" }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(196,149,106,0.12)" }}
              >
                <FileText className="w-4 h-4" style={{ color: "#C4956A" }} />
              </div>
              <p className="font-bold text-sm" style={{ color: "#2C4A3E" }}>
                {isRTL ? "آخر عروض الأسعار" : "Recent Quotations"}
              </p>
            </div>
            <Link href="/company/rfq">
              <button
                className="text-xs flex items-center gap-1 font-medium transition-colors hover:opacity-70"
                style={{ color: "#C4956A" }}
              >
                {isRTL ? "عرض الكل" : "View All"}
                <ArrowLeft className="w-3 h-3" style={{ transform: isRTL ? "none" : "rotate(180deg)" }} />
              </button>
            </Link>
          </div>
          <div>
            {recentRFQs.map((rfq, i) => (
              <Link key={rfq.id} href={`/company/rfq/${rfq.id}`}>
                <div
                  className="px-5 py-4 cursor-pointer transition-colors border-b last:border-b-0"
                  style={{ borderColor: "#F0EBE0" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#FAF8F5")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: "#2C4A3E" }}>
                        {rfq.projectName}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                        {rfq.rfqNumber} · {rfq.totalEstimatedQty} {isRTL ? "وحدة" : "units"}
                      </p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 font-medium ${rfqStatusColors[rfq.status]}`}>
                      {rfqStatusLabels[rfq.status]}
                    </span>
                  </div>
                  {rfq.quotedAmount && (
                    <p className="text-sm mt-2 font-bold" style={{ color: "#C4956A" }}>
                      {rfq.quotedAmount.toLocaleString()} {isRTL ? "ر.س" : "SAR"}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.52 } }}
          className="rounded-2xl overflow-hidden"
          style={{
            background: "white",
            border: "1px solid #E8DFD0",
            boxShadow: "0 2px 12px rgba(44,74,62,0.06)",
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: "#E8DFD0", background: "#FAF8F5" }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(44,74,62,0.1)" }}
              >
                <Package className="w-4 h-4" style={{ color: "#2C4A3E" }} />
              </div>
              <p className="font-bold text-sm" style={{ color: "#2C4A3E" }}>
                {isRTL ? "آخر أوامر الشراء" : "Recent Purchase Orders"}
              </p>
            </div>
            <Link href="/company/orders">
              <button
                className="text-xs flex items-center gap-1 font-medium transition-colors hover:opacity-70"
                style={{ color: "#C4956A" }}
              >
                {isRTL ? "عرض الكل" : "View All"}
                <ArrowLeft className="w-3 h-3" style={{ transform: isRTL ? "none" : "rotate(180deg)" }} />
              </button>
            </Link>
          </div>
          <div>
            {recentOrders.map((po, i) => (
              <Link key={po.id} href={`/company/orders/${po.id}`}>
                <div
                  className="px-5 py-4 cursor-pointer transition-colors border-b last:border-b-0"
                  style={{ borderColor: "#F0EBE0" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#FAF8F5")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: "#2C4A3E" }}>
                        {po.projectName}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                        {po.poNumber} · {po.city}
                      </p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 font-medium ${poStatusColors[po.status]}`}>
                      {poStatusLabels[po.status]}
                    </span>
                  </div>
                  <p className="text-sm mt-2 font-bold" style={{ color: "#C4956A" }}>
                    {po.totalAmount.toLocaleString()} {isRTL ? "ر.س" : "SAR"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Alert: Quotations awaiting response ── */}
      {mockRFQs.some((r) => r.status === "quoted") && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.6 } }}
          className="p-5 rounded-2xl flex items-start gap-4"
          style={{
            background: "linear-gradient(135deg, rgba(196,149,106,0.08) 0%, rgba(196,149,106,0.04) 100%)",
            border: "1px solid rgba(196,149,106,0.25)",
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(196,149,106,0.15)" }}
          >
            <AlertCircle className="w-5 h-5" style={{ color: "#C4956A" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: "#C4956A" }}>
              {isRTL
                ? `لديك ${quotedRFQsCount} عرض سعر بانتظار ردك`
                : `You have ${quotedRFQsCount} quotation${quotedRFQsCount > 1 ? "s" : ""} awaiting your response`}
            </p>
            <p className="text-xs mt-1" style={{ color: "#6B7B75" }}>
              {isRTL
                ? "يرجى مراجعة العروض والرد قبل انتهاء الصلاحية"
                : "Please review the quotes and respond before they expire"}
            </p>
          </div>
          <Link href="/company/rfq">
            <button
              className="text-xs px-4 py-2 rounded-xl font-semibold flex-shrink-0 transition-opacity hover:opacity-80"
              style={{ background: "#C4956A", color: "white" }}
            >
              {isRTL ? "مراجعة" : "Review"}
            </button>
          </Link>
        </motion.div>
      )}
    </CompanyLayout>
  );
}
