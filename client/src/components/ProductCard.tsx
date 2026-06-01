/**
 * Design: Architectural Luxury - Warm Minimalism
 * ProductCard: Full-featured product card with interactive tiered pricing
 * Used in both Products page and Featured sections
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import ProductOptionsModal from "@/components/ProductOptionsModal";
import {
  ShoppingCart,
  Tag,
  Star,
  Minus,
  Plus,
  Heart,
  Eye,
  CheckCircle2,
  AlertCircle,
  Settings2,
} from "lucide-react";
import type { Product } from "@/lib/productsData";

interface ProductCardProps {
  product: Product;
  index?: number;
  viewMode?: "grid" | "list";
}

const badgeStyles: Record<string, string> = {
  copper: "bg-copper text-white",
  oak: "bg-oak text-white",
  green: "bg-emerald-600 text-white",
  red: "bg-red-600 text-white",
};

export default function ProductCard({
  product,
  index = 0,
  viewMode = "grid",
}: ProductCardProps) {
  const [selectedTier, setSelectedTier] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showOptions, setShowOptions] = useState(false);
  const { addToCart, openCart } = useCart();
  const { isInWishlist, toggleWishlist } = useUserAuth();
  const { dir } = useLanguage();
  const wishlisted = isInWishlist(Number(product.id));

  // Open options modal if product has options, otherwise add directly
  const handleAddToCart = (qty: number) => {
    if (!product.inStock) return;
    if (product.options && product.options.length > 0) {
      setShowOptions(true);
    } else {
      addToCart(product, qty);
      toast.success(
        dir === "rtl"
          ? `تمت إضافة ${qty} من "${product.name}" للسلة`
          : `${qty}x "${product.name}" added to cart`,
        { action: { label: dir === "rtl" ? "عرض السلة" : "View Cart", onClick: openCart } }
      );
    }
  };

  const currentTier = product.tiers[selectedTier];
  const maxSavings = Math.round(
    ((product.tiers[0].price - product.tiers[product.tiers.length - 1].price) /
      product.tiers[0].price) *
      100
  );

  // Auto-select tier based on quantity
  const handleQuantityChange = (newQty: number) => {
    if (newQty < 1) return;
    setQuantity(newQty);
    const tierIndex = product.tiers.findLastIndex((t) => newQty >= t.min);
    if (tierIndex >= 0) setSelectedTier(tierIndex);
  };

  const totalPrice = currentTier.price * quantity;

  if (viewMode === "list") {
    return (
      <>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className="group bg-white rounded-sm border border-border/50 overflow-hidden hover:shadow-md hover:shadow-oak/5 transition-all duration-400 flex gap-0"
      >
        {/* Image */}
        <div className="relative w-48 shrink-0 overflow-hidden bg-beige-light">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {product.badge && (
            <Badge
              className={`absolute top-3 right-3 border-0 rounded-sm px-2 py-0.5 text-xs ${
                badgeStyles[product.badgeColor || "copper"]
              }`}
            >
              {product.badge}
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col lg:flex-row gap-6">
          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-copper text-xs font-medium tracking-wider">
                {product.category}
              </span>
              {product.dimensions && (
                <span className="text-muted-foreground text-xs">· {product.dimensions}</span>
              )}
            </div>
            <Link href={`/product/${product.id}`}>
              <h3 className="text-lg font-bold text-wood-dark mb-2 leading-snug hover:text-oak transition-colors cursor-pointer">
                {product.name}
              </h3>
            </Link>
            {/* Rating */}
            <div className="flex items-center gap-1.5 mb-3">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < Math.floor(product.rating)
                        ? "fill-copper text-copper"
                        : "fill-border text-border"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {product.rating} ({product.reviewCount} {dir === "rtl" ? "تقييم" : "reviews"})
              </span>
            </div>
            {/* Features */}
            <ul className="space-y-1">
              {product.features.slice(0, 3).map((f) => (
                <li key={f} className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-copper shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pricing */}
          <div className="lg:w-64 shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-3.5 h-3.5 text-oak" />
              <span className="text-xs font-semibold text-oak">{dir === "rtl" ? "أسعار متدرجة" : "Tiered Pricing"}</span>
              <span className="text-xs text-copper font-bold">{dir === "rtl" ? `وفّر حتى ${maxSavings}%` : `Save up to ${maxSavings}%`}</span>
            </div>
            <div className="space-y-1.5 mb-4">
              {product.tiers.map((tier, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedTier(i); setQuantity(tier.min); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-sm border text-xs transition-all ${
                    selectedTier === i
                      ? "border-oak bg-oak/5 text-oak"
                      : "border-border/50 text-muted-foreground hover:border-oak/30"
                  }`}
                >
                  <span className="font-medium">{tier.label}</span>
                  <span className="font-bold">
                    {tier.price.toLocaleString("ar-SA")} {dir === "rtl" ? "ر.س" : "SAR"}
                    <span className="text-[10px] font-normal text-muted-foreground mr-1">/ {dir === "rtl" ? "باب" : "door"}</span>
                  </span>
                </button>
              ))}
            </div>
            <Button
              className="w-full bg-oak hover:bg-oak-dark text-white rounded-sm gap-2 text-sm"
              onClick={() => handleAddToCart(1)}
              disabled={!product.inStock}
            >
              {product.options && product.options.length > 0
                ? <Settings2 className="w-4 h-4" />
                : <ShoppingCart className="w-4 h-4" />}
              {product.inStock
                ? (product.options && product.options.length > 0
                    ? (dir === "rtl" ? "اختر الخيارات" : "Choose Options")
                    : (dir === "rtl" ? "أضف للسلة" : "Add to Cart"))
                : (dir === "rtl" ? "غير متوفر" : "Out of Stock")}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Options Modal for list view */}
      <ProductOptionsModal
        product={product}
        isOpen={showOptions}
        onClose={() => setShowOptions(false)}
        initialQuantity={1}
      />
    </>
    );
  }

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-white rounded-sm border border-border/50 overflow-hidden hover:shadow-lg hover:shadow-oak/5 transition-all duration-500 flex flex-col"
    >
      {/* Image */}
      <div className="relative aspect-[4/5] overflow-hidden bg-beige-light">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {/* Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          {product.badge && (
            <Badge
              className={`border-0 rounded-sm px-2.5 py-1 text-xs font-semibold ${
                badgeStyles[product.badgeColor || "copper"]
              }`}
            >
              {product.badge}
            </Badge>
          )}
          {!product.inStock && (
            <Badge className="bg-gray-500 text-white border-0 rounded-sm px-2.5 py-1 text-xs">
              {dir === "rtl" ? "نفذت الكمية" : "Out of Stock"}
            </Badge>
          )}
        </div>

        {/* Savings badge */}
        <div className="absolute top-3 left-3 bg-oak/90 text-white text-xs font-bold px-2.5 py-1 rounded-sm">
          {dir === "rtl" ? `وفّر ${maxSavings}%` : `Save ${maxSavings}%`}
        </div>

        {/* Hover actions */}
        <div className="absolute inset-0 bg-wood-dark/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
          <button
            onClick={() => {
              toggleWishlist(Number(product.id));
              toast(wishlisted
                ? (dir === "rtl" ? "تمت الإزالة من المفضلة" : "Removed from wishlist")
                : (dir === "rtl" ? "تمت الإضافة للمفضلة" : "Added to wishlist"));
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              wishlisted ? "bg-red-500 text-white" : "bg-white text-wood-dark hover:bg-copper hover:text-white"
            }`}
          >
            <Heart className={`w-4 h-4 ${wishlisted ? "fill-current" : ""}`} />
          </button>
          <Link href={`/product/${product.id}`}>
            <div
              className="w-10 h-10 rounded-full bg-white text-wood-dark hover:bg-oak hover:text-white flex items-center justify-center transition-all"
            >
              <Eye className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {/* Category + Rating */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-copper text-xs font-medium tracking-wider">
            {product.category}
          </span>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-copper text-copper" />
            <span className="text-xs font-semibold text-wood-dark">{product.rating}</span>
            <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
          </div>
        </div>

        <Link href={`/product/${product.id}`}>
          <h3 className="text-base font-bold text-wood-dark mb-1 leading-snug hover:text-oak transition-colors cursor-pointer">
            {product.name}
          </h3>
        </Link>
        {product.dimensions && (
          <p className="text-xs text-muted-foreground mb-3">{product.dimensions}</p>
        )}

        {/* Stock status */}
        <div className="flex items-center gap-1.5 mb-3">
          {product.inStock ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs text-emerald-700 font-medium">
                {dir === "rtl" ? "متوفر في المخزون" : "In Stock"}
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs text-amber-600 font-medium">
                {dir === "rtl" ? "نفذت الكمية - اطلب مسبقاً" : "Out of Stock - Pre-order"}
              </span>
            </>
          )}
        </div>

        {/* Tiered pricing */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Tag className="w-3.5 h-3.5 text-oak" />
            <span className="text-xs font-semibold text-oak">
              {dir === "rtl" ? "أسعار متدرجة حسب الكمية" : "Tiered Pricing by Quantity"}
            </span>
          </div>
          <div className="space-y-1.5">
            {product.tiers.map((tier, i) => (
              <button
                key={i}
                onClick={() => { setSelectedTier(i); setQuantity(tier.min); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-sm border text-xs transition-all ${
                  selectedTier === i
                    ? "border-oak bg-oak/5 text-oak"
                    : "border-border/40 text-muted-foreground hover:border-oak/30 hover:bg-oak/2"
                }`}
              >
                <span className="font-medium">{tier.label}</span>
                <div className="flex items-center gap-2">
                  {i > 0 && (
                    <span className="text-copper font-bold text-[10px]">
                      -{Math.round(((product.tiers[0].price - tier.price) / product.tiers[0].price) * 100)}%
                    </span>
                  )}
                  <span className="font-bold">
                    {tier.price.toLocaleString("ar-SA")}
                    <span className="text-[10px] font-normal text-muted-foreground mr-0.5">
                      {dir === "rtl" ? "ر.س/باب" : "SAR/door"}
                    </span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Quantity selector */}
        <div className="flex items-center justify-between mb-4 p-3 bg-beige-light rounded-sm">
          <span className="text-xs text-muted-foreground font-medium">
            {dir === "rtl" ? "الكمية:" : "Qty:"}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleQuantityChange(quantity - 1)}
              className="w-7 h-7 rounded-sm border border-border flex items-center justify-center hover:border-oak hover:text-oak transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-10 text-center text-sm font-bold text-wood-dark">
              {quantity}
            </span>
            <button
              onClick={() => handleQuantityChange(quantity + 1)}
              className="w-7 h-7 rounded-sm border border-border flex items-center justify-center hover:border-oak hover:text-oak transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="text-left">
            <div className="text-xs text-muted-foreground">
              {dir === "rtl" ? "الإجمالي" : "Total"}
            </div>
            <div className="text-sm font-bold text-oak">
              {totalPrice.toLocaleString("ar-SA")} {dir === "rtl" ? "ر.س" : "SAR"}
            </div>
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-1 mb-4 flex-1">
          {product.features.slice(0, 2).map((f) => (
            <li key={f} className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-copper shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        {/* Actions */}
        <Button
          className="w-full bg-oak hover:bg-oak-dark text-white rounded-sm gap-2"
          onClick={() => handleAddToCart(quantity)}
          disabled={!product.inStock}
        >
          {product.options && product.options.length > 0
            ? <Settings2 className="w-4 h-4" />
            : <ShoppingCart className="w-4 h-4" />}
          {product.inStock
            ? (product.options && product.options.length > 0
                ? (dir === "rtl" ? "اختر الخيارات" : "Choose Options")
                : (dir === "rtl" ? `أضف ${quantity} للسلة` : `Add ${quantity} to Cart`))
            : (dir === "rtl" ? "غير متوفر حالياً" : "Currently Unavailable")}
        </Button>
      </div>
    </motion.div>

    {/* Options Modal for grid view */}
    <ProductOptionsModal
      product={product}
      isOpen={showOptions}
      onClose={() => setShowOptions(false)}
      initialQuantity={quantity}
    />
    </>
  );
}
