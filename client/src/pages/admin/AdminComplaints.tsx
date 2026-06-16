// ============================================================
// AdminComplaints - إدارة الشكاوى
// قائمة، رد، تغيير الحالة، إغلاق، تصفية
// ============================================================
import { useState } from "react";
import {
  Search,
  AlertCircle,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  MessageSquare,
  X,
  Send,
  Star,
  Ruler,
  Palette,
  Package,
  Truck,
  AlertTriangle,
  RefreshCw,
  User,
  Calendar,
  Hash,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";

// ─── Types ───────────────────────────────────────────────────
type ComplaintStatus =
  | "open"
  | "under_review"
  | "resolved"
  | "rejected"
  | "return_pending";
type ComplaintType =
  | "size"
  | "color"
  | "damage"
  | "shortage"
  | "delay"
  | "quality"
  | "other";

interface ComplaintMessage {
  from: "distributor" | "admin";
  text: string;
  date: string;
}

interface Complaint {
  id: string;
  ticketNumber: string;
  distributor: string;
  company: string;
  orderNumber: string;
  product: string;
  type: ComplaintType;
  status: ComplaintStatus;
  createdAt: string;
  updatedAt: string;
  description: string;
  images: string[];
  satisfactionRating?: number;
  messages: ComplaintMessage[];
}

// ─── Map DB row → UI shape ────────────────────────────────────
function mapDbComplaint(row: any): Complaint {
  return {
    id: String(row.id),
    ticketNumber: row.ticketNumber,
    distributor: row.distributorName,
    company: row.companyName ?? "",
    orderNumber: row.orderNumber,
    product: row.product,
    type: row.type as ComplaintType,
    status: row.status as ComplaintStatus,
    createdAt: new Date(row.createdAt).toISOString().split("T")[0],
    updatedAt: new Date(row.updatedAt).toISOString().split("T")[0],
    description: row.description,
    images: Array.isArray(row.images) ? row.images : [],
    satisfactionRating: row.satisfactionRating ?? undefined,
    messages: (row.messages ?? []).map((m: any) => ({
      from: m.from as "admin" | "distributor",
      text: m.text,
      date: m.date,
    })),
  };
}

// ─── Config ──────────────────────────────────────────────────
const STATUS_CFG: Record<
  ComplaintStatus,
  {
    label: string;
    labelEn: string;
    color: string;
    bg: string;
    icon: React.ReactNode;
  }
> = {
  open: {
    label: "مفتوحة",
    labelEn: "Open",
    color: "#EF4444",
    bg: "#FEF2F2",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  under_review: {
    label: "قيد المراجعة",
    labelEn: "Under Review",
    color: "#F59E0B",
    bg: "#FFFBEB",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  resolved: {
    label: "تم الحل",
    labelEn: "Resolved",
    color: "#10B981",
    bg: "#ECFDF5",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  rejected: {
    label: "مرفوضة",
    labelEn: "Rejected",
    color: "#6B7280",
    bg: "#F3F4F6",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  return_pending: {
    label: "انتظار الإرجاع",
    labelEn: "Return Pending",
    color: "#8B5CF6",
    bg: "#F5F3FF",
    icon: <RefreshCw className="w-3.5 h-3.5" />,
  },
};

const TYPE_CFG: Record<
  ComplaintType,
  { label: string; icon: React.ReactNode; color: string }
> = {
  size: {
    label: "مقاس",
    icon: <Ruler className="w-3.5 h-3.5" />,
    color: "#3B82F6",
  },
  color: {
    label: "لون",
    icon: <Palette className="w-3.5 h-3.5" />,
    color: "#8B5CF6",
  },
  damage: {
    label: "كسر",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    color: "#EF4444",
  },
  shortage: {
    label: "نقص",
    icon: <Package className="w-3.5 h-3.5" />,
    color: "#F59E0B",
  },
  delay: {
    label: "تأخير",
    icon: <Truck className="w-3.5 h-3.5" />,
    color: "#06B6D4",
  },
  quality: {
    label: "جودة",
    icon: <Star className="w-3.5 h-3.5" />,
    color: "#D97706",
  },
  other: {
    label: "أخرى",
    icon: <MessageSquare className="w-3.5 h-3.5" />,
    color: "#6B7280",
  },
};

// ─── Complaint Detail Modal ───────────────────────────────────
function ComplaintDetailModal({
  complaint,
  onClose,
  onUpdate,
}: {
  complaint: Complaint;
  onClose: () => void;
  onUpdate: (id: string, status: ComplaintStatus, reply?: string) => void;
}) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const sc = STATUS_CFG[complaint.status];
  const tc = TYPE_CFG[complaint.type];
  const [reply, setReply] = useState("");
  const [newStatus, setNewStatus] = useState<ComplaintStatus>(complaint.status);

  const handleSend = () => {
    if (!reply.trim()) {
      toast.error(isRtl ? "اكتب رداً أولاً" : "Write a reply first");
      return;
    }
    onUpdate(complaint.id, newStatus, reply.trim());
    toast.success(
      isRtl ? "تم إرسال الرد وتحديث الحالة" : "Reply sent and status updated"
    );
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
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          dir={dir}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2
                  className="font-bold text-gray-900"
                  style={{ fontFamily: "DM Serif Display, serif" }}
                >
                  {complaint.ticketNumber}
                </h2>
                <span
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ color: sc.color, background: sc.bg }}
                >
                  {sc.icon}
                  {isRtl ? sc.label : sc.labelEn}
                </span>
                <span
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ color: tc.color, background: `${tc.color}15` }}
                >
                  {tc.icon}
                  {tc.label}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {complaint.distributor} · {complaint.company} ·{" "}
                {complaint.orderNumber}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Description */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="text-xs font-semibold text-gray-500 mb-2">
                {isRtl ? "وصف المشكلة" : "Issue Description"}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {complaint.description}
              </p>
              {complaint.images.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-2">
                    {isRtl ? `الصور المرفقة (${complaint.images.length})` : `Attached images (${complaint.images.length})`}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {complaint.images.map((src, i) => (
                      <a key={i} href={src} target="_blank" rel="noopener noreferrer"
                        className="block w-16 h-16 rounded-lg overflow-hidden border hover:opacity-90 transition-opacity"
                        style={{ borderColor: "oklch(0.92 0.004 286.32)" }}>
                        <img src={src} alt={`attachment-${i + 1}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Messages Thread */}
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-3">
                {isRtl ? "سجل المحادثة" : "Conversation"}
              </div>
              <div className="space-y-3">
                {complaint.messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${msg.from === "admin" ? (isRtl ? "flex-row-reverse" : "flex-row") : ""}`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                      style={{
                        background:
                          msg.from === "admin"
                            ? "oklch(0.38 0.06 160)"
                            : "oklch(0.68 0.10 60)",
                      }}
                    >
                      {msg.from === "admin" ? "أ" : complaint.distributor[0]}
                    </div>
                    <div
                      className={`flex-1 max-w-[80%] ${msg.from === "admin" ? (isRtl ? "items-end" : "items-start") : ""}`}
                    >
                      <div
                        className="p-3 rounded-xl text-sm"
                        style={
                          msg.from === "admin"
                            ? {
                                background: "oklch(0.95 0.02 160)",
                                color: "oklch(0.25 0.04 160)",
                              }
                            : { background: "#F3F4F6", color: "#374151" }
                        }
                      >
                        {msg.text}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {msg.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rating */}
            {complaint.satisfactionRating && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                <span className="text-sm text-amber-700 font-medium">
                  {isRtl
                    ? `تقييم الموزع: ${complaint.satisfactionRating}/5`
                    : `Distributor Rating: ${complaint.satisfactionRating}/5`}
                </span>
              </div>
            )}

            {/* Reply + Status Change */}
            {complaint.status !== "resolved" &&
              complaint.status !== "rejected" && (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                      {isRtl ? "الرد على الموزع" : "Reply to Distributor"}
                    </label>
                    <Textarea
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      placeholder={
                        isRtl ? "اكتب ردك هنا..." : "Write your reply here..."
                      }
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                      {isRtl ? "تحديث الحالة" : "Update Status"}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          "under_review",
                          "resolved",
                          "return_pending",
                          "rejected",
                        ] as ComplaintStatus[]
                      ).map(s => (
                        <button
                          key={s}
                          onClick={() => setNewStatus(s)}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all border"
                          style={
                            newStatus === s
                              ? {
                                  background: STATUS_CFG[s].bg,
                                  color: STATUS_CFG[s].color,
                                  borderColor: STATUS_CFG[s].color,
                                }
                              : {
                                  background: "#F9FAFB",
                                  color: "#6B7280",
                                  borderColor: "#E5E7EB",
                                }
                          }
                        >
                          {isRtl ? STATUS_CFG[s].label : STATUS_CFG[s].labelEn}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
          </div>

          {/* Footer */}
          {complaint.status !== "resolved" &&
            complaint.status !== "rejected" && (
              <div className="p-5 border-t border-gray-100 flex justify-end">
                <Button
                  onClick={handleSend}
                  disabled={!reply.trim()}
                  className="gap-2 text-white"
                  style={{
                    background: reply.trim()
                      ? "oklch(0.38 0.06 160)"
                      : undefined,
                  }}
                >
                  <Send className="w-4 h-4" />
                  {isRtl ? "إرسال الرد" : "Send Reply"}
                </Button>
              </div>
            )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function AdminComplaints() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ComplaintStatus | "all">(
    "all"
  );
  const [selected, setSelected] = useState<Complaint | null>(null);

  const {
    data: dbRows = [],
    isLoading,
    refetch,
  } = trpc.complaints.list.useQuery(undefined, { refetchInterval: false });
  const seedMutation = trpc.complaints.seed.useMutation({
    onSuccess: () => refetch(),
  });
  const updateMutation = trpc.complaints.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const complaints = dbRows.map(mapDbComplaint);

  const filtered = complaints.filter(c => {
    const matchSearch =
      c.ticketNumber.includes(search) ||
      c.distributor.includes(search) ||
      c.orderNumber.includes(search);
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    open: complaints.filter(c => c.status === "open").length,
    review: complaints.filter(c => c.status === "under_review").length,
    resolved: complaints.filter(c => c.status === "resolved").length,
    total: complaints.length,
  };

  const handleUpdate = (
    id: string,
    status: ComplaintStatus,
    reply?: string
  ) => {
    updateMutation.mutate({ id: Number(id), status, reply });
    // Optimistic update: close modal immediately
    setSelected(null);
  };

  return (
    <AdminLayout
      title={isRtl ? "إدارة الشكاوى" : "Manage Complaints"}
      subtitle={
        isRtl
          ? "مراجعة والرد على شكاوى الموزعين"
          : "Review and respond to distributor complaints"
      }
    >
      <div className="space-y-5" dir={dir}>
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full mr-2" />
            <span className="text-sm">جارٍ تحميل الشكاوى...</span>
          </div>
        )}

        {/* Empty state with seed button */}
        {!isLoading && complaints.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 mb-4">
              {isRtl ? "لا توجد شكاوى بعد" : "No complaints yet"}
            </p>
            {/* Seed button deleted for production */}
          </div>
        )}

        {!isLoading && complaints.length > 0 && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  label: isRtl ? "إجمالي الشكاوى" : "Total",
                  value: stats.total,
                  color: "#6B7280",
                  bg: "#F9FAFB",
                  icon: <AlertCircle className="w-4 h-4" />,
                },
                {
                  label: isRtl ? "مفتوحة" : "Open",
                  value: stats.open,
                  color: "#EF4444",
                  bg: "#FEF2F2",
                  icon: <AlertCircle className="w-4 h-4" />,
                },
                {
                  label: isRtl ? "قيد المراجعة" : "Under Review",
                  value: stats.review,
                  color: "#F59E0B",
                  bg: "#FFFBEB",
                  icon: <Clock className="w-4 h-4" />,
                },
                {
                  label: isRtl ? "تم الحل" : "Resolved",
                  value: stats.resolved,
                  color: "#10B981",
                  bg: "#ECFDF5",
                  icon: <CheckCircle2 className="w-4 h-4" />,
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

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                    style={{ [isRtl ? "right" : "left"]: "12px" }}
                  />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={
                      isRtl
                        ? "بحث برقم التذكرة أو الموزع..."
                        : "Search by ticket or distributor..."
                    }
                    className="w-full border border-gray-200 rounded-xl py-2 text-sm focus:outline-none focus:border-green-500 transition-colors"
                    style={{
                      [isRtl ? "paddingRight" : "paddingLeft"]: "36px",
                      [isRtl ? "paddingLeft" : "paddingRight"]: "12px",
                    }}
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(
                    [
                      "all",
                      "open",
                      "under_review",
                      "resolved",
                      "rejected",
                      "return_pending",
                    ] as const
                  ).map(s => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className="text-xs px-3 py-2 rounded-xl font-medium transition-all"
                      style={
                        filterStatus === s
                          ? {
                              background: "oklch(0.38 0.06 160)",
                              color: "white",
                            }
                          : { background: "#F3F4F6", color: "#6B7280" }
                      }
                    >
                      {s === "all"
                        ? isRtl
                          ? "الكل"
                          : "All"
                        : isRtl
                          ? STATUS_CFG[s].label
                          : STATUS_CFG[s].labelEn}
                    </button>
                  ))}
                </div>
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
                        isRtl ? "رقم التذكرة" : "Ticket #",
                        isRtl ? "الموزع" : "Distributor",
                        isRtl ? "نوع المشكلة" : "Type",
                        isRtl ? "الحالة" : "Status",
                        isRtl ? "التاريخ" : "Date",
                        isRtl ? "الردود" : "Replies",
                        isRtl ? "إجراء" : "Action",
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
                    {filtered.map((c, i) => {
                      const sc = STATUS_CFG[c.status];
                      const tc = TYPE_CFG[c.type];
                      const needsReply =
                        c.status === "open" || c.status === "under_review";
                      return (
                        <motion.tr
                          key={c.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className={`border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${needsReply ? "bg-red-50/30" : ""}`}
                          onClick={() => setSelected(c)}
                        >
                          <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800">
                            {c.ticketNumber}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-800">
                              {c.distributor}
                            </div>
                            <div className="text-xs text-gray-400">
                              {c.orderNumber}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium w-fit"
                              style={{
                                color: tc.color,
                                background: `${tc.color}15`,
                              }}
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
                              {isRtl ? sc.label : sc.labelEn}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {c.createdAt}
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <MessageSquare className="w-3.5 h-3.5" />
                              {c.messages.length}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setSelected(c);
                              }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <Eye className="w-4 h-4 text-gray-400" />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      {isRtl ? "لا توجد شكاوى" : "No complaints found"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {selected && (
        <ComplaintDetailModal
          complaint={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      )}
    </AdminLayout>
  );
}
