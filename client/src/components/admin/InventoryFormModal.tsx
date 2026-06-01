// ============================================================
// InventoryFormModal - نموذج إضافة / تعديل مادة المخزون
// ============================================================
import { useState } from "react";
import { motion } from "framer-motion";
import { X, Save, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nanoid } from "nanoid";
import type { InventoryItem, MaterialCategory, MaterialUnit } from "@/pages/admin/AdminInventory";
import { CATEGORIES } from "@/pages/admin/AdminInventory";

const UNITS: MaterialUnit[] = ["لوح", "متر", "كيلو", "علبة", "طقم", "قطعة", "رول", "لتر"];

interface Props {
  item: InventoryItem | null;
  onClose: () => void;
  onSave: (item: InventoryItem) => void;
}

export default function InventoryFormModal({ item, onClose, onSave }: Props) {
  const isNew = !item;

  const [form, setForm] = useState<Partial<InventoryItem>>(
    item ?? {
      id: `INV-${nanoid(6).toUpperCase()}`,
      code: "",
      name: "",
      nameEn: "",
      category: "wpc_board",
      unit: "لوح",
      currentQty: 0,
      minQty: 0,
      maxQty: 0,
      reorderQty: 0,
      unitCost: 0,
      supplier: "",
      supplierPhone: "",
      location: "",
      notes: "",
      transactions: [],
      status: "in_stock",
    }
  );

  const set = (key: keyof InventoryItem, val: unknown) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code || !form.supplier) return;
    onSave(form as InventoryItem);
    onClose();
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
        className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {isNew ? "إضافة مادة جديدة" : "تعديل المادة"}
              </h2>
              <p className="text-xs text-gray-400">{form.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* بيانات أساسية */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">البيانات الأساسية</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600 mb-1 block">اسم المادة *</label>
                <Input
                  required
                  value={form.name ?? ""}
                  onChange={e => set("name", e.target.value)}
                  placeholder="مثال: لوح WPC 45mm أبيض مطفي"
                  className="rounded-xl border-gray-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">الكود *</label>
                <Input
                  required
                  value={form.code ?? ""}
                  onChange={e => set("code", e.target.value.toUpperCase())}
                  placeholder="WPC-45-WHT"
                  className="rounded-xl border-gray-200 font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">الاسم بالإنجليزية</label>
                <Input
                  value={form.nameEn ?? ""}
                  onChange={e => set("nameEn", e.target.value)}
                  placeholder="WPC Board 45mm White"
                  className="rounded-xl border-gray-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">الفئة *</label>
                <select
                  required
                  value={form.category ?? "wpc_board"}
                  onChange={e => set("category", e.target.value as MaterialCategory)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {Object.entries(CATEGORIES).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">وحدة القياس *</label>
                <select
                  required
                  value={form.unit ?? "لوح"}
                  onChange={e => set("unit", e.target.value as MaterialUnit)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* بيانات الكميات */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">الكميات والحدود</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "currentQty", label: "الكمية الحالية *", placeholder: "0" },
                { key: "minQty",     label: "الحد الأدنى *",    placeholder: "50" },
                { key: "maxQty",     label: "الحد الأقصى *",    placeholder: "500" },
                { key: "reorderQty", label: "كمية إعادة الطلب", placeholder: "150" },
                { key: "unitCost",   label: "تكلفة الوحدة (ر.س) *", placeholder: "0.00" },
              ].map(field => (
                <div key={field.key} className={field.key === "unitCost" ? "col-span-2" : ""}>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">{field.label}</label>
                  <Input
                    type="number"
                    min={0}
                    step={field.key === "unitCost" ? "0.01" : "1"}
                    required={field.label.includes("*")}
                    value={(form as Record<string, unknown>)[field.key] as number ?? 0}
                    onChange={e => set(field.key as keyof InventoryItem, parseFloat(e.target.value) || 0)}
                    placeholder={field.placeholder}
                    className="rounded-xl border-gray-200"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* بيانات المورد والموقع */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">المورد والموقع</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600 mb-1 block">اسم المورد *</label>
                <Input
                  required
                  value={form.supplier ?? ""}
                  onChange={e => set("supplier", e.target.value)}
                  placeholder="شركة البلاستيك المتحدة"
                  className="rounded-xl border-gray-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">هاتف المورد</label>
                <Input
                  value={form.supplierPhone ?? ""}
                  onChange={e => set("supplierPhone", e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="rounded-xl border-gray-200"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">موقع التخزين *</label>
                <Input
                  required
                  value={form.location ?? ""}
                  onChange={e => set("location", e.target.value)}
                  placeholder="مستودع A - رف 1"
                  className="rounded-xl border-gray-200"
                />
              </div>
            </div>
          </section>

          {/* ملاحظات */}
          <section>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">ملاحظات</label>
            <textarea
              value={form.notes ?? ""}
              onChange={e => set("notes", e.target.value)}
              placeholder="أي ملاحظات إضافية عن هذه المادة..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </section>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>إلغاء</Button>
          <Button
            size="sm"
            className="gap-1.5 bg-green-700 hover:bg-green-800 text-white"
            onClick={handleSubmit as unknown as React.MouseEventHandler}
          >
            <Save className="w-4 h-4" />
            {isNew ? "إضافة المادة" : "حفظ التعديلات"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
