// ============================================================
// KanbanBoard - لوحة Kanban لإدارة مراحل خط سير الطلبات
// Drag-and-drop between columns, quick actions, color-coded
// ============================================================
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, CheckCircle2, Layers, Package, Truck, XCircle,
  FileText, CreditCard, Users, ShoppingBag, Building2,
  ChevronRight, ChevronLeft, GripVertical, AlertCircle,
  ArrowRight, MoreVertical, Eye, MessageCircle, Filter,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types (re-declared locally for independence) ─────────────
type OrderChannel = "distributor" | "store" | "project";
type OrderStatus =
  | "pending" | "approved" | "in_production" | "ready"
  | "shipped" | "delivered" | "cancelled" | "quote_sent"
  | "payment_pending" | "payment_confirmed";

interface OrderItem {
  productName: string; sku: string; size: string;
  color: string; qty: number; unitPrice: number;
}
export interface KanbanOrder {
  id: string; channel: OrderChannel; status: OrderStatus;
  createdAt: string; updatedAt: string;
  customerName: string; customerPhone: string;
  customerCity: string; customerEmail?: string;
  distributorId?: string; distributorLevel?: string;
  paymentMethod?: string; paymentStatus?: string;
  trackingNumber?: string; projectName?: string;
  items: OrderItem[]; subtotal: number; discount: number;
  shipping: number; total: number; notes?: string; adminNotes?: string;
}

// ─── Kanban Columns (مراحل خط سير الطلب) ─────────────────────
interface KanbanColumn {
  id: OrderStatus | "payment_pending" | "payment_confirmed" | "quote_sent";
  label: string;
  labelEn: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  description: string;
  allowedChannels?: OrderChannel[];
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: "pending",
    label: "طلبات جديدة",
    labelEn: "New Orders",
    color: "#F59E0B",
    bg: "#FFFBEB",
    border: "#FDE68A",
    icon: <Clock className="w-4 h-4" />,
    description: "بانتظار المراجعة والموافقة",
  },
  {
    id: "approved",
    label: "موافق عليها",
    labelEn: "Approved",
    color: "#3B82F6",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    icon: <CheckCircle2 className="w-4 h-4" />,
    description: "تمت الموافقة، جاهزة للإنتاج",
  },
  {
    id: "in_production",
    label: "قيد الإنتاج",
    labelEn: "In Production",
    color: "#8B5CF6",
    bg: "#F5F3FF",
    border: "#DDD6FE",
    icon: <Layers className="w-4 h-4" />,
    description: "يجري تصنيعها في المصنع",
  },
  {
    id: "ready",
    label: "جاهز للشحن",
    labelEn: "Ready",
    color: "#06B6D4",
    bg: "#ECFEFF",
    border: "#A5F3FC",
    icon: <Package className="w-4 h-4" />,
    description: "اكتمل الإنتاج، ينتظر الشحن",
  },
  {
    id: "shipped",
    label: "تم الشحن",
    labelEn: "Shipped",
    color: "#6366F1",
    bg: "#EEF2FF",
    border: "#C7D2FE",
    icon: <Truck className="w-4 h-4" />,
    description: "في الطريق للعميل",
  },
  {
    id: "delivered",
    label: "تم التسليم",
    labelEn: "Delivered",
    color: "#10B981",
    bg: "#ECFDF5",
    border: "#A7F3D0",
    icon: <CheckCircle2 className="w-4 h-4" />,
    description: "وصل للعميل بنجاح",
  },
  {
    id: "cancelled",
    label: "ملغية",
    labelEn: "Cancelled",
    color: "#EF4444",
    bg: "#FEF2F2",
    border: "#FECACA",
    icon: <XCircle className="w-4 h-4" />,
    description: "طلبات تم إلغاؤها",
  },
];

// Next valid status transitions
const STATUS_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending:           ["approved", "cancelled"],
  approved:          ["in_production", "cancelled"],
  in_production:     ["ready", "cancelled"],
  ready:             ["shipped"],
  shipped:           ["delivered"],
  payment_pending:   ["payment_confirmed", "cancelled"],
  payment_confirmed: ["in_production"],
  quote_sent:        ["approved", "cancelled"],
};

const CHANNEL_ICON: Record<OrderChannel, React.ReactNode> = {
  distributor: <Users className="w-3 h-3" />,
  store:       <ShoppingBag className="w-3 h-3" />,
  project:     <Building2 className="w-3 h-3" />,
};
const CHANNEL_COLOR: Record<OrderChannel, string> = {
  distributor: "oklch(0.38 0.06 160)",
  store:       "#3B82F6",
  project:     "#8B5CF6",
};
const CHANNEL_LABEL: Record<OrderChannel, string> = {
  distributor: "موزع",
  store:       "متجر",
  project:     "مشروع",
};

