/**
 * Design: Architectural Luxury - Warm Minimalism
 * Projects page: Full gallery of inspiring projects using Sindian doors
 * Colors: oak green (#2C4A3E), copper (#C4956A), warm beige, off-white
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  MapPin, Building2, Calendar, ArrowUpRight, X,
  Filter, Search, ChevronDown, Home, Hotel, Briefcase, Users, Landmark
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const allProjectsAr = [
  { id: 1, title: "فيلا النخيل الفاخرة", category: "فلل سكنية", location: "الرياض، حي النرجس", year: "2024", doorsCount: 24, doorType: "أبواب خارجية منحوتة", description: "تصميم استثنائي يجمع بين الأصالة العربية والفخامة المعاصرة. أبواب مزدوجة منحوتة يدوياً من خشب السنديان الأصيل مع تشطيبات نحاسية ذهبية.", image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-villa-luxury-R72sMRkF4TJn4wNhgER2fX.webp", featured: true, tags: ["فاخر", "منحوت", "سنديان", "خارجي"], client: "عائلة العتيبي", value: "٨٥,٠٠٠ ر.س" },
  { id: 2, title: "فندق الأفق الفاخر", category: "فنادق ومنتجعات", location: "جدة، كورنيش الهامبرا", year: "2023", doorsCount: 208, doorType: "أبواب لوبي وغرف فندقية", description: "بوابات ضخمة لردهة الفندق الرئيسية مع أبواب غرف مصممة خصيصاً لتعكس هوية العلامة التجارية الفاخرة.", image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-hotel-lobby-Tkn7nLAHxJg24jd9H6UTvn.webp", featured: true, tags: ["فندقي", "ضخم", "مخصص", "لوبي"], client: "مجموعة الأفق للضيافة", value: "٥٢٠,٠٠٠ ر.س" },
  { id: 3, title: "برج الأعمال المركزي", category: "مباني تجارية", location: "الرياض، طريق الملك فهد", year: "2024", doorsCount: 65, doorType: "أبواب مداخل تجارية", description: "مداخل رئيسية بتصميم معاصر يجمع بين الخشب الطبيعي والزجاج المقسى.", image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-office-tower-bvqDbyymkwgqjBnTAMAM6M.webp", featured: false, tags: ["تجاري", "معاصر", "زجاج", "مدخل"], client: "شركة الأعمال المتحدة", value: "٢٠٤,٠٠٠ ر.س" },
  { id: 4, title: "مجمع الأفق السكني", category: "مجمعات سكنية", location: "الرياض، حي العليا", year: "2023", doorsCount: 180, doorType: "أبواب فلل ومداخل", description: "مشروع ضخم يضم 45 فيلا سكنية فاخرة، كل فيلا بتصميم باب مميز.", image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-residential-compound-UVgPJqKAjZU9v4TJ5TNczM.webp", featured: false, tags: ["سكني", "جملة", "موحد", "مجمع"], client: "شركة الأفق للتطوير العقاري", value: "٣٤٢,٠٠٠ ر.س" },
  { id: 5, title: "مسجد النور الكبير", category: "مساجد ومنشآت دينية", location: "الدمام، حي الشاطئ", year: "2022", doorsCount: 12, doorType: "أبواب مسجد منحوتة", description: "أبواب ضخمة بنقوش إسلامية هندسية منحوتة يدوياً تعكس الجمال الروحاني والتراث الإسلامي الأصيل.", image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-mosque-Mh7YnNiXScmzmCfhPSf8tP.webp", featured: true, tags: ["ديني", "منحوت", "تراثي", "إسلامي"], client: "وزارة الشؤون الإسلامية", value: "١٨٠,٠٠٠ ر.س" },
  { id: 6, title: "فيلا الورد الملكية", category: "فلل سكنية", location: "جدة، حي الزهراء", year: "2024", doorsCount: 18, doorType: "أبواب داخلية وخارجية", description: "مزيج راقٍ من الأبواب الداخلية بتصميم كلاسيكي والأبواب الخارجية بنقوش زهرية.", image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-villa-luxury-R72sMRkF4TJn4wNhgER2fX.webp", featured: false, tags: ["فاخر", "كلاسيكي", "داخلي"], client: "عائلة الزهراني", value: "٦٥,٠٠٠ ر.س" },
  { id: 7, title: "مركز التسوق الذهبي", category: "مباني تجارية", location: "مكة المكرمة، العزيزية", year: "2023", doorsCount: 42, doorType: "أبواب محلات تجارية", description: "أبواب محلات تجارية فاخرة بتصميم موحد يعكس هوية المركز التجاري.", image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-office-tower-bvqDbyymkwgqjBnTAMAM6M.webp", featured: false, tags: ["تجاري", "تجزئة", "موحد"], client: "مجموعة الذهبي التجارية", value: "١٢٦,٠٠٠ ر.س" },
  { id: 8, title: "منتجع الواحة الخضراء", category: "فنادق ومنتجعات", location: "الطائف، الهضبة", year: "2022", doorsCount: 96, doorType: "أبواب شاليهات وغرف", description: "أبواب شاليهات منتجع طبيعي تجمع بين الخشب الدافئ والطابع الريفي الأصيل.", image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-hotel-lobby-Tkn7nLAHxJg24jd9H6UTvn.webp", featured: false, tags: ["منتجع", "طبيعي", "شاليه"], client: "شركة الواحة للسياحة", value: "٢٨٨,٠٠٠ ر.س" },
];

const allProjectsEn = [
  { id: 1, title: "Al-Nakheel Luxury Villa", category: "Residential Villas", location: "Riyadh, Al-Narjis District", year: "2024", doorsCount: 24, doorType: "Carved Exterior Doors", description: "An exceptional design combining Arab authenticity with contemporary luxury. Hand-carved double doors from genuine oak wood with golden copper finishes.", image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-villa-luxury-R72sMRkF4TJn4wNhgER2fX.webp", featured: true, tags: ["Luxury", "Carved", "Oak", "Exterior"], client: "Al-Otaibi Family", value: "SAR 85,000" },
  { id: 2, title: "Al-Ufuq Luxury Hotel", category: "Hotels & Resorts", location: "Jeddah, Al-Hamra Corniche", year: "2023", doorsCount: 208, doorType: "Lobby & Room Doors", description: "Grand lobby gates with custom-designed room doors reflecting the luxury brand identity, combining Islamic patterns with modern design.", image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-hotel-lobby-Tkn7nLAHxJg24jd9H6UTvn.webp", featured: true, tags: ["Hotel", "Large-scale", "Custom", "Lobby"], client: "Al-Ufuq Hospitality Group", value: "SAR 520,000" },
  { id: 3, title: "Central Business Tower", category: "Commercial Buildings", location: "Riyadh, King Fahd Road", year: "2024", doorsCount: 65, doorType: "Commercial Entrance Doors", description: "Main entrances with contemporary design combining natural wood and tempered glass, reflecting the building's professionalism.", image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-office-tower-bvqDbyymkwgqjBnTAMAM6M.webp", featured: false, tags: ["Commercial", "Contemporary", "Glass", "Entrance"], client: "United Business Co.", value: "SAR 204,000" },
  { id: 4, title: "Al-Ufuq Residential Compound", category: "Residential Compounds", location: "Riyadh, Al-Olaya District", year: "2023", doorsCount: 180, doorType: "Villa & Entrance Doors", description: "A large project comprising 45 luxury villas, each with a distinctive door design maintaining the compound's unified architectural identity.", image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-residential-compound-UVgPJqKAjZU9v4TJ5TNczM.webp", featured: false, tags: ["Residential", "Bulk", "Unified", "Compound"], client: "Al-Ufuq Real Estate", value: "SAR 342,000" },
  { id: 5, title: "Al-Nour Grand Mosque", category: "Mosques & Religious Facilities", location: "Dammam, Al-Shati District", year: "2022", doorsCount: 12, doorType: "Carved Mosque Doors", description: "Grand doors with hand-carved geometric Islamic patterns reflecting spiritual beauty and authentic Islamic heritage.", image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-mosque-Mh7YnNiXScmzmCfhPSf8tP.webp", featured: true, tags: ["Religious", "Carved", "Heritage", "Islamic"], client: "Ministry of Islamic Affairs", value: "SAR 180,000" },
  { id: 6, title: "Royal Rose Villa", category: "Residential Villas", location: "Jeddah, Al-Zahra District", year: "2024", doorsCount: 18, doorType: "Interior & Exterior Doors", description: "An elegant blend of classic interior doors and exterior doors with floral carvings inspired by the villa's name.", image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-villa-luxury-R72sMRkF4TJn4wNhgER2fX.webp", featured: false, tags: ["Luxury", "Classic", "Interior"], client: "Al-Zahrani Family", value: "SAR 65,000" },
  { id: 7, title: "Golden Shopping Center", category: "Commercial Buildings", location: "Makkah, Al-Aziziyah", year: "2023", doorsCount: 42, doorType: "Retail Store Doors", description: "Luxury retail store doors with a unified design reflecting the mall's identity while giving each store a distinctive touch.", image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-office-tower-bvqDbyymkwgqjBnTAMAM6M.webp", featured: false, tags: ["Commercial", "Retail", "Unified"], client: "Al-Dhahabi Commercial Group", value: "SAR 126,000" },
  { id: 8, title: "Green Oasis Resort", category: "Hotels & Resorts", location: "Taif, Al-Hadaba", year: "2022", doorsCount: 96, doorType: "Chalet & Room Doors", description: "Natural resort chalet doors combining warm wood with authentic rustic character, blending with the stunning natural surroundings.", image: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/project-hotel-lobby-Tkn7nLAHxJg24jd9H6UTvn.webp", featured: false, tags: ["Resort", "Natural", "Chalet"], client: "Al-Waha Tourism Co.", value: "SAR 288,000" },
];

const categoryIconsAr: Record<string, React.ReactNode> = {
  "فلل سكنية": <Home className="w-4 h-4" />,
  "فنادق ومنتجعات": <Hotel className="w-4 h-4" />,
  "مباني تجارية": <Briefcase className="w-4 h-4" />,
  "مجمعات سكنية": <Users className="w-4 h-4" />,
  "مساجد ومنشآت دينية": <Landmark className="w-4 h-4" />,
};

const categoryIconsEn: Record<string, React.ReactNode> = {
  "Residential Villas": <Home className="w-4 h-4" />,
  "Hotels & Resorts": <Hotel className="w-4 h-4" />,
  "Commercial Buildings": <Briefcase className="w-4 h-4" />,
  "Residential Compounds": <Users className="w-4 h-4" />,
  "Mosques & Religious Facilities": <Landmark className="w-4 h-4" />,
};

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

export default function Projects() {
  const { dir } = useLanguage();

  const allProjects = dir === "rtl" ? allProjectsAr : allProjectsEn;
  const categoryIcons = dir === "rtl" ? categoryIconsAr : categoryIconsEn;
  const categoryColors = dir === "rtl" ? categoryColorsAr : categoryColorsEn;

  const allLabel = dir === "rtl" ? "الكل" : "All";
  const newestLabel = dir === "rtl" ? "الأحدث" : "Newest";
  const largestLabel = dir === "rtl" ? "الأكبر" : "Largest";
  const featuredLabel = dir === "rtl" ? "المميزة" : "Featured";

  const categoriesAr = ["الكل", "فلل سكنية", "فنادق ومنتجعات", "مباني تجارية", "مجمعات سكنية", "مساجد ومنشآت دينية"];
  const categoriesEn = ["All", "Residential Villas", "Hotels & Resorts", "Commercial Buildings", "Residential Compounds", "Mosques & Religious Facilities"];
  const categories = dir === "rtl" ? categoriesAr : categoriesEn;

  const [activeFilter, setActiveFilter] = useState(allLabel);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState(newestLabel);
  const [lightboxProject, setLightboxProject] = useState<typeof allProjects[0] | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const filtered = allProjects
    .filter((p) => activeFilter === allLabel || p.category === activeFilter)
    .filter((p) =>
      searchQuery === "" ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === newestLabel) return parseInt(b.year) - parseInt(a.year);
      if (sortBy === largestLabel) return b.doorsCount - a.doorsCount;
      if (sortBy === featuredLabel) return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      return 0;
    });

  const totalDoors = allProjects.reduce((s, p) => s + p.doorsCount, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5]" dir={dir}>
      <Navbar />

      {/* Hero Banner */}
      <section className="relative bg-[#1a2e28] py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(45deg, #C4956A 0, #C4956A 1px, transparent 0, transparent 50%)", backgroundSize: "20px 20px" }} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-px bg-[#C4956A]" />
            <span className="text-[#C4956A] text-sm font-medium tracking-widest uppercase">
              {dir === "rtl" ? "معرض أعمالنا" : "Our Portfolio"}
            </span>
          </div>
          <h1 className="font-display text-5xl md:text-6xl text-white mb-4">
            {dir === "rtl" ? "المشاريع الملهمة" : "Inspiring Projects"}
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mb-10">
            {dir === "rtl"
              ? `أكثر من ${allProjects.length} مشروع متميز، ${totalDoors.toLocaleString("ar-SA")} باب مُركَّب في أرقى المشاريع السعودية`
              : `More than ${allProjects.length} distinguished projects, ${totalDoors.toLocaleString()} doors installed in Saudi Arabia's finest developments`}
          </p>
          <div className="flex flex-wrap gap-8">
            {(dir === "rtl" ? [
              { value: "500+", label: "مشروع منجز" },
              { value: "15,000+", label: "باب مُركَّب" },
              { value: "12", label: "مدينة" },
              { value: "98%", label: "رضا العملاء" },
            ] : [
              { value: "500+", label: "Completed Projects" },
              { value: "15,000+", label: "Doors Installed" },
              { value: "12", label: "Cities" },
              { value: "98%", label: "Client Satisfaction" },
            ]).map((s) => (
              <div key={s.label}>
                <div className="font-display text-3xl text-[#C4956A]">{s.value}</div>
                <div className="text-white/50 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a7a70]" />
              <input
                type="text"
                placeholder={dir === "rtl" ? "ابحث باسم المشروع أو الموقع..." : "Search by project name or location..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 border border-[#e8dfd0] rounded-xl bg-white text-[#1a2e28] placeholder:text-[#5a7a70]/60 focus:outline-none focus:ring-2 focus:ring-[#2C4A3E]/20"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-2 px-4 py-2.5 border border-[#e8dfd0] rounded-xl bg-white text-[#1a2e28] hover:border-[#2C4A3E]/40 transition-colors"
              >
                <Filter className="w-4 h-4 text-[#5a7a70]" />
                <span className="text-sm">{sortBy}</span>
                <ChevronDown className="w-4 h-4 text-[#5a7a70]" />
              </button>
              {showSortMenu && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-[#e8dfd0] rounded-xl shadow-lg z-10 min-w-[140px]">
                  {[newestLabel, largestLabel, featuredLabel].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => { setSortBy(opt); setShowSortMenu(false); }}
                      className={`w-full text-start px-4 py-2.5 text-sm hover:bg-[#FAF8F5] transition-colors first:rounded-t-xl last:rounded-b-xl ${sortBy === opt ? "text-[#2C4A3E] font-medium" : "text-[#5a7a70]"}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeFilter === cat
                    ? "bg-[#2C4A3E] text-white shadow-sm"
                    : "bg-white text-[#5a7a70] border border-[#e8dfd0] hover:border-[#2C4A3E]/40"
                }`}
              >
                {cat !== allLabel && categoryIcons[cat]}
                <span>{cat}</span>
                {cat !== allLabel && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeFilter === cat ? "bg-white/20" : "bg-[#2C4A3E]/10 text-[#2C4A3E]"}`}>
                    {allProjects.filter((p) => p.category === cat).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Results count */}
          <p className="text-[#5a7a70] text-sm mb-6">
            {dir === "rtl"
              ? <>{" عرض "}<span className="font-semibold text-[#1a2e28]">{filtered.length}</span>{" مشروع"}</>
              : <>{"Showing "}<span className="font-semibold text-[#1a2e28]">{filtered.length}</span>{" project(s)"}</>}
          </p>

          {/* Projects Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-[#5a7a70]">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{dir === "rtl" ? "لا توجد مشاريع تطابق بحثك" : "No projects match your search"}</p>
            </div>
          ) : (
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filtered.map((project, index) => (
                  <motion.div
                    key={project.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.35, delay: index * 0.06 }}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer border border-[#e8dfd0]/50"
                    onClick={() => setLightboxProject(project)}
                  >
                    <div className="relative h-56 overflow-hidden">
                      <img src={project.image} alt={project.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      {project.featured && (
                        <div className="absolute top-3 right-3 bg-[#C4956A] text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                          {dir === "rtl" ? "مميز" : "Featured"}
                        </div>
                      )}
                      <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <ArrowUpRight className="w-4 h-4 text-white" />
                      </div>
                      <div className="absolute bottom-3 right-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${categoryColors[project.category]}`}>
                          {project.category}
                        </span>
                      </div>
                    </div>

                    <div className="p-5">
                      <h3 className="font-semibold text-[#1a2e28] text-lg mb-1">{project.title}</h3>
                      <div className="flex items-center gap-1 text-[#5a7a70] text-sm mb-3">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{project.location}</span>
                      </div>
                      <p className="text-[#5a7a70] text-sm leading-relaxed line-clamp-2 mb-4">{project.description}</p>
                      <div className="flex items-center justify-between pt-3 border-t border-[#e8dfd0]">
                        <div className="flex items-center gap-3 text-sm text-[#5a7a70]">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {project.doorsCount} {dir === "rtl" ? "باب" : "doors"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {project.year}
                          </span>
                        </div>
                        <span className="text-[#C4956A] font-semibold text-sm">{project.value}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {/* CTA */}
          <div className="mt-16 bg-[#1a2e28] rounded-3xl p-10 text-center">
            <h3 className="font-display text-3xl text-white mb-3">
              {dir === "rtl" ? "هل لديك مشروع مماثل؟" : "Have a Similar Project?"}
            </h3>
            <p className="text-white/60 mb-8 max-w-xl mx-auto">
              {dir === "rtl"
                ? "فريقنا جاهز لتصميم الأبواب المثالية لمشروعك — من الفلل الخاصة إلى المشاريع الضخمة"
                : "Our team is ready to design the perfect doors for your project — from private villas to large-scale developments"}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/b2b">
                <button className="bg-[#C4956A] text-white px-8 py-3 rounded-full font-medium hover:bg-[#b8845a] transition-colors">
                  {dir === "rtl" ? "طلب عرض سعر" : "Request a Quote"}
                </button>
              </Link>
              <Link href="/products">
                <button className="border border-white/30 text-white px-8 py-3 rounded-full font-medium hover:bg-white/10 transition-colors">
                  {dir === "rtl" ? "تصفح المنتجات" : "Browse Products"}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Lightbox */}
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
              className="bg-white rounded-3xl overflow-hidden max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              dir={dir}
            >
              <div className="relative h-72 md:h-96">
                <img src={lightboxProject.image} alt={lightboxProject.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <button
                  onClick={() => setLightboxProject(null)}
                  className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                {lightboxProject.featured && (
                  <div className="absolute top-4 right-4 bg-[#C4956A] text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {dir === "rtl" ? "مشروع مميز" : "Featured Project"}
                  </div>
                )}
                <div className="absolute bottom-4 right-4">
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${categoryColors[lightboxProject.category]}`}>
                    {lightboxProject.category}
                  </span>
                </div>
              </div>

              <div className="p-6 md:p-8">
                <h3 className="font-display text-2xl text-[#1a2e28] mb-1">{lightboxProject.title}</h3>
                <div className="flex items-center gap-1 text-[#5a7a70] text-sm mb-4">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{lightboxProject.location}</span>
                </div>
                <p className="text-[#5a7a70] leading-relaxed mb-6">{lightboxProject.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[
                    { icon: <Building2 className="w-4 h-4 text-[#C4956A]" />, value: lightboxProject.doorsCount.toString(), label: dir === "rtl" ? "باب مُركَّب" : "Doors Installed" },
                    { icon: <Calendar className="w-4 h-4 text-[#C4956A]" />, value: lightboxProject.year, label: dir === "rtl" ? "سنة التنفيذ" : "Year" },
                    { icon: <Users className="w-4 h-4 text-[#C4956A]" />, value: lightboxProject.client, label: dir === "rtl" ? "العميل" : "Client", small: true },
                    { icon: <Briefcase className="w-4 h-4 text-[#C4956A]" />, value: lightboxProject.value, label: dir === "rtl" ? "قيمة المشروع" : "Project Value" },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center p-3 bg-[#FAF8F5] rounded-xl text-center">
                      <div className="mb-1">{item.icon}</div>
                      <div className={`font-bold text-[#1a2e28] ${item.small ? "text-xs" : "text-sm"}`}>{item.value}</div>
                      <div className="text-xs text-[#5a7a70]">{item.label}</div>
                    </div>
                  ))}
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
                  <Link href="/products">
                    <button className="flex-1 border border-[#2C4A3E]/30 text-[#2C4A3E] py-3 rounded-xl font-medium hover:bg-[#2C4A3E]/5 transition-colors text-center">
                      {dir === "rtl" ? "تصفح المنتجات" : "Browse Products"}
                    </button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
