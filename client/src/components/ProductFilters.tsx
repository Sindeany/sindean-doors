/**
 * Design: Architectural Luxury - Warm Minimalism
 * ProductFilters: Sidebar filters for the products page
 * Includes: category, wood type, price range, features, availability
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { CATEGORIES, WOOD_TYPES } from "@/lib/productsData";
import { useLanguage } from "@/contexts/LanguageContext";

export interface FilterState {
  category: string;
  woodType: string;
  priceRange: [number, number];
  inStockOnly: boolean;
  certifiedOnly: boolean;
  newOnly: boolean;
  bestsellersOnly: boolean;
}

interface ProductFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  totalCount: number;
  filteredCount: number;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const PRICE_MIN = 0;
const PRICE_MAX = 4000;

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/50 pb-5 mb-5 last:border-0 last:mb-0 last:pb-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full mb-3 group"
      >
        <span className="text-sm font-bold text-wood-dark group-hover:text-oak transition-colors">
          {title}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProductFilters({
  filters,
  onFilterChange,
  totalCount,
  filteredCount,
  isMobileOpen,
  onMobileClose,
}: ProductFiltersProps) {
  const { dir } = useLanguage();

  const activeFiltersCount = [
    filters.category !== "all",
    filters.woodType !== "all",
    filters.priceRange[0] > PRICE_MIN || filters.priceRange[1] < PRICE_MAX,
    filters.inStockOnly,
    filters.certifiedOnly,
    filters.newOnly,
    filters.bestsellersOnly,
  ].filter(Boolean).length;

  const resetFilters = () => {
    onFilterChange({
      category: "all",
      woodType: "all",
      priceRange: [PRICE_MIN, PRICE_MAX],
      inStockOnly: false,
      certifiedOnly: false,
      newOnly: false,
      bestsellersOnly: false,
    });
  };

  const specialFilters = dir === "rtl" ? [
    { key: "inStockOnly", label: "متوفر في المخزون فقط" },
    { key: "certifiedOnly", label: "منتجات معتمدة فقط" },
    { key: "newOnly", label: "المنتجات الجديدة" },
    { key: "bestsellersOnly", label: "الأكثر مبيعاً" },
  ] : [
    { key: "inStockOnly", label: "In Stock Only" },
    { key: "certifiedOnly", label: "Certified Only" },
    { key: "newOnly", label: "New Products" },
    { key: "bestsellersOnly", label: "Best Sellers" },
  ];

  const content = (
    <div className="bg-white rounded-sm border border-border/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-oak" />
          <span className="font-bold text-wood-dark">{dir === "rtl" ? "الفلاتر" : "Filters"}</span>
          {activeFiltersCount > 0 && (
            <Badge className="bg-oak text-white border-0 rounded-full w-5 h-5 p-0 flex items-center justify-center text-[10px]">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <button
              onClick={resetFilters}
              className="text-xs text-copper hover:text-copper/80 font-medium flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" />
              {dir === "rtl" ? "مسح الكل" : "Clear All"}
            </button>
          )}
          {onMobileClose && (
            <button onClick={onMobileClose} className="lg:hidden text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="bg-beige-light rounded-sm px-4 py-2.5 mb-6 text-center">
        <span className="text-sm text-muted-foreground">
          {dir === "rtl" ? (
            <>
              عرض{" "}
              <span className="font-bold text-oak">{filteredCount}</span>
              {" "}من{" "}
              <span className="font-semibold text-wood-dark">{totalCount}</span>
              {" "}منتج
            </>
          ) : (
            <>
              Showing{" "}
              <span className="font-bold text-oak">{filteredCount}</span>
              {" "}of{" "}
              <span className="font-semibold text-wood-dark">{totalCount}</span>
              {" "}products
            </>
          )}
        </span>
      </div>

      {/* Category filter */}
      <FilterSection title={dir === "rtl" ? "التصنيف" : "Category"}>
        <div className="space-y-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onFilterChange({ ...filters, category: cat.id })}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-sm text-sm transition-all ${
                filters.category === cat.id
                  ? "bg-oak text-white"
                  : "text-foreground/70 hover:bg-beige-light hover:text-oak"
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-xs font-bold px-1.5 py-0.5 rounded-sm ${
                  filters.category === cat.id
                    ? "bg-white/20 text-white"
                    : "bg-beige text-muted-foreground"
                }`}
              >
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Wood type filter */}
      <FilterSection title={dir === "rtl" ? "نوع الخشب" : "Wood Type"}>
        <div className="space-y-1.5">
          {WOOD_TYPES.map((wood) => (
            <button
              key={wood.id}
              onClick={() => onFilterChange({ ...filters, woodType: wood.id })}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-all ${
                filters.woodType === wood.id
                  ? "bg-oak/10 text-oak border border-oak/30"
                  : "text-foreground/70 hover:bg-beige-light hover:text-oak border border-transparent"
              }`}
            >
              <span
                className={`w-3 h-3 rounded-full border-2 transition-all ${
                  filters.woodType === wood.id
                    ? "border-oak bg-oak"
                    : "border-border"
                }`}
              />
              {wood.label}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Price range filter */}
      <FilterSection title={dir === "rtl" ? "نطاق السعر (ر.س / باب)" : "Price Range (SAR / door)"}>
        <div className="px-1">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-beige-light rounded-sm px-3 py-1.5 text-center">
              <span className="text-xs text-muted-foreground block">{dir === "rtl" ? "من" : "From"}</span>
              <span className="text-sm font-bold text-wood-dark">
                {filters.priceRange[0].toLocaleString("ar-SA")}
              </span>
            </div>
            <div className="w-4 h-px bg-border" />
            <div className="bg-beige-light rounded-sm px-3 py-1.5 text-center">
              <span className="text-xs text-muted-foreground block">{dir === "rtl" ? "إلى" : "To"}</span>
              <span className="text-sm font-bold text-wood-dark">
                {filters.priceRange[1].toLocaleString("ar-SA")}
              </span>
            </div>
          </div>
          <Slider
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={50}
            value={filters.priceRange}
            onValueChange={(val) =>
              onFilterChange({ ...filters, priceRange: val as [number, number] })
            }
            className="[&_[role=slider]]:bg-oak [&_[role=slider]]:border-oak [&_.range]:bg-oak"
          />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-muted-foreground">{PRICE_MIN.toLocaleString("ar-SA")}</span>
            <span className="text-xs text-muted-foreground">{PRICE_MAX.toLocaleString("ar-SA")}</span>
          </div>
        </div>
      </FilterSection>

      {/* Special filters */}
      <FilterSection title={dir === "rtl" ? "خصائص خاصة" : "Special Features"} defaultOpen={false}>
        <div className="space-y-3">
          {specialFilters.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <Checkbox
                id={key}
                checked={filters[key as keyof FilterState] as boolean}
                onCheckedChange={(checked) =>
                  onFilterChange({ ...filters, [key]: !!checked })
                }
                className="border-border data-[state=checked]:bg-oak data-[state=checked]:border-oak"
              />
              <label
                htmlFor={key}
                className="text-sm text-foreground/70 cursor-pointer hover:text-oak transition-colors"
              >
                {label}
              </label>
            </div>
          ))}
        </div>
      </FilterSection>

      {/* CTA */}
      <div className="mt-6 pt-5 border-t border-border/50">
        <Button
          variant="outline"
          className="w-full border-oak text-oak hover:bg-oak hover:text-white rounded-sm text-sm"
          onClick={() => {}}
        >
          {dir === "rtl" ? "طلب عرض سعر للجملة" : "Request Bulk Quote"}
        </Button>
      </div>
    </div>
  );

  // Mobile overlay
  if (isMobileOpen !== undefined) {
    return (
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={onMobileClose}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed top-0 right-0 h-full w-80 z-50 overflow-y-auto bg-warm-white p-4 lg:hidden"
            >
              {content}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return content;
}
