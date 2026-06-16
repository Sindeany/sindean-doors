// ============================================================
// Distributor Products Page - Sindian Doors
// Design: Architectural Luxury | Distributor-exclusive pricing catalog
// ============================================================

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useDistributorAuth } from "@/contexts/DistributorAuthContext";
import DistributorLayout from "@/components/distributor/DistributorLayout";
import { allProducts, Product, PriceTier } from "@/lib/productsData";
import { Search, ShoppingCart, Tag, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export default function DistributorProducts() {
  const { distributor, isLoading: authLoading } = useDistributorAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState<{ id: number; qty: number }[]>([]);
  const { dir } = useLanguage();

  useEffect(() => {
    if (!authLoading && !distributor) {
      navigate("/distributor");
    }
  }, [distributor, authLoading, navigate]);

  if (authLoading || !distributor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-oak" />
      </div>
    );
  }

  const discountRate = distributor.discount / 100;

  const categories = dir === "rtl" ? [
    { value: "all", label: "الكل" },
    { value: "interior", label: "أبواب داخلية" },
    { value: "exterior", label: "أبواب خارجية" },
    { value: "fire-rated", label: "مقاومة للحريق" },
    { value: "soundproof", label: "عازلة للصوت" },
    { value: "accessories", label: "مستلزمات" },
  ] : [
    { value: "all", label: "All" },
    { value: "interior", label: "Interior Doors" },
    { value: "exterior", label: "Exterior Doors" },
    { value: "fire-rated", label: "Fire-Rated" },
    { value: "soundproof", label: "Soundproof" },
    { value: "accessories", label: "Accessories" },
  ];

  const filtered = allProducts.filter((p: Product) => {
    const matchSearch = p.name.includes(search) || p.description?.includes(search);
    const matchCat = category === "all" || p.category === category;
    return matchSearch && matchCat;
  });

  const addToCart = (id: number) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === id);
      if (existing) return prev.map((c) => (c.id === id ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { id, qty: 1 }];
    });
    toast.success(dir === "rtl" ? "تمت الإضافة إلى قائمة الطلب" : "Added to order list");
  };

  const cartTotal = cart.reduce((sum, item) => {
    const product = allProducts.find((p: Product) => Number(p.id) === item.id);
    if (!product) return sum;
    const basePrice = product.tiers[0].price;
    const discountedPrice = basePrice * (1 - discountRate);
    return sum + discountedPrice * item.qty;
  }, 0);

  const tierLabel = distributor.tier === "gold"
    ? (dir === "rtl" ? "ذهبي" : "Gold")
    : distributor.tier;

  return (
    <DistributorLayout
      title={dir === "rtl" ? "كتالوج المنتجات" : "Product Catalog"}
      subtitle={dir === "rtl" ? `أسعار حصرية بخصم ${distributor.discount}%` : `Exclusive prices with ${distributor.discount}% discount`}
    >
      <div className="space-y-5" style={{ fontFamily: "IBM Plex Sans Arabic, sans-serif" }}>

        {/* Discount banner */}
        <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: "oklch(0.97 0.02 60)" }}>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "oklch(0.68 0.10 60 / 0.2)" }}
          >
            <Tag className="w-5 h-5" style={{ color: "oklch(0.68 0.10 60)" }} />
          </div>
          <div>
            <div className="font-bold text-sm" style={{ color: "oklch(0.35 0.06 60)" }}>
              {dir === "rtl"
                ? `أسعار موزع ${tierLabel} - خصم ${distributor.discount}%`
                : `${tierLabel} Distributor Prices - ${distributor.discount}% Discount`}
            </div>
            <div className="text-xs" style={{ color: "oklch(0.50 0.05 60)" }}>
              {dir === "rtl"
                ? "الأسعار المعروضة تشمل خصمك الحصري. الأسعار المتدرجة تُطبَّق على الأسعار بعد الخصم."
                : "Displayed prices include your exclusive discount. Tiered prices apply after discount."}
            </div>
          </div>
          <div className={`${dir === "rtl" ? "mr-auto" : "ml-auto"} flex-shrink-0`}>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              style={{ borderColor: "oklch(0.68 0.10 60)", color: "oklch(0.50 0.06 60)" }}
              onClick={() => toast.info(dir === "rtl" ? "تفاصيل مستويات الخصم - قريباً" : "Discount tier details - coming soon")}
            >
              <Info className="w-3.5 h-3.5" />
              {dir === "rtl" ? "تفاصيل الخصم" : "Discount Details"}
            </Button>
          </div>
        </div>

        {/* Search + filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
            <Input
              placeholder={dir === "rtl" ? "بحث في المنتجات..." : "Search products..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={dir === "rtl" ? "pr-9 text-sm" : "pl-9 text-sm"}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setCategory(value)}
                className="px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all flex-shrink-0"
                style={
                  category === value
                    ? { background: "oklch(0.38 0.06 160)", color: "white" }
                    : { background: "white", color: "oklch(0.45 0.03 160)", border: "1px solid #e5e7eb" }
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Cart summary (if items) */}
        {cart.length > 0 && (
          <div
            className="rounded-2xl p-4 flex items-center justify-between"
            style={{ background: "oklch(0.96 0.01 160)", border: "1px solid oklch(0.38 0.06 160 / 0.2)" }}
          >
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-5 h-5" style={{ color: "oklch(0.38 0.06 160)" }} />
              <div>
                <div className="text-sm font-bold" style={{ color: "oklch(0.25 0.04 160)" }}>
                  {cart.reduce((s, c) => s + c.qty, 0)} {dir === "rtl" ? "منتج في قائمة الطلب" : "product(s) in order list"}
                </div>
                <div className="text-xs text-gray-500">
                  {dir === "rtl" ? "الإجمالي:" : "Total:"} {cartTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} {dir === "rtl" ? "ر.س" : "SAR"}
                </div>
              </div>
            </div>
            <Button
              size="sm"
              style={{ background: "oklch(0.38 0.06 160)", color: "white" }}
              onClick={() => {
                toast.success(dir === "rtl" ? "تم إرسال قائمة الطلب بنجاح!" : "Order list sent successfully!");
                setCart([]);
              }}
            >
              {dir === "rtl" ? "إرسال الطلب" : "Send Order"}
            </Button>
          </div>
        )}

        {/* Products grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product: Product) => {
            const basePrice = product.tiers[0].price;
            const distributorPrice = basePrice * (1 - discountRate);
            const cartItem = cart.find((c: { id: number; qty: number }) => c.id === Number(product.id));

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all"
              >
                {/* Product image */}
                <div className="relative h-44 overflow-hidden">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  <div
                    className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-bold"
                    style={{ background: "oklch(0.68 0.10 60)", color: "white" }}
                  >
                    {dir === "rtl" ? `خصم ${distributor.discount}%` : `${distributor.discount}% off`}
                  </div>
                  {cartItem && (
                    <div
                      className="absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: "oklch(0.38 0.06 160)" }}
                    >
                      {cartItem.qty}
                    </div>
                  )}
                </div>

                {/* Product info */}
                <div className="p-4">
                  <h3 className="font-bold text-sm mb-1 leading-snug" style={{ color: "oklch(0.25 0.04 160)" }}>
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-400 mb-3 line-clamp-2">{product.description}</p>

                  {/* Pricing */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-lg font-bold" style={{ color: "oklch(0.38 0.06 160)", fontFamily: "DM Serif Display, serif" }}>
                        {distributorPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })} {dir === "rtl" ? "ر.س" : "SAR"}
                      </div>
                      <div className="text-xs text-gray-400 line-through">
                        {basePrice.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}
                      </div>
                    </div>
                    <div className={dir === "rtl" ? "text-right" : "text-left"}>
                      <div className="text-xs text-gray-400">10+ {dir === "rtl" ? "وحدات" : "units"}</div>
                      <div className="text-sm font-bold" style={{ color: "oklch(0.68 0.10 60)" }}>
                        {(product.tiers[product.tiers.length - 1].price * (1 - discountRate)).toLocaleString(undefined, { maximumFractionDigits: 0 })} {dir === "rtl" ? "ر.س" : "SAR"}
                      </div>
                    </div>
                  </div>

                  {/* Price tiers mini */}
                  <div className="flex gap-1 mb-3 overflow-x-auto">
                    {product.tiers.map((tier: PriceTier, i: number) => (
                      <div
                        key={i}
                        className="flex-shrink-0 text-center px-2 py-1 rounded-lg text-xs"
                        style={{ background: "oklch(0.97 0.01 160)" }}
                      >
                        <div className="text-gray-400">{tier.min}+</div>
                        <div className="font-bold" style={{ color: "oklch(0.38 0.06 160)" }}>
                          {(tier.price * (1 - discountRate)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    size="sm"
                    className="w-full gap-1.5 text-sm"
                    style={{ background: "oklch(0.38 0.06 160)", color: "white" }}
                    onClick={() => addToCart(Number(product.id))}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    {cartItem
                      ? (dir === "rtl" ? `إضافة مزيد (${cartItem.qty})` : `Add More (${cartItem.qty})`)
                      : (dir === "rtl" ? "إضافة للطلب" : "Add to Order")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{dir === "rtl" ? "لا توجد منتجات تطابق البحث" : "No products match your search"}</p>
          </div>
        )}
      </div>
    </DistributorLayout>
  );
}
