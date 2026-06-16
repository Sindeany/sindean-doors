// ============================================================
// AdminPostOrderReview - تقييم الطلب بعد التسليم
// Post-Order Review: تحليل الأخطاء + زمن التنفيذ + ملاحظات العميل
// ============================================================
import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { motion } from "framer-motion";
import {
  Star,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  MessageCircle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Download,
  Plus,
  Search,
  Filter,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Target,
  Lightbulb,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface PostReview {
  id: string;
  dbId?: number;
  orderNumber: string;
  distributorName: string;
  totalDoors: number;
  completedAt: string;
  plannedDays: number;
  actualDays: number;
  clientRating: number;
  clientFeedback: string;
  errors: {
    category: string;
    description: string;
    severity: "low" | "medium" | "high";
  }[];
  improvements: string[];
  status: "pending_review" | "reviewed" | "closed";
}

// ── DB Row → UI Record
function mapDbRow(row: any): PostReview {
  return {
    id: String(row.id),
    dbId: row.id,
    orderNumber: row.orderNumber,
    distributorName: row.distributorName,
    totalDoors: row.totalDoors,
    completedAt: row.completedAt,
    plannedDays: row.plannedDays,
    actualDays: row.actualDays,
    clientRating: row.clientRating,
    clientFeedback: row.clientFeedback,
    errors: Array.isArray(row.errors) ? row.errors : [],
    improvements: Array.isArray(row.improvements) ? row.improvements : [],
    status: row.status as PostReview["status"],
  };
}

// ── (data now comes from DB via tRPC postOrderReview.list)

const SEVERITY_CONFIG = {
  low: {
    label: "منخفض",
    color: "oklch(0.55 0.15 140)",
    bg: "oklch(0.95 0.05 140)",
  },
  medium: {
    label: "متوسط",
    color: "oklch(0.55 0.15 60)",
    bg: "oklch(0.95 0.05 60)",
  },
  high: {
    label: "عالٍ",
    color: "oklch(0.55 0.15 25)",
    bg: "oklch(0.95 0.05 25)",
  },
};

const STATUS_CONFIG = {
  pending_review: { label: "بانتظار المراجعة", color: "oklch(0.55 0.15 60)" },
  reviewed: { label: "تمت المراجعة", color: "oklch(0.55 0.15 250)" },
  closed: { label: "مغلق", color: "oklch(0.55 0.15 140)" },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className="w-4 h-4"
          fill={s <= rating ? "#F59E0B" : "none"}
          stroke={s <= rating ? "#F59E0B" : "#D1D5DB"}
        />
      ))}
    </div>
  );
}

