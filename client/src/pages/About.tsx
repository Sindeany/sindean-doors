/**
 * About Page - صفحة من نحن
 * Design: Architectural Luxury | أخضر السنديان + بيج دافئ + نحاسي
 * Sections: Hero → Story → Stats → Factory → Team → Quality/Certs → Values → CTA
 */

import { motion } from "framer-motion";
import {
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Factory,
  Globe,
  Leaf,
  MapPin,
  Medal,
  Shield,
  Star,
  TreePine,
  Users,
  Wrench,
} from "lucide-react";
import { Link } from "wouter";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/contexts/LanguageContext";

const FACTORY_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/about-factory-interior-biKCwEgq6RLHRhuMGt8Hk8.webp";
const CRAFTSMAN_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/about-craftsman-detail-NaNi83PNBCi6dNfGn8oY7r.webp";
const TEAM_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/about-team-photo-257ZRc8VwG9nC5vndUD3Mk.webp";
const QUALITY_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/about-quality-control-mmSfSE2PWwaYDfcGzxvJCs.webp";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export default function About() {
  const { dir } = useLanguage();

  const stats = dir === "rtl" ? [
    { value: "٢٠+", label: "عاماً من الخبرة", icon: Calendar },
    { value: "٥٠٠+", label: "مشروع منجز", icon: Building2 },
    { value: "١٥٠+", label: "شريك وموزع", icon: Users },
    { value: "١٢", label: "مدينة سعودية", icon: MapPin },
  ] : [
    { value: "20+", label: "Years of Experience", icon: Calendar },
    { value: "500+", label: "Completed Projects", icon: Building2 },
    { value: "150+", label: "Partners & Distributors", icon: Users },
    { value: "12", label: "Saudi Cities", icon: MapPin },
  ];

  const milestones = dir === "rtl" ? [
    { year: "٢٠٠٤", title: "التأسيس", desc: "بدأت سنديان كورشة صغيرة في الرياض بأيدي مجموعة من الحرفيين المتخصصين في صناعة الأبواب الخشبية." },
    { year: "٢٠٠٩", title: "التوسع الأول", desc: "افتتاح المصنع الرئيسي بمساحة ٥٠٠٠ متر مربع وإدخال أحدث آلات CNC الألمانية لتحسين الدقة والجودة." },
    { year: "٢٠١٤", title: "شهادة ISO 9001", desc: "حصلنا على شهادة الجودة الدولية ISO 9001:2015 تأكيداً لالتزامنا بأعلى معايير الجودة والتصنيع." },
    { year: "٢٠١٨", title: "إطلاق المنصة الرقمية", desc: "أطلقنا منصتنا الإلكترونية لخدمة العملاء الأفراد والشركات والموزعين في جميع أنحاء المملكة." },
    { year: "٢٠٢٢", title: "التوسع الخليجي", desc: "بدأنا التصدير لدول الخليج العربي ووقّعنا شراكات مع كبرى شركات المقاولات الإقليمية." },
    { year: "٢٠٢٥", title: "مصنع الجيل الجديد", desc: "افتتاح مصنع الجيل الجديد بمساحة ١٢٠٠٠ متر مربع مزوداً بتقنيات الذكاء الاصطناعي لمراقبة الجودة." },
  ] : [
    { year: "2004", title: "Foundation", desc: "Sindian started as a small workshop in Riyadh, founded by a group of craftsmen specializing in wooden door manufacturing." },
    { year: "2009", title: "First Expansion", desc: "Opened the main factory spanning 5,000 m² and introduced the latest German CNC machines to improve precision and quality." },
    { year: "2014", title: "ISO 9001 Certification", desc: "Obtained the international quality certificate ISO 9001:2015, affirming our commitment to the highest manufacturing standards." },
    { year: "2018", title: "Digital Platform Launch", desc: "Launched our online platform to serve individual customers, companies, and distributors across the Kingdom." },
    { year: "2022", title: "Gulf Expansion", desc: "Started exporting to GCC countries and signed partnerships with major regional contracting companies." },
    { year: "2025", title: "Next-Gen Factory", desc: "Opened the next-generation factory spanning 12,000 m², equipped with AI technologies for quality monitoring." },
  ];

  const teamMembers = dir === "rtl" ? [
    { name: "م. عبدالله السنديان", role: "المؤسس والرئيس التنفيذي", exp: "٢٥+ سنة خبرة", bg: "bg-[#2C4A3E]", initials: "ع.س" },
    { name: "م. فيصل العمري", role: "مدير الإنتاج والتصنيع", exp: "١٨+ سنة خبرة", bg: "bg-[#C4956A]", initials: "ف.ع" },
    { name: "أ. نورة الحربي", role: "مديرة تجربة العملاء", exp: "١٢+ سنة خبرة", bg: "bg-[#4A7C6F]", initials: "ن.ح" },
    { name: "م. خالد الرشيدي", role: "مدير ضبط الجودة", exp: "١٥+ سنة خبرة", bg: "bg-[#2C4A3E]", initials: "خ.ر" },
    { name: "أ. سارة الدوسري", role: "مديرة المبيعات والشراكات", exp: "١٠+ سنة خبرة", bg: "bg-[#C4956A]", initials: "س.د" },
    { name: "م. أحمد الشمري", role: "مدير الهندسة والتصميم", exp: "١٤+ سنة خبرة", bg: "bg-[#4A7C6F]", initials: "أ.ش" },
  ] : [
    { name: "Eng. Abdullah Al-Sindian", role: "Founder & CEO", exp: "25+ years experience", bg: "bg-[#2C4A3E]", initials: "A.S" },
    { name: "Eng. Faisal Al-Omari", role: "Production & Manufacturing Director", exp: "18+ years experience", bg: "bg-[#C4956A]", initials: "F.O" },
    { name: "Ms. Noura Al-Harbi", role: "Customer Experience Director", exp: "12+ years experience", bg: "bg-[#4A7C6F]", initials: "N.H" },
    { name: "Eng. Khalid Al-Rashidi", role: "Quality Control Director", exp: "15+ years experience", bg: "bg-[#2C4A3E]", initials: "K.R" },
    { name: "Ms. Sara Al-Dosari", role: "Sales & Partnerships Director", exp: "10+ years experience", bg: "bg-[#C4956A]", initials: "S.D" },
    { name: "Eng. Ahmed Al-Shammari", role: "Engineering & Design Director", exp: "14+ years experience", bg: "bg-[#4A7C6F]", initials: "A.S" },
  ];

  const certifications = [
    { icon: Shield, title: "ISO 9001:2015", desc: dir === "rtl" ? "نظام إدارة الجودة الدولي" : "International Quality Management System", color: "text-[#2C4A3E]", bg: "bg-[#2C4A3E]/10" },
    { icon: Award, title: "ISO 14001:2015", desc: dir === "rtl" ? "نظام الإدارة البيئية" : "Environmental Management System", color: "text-[#C4956A]", bg: "bg-[#C4956A]/10" },
    { icon: Medal, title: "SASO", desc: dir === "rtl" ? "هيئة المواصفات والمقاييس السعودية" : "Saudi Standards, Metrology & Quality Org.", color: "text-[#2C4A3E]", bg: "bg-[#2C4A3E]/10" },
    { icon: Star, title: dir === "rtl" ? "جائزة الجودة الوطنية" : "National Quality Award", desc: dir === "rtl" ? "الفائز ٢٠٢١ و٢٠٢٣" : "Winner 2021 & 2023", color: "text-[#C4956A]", bg: "bg-[#C4956A]/10" },
    { icon: Globe, title: "FSC Certified", desc: dir === "rtl" ? "مجلس إدارة الغابات العالمي" : "Forest Stewardship Council", color: "text-[#2C4A3E]", bg: "bg-[#2C4A3E]/10" },
    { icon: CheckCircle2, title: "CE Marking", desc: dir === "rtl" ? "مطابقة المعايير الأوروبية" : "European Standards Compliance", color: "text-[#C4956A]", bg: "bg-[#C4956A]/10" },
  ];

  const values = dir === "rtl" ? [
    { icon: Wrench, title: "الحرفية الأصيلة", desc: "نجمع بين الحرفية التقليدية العريقة والتقنيات الحديثة لنقدم أبواباً لا تُضاهى في الجودة والجمال." },
    { icon: Leaf, title: "الاستدامة البيئية", desc: "نستخدم أخشاباً من غابات مُدارة بشكل مستدام ونطبق ممارسات صديقة للبيئة في جميع مراحل التصنيع." },
    { icon: Users, title: "الشراكة الحقيقية", desc: "نبني علاقات طويلة الأمد مع عملائنا وشركائنا، ونضع نجاحهم في مقدمة أولوياتنا." },
    { icon: TreePine, title: "الجذور السعودية", desc: "نفخر بأننا منتج سعودي ١٠٠٪، نساهم في دعم رؤية ٢٠٣٠ وتطوير الصناعة الوطنية." },
  ] : [
    { icon: Wrench, title: "Authentic Craftsmanship", desc: "We combine traditional craftsmanship with modern technology to deliver doors unmatched in quality and beauty." },
    { icon: Leaf, title: "Environmental Sustainability", desc: "We use wood from sustainably managed forests and apply eco-friendly practices throughout all manufacturing stages." },
    { icon: Users, title: "True Partnership", desc: "We build long-term relationships with our clients and partners, placing their success at the forefront of our priorities." },
    { icon: TreePine, title: "Saudi Roots", desc: "We are proud to be a 100% Saudi product, contributing to Vision 2030 and the development of national industry." },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5]" dir={dir}>
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative min-h-[70vh] flex items-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${FACTORY_IMG})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-l from-[#1A2E28]/90 via-[#1A2E28]/70 to-transparent" />
        <div className="relative container mx-auto px-6 py-24 max-w-7xl">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="max-w-2xl"
          >
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-white/60 text-sm mb-6">
              <Link href="/" className="hover:text-white transition-colors">
                {dir === "rtl" ? "الرئيسية" : "Home"}
              </Link>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-white">{dir === "rtl" ? "من نحن" : "About Us"}</span>
            </div>

            <p className="text-[#C4956A] font-medium tracking-widest uppercase text-sm mb-4">
              {dir === "rtl" ? "قصتنا منذ ٢٠٠٤" : "Our Story Since 2004"}
            </p>
            <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6"
              style={{ fontFamily: "'DM Serif Display', serif" }}>
              {dir === "rtl" ? <>نصنع أبواباً<br /><span className="text-[#C4956A]">تدوم للأجيال</span></> : <>We Craft Doors<br /><span className="text-[#C4956A]">That Last Generations</span></>}
            </h1>
            <p className="text-white/80 text-lg leading-relaxed max-w-xl">
              {dir === "rtl"
                ? "منذ عام ٢٠٠٤، ونحن نجمع بين أصالة الحرفية العربية وأحدث تقنيات التصنيع لنقدم أبواباً خشبية فاخرة تُزيّن أجمل المنازل والمشاريع في المملكة العربية السعودية والخليج."
                : "Since 2004, we have combined the authenticity of Arabic craftsmanship with the latest manufacturing technologies to deliver premium wooden doors adorning the finest homes and projects across Saudi Arabia and the Gulf."}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="bg-[#2C4A3E] py-10">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <s.icon className="w-6 h-6 text-[#C4956A] mx-auto mb-2" />
                <div className="text-3xl font-bold text-white mb-1"
                  style={{ fontFamily: "'DM Serif Display', serif" }}>
                  {s.value}
                </div>
                <div className="text-white/70 text-sm">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our Story ── */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src={CRAFTSMAN_IMG}
                  alt={dir === "rtl" ? "حرفي سنديان" : "Sindian craftsman"}
                  className="w-full h-[500px] object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-[#C4956A] text-white rounded-2xl p-5 shadow-xl">
                <div className="text-3xl font-bold" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  {dir === "rtl" ? "٢٠+" : "20+"}
                </div>
                <div className="text-sm opacity-90">{dir === "rtl" ? "عاماً من الإبداع" : "Years of Creativity"}</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-[#C4956A] font-medium tracking-widest uppercase text-sm mb-3">
                {dir === "rtl" ? "قصتنا" : "Our Story"}
              </p>
              <h2 className="text-4xl font-bold text-[#1A2E28] mb-6 leading-tight"
                style={{ fontFamily: "'DM Serif Display', serif" }}>
                {dir === "rtl"
                  ? <>من ورشة صغيرة<br />إلى رائد الصناعة</>
                  : <>From a Small Workshop<br />to Industry Leader</>}
              </h2>
              <div className="space-y-4 text-[#4A5568] leading-relaxed">
                {dir === "rtl" ? (
                  <>
                    <p>بدأت قصة سنديان في عام ٢٠٠٤ بورشة متواضعة في الرياض، حيث اجتمع نخبة من الحرفيين الموهوبين بحلم واحد: صناعة أبواب خشبية تجمع بين الجمال الأصيل والمتانة الاستثنائية.</p>
                    <p>على مدار عقرين من الزمن، نمت سنديان لتصبح واحدة من أبرز شركات صناعة الأبواب الخشبية في المملكة العربية السعودية، بمصنع حديث يمتد على مساحة ١٢٠٠٠ متر مربع ويضم أكثر من ٢٠٠ حرفي ومهندس متخصص.</p>
                    <p>اليوم، تزيّن أبواب سنديان أكثر من ٥٠٠ مشروع في المملكة والخليج، من الفلل الفاخرة إلى الفنادق الكبرى والمجمعات التجارية، وكل باب يحمل بصمة الجودة والاعتزاز بالصنع السعودي.</p>
                  </>
                ) : (
                  <>
                    <p>Sindian's story began in 2004 with a modest workshop in Riyadh, where a group of talented craftsmen gathered with one dream: to manufacture wooden doors that combine authentic beauty with exceptional durability.</p>
                    <p>Over two decades, Sindian grew to become one of the most prominent wooden door manufacturers in Saudi Arabia, with a modern factory spanning 12,000 m² housing more than 200 specialized craftsmen and engineers.</p>
                    <p>Today, Sindian doors adorn more than 500 projects across Saudi Arabia and the Gulf, from luxury villas to major hotels and commercial complexes — each door bearing the hallmark of quality and Saudi craftsmanship pride.</p>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Timeline ── */}
      <section className="py-24 bg-[#FAF8F5]">
        <div className="container mx-auto px-6 max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <p className="text-[#C4956A] font-medium tracking-widest uppercase text-sm mb-3">
              {dir === "rtl" ? "رحلتنا عبر الزمن" : "Our Journey Through Time"}
            </p>
            <h2 className="text-4xl font-bold text-[#1A2E28]"
              style={{ fontFamily: "'DM Serif Display', serif" }}>
              {dir === "rtl" ? "محطات صنعت الفارق" : "Milestones That Made the Difference"}
            </h2>
          </motion.div>

          <div className="relative">
            <div className="absolute right-1/2 top-0 bottom-0 w-0.5 bg-[#2C4A3E]/20 hidden md:block" />
            <div className="space-y-8">
              {milestones.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: i % 2 === 0 ? 40 : -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex items-center gap-8 ${
                    i % 2 === 0 ? "md:flex-row-reverse" : "md:flex-row"
                  } flex-col md:flex-row`}
                >
                  <div className={`flex-1 ${i % 2 === 0 ? "md:text-right" : "md:text-left"}`}>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E8DFD0] hover:shadow-md transition-shadow">
                      <div className="text-[#C4956A] font-bold text-lg mb-2"
                        style={{ fontFamily: "'DM Serif Display', serif" }}>
                        {m.year}
                      </div>
                      <h3 className="text-xl font-bold text-[#1A2E28] mb-2">{m.title}</h3>
                      <p className="text-[#6B7280] leading-relaxed text-sm">{m.desc}</p>
                    </div>
                  </div>
                  <div className="hidden md:flex w-5 h-5 rounded-full bg-[#2C4A3E] border-4 border-white shadow-md flex-shrink-0 z-10" />
                  <div className="flex-1 hidden md:block" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Factory Tour ── */}
      <section className="py-24 bg-[#1A2E28] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-[#C4956A] blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-[#4A7C6F] blur-3xl" />
        </div>
        <div className="relative container mx-auto px-6 max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <p className="text-[#C4956A] font-medium tracking-widest uppercase text-sm mb-3">
              {dir === "rtl" ? "جولة في مصنعنا" : "Factory Tour"}
            </p>
            <h2 className="text-4xl font-bold text-white mb-4"
              style={{ fontFamily: "'DM Serif Display', serif" }}>
              {dir === "rtl" ? "حيث يُولد الجمال" : "Where Beauty is Born"}
            </h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              {dir === "rtl"
                ? "مصنعنا الحديث في الرياض يجمع بين أحدث آلات CNC الألمانية وأيدي الحرفيين المهرة لإنتاج أبواب استثنائية بدقة لا تُضاهى."
                : "Our modern factory in Riyadh combines the latest German CNC machines with skilled craftsmen's hands to produce exceptional doors with unmatched precision."}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="rounded-2xl overflow-hidden"
            >
              <img
                src={FACTORY_IMG}
                alt={dir === "rtl" ? "مصنع سنديان" : "Sindian Factory"}
                className="w-full h-[400px] object-cover"
              />
            </motion.div>

            <div className="grid grid-cols-2 gap-4">
              {(dir === "rtl" ? [
                { icon: Factory, title: "١٢٠٠٠ م²", desc: "مساحة المصنع" },
                { icon: Wrench, title: "٥٠+ آلة", desc: "أحدث المعدات الألمانية" },
                { icon: Users, title: "٢٠٠+ حرفي", desc: "متخصص ومدرّب" },
                { icon: Award, title: "٣٠٠٠+", desc: "باب ينتج شهرياً" },
              ] : [
                { icon: Factory, title: "12,000 m²", desc: "Factory Area" },
                { icon: Wrench, title: "50+ Machines", desc: "Latest German Equipment" },
                { icon: Users, title: "200+ Craftsmen", desc: "Specialized & Trained" },
                { icon: Award, title: "3,000+", desc: "Doors Produced Monthly" },
              ]).map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:bg-white/15 transition-colors"
                >
                  <item.icon className="w-8 h-8 text-[#C4956A] mb-3" />
                  <div className="text-2xl font-bold text-white mb-1"
                    style={{ fontFamily: "'DM Serif Display', serif" }}>
                    {item.title}
                  </div>
                  <div className="text-white/60 text-sm">{item.desc}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6 max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <p className="text-[#C4956A] font-medium tracking-widest uppercase text-sm mb-3">
              {dir === "rtl" ? "فريقنا" : "Our Team"}
            </p>
            <h2 className="text-4xl font-bold text-[#1A2E28] mb-4"
              style={{ fontFamily: "'DM Serif Display', serif" }}>
              {dir === "rtl" ? "العقول المبدعة خلف كل باب" : "The Creative Minds Behind Every Door"}
            </h2>
            <p className="text-[#6B7280] max-w-2xl mx-auto">
              {dir === "rtl"
                ? "فريق من الخبراء والمتخصصين يجمعهم شغف واحد: تقديم أفضل منتج وأرقى تجربة لكل عميل."
                : "A team of experts and specialists united by one passion: delivering the best product and finest experience to every client."}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl overflow-hidden shadow-xl mb-12"
          >
            <img
              src={TEAM_IMG}
              alt={dir === "rtl" ? "فريق سنديان" : "Sindian Team"}
              className="w-full h-[400px] object-cover object-top"
            />
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {teamMembers.map((member, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="text-center group"
              >
                <div
                  className={`w-16 h-16 rounded-2xl ${member.bg} flex items-center justify-center mx-auto mb-3 text-white font-bold text-lg group-hover:scale-110 transition-transform`}
                >
                  {member.initials}
                </div>
                <h3 className="font-bold text-[#1A2E28] text-sm mb-1">{member.name}</h3>
                <p className="text-[#C4956A] text-xs mb-1">{member.role}</p>
                <p className="text-[#9CA3AF] text-xs">{member.exp}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quality & Certifications ── */}
      <section className="py-24 bg-[#FAF8F5]">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-[#C4956A] font-medium tracking-widest uppercase text-sm mb-3">
                {dir === "rtl" ? "الجودة والشهادات" : "Quality & Certifications"}
              </p>
              <h2 className="text-4xl font-bold text-[#1A2E28] mb-6 leading-tight"
                style={{ fontFamily: "'DM Serif Display', serif" }}>
                {dir === "rtl"
                  ? <>معايير الجودة<br />لا تقبل التنازل</>
                  : <>Quality Standards<br />We Never Compromise</>}
              </h2>
              <p className="text-[#6B7280] leading-relaxed mb-8">
                {dir === "rtl"
                  ? "كل باب يخرج من مصنعنا يمر بـ ٢٧ نقطة فحص صارمة قبل وصوله إليك. نفتخر بحصولنا على أرقى الشهادات الدولية التي تُثبت التزامنا بأعلى معايير الجودة والسلامة والاستدامة."
                  : "Every door leaving our factory passes through 27 strict inspection points before reaching you. We are proud to hold the most prestigious international certifications that prove our commitment to the highest standards of quality, safety, and sustainability."}
              </p>

              <div className="grid grid-cols-2 gap-4">
                {certifications.map((cert, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className={`${cert.bg} rounded-xl p-4 flex items-start gap-3`}
                  >
                    <cert.icon className={`w-6 h-6 ${cert.color} flex-shrink-0 mt-0.5`} />
                    <div>
                      <div className={`font-bold text-sm ${cert.color}`}>{cert.title}</div>
                      <div className="text-[#6B7280] text-xs mt-0.5">{cert.desc}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src={QUALITY_IMG}
                  alt={dir === "rtl" ? "ضبط الجودة في سنديان" : "Quality control at Sindian"}
                  className="w-full h-[500px] object-cover"
                />
              </div>
              <div className="absolute -top-5 -right-5 bg-white rounded-2xl p-4 shadow-xl border border-[#E8DFD0]">
                <div className="flex items-center gap-2">
                  <Shield className="w-8 h-8 text-[#2C4A3E]" />
                  <div>
                    <div className="font-bold text-[#1A2E28] text-sm">
                      {dir === "rtl" ? "ضمان ١٠ سنوات" : "10-Year Warranty"}
                    </div>
                    <div className="text-[#9CA3AF] text-xs">
                      {dir === "rtl" ? "على جميع المنتجات" : "On all products"}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6 max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <p className="text-[#C4956A] font-medium tracking-widest uppercase text-sm mb-3">
              {dir === "rtl" ? "قيمنا" : "Our Values"}
            </p>
            <h2 className="text-4xl font-bold text-[#1A2E28]"
              style={{ fontFamily: "'DM Serif Display', serif" }}>
              {dir === "rtl" ? "ما يُميّزنا ويُلزمنا" : "What Defines and Commits Us"}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group text-center p-8 rounded-2xl border border-[#E8DFD0] hover:border-[#2C4A3E] hover:shadow-lg transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#2C4A3E]/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-[#2C4A3E] transition-colors">
                  <v.icon className="w-7 h-7 text-[#2C4A3E] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-[#1A2E28] mb-3">{v.title}</h3>
                <p className="text-[#6B7280] text-sm leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 bg-[#2C4A3E] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-[#C4956A] blur-3xl" />
        </div>
        <div className="relative container mx-auto px-6 max-w-4xl text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="text-4xl font-bold text-white mb-4"
              style={{ fontFamily: "'DM Serif Display', serif" }}>
              {dir === "rtl" ? "ابدأ مشروعك معنا اليوم" : "Start Your Project With Us Today"}
            </h2>
            <p className="text-white/70 mb-8 text-lg">
              {dir === "rtl"
                ? "سواء كنت تبحث عن باب لمنزلك أو تخطط لمشروع كبير، فريقنا جاهز لمساعدتك في اختيار الحل الأمثل."
                : "Whether you're looking for a door for your home or planning a large project, our team is ready to help you choose the optimal solution."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-[#C4956A] text-white px-8 py-4 rounded-xl font-semibold hover:bg-[#B8845A] transition-colors"
              >
                {dir === "rtl" ? "تصفح المنتجات" : "Browse Products"}
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <Link
                href="/b2b"
                className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/30 px-8 py-4 rounded-xl font-semibold hover:bg-white/20 transition-colors"
              >
                {dir === "rtl" ? "طلب عرض سعر" : "Request a Quote"}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
