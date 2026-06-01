/**
 * Design: Architectural Luxury - Warm Minimalism
 * Pricing Explainer: Visual explanation of tiered pricing system
 */
import { motion } from "framer-motion";
import { TrendingDown, Package, Building2, Warehouse } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PricingExplainer() {
  const { dir } = useLanguage();

  const tiers = dir === "rtl" ? [
    {
      icon: Package,
      range: "1-4 أبواب",
      discount: "سعر التجزئة",
      example: "1,200 ر.س / باب",
      color: "bg-beige",
      textColor: "text-wood-dark",
      description: "مثالي للأفراد وتجديد المنازل",
      highlight: false,
    },
    {
      icon: Building2,
      range: "5-9 أبواب",
      discount: "خصم 18%",
      example: "980 ر.س / باب",
      color: "bg-oak/10",
      textColor: "text-oak",
      description: "مثالي للشقق والمشاريع الصغيرة",
      highlight: false,
    },
    {
      icon: Warehouse,
      range: "10+ أبواب",
      discount: "خصم 29%",
      example: "850 ر.س / باب",
      color: "bg-oak",
      textColor: "text-white",
      description: "مثالي للمشاريع الكبرى والموزعين",
      highlight: true,
    },
  ] : [
    {
      icon: Package,
      range: "1-4 Doors",
      discount: "Retail Price",
      example: "1,200 SAR / door",
      color: "bg-beige",
      textColor: "text-wood-dark",
      description: "Ideal for individuals and home renovations",
      highlight: false,
    },
    {
      icon: Building2,
      range: "5-9 Doors",
      discount: "18% Discount",
      example: "980 SAR / door",
      color: "bg-oak/10",
      textColor: "text-oak",
      description: "Ideal for apartments and small projects",
      highlight: false,
    },
    {
      icon: Warehouse,
      range: "10+ Doors",
      discount: "29% Discount",
      example: "850 SAR / door",
      color: "bg-oak",
      textColor: "text-white",
      description: "Ideal for large projects and distributors",
      highlight: true,
    },
  ];

  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="container">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-copper text-sm font-semibold tracking-wider mb-3 block"
          >
            {dir === "rtl" ? "نظام التسعير" : "Pricing System"}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl lg:text-4xl xl:text-5xl font-bold text-wood-dark leading-tight mb-4"
          >
            {dir === "rtl" ? (
              <>كلما زادت الكمية<br /><span className="text-oak">انخفض السعر</span></>
            ) : (
              <>The More You Order<br /><span className="text-oak">The Lower the Price</span></>
            )}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-base lg:text-lg"
          >
            {dir === "rtl"
              ? "نظام أسعار شفاف ومتدرج يناسب جميع العملاء من الأفراد إلى المشاريع الكبرى"
              : "A transparent tiered pricing system suitable for all customers, from individuals to large projects"}
          </motion.p>
        </div>

        {/* Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.range}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className={`relative rounded-sm p-8 text-center ${tier.color} ${
                tier.highlight ? "ring-2 ring-copper shadow-lg scale-105" : "border border-border/30"
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-copper text-white text-xs font-semibold px-4 py-1 rounded-full">
                  {dir === "rtl" ? "الأكثر توفيراً" : "Best Value"}
                </div>
              )}
              <tier.icon
                className={`w-10 h-10 mx-auto mb-4 ${
                  tier.highlight ? "text-copper" : "text-oak"
                }`}
              />
              <h3
                className={`text-xl font-bold mb-2 ${tier.textColor}`}
              >
                {tier.range}
              </h3>
              <div
                className={`text-3xl font-bold mb-1 ${
                  tier.highlight ? "text-copper" : "text-oak"
                }`}
              >
                {tier.discount}
              </div>
              <p
                className={`text-sm mb-4 ${
                  tier.highlight ? "text-white/70" : "text-muted-foreground"
                }`}
              >
                {dir === "rtl" ? "مثال:" : "Example:"} {tier.example}
              </p>
              <p
                className={`text-xs ${
                  tier.highlight ? "text-white/60" : "text-muted-foreground"
                }`}
              >
                {tier.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Visual arrow/flow */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex items-center justify-center gap-3 mt-10 text-muted-foreground"
        >
          <TrendingDown className="w-5 h-5 text-oak" />
          <span className="text-sm">
            {dir === "rtl"
              ? "كلما زادت الكمية، حصلت على سعر أفضل لكل باب"
              : "The more you order, the better price you get per door"}
          </span>
        </motion.div>
      </div>
    </section>
  );
}
