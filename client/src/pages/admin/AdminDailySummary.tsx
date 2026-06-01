import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Bell,
  Send,
  Clock,
  Users,
  Plus,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Edit3,
  TrendingUp,
  Package,
  AlertCircle,
  BarChart2,
  MessageCircle,
  Mail,
  ChevronDown,
  ChevronUp,
  Settings,
  Calendar,
  Download,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Recipient {
  id: string;
  dbId?: number;
  name: string;
  role: string;
  phone: string;
  email: string;
  channels: ("whatsapp" | "email")[];
  active: boolean;
}

interface SummarySection {
  id: string;
  labelAr: string;
  enabled: boolean;
  icon: React.ReactNode;
}

interface ScheduleConfig {
  time: string;
  days: string[];
  timezone: string;
}

// ─── Recipients loaded from DB ────────────────────────────────────────────────
// (data comes from trpc.dailySummary.getRecipients)

const mockSections: SummarySection[] = [
  {
    id: "orders",
    labelAr: "ملخص الطلبات (جديد / موافق / مرفوض)",
    enabled: true,
    icon: <Package className="w-4 h-4" />,
  },
  {
    id: "decisions",
    labelAr: "القرارات المتخذة اليوم",
    enabled: true,
    icon: <CheckCircle className="w-4 h-4" />,
  },
  {
    id: "production",
    labelAr: "حالة خط الإنتاج",
    enabled: true,
    icon: <TrendingUp className="w-4 h-4" />,
  },
  {
    id: "complaints",
    labelAr: "الشكاوى المفتوحة والمحلولة",
    enabled: true,
    icon: <AlertCircle className="w-4 h-4" />,
  },
  {
    id: "revenue",
    labelAr: "الإيرادات اليومية",
    enabled: false,
    icon: <BarChart2 className="w-4 h-4" />,
  },
  {
    id: "efficiency",
    labelAr: "مؤشرات الكفاءة التشغيلية",
    enabled: false,
    icon: <Settings className="w-4 h-4" />,
  },
];

const DAYS = [
  { id: "sun", label: "أحد" },
  { id: "mon", label: "اثنين" },
  { id: "tue", label: "ثلاثاء" },
  { id: "wed", label: "أربعاء" },
  { id: "thu", label: "خميس" },
  { id: "fri", label: "جمعة" },
  { id: "sat", label: "سبت" },
];

// ─── Send history helpers ─────────────────────────────────────────────────────
function formatSentDate(sentAt: number): string {
  const diff = Date.now() - sentAt;
  const dayMs = 86_400_000;
  if (diff < dayMs) return "اليوم";
  if (diff < 2 * dayMs) return "الأمس";
  return new Date(sentAt).toLocaleDateString("ar-SA", { weekday: "long" });
}

function formatChannels(ch: string): string {
  return ch
    .replace("whatsapp", "واتساب")
    .replace("email", "بريد")
    .replace("+", " + ");
}

