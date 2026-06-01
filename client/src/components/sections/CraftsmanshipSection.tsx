/**
 * Design: Architectural Luxury - Warm Minimalism
 * Craftsmanship: Storytelling section about quality and heritage
 * Uses generated workshop image (warm/light → dark text)
 */
import { motion } from "framer-motion";
import { Shield, Leaf, Award, Wrench } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const WORKSHOP_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/workshop-craftsmanship-58TZVzpxzYmyxyaHddWqfD.webp";

export default function CraftsmanshipSection() {
  const { dir } = useLanguage();

  const qualities = dir === "rtl" ? [
    { icon: Leaf, title: "خشب طبيعي 100%", description: "نستخدم أجود أنواع الأخشاب الطبيعية المستوردة من أفضل الغابات المستدامة" },
    { icon: Shield, title: "ضمان حتى 15 سنة", description: "نثق بجودة منتجاتنا ونقدم ضماناً شاملاً يغطي التصنيع والمواد" },
    { icon: Award, title: "شهادات معتمدة", description: "منتجاتنا حاصلة على شهادات الجودة والسلامة العالمية ISO و UL" },
    { icon: Wrench, title: "تركيب احترافي", description: "فريق تركيب متخصص يضمن تركيباً مثالياً في الوقت المحدد" },
  ] : [
    { icon: Leaf, title: "100% Natural Wood", description: "We use the finest natural woods imported from the best sustainable forests" },
    { icon: Shield, title: "Up to 15-Year Warranty", description: "We trust our product quality and offer a comprehensive warranty covering manufacturing and materials" },
    { icon: Award, title: "Certified Standards", description: "Our products hold international quality and safety certifications: ISO and UL" },
    { icon: Wrench, title: "Professional Installation", description: "A specialized installation team ensures perfect fitting on time" },
  ];

  return (
    <section className="py-20 lg:py-28 bg-warm-white overflow-hidden">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-copper text-sm font-semibold tracking-wider mb-3 block">
              {dir === "rtl" ? "الحرفية والجودة" : "Craftsmanship & Quality"}
            </span>
            <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-wood-dark leading-tight mb-6">
              {dir === "rtl" ? (
                <>صُنعت بأيدٍ ماهرة<br /><span className="text-oak">لتدوم أجيالاً</span></>
              ) : (
                <>Crafted by Skilled Hands<br /><span className="text-oak">Built to Last Generations</span></>
              )}
            </h2>
            <p className="text-muted-foreground text-base lg:text-lg leading-relaxed mb-10">
              {dir === "rtl"
                ? "منذ أكثر من 25 عاماً ونحن نصنع أبواباً خشبية بأعلى معايير الجودة. كل باب يمر بأكثر من 20 مرحلة تصنيع دقيقة لضمان الكمال في كل تفصيلة."
                : "For more than 25 years, we have been crafting wooden doors to the highest quality standards. Every door goes through more than 20 precise manufacturing stages to ensure perfection in every detail."}
            </p>

            {/* Quality features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {qualities.map((q, i) => (
                <motion.div
                  key={q.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-4"
                >
                  <div className="w-12 h-12 rounded-sm bg-copper/10 flex items-center justify-center shrink-0">
                    <q.icon className="w-6 h-6 text-copper" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-wood-dark mb-1">{q.title}</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {q.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="rounded-sm overflow-hidden">
              <img
                src={WORKSHOP_IMAGE}
                alt={dir === "rtl" ? "حرفي يعمل على تصنيع باب خشبي" : "Craftsman working on a wooden door"}
                className="w-full h-auto object-cover aspect-[4/3]"
              />
            </div>
            {/* Decorative elements */}
            <div className="absolute -bottom-4 -left-4 w-32 h-32 border-b-2 border-l-2 border-copper/30 rounded-sm" />

            {/* Experience badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="absolute -top-6 -left-6 lg:left-auto lg:-right-6 bg-oak text-white rounded-sm p-5 shadow-xl"
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-copper">+25</div>
                <div className="text-xs text-white/70 mt-1">{dir === "rtl" ? "سنة من الخبرة" : "Years of Experience"}</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
