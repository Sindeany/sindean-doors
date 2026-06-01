/**
 * Contact Page - صفحة تواصل معنا
 * Design: Architectural Luxury | أخضر السنديان + بيج دافئ + نحاسي
 * Sections: Hero → Contact Cards → Form + Hours → Map + Branches → FAQ CTA
 */

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  Building2,
  ChevronLeft,
  ChevronDown,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Truck,
  User,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapView } from "@/components/Map";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

const branchesAr = [
  { id: 1, name: "الفرع الرئيسي - الرياض", city: "الرياض", address: "طريق الملك فهد، حي العليا، الرياض ١٢٢١٤", phone: "920-000-001", email: "riyadh@sindian.sa", hours: "الأحد - الخميس: ٨ص - ٦م", lat: 24.7136, lng: 46.6753, type: "main", badge: "المقر الرئيسي" },
  { id: 2, name: "فرع جدة", city: "جدة", address: "شارع التحلية، حي الروضة، جدة ٢٣٤٣٢", phone: "920-000-002", email: "jeddah@sindian.sa", hours: "الأحد - الخميس: ٩ص - ٧م", lat: 21.5433, lng: 39.1728, type: "branch", badge: null },
  { id: 3, name: "فرع الدمام", city: "الدمام", address: "طريق الملك عبدالعزيز، حي الفيصلية، الدمام ٣٢٢٣٢", phone: "920-000-003", email: "dammam@sindian.sa", hours: "الأحد - الخميس: ٨ص - ٥م", lat: 26.4207, lng: 50.0888, type: "branch", badge: null },
  { id: 4, name: "فرع المدينة المنورة", city: "المدينة المنورة", address: "طريق الملك عبدالله، حي العزيزية، المدينة المنورة", phone: "920-000-004", email: "madinah@sindian.sa", hours: "الأحد - الخميس: ٩ص - ٦م", lat: 24.5247, lng: 39.5692, type: "branch", badge: null },
  { id: 5, name: "فرع مكة المكرمة", city: "مكة المكرمة", address: "شارع إبراهيم الخليل، حي العزيزية، مكة المكرمة", phone: "920-000-005", email: "makkah@sindian.sa", hours: "الأحد - الخميس: ٩ص - ٦م", lat: 21.3891, lng: 39.8579, type: "branch", badge: null },
  { id: 6, name: "فرع أبها", city: "أبها", address: "طريق الملك فيصل، حي المنهل، أبها", phone: "920-000-006", email: "abha@sindian.sa", hours: "الأحد - الخميس: ٩ص - ٥م", lat: 18.2164, lng: 42.5053, type: "branch", badge: null },
];

