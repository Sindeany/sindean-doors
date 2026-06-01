/**
 * Design: Architectural Luxury - Warm Minimalism
 * B2B Solutions Page: Business solutions with RFQ form and Purchase Order form
 * Colors: oak (#2C4A3E), copper (#C4956A), beige (#E8DFD0), warm-white (#FAF8F5)
 * Bilingual: Arabic RTL / English LTR
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Building2, FileText, ShoppingBag, Send, CheckCircle2, ArrowLeft,
  Phone, Mail, MapPin, Clock, Shield, Truck, Users, BarChart3, Award,
  Package, Plus, Minus, Trash2, Upload, ClipboardList, Handshake,
  Target, Zap, ChevronLeft, Star, FileCheck, CalendarDays,
  CircleDollarSign, TrendingDown, HeadphonesIcon,
} from "lucide-react";
import { allProducts } from "@/lib/productsData";
import { useLanguage } from "@/contexts/LanguageContext";

const B2B_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/b2b-meeting-mwGMjJwsNUmxPJQPyMhAHb.webp";

/* ─── Types ─── */
interface RFQFormData {
  companyName: string; contactName: string; email: string; phone: string;
  companyType: string; city: string; projectName: string; projectType: string;
  estimatedQuantity: string; deliveryDate: string; budget: string; requirements: string;
}

interface POLineItem {
  productId: string; productName: string; quantity: number; unitPrice: number;
}

interface POFormData {
  companyName: string; contactName: string; email: string; phone: string;
  taxNumber: string; companyAddress: string; poNumber: string;
  deliveryAddress: string; deliveryDate: string; paymentTerms: string; notes: string;
}

