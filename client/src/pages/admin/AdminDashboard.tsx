// ============================================================
// AdminDashboard - لوحة التحكم مع أتمتة سير العمل
// Workflow Automation: Approval Queue + Auto-Notifications + Production Pipeline
// ============================================================
import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingBag,
  AlertCircle,
  Package,
  DollarSign,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Star,
  Truck,
  UserCheck,
  BarChart2,
  Bell,
  Zap,
  ChevronRight,
  X,
  Send,
  MessageSquare,
  Inbox,
  Play,
  Pause,
  SkipForward,
  AlertTriangle,
  Eye,
  CheckSquare,
  XSquare,
  Edit3,
  Phone,
  Building2,
  Calendar,
  Hash,
  Layers,
  Settings2,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  ChevronDown,
  ChevronUp,
  GitBranch,
  ShieldCheck,
  Box,
  FileText,
  Warehouse,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";

// ─── Types ───────────────────────────────────────────────────
type WorkflowStatus =
  | "pending_approval"
  | "approved"
  | "in_production"
  | "shipped"
  | "delivered"
  | "revision_requested"
  | "rejected";
type NotifType =
  | "new_order"
  | "new_complaint"
  | "new_distributor"
  | "shipped"
  | "delivered"
  | "complaint_reply";

interface WorkflowOrder {
  id: string;
  orderNumber: string;
  distributor: string;
  company: string;
  city: string;
  phone: string;
  submittedAt: string;
  status: WorkflowStatus;
  items: {
    name: string;
    qty: number;
    price: number;
    size: string;
    color: string;
  }[];
  total: number;
  notes?: string;
  revisionNote?: string;
  autoNotified: boolean;
}

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  urgent: boolean;
  channel: "platform" | "whatsapp" | "email";
}

// ─── Mock Data Removed for Production ───

