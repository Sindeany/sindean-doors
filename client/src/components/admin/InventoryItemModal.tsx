// ============================================================
// InventoryItemModal - نافذة تفاصيل مادة المخزون
// تعرض: بيانات المادة + سجل الحركات + مؤشرات الاستهلاك
// ============================================================
import { motion } from "framer-motion";
import {
  X, ArrowDownToLine, ArrowUpFromLine, Edit3,
  Tag, Warehouse, Phone, Calendar, Hash, Package,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  BarChart3, Clock, RefreshCw, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InventoryItem, InventoryTransaction } from "@/pages/admin/AdminInventory";
import { CATEGORIES, STATUS_CONFIG } from "@/pages/admin/AdminInventory";

const TX_LABELS: Record<InventoryTransaction["type"], { label: string; color: string; icon: React.ReactNode }> = {
  receive:  { label: "استلام",  color: "#059669", icon: <ArrowDownToLine className="w-3.5 h-3.5" /> },
  consume:  { label: "صرف",    color: "#D97706", icon: <ArrowUpFromLine className="w-3.5 h-3.5" /> },
  adjust:   { label: "تعديل",  color: "#2563EB", icon: <RefreshCw className="w-3.5 h-3.5" /> },
  return:   { label: "إرجاع",  color: "#7C3AED", icon: <TrendingUp className="w-3.5 h-3.5" /> },
  transfer: { label: "نقل",    color: "#6B7280", icon: <Package className="w-3.5 h-3.5" /> },
};

interface Props {
  item: InventoryItem;
  onClose: () => void;
  onEdit: () => void;
  onReceive: () => void;
  onConsume: () => void;
}

export default function InventoryItemModal({ item, onClose, onEdit, onReceive, onConsume }: Props) {
  const st  = STATUS_CONFIG[item.status];
  const cat = CATEGORIES[item.category];
  const pct = Math.min(100, Math.round((item.currentQty / item.maxQty) * 100));
  const totalReceived = item.transactions.filter(t => t.type === "receive").reduce((s, t) => s + t.quantity, 0);
  const totalConsumed = item.transactions.filter(t => t.type === "consume").reduce((s, t) => s + t.quantity, 0);
  const totalValue    = item.currentQty * item.unitCost;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        dir="rtl"
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-start gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: cat.color + "15" }}
            >
              {cat.icon}
            </div>
            <div>
              <div className="font-mono text-xs text-gray-400 mb-0.5">{item.code}</div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">{item.name}</h2>
              {item.nameEn && <div className="text-xs text-gray-400 mt-0.5">{item.nameEn}</div>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: st.bg, color: st.color }}
            >
              {st.icon}{st.label}
            </span>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ── مؤشرات الكمية ──────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "الكمية الحالية", value: `${item.currentQty.toLocaleString()} ${item.unit}`, color: st.color, bg: st.bg },
              { label: "قيمة المخزون",   value: `${totalValue.toLocaleString()} ر.س`,               color: "#2563EB", bg: "#EFF6FF" },
              { label: "إجمالي الاستلام", value: `${totalReceived.toLocaleString()} ${item.unit}`,   color: "#059669", bg: "#ECFDF5" },
              { label: "إجمالي الصرف",   value: `${totalConsumed.toLocaleString()} ${item.unit}`,   color: "#D97706", bg: "#FFFBEB" },
            ].map((card, i) => (
              <div key={i} className="rounded-2xl p-3 text-center" style={{ background: card.bg }}>
                <div className="text-base font-bold" style={{ color: card.color }}>{card.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
              </div>
            ))}
          </div>

          {/* ── شريط التقدم ────────────────────────────────── */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-gray-700">مستوى المخزون</span>
              <span className="font-bold" style={{ color: st.color }}>{pct}%</span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: st.color }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>0</span>
              <span className="text-red-500">الحد الأدنى: {item.minQty}</span>
              <span className="text-amber-500">إعادة الطلب: {item.reorderQty}</span>
              <span>الحد الأقصى: {item.maxQty}</span>
            </div>
          </div>

          {/* ── بيانات المادة ──────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <Tag className="w-4 h-4" />,      label: "الفئة",         value: `${cat.icon} ${cat.label}` },
              { icon: <Hash className="w-4 h-4" />,     label: "وحدة القياس",   value: item.unit },
              { icon: <BarChart3 className="w-4 h-4" />, label: "تكلفة الوحدة", value: `${item.unitCost} ر.س` },
              { icon: <Warehouse className="w-4 h-4" />, label: "الموقع",       value: item.location },
              { icon: <Tag className="w-4 h-4" />,      label: "المورد",        value: item.supplier },
              { icon: <Phone className="w-4 h-4" />,    label: "هاتف المورد",   value: item.supplierPhone || "—" },
              { icon: <Calendar className="w-4 h-4" />, label: "آخر استلام",    value: item.lastReceived || "—" },
              { icon: <Clock className="w-4 h-4" />,    label: "آخر صرف",       value: item.lastConsumed || "—" },
            ].map((row, i) => (
              <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-xl p-3">
                <span className="text-gray-400 mt-0.5 flex-shrink-0">{row.icon}</span>
                <div>
                  <div className="text-xs text-gray-400">{row.label}</div>
                  <div className="text-sm font-semibold text-gray-800">{row.value}</div>
                </div>
              </div>
            ))}
          </div>

          {item.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 flex gap-2">
              <FileText className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-amber-800 mb-0.5">ملاحظات</div>
                <div className="text-sm text-amber-700">{item.notes}</div>
              </div>
            </div>
          )}

          {/* ── سجل الحركات ────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              سجل الحركات ({item.transactions.length})
            </h3>
            {item.transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">لا توجد حركات مسجلة</div>
            ) : (
              <div className="space-y-2">
                {item.transactions.map((tx) => {
                  const txCfg = TX_LABELS[tx.type];
                  const isPositive = tx.type === "receive" || tx.type === "return";
                  return (
                    <div key={tx.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: txCfg.color + "15", color: txCfg.color }}
                      >
                        {txCfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold" style={{ color: txCfg.color }}>{txCfg.label}</span>
                          <span className={`text-sm font-bold ${isPositive ? "text-green-700" : "text-amber-700"}`}>
                            {isPositive ? "+" : "-"}{tx.quantity.toLocaleString()} {item.unit}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {tx.reference} · {tx.performedBy} · {tx.date}
                        </div>
                        {tx.note && <div className="text-xs text-gray-400 mt-0.5 italic">{tx.note}</div>}
                        <div className="text-xs text-gray-400 mt-1">
                          الرصيد: {tx.balanceBefore.toLocaleString()} ← <strong className="text-gray-600">{tx.balanceAfter.toLocaleString()}</strong> {item.unit}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
            <Edit3 className="w-4 h-4" /> تعديل
          </Button>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-1.5 bg-green-700 hover:bg-green-800 text-white"
              onClick={onReceive}
            >
              <ArrowDownToLine className="w-4 h-4" /> استلام
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50"
              onClick={onConsume}
            >
              <ArrowUpFromLine className="w-4 h-4" /> صرف
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>إغلاق</Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
