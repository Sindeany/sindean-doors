// ============================================================
// AdminProductForm - صفحة إضافة/تعديل المنتج الاحترافية
// Multi-step form: Basic Info + Specs + Sizes + Colors + Images
// ============================================================
import { useState, useRef, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import {
  ChevronRight,
  ChevronLeft,
  Package,
  Ruler,
  Palette,
  ImageIcon,
  Plus,
  X,
  Check,
  Upload,
  Trash2,
  Save,
  ArrowLeft,
  Star,
  Info,
  Layers,
  DollarSign,
  Hash,
  FileText,
  Settings2,
  AlertCircle,
  CheckCircle2,
  GripVertical,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";

// ─── Types ───────────────────────────────────────────────────
type ProductCategory =
  | "exterior"
  | "interior"
  | "classic"
  | "modern"
  | "luxury";
type WoodType =
  | "oak"
  | "walnut"
  | "mahogany"
  | "beech"
  | "pine"
  | "mdf"
  | "hdf"
  | "composite";
type FinishType =
  | "natural"
  | "lacquer"
  | "paint"
  | "veneer"
  | "pvd"
  | "powder_coat";
type DoorStyle =
  | "panel"
  | "flush"
  | "french"
  | "barn"
  | "pivot"
  | "sliding"
  | "bifold";
type FireRating = "none" | "30min" | "60min" | "90min" | "120min";
type SoundRating = "none" | "32db" | "36db" | "42db" | "48db";

interface ProductSpec {
  woodType: WoodType;
  finishType: FinishType;
  doorStyle: DoorStyle;
  fireRating: FireRating;
  soundRating: SoundRating;
  thickness: string;
  weight: string;
  warranty: string;
  features: string[];
  installationType: string;
  frameIncluded: boolean;
  lockIncluded: boolean;
  customizable: boolean;
  leadTime: string;
  minOrderQty: number;
}

interface SizeEntry {
  id: string;
  width: string;
  height: string;
  unit: "cm" | "mm" | "inch";
  label: string;
  priceAdjust: number;
  isCustom: boolean;
}

interface ColorEntry {
  id: string;
  name: string;
  nameEn: string;
  hex: string;
  priceAdjust: number;
  inStock: boolean;
}

interface ProductImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  type: "main" | "detail" | "installation" | "room";
}

interface ProductForm {
  name: string;
  nameEn: string;
  category: ProductCategory;
  sku: string;
  price: number;
  distributorPrice: number;
  stock: number;
  description: string;
  descriptionEn: string;
  tags: string[];
  spec: ProductSpec;
  sizes: SizeEntry[];
  colors: ColorEntry[];
  images: ProductImage[];
  status: "active" | "archived" | "draft";
  featured: boolean;
  metaTitle: string;
  metaDescription: string;
  options: Record<string, string[]>; // groupId → selected value IDs
}

// ─── Constants ───────────────────────────────────────────────
const PRESET_SIZES: { label: string; width: string; height: string }[] = [
  { label: "60×200", width: "60", height: "200" },
  { label: "70×200", width: "70", height: "200" },
  { label: "80×200", width: "80", height: "200" },
  { label: "90×200", width: "90", height: "200" },
  { label: "80×210", width: "80", height: "210" },
  { label: "90×210", width: "90", height: "210" },
  { label: "100×210", width: "100", height: "210" },
  { label: "80×215", width: "80", height: "215" },
  { label: "90×215", width: "90", height: "215" },
  { label: "100×215", width: "100", height: "215" },
  { label: "90×220", width: "90", height: "220" },
  { label: "100×220", width: "100", height: "220" },
  { label: "110×220", width: "110", height: "220" },
  { label: "120×220", width: "120", height: "220" },
  { label: "100×240", width: "100", height: "240" },
  { label: "120×240", width: "120", height: "240" },
];

const PRESET_COLORS: { name: string; nameEn: string; hex: string }[] = [
  { name: "أبيض ناصع", nameEn: "Pure White", hex: "#FFFFFF" },
  { name: "أبيض مطفي", nameEn: "Off White", hex: "#F5F0E8" },
  { name: "بيج", nameEn: "Beige", hex: "#D4B896" },
  { name: "رمادي فاتح", nameEn: "Light Gray", hex: "#D1D5DB" },
  { name: "رمادي", nameEn: "Gray", hex: "#6B7280" },
  { name: "رمادي داكن", nameEn: "Dark Gray", hex: "#374151" },
  { name: "أسود مطفي", nameEn: "Matte Black", hex: "#1F2937" },
  { name: "بني فاتح", nameEn: "Light Brown", hex: "#C4956A" },
  { name: "بلوط فاتح", nameEn: "Light Oak", hex: "#C8A96E" },
  { name: "بلوط داكن", nameEn: "Dark Oak", hex: "#8B6914" },
  { name: "جوزي", nameEn: "Walnut", hex: "#6B4226" },
  { name: "جوزي داكن", nameEn: "Dark Walnut", hex: "#3D1F0D" },
  { name: "ماهوجني", nameEn: "Mahogany", hex: "#7B2D00" },
  { name: "زان طبيعي", nameEn: "Natural Beech", hex: "#D4A96A" },
  { name: "أسود مع ذهبي", nameEn: "Black & Gold", hex: "#1A1A1A" },
  { name: "أبيض مع ذهبي", nameEn: "White & Gold", hex: "#FAF7F0" },
];

const WOOD_TYPES: Record<WoodType, string> = {
  oak: "بلوط",
  walnut: "جوز",
  mahogany: "ماهوجني",
  beech: "زان",
  pine: "صنوبر",
  mdf: "MDF",
  hdf: "HDF",
  composite: "مركّب",
};
const FINISH_TYPES: Record<FinishType, string> = {
  natural: "طبيعي",
  lacquer: "لاكيه",
  paint: "دهان",
  veneer: "قشرة خشب",
  pvd: "PVD",
  powder_coat: "بودرة كوت",
};
const DOOR_STYLES: Record<DoorStyle, string> = {
  panel: "ألواح",
  flush: "مستوي",
  french: "فرنسي",
  barn: "حظيرة",
  pivot: "محوري",
  sliding: "منزلق",
  bifold: "طيّ",
};
const FIRE_RATINGS: Record<FireRating, string> = {
  none: "لا يوجد",
  "30min": "30 دقيقة",
  "60min": "60 دقيقة",
  "90min": "90 دقيقة",
  "120min": "120 دقيقة",
};
const SOUND_RATINGS: Record<SoundRating, string> = {
  none: "لا يوجد",
  "32db": "32 ديسيبل",
  "36db": "36 ديسيبل",
  "42db": "42 ديسيبل",
  "48db": "48 ديسيبل",
};
const DOOR_FEATURES = [
  "مقاوم للحريق",
  "عازل للصوت",
  "مقاوم للرطوبة",
  "مقاوم للحشرات",
  "عازل للحرارة",
  "مقاوم للصدأ",
  "مقاوم للخدش",
  "سهل التنظيف",
  "صديق للبيئة",
  "شهادة ISO",
  "ضمان موسّع",
  "تركيب مجاني",
];
const CATEGORIES: Record<
  ProductCategory,
  { label: string; color: string; desc: string }
> = {
  exterior: {
    label: "خارجي",
    color: "#3B82F6",
    desc: "أبواب المداخل والواجهات",
  },
  interior: { label: "داخلي", color: "#10B981", desc: "أبواب الغرف الداخلية" },
  classic: {
    label: "كلاسيكي",
    color: "#D97706",
    desc: "تصاميم تراثية وكلاسيكية",
  },
  modern: { label: "عصري", color: "#8B5CF6", desc: "تصاميم معاصرة ومينيمال" },
  luxury: { label: "فاخر", color: "#F59E0B", desc: "أبواب فاخرة بمواد متميزة" },
};

const STEPS = [
  { id: 1, label: "المعلومات الأساسية", icon: <Info className="w-4 h-4" /> },
  { id: 2, label: "خيارات المنتج", icon: <Settings2 className="w-4 h-4" /> },
  { id: 3, label: "المقاسات", icon: <Ruler className="w-4 h-4" /> },
  { id: 4, label: "الصور", icon: <ImageIcon className="w-4 h-4" /> },
];

// ─── Default Form ─────────────────────────────────────────────
const defaultForm: ProductForm = {
  name: "",
  nameEn: "",
  category: "interior",
  sku: "",
  price: 0,
  distributorPrice: 0,
  stock: 0,
  description: "",
  descriptionEn: "",
  tags: [],
  status: "draft",
  featured: false,
  metaTitle: "",
  metaDescription: "",
  options: {},
  spec: {
    woodType: "mdf",
    finishType: "paint",
    doorStyle: "flush",
    fireRating: "none",
    soundRating: "none",
    thickness: "45",
    weight: "",
    warranty: "سنة واحدة",
    features: [],
    installationType: "مفصلات قياسية",
    frameIncluded: false,
    lockIncluded: false,
    customizable: true,
    leadTime: "7-10 أيام",
    minOrderQty: 1,
  },
  sizes: [],
  colors: [],
  images: [],
};

// ─── Step 1: Basic Info ───────────────────────────────────────
function StepBasicInfo({
  form,
  setForm,
}: {
  form: ProductForm;
  setForm: (f: ProductForm) => void;
}) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [tagInput, setTagInput] = useState("");

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t))
      setForm({ ...form, tags: [...form.tags, t] });
    setTagInput("");
  };

  return (
    <div className="space-y-6">
      {/* Names */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
            الاسم بالعربية *
          </label>
          <input
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="باب خشبي كلاسيكي"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-100 transition-all"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
            الاسم بالإنجليزية
          </label>
          <input
            value={form.nameEn}
            onChange={e => setForm({ ...form, nameEn: e.target.value })}
            placeholder="Classic Wooden Door"
            dir="ltr"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-100 transition-all"
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="text-xs font-semibold text-gray-700 mb-2 block">
          الفئة *
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(Object.keys(CATEGORIES) as ProductCategory[]).map(cat => {
            const c = CATEGORIES[cat];
            const active = form.category === cat;
            return (
              <button
                key={cat}
                onClick={() => setForm({ ...form, category: cat })}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center"
                style={
                  active
                    ? { borderColor: c.color, background: `${c.color}10` }
                    : { borderColor: "#E5E7EB", background: "#F9FAFB" }
                }
              >
                <span
                  className="text-sm font-bold"
                  style={{ color: active ? c.color : "#6B7280" }}
                >
                  {c.label}
                </span>
                <span
                  className="text-xs leading-tight"
                  style={{ color: active ? c.color : "#9CA3AF" }}
                >
                  {c.desc}
                </span>
                {active && (
                  <Check className="w-3.5 h-3.5" style={{ color: c.color }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SKU + Status + Featured */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
            رقم SKU
          </label>
          <input
            value={form.sku}
            onChange={e => setForm({ ...form, sku: e.target.value })}
            placeholder="SND-INT-001"
            dir="ltr"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-green-500 transition-all"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
            الحالة
          </label>
          <select
            value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value as any })}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-all bg-white"
          >
            <option value="draft">مسودة</option>
            <option value="active">نشط</option>
            <option value="archived">مؤرشف</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={() => setForm({ ...form, featured: !form.featured })}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all font-medium text-sm"
            style={
              form.featured
                ? {
                    borderColor: "#F59E0B",
                    background: "#FFFBEB",
                    color: "#92400E",
                  }
                : {
                    borderColor: "#E5E7EB",
                    background: "#F9FAFB",
                    color: "#6B7280",
                  }
            }
          >
            <Star
              className="w-4 h-4"
              fill={form.featured ? "#F59E0B" : "none"}
            />
            {form.featured ? "منتج مميز ✓" : "تمييز المنتج"}
          </button>
        </div>
      </div>

      {/* Pricing */}
      <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50 space-y-3">
        <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <DollarSign
            className="w-4 h-4"
            style={{ color: "oklch(0.38 0.06 160)" }}
          />
          التسعير
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              سعر التجزئة (ر.س) *
            </label>
            <input
              type="number"
              value={form.price || ""}
              onChange={e => setForm({ ...form, price: +e.target.value })}
              placeholder="0"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-all bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              سعر الموزع (ر.س) *
            </label>
            <input
              type="number"
              value={form.distributorPrice || ""}
              onChange={e =>
                setForm({ ...form, distributorPrice: +e.target.value })
              }
              placeholder="0"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-all bg-white"
            />
            {form.price > 0 && form.distributorPrice > 0 && (
              <p className="text-xs text-green-600 mt-1">
                هامش الربح:{" "}
                {Math.round((1 - form.distributorPrice / form.price) * 100)}%
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              المخزون (قطعة)
            </label>
            <input
              type="number"
              value={form.stock || ""}
              onChange={e => setForm({ ...form, stock: +e.target.value })}
              placeholder="0"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition-all bg-white"
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
            الوصف بالعربية
          </label>
          <Textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="وصف تفصيلي للمنتج..."
            rows={4}
            className="text-sm resize-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
            الوصف بالإنجليزية
          </label>
          <Textarea
            value={form.descriptionEn}
            onChange={e => setForm({ ...form, descriptionEn: e.target.value })}
            placeholder="Detailed product description..."
            rows={4}
            className="text-sm resize-none"
            dir="ltr"
          />
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
          الوسوم (Tags)
        </label>
        <div className="flex gap-2 mb-2">
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
            placeholder="أضف وسماً واضغط Enter"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-green-500 transition-all"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={addTag}
            className="gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {form.tags.map(tag => (
            <span
              key={tag}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
              style={{
                background: "oklch(0.95 0.02 160)",
                color: "oklch(0.38 0.06 160)",
              }}
            >
              {tag}
              <button
                onClick={() =>
                  setForm({ ...form, tags: form.tags.filter(t => t !== tag) })
                }
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Product Options ──────────────────────────────────
function StepProductOptions({
  form,
  setForm,
  sections,
}: {
  form: ProductForm;
  setForm: (f: ProductForm) => void;
  sections: any[];
}) {
  // Filter out dimensions section — handled in StepDimensions
  const displaySections = sections.filter(
    (s: any) => s.enabled !== false && s.id !== "dimensions"
  );

  const getSelected = (groupId: string): string[] =>
    form.options[groupId] ?? [];

  const toggleValue = (groupId: string, valueId: string) => {
    const current = getSelected(groupId);
    const updated = current.includes(valueId)
      ? current.filter(v => v !== valueId)
      : [...current, valueId];
    setForm({ ...form, options: { ...form.options, [groupId]: updated } });
  };

  const toggleAllValues = (groupId: string, allValueIds: string[]) => {
    const current = getSelected(groupId);
    const allSelected =
      allValueIds.length > 0 && allValueIds.every(id => current.includes(id));
    setForm({
      ...form,
      options: {
        ...form.options,
        [groupId]: allSelected ? [] : [...allValueIds],
      },
    });
  };

  const toggleToggleGroup = (groupId: string) => {
    const current = getSelected(groupId);
    setForm({
      ...form,
      options: {
        ...form.options,
        [groupId]: current.includes("enabled") ? [] : ["enabled"],
      },
    });
  };

  if (displaySections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-2xl">
          ⚙️
        </div>
        <p className="font-semibold text-gray-700">
          لا توجد خيارات مُعرَّفة بعد
        </p>
        <p className="text-sm text-gray-400 max-w-xs">
          اذهب إلى صفحة «خيارات الطلب» في الأدمن لإنشاء الأقسام أولاً
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        حدد القيم المتاحة لكل خيار في هذا المنتج. القيم غير المحددة لن تظهر
        للعميل عند الطلب. إذا تركت خياراً فارغاً ستُعرض جميع قيمه للعميل.
      </p>
      {displaySections.map((section: any) => {
        const sectionGroups = (section.groups ?? []).filter(
          (g: any) =>
            g.enabled !== false &&
            g.type !== "section_header" &&
            g.type !== "text_input"
        );
        if (sectionGroups.length === 0) return null;
        return (
          <div
            key={section.id}
            className="p-4 rounded-2xl border border-gray-100 space-y-4"
          >
            <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <span className="text-lg">{section.icon}</span>
              {section.label}
            </h4>
            {sectionGroups.map((group: any) => {
              const selected = getSelected(group.id);
              const enabledValues = (group.values ?? []).filter(
                (v: any) => v.enabled !== false
              );
              const isToggle = group.type === "toggle";
              const isEnabled = selected.includes("enabled");
              const allSelected =
                enabledValues.length > 0 &&
                enabledValues.every((v: any) => selected.includes(v.id));
              return (
                <div key={group.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-600">
                      {group.label}
                      {!group.required && (
                        <span className="mr-1 text-gray-400 font-normal">
                          (اختياري)
                        </span>
                      )}
                    </label>
                    {!isToggle && enabledValues.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          toggleAllValues(
                            group.id,
                            enabledValues.map((v: any) => v.id)
                          )
                        }
                        className="text-xs hover:underline"
                        style={{ color: "oklch(0.38 0.06 160)" }}
                      >
                        {allSelected ? "إلغاء التحديد" : "تحديد الكل"}
                      </button>
                    )}
                  </div>

                  {isToggle ? (
                    <button
                      type="button"
                      onClick={() => toggleToggleGroup(group.id)}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all w-full text-right"
                      style={
                        isEnabled
                          ? {
                              borderColor: "oklch(0.38 0.06 160)",
                              background: "oklch(0.95 0.02 160)",
                              color: "oklch(0.38 0.06 160)",
                            }
                          : {
                              borderColor: "#E5E7EB",
                              background: "#fff",
                              color: "#6B7280",
                            }
                      }
                    >
                      <div
                        className="w-10 h-5 rounded-full relative flex-shrink-0 transition-all"
                        style={{
                          background: isEnabled
                            ? "oklch(0.38 0.06 160)"
                            : "#D1D5DB",
                        }}
                      >
                        <div
                          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                          style={{
                            right: isEnabled ? "2px" : "auto",
                            left: isEnabled ? "auto" : "2px",
                          }}
                        />
                      </div>
                      {isEnabled ? "متاح لهذا المنتج" : "غير متاح لهذا المنتج"}
                    </button>
                  ) : group.type === "color_swatches" ? (
                    <div className="flex flex-wrap gap-3">
                      {enabledValues.map((v: any) => {
                        const isSel = selected.includes(v.id);
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => toggleValue(group.id, v.id)}
                            title={v.label}
                            className="flex flex-col items-center gap-1"
                          >
                            <div
                              className="relative w-10 h-10 rounded-full border-4 transition-all flex items-center justify-center"
                              style={{
                                backgroundColor: v.hex ?? "#E0E0E0",
                                borderColor: isSel
                                  ? "oklch(0.38 0.06 160)"
                                  : "#E5E7EB",
                                transform: isSel ? "scale(1.1)" : "scale(1)",
                                opacity: isSel ? 1 : 0.5,
                              }}
                            >
                              {isSel && (
                                <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                              )}
                            </div>
                            <span
                              className="text-xs"
                              style={{
                                color: isSel
                                  ? "oklch(0.38 0.06 160)"
                                  : "#9CA3AF",
                                fontWeight: isSel ? "700" : "400",
                              }}
                            >
                              {v.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {enabledValues.map((v: any) => {
                        const isSel = selected.includes(v.id);
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => toggleValue(group.id, v.id)}
                            className="px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all"
                            style={
                              isSel
                                ? {
                                    background: "oklch(0.38 0.06 160)",
                                    color: "white",
                                    borderColor: "oklch(0.38 0.06 160)",
                                  }
                                : {
                                    background: "#F9FAFB",
                                    color: "#374151",
                                    borderColor: "#E5E7EB",
                                  }
                            }
                          >
                            {isSel && "✓ "}
                            {v.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {!isToggle &&
                    enabledValues.length > 0 &&
                    selected.length === 0 && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        لم تختر أي قيمة — ستظهر جميع القيم للعميل
                      </p>
                    )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 3: Dimensions ───────────────────────────────────────
function StepDimensions({
  form,
  setForm,
  sections,
}: {
  form: ProductForm;
  setForm: (f: ProductForm) => void;
  sections: any[];
}) {
  const dimSection = (sections as any[]).find(
    (s: any) => s.id === "dimensions"
  );

  const getSelected = (groupId: string): string[] =>
    form.options[groupId] ?? [];

  const toggleValue = (groupId: string, valueId: string) => {
    const current = getSelected(groupId);
    const updated = current.includes(valueId)
      ? current.filter(v => v !== valueId)
      : [...current, valueId];
    setForm({ ...form, options: { ...form.options, [groupId]: updated } });
  };

  const toggleGroup = (groupId: string) => {
    const current = getSelected(groupId);
    setForm({
      ...form,
      options: {
        ...form.options,
        [groupId]: current.includes("enabled") ? [] : ["enabled"],
      },
    });
  };

  if (!dimSection) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Ruler className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">
          لم يتم تعريف قسم المقاسات في إعدادات خيارات الطلب
        </p>
      </div>
    );
  }

  const groups = ((dimSection as any).groups ?? []).filter(
    (g: any) => g.enabled !== false && g.type !== "section_header"
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        حدد حقول المقاسات المتاحة لهذا المنتج. الحقول الرقمية يدخل فيها العميل
        القيمة بحرية، والشرائح يمكنك تحديد القيم المتاحة منها.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {groups.map((group: any) => {
          const selected = getSelected(group.id);
          const isEnabled = selected.includes("enabled");

          if (group.type === "chips") {
            const enabledValues = (group.values ?? []).filter(
              (v: any) => v.enabled !== false
            );
            return (
              <div
                key={group.id}
                className="p-3 rounded-xl border border-gray-200 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">
                    {group.label}
                  </span>
                  {group.unit && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {group.unit}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {enabledValues.map((v: any) => {
                    const isSel = selected.includes(v.id);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => toggleValue(group.id, v.id)}
                        className="px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all"
                        style={
                          isSel
                            ? {
                                background: "oklch(0.38 0.06 160)",
                                color: "white",
                                borderColor: "oklch(0.38 0.06 160)",
                              }
                            : {
                                background: "#F9FAFB",
                                color: "#374151",
                                borderColor: "#E5E7EB",
                              }
                        }
                      >
                        {isSel && "✓ "}
                        {v.label}
                      </button>
                    );
                  })}
                </div>
                {selected.length === 0 && enabledValues.length > 0 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    لم تختر أي قيمة — ستظهر جميع القيم
                  </p>
                )}
              </div>
            );
          }

          // number_input — toggle enabled/disabled
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => toggleGroup(group.id)}
              className="flex items-center gap-3 p-3 rounded-xl border-2 text-right transition-all"
              style={
                isEnabled
                  ? {
                      borderColor: "oklch(0.38 0.06 160)",
                      background: "oklch(0.95 0.02 160)",
                    }
                  : { borderColor: "#E5E7EB", background: "#fff" }
              }
            >
              <div
                className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0"
                style={
                  isEnabled
                    ? {
                        background: "oklch(0.38 0.06 160)",
                        borderColor: "oklch(0.38 0.06 160)",
                      }
                    : { borderColor: "#D1D5DB" }
                }
              >
                {isEnabled && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className="text-right flex-1">
                <p
                  className="text-sm font-medium"
                  style={{
                    color: isEnabled ? "oklch(0.38 0.06 160)" : "#374151",
                  }}
                >
                  {group.label}
                </p>
                {(group.unit || group.placeholder) && (
                  <p className="text-xs text-gray-400">
                    {group.unit && `${group.unit} · `}
                    {group.placeholder}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {groups.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Ruler className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">لا توجد حقول مقاسات محددة</p>
        </div>
      )}
    </div>
  );
}

function StepColors({
  form,
  setForm,
}: {
  form: ProductForm;
  setForm: (f: ProductForm) => void;
}) {
  const [customName, setCustomName] = useState("");
  const [customNameEn, setCustomNameEn] = useState("");
  const [customHex, setCustomHex] = useState("#8B6914");
  const [customPriceAdj, setCustomPriceAdj] = useState("0");

  const togglePreset = (preset: {
    name: string;
    nameEn: string;
    hex: string;
  }) => {
    const exists = form.colors.find(c => c.name === preset.name);
    if (exists) {
      setForm({
        ...form,
        colors: form.colors.filter(c => c.name !== preset.name),
      });
    } else {
      const newColor: ColorEntry = {
        id: `C${Date.now()}`,
        name: preset.name,
        nameEn: preset.nameEn,
        hex: preset.hex,
        priceAdjust: 0,
        inStock: true,
      };
      setForm({ ...form, colors: [...form.colors, newColor] });
    }
  };

  const addCustom = () => {
    if (!customName.trim()) {
      toast.error("أدخل اسم اللون");
      return;
    }
    if (form.colors.find(c => c.name === customName.trim())) {
      toast.error("هذا اللون موجود بالفعل");
      return;
    }
    const newColor: ColorEntry = {
      id: `C${Date.now()}`,
      name: customName.trim(),
      nameEn: customNameEn.trim(),
      hex: customHex,
      priceAdjust: +customPriceAdj || 0,
      inStock: true,
    };
    setForm({ ...form, colors: [...form.colors, newColor] });
    setCustomName("");
    setCustomNameEn("");
    setCustomHex("#8B6914");
    setCustomPriceAdj("0");
  };

  const removeColor = (id: string) =>
    setForm({ ...form, colors: form.colors.filter(c => c.id !== id) });
  const toggleStock = (id: string) =>
    setForm({
      ...form,
      colors: form.colors.map(c =>
        c.id === id ? { ...c, inStock: !c.inStock } : c
      ),
    });

  return (
    <div className="space-y-6">
      {/* Preset Colors */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-bold text-gray-700">
            الألوان القياسية
          </label>
          <span className="text-xs text-gray-400">
            انقر لتحديد الألوان المتوفرة
          </span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
          {PRESET_COLORS.map(preset => {
            const selected = !!form.colors.find(c => c.name === preset.name);
            const isDark = parseInt(preset.hex.slice(1, 3), 16) < 128;
            return (
              <button
                key={preset.name}
                onClick={() => togglePreset(preset)}
                className="relative flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all"
                style={
                  selected
                    ? { borderColor: "oklch(0.38 0.06 160)" }
                    : { borderColor: "#E5E7EB" }
                }
              >
                <div
                  className="w-10 h-10 rounded-lg border border-gray-200 shadow-sm flex items-center justify-center"
                  style={{ background: preset.hex }}
                >
                  {selected && (
                    <Check
                      className="w-4 h-4"
                      style={{ color: isDark ? "white" : "#1F2937" }}
                    />
                  )}
                </div>
                <span className="text-xs text-gray-600 text-center leading-tight">
                  {preset.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Color */}
      <div className="p-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50">
        <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4" style={{ color: "oklch(0.38 0.06 160)" }} />
          إضافة لون مخصص
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              الاسم بالعربية *
            </label>
            <input
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder="لون مخصص"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500 bg-white"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              الاسم بالإنجليزية
            </label>
            <input
              value={customNameEn}
              onChange={e => setCustomNameEn(e.target.value)}
              placeholder="Custom Color"
              dir="ltr"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500 bg-white"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              كود اللون
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={customHex}
                onChange={e => setCustomHex(e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
              />
              <input
                value={customHex}
                onChange={e => setCustomHex(e.target.value)}
                dir="ltr"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-green-500 bg-white"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              فرق السعر (ر.س)
            </label>
            <input
              value={customPriceAdj}
              onChange={e => setCustomPriceAdj(e.target.value)}
              type="number"
              placeholder="0"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500 bg-white"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={addCustom}
              className="w-full gap-1.5 text-white"
              style={{ background: "oklch(0.38 0.06 160)" }}
            >
              <Plus className="w-4 h-4" />
              إضافة
            </Button>
          </div>
        </div>
      </div>

      {/* Selected Colors */}
      {form.colors.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-gray-700 mb-3">
            الألوان المحددة ({form.colors.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {form.colors.map(c => (
              <div
                key={c.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100"
              >
                <div
                  className="w-10 h-10 rounded-xl border border-gray-200 shadow-sm flex-shrink-0"
                  style={{ background: c.hex }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800">
                    {c.name}
                  </div>
                  {c.nameEn && (
                    <div className="text-xs text-gray-400">{c.nameEn}</div>
                  )}
                  <div className="text-xs font-mono text-gray-400">{c.hex}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {c.priceAdjust !== 0 && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: "#FFFBEB", color: "#92400E" }}
                    >
                      +{c.priceAdjust} ر.س
                    </span>
                  )}
                  <button
                    onClick={() => toggleStock(c.id)}
                    className="text-xs px-2 py-1 rounded-lg font-medium transition-all"
                    style={
                      c.inStock
                        ? { background: "#ECFDF5", color: "#10B981" }
                        : { background: "#FEF2F2", color: "#EF4444" }
                    }
                  >
                    {c.inStock ? "متوفر" : "نفد"}
                  </button>
                  <button
                    onClick={() => removeColor(c.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {form.colors.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Palette className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">لم يتم تحديد أي لون بعد</p>
          <p className="text-xs mt-1">
            اختر من الألوان القياسية أو أضف لوناً مخصصاً
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Step 5: Images ───────────────────────────────────────────
function StepImages({
  form,
  setForm,
  fileRef,
}: {
  form: ProductForm;
  setForm: (f: ProductForm) => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [uploadDragOver, setUploadDragOver] = useState(false);
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const IMAGE_TYPES: Record<
    ProductImage["type"],
    { label: string; color: string }
  > = {
    main: { label: "رئيسية", color: "#3B82F6" },
    detail: { label: "تفصيل", color: "#8B5CF6" },
    installation: { label: "تركيب", color: "#10B981" },
    room: { label: "في المكان", color: "#F59E0B" },
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const current = form.images;
    Array.from(files).forEach((file, idx) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = e => {
        const url = e.target?.result as string;
        const newImg: ProductImage = {
          id: `IMG${Date.now()}${Math.random()}`,
          url,
          alt: file.name.replace(/\.[^.]+$/, ""),
          isPrimary: current.length === 0 && idx === 0,
          type: "main",
        };
        setForm({ ...form, images: [...form.images, newImg] });
      };
      reader.readAsDataURL(file);
    });
  };

  const setPrimary = (id: string) =>
    setForm({
      ...form,
      images: form.images.map(img => ({ ...img, isPrimary: img.id === id })),
    });

  const removeImage = (id: string) => {
    const remaining = form.images.filter(img => img.id !== id);
    if (remaining.length > 0 && !remaining.find(img => img.isPrimary))
      remaining[0].isPrimary = true;
    setForm({ ...form, images: remaining });
  };

  const updateType = (id: string, type: ProductImage["type"]) =>
    setForm({
      ...form,
      images: form.images.map(img => (img.id === id ? { ...img, type } : img)),
    });

  const updateAlt = (id: string, alt: string) =>
    setForm({
      ...form,
      images: form.images.map(img => (img.id === id ? { ...img, alt } : img)),
    });

  // Move image in the list
  const moveImage = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= form.images.length) return;
    const next = [...form.images];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setForm({ ...form, images: next });
  };

  // HTML5 drag-and-drop handlers for reordering
  const onDragStart = (idx: number) => {
    dragIndexRef.current = idx;
  };
  const onDragOverCard = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(idx);
  };
  const onDropCard = (idx: number) => {
    if (dragIndexRef.current === null || dragIndexRef.current === idx) {
      setDragOverIndex(null);
      return;
    }
    moveImage(dragIndexRef.current, idx);
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };
  const onDragEnd = () => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${uploadDragOver ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-gray-300 bg-gray-50"}`}
        onDragOver={e => {
          e.preventDefault();
          setUploadDragOver(true);
        }}
        onDragLeave={() => setUploadDragOver(false)}
        onDrop={e => {
          e.preventDefault();
          setUploadDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileRef.current?.click()}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{
            background: "oklch(0.95 0.02 160)",
            color: "oklch(0.38 0.06 160)",
          }}
        >
          <Upload className="w-7 h-7" />
        </div>
        <p className="font-semibold text-gray-700 mb-1">
          اسحب الصور هنا أو انقر للرفع
        </p>
        <p className="text-xs text-gray-400">
          PNG, JPG, WebP · حتى 10 صور · الحد الأقصى 5MB لكل صورة
        </p>
      </div>

      {/* Image Types Guide */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(IMAGE_TYPES) as ProductImage["type"][]).map(t => (
          <span
            key={t}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium"
            style={{
              background: `${IMAGE_TYPES[t].color}15`,
              color: IMAGE_TYPES[t].color,
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: IMAGE_TYPES[t].color }}
            />
            {IMAGE_TYPES[t].label}
          </span>
        ))}
        <span className="text-xs text-gray-400 flex items-center gap-1 ms-1">
          <GripVertical className="w-3.5 h-3.5" />
          اسحب البطاقة لإعادة الترتيب
        </span>
      </div>

      {/* Images Grid */}
      {form.images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {form.images.map((img, idx) => (
            <div
              key={img.id}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={e => onDragOverCard(e, idx)}
              onDrop={() => onDropCard(idx)}
              onDragEnd={onDragEnd}
              className={`flex flex-col rounded-xl overflow-hidden border-2 transition-all bg-white select-none ${
                img.isPrimary
                  ? "border-green-400 shadow-md"
                  : dragOverIndex === idx
                    ? "border-blue-400 shadow-lg scale-[1.02]"
                    : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {/* Top bar: drag handle + order arrows + delete */}
              <div className="flex items-center justify-between px-2 py-1.5 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-1">
                  <span className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500">
                    <GripVertical className="w-4 h-4" />
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    {idx + 1}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveImage(idx, idx - 1)}
                    disabled={idx === 0}
                    title="تحريك لليمين"
                    className="p-0.5 rounded text-gray-400 hover:text-gray-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(idx, idx + 1)}
                    disabled={idx === form.images.length - 1}
                    title="تحريك لليسار"
                    className="p-0.5 rounded text-gray-400 hover:text-gray-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    title="حذف الصورة"
                    className="p-0.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Image */}
              <div className="relative">
                <img
                  src={img.url}
                  alt={img.alt}
                  className="w-full aspect-square object-cover"
                  draggable={false}
                />
                {img.isPrimary && (
                  <div
                    className="absolute top-2 start-2 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold shadow"
                    style={{ background: "#10B981", color: "white" }}
                  >
                    <Star className="w-3 h-3" fill="white" />
                    رئيسية
                  </div>
                )}
              </div>

              {/* Bottom bar: type selector + set primary */}
              <div className="flex items-center gap-1.5 px-2 py-2 bg-gray-50 border-t border-gray-100">
                <select
                  value={img.type}
                  onChange={e =>
                    updateType(img.id, e.target.value as ProductImage["type"])
                  }
                  className="flex-1 text-xs px-1.5 py-1 rounded-lg font-medium border border-gray-200 focus:outline-none cursor-pointer bg-white"
                  style={{ color: IMAGE_TYPES[img.type].color }}
                  onClick={e => e.stopPropagation()}
                >
                  {(Object.keys(IMAGE_TYPES) as ProductImage["type"][]).map(
                    t => (
                      <option
                        key={t}
                        value={t}
                        style={{ color: IMAGE_TYPES[t].color }}
                      >
                        {IMAGE_TYPES[t].label}
                      </option>
                    )
                  )}
                </select>
                <button
                  type="button"
                  onClick={() => setPrimary(img.id)}
                  disabled={img.isPrimary}
                  title={
                    img.isPrimary ? "الصورة الرئيسية" : "تعيين كصورة رئيسية"
                  }
                  className={`p-1.5 rounded-lg border transition-all flex-shrink-0 ${
                    img.isPrimary
                      ? "bg-green-100 border-green-300 text-green-600 cursor-default"
                      : "bg-white border-gray-200 text-gray-400 hover:border-yellow-400 hover:text-yellow-500"
                  }`}
                >
                  <Star
                    className="w-3.5 h-3.5"
                    fill={img.isPrimary ? "currentColor" : "none"}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alt Text */}
      {form.images.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-gray-700">
            نص بديل للصور (SEO)
          </h4>
          {form.images.map((img, i) => (
            <div key={img.id} className="flex items-center gap-3">
              <img
                src={img.url}
                alt=""
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100"
              />
              <input
                value={img.alt}
                onChange={e => updateAlt(img.id, e.target.value)}
                placeholder={`وصف الصورة ${i + 1}`}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              />
            </div>
          ))}
        </div>
      )}

      {form.images.length === 0 && (
        <div className="text-center py-4 text-gray-400">
          <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">لم يتم رفع أي صورة بعد</p>
        </div>
      )}
    </div>
  );
}
export default function AdminProductForm() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [, navigate] = useLocation();
  const [, editParams] = useRoute("/admin/products/edit/:id");
  const editId = editParams?.id ? parseInt(editParams.id) : null;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ProductForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  // Ref for file input - kept outside AnimatePresence to avoid DOM removeChild errors
  const globalFileRef = useRef<HTMLInputElement>(null);

  // Hoist query here to avoid async state updates inside animated steps (prevents React 19 insertBefore error)
  const { data: globalSectionsData } = trpc.productOptions.get.useQuery();
  const globalSections = (globalSectionsData as any[] | null) ?? [];

  // Load existing product for edit mode
  const { data: existingProduct } = trpc.products.getById.useQuery(
    { id: String(editId) },
    { enabled: !!editId }
  );

  useEffect(() => {
    if (!existingProduct) return;
    const p = existingProduct as any;
    setForm({
      name: p.name ?? "",
      nameEn: p.nameEn ?? "",
      category: (p.category as ProductCategory) ?? "interior",
      sku: p.sku ?? "",
      price: p.basePrice ?? 0,
      distributorPrice: p.distributorPrice ?? 0,
      stock: p.stock ?? 0,
      description: p.description ?? "",
      descriptionEn: "",
      tags: Array.isArray(p.tags) ? p.tags : [],
      status: (p.status === "active" ? "active" : "archived") as
        | "active"
        | "archived"
        | "draft",
      featured: p.isBestseller ?? false,
      metaTitle: "",
      metaDescription: "",
      options:
        p.options && typeof p.options === "object" && !Array.isArray(p.options)
          ? (p.options as Record<string, string[]>)
          : {},
      spec: {
        woodType: (p.woodType as WoodType) ?? "mdf",
        finishType: "paint",
        doorStyle: "flush",
        fireRating: "none",
        soundRating: "none",
        thickness: "45",
        weight: p.weight ?? "",
        warranty:
          p.warranty ?? "\u0633\u0646\u0629 \u0648\u0627\u062d\u062f\u0629",
        features: Array.isArray(p.features) ? p.features : [],
        installationType:
          "\u0645\u0641\u0635\u0644\u0627\u062a \u0642\u064a\u0627\u0633\u064a\u0629",
        frameIncluded: false,
        lockIncluded: false,
        customizable: true,
        leadTime: "7-10 \u0623\u064a\u0627\u0645",
        minOrderQty: 1,
      },
      sizes: Array.isArray(p.sizes)
        ? p.sizes.map((s: string, i: number) => {
            const parts = s.split(/[×x]/);
            return {
              id: `s${i}`,
              width: parts[0] ?? "",
              height: parts[1] ?? "",
              unit: "cm" as const,
              label: s,
              priceAdjust: 0,
              isCustom: false,
            };
          })
        : [],
      colors: Array.isArray(p.colors)
        ? p.colors.map((c: string, i: number) => ({
            id: `c${i}`,
            name: c,
            nameEn: c,
            hex: "#888888",
            priceAdjust: 0,
            inStock: true,
          }))
        : [],
      images: Array.isArray(p.images)
        ? p.images.map((url: string, i: number) => ({
            id: `img${i}`,
            url,
            alt: p.name ?? "",
            isPrimary: i === 0,
            type: "main" as const,
          }))
        : p.image
          ? [
              {
                id: "img0",
                url: p.image,
                alt: p.name ?? "",
                isPrimary: true,
                type: "main" as const,
              },
            ]
          : [],
    });
  }, [existingProduct]);

  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success(
        isRtl
          ? "\u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u0645\u0646\u062a\u062c \u0628\u0646\u062c\u0627\u062d"
          : "Product saved"
      );
      navigate("/admin/products");
    },
    onError: (e: any) => {
      toast.error(e.message);
      setSaving(false);
    },
  });
  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success(
        isRtl
          ? "\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0645\u0646\u062a\u062c"
          : "Product updated"
      );
      navigate("/admin/products");
    },
    onError: (e: any) => {
      toast.error(e.message);
      setSaving(false);
    },
  });

  const validateStep = (s: number): boolean => {
    if (s === 1) {
      if (!form.name.trim()) {
        toast.error("أدخل اسم المنتج");
        return false;
      }
      if (form.price <= 0) {
        toast.error("أدخل سعر التجزئة");
        return false;
      }
      if (form.distributorPrice <= 0) {
        toast.error("أدخل سعر الموزع");
        return false;
      }
    }
    if (s === 3) return true; // StepDimensions — no mandatory validation
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    if (step < STEPS.length) setStep(s => s + 1);
  };

  const goPrev = () => {
    if (step > 1) setStep(s => s - 1);
  };

  const uploadBase64Image = async (
    img: ProductImage
  ): Promise<ProductImage> => {
    if (!img.url.startsWith("data:")) return img;
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: img.url,
          filename: `product-${Date.now()}`,
        }),
      });
      if (!res.ok) return img;
      const { url } = (await res.json()) as { url: string };
      return { ...img, url };
    } catch {
      return img;
    }
  };

  const handleSave = async (asDraft = false) => {
    if (!asDraft && !validateStep(step)) return;
    setSaving(true);

    // Upload any local (base64) images to the server first
    const uploadedImages = await Promise.all(
      form.images.map(uploadBase64Image)
    );

    const primaryImage =
      uploadedImages.find(i => i.isPrimary) ?? uploadedImages[0];
    // Derive colors from options.color_choice if form.colors is empty
    const colorValues =
      (globalSectionsData as any[])
        ?.find((s: any) => s.id === "door_color")
        ?.groups?.find((g: any) => g.id === "color_choice")?.values ?? [];
    const derivedColors = (form.options["color_choice"] ?? []).map(
      (id: string) => {
        const v = colorValues.find((val: any) => val.id === id);
        return v?.label ?? id;
      }
    );
    const colorsToSave =
      form.colors.length > 0 ? form.colors.map(c => c.name) : derivedColors;

    const payload = {
      sku: form.sku || `SND-${Date.now()}`,
      name: form.name,
      nameEn: form.nameEn,
      category: form.category,
      subcategory: form.category,
      woodType: form.spec.woodType,
      basePrice: form.price,
      distributorPrice: form.distributorPrice,
      stock: form.stock,
      description: form.description,
      image: primaryImage?.url ?? "",
      images: uploadedImages.map(i => i.url),
      sizes: [],
      colors: colorsToSave,
      features: form.spec.features,
      tags: form.tags,
      weight: form.spec.weight,
      warranty: form.spec.warranty,

      specs: [
        form.spec.thickness
          ? { label: "السماكة", value: `${form.spec.thickness} مم` }
          : null,
        {
          label: "نوع التشطيب",
          value: FINISH_TYPES[form.spec.finishType] ?? form.spec.finishType,
        },
        {
          label: "طراز الباب",
          value: DOOR_STYLES[form.spec.doorStyle] ?? form.spec.doorStyle,
        },
        form.spec.fireRating !== "none"
          ? {
              label: "مقاومة الحريق",
              value: FIRE_RATINGS[form.spec.fireRating] ?? form.spec.fireRating,
            }
          : null,
        form.spec.soundRating !== "none"
          ? {
              label: "عزل الصوت",
              value:
                SOUND_RATINGS[form.spec.soundRating] ?? form.spec.soundRating,
            }
          : null,
        form.spec.installationType
          ? { label: "نوع التركيب", value: form.spec.installationType }
          : null,
        {
          label: "الإطار مشمول",
          value: form.spec.frameIncluded ? "نعم" : "لا",
        },
        { label: "القفل مشمول", value: form.spec.lockIncluded ? "نعم" : "لا" },
        { label: "قابل للتخصيص", value: form.spec.customizable ? "نعم" : "لا" },
        form.spec.leadTime
          ? { label: "مدة التسليم", value: form.spec.leadTime }
          : null,
        form.spec.minOrderQty
          ? { label: "الحد الأدنى للطلب", value: String(form.spec.minOrderQty) }
          : null,
      ].filter(Boolean) as { label: string; value: string }[],
      isBestseller: form.featured,
      status: (asDraft || form.status === "draft"
        ? "archived"
        : form.status === "active"
          ? "active"
          : "archived") as "active" | "archived",
      options: Object.keys(form.options).length > 0 ? form.options : null,
    };

    if (editId) {
      updateMutation.mutate({ id: editId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const completedSteps = STEPS.filter(s => {
    if (s.id === 1) return !!(form.name.trim() && form.price > 0);
    if (s.id === 2) return Object.keys(form.options).length > 0;
    if (s.id === 4) return form.images.length > 0;
    return true;
  }).map(s => s.id);

  const pageTitle = editId
    ? isRtl
      ? "\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0645\u0646\u062a\u062c"
      : "Edit Product"
    : isRtl
      ? "\u0625\u0636\u0627\u0641\u0629 \u0645\u0646\u062a\u062c \u062c\u062f\u064a\u062f"
      : "Add New Product";

  return (
    <AdminLayout
      title={pageTitle}
      subtitle={
        isRtl
          ? "\u0623\u062f\u062e\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0646\u062a\u062c \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u0644\u0625\u0636\u0627\u0641\u062a\u0647 \u0644\u0644\u0643\u062a\u0627\u0644\u0648\u062c"
          : "Fill in all product details"
      }
    >
      <div className="max-w-4xl mx-auto space-y-6" dir={dir}>
        {/* Back Button */}
        <button
          onClick={() => navigate("/admin/products")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          {isRtl ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
          العودة لإدارة المنتجات
        </button>

        {/* Step Indicator */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const isActive = step === s.id;
              const isDone = completedSteps.includes(s.id) && step > s.id;
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <button
                    onClick={() => setStep(s.id)}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all`}
                      style={
                        isActive
                          ? {
                              background: "oklch(0.38 0.06 160)",
                              color: "white",
                            }
                          : isDone
                            ? { background: "#ECFDF5", color: "#10B981" }
                            : { background: "#F3F4F6", color: "#9CA3AF" }
                      }
                    >
                      {isDone ? <Check className="w-4 h-4" /> : s.icon}
                    </div>
                    <span
                      className="text-xs font-medium hidden sm:block whitespace-nowrap"
                      style={{
                        color: isActive
                          ? "oklch(0.38 0.06 160)"
                          : isDone
                            ? "#10B981"
                            : "#9CA3AF",
                      }}
                    >
                      {s.label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div
                      className="flex-1 h-0.5 mx-2 rounded"
                      style={{ background: isDone ? "#10B981" : "#E5E7EB" }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "oklch(0.95 0.02 160)",
                color: "oklch(0.38 0.06 160)",
              }}
            >
              {STEPS[step - 1].icon}
            </div>
            <div>
              <h2
                className="font-bold text-gray-800"
                style={{ fontFamily: "DM Serif Display, serif" }}
              >
                {STEPS[step - 1].label}
              </h2>
              <p className="text-xs text-gray-400">
                الخطوة {step} من {STEPS.length}
              </p>
            </div>
          </div>

          {/* File input lives outside AnimatePresence to prevent DOM removeChild errors */}
          <input
            ref={globalFileRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={e => {
              const files = e.target.files;
              if (!files) return;
              Array.from(files).forEach(file => {
                if (!file.type.startsWith("image/")) return;
                const reader = new FileReader();
                reader.onload = ev => {
                  const url = ev.target?.result as string;
                  const newImg: ProductImage = {
                    id: `IMG${Date.now()}${Math.random()}`,
                    url,
                    alt: file.name.replace(/\.[^.]+$/, ""),
                    isPrimary: form.images.length === 0,
                    type: "main",
                  };
                  setForm(prev => ({
                    ...prev,
                    images: [...prev.images, newImg],
                  }));
                };
                reader.readAsDataURL(file);
              });
              // Reset so same file can be re-selected
              e.target.value = "";
            }}
          />

          <AnimatePresence>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: isRtl ? -16 : 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRtl ? 16 : -16 }}
              transition={{ duration: 0.2 }}
            >
              {step === 1 && <StepBasicInfo form={form} setForm={setForm} />}
              {step === 2 && (
                <StepProductOptions
                  form={form}
                  setForm={setForm}
                  sections={globalSections}
                />
              )}
              {step === 3 && (
                <StepDimensions
                  form={form}
                  setForm={setForm}
                  sections={globalSections}
                />
              )}
              {step === 4 && (
                <StepImages
                  form={form}
                  setForm={setForm}
                  fileRef={globalFileRef}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Footer */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={goPrev}
              disabled={step === 1}
              className="gap-2"
            >
              {isRtl ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
              السابق
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSave(true)}
              className="gap-2 text-gray-600"
            >
              <FileText className="w-4 h-4" />
              حفظ مسودة
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            {form.name || "منتج جديد"}
          </div>

          <div className="flex gap-2">
            {step < STEPS.length ? (
              <Button
                onClick={goNext}
                className="gap-2 text-white"
                style={{ background: "oklch(0.38 0.06 160)" }}
              >
                التالي
                {isRtl ? (
                  <ChevronLeft className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
            ) : (
              <Button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="gap-2 text-white"
                style={{ background: "oklch(0.38 0.06 160)" }}
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جارٍ الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    حفظ المنتج
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
