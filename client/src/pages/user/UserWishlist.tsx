// ============================================================
// UserWishlist.tsx - Sindian Doors
// Wishlist page for retail customers
// Design: Architectural Luxury — deep oak green + warm beige
// Bilingual: Arabic RTL / English LTR
// ============================================================

import { Link } from "wouter";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { useCart } from "@/contexts/CartContext";
import { allProducts } from "@/lib/productsData";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Heart, ChevronLeft, ShoppingCart, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export default function UserWishlist() {
  const { user, wishlistIds, toggleWishlist } = useUserAuth();
  const { addToCart } = useCart();
  const { dir } = useLanguage();
  const isRTL = dir === "rtl";

  if (!user) return null;

  const wishlistProducts = allProducts.filter((p) => wishlistIds.includes(Number(p.id)));

  const handleAddToCart = (productId: string) => {
    const product = allProducts.find((p) => p.id === productId);
    if (!product) return;
    addToCart(product, 1);
    toast.success(isRTL ? "تمت إضافة المنتج إلى السلة" : "Product added to cart");
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5]" dir={dir}>
      <Navbar />
      <div className="container py-8 max-w-5xl mx-auto px-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6" style={{ color: "#6B7B75" }}>
          <Link href="/" className="hover:underline">{isRTL ? "الرئيسية" : "Home"}</Link>
          <ChevronLeft className="w-3 h-3" />
          <Link href="/account" className="hover:underline">{isRTL ? "حسابي" : "My Account"}</Link>
          <ChevronLeft className="w-3 h-3" />
          <span style={{ color: "#2C4A3E" }}>{isRTL ? "المفضلة" : "Wishlist"}</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#2C4A3E", fontFamily: "'DM Serif Display', serif" }}>
              {isRTL ? "قائمة المفضلة" : "Wishlist"}
            </h1>
            <p className="text-sm mt-1" style={{ color: "#6B7B75" }}>
              {wishlistProducts.length} {isRTL ? "منتج محفوظ" : "saved products"}
            </p>
          </div>
          {wishlistProducts.length > 0 && (
            <Button
              size="sm"
              className="rounded-xl text-xs gap-1.5"
              style={{ background: "#2C4A3E", color: "white" }}
              onClick={() => { wishlistProducts.forEach((p) => handleAddToCart(p.id)); }}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              {isRTL ? "إضافة الكل للسلة" : "Add All to Cart"}
            </Button>
          )}
        </div>

        {wishlistProducts.length === 0 ? (
          <div className="text-center py-20 rounded-2xl" style={{ background: "white", border: "1px solid #E8DFD0" }}>
            <Heart className="w-16 h-16 mx-auto mb-4" style={{ color: "#C8D5D0" }} />
            <h2 className="text-xl font-bold mb-2" style={{ color: "#2C4A3E" }}>
              {isRTL ? "قائمة المفضلة فارغة" : "Your Wishlist is Empty"}
            </h2>
            <p className="text-sm mb-6" style={{ color: "#6B7B75" }}>
              {isRTL ? "أضف المنتجات التي تعجبك لمتابعتها لاحقاً" : "Add products you like to follow them later"}
            </p>
            <Link href="/products">
              <Button className="rounded-xl gap-2" style={{ background: "#2C4A3E", color: "white" }}>
                <ArrowRight className="w-4 h-4" />
                {isRTL ? "تصفح المنتجات" : "Browse Products"}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {wishlistProducts.map((product) => (
              <div
                key={product.id}
                className="rounded-2xl overflow-hidden group"
                style={{ background: "white", border: "1px solid #E8DFD0" }}
              >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Link href={`/product/${product.id}`}>
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                    />
                  </Link>
                  {product.badge && (
                    <span
                      className="absolute top-3 right-3 text-xs px-2.5 py-1 rounded-full font-semibold text-white"
                      style={{ background: product.badgeColor === "copper" ? "#C4956A" : "#2C4A3E" }}
                    >
                      {product.badge}
                    </span>
                  )}
                  <button
                    onClick={() => toggleWishlist(Number(product.id))}
                    className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
                  >
                    <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                  </button>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="text-xs mb-1" style={{ color: "#6B7B75" }}>{product.woodType}</div>
                  <Link href={`/product/${product.id}`}>
                    <h3 className="font-bold text-sm mb-2 hover:underline cursor-pointer" style={{ color: "#2C4A3E" }}>
                      {product.name}
                    </h3>
                  </Link>

                  {/* Price tiers */}
                  <div className="space-y-1 mb-4">
                    {product.tiers.map((tier, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span style={{ color: "#6B7B75" }}>{tier.label}</span>
                        <span className="font-bold" style={{ color: i === 0 ? "#2C4A3E" : "#C4956A" }}>
                          {tier.price.toLocaleString()} {isRTL ? "ر.س" : "SAR"}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 rounded-xl text-xs gap-1.5"
                      style={{ background: "#2C4A3E", color: "white" }}
                      onClick={() => handleAddToCart(product.id)}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      {isRTL ? "أضف للسلة" : "Add to Cart"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs"
                      style={{ borderColor: "#E8DFD0", color: "#E05C5C" }}
                      onClick={() => toggleWishlist(Number(product.id))}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
