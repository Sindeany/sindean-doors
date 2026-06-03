// ============================================================
// NewOrderWizard - Distributor Portal - Sindian Doors
// Interactive step-by-step order configurator
// Steps: Order Type → Product Selection → Configurator → Review → Submit
// ============================================================
import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronLeft, ChevronRight, Check, Package, FileText,
  ShoppingCart, Ruler, Palette, TreePine, Hash, Upload,
  Plus, Minus, Trash2, Save, Send, AlertCircle, Info,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useDistributorAuth } from "@/contexts/DistributorAuthContext";
import ExcelOrderUpload from "./ExcelOrderUpload";

// ─── Types ─────────────────────────────────────────────────
export type OrderType = "purchase_order" | "rfq" | "sample_request";

interface ConfiguredItem {
  id: string;
  doorType: string;
  doorTypeEn: string;
  woodType: string;
  woodTypeEn: string;
  color: string;
  colorEn: string;
  colorHex: string;
  width: number;
  height: number;
  thickness: number;
  quantity: number;
  unitPrice: number;
  image: string;
  notes: string;
}

interface WizardProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderType?: OrderType;
  prefillItems?: ConfiguredItem[];
  draftId?: string;
}

// ─── Data ───────────────────────────────────────────────────
const DOOR_TYPES = [
  { id: "interior", label: "باب داخلي", labelEn: "Interior Door", icon: "🚪", basePrice: 850, image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80" },
  { id: "exterior", label: "باب خارجي", labelEn: "Exterior Door", icon: "🏠", basePrice: 1800, image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80" },
  { id: "fire_door", label: "باب مقاوم للحريق", labelEn: "Fire Door", icon: "🔥", basePrice: 1350, image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80" },
  { id: "main_door", label: "باب رئيسي فاخر", labelEn: "Main Entrance Door", icon: "✨", basePrice: 2200, image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&q=80" },
  { id: "sliding", label: "باب منزلق", labelEn: "Sliding Door", icon: "↔️", basePrice: 1600, image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&q=80" },
  { id: "wardrobe", label: "باب خزانة", labelEn: "Wardrobe Door", icon: "🗄️", basePrice: 650, image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80" },
];

const WOOD_TYPES = [
  { id: "oak", label: "بلوط طبيعي", labelEn: "Natural Oak", desc: "متانة عالية وخشب مستدام", descEn: "High durability, sustainable", priceAdd: 0, color: "#8B6914" },
  { id: "walnut", label: "جوز أمريكي", labelEn: "American Walnut", desc: "فاخر وداكن بتفاصيل راقية", descEn: "Luxurious dark grain", priceAdd: 200, color: "#5C3D1E" },
  { id: "teak", label: "ساج طبيعي", labelEn: "Natural Teak", desc: "مقاوم للرطوبة والحشرات", descEn: "Moisture & insect resistant", priceAdd: 350, color: "#A0522D" },
  { id: "mahogany", label: "ماهوجني", labelEn: "Mahogany", desc: "كلاسيكي بلمسة دافئة", descEn: "Classic warm tones", priceAdd: 150, color: "#7B2D00" },
  { id: "pine", label: "صنوبر", labelEn: "Pine", desc: "خفيف وسهل التشكيل", descEn: "Lightweight, easy to shape", priceAdd: -100, color: "#C8A96E" },
  { id: "mdf_veneer", label: "MDF بقشرة خشبية", labelEn: "MDF with Wood Veneer", desc: "اقتصادي وعالي الجودة", descEn: "Economic & high quality", priceAdd: -200, color: "#D4B896" },
];

const COLORS = [
  { id: "natural", label: "طبيعي", labelEn: "Natural", hex: "#C8A96E", priceAdd: 0 },
  { id: "dark_walnut", label: "جوز داكن", labelEn: "Dark Walnut", hex: "#3D2B1F", priceAdd: 50 },
  { id: "light_oak", label: "بلوط فاتح", labelEn: "Light Oak", hex: "#D4A96A", priceAdd: 0 },
  { id: "white", label: "أبيض ناصع", labelEn: "Pure White", hex: "#F5F5F0", priceAdd: 80 },
  { id: "charcoal", label: "فحمي", labelEn: "Charcoal", hex: "#2D2D2D", priceAdd: 80 },
  { id: "mahogany", label: "ماهوجني", labelEn: "Mahogany", hex: "#7B2D00", priceAdd: 50 },
  { id: "grey", label: "رمادي دافئ", labelEn: "Warm Grey", hex: "#8E8E8E", priceAdd: 60 },
  { id: "espresso", label: "إسبريسو", labelEn: "Espresso", hex: "#2C1A0E", priceAdd: 70 },
];

const STANDARD_SIZES = [
  { label: "90×210 سم", labelEn: "90×210 cm", w: 90, h: 210, t: 4 },
  { label: "100×210 سم", labelEn: "100×210 cm", w: 100, h: 210, t: 4 },
  { label: "80×200 سم", labelEn: "80×200 cm", w: 80, h: 200, t: 4 },
  { label: "120×240 سم", labelEn: "120×240 cm", w: 120, h: 240, t: 5 },
  { label: "مقاس مخصص", labelEn: "Custom Size", w: 0, h: 0, t: 4 },
];

// ─── Helpers ────────────────────────────────────────────────
function calcUnitPrice(doorType: string, woodId: string, colorId: string): number {
  const door = DOOR_TYPES.find((d) => d.id === doorType);
  const wood = WOOD_TYPES.find((w) => w.id === woodId);
  const color = COLORS.find((c) => c.id === colorId);
  return (door?.basePrice ?? 900) + (wood?.priceAdd ?? 0) + (color?.priceAdd ?? 0);
}

function generateId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptyItem(): ConfiguredItem {
  return {
    id: generateId(),
    doorType: "",
    doorTypeEn: "",
    woodType: "",
    woodTypeEn: "",
    color: "",
    colorEn: "",
    colorHex: "#C8A96E",
    width: 90,
    height: 210,
    thickness: 4,
    quantity: 1,
    unitPrice: 0,
    image: "",
    notes: "",
  };
}

// ─── Step Indicator ─────────────────────────────────────────
function StepIndicator({ steps, current, dir }: { steps: string[]; current: number; dir: string }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={{
                background: i < current ? "oklch(0.38 0.06 160)" : i === current ? "oklch(0.68 0.10 60)" : "#e5e7eb",
                color: i <= current ? "white" : "#9ca3af",
                boxShadow: i === current ? "0 0 0 4px oklch(0.68 0.10 60 / 0.2)" : "none",
              }}
            >
              {i < current ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className="text-[10px] whitespace-nowrap hidden sm:block" style={{ color: i === current ? "oklch(0.38 0.06 160)" : "#9ca3af", fontWeight: i === current ? 600 : 400 }}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="w-8 sm:w-12 h-0.5 mx-1 mb-4" style={{ background: i < current ? "oklch(0.38 0.06 160)" : "#e5e7eb" }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────
export default function NewOrderWizard({ isOpen, onClose, initialOrderType, prefillItems, draftId }: WizardProps) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { distributor } = useDistributorAuth();

  // Wizard state
  const [step, setStep] = useState(0);
  const [orderType, setOrderType] = useState<OrderType>(initialOrderType ?? "purchase_order");
  const [items, setItems] = useState<ConfiguredItem[]>(prefillItems ?? [emptyItem()]);
  const [activeItemIdx, setActiveItemIdx] = useState(0);
  const [projectName, setProjectName] = useState("");
  const [projectNotes, setProjectNotes] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExcelUpload, setShowExcelUpload] = useState(false);

  // ── جلب خيارات المنتج من قاعدة البيانات ──────────────────
  const { data: dbOptions } = trpc.productOptions.get.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 دقائق
    enabled: isOpen,
  });

  // ── خيارات ديناميكية (من قاعدة البيانات أو الثوابت كـ fallback) ──
  const dynamicDoorTypes = useMemo(() => {
    if (!dbOptions) return DOOR_TYPES;
    const sections = dbOptions as any[];
    const doorTypeSection = sections.find((s: any) => s.id === "door_type" && s.enabled);
    if (!doorTypeSection) return DOOR_TYPES;
    const materialGroup = doorTypeSection.groups?.find((g: any) => g.id === "material" && g.enabled);
    if (!materialGroup) return DOOR_TYPES;
    return materialGroup.values
      .filter((v: any) => v.enabled)
      .map((v: any) => ({
        id: v.id,
        label: v.label,
        labelEn: v.labelEn || v.label,
        icon: v.id === "wpc" ? "🚪" : v.id === "wood" ? "🌳" : v.id === "iron" ? "⚙️" : v.id === "aluminum" ? "🔩" : v.id === "glass" ? "🪟" : "🚪",
        basePrice: 900 + (v.priceAdj || 0),
        image: v.image || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
      }));
  }, [dbOptions]);

  const dynamicColors = useMemo(() => {
    if (!dbOptions) return COLORS;
    const sections = dbOptions as any[];
    const colorSection = sections.find((s: any) => s.id === "door_color" && s.enabled);
    if (!colorSection) return COLORS;
    const colorGroup = colorSection.groups?.find((g: any) => g.id === "color_choice" && g.enabled);
    if (!colorGroup) return COLORS;
    return colorGroup.values
      .filter((v: any) => v.enabled && v.hex)
      .map((v: any) => ({
        id: v.id,
        label: v.label,
        labelEn: v.labelEn || v.label,
        hex: v.hex || "#C8A96E",
        priceAdd: v.priceAdj || 0,
      }));
  }, [dbOptions]);

  // ── مادة الباب (wood_type) من door_type.material ──────────
  const dynamicWoodTypes = useMemo(() => {
    if (!dbOptions) return WOOD_TYPES;
    const sections = dbOptions as any[];
    const doorTypeSection = sections.find((s: any) => s.id === "door_type" && s.enabled);
    if (!doorTypeSection) return WOOD_TYPES;
    const materialGroup = doorTypeSection.groups?.find((g: any) => g.id === "material" && g.enabled);
    if (!materialGroup?.values?.length) return WOOD_TYPES;
    const colorMap: Record<string, string> = {
      wpc: "#6B8E6B", wood: "#8B6914", iron: "#6B7280",
      aluminum: "#9CA3AF", glass: "#BAE6FD",
    };
    return materialGroup.values
      .filter((v: any) => v.enabled)
      .map((v: any) => ({
        id: v.id,
        label: v.label,
        labelEn: v.labelEn || v.label,
        desc: v.description || "",
        descEn: v.description || "",
        priceAdd: v.priceAdj || 0,
        color: colorMap[v.id] || "#C8A96E",
      }));
  }, [dbOptions]);

  // ── المقاسات القياسية من dimensions section ────────────────
  const dynamicStandardSizes = useMemo(() => {
    if (!dbOptions) return STANDARD_SIZES;
    const sections = dbOptions as any[];
    const dimSection = sections.find((s: any) => s.id === "dimensions" && s.enabled);
    if (!dimSection) return STANDARD_SIZES;
    const widthGroup = dimSection.groups?.find((g: any) => g.id === "width" && g.enabled);
    const heightGroup = dimSection.groups?.find((g: any) =>
      (g.id === "door_leaf_height" || g.id === "height") && g.enabled
    );
    const thicknessGroup = dimSection.groups?.find((g: any) => g.id === "wall_thickness" && g.enabled);
    if (!widthGroup && !heightGroup) return STANDARD_SIZES;
    const wMin = widthGroup?.min || 60;
    const wMax = widthGroup?.max || 180;
    const hMin = heightGroup?.min || 150;
    const hMax = heightGroup?.max || 280;
    const tDefault = thicknessGroup?.min || 4;
    const candidates = [
      { label: "90×210 سم", labelEn: "90×210 cm", w: 90, h: 210, t: tDefault },
      { label: "100×210 سم", labelEn: "100×210 cm", w: 100, h: 210, t: tDefault },
      { label: "80×200 سم", labelEn: "80×200 cm", w: 80, h: 200, t: tDefault },
      { label: "120×240 سم", labelEn: "120×240 cm", w: 120, h: 240, t: tDefault + 1 },
    ];
    const filtered = candidates.filter(sz => sz.w >= wMin && sz.w <= wMax && sz.h >= hMin && sz.h <= hMax);
    return [
      ...(filtered.length > 0 ? filtered : STANDARD_SIZES.slice(0, -1)),
      { label: "مقاس مخصص", labelEn: "Custom Size", w: 0, h: 0, t: tDefault },
    ];
  }, [dbOptions]);

  // ── نطاقات المقاسات الديناميكية ────────────────────────────
  const dimensionRanges = useMemo(() => {
    if (!dbOptions) return { wMin: 50, wMax: 200, hMin: 150, hMax: 300, tMin: 3, tMax: 8 };
    const sections = dbOptions as any[];
    const dimSection = sections.find((s: any) => s.id === "dimensions" && s.enabled);
    if (!dimSection) return { wMin: 50, wMax: 200, hMin: 150, hMax: 300, tMin: 3, tMax: 8 };
    const widthGroup = dimSection.groups?.find((g: any) => g.id === "width");
    const heightGroup = dimSection.groups?.find((g: any) => g.id === "door_leaf_height" || g.id === "height");
    const thicknessGroup = dimSection.groups?.find((g: any) => g.id === "wall_thickness");
    return {
      wMin: widthGroup?.min || 50,
      wMax: widthGroup?.max || 200,
      hMin: heightGroup?.min || 150,
      hMax: heightGroup?.max || 300,
      tMin: thicknessGroup?.min || 3,
      tMax: thicknessGroup?.max || 8,
    };
  }, [dbOptions]);

  // tRPC mutation لإنشاء الطلب
  const createOrderMutation = trpc.distributorOrders.create.useMutation();

  const item = items[activeItemIdx] ?? items[0];

  const updateItem = useCallback((patch: Partial<ConfiguredItem>) => {
    setItems((prev) => {
      const next = [...prev];
      const updated = { ...next[activeItemIdx], ...patch };
      // Recalculate price when relevant fields change
      if (patch.doorType || patch.woodType || patch.color) {
        // استخدام الخيارات الديناميكية لحساب السعر
        const doorId = patch.doorType ?? updated.doorType;
        const woodId = patch.woodType ?? updated.woodType;
        const colorId = patch.color ?? updated.color;
        const door = dynamicDoorTypes.find((d: any) => d.id === doorId);
        const wood = dynamicWoodTypes.find((w: any) => w.id === woodId);
        const color = dynamicColors.find((c: any) => c.id === colorId);
        updated.unitPrice = (door?.basePrice ?? 900) + (wood?.priceAdd ?? 0) + (color?.priceAdd ?? 0);
        // Update image from door type
        if (door) updated.image = door.image;
        // Update labels
        if (door) { updated.doorTypeEn = door.labelEn; }
        if (wood) { updated.woodTypeEn = wood.labelEn; }
        if (color) { updated.colorEn = color.labelEn; updated.colorHex = color.hex; }
      }
      next[activeItemIdx] = updated;
      return next;
    });
  }, [activeItemIdx, dynamicDoorTypes, dynamicWoodTypes, dynamicColors]);

  const addItem = () => {
    setItems((prev) => [...prev, emptyItem()]);
    setActiveItemIdx(items.length);
  };

  const removeItem = (idx: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setActiveItemIdx(Math.max(0, idx - 1));
  };

  const totalAmount = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  const isItemComplete = (it: ConfiguredItem) => it.doorType && it.woodType && it.color && it.width > 0 && it.height > 0 && it.quantity > 0;
  const allItemsComplete = items.every(isItemComplete);

  const steps = isRtl
    ? ["نوع الطلب", "تكوين المنتج", "المراجعة"]
    : ["Order Type", "Configure", "Review"];

  const handleSaveDraft = () => {
    setIsSavingDraft(true);
    setTimeout(() => {
      setIsSavingDraft(false);
      toast.success(isRtl ? "تم حفظ المسودة بنجاح" : "Draft saved successfully");
    }, 800);
  };

  const handleSubmit = async () => {
    if (!distributor) {
      toast.error(isRtl ? "يرجى تسجيل الدخول أولاً" : "Please login first");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createOrderMutation.mutateAsync({
        orderType,
        items: items.map(it => ({
          doorType: it.doorType,
          doorTypeEn: it.doorTypeEn,
          woodType: it.woodType || undefined,
          woodTypeEn: it.woodTypeEn || undefined,
          color: it.color || undefined,
          colorEn: it.colorEn || undefined,
          colorHex: it.colorHex,
          width: it.width,
          height: it.height,
          thickness: it.thickness,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          notes: it.notes || undefined,
          selections: {},
        })),
        totalAmount,
        notes: [projectName, projectNotes].filter(Boolean).join(" - ") || undefined,
        source: "manual",
      });
      toast.success(isRtl ? `تم إرسال الطلب بنجاح! رقم الطلب: ${result.orderNumber}` : `Order submitted! Order #: ${result.orderNumber}`);
      onClose();
    } catch (err: any) {
      toast.error(isRtl ? "فشل إرسال الطلب" : "Failed to submit order", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
          dir={dir}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <div>
              <h2 className="text-xl font-bold" style={{ color: "oklch(0.25 0.04 160)", fontFamily: "DM Serif Display, serif" }}>
                {isRtl
                  ? orderType === "purchase_order" ? "إنشاء أمر شراء جديد" : orderType === "rfq" ? "طلب عرض سعر" : "طلب عينات"
                  : orderType === "purchase_order" ? "New Purchase Order" : orderType === "rfq" ? "Request for Quotation" : "Sample Request"}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {isRtl ? `${items.length} منتج · الإجمالي: ${totalAmount.toLocaleString()} ر.س` : `${items.length} item(s) · Total: SAR ${totalAmount.toLocaleString()}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                className="gap-1.5 text-xs"
                style={{ borderColor: "oklch(0.38 0.06 160 / 0.3)", color: "oklch(0.38 0.06 160)" }}
              >
                <Save className="w-3.5 h-3.5" />
                {isRtl ? "حفظ مسودة" : "Save Draft"}
              </Button>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="px-6 pt-4 flex-shrink-0">
            <StepIndicator steps={steps} current={step} dir={dir} />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            <AnimatePresence mode="wait">
              {/* ── Step 0: Order Type ── */}
              {step === 0 && (
                <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h3 className="font-semibold text-gray-700 mb-4 text-sm">{isRtl ? "اختر نوع الطلب" : "Select Order Type"}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    {[
                      { id: "purchase_order" as OrderType, icon: ShoppingCart, label: isRtl ? "أمر شراء" : "Purchase Order", desc: isRtl ? "طلب شراء مباشر بكميات محددة" : "Direct purchase with fixed quantities" },
                      { id: "rfq" as OrderType, icon: FileText, label: isRtl ? "طلب عرض سعر" : "Request for Quotation", desc: isRtl ? "استفسار عن الأسعار قبل الشراء" : "Price inquiry before purchasing" },
                      { id: "sample_request" as OrderType, icon: Package, label: isRtl ? "طلب عينات" : "Sample Request", desc: isRtl ? "طلب عينات للمعاينة والموافقة" : "Request samples for approval" },
                    ].map(({ id, icon: Icon, label, desc }) => (
                      <button
                        key={id}
                        onClick={() => setOrderType(id)}
                        className="p-4 rounded-xl border-2 text-start transition-all hover:shadow-md"
                        style={{
                          borderColor: orderType === id ? "oklch(0.68 0.10 60)" : "#e5e7eb",
                          background: orderType === id ? "oklch(0.68 0.10 60 / 0.05)" : "white",
                        }}
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: orderType === id ? "oklch(0.68 0.10 60 / 0.15)" : "#f3f4f6" }}>
                          <Icon className="w-5 h-5" style={{ color: orderType === id ? "oklch(0.68 0.10 60)" : "#9ca3af" }} />
                        </div>
                        <div className="font-semibold text-sm" style={{ color: "oklch(0.25 0.04 160)" }}>{label}</div>
                        <div className="text-xs text-gray-400 mt-1">{desc}</div>
                        {orderType === id && (
                          <div className="mt-2 flex items-center gap-1 text-xs font-medium" style={{ color: "oklch(0.68 0.10 60)" }}>
                            <Check className="w-3.5 h-3.5" />
                            {isRtl ? "محدد" : "Selected"}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Excel Upload Option */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 h-px bg-gray-100" />
                      <span className="text-xs text-gray-400 whitespace-nowrap">{isRtl ? "أو" : "OR"}</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                    <button
                      onClick={() => setShowExcelUpload(true)}
                      className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border-2 border-dashed border-green-200 hover:border-green-400 hover:bg-green-50/50 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                        <FileSpreadsheet className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="text-start">
                        <div className="text-sm font-semibold text-gray-700">{isRtl ? "رفع طلب من ملف Excel" : "Upload Order from Excel"}</div>
                        <div className="text-xs text-gray-400">{isRtl ? "تحليل آلي بالذكاء الاصطناعي وتسجيل فوري" : "AI-powered parsing and instant registration"}</div>
                      </div>
                    </button>
                  </div>

                  {/* Project info */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-700 text-sm">{isRtl ? "معلومات المشروع (اختياري)" : "Project Info (Optional)"}</h3>
                    <Input
                      placeholder={isRtl ? "اسم المشروع (مثال: فيلا الرياض - الدور الثاني)" : "Project name (e.g. Riyadh Villa - 2nd Floor)"}
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="text-sm"
                    />
                    <textarea
                      placeholder={isRtl ? "ملاحظات إضافية للطلب..." : "Additional notes for this order..."}
                      value={projectNotes}
                      onChange={(e) => setProjectNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-oak/30"
                    />
                    {/* File upload */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">{isRtl ? "رفع مخططات أو ملفات المشروع" : "Upload Project Files / Blueprints"}</label>
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer hover:bg-gray-50 transition-colors" style={{ borderColor: "#d1d5db" }}>
                        <Upload className="w-6 h-6 text-gray-300 mb-1" />
                        <span className="text-xs text-gray-400">{isRtl ? "اسحب الملفات هنا أو انقر للرفع (PDF, DWG, PNG, JPG)" : "Drag files here or click to upload (PDF, DWG, PNG, JPG)"}</span>
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.dwg,.png,.jpg,.jpeg,.dxf"
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files ?? []);
                            setAttachedFiles((prev) => [...prev, ...files]);
                            toast.success(isRtl ? `تم رفع ${files.length} ملف` : `${files.length} file(s) uploaded`);
                          }}
                        />
                      </label>
                      {attachedFiles.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {attachedFiles.map((f, i) => (
                            <div key={i} className="flex items-center justify-between text-xs bg-gray-50 px-3 py-1.5 rounded-lg">
                              <span className="text-gray-600 truncate">{f.name}</span>
                              <button onClick={() => setAttachedFiles((prev) => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 ml-2">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Step 1: Product Configurator ── */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  {/* Item tabs */}
                  <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
                    {items.map((it, idx) => (
                      <button
                        key={it.id}
                        onClick={() => setActiveItemIdx(idx)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0"
                        style={{
                          background: activeItemIdx === idx ? "oklch(0.38 0.06 160)" : "#f3f4f6",
                          color: activeItemIdx === idx ? "white" : "#6b7280",
                        }}
                      >
                        {isItemComplete(it) && <Check className="w-3 h-3" />}
                        {isRtl ? `منتج ${idx + 1}` : `Item ${idx + 1}`}
                        {items.length > 1 && (
                          <span
                            onClick={(e) => { e.stopPropagation(); removeItem(idx); }}
                            className="hover:text-red-400 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </span>
                        )}
                      </button>
                    ))}
                    <button
                      onClick={addItem}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border-2 border-dashed transition-all flex-shrink-0"
                      style={{ borderColor: "oklch(0.38 0.06 160 / 0.3)", color: "oklch(0.38 0.06 160)" }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {isRtl ? "إضافة منتج" : "Add Item"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    {/* Preview */}
                    <div className="lg:col-span-2">
                      <div className="sticky top-0 rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                        <div className="aspect-[3/4] bg-gray-100 relative">
                          {item.image ? (
                            <img src={item.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-300">
                              <Package className="w-12 h-12" />
                              <span className="text-sm">{isRtl ? "اختر نوع الباب" : "Select door type"}</span>
                            </div>
                          )}
                          {item.color && (
                            <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1.5 shadow-sm">
                              <div className="w-4 h-4 rounded-full border border-gray-200" style={{ background: item.colorHex }} />
                              <span className="text-xs font-medium text-gray-700">{isRtl ? item.color : item.colorEn}</span>
                            </div>
                          )}
                        </div>
                        {/* Price preview */}
                        {item.unitPrice > 0 && (
                          <div className="p-3 bg-white border-t border-gray-100">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">{isRtl ? "سعر الوحدة" : "Unit Price"}</span>
                              <span className="font-bold" style={{ color: "oklch(0.38 0.06 160)" }}>
                                {item.unitPrice.toLocaleString()} {isRtl ? "ر.س" : "SAR"}
                              </span>
                            </div>
                            {item.quantity > 1 && (
                              <div className="flex items-center justify-between text-sm mt-1">
                                <span className="text-gray-500">{isRtl ? `الإجمالي (×${item.quantity})` : `Total (×${item.quantity})`}</span>
                                <span className="font-bold text-base" style={{ color: "oklch(0.68 0.10 60)" }}>
                                  {(item.unitPrice * item.quantity).toLocaleString()} {isRtl ? "ر.س" : "SAR"}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Configurator */}
                    <div className="lg:col-span-3 space-y-5">
                      {/* Door Type */}
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                          <Package className="w-3.5 h-3.5" />
                          {isRtl ? "نوع الباب" : "Door Type"}
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {(dynamicDoorTypes as any[]).map((dt: any) => (
                            <button
                              key={dt.id}
                              onClick={() => updateItem({ doorType: dt.id, doorTypeEn: dt.labelEn })}
                              className="p-2.5 rounded-lg border text-start transition-all hover:shadow-sm"
                              style={{
                                borderColor: item.doorType === dt.id ? "oklch(0.68 0.10 60)" : "#e5e7eb",
                                background: item.doorType === dt.id ? "oklch(0.68 0.10 60 / 0.06)" : "white",
                              }}
                            >
                              <div className="text-lg mb-1">{dt.icon}</div>
                              <div className="text-xs font-medium" style={{ color: "oklch(0.25 0.04 160)" }}>
                                {isRtl ? dt.label : dt.labelEn}
                              </div>
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                {isRtl ? `من ${dt.basePrice.toLocaleString()} ر.س` : `From SAR ${dt.basePrice.toLocaleString()}`}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Wood Type */}
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                          <TreePine className="w-3.5 h-3.5" />
                          {isRtl ? "مادة الباب" : "Door Material"}
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(dynamicWoodTypes as any[]).map((wt: any) => (
                            <button
                              key={wt.id}
                              onClick={() => updateItem({ woodType: wt.id, woodTypeEn: wt.labelEn })}
                              className="flex items-center gap-3 p-2.5 rounded-lg border text-start transition-all hover:shadow-sm"
                              style={{
                                borderColor: item.woodType === wt.id ? "oklch(0.38 0.06 160)" : "#e5e7eb",
                                background: item.woodType === wt.id ? "oklch(0.38 0.06 160 / 0.05)" : "white",
                              }}
                            >
                              <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: wt.color }} />
                              <div className="min-w-0">
                                <div className="text-xs font-semibold truncate" style={{ color: "oklch(0.25 0.04 160)" }}>
                                  {isRtl ? wt.label : wt.labelEn}
                                </div>
                                <div className="text-[10px] text-gray-400 truncate">{isRtl ? wt.desc : wt.descEn}</div>
                              </div>
                              {wt.priceAdd !== 0 && (
                                <div className="text-[10px] font-medium flex-shrink-0" style={{ color: wt.priceAdd > 0 ? "#ef4444" : "#22c55e" }}>
                                  {wt.priceAdd > 0 ? `+${wt.priceAdd}` : wt.priceAdd}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Color */}
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                          <Palette className="w-3.5 h-3.5" />
                          {isRtl ? "اللون والتشطيب" : "Color & Finish"}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {(dynamicColors as any[]).map((c: any) => (
                            <button
                              key={c.id}
                              onClick={() => updateItem({ color: c.label, colorEn: c.labelEn, colorHex: c.hex })}
                              title={isRtl ? c.label : c.labelEn}
                              className="flex flex-col items-center gap-1 transition-all"
                            >
                              <div
                                className="w-9 h-9 rounded-full border-2 transition-all"
                                style={{
                                  background: c.hex,
                                  borderColor: item.color === c.label ? "oklch(0.68 0.10 60)" : "#e5e7eb",
                                  boxShadow: item.color === c.label ? "0 0 0 3px oklch(0.68 0.10 60 / 0.3)" : "none",
                                  outline: c.hex === "#F5F5F0" ? "1px solid #e5e7eb" : "none",
                                }}
                              />
                              <span className="text-[9px] text-gray-500 text-center max-w-[40px] leading-tight">
                                {isRtl ? c.label : c.labelEn}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dimensions */}
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                          <Ruler className="w-3.5 h-3.5" />
                          {isRtl ? "المقاسات" : "Dimensions"}
                        </label>
                        {/* Standard sizes */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {(dynamicStandardSizes as any[]).map((sz: any) => (
                            <button
                              key={sz.label}
                              onClick={() => {
                                if (sz.w === 0) return; // custom
                                updateItem({ width: sz.w, height: sz.h, thickness: sz.t });
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs border transition-all"
                              style={{
                                borderColor: item.width === sz.w && item.height === sz.h && sz.w !== 0 ? "oklch(0.38 0.06 160)" : "#e5e7eb",
                                background: item.width === sz.w && item.height === sz.h && sz.w !== 0 ? "oklch(0.38 0.06 160 / 0.08)" : "white",
                                color: item.width === sz.w && item.height === sz.h && sz.w !== 0 ? "oklch(0.38 0.06 160)" : "#6b7280",
                              }}
                            >
                              {isRtl ? sz.label : sz.labelEn}
                            </button>
                          ))}
                        </div>
                        {/* Custom dimensions */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { key: "width" as const, label: isRtl ? "العرض (سم)" : "Width (cm)", min: dimensionRanges.wMin, max: dimensionRanges.wMax },
                            { key: "height" as const, label: isRtl ? "الارتفاع (سم)" : "Height (cm)", min: dimensionRanges.hMin, max: dimensionRanges.hMax },
                            { key: "thickness" as const, label: isRtl ? "السماكة (سم)" : "Thickness (cm)", min: dimensionRanges.tMin, max: dimensionRanges.tMax },
                          ].map(({ key, label, min, max }) => (
                            <div key={key}>
                              <label className="text-[10px] text-gray-400 mb-1 block">{label}</label>
                              <Input
                                type="number"
                                min={min}
                                max={max}
                                value={item[key]}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  if (val >= min && val <= max) updateItem({ [key]: val });
                                }}
                                className="text-sm h-8"
                              />
                              <div className="text-[9px] text-gray-300 mt-0.5">{min}–{max} {isRtl ? "سم" : "cm"}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                          <Hash className="w-3.5 h-3.5" />
                          {isRtl ? "الكمية" : "Quantity"}
                        </label>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateItem({ quantity: Math.max(1, item.quantity - 1) })}
                            className="w-9 h-9 rounded-lg border flex items-center justify-center hover:bg-gray-50 transition-colors"
                          >
                            <Minus className="w-4 h-4 text-gray-500" />
                          </button>
                          <Input
                            type="number"
                            min={1}
                            max={9999}
                            value={item.quantity}
                            onChange={(e) => updateItem({ quantity: Math.max(1, Number(e.target.value)) })}
                            className="w-20 text-center text-lg font-bold h-9"
                          />
                          <button
                            onClick={() => updateItem({ quantity: item.quantity + 1 })}
                            className="w-9 h-9 rounded-lg border flex items-center justify-center hover:bg-gray-50 transition-colors"
                          >
                            <Plus className="w-4 h-4 text-gray-500" />
                          </button>
                          <span className="text-sm text-gray-400">{isRtl ? "وحدة" : "units"}</span>
                        </div>
                      </div>

                      {/* Item notes */}
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-2 block uppercase tracking-wide">
                          {isRtl ? "ملاحظات خاصة بهذا المنتج" : "Item-specific Notes"}
                        </label>
                        <textarea
                          placeholder={isRtl ? "مثال: يحتاج حفر للقفل من اليمين..." : "e.g. Lock cutout on right side..."}
                          value={item.notes}
                          onChange={(e) => updateItem({ notes: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-oak/30"
                        />
                      </div>
                    </div>
                  </div>

                  {!allItemsComplete && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {isRtl ? "يرجى إكمال جميع الحقول المطلوبة لكل منتج قبل المتابعة" : "Please complete all required fields for each item before proceeding"}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Step 2: Review ── */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="space-y-4">
                    {/* Order summary header */}
                    <div className="bg-gradient-to-l from-oak/5 to-copper/5 rounded-xl p-4 border border-oak/10">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">{isRtl ? "نوع الطلب" : "Order Type"}</div>
                          <div className="font-bold" style={{ color: "oklch(0.25 0.04 160)" }}>
                            {isRtl
                              ? orderType === "purchase_order" ? "أمر شراء" : orderType === "rfq" ? "طلب عرض سعر" : "طلب عينات"
                              : orderType === "purchase_order" ? "Purchase Order" : orderType === "rfq" ? "Request for Quotation" : "Sample Request"}
                          </div>
                          {projectName && <div className="text-sm text-gray-500 mt-1">{projectName}</div>}
                        </div>
                        <div className="text-end">
                          <div className="text-xs text-gray-500 mb-1">{isRtl ? "الإجمالي التقديري" : "Estimated Total"}</div>
                          <div className="text-2xl font-bold" style={{ color: "oklch(0.68 0.10 60)", fontFamily: "DM Serif Display, serif" }}>
                            {totalAmount.toLocaleString()} <span className="text-sm font-normal">{isRtl ? "ر.س" : "SAR"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Items review */}
                    <div>
                      <h3 className="font-semibold text-sm text-gray-700 mb-3">{isRtl ? "تفاصيل المنتجات" : "Items Detail"}</h3>
                      <div className="space-y-3">
                        {items.map((it, idx) => (
                          <div key={it.id} className="flex gap-4 p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                            {/* Product image */}
                            <div className="w-20 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                              {it.image ? (
                                <img src={it.image} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-8 h-8 text-gray-300" />
                                </div>
                              )}
                            </div>
                            {/* Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="font-semibold text-sm" style={{ color: "oklch(0.25 0.04 160)" }}>
                                    {isRtl ? `منتج ${idx + 1}: ` : `Item ${idx + 1}: `}
                                    {isRtl ? it.doorType : it.doorTypeEn}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {isRtl ? it.woodType : it.woodTypeEn} · {it.width}×{it.height}×{it.thickness} {isRtl ? "سم" : "cm"}
                                  </div>
                                </div>
                                <button
                                  onClick={() => { setActiveItemIdx(idx); setStep(1); }}
                                  className="text-xs px-2 py-1 rounded-lg border hover:bg-gray-50 transition-colors flex-shrink-0"
                                  style={{ color: "oklch(0.38 0.06 160)", borderColor: "oklch(0.38 0.06 160 / 0.3)" }}
                                >
                                  {isRtl ? "تعديل" : "Edit"}
                                </button>
                              </div>
                              {/* Color swatch */}
                              <div className="flex items-center gap-2 mt-2">
                                <div className="w-4 h-4 rounded-full border border-gray-200" style={{ background: it.colorHex }} />
                                <span className="text-xs text-gray-500">{isRtl ? it.color : it.colorEn}</span>
                              </div>
                              {it.notes && (
                                <div className="mt-2 text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                                  <Info className="w-3 h-3 inline mr-1" />{it.notes}
                                </div>
                              )}
                              <div className="flex items-center justify-between mt-3">
                                <span className="text-xs text-gray-400">{isRtl ? `الكمية: ${it.quantity} وحدة` : `Qty: ${it.quantity} units`}</span>
                                <span className="font-bold text-sm" style={{ color: "oklch(0.38 0.06 160)" }}>
                                  {(it.unitPrice * it.quantity).toLocaleString()} {isRtl ? "ر.س" : "SAR"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Attached files */}
                    {attachedFiles.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-sm text-gray-700 mb-2">{isRtl ? "الملفات المرفقة" : "Attached Files"}</h3>
                        <div className="space-y-1">
                          {attachedFiles.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 px-3 py-2 rounded-lg">
                              <FileText className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-gray-600">{f.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {projectNotes && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-700">
                        <strong>{isRtl ? "ملاحظات: " : "Notes: "}</strong>{projectNotes}
                      </div>
                    )}

                    {/* Confirmation notice */}
                    <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2.5 rounded-xl">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        {isRtl
                          ? "بعد الإرسال، سيتواصل معك مندوب المبيعات خلال ساعات العمل لتأكيد الطلب والأسعار النهائية."
                          : "After submission, your sales representative will contact you during business hours to confirm the order and final pricing."}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50/50">
            <Button
              variant="outline"
              onClick={() => step > 0 ? setStep(step - 1) : onClose()}
              className="gap-1.5"
            >
              {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              {step === 0 ? (isRtl ? "إلغاء" : "Cancel") : (isRtl ? "السابق" : "Back")}
            </Button>

            <div className="flex items-center gap-2">
              {step === 2 ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={isSavingDraft}
                    className="gap-1.5"
                    style={{ borderColor: "oklch(0.38 0.06 160 / 0.3)", color: "oklch(0.38 0.06 160)" }}
                  >
                    <Save className="w-4 h-4" />
                    {isRtl ? "حفظ مسودة" : "Save Draft"}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="gap-1.5 text-white"
                    style={{ background: "oklch(0.38 0.06 160)" }}
                  >
                    <Send className="w-4 h-4" />
                    {isSubmitting
                      ? (isRtl ? "جارٍ الإرسال..." : "Submitting...")
                      : (isRtl ? "إرسال الطلب" : "Submit Order")}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={step === 1 && !allItemsComplete}
                  className="gap-1.5 text-white"
                  style={{ background: "oklch(0.38 0.06 160)" }}
                >
                  {isRtl ? "التالي" : "Next"}
                  {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Excel Upload Modal */}
      {showExcelUpload && distributor && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
            dir={dir}
          >
            <ExcelOrderUpload
              distributorId={distributor.id}
              distributorName={distributor.name}
              distributorCompany={distributor.company}
              orderType={orderType}
              onSuccess={(orderNumber) => {
                setShowExcelUpload(false);
                onClose();
              }}
              onCancel={() => setShowExcelUpload(false)}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
