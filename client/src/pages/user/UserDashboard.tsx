// ============================================================
// UserDashboard.tsx - Sindian Doors
// Main account dashboard for retail customers
// Design: Architectural Luxury — deep oak green + warm beige
// ============================================================

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { mockOrders, orderStatusLabels, orderStatusColors } from "@/lib/userData";
import { allProducts } from "@/lib/productsData";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Package, Heart, Star, MapPin, LogOut, ChevronLeft,
  ShoppingBag, Clock, CheckCircle2, Truck, User, Bell, Settings,
  TrendingUp, Gift, Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export default function UserDashboard() {
  const { user, logout, wishlistIds } = useUserAuth();
  const [, navigate] = useLocation();
  const [activeSection] = useState("overview");
  const { dir } = useLanguage();

  if (!user) {
    navigate("/login");
    return null;
  }

  const handleLogout = () => {
    logout();
    toast.success(dir === "rtl" ? "تم تسجيل الخروج بنجاح" : "Logged out successfully");
    navigate("/");
  };

  const recentOrders = mockOrders.slice(0, 3);
  const wishlistProducts = allProducts.filter((p) => wishlistIds.includes(Number(p.id))).slice(0, 4);

  const navItems = [
    { id: "overview", label: dir === "rtl" ? "نظرة عامة" : "Overview", icon: TrendingUp, href: "/account" },
    { id: "orders", label: dir === "rtl" ? "طلباتي" : "My Orders", icon: Package, href: "/account/orders" },
    { id: "wishlist", label: dir === "rtl" ? "المفضلة" : "Wishlist", icon: Heart, href: "/account/wishlist" },
    { id: "addresses", label: dir === "rtl" ? "عناويني" : "My Addresses", icon: MapPin, href: "/account/addresses" },
    { id: "loyalty", label: dir === "rtl" ? "نقاط الولاء" : "Loyalty Points", icon: Gift, href: "/account/loyalty" },
    { id: "settings", label: dir === "rtl" ? "الإعدادات" : "Settings", icon: Settings, href: "/account/settings" },
  ];

  const stats = [
    { label: dir === "rtl" ? "إجمالي الطلبات" : "Total Orders", value: (user.totalOrders ?? 0) ?? 0, icon: ShoppingBag, color: "#2C4A3E" },
    { label: dir === "rtl" ? "إجمالي الإنفاق" : "Total Spent", value: `${((user.totalSpent ?? 0) ?? 0).toLocaleString()} ${dir === "rtl" ? "ر.س" : "SAR"}`, icon: TrendingUp, color: "#C4956A" },
    { label: dir === "rtl" ? "نقاط الولاء" : "Loyalty Points", value: ((user.loyaltyPoints ?? 0) ?? 0).toLocaleString(), icon: Star, color: "#7B5EA7" },
    { label: dir === "rtl" ? "المفضلة" : "Wishlist", value: wishlistIds.length, icon: Heart, color: "#E05C5C" },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5]" dir={dir}>
      <Navbar />

      <div className="container py-8 max-w-7xl mx-auto px-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6" style={{ color: "#6B7B75" }}>
          <Link href="/" className="hover:underline">{dir === "rtl" ? "الرئيسية" : "Home"}</Link>
          <ChevronLeft className="w-3 h-3" />
          <span style={{ color: "#2C4A3E" }}>{dir === "rtl" ? "حسابي" : "My Account"}</span>
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            {/* Profile card */}
            <div className="rounded-2xl p-6 mb-4 text-white" style={{ background: "linear-gradient(135deg, #2C4A3E, #1a2e27)" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: "#C4956A" }}>
                  {user.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-base">{user.name}</div>
                  <div className="text-xs opacity-70">{user.email}</div>
                  <div className="text-xs mt-0.5" style={{ color: "#C4956A" }}>
                    {dir === "rtl" ? `عضو منذ ${(user.joinDate ?? "")}` : `Member since ${(user.joinDate ?? "")}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(196,149,106,0.2)" }}>
                <div className="text-center">
                  <div className="font-bold text-lg">{(user.loyaltyPoints ?? 0).toLocaleString()}</div>
                  <div className="text-xs opacity-70">{dir === "rtl" ? "نقطة" : "Points"}</div>
                </div>
                <div className="w-px h-8 opacity-30" style={{ background: "white" }} />
                <div className="text-center">
                  <div className="font-bold text-lg">{(user.totalOrders ?? 0)}</div>
                  <div className="text-xs opacity-70">{dir === "rtl" ? "طلب" : "Orders"}</div>
                </div>
                <div className="w-px h-8 opacity-30" style={{ background: "white" }} />
                <div className="text-center">
                  <div className="font-bold text-lg">{wishlistIds.length}</div>
                  <div className="text-xs opacity-70">{dir === "rtl" ? "مفضلة" : "Wishlist"}</div>
                </div>
              </div>
            </div>

            {/* Nav */}
            <nav className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid #E8DFD0" }}>
              {navItems.map((item) => (
                <Link key={item.id} href={item.href}>
                  <div
                    className="flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-all hover:bg-[#F5F0E8]"
                    style={{
                      borderBottom: "1px solid #F0EBE3",
                      background: activeSection === item.id ? "#F5F0E8" : "transparent",
                      color: activeSection === item.id ? "#2C4A3E" : "#4A5568",
                    }}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" style={{ color: activeSection === item.id ? "#2C4A3E" : "#6B7B75" }} />
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.id === "orders" && (
                      <span className={`${dir === "rtl" ? "mr-auto" : "ml-auto"} text-xs font-bold px-2 py-0.5 rounded-full text-white`} style={{ background: "#2C4A3E" }}>
                        {(user.totalOrders ?? 0)}
                      </span>
                    )}
                    {item.id === "wishlist" && wishlistIds.length > 0 && (
                      <span className={`${dir === "rtl" ? "mr-auto" : "ml-auto"} text-xs font-bold px-2 py-0.5 rounded-full text-white`} style={{ background: "#E05C5C" }}>
                        {wishlistIds.length}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-red-500 hover:bg-red-50 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">{dir === "rtl" ? "تسجيل الخروج" : "Sign Out"}</span>
              </button>
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {/* Welcome banner */}
            <div className="rounded-2xl p-6 mb-6 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #2C4A3E, #3d6b5a)" }}>
              <div>
                <h1 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  {dir === "rtl" ? `مرحباً، ${user.name.split(" ")[0]}!` : `Welcome, ${user.name.split(" ")[0]}!`}
                </h1>
                <p className="text-sm opacity-80 text-white">
                  {dir === "rtl" ? "لديك طلب واحد في الطريق إليك" : "You have one order on its way to you"}
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/account/orders">
                  <Button size="sm" className="rounded-xl text-sm" style={{ background: "#C4956A", color: "white", border: "none" }}>
                    <Truck className={`w-4 h-4 ${dir === "rtl" ? "ml-1" : "mr-1"}`} />
                    {dir === "rtl" ? "تتبع الطلب" : "Track Order"}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {stats.map((s) => (
                <div key={s.label} className="rounded-2xl p-5" style={{ background: "white", border: "1px solid #E8DFD0" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${s.color}15` }}>
                    <s.icon className="w-5 h-5" style={{ color: s.color }} />
                  </div>
                  <div className="text-xl font-bold mb-0.5" style={{ color: "#2C4A3E" }}>{s.value}</div>
                  <div className="text-xs" style={{ color: "#6B7B75" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Recent orders */}
            <div className="rounded-2xl p-6 mb-6" style={{ background: "white", border: "1px solid #E8DFD0" }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold" style={{ color: "#2C4A3E" }}>
                  {dir === "rtl" ? "آخر الطلبات" : "Recent Orders"}
                </h2>
                <Link href="/account/orders">
                  <span className="text-sm font-medium cursor-pointer hover:underline" style={{ color: "#C4956A" }}>
                    {dir === "rtl" ? "عرض الكل" : "View All"}
                  </span>
                </Link>
              </div>
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <Link key={order.id} href={`/account/orders/${order.id}`}>
                    <div
                      className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all hover:shadow-sm"
                      style={{ background: "#FAF8F5", border: "1px solid #EDE8E0" }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#2C4A3E15" }}>
                        <Package className="w-5 h-5" style={{ color: "#2C4A3E" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm" style={{ color: "#2C4A3E" }}>{order.id}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${orderStatusColors[order.status]}`}>
                            {orderStatusLabels[order.status]}
                          </span>
                        </div>
                        <div className="text-xs" style={{ color: "#6B7B75" }}>
                          {order.items.length} {dir === "rtl" ? "منتج" : "items"} · {order.date}
                        </div>
                      </div>
                      <div className={`${dir === "rtl" ? "text-right" : "text-left"} flex-shrink-0`}>
                        <div className="font-bold text-sm" style={{ color: "#2C4A3E" }}>
                          {order.total.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}
                        </div>
                        <ChevronLeft className={`w-4 h-4 ${dir === "rtl" ? "mr-auto" : "ml-auto rotate-180"} mt-0.5`} style={{ color: "#6B7B75" }} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Wishlist preview */}
            {wishlistProducts.length > 0 && (
              <div className="rounded-2xl p-6 mb-6" style={{ background: "white", border: "1px solid #E8DFD0" }}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-bold" style={{ color: "#2C4A3E" }}>
                    {dir === "rtl" ? "المفضلة" : "Wishlist"}
                  </h2>
                  <Link href="/account/wishlist">
                    <span className="text-sm font-medium cursor-pointer hover:underline" style={{ color: "#C4956A" }}>
                      {dir === "rtl" ? `عرض الكل (${wishlistIds.length})` : `View All (${wishlistIds.length})`}
                    </span>
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {wishlistProducts.map((p) => (
                    <Link key={p.id} href={`/product/${p.id}`}>
                      <div className="rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-all" style={{ border: "1px solid #EDE8E0" }}>
                        <div className="aspect-square overflow-hidden">
                          <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                        </div>
                        <div className="p-2">
                          <div className="text-xs font-semibold truncate mb-0.5" style={{ color: "#2C4A3E" }}>{p.name}</div>
                          <div className="text-xs font-bold" style={{ color: "#C4956A" }}>
                            {p.tiers[0].price.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Loyalty points card */}
            <div className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg, #C4956A, #a87a52)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-5 h-5 text-white" />
                    <span className="text-white font-bold text-base">
                      {dir === "rtl" ? "نقاط الولاء" : "Loyalty Points"}
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{(user.loyaltyPoints ?? 0).toLocaleString()}</div>
                  <div className="text-sm text-white opacity-80">
                    {dir === "rtl" ? "نقطة متاحة للاستبدال" : "points available for redemption"}
                  </div>
                  <div className="text-xs text-white opacity-60 mt-1">
                    {dir === "rtl" ? "كل ١٠٠٠ نقطة = خصم ١٠٠ ر.س" : "Every 1000 points = SAR 100 discount"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full border-4 border-white border-opacity-30 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
                    <Star className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-xs text-white opacity-70 mt-2">
                    {dir === "rtl" ? "عضو ذهبي" : "Gold Member"}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white border-opacity-20">
                <div className="flex items-center justify-between text-sm text-white opacity-80">
                  <span>{dir === "rtl" ? "المستوى التالي: بلاتيني (٣٠٠٠ نقطة)" : "Next level: Platinum (3000 points)"}</span>
                  <span>{dir === "rtl" ? `${3000 - (user.loyaltyPoints ?? 0)} نقطة متبقية` : `${3000 - (user.loyaltyPoints ?? 0)} points remaining`}</span>
                </div>
                <div className="mt-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
                  <div
                    className="h-2 rounded-full"
                    style={{ background: "white", width: `${Math.min(((user.loyaltyPoints ?? 0) / 3000) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Support */}
            <div className="mt-4 rounded-2xl p-5 flex items-center gap-4" style={{ background: "#EDF3F0", border: "1px solid #C8DDD6" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#2C4A3E" }}>
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm mb-0.5" style={{ color: "#2C4A3E" }}>
                  {dir === "rtl" ? "هل تحتاج مساعدة؟" : "Need Help?"}
                </div>
                <div className="text-xs" style={{ color: "#6B7B75" }}>
                  {dir === "rtl" ? "فريق الدعم متاح من الأحد إلى الخميس ٨ص - ٦م" : "Support team available Sunday to Thursday 8am - 6pm"}
                </div>
              </div>
              <a href="tel:920000000">
                <Button size="sm" className="rounded-xl text-xs" style={{ background: "#2C4A3E", color: "white" }}>
                  {dir === "rtl" ? "اتصل بنا" : "Call Us"}
                </Button>
              </a>
            </div>
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
