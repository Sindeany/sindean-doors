/**
 * Design: Architectural Luxury - Warm Minimalism
 * FAQSection: Accordion-based FAQ with category tabs
 * Colors: oak (#2C4A3E), copper (#C4956A), beige (#E8DFD0), warm-white (#FAF8F5)
 * Layout: Two-column asymmetric — sticky header left, accordion right
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, MessageCircle, Phone, Mail } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: string;
}

const faqsAr: FAQItem[] = [
  { id: 1, category: "المنتجات", question: "ما أنواع الخشب المستخدمة في صناعة الأبواب؟", answer: "نستخدم أجود أنواع الخشب الطبيعي المستدام، وأبرزها: خشب السنديان (Oak) المعروف بصلابته وجماله، خشب الساج (Teak) المقاوم للرطوبة والحشرات، خشب الجوز (Walnut) بلونه الداكن الفاخر، وخشب الماهوجني للأبواب الرئيسية الفاخرة. جميع أخشابنا معالجة بطبقات حماية متعددة لضمان عمر افتراضي يتجاوز 20 عاماً." },
  { id: 2, category: "المنتجات", question: "هل يمكن تخصيص الأبواب بمقاسات أو تصاميم خاصة؟", answer: "نعم، نقدم خدمة التصنيع المخصص (Custom Manufacturing) لجميع أنواع الأبواب. يمكنك تحديد المقاس، نوع الخشب، اللون، النقوش، ونوع الزجاج إن وُجد. يُرجى التواصل معنا عبر نموذج طلب عرض السعر أو الاتصال المباشر لمناقشة متطلباتك. مدة التصنيع المخصص تتراوح بين 15-30 يوم عمل." },
  { id: 3, category: "المنتجات", question: "ما الفرق بين الأبواب الداخلية والخارجية من حيث المواصفات؟", answer: "الأبواب الخارجية مصممة لتحمل العوامل الجوية (الرطوبة، الحرارة، الأشعة فوق البنفسجية) وتأتي بسماكة أكبر (45-55 مم) مع طلاء UV خاص وعزل حراري. الأبواب الداخلية تُركز على الجماليات والعزل الصوتي وتأتي بسماكة 35-40 مم. كلا النوعين يحمل ضمان الجودة لكن بمدد مختلفة." },
  { id: 4, category: "الأسعار", question: "كيف يعمل نظام الأسعار المتدرجة؟", answer: "نظام الأسعار المتدرجة يعني أن سعر الوحدة ينخفض كلما زادت الكمية المطلوبة. مثال: سعر الباب الواحد 1,200 ر.س، عند طلب 5 أبواب يصبح 980 ر.س للباب، وعند طلب 10 أبواب أو أكثر يصبح 850 ر.س للباب. يمكنك رؤية جدول الأسعار التفصيلي في صفحة كل منتج." },
  { id: 5, category: "الأسعار", question: "ما طرق الدفع المتاحة؟", answer: "نقبل جميع طرق الدفع الشائعة: بطاقات الائتمان والخصم (Visa, Mastercard, Mada)، التحويل البنكي، والدفع عند الاستلام للطلبات داخل الرياض وجدة والدمام. للطلبات الكبيرة (B2B)، نوفر خيار الدفع بالأجل حتى 90 يوماً للشركات المعتمدة." },
  { id: 6, category: "الأسعار", question: "هل تشمل الأسعار ضريبة القيمة المضافة والتركيب؟", answer: "جميع الأسعار المعروضة في المتجر شاملة ضريبة القيمة المضافة (15%). خدمة التركيب متاحة بتكلفة إضافية تبدأ من 150 ر.س للباب الواحد وتشمل التوريد والتركيب الكامل. الشحن مجاني للطلبات التي تتجاوز 5,000 ر.س." },
  { id: 7, category: "الشحن", question: "ما مناطق التوصيل وكم تستغرق مدة التسليم؟", answer: "نوصل لجميع مناطق المملكة العربية السعودية. مدة التسليم للمنتجات الجاهزة: 3-5 أيام عمل للرياض وجدة والدمام، و5-10 أيام للمناطق الأخرى. للمنتجات المخصصة تُضاف مدة التصنيع (15-30 يوم). يمكنك تتبع شحنتك من خلال رقم التتبع المُرسل على بريدك الإلكتروني." },
  { id: 8, category: "الشحن", question: "كيف يتم تغليف الأبواب لضمان سلامتها أثناء الشحن؟", answer: "نستخدم تغليفاً متعدد الطبقات يشمل: طبقة فوم واقية، غلاف كرتون مقوى، وأطواق خشبية للأبواب الكبيرة. جميع الشحنات مؤمنة ضد أضرار النقل. في حال وصول المنتج تالفاً، نلتزم بالاستبدال الفوري خلال 48 ساعة من تقديم البلاغ مع صور توضيحية." },
  { id: 9, category: "الضمان", question: "ما مدة الضمان وماذا يشمل؟", answer: "نقدم ضمان شامل على جميع منتجاتنا: 10 سنوات للأبواب الداخلية، 12 سنة للأبواب الخارجية، و15 سنة لأبواب الساج الطبيعي. يشمل الضمان: عيوب التصنيع، تشقق الخشب، تقشر الطلاء، وعطل الأقفال والمفصلات. لا يشمل الضمان الأضرار الناتجة عن سوء الاستخدام أو الحوادث." },
  { id: 10, category: "الضمان", question: "كيف أعتني بالأبواب الخشبية للحفاظ على جودتها؟", answer: "للحفاظ على جمال وجودة أبوابك: نظّف السطح بقطعة قماش ناعمة مبللة قليلاً وجففها فوراً، تجنب المنظفات الكيميائية القوية، أعد طلاء الأبواب الخارجية كل 3-5 سنوات، وتأكد من إحكام إغلاق النوافذ والأبواب في الأجواء الرطبة. نوفر خدمة الصيانة الدورية بتكلفة رمزية." },
  { id: 11, category: "الأعمال", question: "كيف يمكن للشركات والمقاولين الحصول على أسعار خاصة؟", answer: "نقدم برامج خاصة للشركات والمقاولين تشمل: أسعار الجملة المتدرجة، حد ائتماني مرن، أولوية في التصنيع والتسليم، ومدير حساب مخصص. للتسجيل كعميل B2B، يُرجى تعبئة نموذج طلب عرض السعر في صفحة حلول الأعمال مع إرفاق السجل التجاري. سيتواصل معك فريقنا خلال 24 ساعة." },
  { id: 12, category: "الأعمال", question: "هل تقدمون خدمة التوريد لمشاريع البناء الكبيرة؟", answer: "نعم، نتخصص في توريد الأبواب لمشاريع البناء الكبيرة بما فيها: المجمعات السكنية، الفنادق، المكاتب، والمستشفيات. نوفر: تنسيق التسليم المرحلي حسب جدول المشروع، فريق تركيب متخصص، شهادات الجودة والمطابقة، وضمان ما بعد التسليم. تواصل معنا لمناقشة متطلبات مشروعك." },
];

const faqsEn: FAQItem[] = [
  { id: 1, category: "Products", question: "What types of wood are used in door manufacturing?", answer: "We use the finest sustainable natural woods, most notably: Oak wood known for its hardness and beauty, Teak wood resistant to moisture and insects, Walnut wood with its luxurious dark color, and Mahogany for premium main doors. All our woods are treated with multiple protective layers to ensure a lifespan exceeding 20 years." },
  { id: 2, category: "Products", question: "Can doors be customized with special sizes or designs?", answer: "Yes, we offer Custom Manufacturing services for all door types. You can specify size, wood type, color, carvings, and glass type if applicable. Please contact us via the RFQ form or direct call to discuss your requirements. Custom manufacturing takes 15-30 business days." },
  { id: 3, category: "Products", question: "What is the difference between interior and exterior doors in terms of specifications?", answer: "Exterior doors are designed to withstand weather conditions (humidity, heat, UV rays) and come in greater thickness (45-55mm) with special UV coating and thermal insulation. Interior doors focus on aesthetics and sound insulation and come in 35-40mm thickness. Both carry quality warranties but for different durations." },
  { id: 4, category: "Pricing", question: "How does the tiered pricing system work?", answer: "The tiered pricing system means the unit price decreases as the quantity increases. Example: one door costs 1,200 SAR; ordering 5 doors brings it to 980 SAR per door; ordering 10 or more doors brings it to 850 SAR per door. You can view the detailed price table on each product page." },
  { id: 5, category: "Pricing", question: "What payment methods are available?", answer: "We accept all common payment methods: credit and debit cards (Visa, Mastercard, Mada), bank transfer, and cash on delivery for orders within Riyadh, Jeddah, and Dammam. For large B2B orders, we offer deferred payment up to 90 days for approved companies." },
  { id: 6, category: "Pricing", question: "Do prices include VAT and installation?", answer: "All prices shown in the store are inclusive of 15% VAT. Installation service is available at an additional cost starting from 150 SAR per door, including full supply and installation. Free shipping for orders exceeding 5,000 SAR." },
  { id: 7, category: "Shipping", question: "What are the delivery areas and how long does delivery take?", answer: "We deliver to all regions of Saudi Arabia. Delivery time for ready products: 3-5 business days for Riyadh, Jeddah, and Dammam; 5-10 days for other regions. For custom products, manufacturing time (15-30 days) is added. You can track your shipment via the tracking number sent to your email." },
  { id: 8, category: "Shipping", question: "How are doors packaged to ensure safety during shipping?", answer: "We use multi-layer packaging including: protective foam layer, reinforced cardboard wrap, and wooden frames for large doors. All shipments are insured against transport damage. If a product arrives damaged, we commit to immediate replacement within 48 hours of filing a report with supporting photos." },
  { id: 9, category: "Warranty", question: "What is the warranty duration and what does it cover?", answer: "We offer a comprehensive warranty on all our products: 10 years for interior doors, 12 years for exterior doors, and 15 years for natural teak doors. The warranty covers: manufacturing defects, wood cracking, paint peeling, and lock and hinge failures. The warranty does not cover damage from misuse or accidents." },
  { id: 10, category: "Warranty", question: "How do I care for wooden doors to maintain their quality?", answer: "To maintain the beauty and quality of your doors: clean the surface with a slightly damp soft cloth and dry immediately, avoid strong chemical cleaners, repaint exterior doors every 3-5 years, and ensure windows and doors are properly closed in humid weather. We offer periodic maintenance service at a nominal cost." },
  { id: 11, category: "Business", question: "How can companies and contractors get special pricing?", answer: "We offer special programs for companies and contractors including: tiered wholesale pricing, flexible credit limits, priority in manufacturing and delivery, and a dedicated account manager. To register as a B2B client, please fill out the RFQ form on the Business Solutions page with your commercial registration. Our team will contact you within 24 hours." },
  { id: 12, category: "Business", question: "Do you offer supply services for large construction projects?", answer: "Yes, we specialize in supplying doors for large construction projects including: residential compounds, hotels, offices, and hospitals. We provide: phased delivery coordination per project schedule, specialized installation team, quality and compliance certificates, and post-delivery warranty. Contact us to discuss your project requirements." },
];

export default function FAQSection() {
  const { dir } = useLanguage();
  const faqs = dir === "rtl" ? faqsAr : faqsEn;
  const categoriesAr = ["الكل", "المنتجات", "الأسعار", "الشحن", "الضمان", "الأعمال"];
  const categoriesEn = ["All", "Products", "Pricing", "Shipping", "Warranty", "Business"];
  const categories = dir === "rtl" ? categoriesAr : categoriesEn;
  const allLabel = dir === "rtl" ? "الكل" : "All";

  const [openId, setOpenId] = useState<number | null>(1);
  const [activeCategory, setActiveCategory] = useState(allLabel);

  const filtered = activeCategory === allLabel
    ? faqs
    : faqs.filter((f) => f.category === activeCategory);

  const toggle = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section className="py-24 bg-[#FAF8F5] relative overflow-hidden">
      <div
        className="absolute top-0 left-0 w-72 h-72 rounded-full opacity-5 pointer-events-none"
        style={{ background: "var(--color-oak)", filter: "blur(80px)" }}
      />
      <div
        className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-5 pointer-events-none"
        style={{ background: "var(--color-copper)", filter: "blur(100px)" }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span
              className="inline-block text-sm font-semibold tracking-widest uppercase mb-4 px-4 py-1.5 rounded-full"
              style={{ color: "var(--color-copper)", background: "oklch(0.68 0.10 60 / 0.1)" }}
            >
              {dir === "rtl" ? "الأسئلة الشائعة" : "FAQ"}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: "var(--color-oak-dark)" }}>
              {dir === "rtl" ? "كل ما تريد معرفته" : "Everything You Need to Know"}
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "oklch(0.45 0.03 80)" }}>
              {dir === "rtl"
                ? "أجوبة شاملة على أكثر الأسئلة التي يطرحها عملاؤنا حول منتجاتنا وخدماتنا وسياساتنا"
                : "Comprehensive answers to the most common questions our customers ask about our products, services, and policies"}
            </p>
          </motion.div>
        </div>

        {/* Category Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-2 mb-12"
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setOpenId(null); }}
              className="px-5 py-2 rounded-full text-sm font-medium transition-all duration-300"
              style={{
                background: activeCategory === cat ? "var(--color-oak)" : "white",
                color: activeCategory === cat ? "white" : "var(--color-oak)",
                border: `1.5px solid ${activeCategory === cat ? "var(--color-oak)" : "oklch(0.85 0.02 80)"}`,
                boxShadow: activeCategory === cat ? "0 4px 14px oklch(0.38 0.06 160 / 0.25)" : "none",
              }}
            >
              {cat}
            </button>
          ))}
        </motion.div>

        {/* Main Content: Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          {/* Left: Sticky contact card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:sticky lg:top-24"
          >
            <div className="rounded-2xl p-8" style={{ background: "var(--color-oak)", color: "white" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6" style={{ background: "oklch(1 0 0 / 0.15)" }}>
                <MessageCircle className="w-6 h-6" style={{ color: "var(--color-copper-light)" }} />
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>
                {dir === "rtl" ? "لم تجد إجابتك؟" : "Didn't Find Your Answer?"}
              </h3>
              <p className="text-sm mb-8 leading-relaxed" style={{ color: "oklch(1 0 0 / 0.75)" }}>
                {dir === "rtl"
                  ? "فريق خدمة العملاء متاح 6 أيام في الأسبوع للإجابة على جميع استفساراتك"
                  : "Our customer service team is available 6 days a week to answer all your inquiries"}
              </p>

              <div className="space-y-4">
                <a href="tel:920000000" className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group" style={{ background: "oklch(1 0 0 / 0.1)" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "oklch(1 0 0 / 0.15)" }}>
                    <Phone className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: "oklch(1 0 0 / 0.6)" }}>
                      {dir === "rtl" ? "اتصل بنا" : "Call Us"}
                    </p>
                    <p className="text-sm font-semibold text-white">920-000-000</p>
                  </div>
                </a>

                <a href="mailto:info@sindian.sa" className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200" style={{ background: "oklch(1 0 0 / 0.1)" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "oklch(1 0 0 / 0.15)" }}>
                    <Mail className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: "oklch(1 0 0 / 0.6)" }}>
                      {dir === "rtl" ? "راسلنا" : "Email Us"}
                    </p>
                    <p className="text-sm font-semibold text-white">info@sindian.sa</p>
                  </div>
                </a>
              </div>

              <div className="mt-8 pt-6 grid grid-cols-2 gap-4" style={{ borderTop: "1px solid oklch(1 0 0 / 0.15)" }}>
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: "var(--color-copper-light)" }}>{"< 2h"}</p>
                  <p className="text-xs mt-1" style={{ color: "oklch(1 0 0 / 0.65)" }}>
                    {dir === "rtl" ? "متوسط وقت الرد" : "Avg. Response Time"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: "var(--color-copper-light)" }}>98%</p>
                  <p className="text-xs mt-1" style={{ color: "oklch(1 0 0 / 0.65)" }}>
                    {dir === "rtl" ? "رضا العملاء" : "Client Satisfaction"}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: FAQ Accordion */}
          <div className="lg:col-span-2 space-y-3">
            <AnimatePresence mode="wait">
              {filtered.map((faq, index) => (
                <motion.div
                  key={faq.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <div
                    className="rounded-2xl overflow-hidden transition-all duration-300"
                    style={{
                      background: "white",
                      border: openId === faq.id ? "1.5px solid var(--color-oak)" : "1.5px solid oklch(0.90 0.01 80)",
                      boxShadow: openId === faq.id ? "0 4px 20px oklch(0.38 0.06 160 / 0.10)" : "0 1px 4px oklch(0 0 0 / 0.04)",
                    }}
                  >
                    <button
                      onClick={() => toggle(faq.id)}
                      className="w-full flex items-center justify-between gap-4 p-6 text-right transition-colors duration-200"
                      style={{ background: openId === faq.id ? "oklch(0.38 0.06 160 / 0.04)" : "transparent" }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span
                          className="hidden sm:inline-flex text-xs px-2.5 py-1 rounded-full flex-shrink-0"
                          style={{ background: "oklch(0.68 0.10 60 / 0.12)", color: "var(--color-copper)" }}
                        >
                          {faq.category}
                        </span>
                        <span
                          className="text-base font-semibold text-right"
                          style={{ color: openId === faq.id ? "var(--color-oak)" : "var(--color-wood-dark)" }}
                        >
                          {faq.question}
                        </span>
                      </div>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
                        style={{ background: openId === faq.id ? "var(--color-oak)" : "oklch(0.92 0.02 80)" }}
                      >
                        {openId === faq.id ? (
                          <Minus className="w-4 h-4 text-white" />
                        ) : (
                          <Plus className="w-4 h-4" style={{ color: "var(--color-oak)" }} />
                        )}
                      </div>
                    </button>

                    <AnimatePresence>
                      {openId === faq.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6" style={{ borderTop: "1px solid oklch(0.90 0.01 80)" }}>
                            <p className="pt-5 text-sm leading-8" style={{ color: "oklch(0.45 0.02 80)" }}>
                              {faq.answer}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-lg" style={{ color: "oklch(0.55 0.02 80)" }}>
                  {dir === "rtl" ? "لا توجد أسئلة في هذا التصنيف" : "No questions in this category"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
