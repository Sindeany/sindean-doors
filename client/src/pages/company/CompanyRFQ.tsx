// ============================================================
// Company RFQ Page - Sindian Doors B2B Portal
// Design: Architectural Luxury | Oak Green + Copper + Beige
// ============================================================

import { useState } from "react";
import { useParams, Link } from "wouter";
import CompanyLayout from "@/components/company/CompanyLayout";
import {
  mockRFQs, rfqStatusLabels, rfqStatusColors,
  RFQ, RFQStatus,
} from "@/lib/companyData";
import {
  FileText, Search, Filter, ChevronRight, Calendar, MapPin,
  Package, Clock, CheckCircle2, XCircle, ArrowLeft, MessageSquare,
  Download, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── RFQ List ────────────────────────────────────────────────

export function CompanyRFQList() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<RFQStatus | "all">("all");
  const { dir } = useLanguage();

  const filtered = mockRFQs.filter((r) => {
    const matchSearch = r.projectName.includes(search) || r.rfqNumber.includes(search);
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusOptions: { value: RFQStatus | "all"; label: string }[] = dir === "rtl" ? [
    { value: "all", label: "الكل" },
    { value: "submitted", label: "تم الإرسال" },
    { value: "under_review", label: "قيد المراجعة" },
    { value: "quoted", label: "تم تقديم العرض" },
    { value: "negotiating", label: "قيد التفاوض" },
    { value: "accepted", label: "مقبول" },
    { value: "expired", label: "منتهي الصلاحية" },
  ] : [
    { value: "all", label: "All" },
    { value: "submitted", label: "Submitted" },
    { value: "under_review", label: "Under Review" },
    { value: "quoted", label: "Quoted" },
    { value: "negotiating", label: "Negotiating" },
    { value: "accepted", label: "Accepted" },
    { value: "expired", label: "Expired" },
  ];

  const progressLabels = dir === "rtl"
    ? ["الإرسال", "المراجعة", "العرض", "القبول"]
    : ["Submitted", "Review", "Quoted", "Accepted"];

  return (
    <CompanyLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#2C4A3E", fontFamily: "'DM Serif Display', serif" }}>
            {dir === "rtl" ? "عروض الأسعار" : "Quotations"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {mockRFQs.length} {dir === "rtl" ? "طلب إجمالي" : "total requests"}
          </p>
        </div>
        <Link href="/b2b">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "#2C4A3E", color: "white" }}
          >
            <FileText className="w-4 h-4" />
            {dir === "rtl" ? "طلب عرض سعر جديد" : "New Quotation Request"}
          </button>
        </Link>
      </div>

      {/* Filters */}
      <div
        className="rounded-2xl p-4 mb-4 border flex flex-col sm:flex-row gap-3"
        style={{ background: "white", borderColor: "#E8DFD0" }}
      >
        <div className="relative flex-1">
          <Search className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
          <input
            type="text"
            placeholder={dir === "rtl" ? "ابحث باسم المشروع أو رقم الطلب..." : "Search by project name or request number..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full ${dir === "rtl" ? "pr-9 pl-4" : "pl-9 pr-4"} py-2 text-sm rounded-xl border outline-none focus:ring-1`}
            style={{ borderColor: "#E8DFD0", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={
                filterStatus === opt.value
                  ? { background: "#2C4A3E", color: "white" }
                  : { background: "#E8DFD0", color: "#2C4A3E" }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{dir === "rtl" ? "لا توجد نتائج" : "No results found"}</p>
          </div>
        ) : (
          filtered.map((rfq) => (
            <Link key={rfq.id} href={`/company/rfq/${rfq.id}`}>
              <div
                className="rounded-2xl border p-5 hover:shadow-md transition-all cursor-pointer group"
                style={{ background: "white", borderColor: "#E8DFD0" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm" style={{ color: "#2C4A3E" }}>{rfq.projectName}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${rfqStatusColors[rfq.status]}`}>
                        {rfqStatusLabels[rfq.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>{rfq.rfqNumber}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{rfq.city}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(rfq.submittedDate).toLocaleDateString(dir === "rtl" ? "ar-SA" : "en-US")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />{rfq.totalEstimatedQty} {dir === "rtl" ? "وحدة" : "units"}
                      </span>
                    </div>
                  </div>
                  <div className={`${dir === "rtl" ? "text-left" : "text-right"} flex-shrink-0`}>
                    {rfq.quotedAmount ? (
                      <p className="font-bold text-base" style={{ color: "#C4956A", fontFamily: "'DM Serif Display', serif" }}>
                        {rfq.quotedAmount.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400">{dir === "rtl" ? "لم يُحدد السعر بعد" : "Price not set yet"}</p>
                    )}
                    {rfq.validUntil && rfq.status === "quoted" && (
                      <p className="text-xs text-amber-500 mt-0.5">
                        {dir === "rtl" ? "ينتهي:" : "Expires:"} {new Date(rfq.validUntil).toLocaleDateString(dir === "rtl" ? "ar-SA" : "en-US")}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 mt-1" />
                </div>

                {/* Progress bar for active RFQs */}
                {["submitted", "under_review", "quoted", "negotiating"].includes(rfq.status) && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: "#E8DFD0" }}>
                    <div className="flex items-center gap-1">
                      {(["submitted", "under_review", "quoted", "accepted"] as RFQStatus[]).map((s, i) => {
                        const steps = ["submitted", "under_review", "quoted", "negotiating", "accepted"];
                        const currentIdx = steps.indexOf(rfq.status);
                        const stepIdx = steps.indexOf(s);
                        const done = stepIdx <= currentIdx;
                        return (
                          <div key={s} className="flex items-center flex-1">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: done ? "#2C4A3E" : "#E8DFD0" }}
                            />
                            {i < 3 && (
                              <div
                                className="flex-1 h-0.5 mx-1"
                                style={{ background: done && stepIdx < currentIdx ? "#2C4A3E" : "#E8DFD0" }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-1">
                      {progressLabels.map((label, i) => (
                        <span key={i} className="text-xs text-gray-400">{label}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </CompanyLayout>
  );
}

// ─── RFQ Detail ──────────────────────────────────────────────

export function CompanyRFQDetail() {
  const { id } = useParams<{ id: string }>();
  const { dir } = useLanguage();
  const rfq = mockRFQs.find((r) => r.id === id);

  if (!rfq) {
    return (
      <CompanyLayout>
        <div className="text-center py-20 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{dir === "rtl" ? "طلب عرض السعر غير موجود" : "Quotation request not found"}</p>
          <Link href="/company/rfq">
            <button className="mt-4 text-sm underline" style={{ color: "#C4956A" }}>
              {dir === "rtl" ? "العودة للقائمة" : "Back to list"}
            </button>
          </Link>
        </div>
      </CompanyLayout>
    );
  }

  const rfqSteps: RFQStatus[] = ["submitted", "under_review", "quoted", "negotiating", "accepted"];
  const currentStepIdx = rfqSteps.indexOf(rfq.status);

  const stepLabels: Record<RFQStatus, string> = dir === "rtl" ? {
    submitted: "الإرسال", under_review: "المراجعة", quoted: "تقديم العرض",
    negotiating: "التفاوض", accepted: "القبول", rejected: "مرفوض", expired: "منتهي",
  } : {
    submitted: "Submitted", under_review: "Review", quoted: "Quoted",
    negotiating: "Negotiating", accepted: "Accepted", rejected: "Rejected", expired: "Expired",
  };

  const requestDetails = dir === "rtl" ? [
    { label: "رقم الطلب", value: rfq.rfqNumber },
    { label: "تاريخ الإرسال", value: new Date(rfq.submittedDate).toLocaleDateString("ar-SA") },
    { label: "نوع المشروع", value: rfq.projectType },
    { label: "المدينة", value: rfq.city },
    { label: "مسؤول الحساب", value: rfq.assignedTo ?? "—" },
    ...(rfq.responseDeadline ? [{ label: "موعد الرد", value: new Date(rfq.responseDeadline).toLocaleDateString("ar-SA") }] : []),
  ] : [
    { label: "Request Number", value: rfq.rfqNumber },
    { label: "Submitted Date", value: new Date(rfq.submittedDate).toLocaleDateString("en-US") },
    { label: "Project Type", value: rfq.projectType },
    { label: "City", value: rfq.city },
    { label: "Account Manager", value: rfq.assignedTo ?? "—" },
    ...(rfq.responseDeadline ? [{ label: "Response Deadline", value: new Date(rfq.responseDeadline).toLocaleDateString("en-US") }] : []),
  ];

  return (
    <CompanyLayout>
      {/* Header */}
      <div className="mb-6">
        <Link href="/company/rfq">
          <button className="flex items-center gap-1 text-sm mb-3 hover:underline" style={{ color: "#C4956A" }}>
            <ArrowLeft className="w-3.5 h-3.5" />
            {dir === "rtl" ? "عروض الأسعار" : "Quotations"}
          </button>
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#2C4A3E", fontFamily: "'DM Serif Display', serif" }}>
              {rfq.projectName}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{rfq.rfqNumber} · {rfq.projectType} · {rfq.city}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${rfqStatusColors[rfq.status]}`}>
              {rfqStatusLabels[rfq.status]}
            </span>
            {rfq.status === "quoted" && (
              <button
                onClick={() => toast.success(dir === "rtl" ? "تم إرسال قبولك للعرض! سيتواصل معك مدير الحساب قريباً" : "Your acceptance has been sent! The account manager will contact you soon.")}
                className="text-sm px-4 py-1.5 rounded-full font-semibold"
                style={{ background: "#2C4A3E", color: "white" }}
              >
                {dir === "rtl" ? "قبول العرض" : "Accept Quote"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status timeline */}
          <div className="rounded-2xl border p-5" style={{ background: "white", borderColor: "#E8DFD0" }}>
            <h3 className="font-semibold mb-4 text-sm" style={{ color: "#2C4A3E" }}>
              {dir === "rtl" ? "مسار الطلب" : "Request Progress"}
            </h3>
            {rfq.status !== "expired" && rfq.status !== "rejected" ? (
              <div className="relative">
                <div className="absolute top-4 right-4 left-4 h-0.5" style={{ background: "#E8DFD0" }}>
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${Math.max(0, (currentStepIdx / (rfqSteps.length - 1)) * 100)}%`,
                      background: "#2C4A3E",
                    }}
                  />
                </div>
                <div className="flex justify-between relative z-10">
                  {rfqSteps.map((step, i) => {
                    const done = i <= currentStepIdx;
                    const active = i === currentStepIdx;
                    return (
                      <div key={step} className="flex flex-col items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all"
                          style={{
                            background: done ? "#2C4A3E" : "white",
                            borderColor: done ? "#2C4A3E" : "#E8DFD0",
                            boxShadow: active ? "0 0 0 4px rgba(44,74,62,0.15)" : "none",
                          }}
                        >
                          {done ? (
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          ) : (
                            <span className="text-xs text-gray-400">{i + 1}</span>
                          )}
                        </div>
                        <span className="text-xs text-center" style={{ color: done ? "#2C4A3E" : "var(--color-muted-text)" }}>
                          {stepLabels[step]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.06)" }}>
                <XCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-600">
                  {rfq.status === "expired"
                    ? (dir === "rtl" ? "انتهت صلاحية هذا العرض" : "This quotation has expired")
                    : (dir === "rtl" ? "تم رفض هذا الطلب" : "This request has been rejected")}
                </p>
              </div>
            )}

            {/* History */}
            <div className="mt-6 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {dir === "rtl" ? "سجل الأحداث" : "Event History"}
              </p>
              {rfq.statusHistory.map((h, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: i === rfq.statusHistory.length - 1 ? "#C4956A" : "#E8DFD0" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${rfqStatusColors[h.status]}`}>
                        {rfqStatusLabels[h.status]}
                      </span>
                      <span className="text-xs text-gray-400">{h.date}</span>
                      {h.by && <span className="text-xs text-gray-400">— {h.by}</span>}
                    </div>
                    {h.note && <p className="text-xs text-gray-500 mt-1">{h.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Items */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: "white", borderColor: "#E8DFD0" }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: "#E8DFD0" }}>
              <h3 className="font-semibold text-sm" style={{ color: "#2C4A3E" }}>
                {dir === "rtl" ? "المنتجات المطلوبة" : "Requested Products"}
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#FAF8F5" }}>
                  <th className={`${dir === "rtl" ? "text-right" : "text-left"} px-5 py-2.5 text-xs font-semibold text-gray-500`}>
                    {dir === "rtl" ? "المنتج" : "Product"}
                  </th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500">
                    {dir === "rtl" ? "الكمية" : "Qty"}
                  </th>
                  <th className={`${dir === "rtl" ? "text-right" : "text-left"} px-5 py-2.5 text-xs font-semibold text-gray-500`}>
                    {dir === "rtl" ? "المواصفات" : "Specifications"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rfq.items.map((item, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: "#E8DFD0" }}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-sm" style={{ color: "#2C4A3E" }}>{item.productName}</p>
                      <p className="text-xs text-gray-400">{item.category}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-sm" style={{ color: "#C4956A", fontFamily: "'DM Serif Display', serif" }}>
                        {item.quantity}
                      </span>
                      <span className={`text-xs text-gray-400 ${dir === "rtl" ? "mr-1" : "ml-1"}`}>
                        {dir === "rtl" ? "وحدة" : "units"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">{item.specifications ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "#FAF8F5" }}>
                  <td className="px-5 py-3 font-semibold text-sm" style={{ color: "#2C4A3E" }}>
                    {dir === "rtl" ? "الإجمالي" : "Total"}
                  </td>
                  <td className="px-4 py-3 text-center font-bold" style={{ color: "#2C4A3E" }}>
                    {rfq.totalEstimatedQty} {dir === "rtl" ? "وحدة" : "units"}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quote summary */}
          {rfq.quotedAmount && (
            <div className="rounded-2xl border p-5" style={{ background: "white", borderColor: "#E8DFD0" }}>
              <h3 className="font-semibold text-sm mb-4" style={{ color: "#2C4A3E" }}>
                {dir === "rtl" ? "ملخص العرض" : "Quote Summary"}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{dir === "rtl" ? "قيمة العرض" : "Quote Value"}</span>
                  <span className="font-bold text-lg" style={{ color: "#C4956A", fontFamily: "'DM Serif Display', serif" }}>
                    {rfq.quotedAmount.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}
                  </span>
                </div>
                {rfq.validUntil && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">{dir === "rtl" ? "صالح حتى" : "Valid Until"}</span>
                    <span className="text-xs font-medium" style={{ color: rfq.status === "quoted" ? "#d97706" : "#2C4A3E" }}>
                      {new Date(rfq.validUntil).toLocaleDateString(dir === "rtl" ? "ar-SA" : "en-US")}
                    </span>
                  </div>
                )}
              </div>
              {rfq.status === "quoted" && (
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => toast.success(dir === "rtl" ? "تم إرسال قبولك! سيتواصل معك مدير الحساب قريباً" : "Your acceptance has been sent! The account manager will contact you soon.")}
                    className="w-full py-2 rounded-xl text-sm font-semibold"
                    style={{ background: "#2C4A3E", color: "white" }}
                  >
                    {dir === "rtl" ? "قبول العرض" : "Accept Quote"}
                  </button>
                  <button
                    onClick={() => toast.info(dir === "rtl" ? "تم إرسال طلب التفاوض. سيتواصل معك مدير الحساب" : "Negotiation request sent. The account manager will contact you.")}
                    className="w-full py-2 rounded-xl text-sm font-semibold border"
                    style={{ borderColor: "#2C4A3E", color: "#2C4A3E" }}
                  >
                    {dir === "rtl" ? "طلب تفاوض" : "Request Negotiation"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Details */}
          <div className="rounded-2xl border p-5" style={{ background: "white", borderColor: "#E8DFD0" }}>
            <h3 className="font-semibold text-sm mb-4" style={{ color: "#2C4A3E" }}>
              {dir === "rtl" ? "تفاصيل الطلب" : "Request Details"}
            </h3>
            <div className="space-y-3 text-sm">
              {requestDetails.map((d, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">{d.label}</span>
                  <span className="text-xs font-medium" style={{ color: "#2C4A3E" }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {rfq.notes && (
            <div className="rounded-2xl border p-4" style={{ background: "rgba(44,74,62,0.04)", borderColor: "rgba(44,74,62,0.12)" }}>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4" style={{ color: "#2C4A3E" }} />
                <p className="text-xs font-semibold" style={{ color: "#2C4A3E" }}>
                  {dir === "rtl" ? "ملاحظات" : "Notes"}
                </p>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{rfq.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={() => toast.info(dir === "rtl" ? "جاري تحميل ملف PDF..." : "Downloading PDF file...")}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm border font-medium"
              style={{ borderColor: "#E8DFD0", color: "#2C4A3E" }}
            >
              <Download className="w-4 h-4" />
              {dir === "rtl" ? "تحميل الطلب PDF" : "Download Request PDF"}
            </button>
            <button
              onClick={() => toast.info(dir === "rtl" ? "تم إرسال رسالتك لمدير الحساب" : "Your message has been sent to the account manager")}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm border font-medium"
              style={{ borderColor: "#E8DFD0", color: "#2C4A3E" }}
            >
              <MessageSquare className="w-4 h-4" />
              {dir === "rtl" ? "تواصل مع مدير الحساب" : "Contact Account Manager"}
            </button>
          </div>
        </div>
      </div>
    </CompanyLayout>
  );
}
