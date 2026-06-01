// ============================================================
// AdminWorkflow - نظام سير العمل الكامل - سنديان للأبواب
// 15 مرحلة موزعة على 4 أقسام رئيسية
// Pre-Production → Pre-Operation → Post-Production → After Delivery
// ============================================================
import { useState, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardCheck,
  Search,
  FileText,
  Palette,
  Calendar,
  Package,
  ShieldCheck,
  Wrench,
  Eye,
  CheckSquare,
  Box,
  FileStack,
  Truck,
  DollarSign,
  Star,
  ChevronDown,
  ChevronUp,
  Plus,
  Filter,
  Download,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ArrowRight,
  Users,
  BarChart3,
  RefreshCw,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OrderWorkflowModal from "@/components/admin/OrderWorkflowModal";

// ─── أنواع البيانات ───────────────────────────────────────────
export type WorkflowStage =
  | "po_review"
  | "catalog_match"
  | "job_order_file"
  | "sample_approval"
  | "production_planning"
  | "material_procurement"
  | "incoming_qc"
  | "work_order"
  | "final_qc"
  | "po_matching"
  | "packing"
  | "delivery_docs"
  | "delivery"
  | "accounting_close"
  | "post_order_review";

export type StageStatus =
  | "pending"
  | "in_progress"
  | "done"
  | "blocked"
  | "skipped";

export interface WorkflowOrder {
  id: string;
  orderNumber: string;
  distributorName: string;
  distributorPhone: string;
  totalDoors: number;
  orderType: "standard" | "custom";
  createdAt: string;
  expectedDelivery: string;
  currentStage: WorkflowStage;
  stages: Record<
    WorkflowStage,
    {
      status: StageStatus;
      completedAt?: string;
      notes?: string;
      assignee?: string;
    }
  >;
  priority: "normal" | "urgent" | "vip";
  totalValue: number;
}

// ─── تعريف المراحل ───────────────────────────────────────────
export const WORKFLOW_PHASES = [
  {
    id: "pre_production",
    labelAr: "ما قبل الإنتاج",
    labelEn: "Pre-Production",
    color: "oklch(0.55 0.15 250)",
    bgColor: "oklch(0.95 0.03 250)",
    borderColor: "oklch(0.80 0.08 250)",
    stages: [
      {
        id: "po_review" as WorkflowStage,
        labelAr: "مراجعة أمر الشراء",
        labelEn: "PO Review",
        icon: <ClipboardCheck className="w-4 h-4" />,
        step: 1,
      },
      {
        id: "catalog_match" as WorkflowStage,
        labelAr: "مطابقة الكتالوج",
        labelEn: "Catalog Match",
        icon: <Search className="w-4 h-4" />,
        step: 2,
      },
      {
        id: "job_order_file" as WorkflowStage,
        labelAr: "ملف الطلب الفني",
        labelEn: "Job Order File",
        icon: <FileText className="w-4 h-4" />,
        step: 3,
      },
      {
        id: "sample_approval" as WorkflowStage,
        labelAr: "اعتماد العينة",
        labelEn: "Sample Approval",
        icon: <Palette className="w-4 h-4" />,
        step: 4,
      },
      {
        id: "production_planning" as WorkflowStage,
        labelAr: "تخطيط الإنتاج",
        labelEn: "Production Planning",
        icon: <Calendar className="w-4 h-4" />,
        step: 5,
      },
    ],
  },
  {
    id: "pre_operation",
    labelAr: "ما قبل التشغيل",
    labelEn: "Pre-Operation",
    color: "oklch(0.55 0.15 140)",
    bgColor: "oklch(0.95 0.03 140)",
    borderColor: "oklch(0.80 0.08 140)",
    stages: [
      {
        id: "material_procurement" as WorkflowStage,
        labelAr: "تأمين المواد الخام",
        labelEn: "Material Procurement",
        icon: <Package className="w-4 h-4" />,
        step: 6,
      },
      {
        id: "incoming_qc" as WorkflowStage,
        labelAr: "فحص المواد الداخلة",
        labelEn: "Incoming QC",
        icon: <ShieldCheck className="w-4 h-4" />,
        step: 7,
      },
      {
        id: "work_order" as WorkflowStage,
        labelAr: "أمر التشغيل الداخلي",
        labelEn: "Work Order",
        icon: <Wrench className="w-4 h-4" />,
        step: 8,
      },
    ],
  },
  {
    id: "post_production",
    labelAr: "ما بعد الإنتاج",
    labelEn: "Post-Production",
    color: "oklch(0.55 0.15 50)",
    bgColor: "oklch(0.97 0.03 50)",
    borderColor: "oklch(0.82 0.08 50)",
    stages: [
      {
        id: "final_qc" as WorkflowStage,
        labelAr: "الفحص النهائي",
        labelEn: "Final QC",
        icon: <Eye className="w-4 h-4" />,
        step: 9,
      },
      {
        id: "po_matching" as WorkflowStage,
        labelAr: "مطابقة أمر الشراء",
        labelEn: "PO Matching",
        icon: <CheckSquare className="w-4 h-4" />,
        step: 10,
      },
      {
        id: "packing" as WorkflowStage,
        labelAr: "التغليف",
        labelEn: "Packing",
        icon: <Box className="w-4 h-4" />,
        step: 11,
      },
      {
        id: "delivery_docs" as WorkflowStage,
        labelAr: "مستندات التسليم",
        labelEn: "Delivery Docs",
        icon: <FileStack className="w-4 h-4" />,
        step: 12,
      },
    ],
  },
  {
    id: "after_delivery",
    labelAr: "ما بعد التسليم",
    labelEn: "After Delivery",
    color: "oklch(0.55 0.15 330)",
    bgColor: "oklch(0.96 0.03 330)",
    borderColor: "oklch(0.82 0.08 330)",
    stages: [
      {
        id: "delivery" as WorkflowStage,
        labelAr: "التسليم والشحن",
        labelEn: "Delivery",
        icon: <Truck className="w-4 h-4" />,
        step: 13,
      },
      {
        id: "accounting_close" as WorkflowStage,
        labelAr: "الإغلاق المحاسبي",
        labelEn: "Accounting Close",
        icon: <DollarSign className="w-4 h-4" />,
        step: 14,
      },
      {
        id: "post_order_review" as WorkflowStage,
        labelAr: "تقييم الطلب",
        labelEn: "Post-Order Review",
        icon: <Star className="w-4 h-4" />,
        step: 15,
      },
    ],
  },
];

// ─── تحويل طلب DB إلى WorkflowOrder ──────────────────────────
function mapDbOrderToWorkflow(o: {
  id: number;
  customerName: string;
  customerPhone: string;
  totalDoors?: number | null;
  createdAt: number;
  expectedDelivery?: number | null;
  workflowStage?: string | null;
  workflowStagesData?: unknown;
  priority?: string | null;
  totalPrice: number;
}): WorkflowOrder {
  const stage = (o.workflowStage ?? "po_review") as WorkflowStage;
  const stages =
    (o.workflowStagesData as WorkflowOrder["stages"] | null) ??
    makeStages(stage);
  return {
    id: String(o.id),
    orderNumber: `SND-${String(o.id).padStart(4, "0")}`,
    distributorName: o.customerName,
    distributorPhone: o.customerPhone,
    totalDoors: o.totalDoors ?? 1,
    orderType: "standard",
    createdAt: new Date(o.createdAt).toISOString().split("T")[0],
    expectedDelivery: o.expectedDelivery
      ? new Date(o.expectedDelivery).toISOString().split("T")[0]
      : new Date(o.createdAt + 30 * 86_400_000).toISOString().split("T")[0],
    currentStage: stage,
    stages,
    priority: (o.priority ?? "normal") as WorkflowOrder["priority"],
    totalValue: o.totalPrice,
  };
}

// ─── بيانات تجريبية ───────────────────────────────────────────
function makeStages(currentStage: WorkflowStage): WorkflowOrder["stages"] {
  const allStages: WorkflowStage[] = [
    "po_review",
    "catalog_match",
    "job_order_file",
    "sample_approval",
    "production_planning",
    "material_procurement",
    "incoming_qc",
    "work_order",
    "final_qc",
    "po_matching",
    "packing",
    "delivery_docs",
    "delivery",
    "accounting_close",
    "post_order_review",
  ];
  const currentIdx = allStages.indexOf(currentStage);
  const result: Partial<WorkflowOrder["stages"]> = {};
  allStages.forEach((s, i) => {
    if (i < currentIdx)
      result[s] = { status: "done", completedAt: "2026-05-10" };
    else if (i === currentIdx) result[s] = { status: "in_progress" };
    else result[s] = { status: "pending" };
  });
  return result as WorkflowOrder["stages"];
}

const SAMPLE_ORDERS: WorkflowOrder[] = [
  {
    id: "WF-001",
    orderNumber: "ORD-2026-0451",
    distributorName: "شركة الأفق للمقاولات",
    distributorPhone: "0501234567",
    totalDoors: 48,
    orderType: "custom",
    createdAt: "2026-05-01",
    expectedDelivery: "2026-05-28",
    currentStage: "sample_approval",
    stages: makeStages("sample_approval"),
    priority: "urgent",
    totalValue: 86400,
  },
  {
    id: "WF-002",
    orderNumber: "ORD-2026-0452",
    distributorName: "مؤسسة النخبة للتوريدات",
    distributorPhone: "0559876543",
    totalDoors: 24,
    orderType: "standard",
    createdAt: "2026-05-03",
    expectedDelivery: "2026-05-25",
    currentStage: "work_order",
    stages: makeStages("work_order"),
    priority: "normal",
    totalValue: 43200,
  },
  {
    id: "WF-003",
    orderNumber: "ORD-2026-0453",
    distributorName: "مجموعة الراشد العقارية",
    distributorPhone: "0566543210",
    totalDoors: 120,
    orderType: "custom",
    createdAt: "2026-04-28",
    expectedDelivery: "2026-06-10",
    currentStage: "final_qc",
    stages: makeStages("final_qc"),
    priority: "vip",
    totalValue: 216000,
  },
  {
    id: "WF-004",
    orderNumber: "ORD-2026-0454",
    distributorName: "شركة البناء الحديث",
    distributorPhone: "0512345678",
    totalDoors: 36,
    orderType: "standard",
    createdAt: "2026-05-05",
    expectedDelivery: "2026-05-30",
    currentStage: "po_review",
    stages: makeStages("po_review"),
    priority: "normal",
    totalValue: 64800,
  },
  {
    id: "WF-005",
    orderNumber: "ORD-2026-0455",
    distributorName: "مؤسسة الإتقان للمقاولات",
    distributorPhone: "0534567890",
    totalDoors: 60,
    orderType: "custom",
    createdAt: "2026-04-25",
    expectedDelivery: "2026-05-22",
    currentStage: "delivery",
    stages: makeStages("delivery"),
    priority: "urgent",
    totalValue: 108000,
  },
  {
    id: "WF-006",
    orderNumber: "ORD-2026-0456",
    distributorName: "شركة الديار للتطوير",
    distributorPhone: "0545678901",
    totalDoors: 18,
    orderType: "standard",
    createdAt: "2026-05-07",
    expectedDelivery: "2026-06-01",
    currentStage: "catalog_match",
    stages: makeStages("catalog_match"),
    priority: "normal",
    totalValue: 32400,
  },
  {
    id: "WF-007",
    orderNumber: "ORD-2026-0457",
    distributorName: "مجموعة الأمل العقارية",
    distributorPhone: "0556789012",
    totalDoors: 80,
    orderType: "custom",
    createdAt: "2026-04-20",
    expectedDelivery: "2026-05-20",
    currentStage: "post_order_review",
    stages: makeStages("post_order_review"),
    priority: "vip",
    totalValue: 144000,
  },
];

// ─── مساعدات ─────────────────────────────────────────────────
function getStageLabel(stageId: WorkflowStage): string {
  for (const phase of WORKFLOW_PHASES) {
    const s = phase.stages.find(s => s.id === stageId);
    if (s) return s.labelAr;
  }
  return stageId;
}

function getPhaseForStage(stageId: WorkflowStage) {
  return WORKFLOW_PHASES.find(p => p.stages.some(s => s.id === stageId));
}

function getStageProgress(stages: WorkflowOrder["stages"]): number {
  const all = Object.values(stages);
  const done = all.filter(s => s.status === "done").length;
  return Math.round((done / all.length) * 100);
}

function getPriorityBadge(priority: WorkflowOrder["priority"]) {
  if (priority === "urgent")
    return (
      <Badge
        className="text-xs"
        style={{
          background: "oklch(0.92 0.15 25)",
          color: "oklch(0.40 0.15 25)",
        }}
      >
        عاجل
      </Badge>
    );
  if (priority === "vip")
    return (
      <Badge
        className="text-xs"
        style={{
          background: "oklch(0.92 0.12 60)",
          color: "oklch(0.40 0.12 60)",
        }}
      >
        VIP
      </Badge>
    );
  return (
    <Badge variant="secondary" className="text-xs">
      عادي
    </Badge>
  );
}

function getStatusIcon(status: StageStatus) {
  if (status === "done")
    return (
      <CheckCircle2
        className="w-3.5 h-3.5"
        style={{ color: "oklch(0.55 0.15 140)" }}
      />
    );
  if (status === "in_progress")
    return (
      <RefreshCw
        className="w-3.5 h-3.5 animate-spin"
        style={{ color: "oklch(0.55 0.15 250)" }}
      />
    );
  if (status === "blocked")
    return (
      <AlertTriangle
        className="w-3.5 h-3.5"
        style={{ color: "oklch(0.55 0.15 25)" }}
      />
    );
  return <Circle className="w-3.5 h-3.5 text-gray-300" />;
}

// ─── مكوّن بطاقة الطلب ───────────────────────────────────────
function OrderCard({
  order,
  onClick,
}: {
  order: WorkflowOrder;
  onClick: () => void;
}) {
  const phase = getPhaseForStage(order.currentStage);
  const progress = getStageProgress(order.stages);
  const daysLeft = Math.ceil(
    (new Date(order.expectedDelivery).getTime() - Date.now()) / 86400000
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all cursor-pointer group"
      style={{ borderRight: `3px solid ${phase?.color}` }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-sm text-gray-900">
              {order.orderNumber}
            </span>
            {getPriorityBadge(order.priority)}
            {order.orderType === "custom" && (
              <Badge
                variant="outline"
                className="text-xs border-purple-200 text-purple-700"
              >
                مخصص
              </Badge>
            )}
          </div>
          <div className="text-xs text-gray-500">{order.distributorName}</div>
        </div>
        <div className="text-left flex-shrink-0">
          <div className="text-sm font-bold text-gray-900">
            {order.totalDoors} باب
          </div>
          <div className="text-xs text-gray-400">
            {order.totalValue.toLocaleString()} ر.س
          </div>
        </div>
      </div>

      {/* Current Stage */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3"
        style={{ background: phase?.bgColor }}
      >
        <span style={{ color: phase?.color }}>
          {
            WORKFLOW_PHASES.flatMap(p => p.stages).find(
              s => s.id === order.currentStage
            )?.icon
          }
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-gray-700 truncate">
            {getStageLabel(order.currentStage)}
          </div>
          <div className="text-xs text-gray-400">{phase?.labelAr}</div>
        </div>
        <RefreshCw
          className="w-3.5 h-3.5 animate-spin flex-shrink-0"
          style={{ color: phase?.color }}
        />
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">التقدم الكلي</span>
          <span className="text-xs font-bold text-gray-700">{progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: phase?.color }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Mini Stage Timeline */}
      <div className="flex items-center gap-1 mb-3 overflow-hidden">
        {WORKFLOW_PHASES.flatMap(p => p.stages).map(s => {
          const st = order.stages[s.id];
          return (
            <div
              key={s.id}
              className="flex-1 h-1 rounded-full"
              style={{
                background:
                  st.status === "done"
                    ? "oklch(0.55 0.15 140)"
                    : st.status === "in_progress"
                      ? "oklch(0.55 0.15 250)"
                      : st.status === "blocked"
                        ? "oklch(0.55 0.15 25)"
                        : "#E5E7EB",
              }}
            />
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span
            className={
              daysLeft < 3
                ? "text-red-500 font-semibold"
                : daysLeft < 7
                  ? "text-amber-500"
                  : ""
            }
          >
            {daysLeft > 0
              ? `${daysLeft} يوم متبقي`
              : daysLeft === 0
                ? "اليوم"
                : `تأخر ${Math.abs(daysLeft)} يوم`}
          </span>
        </div>
        <button
          className="flex items-center gap-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: "oklch(0.45 0.10 160)" }}
        >
          تفاصيل <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── مكوّن عمود المرحلة (Kanban) ─────────────────────────────
function StageColumn({
  stage,
  phaseColor,
  orders,
  onOrderClick,
}: {
  stage: (typeof WORKFLOW_PHASES)[0]["stages"][0];
  phaseColor: string;
  orders: WorkflowOrder[];
  onOrderClick: (o: WorkflowOrder) => void;
}) {
  return (
    <div className="flex-shrink-0 w-72">
      {/* Column Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3"
        style={{ background: `${phaseColor}15` }}
      >
        <span style={{ color: phaseColor }}>{stage.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-gray-800 truncate">
            {stage.labelAr}
          </div>
          <div className="text-xs text-gray-400">{stage.labelEn}</div>
        </div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: phaseColor, color: "white" }}
        >
          {orders.length}
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-2 min-h-24">
        {orders.length === 0 ? (
          <div className="flex items-center justify-center h-20 rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-400">
            لا توجد طلبات
          </div>
        ) : (
          orders.map(o => (
            <OrderCard key={o.id} order={o} onClick={() => onOrderClick(o)} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── الصفحة الرئيسية ─────────────────────────────────────────
export default function AdminWorkflow() {
  const [view, setView] = useState<"kanban" | "list" | "phase">("phase");
  const [filterPhase, setFilterPhase] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<WorkflowOrder | null>(
    null
  );
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(
    new Set([
      "pre_production",
      "pre_operation",
      "post_production",
      "after_delivery",
    ])
  );

  // ── DB data ──
  const {
    data: dbOrders,
    isLoading,
    refetch,
  } = trpc.orders.list.useQuery(undefined, {
    refetchInterval: false,
  });
  const updateStageMutation = trpc.orders.updateWorkflowStage.useMutation({
    onSuccess: () => refetch(),
  });
  const orders = useMemo(
    () => (dbOrders ?? []).map(mapDbOrderToWorkflow),
    [dbOrders]
  );

  const filtered = orders.filter(o => {
    if (
      search &&
      !o.orderNumber.includes(search) &&
      !o.distributorName.includes(search)
    )
      return false;
    if (filterPriority !== "all" && o.priority !== filterPriority) return false;
    if (filterPhase !== "all") {
      const phase = getPhaseForStage(o.currentStage);
      if (phase?.id !== filterPhase) return false;
    }
    return true;
  });

  // KPIs
  const kpis = [
    {
      label: "إجمالي الطلبات النشطة",
      value: orders.length,
      icon: <BarChart3 className="w-5 h-5" />,
      color: "oklch(0.55 0.15 250)",
    },
    {
      label: "في مرحلة ما قبل الإنتاج",
      value: orders.filter(o =>
        [
          "po_review",
          "catalog_match",
          "job_order_file",
          "sample_approval",
          "production_planning",
        ].includes(o.currentStage)
      ).length,
      icon: <ClipboardCheck className="w-5 h-5" />,
      color: "oklch(0.55 0.15 250)",
    },
    {
      label: "في مرحلة الإنتاج",
      value: orders.filter(o =>
        ["material_procurement", "incoming_qc", "work_order"].includes(
          o.currentStage
        )
      ).length,
      icon: <Wrench className="w-5 h-5" />,
      color: "oklch(0.55 0.15 140)",
    },
    {
      label: "في مرحلة التسليم",
      value: orders.filter(o =>
        ["delivery", "accounting_close", "post_order_review"].includes(
          o.currentStage
        )
      ).length,
      icon: <Truck className="w-5 h-5" />,
      color: "oklch(0.55 0.15 330)",
    },
    {
      label: "طلبات عاجلة",
      value: orders.filter(o => o.priority === "urgent").length,
      icon: <Zap className="w-5 h-5" />,
      color: "oklch(0.55 0.15 25)",
    },
  ];

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  return (
    <AdminLayout
      title="سير العمل"
      subtitle="تتبع الطلبات عبر 15 مرحلة من استلام PO حتى ما بعد التسليم"
    >
      {isLoading && (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> جاري تحميل الطلبات...
        </div>
      )}
      {!isLoading && orders.length === 0 && (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
          لا توجد طلبات في قاعدة البيانات
        </div>
      )}
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {kpis.map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-4 border border-gray-100"
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="p-1.5 rounded-lg"
                style={{ background: `${kpi.color}15`, color: kpi.color }}
              >
                {kpi.icon}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-0.5">
              {kpi.value}
            </div>
            <div className="text-xs text-gray-500 leading-tight">
              {kpi.label}
            </div>
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

        {/* Phase Filter */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1">
          {[
            { id: "all", label: "الكل" },
            ...WORKFLOW_PHASES.map(p => ({ id: p.id, label: p.labelAr })),
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterPhase(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterPhase === f.id ? "text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              style={
                filterPhase === f.id
                  ? { background: "oklch(0.38 0.06 160)" }
                  : {}
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Priority Filter */}
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          className="h-9 px-3 text-sm border border-gray-200 rounded-xl bg-white text-gray-700"
        >
          <option value="all">كل الأولويات</option>
          <option value="urgent">عاجل</option>
          <option value="vip">VIP</option>
          <option value="normal">عادي</option>
        </select>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1">
          {[
            {
              id: "phase",
              label: "أقسام",
              icon: <Layers className="w-3.5 h-3.5" />,
            },
            {
              id: "kanban",
              label: "Kanban",
              icon: <Filter className="w-3.5 h-3.5" />,
            },
            {
              id: "list",
              label: "قائمة",
              icon: <BarChart3 className="w-3.5 h-3.5" />,
            },
          ].map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id as typeof view)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === v.id ? "text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              style={
                view === v.id ? { background: "oklch(0.38 0.06 160)" } : {}
              }
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>

        <Button variant="outline" size="sm" className="gap-1.5 h-9">
          <Download className="w-4 h-4" />
          تصدير
        </Button>
        <Button
          size="sm"
          className="gap-1.5 h-9"
          style={{ background: "oklch(0.38 0.06 160)" }}
        >
          <Plus className="w-4 h-4" />
          طلب جديد
        </Button>
      </div>

      {/* ─── عرض الأقسام ─── */}
      {view === "phase" && (
        <div className="space-y-4">
          {WORKFLOW_PHASES.map(phase => {
            const phaseOrders = filtered.filter(o =>
              phase.stages.some(s => s.id === o.currentStage)
            );
            const isExpanded = expandedPhases.has(phase.id);
            return (
              <motion.div
                key={phase.id}
                layout
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              >
                {/* Phase Header */}
                <button
                  onClick={() => togglePhase(phase.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: phase.color }}
                  />
                  <div className="flex-1 text-right">
                    <div className="font-bold text-gray-900">
                      {phase.labelAr}
                    </div>
                    <div className="text-xs text-gray-400">
                      {phase.labelEn} · {phase.stages.length} مراحل
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-sm font-bold px-3 py-1 rounded-full"
                      style={{
                        background: `${phase.color}15`,
                        color: phase.color,
                      }}
                    >
                      {phaseOrders.length} طلب
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Phase Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-5 pb-5">
                        {/* Stage Steps */}
                        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                          {phase.stages.map((s, idx) => (
                            <div
                              key={s.id}
                              className="flex items-center gap-2 flex-shrink-0"
                            >
                              <div
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium"
                                style={{
                                  background: `${phase.color}12`,
                                  color: phase.color,
                                }}
                              >
                                <span className="font-bold">{s.step}</span>
                                {s.icon}
                                <span>{s.labelAr}</span>
                              </div>
                              {idx < phase.stages.length - 1 && (
                                <ArrowRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Orders in this phase */}
                        {phaseOrders.length === 0 ? (
                          <div className="flex items-center justify-center h-20 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400">
                            لا توجد طلبات في هذا القسم حالياً
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {phaseOrders.map(o => (
                              <OrderCard
                                key={o.id}
                                order={o}
                                onClick={() => setSelectedOrder(o)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ─── عرض Kanban ─── */}
      {view === "kanban" && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {WORKFLOW_PHASES.map(phase => (
              <div key={phase.id} className="flex-shrink-0">
                {/* Phase Label */}
                <div
                  className="flex items-center gap-2 px-4 py-2 rounded-xl mb-3 text-sm font-bold"
                  style={{ background: `${phase.color}15`, color: phase.color }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: phase.color }}
                  />
                  {phase.labelAr}
                </div>
                {/* Stage Columns */}
                <div className="flex gap-3">
                  {phase.stages.map(stage => (
                    <StageColumn
                      key={stage.id}
                      stage={stage}
                      phaseColor={phase.color}
                      orders={filtered.filter(o => o.currentStage === stage.id)}
                      onOrderClick={setSelectedOrder}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── عرض القائمة ─── */}
      {view === "list" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
                  رقم الطلب
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
                  الموزع
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
                  الأبواب
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
                  المرحلة الحالية
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
                  القسم
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
                  التقدم
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
                  الأولوية
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
                  التسليم
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o, i) => {
                const phase = getPhaseForStage(o.currentStage);
                const progress = getStageProgress(o.stages);
                const daysLeft = Math.ceil(
                  (new Date(o.expectedDelivery).getTime() - Date.now()) /
                    86400000
                );
                return (
                  <motion.tr
                    key={o.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedOrder(o)}
                  >
                    <td className="px-4 py-3 font-bold text-gray-900">
                      {o.orderNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {o.distributorName}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{o.totalDoors}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span style={{ color: phase?.color }}>
                          {
                            WORKFLOW_PHASES.flatMap(p => p.stages).find(
                              s => s.id === o.currentStage
                            )?.icon
                          }
                        </span>
                        <span className="text-xs text-gray-700">
                          {getStageLabel(o.currentStage)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-1 rounded-lg font-medium"
                        style={{
                          background: `${phase?.color}15`,
                          color: phase?.color,
                        }}
                      >
                        {phase?.labelAr}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${progress}%`,
                              background: phase?.color,
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {progress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getPriorityBadge(o.priority)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium ${daysLeft < 3 ? "text-red-500" : daysLeft < 7 ? "text-amber-500" : "text-gray-500"}`}
                      >
                        {daysLeft > 0
                          ? `${daysLeft} يوم`
                          : daysLeft === 0
                            ? "اليوم"
                            : `تأخر ${Math.abs(daysLeft)}ي`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-xs text-blue-600 hover:underline">
                        تفاصيل
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {selectedOrder && (
        <OrderWorkflowModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdate={(updated: WorkflowOrder) => {
            setSelectedOrder(updated);
            // حفظ التغييرات في DB
            updateStageMutation.mutate({
              id: Number(updated.id),
              workflowStage: updated.currentStage,
              workflowStagesData: updated.stages as Record<
                string,
                {
                  status:
                    | "pending"
                    | "in_progress"
                    | "done"
                    | "blocked"
                    | "skipped";
                  completedAt?: string;
                  notes?: string;
                  assignee?: string;
                }
              >,
            });
          }}
        />
      )}
    </AdminLayout>
  );
}

// Missing import fix
function Layers(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
