/**
 * Design: Architectural Luxury - Warm Minimalism
 * Product Detail Page: Full product view with image gallery, specs, tiered pricing, and reviews
 * Colors: oak (#2C4A3E), copper (#C4956A), beige (#E8DFD0), warm-white (#FAF8F5)
 * RTL Arabic layout
 */
import { useState, useMemo, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import {
  Star,
  ShoppingCart,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Check,
  Shield,
  Truck,
  RotateCcw,
  Phone,
  ThumbsUp,
  Award,
  Package,
  Ruler,
  TreePine,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  ZoomIn,
} from "lucide-react";
import { WOOD_TYPES, type Product, type Review } from "@/lib/productsData";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import ProductOptionsModal from "@/components/ProductOptionsModal";
import SizeGuideModal from "@/components/SizeGuideModal";
import DoorOrderWizard from "@/components/DoorOrderWizard";
import { Settings2 } from "lucide-react";

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          className={`${star <= Math.floor(rating) ? "fill-amber-400 text-amber-400" : star <= rating ? "fill-amber-400/50 text-amber-400" : "text-gray-300"}`}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const [helpful, setHelpful] = useState(false);
  const { dir } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="border border-border/60 rounded-lg p-5 bg-white hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-oak/10 flex items-center justify-center text-oak font-bold text-sm">
            {review.author.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground text-sm">
                {review.author}
              </span>
              {review.verified && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200"
                >
                  <CheckCircle2 className="w-3 h-3 ml-0.5" />
                  {dir === "rtl" ? "مشتري موثق" : "Verified Buyer"}
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(review.date).toLocaleDateString("ar-SA", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
        <StarRating rating={review.rating} size={14} />
      </div>
      <h4 className="font-semibold text-foreground mb-1.5 text-sm">
        {review.title}
      </h4>
      <p className="text-muted-foreground text-sm leading-relaxed mb-3">
        {review.content}
      </p>
      <button
        onClick={() => {
          setHelpful(true);
          toast.success(
            dir === "rtl" ? "شكراً لتقييمك!" : "Thank you for your feedback!"
          );
        }}
        disabled={helpful}
        className={`flex items-center gap-1.5 text-xs transition-colors ${helpful ? "text-oak" : "text-muted-foreground hover:text-oak"}`}
      >
        <ThumbsUp className="w-3.5 h-3.5" />
        {dir === "rtl" ? "مفيد" : "Helpful"} (
        {helpful ? review.helpful + 1 : review.helpful})
      </button>
    </motion.div>
  );
}

function RatingBreakdown({
  reviews,
  totalCount,
}: {
  reviews: Review[];
  totalCount: number;
}) {
  const breakdown = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    reviews.forEach(r => {
      const idx = Math.min(Math.max(Math.floor(r.rating) - 1, 0), 4);
      counts[idx]++;
    });
    return counts.reverse();
  }, [reviews]);

  const maxCount = Math.max(...breakdown, 1);

  return (
    <div className="space-y-2">
      {breakdown.map((count, i) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground w-6 text-center">{5 - i}</span>
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${(count / maxCount) * 100}%` }}
            />
          </div>
          <span className="text-muted-foreground w-8 text-left text-xs">
            {count}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ProductDetail() {
  const { dir } = useLanguage();
  const [, params] = useRoute("/product/:id");
  const productId = params?.id;

  const { data: product, isLoading: productLoading } =
    trpc.products.getById.useQuery(
      { id: productId ?? "" },
      { enabled: !!productId }
    );

  const { data: allProductsForRelated = [] } = trpc.products.list.useQuery();
  const { data: optionSectionsData = [] } = trpc.productOptions.get.useQuery();
  const { addToCart, openCart } = useCart();

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showDoorWizard, setShowDoorWizard] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [productId]);

  const productOptions = useMemo(() => {
    const rawOptions = (product as any)?.options;
    if (
      rawOptions &&
      typeof rawOptions === "object" &&
      !Array.isArray(rawOptions)
    ) {
      return rawOptions as Record<string, string[]>;
    }
    return null;
  }, [product]);

  const availableOrderSections = useMemo(() => {
    const sections = Array.isArray(optionSectionsData)
      ? (optionSectionsData as Array<{
          id: string;
          label: string;
          icon?: string;
        }>)
      : [];
    return sections;
  }, [optionSectionsData]);

  if (productLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-oak border-t-transparent animate-spin mx-auto" />
            <p className="text-muted-foreground">
              {dir === "rtl" ? "جاري تحميل المنتج..." : "Loading product..."}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <XCircle className="w-16 h-16 text-muted-foreground mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">
              {dir === "rtl" ? "المنتج غير موجود" : "Product Not Found"}
            </h1>
            <p className="text-muted-foreground">
              {dir === "rtl"
                ? "عذراً، لم نتمكن من العثور على المنتج المطلوب."
                : "Sorry, we couldn't find the requested product."}
            </p>
            <Link href="/products">
              <Button className="bg-oak hover:bg-oak-dark text-white">
                {dir === "rtl" ? "العودة للمنتجات" : "Back to Products"}
                <ArrowRight className="w-4 h-4 mr-2" />
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const currentTier =
    product.tiers.find(
      t => quantity >= t.min && (t.max === null || quantity <= t.max)
    ) || product.tiers[0];

  const retailPrice = product.tiers[0].price;
  const currentPrice = currentTier.price;
  const totalPrice = currentPrice * quantity;
  const savings = (retailPrice - currentPrice) * quantity;
  const discountPercent = Math.round(
    ((retailPrice - currentPrice) / retailPrice) * 100
  );

  const woodTypeLabel =
    WOOD_TYPES.find(w => w.id === product.woodType)?.label || product.woodType;

  const relatedProducts = allProductsForRelated
    .filter(
      (p: any) => p.id !== product.id && p.subcategory === product.subcategory
    )
    .slice(0, 4);

  // Show wizard for all door products; only skip for accessories
  const isDoorProduct = product.category !== "accessories";

  const handleAddToCart = () => {
    if (!product.inStock) return;
    if (isDoorProduct) {
      setShowDoorWizard(true);
    } else {
      addToCart(product, quantity);
      toast.success(
        dir === "rtl"
          ? `تمت إضافة ${quantity} من "${product.name}" إلى السلة`
          : `${quantity}x "${product.name}" added to cart`,
        {
          description:
            dir === "rtl"
              ? `الإجمالي: ${totalPrice.toLocaleString("ar-SA")} ر.س`
              : `Total: ${totalPrice.toLocaleString("ar-SA")} SAR`,
          action: {
            label: dir === "rtl" ? "عرض السلة" : "View Cart",
            onClick: openCart,
          },
        }
      );
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success(dir === "rtl" ? "تم نسخ رابط المنتج" : "Product link copied");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Breadcrumb */}
      <div className="bg-beige-light border-b border-border/40">
        <div className="container py-3">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-oak transition-colors">
              {dir === "rtl" ? "الرئيسية" : "Home"}
            </Link>
            <ChevronLeft className="w-3.5 h-3.5" />
            <Link href="/products" className="hover:text-oak transition-colors">
              {dir === "rtl" ? "المنتجات" : "Products"}
            </Link>
            <ChevronLeft className="w-3.5 h-3.5" />
            <Link
              href={`/products`}
              className="hover:text-oak transition-colors"
            >
              {product.category}
            </Link>
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {product.name}
            </span>
          </nav>
        </div>
      </div>

      <main className="flex-1">
        {/* Product Main Section */}
        <section className="container py-8 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14">
            {/* Image Gallery */}
            <div className="space-y-4">
              {/* Main Image */}
              <motion.div
                className="relative aspect-[4/5] rounded-xl overflow-hidden bg-beige-light border border-border/30 cursor-zoom-in group"
                onClick={() => setZoomOpen(true)}
                layoutId="product-image"
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={selectedImage}
                    src={product.images[selectedImage]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </AnimatePresence>

                {/* Zoom hint */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                </div>

                {/* Badges */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  {product.badge && (
                    <Badge
                      className={`text-xs px-3 py-1 ${
                        product.badgeColor === "copper"
                          ? "bg-copper text-white"
                          : product.badgeColor === "red"
                            ? "bg-red-600 text-white"
                            : product.badgeColor === "oak"
                              ? "bg-oak text-white"
                              : "bg-emerald-600 text-white"
                      }`}
                    >
                      {product.badge}
                    </Badge>
                  )}
                  {discountPercent > 0 && quantity > 1 && (
                    <Badge className="bg-emerald-600 text-white text-xs px-3 py-1">
                      وفّر {discountPercent}%
                    </Badge>
                  )}
                </div>

                {/* Nav arrows */}
                {product.images.length > 1 && (
                  <>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedImage(
                          prev => (prev + 1) % product.images.length
                        );
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-sm"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedImage(
                          prev =>
                            (prev - 1 + product.images.length) %
                            product.images.length
                        );
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-sm"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Image counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
                  {selectedImage + 1} / {product.images.length}
                </div>
              </motion.div>

              {/* Thumbnails */}
              <div className="flex gap-3">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === i
                        ? "border-oak shadow-md"
                        : "border-border/30 hover:border-oak/40"
                    }`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {selectedImage === i && (
                      <div className="absolute inset-0 bg-oak/10" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              {/* Category & SKU */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="bg-beige text-oak-dark border-oak/20 text-xs"
                  >
                    {product.category}
                  </Badge>
                  {product.isCertified && (
                    <Badge className="bg-red-50 text-red-700 border-red-200 text-xs">
                      <Award className="w-3 h-3 ml-1" />
                      معتمد
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  SKU: {product.sku}
                </span>
              </div>

              {/* Name */}
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground leading-tight font-serif">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-3">
                <StarRating rating={product.rating} size={18} />
                <span className="font-semibold text-foreground">
                  {product.rating}
                </span>
                <span className="text-muted-foreground">
                  ({product.reviewCount} {dir === "rtl" ? "تقييم" : "reviews"})
                </span>
                <Separator orientation="vertical" className="h-4" />
                <span
                  className={`text-sm font-medium ${product.inStock ? "text-emerald-600" : "text-red-500"}`}
                >
                  {product.inStock ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />{" "}
                      {dir === "rtl" ? "متوفر في المخزون" : "In Stock"}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <XCircle className="w-4 h-4" />{" "}
                      {dir === "rtl" ? "نفذت الكمية" : "Out of Stock"}
                    </span>
                  )}
                </span>
              </div>

              {/* Description */}
              <p className="text-muted-foreground leading-relaxed">
                {product.description}
              </p>

              {/* Quick specs row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {product.dimensions &&
                  product.dimensions !== "متعدد الأحجام" && (
                    <div className="flex items-center gap-2 bg-beige-light rounded-lg p-3">
                      <Ruler className="w-4 h-4 text-oak" />
                      <div>
                        <div className="text-[10px] text-muted-foreground">
                          الأبعاد
                        </div>
                        <div className="text-xs font-semibold text-foreground">
                          {product.dimensions}
                        </div>
                      </div>
                    </div>
                  )}
                <div className="flex items-center gap-2 bg-beige-light rounded-lg p-3">
                  <TreePine className="w-4 h-4 text-oak" />
                  <div>
                    <div className="text-[10px] text-muted-foreground">
                      نوع الخشب
                    </div>
                    <div className="text-xs font-semibold text-foreground">
                      {woodTypeLabel}
                    </div>
                  </div>
                </div>
                {product.weight && (
                  <div className="flex items-center gap-2 bg-beige-light rounded-lg p-3">
                    <Package className="w-4 h-4 text-oak" />
                    <div>
                      <div className="text-[10px] text-muted-foreground">
                        الوزن
                      </div>
                      <div className="text-xs font-semibold text-foreground">
                        {product.weight}
                      </div>
                    </div>
                  </div>
                )}
                {product.warranty && (
                  <div className="flex items-center gap-2 bg-beige-light rounded-lg p-3">
                    <Shield className="w-4 h-4 text-oak" />
                    <div>
                      <div className="text-[10px] text-muted-foreground">
                        الضمان
                      </div>
                      <div className="text-xs font-semibold text-foreground">
                        {product.warranty}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Tiered Pricing */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-oak rounded-full" />
                  {dir === "rtl"
                    ? "أسعار متدرجة حسب الكمية"
                    : "Tiered Pricing by Quantity"}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {product.tiers.map((tier, i) => {
                    const isActive = currentTier === tier;
                    const tierDiscount =
                      i > 0
                        ? Math.round(
                            ((product.tiers[0].price - tier.price) /
                              product.tiers[0].price) *
                              100
                          )
                        : 0;
                    return (
                      <button
                        key={i}
                        onClick={() => setQuantity(tier.min)}
                        className={`relative rounded-lg border-2 p-3 text-center transition-all ${
                          isActive
                            ? "border-oak bg-oak/5 shadow-sm"
                            : "border-border/40 hover:border-oak/40 bg-white"
                        }`}
                      >
                        {isActive && (
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-oak text-white text-[10px] px-2 py-0.5 rounded-full">
                            {dir === "rtl" ? "مختار" : "Selected"}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mb-1">
                          {tier.label}
                        </div>
                        <div className="font-bold text-foreground">
                          {tier.price.toLocaleString("ar-SA")}
                          <span className="text-xs font-normal text-muted-foreground mr-0.5">
                            {dir === "rtl" ? "ر.س" : "SAR"}
                          </span>
                        </div>
                        {tierDiscount > 0 && (
                          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                            {dir === "rtl"
                              ? `وفّر ${tierDiscount}%`
                              : `Save ${tierDiscount}%`}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity & Total */}
              <div className="bg-beige-light rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">
                    {dir === "rtl" ? "الكمية" : "Quantity"}
                  </span>
                  <div className="flex items-center gap-1 border border-border/60 rounded-lg bg-white">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 rounded-r-lg transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={e => {
                        const v = parseInt(e.target.value);
                        if (!isNaN(v) && v >= 1) setQuantity(v);
                      }}
                      className="w-14 h-9 text-center font-semibold text-foreground bg-transparent border-x border-border/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 rounded-l-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {dir === "rtl" ? "سعر الوحدة" : "Unit Price"}
                    </span>
                    <span className="font-medium">
                      {currentPrice.toLocaleString("ar-SA")}{" "}
                      {dir === "rtl" ? "ر.س" : "SAR"}
                    </span>
                  </div>
                  {savings > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-emerald-600">
                        {dir === "rtl" ? "التوفير" : "Savings"}
                      </span>
                      <span className="text-emerald-600 font-medium">
                        -{savings.toLocaleString("ar-SA")}{" "}
                        {dir === "rtl" ? "ر.س" : "SAR"}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground text-lg">
                      {dir === "rtl" ? "الإجمالي" : "Total"}
                    </span>
                    <span className="font-bold text-oak text-2xl">
                      {totalPrice.toLocaleString("ar-SA")}{" "}
                      <span className="text-base">
                        {dir === "rtl" ? "ر.س" : "SAR"}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={handleAddToCart}
                  disabled={!product.inStock}
                  className="flex-1 h-12 bg-oak hover:bg-oak-dark text-white text-base font-semibold rounded-lg gap-2"
                >
                  {isDoorProduct ? (
                    <Settings2 className="w-5 h-5" />
                  ) : (
                    <ShoppingCart className="w-5 h-5" />
                  )}
                  {product.inStock
                    ? isDoorProduct
                      ? dir === "rtl"
                        ? `اختر الخيارات وأضف للسلة`
                        : `Choose Options & Add to Cart`
                      : dir === "rtl"
                        ? `أضف ${quantity} للسلة`
                        : `Add ${quantity} to Cart`
                    : dir === "rtl"
                      ? "غير متوفر حالياً"
                      : "Currently Unavailable"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsWishlisted(!isWishlisted);
                    toast.success(
                      isWishlisted
                        ? dir === "rtl"
                          ? "تمت الإزالة من المفضلة"
                          : "Removed from wishlist"
                        : dir === "rtl"
                          ? "تمت الإضافة للمفضلة"
                          : "Added to wishlist"
                    );
                  }}
                  className={`h-12 w-12 rounded-lg ${isWishlisted ? "text-red-500 border-red-200 bg-red-50" : ""}`}
                >
                  <Heart
                    className={`w-5 h-5 ${isWishlisted ? "fill-red-500" : ""}`}
                  />
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShare}
                  className="h-12 w-12 rounded-lg"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>

              {/* Size Guide Button */}
              <button
                onClick={() => setShowSizeGuide(true)}
                className="flex items-center gap-3 w-full text-start bg-gradient-to-l from-oak/5 to-copper/5 hover:from-oak/10 hover:to-copper/10 border border-oak/20 hover:border-oak/40 rounded-xl px-4 py-3.5 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-oak/10 group-hover:bg-oak/20 flex items-center justify-center flex-shrink-0 transition-colors">
                  <Ruler className="w-4 h-4 text-oak" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground text-sm">
                    {dir === "rtl" ? "دليل المقاسات" : "Size Guide"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {dir === "rtl"
                      ? "تعرّف على المقاس المناسب لفتحتك وكيفية القياس"
                      : "Find the right size for your opening & how to measure"}
                  </div>
                </div>
                <div className="text-xs font-semibold text-oak bg-oak/10 group-hover:bg-oak/20 px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors">
                  {dir === "rtl" ? "عرض الدليل" : "View Guide"}
                </div>
              </button>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-1.5 text-center p-3 rounded-lg bg-white border border-border/30">
                  <Truck className="w-5 h-5 text-oak" />
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    {dir === "rtl" ? (
                      <>
                        شحن مجاني
                        <br />
                        فوق 5,000 ر.س
                      </>
                    ) : (
                      <>
                        Free Shipping
                        <br />
                        Over 5,000 SAR
                      </>
                    )}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1.5 text-center p-3 rounded-lg bg-white border border-border/30">
                  <RotateCcw className="w-5 h-5 text-oak" />
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    {dir === "rtl" ? (
                      <>
                        إرجاع مجاني
                        <br />
                        خلال 14 يوم
                      </>
                    ) : (
                      <>
                        Free Returns
                        <br />
                        Within 14 Days
                      </>
                    )}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1.5 text-center p-3 rounded-lg bg-white border border-border/30">
                  <Phone className="w-5 h-5 text-oak" />
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    {dir === "rtl" ? (
                      <>
                        دعم فني
                        <br />
                        920-000-000
                      </>
                    ) : (
                      <>
                        Technical Support
                        <br />
                        920-000-000
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* B2B CTA */}
              <div className="bg-gradient-to-l from-oak/5 to-copper/5 rounded-xl p-4 border border-oak/10">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-oak/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Package className="w-5 h-5 text-oak" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground text-sm mb-1">
                      {dir === "rtl"
                        ? "تحتاج كمية أكبر؟"
                        : "Need a larger quantity?"}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      {dir === "rtl"
                        ? "للمشاريع والشركات، نقدم أسعاراً خاصة وخدمة توصيل مخصصة."
                        : "For projects and businesses, we offer special pricing and dedicated delivery."}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-oak border-oak/30 hover:bg-oak hover:text-white text-xs h-8"
                      onClick={() =>
                        toast.info(
                          dir === "rtl"
                            ? "صفحة طلب عرض السعر قريباً"
                            : "RFQ page coming soon"
                        )
                      }
                    >
                      {dir === "rtl"
                        ? "طلب عرض سعر خاص"
                        : "Request Special Quote"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tabs: Specs, Features, Reviews */}
        <section className="bg-beige-light/50 border-t border-border/30">
          <div className="container py-10 lg:py-14">
            <Tabs defaultValue="specs" dir={dir}>
              <TabsList className="bg-white border border-border/40 rounded-lg p-1 h-auto flex-wrap gap-1 w-full sm:w-auto">
                <TabsTrigger
                  value="specs"
                  className="data-[state=active]:bg-oak data-[state=active]:text-white rounded-md px-5 py-2 text-sm"
                >
                  {dir === "rtl" ? "المواصفات الفنية" : "Technical Specs"}
                </TabsTrigger>
                <TabsTrigger
                  value="features"
                  className="data-[state=active]:bg-oak data-[state=active]:text-white rounded-md px-5 py-2 text-sm"
                >
                  {dir === "rtl" ? "المميزات" : "Features"}
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="data-[state=active]:bg-oak data-[state=active]:text-white rounded-md px-5 py-2 text-sm"
                >
                  {dir === "rtl" ? "التقييمات" : "Reviews"} (
                  {product.reviews.length})
                </TabsTrigger>
              </TabsList>

              {/* Specs Tab */}
              <TabsContent value="specs" className="mt-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border border-border/30 overflow-hidden"
                >
                  <div className="p-6">
                    <h3 className="font-bold text-foreground text-lg mb-4 flex items-center gap-2">
                      <Ruler className="w-5 h-5 text-oak" />
                      {dir === "rtl"
                        ? "المواصفات الفنية"
                        : "Technical Specifications"}
                    </h3>
                    <div className="divide-y divide-border/30">
                      {Array.isArray(product.specs) &&
                        product.specs.map((spec, i) => (
                          <div
                            key={i}
                            className={`flex items-center py-3.5 ${i % 2 === 0 ? "bg-beige-light/30" : ""} px-3 -mx-3 rounded`}
                          >
                            <span className="text-muted-foreground text-sm w-40 flex-shrink-0">
                              {spec.label}
                            </span>
                            <span className="font-medium text-foreground text-sm">
                              {spec.value}
                            </span>
                          </div>
                        ))}
                    </div>

                    {isDoorProduct && (
                      <div className="mt-6 pt-5 border-t border-border/30">
                        <h4 className="font-semibold text-foreground text-sm mb-3">
                          {dir === "rtl"
                            ? "خيارات الطلب المتاحة لهذا المنتج"
                            : "Available Order Sections for This Product"}
                        </h4>
                        {availableOrderSections.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {availableOrderSections.map(sec => (
                              <Badge
                                key={sec.id}
                                variant="secondary"
                                className="bg-oak/10 text-oak border border-oak/20 px-3 py-1"
                              >
                                <span className="me-1">{sec.icon ?? "⚙️"}</span>
                                {sec.label}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {dir === "rtl"
                              ? "لا توجد أقسام محددة، سيتم إظهار الأقسام المفعلة عامة عند الطلب."
                              : "No product-specific sections selected; globally enabled sections will be shown when ordering."}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              </TabsContent>

              {/* Features Tab */}
              <TabsContent value="features" className="mt-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border border-border/30 p-6"
                >
                  <h3 className="font-bold text-foreground text-lg mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-oak" />
                    {dir === "rtl" ? "مميزات المنتج" : "Product Features"}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {product.features.map((feature, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-3 p-3 rounded-lg bg-beige-light/50"
                      >
                        <div className="w-6 h-6 rounded-full bg-oak/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5 text-oak" />
                        </div>
                        <span className="text-foreground text-sm">
                          {feature}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Additional info */}
                  <Separator className="my-6" />
                  <div className="prose prose-sm max-w-none text-muted-foreground">
                    <h4 className="text-foreground font-semibold text-base mb-2">
                      {dir === "rtl" ? "وصف المنتج" : "Product Description"}
                    </h4>
                    <p className="leading-relaxed">{product.description}</p>
                  </div>
                </motion.div>
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews" className="mt-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {/* Rating Summary */}
                  <div className="bg-white rounded-xl border border-border/30 p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
                      <div className="text-center md:border-l md:border-border/30 md:pl-6">
                        <div className="text-5xl font-bold text-foreground mb-1">
                          {product.rating}
                        </div>
                        <StarRating rating={product.rating} size={20} />
                        <div className="text-sm text-muted-foreground mt-1">
                          {dir === "rtl"
                            ? `من ${product.reviewCount} تقييم`
                            : `from ${product.reviewCount} reviews`}
                        </div>
                      </div>
                      <RatingBreakdown
                        reviews={product.reviews}
                        totalCount={product.reviewCount}
                      />
                    </div>
                  </div>

                  {/* Reviews List */}
                  <div className="space-y-4">
                    {product.reviews.map(review => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>

                  {product.reviewCount > product.reviews.length && (
                    <div className="text-center mt-6">
                      <Button
                        variant="outline"
                        className="border-oak/30 text-oak hover:bg-oak hover:text-white"
                        onClick={() =>
                          toast.info(
                            dir === "rtl"
                              ? "عرض جميع التقييمات قريباً"
                              : "View all reviews coming soon"
                          )
                        }
                      >
                        {dir === "rtl"
                          ? `عرض جميع التقييمات (${product.reviewCount})`
                          : `View All Reviews (${product.reviewCount})`}
                      </Button>
                    </div>
                  )}
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="container py-10 lg:py-14">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl lg:text-2xl font-bold text-foreground font-serif">
                {dir === "rtl" ? "منتجات مشابهة" : "Related Products"}
              </h2>
              <Link href="/products">
                <Button
                  variant="ghost"
                  className="text-oak hover:text-oak-dark gap-1 text-sm"
                >
                  {dir === "rtl" ? "عرض الكل" : "View All"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {relatedProducts.map(p => (
                <Link key={p.id} href={`/product/${p.id}`}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    className="bg-white rounded-xl border border-border/30 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                  >
                    <div className="aspect-[4/5] overflow-hidden bg-beige-light">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="text-xs text-muted-foreground">
                        {p.category}
                      </div>
                      <h3 className="font-semibold text-foreground text-sm line-clamp-1">
                        {p.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <StarRating rating={p.rating} size={12} />
                        <span className="text-xs text-muted-foreground">
                          ({p.reviewCount})
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-bold text-oak">
                          {p.tiers[0].price.toLocaleString("ar-SA")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ر.س
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Zoom Modal */}
        <AnimatePresence>
          {zoomOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
              onClick={() => setZoomOpen(false)}
            >
              <motion.img
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                src={product.images[selectedImage]}
                alt={product.name}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
              <button
                onClick={() => setZoomOpen(false)}
                className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
              {/* Zoom nav arrows */}
              {product.images.length > 1 && (
                <>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedImage(
                        prev => (prev + 1) % product.images.length
                      );
                    }}
                    className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedImage(
                        prev =>
                          (prev - 1 + product.images.length) %
                          product.images.length
                      );
                    }}
                    className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />

      {/* Options Modal - Legacy fallback */}
      <ProductOptionsModal
        product={product}
        isOpen={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        initialQuantity={quantity}
      />

      {/* New Door Order Wizard */}
      <DoorOrderWizard
        isOpen={showDoorWizard}
        onClose={() => setShowDoorWizard(false)}
        productId={product.id}
        productName={product.name}
        basePrice={product.tiers[0]?.price}
        productOptions={productOptions}
      />

      {/* Size Guide Modal */}
      <SizeGuideModal
        isOpen={showSizeGuide}
        onClose={() => setShowSizeGuide(false)}
        doorType={product.subcategory}
      />
    </div>
  );
}
