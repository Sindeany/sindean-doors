/**
 * Design: Architectural Luxury - Warm Minimalism
 * Featured Products: Showcase products with tiered pricing
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, ArrowLeft, Tag } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

const CLASSIC_DOOR =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/product-classic-door-BVsWk2zwi8AhwPnCA2bPST.webp";
const MODERN_DOOR =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/product-modern-door-ZUHyARH6878fCSEmyEDhqJ.webp";

interface PriceTier {
  min: number;
  max: number | null;
  price: number;
  label: string;
}

interface Product {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  categoryEn: string;
  image: string;
  tiers: PriceTier[];
  tiersEn: PriceTier[];
  badge?: string;
  badgeEn?: string;
  features: string[];
  featuresEn: string[];
}

const products: Product[] = [
  {
    id: "1",
    name: "باب كلاسيكي من خشب السنديان",
    nameEn: "Classic Oak Wood Door",
    category: "أبواب داخلية",
    categoryEn: "Interior Doors",
    image: CLASSIC_DOOR,
    badge: "الأكثر مبيعاً",
    badgeEn: "Best Seller",
    tiers: [
      { min: 1, max: 4, price: 1200, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 980, label: "5-9 أبواب" },
      { min: 10, max: null, price: 850, label: "10+ أبواب" },
    ],
    tiersEn: [
      { min: 1, max: 4, price: 1200, label: "1-4 Doors" },
      { min: 5, max: 9, price: 980, label: "5-9 Doors" },
      { min: 10, max: null, price: 850, label: "10+ Doors" },
    ],
    features: ["خشب سنديان طبيعي 100%", "مقاوم للرطوبة", "ضمان 10 سنوات"],
    featuresEn: ["100% Natural Oak Wood", "Moisture Resistant", "10-Year Warranty"],
  },
  {
    id: "2",
    name: "باب عصري بقشرة الجوز",
    nameEn: "Modern Walnut Veneer Door",
    category: "أبواب داخلية",
    categoryEn: "Interior Doors",
    image: MODERN_DOOR,
    badge: "جديد",
    badgeEn: "New",
    tiers: [
      { min: 1, max: 4, price: 1450, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 1180, label: "5-9 أبواب" },
      { min: 10, max: null, price: 1020, label: "10+ أبواب" },
    ],
    tiersEn: [
      { min: 1, max: 4, price: 1450, label: "1-4 Doors" },
      { min: 5, max: 9, price: 1180, label: "5-9 Doors" },
      { min: 10, max: null, price: 1020, label: "10+ Doors" },
    ],
    features: ["قشرة جوز طبيعية", "تصميم مينيمالست", "عزل صوتي محسّن"],
    featuresEn: ["Natural Walnut Veneer", "Minimalist Design", "Enhanced Sound Insulation"],
  },
  {
    id: "3",
    name: "باب رئيسي فاخر محفور",
    nameEn: "Luxury Carved Main Door",
    category: "أبواب خارجية",
    categoryEn: "Exterior Doors",
    image: CLASSIC_DOOR,
    tiers: [
      { min: 1, max: 4, price: 2800, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 2350, label: "5-9 أبواب" },
      { min: 10, max: null, price: 2100, label: "10+ أبواب" },
    ],
    tiersEn: [
      { min: 1, max: 4, price: 2800, label: "1-4 Doors" },
      { min: 5, max: 9, price: 2350, label: "5-9 Doors" },
      { min: 10, max: null, price: 2100, label: "10+ Doors" },
    ],
    features: ["نقش يدوي فاخر", "مقاوم للعوامل الجوية", "قفل أمان متعدد النقاط"],
    featuresEn: ["Luxury Hand Carving", "Weather Resistant", "Multi-Point Security Lock"],
  },
  {
    id: "4",
    name: "باب مقاوم للحريق 60 دقيقة",
    nameEn: "60-Minute Fire Rated Door",
    category: "أبواب مقاومة للحريق",
    categoryEn: "Fire Rated Doors",
    image: MODERN_DOOR,
    badge: "معتمد",
    badgeEn: "Certified",
    tiers: [
      { min: 1, max: 4, price: 1800, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 1500, label: "5-9 أبواب" },
      { min: 10, max: null, price: 1350, label: "10+ أبواب" },
    ],
    tiersEn: [
      { min: 1, max: 4, price: 1800, label: "1-4 Doors" },
      { min: 5, max: 9, price: 1500, label: "5-9 Doors" },
      { min: 10, max: null, price: 1350, label: "10+ Doors" },
    ],
    features: ["مقاوم للحريق 60 دقيقة", "شهادة UL معتمدة", "إغلاق ذاتي"],
    featuresEn: ["60-Minute Fire Resistance", "UL Certified", "Self-Closing"],
  },
];

function ProductCard({ product, index }: { product: Product; index: number }) {
  const [selectedTier, setSelectedTier] = useState(0);
  const { dir } = useLanguage();
  const savings = product.tiers[0].price - product.tiers[product.tiers.length - 1].price;
  const savingsPercent = Math.round((savings / product.tiers[0].price) * 100);
  const activeTiers = dir === "rtl" ? product.tiers : product.tiersEn;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="group bg-white rounded-sm border border-border/50 overflow-hidden hover:shadow-lg hover:shadow-oak/5 transition-all duration-500"
    >
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-beige-light">
        <img
          src={product.image}
          alt={dir === "rtl" ? product.name : product.nameEn}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {product.badge && (
          <Badge className="absolute top-4 right-4 bg-copper text-white border-0 rounded-sm px-3 py-1">
            {dir === "rtl" ? product.badge : product.badgeEn}
          </Badge>
        )}
        <div className="absolute top-4 left-4 bg-oak/90 text-white text-xs font-semibold px-3 py-1.5 rounded-sm">
          {dir === "rtl" ? `وفّر حتى ${savingsPercent}%` : `Save up to ${savingsPercent}%`}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <span className="text-copper text-xs font-medium tracking-wider">
          {dir === "rtl" ? product.category : product.categoryEn}
        </span>
        <h3 className="text-lg font-bold text-wood-dark mt-2 mb-4 leading-snug">
          {dir === "rtl" ? product.name : product.nameEn}
        </h3>

        {/* Tiered pricing */}
        <div className="space-y-2 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-oak" />
            <span className="text-sm font-semibold text-oak">
              {dir === "rtl" ? "أسعار متدرجة حسب الكمية" : "Tiered Pricing by Quantity"}
            </span>
          </div>
          {activeTiers.map((tier, i) => (
            <button
              key={i}
              onClick={() => setSelectedTier(i)}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-sm border text-sm transition-all ${
                selectedTier === i
                  ? "border-oak bg-oak/5 text-oak"
                  : "border-border/50 text-muted-foreground hover:border-oak/30"
              }`}
            >
              <span className="font-medium">{tier.label}</span>
              <span className="font-bold">
                {tier.price.toLocaleString("ar-SA")} {dir === "rtl" ? "ر.س" : "SAR"}
                <span className="text-xs font-normal text-muted-foreground mr-1">/ {dir === "rtl" ? "باب" : "door"}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Features */}
        <ul className="space-y-1.5 mb-5">
          {(dir === "rtl" ? product.features : product.featuresEn).map((f) => (
            <li key={f} className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-copper shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            className="flex-1 bg-oak hover:bg-oak-dark text-white rounded-sm gap-2"
            onClick={() => toast(dir === "rtl" ? "إضافة للسلة قريباً" : "Add to cart coming soon")}
          >
            <ShoppingCart className="w-4 h-4" />
            {dir === "rtl" ? "أضف للسلة" : "Add to Cart"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function FeaturedProducts() {
  const { dir } = useLanguage();

  return (
    <section className="py-20 lg:py-28 bg-beige-light">
      <div className="container">
        {/* Section header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-14">
          <div>
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-copper text-sm font-semibold tracking-wider mb-3 block"
            >
              {dir === "rtl" ? "منتجات مميزة" : "Featured Products"}
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl lg:text-4xl xl:text-5xl font-bold text-wood-dark leading-tight"
            >
              {dir === "rtl" ? "أبواب بأسعار متدرجة" : "Doors with Tiered Pricing"}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-muted-foreground mt-3 text-base lg:text-lg max-w-lg"
            >
              {dir === "rtl"
                ? "كلما زادت الكمية، انخفض السعر. أسعار خاصة للمشاريع والشركات"
                : "The more you order, the lower the price. Special rates for projects and businesses."}
            </motion.p>
          </div>
          <Link href="/products">
            <Button
              variant="outline"
              className="border-oak text-oak hover:bg-oak hover:text-white gap-2 rounded-sm self-start lg:self-auto"
            >
              {dir === "rtl" ? "عرض جميع المنتجات" : "View All Products"}
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>

        {/* Pricing note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 bg-white rounded-sm border border-border/50 p-6 lg:p-8 flex flex-col lg:flex-row items-start lg:items-center gap-6"
        >
          <div className="flex-1">
            <h3 className="text-lg font-bold text-wood-dark mb-2">
              {dir === "rtl"
                ? "تحتاج كمية أكبر؟ تواصل معنا للحصول على سعر خاص"
                : "Need a larger quantity? Contact us for a special price"}
            </h3>
            <p className="text-muted-foreground text-sm">
              {dir === "rtl"
                ? "نقدم أسعاراً تنافسية خاصة للمشاريع الكبرى والموزعين. أرسل لنا طلب عرض سعر وسنرد خلال 24 ساعة."
                : "We offer special competitive pricing for large projects and distributors. Send us an RFQ and we'll respond within 24 hours."}
            </p>
          </div>
          <Button
            className="bg-copper hover:bg-copper/90 text-white gap-2 rounded-sm px-8 shrink-0"
            onClick={() => toast(dir === "rtl" ? "طلب عرض سعر قريباً" : "RFQ coming soon")}
          >
            {dir === "rtl" ? "طلب عرض سعر مخصص" : "Request Custom Quote"}
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