function ReviewCard({
  review,
  onAddImprovement,
  onCloseReview,
}: {
  review: PostReview;
  onAddImprovement?: (text: string) => void;
  onCloseReview?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newImprovement, setNewImprovement] = useState("");
  const [improvements, setImprovements] = useState(review.improvements);

  const statusCfg = STATUS_CONFIG[review.status];
  const onTimeDiff = review.actualDays - review.plannedDays;

  return (
    <motion.div
      layout
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
    >
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 text-right min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-gray-900">
              {review.orderNumber}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                color: statusCfg.color,
                background: `${statusCfg.color}15`,
              }}
            >
              {statusCfg.label}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {review.distributorName} · {review.totalDoors} باب · اكتمل:{" "}
            {review.completedAt}
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-center">
            <StarRating rating={review.clientRating} />
            <div className="text-xs text-gray-400 mt-0.5">تقييم العميل</div>
          </div>
          <div className="text-center">
            <div
              className={`text-lg font-bold ${onTimeDiff <= 0 ? "text-green-600" : "text-red-500"}`}
            >
              {onTimeDiff <= 0
                ? `${Math.abs(onTimeDiff)} يوم مبكر`
                : `+${onTimeDiff} يوم تأخير`}
            </div>
            <div className="text-xs text-gray-400">
              {review.actualDays} / {review.plannedDays} يوم
            </div>
          </div>
          {review.errors.length > 0 && (
            <div className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5" />
              {review.errors.length} خطأ
            </div>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-5 pb-5 space-y-4"
        >
          {/* Client Feedback */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">
                ملاحظات العميل
              </span>
              <StarRating rating={review.clientRating} />
            </div>
            <p className="text-sm text-blue-700 leading-relaxed">
              {review.clientFeedback}
            </p>
          </div>

          {/* Time Analysis */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">المدة المخططة</div>
              <div className="text-xl font-bold text-gray-900">
                {review.plannedDays}
              </div>
              <div className="text-xs text-gray-400">يوم</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">المدة الفعلية</div>
              <div
                className={`text-xl font-bold ${onTimeDiff <= 0 ? "text-green-600" : "text-red-500"}`}
              >
                {review.actualDays}
              </div>
              <div className="text-xs text-gray-400">يوم</div>
            </div>
            <div
              className={`rounded-xl p-3 text-center ${onTimeDiff <= 0 ? "bg-green-50" : "bg-red-50"}`}
            >
              <div className="text-xs text-gray-400 mb-1">الفرق</div>
              <div
                className={`text-xl font-bold ${onTimeDiff <= 0 ? "text-green-600" : "text-red-500"}`}
              >
                {onTimeDiff <= 0
                  ? `-${Math.abs(onTimeDiff)}`
                  : `+${onTimeDiff}`}
              </div>
              <div className="text-xs text-gray-400">يوم</div>
            </div>
          </div>

          {/* Errors */}
          {review.errors.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                الأخطاء المكتشفة
              </div>
              {review.errors.map((err, i) => {
                const sev = SEVERITY_CONFIG[err.severity];
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 bg-gray-50 rounded-xl px-3 py-2.5"
                  >
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                      style={{ background: sev.bg, color: sev.color }}
                    >
                      {sev.label}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-gray-600">
                        {err.category}
                      </div>
                      <div className="text-sm text-gray-700">
                        {err.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Improvements */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              مقترحات التحسين
            </div>
            {improvements.map((imp, i) => (
              <div
                key={i}
                className="flex items-start gap-2 bg-amber-50 rounded-xl px-3 py-2.5 border border-amber-100"
              >
                <TrendingUp className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-amber-800">{imp}</span>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                placeholder="إضافة مقترح تحسين..."
                value={newImprovement}
                onChange={e => setNewImprovement(e.target.value)}
                className="text-sm h-9 flex-1"
              />
              <Button
                size="sm"
                className="h-9 gap-1.5"
                style={{ background: "oklch(0.55 0.15 60)" }}
                onClick={() => {
                  if (newImprovement.trim()) {
                    setImprovements(prev => [...prev, newImprovement.trim()]);
                    onAddImprovement?.(newImprovement.trim());
                    setNewImprovement("");
                    toast.success("تم إضافة المقترح");
                  }
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {review.status === "pending_review" && (
              <Button
                size="sm"
                className="flex-1 gap-1.5"
                style={{ background: "oklch(0.38 0.06 160)" }}
                onClick={() => {
                  onCloseReview?.();
                  toast.success("تم إغلاق مراجعة الطلب");
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                إغلاق المراجعة
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-1.5">
              <Download className="w-3.5 h-3.5" />
              تقرير PDF
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function AdminPostOrderReview() {
  const [search, setSearch] = useState("");

  const {
    data: dbRows = [],
    isLoading,
    refetch,
  } = trpc.postOrderReview.list.useQuery();
  const seedMutation = trpc.postOrderReview.seed.useMutation({
    onSuccess: () => refetch(),
  });
  const addImprovementMutation =
    trpc.postOrderReview.addImprovement.useMutation({
      onSuccess: () => refetch(),
    });
  const updateStatusMutation = trpc.postOrderReview.updateStatus.useMutation({
    onSuccess: () => refetch(),
  });

  const reviews = dbRows.map(mapDbRow);

  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + r.clientRating, 0) / reviews.length
        ).toFixed(1)
      : "—";
  const onTimeCount = reviews.filter(r => r.actualDays <= r.plannedDays).length;
  const totalErrors = reviews.reduce((sum, r) => sum + r.errors.length, 0);

  const kpis = [
    {
      label: "متوسط تقييم العملاء",
      value: `${avgRating} ★`,
      color: "oklch(0.55 0.15 60)",
    },
    {
      label: "في الوقت المحدد",
      value: `${onTimeCount}/${reviews.length}`,
      color: "oklch(0.55 0.15 140)",
    },
    {
      label: "إجمالي الأخطاء المسجلة",
      value: totalErrors,
      color: "oklch(0.55 0.15 25)",
    },
    {
      label: "طلبات بانتظار المراجعة",
      value: reviews.filter(r => r.status === "pending_review").length,
      color: "oklch(0.55 0.15 250)",
    },
  ];

  const filtered = reviews.filter(
    r =>
      !search ||
      r.orderNumber.includes(search) ||
      r.distributorName.includes(search)
  );

  return (
    <AdminLayout
      title="تقييم الطلبات (Post-Order Review)"
      subtitle="تحليل الأداء · الأخطاء · ملاحظات العملاء · مقترحات التحسين"
    >
      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
          جارٍ التحميل...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && reviews.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <FileText className="w-12 h-12 opacity-20 text-gray-400" />
          <p className="text-gray-400 text-sm">لا توجد مراجعات بعد</p>
          {/* Seed button deleted for production */}
        </div>
      )}

      {!isLoading && reviews.length > 0 && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {kpis.map((kpi, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-4 border border-gray-100"
              >
                <div className="text-2xl font-bold text-gray-900 mb-0.5">
                  {kpi.value}
                </div>
                <div className="text-xs text-gray-500">{kpi.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex-1 min-w-48">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="بحث برقم الطلب أو الموزع..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pr-9 text-sm h-9"
                />
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 h-9">
              <Download className="w-4 h-4" />
              تقرير شامل
            </Button>
          </div>

          {/* Reviews */}
          <div className="space-y-3">
            {filtered.map(review => (
              <ReviewCard
                key={review.id}
                review={review}
                onAddImprovement={text => {
                  if (review.dbId)
                    addImprovementMutation.mutate({
                      id: review.dbId,
                      improvement: text,
                    });
                }}
                onCloseReview={() => {
                  if (review.dbId)
                    updateStatusMutation.mutate({
                      id: review.dbId,
                      status: "reviewed",
                    });
                }}
              />
            ))}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