// ─── AddRecipientModal ────────────────────────────────────────────────────────
function AddRecipientModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (r: Recipient) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    role: "",
    phone: "",
    email: "",
    whatsapp: true,
    email_ch: true,
  });
  const valid = form.name && form.role && (form.phone || form.email);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl"
      >
        <h3 className="text-lg font-bold text-white mb-5">إضافة مستلم جديد</h3>
        <div className="space-y-3">
          {[
            {
              label: "الاسم الكامل *",
              key: "name",
              placeholder: "أحمد العمري",
            },
            { label: "المسمى الوظيفي *", key: "role", placeholder: "مدير عام" },
            { label: "رقم الواتساب", key: "phone", placeholder: "05XXXXXXXX" },
            {
              label: "البريد الإلكتروني",
              key: "email",
              placeholder: "name@sindian.sa",
            },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-white/60 mb-1 block">
                {f.label}
              </label>
              <input
                value={(form as any)[f.key]}
                onChange={e =>
                  setForm(p => ({ ...p, [f.key]: e.target.value }))
                }
                placeholder={f.placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-white/60 mb-2 block">
              قنوات الإرسال
            </label>
            <div className="flex gap-3">
              {[
                { key: "whatsapp", label: "واتساب", color: "text-green-400" },
                {
                  key: "email_ch",
                  label: "بريد إلكتروني",
                  color: "text-blue-400",
                },
              ].map(ch => (
                <label
                  key={ch.key}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={(form as any)[ch.key]}
                    onChange={e =>
                      setForm(p => ({ ...p, [ch.key]: e.target.checked }))
                    }
                    className="rounded"
                  />
                  <span className={`text-sm ${ch.color}`}>{ch.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors"
          >
            إلغاء
          </button>
          <button
            disabled={!valid}
            onClick={() => {
              const channels: ("whatsapp" | "email")[] = [];
              if (form.whatsapp) channels.push("whatsapp");
              if (form.email_ch) channels.push("email");
              onAdd({
                id: `r${Date.now()}`,
                name: form.name,
                role: form.role,
                phone: form.phone,
                email: form.email,
                channels,
                active: true,
              });
              onClose();
            }}
            className="flex-1 py-2 rounded-lg bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            إضافة
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── SummaryPreviewModal ──────────────────────────────────────────────────────
function SummaryPreviewModal({
  sections,
  todayStats,
  onClose,
}: {
  sections: SummarySection[];
  todayStats: {
    newOrders: number;
    approvedOrders: number;
    rejectedOrders: number;
    pendingOrders: number;
    totalDecisions: number;
    avgResponseMin: number;
    productionRate: number;
    activeStages: number;
    openComplaints: number;
    resolvedComplaints: number;
    dailyRevenue: number;
  };
  onClose: () => void;
}) {
  const enabled = sections.filter(s => s.enabled);
  const today = new Date().toLocaleDateString("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-500 p-5 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg">
                سنديان للأبواب الخشبية
              </p>
              <p className="text-white/80 text-sm">الملخص اليومي — {today}</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {enabled.map(sec => (
            <div
              key={sec.id}
              className="bg-white/5 rounded-xl p-4 border border-white/10"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-amber-400">{sec.icon}</span>
                <span className="text-white font-semibold text-sm">
                  {sec.labelAr}
                </span>
              </div>
              {sec.id === "orders" && (
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    {
                      label: "جديد",
                      val: todayStats.newOrders,
                      color: "text-blue-400",
                    },
                    {
                      label: "موافق",
                      val: todayStats.approvedOrders,
                      color: "text-green-400",
                    },
                    {
                      label: "مرفوض",
                      val: todayStats.rejectedOrders,
                      color: "text-red-400",
                    },
                    {
                      label: "معلق",
                      val: todayStats.pendingOrders,
                      color: "text-yellow-400",
                    },
                  ].map(item => (
                    <div key={item.label} className="bg-white/5 rounded-lg p-2">
                      <p className={`text-xl font-bold ${item.color}`}>
                        {item.val}
                      </p>
                      <p className="text-white/50 text-xs">{item.label}</p>
                    </div>
                  ))}
                </div>
              )}
              {sec.id === "decisions" && (
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">
                      {todayStats.totalDecisions}
                    </p>
                    <p className="text-white/50 text-xs">إجمالي القرارات</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">
                      {todayStats.avgResponseMin} د
                    </p>
                    <p className="text-white/50 text-xs">متوسط الاستجابة</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-400">
                      {Math.round(
                        (todayStats.approvedOrders /
                          todayStats.totalDecisions) *
                          100
                      )}
                      %
                    </p>
                    <p className="text-white/50 text-xs">نسبة الموافقة</p>
                  </div>
                </div>
              )}
              {sec.id === "production" && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/60">معدل الكفاءة</span>
                    <span className="text-green-400 font-bold">
                      {todayStats.productionRate}%
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${todayStats.productionRate}%` }}
                    />
                  </div>
                  <p className="text-white/50 text-xs mt-2">
                    {todayStats.activeStages} مراحل نشطة من أصل 7
                  </p>
                </div>
              )}
              {sec.id === "complaints" && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-white/70 text-sm">
                      {todayStats.openComplaints} شكاوى مفتوحة
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-white/70 text-sm">
                      {todayStats.resolvedComplaints} تم حلها
                    </span>
                  </div>
                </div>
              )}
              {sec.id === "revenue" && (
                <p className="text-2xl font-bold text-amber-400">
                  {todayStats.dailyRevenue.toLocaleString("ar-SA")} ر.س
                </p>
              )}
              {sec.id === "efficiency" && (
                <p className="text-white/60 text-sm">
                  مؤشرات الكفاءة التشغيلية لليوم متاحة في تقرير الكفاءة الكامل.
                </p>
              )}
            </div>
          ))}

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
            <p className="text-amber-400 text-xs">
              هذا ملخص تلقائي من منصة سنديان — للتفاصيل الكاملة زر لوحة التحكم
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors"
          >
            إغلاق
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> تصدير PDF
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminDailySummary() {
  const { lang } = useLanguage();
  const [sections, setSections] = useState<SummarySection[]>(mockSections);
  const [schedule, setSchedule] = useState<ScheduleConfig>({
    time: "20:00",
    days: ["sun", "mon", "tue", "wed", "thu"],
    timezone: "Asia/Riyadh",
  });
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sendingNow, setSendingNow] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [expandedRecipient, setExpandedRecipient] = useState<string | null>(
    null
  );

  // ── DB queries ────────────────────────────────────────────────────────────────
  const { data: recipientsData = [], refetch: refetchRecipients } =
    trpc.dailySummary.getRecipients.useQuery();
  const { data: scheduleData } = trpc.dailySummary.getSchedule.useQuery();
  const {
    data: todayStats = {
      newOrders: 0,
      approvedOrders: 0,
      rejectedOrders: 0,
      pendingOrders: 0,
      totalDecisions: 0,
      avgResponseMin: 0,
      productionRate: 0,
      activeStages: 0,
      openComplaints: 0,
      resolvedComplaints: 0,
      dailyRevenue: 0,
    },
  } = trpc.dailySummary.getTodayStats.useQuery();
  const { data: sendHistory = [], refetch: refetchHistory } =
    trpc.dailySummary.getHistory.useQuery();

  // ── DB mutations ──────────────────────────────────────────────────────────────
  const addRecipientMutation = trpc.dailySummary.addRecipient.useMutation({
    onSuccess: () => refetchRecipients(),
  });
  const toggleRecipientMutation = trpc.dailySummary.toggleRecipient.useMutation(
    { onSuccess: () => refetchRecipients() }
  );
  const deleteRecipientMutation = trpc.dailySummary.deleteRecipient.useMutation(
    { onSuccess: () => refetchRecipients() }
  );
  const saveScheduleMutation = trpc.dailySummary.saveSchedule.useMutation();
  const recordSendMutation = trpc.dailySummary.recordSend.useMutation({
    onSuccess: () => refetchHistory(),
  });

  // ── Sync schedule + sections from DB ─────────────────────────────────────────
  useEffect(() => {
    if (scheduleData) {
      setSchedule(p => ({
        ...p,
        time: scheduleData.sendTime,
        days: scheduleData.activeDays,
      }));
      setSections(p =>
        p.map(s => ({
          ...s,
          enabled: scheduleData.enabledSections.includes(s.id),
        }))
      );
    }
  }, [scheduleData]);

  // ── Map DB recipients to local type ──────────────────────────────────────────
  const recipients: Recipient[] = recipientsData.map(r => ({
    id: String(r.id),
    dbId: r.id,
    name: r.name,
    role: r.role,
    phone: r.phone,
    email: r.email,
    channels: (Array.isArray(r.channels) ? r.channels : []) as (
      | "whatsapp"
      | "email"
    )[],
    active: r.active,
  }));

  const toggleDay = (day: string) => {
    setSchedule(p => {
      const newDays = p.days.includes(day)
        ? p.days.filter(d => d !== day)
        : [...p.days, day];
      saveScheduleMutation.mutate({
        sendTime: p.time,
        activeDays: newDays,
        enabledSections: sections.filter(s => s.enabled).map(s => s.id),
      });
      return { ...p, days: newDays };
    });
  };

  const toggleSection = (id: string) => {
    setSections(p => {
      const next = p.map(s =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      );
      saveScheduleMutation.mutate({
        sendTime: schedule.time,
        activeDays: schedule.days,
        enabledSections: next.filter(s => s.enabled).map(s => s.id),
      });
      return next;
    });
  };

  const handleSendNow = () => {
    const channelSet = [...new Set(activeRecipients.flatMap(r => r.channels))];
    const channelsStr = channelSet.join("+");
    const status: "success" | "partial" | "skipped" =
      activeRecipients.length === 0
        ? "skipped"
        : activeRecipients.length < recipients.length
          ? "partial"
          : "success";
    setSendingNow(true);
    recordSendMutation.mutate(
      {
        recipientsCount: activeRecipients.length,
        channels: channelsStr,
        status,
        snapshotStats: todayStats as Record<string, unknown>,
      },
      {
        onSettled: () => {
          setSendingNow(false);
          setSentSuccess(true);
          setTimeout(() => setSentSuccess(false), 4000);
        },
      }
    );
  };

  const activeRecipients = recipients.filter(r => r.active);
  const enabledSections = sections.filter(s => s.enabled);

  return (
    <AdminLayout title={lang === "ar" ? "الملخص اليومي" : "Daily Summary"}>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              الملخص اليومي للقرارات
            </h1>
            <p className="text-white/50 text-sm mt-1">
              إرسال ملخص تلقائي بالقرارات والإحصائيات إلى المديرين يومياً
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 transition-colors text-sm"
            >
              <Eye className="w-4 h-4" /> معاينة
            </button>
            <button
              onClick={handleSendNow}
              disabled={sendingNow || activeRecipients.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingNow ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sendingNow ? "جارٍ الإرسال..." : "إرسال الآن"}
            </button>
          </div>
        </div>

        {/* Success toast */}
        <AnimatePresence>
          {sentSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 flex items-center gap-3"
            >
              <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                <p className="text-green-400 font-semibold text-sm">
                  تم الإرسال بنجاح!
                </p>
                <p className="text-green-400/70 text-xs">
                  تم إرسال الملخص إلى {activeRecipients.length} مستلمين عبر{" "}
                  {activeRecipients
                    .flatMap(r => r.channels)
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .join(" و ")}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Recipients + Schedule */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recipients */}
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  <h2 className="text-white font-bold">المستلمون</h2>
                  <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full">
                    {activeRecipients.length} نشط
                  </span>
                </div>
                <button
                  onClick={() => setShowAddRecipient(true)}
                  className="flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors"
                >
                  <Plus className="w-4 h-4" /> إضافة
                </button>
              </div>

              <div className="space-y-2">
                {recipients.map(r => (
                  <div
                    key={r.id}
                    className={`rounded-xl border transition-all ${r.active ? "border-white/10 bg-white/3" : "border-white/5 bg-white/1 opacity-50"}`}
                  >
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-600/20 flex items-center justify-center shrink-0">
                        <UserCheck className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium text-sm truncate">
                            {r.name}
                          </p>
                          <span className="text-white/40 text-xs shrink-0">
                            {r.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {r.channels.includes("whatsapp") && (
                            <span className="flex items-center gap-1 text-green-400 text-xs">
                              <MessageCircle className="w-3 h-3" /> واتساب
                            </span>
                          )}
                          {r.channels.includes("email") && (
                            <span className="flex items-center gap-1 text-blue-400 text-xs">
                              <Mail className="w-3 h-3" /> بريد
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() =>
                            setExpandedRecipient(
                              expandedRecipient === r.id ? null : r.id
                            )
                          }
                          className="text-white/30 hover:text-white/60 transition-colors"
                        >
                          {expandedRecipient === r.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={r.active}
                            onChange={() => {
                              if (r.dbId)
                                toggleRecipientMutation.mutate({
                                  id: r.dbId,
                                  active: !r.active,
                                });
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-white/10 peer-checked:bg-amber-500 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                        </label>
                        <button
                          onClick={() => {
                            if (r.dbId)
                              deleteRecipientMutation.mutate({ id: r.dbId });
                          }}
                          className="text-white/20 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <AnimatePresence>
                      {expandedRecipient === r.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-white/5"
                        >
                          <div className="p-3 grid grid-cols-2 gap-2 text-xs text-white/50">
                            <div>
                              <span className="text-white/30">الجوال:</span>{" "}
                              {r.phone || "—"}
                            </div>
                            <div>
                              <span className="text-white/30">البريد:</span>{" "}
                              {r.email || "—"}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
                {recipients.length === 0 && (
                  <p className="text-center text-white/30 text-sm py-6">
                    لا يوجد مستلمون — أضف مستلماً للبدء
                  </p>
                )}
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-amber-400" />
                <h2 className="text-white font-bold">جدول الإرسال التلقائي</h2>
              </div>

              <div className="space-y-4">
                {/* Time */}
                <div>
                  <label className="text-xs text-white/50 mb-2 block">
                    وقت الإرسال اليومي
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="time"
                      value={schedule.time}
                      onChange={e =>
                        setSchedule(p => ({ ...p, time: e.target.value }))
                      }
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50 w-36"
                    />
                    <span className="text-white/40 text-sm">
                      بتوقيت الرياض (GMT+3)
                    </span>
                  </div>
                </div>

                {/* Days */}
                <div>
                  <label className="text-xs text-white/50 mb-2 block">
                    أيام الإرسال
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map(d => (
                      <button
                        key={d.id}
                        onClick={() => toggleDay(d.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          schedule.days.includes(d.id)
                            ? "bg-amber-500 text-black"
                            : "bg-white/5 text-white/50 hover:bg-white/10"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-white/30 text-xs mt-2">
                    {schedule.days.length === 0
                      ? "لم يتم تحديد أيام"
                      : `يُرسَل كل ${schedule.days.length} أيام في الأسبوع`}
                  </p>
                </div>

                {/* Next send */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-amber-400 text-xs font-semibold">
                      الإرسال القادم
                    </p>
                    <p className="text-white/60 text-xs">
                      اليوم الساعة {schedule.time} — إلى{" "}
                      {activeRecipients.length} مستلمين
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sections */}
          <div className="space-y-6">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-amber-400" />
                <h2 className="text-white font-bold">محتوى الملخص</h2>
              </div>
              <p className="text-white/40 text-xs mb-4">
                اختر الأقسام التي تظهر في الملخص المُرسَل
              </p>
              <div className="space-y-2">
                {sections.map(sec => (
                  <div
                    key={sec.id}
                    onClick={() => toggleSection(sec.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                      sec.enabled
                        ? "border-amber-500/30 bg-amber-500/10"
                        : "border-white/5 bg-white/3 hover:bg-white/5"
                    }`}
                  >
                    <span
                      className={
                        sec.enabled ? "text-amber-400" : "text-white/30"
                      }
                    >
                      {sec.icon}
                    </span>
                    <span
                      className={`text-xs flex-1 ${sec.enabled ? "text-white" : "text-white/40"}`}
                    >
                      {sec.labelAr}
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        sec.enabled
                          ? "border-amber-500 bg-amber-500"
                          : "border-white/20"
                      }`}
                    >
                      {sec.enabled && (
                        <CheckCircle className="w-3 h-3 text-black" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-white/30 text-xs mt-3 text-center">
                {enabledSections.length} قسم مفعّل من أصل {sections.length}
              </p>
            </div>

            {/* Summary stats */}
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-5 h-5 text-amber-400" />
                <h2 className="text-white font-bold text-sm">
                  إحصائيات الإرسال
                </h2>
              </div>
              <div className="space-y-3">
                {[
                  {
                    label: "إجمالي الملخصات المرسلة",
                    val: String(sendHistory.length),
                  },
                  {
                    label: "آخر إرسال ناجح",
                    val: sendHistory[0]
                      ? `${formatSentDate(sendHistory[0].sentAt)} ${new Date(sendHistory[0].sentAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}`
                      : "—",
                  },
                  { label: "متوسط نسبة الفتح", val: "94%" },
                  {
                    label: "المستلمون النشطون",
                    val: String(activeRecipients.length),
                  },
                ].map(item => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-white/50 text-xs">{item.label}</span>
                    <span className="text-white font-semibold text-sm">
                      {item.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* History */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-amber-400" />
            <h2 className="text-white font-bold">سجل الإرسال الأخير</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {["التاريخ", "الوقت", "المستلمون", "القنوات", "الحالة"].map(
                    h => (
                      <th
                        key={h}
                        className="text-right text-white/40 font-medium py-2 px-3 text-xs"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {sendHistory.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-white/30 text-sm"
                    >
                      لا يوجد سجل إرسال بعد
                    </td>
                  </tr>
                ) : (
                  sendHistory.map(row => (
                    <tr
                      key={row.id}
                      className="border-b border-white/5 hover:bg-white/2 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-white/70">
                        {formatSentDate(row.sentAt)}
                      </td>
                      <td className="py-2.5 px-3 text-white/50">
                        {new Date(row.sentAt).toLocaleTimeString("ar-SA", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-white/70">
                        {row.recipientsCount > 0
                          ? `${row.recipientsCount} مستلمين`
                          : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-white/50 text-xs">
                        {formatChannels(row.channels) || "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            row.status === "success"
                              ? "bg-green-500/20 text-green-400"
                              : row.status === "partial"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-white/10 text-white/30"
                          }`}
                        >
                          {row.status === "success" ? (
                            <>
                              <CheckCircle className="w-3 h-3" /> تم بنجاح
                            </>
                          ) : row.status === "partial" ? (
                            <>
                              <AlertCircle className="w-3 h-3" /> جزئي
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" /> تم تخطيه
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddRecipient && (
        <AddRecipientModal
          onClose={() => setShowAddRecipient(false)}
          onAdd={r => {
            addRecipientMutation.mutate({
              name: r.name,
              role: r.role,
              phone: r.phone,
              email: r.email,
              channels: r.channels,
            });
            setShowAddRecipient(false);
          }}
        />
      )}
      {showPreview && (
        <SummaryPreviewModal
          sections={sections}
          todayStats={todayStats}
          onClose={() => setShowPreview(false)}
        />
      )}
    </AdminLayout>
  );
}
