// ============================================================
// DistributorCatalogue - Interactive Product Catalogue
// Sindian Doors - Distributor Portal
// ============================================================
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Filter, X, ChevronDown, Eye, ShoppingCart,
  Star, Ruler, Palette, Tag, Info, Check, Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import NewOrderWizard from "@/components/distributor/NewOrderWizard";
import DistributorLayout from "@/components/distributor/DistributorLayout";

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

const CATALOGUE_ITEMS = [
  {
    id: "cat-1", category: "interior",
    name: "باب داخلي كلاسيكي", nameEn: "Classic Interior Door",
    wood: "بلوط طبيعي", woodEn: "Natural Oak",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80",
    sizes: ["80×200", "90×210", "100×210"],
    price: 850, discountedPrice: 765,
    colors: ["natural", "light_oak", "white", "grey"],
    rating: 4.8, reviews: 124,
    isNew: false, isBestSeller: true,
    desc: "باب داخلي بتصميم كلاسيكي من خشب البلوط الطبيعي، مثالي للغرف والمكاتب.",
    descEn: "Classic interior door in natural oak, ideal for rooms and offices.",
  },
  {
    id: "cat-2", category: "interior",
    name: "باب داخلي معاصر", nameEn: "Contemporary Interior Door",
    wood: "MDF بقشرة خشبية", woodEn: "MDF with Wood Veneer",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&q=80",
    sizes: ["80×200", "90×210", "100×210", "120×240"],
    price: 650, discountedPrice: null,
    colors: ["white", "charcoal", "grey", "espresso"],
    rating: 4.6, reviews: 89,
    isNew: true, isBestSeller: false,
    desc: "تصميم عصري بخطوط نظيفة، متوفر بألوان متعددة.",
    descEn: "Modern design with clean lines, available in multiple colors.",
  },
  {
    id: "cat-3", category: "exterior",
    name: "باب خارجي فاخر", nameEn: "Luxury Exterior Door",
    wood: "ساج طبيعي", woodEn: "Natural Teak",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=500&q=80",
    sizes: ["90×210", "100×210", "120×240"],
    price: 2150, discountedPrice: 1935,
    colors: ["natural", "dark_walnut", "mahogany"],
    rating: 4.9, reviews: 67,
    isNew: false, isBestSeller: true,
    desc: "باب خارجي من خشب الساج المقاوم للرطوبة والحشرات.",
    descEn: "Exterior door in moisture and insect-resistant teak wood.",
  },
  {
    id: "cat-4", category: "fire",
    name: "باب مقاوم للحريق FD30", nameEn: "Fire Door FD30",
    wood: "جوز أمريكي", woodEn: "American Walnut",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80",
    sizes: ["90×210", "100×210"],
    price: 1350, discountedPrice: null,
    colors: ["natural", "dark_walnut", "charcoal"],
    rating: 4.7, reviews: 43,
    isNew: false, isBestSeller: false,
    desc: "باب مقاوم للحريق لمدة 30 دقيقة، مطابق للمواصفات السعودية.",
    descEn: "30-minute fire-resistant door, compliant with Saudi standards.",
  },
  {
    id: "cat-5", category: "main",
    name: "باب رئيسي ملكي", nameEn: "Royal Main Entrance Door",
    wood: "جوز أمريكي", woodEn: "American Walnut",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=500&q=80",
    sizes: ["120×240", "140×260"],
    price: 3200, discountedPrice: 2880,
    colors: ["dark_walnut", "mahogany", "espresso"],
    rating: 5.0, reviews: 31,
    isNew: true, isBestSeller: true,
    desc: "باب رئيسي فاخر بنقوش يدوية، يليق بالفلل والقصور.",
    descEn: "Luxury main door with hand carvings, perfect for villas and palaces.",
  },
  {
    id: "cat-6", category: "sliding",
    name: "باب منزلق زجاجي", nameEn: "Glass Sliding Door",
    wood: "ألومنيوم وزجاج", woodEn: "Aluminum & Glass",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&q=80",
    sizes: ["120×240", "160×240", "200×240"],
    price: 1800, discountedPrice: 1620,
    colors: ["charcoal", "grey", "white"],
    rating: 4.5, reviews: 58,
    isNew: false, isBestSeller: false,
    desc: "باب منزلق بإطار ألومنيوم وزجاج مقسّى، مثالي للمساحات المفتوحة.",
    descEn: "Sliding door with aluminum frame and tempered glass, ideal for open spaces.",
  },
];

// ─── Product Card ────────────────────────────────────────────
function CatalogueCard({ item, isRtl, onOrder }: { item: typeof CATALOGUE_ITEMS[0]; isRtl: boolean; onOrder: () => void }) {
  const [selectedColor, setSelectedColor] = useState(item.colors[0]);
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

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showWizard, setShowWizard] = useState(false);
  const [selectedItem, setSelectedItem] = useState<typeof CATALOGUE_ITEMS[0] | null>(null);

  const filtered = useMemo(() => {
    return CATALOGUE_ITEMS.filter((item) => {
      const matchCat = activeCategory === "all" || item.category === activeCategory;
      const q = search.toLowerCase();
      const matchSearch = !q || item.name.includes(q) || item.nameEn.toLowerCase().includes(q) || item.wood.includes(q);
      return matchCat && matchSearch;
    });
  }, [search, activeCategory]);

  return (
    <DistributorLayout
      title={isRtl ? "كتالوج المنتجات" : "Product Catalogue"}
      subtitle={isRtl ? `${CATALOGUE_ITEMS.length} منتج متاح · اختر وأنشئ طلبك مباشرة` : `${CATALOGUE_ITEMS.length} products · Select and order directly`}
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
            className="ps-9 text-sm"
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
              className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0"
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

      {/* Order Wizard */}
      <NewOrderWizard
        isOpen={showWizard}
        onClose={() => { setShowWizard(false); setSelectedItem(null); }}
        initialOrderType="purchase_order"
      />
    </div>
    </DistributorLayout>
  );
}
