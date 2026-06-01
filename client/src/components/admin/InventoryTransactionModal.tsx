// ============================================================
// InventoryTransactionModal - نموذج عمليات المخزون
// الاستلام / الصرف / التعديل
// ============================================================
import { useState } from "react";
import { motion } from "framer-motion";
import { X, ArrowDownToLine, ArrowUpFromLine, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nanoid } from "nanoid";
import type { InventoryItem, InventoryTransaction } from "@/pages/admin/AdminInventory";
import { STATUS_CONFIG } from "@/pages/admin/AdminInventory";

interface Props {
  item: InventoryItem;
  type: "receive" | "consume" | "adjust";
  onClose: () => void;
  onSave: (tx: InventoryTransaction) => void;
}

const TX_CONFIG = {
  receive: {
    label: "استلام مواد",
    icon: <ArrowDownToLine className="w-5 h-5" />,
    color: "#059669",
    bg: "#ECFDF5",
    placeholder: "مثال: PO-2026-0050",
    refLabel: "رقم أمر الشراء (PO)",
    qtyLabel: "الكمية المستلمة",
    description: "أدخل الكمية التي تم استلامها من المورد",
  },
  consume: {
    label: "صرف مواد",
    icon: <ArrowUpFromLine className="w-5 h-5" />,
    color: "#D97706",
    bg: "#FFFBEB",
    placeholder: "مثال: WO-2026-0105",
    refLabel: "رقم أمر التشغيل (WO)",
    qtyLabel: "الكمية المصروفة",
    description: "أدخل الكمية التي تم صرفها للإنتاج",
  },
  adjust: {
    label: "تعديل الرصيد",
    icon: <RefreshCw className="w-5 h-5" />,
    color: "#2563EB",
    bg: "#EFF6FF",
    placeholder: "مثال: جرد دوري",
    refLabel: "سبب التعديل",
    qtyLabel: "الكمية الجديدة (الرصيد الفعلي)",
    description: "أدخل الرصيد الفعلي بعد الجرد أو التصحيح",
  },
};

const DEPARTMENTS = [
  "خط الأبواب",
  "خط الإطارات",
  "قسم الإكسسوارات",
  "قسم التغليف",
  "قسم الجودة (QC)",
  "المستودع",
  "الإدارة",
];

export default function InventoryTransactionModal({ item, type, onClose, onSave }: Props) {
  const cfg = TX_CONFIG[type];
  const st  = STATUS_CONFIG[item.status];

  const [qty, setQty]         = useState<number>(0);
  const [ref, setRef]         = useState("");
  const [note, setNote]       = useState("");
  const [performer, setPerformer] = useState(DEPARTMENTS[0]);
  const [customPerformer, setCustomPerformer] = useState("");

  const actualPerformer = performer === "أخرى" ? customPerformer : performer;

  // حساب الرصيد بعد العملية
  const newBalance = type === "adjust"
    ? qty
    : type === "receive"
    ? item.currentQty + qty
    : Math.max(0, item.currentQty - qty);

  const isValid = qty > 0 && ref.trim().length > 0 && actualPerformer.trim().length > 0;

  // تحذير الصرف الزائد
  const overConsume = type === "consume" && qty > item.currentQty;

  const handleSubmit = () => {
    if (!isValid) return;
    const tx: InventoryTransaction = {
      id: `TX-${nanoid(8).toUpperCase()}`,
      type,
      quantity: type === "adjust" ? Math.abs(qty - item.currentQty) : qty,
      balanceBefore: item.currentQty,
      balanceAfter: newBalance,
      reference: ref.trim(),
      note: note.trim() || undefined,
      performedBy: actualPerformer,
      date: new Date().toISOString().split("T")[0],
    };
    onSave(tx);
  };

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
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
        dir="rtl"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 flex-shrink-0"
          style={{ background: cfg.bg, borderBottom: `2px solid ${cfg.color}20` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: cfg.color + "20", color: cfg.color }}
            >
              {cfg.icon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{cfg.label}</h2>
              <p className="text-xs text-gray-500 truncate max-w-48">{item.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/60 text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">

          {/* الرصيد الحالي */}
          <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4">
            <div>
              <div className="text-xs text-gray-400">الرصيد الحالي</div>
              <div className="text-2xl font-black text-gray-900">
                {item.currentQty.toLocaleString()} <span className="text-sm font-normal text-gray-400">{item.unit}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">الحالة</div>
              <span
                className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: st.bg, color: st.color }}
              >
                {st.icon}{st.label}
              </span>
            </div>
          </div>

          {/* الكمية */}
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1.5 block">{cfg.qtyLabel} *</label>
            <Input
              type="number"
              min={0}
              value={qty || ""}
              onChange={e => setQty(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="rounded-xl border-gray-200 text-lg font-bold text-center"
            />
            <p className="text-xs text-gray-400 mt-1">{cfg.description}</p>
          </div>

          {/* معاينة الرصيد الجديد */}
          {qty > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className={`rounded-2xl p-3 flex items-center justify-between ${overConsume ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-100"}`}
            >
              <div className="text-sm text-gray-600">
                {overConsume ? (
                  <span className="text-red-700 font-bold">⚠️ الكمية تتجاوز الرصيد المتاح!</span>
                ) : (
                  <>الرصيد بعد العملية:</>
                )}
              </div>
              {!overConsume && (
                <div className="text-lg font-black" style={{ color: cfg.color }}>
                  {newBalance.toLocaleString()} {item.unit}
                </div>
              )}
            </motion.div>
          )}

          {/* المرجع */}
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1.5 block">{cfg.refLabel} *</label>
            <Input
              value={ref}
              onChange={e => setRef(e.target.value)}
              placeholder={cfg.placeholder}
              className="rounded-xl border-gray-200"
            />
          </div>

          {/* القسم المنفذ */}
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1.5 block">القسم / المنفذ *</label>
            <select
              value={performer}
              onChange={e => setPerformer(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              <option value="أخرى">أخرى (أدخل يدوياً)</option>
            </select>
            {performer === "أخرى" && (
              <Input
                value={customPerformer}
                onChange={e => setCustomPerformer(e.target.value)}
                placeholder="اسم المنفذ أو القسم"
                className="rounded-xl border-gray-200 mt-2"
              />
            )}
          </div>

          {/* ملاحظة */}
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1.5 block">ملاحظة (اختياري)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="أي ملاحظات إضافية..."
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>إلغاء</Button>
          <Button
            size="sm"
            disabled={!isValid || overConsume}
            onClick={handleSubmit}
            className="gap-1.5 text-white"
            style={{ background: isValid && !overConsume ? cfg.color : undefined }}
          >
            <Save className="w-4 h-4" />
            تأكيد {cfg.label}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
