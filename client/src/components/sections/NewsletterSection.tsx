/**
 * Design: Architectural Luxury - Warm Minimalism
 * Newsletter: Email subscription with elegant design
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export default function NewsletterSection() {
  const [email, setEmail] = useState("");
  const { dir } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      toast.success(
        dir === "rtl"
          ? "شكراً لاشتراكك! سنرسل لك أحدث العروض والمنتجات."
          : "Thank you for subscribing! We'll send you the latest offers and products."
      );
      setEmail("");
    }
  };

  return (
    <section className="py-16 bg-warm-white">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="w-14 h-14 rounded-full bg-oak/10 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-7 h-7 text-oak" />
          </div>
          <h3 className="text-2xl lg:text-3xl font-bold text-wood-dark mb-3">
            {dir === "rtl" ? "ابقَ على اطلاع" : "Stay Informed"}
          </h3>
          <p className="text-muted-foreground text-sm mb-8">
            {dir === "rtl"
              ? "اشترك في نشرتنا البريدية لتصلك أحدث المنتجات والعروض الحصرية"
              : "Subscribe to our newsletter to receive the latest products and exclusive offers"}
          </p>
          <form onSubmit={handleSubmit} className="flex gap-3 max-w-md mx-auto">
            <Input
              type="email"
              placeholder={dir === "rtl" ? "بريدك الإلكتروني" : "Your email address"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-sm border-border/50 bg-white"
              required
            />
            <Button
              type="submit"
              className="bg-oak hover:bg-oak-dark text-white rounded-sm gap-2 px-6 shrink-0"
            >
              {dir === "rtl" ? "اشترك" : "Subscribe"}
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </form>
        </motion.div>
      </div>
    </section>
  );
}
