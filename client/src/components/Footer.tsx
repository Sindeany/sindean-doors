/**
 * Design: Architectural Luxury - Warm Minimalism
 * Footer: Deep oak green background with copper accents, organized columns
 * Bilingual: uses useLanguage()
 */
import { Link } from "wouter";
import { MapPin, Phone, Mail, Clock, ArrowUpLeft, ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Footer() {
  const { dir, t } = useLanguage();
  const ArrowIcon = dir === "rtl" ? ArrowUpLeft : ArrowUpRight;

  const footerLinks = {
    products: {
      title: dir === "rtl" ? "المنتجات" : "Products",
      links: [
        { label: dir === "rtl" ? "أبواب داخلية" : "Interior Doors", href: "/products" },
        { label: dir === "rtl" ? "أبواب خارجية" : "Exterior Doors", href: "/products" },
        { label: dir === "rtl" ? "أبواب مقاومة للحريق" : "Fire-Resistant Doors", href: "/products" },
        { label: dir === "rtl" ? "أبواب عازلة للصوت" : "Acoustic Doors", href: "/products" },
        { label: dir === "rtl" ? "مستلزمات الأبواب" : "Door Accessories", href: "/products" },
      ],
    },
    business: {
      title: dir === "rtl" ? "حلول الأعمال" : "Business Solutions",
      links: [
        { label: dir === "rtl" ? "طلب عرض سعر" : "Request a Quote", href: "/b2b" },
        { label: dir === "rtl" ? "أوامر الشراء" : "Purchase Orders", href: "/b2b" },
        { label: dir === "rtl" ? "بوابة الموزعين" : "Distributor Portal", href: "/distributor" },
        { label: dir === "rtl" ? "المشاريع الكبرى" : "Large Projects", href: "/b2b" },
        { label: dir === "rtl" ? "برنامج الشراكة" : "Partnership Program", href: "/b2b" },
      ],
    },
    company: {
      title: dir === "rtl" ? "الشركة" : "Company",
      links: [
        { label: dir === "rtl" ? "من نحن" : "About Us", href: "/about" },
        { label: dir === "rtl" ? "مصنعنا" : "Our Factory", href: "/about" },
        { label: dir === "rtl" ? "الجودة والشهادات" : "Quality & Certifications", href: "/about" },
        { label: dir === "rtl" ? "المشاريع" : "Projects", href: "/projects" },
        { label: dir === "rtl" ? "تواصل معنا" : "Contact Us", href: "/contact" },
      ],
    },
  };

  return (
    <footer className="bg-oak text-white">
      {/* Main footer */}
      <div className="container py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-sm bg-white/10 flex items-center justify-center">
                <svg viewBox="0 0 40 40" className="w-7 h-7 text-copper" fill="currentColor">
                  <path d="M20 4C20 4 28 10 28 20C28 30 20 36 20 36C20 36 12 30 12 20C12 10 20 4 20 4Z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold">
                  {dir === "rtl" ? "سنديان للأبواب" : "Sindian Doors"}
                </h3>
                <p className="text-white/50 text-xs tracking-widest">SINDIAN DOORS</p>
              </div>
            </div>
            <p className="text-white/70 text-sm leading-relaxed mb-8 max-w-sm">
              {dir === "rtl"
                ? "نصنع أبواباً خشبية فاخرة تجمع بين الحرفية التقليدية والتقنيات الحديثة. نخدم الأفراد والشركات والمشاريع في جميع أنحاء المملكة العربية السعودية."
                : "We craft premium wooden doors that blend traditional craftsmanship with modern technology. Serving individuals, businesses, and projects across Saudi Arabia."}
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-white/70">
                <MapPin className="w-4 h-4 text-copper shrink-0" />
                <span>{dir === "rtl" ? "الرياض، المملكة العربية السعودية" : "Riyadh, Saudi Arabia"}</span>
              </div>
              <div className="flex items-center gap-3 text-white/70">
                <Phone className="w-4 h-4 text-copper shrink-0" />
                <span dir="ltr">920-000-000</span>
              </div>
              <div className="flex items-center gap-3 text-white/70">
                <Mail className="w-4 h-4 text-copper shrink-0" />
                <span>info@sindian.sa</span>
              </div>
              <div className="flex items-center gap-3 text-white/70">
                <Clock className="w-4 h-4 text-copper shrink-0" />
                <span>{dir === "rtl" ? "السبت - الخميس: 8 ص - 6 م" : "Sat – Thu: 8 AM – 6 PM"}</span>
              </div>
            </div>
          </div>

          {/* Link columns */}
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h4 className="font-semibold text-base mb-5 text-white">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-white/60 hover:text-copper text-sm transition-colors duration-300 flex items-center gap-1 group"
                    >
                      <ArrowIcon className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Copper divider */}
      <div className="copper-line mx-8"></div>

      {/* Bottom bar */}
      <div className="container py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/50">
          <p>
            {dir === "rtl"
              ? `جميع الحقوق محفوظة © ${new Date().getFullYear()} سنديان للأبواب`
              : `© ${new Date().getFullYear()} Sindian Doors. All rights reserved.`}
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-copper transition-colors">
              {dir === "rtl" ? "سياسة الخصوصية" : "Privacy Policy"}
            </Link>
            <Link href="/terms" className="hover:text-copper transition-colors">
              {dir === "rtl" ? "الشروط والأحكام" : "Terms & Conditions"}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
