/**
 * Design: Architectural Luxury - Warm Minimalism
 * B2B Section: Professional section for business clients
 * Uses generated B2B meeting image
 */
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  FileText,
  ClipboardList,
  TrendingDown,
  Truck,
  ArrowLeft,
  Building2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const B2B_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/b2b-meeting-gkHbhRSeyZMMMij8WjXDrG.webp";

export default function B2BSection() {
  const { dir } = useLanguage();

  const features = dir === "rtl" ? [
    { icon: FileText, title: "طلب عرض سعر", description: "أرسل متطلباتك واحصل على عرض سعر مفصل خلال 24 ساعة" },
    { icon: ClipboardList, title: "أوامر شراء", description: "أرسل أمر الشراء مباشرة وتابع حالته من حسابك" },
    { icon: TrendingDown, title: "أسعار خاصة", description: "أسعار تنافسية متدرجة حسب حجم الطلب والشراكة" },
    { icon: Truck, title: "توصيل للمشاريع", description: "خدمة توصيل مباشرة لموقع المشروع في جميع المناطق" },
  ] : [
    { icon: FileText, title: "Request for Quote", description: "Send your requirements and get a detailed quote within 24 hours" },
    { icon: ClipboardList, title: "Purchase Orders", description: "Submit your purchase order directly and track its status from your account" },
    { icon: TrendingDown, title: "Special Pricing", description: "Competitive tiered pricing based on order volume and partnership level" },
    { icon: Truck, title: "Project Delivery", description: "Direct delivery to your project site across all regions" },
  ];

  const stats = dir === "rtl" ? [
    { icon: Building2, value: "+200", label: "شركة شريكة" },
    { icon: Users, value: "+50", label: "موزع معتمد" },
  ] : [
    { icon: Building2, value: "+200", label: "Partner Companies" },
    { icon: Users, value: "+50", label: "Certified Distributors" },
  ];

  return (
    <section className="py-20 lg:py-28 bg-white overflow-hidden">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image side */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative order-2 lg:order-1"
          >
            <div className="relative rounded-sm overflow-hidden">
              <img
                src={B2B_IMAGE}
                alt={dir === "rtl" ? "اجتماع عمل مع فريق سنديان" : "Business meeting with Sindian team"}
                className="w-full h-auto object-cover aspect-[4/3]"
              />
              {/* Floating stats card */}
              <div className="absolute -bottom-6 -left-6 lg:left-auto lg:-right-6 bg-white rounded-sm shadow-xl p-5 border border-border/30">
                <div className="flex gap-6">
                  {stats.map((stat) => (
                    <div key={stat.label} className="text-center">
                      <stat.icon className="w-5 h-5 text-copper mx-auto mb-2" />
                      <div className="text-2xl font-bold text-oak">{stat.value}</div>
                      <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Decorative copper line */}
            <div className="absolute -top-4 -right-4 w-24 h-24 border-t-2 border-r-2 border-copper/30 rounded-sm" />
          </motion.div>

          {/* Content side */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="order-1 lg:order-2"
          >
            <span className="text-copper text-sm font-semibold tracking-wider mb-3 block">
              {dir === "rtl" ? "حلول الأعمال" : "Business Solutions"}
            </span>
            <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-wood-dark leading-tight mb-6">
              {dir === "rtl" ? (
                <>شريكك المثالي<br /><span className="text-oak">للمشاريع والأعمال</span></>
              ) : (
                <>Your Ideal Partner<br /><span className="text-oak">for Projects & Business</span></>
              )}
            </h2>
            <p className="text-muted-foreground text-base lg:text-lg leading-relaxed mb-10">
              {dir === "rtl"
                ? "نقدم حلولاً متكاملة للشركات والمقاولين والمطورين العقاريين. من طلب عروض الأسعار إلى التوريد والتركيب، نحن شريكك في كل خطوة."
                : "We provide integrated solutions for companies, contractors, and real estate developers. From RFQs to supply and installation, we are your partner every step of the way."}
            </p>

            {/* Features grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-4 p-4 rounded-sm bg-beige-light/50 border border-border/30"
                >
                  <div className="w-10 h-10 rounded-sm bg-oak/10 flex items-center justify-center shrink-0">
                    <feature.icon className="w-5 h-5 text-oak" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-wood-dark text-sm mb-1">{feature.title}</h4>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <Button
                className="bg-oak hover:bg-oak-dark text-white gap-2 rounded-sm px-8"
                onClick={() => toast(dir === "rtl" ? "طلب عرض سعر قريباً" : "RFQ coming soon")}
              >
                {dir === "rtl" ? "طلب عرض سعر" : "Request Quote"}
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                className="border-oak text-oak hover:bg-oak hover:text-white gap-2 rounded-sm"
                onClick={() => toast(dir === "rtl" ? "بوابة الموزعين قريباً" : "Distributor portal coming soon")}
              >
                {dir === "rtl" ? "بوابة الموزعين" : "Distributor Portal"}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
