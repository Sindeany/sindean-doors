/**
 * Design: Architectural Luxury - Warm Minimalism
 * Hero: Full-width asymmetric layout with large door image, elegant typography
 * Dark image background → white/light text
 * Bilingual: uses useLanguage() for AR/EN
 */
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

const HERO_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/hero-door-XRVFQ3nypbQtd5qxWnjggQ.webp";

export default function HeroSection() {
  const { t, dir } = useLanguage();
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <section className="relative min-h-[90vh] lg:min-h-screen overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={HERO_IMAGE}
          alt={t("hero.title1")}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-black/70 via-black/40 to-black/20" />
      </div>

      {/* Content */}
      <div className="relative container flex items-center min-h-[90vh] lg:min-h-screen py-20">
        <div className="max-w-2xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-copper animate-pulse" />
            <span className="text-white/90 text-sm font-medium">
              {t("hero.badge")}
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.15] mb-6"
          >
            {t("hero.title1")}
            <br />
            <span className="text-copper">{t("hero.title2")}</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="text-white/80 text-lg lg:text-xl leading-relaxed mb-10 max-w-lg"
          >
            {t("hero.subtitle")}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8 }}
            className="flex flex-wrap gap-4"
          >
            <Link href="/products">
              <Button
                size="lg"
                className="bg-copper hover:bg-copper/90 text-white gap-2 text-base px-8 py-6 rounded-sm"
              >
                {t("hero.cta.browse")}
                <Arrow className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/b2b">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 gap-2 text-base px-8 py-6 rounded-sm bg-transparent"
              >
                {t("hero.cta.rfq")}
              </Button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="flex gap-8 mt-14 pt-8 border-t border-white/15"
          >
            {[
              { value: "+25", labelKey: "hero.stat.years" },
              { value: "+10K", labelKey: "hero.stat.doors" },
              { value: "+500", labelKey: "hero.stat.projects" },
            ].map((stat) => (
              <div key={stat.labelKey}>
                <div className="text-2xl lg:text-3xl font-bold text-copper">
                  {stat.value}
                </div>
                <div className="text-white/60 text-sm mt-1">{t(stat.labelKey)}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-white/40 text-xs tracking-widest">{t("hero.scrollDown") || "Scroll"}</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-5 h-8 border-2 border-white/30 rounded-full flex justify-center pt-1"
        >
          <div className="w-1 h-2 bg-copper rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
}
