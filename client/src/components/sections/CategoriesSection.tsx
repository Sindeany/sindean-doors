/**
 * Design: Architectural Luxury - Warm Minimalism
 * Categories: Elegant grid showcasing door categories with hover effects
 * Bilingual: uses useLanguage() for AR/EN
 */
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const categoryImages = [
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=800&fit=crop&q=80",
  "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=600&h=800&fit=crop&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=800&fit=crop",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&h=800&fit=crop",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&h=400&fit=crop&q=80",
];

export default function CategoriesSection() {
  const { t, dir } = useLanguage();
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  const categories = [
    { titleKey: "cat.interior", descKey: "cat.interior.desc", image: categoryImages[0], count: dir === "rtl" ? "48 منتج" : "48 Products" },
    { titleKey: "cat.exterior", descKey: "cat.exterior.desc", image: categoryImages[1], count: dir === "rtl" ? "32 منتج" : "32 Products" },
    { titleKey: "cat.fire", descKey: "cat.fire.desc", image: categoryImages[2], count: dir === "rtl" ? "18 منتج" : "18 Products" },
    { titleKey: "cat.acoustic", descKey: "cat.acoustic.desc", image: categoryImages[3], count: dir === "rtl" ? "24 منتج" : "24 Products" },
    { titleKey: "cat.accessories", descKey: "cat.accessories.desc", image: categoryImages[4], count: dir === "rtl" ? "120 منتج" : "120 Products" },
  ];

  return (
    <section className="py-20 lg:py-28 bg-warm-white">
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
              {dir === "rtl" ? "تشكيلتنا" : "Our Collection"}
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl lg:text-4xl xl:text-5xl font-bold text-wood-dark leading-tight"
            >
              {t("cat.title")}
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-base lg:text-lg max-w-md"
          >
            {t("cat.subtitle")}
          </motion.p>
        </div>

        {/* Categories grid - asymmetric */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* First large card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="md:col-span-2 lg:col-span-1 lg:row-span-2 group cursor-pointer"
            onClick={() => toast(dir === "rtl" ? "صفحة التصنيف قريباً" : "Category page coming soon")}
          >
            <div className="relative h-full min-h-[400px] lg:min-h-full rounded-sm overflow-hidden">
              <img
                src={categories[0].image}
                alt={t(categories[0].titleKey)}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 right-0 left-0 p-8">
                <span className="text-copper text-sm font-medium">{categories[0].count}</span>
                <h3 className="text-2xl lg:text-3xl font-bold text-white mt-2 mb-2">
                  {t(categories[0].titleKey)}
                </h3>
                <p className="text-white/70 text-sm mb-4">{t(categories[0].descKey)}</p>
                <div className="flex items-center gap-2 text-copper text-sm font-medium group-hover:gap-3 transition-all">
                  <span>{t("cat.browse")}</span>
                  <Arrow className="w-4 h-4" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Remaining cards */}
          {categories.slice(1).map((cat, i) => (
            <motion.div
              key={cat.titleKey}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 * (i + 1) }}
              className="group cursor-pointer"
              onClick={() => toast(dir === "rtl" ? "صفحة التصنيف قريباً" : "Category page coming soon")}
            >
              <div className="relative h-[240px] rounded-sm overflow-hidden">
                <img
                  src={cat.image}
                  alt={t(cat.titleKey)}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 right-0 left-0 p-6">
                  <span className="text-copper text-xs font-medium">{cat.count}</span>
                  <h3 className="text-xl font-bold text-white mt-1 mb-1">{t(cat.titleKey)}</h3>
                  <p className="text-white/60 text-sm">{t(cat.descKey)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
