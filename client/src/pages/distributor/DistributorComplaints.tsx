// ============================================================
// DistributorComplaints - مركز الشكاوى والمرتجعات
// Sindian Doors - Distributor Portal
// Design: Architectural Luxury | Trust-building complaint center
// ============================================================
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle, CheckCircle2, Clock, XCircle, Plus,
  ChevronRight, ChevronLeft, X, Package, Ruler, Palette,
  Truck, AlertTriangle, MessageSquare, Eye, FileText,
  RefreshCw, ArrowLeft, Image as ImageIcon, Send, Star,
  ThumbsUp, Smile, Meh, Frown, ThumbsDown, Pencil, Save, Lock, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import DistributorLayout from "@/components/distributor/DistributorLayout";
import { useDistributorAuth } from "@/contexts/DistributorAuthContext";
import { trpc } from "@/lib/trpc";

// ─── Types ──────────────────────────────────────────────────
type ComplaintStatus = "open" | "under_review" | "resolved" | "rejected" | "return_pending";
type ComplaintType = "size" | "color" | "damage" | "shortage" | "delay" | "quality" | "other";

interface SatisfactionRatingData {
  score: number;        // 1–5
  comment: string;
  submittedAt: string;
}

interface ComplaintItem {
  id: string;
  ticketNumber: string;
  orderId: string;
  orderNumber: string;
  productName: string;
  type: ComplaintType;
  description: string;
  status: ComplaintStatus;
  createdAt: string;
  updatedAt: string;
  images: string[];
  resolution?: string;
  timeline: { date: string; action: string; by: string }[];
  satisfactionRating?: SatisfactionRatingData;
}

// يحوّل شكل الخادم (myComplaints) إلى شكل الواجهة ComplaintItem دون تغيير كود العرض
function mapComplaintFromDB(c: any): ComplaintItem { // any: شكل السجل الخادمي — معلّق عمداً
  return {
    id: String(c.id),
    ticketNumber: c.ticketNumber,
    orderId: "",
    orderNumber: c.orderNumber,
    productName: c.product,
    type: c.type,
    description: c.description,
    status: c.status,
    createdAt: c.createdAt ? new Date(c.createdAt).toISOString().split("T")[0] : "",
    updatedAt: c.updatedAt ? new Date(c.updatedAt).toISOString().split("T")[0] : "",
    images: Array.isArray(c.images) ? c.images : [],
    resolution: undefined,
    timeline: (c.messages ?? []).map((m: any) => ({
      date: m.date,
      action: m.text,
      by: m.from === "admin" ? "إدارة سنديان" : "الموزّع",
    })),
    satisfactionRating:
      c.satisfactionRating != null
        ? { score: c.satisfactionRating, comment: "", submittedAt: "" }
        : undefined,
  };
}

// ─── Config ──────────────────────────────────────────────────
const COMPLAINT_TYPES: {
  id: ComplaintType; label: string; labelEn: string;
  icon: React.ReactNode; color: string; desc: string; descEn: string;
}[] = [
  { id: "size",    label: "مشكلة مقاس",       labelEn: "Size Issue",       icon: <Ruler className="w-5 h-5" />,         color: "#3B82F6", desc: "المقاس المستلم يختلف عن المطلوب",        descEn: "Received size differs from ordered" },
  { id: "color",   label: "مشكلة لون",         labelEn: "Color Issue",      icon: <Palette className="w-5 h-5" />,       color: "#8B5CF6", desc: "اللون أو التشطيب لا يطابق العينة",      descEn: "Color or finish doesn't match sample" },
  { id: "damage",  label: "كسر أو تلف",        labelEn: "Damage",           icon: <AlertTriangle className="w-5 h-5" />, color: "#EF4444", desc: "المنتج وصل مكسوراً أو تالفاً",          descEn: "Product arrived broken or damaged" },
  { id: "shortage",label: "نقص في الكمية",     labelEn: "Shortage",         icon: <Package className="w-5 h-5" />,       color: "#F59E0B", desc: "الكمية المستلمة أقل من المطلوبة",       descEn: "Received quantity less than ordered" },
  { id: "delay",   label: "تأخير في التسليم",  labelEn: "Delivery Delay",   icon: <Truck className="w-5 h-5" />,         color: "#10B981", desc: "التسليم تأخر عن الموعد المحدد",         descEn: "Delivery was late beyond agreed date" },
  { id: "quality", label: "جودة غير مقبولة",   labelEn: "Quality Issue",    icon: <AlertCircle className="w-5 h-5" />,   color: "#EC4899", desc: "جودة التصنيع دون المستوى المتوقع",      descEn: "Manufacturing quality below expected" },
  { id: "other",   label: "أخرى",              labelEn: "Other",            icon: <MessageSquare className="w-5 h-5" />, color: "#6B7280", desc: "مشكلة أخرى غير مذكورة",                descEn: "Other issue not listed above" },
];

