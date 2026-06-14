// ============================================================
// AdminDistributors - إدارة الموزعين المتكاملة
// إضافة موزع جديد، تعديل، قبول/رفض، تغيير المستوى، تصدير
// ============================================================
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Search,
  UserCheck,
  UserX,
  Users,
  Eye,
  MapPin,
  Phone,
  Mail,
  TrendingUp,
  Star,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Crown,
  Award,
  Zap,
  X,
  Edit2,
  Ban,
  RefreshCw,
  Plus,
  Download,
  FileText,
  MessageSquare,
  ChevronDown,
  Save,
  AlertCircle,
  Briefcase,
  CreditCard,
  Hash,
  Globe,
  Calendar,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import * as XLSX from "xlsx";

// ─── Types ───────────────────────────────────────────────────
export type DistributorStatus = "active" | "pending" | "suspended" | "rejected";
export type DistributorTier = "bronze" | "silver" | "gold" | "platinum";

export interface Distributor {
  id: string;
  name: string;
  company: string;
  city: string;
  region: string;
  phone: string;
  email: string;
  whatsapp?: string;
  website?: string;
  commercialReg?: string;
  vatNumber?: string;
  bankName?: string;
  bankIban?: string;
  status: DistributorStatus;
  tier: DistributorTier;
  joinDate: string;
  contractStart?: string;
  contractEnd?: string;
  creditLimit?: number;
  discountRate?: number;
  totalOrders: number;
  totalRevenue: number;
  avgRating: number;
  pendingOrders: number;
  openComplaints: number;
  notes?: string;
  adminNotes?: string;
}
// ─── Config ──────────────────────────────────────────────────
const STATUS_CFG: Record<
  DistributorStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  active: {
    label: "نشط",
    color: "#10B981",
    bg: "#ECFDF5",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  pending: {
    label: "بانتظار الموافقة",
    color: "#F59E0B",
    bg: "#FFFBEB",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  suspended: {
    label: "موقوف",
    color: "#EF4444",
    bg: "#FEF2F2",
    icon: <Ban className="w-3.5 h-3.5" />,
  },
  rejected: {
    label: "مرفوض",
    color: "#6B7280",
    bg: "#F3F4F6",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

const TIER_CFG: Record<
  DistributorTier,
  {
    label: string;
    color: string;
    bg: string;
    icon: React.ReactNode;
    discount: string;
  }
> = {
  bronze: {
    label: "برونزي",
    color: "#92400E",
    bg: "#FEF3C7",
    icon: <Award className="w-3.5 h-3.5" />,
    discount: "5%",
  },
  silver: {
    label: "فضي",
    color: "#6B7280",
    bg: "#F3F4F6",
    icon: <Star className="w-3.5 h-3.5" />,
    discount: "10%",
  },
  gold: {
    label: "ذهبي",
    color: "#D97706",
    bg: "#FFFBEB",
    icon: <Crown className="w-3.5 h-3.5" />,
    discount: "15%",
  },
  platinum: {
    label: "بلاتيني",
    color: "#7C3AED",
    bg: "#F5F3FF",
    icon: <Zap className="w-3.5 h-3.5" />,
    discount: "20%",
  },
};

const REGIONS = [
  "الرياض",
  "مكة المكرمة",
  "المدينة المنورة",
  "الشرقية",
  "عسير",
  "تبوك",
  "حائل",
  "القصيم",
  "جازان",
  "نجران",
  "الباحة",
  "الجوف",
  "الحدود الشمالية",
];
const CITIES = [
  "الرياض",
  "جدة",
  "مكة المكرمة",
  "المدينة المنورة",
  "الدمام",
  "الخبر",
  "الطائف",
  "أبها",
  "تبوك",
  "القصيم",
  "حائل",
  "جازان",
  "نجران",
  "الباحة",
];

// ─── Empty Distributor Template ───────────────────────────────
const emptyDist = (): Omit<Distributor, "id"> => ({
  name: "",
  company: "",
  city: "",
  region: "",
  phone: "",
  email: "",
  whatsapp: "",
  website: "",
  commercialReg: "",
  vatNumber: "",
  bankName: "",
  bankIban: "",
  status: "pending",
  tier: "bronze",
  joinDate: new Date().toISOString().slice(0, 10),
  contractStart: "",
  contractEnd: "",
  creditLimit: 50000,
  discountRate: 5,
  totalOrders: 0,
  totalRevenue: 0,
  avgRating: 0,
  pendingOrders: 0,
  openComplaints: 0,
  notes: "",
  adminNotes: "",
});

// ─── Add / Edit Modal ─────────────────────────────────────────
export function DistributorFormModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Distributor;
  onClose: () => void;
  onSave: (d: Distributor) => void;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<Omit<Distributor, "id">>(
    initial ? { ...initial } : emptyDist()
  );
  const [activeTab, setActiveTab] = useState<
    "basic" | "financial" | "contract"
  >("basic");
  const [errors, setErrors] = useState<
    Partial<Record<keyof Distributor, string>>
  >({});

  const set = (field: keyof Omit<Distributor, "id">, val: string | number) =>
    setForm(p => ({ ...p, [field]: val }));

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "الاسم مطلوب";
    if (!form.company.trim()) e.company = "اسم الشركة مطلوب";
    if (!form.phone.trim()) e.phone = "رقم الهاتف مطلوب";
    if (!form.email.trim()) e.email = "البريد الإلكتروني مطلوب";
    if (!form.city.trim()) e.city = "المدينة مطلوبة";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const id = initial?.id || `D${String(Date.now()).slice(-4)}`;
    onSave({ id, ...form });
    toast.success(
      isEdit ? "تم تحديث بيانات الموزع بنجاح" : "تم إضافة الموزع بنجاح"
    );
    onClose();
  };

  const tabs = [
    {
      id: "basic",
      label: "البيانات الأساسية",
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: "financial",
      label: "البيانات المالية",
      icon: <CreditCard className="w-4 h-4" />,
    },
    {
      id: "contract",
      label: "العقد والمستوى",
      icon: <FileText className="w-4 h-4" />,
    },
  ] as const;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col"
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                style={{ background: "oklch(0.38 0.06 160)" }}
              >
                {isEdit ? (
                  <Edit2 className="w-5 h-5" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
              </div>
              <div>
                <h2
                  className="font-bold text-gray-900"
                  style={{ fontFamily: "DM Serif Display, serif" }}
                >
                  {isEdit ? "تعديل بيانات الموزع" : "إضافة موزع جديد"}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isEdit
                    ? `رقم الموزع: ${initial?.id}`
                    : "أدخل بيانات الموزع الجديد"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 bg-gray-50">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all border-b-2 ${
                  activeTab === t.id
                    ? "border-green-600 text-green-700 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Form Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* ── Tab 1: Basic ── */}
            {activeTab === "basic" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      الاسم الكامل <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.name}
                      onChange={e => set("name", e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors ${errors.name ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                      placeholder="مثال: أحمد محمد الزهراني"
                    />
                    {errors.name && (
                      <p className="text-xs text-red-500 mt-1">{errors.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      اسم الشركة / المؤسسة{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.company}
                      onChange={e => set("company", e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors ${errors.company ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                      placeholder="مثال: شركة النخبة للمقاولات"
                    />
                    {errors.company && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.company}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      رقم الجوال <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.phone}
                      onChange={e => set("phone", e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors ${errors.phone ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                      placeholder="05XXXXXXXX"
                      dir="ltr"
                    />
                    {errors.phone && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.phone}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      رقم واتساب
                    </label>
                    <input
                      value={form.whatsapp || ""}
                      onChange={e => set("whatsapp", e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                      placeholder="05XXXXXXXX (اتركه فارغاً إن كان نفس الجوال)"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      البريد الإلكتروني <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.email}
                      onChange={e => set("email", e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors ${errors.email ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                      placeholder="example@company.sa"
                      dir="ltr"
                    />
                    {errors.email && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.email}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      الموقع الإلكتروني
                    </label>
                    <input
                      value={form.website || ""}
                      onChange={e => set("website", e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                      placeholder="www.company.sa"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      المنطقة <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.region}
                      onChange={e => set("region", e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors bg-white"
                    >
                      <option value="">اختر المنطقة</option>
                      {REGIONS.map(r => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      المدينة <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.city}
                      onChange={e => set("city", e.target.value)}
                      list="cities-list"
                      className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors ${errors.city ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                      placeholder="اختر أو اكتب المدينة"
                    />
                    <datalist id="cities-list">
                      {CITIES.map(c => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                    {errors.city && (
                      <p className="text-xs text-red-500 mt-1">{errors.city}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      السجل التجاري
                    </label>
                    <input
                      value={form.commercialReg || ""}
                      onChange={e => set("commercialReg", e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                      placeholder="10XXXXXXXX"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      الرقم الضريبي
                    </label>
                    <input
                      value={form.vatNumber || ""}
                      onChange={e => set("vatNumber", e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                      placeholder="3XXXXXXXXXXXXXXXXXXX"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    ملاحظات الموزع
                  </label>
                  <textarea
                    value={form.notes || ""}
                    onChange={e => set("notes", e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors resize-none"
                    placeholder="أي ملاحظات خاصة بالموزع..."
                  />
                </div>
              </div>
            )}

            {/* ── Tab 2: Financial ── */}
            {activeTab === "financial" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      اسم البنك
                    </label>
                    <input
                      value={form.bankName || ""}
                      onChange={e => set("bankName", e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                      placeholder="مثال: البنك الأهلي السعودي"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      رقم الآيبان (IBAN)
                    </label>
                    <input
                      value={form.bankIban || ""}
                      onChange={e => set("bankIban", e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                      placeholder="SA00 0000 0000 0000 0000 0000"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      حد الائتمان (ر.س)
                    </label>
                    <input
                      type="number"
                      value={form.creditLimit || 0}
                      onChange={e => set("creditLimit", Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                      min={0}
                      step={5000}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      الحد الأقصى للطلبات غير المسددة
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      نسبة الخصم (%)
                    </label>
                    <input
                      type="number"
                      value={form.discountRate || 0}
                      onChange={e =>
                        set("discountRate", Number(e.target.value))
                      }
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                      min={0}
                      max={50}
                      step={1}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      نسبة الخصم الافتراضية على الطلبات
                    </p>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-700">
                      ملاحظة مالية
                    </span>
                  </div>
                  <p className="text-xs text-blue-600">
                    يتم تحديث إجمالي الطلبات والإيرادات تلقائياً من نظام
                    الطلبات. لا يمكن تعديلها يدوياً.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    ملاحظات داخلية (للإدارة فقط)
                  </label>
                  <textarea
                    value={form.adminNotes || ""}
                    onChange={e => set("adminNotes", e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors resize-none"
                    placeholder="ملاحظات داخلية لا يراها الموزع..."
                  />
                </div>
              </div>
            )}

            {/* ── Tab 3: Contract & Tier ── */}
            {activeTab === "contract" && (
              <div className="space-y-4">
                {/* Tier Selection */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-2 block">
                    مستوى الموزع
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      Object.entries(TIER_CFG) as [
                        DistributorTier,
                        (typeof TIER_CFG)[DistributorTier],
                      ][]
                    ).map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => set("tier", key)}
                        className="flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-start"
                        style={
                          form.tier === key
                            ? { borderColor: cfg.color, background: cfg.bg }
                            : { borderColor: "#E5E7EB", background: "white" }
                        }
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{
                            background:
                              form.tier === key ? cfg.color : "#F3F4F6",
                            color: form.tier === key ? "white" : "#9CA3AF",
                          }}
                        >
                          {cfg.icon}
                        </div>
                        <div>
                          <div
                            className="text-sm font-semibold"
                            style={{
                              color: form.tier === key ? cfg.color : "#374151",
                            }}
                          >
                            {cfg.label}
                          </div>
                          <div className="text-xs text-gray-400">
                            خصم {cfg.discount}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Selection */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-2 block">
                    حالة الحساب
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      Object.entries(STATUS_CFG) as [
                        DistributorStatus,
                        (typeof STATUS_CFG)[DistributorStatus],
                      ][]
                    ).map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => set("status", key)}
                        className="flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-start"
                        style={
                          form.status === key
                            ? { borderColor: cfg.color, background: cfg.bg }
                            : { borderColor: "#E5E7EB", background: "white" }
                        }
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{
                            background:
                              form.status === key ? cfg.color : "#F3F4F6",
                            color: form.status === key ? "white" : "#9CA3AF",
                          }}
                        >
                          {cfg.icon}
                        </div>
                        <span
                          className="text-sm font-medium"
                          style={{
                            color: form.status === key ? cfg.color : "#374151",
                          }}
                        >
                          {cfg.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contract Dates */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      تاريخ الانضمام
                    </label>
                    <input
                      type="date"
                      value={form.joinDate}
                      onChange={e => set("joinDate", e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      بداية العقد
                    </label>
                    <input
                      type="date"
                      value={form.contractStart || ""}
                      onChange={e => set("contractStart", e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      نهاية العقد
                    </label>
                    <input
                      type="date"
                      value={form.contractEnd || ""}
                      onChange={e => set("contractEnd", e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Contract expiry warning */}
                {form.contractEnd &&
                  new Date(form.contractEnd) <
                    new Date(Date.now() + 30 * 24 * 3600000) && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <p className="text-xs text-amber-700">
                        {new Date(form.contractEnd) < new Date()
                          ? "العقد منتهٍ! يرجى التجديد."
                          : `العقد سينتهي في ${new Date(form.contractEnd).toLocaleDateString("ar-SA")} — قريباً.`}
                      </p>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-gray-100 flex items-center justify-between">
            <div className="flex gap-2">
              {activeTab !== "basic" && (
                <Button
                  variant="outline"
                  onClick={() =>
                    setActiveTab(
                      activeTab === "contract" ? "financial" : "basic"
                    )
                  }
                >
                  السابق
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                إلغاء
              </Button>
              {activeTab !== "contract" ? (
                <Button
                  onClick={() =>
                    setActiveTab(
                      activeTab === "basic" ? "financial" : "contract"
                    )
                  }
                  className="text-white gap-2"
                  style={{ background: "oklch(0.38 0.06 160)" }}
                >
                  التالي <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                </Button>
              ) : (
                <Button
                  onClick={handleSave}
                  className="text-white gap-2"
                  style={{ background: "oklch(0.38 0.06 160)" }}
                >
                  <Save className="w-4 h-4" />
                  {isEdit ? "حفظ التعديلات" : "إضافة الموزع"}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────
function DistributorDetailModal({
  dist,
  onClose,
  onEdit,
  onStatusChange,
  onTierChange,
}: {
  dist: Distributor;
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: (id: string, status: DistributorStatus) => void;
  onTierChange: (id: string, tier: DistributorTier) => void;
}) {
  const sc = STATUS_CFG[dist.status];
  const tc = TIER_CFG[dist.tier];
  const [showTierMenu, setShowTierMenu] = useState(false);

  const contractExpiring =
    dist.contractEnd &&
    new Date(dist.contractEnd) < new Date(Date.now() + 30 * 24 * 3600000);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white"
                style={{ background: "oklch(0.38 0.06 160)" }}
              >
                {dist.name[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2
                    className="font-bold text-gray-900 text-lg"
                    style={{ fontFamily: "DM Serif Display, serif" }}
                  >
                    {dist.name}
                  </h2>
                  <span className="text-xs text-gray-400 font-mono">
                    #{dist.id}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-sm text-gray-500">{dist.company}</span>
                  <span
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ color: sc.color, background: sc.bg }}
                  >
                    {sc.icon}
                    {sc.label}
                  </span>
                  <span
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ color: tc.color, background: tc.bg }}
                  >
                    {tc.icon}
                    {tc.label}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Contract expiry warning */}
            {contractExpiring && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <p className="text-xs text-amber-700 font-medium">
                  {new Date(dist.contractEnd!) < new Date()
                    ? "العقد منتهٍ — يرجى التجديد"
                    : `العقد سينتهي قريباً: ${new Date(dist.contractEnd!).toLocaleDateString("ar-SA")}`}
                </p>
              </div>
            )}

            {/* Contact Info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                {
                  icon: <MapPin className="w-4 h-4" />,
                  label: "المدينة",
                  value: `${dist.city}، ${dist.region}`,
                },
                {
                  icon: <Phone className="w-4 h-4" />,
                  label: "الهاتف",
                  value: dist.phone,
                },
                {
                  icon: <Mail className="w-4 h-4" />,
                  label: "البريد",
                  value: dist.email,
                },
                {
                  icon: <MessageSquare className="w-4 h-4" />,
                  label: "واتساب",
                  value: dist.whatsapp || dist.phone,
                },
                {
                  icon: <Hash className="w-4 h-4" />,
                  label: "السجل التجاري",
                  value: dist.commercialReg || "—",
                },
                {
                  icon: <Globe className="w-4 h-4" />,
                  label: "الموقع",
                  value: dist.website || "—",
                },
              ].map(c => (
                <div
                  key={c.label}
                  className="p-3 rounded-xl border border-gray-100 bg-gray-50"
                >
                  <div className="flex items-center gap-1.5 mb-1 text-gray-400">
                    {c.icon}
                    <span className="text-xs">{c.label}</span>
                  </div>
                  <div className="text-xs font-medium text-gray-700 truncate">
                    {c.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "إجمالي الطلبات",
                  value: dist.totalOrders,
                  color: "#3B82F6",
                  bg: "#EFF6FF",
                },
                {
                  label: "الإيرادات (ر.س)",
                  value:
                    dist.totalRevenue > 0
                      ? `${(dist.totalRevenue / 1000).toFixed(0)}K`
                      : "—",
                  color: "#10B981",
                  bg: "#ECFDF5",
                },
                {
                  label: "متوسط التقييم",
                  value: dist.avgRating > 0 ? `${dist.avgRating} ★` : "—",
                  color: "#F59E0B",
                  bg: "#FFFBEB",
                },
                {
                  label: "شكاوى مفتوحة",
                  value: dist.openComplaints,
                  color: dist.openComplaints > 0 ? "#EF4444" : "#10B981",
                  bg: dist.openComplaints > 0 ? "#FEF2F2" : "#ECFDF5",
                },
              ].map(s => (
                <div
                  key={s.label}
                  className="p-3 rounded-xl border border-gray-100"
                  style={{ background: s.bg }}
                >
                  <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                  <div
                    className="text-xl font-bold"
                    style={{
                      color: s.color,
                      fontFamily: "DM Serif Display, serif",
                    }}
                  >
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Financial & Contract */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-gray-100 bg-gray-50 space-y-2">
                <div className="text-xs font-semibold text-gray-600">
                  البيانات المالية
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">حد الائتمان</span>
                  <span className="font-medium">
                    {dist.creditLimit?.toLocaleString() || "—"} ر.س
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">نسبة الخصم</span>
                  <span className="font-medium">{dist.discountRate || 0}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">البنك</span>
                  <span className="font-medium">{dist.bankName || "—"}</span>
                </div>
              </div>
              <div className="p-3 rounded-xl border border-gray-100 bg-gray-50 space-y-2">
                <div className="text-xs font-semibold text-gray-600">
                  بيانات العقد
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">تاريخ الانضمام</span>
                  <span className="font-medium">{dist.joinDate}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">بداية العقد</span>
                  <span className="font-medium">
                    {dist.contractStart || "—"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">نهاية العقد</span>
                  <span
                    className={`font-medium ${contractExpiring ? "text-amber-600" : ""}`}
                  >
                    {dist.contractEnd || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {dist.notes && (
              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50">
                <div className="text-xs font-medium text-amber-700 mb-1">
                  ملاحظات
                </div>
                <p className="text-xs text-amber-800">{dist.notes}</p>
              </div>
            )}
            {dist.adminNotes && (
              <div className="p-3 rounded-xl border border-purple-200 bg-purple-50">
                <div className="flex items-center gap-1.5 mb-1">
                  <Lock className="w-3 h-3 text-purple-500" />
                  <span className="text-xs font-medium text-purple-700">
                    ملاحظات داخلية
                  </span>
                </div>
                <p className="text-xs text-purple-800">{dist.adminNotes}</p>
              </div>
            )}
          </div>

          {/* Actions Footer */}
          <div className="p-4 border-t border-gray-100 flex flex-wrap gap-2 justify-between items-center">
            {/* Tier Change */}
            <div className="relative">
              <Button
                variant="outline"
                className="gap-2 text-xs"
                onClick={() => setShowTierMenu(!showTierMenu)}
              >
                {tc.icon} تغيير المستوى <ChevronDown className="w-3.5 h-3.5" />
              </Button>
              {showTierMenu && (
                <div className="absolute bottom-full mb-2 start-0 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[160px] z-10">
                  {(
                    Object.entries(TIER_CFG) as [
                      DistributorTier,
                      (typeof TIER_CFG)[DistributorTier],
                    ][]
                  ).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => {
                        onTierChange(dist.id, key);
                        setShowTierMenu(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 ${dist.tier === key ? "font-bold" : ""}`}
                      style={{ color: cfg.color }}
                    >
                      {cfg.icon}
                      {cfg.label} ({cfg.discount})
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="gap-2 text-xs"
                onClick={onEdit}
              >
                <Edit2 className="w-3.5 h-3.5" /> تعديل البيانات
              </Button>
              {dist.status === "pending" && (
                <>
                  <Button
                    variant="outline"
                    className="gap-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => {
                      onStatusChange(dist.id, "rejected");
                      onClose();
                    }}
                  >
                    <XCircle className="w-3.5 h-3.5" /> رفض
                  </Button>
                  <Button
                    className="gap-2 text-white text-xs"
                    style={{ background: "#10B981" }}
                    onClick={() => {
                      onStatusChange(dist.id, "active");
                      onClose();
                    }}
                  >
                    <UserCheck className="w-3.5 h-3.5" /> قبول وتفعيل
                  </Button>
                </>
              )}
              {dist.status === "active" && (
                <Button
                  variant="outline"
                  className="gap-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => {
                    onStatusChange(dist.id, "suspended");
                    onClose();
                  }}
                >
                  <Ban className="w-3.5 h-3.5" /> إيقاف الحساب
                </Button>
              )}
              {dist.status === "suspended" && (
                <Button
                  className="gap-2 text-white text-xs"
                  style={{ background: "#10B981" }}
                  onClick={() => {
                    onStatusChange(dist.id, "active");
                    onClose();
                  }}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> إعادة تفعيل
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Set Password Modal ──────────────────────────────────────
function SetPasswordModal({
  distributorId,
  distributorName,
  onClose,
}: {
  distributorId: number;
  distributorName: string;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const passwordErr =
    password.length > 0 && password.length < 8
      ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
      : "";
  const confirmErr =
    confirm.length > 0 && confirm !== password ? "كلمة المرور غير متطابقة" : "";
  const isValid = password.length >= 8 && password === confirm;

  const mutation = trpc.distributorsAdmin.setPassword.useMutation({
    onSuccess: () => {
      toast.success("تم تعيين كلمة المرور بنجاح");
      onClose();
    },
    onError: error => {
      toast.error(error.message || "حدث خطأ أثناء تعيين كلمة المرور");
    },
  });

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                style={{ background: "oklch(0.38 0.06 160)" }}
              >
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2
                  className="font-bold text-gray-900"
                  style={{ fontFamily: "DM Serif Display, serif" }}
                >
                  تعيين كلمة المرور
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {distributorName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                كلمة المرور الجديدة <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="8 أحرف على الأقل"
                className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors ${
                  passwordErr ? "border-red-300 bg-red-50" : "border-gray-200"
                }`}
              />
              {passwordErr && (
                <p className="text-xs text-red-500 mt-1">{passwordErr}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                تأكيد كلمة المرور <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
                placeholder="أعِد إدخال كلمة المرور"
                className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors ${
                  confirmErr ? "border-red-300 bg-red-50" : "border-gray-200"
                }`}
              />
              {confirmErr && (
                <p className="text-xs text-red-500 mt-1">{confirmErr}</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!isValid || mutation.isPending}
                onClick={() => {
                  if (!isValid) return;
                  mutation.mutate({ id: distributorId, password });
                }}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "oklch(0.38 0.06 160)" }}
              >
                {mutation.isPending ? "جارٍ الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function AdminDistributors() {
  const [, navigate] = useLocation();
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<DistributorStatus | "all">(
    "all"
  );
  const [filterTier, setFilterTier] = useState<DistributorTier | "all">("all");
  const [selected, setSelected] = useState<Distributor | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Distributor | undefined>(
    undefined
  );
  const [setPasswordTarget, setSetPasswordTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // ── tRPC ────────────────────────────────────────────
  const { data: dbDistributors, isLoading } =
    trpc.distributorsAdmin.list.useQuery(undefined, {
      refetchInterval: 60_000,
    });
  const utils = trpc.useUtils();
  const invalidate = () => utils.distributorsAdmin.list.invalidate();

  const createMutation = trpc.distributorsAdmin.create.useMutation({
    onSuccess: invalidate,
  });
  const updateMutation = trpc.distributorsAdmin.update.useMutation({
    onSuccess: invalidate,
  });
  const updateStatusMutation = trpc.distributorsAdmin.updateStatus.useMutation({
    onSuccess: invalidate,
  });
  const updateTierMutation = trpc.distributorsAdmin.updateTier.useMutation({
    onSuccess: invalidate,
  });
  const deleteMutation = trpc.distributorsAdmin.delete.useMutation({
    onSuccess: invalidate,
  });
  const seedMutation = trpc.distributorsAdmin.seed.useMutation({
    onSuccess: () => {
      toast.success("تم تحميل بيانات الموزعين التجريبيين");
      invalidate();
    },
  });

  // مزامنة DB → state
  useEffect(() => {
    if (dbDistributors) {
      setDistributors(
        dbDistributors.map(d => ({ ...d, id: String(d.id) }) as Distributor)
      );
    }
  }, [dbDistributors]);

  const filtered = distributors.filter(d => {
    const matchSearch =
      d.name.includes(search) ||
      d.company.includes(search) ||
      d.city.includes(search) ||
      d.email.includes(search);
    const matchStatus = filterStatus === "all" || d.status === filterStatus;
    const matchTier = filterTier === "all" || d.tier === filterTier;
    return matchSearch && matchStatus && matchTier;
  });

  const stats = {
    total: distributors.length,
    active: distributors.filter(d => d.status === "active").length,
    pending: distributors.filter(d => d.status === "pending").length,
    suspended: distributors.filter(d => d.status === "suspended").length,
    revenue: distributors.reduce((s, d) => s + d.totalRevenue, 0),
  };

  const handleStatusChange = (id: string, status: DistributorStatus) => {
    const numId = parseInt(id);
    if (!isNaN(numId)) {
      updateStatusMutation.mutate({ id: numId, status });
    } else {
      setDistributors(prev =>
        prev.map(d => (d.id === id ? { ...d, status } : d))
      );
    }
    const msgs: Record<DistributorStatus, string> = {
      active: "تم تفعيل الموزع بنجاح",
      suspended: "تم إيقاف حساب الموزع",
      rejected: "تم رفض طلب الانضمام",
      pending: "تم تحديث الحالة",
    };
    toast.success(msgs[status]);
  };

  const handleTierChange = (id: string, tier: DistributorTier) => {
    const numId = parseInt(id);
    if (!isNaN(numId)) {
      updateTierMutation.mutate({ id: numId, tier });
    } else {
      setDistributors(prev =>
        prev.map(d => (d.id === id ? { ...d, tier } : d))
      );
    }
    toast.success(`تم تغيير مستوى الموزع إلى ${TIER_CFG[tier].label}`);
  };

  const handleSave = (d: Distributor) => {
    const numId = parseInt(d.id);
    const { id: _id, ...payload } = d;
    if (isNaN(numId)) {
      // موزع جديد
      createMutation.mutate(payload, {
        onSuccess: () => toast.success("تم إضافة الموزع بنجاح"),
      });
    } else {
      updateMutation.mutate(
        { id: numId, ...payload },
        { onSuccess: () => toast.success("تم تحديث بيانات الموزع بنجاح") }
      );
    }
  };

  const exportExcel = () => {
    const rows = filtered.map(d => ({
      "رقم الموزع": d.id,
      الاسم: d.name,
      الشركة: d.company,
      المدينة: d.city,
      المنطقة: d.region,
      الهاتف: d.phone,
      البريد: d.email,
      الحالة: STATUS_CFG[d.status].label,
      المستوى: TIER_CFG[d.tier].label,
      الطلبات: d.totalOrders,
      "الإيرادات (ر.س)": d.totalRevenue,
      التقييم: d.avgRating || "—",
      "الخصم (%)": d.discountRate || 0,
      "حد الائتمان": d.creditLimit || 0,
      "تاريخ الانضمام": d.joinDate,
      "نهاية العقد": d.contractEnd || "—",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Array(16).fill({ wch: 18 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الموزعون");
    XLSX.writeFile(
      wb,
      `موزعون-سنديان-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    toast.success(`تم تصدير ${rows.length} موزع بصيغة Excel`);
  };

  return (
    <AdminLayout
      title="إدارة الموزعين"
      subtitle="إضافة وتعديل وإدارة حسابات الموزعين"
    >
      <div className="space-y-5" dir="rtl">
        {isLoading && (
          <div className="flex items-center justify-center py-10 text-gray-400 gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>جارٍ تحميل بيانات الموزعين...</span>
          </div>
        )}
        {!isLoading && distributors.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Users className="w-12 h-12 text-gray-300" />
            <p className="text-gray-500">لا يوجد موزعون مسجلون</p>
            <Button
              variant="outline"
              className="gap-2 text-amber-700 border-amber-300"
              onClick={() => seedMutation.mutate()}
            >
              <Download className="w-4 h-4" /> تحميل البيانات التجريبية
            </Button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            {
              label: "إجمالي الموزعين",
              value: stats.total,
              color: "#6B7280",
              bg: "#F9FAFB",
              icon: <Users className="w-4 h-4" />,
            },
            {
              label: "نشطون",
              value: stats.active,
              color: "#10B981",
              bg: "#ECFDF5",
              icon: <CheckCircle2 className="w-4 h-4" />,
            },
            {
              label: "بانتظار الموافقة",
              value: stats.pending,
              color: "#F59E0B",
              bg: "#FFFBEB",
              icon: <Clock className="w-4 h-4" />,
            },
            {
              label: "موقوفون",
              value: stats.suspended,
              color: "#EF4444",
              bg: "#FEF2F2",
              icon: <Ban className="w-4 h-4" />,
            },
            {
              label: "إجمالي الإيرادات",
              value: `${(stats.revenue / 1000000).toFixed(1)}M ر.س`,
              color: "#3B82F6",
              bg: "#EFF6FF",
              icon: <TrendingUp className="w-4 h-4" />,
            },
          ].map(s => (
            <div
              key={s.label}
              className="bg-white rounded-xl p-4 border border-gray-100"
            >
              <div
                className="flex items-center gap-2 mb-2"
                style={{ color: s.color }}
              >
                {s.icon}
                <span className="text-xs font-medium">{s.label}</span>
              </div>
              <div
                className="text-2xl font-bold"
                style={{
                  color: s.color,
                  fontFamily: "DM Serif Display, serif",
                }}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Filters + Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 right-3" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="بحث بالاسم أو الشركة أو المدينة أو البريد..."
                className="w-full border border-gray-200 rounded-xl py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors pr-9 pl-3"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="gap-2 text-xs"
                onClick={exportExcel}
              >
                <Download className="w-4 h-4" /> تصدير Excel
              </Button>
              <Button
                className="gap-2 text-white text-sm"
                style={{ background: "oklch(0.38 0.06 160)" }}
                onClick={() => {
                  setEditTarget(undefined);
                  setShowForm(true);
                }}
              >
                <Plus className="w-4 h-4" /> إضافة موزع
              </Button>
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs text-gray-400 self-center">الحالة:</span>
            {(
              ["all", "active", "pending", "suspended", "rejected"] as const
            ).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
                style={
                  filterStatus === s
                    ? { background: "oklch(0.38 0.06 160)", color: "white" }
                    : { background: "#F3F4F6", color: "#6B7280" }
                }
              >
                {s === "all" ? "الكل" : STATUS_CFG[s].label}
                {s !== "all" && (
                  <span className="mr-1 opacity-70">
                    ({distributors.filter(d => d.status === s).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tier Filter */}
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs text-gray-400 self-center">المستوى:</span>
            {(["all", "bronze", "silver", "gold", "platinum"] as const).map(
              t => (
                <button
                  key={t}
                  onClick={() => setFilterTier(t)}
                  className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all border"
                  style={
                    filterTier === t
                      ? {
                          background:
                            t === "all" ? "#374151" : TIER_CFG[t].color,
                          color: "white",
                          borderColor:
                            t === "all" ? "#374151" : TIER_CFG[t].color,
                        }
                      : {
                          background: "white",
                          color: "#6B7280",
                          borderColor: "#E5E7EB",
                        }
                  }
                >
                  {t === "all" ? "الكل" : TIER_CFG[t].label}
                </button>
              )
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  style={{
                    background: "#F9FAFB",
                    borderBottom: "1px solid #F3F4F6",
                  }}
                >
                  {[
                    "الموزع",
                    "المدينة",
                    "المستوى",
                    "الحالة",
                    "الطلبات",
                    "الإيرادات",
                    "الخصم",
                    "التقييم",
                    "إجراء",
                  ].map(h => (
                    <th
                      key={h}
                      className="text-xs font-semibold text-gray-500 px-4 py-3 text-start whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((d, i) => {
                    const sc = STATUS_CFG[d.status];
                    const tc = TIER_CFG[d.tier];
                    const contractExpiring =
                      d.contractEnd &&
                      new Date(d.contractEnd) <
                        new Date(Date.now() + 30 * 24 * 3600000);
                    // يطابق مباشرةً سجل dbDistributors — الـ id الرقمي مضمون، لا parseInt
                    const dbRecord = dbDistributors?.find(
                      db => String(db.id) === d.id
                    );
                    return (
                      <motion.tr
                        key={d.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/admin/distributors/${d.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                              style={{ background: "oklch(0.38 0.06 160)" }}
                            >
                              {d.name[0]}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-semibold text-gray-800">
                                  {d.name}
                                </span>
                                {contractExpiring && (
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                )}
                              </div>
                              <div className="text-xs text-gray-400 truncate max-w-[160px]">
                                {d.company}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            {d.city}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium w-fit"
                            style={{ color: tc.color, background: tc.bg }}
                          >
                            {tc.icon}
                            {tc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium w-fit"
                            style={{ color: sc.color, background: sc.bg }}
                          >
                            {sc.icon}
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700">
                          {d.totalOrders}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700">
                          {d.totalRevenue > 0
                            ? `${(d.totalRevenue / 1000).toFixed(0)}K`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700">
                          {d.discountRate ? `${d.discountRate}%` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {d.avgRating > 0 ? (
                            <span className="flex items-center gap-1 text-sm font-medium text-amber-600">
                              <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                              {d.avgRating}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className="flex items-center gap-1"
                            onClick={e => e.stopPropagation()}
                          >
                            {d.status === "pending" && (
                              <>
                                <button
                                  onClick={() =>
                                    handleStatusChange(d.id, "active")
                                  }
                                  className="p-1.5 rounded-lg hover:bg-green-50 transition-colors"
                                  title="قبول"
                                >
                                  <UserCheck className="w-4 h-4 text-green-600" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleStatusChange(d.id, "rejected")
                                  }
                                  className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                  title="رفض"
                                >
                                  <UserX className="w-4 h-4 text-red-500" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => {
                                setEditTarget(d);
                                setShowForm(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                              title="تعديل"
                            >
                              <Edit2 className="w-4 h-4 text-blue-400" />
                            </button>
                            <button
                              onClick={() => setSelected(d)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                              title="عرض سريع"
                            >
                              <Eye className="w-4 h-4 text-gray-400" />
                            </button>
                            <Link href={`/admin/distributors/${d.id}`}>
                              <button
                                className="p-1.5 rounded-lg hover:bg-purple-50 transition-colors"
                                title="الملف الكامل"
                              >
                                <FileText className="w-4 h-4 text-purple-400" />
                              </button>
                            </Link>
                            {dbRecord && (
                              <button
                                onClick={() =>
                                  setSetPasswordTarget({
                                    id: dbRecord.id,
                                    name: d.name,
                                  })
                                }
                                className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                                title="تعيين كلمة المرور"
                              >
                                <Lock className="w-4 h-4 text-amber-500" />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">لا توجد نتائج</p>
              </div>
            )}
          </div>
          <div className="px-4 py-3 border-t border-gray-50 text-xs text-gray-400 flex justify-between">
            <span>
              يُعرض {filtered.length} من أصل {distributors.length} موزع
            </span>
            <span>آخر تحديث: {new Date().toLocaleDateString("ar-SA")}</span>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <DistributorDetailModal
          dist={selected}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEditTarget(selected);
            setSelected(null);
            setShowForm(true);
          }}
          onStatusChange={handleStatusChange}
          onTierChange={handleTierChange}
        />
      )}

      {/* Add / Edit Form Modal */}
      {showForm && (
        <DistributorFormModal
          initial={editTarget}
          onClose={() => {
            setShowForm(false);
            setEditTarget(undefined);
          }}
          onSave={handleSave}
        />
      )}

      {/* Set Password Modal — موزّعو DB فقط */}
      {setPasswordTarget && (
        <SetPasswordModal
          distributorId={setPasswordTarget.id}
          distributorName={setPasswordTarget.name}
          onClose={() => setSetPasswordTarget(null)}
        />
      )}
    </AdminLayout>
  );
}
