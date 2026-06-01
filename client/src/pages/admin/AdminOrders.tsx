// ============================================================
// AdminOrders - إدارة الطلبات الشاملة
// ثلاثة أنواع: موزعون + متجر إلكتروني + مشاريع
// سير عمل مختلف لكل نوع مع إحصائيات منفصلة
// ============================================================
import { useState } from "react";
import * as XLSX from "xlsx";
import KanbanBoard from "@/components/admin/KanbanBoard";
import {
  Package, ShoppingBag, Building2, Users, Search, Filter,
  ChevronDown, ChevronRight, Clock, CheckCircle2, XCircle,
  Truck, AlertCircle, Eye, Edit2, MessageSquare, FileText,
  CreditCard, Banknote, Phone, Mail, MapPin, Calendar,
  ArrowUpRight, TrendingUp, BarChart2, X, Check, Send,
  Layers, Star, Zap, RefreshCw, Download, ExternalLink, Wrench,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import AdminLayout from "@/components/admin/AdminLayout";
import CreateWorkOrderWizard, { type WizardPrefillData } from "@/components/admin/CreateWorkOrderWizard";

// ─── Types ────────────────────────────────────────────────────
type OrderChannel = "distributor" | "store" | "project";
type OrderStatus =
  | "pending"       // انتظار
  | "approved"      // موافق عليه
  | "in_production" // قيد الإنتاج
  | "ready"         // جاهز للشحن
  | "shipped"       // تم الشحن
  | "delivered"     // تم التسليم
  | "cancelled"     // ملغي
  | "quote_sent"    // تم إرسال العرض (مشاريع)
  | "payment_pending" // انتظار الدفع (متجر)
  | "payment_confirmed"; // تم تأكيد الدفع

interface OrderItem {
  productName: string;
  sku: string;
  size: string;
  color: string;
  qty: number;
  unitPrice: number;
}

interface Order {
  id: string;
  channel: OrderChannel;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  // Customer info
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerCity: string;
  // Distributor-specific
  distributorId?: string;
  distributorLevel?: string;
  // Store-specific
  paymentMethod?: "card" | "bank_transfer" | "cod";
  paymentStatus?: "pending" | "confirmed" | "failed";
  trackingNumber?: string;
  // Project-specific
  projectName?: string;
  projectType?: string;
  projectUnits?: number;
  quoteSentAt?: string;
  siteVisitRequired?: boolean;
  // Items
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  notes?: string;
  adminNotes?: string;
}

// ─── Status Config ─────────────────────────────────────────────
const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:           { label: "انتظار",          color: "#F59E0B", bg: "#FFFBEB", icon: <Clock className="w-3.5 h-3.5" /> },
  approved:          { label: "موافق عليه",       color: "#3B82F6", bg: "#EFF6FF", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  in_production:     { label: "قيد الإنتاج",      color: "#8B5CF6", bg: "#F5F3FF", icon: <Layers className="w-3.5 h-3.5" /> },
  ready:             { label: "جاهز للشحن",       color: "#06B6D4", bg: "#ECFEFF", icon: <Package className="w-3.5 h-3.5" /> },
  shipped:           { label: "تم الشحن",         color: "#6366F1", bg: "#EEF2FF", icon: <Truck className="w-3.5 h-3.5" /> },
  delivered:         { label: "تم التسليم",       color: "#10B981", bg: "#ECFDF5", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  cancelled:         { label: "ملغي",             color: "#EF4444", bg: "#FEF2F2", icon: <XCircle className="w-3.5 h-3.5" /> },
  quote_sent:        { label: "تم إرسال العرض",   color: "#D97706", bg: "#FFFBEB", icon: <FileText className="w-3.5 h-3.5" /> },
  payment_pending:   { label: "انتظار الدفع",     color: "#F59E0B", bg: "#FFFBEB", icon: <CreditCard className="w-3.5 h-3.5" /> },
  payment_confirmed: { label: "تم تأكيد الدفع",  color: "#10B981", bg: "#ECFDF5", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
};

const CHANNEL_CONFIG: Record<OrderChannel, { label: string; color: string; bg: string; icon: React.ReactNode; desc: string }> = {
  distributor: { label: "موزعون",        color: "oklch(0.38 0.06 160)", bg: "oklch(0.95 0.02 160)", icon: <Users className="w-4 h-4" />,       desc: "طلبات بوابة الموزعين B2B" },
  store:       { label: "متجر إلكتروني", color: "#3B82F6",              bg: "#EFF6FF",              icon: <ShoppingBag className="w-4 h-4" />, desc: "طلبات الأفراد والشركات" },
  project:     { label: "مشاريع",        color: "#8B5CF6",              bg: "#F5F3FF",              icon: <Building2 className="w-4 h-4" />,   desc: "طلبات المشاريع الكبيرة" },
};

// ─── Mock Data ─────────────────────────────────────────────────
const mockOrders: Order[] = [
  // Distributor orders
  {
    id: "ORD-D001", channel: "distributor", status: "pending",
    createdAt: "2026-04-21T08:30:00", updatedAt: "2026-04-21T08:30:00",
    customerName: "شركة الأفق للمقاولات", customerPhone: "0501234567",
    customerEmail: "orders@ufuq.sa", customerCity: "الرياض",
    distributorId: "DIST-012", distributorLevel: "ذهبي",
    items: [
      { productName: "باب خارجي فاخر", sku: "SND-EXT-001", size: "90×210", color: "جوزي داكن", qty: 12, unitPrice: 3600 },
      { productName: "باب داخلي عصري", sku: "SND-INT-001", size: "80×200", color: "أبيض", qty: 24, unitPrice: 1575 },
    ],
    subtotal: 81000, discount: 4050, shipping: 0, total: 76950,
    notes: "مشروع فيلا سكنية - الدفع خلال 30 يوم",
  },
  {
    id: "ORD-D002", channel: "distributor", status: "in_production",
    createdAt: "2026-04-19T10:00:00", updatedAt: "2026-04-20T14:00:00",
    customerName: "مؤسسة البناء الحديث", customerPhone: "0559876543",
    customerCity: "جدة",
    distributorId: "DIST-007", distributorLevel: "فضي",
    items: [
      { productName: "باب خشبي كلاسيكي", sku: "SND-CLS-001", size: "90×210", color: "ماهوجني", qty: 8, unitPrice: 2400 },
    ],
    subtotal: 19200, discount: 0, shipping: 350, total: 19550,
  },
  {
    id: "ORD-D003", channel: "distributor", status: "shipped",
    createdAt: "2026-04-15T09:00:00", updatedAt: "2026-04-20T11:00:00",
    customerName: "شركة الديار للتطوير", customerPhone: "0534567890",
    customerCity: "الدمام",
    distributorId: "DIST-003", distributorLevel: "بلاتيني",
    trackingNumber: "SA123456789",
    items: [
      { productName: "باب فاخر بإطار ذهبي", sku: "SND-LUX-001", size: "100×220", color: "أسود مع ذهبي", qty: 6, unitPrice: 6375 },
    ],
    subtotal: 38250, discount: 1912, shipping: 0, total: 36338,
  },
  {
    id: "ORD-D004", channel: "distributor", status: "delivered",
    createdAt: "2026-04-10T08:00:00", updatedAt: "2026-04-18T16:00:00",
    customerName: "مجموعة الإنشاء الوطني", customerPhone: "0512345678",
    customerCity: "مكة المكرمة",
    distributorId: "DIST-015", distributorLevel: "ذهبي",
    items: [
      { productName: "باب داخلي اقتصادي", sku: "SND-INT-002", size: "80×200", color: "أبيض", qty: 50, unitPrice: 1050 },
    ],
    subtotal: 52500, discount: 2625, shipping: 0, total: 49875,
  },
  // Store orders
  {
    id: "ORD-S001", channel: "store", status: "payment_pending",
    createdAt: "2026-04-21T11:15:00", updatedAt: "2026-04-21T11:15:00",
    customerName: "أحمد محمد الغامدي", customerPhone: "0567891234",
    customerEmail: "ahmed@gmail.com", customerCity: "الرياض",
    paymentMethod: "card", paymentStatus: "pending",
    items: [
      { productName: "باب خارجي فاخر", sku: "SND-EXT-001", size: "100×220", color: "بلوط فاتح", qty: 1, unitPrice: 4800 },
    ],
    subtotal: 4800, discount: 0, shipping: 250, total: 5050,
    notes: "يرجى التواصل قبل التسليم",
  },
  {
    id: "ORD-S002", channel: "store", status: "payment_confirmed",
    createdAt: "2026-04-20T14:30:00", updatedAt: "2026-04-20T15:00:00",
    customerName: "سارة عبدالله الشمري", customerPhone: "0598765432",
    customerEmail: "sara@outlook.com", customerCity: "جدة",
    paymentMethod: "bank_transfer", paymentStatus: "confirmed",
    items: [
      { productName: "باب داخلي عصري", sku: "SND-INT-001", size: "80×200", color: "رمادي", qty: 3, unitPrice: 2100 },
    ],
    subtotal: 6300, discount: 315, shipping: 200, total: 6185,
  },
  {
    id: "ORD-S003", channel: "store", status: "shipped",
    createdAt: "2026-04-17T09:00:00", updatedAt: "2026-04-19T12:00:00",
    customerName: "محمد علي الزهراني", customerPhone: "0512398765",
    customerCity: "الطائف",
    paymentMethod: "cod", paymentStatus: "pending",
    trackingNumber: "SA987654321",
    items: [
      { productName: "باب خشبي كلاسيكي", sku: "SND-CLS-001", size: "90×210", color: "جوزي", qty: 2, unitPrice: 3200 },
    ],
    subtotal: 6400, discount: 0, shipping: 300, total: 6700,
  },
  {
    id: "ORD-S004", channel: "store", status: "delivered",
    createdAt: "2026-04-12T10:00:00", updatedAt: "2026-04-16T14:00:00",
    customerName: "فهد سعد القحطاني", customerPhone: "0534512345",
    customerCity: "أبها",
    paymentMethod: "card", paymentStatus: "confirmed",
    items: [
      { productName: "باب فاخر بإطار ذهبي", sku: "SND-LUX-001", size: "100×220", color: "أبيض مع ذهبي", qty: 1, unitPrice: 8500 },
    ],
    subtotal: 8500, discount: 0, shipping: 350, total: 8850,
  },
  // Project orders
  {
    id: "ORD-P001", channel: "project", status: "pending",
    createdAt: "2026-04-21T09:00:00", updatedAt: "2026-04-21T09:00:00",
    customerName: "شركة الإعمار السعودية", customerPhone: "0112345678",
    customerEmail: "projects@imarar.sa", customerCity: "الرياض",
    projectName: "مجمع سكني الياسمين", projectType: "سكني",
    projectUnits: 120, siteVisitRequired: true,
    items: [
      { productName: "باب خارجي فاخر", sku: "SND-EXT-001", size: "100×220", color: "جوزي داكن", qty: 120, unitPrice: 0 },
      { productName: "باب داخلي عصري", sku: "SND-INT-001", size: "80×200", color: "أبيض", qty: 480, unitPrice: 0 },
    ],
    subtotal: 0, discount: 0, shipping: 0, total: 0,
    notes: "نحتاج عرض سعر شامل مع جدول التسليم",
  },
  {
    id: "ORD-P002", channel: "project", status: "quote_sent",
    createdAt: "2026-04-18T11:00:00", updatedAt: "2026-04-20T10:00:00",
    customerName: "مجموعة الفندقية الخليج", customerPhone: "0113456789",
    customerEmail: "procurement@gulf-hotels.sa", customerCity: "جدة",
    projectName: "فندق الكورنيش الجديد", projectType: "فندقي",
    projectUnits: 200, quoteSentAt: "2026-04-20T10:00:00",
    siteVisitRequired: false,
    items: [
      { productName: "باب فاخر بإطار ذهبي", sku: "SND-LUX-001", size: "100×220", color: "أسود مع ذهبي", qty: 200, unitPrice: 5800 },
    ],
    subtotal: 1160000, discount: 116000, shipping: 0, total: 1044000,
    notes: "تسليم على دفعات - 50 باب شهرياً",
  },
  {
    id: "ORD-P003", channel: "project", status: "in_production",
    createdAt: "2026-04-05T08:00:00", updatedAt: "2026-04-19T09:00:00",
    customerName: "شركة التطوير العمراني", customerPhone: "0114567890",
    customerCity: "الدمام",
    projectName: "أبراج المنامة السكنية", projectType: "سكني",
    projectUnits: 80,
    items: [
      { productName: "باب داخلي اقتصادي", sku: "SND-INT-002", size: "80×200", color: "أبيض", qty: 320, unitPrice: 980 },
    ],
    subtotal: 313600, discount: 31360, shipping: 0, total: 282240,
  },
];

// ─── Workflow Steps per channel ────────────────────────────────
const WORKFLOW: Record<OrderChannel, { from: OrderStatus; to: OrderStatus; label: string; color: string }[]> = {
  distributor: [
    { from: "pending",       to: "approved",      label: "موافقة",         color: "#3B82F6" },
    { from: "approved",      to: "in_production", label: "بدء الإنتاج",    color: "#8B5CF6" },
    { from: "in_production", to: "ready",         label: "جاهز للشحن",    color: "#06B6D4" },
    { from: "ready",         to: "shipped",       label: "تم الشحن",       color: "#6366F1" },
    { from: "shipped",       to: "delivered",     label: "تم التسليم",     color: "#10B981" },
  ],
  store: [
    { from: "payment_pending",   to: "payment_confirmed", label: "تأكيد الدفع",  color: "#10B981" },
    { from: "payment_confirmed", to: "in_production",     label: "بدء الإنتاج",  color: "#8B5CF6" },
    { from: "in_production",     to: "ready",             label: "جاهز للشحن",  color: "#06B6D4" },
    { from: "ready",             to: "shipped",           label: "تم الشحن",     color: "#6366F1" },
    { from: "shipped",           to: "delivered",         label: "تم التسليم",   color: "#10B981" },
  ],
  project: [
    { from: "pending",       to: "quote_sent",    label: "إرسال العرض",   color: "#D97706" },
    { from: "quote_sent",    to: "approved",      label: "قبول العرض",    color: "#3B82F6" },
    { from: "approved",      to: "in_production", label: "بدء الإنتاج",   color: "#8B5CF6" },
    { from: "in_production", to: "ready",         label: "جاهز للشحن",   color: "#06B6D4" },
    { from: "ready",         to: "shipped",       label: "تم الشحن",      color: "#6366F1" },
    { from: "shipped",       to: "delivered",     label: "تم التسليم",    color: "#10B981" },
  ],
};

// ─── WhatsApp Message Templates ──────────────────────────────
const WA_TEMPLATES: Partial<Record<OrderStatus, (order: Order) => string>> = {
  approved:          (o) => `مرحباً ${o.customerName}،\n\nيسعدنا إبلاغكم بأن طلبكم رقم *${o.id}* قد تمت الموافقة عليه وسيبدأ الإنتاج قريباً.\n\nشكراً لثقتكم بسنديان للأبواب الخشبية 🌿`,
  in_production:     (o) => `مرحباً ${o.customerName}،\n\nطلبكم رقم *${o.id}* دخل مرحلة الإنتاج الآن.\nسنُبلغكم فور الانتهاء وجاهزيته للشحن.\n\nسنديان للأبواب الخشبية 🌿`,
  ready:             (o) => `مرحباً ${o.customerName}،\n\nطلبكم رقم *${o.id}* جاهز للشحن!\nسيتم تسليمه لشركة الشحن خلال 24 ساعة.\n\nسنديان للأبواب الخشبية 🌿`,
  shipped:           (o) => `مرحباً ${o.customerName}،\n\nتم شحن طلبكم رقم *${o.id}* ✅${o.trackingNumber ? `\nرقم التتبع: *${o.trackingNumber}*` : ""}\n\nيمكنكم متابعة الشحنة عبر موقع شركة الشحن.\n\nسنديان للأبواب الخشبية 🌿`,
  delivered:         (o) => `مرحباً ${o.customerName}،\n\nنأمل أن يكون طلبكم رقم *${o.id}* قد وصل بسلامة 🎉\nنسعد بتقييمكم لتجربتكم معنا.\n\nشكراً لاختياركم سنديان للأبواب الخشبية 🌿`,
  cancelled:         (o) => `مرحباً ${o.customerName}،\n\nنأسف لإبلاغكم بأنه تم إلغاء طلبكم رقم *${o.id}*.\nللاستفسار يرجى التواصل معنا مباشرة.\n\nسنديان للأبواب الخشبية 🌿`,
  quote_sent:        (o) => `مرحباً ${o.customerName}،\n\nتم إرسال عرض السعر لمشروع *${o.projectName || o.id}* إلى بريدكم الإلكتروني.\nيُرجى مراجعته والتواصل معنا لأي استفسار.\n\nسنديان للأبواب الخشبية 🌿`,
  payment_confirmed: (o) => `مرحباً ${o.customerName}،\n\nتم تأكيد دفع طلبكم رقم *${o.id}* بنجاح ✅\nسيبدأ الإنتاج قريباً وسنُبلغكم بالتحديثات.\n\nسنديان للأبواب الخشبية 🌿`,
};

// ─── Order Detail Modal ────────────────────────────────────────
function OrderDetailModal({ order, onClose, onUpdateStatus, onConvertToWO }: {
  order: Order;
  onClose: () => void;
  onUpdateStatus: (id: string, status: OrderStatus, note?: string) => void;
  onConvertToWO?: (order: Order) => void;
}) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [adminNote, setAdminNote] = useState(order.adminNotes || "");
  const [trackingInput, setTrackingInput] = useState(order.trackingNumber || "");
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [waMessage, setWaMessage] = useState("");
  const [waPhone, setWaPhone] = useState(order.customerPhone);
  const ch = CHANNEL_CONFIG[order.channel];
  const st = STATUS_CONFIG[order.status];
  const workflow = WORKFLOW[order.channel];
  const nextStep = workflow.find((w) => w.from === order.status);

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
          dir={dir}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: ch.bg, color: ch.color }}>
                {ch.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-gray-900" style={{ fontFamily: "DM Serif Display, serif" }}>{order.id}</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: ch.bg, color: ch.color }}>{ch.label}</span>
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: st.bg, color: st.color }}>
                    {st.icon}{st.label}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(order.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Customer / Project Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gray-50 space-y-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  {order.channel === "project" ? "بيانات المشروع" : "بيانات العميل"}
                </h4>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="font-semibold">{order.customerName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span dir="ltr">{order.customerPhone}</span>
                </div>
                {order.customerEmail && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span dir="ltr" className="truncate">{order.customerEmail}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{order.customerCity}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 space-y-2">
                {order.channel === "distributor" && (
                  <>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">بيانات الموزع</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">رقم الموزع:</span>
                      <span className="font-mono font-semibold text-gray-700">{order.distributorId}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">المستوى:</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "#FFFBEB", color: "#92400E" }}>
                        ⭐ {order.distributorLevel}
                      </span>
                    </div>
                  </>
                )}
                {order.channel === "store" && (
                  <>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">بيانات الدفع</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">طريقة الدفع:</span>
                      <span className="font-semibold text-gray-700">
                        {order.paymentMethod === "card" ? "بطاقة ائتمان" : order.paymentMethod === "bank_transfer" ? "تحويل بنكي" : "الدفع عند الاستلام"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">حالة الدفع:</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={order.paymentStatus === "confirmed" ? { background: "#ECFDF5", color: "#10B981" } : { background: "#FFFBEB", color: "#F59E0B" }}>
                        {order.paymentStatus === "confirmed" ? "✓ مؤكد" : "⏳ انتظار"}
                      </span>
                    </div>
                    {order.trackingNumber && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">رقم التتبع:</span>
                        <span className="font-mono font-semibold text-blue-600">{order.trackingNumber}</span>
                      </div>
                    )}
                  </>
                )}
                {order.channel === "project" && (
                  <>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">تفاصيل المشروع</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">اسم المشروع:</span>
                      <span className="font-semibold text-gray-700">{order.projectName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">النوع:</span>
                      <span className="font-semibold text-gray-700">{order.projectType}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">عدد الوحدات:</span>
                      <span className="font-bold text-purple-600">{order.projectUnits?.toLocaleString()} وحدة</span>
                    </div>
                    {order.siteVisitRequired && (
                      <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg w-fit" style={{ background: "#FEF3C7", color: "#92400E" }}>
                        <AlertCircle className="w-3.5 h-3.5" />
                        يتطلب زيارة ميدانية
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Items */}
            <div>
              <h4 className="text-sm font-bold text-gray-700 mb-2">المنتجات المطلوبة</h4>
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500">
                      <th className="text-start p-3 font-semibold">المنتج</th>
                      <th className="text-center p-3 font-semibold">المقاس</th>
                      <th className="text-center p-3 font-semibold">اللون</th>
                      <th className="text-center p-3 font-semibold">الكمية</th>
                      <th className="text-end p-3 font-semibold">السعر</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, i) => (
                      <tr key={i} className="border-t border-gray-50">
                        <td className="p-3">
                          <div className="font-semibold text-gray-800">{item.productName}</div>
                          <div className="text-xs text-gray-400 font-mono">{item.sku}</div>
                        </td>
                        <td className="p-3 text-center text-gray-600">{item.size}</td>
                        <td className="p-3 text-center text-gray-600">{item.color}</td>
                        <td className="p-3 text-center font-bold text-gray-800">{item.qty}</td>
                        <td className="p-3 text-end font-semibold text-gray-800">
                          {item.unitPrice > 0 ? `${(item.unitPrice * item.qty).toLocaleString()} ر.س` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            {order.total > 0 && (
              <div className="p-4 rounded-xl bg-gray-50 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>المجموع الفرعي</span>
                  <span>{order.subtotal.toLocaleString()} ر.س</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>الخصم</span>
                    <span>- {order.discount.toLocaleString()} ر.س</span>
                  </div>
                )}
                {order.shipping > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>الشحن</span>
                    <span>{order.shipping.toLocaleString()} ر.س</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2">
                  <span>الإجمالي</span>
                  <span className="text-lg" style={{ color: "oklch(0.38 0.06 160)" }}>{order.total.toLocaleString()} ر.س</span>
                </div>
              </div>
            )}

            {/* Notes */}
            {order.notes && (
              <div className="p-3 rounded-xl border border-amber-100 bg-amber-50">
                <p className="text-xs font-semibold text-amber-700 mb-1">ملاحظة العميل</p>
                <p className="text-sm text-amber-800">{order.notes}</p>
              </div>
            )}

            {/* Tracking Number (for shipping) */}
            {(order.status === "ready" || order.status === "shipped") && (
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">رقم تتبع الشحنة</label>
                <div className="flex gap-2">
                  <input value={trackingInput} onChange={(e) => setTrackingInput(e.target.value)}
                    placeholder="SA123456789" dir="ltr"
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm font-mono focus:outline-none focus:border-green-500" />
                  <Button variant="outline" size="sm" onClick={() => toast.success("تم حفظ رقم التتبع")}>
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Admin Notes */}
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">ملاحظات داخلية</label>
              <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)}
                placeholder="ملاحظات للفريق الداخلي فقط..." rows={2} className="text-sm resize-none" />
            </div>

            {/* WhatsApp Notification */}
            {nextStep && order.status !== "delivered" && order.status !== "cancelled" && (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#25D36620" }}>
                {/* Header toggle */}
                <button
                  className="w-full flex items-center justify-between p-3 text-start transition-colors hover:bg-green-50"
                  style={{ background: sendWhatsApp ? "#F0FDF4" : "#F9FAFB" }}
                  onClick={() => {
                    if (!sendWhatsApp && !waMessage) {
                      const tmpl = WA_TEMPLATES[nextStep.to];
                      if (tmpl) setWaMessage(tmpl(order));
                    }
                    setSendWhatsApp((v) => !v);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: sendWhatsApp ? "#25D366" : "#E5E7EB" }}>
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" style={{ color: sendWhatsApp ? "white" : "#9CA3AF" }}>
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.852L0 24l6.335-1.508A11.933 11.933 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.374l-.36-.213-3.724.887.902-3.626-.234-.373A9.818 9.818 0 1112 21.818z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold" style={{ color: sendWhatsApp ? "#15803D" : "#6B7280" }}>إشعار واتساب للعميل</p>
                      <p className="text-xs" style={{ color: sendWhatsApp ? "#16A34A" : "#9CA3AF" }}>
                        {sendWhatsApp ? "سيُرسَل عند تغيير الحالة" : "انقر لتفعيل الإشعار"}
                      </p>
                    </div>
                  </div>
                  <div className="w-9 h-5 rounded-full transition-colors flex items-center px-0.5"
                    style={{ background: sendWhatsApp ? "#25D366" : "#D1D5DB", justifyContent: sendWhatsApp ? "flex-end" : "flex-start" }}>
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                  </div>
                </button>

                {/* Message editor */}
                {sendWhatsApp && (
                  <div className="p-3 space-y-3 border-t" style={{ borderColor: "#25D36620" }}>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1.5 block">رقم الواتساب</label>
                      <div className="flex gap-2">
                        <input
                          value={waPhone}
                          onChange={(e) => setWaPhone(e.target.value)}
                          dir="ltr"
                          placeholder="05xxxxxxxx"
                          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-green-400"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-gray-600">نص الرسالة</label>
                        <button
                          className="text-xs text-green-600 hover:text-green-700 transition-colors"
                          onClick={() => {
                            const tmpl = WA_TEMPLATES[nextStep.to];
                            if (tmpl) setWaMessage(tmpl(order));
                          }}
                        >
                          ↺ استعادة النص الافتراضي
                        </button>
                      </div>
                      <Textarea
                        value={waMessage || (() => { const t = WA_TEMPLATES[nextStep.to]; return t ? t(order) : ""; })()}
                        onChange={(e) => setWaMessage(e.target.value)}
                        rows={4}
                        className="text-sm resize-none font-sans"
                        placeholder="اكتب رسالة واتساب للعميل..."
                      />
                    </div>
                    <a
                      href={`https://wa.me/966${(waPhone || order.customerPhone).replace(/^0/, "")}?text=${encodeURIComponent(waMessage || (WA_TEMPLATES[nextStep.to]?.(order) ?? ""))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ background: "#25D366" }}
                    >
                      <ExternalLink className="w-4 h-4" />
                      فتح واتساب وإرسال الرسالة
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Next Workflow Action */}
            {nextStep && order.status !== "delivered" && order.status !== "cancelled" && (
              <div className="p-4 rounded-xl border-2 border-dashed" style={{ borderColor: nextStep.color + "40", background: nextStep.color + "08" }}>
                <p className="text-xs font-semibold mb-3" style={{ color: nextStep.color }}>الإجراء التالي في سير العمل</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">
                      {STATUS_CONFIG[nextStep.from].label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-bold" style={{ color: nextStep.color }}>
                      {STATUS_CONFIG[nextStep.to].label}
                    </span>
                  </div>
                  <Button
                    onClick={() => { onUpdateStatus(order.id, nextStep.to, adminNote); onClose(); }}
                    className="gap-2 text-white text-sm"
                    style={{ background: nextStep.color }}
                  >
                    <Zap className="w-4 h-4" />
                    {nextStep.label}
                  </Button>
                </div>
              </div>
            )}

            {/* Convert to Work Order */}
            {(order.channel === "distributor" || order.channel === "project") &&
             order.status !== "cancelled" && onConvertToWO && (
              <div className="p-4 rounded-xl border-2 border-dashed" style={{ borderColor: "oklch(0.38 0.06 160)", background: "oklch(0.97 0.02 160)" }}>
                <p className="text-xs font-bold mb-2" style={{ color: "oklch(0.38 0.06 160)" }}>تحويل إلى أمر تشغيل</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">سيتم نقل بيانات الطلب تلقائياً إلى نموذج إنشاء أمر التشغيل</p>
                  <Button
                    size="sm"
                    className="gap-2 text-white flex-shrink-0"
                    style={{ background: "oklch(0.38 0.06 160)" }}
                    onClick={() => { onConvertToWO(order); onClose(); }}
                  >
                    <Wrench className="w-4 h-4" />
                    تحويل إلى أمر تشغيل
                  </Button>
                </div>
              </div>
            )}

            {/* Cancel */}
            {order.status !== "delivered" && order.status !== "cancelled" && (
              <button
                onClick={() => { onUpdateStatus(order.id, "cancelled"); onClose(); toast.error("تم إلغاء الطلب"); }}
                className="text-xs text-red-400 hover:text-red-600 transition-colors flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                إلغاء الطلب
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Order Card ────────────────────────────────────────────────
function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const ch = CHANNEL_CONFIG[order.channel];
  const st = STATUS_CONFIG[order.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: ch.bg, color: ch.color }}>
            {ch.icon}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-gray-800 font-mono">{order.id}</span>
              <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: ch.bg, color: ch.color }}>{ch.label}</span>
            </div>
            <p className="text-xs text-gray-400">
              {new Date(order.createdAt).toLocaleDateString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium flex-shrink-0" style={{ background: st.bg, color: st.color }}>
          {st.icon}{st.label}
        </span>
      </div>

      <div className="mb-3">
        <p className="text-sm font-semibold text-gray-800">{order.customerName}</p>
        {order.channel === "project" && order.projectName && (
          <p className="text-xs text-purple-600 font-medium">{order.projectName}</p>
        )}
        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
          <MapPin className="w-3 h-3" />{order.customerCity}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {order.items.length} {order.items.length === 1 ? "منتج" : "منتجات"} ·{" "}
          {order.items.reduce((s, i) => s + i.qty, 0)} قطعة
        </div>
        <div className="flex items-center gap-2">
          {order.total > 0 ? (
            <span className="text-sm font-bold" style={{ color: "oklch(0.38 0.06 160)" }}>
              {order.total.toLocaleString()} ر.س
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#F5F3FF", color: "#8B5CF6" }}>
              يحتاج تسعير
            </span>
          )}
          <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────
export default function AdminOrders() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [activeChannel, setActiveChannel] = useState<OrderChannel | "all">("all");
  const [activeStatus, setActiveStatus] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [wizardPrefill, setWizardPrefill] = useState<WizardPrefillData | null>(null);

  // تحويل طلب إلى بيانات مسبقة للـ Wizard
  function convertOrderToWizard(order: Order) {
    const prefill: WizardPrefillData = {
      poNumber: order.id,
      distributorName: order.customerName,
      distributorPhone: order.customerPhone,
      notes: order.notes || "",
      priority: order.distributorLevel === "بلاتيني" ? "vip" : order.distributorLevel === "ذهبي" ? "urgent" : "normal",
      orderType: order.items.some(i => i.sku.includes("LUX") || i.sku.includes("CLS")) ? "custom" : "standard",
      doors: order.items.map((item, idx) => {
        // تحليل المقاس من النص (e.g. "90×210")
        const sizeParts = item.size?.split("×") ?? [];
        const width  = sizeParts[0] ? parseInt(sizeParts[0]) : 90;
        const height = sizeParts[1] ? parseInt(sizeParts[1]) : 210;
        return {
          code: `${order.id}-D${String(idx + 1).padStart(3, "0")}`,
          model: item.productName.includes("فاخر") ? "Elite 300" :
                 item.productName.includes("كلاسيكي") ? "Classic 100" :
                 item.productName.includes("عصري") ? "Modern 200" : "Modern 200",
          width,
          height,
          direction: "right" as const,
          doorColor: item.color || "White",
          frameColor: item.color || "White",
          quantity: item.qty,
        };
      }),
    };
    setWizardPrefill(prefill);
    toast.success(`جاري تحويل طلب ${order.id} إلى أمر تشغيل...`);
  }

  // Stats
  const stats = {
    all:         { total: orders.length,                                          revenue: orders.reduce((s, o) => s + o.total, 0),                                                  pending: orders.filter((o) => ["pending","payment_pending"].includes(o.status)).length },
    distributor: { total: orders.filter((o) => o.channel === "distributor").length, revenue: orders.filter((o) => o.channel === "distributor").reduce((s, o) => s + o.total, 0), pending: orders.filter((o) => o.channel === "distributor" && o.status === "pending").length },
    store:       { total: orders.filter((o) => o.channel === "store").length,       revenue: orders.filter((o) => o.channel === "store").reduce((s, o) => s + o.total, 0),       pending: orders.filter((o) => o.channel === "store" && o.status === "payment_pending").length },
    project:     { total: orders.filter((o) => o.channel === "project").length,     revenue: orders.filter((o) => o.channel === "project").reduce((s, o) => s + o.total, 0),     pending: orders.filter((o) => o.channel === "project" && ["pending","quote_sent"].includes(o.status)).length },
  };

  const filtered = orders.filter((o) => {
    const matchChannel = activeChannel === "all" || o.channel === activeChannel;
    const matchStatus  = activeStatus === "all"  || o.status === activeStatus;
    const matchSearch  = !search || o.id.includes(search) || o.customerName.includes(search) || (o.projectName || "").includes(search);
    return matchChannel && matchStatus && matchSearch;
  });

  const handleUpdateStatus = (id: string, status: OrderStatus, note?: string) => {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status, adminNotes: note || o.adminNotes, updatedAt: new Date().toISOString() } : o));
    toast.success(`تم تحديث حالة الطلب إلى: ${STATUS_CONFIG[status].label}`);
  };

  const exportToExcel = () => {
    const channelLabels: Record<string, string> = { distributor: "موزع", store: "متجر", project: "مشروع" };
    const rows = filtered.map((o) => ({
      "رقم الطلب":         o.id,
      "القناة":             channelLabels[o.channel] || o.channel,
      "العميل / الشركة":   o.customerName,
      "رقم الجوال":       o.customerPhone || "—",
      "البريد الإلكتروني":   o.customerEmail  || "—",
      "المدينة":             o.customerCity   || "—",
      "اسم المشروع":       o.projectName    || "—",
      "الحالة":             STATUS_CONFIG[o.status]?.label || o.status,
      "عدد المنتجات":      o.items.length,
      "المجموع الفرعي (ر.س)":  o.subtotal,
      "الخصم (ر.س)":         o.discount,
      "الشحن (ر.س)":         o.shipping,
      "الإجمالي (ر.س)":       o.total,
      "طريقة الدفع":       o.paymentMethod  || "—",
      "رقم التتبع":        o.trackingNumber || "—",
      "تاريخ الطلب":        new Date(o.createdAt).toLocaleDateString("ar-SA"),
      "آخر تحديث":        new Date(o.updatedAt).toLocaleDateString("ar-SA"),
      "ملاحظات":           o.notes          || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    // Set column widths
    ws["!cols"] = [
      { wch: 14 }, { wch: 10 }, { wch: 22 }, { wch: 14 }, { wch: 24 },
      { wch: 12 }, { wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 16 },
      { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 30 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الطلبات");

    const channelName = activeChannel === "all" ? "جميع" : channelLabels[activeChannel];
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `طلبات-سنديان-${channelName}-${dateStr}.xlsx`);
    toast.success(`تم تصدير ${rows.length} طلب بصيغة Excel بنجاح`);
  };

  // Status filters relevant to current channel
  const relevantStatuses: (OrderStatus | "all")[] = ["all", ...Array.from(new Set(
    (activeChannel === "all" ? orders : orders.filter((o) => o.channel === activeChannel)).map((o) => o.status)
  ))];

  return (
    <AdminLayout title="إدارة الطلبات" subtitle="جميع طلبات الموزعين والمتجر الإلكتروني والمشاريع">
      <div className="space-y-5" dir={dir}>

        {/* Channel Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { key: "all", label: "جميع الطلبات", icon: <BarChart2 className="w-4 h-4" />, color: "#374151", bg: "#F3F4F6" },
            ...Object.entries(CHANNEL_CONFIG).map(([k, v]) => ({ key: k, label: v.label, icon: v.icon, color: v.color, bg: v.bg })),
          ] as { key: string; label: string; icon: React.ReactNode; color: string; bg: string }[]).map((tab) => {
            const s = stats[tab.key as keyof typeof stats];
            const isActive = activeChannel === tab.key;
            return (
              <button key={tab.key} onClick={() => { setActiveChannel(tab.key as any); setActiveStatus("all"); }}
                className="flex flex-col p-4 rounded-2xl border-2 text-start transition-all"
                style={isActive ? { borderColor: tab.color, background: tab.bg } : { borderColor: "#E5E7EB", background: "white" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isActive ? tab.color : "#F3F4F6", color: isActive ? "white" : "#9CA3AF" }}>
                    {tab.icon}
                  </div>
                  {s.pending > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-bold bg-red-100 text-red-600 animate-pulse">
                      {s.pending}
                    </span>
                  )}
                </div>
                <div className="text-xl font-bold" style={{ color: isActive ? tab.color : "#374151", fontFamily: "DM Serif Display, serif" }}>{s.total}</div>
                <div className="text-xs font-medium mt-0.5" style={{ color: isActive ? tab.color : "#6B7280" }}>{tab.label}</div>
                {s.revenue > 0 && (
                  <div className="text-xs mt-1" style={{ color: isActive ? tab.color + "CC" : "#9CA3AF" }}>
                    {(s.revenue / 1000).toFixed(0)}K ر.س
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Search + Status Filter */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" style={{ [isRtl ? "right" : "left"]: "12px" }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث برقم الطلب أو اسم العميل أو المشروع..."
                className="w-full border border-gray-200 rounded-xl py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors"
                style={{ [isRtl ? "paddingRight" : "paddingLeft"]: "36px", [isRtl ? "paddingLeft" : "paddingRight"]: "12px" }} />
            </div>
            <Button variant="outline" className="gap-2 text-xs" onClick={exportToExcel}>
              <Download className="w-4 h-4" />
              تصدير Excel ({filtered.length})
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {relevantStatuses.map((s) => {
              const isActive = activeStatus === s;
              const cfg = s === "all" ? null : STATUS_CONFIG[s];
              return (
                <button key={s} onClick={() => setActiveStatus(s)}
                  className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all border"
                  style={isActive
                    ? { background: cfg?.color || "#374151", color: "white", borderColor: cfg?.color || "#374151" }
                    : { background: "#F9FAFB", color: "#6B7280", borderColor: "#E5E7EB" }}>
                  {s === "all" ? "الكل" : cfg?.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* View Mode Toggle + Channel Label */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            {activeChannel !== "all" && (
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full" style={{ background: CHANNEL_CONFIG[activeChannel as OrderChannel].color }} />
                <span className="text-sm font-semibold text-gray-700">
                  {CHANNEL_CONFIG[activeChannel as OrderChannel].label} — {CHANNEL_CONFIG[activeChannel as OrderChannel].desc}
                </span>
                <span className="text-xs text-gray-400">({filtered.length} طلب)</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === "list" ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"
              }`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              قائمة
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === "kanban" ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"
              }`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              كانبان
            </button>
          </div>
        </div>

        {/* Kanban View */}
        {viewMode === "kanban" && (
          <KanbanBoard
            orders={filtered as any}
            onUpdateStatus={handleUpdateStatus}
            onCardClick={(order) => setSelectedOrder(order as any)}
            activeChannel={activeChannel}
          />
        )}

        {/* List View */}
        {viewMode === "list" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((order) => (
                <OrderCard key={order.id} order={order} onClick={() => setSelectedOrder(order)} />
              ))}
            </AnimatePresence>
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-16 text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">لا توجد طلبات</p>
                <p className="text-sm mt-1">جرّب تغيير الفلتر أو البحث</p>
              </div>
            )}
          </div>
        )}

      </div>

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={handleUpdateStatus}
          onConvertToWO={convertOrderToWizard}
        />
      )}

      {/* ─── Wizard إنشاء أمر تشغيل من طلب موزع ─── */}
      <AnimatePresence>
        {wizardPrefill !== null && (
          <CreateWorkOrderWizard
            initialData={wizardPrefill}
            onClose={() => setWizardPrefill(null)}
            onCreated={(wo) => {
              setWizardPrefill(null);
              toast.success(`تم إنشاء أمر التشغيل ${wo.woNumber} بنجاح`);
            }}
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