// ─── Workflow Status Config ───────────────────────────────────
const WF_STATUS: Record<
  WorkflowStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  pending_approval: {
    label: "بانتظار الموافقة",
    color: "#F59E0B",
    bg: "#FFFBEB",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  approved: {
    label: "موافق عليه",
    color: "#3B82F6",
    bg: "#EFF6FF",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  in_production: {
    label: "قيد التصنيع",
    color: "#8B5CF6",
    bg: "#F5F3FF",
    icon: <Package className="w-3.5 h-3.5" />,
  },
  shipped: {
    label: "تم الشحن",
    color: "#06B6D4",
    bg: "#ECFEFF",
    icon: <Truck className="w-3.5 h-3.5" />,
  },
  delivered: {
    label: "تم التسليم",
    color: "#10B981",
    bg: "#ECFDF5",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  revision_requested: {
    label: "طلب تعديل",
    color: "#EF4444",
    bg: "#FEF2F2",
    icon: <Edit3 className="w-3.5 h-3.5" />,
  },
  rejected: {
    label: "مرفوض",
    color: "#6B7280",
    bg: "#F3F4F6",
    icon: <X className="w-3.5 h-3.5" />,
  },
};

const PIPELINE_STAGES: WorkflowStatus[] = [
  "pending_approval",
  "approved",
  "in_production",
  "shipped",
  "delivered",
];

// ─── Auto-Notification Simulator ─────────────────────────────
function simulateNotification(
  order: WorkflowOrder,
  newStatus: WorkflowStatus,
  isRtl: boolean
) {
  const msgs: Partial<Record<WorkflowStatus, string>> = {
    approved: isRtl
      ? `✅ تم قبول طلبك ${order.orderNumber} وبدأ التجهيز`
      : `✅ Order ${order.orderNumber} approved`,
    in_production: isRtl
      ? `🔨 طلبك ${order.orderNumber} دخل خط الإنتاج`
      : `🔨 Order ${order.orderNumber} in production`,
    shipped: isRtl
      ? `🚚 طلبك ${order.orderNumber} في الطريق إليك`
      : `🚚 Order ${order.orderNumber} shipped`,
    delivered: isRtl
      ? `📦 تم تسليم طلبك ${order.orderNumber} بنجاح`
      : `📦 Order ${order.orderNumber} delivered`,
    revision_requested: isRtl
      ? `⚠️ طلبك ${order.orderNumber} يحتاج مراجعة`
      : `⚠️ Order ${order.orderNumber} needs revision`,
    rejected: isRtl
      ? `❌ تعذّر قبول طلبك ${order.orderNumber}`
      : `❌ Order ${order.orderNumber} rejected`,
  };
  const msg = msgs[newStatus];
  if (msg) {
    toast.success(
      isRtl
        ? `📲 إشعار تلقائي أُرسل للموزع: ${order.distributor}`
        : `📲 Auto-notification sent to ${order.distributor}`,
      { description: msg, duration: 4000 }
    );
  }
}

// ─── Quick Reject Reasons ───────────────────────────────────
const REJECT_REASONS = [
  "المواد الخام غير متوفرة حالياً",
  "الطاقة الإنتاجية ممتلئة لهذه الفترة",
  "المقاسات المطلوبة غير متاحة",
  "اللون المطلوب غير متوفر",
  "بيانات الطلب غير مكتملة",
  "تأخر الموزع في سداد مستحقات سابقة",
  "الكمية تتجاوز الحد المسموح",
];

const REVISION_NOTES = [
  "يرجى تأكيد اللون قبل بدء الإنتاج",
  "يرجى تأكيد المقاسات المطلوبة",
  "يرجى إرفاق مخطط المشروع",
  "يرجى تعديل الكمية لتتوافق مع الحد الأدنى",
  "يرجى تحديد موعد التسليم المطلوب",
];

// ─── Quick Reject Modal ──────────────────────────────────────
function QuickRejectModal({
  order,
  onClose,
  onConfirm,
}: {
  order: WorkflowOrder;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [selected, setSelected] = useState("");
  const [custom, setCustom] = useState("");
  const reason = selected === "__custom__" ? custom : selected;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 12 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
        dir={dir}
      >
        <div
          className="flex items-center justify-between p-5 border-b"
          style={{ background: "#FEF2F2" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#FEE2E2", color: "#DC2626" }}
            >
              <XSquare className="w-5 h-5" />
            </div>
            <div>
              <h3
                className="font-bold text-red-900"
                style={{ fontFamily: "DM Serif Display, serif" }}
              >
                رفض الطلب
              </h3>
              <p className="text-xs text-red-600">
                {order.orderNumber} · {order.distributor}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-100 text-red-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-700">اختر سبب الرفض:</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {REJECT_REASONS.map(r => (
              <button
                key={r}
                onClick={() => setSelected(r)}
                className={`w-full text-start px-4 py-3 rounded-xl border text-sm transition-all ${
                  selected === r
                    ? "border-red-400 bg-red-50 text-red-700 font-semibold"
                    : "border-gray-200 hover:border-red-200 hover:bg-red-50/50 text-gray-700"
                }`}
              >
                {selected === r && <span className="me-2">✓</span>}
                {r}
              </button>
            ))}
            <button
              onClick={() => setSelected("__custom__")}
              className={`w-full text-start px-4 py-3 rounded-xl border text-sm transition-all ${
                selected === "__custom__"
                  ? "border-red-400 bg-red-50 text-red-700 font-semibold"
                  : "border-gray-200 hover:border-red-200 text-gray-500"
              }`}
            >
              {selected === "__custom__" && <span className="me-2">✓</span>}سبب
              آخر (اكتب)...
            </button>
            {selected === "__custom__" && (
              <textarea
                autoFocus
                value={custom}
                onChange={e => setCustom(e.target.value)}
                placeholder="اكتب سبب الرفض..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-red-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            )}
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
          >
            إلغاء
          </button>
          <button
            disabled={!reason.trim()}
            onClick={() => reason.trim() && onConfirm(reason)}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: "#DC2626" }}
          >
            تأكيد الرفض وإشعار الموزع
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Quick Revision Modal ────────────────────────────────────
function QuickRevisionModal({
  order,
  onClose,
  onConfirm,
}: {
  order: WorkflowOrder;
  onClose: () => void;
  onConfirm: (note: string) => void;
}) {
  const { dir } = useLanguage();
  const [note, setNote] = useState("");
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 12 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
        dir={dir}
      >
        <div
          className="flex items-center justify-between p-5 border-b"
          style={{ background: "#FFFBEB" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#FEF3C7", color: "#92400E" }}
            >
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h3
                className="font-bold text-amber-900"
                style={{ fontFamily: "DM Serif Display, serif" }}
              >
                طلب تعديل
              </h3>
              <p className="text-xs text-amber-700">
                {order.orderNumber} · {order.distributor}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-amber-100 text-amber-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-700">
            اختر ملاحظة سريعة أو اكتب:
          </p>
          <div className="flex flex-wrap gap-2">
            {REVISION_NOTES.map(n => (
              <button
                key={n}
                onClick={() => setNote(n)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                  note === n
                    ? "border-amber-400 bg-amber-100 text-amber-800 font-semibold"
                    : "border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="أو اكتب ملاحظة مخصصة..."
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-amber-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
          >
            إلغاء
          </button>
          <button
            disabled={!note.trim()}
            onClick={() => note.trim() && onConfirm(note)}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: "#F59E0B" }}
          >
            إرسال طلب التعديل للموزع
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Order Approval Modal ─────────────────────────────────────
function OrderApprovalModal({
  order,
  onClose,
  onDecide,
}: {
  order: WorkflowOrder;
  onClose: () => void;
  onDecide: (id: string, status: WorkflowStatus, note?: string) => void;
}) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [revNote, setRevNote] = useState("");
  const [showRevForm, setShowRevForm] = useState(false);

  const handleApprove = () => {
    onDecide(order.id, "approved");
    onClose();
  };
  const handleReject = () => {
    onDecide(order.id, "rejected");
    onClose();
  };
  const handleRevision = () => {
    if (!revNote.trim()) {
      toast.error(isRtl ? "اكتب ملاحظة التعديل" : "Write revision note");
      return;
    }
    onDecide(order.id, "revision_requested", revNote.trim());
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
          initial={{ scale: 0.94, y: 24 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.94, y: 24 }}
          dir={dir}
        >
          {/* Urgency Banner */}
          <div
            className="flex items-center gap-2 px-5 py-3 text-sm font-semibold"
            style={{ background: "#FFFBEB", color: "#92400E" }}
          >
            <Zap className="w-4 h-4" />
            {isRtl
              ? "طلب جديد يحتاج موافقتك — سيُشعَر الموزع تلقائياً بعد قرارك"
              : "New order awaiting your approval — distributor will be auto-notified"}
          </div>

          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div>
              <h2
                className="font-bold text-gray-900 text-lg"
                style={{ fontFamily: "DM Serif Display, serif" }}
              >
                {order.orderNumber}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {order.distributor} · {order.company} · {order.city}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh]">
            {/* Order Info */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  icon: <Phone className="w-4 h-4" />,
                  label: isRtl ? "الهاتف" : "Phone",
                  value: order.phone,
                },
                {
                  icon: <Calendar className="w-4 h-4" />,
                  label: isRtl ? "الوقت" : "Time",
                  value: order.submittedAt,
                },
                {
                  icon: <Hash className="w-4 h-4" />,
                  label: isRtl ? "الإجمالي" : "Total",
                  value: `${order.total.toLocaleString()} ر.س`,
                },
              ].map(c => (
                <div
                  key={c.label}
                  className="p-3 rounded-xl bg-gray-50 border border-gray-100"
                >
                  <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                    {c.icon}
                    <span className="text-xs">{c.label}</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-800">
                    {c.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Items Table */}
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#F9FAFB" }}>
                    <th className="text-start px-3 py-2 text-xs font-semibold text-gray-500">
                      {isRtl ? "المنتج" : "Product"}
                    </th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">
                      {isRtl ? "المقاس" : "Size"}
                    </th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">
                      {isRtl ? "اللون" : "Color"}
                    </th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">
                      {isRtl ? "الكمية" : "Qty"}
                    </th>
                    <th className="text-end px-3 py-2 text-xs font-semibold text-gray-500">
                      {isRtl ? "الإجمالي" : "Total"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i} className="border-t border-gray-50">
                      <td className="px-3 py-2.5 text-gray-700 font-medium">
                        {item.name}
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-500 text-xs">
                        {item.size}
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-500 text-xs">
                        {item.color}
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-600">
                        {item.qty}
                      </td>
                      <td className="px-3 py-2.5 text-end font-semibold text-gray-800">
                        {(item.qty * item.price).toLocaleString()} ر.س
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-200">
                    <td
                      colSpan={4}
                      className="px-3 py-2.5 text-sm font-bold text-gray-700"
                    >
                      {isRtl ? "الإجمالي" : "Total"}
                    </td>
                    <td className="px-3 py-2.5 text-end font-bold text-gray-900">
                      {order.total.toLocaleString()} ر.س
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Revision Form */}
            {showRevForm && (
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 space-y-3">
                <p className="text-xs font-semibold text-amber-800">
                  {isRtl
                    ? "ملاحظة التعديل (ستُرسَل للموزع تلقائياً)"
                    : "Revision note (auto-sent to distributor)"}
                </p>
                <Textarea
                  value={revNote}
                  onChange={e => setRevNote(e.target.value)}
                  placeholder={
                    isRtl
                      ? "مثال: يرجى تأكيد اللون المطلوب قبل بدء الإنتاج..."
                      : "e.g. Please confirm the color before production..."
                  }
                  rows={3}
                  className="text-sm resize-none"
                />
                <Button
                  onClick={handleRevision}
                  className="w-full gap-2"
                  style={{ background: "#F59E0B", color: "white" }}
                >
                  <Send className="w-4 h-4" />
                  {isRtl ? "إرسال طلب التعديل" : "Send Revision Request"}
                </Button>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="p-5 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
              <Bell className="w-3.5 h-3.5" />
              {isRtl
                ? "سيتلقى الموزع إشعاراً تلقائياً فور اتخاذ القرار"
                : "Distributor will be auto-notified upon decision"}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-50"
                onClick={handleReject}
              >
                <XSquare className="w-4 h-4" />
                {isRtl ? "رفض" : "Reject"}
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2 border-amber-200 text-amber-700 hover:bg-amber-50"
                onClick={() => setShowRevForm(v => !v)}
              >
                <Edit3 className="w-4 h-4" />
                {isRtl ? "طلب تعديل" : "Request Revision"}
              </Button>
              <Button
                className="flex-1 gap-2 text-white"
                style={{ background: "oklch(0.38 0.06 160)" }}
                onClick={handleApprove}
              >
                <CheckSquare className="w-4 h-4" />
                {isRtl ? "موافقة ✓" : "Approve ✓"}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  icon,
  color,
  bg,
  trend,
  trendValue,
  delay = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  trend?: "up" | "down";
  trendValue?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: bg, color }}
        >
          {icon}
        </div>
        {trend && trendValue && (
          <div
            className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
            style={
              trend === "up"
                ? { background: "#ECFDF5", color: "#10B981" }
                : { background: "#FEF2F2", color: "#EF4444" }
            }
          >
            {trend === "up" ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trendValue}
          </div>
        )}
      </div>
      <div
        className="text-2xl font-bold text-gray-900 mb-1"
        style={{ fontFamily: "DM Serif Display, serif" }}
      >
        {value}
      </div>
      <div className="text-sm font-medium text-gray-600">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </motion.div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 text-sm">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="text-xs">
            {p.name}:{" "}
            {typeof p.value === "number" && p.value > 1000
              ? `${(p.value / 1000).toFixed(0)}k ر.س`
              : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

// ─── DB → WorkflowOrder mapping ─────────────────────────────
const WF_TO_DB: Partial<Record<WorkflowStatus, string>> = {
  pending_approval: "new",
  revision_requested: "reviewing",
  approved: "confirmed",
  in_production: "in_production",
  shipped: "ready",
  delivered: "delivered",
  rejected: "cancelled",
};

function mapToWorkflowOrder(o: {
  id: number;
  customerName: string;
  customerPhone: string;
  productName: string;
  selections: unknown;
  totalPrice: number;
  status: string;
  createdAt: number;
}): WorkflowOrder {
  const DB_TO_WF: Record<string, WorkflowStatus> = {
    new: "pending_approval",
    reviewing: "revision_requested",
    confirmed: "approved",
    in_production: "in_production",
    ready: "shipped",
    delivered: "delivered",
    cancelled: "rejected",
  };
  const d = new Date(o.createdAt);
  const p = (n: number) => String(n).padStart(2, "0");
  const sel = (o.selections as Record<string, string>) ?? {};
  const size =
    sel.door_leaf_width && sel.door_leaf_height
      ? `${sel.door_leaf_width}\u00d7${sel.door_leaf_height}`
      : "\u2014";
  return {
    id: String(o.id),
    orderNumber: `SND-${String(o.id).padStart(4, "0")}`,
    distributor: o.customerName,
    company: "",
    city: "",
    phone: o.customerPhone,
    submittedAt: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`,
    status: DB_TO_WF[o.status] ?? "pending_approval",
    items: [
      {
        name: o.productName,
        qty: 1,
        price: o.totalPrice,
        size,
        color: sel.door_color ?? sel.finish_color ?? "\u2014",
      },
    ],
    total: o.totalPrice,
    autoNotified: o.status !== "new",
  };
}

// ─── Main ────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [queue, setQueue] = useState<WorkflowOrder[]>([]);
  const [notifications, setNotifications] =
    useState<Notification[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<WorkflowOrder | null>(
    null
  );
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [quickRejectOrder, setQuickRejectOrder] =
    useState<WorkflowOrder | null>(null);
  const [quickRevisionOrder, setQuickRevisionOrder] =
    useState<WorkflowOrder | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // ── Real data from DB ────────────────────────────────────────
  const { data: stats } = trpc.orders.stats.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const { data: kpis } = trpc.orders.kpis.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const utils = trpc.useUtils();
  const updateStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => utils.orders.stats.invalidate(),
  });
  const recentOrders = stats?.recentOrders;
  useEffect(() => {
    if (recentOrders) setQueue(recentOrders.map(mapToWorkflowOrder));
  }, [recentOrders]);

  const pendingCount = queue.filter(
    o => o.status === "pending_approval"
  ).length;
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleDecide = (id: string, status: WorkflowStatus, note?: string) => {
    const order = queue.find(o => o.id === id)!;
    setQueue(prev =>
      prev.map(o =>
        o.id === id
          ? { ...o, status, revisionNote: note, autoNotified: true }
          : o
      )
    );
    simulateNotification(order, status, isRtl);
    // Persist to DB
    const dbSt = WF_TO_DB[status];
    if (dbSt) updateStatus.mutate({ id: parseInt(id), status: dbSt as any });
    // Add to notifications
    const notifMsg: Partial<Record<WorkflowStatus, string>> = {
      approved: isRtl
        ? `تمت الموافقة على ${order.orderNumber} وأُشعر الموزع تلقائياً`
        : `${order.orderNumber} approved — distributor notified`,
      rejected: isRtl
        ? `تم رفض ${order.orderNumber} وأُشعر الموزع تلقائياً`
        : `${order.orderNumber} rejected — distributor notified`,
      revision_requested: isRtl
        ? `طُلب تعديل على ${order.orderNumber} وأُشعر الموزع`
        : `Revision requested for ${order.orderNumber}`,
    };
    if (notifMsg[status]) {
      setNotifications(prev => [
        {
          id: `N${Date.now()}`,
          type: "new_order",
          title: isRtl ? "إجراء مكتمل" : "Action Completed",
          body: notifMsg[status]!,
          time: isRtl ? "الآن" : "Just now",
          read: false,
          urgent: false,
          channel: "platform",
        },
        ...prev,
      ]);
    }
  };

  const markAllRead = () =>
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const revCurrent = stats?.thisMonthRevenue ?? 0;
  const revPrev = stats?.monthly?.[5]?.revenue ?? 0;
  const revTrendPct = revPrev > 0 ? ((revCurrent - revPrev) / revPrev) * 100 : 0;
  const revTrend = revPrev > 0 ? (revCurrent >= revPrev ? ("up" as const) : ("down" as const)) : undefined;
  const revTrendValue = revPrev > 0 ? `${revCurrent >= revPrev ? "+" : ""}${revTrendPct.toFixed(1)}%` : undefined;

  const ordCurrent = stats?.thisMonthOrders ?? 0;
  const ordPrev = stats?.monthly?.[5]?.orders ?? 0;
  const ordTrendPct = ordPrev > 0 ? ((ordCurrent - ordPrev) / ordPrev) * 100 : 0;
  const ordTrend = ordPrev > 0 ? (ordCurrent >= ordPrev ? ("up" as const) : ("down" as const)) : undefined;
  const ordTrendValue = ordPrev > 0 ? `${ordCurrent >= ordPrev ? "+" : ""}${ordTrendPct.toFixed(1)}%` : undefined;

  const avgCurrent = stats?.avgOrderValue ?? 0;
  const avgPrev = (stats?.monthly?.[5]?.orders ?? 0) > 0 ? Math.round((stats?.monthly?.[5]?.revenue ?? 0) / (stats?.monthly?.[5]?.orders ?? 0)) : 0;
  const avgTrend = avgPrev > 0 ? (avgCurrent >= avgPrev ? ("up" as const) : ("down" as const)) : undefined;
  const avgTrendValue = avgPrev > 0 ? `${avgCurrent >= avgPrev ? "+" : ""}${(((avgCurrent - avgPrev) / avgPrev) * 100).toFixed(1)}%` : undefined;

  const kpiCards = [
    {
      label: isRtl ? "إجمالي الإيرادات" : "Total Revenue",
      value: stats?.thisMonthRevenue
        ? stats.thisMonthRevenue.toLocaleString()
        : "0",
      sub: isRtl ? "ر.س هذا الشهر" : "SAR this month",
      icon: <DollarSign className="w-5 h-5" />,
      color: "#10B981",
      bg: "#ECFDF5",
      trend: revTrend,
      trendValue: revTrendValue,
    },
    {
      label: isRtl ? "إجمالي الطلبات" : "Total Orders",
      value: String(stats?.thisMonthOrders ?? 0),
      sub: isRtl ? "طلب هذا الشهر" : "orders this month",
      icon: <ShoppingBag className="w-5 h-5" />,
      color: "#3B82F6",
      bg: "#EFF6FF",
      trend: ordTrend,
      trendValue: ordTrendValue,
    },
    {
      label: isRtl ? "الموزعون النشطون" : "Active Distributors",
      value: kpis ? String(kpis.activeDistributors) : "0",
      sub: isRtl
        ? `${kpis?.pendingDistributors ?? 0} طلب تسجيل معلق`
        : `${kpis?.pendingDistributors ?? 0} pending requests`,
      icon: <Users className="w-5 h-5" />,
      color: "#8B5CF6",
      bg: "#F5F3FF",
    },
    {
      label: isRtl ? "الشكاوى المفتوحة" : "Open Complaints",
      value: kpis ? String(kpis.openComplaints) : "0",
      sub: isRtl
        ? `${kpis?.inProductionWorkOrders ?? 0} أمر عمل قيد التنفيذ`
        : `${kpis?.inProductionWorkOrders ?? 0} work orders in progress`,
      icon: <AlertCircle className="w-5 h-5" />,
      color: "#EF4444",
      bg: "#FEF2F2",
    },
    {
      label: isRtl ? "متوسط قيمة الطلب" : "Avg. Order Value",
      value: stats?.avgOrderValue ? stats.avgOrderValue.toLocaleString() : "0",
      sub: isRtl ? "ر.س لكل طلب" : "SAR per order",
      icon: <BarChart2 className="w-5 h-5" />,
      color: "#F59E0B",
      bg: "#FFFBEB",
      trend: avgTrend,
      trendValue: avgTrendValue,
    },
    {
      label: isRtl ? "الطلبات الكلية" : "All Orders",
      value: String(stats?.totalOrders ?? 0),
      sub: isRtl ? "منذ البداية" : "all time",
      icon: <Star className="w-5 h-5" />,
      color: "#F59E0B",
      bg: "#FFFBEB",
    },
  ];

  const pieData = (() => {
    if (!stats) return [
      { name: "معلّق", nameEn: "Pending", value: 0, color: "#F59E0B" },
      { name: "قيد التنفيذ", nameEn: "In Progress", value: 0, color: "#8B5CF6" },
      { name: "مكتمل", nameEn: "Completed", value: 0, color: "#10B981" },
      { name: "ملغي", nameEn: "Cancelled", value: 0, color: "#EF4444" },
    ];
    const sc = stats.statusCounts;
    return [
      {
        name: "معلّق",
        nameEn: "Pending",
        value: (sc.new ?? 0) + (sc.reviewing ?? 0),
        color: "#F59E0B",
      },
      {
        name: "قيد التنفيذ",
        nameEn: "In Progress",
        value: (sc.confirmed ?? 0) + (sc.in_production ?? 0),
        color: "#8B5CF6",
      },
      {
        name: "مكتمل",
        nameEn: "Completed",
        value: (sc.ready ?? 0) + (sc.delivered ?? 0),
        color: "#10B981",
      },
      {
        name: "ملغي",
        nameEn: "Cancelled",
        value: sc.cancelled ?? 0,
        color: "#EF4444",
      },
    ].filter(d => d.value > 0);
  })();

  return (
    <AdminLayout
      title={isRtl ? "لوحة التحكم" : "Dashboard"}
      subtitle={
        isRtl
          ? "أتمتة سير العمل — موافقة فورية، إشعارات تلقائية، متابعة الإنتاج"
          : "Workflow Automation — instant approvals, auto-notifications, production tracking"
      }
    >
      <div className="space-y-6" dir={dir}>
        {/* ── Workflow Alert Bar ─────────────────────────────── */}
        {pendingCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-4 rounded-2xl border-2"
            style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center animate-pulse"
                style={{ background: "#FEF3C7", color: "#92400E" }}
              >
                <Inbox className="w-5 h-5" />
              </div>
              <div>
                <p
                  className="font-bold text-amber-900"
                  style={{ fontFamily: "DM Serif Display, serif" }}
                >
                  {isRtl
                    ? `${pendingCount} طلب${pendingCount > 1 ? "ات" : ""} بانتظار موافقتك`
                    : `${pendingCount} order${pendingCount > 1 ? "s" : ""} awaiting approval`}
                </p>
                <p className="text-xs text-amber-700">
                  {isRtl
                    ? "سيُشعَر الموزعون تلقائياً فور اتخاذ قرارك"
                    : "Distributors will be auto-notified upon your decision"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-700 font-medium hidden sm:block">
                {isRtl
                  ? "انقر على أي طلب للمراجعة"
                  : "Click any order to review"}
              </span>
              <ChevronRight className="w-4 h-4 text-amber-600" />
            </div>
          </motion.div>
        )}

        {/* ── KPIs ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpiCards.map((kpi, i) => (
            <KpiCard key={i} {...kpi} delay={i * 0.06} />
          ))}
        </div>

        {/* ── Main Content: Workflow Queue + Notifications ───── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Workflow Queue — 2/3 width */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "#FFFBEB", color: "#92400E" }}
                >
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3
                    className="font-bold text-gray-800"
                    style={{ fontFamily: "DM Serif Display, serif" }}
                  >
                    {isRtl ? "طابور سير العمل" : "Workflow Queue"}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {isRtl
                      ? "جميع الطلبات مرتبة حسب مرحلة التنفيذ"
                      : "All orders sorted by pipeline stage"}
                  </p>
                </div>
              </div>
              {pendingCount > 0 && (
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full animate-pulse"
                  style={{ background: "#FEF3C7", color: "#92400E" }}
                >
                  {pendingCount} {isRtl ? "بانتظار" : "pending"}
                </span>
              )}
            </div>

            {/* Pipeline Stage Headers */}
            <div className="flex overflow-x-auto border-b border-gray-100">
              {PIPELINE_STAGES.map((stage, i) => {
                const count = queue.filter(o => o.status === stage).length;
                const sc = WF_STATUS[stage];
                return (
                  <div
                    key={stage}
                    className="flex-1 min-w-[100px] flex flex-col items-center py-3 px-2 border-e border-gray-100 last:border-e-0"
                  >
                    <div
                      className="flex items-center gap-1 mb-1"
                      style={{ color: sc.color }}
                    >
                      {sc.icon}
                      <span className="text-xs font-semibold">{count}</span>
                    </div>
                    <span className="text-xs text-gray-500 text-center leading-tight">
                      {sc.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Orders List */}
            <div className="divide-y divide-gray-50">
              {queue.map((order, i) => {
                const sc = WF_STATUS[order.status];
                const isPending = order.status === "pending_approval";
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer ${isPending ? "bg-amber-50/40" : ""}`}
                    onClick={() => isPending && setSelectedOrder(order)}
                  >
                    {/* Status dot */}
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: sc.color }}
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-sm font-semibold text-gray-800">
                          {order.orderNumber}
                        </span>
                        <span
                          className="flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ color: sc.color, background: sc.bg }}
                        >
                          {sc.icon}
                          {sc.label}
                        </span>
                        {isPending && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-bold animate-pulse"
                            style={{ background: "#FEF3C7", color: "#92400E" }}
                          >
                            {isRtl ? "يحتاج قرارك" : "Needs decision"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {order.distributor} · {order.company} · {order.city}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="text-end flex-shrink-0">
                      <div className="text-sm font-bold text-gray-800">
                        {order.total.toLocaleString()} ر.س
                      </div>
                      <div className="text-xs text-gray-400">
                        {order.submittedAt.split(" ")[1]}
                      </div>
                    </div>

                    {/* Action — Quick Buttons */}
                    {isPending ? (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Approve */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDecide(order.id, "approved");
                          }}
                          title="موافقة سريعة"
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                          style={{ background: "#DCFCE7", color: "#16A34A" }}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        {/* Reject */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setQuickRejectOrder(order);
                          }}
                          title="رفض سريع"
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                          style={{ background: "#FEE2E2", color: "#DC2626" }}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                        {/* Revision */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setQuickRevisionOrder(order);
                          }}
                          title="طلب تعديل"
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                          style={{ background: "#FEF3C7", color: "#92400E" }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {/* Full Review */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                          }}
                          title="مراجعة كاملة"
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                          style={{ background: "#EFF6FF", color: "#3B82F6" }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {/* Expand */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setExpandedOrderId(
                              expandedOrderId === order.id ? null : order.id
                            );
                          }}
                          title="معاينة سريعة"
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 border border-gray-200"
                          style={{ background: "#F9FAFB", color: "#6B7280" }}
                        >
                          {expandedOrderId === order.id ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                        {order.autoNotified && (
                          <span className="flex items-center gap-1 text-green-600">
                            <Bell className="w-3 h-3" />
                            {isRtl ? "أُشعر" : "Notified"}
                          </span>
                        )}
                      </div>
                    )}
                    {/* Quick Preview Expand */}
                    {isPending && expandedOrderId === order.id && (
                      <div className="px-5 pb-4 pt-0">
                        <div className="rounded-xl border border-amber-200 overflow-hidden">
                          <div
                            className="px-4 py-2 text-xs font-semibold text-amber-800"
                            style={{ background: "#FEF3C7" }}
                          >
                            معاينة سريعة — {order.orderNumber}
                          </div>
                          <table className="w-full text-xs">
                            <thead>
                              <tr style={{ background: "#FFFBEB" }}>
                                <th className="text-start px-3 py-2 text-gray-500 font-semibold">
                                  المنتج
                                </th>
                                <th className="text-center px-3 py-2 text-gray-500 font-semibold">
                                  المقاس
                                </th>
                                <th className="text-center px-3 py-2 text-gray-500 font-semibold">
                                  اللون
                                </th>
                                <th className="text-center px-3 py-2 text-gray-500 font-semibold">
                                  كمية
                                </th>
                                <th className="text-end px-3 py-2 text-gray-500 font-semibold">
                                  إجمالي
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.items.map((item, idx) => (
                                <tr
                                  key={idx}
                                  className="border-t border-amber-100"
                                >
                                  <td className="px-3 py-2 text-gray-700 font-medium">
                                    {item.name}
                                  </td>
                                  <td className="px-3 py-2 text-center text-gray-500">
                                    {item.size}
                                  </td>
                                  <td className="px-3 py-2 text-center text-gray-500">
                                    {item.color}
                                  </td>
                                  <td className="px-3 py-2 text-center text-gray-600">
                                    {item.qty}
                                  </td>
                                  <td className="px-3 py-2 text-end font-semibold text-gray-800">
                                    {(item.qty * item.price).toLocaleString()}{" "}
                                    ر.س
                                  </td>
                                </tr>
                              ))}
                              <tr className="border-t-2 border-amber-200">
                                <td
                                  colSpan={4}
                                  className="px-3 py-2 font-bold text-gray-700"
                                >
                                  الإجمالي
                                </td>
                                <td className="px-3 py-2 text-end font-bold text-gray-900">
                                  {order.total.toLocaleString()} ر.س
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          <div
                            className="flex gap-2 p-3"
                            style={{ background: "#FFFBEB" }}
                          >
                            <button
                              onClick={() => {
                                handleDecide(order.id, "approved");
                                setExpandedOrderId(null);
                              }}
                              className="flex-1 py-2 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1.5"
                              style={{ background: "#16A34A" }}
                            >
                              <ThumbsUp className="w-3.5 h-3.5" /> موافقة
                            </button>
                            <button
                              onClick={() => {
                                setQuickRejectOrder(order);
                                setExpandedOrderId(null);
                              }}
                              className="flex-1 py-2 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1.5"
                              style={{ background: "#DC2626" }}
                            >
                              <ThumbsDown className="w-3.5 h-3.5" /> رفض
                            </button>
                            <button
                              onClick={() => {
                                setQuickRevisionOrder(order);
                                setExpandedOrderId(null);
                              }}
                              className="flex-1 py-2 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1.5"
                              style={{ background: "#F59E0B" }}
                            >
                              <Pencil className="w-3.5 h-3.5" /> تعديل
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Notification Center — 1/3 width */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "#EFF6FF", color: "#3B82F6" }}
                  >
                    <Bell className="w-4 h-4" />
                  </div>
                  {unreadCount > 0 && (
                    <span
                      className="absolute -top-1 -end-1 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center font-bold"
                      style={{ background: "#EF4444" }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div>
                  <h3
                    className="font-bold text-gray-800"
                    style={{ fontFamily: "DM Serif Display, serif" }}
                  >
                    {isRtl ? "مركز الإشعارات" : "Notifications"}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {isRtl ? "تلقائية وفورية" : "Automatic & real-time"}
                  </p>
                </div>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs font-medium"
                  style={{ color: "oklch(0.38 0.06 160)" }}
                >
                  {isRtl ? "قراءة الكل" : "Mark all read"}
                </button>
              )}
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {notifications.map((n, i) => {
                const NOTIF_ICON: Record<NotifType, React.ReactNode> = {
                  new_order: <ShoppingBag className="w-3.5 h-3.5" />,
                  new_complaint: <AlertCircle className="w-3.5 h-3.5" />,
                  new_distributor: <UserCheck className="w-3.5 h-3.5" />,
                  shipped: <Truck className="w-3.5 h-3.5" />,
                  delivered: <CheckCircle2 className="w-3.5 h-3.5" />,
                  complaint_reply: <MessageSquare className="w-3.5 h-3.5" />,
                };
                const NOTIF_COLOR: Record<NotifType, string> = {
                  new_order: "#3B82F6",
                  new_complaint: "#EF4444",
                  new_distributor: "#10B981",
                  shipped: "#06B6D4",
                  delivered: "#10B981",
                  complaint_reply: "#8B5CF6",
                };
                const color = NOTIF_COLOR[n.type];
                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer ${!n.read ? "bg-blue-50/30" : ""}`}
                    onClick={() =>
                      setNotifications(prev =>
                        prev.map(x =>
                          x.id === n.id ? { ...x, read: true } : x
                        )
                      )
                    }
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: `${color}15`, color }}
                    >
                      {NOTIF_ICON[n.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-xs font-semibold leading-tight ${!n.read ? "text-gray-800" : "text-gray-600"}`}
                        >
                          {n.title}
                        </p>
                        {n.urgent && !n.read && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                            style={{ background: "#FEF2F2", color: "#EF4444" }}
                          >
                            !
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-tight">
                        {n.body}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">{n.time}</span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ background: "#F3F4F6", color: "#9CA3AF" }}
                        >
                          {n.channel === "whatsapp"
                            ? "📱 واتساب"
                            : n.channel === "email"
                              ? "📧 بريد"
                              : "🔔 منصة"}
                        </span>
                      </div>
                    </div>
                    {!n.read && (
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                        style={{ background: "#3B82F6" }}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Auto-Notification Status */}
            <div className="p-4 border-t border-gray-100">
              <div
                className="flex items-center gap-2 p-3 rounded-xl"
                style={{ background: "#ECFDF5" }}
              >
                <Zap
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: "#10B981" }}
                />
                <p className="text-xs text-green-700 leading-tight">
                  {isRtl
                    ? "الإشعارات التلقائية مفعّلة — يُشعَر الموزع في كل مرحلة دون تدخل بشري"
                    : "Auto-notifications active — distributors notified at every stage automatically"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick Access: Factory Workflow ─────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3
                className="font-bold text-gray-800"
                style={{ fontFamily: "DM Serif Display, serif" }}
              >
                {isRtl
                  ? "الوصول السريع — سير عمل المصنع"
                  : "Quick Access — Factory Workflow"}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {isRtl
                  ? "15 مرحلة من استلام PO حتى ما بعد التسليم"
                  : "15 stages from PO receipt to post-delivery"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              {
                href: "/admin/workflow",
                icon: <GitBranch className="w-5 h-5" />,
                label: isRtl ? "سير العمل الكامل" : "Complete Workflow",
                sub: isRtl
                  ? `15 مرحلة · ${kpis?.activeOrdersCount ?? 0} طلبات نشطة`
                  : `15 stages · ${kpis?.activeOrdersCount ?? 0} active orders`,
                color: "oklch(0.55 0.15 250)",
                badge: kpis?.activeOrdersCount ?? 0,
              },
              {
                href: "/admin/work-orders",
                icon: <FileText className="w-5 h-5" />,
                label: isRtl ? "أوامر التشغيل" : "Work Orders",
                sub: isRtl
                  ? `5 أقسام · ${kpis?.inProductionWorkOrders ?? 0} أوامر نشطة`
                  : `5 sections · ${kpis?.inProductionWorkOrders ?? 0} active orders`,
                color: "oklch(0.50 0.16 200)",
                badge: kpis?.inProductionWorkOrders ?? 0,
              },
              {
                href: "/admin/inventory",
                icon: <Warehouse className="w-5 h-5" />,
                label: isRtl ? "إدارة المخزون" : "Inventory",
                sub: isRtl
                  ? `${kpis?.inventoryTotalItems ?? 0} مواد · ${kpis?.inventoryLowStockAlerts ?? 0} تنبيهات`
                  : `${kpis?.inventoryTotalItems ?? 0} items · ${kpis?.inventoryLowStockAlerts ?? 0} alerts`,
                color: "oklch(0.50 0.14 140)",
                badge: kpis?.inventoryLowStockAlerts ?? 0,
              },
              {
                href: "/admin/qc",
                icon: <ShieldCheck className="w-5 h-5" />,
                label: isRtl ? "فحص الجودة" : "Quality Control",
                sub: isRtl
                  ? `فحص الوارد · النهائي · مطابقة PO (${kpis?.pendingQc ?? 0} معلق)`
                  : `Incoming · Final · PO Match (${kpis?.pendingQc ?? 0} pending)`,
                color: "oklch(0.55 0.15 140)",
                badge: kpis?.pendingQc ?? 0,
              },
              {
                href: "/admin/packing",
                icon: <Box className="w-5 h-5" />,
                label: isRtl ? "التغليف والتسليم" : "Packing & Delivery",
                sub: isRtl
                  ? `تغليف · تسليم · محاسبة (${kpis?.pendingPacking ?? 0} معلق)`
                  : `Packing · Delivery · Accounting (${kpis?.pendingPacking ?? 0} pending)`,
                color: "oklch(0.55 0.15 50)",
                badge: kpis?.pendingPacking ?? 0,
              },
              {
                href: "/admin/post-review",
                icon: <Star className="w-5 h-5" />,
                label: isRtl ? "تقييم الطلبات" : "Post Review",
                sub: isRtl
                  ? `تقييم ما بعد الطلب · تحليل الأداء (${kpis?.pendingReviews ?? 0} معلق)`
                  : `Post-Order Review · Analysis (${kpis?.pendingReviews ?? 0} pending)`,
                color: "oklch(0.55 0.15 330)",
                badge: kpis?.pendingReviews ?? 0,
              },
            ].map(item => (
              <Link key={item.href} href={item.href}>
                <div
                  className="flex flex-col gap-3 p-4 rounded-2xl border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
                  style={{ borderTop: `3px solid ${item.color}` }}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="p-2 rounded-xl"
                      style={{
                        background: `${item.color}15`,
                        color: item.color,
                      }}
                    >
                      {item.icon}
                    </div>
                    {item.badge > 0 && (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ background: item.color }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-gray-900 group-hover:text-gray-700">
                      {item.label}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 leading-tight">
                      {item.sub}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Revenue Chart + Order Status ──────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3
                  className="font-bold text-gray-800"
                  style={{ fontFamily: "DM Serif Display, serif" }}
                >
                  {isRtl ? "الإيرادات والطلبات" : "Revenue & Orders"}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isRtl ? "آخر 7 أشهر" : "Last 7 months"}
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={stats?.monthly ?? []}
                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="oklch(0.38 0.06 160)"
                      stopOpacity={0.15}
                    />
                    <stop
                      offset="95%"
                      stopColor="oklch(0.38 0.06 160)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                  dataKey={isRtl ? "month" : "monthEn"}
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name={isRtl ? "الإيرادات" : "Revenue"}
                  stroke="oklch(0.38 0.06 160)"
                  strokeWidth={2}
                  fill="url(#revGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3
              className="font-bold text-gray-800 mb-1"
              style={{ fontFamily: "DM Serif Display, serif" }}
            >
              {isRtl ? "توزيع حالات الطلبات" : "Order Status"}
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              {isRtl ? "هذا الشهر" : "This month"}
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={68}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [String(v)]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {pieData.map(d => (
                <div
                  key={d.name}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: d.color }}
                    />
                    <span className="text-gray-600">
                      {isRtl ? d.name : d.nameEn}
                    </span>
                  </div>
                  <span className="font-semibold text-gray-700">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {selectedOrder && (
        <OrderApprovalModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onDecide={handleDecide}
        />
      )}

      {/* Quick Reject Modal */}
      <AnimatePresence>
        {quickRejectOrder && (
          <QuickRejectModal
            order={quickRejectOrder}
            onClose={() => setQuickRejectOrder(null)}
            onConfirm={reason => {
              handleDecide(quickRejectOrder.id, "rejected", reason);
              setQuickRejectOrder(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Quick Revision Modal */}
      <AnimatePresence>
        {quickRevisionOrder && (
          <QuickRevisionModal
            order={quickRevisionOrder}
            onClose={() => setQuickRevisionOrder(null)}
            onConfirm={note => {
              handleDecide(quickRevisionOrder.id, "revision_requested", note);
              setQuickRevisionOrder(null);
            }}
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
