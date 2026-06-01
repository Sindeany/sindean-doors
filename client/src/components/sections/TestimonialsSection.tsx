/**
 * Design: Architectural Luxury - Warm Minimalism
 * Testimonials: Client reviews with elegant card design
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const testimonialsAr = [
  {
    id: 1,
    name: "م. خالد العتيبي",
    role: "مدير مشاريع - شركة الإعمار",
    text: "تعاملنا مع سنديان في أكثر من 15 مشروع سكني وتجاري. جودة الأبواب ممتازة والالتزام بالمواعيد يميزهم عن غيرهم. نظام الأسعار المتدرجة وفّر لنا الكثير في المشاريع الكبيرة.",
    rating: 5,
    project: "مشروع سكني - 200 وحدة",
  },
  {
    id: 2,
    name: "أ. سارة المالكي",
    role: "مصممة داخلية",
    text: "أبواب سنديان تضيف لمسة فخامة لكل مشروع أعمل عليه. التنوع في التصاميم والقدرة على التخصيص يجعلهم الخيار الأول لعملائي. خدمة العملاء استثنائية.",
    rating: 5,
    project: "فيلا خاصة - الرياض",
  },
  {
    id: 3,
    name: "عبدالله الشمري",
    role: "صاحب منزل",
    text: "اشتريت 8 أبواب داخلية لمنزلي الجديد واستفدت من سعر الجملة. الجودة تفوق التوقعات والتركيب كان احترافياً. أنصح بهم بشدة.",
    rating: 5,
    project: "منزل خاص - جدة",
  },
  {
    id: 4,
    name: "م. فهد الدوسري",
    role: "مقاول عام",
    text: "كموزع معتمد لسنديان، أقدر سهولة التعامل من خلال بوابة الموزعين. إدارة الطلبات وتتبعها أصبحت أسهل بكثير. الأسعار تنافسية والجودة ثابتة.",
    rating: 5,
    project: "موزع معتمد - المنطقة الشرقية",
  },
];

const testimonialsEn = [
  {
    id: 1,
    name: "Eng. Khalid Al-Otaibi",
    role: "Project Manager - Al-Iamr Company",
    text: "We have worked with Sindian on more than 15 residential and commercial projects. The door quality is excellent and their commitment to deadlines sets them apart. The tiered pricing system saved us a lot on large projects.",
    rating: 5,
    project: "Residential Project - 200 Units",
  },
  {
    id: 2,
    name: "Sara Al-Maliki",
    role: "Interior Designer",
    text: "Sindian doors add a touch of luxury to every project I work on. The variety of designs and customization capabilities make them my clients' first choice. Exceptional customer service.",
    rating: 5,
    project: "Private Villa - Riyadh",
  },
  {
    id: 3,
    name: "Abdullah Al-Shamri",
    role: "Homeowner",
    text: "I bought 8 interior doors for my new home and took advantage of the bulk price. The quality exceeds expectations and the installation was professional. Highly recommended.",
    rating: 5,
    project: "Private Home - Jeddah",
  },
  {
    id: 4,
    name: "Eng. Fahad Al-Dosari",
    role: "General Contractor",
    text: "As a certified Sindian distributor, I appreciate the ease of dealing through the distributor portal. Managing and tracking orders has become much easier. Competitive prices and consistent quality.",
    rating: 5,
    project: "Certified Distributor - Eastern Region",
  },
];

export default function TestimonialsSection() {
  const [current, setCurrent] = useState(0);
  const { dir } = useLanguage();
  const testimonials = dir === "rtl" ? testimonialsAr : testimonialsEn;

  const next = () => setCurrent((prev) => (prev + 1) % testimonials.length);
  const prev = () => setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  return (
    <section className="py-20 lg:py-28 bg-oak relative overflow-hidden">
      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="container relative">
        {/* Header */}
        <div className="text-center mb-14">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-copper text-sm font-semibold tracking-wider mb-3 block"
          >
            {dir === "rtl" ? "آراء عملائنا" : "Client Testimonials"}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight"
          >
            {dir === "rtl" ? "ثقة عملائنا فخرنا" : "Our Clients' Trust is Our Pride"}
          </motion.h2>
        </div>

        {/* Testimonial card */}
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-sm p-8 lg:p-12"
            >
              <Quote className="w-10 h-10 text-copper/50 mb-6" />

              <p className="text-white/90 text-lg lg:text-xl leading-relaxed mb-8">
                {testimonials[current].text}
              </p>

              <div className="flex items-center gap-1 mb-6">
                {Array.from({ length: testimonials[current].rating }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-copper text-copper" />
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-bold text-lg">
                    {testimonials[current].name}
                  </h4>
                  <p className="text-white/60 text-sm">{testimonials[current].role}</p>
                  <p className="text-copper text-xs mt-1">{testimonials[current].project}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={prev}
              className="text-white/60 hover:text-white hover:bg-white/10 rounded-full"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === current ? "bg-copper w-6" : "bg-white/30 hover:bg-white/50"
                  }`}
                />
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={next}
              className="text-white/60 hover:text-white hover:bg-white/10 rounded-full"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