// ─── KanbanCard ───────────────────────────────────────────────
function KanbanCard({
  order,
  onDragStart,
  onDragEnd,
  isDragging,
  onClick,
  onQuickMove,
  columnColor,
}: {
  order: KanbanOrder;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
  onClick: () => void;
  onQuickMove: (status: OrderStatus) => void;
  columnColor: string;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const nextStatuses = STATUS_TRANSITIONS[order.status] || [];
  const STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
    approved: "موافقة", in_production: "بدء الإنتاج", ready: "جاهز للشحن",
    shipped: "شحن", delivered: "تسليم", cancelled: "إلغاء",
    payment_confirmed: "تأكيد الدفع",
  };

  const urgency = (() => {
    const hrs = (Date.now() - new Date(order.createdAt).getTime()) / 3600000;
    if (order.status === "pending" && hrs > 24) return "high";
    if (order.status === "pending" && hrs > 8) return "medium";
    return "normal";
  })();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0, scale: isDragging ? 1.02 : 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative"
      style={{ borderTop: `3px solid ${columnColor}` }}
    >
      {/* Urgency indicator */}
      {urgency !== "normal" && (
        <div className={`absolute top-2 end-2 w-2 h-2 rounded-full animate-pulse ${urgency === "high" ? "bg-red-500" : "bg-amber-400"}`} />
      )}

      <div className="p-3 space-y-2.5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <GripVertical className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-xs font-mono font-bold text-gray-500 truncate">{order.id}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium"
              style={{ background: CHANNEL_COLOR[order.channel] + "18", color: CHANNEL_COLOR[order.channel] }}>
              {CHANNEL_ICON[order.channel]}
              {CHANNEL_LABEL[order.channel]}
            </span>
            <div className="relative">
              <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100">
                <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {showMenu && (
                <div className="absolute end-0 top-6 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[140px]"
                  onMouseLeave={() => setShowMenu(false)}>
                  <button onClick={() => { onClick(); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 text-gray-700">
                    <Eye className="w-3.5 h-3.5" /> عرض التفاصيل
                  </button>
                  {nextStatuses.map((s) => (
                    <button key={s} onClick={() => { onQuickMove(s); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 text-gray-700">
                      <ArrowRight className="w-3.5 h-3.5" />
                      {STATUS_LABELS[s] || s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Customer */}
        <div onClick={onClick} className="cursor-pointer">
          <p className="text-sm font-semibold text-gray-800 leading-tight truncate">{order.customerName}</p>
          <p className="text-xs text-gray-400 mt-0.5">{order.customerCity}</p>
        </div>

        {/* Items summary */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {order.items.slice(0, 2).map((item, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-100 truncate max-w-[120px]">
              {item.qty}× {item.productName}
            </span>
          ))}
          {order.items.length > 2 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-400">+{order.items.length - 2}</span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-50">
          <span className="text-sm font-bold" style={{ color: columnColor }}>
            {order.total.toLocaleString("ar-SA")} ر.س
          </span>
          <span className="text-xs text-gray-400">
            {new Date(order.createdAt).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
          </span>
        </div>

        {/* Quick move buttons */}
        {nextStatuses.length > 0 && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-0.5">
            {nextStatuses.filter(s => s !== "cancelled").map((s) => (
              <button key={s} onClick={() => onQuickMove(s)}
                className="flex-1 text-xs py-1 rounded-lg font-medium transition-colors"
                style={{ background: columnColor + "18", color: columnColor }}>
                {STATUS_LABELS[s] || s} ←
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── KanbanColumn ─────────────────────────────────────────────
function KanbanColumnComp({
  column,
  orders,
  onDrop,
  onCardClick,
  onQuickMove,
  draggingId,
  onDragStart,
  onDragEnd,
}: {
  column: KanbanColumn;
  orders: KanbanOrder[];
  onDrop: (status: OrderStatus) => void;
  onCardClick: (order: KanbanOrder) => void;
  onQuickMove: (orderId: string, status: OrderStatus) => void;
  draggingId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);

  return (
    <div
      className="flex flex-col min-w-[260px] max-w-[280px] flex-shrink-0 rounded-2xl transition-all"
      style={{ background: isDragOver ? column.bg : "#F8FAFC" }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragOver(false); onDrop(column.id as OrderStatus); }}
    >
      {/* Column Header */}
      <div className="p-3 rounded-t-2xl" style={{ background: column.bg, borderBottom: `2px solid ${column.border}` }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: column.color, color: "white" }}>
              {column.icon}
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight" style={{ color: column.color }}>{column.label}</h3>
              <p className="text-xs text-gray-400 leading-tight">{column.labelEn}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: column.color }}>
              {orders.length}
            </span>
          </div>
        </div>
        {orders.length > 0 && (
          <div className="text-xs font-medium mt-1" style={{ color: column.color + "CC" }}>
            {totalRevenue.toLocaleString("ar-SA")} ر.س
          </div>
        )}
        <p className="text-xs text-gray-400 mt-0.5">{column.description}</p>
      </div>

      {/* Drop Zone Indicator */}
      {isDragOver && (
        <div className="mx-3 mt-2 border-2 border-dashed rounded-xl p-3 text-center text-xs font-medium transition-all"
          style={{ borderColor: column.color, color: column.color, background: column.color + "10" }}>
          أفلت هنا للنقل إلى "{column.label}"
        </div>
      )}

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[120px]">
        <AnimatePresence>
          {orders.map((order) => (
            <KanbanCard
              key={order.id}
              order={order}
              isDragging={draggingId === order.id}
              onDragStart={() => onDragStart(order.id)}
              onDragEnd={onDragEnd}
              onClick={() => onCardClick(order)}
              onQuickMove={(s) => onQuickMove(order.id, s)}
              columnColor={column.color}
            />
          ))}
        </AnimatePresence>
        {orders.length === 0 && !isDragOver && (
          <div className="text-center py-8 text-gray-300">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">لا توجد طلبات</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main KanbanBoard ─────────────────────────────────────────
export default function KanbanBoard({
  orders,
  onUpdateStatus,
  onCardClick,
  activeChannel,
}: {
  orders: KanbanOrder[];
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onCardClick: (order: KanbanOrder) => void;
  activeChannel: OrderChannel | "all";
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [filterUrgent, setFilterUrgent] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter by channel + urgent
  const visibleOrders = orders.filter((o) => {
    const matchChannel = activeChannel === "all" || o.channel === activeChannel;
    if (!matchChannel) return false;
    if (filterUrgent) {
      const hrs = (Date.now() - new Date(o.createdAt).getTime()) / 3600000;
      return o.status === "pending" && hrs > 8;
    }
    return true;
  });

  const getColumnOrders = (colId: string) =>
    visibleOrders.filter((o) => o.status === colId);

  const handleDrop = (targetStatus: OrderStatus) => {
    if (!draggingId) return;
    const order = orders.find((o) => o.id === draggingId);
    if (!order || order.status === targetStatus) return;

    // Validate transition
    const allowed = STATUS_TRANSITIONS[order.status] || [];
    if (!allowed.includes(targetStatus)) {
      toast.error(`لا يمكن نقل الطلب مباشرةً من "${order.status}" إلى "${targetStatus}"`);
      return;
    }
    onUpdateStatus(draggingId, targetStatus);
    toast.success(`تم نقل الطلب ${draggingId} إلى "${KANBAN_COLUMNS.find(c => c.id === targetStatus)?.label}"`);
  };

  const handleQuickMove = (orderId: string, status: OrderStatus) => {
    onUpdateStatus(orderId, status);
    const col = KANBAN_COLUMNS.find(c => c.id === status);
    toast.success(`تم تحديث الطلب ${orderId} → ${col?.label}`);
  };

  // Stats summary
  const urgentCount = orders.filter((o) => {
    const hrs = (Date.now() - new Date(o.createdAt).getTime()) / 3600000;
    return o.status === "pending" && hrs > 8;
  }).length;

  const totalPending = orders.filter((o) => o.status === "pending").length;
  const totalInProd  = orders.filter((o) => o.status === "in_production").length;
  const totalReady   = orders.filter((o) => o.status === "ready").length;

  return (
    <div className="space-y-4">
      {/* Kanban Stats Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100">
          <Clock className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-medium text-amber-700">{totalPending} بانتظار الموافقة</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 border border-purple-100">
          <Layers className="w-4 h-4 text-purple-500" />
          <span className="text-xs font-medium text-purple-700">{totalInProd} قيد الإنتاج</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-50 border border-cyan-100">
          <Package className="w-4 h-4 text-cyan-500" />
          <span className="text-xs font-medium text-cyan-700">{totalReady} جاهز للشحن</span>
        </div>
        {urgentCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 animate-pulse">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-bold text-red-600">{urgentCount} طلب عاجل (أكثر من 8 ساعات)</span>
          </div>
        )}
        <div className="ms-auto flex items-center gap-2">
          <button
            onClick={() => setFilterUrgent(!filterUrgent)}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border font-medium transition-all ${filterUrgent ? "bg-red-50 border-red-200 text-red-600" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"}`}>
            <Filter className="w-3.5 h-3.5" />
            {filterUrgent ? "إظهار الكل" : "العاجلة فقط"}
          </button>
        </div>
      </div>

      {/* Kanban Hint */}
      <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
        <GripVertical className="w-3.5 h-3.5" />
        <span>اسحب البطاقات بين الأعمدة لتغيير مرحلة الطلب، أو استخدم أزرار الإجراء السريع عند التمرير على البطاقة</span>
      </div>

      {/* Columns Scroll Container */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-4 snap-x"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#E5E7EB transparent" }}
      >
        {KANBAN_COLUMNS.map((col) => (
          <div key={col.id} className="snap-start">
            <KanbanColumnComp
              column={col}
              orders={getColumnOrders(col.id)}
              onDrop={handleDrop}
              onCardClick={onCardClick}
              onQuickMove={handleQuickMove}
              draggingId={draggingId}
              onDragStart={setDraggingId}
              onDragEnd={() => setDraggingId(null)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
