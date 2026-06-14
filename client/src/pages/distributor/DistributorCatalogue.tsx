// ============================================================
// DistributorCatalogue - Interactive Product Catalogue
// Sindian Doors - Distributor Portal
// ============================================================
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Filter, X, ChevronDown, Eye, ShoppingCart,
  Star, Ruler, Palette, Tag, Info, Check, Package, Loader2, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import NewOrderWizard from "@/components/distributor/NewOrderWizard";
import DistributorLayout from "@/components/distributor/DistributorLayout";
import { trpc } from "@/lib/trpc";
import { useDistributorAuth } from "@/contexts/DistributorAuthContext";

// ─── Data ───────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all", label: "الكل", labelEn: "All" },
  { id: "interior", label: "أبواب داخلية", labelEn: "Interior Doors" },
  { id: "exterior", label: "أبواب خارجية", labelEn: "Exterior Doors" },
  { id: "fire", label: "أبواب حريق", labelEn: "Fire Doors" },
  { id: "main", label: "أبواب رئيسية", labelEn: "Main Doors" },
  { id: "sliding", label: "أبواب منزلقة", labelEn: "Sliding Doors" },
];

const COLOR_SWATCHES = [
  { id: "natural", label: "طبيعي", labelEn: "Natural", hex: "#C8A96E" },
  { id: "dark_walnut", label: "جوز داكن", labelEn: "Dark Walnut", hex: "#3D2B1F" },
  { id: "light_oak", label: "بلوط فاتح", labelEn: "Light Oak", hex: "#D4A96A" },
  { id: "white", label: "أبيض", labelEn: "White", hex: "#F5F5F0" },
  { id: "charcoal", label: "فحمي", labelEn: "Charcoal", hex: "#2D2D2D" },
  { id: "mahogany", label: "ماهوجني", labelEn: "Mahogany", hex: "#7B2D00" },
  { id: "grey", label: "رمادي", labelEn: "Grey", hex: "#8E8E8E" },
  { id: "espresso", label: "إسبريسو", labelEn: "Espresso", hex: "#2C1A0E" },
];

const WOOD_LABELS: Record<string, { ar: string; en: string }> = {
  oak: { ar: "خشب سنديان (بلوط)", en: "Oak Wood" },
  walnut: { ar: "جوز أمريكي", en: "American Walnut" },
  teak: { ar: "ساج طبيعي", en: "Natural Teak" },
  mahogany: { ar: "ماهوجني", en: "Mahogany" },
  pine: { ar: "صنوبر", en: "Pine" },
  wpc: { ar: "خشب بلاستيكي WPC", en: "WPC Wood" },
  mdf: { ar: "MDF بقشرة خشبية", en: "MDF with Wood Veneer" }
};

function mapColorToSwatch(colorName: string): string {
  const name = colorName.toLowerCase().trim();
  if (name.includes("جوز") || name.includes("walnut")) return "dark_walnut";
  if (name.includes("بلوط فاتح") || name.includes("light oak")) return "light_oak";
  if (name.includes("بلوط") || name.includes("طبيعي") || name.includes("oak") || name.includes("natural")) return "natural";
  if (name.includes("أبيض") || name.includes("white")) return "white";
  if (name.includes("فحم") || name.includes("charcoal")) return "charcoal";
  if (name.includes("ماهوجني") || name.includes("mahogany")) return "mahogany";
  if (name.includes("رمادي") || name.includes("grey") || name.includes("gray")) return "grey";
  if (name.includes("إسبريسو") || name.includes("espresso")) return "espresso";
  return "natural";
}

interface CatalogueItem {
  id: string;
  category: string;
  categoryEn: string;
  name: string;
  nameEn: string;
  wood: string;
  woodEn: string;
  woodType: string;
  woodTypeEn: string;
  image: string;
  sizes: string[];
  price: number;
  discountedPrice: number | null;
  colors: string[];
  rating: number;
  reviews: number;
  isNew: boolean;
  isBestSeller: boolean;
  desc: string;
  descEn: string;
}

function mapDbProductToCatalogueItem(p: any, discountRate: number): CatalogueItem {
  const woodLabel = WOOD_LABELS[p.woodType] || { ar: p.woodType || "بلوط طبيعي", en: p.woodType || "Natural Oak" };
  const catObj = CATEGORIES.find(c => c.id === p.category);
  const categoryEn = catObj?.labelEn || p.category;

  const dbColors = Array.isArray(p.colors) ? p.colors : [];
  const mappedColors = dbColors.length > 0
    ? dbColors.map((c: string) => mapColorToSwatch(c))
    : ["natural"];

  const basePrice = p.basePrice || 1000;
  const discountedPrice = p.distributorPrice && p.distributorPrice > 0
    ? p.distributorPrice
    : Math.round(basePrice * (1 - discountRate));

  return {
    id: String(p.id),
    category: p.category || "interior",
    categoryEn: categoryEn,
    name: p.name,
    nameEn: p.nameEn || p.name,
    wood: woodLabel.ar,
    woodEn: woodLabel.en,
    woodType: p.woodType,
    woodTypeEn: woodLabel.en,
    image: p.image || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80",
    sizes: Array.isArray(p.sizes) && p.sizes.length > 0 ? p.sizes : ["80×200", "90×210", "100×210"],
    price: basePrice,
    discountedPrice: discountedPrice < basePrice ? discountedPrice : null,
    colors: mappedColors,
    rating: p.rating || 4.7,
    reviews: p.reviewCount || 42,
    isNew: !!p.isNew,
    isBestSeller: !!p.isBestseller,
    desc: p.description || "",
    descEn: p.description || "",
  };
}

