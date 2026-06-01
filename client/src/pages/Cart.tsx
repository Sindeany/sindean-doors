/**
 * Cart Page - صفحة سلة المشتريات
 * Design: Architectural Luxury — Oak Green #2C4A3E, Copper #C4956A, Warm Beige #E8DFD0
 * Bilingual: Arabic RTL / English LTR
 */

import { useCart, getUnitPrice } from "@/contexts/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart, Trash2, Plus, Minus, ArrowLeft, Tag, TrendingDown,
  Package, ChevronLeft, Info, Truck, Shield, Clock,
} from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

function formatPrice(price: number) {
  return price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function CartPage() {
  const { items, summary, removeFromCart, updateQuantity, clearCart } = useCart();
  const { dir } = useLanguage();
  const isRTL = dir === "rtl";

  return (
    <div className="min-h-screen bg-[#FAF8F5]" dir={dir}>
      <Navbar />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-[#E8DFD0]">
        <div className="container py-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-[#2C4A3E] transition-colors">
              {isRTL ? "الرئيسية" : "Home"}
            </Link>
            <ChevronLeft className="w-4 h-4" />
            <span className="text-[#2C4A3E] font-medium">{isRTL ? "سلة المشتريات" : "Shopping Cart"}</span>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Page Title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#2C4A3E]" style={{ fontFamily: "'DM Serif Display', serif" }}>
              {isRTL ? "سلة المشتريات" : "Shopping Cart"}
            </h1>
            {items.length > 0 && (
              <p className="text-gray-500 mt-1">
                {summary.totalItems} {isRTL ? (summary.totalItems === 1 ? "منتج" : "منتجات") : (summary.totalItems === 1 ? "product" : "products")} — {summary.totalQuantity} {isRTL ? "باب" : "doors"}
              </p>
            )}
          </div>
          {items.length > 0 && (
            <button
              onClick={() => {
                clearCart();
                toast.success(isRTL ? "تم إفراغ السلة" : "Cart cleared");
              }}
              className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {isRTL ? "إفراغ السلة" : "Clear Cart"}
            </button>
          )}
        </div>

        {items.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-28 h-28 rounded-full bg-[#E8DFD0] flex items-center justify-center mb-6">
              <Package className="w-14 h-14 text-[#C4956A]" />
            </div>
            <h2 className="text-2xl font-bold text-[#2C4A3E] mb-3">{isRTL ? "السلة فارغة" : "Your Cart is Empty"}</h2>
            <p className="text-gray-500 mb-8 max-w-sm">
              {isRTL
                ? "لم تضف أي منتجات بعد. تصفح كتالوجنا واختر الأبواب المناسبة لمشروعك."
                : "You haven't added any products yet. Browse our catalog and choose the right doors for your project."}
            </p>
            <Button className="bg-[#2C4A3E] hover:bg-[#1e3329] text-white px-8 py-3 text-base" asChild>
              <Link href="/products">{isRTL ? "تصفح المنتجات" : "Browse Products"}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Product List */}
            <div className="lg:col-span-2 space-y-4">
              {/* Savings Banner */}
              {summary.totalSavings > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <TrendingDown className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-green-800">
                      {isRTL
                        ? `وفّرت ${formatPrice(summary.totalSavings)} ر.س بفضل الأسعار المتدرجة!`
                        : `You saved ${formatPrice(summary.totalSavings)} SAR with tiered pricing!`}
                    </p>
                    <p className="text-sm text-green-600">
                      {isRTL
                        ? "كلما زادت الكمية، انخفض سعر الوحدة تلقائياً"
                        : "The more you order, the lower the unit price automatically"}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Product Cards */}
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <motion.div
                    key={item.product.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.25 }}
                    className="bg-white rounded-2xl border border-[#E8DFD0] shadow-sm overflow-hidden"
                  >
                    <div className="p-5">
                      <div className="flex gap-4">
                        {/* Image */}
                        <Link href={`/product/${item.product.id}`} onClick={() => {}}>
                          <div className="w-28 h-28 rounded-xl overflow-hidden flex-shrink-0 bg-[#F5F0E8] cursor-pointer">
                            <img
                              src={item.product.image}
                              alt={item.product.name}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        </Link>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <Link href={`/product/${item.product.id}`}>
                                <h3 className="font-bold text-[#2C4A3E] text-lg hover:text-[#C4956A] transition-colors cursor-pointer">
                                  {item.product.name}
                                </h3>
                              </Link>
                              <p className="text-sm text-gray-500">{item.product.woodType}</p>
                              {item.product.sku && (
                                <p className="text-xs text-gray-400 mt-0.5">SKU: {item.product.sku}</p>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                removeFromCart(item.cartItemKey);
                                toast.success(isRTL ? "تم حذف المنتج من السلة" : "Product removed from cart");
                              }}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>

                          {/* Tier Badge */}
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-1 bg-[#FDF6EE] border border-[#E8D5B7] rounded-full px-3 py-1">
                              <Tag className="w-3 h-3 text-[#C4956A]" />
                              <span className="text-xs text-[#C4956A] font-semibold">
                                {item.activeTierLabel}
                              </span>
                            </div>
                            {item.product.isCertified && (
                              <Badge variant="outline" className="text-xs border-[#2C4A3E] text-[#2C4A3E]">
                                <Shield className="w-3 h-3 ml-1" />
                                {isRTL ? "معتمد" : "Certified"}
                              </Badge>
                            )}
                          </div>

                          {/* Price & Quantity */}
                          <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
                            <div className="flex items-baseline gap-2">
                              {item.unitPrice < item.basePrice && (
                                <span className="text-sm text-gray-400 line-through">
                                  {formatPrice(item.basePrice)} {isRTL ? "ر.س" : "SAR"}
                                </span>
                              )}
                              <span className="text-2xl font-bold text-[#2C4A3E]">
                                {formatPrice(item.unitPrice)}
                              </span>
                              <span className="text-sm text-gray-500">{isRTL ? "ر.س / باب" : "SAR / door"}</span>
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">{isRTL ? "الكمية:" : "Qty:"}</span>
                              <div className="flex items-center gap-1 bg-[#F5F0E8] rounded-xl p-1">
                                <button
                                  onClick={() => updateQuantity(item.cartItemKey, item.quantity - 1)}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white transition-colors text-[#2C4A3E] font-bold"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const v = parseInt(e.target.value);
                                    if (!isNaN(v) && v > 0) updateQuantity(item.cartItemKey, v);
                                  }}
                                  className="w-12 text-center text-base font-bold text-[#2C4A3E] bg-transparent outline-none"
                                />
                                <button
                                  onClick={() => updateQuantity(item.cartItemKey, item.quantity + 1)}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white transition-colors text-[#2C4A3E] font-bold"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Line Total */}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1">
                              {item.savings > 0 && (
                                <span className="text-sm text-green-600 font-medium">
                                  {isRTL
                                    ? `وفّرت ${formatPrice(item.savings)} ر.س`
                                    : `Saved ${formatPrice(item.savings)} SAR`}
                                </span>
                              )}
                            </div>
                            <div className="text-lg font-bold text-[#C4956A]">
                              {formatPrice(item.unitPrice * item.quantity)} {isRTL ? "ر.س" : "SAR"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Next Tier Bar */}
                    <NextTierBar item={item} onUpdate={(key, qty) => updateQuantity(item.cartItemKey, qty)} isRTL={isRTL} />
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Tiered Pricing Table */}
              <div className="bg-white rounded-2xl border border-[#E8DFD0] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="w-5 h-5 text-[#C4956A]" />
                  <h3 className="font-bold text-[#2C4A3E]">{isRTL ? "نظام الأسعار المتدرجة" : "Tiered Pricing System"}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {isRTL
                    ? "كلما زادت كمية طلبك، انخفض سعر الوحدة تلقائياً. الأسعار تُحسب بناءً على إجمالي كمية كل منتج."
                    : "The more you order, the lower the unit price automatically. Prices are calculated based on the total quantity per product."}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {(isRTL ? [
                    { qty: "1 باب", label: "السعر الأساسي", color: "bg-gray-50 border-gray-200" },
                    { qty: "5+ أبواب", label: "خصم 15%", color: "bg-amber-50 border-amber-200" },
                    { qty: "10+ أبواب", label: "خصم 25%", color: "bg-green-50 border-green-200" },
                  ] : [
                    { qty: "1 door", label: "Base Price", color: "bg-gray-50 border-gray-200" },
                    { qty: "5+ doors", label: "15% Discount", color: "bg-amber-50 border-amber-200" },
                    { qty: "10+ doors", label: "25% Discount", color: "bg-green-50 border-green-200" },
                  ]).map((tier, i) => (
                    <div key={i} className={`${tier.color} border rounded-xl p-3 text-center`}>
                      <div className="font-bold text-[#2C4A3E] text-sm">{tier.qty}</div>
                      <div className="text-xs text-gray-600 mt-1">{tier.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                {/* Summary Card */}
                <div className="bg-white rounded-2xl border border-[#E8DFD0] shadow-sm p-6">
                  <h2 className="text-xl font-bold text-[#2C4A3E] mb-5">{isRTL ? "ملخص الطلب" : "Order Summary"}</h2>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{isRTL ? "المجموع الفرعي" : "Subtotal"}</span>
                      <span className="font-medium text-[#2C4A3E]">{formatPrice(summary.subtotal)} {isRTL ? "ر.س" : "SAR"}</span>
                    </div>
                    {summary.totalSavings > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">{isRTL ? "التوفير (أسعار متدرجة)" : "Savings (tiered pricing)"}</span>
                        <span className="font-medium text-green-600">- {formatPrice(summary.totalSavings)} {isRTL ? "ر.س" : "SAR"}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{isRTL ? "ضريبة القيمة المضافة (15%)" : "VAT (15%)"}</span>
                      <span className="font-medium text-[#2C4A3E]">{formatPrice(summary.vat)} {isRTL ? "ر.س" : "SAR"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{isRTL ? "الشحن" : "Shipping"}</span>
                      <span className="font-medium text-green-600">
                        {summary.subtotal >= 5000
                          ? (isRTL ? "مجاني" : "Free")
                          : (isRTL ? "يُحدد عند الطلب" : "Determined at checkout")}
                      </span>
                    </div>

                    <Separator className="bg-[#E8DFD0] my-1" />

                    <div className="flex justify-between">
                      <span className="font-bold text-[#2C4A3E] text-lg">{isRTL ? "الإجمالي" : "Total"}</span>
                      <span className="font-bold text-[#2C4A3E] text-xl">{formatPrice(summary.total)} {isRTL ? "ر.س" : "SAR"}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Button
                    className="w-full mt-6 bg-[#2C4A3E] hover:bg-[#1e3329] text-white font-bold py-4 text-base rounded-xl"
                    asChild
                  >
                    <Link href="/checkout">
                      {isRTL ? "إتمام الطلب" : "Proceed to Checkout"}
                      <ArrowLeft className="w-4 h-4 mr-2" />
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full mt-2 border-[#2C4A3E] text-[#2C4A3E] hover:bg-[#F5F0E8] rounded-xl"
                    asChild
                  >
                    <Link href="/products">{isRTL ? "متابعة التسوق" : "Continue Shopping"}</Link>
                  </Button>
                </div>

                {/* Order Benefits */}
                <div className="bg-white rounded-2xl border border-[#E8DFD0] p-5 space-y-4">
                  <h3 className="font-bold text-[#2C4A3E] text-sm">{isRTL ? "مزايا طلبك" : "Order Benefits"}</h3>
                  {(isRTL ? [
                    { icon: Truck, title: "شحن مجاني", desc: "للطلبات فوق 5,000 ر.س" },
                    { icon: Shield, title: "ضمان 15 سنة", desc: "على جميع منتجاتنا" },
                    { icon: Clock, title: "تسليم خلال 7-14 يوم", desc: "حسب الكمية والموقع" },
                  ] : [
                    { icon: Truck, title: "Free Shipping", desc: "On orders over 5,000 SAR" },
                    { icon: Shield, title: "15-Year Warranty", desc: "On all our products" },
                    { icon: Clock, title: "Delivery in 7-14 Days", desc: "Based on quantity and location" },
                  ]).map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#F5F0E8] flex items-center justify-center flex-shrink-0">
                        <feature.icon className="w-4 h-4 text-[#C4956A]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#2C4A3E]">{feature.title}</p>
                        <p className="text-xs text-gray-500">{feature.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* B2B Link */}
                <div className="bg-[#2C4A3E] rounded-2xl p-5 text-white">
                  <h3 className="font-bold mb-1">{isRTL ? "طلب كمية كبيرة؟" : "Ordering in Bulk?"}</h3>
                  <p className="text-sm text-[#A8C5B8] mb-3">
                    {isRTL ? "احصل على أسعار خاصة للمشاريع والشركات" : "Get special pricing for projects and businesses"}
                  </p>
                  <Button
                    variant="outline"
                    className="w-full border-white text-white hover:bg-white hover:text-[#2C4A3E] bg-transparent"
                    asChild
                  >
                    <Link href="/b2b">{isRTL ? "طلب عرض سعر خاص" : "Request Special Quote"}</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

/** Next Tier Progress Bar inside product card */
function NextTierBar({
  item,
  onUpdate,
  isRTL,
}: {
  item: ReturnType<typeof useCart>["items"][0];
  onUpdate: (id: string, qty: number) => void;
  isRTL: boolean;
}) {
  const tiers = [...item.product.tiers].sort((a, b) => a.min - b.min);
  const currentTierIdx = tiers.findIndex(
    (t) => item.quantity >= t.min && (t.max === null || item.quantity <= t.max)
  );
  const nextTier = tiers[currentTierIdx + 1];
  if (!nextTier) return null;

  const currentMin = tiers[currentTierIdx]?.min ?? 1;
  const needed = nextTier.min - item.quantity;
  const progress = Math.min(
    100,
    ((item.quantity - currentMin) / (nextTier.min - currentMin)) * 100
  );
  const saving = item.unitPrice - nextTier.price;

  return (
    <div className="px-5 pb-4 pt-2 bg-[#FDFAF6] border-t border-[#F0EBE0]">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-gray-600">
          {isRTL ? "أضف" : "Add"}{" "}
          <button
            onClick={() => onUpdate(item.product.id, nextTier.min)}
            className="font-bold text-[#C4956A] hover:underline"
          >
            {needed} {isRTL ? "باب" : "doors"}
          </button>{" "}
          {isRTL ? "للانتقال لشريحة" : "to reach"}{" "}
          <span className="font-semibold text-[#2C4A3E]">{nextTier.label}</span>
        </span>
        <span className="text-xs font-bold text-green-600">
          {isRTL
            ? `وفّر ${formatPrice(saving)} ر.س/باب`
            : `Save ${formatPrice(saving)} SAR/door`}
        </span>
      </div>
      <div className="w-full bg-[#E8DFD0] rounded-full h-2">
        <motion.div
          className="bg-gradient-to-l from-[#C4956A] to-[#D4A574] h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(4, progress)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-400">{currentMin} {isRTL ? "باب" : "doors"}</span>
        <span className="text-xs text-gray-400">{nextTier.min} {isRTL ? "باب" : "doors"}</span>
      </div>
    </div>
  );
}