const STATUS_CONFIG: Record<ComplaintStatus, { label: string; labelEn: string; color: string; bg: string; icon: React.ReactNode }> = {
  open:            { label: "مفتوحة",              labelEn: "Open",             color: "#3B82F6", bg: "#EFF6FF", icon: <Clock className="w-3.5 h-3.5" /> },
  under_review:    { label: "قيد المراجعة",         labelEn: "Under Review",     color: "#F59E0B", bg: "#FFFBEB", icon: <RefreshCw className="w-3.5 h-3.5" /> },
  resolved:        { label: "تم الحل",              labelEn: "Resolved",         color: "#10B981", bg: "#ECFDF5", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  rejected:        { label: "مرفوضة",              labelEn: "Rejected",         color: "#EF4444", bg: "#FEF2F2", icon: <XCircle className="w-3.5 h-3.5" /> },
  return_pending: { label: "في انتظار الإرجاع",   labelEn: "Awaiting Return",  color: "#8B5CF6", bg: "#F5F3FF", icon: <ArrowLeft className="w-3.5 h-3.5" /> },
};

// ─── Rating labels per score ─────────────────────────────────
const RATING_META: Record<number, { label: string; labelEn: string; color: string; icon: React.ReactNode }> = {
  1: { label: "سيء جداً",    labelEn: "Very Poor",    color: "#EF4444", icon: <ThumbsDown className="w-5 h-5" /> },
  2: { label: "سيء",         labelEn: "Poor",         color: "#F97316", icon: <Frown className="w-5 h-5" /> },
  3: { label: "مقبول",       labelEn: "Fair",         color: "#EAB308", icon: <Meh className="w-5 h-5" /> },
  4: { label: "جيد",         labelEn: "Good",         color: "#22C55E", icon: <Smile className="w-5 h-5" /> },
  5: { label: "ممتاز",       labelEn: "Excellent",    color: "#10B981", icon: <ThumbsUp className="w-5 h-5" /> },
};

// ─── SatisfactionRatingPanel ─────────────────────────────────
// Shown inside ComplaintDetailModal when status === "resolved" and no rating yet
function SatisfactionRatingPanel({
  onSubmit,
  existingRating,
  isRtl,
}: {
  onSubmit: (r: SatisfactionRatingData) => void;
  existingRating?: SatisfactionRatingData;
  isRtl: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(existingRating?.score ?? 0);
  const [comment, setComment] = useState(existingRating?.comment ?? "");
  const [submitted, setSubmitted] = useState(!!existingRating);

  const active = hovered || selected;
  const meta = active ? RATING_META[active] : null;

  const handleSubmit = () => {
    if (!selected) {
      toast.error(isRtl ? "يرجى اختيار تقييم" : "Please select a rating");
      return;
    }
    const rating: SatisfactionRatingData = {
      score: selected,
      comment: comment.trim(),
      submittedAt: new Date().toISOString().split("T")[0],
    };
    onSubmit(rating);
    setSubmitted(true);
    toast.success(isRtl ? "شكراً على تقييمك! رأيك يساعدنا على التحسين." : "Thank you for your feedback!");
  };

  // ── Already rated: show read-only summary ──
  if (submitted && existingRating) {
    const m = RATING_META[existingRating.score];
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5 border"
        style={{ background: `${m.color}08`, borderColor: `${m.color}30` }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${m.color}20`, color: m.color }}>
            {m.icon}
          </div>
          <div>
            <p className="text-xs text-gray-500">{isRtl ? "تقييمك لحل الشكوى" : "Your satisfaction rating"}</p>
            <p className="font-bold text-sm" style={{ color: m.color }}>{isRtl ? m.label : m.labelEn}</p>
          </div>
          {/* Stars display */}
          <div className="flex gap-0.5 ms-auto">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className="w-4 h-4"
                fill={s <= existingRating.score ? m.color : "none"}
                stroke={s <= existingRating.score ? m.color : "#D1D5DB"}
              />
            ))}
          </div>
        </div>
        {existingRating.comment && (
          <p className="text-sm text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100 leading-relaxed">
            "{existingRating.comment}"
          </p>
        )}
        <p className="text-xs text-gray-400 mt-2">
          {isRtl ? `تم التقييم بتاريخ ${existingRating.submittedAt}` : `Rated on ${existingRating.submittedAt}`}
        </p>
      </motion.div>
    );
  }

  // ── Not yet rated: interactive form ──
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border-2 border-dashed p-5 space-y-4"
      style={{ borderColor: "oklch(0.68 0.10 60 / 0.4)", background: "oklch(0.99 0.005 60)" }}
    >
      {/* Prompt */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.68 0.10 60 / 0.15)" }}>
          <Star className="w-5 h-5" style={{ color: "oklch(0.68 0.10 60)" }} />
        </div>
        <div>
          <p className="font-semibold text-sm text-gray-800">
            {isRtl ? "كيف تقيّم مستوى الحل؟" : "How satisfied are you with the resolution?"}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {isRtl ? "تقييمك يساعدنا على تحسين خدمتنا" : "Your feedback helps us improve our service"}
          </p>
        </div>
      </div>

      {/* Star selector */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-2" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onMouseEnter={() => setHovered(s)}
              onClick={() => setSelected(s)}
              className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
              aria-label={`${s} stars`}
            >
              <Star
                className="w-9 h-9 transition-all duration-150"
                fill={s <= active ? (meta?.color ?? "#F59E0B") : "none"}
                stroke={s <= active ? (meta?.color ?? "#F59E0B") : "#D1D5DB"}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>

        {/* Animated label */}
        <AnimatePresence mode="wait">
          {meta && (
            <motion.div
              key={active}
              initial={{ opacity: 0, y: -4, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold"
              style={{ background: `${meta.color}15`, color: meta.color }}
            >
              {meta.icon}
              {isRtl ? meta.label : meta.labelEn}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Comment */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          {isRtl ? "تعليق إضافي (اختياري)" : "Additional comment (optional)"}
        </label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={isRtl
            ? "أخبرنا بتجربتك بشكل أوضح…"
            : "Tell us more about your experience…"}
          rows={3}
          className="text-sm resize-none"
          maxLength={300}
        />
        <div className="text-xs text-gray-400 mt-1 text-end">{comment.length}/300</div>
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={!selected}
        className="w-full gap-2 text-white"
        style={{ background: selected ? "oklch(0.38 0.06 160)" : undefined }}
      >
        <Send className="w-4 h-4" />
        {isRtl ? "إرسال التقييم" : "Submit Rating"}
      </Button>
    </motion.div>
  );
}

// ─── Edit Complaint Modal ────────────────────────────────────
// Allows editing an "open" complaint (type, description, images)
// before it moves to under_review or resolved.
function EditComplaintModal({
  complaint,
  onClose,
  onSave,
}: {
  complaint: ComplaintItem;
  onClose: () => void;
  onSave: (id: string, changes: Pick<ComplaintItem, "type" | "description" | "images">) => void;
}) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedType, setSelectedType] = useState<ComplaintType>(complaint.type);
  const [description, setDescription] = useState(complaint.description);
  const [images, setImages] = useState<string[]>(complaint.images);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 5) {
      toast.error(isRtl ? "الحد الأقصى 5 صور" : "Maximum 5 images allowed");
      return;
    }
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => setImages((prev) => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const handleSave = () => {
    if (!description.trim() || description.trim().length < 10) {
      toast.error(isRtl ? "الوصف قصير جداً (10 أحرف على الأقل)" : "Description too short (min 10 characters)");
      return;
    }
    onSave(complaint.id, { type: selectedType, description: description.trim(), images });
    toast.success(isRtl ? "تم حفظ التعديلات بنجاح" : "Changes saved successfully");
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[88vh] overflow-hidden flex flex-col"
          initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
          dir={dir}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "oklch(0.92 0.004 286.32)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.95 0.02 160)" }}>
                <Pencil className="w-4 h-4" style={{ color: "oklch(0.38 0.06 160)" }} />
              </div>
              <div>
                <h2 className="font-bold text-gray-800" style={{ fontFamily: "DM Serif Display, serif" }}>
                  {isRtl ? "تعديل الشكوى" : "Edit Complaint"}
                </h2>
                <p className="text-xs text-gray-500">{complaint.ticketNumber}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Notice */}
          <div className="mx-5 mt-4 p-3 rounded-xl flex items-start gap-2" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
            <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              {isRtl
                ? "يمكنك تعديل الشكوى طالما أنها مفتوحة ولم تُراجَع بعد. بعد المراجعة لن يكون التعديل متاحاً."
                : "You can edit this complaint while it's still open and not yet under review. Editing is locked after review starts."}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Issue Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                {isRtl ? "نوع المشكلة *" : "Issue Type *"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {COMPLAINT_TYPES.map((ct) => (
                  <button
                    key={ct.id}
                    onClick={() => setSelectedType(ct.id)}
                    className="text-start p-3 rounded-xl border-2 transition-all"
                    style={selectedType === ct.id
                      ? { borderColor: ct.color, background: `${ct.color}10` }
                      : { borderColor: "#E5E7EB" }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${ct.color}20`, color: ct.color }}>
                        {ct.icon}
                      </div>
                      <span className="text-xs font-semibold text-gray-800">{isRtl ? ct.label : ct.labelEn}</span>
                      {selectedType === ct.id && <CheckCircle2 className="w-3.5 h-3.5 ms-auto flex-shrink-0" style={{ color: ct.color }} />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {isRtl ? "وصف المشكلة *" : "Issue Description *"}
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isRtl
                  ? "اشرح المشكلة بالتفصيل…"
                  : "Describe the issue in detail…"}
                rows={4}
                className="text-sm resize-none"
                maxLength={500}
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-400">{isRtl ? "10 أحرف على الأقل" : "Min 10 characters"}</span>
                <span className="text-xs text-gray-400">{description.length}/500</span>
              </div>
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {isRtl ? "الصور المرفقة (حتى 5 صور)" : "Attached Photos (up to 5)"}
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute top-1 end-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                {images.length < 5 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 flex flex-col items-center justify-center gap-1 transition-colors"
                  >
                    <ImageIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-xs text-gray-400">{isRtl ? "إضافة" : "Add"}</span>
                  </button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-5 border-t" style={{ borderColor: "oklch(0.92 0.004 286.32)" }}>
            <Button variant="outline" onClick={onClose} className="gap-2">
              <X className="w-4 h-4" />
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={handleSave}
              disabled={description.trim().length < 10}
              className="gap-2 text-white"
              style={{ background: description.trim().length >= 10 ? "oklch(0.38 0.06 160)" : undefined }}
            >
              <Save className="w-4 h-4" />
              {isRtl ? "حفظ التعديلات" : "Save Changes"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── New Complaint Wizard ─────────────────────────────────────
function NewComplaintWizard({
  isOpen, onClose, onSubmit, orders,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (c: Partial<ComplaintItem>) => void;
  orders: { id: string; status: string; orderNumber: string; date: string; products: { name: string; qty: number }[] }[];
}) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [step, setStep] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedType, setSelectedType] = useState<ComplaintType | "">("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const order = orders.find((o) => o.id === selectedOrder);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 5) {
      toast.error(isRtl ? "الحد الأقصى 5 صور" : "Maximum 5 images allowed");
      return;
    }
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => setImages((prev) => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const uploadImages = async (base64List: string[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const img of base64List) {
      if (!img.startsWith("data:")) {
        urls.push(img);
        continue;
      }
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: img, filename: `complaint-${Date.now()}-${urls.length}` }),
      });
      if (!res.ok) {
        throw new Error(isRtl ? "فشل رفع إحدى الصور" : "Failed to upload an image");
      }
      const { url } = (await res.json()) as { url: string };
      urls.push(url);
    }
    return urls;
  };

  const handleSubmit = async () => {
    if (!selectedOrder || !selectedType || !description.trim()) {
      toast.error(isRtl ? "يرجى إكمال جميع الحقول المطلوبة" : "Please fill all required fields");
      return;
    }
    setIsUploading(true);
    let uploadedUrls: string[] = [];
    try {
      uploadedUrls = await uploadImages(images);
    } catch (err) {
      setIsUploading(false);
      toast.error(err instanceof Error ? err.message : (isRtl ? "فشل رفع الصور" : "Image upload failed"));
      return;
    }
    setIsUploading(false);
    onSubmit({
      orderId: selectedOrder,
      orderNumber: order?.orderNumber || "",
      productName: selectedProduct || order?.products[0]?.name || "",
      type: selectedType as ComplaintType,
      description,
      images: uploadedUrls,
    });
    onClose();
    setStep(1); setSelectedOrder(""); setSelectedProduct(""); setSelectedType(""); setDescription(""); setImages([]);
  };

  const canNext = () => {
    if (step === 1) return !!selectedOrder && !!selectedProduct;
    if (step === 2) return !!selectedType;
    if (step === 3) return description.trim().length >= 10;
    return true;
  };

  const steps = [
    { num: 1, label: isRtl ? "الطلب" : "Order" },
    { num: 2, label: isRtl ? "نوع المشكلة" : "Issue Type" },
    { num: 3, label: isRtl ? "التفاصيل" : "Details" },
    { num: 4, label: isRtl ? "مراجعة" : "Review" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            dir={dir}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: "oklch(0.92 0.004 286.32)" }}>
              <div>
                <h2 className="text-lg font-bold" style={{ color: "oklch(0.25 0.04 160)", fontFamily: "DM Serif Display, serif" }}>
                  {isRtl ? "فتح شكوى جديدة" : "New Complaint"}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {isRtl ? "سيتم الرد خلال 24 ساعة عمل" : "We'll respond within 24 business hours"}
                </p>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="px-6 py-4 border-b" style={{ borderColor: "oklch(0.92 0.004 286.32)" }}>
              <div className="flex items-center gap-2">
                {steps.map((s, i) => (
                  <div key={s.num} className="flex items-center gap-2 flex-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                        step > s.num ? "text-white" : step === s.num ? "text-white" : "text-gray-400 bg-gray-100"
                      }`}
                      style={step >= s.num ? { background: "oklch(0.38 0.06 160)" } : {}}
                    >
                      {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                    </div>
                    <span className={`text-xs hidden sm:block ${step === s.num ? "font-medium text-gray-800" : "text-gray-400"}`}>{s.label}</span>
                    {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${step > s.num ? "bg-green-500" : "bg-gray-200"}`} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {/* Step 1 */}
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <h3 className="font-semibold text-gray-800 mb-4">{isRtl ? "اختر الطلب والمنتج المتضرر" : "Select Order & Affected Product"}</h3>
                    <div className="space-y-3">
                      {orders.filter((o) => o.status !== "pending" && o.status !== "cancelled").map((o) => (
                        <button
                          key={o.id}
                          onClick={() => { setSelectedOrder(o.id); setSelectedProduct(""); }}
                          className={`w-full text-start p-4 rounded-xl border-2 transition-all ${
                            selectedOrder === o.id ? "border-green-600 bg-green-50" : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm text-gray-800">{o.orderNumber}</span>
                            <span className="text-xs text-gray-400">{o.date}</span>
                          </div>
                          <div className="text-xs text-gray-500">{o.products.map((p) => p.name).join(" · ")}</div>
                        </button>
                      ))}
                    </div>
                    {selectedOrder && order && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
                        <h4 className="font-medium text-gray-700 mb-3 text-sm">{isRtl ? "اختر المنتج المتضرر:" : "Select affected product:"}</h4>
                        <div className="space-y-2">
                          {order.products.map((p, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedProduct(p.name)}
                              className={`w-full text-start p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                                selectedProduct === p.name ? "border-green-600 bg-green-50" : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.95 0.02 160)" }}>
                                <Package className="w-4 h-4" style={{ color: "oklch(0.38 0.06 160)" }} />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-800">{p.name}</div>
                                <div className="text-xs text-gray-400">{isRtl ? `الكمية: ${p.qty}` : `Qty: ${p.qty}`}</div>
                              </div>
                              {selectedProduct === p.name && <CheckCircle2 className="w-4 h-4 text-green-600 ms-auto" />}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* Step 2 */}
                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <h3 className="font-semibold text-gray-800 mb-4">{isRtl ? "ما نوع المشكلة؟" : "What type of issue?"}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {COMPLAINT_TYPES.map((ct) => (
                        <button
                          key={ct.id}
                          onClick={() => setSelectedType(ct.id)}
                          className={`text-start p-4 rounded-xl border-2 transition-all`}
                          style={selectedType === ct.id ? { borderColor: ct.color, background: `${ct.color}10` } : { borderColor: "#E5E7EB" }}
                        >
                          <div className="flex items-center gap-3 mb-1.5">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${ct.color}20`, color: ct.color }}>
                              {ct.icon}
                            </div>
                            <span className="font-semibold text-sm text-gray-800">{isRtl ? ct.label : ct.labelEn}</span>
                            {selectedType === ct.id && <CheckCircle2 className="w-4 h-4 ms-auto flex-shrink-0" style={{ color: ct.color }} />}
                          </div>
                          <p className="text-xs text-gray-500 ps-12">{isRtl ? ct.desc : ct.descEn}</p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 3 */}
                {step === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <h3 className="font-semibold text-gray-800 mb-4">{isRtl ? "وصف المشكلة والصور" : "Describe the Issue & Upload Photos"}</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          {isRtl ? "وصف تفصيلي للمشكلة *" : "Detailed description *"}
                        </label>
                        <Textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder={isRtl ? "اشرح المشكلة بالتفصيل: ماذا حدث؟ متى اكتشفتها؟ كم عدد القطع المتضررة؟" : "Describe the issue in detail: What happened? When did you discover it? How many units are affected?"}
                          rows={4}
                          className="text-sm resize-none"
                        />
                        <div className="text-xs text-gray-400 mt-1 text-end">{description.length}/500</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          {isRtl ? "صور المشكلة (اختياري، حتى 5 صور)" : "Photos (optional, up to 5 images)"}
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                          {images.map((img, i) => (
                            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                              <img src={img} alt="" className="w-full h-full object-cover" />
                              <button
                                onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                                className="absolute top-1 end-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                              >
                                <X className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          ))}
                          {images.length < 5 && (
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 flex flex-col items-center justify-center gap-1 transition-colors"
                            >
                              <ImageIcon className="w-5 h-5 text-gray-400" />
                              <span className="text-xs text-gray-400">{isRtl ? "إضافة" : "Add"}</span>
                            </button>
                          )}
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                        <p className="text-xs text-gray-400 mt-2">
                          {isRtl ? "الصور تساعد فريقنا على حل المشكلة بشكل أسرع" : "Photos help our team resolve the issue faster"}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 4 */}
                {step === 4 && (
                  <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <h3 className="font-semibold text-gray-800 mb-4">{isRtl ? "مراجعة الشكوى قبل الإرسال" : "Review Before Submitting"}</h3>
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl" style={{ background: "oklch(0.97 0.01 160)" }}>
                        <div className="text-xs font-medium text-gray-500 mb-2">{isRtl ? "الطلب المتضرر" : "Affected Order"}</div>
                        <div className="font-semibold text-gray-800">{order?.orderNumber}</div>
                        <div className="text-sm text-gray-600 mt-1">{selectedProduct}</div>
                      </div>
                      {(() => {
                        const ct = COMPLAINT_TYPES.find((c) => c.id === selectedType);
                        return ct ? (
                          <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: `${ct.color}10`, border: `1px solid ${ct.color}30` }}>
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${ct.color}20`, color: ct.color }}>
                              {ct.icon}
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">{isRtl ? "نوع المشكلة" : "Issue Type"}</div>
                              <div className="font-semibold text-gray-800">{isRtl ? ct.label : ct.labelEn}</div>
                            </div>
                          </div>
                        ) : null;
                      })()}
                      <div className="p-4 rounded-xl border border-gray-200">
                        <div className="text-xs font-medium text-gray-500 mb-2">{isRtl ? "الوصف" : "Description"}</div>
                        <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
                      </div>
                      {images.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-2">{isRtl ? `${images.length} صور مرفقة` : `${images.length} images attached`}</div>
                          <div className="flex gap-2">
                            {images.map((img, i) => (
                              <div key={i} className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200">
                                <img src={img} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="p-3 rounded-lg flex items-start gap-2" style={{ background: "#EFF6FF" }}>
                        <Clock className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-700">
                          {isRtl
                            ? "سيتم الرد على شكواك خلال 24 ساعة عمل. في حالات الكسر أو التلف الشديد، سيتم التواصل خلال 4 ساعات."
                            : "We'll respond within 24 business hours. For severe damage cases, we'll contact you within 4 hours."}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t" style={{ borderColor: "oklch(0.92 0.004 286.32)" }}>
              <Button
                variant="outline"
                onClick={() => step === 1 ? onClose() : setStep((s) => s - 1)}
                className="gap-2"
              >
                {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                {step === 1 ? (isRtl ? "إلغاء" : "Cancel") : (isRtl ? "السابق" : "Back")}
              </Button>
              {step < 4 ? (
                <Button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canNext()}
                  className="gap-2 text-white"
                  style={{ background: canNext() ? "oklch(0.38 0.06 160)" : undefined }}
                >
                  {isRtl ? "التالي" : "Next"}
                  {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isUploading}
                  className="gap-2 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "oklch(0.38 0.06 160)" }}
                >
                  <Send className="w-4 h-4" />
                  {isUploading ? (isRtl ? "جارٍ الرفع..." : "Uploading...") : (isRtl ? "إرسال الشكوى" : "Submit Complaint")}
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Complaint Detail Modal ───────────────────────────────────
function ComplaintDetailModal({
  complaint,
  onClose,
  onRate,
  onEdit,
  onReply,
  isReplying,
}: {
  complaint: ComplaintItem;
  onClose: () => void;
  onRate: (id: string, rating: SatisfactionRatingData) => void;
  onEdit: (complaint: ComplaintItem) => void;
  onReply: (text: string) => void;
  isReplying: boolean;
}) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [replyText, setReplyText] = useState("");
  const status = STATUS_CONFIG[complaint.status];
  const type = COMPLAINT_TYPES.find((t) => t.id === complaint.type);
  const isResolved = complaint.status === "resolved";
  const isEditable = complaint.status === "open";
  const isLocked = !isEditable;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col"
          initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
          dir={dir}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "oklch(0.92 0.004 286.32)" }}>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-bold text-gray-800">{complaint.ticketNumber}</span>
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: status.color, background: status.bg }}>
                  {status.icon}{isRtl ? status.label : status.labelEn}
                  {isLocked && (
                    <Lock className="w-2.5 h-2.5 opacity-70" />
                  )}
                </span>
              </div>
              <p className="text-xs text-gray-500">{complaint.orderNumber} · {complaint.productName}</p>
            </div>
            <div className="flex items-center gap-2">
              {isEditable && (
                <button
                  onClick={() => onEdit(complaint)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
                  style={{ background: "oklch(0.95 0.02 160)", color: "oklch(0.38 0.06 160)" }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {isRtl ? "تعديل" : "Edit"}
                </button>
              )}
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Editable badge */}
          {isEditable && (
            <div className="mx-5 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
              <Pencil className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              <span className="text-xs text-blue-700">
                {isRtl ? "هذه الشكوى مفتوحة ويمكنك تعديلها في أي وقت قبل مراجعتها." : "This complaint is open and can be edited before review starts."}
              </span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Type */}
            {type && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: `${type.color}10` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${type.color}20`, color: type.color }}>
                  {type.icon}
                </div>
                <div>
                  <div className="text-xs text-gray-500">{isRtl ? "نوع المشكلة" : "Issue Type"}</div>
                  <div className="font-semibold text-sm text-gray-800">{isRtl ? type.label : type.labelEn}</div>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="p-3 rounded-xl border border-gray-200">
              <div className="text-xs font-medium text-gray-500 mb-1">{isRtl ? "الوصف" : "Description"}</div>
              <p className="text-sm text-gray-700 leading-relaxed">{complaint.description}</p>
            </div>

            {/* Resolution */}
            {complaint.resolution && (
              <div className="p-3 rounded-xl" style={{ background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-medium text-green-700">{isRtl ? "الحل المتخذ" : "Resolution"}</span>
                </div>
                <p className="text-sm text-green-800">{complaint.resolution}</p>
              </div>
            )}

            {/* ── Satisfaction Rating Section ── */}
            {isResolved && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs font-medium text-gray-400 px-2">
                    {isRtl ? "تقييم مستوى الرضا" : "Satisfaction Rating"}
                  </span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <SatisfactionRatingPanel
                  isRtl={isRtl}
                  existingRating={complaint.satisfactionRating}
                  onSubmit={(rating) => onRate(complaint.id, rating)}
                />
              </div>
            )}

            {/* Timeline */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">{isRtl ? "سجل المتابعة" : "Activity Timeline"}</h4>
              <div className="space-y-3">
                {complaint.timeline.map((event, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                        style={{ background: i === complaint.timeline.length - 1 ? "oklch(0.68 0.10 60)" : "oklch(0.38 0.06 160)" }}
                      />
                      {i < complaint.timeline.length - 1 && (
                        <div className="w-0.5 flex-1 mt-1" style={{ background: "oklch(0.92 0.004 286.32)" }} />
                      )}
                    </div>
                    <div className="pb-3">
                      <p className="text-sm text-gray-700">{event.action}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{event.date}</span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-500">{event.by}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reply UI */}
            {(complaint.status === "open" || complaint.status === "under_review") && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: "oklch(0.92 0.004 286.32)" }}>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={isRtl ? "اكتب ردك هنا..." : "Write your reply here..."}
                  rows={3}
                  className="text-sm resize-none"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => {
                      const t = replyText.trim();
                      if (!t) return;
                      onReply(t);
                      setReplyText("");
                    }}
                    disabled={isReplying || !replyText.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: "oklch(0.38 0.06 160)", color: "white" }}
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isReplying ? (isRtl ? "جارٍ الإرسال..." : "Sending...") : (isRtl ? "إرسال الرد" : "Send Reply")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function DistributorComplaints() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const { distributor } = useDistributorAuth();
  const utils = trpc.useUtils();
  const ordersQuery = trpc.distributors.myOrders.useQuery();
  const wizardOrders = (ordersQuery.data || []).map((o: any) => ({
    id: String(o.id),
    status: o.status,
    orderNumber: o.orderNumber,
    date: new Date(Number(o.createdAt)).toISOString().slice(0, 10),
    products: (Array.isArray(o.items) ? o.items : []).map((it: any) => ({
      name: isRtl ? it.doorType : (it.doorTypeEn || it.doorType),
      qty: it.quantity,
    })),
  }));

  const { data: rawComplaints, isLoading, isError } = trpc.complaints.myComplaints.useQuery(undefined, { retry: false, enabled: !!distributor });
  const complaints: ComplaintItem[] = (rawComplaints ?? []).map(mapComplaintFromDB);

  const submitMutation = trpc.complaints.submitComplaint.useMutation({
    onSuccess: () => {
      utils.complaints.myComplaints.invalidate();
      toast.success(isRtl ? "تم إرسال الشكوى بنجاح" : "Complaint submitted successfully");
    },
    onError: (err) => {
      toast.error(err.message || (isRtl ? "فشل إرسال الشكوى" : "Failed to submit complaint"));
    },
  });

  const replyMutation = trpc.complaints.addReply.useMutation({
    onSuccess: () => {
      utils.complaints.myComplaints.invalidate();
      toast.success(isRtl ? "تم إرسال الرد" : "Reply sent");
    },
    onError: (err) => {
      toast.error(err.message || (isRtl ? "فشل إرسال الرد" : "Failed to send reply"));
    },
  });

  const [showNewWizard, setShowNewWizard] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintItem | null>(null);
  const [editingComplaint, setEditingComplaint] = useState<ComplaintItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<ComplaintStatus | "all">("all");

  const filtered = filterStatus === "all" ? complaints : complaints.filter((c) => c.status === filterStatus);

  // Derived stats
  const resolvedWithRating = complaints.filter((c) => c.status === "resolved" && c.satisfactionRating);
  const avgRating = resolvedWithRating.length
    ? (resolvedWithRating.reduce((sum, c) => sum + (c.satisfactionRating?.score ?? 0), 0) / resolvedWithRating.length).toFixed(1)
    : null;

  const stats = {
    total: complaints.length,
    open: complaints.filter((c) => c.status === "open" || c.status === "under_review").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
    awaiting: complaints.filter((c) => c.status === "return_pending").length,
  };

  const handleReply = (text: string) => {
    if (!selectedComplaint) return;
    replyMutation.mutate({ complaintId: Number(selectedComplaint.id), text });
  };

  const handleNewComplaint = (data: Partial<ComplaintItem>) => {
    if (!data.type) {
      toast.error(isRtl ? "يرجى تحديد نوع الشكوى" : "Please select a complaint type");
      return;
    }
    submitMutation.mutate({
      orderNumber: data.orderNumber || "",
      product: data.productName || "",
      type: data.type,
      description: data.description || "",
      images: data.images || [],
    });
    setShowNewWizard(false);
  };

  const handleRate = (id: string, rating: SatisfactionRatingData) => {
    toast.info(isRtl ? "سيتم تفعيل التقييم قريباً" : "Rating will be enabled soon");
  };

  const handleEdit = (complaint: ComplaintItem) => {
    setEditingComplaint(complaint);
  };

  const handleSaveEdit = (
    id: string,
    changes: Pick<ComplaintItem, "type" | "description" | "images">
  ) => {
    toast.info(isRtl ? "سيتم تفعيل حفظ التعديلات قريباً" : "Saving changes will be enabled soon");
    setEditingComplaint(null);
  };

  if (isLoading) {
    return (
      <DistributorLayout title={isRtl ? "مركز الشكاوى والمرتجعات" : "Complaints & Returns"} subtitle={isRtl ? "تابع شكاواك وافتح طلبات مرتجعات بسهولة" : "Track complaints and submit return requests easily"}>
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
      </DistributorLayout>
    );
  }

  if (isError) {
    return (
      <DistributorLayout title={isRtl ? "مركز الشكاوى والمرتجعات" : "Complaints & Returns"} subtitle={isRtl ? "تابع شكاواك وافتح طلبات مرتجعات بسهولة" : "Track complaints and submit return requests easily"}>
        <div className="text-center py-20 text-red-500">{isRtl ? "تعذّر تحميل الشكاوى" : "Failed to load complaints"}</div>
      </DistributorLayout>
    );
  }

  return (
    <DistributorLayout
      title={isRtl ? "مركز الشكاوى والمرتجعات" : "Complaints & Returns"}
      subtitle={isRtl ? "تابع شكاواك وافتح طلبات مرتجعات بسهولة" : "Track complaints and submit return requests easily"}
    >
      <div className="max-w-5xl mx-auto space-y-6" dir={dir}>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: isRtl ? "إجمالي الشكاوى" : "Total",            value: stats.total,    color: "#6B7280", bg: "#F9FAFB", icon: <FileText className="w-4 h-4" /> },
            { label: isRtl ? "قيد المعالجة" : "In Progress",         value: stats.open,     color: "#F59E0B", bg: "#FFFBEB", icon: <RefreshCw className="w-4 h-4" /> },
            { label: isRtl ? "تم الحل" : "Resolved",                 value: stats.resolved, color: "#10B981", bg: "#ECFDF5", icon: <CheckCircle2 className="w-4 h-4" /> },
            {
              label: avgRating
                ? (isRtl ? "متوسط الرضا" : "Avg. Satisfaction")
                : (isRtl ? "في انتظار الإرجاع" : "Awaiting Return"),
              value: avgRating
                ? (
                  <span className="flex items-center gap-1">
                    {avgRating}
                    <Star className="w-4 h-4 inline" fill="#F59E0B" stroke="#F59E0B" />
                  </span>
                )
                : stats.awaiting,
              color: avgRating ? "#F59E0B" : "#8B5CF6",
              bg: avgRating ? "#FFFBEB" : "#F5F3FF",
              icon: avgRating ? <Star className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />,
            },
          ].map((s) => (
            <div key={String(s.label)} className="rounded-xl p-4 border border-gray-100" style={{ background: s.bg }}>
              <div className="flex items-center gap-2 mb-2" style={{ color: s.color }}>
                {s.icon}
                <span className="text-xs font-medium">{s.label}</span>
              </div>
              <div className="text-2xl font-bold" style={{ color: s.color, fontFamily: "DM Serif Display, serif" }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Actions & Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(["all", "open", "under_review", "resolved", "return_pending", "rejected"] as const).map((s) => {
              const cfg = s === "all"
                ? { label: isRtl ? "الكل" : "All", labelEn: "All", color: "#374151", bg: "#F3F4F6" }
                : STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                  style={filterStatus === s
                    ? { background: s === "all" ? "oklch(0.38 0.06 160)" : cfg.color, color: "white" }
                    : { background: "#F3F4F6", color: "#6B7280" }}
                >
                  {s === "all"
                    ? (isRtl ? "الكل" : "All")
                    : (isRtl ? (cfg as typeof STATUS_CONFIG[ComplaintStatus]).label : (cfg as typeof STATUS_CONFIG[ComplaintStatus]).labelEn)}
                </button>
              );
            })}
          </div>
          <Button
            onClick={() => setShowNewWizard(true)}
            className="gap-2 text-white flex-shrink-0"
            style={{ background: "oklch(0.38 0.06 160)" }}
          >
            <Plus className="w-4 h-4" />
            {isRtl ? "فتح شكوى جديدة" : "New Complaint"}
          </Button>
        </div>

        {/* Complaints List */}
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-16 rounded-2xl border-2 border-dashed border-gray-200"
              >
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400" />
                <p className="font-semibold text-gray-600">{isRtl ? "لا توجد شكاوى في هذه الفئة" : "No complaints in this category"}</p>
                <p className="text-sm text-gray-400 mt-1">{isRtl ? "كل شيء يسير بشكل ممتاز!" : "Everything is running smoothly!"}</p>
              </motion.div>
            ) : (
              filtered.map((complaint) => {
                const status = STATUS_CONFIG[complaint.status];
                const type = COMPLAINT_TYPES.find((t) => t.id === complaint.type);
                const isResolved = complaint.status === "resolved";
                const hasRating = !!complaint.satisfactionRating;
                const needsRating = isResolved && !hasRating;
                const isLocked = complaint.status !== "open";

                return (
                  <motion.div
                    key={complaint.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-white rounded-xl border p-5 hover:shadow-md transition-all cursor-pointer ${
                      needsRating ? "border-amber-300 ring-1 ring-amber-200" : "border-gray-200"
                    }`}
                    onClick={() => setSelectedComplaint(complaint)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        {type && (
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${type.color}15`, color: type.color }}>
                            {type.icon}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold text-sm text-gray-800">{complaint.ticketNumber}</span>
                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: status.color, background: status.bg }}>
                              {status.icon}{isRtl ? status.label : status.labelEn}
                              {isLocked && (
                                <Lock className="w-2.5 h-2.5 opacity-70" />
                              )}
                            </span>
                            {/* Rating badge */}
                            {hasRating && (
                              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-600">
                                <Star className="w-3 h-3" fill="#D97706" stroke="#D97706" />
                                {complaint.satisfactionRating!.score}/5
                              </span>
                            )}
                            {/* Nudge badge */}
                            {needsRating && (
                              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-600 animate-pulse">
                                <Star className="w-3 h-3" />
                                {isRtl ? "قيّم الحل" : "Rate resolution"}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 truncate">{complaint.productName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{complaint.orderNumber} · {complaint.createdAt}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-xs text-gray-400 hidden sm:block">
                          {isRtl ? `آخر تحديث: ${complaint.updatedAt}` : `Updated: ${complaint.updatedAt}`}
                        </div>
                        {complaint.status === "open" && (
                          <button
                            className="p-2 rounded-lg hover:bg-blue-50 transition-colors"
                            title={isRtl ? "تعديل الشكوى" : "Edit complaint"}
                            onClick={(e) => { e.stopPropagation(); setEditingComplaint(complaint); }}
                          >
                            <Pencil className="w-4 h-4 text-blue-400" />
                          </button>
                        )}
                        <button
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          onClick={(e) => { e.stopPropagation(); setSelectedComplaint(complaint); }}
                        >
                          <Eye className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>

                    {/* Timeline preview */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "oklch(0.68 0.10 60)" }} />
                        <span className="text-xs text-gray-500">{complaint.timeline[complaint.timeline.length - 1]?.action}</span>
                        <span className="text-xs text-gray-400 ms-auto">{complaint.timeline[complaint.timeline.length - 1]?.date}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Empty state CTA */}
        {complaints.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "oklch(0.95 0.02 160)" }}>
              <AlertCircle className="w-8 h-8" style={{ color: "oklch(0.38 0.06 160)" }} />
            </div>
            <h3 className="font-bold text-gray-700 mb-2">{isRtl ? "لا توجد شكاوى مسجلة" : "No complaints registered"}</h3>
            <p className="text-sm text-gray-400 mb-4">{isRtl ? "هل واجهت مشكلة في أحد طلباتك؟" : "Did you encounter an issue with any order?"}</p>
            <Button onClick={() => setShowNewWizard(true)} className="text-white gap-2" style={{ background: "oklch(0.38 0.06 160)" }}>
              <Plus className="w-4 h-4" />
              {isRtl ? "فتح شكوى" : "Open a Complaint"}
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
      <NewComplaintWizard isOpen={showNewWizard} onClose={() => setShowNewWizard(false)} onSubmit={handleNewComplaint}
        orders={wizardOrders} />
      {selectedComplaint && (
        <ComplaintDetailModal
          complaint={selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          onRate={handleRate}
          onEdit={handleEdit}
          onReply={handleReply}
          isReplying={replyMutation.isPending}
        />
      )}
      {editingComplaint && (
        <EditComplaintModal
          complaint={editingComplaint}
          onClose={() => setEditingComplaint(null)}
          onSave={handleSaveEdit}
        />
      )}
    </DistributorLayout>
  );
}
