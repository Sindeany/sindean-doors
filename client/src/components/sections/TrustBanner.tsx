/**
 * Design: Architectural Luxury - Warm Minimalism
 * Trust Banner: Certifications and trust indicators
 * Bilingual: uses useLanguage()
 */
import { motion } from "framer-motion";
import { Shield, Award, Truck, Headphones, CreditCard, RotateCcw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function TrustBanner() {
  const { dir } = useLanguage();

  const trustItems = [
    { icon: Shield, label: dir === "rtl" ? "ضمان حتى 15 سنة" : "Up to 15-Year Warranty" },
    { icon: Award, label: dir === "rtl" ? "شهادات ISO معتمدة" : "ISO Certified" },
    { icon: Truck, label: dir === "rtl" ? "شحن لجميع المناطق" : "Nationwide Shipping" },
    { icon: Headphones, label: dir === "rtl" ? "دعم فني متخصص" : "Expert Technical Support" },
    { icon: CreditCard, label: dir === "rtl" ? "دفع آمن ومتعدد" : "Secure Multi-Payment" },
    { icon: RotateCcw, label: dir === "rtl" ? "سياسة إرجاع مرنة" : "Flexible Return Policy" },
  ];

  return (
    <section className="py-12 bg-beige border-y border-border/30">
      <div className="container">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          {trustItems.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="flex flex-col items-center text-center gap-2"
            >
              <item.icon className="w-6 h-6 text-oak" />
              <span className="text-xs font-medium text-foreground/70">{item.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
