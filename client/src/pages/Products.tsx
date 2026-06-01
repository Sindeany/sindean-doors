/**
 * Design: Architectural Luxury - Warm Minimalism
 * Products Page: Full catalog with sidebar filters, search, sort, and tiered pricing
 * RTL Arabic layout
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import ProductFilters, { FilterState } from "@/components/ProductFilters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search,
  LayoutGrid,
  List,
  SlidersHorizontal,
  ArrowLeft,
  Tag,
  Sparkles,
  X,
} from "lucide-react";
import { SORT_OPTIONS, CATEGORIES, WOOD_TYPES } from "@/lib/productsData";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

const INITIAL_FILTERS: FilterState = {
  category: "all",
  woodType: "all",
  priceRange: [0, 4000],
  inStockOnly: false,
  certifiedOnly: false,
  newOnly: false,
  bestsellersOnly: false,
};

export default function Products() {
  const { dir } = useLanguage();
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: allProducts = [], isLoading: productsLoading } =
    trpc.products.list.useQuery();
  const [sortBy, setSortBy] = useState("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Filter products
  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // Category
    if (filters.category !== "all") {
      result = result.filter(p => p.subcategory === filters.category);
    }

    // Wood type
    if (filters.woodType !== "all") {
      result = result.filter(p => p.woodType === filters.woodType);
    }

    // Price range (using first tier price or basePrice as reference)
    result = result.filter(p => {
      const price = (p as any).tiers?.[0]?.price ?? (p as any).basePrice ?? 0;
      return price >= filters.priceRange[0] && price <= filters.priceRange[1];
    });

    // Special filters
    if (filters.inStockOnly) result = result.filter(p => p.inStock);
    if (filters.certifiedOnly) result = result.filter(p => p.isCertified);
    if (filters.newOnly) result = result.filter(p => p.isNew);
    if (filters.bestsellersOnly) result = result.filter(p => p.isBestseller);

    // Sort
    switch (sortBy) {
      case "price-asc":
        result.sort(
          (a, b) =>
            ((a as any).tiers?.[0]?.price ?? (a as any).basePrice ?? 0) -
            ((b as any).tiers?.[0]?.price ?? (b as any).basePrice ?? 0)
        );
        break;
      case "price-desc":
        result.sort(
          (a, b) =>
            ((b as any).tiers?.[0]?.price ?? (b as any).basePrice ?? 0) -
            ((a as any).tiers?.[0]?.price ?? (a as any).basePrice ?? 0)
        );
        break;
      case "newest":
        result.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        break;
      case "rating":
        result.sort((a, b) => b.rating - a.rating);
        break;
      default:
        result.sort(
          (a, b) => (b.isBestseller ? 1 : 0) - (a.isBestseller ? 1 : 0)
        );
    }

    return result;
  }, [filters, searchQuery, sortBy, allProducts]);

  const activeFiltersCount = [
    filters.category !== "all",
    filters.woodType !== "all",
    filters.priceRange[0] > 0 || filters.priceRange[1] < 4000,
    filters.inStockOnly,
    filters.certifiedOnly,
    filters.newOnly,
    filters.bestsellersOnly,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen flex flex-col bg-warm-white">
      <Navbar />

      {/* Page Header */}
      <section className="bg-oak text-white py-12 lg:py-16 relative overflow-hidden">
        {/* Decorative wood grain pattern */}
        <div className="absolute inset-0 opacity-5">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute h-full border-r border-white"
              style={{ right: `${i * 12.5}%`, transform: "skewX(-5deg)" }}
            />
          ))}
        </div>
        <div className="container relative">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-white/60 text-sm mb-4">
            <Link href="/" className="hover:text-white transition-colors">
              {dir === "rtl" ? "الرئيسية" : "Home"}
            </Link>
            <span>/</span>
            <span className="text-white">
              {dir === "rtl" ? "المنتجات" : "Products"}
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-3"
              >
                <span className="text-copper-light text-sm font-semibold tracking-wider">
                  {dir === "rtl" ? "كتالوج المنتجات" : "Product Catalog"}
                </span>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-3xl lg:text-5xl font-bold leading-tight mb-3"
              >
                {dir === "rtl" ? "أبواب خشبية فاخرة" : "Premium Wooden Doors"}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-white/70 text-base lg:text-lg max-w-xl"
              >
                {dir === "rtl"
                  ? `اختر من بين ${allProducts.length}+ منتجاً بأسعار متدرجة تناسب الأفراد والشركات والمشاريع`
                  : `Choose from ${allProducts.length}+ products with tiered pricing for individuals, businesses, and projects`}
              </motion.p>
            </div>

            {/* Pricing highlight */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-sm p-5 shrink-0"
            >
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-copper-light" />
                <span className="text-sm font-semibold text-copper-light">
                  {dir === "rtl"
                    ? "نظام الأسعار المتدرجة"
                    : "Tiered Pricing System"}
                </span>
              </div>
              <div className="space-y-1.5">
                {(dir === "rtl"
                  ? [
                      { label: "1-4 أبواب", note: "سعر التجزئة" },
                      { label: "5-9 أبواب", note: "خصم 18%" },
                      { label: "10+ أبواب", note: "خصم 29%" },
                    ]
                  : [
                      { label: "1-4 Doors", note: "Retail Price" },
                      { label: "5-9 Doors", note: "18% Discount" },
                      { label: "10+ Doors", note: "29% Discount" },
                    ]
                ).map((tier, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-8 text-sm"
                  >
                    <span className="text-white/80">{tier.label}</span>
                    <span
                      className={
                        i > 0 ? "text-copper-light font-bold" : "text-white/60"
                      }
                    >
                      {tier.note}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container py-8 lg:py-12 flex-1">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={
                dir === "rtl" ? "ابحث عن منتج..." : "Search products..."
              }
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pr-10 border-border/50 bg-white rounded-sm focus-visible:ring-oak/30 focus-visible:border-oak"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Mobile filter button */}
            <Button
              variant="outline"
              className="lg:hidden border-border/50 gap-2 rounded-sm"
              onClick={() => setMobileFiltersOpen(true)}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {dir === "rtl" ? "الفلاتر" : "Filters"}
              {activeFiltersCount > 0 && (
                <Badge className="bg-oak text-white border-0 rounded-full w-5 h-5 p-0 flex items-center justify-center text-[10px]">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44 border-border/50 bg-white rounded-sm text-sm">
                <SelectValue placeholder="ترتيب حسب" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(opt => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View mode */}
            <div className="flex border border-border/50 rounded-sm overflow-hidden bg-white">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2.5 transition-colors ${
                  viewMode === "grid"
                    ? "bg-oak text-white"
                    : "text-muted-foreground hover:text-oak"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2.5 transition-colors ${
                  viewMode === "list"
                    ? "bg-oak text-white"
                    : "text-muted-foreground hover:text-oak"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active filter tags */}
        <AnimatePresence>
          {activeFiltersCount > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2 mb-6"
            >
              {filters.category !== "all" && (
                <Badge
                  className="bg-oak/10 text-oak border border-oak/20 rounded-sm gap-1.5 px-3 py-1.5 cursor-pointer hover:bg-oak/20"
                  onClick={() => setFilters({ ...filters, category: "all" })}
                >
                  {CATEGORIES.find(c => c.id === filters.category)?.label ||
                    filters.category}
                  <X className="w-3 h-3" />
                </Badge>
              )}
              {filters.woodType !== "all" && (
                <Badge
                  className="bg-oak/10 text-oak border border-oak/20 rounded-sm gap-1.5 px-3 py-1.5 cursor-pointer hover:bg-oak/20"
                  onClick={() => setFilters({ ...filters, woodType: "all" })}
                >
                  {WOOD_TYPES.find(w => w.id === filters.woodType)?.label ||
                    filters.woodType}
                  <X className="w-3 h-3" />
                </Badge>
              )}
              {filters.inStockOnly && (
                <Badge
                  className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-sm gap-1.5 px-3 py-1.5 cursor-pointer hover:bg-emerald-100"
                  onClick={() => setFilters({ ...filters, inStockOnly: false })}
                >
                  {dir === "rtl" ? "متوفر فقط" : "In Stock Only"}
                  <X className="w-3 h-3" />
                </Badge>
              )}
              {filters.certifiedOnly && (
                <Badge
                  className="bg-blue-50 text-blue-700 border border-blue-200 rounded-sm gap-1.5 px-3 py-1.5 cursor-pointer hover:bg-blue-100"
                  onClick={() =>
                    setFilters({ ...filters, certifiedOnly: false })
                  }
                >
                  {dir === "rtl" ? "معتمد فقط" : "Certified Only"}
                  <X className="w-3 h-3" />
                </Badge>
              )}
              <button
                onClick={() => setFilters(INITIAL_FILTERS)}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 px-2 transition-colors"
              >
                <X className="w-3 h-3" />
                {dir === "rtl" ? "مسح الكل" : "Clear All"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Layout: Sidebar + Products */}
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-28">
              <ProductFilters
                filters={filters}
                onFilterChange={setFilters}
                totalCount={allProducts.length}
                filteredCount={filteredProducts.length}
              />
            </div>
          </aside>

          {/* Mobile Filters */}
          <ProductFilters
            filters={filters}
            onFilterChange={setFilters}
            totalCount={allProducts.length}
            filteredCount={filteredProducts.length}
            isMobileOpen={mobileFiltersOpen}
            onMobileClose={() => setMobileFiltersOpen(false)}
          />

          {/* Products Grid */}
          <div className="flex-1 min-w-0">
            {filteredProducts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-beige flex items-center justify-center mb-4">
                  <Search className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold text-wood-dark mb-2">
                  {dir === "rtl"
                    ? "لا توجد نتائج مطابقة"
                    : "No matching results"}
                </h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-xs">
                  {dir === "rtl"
                    ? "جرّب تعديل الفلاتر أو البحث بكلمات مختلفة"
                    : "Try adjusting your filters or searching with different keywords"}
                </p>
                <Button
                  variant="outline"
                  className="border-oak text-oak hover:bg-oak hover:text-white rounded-sm"
                  onClick={() => {
                    setFilters(INITIAL_FILTERS);
                    setSearchQuery("");
                  }}
                >
                  {dir === "rtl" ? "مسح جميع الفلاتر" : "Clear All Filters"}
                </Button>
              </motion.div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-bold text-wood-dark">
                      {filteredProducts.length}
                    </span>{" "}
                    {dir === "rtl" ? "منتج" : "products"}
                  </p>
                  {searchQuery && (
                    <p className="text-sm text-muted-foreground">
                      {dir === "rtl" ? "نتائج البحث عن:" : "Results for:"}{" "}
                      <span className="font-semibold text-oak">
                        "{searchQuery}"
                      </span>
                    </p>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${filters.category}-${filters.woodType}-${sortBy}-${viewMode}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={
                      viewMode === "grid"
                        ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
                        : "flex flex-col gap-4"
                    }
                  >
                    {filteredProducts.map((product, i) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        index={i}
                        viewMode={viewMode}
                      />
                    ))}
                  </motion.div>
                </AnimatePresence>
              </>
            )}

            {/* Bulk pricing CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-12 bg-oak rounded-sm p-8 text-white relative overflow-hidden"
            >
              {/* Decorative */}
              <div className="absolute top-0 left-0 w-48 h-48 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-1/2 translate-y-1/2" />

              <div className="relative flex flex-col lg:flex-row items-start lg:items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-copper-light" />
                    <span className="text-copper-light text-sm font-semibold">
                      {dir === "rtl"
                        ? "عروض خاصة للجملة"
                        : "Special Bulk Offers"}
                    </span>
                  </div>
                  <h3 className="text-xl lg:text-2xl font-bold mb-2">
                    {dir === "rtl"
                      ? "تحتاج كمية أكبر من 20 باب؟"
                      : "Need more than 20 doors?"}
                  </h3>
                  <p className="text-white/70 text-sm lg:text-base">
                    {dir === "rtl"
                      ? "نقدم أسعاراً تنافسية خاصة للمشاريع الكبرى والموزعين. تواصل معنا للحصول على عرض سعر مخصص خلال 24 ساعة."
                      : "We offer special competitive pricing for large projects and distributors. Contact us for a custom quote within 24 hours."}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                  <Button
                    className="bg-copper hover:bg-copper/90 text-white gap-2 rounded-sm px-6"
                    onClick={() =>
                      toast(
                        dir === "rtl" ? "طلب عرض سعر قريباً" : "RFQ coming soon"
                      )
                    }
                  >
                    {dir === "rtl" ? "طلب عرض سعر" : "Request a Quote"}
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10 rounded-sm px-6 bg-transparent"
                    onClick={() =>
                      toast(
                        dir === "rtl"
                          ? "بوابة الموزعين قريباً"
                          : "Distributor portal coming soon"
                      )
                    }
                  >
                    {dir === "rtl" ? "بوابة الموزعين" : "Distributor Portal"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
