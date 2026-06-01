/**
 * Checkout Page - صفحة إتمام الطلب
 * Design: Architectural Luxury — Oak Green #2C4A3E, Copper #C4956A
 *
 * Steps: 1. Delivery Info → 2. Review Order → 3. Confirmation
 */

import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  MapPin,
  User,
  Phone,
  Building,
  CheckCircle2,
  ShoppingBag,
  Tag,
  Truck,
  Shield,
  CreditCard,
  FileText,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

function formatPrice(price: number, lang: string) {
  return price.toLocaleString(lang === "ar" ? "ar-SA" : "en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const CITIES_AR = [
  "الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام",
  "الخبر", "الظهران", "الطائف", "أبها", "تبوك", "القصيم", "حائل",
  "نجران", "جازان", "الجوف", "الباحة", "عرعر",
];

const CITIES_EN = [
  "Riyadh", "Jeddah", "Mecca", "Medina", "Dammam",
  "Khobar", "Dhahran", "Taif", "Abha", "Tabuk", "Qassim", "Hail",
  "Najran", "Jazan", "Al-Jouf", "Al-Baha", "Arar",
];

type Step = "info" | "review" | "confirm";

export default function CheckoutPage() {
  const { items, summary, clearCart } = useCart();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("info");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const { dir, lang } = useLanguage();

  const PAYMENT_METHODS = dir === "rtl" ? [
    { id: "bank_transfer", label: "تحويل بنكي", icon: Building, desc: "سيُرسل إليك رقم الحساب بعد تأكيد الطلب" },
    { id: "credit_card", label: "بطاقة ائتمانية", icon: CreditCard, desc: "Visa / Mastercard / Mada" },
    { id: "invoice", label: "فاتورة آجلة", icon: FileText, desc: "للشركات المسجلة — صافي 30 يوم" },
  ] : [
    { id: "bank_transfer", label: "Bank Transfer", icon: Building, desc: "Account details will be sent after order confirmation" },
    { id: "credit_card", label: "Credit Card", icon: CreditCard, desc: "Visa / Mastercard / Mada" },
    { id: "invoice", label: "Deferred Invoice", icon: FileText, desc: "For registered companies — Net 30 days" },
  ];

  const CITIES = dir === "rtl" ? CITIES_AR : CITIES_EN;

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    company: "",
    city: "",
    district: "",
    street: "",
    notes: "",
  });

  const updateForm = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isFormValid =
    form.firstName && form.lastName && form.phone && form.city && form.district && form.street;

  function handleConfirm() {
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
    clearCart();
    setStep("confirm");
    toast.success(dir === "rtl" ? `تم تأكيد طلبك رقم ${orderNumber}` : `Your order ${orderNumber} has been confirmed`);
  }

  if (items.length === 0 && step !== "confirm") {
    return (
      <div className="min-h-screen bg-[#FAF8F5]" dir={dir}>
        <Navbar />
        <div className="container py-24 text-center">
          <ShoppingBag className="w-16 h-16 text-[#C4956A] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#2C4A3E] mb-3">
            {dir === "rtl" ? "السلة فارغة" : "Cart is Empty"}
          </h2>
          <p className="text-gray-500 mb-6">
            {dir === "rtl" ? "أضف منتجات أولاً لإتمام الطلب" : "Add products first to complete your order"}
          </p>
          <Button className="bg-[#2C4A3E] text-white" asChild>
            <Link href="/products">{dir === "rtl" ? "تصفح المنتجات" : "Browse Products"}</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]" dir={dir}>
      <Navbar />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-[#E8DFD0]">
        <div className="container py-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-[#2C4A3E]">{dir === "rtl" ? "الرئيسية" : "Home"}</Link>
            <ChevronLeft className="w-4 h-4" />
            <Link href="/cart" className="hover:text-[#2C4A3E]">{dir === "rtl" ? "السلة" : "Cart"}</Link>
            <ChevronLeft className="w-4 h-4" />
            <span className="text-[#2C4A3E] font-medium">{dir === "rtl" ? "إتمام الطلب" : "Checkout"}</span>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Steps */}
        {step !== "confirm" && (
          <div className="flex items-center justify-center mb-10">
            {[
              { id: "info", label: dir === "rtl" ? "معلومات التوصيل" : "Delivery Info", num: 1 },
              { id: "review", label: dir === "rtl" ? "مراجعة الطلب" : "Review Order", num: 2 },
            ].map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                      step === s.id
                        ? "bg-[#2C4A3E] text-white"
                        : step === "review" && s.id === "info"
                        ? "bg-[#C4956A] text-white"
                        : "bg-[#E8DFD0] text-gray-500"
                    }`}
                  >
                    {step === "review" && s.id === "info" ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      s.num
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium hidden sm:block ${
                      step === s.id ? "text-[#2C4A3E]" : "text-gray-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < 1 && (
                  <div className="w-16 sm:w-24 h-0.5 bg-[#E8DFD0] mx-3" />
                )}
              </div>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Step 1: Delivery Info */}
          {step === "info" && (
            <motion.div
              key="info"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-6">
                {/* Personal Info */}
                <div className="bg-white rounded-2xl border border-[#E8DFD0] p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <User className="w-5 h-5 text-[#C4956A]" />
                    <h2 className="text-lg font-bold text-[#2C4A3E]">
                      {dir === "rtl" ? "المعلومات الشخصية" : "Personal Information"}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[#2C4A3E] font-medium mb-1.5 block">
                        {dir === "rtl" ? "الاسم الأول *" : "First Name *"}
                      </Label>
                      <Input
                        value={form.firstName}
                        onChange={(e) => updateForm("firstName", e.target.value)}
                        placeholder={dir === "rtl" ? "محمد" : "John"}
                        className="border-[#E8DFD0] focus:border-[#2C4A3E]"
                      />
                    </div>
                    <div>
                      <Label className="text-[#2C4A3E] font-medium mb-1.5 block">
                        {dir === "rtl" ? "اسم العائلة *" : "Last Name *"}
                      </Label>
                      <Input
                        value={form.lastName}
                        onChange={(e) => updateForm("lastName", e.target.value)}
                        placeholder={dir === "rtl" ? "العمري" : "Smith"}
                        className="border-[#E8DFD0] focus:border-[#2C4A3E]"
                      />
                    </div>
                    <div>
                      <Label className="text-[#2C4A3E] font-medium mb-1.5 block">
                        <Phone className="w-4 h-4 inline ml-1" />
                        {dir === "rtl" ? "رقم الجوال *" : "Phone Number *"}
                      </Label>
                      <Input
                        value={form.phone}
                        onChange={(e) => updateForm("phone", e.target.value)}
                        placeholder="05XXXXXXXX"
                        className="border-[#E8DFD0] focus:border-[#2C4A3E]"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <Label className="text-[#2C4A3E] font-medium mb-1.5 block">
                        {dir === "rtl" ? "البريد الإلكتروني" : "Email Address"}
                      </Label>
                      <Input
                        value={form.email}
                        onChange={(e) => updateForm("email", e.target.value)}
                        placeholder="example@email.com"
                        className="border-[#E8DFD0] focus:border-[#2C4A3E]"
                        dir="ltr"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-[#2C4A3E] font-medium mb-1.5 block">
                        <Building className="w-4 h-4 inline ml-1" />
                        {dir === "rtl" ? "اسم الشركة (اختياري)" : "Company Name (optional)"}
                      </Label>
                      <Input
                        value={form.company}
                        onChange={(e) => updateForm("company", e.target.value)}
                        placeholder={dir === "rtl" ? "شركة الإنشاءات الحديثة" : "Modern Construction Co."}
                        className="border-[#E8DFD0] focus:border-[#2C4A3E]"
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="bg-white rounded-2xl border border-[#E8DFD0] p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <MapPin className="w-5 h-5 text-[#C4956A]" />
                    <h2 className="text-lg font-bold text-[#2C4A3E]">
                      {dir === "rtl" ? "عنوان التوصيل" : "Delivery Address"}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[#2C4A3E] font-medium mb-1.5 block">
                        {dir === "rtl" ? "المدينة *" : "City *"}
                      </Label>
                      <select
                        value={form.city}
                        onChange={(e) => updateForm("city", e.target.value)}
                        className="w-full border border-[#E8DFD0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2C4A3E] bg-white"
                      >
                        <option value="">{dir === "rtl" ? "اختر المدينة" : "Select City"}</option>
                        {CITIES.map((city) => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-[#2C4A3E] font-medium mb-1.5 block">
                        {dir === "rtl" ? "الحي *" : "District *"}
                      </Label>
                      <Input
                        value={form.district}
                        onChange={(e) => updateForm("district", e.target.value)}
                        placeholder={dir === "rtl" ? "حي النرجس" : "Al-Narjis District"}
                        className="border-[#E8DFD0] focus:border-[#2C4A3E]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-[#2C4A3E] font-medium mb-1.5 block">
                        {dir === "rtl" ? "اسم الشارع ورقم المبنى *" : "Street Name & Building Number *"}
                      </Label>
                      <Input
                        value={form.street}
                        onChange={(e) => updateForm("street", e.target.value)}
                        placeholder={dir === "rtl" ? "شارع الأمير محمد، مبنى 45" : "Prince Mohammed St., Building 45"}
                        className="border-[#E8DFD0] focus:border-[#2C4A3E]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-[#2C4A3E] font-medium mb-1.5 block">
                        {dir === "rtl" ? "ملاحظات إضافية" : "Additional Notes"}
                      </Label>
                      <textarea
                        value={form.notes}
                        onChange={(e) => updateForm("notes", e.target.value)}
                        placeholder={dir === "rtl" ? "أي تعليمات خاصة للتوصيل..." : "Any special delivery instructions..."}
                        rows={3}
                        className="w-full border border-[#E8DFD0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2C4A3E] resize-none"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    if (!isFormValid) {
                      toast.error(dir === "rtl" ? "يرجى تعبئة جميع الحقول المطلوبة" : "Please fill in all required fields");
                      return;
                    }
                    setStep("review");
                  }}
                  className="w-full bg-[#2C4A3E] hover:bg-[#1e3329] text-white py-4 text-base font-bold rounded-xl"
                >
                  {dir === "rtl" ? "متابعة لمراجعة الطلب" : "Continue to Review Order"}
                  <ArrowLeft className="w-4 h-4 mr-2" />
                </Button>
              </div>

              <OrderSummaryCard items={items} summary={summary} compact dir={dir} lang={lang} />
            </motion.div>
          )}

          {/* Step 2: Review Order */}
          {step === "review" && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-6">
                {/* Products Summary */}
                <div className="bg-white rounded-2xl border border-[#E8DFD0] p-6">
                  <h2 className="text-lg font-bold text-[#2C4A3E] mb-4">
                    {dir === "rtl" ? "المنتجات المطلوبة" : "Ordered Products"}
                  </h2>
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={item.product.id} className="flex gap-3 items-center">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#2C4A3E] text-sm truncate">{item.product.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Tag className="w-3 h-3 text-[#C4956A]" />
                            <span className="text-xs text-[#C4956A]">{item.activeTierLabel}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.quantity} × {formatPrice(item.unitPrice, lang)} {dir === "rtl" ? "ر.س" : "SAR"}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-[#2C4A3E]">
                            {formatPrice(item.unitPrice * item.quantity, lang)} {dir === "rtl" ? "ر.س" : "SAR"}
                          </p>
                          {item.savings > 0 && (
                            <p className="text-xs text-green-600">
                              {dir === "rtl" ? `وفّرت ${formatPrice(item.savings, lang)}` : `Saved ${formatPrice(item.savings, lang)}`}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery Address Review */}
                <div className="bg-white rounded-2xl border border-[#E8DFD0] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-[#2C4A3E]">
                      {dir === "rtl" ? "عنوان التوصيل" : "Delivery Address"}
                    </h2>
                    <button
                      onClick={() => setStep("info")}
                      className="text-sm text-[#C4956A] hover:underline flex items-center gap-1"
                    >
                      <ArrowRight className="w-3 h-3" />
                      {dir === "rtl" ? "تعديل" : "Edit"}
                    </button>
                  </div>
                  <div className="bg-[#F5F0E8] rounded-xl p-4">
                    <p className="font-semibold text-[#2C4A3E]">
                      {form.firstName} {form.lastName}
                      {form.company && ` — ${form.company}`}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {form.street}, {form.district}, {form.city}
                    </p>
                    <p className="text-sm text-gray-600">{form.phone}</p>
                    {form.notes && (
                      <p className="text-xs text-gray-500 mt-2 italic">{form.notes}</p>
                    )}
                  </div>
                </div>

                {/* Payment Method */}
                <div className="bg-white rounded-2xl border border-[#E8DFD0] p-6">
                  <h2 className="text-lg font-bold text-[#2C4A3E] mb-4">
                    {dir === "rtl" ? "طريقة الدفع" : "Payment Method"}
                  </h2>
                  <div className="space-y-3">
                    {PAYMENT_METHODS.map((method) => (
                      <label
                        key={method.id}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          paymentMethod === method.id
                            ? "border-[#2C4A3E] bg-[#F5F0E8]"
                            : "border-[#E8DFD0] hover:border-[#C4956A]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment"
                          value={method.id}
                          checked={paymentMethod === method.id}
                          onChange={() => setPaymentMethod(method.id)}
                          className="accent-[#2C4A3E]"
                        />
                        <div className="w-10 h-10 rounded-lg bg-[#E8DFD0] flex items-center justify-center flex-shrink-0">
                          <method.icon className="w-5 h-5 text-[#2C4A3E]" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#2C4A3E]">{method.label}</p>
                          <p className="text-xs text-gray-500">{method.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleConfirm}
                  className="w-full bg-[#C4956A] hover:bg-[#b07d52] text-white py-4 text-base font-bold rounded-xl"
                >
                  {dir === "rtl" ? "تأكيد الطلب" : "Confirm Order"}
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                </Button>
              </div>

              <OrderSummaryCard items={items} summary={summary} dir={dir} lang={lang} />
            </motion.div>
          )}

          {/* Step 3: Confirmation */}
          {step === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto text-center py-12"
            >
              <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-[#2C4A3E] mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {dir === "rtl" ? "تم تأكيد طلبك!" : "Your Order is Confirmed!"}
              </h1>
              <p className="text-gray-600 mb-2">
                {dir === "rtl" ? "شكراً لك على ثقتك بسنديان للأبواب" : "Thank you for trusting Sindian Doors"}
              </p>
              <p className="text-sm text-gray-500 mb-8">
                {dir === "rtl"
                  ? "سيتواصل معك فريقنا خلال 24 ساعة لتأكيد التفاصيل وترتيب التوصيل"
                  : "Our team will contact you within 24 hours to confirm details and arrange delivery"}
              </p>

              <div className="bg-white rounded-2xl border border-[#E8DFD0] p-6 mb-8 text-right">
                <h3 className="font-bold text-[#2C4A3E] mb-4">
                  {dir === "rtl" ? "ماذا يحدث الآن؟" : "What Happens Next?"}
                </h3>
                <div className="space-y-4">
                  {(dir === "rtl" ? [
                    { icon: Phone, title: "تأكيد هاتفي", desc: "سيتصل بك مندوبنا خلال ساعات العمل" },
                    { icon: FileText, title: "إرسال الفاتورة", desc: "ستصلك الفاتورة على بريدك الإلكتروني" },
                    { icon: Truck, title: "التوصيل", desc: "خلال 7-14 يوم عمل حسب الكمية والموقع" },
                    { icon: Shield, title: "الضمان", desc: "ضمان 15 سنة على جميع المنتجات" },
                  ] : [
                    { icon: Phone, title: "Phone Confirmation", desc: "Our representative will call you during business hours" },
                    { icon: FileText, title: "Invoice Sent", desc: "Invoice will be sent to your email" },
                    { icon: Truck, title: "Delivery", desc: "Within 7-14 business days depending on quantity and location" },
                    { icon: Shield, title: "Warranty", desc: "15-year warranty on all products" },
                  ]).map((s, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#E8DFD0] flex items-center justify-center flex-shrink-0">
                        <s.icon className="w-4 h-4 text-[#2C4A3E]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#2C4A3E] text-sm">{s.title}</p>
                        <p className="text-xs text-gray-500">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button className="bg-[#2C4A3E] hover:bg-[#1e3329] text-white px-8" asChild>
                  <Link href="/">{dir === "rtl" ? "العودة للرئيسية" : "Back to Home"}</Link>
                </Button>
                <Button variant="outline" className="border-[#2C4A3E] text-[#2C4A3E]" asChild>
                  <Link href="/products">{dir === "rtl" ? "تصفح المزيد من المنتجات" : "Browse More Products"}</Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Footer />
    </div>
  );
}

/** Order Summary Card Component */
function OrderSummaryCard({
  items,
  summary,
  compact = false,
  dir,
  lang,
}: {
  items: ReturnType<typeof useCart>["items"];
  summary: ReturnType<typeof useCart>["summary"];
  compact?: boolean;
  dir: string;
  lang: string;
}) {
  return (
    <div className="lg:col-span-1">
      <div className="sticky top-24 bg-white rounded-2xl border border-[#E8DFD0] shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#2C4A3E] mb-4">
          {dir === "rtl" ? "ملخص الطلب" : "Order Summary"}
        </h2>

        {!compact && (
          <div className="space-y-3 mb-4">
            {items.map((item) => (
              <div key={item.product.id} className="flex items-center gap-2">
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#2C4A3E] truncate">{item.product.name}</p>
                  <p className="text-xs text-gray-500">
                    {item.quantity} × {formatPrice(item.unitPrice, lang)} {dir === "rtl" ? "ر.س" : "SAR"}
                  </p>
                </div>
                <p className="text-xs font-bold text-[#2C4A3E] flex-shrink-0">
                  {formatPrice(item.unitPrice * item.quantity, lang)}
                </p>
              </div>
            ))}
            <Separator className="bg-[#E8DFD0]" />
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{dir === "rtl" ? "المجموع الفرعي" : "Subtotal"}</span>
            <span className="font-medium">{formatPrice(summary.subtotal, lang)} {dir === "rtl" ? "ر.س" : "SAR"}</span>
          </div>
          {summary.totalSavings > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600">{dir === "rtl" ? "التوفير" : "Savings"}</span>
              <span className="font-medium text-green-600">- {formatPrice(summary.totalSavings, lang)} {dir === "rtl" ? "ر.س" : "SAR"}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{dir === "rtl" ? "ضريبة 15%" : "VAT 15%"}</span>
            <span className="font-medium">{formatPrice(summary.vat, lang)} {dir === "rtl" ? "ر.س" : "SAR"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{dir === "rtl" ? "الشحن" : "Shipping"}</span>
            <span className="font-medium text-green-600">
              {summary.subtotal >= 5000
                ? (dir === "rtl" ? "مجاني" : "Free")
                : (dir === "rtl" ? "يُحدد لاحقاً" : "To be determined")}
            </span>
          </div>
          <Separator className="bg-[#E8DFD0]" />
          <div className="flex justify-between font-bold text-[#2C4A3E]">
            <span className="text-base">{dir === "rtl" ? "الإجمالي" : "Total"}</span>
            <span className="text-xl">{formatPrice(summary.total, lang)} {dir === "rtl" ? "ر.س" : "SAR"}</span>
          </div>
        </div>

        {summary.totalSavings > 0 && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
            <p className="text-sm font-bold text-green-700">
              {dir === "rtl"
                ? `وفّرت ${formatPrice(summary.totalSavings, lang)} ر.س`
                : `You saved ${formatPrice(summary.totalSavings, lang)} SAR`}
            </p>
            <p className="text-xs text-green-600">
              {dir === "rtl" ? "بفضل الأسعار المتدرجة" : "with tiered pricing"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