const branchesEn = [
  { id: 1, name: "Main Branch - Riyadh", city: "Riyadh", address: "King Fahd Road, Al-Olaya District, Riyadh 12214", phone: "920-000-001", email: "riyadh@sindian.sa", hours: "Sun - Thu: 8AM - 6PM", lat: 24.7136, lng: 46.6753, type: "main", badge: "Headquarters" },
  { id: 2, name: "Jeddah Branch", city: "Jeddah", address: "Al-Tahlia Street, Al-Rawdah District, Jeddah 23432", phone: "920-000-002", email: "jeddah@sindian.sa", hours: "Sun - Thu: 9AM - 7PM", lat: 21.5433, lng: 39.1728, type: "branch", badge: null },
  { id: 3, name: "Dammam Branch", city: "Dammam", address: "King Abdulaziz Road, Al-Faisaliyah District, Dammam 32232", phone: "920-000-003", email: "dammam@sindian.sa", hours: "Sun - Thu: 8AM - 5PM", lat: 26.4207, lng: 50.0888, type: "branch", badge: null },
  { id: 4, name: "Madinah Branch", city: "Madinah", address: "King Abdullah Road, Al-Aziziyah District, Madinah", phone: "920-000-004", email: "madinah@sindian.sa", hours: "Sun - Thu: 9AM - 6PM", lat: 24.5247, lng: 39.5692, type: "branch", badge: null },
  { id: 5, name: "Makkah Branch", city: "Makkah", address: "Ibrahim Al-Khalil Street, Al-Aziziyah District, Makkah", phone: "920-000-005", email: "makkah@sindian.sa", hours: "Sun - Thu: 9AM - 6PM", lat: 21.3891, lng: 39.8579, type: "branch", badge: null },
  { id: 6, name: "Abha Branch", city: "Abha", address: "King Faisal Road, Al-Manhal District, Abha", phone: "920-000-006", email: "abha@sindian.sa", hours: "Sun - Thu: 9AM - 5PM", lat: 18.2164, lng: 42.5053, type: "branch", badge: null },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

export default function Contact() {
  const { dir } = useLanguage();
  const branches = dir === "rtl" ? branchesAr : branchesEn;

  const [selectedBranch, setSelectedBranch] = useState(branches[0]);
  const [formData, setFormData] = useState({ name: "", company: "", phone: "", email: "", inquiryType: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  const contactChannels = dir === "rtl" ? [
    { icon: Phone, title: "اتصل بنا", value: "920-000-000", sub: "خط الدعم الرئيسي", action: "tel:+966920000000", color: "text-[#2C4A3E]", bg: "bg-[#2C4A3E]/10" },
    { icon: MessageCircle, title: "واتساب", value: "050-000-0000", sub: "رد فوري خلال دقائق", action: "https://wa.me/966500000000", color: "text-[#25D366]", bg: "bg-[#25D366]/10" },
    { icon: Mail, title: "البريد الإلكتروني", value: "info@sindian.sa", sub: "رد خلال ٢٤ ساعة", action: "mailto:info@sindian.sa", color: "text-[#C4956A]", bg: "bg-[#C4956A]/10" },
    { icon: Building2, title: "بوابة الشركات", value: "حلول B2B", sub: "طلبات الجملة والمشاريع", action: "/b2b", color: "text-[#2C4A3E]", bg: "bg-[#2C4A3E]/10" },
  ] : [
    { icon: Phone, title: "Call Us", value: "920-000-000", sub: "Main Support Line", action: "tel:+966920000000", color: "text-[#2C4A3E]", bg: "bg-[#2C4A3E]/10" },
    { icon: MessageCircle, title: "WhatsApp", value: "050-000-0000", sub: "Instant reply within minutes", action: "https://wa.me/966500000000", color: "text-[#25D366]", bg: "bg-[#25D366]/10" },
    { icon: Mail, title: "Email", value: "info@sindian.sa", sub: "Reply within 24 hours", action: "mailto:info@sindian.sa", color: "text-[#C4956A]", bg: "bg-[#C4956A]/10" },
    { icon: Building2, title: "Company Portal", value: "B2B Solutions", sub: "Bulk orders & projects", action: "/b2b", color: "text-[#2C4A3E]", bg: "bg-[#2C4A3E]/10" },
  ];

  const inquiryTypes = dir === "rtl" ? [
    { value: "general", label: "استفسار عام" },
    { value: "product", label: "استفسار عن منتج" },
    { value: "quote", label: "طلب عرض سعر" },
    { value: "order", label: "متابعة طلب" },
    { value: "complaint", label: "شكوى أو ملاحظة" },
    { value: "partnership", label: "طلب شراكة أو توزيع" },
    { value: "project", label: "استشارة مشروع" },
  ] : [
    { value: "general", label: "General Inquiry" },
    { value: "product", label: "Product Inquiry" },
    { value: "quote", label: "Request a Quote" },
    { value: "order", label: "Order Follow-up" },
    { value: "complaint", label: "Complaint or Feedback" },
    { value: "partnership", label: "Partnership or Distribution" },
    { value: "project", label: "Project Consultation" },
  ];

  const workingHours = dir === "rtl" ? [
    { day: "الأحد - الخميس", hours: "٨:٠٠ ص - ٦:٠٠ م", active: true },
    { day: "الجمعة", hours: "مغلق", active: false },
    { day: "السبت", hours: "١٠:٠٠ ص - ٤:٠٠ م", active: true },
    { day: "المعارض والمناسبات", hours: "حسب الجدول", active: true },
  ] : [
    { day: "Sunday - Thursday", hours: "8:00 AM - 6:00 PM", active: true },
    { day: "Friday", hours: "Closed", active: false },
    { day: "Saturday", hours: "10:00 AM - 4:00 PM", active: true },
    { day: "Exhibitions & Events", hours: "As scheduled", active: true },
  ];

  const responseItems = dir === "rtl" ? [
    { icon: Phone, label: "رد هاتفي", value: "فوري", color: "text-[#2C4A3E]", bg: "bg-[#2C4A3E]/10" },
    { icon: MessageCircle, label: "واتساب", value: "< ١٠ دقائق", color: "text-[#25D366]", bg: "bg-[#25D366]/10" },
    { icon: Mail, label: "بريد إلكتروني", value: "< ٢٤ ساعة", color: "text-[#C4956A]", bg: "bg-[#C4956A]/10" },
    { icon: Truck, label: "زيارة ميدانية", value: "بالموعد", color: "text-[#2C4A3E]", bg: "bg-[#2C4A3E]/10" },
  ] : [
    { icon: Phone, label: "Phone", value: "Instant", color: "text-[#2C4A3E]", bg: "bg-[#2C4A3E]/10" },
    { icon: MessageCircle, label: "WhatsApp", value: "< 10 min", color: "text-[#25D366]", bg: "bg-[#25D366]/10" },
    { icon: Mail, label: "Email", value: "< 24 hrs", color: "text-[#C4956A]", bg: "bg-[#C4956A]/10" },
    { icon: Truck, label: "Site Visit", value: "By appointment", color: "text-[#2C4A3E]", bg: "bg-[#2C4A3E]/10" },
  ];

  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];
    branches.forEach((branch) => {
      const pinEl = document.createElement("div");
      pinEl.style.cssText = `width:36px;height:36px;background:${branch.type==="main"?"#C4956A":"#2C4A3E"};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);cursor:pointer;`;
      const marker = new google.maps.marker.AdvancedMarkerElement({ map, position: { lat: branch.lat, lng: branch.lng }, title: branch.name, content: pinEl });
      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="font-family:sans-serif;padding:8px;min-width:200px;"><div style="font-weight:bold;color:#1A2E28;margin-bottom:4px;font-size:14px;">${branch.name}</div><div style="color:#6B7280;font-size:12px;margin-bottom:4px;">${branch.address}</div><div style="color:#2C4A3E;font-size:12px;font-weight:600;">${branch.phone}</div></div>`,
      });
      marker.addListener("click", () => {
        infoWindow.open(map, marker);
        setSelectedBranch(branch);
        map.panTo({ lat: branch.lat, lng: branch.lng });
        map.setZoom(14);
      });
      markersRef.current.push(marker);
    });
  };

  const handleBranchSelect = (branch: typeof branches[0]) => {
    setSelectedBranch(branch);
    if (mapRef.current) {
      mapRef.current.panTo({ lat: branch.lat, lng: branch.lng });
      mapRef.current.setZoom(14);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.message || !formData.inquiryType) {
      toast.error(dir === "rtl" ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    setSubmitting(false);
    setSubmitted(true);
    toast.success(dir === "rtl" ? "تم إرسال رسالتك بنجاح! سنتواصل معك قريباً." : "Your message was sent successfully! We'll contact you soon.");
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5]" dir={dir}>
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-[#1A2E28] pt-32 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-[#C4956A] blur-3xl" />
          <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-[#4A7C6F] blur-3xl" />
        </div>
        <div className="absolute inset-0 opacity-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute h-px bg-white" style={{ top: `${10 + i * 12}%`, left: 0, right: 0 }} />
          ))}
        </div>
        <div className="relative container mx-auto px-6 max-w-7xl">
          <div className="flex items-center gap-2 text-white/50 text-sm mb-8">
            <Link href="/" className="hover:text-white transition-colors">{dir === "rtl" ? "الرئيسية" : "Home"}</Link>
            <ChevronLeft className="w-4 h-4" />
            <span className="text-white">{dir === "rtl" ? "تواصل معنا" : "Contact Us"}</span>
          </div>
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="max-w-2xl">
            <p className="text-[#C4956A] font-medium tracking-widest uppercase text-sm mb-3">
              {dir === "rtl" ? "نحن هنا لمساعدتك" : "We're Here to Help"}
            </p>
            <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-5" style={{ fontFamily: "'DM Serif Display', serif" }}>
              {dir === "rtl" ? <>{" تواصل"}<br /><span className="text-[#C4956A]">مع فريقنا</span></> : <>Contact<br /><span className="text-[#C4956A]">Our Team</span></>}
            </h1>
            <p className="text-white/70 text-lg leading-relaxed">
              {dir === "rtl"
                ? "سواء كان لديك سؤال عن منتجاتنا، أو تحتاج استشارة لمشروعك، أو تريد الانضمام لشبكة موزعينا — فريقنا جاهز للمساعدة."
                : "Whether you have a question about our products, need a project consultation, or want to join our distributor network — our team is ready to help."}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Contact Channels ── */}
      <section className="py-12 bg-white border-b border-[#E8DFD0]">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {contactChannels.map((ch, i) => (
              <motion.a
                key={i}
                href={ch.action}
                target={ch.action.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`group flex flex-col items-center text-center p-5 rounded-2xl border border-[#E8DFD0] ${ch.bg} hover:shadow-lg transition-all duration-300 cursor-pointer`}
              >
                <div className={`w-12 h-12 rounded-xl ${ch.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <ch.icon className={`w-6 h-6 ${ch.color}`} />
                </div>
                <div className="font-bold text-[#1A2E28] text-sm mb-1">{ch.title}</div>
                <div className={`font-semibold text-sm ${ch.color} mb-1`}>{ch.value}</div>
                <div className="text-[#9CA3AF] text-xs">{ch.sub}</div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Form + Hours ── */}
      <section className="py-20">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Form */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <p className="text-[#C4956A] font-medium tracking-widest uppercase text-sm mb-2">
                {dir === "rtl" ? "راسلنا" : "Write to Us"}
              </p>
              <h2 className="text-3xl font-bold text-[#1A2E28] mb-8" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {dir === "rtl" ? "أرسل رسالتك" : "Send Your Message"}
              </h2>

              {submitted ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#2C4A3E]/10 border border-[#2C4A3E]/30 rounded-2xl p-10 text-center">
                  <CheckCircle2 className="w-16 h-16 text-[#2C4A3E] mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-[#1A2E28] mb-3">
                    {dir === "rtl" ? "تم إرسال رسالتك بنجاح!" : "Message Sent Successfully!"}
                  </h3>
                  <p className="text-[#6B7280] mb-6">
                    {dir === "rtl"
                      ? "شكراً لتواصلك معنا. سيقوم فريقنا بالرد عليك خلال ٢٤ ساعة على البريد الإلكتروني أو رقم الهاتف المسجّل."
                      : "Thank you for contacting us. Our team will reply within 24 hours to your registered email or phone number."}
                  </p>
                  <Button onClick={() => { setSubmitted(false); setFormData({ name: "", company: "", phone: "", email: "", inquiryType: "", message: "" }); }} className="bg-[#2C4A3E] hover:bg-[#1A2E28] text-white">
                    {dir === "rtl" ? "إرسال رسالة أخرى" : "Send Another Message"}
                  </Button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-[#374151] font-medium text-sm">
                        {dir === "rtl" ? "الاسم الكامل" : "Full Name"} <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                        <Input id="name" placeholder={dir === "rtl" ? "محمد العمري" : "John Smith"} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="pr-10 border-[#E8DFD0] focus:border-[#2C4A3E] bg-white" required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="company" className="text-[#374151] font-medium text-sm">
                        {dir === "rtl" ? "اسم الشركة / المشروع" : "Company / Project Name"}
                      </Label>
                      <div className="relative">
                        <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                        <Input id="company" placeholder={dir === "rtl" ? "شركة البناء المتحدة" : "United Construction Co."} value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="pr-10 border-[#E8DFD0] focus:border-[#2C4A3E] bg-white" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-[#374151] font-medium text-sm">
                        {dir === "rtl" ? "رقم الجوال" : "Phone Number"} <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                        <Input id="phone" placeholder="05X-XXX-XXXX" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="pr-10 border-[#E8DFD0] focus:border-[#2C4A3E] bg-white" required />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-[#374151] font-medium text-sm">
                        {dir === "rtl" ? "البريد الإلكتروني" : "Email Address"}
                      </Label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                        <Input id="email" type="email" placeholder="name@company.sa" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="pr-10 border-[#E8DFD0] focus:border-[#2C4A3E] bg-white" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[#374151] font-medium text-sm">
                      {dir === "rtl" ? "نوع الاستفسار" : "Inquiry Type"} <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.inquiryType} onValueChange={(v) => setFormData({ ...formData, inquiryType: v })} required>
                      <SelectTrigger className="border-[#E8DFD0] focus:border-[#2C4A3E] bg-white">
                        <SelectValue placeholder={dir === "rtl" ? "اختر نوع الاستفسار" : "Select inquiry type"} />
                      </SelectTrigger>
                      <SelectContent>
                        {inquiryTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="message" className="text-[#374151] font-medium text-sm">
                      {dir === "rtl" ? "رسالتك" : "Your Message"} <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="message"
                      placeholder={dir === "rtl" ? "اكتب تفاصيل استفسارك هنا..." : "Write your inquiry details here..."}
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="border-[#E8DFD0] focus:border-[#2C4A3E] bg-white resize-none"
                      required
                    />
                    <p className="text-[#9CA3AF] text-xs">
                      {formData.message.length} / {dir === "rtl" ? "٥٠٠ حرف" : "500 characters"}
                    </p>
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full bg-[#2C4A3E] hover:bg-[#1A2E28] text-white py-6 text-base font-semibold rounded-xl gap-2">
                    {submitting ? (
                      <><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block" />{dir === "rtl" ? "جارٍ الإرسال..." : "Sending..."}</>
                    ) : (
                      <><Send className="w-5 h-5" />{dir === "rtl" ? "إرسال الرسالة" : "Send Message"}</>
                    )}
                  </Button>

                  <p className="text-[#9CA3AF] text-xs text-center">
                    {dir === "rtl" ? <>بإرسال هذا النموذج، أنت توافق على <a href="#" className="text-[#2C4A3E] underline">سياسة الخصوصية</a></> : <>By submitting this form, you agree to our <a href="#" className="text-[#2C4A3E] underline">Privacy Policy</a></>}
                  </p>
                </form>
              )}
            </motion.div>

            {/* Hours + Social */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{ ...fadeUp, visible: { ...fadeUp.visible, transition: { duration: 0.55, delay: 0.15 } } }}
              className="space-y-6"
            >
              <div>
                <p className="text-[#C4956A] font-medium tracking-widest uppercase text-sm mb-2">
                  {dir === "rtl" ? "ساعات العمل" : "Working Hours"}
                </p>
                <h2 className="text-3xl font-bold text-[#1A2E28] mb-6" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  {dir === "rtl" ? "متى نكون متاحين؟" : "When Are We Available?"}
                </h2>
              </div>

              <div className="bg-white rounded-2xl border border-[#E8DFD0] overflow-hidden">
                {workingHours.map((wh, i) => (
                  <div key={i} className={`flex items-center justify-between px-6 py-4 ${i < workingHours.length - 1 ? "border-b border-[#E8DFD0]" : ""} ${!wh.active ? "opacity-50" : ""}`}>
                    <div className="flex items-center gap-3">
                      <Clock className={`w-4 h-4 ${wh.active ? "text-[#2C4A3E]" : "text-[#9CA3AF]"}`} />
                      <span className="font-medium text-[#374151] text-sm">{wh.day}</span>
                    </div>
                    <span className={`text-sm font-semibold ${wh.active ? "text-[#2C4A3E]" : "text-red-400"}`}>{wh.hours}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {responseItems.map((item, i) => (
                  <div key={i} className={`${item.bg} rounded-xl p-4 flex items-center gap-3`}>
                    <item.icon className={`w-5 h-5 ${item.color} flex-shrink-0`} />
                    <div>
                      <div className="text-[#374151] text-xs font-medium">{item.label}</div>
                      <div className={`${item.color} font-bold text-sm`}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-[#1A2E28] rounded-2xl p-6">
                <h3 className="text-white font-bold mb-4">
                  {dir === "rtl" ? "تابعنا على منصات التواصل" : "Follow Us on Social Media"}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: dir === "rtl" ? "تويتر / X" : "Twitter / X", handle: "@sindian_sa", icon: "𝕏" },
                    { name: dir === "rtl" ? "إنستغرام" : "Instagram", handle: "@sindian.doors", icon: "📸" },
                    { name: "LinkedIn", handle: "Sindian Doors", icon: "in" },
                    { name: dir === "rtl" ? "يوتيوب" : "YouTube", handle: dir === "rtl" ? "سنديان للأبواب" : "Sindian Doors", icon: "▶" },
                  ].map((s, i) => (
                    <button key={i} onClick={() => toast.info(dir === "rtl" ? "سيتم تفعيل هذا الرابط قريباً" : "This link will be activated soon")} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors rounded-xl px-3 py-2.5 text-start">
                      <span className="text-white/60 text-lg w-6 text-center">{s.icon}</span>
                      <div>
                        <div className="text-white text-xs font-medium">{s.name}</div>
                        <div className="text-white/50 text-xs">{s.handle}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Map + Branches ── */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-7xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-12">
            <p className="text-[#C4956A] font-medium tracking-widest uppercase text-sm mb-3">
              {dir === "rtl" ? "فروعنا" : "Our Branches"}
            </p>
            <h2 className="text-4xl font-bold text-[#1A2E28] mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
              {dir === "rtl" ? "نحن في كل مكان" : "We're Everywhere"}
            </h2>
            <p className="text-[#6B7280] max-w-xl mx-auto">
              {dir === "rtl"
                ? "٦ فروع في أبرز مدن المملكة العربية السعودية، اختر الأقرب إليك وتفضّل بزيارتنا."
                : "6 branches in the most prominent cities of Saudi Arabia. Choose the nearest one and visit us."}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-3 lg:max-h-[520px] lg:overflow-y-auto lg:pl-2">
              {branches.map((branch) => (
                <motion.button
                  key={branch.id}
                  onClick={() => handleBranchSelect(branch)}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className={`w-full text-start p-4 rounded-xl border transition-all duration-200 ${
                    selectedBranch.id === branch.id
                      ? "border-[#2C4A3E] bg-[#2C4A3E]/5 shadow-md"
                      : "border-[#E8DFD0] bg-white hover:border-[#2C4A3E]/40 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-[#1A2E28] text-sm truncate">{branch.name}</span>
                        {branch.badge && (
                          <span className="bg-[#C4956A] text-white text-xs px-2 py-0.5 rounded-full flex-shrink-0">{branch.badge}</span>
                        )}
                      </div>
                      <p className="text-[#6B7280] text-xs leading-relaxed mb-2">{branch.address}</p>
                      <div className="flex items-center gap-1 text-[#2C4A3E] text-xs font-medium">
                        <Phone className="w-3 h-3" />{branch.phone}
                      </div>
                    </div>
                    <MapPin className={`w-5 h-5 flex-shrink-0 mt-0.5 ${selectedBranch.id === branch.id ? "text-[#C4956A]" : "text-[#9CA3AF]"}`} />
                  </div>
                  {selectedBranch.id === branch.id && (
                    <div className="mt-3 pt-3 border-t border-[#E8DFD0] flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[#6B7280] text-xs">
                        <Clock className="w-3 h-3" />{branch.hours}
                      </div>
                      <a href={`https://maps.google.com/?q=${branch.lat},${branch.lng}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-[#2C4A3E] text-xs font-medium hover:underline">
                        <ExternalLink className="w-3 h-3" />{dir === "rtl" ? "فتح في الخرائط" : "Open in Maps"}
                      </a>
                    </div>
                  )}
                </motion.button>
              ))}
            </div>

            <div className="lg:col-span-2">
              <div className="rounded-2xl overflow-hidden shadow-xl border border-[#E8DFD0] h-[520px]">
                <MapView className="w-full h-full" initialCenter={{ lat: 24.7136, lng: 46.6753 }} initialZoom={5} onMapReady={handleMapReady} />
              </div>
              <p className="text-[#9CA3AF] text-xs text-center mt-2">
                {dir === "rtl" ? "انقر على أي علامة على الخريطة لرؤية تفاصيل الفرع" : "Click any map marker to view branch details"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ CTA ── */}
      <section className="py-16 bg-[#FAF8F5]">
        <div className="container mx-auto px-6 max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="bg-[#2C4A3E] rounded-3xl p-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-[#C4956A] blur-3xl" />
            </div>
            <div className="relative">
              <ChevronDown className="w-10 h-10 text-[#C4956A] mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {dir === "rtl" ? "هل لديك سؤال شائع؟" : "Have a Common Question?"}
              </h2>
              <p className="text-white/70 mb-6 max-w-lg mx-auto">
                {dir === "rtl"
                  ? "ربما تجد إجابتك في قسم الأسئلة الشائعة الخاص بنا قبل التواصل المباشر."
                  : "You might find your answer in our FAQ section before reaching out directly."}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/#faq" className="inline-flex items-center gap-2 bg-[#C4956A] text-white px-7 py-3 rounded-xl font-semibold hover:bg-[#B8845A] transition-colors">
                  {dir === "rtl" ? "الأسئلة الشائعة" : "FAQ"}
                  <ChevronLeft className="w-4 h-4" />
                </Link>
                <Link href="/b2b" className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/30 px-7 py-3 rounded-xl font-semibold hover:bg-white/20 transition-colors">
                  {dir === "rtl" ? "حلول الأعمال B2B" : "B2B Business Solutions"}
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