// ─── Product Card ────────────────────────────────────────────
function CatalogueCard({ item, isRtl, onOrder }: { item: CatalogueItem; isRtl: boolean; onOrder: () => void }) {
  const [selectedColor, setSelectedColor] = useState(item.colors[0] || "natural");
  const [isExpanded, setIsExpanded] = useState(false);
  const colorData = COLOR_SWATCHES.find((c) => c.id === selectedColor);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <img src={item.image} alt={isRtl ? item.name : item.nameEn} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
        {/* Badges */}
        <div className="absolute top-3 start-3 flex flex-col gap-1.5">
          {item.isBestSeller && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "oklch(0.68 0.10 60)" }}>
              {isRtl ? "الأكثر مبيعاً" : "Best Seller"}
            </span>
          )}
          {item.isNew && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "oklch(0.38 0.06 160)" }}>
              {isRtl ? "جديد" : "New"}
            </span>
          )}
          {item.discountedPrice && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">
              -{Math.round((1 - item.discountedPrice / item.price) * 100)}%
            </span>
          )}
        </div>
        {/* Color preview overlay */}
        {colorData && (
          <div className="absolute bottom-3 end-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm">
            <div className="w-3.5 h-3.5 rounded-full border border-gray-200" style={{ background: colorData.hex }} />
            <span className="text-[10px] font-medium text-gray-700">{isRtl ? colorData.label : colorData.labelEn}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h3 className="font-bold text-sm" style={{ color: "oklch(0.25 0.04 160)" }}>
              {isRtl ? item.name : item.nameEn}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{isRtl ? item.wood : item.woodEn}</p>
          </div>
          <div className="text-end flex-shrink-0">
            {item.discountedPrice ? (
              <>
                <div className="text-base font-bold" style={{ color: "oklch(0.38 0.06 160)" }}>
                  {item.discountedPrice.toLocaleString()} <span className="text-xs font-normal">{isRtl ? "ر.س" : "SAR"}</span>
                </div>
                <div className="text-xs text-gray-400 line-through">{item.price.toLocaleString()}</div>
              </>
            ) : (
              <div className="text-base font-bold" style={{ color: "oklch(0.38 0.06 160)" }}>
                {item.price.toLocaleString()} <span className="text-xs font-normal">{isRtl ? "ر.س" : "SAR"}</span>
              </div>
            )}
          </div>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mb-3">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3 h-3" fill={i < Math.floor(item.rating) ? "#f59e0b" : "none"} stroke={i < Math.floor(item.rating) ? "#f59e0b" : "#d1d5db"} />
            ))}
          </div>
          <span className="text-xs text-gray-400">({item.reviews})</span>
        </div>

        {/* Color swatches */}
        <div className="mb-3">
          <div className="text-[10px] text-gray-400 mb-1.5 flex items-center gap-1">
            <Palette className="w-3 h-3" />
            {isRtl ? "الألوان المتاحة" : "Available Colors"}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {item.colors.map((cId) => {
              const c = COLOR_SWATCHES.find((x) => x.id === cId);
              if (!c) return null;
              return (
                <button
                  key={cId}
                  onClick={() => setSelectedColor(cId)}
                  title={isRtl ? c.label : c.labelEn}
                  className="w-6 h-6 rounded-full border-2 transition-all"
                  style={{
                    background: c.hex,
                    borderColor: selectedColor === cId ? "oklch(0.68 0.10 60)" : "#e5e7eb",
                    boxShadow: selectedColor === cId ? "0 0 0 2px oklch(0.68 0.10 60 / 0.3)" : "none",
                    outline: c.hex === "#F5F5F0" ? "1px solid #e5e7eb" : "none",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Sizes */}
        <div className="mb-4">
          <div className="text-[10px] text-gray-400 mb-1.5 flex items-center gap-1">
            <Ruler className="w-3 h-3" />
            {isRtl ? "المقاسات المتاحة" : "Available Sizes"}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {item.sizes.map((sz) => (
              <span key={sz} className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-mono">
                {sz} {isRtl ? "سم" : "cm"}
              </span>
            ))}
          </div>
        </div>

        {/* Description toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-3"
        >
          <Info className="w-3.5 h-3.5" />
          {isRtl ? "تفاصيل المنتج" : "Product Details"}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {isExpanded && (
            <motion.p
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="text-xs text-gray-500 mb-3 overflow-hidden"
            >
              {isRtl ? item.desc : item.descEn}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Action */}
        <Button
          onClick={onOrder}
          className="w-full gap-2 text-sm text-white"
          style={{ background: "oklch(0.38 0.06 160)" }}
        >
          <ShoppingCart className="w-4 h-4" />
          {isRtl ? "طلب هذا المنتج" : "Order This Product"}
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────
export default function DistributorCatalogue() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { distributor } = useDistributorAuth();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showWizard, setShowWizard] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CatalogueItem | null>(null);

  // ── جلب المنتجات الحقيقية من قاعدة البيانات ────────────────
  const { data: dbProducts, isLoading, isError } = trpc.products.list.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const discountRate = distributor ? distributor.discount / 100 : 0;

  const catalogueItems = useMemo(() => {
    if (!dbProducts) return [];
    return dbProducts.map((p) => mapDbProductToCatalogueItem(p, discountRate));
  }, [dbProducts, discountRate]);

  const filtered = useMemo(() => {
    return catalogueItems.filter((item) => {
      const matchCat = activeCategory === "all" || item.category === activeCategory;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.nameEn.toLowerCase().includes(q) ||
        item.wood.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, activeCategory, catalogueItems]);

  if (isLoading) {
    return (
      <DistributorLayout
        title={isRtl ? "كتالوج المنتجات" : "Product Catalogue"}
        subtitle={isRtl ? "جاري تحميل المنتجات..." : "Loading products..."}
      >
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "oklch(0.38 0.06 160)" }} />
        </div>
      </DistributorLayout>
    );
  }

  if (isError) {
    return (
      <DistributorLayout
        title={isRtl ? "كتالوج المنتجات" : "Product Catalogue"}
        subtitle={isRtl ? "تعذر تحميل المنتجات" : "Failed to load catalogue"}
      >
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-400 gap-2">
          <AlertCircle className="w-12 h-12 text-red-500 opacity-80" />
          <p className="text-sm font-medium">{isRtl ? "حدث خطأ أثناء تحميل المنتجات من الخادم." : "An error occurred while fetching products."}</p>
        </div>
      </DistributorLayout>
    );
  }

  return (
    <DistributorLayout
      title={isRtl ? "كتالوج المنتجات" : "Product Catalogue"}
      subtitle={isRtl ? `${catalogueItems.length} منتج متاح · اختر وأنشئ طلبك مباشرة` : `${catalogueItems.length} products · Select and order directly`}
    >
      <div className="max-w-7xl mx-auto" dir={dir}>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={isRtl ? "ابحث عن منتج..." : "Search products..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9 text-sm rounded-xl border-gray-200"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute end-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 flex-shrink-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0"
                style={{
                  background: activeCategory === cat.id ? "oklch(0.38 0.06 160)" : "#f3f4f6",
                  color: activeCategory === cat.id ? "white" : "#6b7280",
                }}
              >
                {isRtl ? cat.label : cat.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <AnimatePresence mode="popLayout">
          {filtered.length > 0 ? (
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filtered.map((item) => (
                <CatalogueCard
                  key={item.id}
                  item={item}
                  isRtl={isRtl}
                  onOrder={() => { setSelectedItem(item); setShowWizard(true); }}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 text-gray-400"
            >
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{isRtl ? "لا توجد منتجات مطابقة" : "No matching products"}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Order Wizard with Prefilled configuration */}
        <NewOrderWizard
          isOpen={showWizard}
          onClose={() => { setShowWizard(false); setSelectedItem(null); }}
          initialOrderType="purchase_order"
          prefillItems={selectedItem ? [{
            id: selectedItem.id,
            doorType: selectedItem.category,
            doorTypeEn: selectedItem.categoryEn || selectedItem.category,
            woodType: selectedItem.woodType || "oak",
            woodTypeEn: selectedItem.woodTypeEn || "Natural Oak",
            color: selectedItem.colors?.[0] ? COLOR_SWATCHES.find(c => c.id === selectedItem.colors[0])?.label || "طبيعي" : "طبيعي",
            colorEn: selectedItem.colors?.[0] ? COLOR_SWATCHES.find(c => c.id === selectedItem.colors[0])?.labelEn || "Natural" : "Natural",
            colorHex: selectedItem.colors?.[0] ? COLOR_SWATCHES.find(c => c.id === selectedItem.colors[0])?.hex || "#C8A96E" : "#C8A96E",
            width: 90,
            height: 210,
            thickness: 45,
            quantity: 1,
            unitPrice: selectedItem.discountedPrice || selectedItem.price,
            image: selectedItem.image,
            notes: selectedItem.name || ""
          }] : undefined}
        />
      </div>
    </DistributorLayout>
  );
}

