/**
 * CartDrawer - درج سلة المشتريات المنبثق
 * Design: Architectural Luxury — Oak Green #2C4A3E, Copper #C4956A
 * Shows cart items with tiered pricing badges, quantity controls, savings display
 */

import { useCart } from "@/contexts/CartContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  Tag,
  TrendingDown,
  Package,
} from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

function formatPrice(price: number, lang: string) {
  return price.toLocaleString(lang === "ar" ? "ar-SA" : "en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function CartDrawer() {
  const { items, summary, isOpen, closeCart, removeFromCart, updateQuantity } = useCart();
  const { dir, lang } = useLanguage();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent
        side="left"
        className="w-full sm:w-[480px] p-0 flex flex-col bg-[#FAF8F5]"
        style={{ direction: dir }}
      >
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b border-[#E8DFD0] bg-white">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-3 text-[#2C4A3E] font-bold text-xl">
              <ShoppingCart className="w-6 h-6 text-[#C4956A]" />
              {dir === "rtl" ? "سلة المشتريات" : "Shopping Cart"}
              {summary.totalItems > 0 && (
                <Badge className="bg-[#C4956A] text-white text-xs px-2 py-0.5 rounded-full">
                  {summary.totalItems}
                </Badge>
              )}
            </SheetTitle>
          </div>
          {summary.totalSavings > 0 && (
            <div className="flex items-center gap-2 mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <TrendingDown className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700 font-medium">
                {dir === "rtl"
                  ? <>وفّرت <span className="font-bold">{formatPrice(summary.totalSavings, lang)} ر.س</span> بفضل الأسعار المتدرجة</>
                  : <>You saved <span className="font-bold">{formatPrice(summary.totalSavings, lang)} SAR</span> with tiered pricing</>
                }
              </p>
            </div>
          )}
        </SheetHeader>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <AnimatePresence mode="popLayout">
            {items.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-64 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-[#E8DFD0] flex items-center justify-center mb-4">
                  <Package className="w-10 h-10 text-[#C4956A]" />
                </div>
                <h3 className="text-lg font-semibold text-[#2C4A3E] mb-2">
                  {dir === "rtl" ? "السلة فارغة" : "Cart is Empty"}
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  {dir === "rtl" ? "أضف منتجات من كتالوجنا لتبدأ طلبك" : "Add products from our catalog to start your order"}
                </p>
                <Button
                  onClick={closeCart}
                  className="bg-[#2C4A3E] hover:bg-[#1e3329] text-white"
                  asChild
                >
                  <Link href="/products">
                    {dir === "rtl" ? "تصفح المنتجات" : "Browse Products"}
                  </Link>
                </Button>
              </motion.div>
            ) : (
              items.map((item) => (
                <motion.div
                  key={item.cartItemKey}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-xl border border-[#E8DFD0] p-4 shadow-sm"
                >
                  <div className="flex gap-3">
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-[#F5F0E8]">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-[#2C4A3E] text-sm leading-tight line-clamp-2">
                            {item.product.name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5">{item.product.woodType}</p>
                          {/* Selected options summary */}
                          {Object.keys(item.selectedOptions).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {Object.entries(item.selectedOptions).map(([optId, valId]) => {
                                const opt = item.product.options?.find(o => o.id === optId);
                                const val = opt?.values.find(v => v.id === valId);
                                if (!val) return null;
                                return (
                                  <span
                                    key={optId}
                                    className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
                                    style={{ background: 'rgba(196,149,106,0.12)', color: '#8B5E3C' }}
                                  >
                                    {val.hex && (
                                      <span
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ background: val.hex, border: '1px solid rgba(0,0,0,0.15)' }}
                                      />
                                    )}
                                    {dir === 'rtl' ? val.label : (val.labelEn ?? val.label)}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.cartItemKey)}
                          className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {item.quantity > 1 && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <Tag className="w-3 h-3 text-[#C4956A]" />
                          <span className="text-xs text-[#C4956A] font-medium">
                            {item.activeTierLabel}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          {item.unitPrice < item.basePrice && (
                            <span className="text-xs text-gray-400 line-through">
                              {formatPrice(item.basePrice, lang)}
                            </span>
                          )}
                          <span className="text-base font-bold text-[#2C4A3E]">
                            {formatPrice(item.unitPrice, lang)}
                          </span>
                          <span className="text-xs text-gray-500">{dir === "rtl" ? "ر.س/باب" : "SAR/door"}</span>
                        </div>

                        <div className="flex items-center gap-1 bg-[#F5F0E8] rounded-lg p-0.5">
                          <button
                            onClick={() => updateQuantity(item.cartItemKey, item.quantity - 1)}
                            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white transition-colors text-[#2C4A3E]"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-bold text-[#2C4A3E]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.cartItemKey, item.quantity + 1)}
                            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white transition-colors text-[#2C4A3E]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-gray-500">
                          {dir === "rtl" ? "الإجمالي:" : "Total:"}
                        </span>
                        <span className="text-sm font-bold text-[#C4956A]">
                          {formatPrice(item.unitPrice * item.quantity, lang)} {dir === "rtl" ? "ر.س" : "SAR"}
                        </span>
                      </div>

                      {item.savings > 0 && (
                        <div className="mt-1 text-xs text-green-600 font-medium">
                          {dir === "rtl"
                            ? `وفّرت ${formatPrice(item.savings, lang)} ر.س`
                            : `Saved ${formatPrice(item.savings, lang)} SAR`}
                        </div>
                      )}
                    </div>
                  </div>

                  <NextTierProgress item={item} />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-[#E8DFD0] bg-white px-6 py-5 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>
                  {dir === "rtl"
                    ? `المجموع الفرعي (${summary.totalQuantity} باب)`
                    : `Subtotal (${summary.totalQuantity} door${summary.totalQuantity !== 1 ? "s" : ""})`}
                </span>
                <span>{formatPrice(summary.subtotal, lang)} {dir === "rtl" ? "ر.س" : "SAR"}</span>
              </div>
              {summary.totalSavings > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>{dir === "rtl" ? "التوفير (أسعار متدرجة)" : "Savings (tiered pricing)"}</span>
                  <span>- {formatPrice(summary.totalSavings, lang)} {dir === "rtl" ? "ر.س" : "SAR"}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600">
                <span>{dir === "rtl" ? "ضريبة القيمة المضافة (15%)" : "VAT (15%)"}</span>
                <span>{formatPrice(summary.vat, lang)} {dir === "rtl" ? "ر.س" : "SAR"}</span>
              </div>
              <Separator className="bg-[#E8DFD0]" />
              <div className="flex justify-between font-bold text-[#2C4A3E] text-lg">
                <span>{dir === "rtl" ? "الإجمالي" : "Total"}</span>
                <span>{formatPrice(summary.total, lang)} {dir === "rtl" ? "ر.س" : "SAR"}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                className="w-full bg-[#2C4A3E] hover:bg-[#1e3329] text-white font-bold py-3 text-base"
                onClick={closeCart}
                asChild
              >
                <Link href="/checkout">
                  {dir === "rtl" ? "إتمام الطلب" : "Proceed to Checkout"}
                  <ArrowLeft className="w-4 h-4 mr-2" />
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full border-[#2C4A3E] text-[#2C4A3E] hover:bg-[#F5F0E8]"
                onClick={closeCart}
                asChild
              >
                <Link href="/products">
                  {dir === "rtl" ? "متابعة التسوق" : "Continue Shopping"}
                </Link>
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function NextTierProgress({ item }: { item: ReturnType<typeof useCart>["items"][0] }) {
  const { dir, lang } = useLanguage();
  const tiers = [...item.product.tiers].sort((a, b) => a.min - b.min);
  const currentTierIdx = tiers.findIndex(
    (t) => item.quantity >= t.min && (t.max === null || item.quantity <= t.max)
  );
  const nextTier = tiers[currentTierIdx + 1];

  if (!nextTier) return null;

  const needed = nextTier.min - item.quantity;
  const progress = ((item.quantity - tiers[currentTierIdx]?.min) /
    (nextTier.min - (tiers[currentTierIdx]?.min ?? 0))) * 100;
  const saving = item.unitPrice - nextTier.price;

  return (
    <div className="mt-3 pt-3 border-t border-[#F0EBE0]">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-gray-500">
          {dir === "rtl"
            ? <> أضف <span className="font-bold text-[#C4956A]">{needed} باب</span> للحصول على سعر أفضل</>
            : <> Add <span className="font-bold text-[#C4956A]">{needed} door{needed !== 1 ? "s" : ""}</span> for a better price</>
          }
        </span>
        <span className="text-xs text-green-600 font-medium">
          {dir === "rtl"
            ? `وفّر ${saving} ر.س/باب`
            : `Save ${saving} SAR/door`}
        </span>
      </div>
      <div className="w-full bg-[#F0EBE0] rounded-full h-1.5">
        <div
          className="bg-[#C4956A] h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
        />
      </div>
    </div>
  );
}
