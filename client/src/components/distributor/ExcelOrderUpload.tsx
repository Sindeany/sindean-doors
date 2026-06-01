/**
 * ExcelOrderUpload — رفع ملف Excel وتحليله آلياً لإنشاء طلب موزع
 * - رفع الملف → تحليل AI → معاينة + تعديل مباشر → تأكيد الطلب
 * - الخيارات (المادة، اللون) تُجلب ديناميكياً من قاعدة البيانات
 */
import { useState, useRef, useCallback } from "react";
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download,
  Loader2, X, Send, RefreshCw, Info, Pencil, Save, XCircle,
  Plus, ChevronDown, ChevronUp, Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// ─── Types ─────────────────────────────────────────────────
interface AvailableOption {
  id: string;
  label: string;
  hex?: string;
}

interface AvailableOptions {
  materials: AvailableOption[];
  colors: AvailableOption[];
  shapes: AvailableOption[];
  standardSizes: string[];
}

interface ParsedItem {
  id: string;
  doorType: string;
  woodType: string | null;
  woodTypeId?: string | null;
  color: string | null;
  colorId?: string | null;
  colorHex: string;
  width: number;
  height: number;
  thickness: number;
  quantity: number;
  unitPrice: number;
  notes: string | null;
  valid: boolean;
  error: string | null;
  selections: Record<string, string>;
  matchInfo?: {
    materialMatched: boolean;
    colorMatched: boolean;
    originalMaterial?: string | null;
    originalColor?: string | null;
  };
}

interface ExcelOrderUploadProps {
  distributorId: string;
  distributorName: string;
  distributorCompany?: string;
  orderType: "purchase_order" | "rfq" | "sample_request";
  onSuccess: (orderNumber: string) => void;
  onCancel: () => void;
}

// ─── Validation helper ──────────────────────────────────────
function validateItem(item: ParsedItem): { valid: boolean; error: string | null } {
  if (!item.doorType || item.doorType.trim() === "") {
    return { valid: false, error: "نوع الباب مطلوب" };
  }
  if (!item.width || item.width <= 0) {
    return { valid: false, error: "العرض يجب أن يكون أكبر من صفر" };
  }
  if (!item.height || item.height <= 0) {
    return { valid: false, error: "الارتفاع يجب أن يكون أكبر من صفر" };
  }
  if (!item.thickness || item.thickness <= 0) {
    return { valid: false, error: "السماكة يجب أن تكون أكبر من صفر" };
  }
  if (!item.quantity || item.quantity <= 0) {
    return { valid: false, error: "الكمية يجب أن تكون أكبر من صفر" };
  }
  return { valid: true, error: null };
}

