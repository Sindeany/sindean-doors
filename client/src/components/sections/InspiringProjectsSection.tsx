/**
 * Design: Architectural Luxury - Warm Minimalism
 * InspiringProjectsSection: Masonry-style gallery showcasing real projects using Sindian doors
 * Colors: oak green (#2C4A3E), copper (#C4956A), warm beige, off-white
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, MapPin, Building2, Calendar, ArrowUpRight, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const projectsAr = [
  {
    id: 1,
    title: "فيلا النخيل الفاخرة",
    category: "فلل سكنية",
    location: "الرياض، حي النرجس",
    year: "2024",
    doorsCount: 24,
    doorType: "أبواب خارجية منحوتة",
    description: "تصميم استثنائي يجمع بين الأصالة العربية والفخامة المعاصرة. أبواب مزدوجة منحوتة يدوياً من خشب السنديان الأصيل مع تشطيبات نحاسية.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-villa-luxury-R72sMRkF4TJn4wNhgER2fX.webp",
    featured: true,
    size: "large",
    tags: ["فاخر", "منحوت", "سنديان"],
  },
  {
    id: 2,
    title: "فندق الأفق الفاخر",
    category: "فنادق ومنتجعات",
    location: "جدة، كورنيش الهامبرا",
    year: "2023",
    doorsCount: 208,
    doorType: "أبواب لوبي وغرف فندقية",
    description: "بوابات ضخمة لردهة الفندق الرئيسية مع أبواب غرف مصممة خصيصاً لتعكس هوية العلامة التجارية الفاخرة.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-hotel-lobby-Tkn7nLAHxJg24jd9H6UTvn.webp",
    featured: true,
    size: "medium",
    tags: ["فندقي", "ضخم", "مخصص"],
  },
  {
    id: 3,
    title: "برج الأعمال المركزي",
    category: "مباني تجارية",
    location: "الرياض، طريق الملك فهد",
    year: "2024",
    doorsCount: 65,
    doorType: "أبواب مداخل تجارية",
    description: "مداخل رئيسية بتصميم معاصر يجمع بين الخشب الطبيعي والزجاج المقسى، تعكس احترافية وهيبة المبنى التجاري.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-office-tower-bvqDbyymkwgqjBnTAMAM6M.webp",
    featured: false,
    size: "medium",
    tags: ["تجاري", "معاصر", "زجاج"],
  },
  {
    id: 4,
    title: "مجمع الأفق السكني",
    category: "مجمعات سكنية",
    location: "الرياض، حي العليا",
    year: "2023",
    doorsCount: 180,
    doorType: "أبواب فلل ومداخل",
    description: "مشروع ضخم يضم 45 فيلا سكنية فاخرة، كل فيلا بتصميم باب مميز يحافظ على الهوية المعمارية الموحدة للمجمع.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-residential-compound-UVgPJqKAjZU9v4TJ5TNczM.webp",
    featured: false,
    size: "small",
    tags: ["سكني", "جملة", "موحد"],
  },
  {
    id: 5,
    title: "مسجد النور الكبير",
    category: "مساجد ومنشآت دينية",
    location: "الدمام، حي الشاطئ",
    year: "2022",
    doorsCount: 12,
    doorType: "أبواب مسجد منحوتة",
    description: "أبواب ضخمة بنقوش إسلامية هندسية منحوتة يدوياً تعكس الجمال الروحاني والتراث الإسلامي الأصيل.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-mosque-Mh7YnNiXScmzmCfhPSf8tP.webp",
    featured: true,
    size: "large",
    tags: ["ديني", "منحوت", "تراثي"],
  },
];

const projectsEn = [
  {
    id: 1,
    title: "Al-Nakheel Luxury Villa",
    category: "Residential Villas",
    location: "Riyadh, Al-Narjis District",
    year: "2024",
    doorsCount: 24,
    doorType: "Carved Exterior Doors",
    description: "An exceptional design combining Arab authenticity with contemporary luxury. Double doors hand-carved from genuine oak wood with copper finishes.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-villa-luxury-R72sMRkF4TJn4wNhgER2fX.webp",
    featured: true,
    size: "large",
    tags: ["Luxury", "Carved", "Oak"],
  },
  {
    id: 2,
    title: "Al-Ofuq Luxury Hotel",
    category: "Hotels & Resorts",
    location: "Jeddah, Al-Hamra Corniche",
    year: "2023",
    doorsCount: 208,
    doorType: "Lobby & Hotel Room Doors",
    description: "Grand gates for the main hotel lobby with custom-designed room doors reflecting the brand's luxury identity.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-hotel-lobby-Tkn7nLAHxJg24jd9H6UTvn.webp",
    featured: true,
    size: "medium",
    tags: ["Hospitality", "Large-Scale", "Custom"],
  },
  {
    id: 3,
    title: "Central Business Tower",
    category: "Commercial Buildings",
    location: "Riyadh, King Fahd Road",
    year: "2024",
    doorsCount: 65,
    doorType: "Commercial Entrance Doors",
    description: "Main entrances with a contemporary design combining natural wood and tempered glass, reflecting the building's professionalism and prestige.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-office-tower-bvqDbyymkwgqjBnTAMAM6M.webp",
    featured: false,
    size: "medium",
    tags: ["Commercial", "Contemporary", "Glass"],
  },
  {
    id: 4,
    title: "Al-Ofuq Residential Compound",
    category: "Residential Compounds",
    location: "Riyadh, Al-Olaya District",
    year: "2023",
    doorsCount: 180,
    doorType: "Villa & Entrance Doors",
    description: "A large project comprising 45 luxury residential villas, each with a distinctive door design maintaining the compound's unified architectural identity.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-residential-compound-UVgPJqKAjZU9v4TJ5TNczM.webp",
    featured: false,
    size: "small",
    tags: ["Residential", "Wholesale", "Unified"],
  },
  {
    id: 5,
    title: "Al-Noor Grand Mosque",
    category: "Mosques & Religious Facilities",
    location: "Dammam, Al-Shati District",
    year: "2022",
    doorsCount: 12,
    doorType: "Carved Mosque Doors",
    description: "Grand doors with hand-carved geometric Islamic patterns reflecting spiritual beauty and authentic Islamic heritage.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-mosque-Mh7YnNiXScmzmCfhPSf8tP.webp",
    featured: true,
    size: "large",
    tags: ["Religious", "Carved", "Heritage"],
  },
];

const categoryColorsAr: Record<string, string> = {
  "فلل سكنية": "bg-amber-100 text-amber-800",
  "فنادق ومنتجعات": "bg-blue-100 text-blue-800",
  "مباني تجارية": "bg-slate-100 text-slate-800",
  "مجمعات سكنية": "bg-green-100 text-green-800",
  "مساجد ومنشآت دينية": "bg-emerald-100 text-emerald-800",
};

const categoryColorsEn: Record<string, string> = {
  "Residential Villas": "bg-amber-100 text-amber-800",
  "Hotels & Resorts": "bg-blue-100 text-blue-800",
  "Commercial Buildings": "bg-slate-100 text-slate-800",
  "Residential Compounds": "bg-green-100 text-green-800",
  "Mosques & Religious Facilities": "bg-emerald-100 text-emerald-800",
};

export default function InspiringProjectsSection() {
  const { dir } = useLanguage();
  const projects = dir === "rtl" ? projectsAr : projectsEn;
  const categoryColors = dir === "rtl" ? categoryColorsAr : categoryColorsEn;

  const categoriesAr = ["الكل", "فلل سكنية", "فنادق ومنتجعات", "مباني تجارية", "مجمعات سكنية", "مساجد ومنشآت دينية"];
  const categoriesEn = ["All", "Residential Villas", "Hotels & Resorts", "Commercial Buildings", "Residential Compounds", "Mosques & Religious Facilities"];
  const categories = dir === "rtl" ? categoriesAr : categoriesEn;
  const allLabel = dir === "rtl" ? "الكل" : "All";

  const [activeFilter, setActiveFilter] = useState(allLabel);
  const [lightboxProject, setLightboxProject] = useState<typeof projects[0] | null>(null);

  const filtered = activeFilter === allLabel
    ? projects
    : projects.filter((p) => p.category === activeFilter);

  return (
    <section className="py-24 bg-[#FAF8F5] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-px bg-[#C4956A]" />
              <span className="text-[#C4956A] text-sm font-medium tracking-widest uppercase">
                {dir === "rtl" ? "أعمالنا" : "Our Work"}
              </span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl text-[#1a2e28] leading-tight">
              {dir === "rtl" ? "مشاريع ملهمة" : "Inspiring Projects"}
            </h2>
            <p className="mt-3 text-[#5a7a70] text-lg max-w-lg">
              {dir === "rtl"
                ? "من الفلل الفاخرة إلى الفنادق الكبرى — أبواب سنديان تُكمل كل مشروع بلمسة استثنائية"
                : "From luxury villas to grand hotels — Sindian doors complete every project with an exceptional touch"}
            </p>
          </div>
          <Link href="/projects">
            <button className="group flex items-center gap-2 text-[#2C4A3E] font-medium border border-[#2C4A3E]/30 px-5 py-2.5 rounded-full hover:bg-[#2C4A3E] hover:text-white transition-all duration-300 whitespace-nowrap">
              <span>{dir === "rtl" ? "عرض جميع المشاريع" : "View All Projects"}</span>
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </button>
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                activeFilter === cat
                  ? "bg-[#2C4A3E] text-white shadow-sm"
                  : "bg-white text-[#5a7a70] border border-[#e8dfd0] hover:border-[#2C4A3E]/40"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Masonry Grid */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {filtered.map((project, index) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, delay: index * 0.07 }}
                className={`group relative overflow-hidden rounded-2xl cursor-pointer shadow-sm hover:shadow-xl transition-shadow duration-500 ${
                  project.size === "large" ? "md:col-span-1 lg:col-span-1" : ""
                } ${project.id === 1 ? "lg:col-span-2 lg:row-span-1" : ""}`}
                onClick={() => setLightboxProject(project)}
              >
                {/* Image */}
                <div className={`relative overflow-hidden ${project.id === 1 ? "h-80" : "h-64"}`}>
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />

                  {/* Featured badge */}
                  {project.featured && (
                    <div className="absolute top-4 right-4 bg-[#C4956A] text-white text-xs font-semibold px-3 py-1 rounded-full">
                      {dir === "rtl" ? "مشروع مميز" : "Featured Project"}
                    </div>
                  )}

                  {/* Open icon */}
                  <div className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <ArrowUpRight className="w-4 h-4 text-white" />
                  </div>

                  {/* Bottom content */}
                  <div className="absolute bottom-0 inset-x-0 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full mb-2 ${categoryColors[project.category] || "bg-white/20 text-white"}`}>
                          {project.category}
                        </span>
                        <h3 className="text-white font-semibold text-lg leading-tight">{project.title}</h3>
                        <div className="flex items-center gap-1 mt-1 text-white/70 text-sm">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{project.location}</span>
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <div className="text-white font-bold text-2xl">{project.doorsCount}</div>
                        <div className="text-white/60 text-xs">{dir === "rtl" ? "باب" : "doors"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Stats bar */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
          {(dir === "rtl" ? [
            { value: "500+", label: "مشروع منجز" },
            { value: "15,000+", label: "باب مُركَّب" },
            { value: "12", label: "مدينة سعودية" },
            { value: "98%", label: "رضا العملاء" },
          ] : [
            { value: "500+", label: "Completed Projects" },
            { value: "15,000+", label: "Doors Installed" },
            { value: "12", label: "Saudi Cities" },
            { value: "98%", label: "Client Satisfaction" },
          ]).map((stat) => (
            <div key={stat.label} className="text-center p-6 bg-white rounded-2xl border border-[#e8dfd0] shadow-sm">
              <div className="font-display text-3xl text-[#2C4A3E] mb-1">{stat.value}</div>
              <div className="text-[#5a7a70] text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setLightboxProject(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="bg-white rounded-3xl overflow-hidden max-w-3xl w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image */}
              <div className="relative h-72 md:h-96">
                <img
                  src={lightboxProject.image}
                  alt={lightboxProject.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <button
                  onClick={() => setLightboxProject(null)}
                  className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-4 right-4">
                  <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full ${categoryColors[lightboxProject.category] || "bg-white/20 text-white"}`}>
                    {lightboxProject.category}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 md:p-8">
                <h3 className="font-display text-2xl text-[#1a2e28] mb-2">{lightboxProject.title}</h3>
                <p className="text-[#5a7a70] leading-relaxed mb-6">{lightboxProject.description}</p>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="flex flex-col items-center p-3 bg-[#FAF8F5] rounded-xl">
                    <Building2 className="w-5 h-5 text-[#C4956A] mb-1" />
                    <div className="font-bold text-[#1a2e28]">{lightboxProject.doorsCount}</div>
                    <div className="text-xs text-[#5a7a70]">{dir === "rtl" ? "باب" : "doors"}</div>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-[#FAF8F5] rounded-xl">
                    <MapPin className="w-5 h-5 text-[#C4956A] mb-1" />
                    <div className="font-bold text-[#1a2e28] text-xs text-center">{lightboxProject.location.split(/،|,/)[0]}</div>
                    <div className="text-xs text-[#5a7a70]">{dir === "rtl" ? "الموقع" : "Location"}</div>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-[#FAF8F5] rounded-xl">
                    <Calendar className="w-5 h-5 text-[#C4956A] mb-1" />
                    <div className="font-bold text-[#1a2e28]">{lightboxProject.year}</div>
                    <div className="text-xs text-[#5a7a70]">{dir === "rtl" ? "السنة" : "Year"}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {lightboxProject.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-[#2C4A3E]/10 text-[#2C4A3E] px-3 py-1 rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Link href="/b2b">
                    <button className="flex-1 bg-[#2C4A3E] text-white py-3 rounded-xl font-medium hover:bg-[#1a2e28] transition-colors text-center">
                      {dir === "rtl" ? "طلب مشروع مماثل" : "Request Similar Project"}
                    </button>
                  </Link>
                  <Link href="/projects">
                    <button className="flex-1 border border-[#2C4A3E]/30 text-[#2C4A3E] py-3 rounded-xl font-medium hover:bg-[#2C4A3E]/5 transition-colors text-center">
                      {dir === "rtl" ? "عرض المزيد" : "View More"}
                    </button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
