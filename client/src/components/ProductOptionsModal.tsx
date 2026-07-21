/**
 * ProductOptionsModal — نافذة اختيار خيارات المنتج
 * Design: Architectural Luxury | Oak Green #2C4A3E + Copper #C4956A + Beige #F5F0E8
 *
 * Shown before adding a product to cart.
 * Supports: color swatches, size chips, handle/finish/hinge/glass text chips.
 * Validates required options before allowing "Add to Cart".
 */

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ShoppingCart,
  Check,
  ChevronDown,
  AlertCircle,
  Plus,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import type {
  Product,
  ProductOption,
  ProductOptionValue,
} from "@/lib/productsData";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface SelectedOptions {
  [optionId: string]: string; // optionId → valueId
}

interface ProductOptionsModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  initialQuantity?: number;
}

// ── Icon map per option type ─────────────────────────────────
const OPTION_ICONS: Record<string, string> = {
  color: "🎨",
  size: "📐",
  handle: "🔑",
  finish: "✨",
  hinge: "🔩",
  glass: "🪟",
  wood: "🌳",
};

export default function ProductOptionsModal({
  product,
  isOpen,
  onClose,
  initialQuantity = 1,
}: ProductOptionsModalProps) {
  const { addToCart, openCart } = useCart();
  const { dir } = useLanguage();
  const isRTL = dir === "rtl";

  const [selected, setSelected] = useState<SelectedOptions>({});
  const [quantity, setQuantity] = useState(initialQuantity);
  const [errors, setErrors] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setSelected({});
      setErrors([]);
      setQuantity(initialQuantity);
    }
  }, [product?.id, initialQuantity]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Calculate price adjustment from selected options
  const priceAdj = useMemo(() => {
    if (!product || !Array.isArray(product.options)) return 0;
    return Object.entries(selected).reduce((sum, [optId, valId]) => {
      const opt = (product.options as any[]).find(o => o.id === optId);
      const val = opt?.values?.find((v: any) => v.id === valId);
      return sum + (val?.priceAdj ?? 0);
    }, 0);
  }, [selected, product]);

  const baseUnitPrice = product?.tiers?.[0]?.price ?? 0;
  const adjustedUnitPrice = baseUnitPrice + priceAdj;
  const totalPrice = adjustedUnitPrice * quantity;

  const handleSelect = (optionId: string, valueId: string) => {
    setSelected(prev => ({ ...prev, [optionId]: valueId }));
    setErrors(prev => prev.filter(e => e !== optionId));
  };

  const handleAddToCart = async () => {
    if (!product) return;

    // Validate required options
    const missing: string[] = [];
    if (Array.isArray(product.options)) {
      (product.options as any[]).forEach(opt => {
        if (opt.required && !selected[opt.id]) {
          missing.push(opt.id);
        }
      });
    }

    if (missing.length > 0) {
      setErrors(missing);
      // Scroll to first error
      const el = document.getElementById(`option-${missing[0]}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setAdding(true);
    await new Promise(r => setTimeout(r, 300)); // brief animation pause

    addToCart(product, quantity, selected);
    setAdding(false);
    onClose();

    toast.success(
      isRTL
        ? `تمت إضافة "${product.name}" إلى السلة`
        : `"${product.name}" added to cart`,
      {
        description: isRTL
          ? `الكمية: ${quantity} — ${Object.keys(selected).length} خيار مُحدد`
          : `Qty: ${quantity} — ${Object.keys(selected).length} option(s) selected`,
        action: { label: isRTL ? "عرض السلة" : "View Cart", onClick: openCart },
      }
    );
  };

  if (!product) return null;

  const options = Array.isArray(product.options)
    ? (product.options as any[])
    : [];
  const requiredCount = options.filter(o => o.required).length;
  const selectedRequiredCount = options.filter(
    o => o.required && selected[o.id]
  ).length;
  const allRequiredSelected = selectedRequiredCount === requiredCount;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 380 }}
            className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-[201] p-0 md:p-4"
            onClick={e => e.stopPropagation()}
          >
            <div
              className="w-full md:max-w-xl md:rounded-3xl rounded-t-3xl overflow-hidden flex flex-col"
              style={{
                background: "#FDFAF6",
                boxShadow: "0 24px 80px rgba(44,74,62,0.22)",
                maxHeight: "92vh",
              }}
            >
              {/* ── Header ── */}
              <div
                className="flex items-start gap-4 px-5 pt-5 pb-4 border-b flex-shrink-0"
                style={{ borderColor: "#E8DFD0" }}
              >
                {/* Product image */}
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  style={{ border: "1px solid #E8DFD0" }}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-medium mb-0.5"
                    style={{ color: "#C4956A" }}
                  >
                    {product.category}
                  </p>
                  <h2
                    className="text-base font-bold leading-snug"
                    style={{
                      color: "#2C4A3E",
                      fontFamily: "'DM Serif Display', serif",
                    }}
                  >
                    {product.name}
                  </h2>
                  <p
                    className="text-sm mt-1 font-semibold"
                    style={{ color: "#C4956A" }}
                  >
                    {isRTL
                      ? `${baseUnitPrice.toLocaleString()} ر.س / وحدة`
                      : `SAR ${baseUnitPrice.toLocaleString()} / unit`}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl transition-colors flex-shrink-0"
                  style={{ color: "#6B7B75" }}
                  onMouseEnter={e =>
                    (e.currentTarget.style.background = "#F0EBE0")
                  }
                  onMouseLeave={e =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Progress indicator */}
              {requiredCount > 0 && (
                <div
                  className="px-5 py-2.5 flex items-center gap-3 flex-shrink-0"
                  style={{
                    background: "#FAF8F5",
                    borderBottom: "1px solid #E8DFD0",
                  }}
                >
                  <div
                    className="flex-1 h-1.5 rounded-full overflow-hidden"
                    style={{ background: "#E8DFD0" }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: "linear-gradient(90deg, #2C4A3E, #C4956A)",
                      }}
                      animate={{
                        width: `${(selectedRequiredCount / requiredCount) * 100}%`,
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p
                    className="text-xs flex-shrink-0"
                    style={{ color: "#6B7B75" }}
                  >
                    {isRTL
                      ? `${selectedRequiredCount} / ${requiredCount} خيار مطلوب`
                      : `${selectedRequiredCount} / ${requiredCount} required`}
                  </p>
                </div>
              )}

              {/* ── Options body ── */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
                {options.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm" style={{ color: "#6B7B75" }}>
                      {isRTL
                        ? "لا توجد خيارات لهذا المنتج"
                        : "No options for this product"}
                    </p>
                  </div>
                ) : (
                  options.map(option => (
                    <OptionGroup
                      key={option.id}
                      option={option}
                      selectedId={selected[option.id]}
                      onSelect={valId => handleSelect(option.id, valId)}
                      hasError={errors.includes(option.id)}
                      isRTL={isRTL}
                    />
                  ))
                )}

                {/* Quantity */}
                <div id="option-quantity">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">📦</span>
                    <p
                      className="text-sm font-bold"
                      style={{ color: "#2C4A3E" }}
                    >
                      {isRTL ? "الكمية" : "Quantity"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div
                      className="flex items-center gap-3 rounded-xl px-3 py-2"
                      style={{
                        background: "white",
                        border: "1.5px solid #E8DFD0",
                      }}
                    >
                      <button
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                        style={{ color: "#2C4A3E" }}
                        onMouseEnter={e =>
                          (e.currentTarget.style.background = "#F0EBE0")
                        }
                        onMouseLeave={e =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span
                        className="w-8 text-center font-bold text-lg"
                        style={{
                          color: "#2C4A3E",
                          fontFamily: "'DM Serif Display', serif",
                        }}
                      >
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity(q => q + 1)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                        style={{ color: "#2C4A3E" }}
                        onMouseEnter={e =>
                          (e.currentTarget.style.background = "#F0EBE0")
                        }
                        onMouseLeave={e =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {/* Tier hint */}
                    {product.tiers.length > 1 && (
                      <p className="text-xs" style={{ color: "#9CA3AF" }}>
                        {isRTL
                          ? `${product.tiers[product.tiers.length - 1].min}+ أبواب = خصم الجملة`
                          : `${product.tiers[product.tiers.length - 1].min}+ doors = bulk discount`}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Footer ── */}
              <div
                className="px-5 py-4 border-t flex-shrink-0"
                style={{ borderColor: "#E8DFD0", background: "white" }}
              >
                {/* Price summary */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs" style={{ color: "#9CA3AF" }}>
                      {isRTL ? "الإجمالي" : "Total"}
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <p
                        className="text-2xl font-bold"
                        style={{
                          color: "#2C4A3E",
                          fontFamily: "'DM Serif Display', serif",
                        }}
                      >
                        {totalPrice.toLocaleString()}
                      </p>
                      <p className="text-sm" style={{ color: "#6B7B75" }}>
                        {isRTL ? "ر.س" : "SAR"}
                      </p>
                    </div>
                    {priceAdj > 0 && (
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "#C4956A" }}
                      >
                        {isRTL
                          ? `+ ${priceAdj} ر.س إضافات`
                          : `+ SAR ${priceAdj} options`}
                      </p>
                    )}
                  </div>

                  {/* Validation hint */}
                  {!allRequiredSelected && (
                    <div
                      className="flex items-center gap-1.5 text-xs"
                      style={{ color: "#9CA3AF" }}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>
                        {isRTL
                          ? "أكمل الخيارات المطلوبة"
                          : "Complete required options"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Add to cart button */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAddToCart}
                  disabled={adding}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-base transition-all"
                  style={{
                    background: allRequiredSelected
                      ? "linear-gradient(135deg, #2C4A3E 0%, #3d6b5a 100%)"
                      : "#E8DFD0",
                    color: allRequiredSelected ? "white" : "#9CA3AF",
                    cursor: allRequiredSelected ? "pointer" : "not-allowed",
                  }}
                >
                  {adding ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      <span>{isRTL ? "أضف إلى السلة" : "Add to Cart"}</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── OptionGroup sub-component ────────────────────────────────
interface OptionGroupProps {
  option: ProductOption;
  selectedId: string | undefined;
  onSelect: (valueId: string) => void;
  hasError: boolean;
  isRTL: boolean;
}

function OptionGroup({
  option,
  selectedId,
  onSelect,
  hasError,
  isRTL,
}: OptionGroupProps) {
  const icon = OPTION_ICONS[option.type] ?? "⚙️";
  const label = isRTL ? option.label : (option.labelEn ?? option.label);

  return (
    <div id={`option-${option.id}`}>
      {/* Label row */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{icon}</span>
        <p className="text-sm font-bold" style={{ color: "#2C4A3E" }}>
          {label}
          {option.required && (
            <span
              className="ml-1 text-xs font-normal"
              style={{ color: "#C4956A" }}
            >
              {isRTL ? "(مطلوب)" : "(required)"}
            </span>
          )}
        </p>
        {selectedId && (
          <span
            className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: "rgba(44,74,62,0.08)", color: "#2C4A3E" }}
          >
            {isRTL
              ? option.values.find(v => v.id === selectedId)?.label
              : (option.values.find(v => v.id === selectedId)?.labelEn ??
                option.values.find(v => v.id === selectedId)?.label)}
          </span>
        )}
      </div>

      {/* Error message */}
      {hasError && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 mb-2 text-xs"
          style={{ color: "#ef4444" }}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{isRTL ? "هذا الخيار مطلوب" : "This option is required"}</span>
        </motion.div>
      )}

      {/* Color swatches */}
      {option.type === "color" ? (
        <div className="flex flex-wrap gap-2.5">
          {[...option.values].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)).map(val => (
            <ColorSwatch
              key={val.id}
              value={val}
              selected={selectedId === val.id}
              onSelect={() => onSelect(val.id)}
              isRTL={isRTL}
            />
          ))}
        </div>
      ) : (
        /* Text chips */
        <div className="flex flex-wrap gap-2">
          {[...option.values].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)).map(val => {
            const isSelected = selectedId === val.id;
            const displayLabel = isRTL ? val.label : (val.labelEn ?? val.label);
            return (
              <motion.button
                key={val.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelect(val.id)}
                className="px-3.5 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: isSelected ? "#2C4A3E" : "white",
                  color: isSelected ? "white" : "#2C4A3E",
                  border: isSelected
                    ? "1.5px solid #2C4A3E"
                    : hasError
                      ? "1.5px solid #fca5a5"
                      : "1.5px solid #E8DFD0",
                  boxShadow: isSelected
                    ? "0 2px 8px rgba(44,74,62,0.2)"
                    : "none",
                }}
              >
                <span>{displayLabel}</span>
                {val.priceAdj && val.priceAdj > 0 && (
                  <span
                    className="ml-1.5 text-xs opacity-70"
                    style={{ color: isSelected ? "#C4956A" : "#C4956A" }}
                  >
                    +{val.priceAdj}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Color swatch ─────────────────────────────────────────────
interface ColorSwatchProps {
  value: ProductOptionValue;
  selected: boolean;
  onSelect: () => void;
  isRTL: boolean;
}

function ColorSwatch({ value, selected, onSelect, isRTL }: ColorSwatchProps) {
  const label = isRTL ? value.label : (value.labelEn ?? value.label);
  const isLight = value.hex ? isLightColor(value.hex) : false;

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onSelect}
      className="relative group flex flex-col items-center gap-1.5"
      title={label}
    >
      {/* Swatch circle */}
      <div
        className="w-10 h-10 rounded-full transition-all"
        style={{
          background: value.hex ?? "#ccc",
          border: selected ? "3px solid #2C4A3E" : "2px solid rgba(0,0,0,0.1)",
          boxShadow: selected
            ? "0 0 0 2px white, 0 0 0 4px #2C4A3E"
            : "0 2px 4px rgba(0,0,0,0.1)",
          transform: selected ? "scale(1.1)" : "scale(1)",
        }}
      >
        {selected && (
          <div className="w-full h-full flex items-center justify-center">
            <Check
              className="w-4 h-4"
              style={{ color: isLight ? "#2C4A3E" : "white" }}
            />
          </div>
        )}
      </div>
      {/* Label */}
      <span
        className="text-xs text-center leading-tight max-w-[60px]"
        style={{
          color: selected ? "#2C4A3E" : "#6B7B75",
          fontWeight: selected ? 600 : 400,
        }}
      >
        {label}
      </span>
    </motion.button>
  );
}

/** Determine if a hex color is light (for contrast) */
function isLightColor(hex: string): boolean {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}
