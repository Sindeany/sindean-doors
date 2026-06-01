/**
 * Design: Architectural Luxury - Warm Minimalism
 * Home page: Assembles all sections for the Sindian Doors landing page
 */
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/sections/HeroSection";
import TrustBanner from "@/components/sections/TrustBanner";
import CategoriesSection from "@/components/sections/CategoriesSection";
import PricingExplainer from "@/components/sections/PricingExplainer";
import FeaturedProducts from "@/components/sections/FeaturedProducts";
import B2BSection from "@/components/sections/B2BSection";
import CraftsmanshipSection from "@/components/sections/CraftsmanshipSection";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import InspiringProjectsSection from "@/components/sections/InspiringProjectsSection";
import CTASection from "@/components/sections/CTASection";
import FAQSection from "@/components/sections/FAQSection";
import NewsletterSection from "@/components/sections/NewsletterSection";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main>
        <HeroSection />
        <TrustBanner />
        <CategoriesSection />
        <PricingExplainer />
        <FeaturedProducts />
        <B2BSection />
        <CraftsmanshipSection />
        <InspiringProjectsSection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
        <NewsletterSection />
      </main>
      <Footer />
    </div>
  );
}