/* ─── RFQ Form Component ─── */
function RFQForm() {
  const { register, handleSubmit, setValue, formState: { errors }, reset } = useForm<RFQFormData>();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { dir } = useLanguage();

  const companyTypes = dir === "rtl"
    ? ["مقاولات عامة","تطوير عقاري","تصميم داخلي","مكتب هندسي","شركة توريدات","جهة حكومية","فندقة وضيافة","أخرى"]
    : ["General Contracting","Real Estate Development","Interior Design","Engineering Office","Supply Company","Government Entity","Hospitality","Other"];

  const projectTypes = dir === "rtl"
    ? ["مشروع سكني","مشروع تجاري","مشروع فندقي","مشروع حكومي","مشروع صحي","مشروع تعليمي","صيانة وتجديد","أخرى"]
    : ["Residential","Commercial","Hotel","Government","Healthcare","Educational","Renovation","Other"];

  const saudiCities = dir === "rtl"
    ? ["الرياض","جدة","مكة المكرمة","المدينة المنورة","الدمام","الخبر","الظهران","تبوك","أبها","الطائف","بريدة","حائل","نجران","جازان","ينبع","الجبيل","خميس مشيط","أخرى"]
    : ["Riyadh","Jeddah","Makkah","Madinah","Dammam","Khobar","Dhahran","Tabuk","Abha","Taif","Buraydah","Hail","Najran","Jizan","Yanbu","Jubail","Khamis Mushait","Other"];

  const onSubmit = (_data: RFQFormData) => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      toast.success(
        dir === "rtl" ? "تم إرسال طلب عرض السعر بنجاح!" : "RFQ submitted successfully!",
        { description: dir === "rtl" ? "سيتواصل معكم فريقنا خلال 24 ساعة" : "Our team will contact you within 24 hours" }
      );
    }, 1500);
  };

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 px-6">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-3 font-serif">
          {dir === "rtl" ? "تم إرسال طلبكم بنجاح" : "Request Submitted Successfully"}
        </h3>
        <p className="text-muted-foreground mb-2 max-w-md mx-auto">
          {dir === "rtl"
            ? "شكراً لثقتكم بسنديان. سيقوم فريق المبيعات بمراجعة طلبكم وإعداد عرض سعر مخصص."
            : "Thank you for trusting Sindian. Our sales team will review your request and prepare a custom quote."}
        </p>
        <p className="text-sm text-oak font-semibold mb-6">
          {dir === "rtl" ? "سيتم التواصل معكم خلال 24 ساعة عمل" : "You will be contacted within 24 business hours"}
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => { setSubmitted(false); reset(); }} variant="outline" className="border-oak/30 text-oak hover:bg-oak hover:text-white">
            {dir === "rtl" ? "إرسال طلب آخر" : "Submit Another"}
          </Button>
          <Link href="/products">
            <Button className="bg-oak hover:bg-oak-dark text-white">
              {dir === "rtl" ? "تصفح المنتجات" : "Browse Products"}
            </Button>
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Company Info */}
      <div>
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-oak" />
          {dir === "rtl" ? "معلومات الشركة" : "Company Information"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {dir === "rtl" ? "اسم الشركة" : "Company Name"} <span className="text-red-500">*</span>
            </label>
            <Input {...register("companyName", { required: dir === "rtl" ? "مطلوب" : "Required" })}
              placeholder={dir === "rtl" ? "مثال: شركة البناء المتقدم" : "e.g. Advanced Construction Co."} className="bg-white" />
            {errors.companyName && <span className="text-xs text-red-500">{errors.companyName.message}</span>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {dir === "rtl" ? "اسم المسؤول" : "Contact Name"} <span className="text-red-500">*</span>
            </label>
            <Input {...register("contactName", { required: dir === "rtl" ? "مطلوب" : "Required" })}
              placeholder={dir === "rtl" ? "الاسم الكامل" : "Full name"} className="bg-white" />
            {errors.contactName && <span className="text-xs text-red-500">{errors.contactName.message}</span>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {dir === "rtl" ? "البريد الإلكتروني" : "Email"} <span className="text-red-500">*</span>
            </label>
            <Input type="email" {...register("email", { required: dir === "rtl" ? "مطلوب" : "Required", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: dir === "rtl" ? "بريد غير صالح" : "Invalid email" } })}
              placeholder="email@company.com" dir="ltr" className="bg-white text-left" />
            {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {dir === "rtl" ? "رقم الجوال" : "Phone"} <span className="text-red-500">*</span>
            </label>
            <Input type="tel" {...register("phone", { required: dir === "rtl" ? "مطلوب" : "Required" })}
              placeholder="05XXXXXXXX" dir="ltr" className="bg-white text-left" />
            {errors.phone && <span className="text-xs text-red-500">{errors.phone.message}</span>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{dir === "rtl" ? "نوع الشركة" : "Company Type"}</label>
            <Select onValueChange={(v) => setValue("companyType", v)}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder={dir === "rtl" ? "اختر نوع الشركة" : "Select company type"} />
              </SelectTrigger>
              <SelectContent>
                {companyTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{dir === "rtl" ? "المدينة" : "City"}</label>
            <Select onValueChange={(v) => setValue("city", v)}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder={dir === "rtl" ? "اختر المدينة" : "Select city"} />
              </SelectTrigger>
              <SelectContent>
                {saudiCities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Project Info */}
      <div>
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-oak" />
          {dir === "rtl" ? "تفاصيل المشروع" : "Project Details"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{dir === "rtl" ? "اسم المشروع" : "Project Name"}</label>
            <Input {...register("projectName")} placeholder={dir === "rtl" ? "مثال: مجمع الياسمين السكني" : "e.g. Al-Yasmin Residential Complex"} className="bg-white" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{dir === "rtl" ? "نوع المشروع" : "Project Type"}</label>
            <Select onValueChange={(v) => setValue("projectType", v)}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder={dir === "rtl" ? "اختر نوع المشروع" : "Select project type"} />
              </SelectTrigger>
              <SelectContent>
                {projectTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {dir === "rtl" ? "الكمية التقديرية" : "Estimated Quantity"} <span className="text-red-500">*</span>
            </label>
            <Input {...register("estimatedQuantity", { required: dir === "rtl" ? "مطلوب" : "Required" })}
              placeholder={dir === "rtl" ? "مثال: 50 باب" : "e.g. 50 doors"} className="bg-white" />
            {errors.estimatedQuantity && <span className="text-xs text-red-500">{errors.estimatedQuantity.message}</span>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{dir === "rtl" ? "تاريخ التسليم المطلوب" : "Required Delivery Date"}</label>
            <Input type="date" {...register("deliveryDate")} className="bg-white" dir="ltr" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium text-foreground">{dir === "rtl" ? "الميزانية التقديرية" : "Estimated Budget"}</label>
            <Input {...register("budget")} placeholder={dir === "rtl" ? "مثال: 100,000 - 200,000 ر.س" : "e.g. 100,000 - 200,000 SAR"} className="bg-white" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium text-foreground">{dir === "rtl" ? "متطلبات إضافية" : "Additional Requirements"}</label>
            <Textarea {...register("requirements")}
              placeholder={dir === "rtl" ? "اذكر أي متطلبات خاصة مثل: أنواع الأبواب المطلوبة، المقاسات الخاصة، التشطيبات المفضلة، شروط التركيب..." : "Mention any special requirements such as door types, custom sizes, preferred finishes, installation conditions..."}
              className="bg-white min-h-[120px]" />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          <Shield className="w-3.5 h-3.5 inline ml-1" />
          {dir === "rtl" ? "جميع بياناتكم محمية وسرية" : "All your data is protected and confidential"}
        </p>
        <Button type="submit" disabled={submitting} className="bg-oak hover:bg-oak-dark text-white px-8 h-12 text-base gap-2">
          {submitting ? (
            <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
              {dir === "rtl" ? "جاري الإرسال..." : "Sending..."}</>
          ) : (
            <><Send className="w-5 h-5" />{dir === "rtl" ? "إرسال طلب عرض السعر" : "Submit RFQ"}</>
          )}
        </Button>
      </div>
    </form>
  );
}

/* ─── Purchase Order Form Component ─── */
function PurchaseOrderForm() {
  const { register, handleSubmit, setValue, formState: { errors }, reset } = useForm<POFormData>();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lineItems, setLineItems] = useState<POLineItem[]>([{ productId: "", productName: "", quantity: 1, unitPrice: 0 }]);
  const { dir } = useLanguage();

  const paymentOptions = dir === "rtl"
    ? ["دفع مقدم 100%","دفع 50% مقدم - 50% عند التسليم","دفع 30% مقدم - 70% عند التسليم","صافي 30 يوم","صافي 60 يوم","خطاب ضمان بنكي"]
    : ["100% Advance","50% Advance - 50% on Delivery","30% Advance - 70% on Delivery","Net 30 Days","Net 60 Days","Bank Guarantee"];

  const addLineItem = () => setLineItems([...lineItems, { productId: "", productName: "", quantity: 1, unitPrice: 0 }]);
  const removeLineItem = (index: number) => { if (lineItems.length > 1) setLineItems(lineItems.filter((_, i) => i !== index)); };

  const updateLineItem = (index: number, field: keyof POLineItem, value: string | number) => {
    const updated = [...lineItems];
    if (field === "productId") {
      const product = allProducts.find((p) => p.id === value);
      if (product) {
        const qty = updated[index].quantity;
        const tier = product.tiers.find((t) => qty >= t.min && (t.max === null || qty <= t.max)) || product.tiers[0];
        updated[index] = { ...updated[index], productId: value as string, productName: product.name, unitPrice: tier.price };
      }
    } else if (field === "quantity") {
      const qty = Math.max(1, value as number);
      updated[index].quantity = qty;
      const product = allProducts.find((p) => p.id === updated[index].productId);
      if (product) {
        const tier = product.tiers.find((t) => qty >= t.min && (t.max === null || qty <= t.max)) || product.tiers[0];
        updated[index].unitPrice = tier.price;
      }
    } else { (updated[index] as any)[field] = value; }
    setLineItems(updated);
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const vat = subtotal * 0.15;
  const total = subtotal + vat;

  const onSubmit = (_data: POFormData) => {
    if (lineItems.every((item) => !item.productId)) {
      toast.error(dir === "rtl" ? "يرجى إضافة منتج واحد على الأقل" : "Please add at least one product");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      toast.success(
        dir === "rtl" ? "تم إرسال أمر الشراء بنجاح!" : "Purchase order submitted successfully!",
        { description: `${dir === "rtl" ? "رقم الأمر:" : "Order ref:"} PO-${Date.now().toString().slice(-6)}` }
      );
    }, 1500);
  };

  if (submitted) {
    const poRef = `PO-${Date.now().toString().slice(-6)}`;
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 px-6">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-3 font-serif">
          {dir === "rtl" ? "تم استلام أمر الشراء" : "Purchase Order Received"}
        </h3>
        <p className="text-muted-foreground mb-2 max-w-md mx-auto">
          {dir === "rtl"
            ? "تم تسجيل أمر الشراء بنجاح. سيقوم فريقنا بمراجعته والتأكيد خلال يوم عمل واحد."
            : "Your purchase order has been recorded. Our team will review and confirm within one business day."}
        </p>
        <div className="inline-flex items-center gap-2 bg-oak/10 text-oak font-semibold px-4 py-2 rounded-lg mb-6">
          <FileText className="w-4 h-4" />
          {dir === "rtl" ? "رقم المرجع:" : "Reference:"} {poRef}
        </div>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => { setSubmitted(false); reset(); setLineItems([{ productId: "", productName: "", quantity: 1, unitPrice: 0 }]); }}
            variant="outline" className="border-oak/30 text-oak hover:bg-oak hover:text-white">
            {dir === "rtl" ? "إرسال أمر آخر" : "Submit Another"}
          </Button>
          <Link href="/products">
            <Button className="bg-oak hover:bg-oak-dark text-white">
              {dir === "rtl" ? "تصفح المنتجات" : "Browse Products"}
            </Button>
          </Link>
        </div>
      </motion.div>
    );
  }

  const tableHeaders = dir === "rtl"
    ? ["المنتج", "الكمية", "سعر الوحدة", "الإجمالي"]
    : ["Product", "Quantity", "Unit Price", "Total"];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Company Info */}
      <div>
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-oak" />
          {dir === "rtl" ? "بيانات الشركة" : "Company Details"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {dir === "rtl" ? "اسم الشركة" : "Company Name"} <span className="text-red-500">*</span>
            </label>
            <Input {...register("companyName", { required: dir === "rtl" ? "مطلوب" : "Required" })}
              placeholder={dir === "rtl" ? "الاسم الرسمي للشركة" : "Official company name"} className="bg-white" />
            {errors.companyName && <span className="text-xs text-red-500">{errors.companyName.message}</span>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {dir === "rtl" ? "اسم المسؤول" : "Contact Name"} <span className="text-red-500">*</span>
            </label>
            <Input {...register("contactName", { required: dir === "rtl" ? "مطلوب" : "Required" })}
              placeholder={dir === "rtl" ? "الاسم الكامل" : "Full name"} className="bg-white" />
            {errors.contactName && <span className="text-xs text-red-500">{errors.contactName.message}</span>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {dir === "rtl" ? "البريد الإلكتروني" : "Email"} <span className="text-red-500">*</span>
            </label>
            <Input type="email" {...register("email", { required: dir === "rtl" ? "مطلوب" : "Required", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: dir === "rtl" ? "بريد غير صالح" : "Invalid email" } })}
              placeholder="email@company.com" dir="ltr" className="bg-white text-left" />
            {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {dir === "rtl" ? "رقم الجوال" : "Phone"} <span className="text-red-500">*</span>
            </label>
            <Input type="tel" {...register("phone", { required: dir === "rtl" ? "مطلوب" : "Required" })}
              placeholder="05XXXXXXXX" dir="ltr" className="bg-white text-left" />
            {errors.phone && <span className="text-xs text-red-500">{errors.phone.message}</span>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{dir === "rtl" ? "الرقم الضريبي" : "Tax Number"}</label>
            <Input {...register("taxNumber")} placeholder="300XXXXXXXXX0003" dir="ltr" className="bg-white text-left" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{dir === "rtl" ? "رقم أمر الشراء الخاص بكم" : "Your PO Number"}</label>
            <Input {...register("poNumber")} placeholder={dir === "rtl" ? "رقم أمر الشراء من نظامكم (اختياري)" : "Your internal PO number (optional)"} className="bg-white" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium text-foreground">{dir === "rtl" ? "عنوان الشركة" : "Company Address"}</label>
            <Input {...register("companyAddress")} placeholder={dir === "rtl" ? "العنوان الكامل للشركة" : "Full company address"} className="bg-white" />
          </div>
        </div>
      </div>

      <Separator />

      {/* Line Items */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-oak" />
            {dir === "rtl" ? "المنتجات المطلوبة" : "Requested Products"}
          </h3>
          <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="text-oak border-oak/30 hover:bg-oak hover:text-white gap-1">
            <Plus className="w-4 h-4" />
            {dir === "rtl" ? "إضافة منتج" : "Add Product"}
          </Button>
        </div>

        {/* Table header */}
        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 mb-2 px-3">
          {tableHeaders.map((h) => <span key={h} className="text-xs font-semibold text-muted-foreground">{h}</span>)}
          <span className="w-9"></span>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {lineItems.map((item, index) => (
              <motion.div key={index} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 p-3 bg-beige-light/50 rounded-lg border border-border/30">
                <div>
                  <label className="text-xs text-muted-foreground md:hidden mb-1 block">{tableHeaders[0]}</label>
                  <Select value={item.productId} onValueChange={(v) => updateLineItem(index, "productId", v)}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder={dir === "rtl" ? "اختر المنتج" : "Select product"} />
                    </SelectTrigger>
                    <SelectContent>
                      {allProducts.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} - {p.tiers[0].price.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground md:hidden mb-1 block">{tableHeaders[1]}</label>
                  <div className="flex items-center gap-1 border border-border/60 rounded-md bg-white">
                    <button type="button" onClick={() => updateLineItem(index, "quantity", item.quantity - 1)} className="w-8 h-9 flex items-center justify-center hover:bg-gray-50 rounded-r-md">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input type="number" value={item.quantity} onChange={(e) => updateLineItem(index, "quantity", parseInt(e.target.value) || 1)}
                      className="w-12 h-9 text-center font-semibold bg-transparent border-x border-border/60 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    <button type="button" onClick={() => updateLineItem(index, "quantity", item.quantity + 1)} className="w-8 h-9 flex items-center justify-center hover:bg-gray-50 rounded-l-md">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground md:hidden mb-1 block">{tableHeaders[2]}</label>
                  <div className="h-9 flex items-center text-sm font-medium text-foreground px-2">
                    {item.unitPrice > 0 ? `${item.unitPrice.toLocaleString()} ${dir === "rtl" ? "ر.س" : "SAR"}` : "—"}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground md:hidden mb-1 block">{tableHeaders[3]}</label>
                  <div className="h-9 flex items-center text-sm font-bold text-oak px-2">
                    {item.unitPrice > 0 ? `${(item.quantity * item.unitPrice).toLocaleString()} ${dir === "rtl" ? "ر.س" : "SAR"}` : "—"}
                  </div>
                </div>
                <button type="button" onClick={() => removeLineItem(index)} disabled={lineItems.length === 1}
                  className="w-9 h-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 self-end md:self-center">
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Totals */}
        {subtotal > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-4 bg-white rounded-lg border border-border/40">
            <div className={`space-y-2 max-w-xs ${dir === "rtl" ? "mr-auto" : "ml-auto"}`}>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{dir === "rtl" ? "المجموع الفرعي" : "Subtotal"}</span>
                <span className="font-medium">{subtotal.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{dir === "rtl" ? "ضريبة القيمة المضافة (15%)" : "VAT (15%)"}</span>
                <span className="font-medium">{vat.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-bold text-foreground">{dir === "rtl" ? "الإجمالي شامل الضريبة" : "Total incl. VAT"}</span>
                <span className="font-bold text-oak text-lg">{total.toLocaleString()} {dir === "rtl" ? "ر.س" : "SAR"}</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <Separator />

      {/* Delivery & Payment */}
      <div>
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Truck className="w-5 h-5 text-oak" />
          {dir === "rtl" ? "التسليم والدفع" : "Delivery & Payment"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium text-foreground">
              {dir === "rtl" ? "عنوان التسليم" : "Delivery Address"} <span className="text-red-500">*</span>
            </label>
            <Input {...register("deliveryAddress", { required: dir === "rtl" ? "مطلوب" : "Required" })}
              placeholder={dir === "rtl" ? "العنوان الكامل لموقع التسليم أو المشروع" : "Full address of delivery site or project"} className="bg-white" />
            {errors.deliveryAddress && <span className="text-xs text-red-500">{errors.deliveryAddress.message}</span>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{dir === "rtl" ? "تاريخ التسليم المطلوب" : "Required Delivery Date"}</label>
            <Input type="date" {...register("deliveryDate")} className="bg-white" dir="ltr" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{dir === "rtl" ? "شروط الدفع" : "Payment Terms"}</label>
            <Select onValueChange={(v) => setValue("paymentTerms", v)}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder={dir === "rtl" ? "اختر شروط الدفع" : "Select payment terms"} />
              </SelectTrigger>
              <SelectContent>
                {paymentOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium text-foreground">{dir === "rtl" ? "ملاحظات إضافية" : "Additional Notes"}</label>
            <Textarea {...register("notes")} placeholder={dir === "rtl" ? "أي ملاحظات أو تعليمات خاصة بالطلب..." : "Any special notes or instructions for the order..."} className="bg-white min-h-[100px]" />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          <Shield className="w-3.5 h-3.5 inline ml-1" />
          {dir === "rtl" ? "سيتم مراجعة الأمر والتأكيد خلال يوم عمل" : "Order will be reviewed and confirmed within one business day"}
        </p>
        <Button type="submit" disabled={submitting} className="bg-copper hover:bg-copper/90 text-white px-8 h-12 text-base gap-2">
          {submitting ? (
            <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
              {dir === "rtl" ? "جاري الإرسال..." : "Sending..."}</>
          ) : (
            <><FileText className="w-5 h-5" />{dir === "rtl" ? "إرسال أمر الشراء" : "Submit Purchase Order"}</>
          )}
        </Button>
      </div>
    </form>
  );
}

/* ─── Main B2B Page ─── */
export default function B2B() {
  const { dir } = useLanguage();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const features = dir === "rtl" ? [
    { icon: CircleDollarSign, title: "أسعار تنافسية للجملة", desc: "خصومات تصل إلى 40% على الطلبات الكبيرة مع أسعار متدرجة حسب الكمية" },
    { icon: FileCheck, title: "عروض أسعار مخصصة", desc: "فريق متخصص يعد عروض أسعار تفصيلية خلال 24 ساعة من استلام الطلب" },
    { icon: Truck, title: "توصيل للمشاريع", desc: "خدمة توصيل مباشرة لموقع المشروع مع جدولة مرنة حسب مراحل البناء" },
    { icon: HeadphonesIcon, title: "مدير حساب مخصص", desc: "مدير حساب مخصص لكل عميل لمتابعة الطلبات وضمان رضاكم التام" },
    { icon: Shield, title: "ضمان شامل", desc: "ضمان يصل إلى 15 سنة على المنتجات مع خدمة ما بعد البيع المتميزة" },
    { icon: TrendingDown, title: "تمويل مرن", desc: "خيارات دفع مرنة تناسب ميزانية مشروعك مع إمكانية الدفع على مراحل" },
  ] : [
    { icon: CircleDollarSign, title: "Competitive Bulk Pricing", desc: "Discounts up to 40% on large orders with tiered pricing based on quantity" },
    { icon: FileCheck, title: "Custom Quotations", desc: "Specialized team prepares detailed quotes within 24 hours of receiving your request" },
    { icon: Truck, title: "Project Delivery", desc: "Direct delivery to project site with flexible scheduling based on construction phases" },
    { icon: HeadphonesIcon, title: "Dedicated Account Manager", desc: "A dedicated account manager for each client to follow up on orders and ensure satisfaction" },
    { icon: Shield, title: "Comprehensive Warranty", desc: "Up to 15-year warranty on products with premium after-sales service" },
    { icon: TrendingDown, title: "Flexible Financing", desc: "Flexible payment options that fit your project budget with installment possibilities" },
  ];

  const processSteps = dir === "rtl" ? [
    { step: 1, icon: ClipboardList, title: "إرسال الطلب", desc: "أرسل طلب عرض سعر أو أمر شراء عبر النماذج المتاحة" },
    { step: 2, icon: FileText, title: "دراسة الطلب", desc: "فريقنا يدرس متطلباتك ويعد عرضاً مخصصاً خلال 24 ساعة" },
    { step: 3, icon: Handshake, title: "الموافقة والتعاقد", desc: "بعد موافقتكم يتم إعداد العقد وتحديد جدول التسليم" },
    { step: 4, icon: Package, title: "التصنيع والتسليم", desc: "تصنيع حسب المواصفات وتسليم مباشر لموقع المشروع" },
  ] : [
    { step: 1, icon: ClipboardList, title: "Submit Request", desc: "Send an RFQ or purchase order via the available forms" },
    { step: 2, icon: FileText, title: "Review", desc: "Our team reviews your requirements and prepares a custom offer within 24 hours" },
    { step: 3, icon: Handshake, title: "Approval & Contract", desc: "After your approval, the contract is prepared and delivery schedule confirmed" },
    { step: 4, icon: Package, title: "Manufacturing & Delivery", desc: "Manufactured to spec and delivered directly to your project site" },
  ];

  const stats = dir === "rtl"
    ? [{ value: "500+", label: "مشروع منجز" }, { value: "150+", label: "شريك أعمال" }, { value: "10K+", label: "باب مُسلّم" }, { value: "98%", label: "رضا العملاء" }]
    : [{ value: "500+", label: "Completed Projects" }, { value: "150+", label: "Business Partners" }, { value: "10K+", label: "Doors Delivered" }, { value: "98%", label: "Client Satisfaction" }];

  return (
    <div className="min-h-screen flex flex-col bg-background" dir={dir}>
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-oak min-h-[420px] flex items-center">
        <div className="absolute inset-0">
          <img src={B2B_IMAGE} alt={dir === "rtl" ? "حلول الأعمال" : "Business Solutions"} className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-l from-oak via-oak/95 to-oak/80" />
        </div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-copper/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-copper/5 rounded-full blur-2xl translate-x-1/3 translate-y-1/3" />

        <div className="container relative z-10 py-16 lg:py-20">
          <div className="max-w-3xl">
            <nav className="flex items-center gap-2 text-sm text-white/60 mb-6">
              <Link href="/" className="hover:text-white transition-colors">{dir === "rtl" ? "الرئيسية" : "Home"}</Link>
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="text-white">{dir === "rtl" ? "حلول الأعمال" : "Business Solutions"}</span>
            </nav>
            <Badge className="bg-copper/20 text-copper-light border-copper/30 mb-4 text-sm px-4 py-1">
              <Building2 className="w-4 h-4 ml-1.5" />
              B2B Solutions
            </Badge>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5 leading-tight font-serif">
              {dir === "rtl" ? (<>حلول متكاملة <br /><span className="text-copper-light">للشركات والمشاريع</span></>) : (<>Integrated Solutions <br /><span className="text-copper-light">for Businesses & Projects</span></>)}
            </h1>
            <p className="text-white/80 text-lg leading-relaxed mb-8 max-w-2xl">
              {dir === "rtl"
                ? "نقدم حلولاً شاملة للأبواب الخشبية تلبي احتياجات المشاريع الكبرى والشركات. أسعار تنافسية، جودة استثنائية، وخدمة متميزة من البداية حتى التسليم."
                : "We provide comprehensive wooden door solutions for large-scale projects and businesses. Competitive pricing, exceptional quality, and outstanding service from start to delivery."}
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#forms">
                <Button className="bg-copper hover:bg-copper/90 text-white h-12 px-6 text-base gap-2">
                  <FileText className="w-5 h-5" />
                  {dir === "rtl" ? "طلب عرض سعر" : "Request Quote"}
                </Button>
              </a>
              <a href="#forms">
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 h-12 px-6 text-base gap-2 bg-transparent">
                  <ShoppingBag className="w-5 h-5" />
                  {dir === "rtl" ? "إرسال أمر شراء" : "Send Purchase Order"}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-beige border-b border-border/30">
        <div className="container py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-oak mb-1 font-serif">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container py-14 lg:py-20">
        <div className="text-center mb-12">
          <Badge className="bg-oak/10 text-oak border-oak/20 mb-3">
            {dir === "rtl" ? "لماذا سنديان للأعمال" : "Why Sindian for Business"}
          </Badge>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground font-serif mb-3">
            {dir === "rtl" ? (<>مزايا حصرية <span className="text-copper">لعملاء الأعمال</span></>) : (<>Exclusive Benefits <span className="text-copper">for Business Clients</span></>)}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {dir === "rtl"
              ? "نوفر لشركائنا في القطاع التجاري مزايا استثنائية تضمن نجاح مشاريعهم"
              : "We provide our commercial sector partners with exceptional advantages that ensure project success"}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="group p-6 rounded-xl border border-border/40 bg-white hover:shadow-lg hover:shadow-oak/5 transition-all duration-300 hover:border-oak/20">
              <div className="w-12 h-12 rounded-lg bg-oak/10 flex items-center justify-center mb-4 group-hover:bg-oak group-hover:text-white transition-colors">
                <feature.icon className="w-6 h-6 text-oak group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-bold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Process Steps */}
      <section className="bg-beige-light/50 border-y border-border/30">
        <div className="container py-14 lg:py-20">
          <div className="text-center mb-12">
            <Badge className="bg-copper/10 text-copper border-copper/20 mb-3">
              {dir === "rtl" ? "كيف نعمل" : "How We Work"}
            </Badge>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground font-serif mb-3">
              {dir === "rtl" ? (<>خطوات بسيطة <span className="text-copper">لبدء التعاون</span></>) : (<>Simple Steps <span className="text-copper">to Start Collaboration</span></>)}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {processSteps.map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} className="relative text-center">
                {i < processSteps.length - 1 && <div className="hidden lg:block absolute top-10 -left-3 w-6 border-t-2 border-dashed border-oak/20" />}
                <div className="w-20 h-20 rounded-2xl bg-white border-2 border-oak/20 flex items-center justify-center mx-auto mb-4 relative">
                  <step.icon className="w-8 h-8 text-oak" />
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-oak text-white text-xs font-bold flex items-center justify-center">{step.step}</div>
                </div>
                <h3 className="font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Forms Section */}
      <section id="forms" className="container py-14 lg:py-20">
        <div className="text-center mb-10">
          <Badge className="bg-oak/10 text-oak border-oak/20 mb-3">{dir === "rtl" ? "ابدأ الآن" : "Get Started"}</Badge>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground font-serif mb-3">
            {dir === "rtl" ? (<>أرسل طلبك <span className="text-copper">بسهولة</span></>) : (<>Submit Your Request <span className="text-copper">Easily</span></>)}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {dir === "rtl"
              ? "اختر النموذج المناسب لاحتياجك: طلب عرض سعر للاستفسار، أو أمر شراء مباشر"
              : "Choose the form that fits your need: an RFQ for inquiries, or a direct purchase order"}
          </p>
        </div>
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="rfq" dir={dir}>
            <TabsList className="w-full bg-beige border border-border/40 rounded-xl p-1.5 h-auto gap-2 mb-8">
              <TabsTrigger value="rfq" className="flex-1 data-[state=active]:bg-oak data-[state=active]:text-white rounded-lg px-6 py-3 text-sm font-semibold gap-2 transition-all">
                <FileText className="w-4 h-4" />
                {dir === "rtl" ? "طلب عرض سعر (RFQ)" : "Request for Quote (RFQ)"}
              </TabsTrigger>
              <TabsTrigger value="po" className="flex-1 data-[state=active]:bg-copper data-[state=active]:text-white rounded-lg px-6 py-3 text-sm font-semibold gap-2 transition-all">
                <ShoppingBag className="w-4 h-4" />
                {dir === "rtl" ? "أمر شراء (PO)" : "Purchase Order (PO)"}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="rfq">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-beige-light/50 rounded-2xl border border-border/30 p-6 md:p-8">
                <div className="flex items-start gap-3 mb-6 p-4 bg-oak/5 rounded-lg border border-oak/10">
                  <Zap className="w-5 h-5 text-oak flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-foreground text-sm mb-0.5">
                      {dir === "rtl" ? "طلب عرض سعر مخصص" : "Custom Quote Request"}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {dir === "rtl"
                        ? "أرسل تفاصيل مشروعك وسنعد لك عرض سعر مخصص خلال 24 ساعة عمل. مناسب للمشاريع الجديدة والاستفسارات."
                        : "Send your project details and we'll prepare a custom quote within 24 business hours. Ideal for new projects and inquiries."}
                    </p>
                  </div>
                </div>
                <RFQForm />
              </motion.div>
            </TabsContent>
            <TabsContent value="po">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-beige-light/50 rounded-2xl border border-border/30 p-6 md:p-8">
                <div className="flex items-start gap-3 mb-6 p-4 bg-copper/5 rounded-lg border border-copper/10">
                  <ShoppingBag className="w-5 h-5 text-copper flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-foreground text-sm mb-0.5">
                      {dir === "rtl" ? "إرسال أمر شراء مباشر" : "Direct Purchase Order"}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {dir === "rtl"
                        ? "اختر المنتجات والكميات مباشرة مع حساب تلقائي للأسعار المتدرجة. مناسب للعملاء الحاليين والطلبات المحددة."
                        : "Select products and quantities directly with automatic tiered pricing calculation. Ideal for existing clients and specific orders."}
                    </p>
                  </div>
                </div>
                <PurchaseOrderForm />
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="bg-oak">
        <div className="container py-14 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-white font-serif mb-4">
                {dir === "rtl" ? (<>تحتاج مساعدة؟ <span className="text-copper-light">تواصل معنا مباشرة</span></>) : (<>Need Help? <span className="text-copper-light">Contact Us Directly</span></>)}
              </h2>
              <p className="text-white/70 leading-relaxed mb-6">
                {dir === "rtl"
                  ? "فريق المبيعات لدينا جاهز لمساعدتك في اختيار الحلول المناسبة لمشروعك. لا تتردد في التواصل معنا لأي استفسار."
                  : "Our sales team is ready to help you choose the right solutions for your project. Don't hesitate to contact us for any inquiry."}
              </p>
              <div className="flex flex-wrap gap-4">
                <Button className="bg-copper hover:bg-copper/90 text-white h-11 gap-2" onClick={() => toast.info(dir === "rtl" ? "سيتم تفعيل الاتصال قريباً" : "Call feature coming soon")}>
                  <Phone className="w-4 h-4" />920-000-000
                </Button>
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 h-11 gap-2 bg-transparent" onClick={() => toast.info(dir === "rtl" ? "سيتم تفعيل البريد قريباً" : "Email feature coming soon")}>
                  <Mail className="w-4 h-4" />b2b@sindian.sa
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
                <Clock className="w-6 h-6 text-copper-light mb-3" />
                <h4 className="font-semibold text-white text-sm mb-1">{dir === "rtl" ? "ساعات العمل" : "Working Hours"}</h4>
                <p className="text-white/60 text-xs">{dir === "rtl" ? "الأحد - الخميس\n8:00 ص - 5:00 م" : "Sun - Thu\n8:00 AM - 5:00 PM"}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
                <MapPin className="w-6 h-6 text-copper-light mb-3" />
                <h4 className="font-semibold text-white text-sm mb-1">{dir === "rtl" ? "الموقع" : "Location"}</h4>
                <p className="text-white/60 text-xs">{dir === "rtl" ? "الرياض، المملكة\nالعربية السعودية" : "Riyadh,\nSaudi Arabia"}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
                <CalendarDays className="w-6 h-6 text-copper-light mb-3" />
                <h4 className="font-semibold text-white text-sm mb-1">{dir === "rtl" ? "وقت الاستجابة" : "Response Time"}</h4>
                <p className="text-white/60 text-xs">{dir === "rtl" ? "عروض الأسعار\nخلال 24 ساعة" : "Quotes within\n24 hours"}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
                <Award className="w-6 h-6 text-copper-light mb-3" />
                <h4 className="font-semibold text-white text-sm mb-1">{dir === "rtl" ? "خبرة" : "Experience"}</h4>
                <p className="text-white/60 text-xs">{dir === "rtl" ? "+25 سنة في\nصناعة الأبواب" : "+25 years in\ndoor industry"}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
