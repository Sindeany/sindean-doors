/**
 * Shared product option sets for Sindian Doors
 * Reusable option groups that can be mixed per product type
 */
import type { ProductOption } from "./productsData";

// ── Color options ──────────────────────────────────────────────
export const COLOR_OPTIONS: ProductOption = {
  id: "color",
  type: "color",
  label: "اللون",
  labelEn: "Color",
  required: true,
  values: [
    { id: "natural-oak", label: "سنديان طبيعي", labelEn: "Natural Oak", hex: "#C8A96E" },
    { id: "dark-walnut", label: "جوز داكن", labelEn: "Dark Walnut", hex: "#4A2C17" },
    { id: "light-pine", label: "صنوبر فاتح", labelEn: "Light Pine", hex: "#E8C98A" },
    { id: "ebony", label: "أبنوس", labelEn: "Ebony", hex: "#1A1008" },
    { id: "white-ash", label: "رماد أبيض", labelEn: "White Ash", hex: "#F0EDE6" },
    { id: "mahogany", label: "ماهوجني", labelEn: "Mahogany", hex: "#7B2D1E" },
  ],
};

// ── Size options ───────────────────────────────────────────────
export const SIZE_OPTIONS: ProductOption = {
  id: "size",
  type: "size",
  label: "المقاس",
  labelEn: "Size",
  required: true,
  values: [
    { id: "80x210", label: "80 × 210 سم", labelEn: "80 × 210 cm" },
    { id: "90x210", label: "90 × 210 سم (قياسي)", labelEn: "90 × 210 cm (Standard)" },
    { id: "100x210", label: "100 × 210 سم", labelEn: "100 × 210 cm" },
    { id: "90x220", label: "90 × 220 سم", labelEn: "90 × 220 cm" },
    { id: "100x220", label: "100 × 220 سم", labelEn: "100 × 220 cm", priceAdj: 150 },
    { id: "custom", label: "مقاس مخصص", labelEn: "Custom Size", priceAdj: 300 },
  ],
};

// ── Handle options ─────────────────────────────────────────────
export const HANDLE_OPTIONS: ProductOption = {
  id: "handle",
  type: "handle",
  label: "نوع المقبض",
  labelEn: "Handle Type",
  required: true,
  values: [
    { id: "lever-gold", label: "مقبض ذهبي", labelEn: "Gold Lever", hex: "#D4AF37" },
    { id: "lever-silver", label: "مقبض فضي", labelEn: "Silver Lever", hex: "#C0C0C0" },
    { id: "lever-black", label: "مقبض أسود مطفي", labelEn: "Matte Black Lever", hex: "#2D2D2D" },
    { id: "lever-bronze", label: "مقبض برونزي", labelEn: "Bronze Lever", hex: "#8C6239" },
    { id: "knob-classic", label: "مقبض كروي كلاسيكي", labelEn: "Classic Knob", hex: "#B8860B" },
    { id: "no-handle", label: "بدون مقبض", labelEn: "No Handle" },
  ],
};

// ── Finish options ─────────────────────────────────────────────
export const FINISH_OPTIONS: ProductOption = {
  id: "finish",
  type: "finish",
  label: "نوع التشطيب",
  labelEn: "Finish Type",
  required: true,
  values: [
    { id: "matte", label: "مطفي", labelEn: "Matte" },
    { id: "satin", label: "ساتان", labelEn: "Satin" },
    { id: "gloss", label: "لامع", labelEn: "Gloss", priceAdj: 80 },
    { id: "natural-oil", label: "زيت طبيعي", labelEn: "Natural Oil" },
    { id: "wax", label: "شمع طبيعي", labelEn: "Natural Wax" },
  ],
};

// ── Hinge options ──────────────────────────────────────────────
export const HINGE_OPTIONS: ProductOption = {
  id: "hinge",
  type: "hinge",
  label: "نوع المفصلة",
  labelEn: "Hinge Type",
  required: false,
  values: [
    { id: "standard", label: "مفصلة قياسية", labelEn: "Standard Hinge" },
    { id: "concealed", label: "مفصلة مخفية", labelEn: "Concealed Hinge", priceAdj: 120 },
    { id: "pivot", label: "محور دوران", labelEn: "Pivot Hinge", priceAdj: 200 },
    { id: "soft-close", label: "إغلاق هادئ", labelEn: "Soft Close", priceAdj: 150 },
  ],
};

// ── Glass panel options ────────────────────────────────────────
export const GLASS_OPTIONS: ProductOption = {
  id: "glass",
  type: "glass",
  label: "لوح الزجاج",
  labelEn: "Glass Panel",
  required: false,
  values: [
    { id: "none", label: "بدون زجاج", labelEn: "No Glass" },
    { id: "clear", label: "زجاج شفاف", labelEn: "Clear Glass", priceAdj: 180 },
    { id: "frosted", label: "زجاج مصنفر", labelEn: "Frosted Glass", priceAdj: 220 },
    { id: "tinted", label: "زجاج ملون", labelEn: "Tinted Glass", priceAdj: 280 },
  ],
};

// ── Preset option sets per door type ──────────────────────────
export const INTERIOR_DOOR_OPTIONS: ProductOption[] = [
  COLOR_OPTIONS,
  SIZE_OPTIONS,
  HANDLE_OPTIONS,
  FINISH_OPTIONS,
  HINGE_OPTIONS,
];

export const EXTERIOR_DOOR_OPTIONS: ProductOption[] = [
  COLOR_OPTIONS,
  SIZE_OPTIONS,
  HANDLE_OPTIONS,
  FINISH_OPTIONS,
  GLASS_OPTIONS,
  HINGE_OPTIONS,
];

export const FIRE_DOOR_OPTIONS: ProductOption[] = [
  COLOR_OPTIONS,
  SIZE_OPTIONS,
  HANDLE_OPTIONS,
  FINISH_OPTIONS,
];

export const ACOUSTIC_DOOR_OPTIONS: ProductOption[] = [
  COLOR_OPTIONS,
  SIZE_OPTIONS,
  HANDLE_OPTIONS,
  FINISH_OPTIONS,
];