// ─── Color Swatch Select ────────────────────────────────────
function ColorSelect({
  value,
  onChange,
  options,
  placeholder,
  fieldClass,
}: {
  value: string;
  onChange: (val: string) => void;
  options: AvailableOption[];
  placeholder: string;
  fieldClass: string;
}) {
  const selected = options.find(o => o.label === value || o.id === value);
  return (
    <div className="relative">
      {selected?.hex && (
        <div
          className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-gray-200 z-10 pointer-events-none"
          style={{ background: selected.hex }}
        />
      )}
      <select
        className={`${fieldClass} w-full appearance-none ${selected?.hex ? "pr-8" : ""}`}
        value={value}
        onChange={e => onChange(e.target.value)}
        dir="rtl"
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt.id} value={opt.label}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Inline Edit Form ───────────────────────────────────────
function ItemEditForm({
  item,
  availableOptions,
  onSave,
  onCancel: onCancelEdit,
}: {
  item: ParsedItem;
  availableOptions: AvailableOptions | null;
  onSave: (updated: ParsedItem) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ParsedItem>({ ...item });

  const set = (field: keyof ParsedItem, value: string | number | null) => {
    setDraft(prev => {
      const updated = { ...prev, [field]: value };
      // تحديث colorHex عند تغيير اللون
      if (field === "color" && availableOptions) {
        const colorOpt = availableOptions.colors.find(c => c.label === value || c.id === value);
        updated.colorHex = colorOpt?.hex ?? "#cccccc";
        updated.colorId = colorOpt?.id ?? null;
      }
      // تحديث woodTypeId عند تغيير المادة
      if (field === "woodType" && availableOptions) {
        const matOpt = availableOptions.materials.find(m => m.label === value || m.id === value);
        updated.woodTypeId = matOpt?.id ?? null;
      }
      return updated;
    });
  };

  const handleSave = () => {
    const updated: ParsedItem = {
      ...draft,
      width: isNaN(Number(draft.width)) ? 0 : Number(draft.width),
      height: isNaN(Number(draft.height)) ? 0 : Number(draft.height),
      thickness: isNaN(Number(draft.thickness)) ? 0 : Number(draft.thickness),
      quantity: isNaN(Number(draft.quantity)) ? 0 : Number(draft.quantity),
      unitPrice: isNaN(Number(draft.unitPrice)) ? 0 : Number(draft.unitPrice),
      // إزالة matchInfo بعد التعديل اليدوي
      matchInfo: undefined,
    };
    const { valid, error } = validateItem(updated);
    onSave({ ...updated, valid, error });
  };

  const fieldClass =
    "h-8 text-sm rounded-lg border border-gray-200 focus:border-green-400 focus:ring-1 focus:ring-green-200 bg-white px-2";

  const hasDynamicOptions = availableOptions && (
    availableOptions.materials.length > 0 || availableOptions.colors.length > 0
  );

  return (
    <div className="p-3 border-t border-gray-100 bg-gray-50/60 rounded-b-xl space-y-3">
      {hasDynamicOptions && (
        <p className="text-[10px] text-green-600 flex items-center gap-1 font-medium">
          <Sparkles className="w-3 h-3" />
          الخيارات تعكس إعدادات المنتج الحالية
        </p>
      )}

      {/* Row 1: نوع الباب + المادة + اللون */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
            نوع الباب *
          </label>
          <Input
            className={fieldClass}
            value={draft.doorType}
            onChange={e => set("doorType", e.target.value)}
            placeholder="مثال: WPC"
            dir="rtl"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
            المادة
          </label>
          {availableOptions && availableOptions.materials.length > 0 ? (
            <select
              className={`${fieldClass} w-full appearance-none`}
              value={draft.woodType ?? ""}
              onChange={e => set("woodType", e.target.value || null)}
              dir="rtl"
            >
              <option value="">— اختر المادة —</option>
              {availableOptions.materials.map(opt => (
                <option key={opt.id} value={opt.label}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <Input
              className={fieldClass}
              value={draft.woodType ?? ""}
              onChange={e => set("woodType", e.target.value || null)}
              placeholder="مثال: خشب طبيعي"
              dir="rtl"
            />
          )}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
            اللون
          </label>
          {availableOptions && availableOptions.colors.length > 0 ? (
            <ColorSelect
              value={draft.color ?? ""}
              onChange={v => set("color", v || null)}
              options={availableOptions.colors}
              placeholder="— اختر اللون —"
              fieldClass={fieldClass}
            />
          ) : (
            <Input
              className={fieldClass}
              value={draft.color ?? ""}
              onChange={e => set("color", e.target.value || null)}
              placeholder="مثال: أبيض"
              dir="rtl"
            />
          )}
        </div>
      </div>

      {/* Row 2: الأبعاد */}
      <div className="grid grid-cols-4 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
            العرض (سم) *
          </label>
          <Input
            className={fieldClass}
            type="number"
            min={1}
            value={draft.width || ""}
            onChange={e => set("width", parseFloat(e.target.value) || 0)}
            placeholder="90"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
            الارتفاع (سم) *
          </label>
          <Input
            className={fieldClass}
            type="number"
            min={1}
            value={draft.height || ""}
            onChange={e => set("height", parseFloat(e.target.value) || 0)}
            placeholder="210"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
            السماكة (سم) *
          </label>
          <Input
            className={fieldClass}
            type="number"
            min={1}
            step={0.5}
            value={draft.thickness || ""}
            onChange={e => set("thickness", parseFloat(e.target.value) || 0)}
            placeholder="4"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
            الكمية *
          </label>
          <Input
            className={fieldClass}
            type="number"
            min={1}
            value={draft.quantity || ""}
            onChange={e => set("quantity", parseInt(e.target.value) || 0)}
            placeholder="1"
          />
        </div>
      </div>

      {/* Row 3: السعر + الملاحظات */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
            سعر الوحدة (ر.س)
          </label>
          <Input
            className={fieldClass}
            type="number"
            min={0}
            step={10}
            value={draft.unitPrice || ""}
            onChange={e => set("unitPrice", parseFloat(e.target.value) || 0)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
            ملاحظات
          </label>
          <Input
            className={fieldClass}
            value={draft.notes ?? ""}
            onChange={e => set("notes", e.target.value || null)}
            placeholder="أي تفاصيل إضافية..."
            dir="rtl"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={onCancelEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <XCircle className="w-3.5 h-3.5" />
          إلغاء
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors font-semibold"
        >
          <Save className="w-3.5 h-3.5" />
          حفظ التعديلات
        </button>
      </div>
    </div>
  );
}

// ─── Item Preview Card ──────────────────────────────────────
function ItemPreviewCard({
  item,
  index,
  availableOptions,
  onRemove,
  onUpdate,
}: {
  item: ParsedItem;
  index: number;
  availableOptions: AvailableOptions | null;
  onRemove: () => void;
  onUpdate: (updated: ParsedItem) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const handleSave = (updated: ParsedItem) => {
    onUpdate(updated);
    setIsEditing(false);
    if (updated.valid) {
      toast.success("تم تصحيح البند بنجاح");
    }
  };

  const wasAutoFixed =
    item.matchInfo &&
    (item.matchInfo.materialMatched || item.matchInfo.colorMatched) &&
    (item.matchInfo.originalMaterial !== item.woodType ||
      item.matchInfo.originalColor !== item.color);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={`rounded-xl border-2 transition-colors overflow-hidden ${
        isEditing
          ? "border-blue-200 bg-blue-50/20"
          : item.valid
          ? "border-green-100 bg-green-50/30"
          : "border-red-100 bg-red-50/30"
      }`}
    >
      {/* ── Header row ── */}
      <div className="flex items-center gap-3 p-3">
        {/* Status icon */}
        <div
          className={`flex-shrink-0 transition-colors ${
            isEditing ? "text-blue-500" : item.valid ? "text-green-500" : "text-red-500"
          }`}
        >
          {isEditing ? (
            <Pencil className="w-5 h-5" />
          ) : item.valid ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
            <span className="font-semibold text-sm text-gray-800 truncate">
              {item.doorType || <span className="text-red-400 italic">نوع الباب مفقود</span>}
            </span>
            {item.woodType && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {item.woodType}
              </span>
            )}
            {item.color && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <div
                  className="w-3 h-3 rounded-full border border-gray-200 flex-shrink-0"
                  style={{ background: item.colorHex || "#ccc" }}
                />
                {item.color}
              </span>
            )}
            {/* Auto-fix badge */}
            {wasAutoFixed && !isEditing && (
              <span
                className="flex items-center gap-0.5 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full"
                title={`تم التصحيح التلقائي: ${item.matchInfo?.originalMaterial ?? ""} → ${item.woodType ?? ""} / ${item.matchInfo?.originalColor ?? ""} → ${item.color ?? ""}`}
              >
                <Sparkles className="w-2.5 h-2.5" />
                صُحِّح آلياً
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
            {(item.width > 0 || item.height > 0) && (
              <span>{item.width}×{item.height}×{item.thickness} سم</span>
            )}
            {item.quantity > 0 && <span>{item.quantity} وحدة</span>}
            {item.unitPrice > 0 && (
              <span className="font-semibold text-green-600">
                {(item.unitPrice * item.quantity).toLocaleString()} ر.س
              </span>
            )}
          </div>

          {/* Error message */}
          {!item.valid && item.error && !isEditing && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              {item.error}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {item.notes && !isEditing && (
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
              title="ملاحظات"
            >
              {showNotes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className={`p-1.5 rounded-lg transition-colors ${
                item.valid
                  ? "text-gray-400 hover:bg-gray-100 hover:text-blue-500"
                  : "text-blue-500 hover:bg-blue-50 bg-blue-50/50"
              }`}
              title="تعديل البند"
            >
              <Pencil className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
              title="إلغاء التعديل"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onRemove}
            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
            title="حذف البند"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notes expansion */}
      <AnimatePresence>
        {showNotes && item.notes && !isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-gray-100 pt-2">
              <p className="text-xs text-gray-500 flex items-start gap-1">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                {item.notes}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit form */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <ItemEditForm
              item={item}
              availableOptions={availableOptions}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Add Item Form ──────────────────────────────────────────
function AddItemForm({
  availableOptions,
  onAdd,
  onClose,
}: {
  availableOptions: AvailableOptions | null;
  onAdd: (item: ParsedItem) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ParsedItem>({
    id: `manual-${Date.now()}`,
    doorType: "",
    woodType: null,
    woodTypeId: null,
    color: null,
    colorId: null,
    colorHex: "#cccccc",
    width: 0,
    height: 0,
    thickness: 0,
    quantity: 1,
    unitPrice: 0,
    notes: null,
    valid: false,
    error: null,
    selections: {},
  });

  const set = (field: keyof ParsedItem, value: string | number | null) => {
    setDraft(prev => {
      const updated = { ...prev, [field]: value };
      if (field === "color" && availableOptions) {
        const colorOpt = availableOptions.colors.find(c => c.label === value || c.id === value);
        updated.colorHex = colorOpt?.hex ?? "#cccccc";
        updated.colorId = colorOpt?.id ?? null;
      }
      if (field === "woodType" && availableOptions) {
        const matOpt = availableOptions.materials.find(m => m.label === value || m.id === value);
        updated.woodTypeId = matOpt?.id ?? null;
      }
      return updated;
    });
  };

  const handleAdd = () => {
    const updated: ParsedItem = {
      ...draft,
      id: `manual-${Date.now()}`,
      width: Number(draft.width) || 0,
      height: Number(draft.height) || 0,
      thickness: Number(draft.thickness) || 0,
      quantity: Number(draft.quantity) || 0,
      unitPrice: Number(draft.unitPrice) || 0,
    };
    const { valid, error } = validateItem(updated);
    onAdd({ ...updated, valid, error });
    onClose();
    toast.success("تم إضافة البند");
  };

  const fieldClass =
    "h-8 text-sm rounded-lg border border-gray-200 focus:border-green-400 focus:ring-1 focus:ring-green-200 bg-white px-2";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/30 p-3 space-y-3"
    >
      <p className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
        <Plus className="w-3.5 h-3.5" />
        إضافة بند جديد يدوياً
      </p>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">نوع الباب *</label>
          <Input className={fieldClass} value={draft.doorType} onChange={e => set("doorType", e.target.value)} placeholder="مثال: WPC" dir="rtl" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">المادة</label>
          {availableOptions && availableOptions.materials.length > 0 ? (
            <select
              className={`${fieldClass} w-full appearance-none`}
              value={draft.woodType ?? ""}
              onChange={e => set("woodType", e.target.value || null)}
              dir="rtl"
            >
              <option value="">— اختر المادة —</option>
              {availableOptions.materials.map(opt => (
                <option key={opt.id} value={opt.label}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <Input className={fieldClass} value={draft.woodType ?? ""} onChange={e => set("woodType", e.target.value || null)} placeholder="اختياري" dir="rtl" />
          )}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">اللون</label>
          {availableOptions && availableOptions.colors.length > 0 ? (
            <ColorSelect
              value={draft.color ?? ""}
              onChange={v => set("color", v || null)}
              options={availableOptions.colors}
              placeholder="— اختر اللون —"
              fieldClass={fieldClass}
            />
          ) : (
            <Input className={fieldClass} value={draft.color ?? ""} onChange={e => set("color", e.target.value || null)} placeholder="اختياري" dir="rtl" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">العرض *</label>
          <Input className={fieldClass} type="number" min={1} value={draft.width || ""} onChange={e => set("width", parseFloat(e.target.value) || 0)} placeholder="90" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">الارتفاع *</label>
          <Input className={fieldClass} type="number" min={1} value={draft.height || ""} onChange={e => set("height", parseFloat(e.target.value) || 0)} placeholder="210" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">السماكة *</label>
          <Input className={fieldClass} type="number" min={1} step={0.5} value={draft.thickness || ""} onChange={e => set("thickness", parseFloat(e.target.value) || 0)} placeholder="4" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">الكمية *</label>
          <Input className={fieldClass} type="number" min={1} value={draft.quantity || ""} onChange={e => set("quantity", parseInt(e.target.value) || 0)} placeholder="1" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">سعر الوحدة (ر.س)</label>
          <Input className={fieldClass} type="number" min={0} step={10} value={draft.unitPrice || ""} onChange={e => set("unitPrice", parseFloat(e.target.value) || 0)} placeholder="0" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">ملاحظات</label>
          <Input className={fieldClass} value={draft.notes ?? ""} onChange={e => set("notes", e.target.value || null)} placeholder="اختياري" dir="rtl" />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button onClick={onClose} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
          <XCircle className="w-3.5 h-3.5" />
          إلغاء
        </button>
        <button
          onClick={handleAdd}
          disabled={!draft.doorType.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          إضافة البند
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────
export default function ExcelOrderUpload({
  distributorId,
  distributorName,
  distributorCompany,
  orderType,
  onSuccess,
  onCancel,
}: ExcelOrderUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [availableOptions, setAvailableOptions] = useState<AvailableOptions | null>(null);
  const [parseResult, setParseResult] = useState<{
    totalRows: number;
    validCount: number;
    errorCount: number;
    aiError: string | null;
    fileName: string;
    autoFixedCount?: number;
  } | null>(null);
  const [step, setStep] = useState<"upload" | "preview" | "submitting" | "done">("upload");
  const [showAddForm, setShowAddForm] = useState(false);

  // tRPC mutations
  const parseMutation = trpc.distributorOrders.parseExcel.useMutation();
  const createMutation = trpc.distributorOrders.create.useMutation();
  const templateMutation = trpc.distributorOrders.generateTemplate.useMutation();

  // ── File handling ───────────────────────────────────────
  const handleFile = useCallback(async (f: File) => {
    const allowed = [".xlsx", ".xls", ".csv"];
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error("صيغة غير مدعومة", { description: "يُقبل فقط: .xlsx, .xls, .csv" });
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("الملف كبير جداً", { description: "الحد الأقصى 5 ميجابايت" });
      return;
    }

    setFile(f);
    setStep("upload");
    setParsedItems([]);
    setParseResult(null);
    setAvailableOptions(null);
    setShowAddForm(false);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      if (!base64) { toast.error("تعذّر قراءة الملف"); return; }

      try {
        const result = await parseMutation.mutateAsync({
          base64,
          fileName: f.name,
          distributorId,
          distributorName,
          distributorCompany,
          orderType,
        });

        setParsedItems(result.items as ParsedItem[]);

        // استخراج الخيارات المتاحة من نتيجة التحليل
        if ((result as any).availableOptions) {
          setAvailableOptions((result as any).availableOptions as AvailableOptions);
        }

        const autoFixedCount = (result.items as ParsedItem[]).filter(
          item => item.matchInfo && (item.matchInfo.materialMatched || item.matchInfo.colorMatched)
        ).length;

        setParseResult({
          totalRows: result.totalRows,
          validCount: result.validCount,
          errorCount: result.errorCount,
          aiError: result.aiError,
          fileName: result.fileName,
          autoFixedCount,
        });
        setStep("preview");

        if (result.aiError) {
          toast.warning("تحليل جزئي", { description: result.aiError });
        } else if (autoFixedCount > 0) {
          toast.success(`تم تحليل ${result.validCount} بند`, {
            description: `تم تصحيح ${autoFixedCount} قيمة تلقائياً لتطابق خيارات المنتج`,
          });
        } else {
          toast.success(`تم تحليل ${result.validCount} بند بنجاح`);
        }
      } catch (err: any) {
        toast.error("فشل التحليل", { description: err.message });
        setFile(null);
      }
    };
    reader.readAsDataURL(f);
  }, [distributorId, distributorName, distributorCompany, orderType, parseMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  // ── Item CRUD ────────────────────────────────────────────
  const removeItem = (idx: number) => {
    setParsedItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, updated: ParsedItem) => {
    setParsedItems(prev => prev.map((item, i) => (i === idx ? updated : item)));
  };

  const addItem = (item: ParsedItem) => {
    setParsedItems(prev => [...prev, item]);
  };

  // ── Submit order ─────────────────────────────────────────
  const handleSubmit = async () => {
    const validItems = parsedItems.filter(i => i.valid);
    if (validItems.length === 0) {
      toast.error("لا توجد بنود صالحة للإرسال");
      return;
    }

    setStep("submitting");
    try {
      const totalAmount = validItems.reduce((sum, i) => sum + (i.unitPrice || 0) * i.quantity, 0);
      const result = await createMutation.mutateAsync({
        distributorId,
        distributorName,
        distributorCompany,
        orderType,
        items: validItems.map(i => ({
          doorType: i.doorType,
          woodType: i.woodType || undefined,
          color: i.color || undefined,
          colorHex: i.colorHex,
          width: i.width,
          height: i.height,
          thickness: i.thickness,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          notes: i.notes || undefined,
          selections: i.selections,
        })),
        totalAmount,
        source: "excel_upload",
        excelFileName: file?.name,
      });

      setStep("done");
      toast.success(`تم إرسال الطلب بنجاح! رقم الطلب: ${result.orderNumber}`);
      onSuccess(result.orderNumber);
    } catch (err: any) {
      setStep("preview");
      toast.error("فشل إرسال الطلب", { description: err.message });
    }
  };

  // ── Download template ────────────────────────────────────
  const handleDownloadTemplate = async () => {
    try {
      const result = await templateMutation.mutateAsync();
      const link = document.createElement("a");
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${result.base64}`;
      link.download = result.fileName;
      link.click();
      toast.success("تم تنزيل القالب");
    } catch {
      toast.error("تعذّر تنزيل القالب");
    }
  };

  // ── Derived state ────────────────────────────────────────
  const validItems = parsedItems.filter(i => i.valid);
  const invalidItems = parsedItems.filter(i => !i.valid);
  const totalAmount = validItems.reduce((sum, i) => sum + (i.unitPrice || 0) * i.quantity, 0);
  const autoFixedItems = parsedItems.filter(
    i => i.matchInfo && (i.matchInfo.materialMatched || i.matchInfo.colorMatched)
  );

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            رفع طلب من Excel
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            ارفع ملف Excel وعدّل البنود مباشرةً قبل الإرسال
          </p>
        </div>
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <AnimatePresence mode="wait">

        {/* ══ Step: Upload ══ */}
        {step === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Download template */}
            <button
              onClick={handleDownloadTemplate}
              disabled={templateMutation.isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-dashed border-green-300 rounded-xl text-sm text-green-700 hover:bg-green-50 transition-colors"
            >
              {templateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              تنزيل قالب Excel الجاهز (يعكس خيارات المنتج الحالية)
            </button>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !parseMutation.isPending && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-green-400 bg-green-50"
                  : parseMutation.isPending
                  ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                  : "border-gray-200 hover:border-green-300 hover:bg-green-50/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInput}
                className="hidden"
                disabled={parseMutation.isPending}
              />

              {parseMutation.isPending ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
                  <div>
                    <p className="font-semibold text-gray-700">جارٍ التحليل بالذكاء الاصطناعي...</p>
                    <p className="text-xs text-gray-400 mt-1">يطابق الخيارات مع قاعدة البيانات</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isDragging ? "bg-green-100" : "bg-gray-100"}`}>
                    <Upload className={`w-7 h-7 transition-colors ${isDragging ? "text-green-600" : "text-gray-400"}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">
                      {isDragging ? "أفلت الملف هنا" : "اسحب وأفلت الملف هنا"}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">أو انقر للاختيار</p>
                    <p className="text-xs text-gray-300 mt-2">.xlsx, .xls, .csv — حد أقصى 5 ميجابايت</p>
                  </div>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 space-y-1">
              <p className="font-semibold flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> تعليمات الملف:
              </p>
              <p>• العمود الأول: نوع الباب (إلزامي)</p>
              <p>• الأعمدة التالية: المادة، اللون، العرض، الارتفاع، السماكة، الكمية، السعر، الملاحظات</p>
              <p>• الذكاء الاصطناعي يتعرف على أي تنسيق ويطابق الخيارات تلقائياً مع قاعدة البيانات</p>
              <p>• يمكنك تعديل أي بند يدوياً بعد الرفع قبل الإرسال</p>
            </div>
          </motion.div>
        )}

        {/* ══ Step: Preview ══ */}
        {step === "preview" && parseResult && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Summary bar */}
            <div className={`grid gap-2 ${autoFixedItems.length > 0 ? "grid-cols-4" : "grid-cols-3"}`}>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-gray-800">{parsedItems.length}</p>
                <p className="text-xs text-gray-500">إجمالي البنود</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-green-700">{validItems.length}</p>
                <p className="text-xs text-green-600">بنود صالحة</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${invalidItems.length > 0 ? "bg-red-50" : "bg-gray-50"}`}>
                <p className={`text-xl font-black ${invalidItems.length > 0 ? "text-red-600" : "text-gray-400"}`}>
                  {invalidItems.length}
                </p>
                <p className={`text-xs ${invalidItems.length > 0 ? "text-red-500" : "text-gray-400"}`}>
                  تحتاج تصحيح
                </p>
              </div>
              {autoFixedItems.length > 0 && (
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-emerald-700">{autoFixedItems.length}</p>
                  <p className="text-xs text-emerald-600">صُحِّح آلياً</p>
                </div>
              )}
            </div>

            {/* Auto-fix notice */}
            {autoFixedItems.length > 0 && (
              <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700">
                <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">تم التصحيح التلقائي لـ {autoFixedItems.length} بند</p>
                  <p>تم مطابقة المواد والألوان مع خيارات المنتج المتاحة في قاعدة البيانات. يمكنك مراجعة كل بند بالنقر على أيقونة القلم.</p>
                </div>
              </div>
            )}

            {/* AI error warning */}
            {parseResult.aiError && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">تحليل جزئي</p>
                  <p>{parseResult.aiError}</p>
                </div>
              </div>
            )}

            {/* Edit hint for invalid items */}
            {invalidItems.length > 0 && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                <Pencil className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>
                  <span className="font-semibold">{invalidItems.length} بند يحتاج تصحيح.</span>{" "}
                  انقر على أيقونة القلم في أي بند لتعديله مباشرةً.
                  {availableOptions && " الخيارات ستظهر كقوائم منسدلة تعكس إعدادات المنتج."}
                </p>
              </div>
            )}

            {/* Items list */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              <AnimatePresence>
                {parsedItems.map((item, idx) => (
                  <ItemPreviewCard
                    key={item.id}
                    item={item}
                    index={idx}
                    availableOptions={availableOptions}
                    onRemove={() => removeItem(idx)}
                    onUpdate={(updated) => updateItem(idx, updated)}
                  />
                ))}
              </AnimatePresence>

              {/* Add new item form */}
              <AnimatePresence>
                {showAddForm && (
                  <AddItemForm
                    key="add-form"
                    availableOptions={availableOptions}
                    onAdd={addItem}
                    onClose={() => setShowAddForm(false)}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Add item button */}
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/30 transition-colors"
              >
                <Plus className="w-4 h-4" />
                إضافة بند جديد يدوياً
              </button>
            )}

            {/* Total */}
            {totalAmount > 0 && (
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <span className="text-sm text-gray-600">الإجمالي التقديري</span>
                <span className="font-bold text-lg text-green-700">
                  {totalAmount.toLocaleString()} ر.س
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => { setStep("upload"); setFile(null); setParsedItems([]); setParseResult(null); setShowAddForm(false); setAvailableOptions(null); }}
                className="gap-1.5 flex-1"
              >
                <RefreshCw className="w-4 h-4" />
                رفع ملف آخر
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={validItems.length === 0}
                className="gap-1.5 flex-1 text-white bg-green-700 hover:bg-green-800"
              >
                <Send className="w-4 h-4" />
                إرسال {validItems.length} بند
              </Button>
            </div>
          </motion.div>
        )}

        {/* ══ Step: Submitting ══ */}
        {step === "submitting" && (
          <motion.div
            key="submitting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 gap-4"
          >
            <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
            <div className="text-center">
              <p className="font-semibold text-gray-700">جارٍ تسجيل الطلب...</p>
              <p className="text-xs text-gray-400 mt-1">يرجى الانتظار</p>
            </div>
          </motion.div>
        )}

        {/* ══ Step: Done ══ */}
        {step === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-10 gap-4"
          >
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-800 text-lg">تم إرسال الطلب بنجاح!</p>
              <p className="text-sm text-gray-500 mt-1">
                تم تسجيل {validItems.length} بند من ملف {file?.name}
              </p>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
