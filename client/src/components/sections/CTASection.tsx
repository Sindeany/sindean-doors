/**
 * Design: Architectural Luxury - Warm Minimalism
 * CTA: Dual call-to-action for individuals and businesses
 */
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Building2, User, Truck } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export default function CTASection() {
  const { dir } = useLanguage();

  const individualItems = dir === "rtl"
    ? ["أسعار شفافة ومتدرجة", "شحن مجاني فوق 5,000 ر.س", "ضمان شامل على المنتجات"]
    : ["Transparent tiered pricing", "Free shipping over 5,000 SAR", "Comprehensive product warranty"];

  const businessItems = dir === "rtl"
    ? ["طلب عرض سعر مخصص", "إرسال أوامر شراء وتتبعها", "مدير حساب مخصص", "توصيل لموقع المشروع"]
    : ["Custom quote request", "Submit and track purchase orders", "Dedicated account manager", "Delivery to project site"];

  const distributorItems = dir === "rtl"
    ? ["بوابة إلكترونية خاصة", "إدارة الطلبات والمخزون", "تقارير وتحليلات مفصلة"]
    : ["Dedicated online portal", "Order and inventory management", "Detailed reports and analytics"];

  return (
    <section className="py-20 lg:py-28 bg-beige-light">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Individual CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-sm p-8 lg:p-10 border border-border/30 hover:shadow-lg transition-shadow duration-500"
          >
            <div className="w-14 h-14 rounded-sm bg-copper/10 flex items-center justify-center mb-6">
              <User className="w-7 h-7 text-copper" />
            </div>
            <h3 className="text-2xl font-bold text-wood-dark mb-3">
              {dir === "rtl" ? "للأفراد" : "For Individuals"}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              {dir === "rtl"
                ? "تصفح تشكيلتنا المتنوعة واختر الأبواب المناسبة لمنزلك. استفد من الأسعار المتدرجة عند شراء أكثر من باب."
                : "Browse our diverse collection and choose the right doors for your home. Benefit from tiered pricing when buying more than one door."}
            </p>
            <ul className="space-y-2 mb-8">
              {individualItems.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-foreground/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-copper" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              className="w-full bg-oak hover:bg-oak-dark text-white gap-2 rounded-sm"
              onClick={() => toast(dir === "rtl" ? "تصفح المنتجات قريباً" : "Browse products coming soon")}
            >
              {dir === "rtl" ? "تصفح المنتجات" : "Browse Products"}
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </motion.div>

          {/* Business CTA - Featured */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-oak text-white rounded-sm p-8 lg:p-10 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-copper" />
            <div className="relative">
              <div className="w-14 h-14 rounded-sm bg-white/10 flex items-center justify-center mb-6">
                <Building2 className="w-7 h-7 text-copper" />
              </div>
              <h3 className="text-2xl font-bold mb-3">
                {dir === "rtl" ? "للشركات والمشاريع" : "For Companies & Projects"}
              </h3>
              <p className="text-white/70 text-sm leading-relaxed mb-6">
                {dir === "rtl"
                  ? "حلول متكاملة للمقاولين والمطورين العقاريين. أسعار خاصة وخدمة مخصصة لمشاريعكم."
                  : "Integrated solutions for contractors and real estate developers. Special pricing and dedicated service for your projects."}
              </p>
              <ul className="space-y-2 mb-8">
                {businessItems.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-white/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-copper" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full bg-copper hover:bg-copper/90 text-white gap-2 rounded-sm"
                onClick={() => toast(dir === "rtl" ? "حلول الأعمال قريباً" : "Business solutions coming soon")}
              >
                {dir === "rtl" ? "طلب عرض سعر" : "Request Quote"}
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>

          {/* Distributor CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-sm p-8 lg:p-10 border border-border/30 hover:shadow-lg transition-shadow duration-500"
          >
            <div className="w-14 h-14 rounded-sm bg-oak/10 flex items-center justify-center mb-6">
              <Truck className="w-7 h-7 text-oak" />
            </div>
            <h3 className="text-2xl font-bold text-wood-dark mb-3">
              {dir === "rtl" ? "للموزعين" : "For Distributors"}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              {dir === "rtl"
                ? "انضم لشبكة موزعي سنديان واستفد من بوابة إلكترونية متكاملة لإدارة عملياتك وطلباتك."
                : "Join Sindian's distributor network and benefit from a comprehensive portal to manage your operations and orders."}
            </p>
            <ul className="space-y-2 mb-8">
              {distributorItems.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-foreground/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-oak" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="w-full border-oak text-oak hover:bg-oak hover:text-white gap-2 rounded-sm"
              onClick={() => toast(dir === "rtl" ? "بوابة الموزعين قريباً" : "Distributor portal coming soon")}
            >
              {dir === "rtl" ? "بوابة الموزعين" : "Distributor Portal"}
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>

        {/* Contact bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 bg-white rounded-sm border border-border/30 p-6 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-oak/10 flex items-center justify-center">
              <Phone className="w-5 h-5 text-oak" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {dir === "rtl" ? "تحتاج مساعدة؟ تواصل معنا" : "Need help? Contact us"}
              </p>
              <p className="text-lg font-bold text-wood-dark" dir="ltr">
                920-000-000
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {dir === "rtl" ? "السبت - الخميس: 8 صباحاً - 6 مساءً" : "Sat - Thu: 8 AM - 6 PM"}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
