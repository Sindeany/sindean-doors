// ============================================================
// AdminInventory - نظام إدارة المخزون - سنديان للأبواب
// تتبع المواد الخام: WPC، أفلام، إطارات، إكسسوارات، تغليف
// ============================================================
import { useState, useMemo, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Plus, Search, Filter, AlertTriangle,
  TrendingDown, TrendingUp, CheckCircle2, RefreshCw,
  ArrowDownToLine, ArrowUpFromLine, BarChart3, Layers,
  Boxes, Tag, Calendar, Hash, Eye, Edit3, Trash2,
  ChevronDown, X, Download, Upload, ClipboardList,
  ShieldAlert, Clock, Warehouse, Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import InventoryItemModal from "@/components/admin/InventoryItemModal";
import InventoryFormModal from "@/components/admin/InventoryFormModal";
import InventoryTransactionModal from "@/components/admin/InventoryTransactionModal";

// ─── أنواع البيانات ───────────────────────────────────────────
export type MaterialCategory =
  | "wpc_board"
  | "film"
  | "edge"
  | "frame"
  | "lock"
  | "hinge"
  | "accessory"
  | "packaging"
  | "chemical";

export type MaterialUnit = "لوح" | "متر" | "كيلو" | "علبة" | "طقم" | "قطعة" | "رول" | "لتر";
export type StockStatus = "in_stock" | "low_stock" | "critical" | "out_of_stock";

export interface InventoryTransaction {
  id: string;
  type: "receive" | "consume" | "adjust" | "return" | "transfer";
  quantity: number;
  balanceBefore: number;
  balanceAfter: number;
  reference: string;
  note?: string;
  performedBy: string;
  date: string;
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  category: MaterialCategory;
  unit: MaterialUnit;
  currentQty: number;
  minQty: number;
  maxQty: number;
  reorderQty: number;
  unitCost: number;
  supplier: string;
  supplierPhone?: string;
  location: string;
  lastReceived?: string;
  lastConsumed?: string;
  status: StockStatus;
  transactions: InventoryTransaction[];
  notes?: string;
}

// ─── إعدادات الفئات ───────────────────────────────────────────
export const CATEGORIES: Record<MaterialCategory, { label: string; color: string; icon: string }> = {
  wpc_board:  { label: "ألواح WPC",     color: "oklch(0.40 0.12 140)", icon: "🪵" },
  film:       { label: "أفلام تغليف",   color: "oklch(0.45 0.15 260)", icon: "🎞️" },
  edge:       { label: "حواف ABS",      color: "oklch(0.45 0.14 30)",  icon: "📏" },
  frame:      { label: "إطارات MDF",    color: "oklch(0.40 0.10 80)",  icon: "🖼️" },
  lock:       { label: "أقفال",         color: "oklch(0.35 0.08 220)", icon: "🔒" },
  hinge:      { label: "مفصلات",        color: "oklch(0.40 0.06 200)", icon: "🔧" },
  accessory:  { label: "إكسسوارات",     color: "oklch(0.45 0.12 300)", icon: "⚙️" },
  packaging:  { label: "مواد تغليف",    color: "oklch(0.45 0.08 60)",  icon: "📦" },
  chemical:   { label: "مواد كيميائية", color: "oklch(0.40 0.14 20)",  icon: "🧪" },
};

export const STATUS_CONFIG: Record<StockStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  in_stock:     { label: "متوفر",       color: "#059669", bg: "#ECFDF5", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  low_stock:    { label: "منخفض",       color: "#D97706", bg: "#FFFBEB", icon: <TrendingDown className="w-3.5 h-3.5" /> },
  critical:     { label: "حرج",         color: "#DC2626", bg: "#FEF2F2", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  out_of_stock: { label: "نفد المخزون", color: "#7C3AED", bg: "#F5F3FF", icon: <X className="w-3.5 h-3.5" /> },
};

// ─── بيانات تجريبية ───────────────────────────────────────────
const INITIAL_ITEMS: InventoryItem[] = [
  {
    id: "INV-001", code: "WPC-45-WHT", name: "لوح WPC 45mm أبيض مطفي",
    nameEn: "WPC Board 45mm White Matt", category: "wpc_board",
    unit: "لوح", currentQty: 320, minQty: 100, maxQty: 600, reorderQty: 200,
    unitCost: 85, supplier: "شركة البلاستيك المتحدة", supplierPhone: "0501234567",
    location: "مستودع A - رف 1", lastReceived: "2026-05-10", lastConsumed: "2026-05-17",
    status: "in_stock",
    transactions: [
      { id: "T1", type: "receive",  quantity: 200, balanceBefore: 120, balanceAfter: 320, reference: "PO-2026-0044", performedBy: "م. أحمد", date: "2026-05-10" },
      { id: "T2", type: "consume",  quantity: 48,  balanceBefore: 368, balanceAfter: 320, reference: "WO-2026-0101", performedBy: "خط الأبواب", date: "2026-05-17", note: "طلب شركة الإتقان" },
    ],
  },
  {
    id: "INV-002", code: "WPC-55-BEG", name: "لوح WPC 55mm بيج رملي",
    nameEn: "WPC Board 55mm Beige Sand", category: "wpc_board",
    unit: "لوح", currentQty: 78, minQty: 80, maxQty: 400, reorderQty: 150,
    unitCost: 95, supplier: "شركة البلاستيك المتحدة", supplierPhone: "0501234567",
    location: "مستودع A - رف 2", lastReceived: "2026-04-28", lastConsumed: "2026-05-15",
    status: "low_stock",
    transactions: [
      { id: "T3", type: "receive",  quantity: 150, balanceBefore: 0,   balanceAfter: 150, reference: "PO-2026-0038", performedBy: "م. أحمد", date: "2026-04-28" },
      { id: "T4", type: "consume",  quantity: 72,  balanceBefore: 150, balanceAfter: 78,  reference: "WO-2026-0098", performedBy: "خط الأبواب", date: "2026-05-15" },
    ],
  },
  {
    id: "INV-003", code: "FILM-WHT-50", name: "فيلم PVC أبيض مطفي 50 ميكرون",
    nameEn: "PVC Film White Matt 50 Micron", category: "film",
    unit: "رول", currentQty: 12, minQty: 15, maxQty: 60, reorderQty: 20,
    unitCost: 420, supplier: "مصنع الأفلام الخليجي", supplierPhone: "0556789012",
    location: "مستودع B - رف 1", lastReceived: "2026-04-20", lastConsumed: "2026-05-16",
    status: "critical",
    transactions: [
      { id: "T5", type: "receive",  quantity: 30, balanceBefore: 0,  balanceAfter: 30, reference: "PO-2026-0031", performedBy: "م. سالم", date: "2026-04-20" },
      { id: "T6", type: "consume",  quantity: 18, balanceBefore: 30, balanceAfter: 12, reference: "WO-2026-0095", performedBy: "خط الأبواب", date: "2026-05-16" },
    ],
  },
  {
    id: "INV-004", code: "ABS-WHT-2MM", name: "حافة ABS أبيض 2mm",
    nameEn: "ABS Edge White 2mm", category: "edge",
    unit: "متر", currentQty: 2400, minQty: 500, maxQty: 5000, reorderQty: 1500,
    unitCost: 3.5, supplier: "شركة الحواف السعودية", supplierPhone: "0512345678",
    location: "مستودع B - رف 3", lastReceived: "2026-05-05", lastConsumed: "2026-05-17",
    status: "in_stock",
    transactions: [
      { id: "T7", type: "receive",  quantity: 2000, balanceBefore: 400,  balanceAfter: 2400, reference: "PO-2026-0040", performedBy: "م. سالم", date: "2026-05-05" },
      { id: "T8", type: "consume",  quantity: 192,  balanceBefore: 2592, balanceAfter: 2400, reference: "WO-2026-0101", performedBy: "خط الأبواب", date: "2026-05-17" },
    ],
  },
  {
    id: "INV-005", code: "MDF-45-WHT", name: "إطار MDF 45mm أبيض مطفي",
    nameEn: "MDF Frame 45mm White Matt", category: "frame",
    unit: "قطعة", currentQty: 0, minQty: 50, maxQty: 300, reorderQty: 100,
    unitCost: 45, supplier: "مصنع الإطارات الوطني", supplierPhone: "0523456789",
    location: "مستودع C - رف 1", lastReceived: "2026-04-15", lastConsumed: "2026-05-12",
    status: "out_of_stock",
    transactions: [
      { id: "T9",  type: "receive",  quantity: 100, balanceBefore: 0,   balanceAfter: 100, reference: "PO-2026-0025", performedBy: "م. أحمد", date: "2026-04-15" },
      { id: "T10", type: "consume",  quantity: 100, balanceBefore: 100, balanceAfter: 0,   reference: "WO-2026-0099", performedBy: "خط الإطارات", date: "2026-05-12" },
    ],
  },
  {
    id: "INV-006", code: "LCK-MORT-3PT", name: "قفل Mortise 3 نقاط",
    nameEn: "Mortise Lock 3-Point", category: "lock",
    unit: "طقم", currentQty: 185, minQty: 50, maxQty: 400, reorderQty: 100,
    unitCost: 65, supplier: "شركة الأقفال المتطورة", supplierPhone: "0534567890",
    location: "مستودع D - خزانة 1", lastReceived: "2026-05-01", lastConsumed: "2026-05-14",
    status: "in_stock",
    transactions: [
      { id: "T11", type: "receive",  quantity: 200, balanceBefore: 33,  balanceAfter: 233, reference: "PO-2026-0035", performedBy: "م. سالم", date: "2026-05-01" },
      { id: "T12", type: "consume",  quantity: 48,  balanceBefore: 233, balanceAfter: 185, reference: "WO-2026-0101", performedBy: "قسم الإكسسوارات", date: "2026-05-14" },
    ],
  },
  {
    id: "INV-007", code: "HNG-HIDN-4", name: "مفصلة مخفية 4 بوصة",
    nameEn: "Hidden Hinge 4 Inch", category: "hinge",
    unit: "قطعة", currentQty: 540, minQty: 100, maxQty: 1000, reorderQty: 300,
    unitCost: 18, supplier: "شركة الأقفال المتطورة", supplierPhone: "0534567890",
    location: "مستودع D - خزانة 2", lastReceived: "2026-05-01", lastConsumed: "2026-05-14",
    status: "in_stock",
    transactions: [
      { id: "T13", type: "receive",  quantity: 500, balanceBefore: 184, balanceAfter: 684, reference: "PO-2026-0035", performedBy: "م. سالم", date: "2026-05-01" },
      { id: "T14", type: "consume",  quantity: 144, balanceBefore: 684, balanceAfter: 540, reference: "WO-2026-0101", performedBy: "قسم الإكسسوارات", date: "2026-05-14" },
    ],
  },
  {
    id: "INV-008", code: "PKG-FOAM-STD", name: "فوم تغليف قياسي",
    nameEn: "Standard Packing Foam", category: "packaging",
    unit: "قطعة", currentQty: 420, minQty: 200, maxQty: 1000, reorderQty: 400,
    unitCost: 8, supplier: "شركة التغليف الذهبي", supplierPhone: "0545678901",
    location: "مستودع E", lastReceived: "2026-05-08", lastConsumed: "2026-05-16",
    status: "in_stock",
    transactions: [
      { id: "T15", type: "receive",  quantity: 500, balanceBefore: 0,   balanceAfter: 500, reference: "PO-2026-0042", performedBy: "م. سالم", date: "2026-05-08" },
      { id: "T16", type: "consume",  quantity: 80,  balanceBefore: 500, balanceAfter: 420, reference: "WO-2026-0101", performedBy: "قسم التغليف", date: "2026-05-16" },
    ],
  },
  {
    id: "INV-009", code: "FILM-BRZ-50", name: "فيلم PVC برونزي 50 ميكرون",
    nameEn: "PVC Film Bronze 50 Micron", category: "film",
    unit: "رول", currentQty: 8, minQty: 10, maxQty: 40, reorderQty: 15,
    unitCost: 450, supplier: "مصنع الأفلام الخليجي", supplierPhone: "0556789012",
    location: "مستودع B - رف 2", lastReceived: "2026-04-18", lastConsumed: "2026-05-10",
    status: "critical",
    transactions: [
      { id: "T17", type: "receive",  quantity: 20, balanceBefore: 0,  balanceAfter: 20, reference: "PO-2026-0029", performedBy: "م. أحمد", date: "2026-04-18" },
      { id: "T18", type: "consume",  quantity: 12, balanceBefore: 20, balanceAfter: 8,  reference: "WO-2026-0097", performedBy: "خط الأبواب", date: "2026-05-10" },
    ],
  },
  {
    id: "INV-010", code: "GLUE-PVC-5L", name: "غراء PVC 5 لتر",
    nameEn: "PVC Glue 5L", category: "chemical",
    unit: "علبة", currentQty: 24, minQty: 10, maxQty: 80, reorderQty: 30,
    unitCost: 55, supplier: "شركة الكيماويات الصناعية", supplierPhone: "0567890123",
    location: "مستودع F", lastReceived: "2026-05-03", lastConsumed: "2026-05-15",
    status: "in_stock",
    transactions: [
      { id: "T19", type: "receive",  quantity: 30, balanceBefore: 0,  balanceAfter: 30, reference: "PO-2026-0037", performedBy: "م. سالم", date: "2026-05-03" },
      { id: "T20", type: "consume",  quantity: 6,  balanceBefore: 30, balanceAfter: 24, reference: "WO-2026-0100", performedBy: "خط الأبواب", date: "2026-05-15" },
    ],
  },
];

// ─── حساب حالة المخزون ────────────────────────────────────────
function calcStatus(item: InventoryItem): StockStatus {
  if (item.currentQty === 0) return "out_of_stock";
  if (item.currentQty <= item.minQty * 0.5) return "critical";
  if (item.currentQty <= item.minQty) return "low_stock";
  return "in_stock";
}

// ─── الصفحة الرئيسية ──────────────────────────────────────────
export default function AdminInventory() {
  const { lang } = useLanguage();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<MaterialCategory | "all">("all");
  const [filterStatus, setFilterStatus] = useState<StockStatus | "all">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [formItem, setFormItem] = useState<InventoryItem | null | "new">(null);
  const [txItem, setTxItem] = useState<{ item: InventoryItem; type: "receive" | "consume" | "adjust" } | null>(null);

  // ─── tRPC ─────────────────────────────────────────────────────
  const { data: dbItems, isLoading, refetch } = trpc.inventory.list.useQuery(undefined, { refetchInterval: 60_000 });
  const utils = trpc.useUtils();
  const invalidate = () => utils.inventory.list.invalidate();

  const createMutation  = trpc.inventory.create.useMutation({ onSuccess: invalidate });
  const updateMutation  = trpc.inventory.update.useMutation({ onSuccess: invalidate });
  const deleteMutation  = trpc.inventory.delete.useMutation({ onSuccess: invalidate });
  const txMutation      = trpc.inventory.addTransaction.useMutation({ onSuccess: invalidate });
  const seedMutation    = trpc.inventory.seed.useMutation({ onSuccess: () => { toast.success("تم تحميل البيانات التجريبية"); invalidate(); } });

  // مزامنة بيانات DB مع state والـ localStorage (للتوافق مع CreateWorkOrderWizard)
  useEffect(() => {
    if (dbItems) {
      const mapped: InventoryItem[] = (dbItems as unknown[]).map((r: unknown) => {
        const row = r as Record<string, unknown>;
        return { ...row, id: String(row.id) } as InventoryItem;
      });
      setItems(mapped);
      try { localStorage.setItem("sindian_inventory_v1", JSON.stringify(mapped)); } catch {}
    }
  }, [dbItems]);

  // ─── KPI ──────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const totalValue = items.reduce((s, i) => s + i.currentQty * i.unitCost, 0);
    const lowCount   = items.filter(i => i.status === "low_stock").length;
    const critCount  = items.filter(i => i.status === "critical").length;
    const outCount   = items.filter(i => i.status === "out_of_stock").length;
    return { totalValue, lowCount, critCount, outCount, total: items.length };
  }, [items]);

  // ─── تصفية ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return items.filter(i => {
      const matchSearch = !search ||
        i.name.includes(search) || i.code.includes(search) || i.supplier.includes(search);
      const matchCat    = filterCategory === "all" || i.category === filterCategory;
      const matchStatus = filterStatus   === "all" || i.status   === filterStatus;
      return matchSearch && matchCat && matchStatus;
    });
  }, [items, search, filterCategory, filterStatus]);

  // ─── تحديث مادة ───────────────────────────────────────────────
  const handleSaveItem = (updated: InventoryItem) => {
    const numericId = typeof updated.id === "number" ? updated.id : parseInt(updated.id);
    const payload = {
      code: updated.code, name: updated.name, nameEn: updated.nameEn,
      category: updated.category, unit: updated.unit,
      currentQty: updated.currentQty, minQty: updated.minQty,
      maxQty: updated.maxQty, reorderQty: updated.reorderQty,
      unitCost: updated.unitCost, supplier: updated.supplier,
      supplierPhone: updated.supplierPhone, location: updated.location,
      lastReceived: updated.lastReceived, lastConsumed: updated.lastConsumed,
      notes: updated.notes,
    };
    const { currentQty: _ignoredQty, ...metadata } = payload;
    if (isNaN(numericId)) {
      createMutation.mutate(metadata, { onSuccess: () => toast.success("تم إضافة المادة بنجاح") });
    } else {
      updateMutation.mutate(
        { id: numericId, ...metadata },
        { onSuccess: () => toast.success("تم حفظ التعديلات بنجاح") }
      );
    }
  };

  const handleTransaction = (item: InventoryItem, tx: InventoryTransaction) => {
    const numericId = typeof item.id === "number" ? item.id : parseInt(item.id);
    txMutation.mutate({
      itemId: numericId,
      type: tx.type as "receive" | "consume" | "adjust" | "return" | "transfer",
      quantity: tx.quantity,
      reference: tx.reference,
      note: tx.note,
      performedBy: tx.performedBy,
      date: tx.date,
    }, {
      onSuccess: () => toast.success(
        tx.type === "receive" ? "تم تسجيل الاستلام بنجاح" :
        tx.type === "consume" ? "تم تسجيل الصرف بنجاح" : "تم تسجيل التعديل بنجاح"
      ),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleDelete = (id: string) => {
    const numericId = typeof id === "number" ? id : parseInt(id);
    if (!isNaN(numericId)) deleteMutation.mutate({ id: numericId });
    toast.success("تم حذف المادة");
  };

  // ─── Render ───────────────────────────────────────────────────
  return (
    <AdminLayout title={lang === "zh" ? "库存管理" : lang === "en" ? "Inventory Management" : "إدارة المخزون"} subtitle={lang === "zh" ? "追踪原材料与库存" : lang === "en" ? "Track raw materials and stock levels" : "تتبع المواد الخام والمستلزمات"}>
      <div className="min-h-screen bg-gray-50 p-6" dir="rtl">        {isLoading && (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin ml-2" />
            <span>جارٍ تحميل بيانات المخزون...</span>
          </div>
        )}
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Warehouse className="w-7 h-7 text-green-700" />
              إدارة المخزون
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              تتبع المواد الخام والمستلزمات — {items.length} مادة مسجلة
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" /> تحديث
            </Button>
            {/* Seed button deleted for production */}
            <Button
              size="sm"
              className="gap-1.5 bg-green-700 hover:bg-green-800 text-white"
              onClick={() => setFormItem("new")}
            >
              <Plus className="w-4 h-4" /> مادة جديدة
            </Button>
          </div>
        </div>

        {/* ── KPI Cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: "إجمالي قيمة المخزون",
              value: `${kpi.totalValue.toLocaleString()} ر.س`,
              icon: <BarChart3 className="w-5 h-5" />,
              color: "text-green-700", bg: "bg-green-50 border-green-100",
            },
            {
              label: "مواد منخفضة",
              value: `${kpi.lowCount} مادة`,
              icon: <TrendingDown className="w-5 h-5" />,
              color: "text-amber-600", bg: "bg-amber-50 border-amber-100",
              alert: kpi.lowCount > 0,
            },
            {
              label: "مواد حرجة",
              value: `${kpi.critCount} مادة`,
              icon: <AlertTriangle className="w-5 h-5" />,
              color: "text-red-600", bg: "bg-red-50 border-red-100",
              alert: kpi.critCount > 0,
            },
            {
              label: "نفد المخزون",
              value: `${kpi.outCount} مادة`,
              icon: <ShieldAlert className="w-5 h-5" />,
              color: "text-purple-700", bg: "bg-purple-50 border-purple-100",
              alert: kpi.outCount > 0,
            },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`border rounded-2xl p-4 ${card.bg} relative overflow-hidden`}
            >
              {card.alert && (
                <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-current animate-pulse" style={{ color: card.color.replace("text-", "") }} />
              )}
              <div className={`${card.color} mb-2`}>{card.icon}</div>
              <div className={`text-xl font-bold ${card.color}`}>{card.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
            </motion.div>
          ))}
        </div>

        {/* ── تنبيهات المخزون الحرج ──────────────────────────── */}
        {(kpi.critCount > 0 || kpi.outCount > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-800 mb-1">تنبيه: مواد تحتاج إعادة طلب فورية</p>
              <div className="flex flex-wrap gap-2">
                {items.filter(i => i.status === "critical" || i.status === "out_of_stock").map(i => (
                  <button
                    key={i.id}
                    onClick={() => setSelectedItem(i)}
                    className="text-xs font-medium px-2.5 py-1 rounded-full cursor-pointer transition-colors"
                    style={{
                      background: STATUS_CONFIG[i.status].bg,
                      color: STATUS_CONFIG[i.status].color,
                    }}
                  >
                    {STATUS_CONFIG[i.status].icon}
                    <span className="mr-1">{i.name}</span>
                    <span className="opacity-60">({i.currentQty} {i.unit})</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Toolbar ────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="بحث بالاسم أو الكود أو المورد..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pr-9 bg-white border-gray-200 rounded-xl text-sm"
            />
          </div>

          {/* فلتر الفئة */}
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value as MaterialCategory | "all")}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">كل الفئات</option>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>

          {/* فلتر الحالة */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as StockStatus | "all")}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">كل الحالات</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* طريقة العرض */}
          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
            {(["grid", "table"] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-2 text-sm transition-colors ${viewMode === mode ? "bg-green-700 text-white" : "text-gray-500 hover:bg-gray-50"}`}
              >
                {mode === "grid" ? <Boxes className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
              </button>
            ))}
          </div>

          <span className="text-sm text-gray-400">{filtered.length} نتيجة</span>
        </div>

        {/* ── عرض البطاقات ───────────────────────────────────── */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filtered.map((item, idx) => (
                <InventoryCard
                  key={item.id}
                  item={item}
                  idx={idx}
                  onView={() => setSelectedItem(item)}
                  onEdit={() => setFormItem(item)}
                  onReceive={() => setTxItem({ item, type: "receive" })}
                  onConsume={() => setTxItem({ item, type: "consume" })}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* ── عرض الجدول ─────────────────────────────────────── */}
        {viewMode === "table" && (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-right font-bold text-gray-600">الكود</th>
                  <th className="px-4 py-3 text-right font-bold text-gray-600">الاسم</th>
                  <th className="px-4 py-3 text-right font-bold text-gray-600">الفئة</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-600">الكمية</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-600">الحد الأدنى</th>
                  <th className="px-4 py-3 text-right font-bold text-gray-600">الموقع</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-600">الحالة</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-600">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => {
                  const st = STATUS_CONFIG[item.status];
                  const cat = CATEGORIES[item.category];
                  const pct = Math.min(100, Math.round((item.currentQty / item.maxQty) * 100));
                  return (
                    <tr key={item.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.code}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800">{item.name}</div>
                        <div className="text-xs text-gray-400">{item.supplier}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: cat.color + "20", color: cat.color }}>
                          {cat.icon} {cat.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="font-bold text-gray-800">{item.currentQty.toLocaleString()}</div>
                        <div className="text-xs text-gray-400">{item.unit}</div>
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full mx-auto mt-1 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: st.color }} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">{item.minQty.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{item.location}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>
                          {st.icon}{st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setSelectedItem(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="عرض التفاصيل"><Eye className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setTxItem({ item, type: "receive" })} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors" title="استلام"><ArrowDownToLine className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setTxItem({ item, type: "consume" })} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors" title="صرف"><ArrowUpFromLine className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setFormItem(item)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="تعديل"><Edit3 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>لا توجد مواد تطابق البحث</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Modals ─────────────────────────────────────────────── */}
      {selectedItem && (
        <InventoryItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onEdit={() => { setFormItem(selectedItem); setSelectedItem(null); }}
          onReceive={() => { setTxItem({ item: selectedItem, type: "receive" }); setSelectedItem(null); }}
          onConsume={() => { setTxItem({ item: selectedItem, type: "consume" }); setSelectedItem(null); }}
        />
      )}

      {formItem !== null && (
        <InventoryFormModal
          item={formItem === "new" ? null : formItem}
          onClose={() => setFormItem(null)}
          onSave={handleSaveItem}
        />
      )}

      {txItem && (
        <InventoryTransactionModal
          item={txItem.item}
          type={txItem.type}
          onClose={() => setTxItem(null)}
          onSave={(tx) => { handleTransaction(txItem.item, tx); setTxItem(null); }}
        />
      )}
    </AdminLayout>
  );
}

// ─── بطاقة المادة ─────────────────────────────────────────────
function InventoryCard({
  item, idx, onView, onEdit, onReceive, onConsume,
}: {
  item: InventoryItem; idx: number;
  onView: () => void; onEdit: () => void;
  onReceive: () => void; onConsume: () => void;
}) {
  const st  = STATUS_CONFIG[item.status];
  const cat = CATEGORIES[item.category];
  const pct = Math.min(100, Math.round((item.currentQty / item.maxQty) * 100));
  const barColor =
    item.status === "out_of_stock" ? "#7C3AED" :
    item.status === "critical"     ? "#DC2626" :
    item.status === "low_stock"    ? "#D97706" : "#059669";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: idx * 0.04 }}
      className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-md transition-shadow group relative overflow-hidden"
    >
      {/* شريط الحالة العلوي */}
      <div className="absolute top-0 right-0 left-0 h-1 rounded-t-2xl" style={{ background: st.color }} />

      <div className="flex items-start justify-between mb-3 mt-1">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono text-gray-400 mb-0.5">{item.code}</div>
          <div className="font-bold text-gray-800 text-sm leading-tight line-clamp-2">{item.name}</div>
        </div>
        <span className="text-xl flex-shrink-0 mr-2">{cat.icon}</span>
      </div>

      {/* الكمية وشريط التقدم */}
      <div className="mb-3">
        <div className="flex items-end justify-between mb-1.5">
          <div>
            <span className="text-2xl font-black text-gray-900">{item.currentQty.toLocaleString()}</span>
            <span className="text-xs text-gray-400 mr-1">{item.unit}</span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>
            {st.icon}{st.label}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>الحد الأدنى: {item.minQty}</span>
          <span>الحد الأقصى: {item.maxQty}</span>
        </div>
      </div>

      {/* بيانات إضافية */}
      <div className="space-y-1 mb-3 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <Tag className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{item.supplier}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Warehouse className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{item.location}</span>
        </div>
        {item.lastReceived && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span>آخر استلام: {item.lastReceived}</span>
          </div>
        )}
      </div>

      {/* أزرار الإجراءات */}
      <div className="flex items-center gap-1.5 pt-3 border-t border-gray-100">
        <button
          onClick={onView}
          className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors flex items-center justify-center gap-1"
        >
          <Eye className="w-3 h-3" /> تفاصيل
        </button>
        <button
          onClick={onReceive}
          className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 transition-colors flex items-center justify-center gap-1"
        >
          <ArrowDownToLine className="w-3 h-3" /> استلام
        </button>
        <button
          onClick={onConsume}
          className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors flex items-center justify-center gap-1"
        >
          <ArrowUpFromLine className="w-3 h-3" /> صرف
        </button>
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
