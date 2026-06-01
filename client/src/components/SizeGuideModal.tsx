/**
 * SizeGuideModal — دليل المقاسات التفاعلي
 * Design: Architectural Luxury — Oak Green #2C4A3E, Copper #C4956A
 *
 * Features:
 * - رسم SVG توضيحي للباب مع أبعاد مُعلَّمة
 * - جداول مقاسات قياسية حسب نوع الباب (داخلي / خارجي / حريق)
 * - خطوات قياس الفتحة خطوة بخطوة
 * - نصائح الاختيار الصحيح
 * - دعم ثنائي اللغة (AR / EN)
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Ruler,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  doorType?: "interior" | "exterior" | "fire" | "acoustic" | string;
}

// ============================================================
// بيانات المقاسات القياسية
// ============================================================
const STANDARD_SIZES = {
  interior: [
    { width: 60, height: 200, use_ar: "دورة مياه / حمام صغير", use_en: "Small Bathroom / WC" },
    { width: 70, height: 200, use_ar: "غرفة نوم / مكتب", use_en: "Bedroom / Office" },
    { width: 80, height: 200, use_ar: "غرفة نوم رئيسية", use_en: "Master Bedroom" },
    { width: 90, height: 210, use_ar: "صالة / ممر رئيسي", use_en: "Living Room / Main Corridor" },
    { width: 100, height: 210, use_ar: "مدخل رئيسي داخلي", use_en: "Main Interior Entrance" },
    { width: 120, height: 210, use_ar: "باب مزدوج / صالة كبيرة", use_en: "Double Door / Large Hall" },
  ],
  exterior: [
    { width: 90, height: 210, use_ar: "مدخل خلفي / جانبي", use_en: "Side / Back Entrance" },
    { width: 100, height: 215, use_ar: "مدخل رئيسي فيلا", use_en: "Villa Main Entrance" },
    { width: 110, height: 220, use_ar: "مدخل فاخر", use_en: "Luxury Entrance" },
    { width: 120, height: 220, use_ar: "مدخل مزدوج", use_en: "Double Entrance" },
    { width: 130, height: 230, use_ar: "مدخل بوابة كبيرة", use_en: "Grand Gate Entrance" },
  ],
  fire: [
    { width: 80, height: 200, use_ar: "مخرج طوارئ فردي", use_en: "Single Emergency Exit" },
    { width: 90, height: 210, use_ar: "ممر طوارئ", use_en: "Emergency Corridor" },
    { width: 100, height: 210, use_ar: "باب حريق مزدوج", use_en: "Double Fire Door" },
    { width: 120, height: 215, use_ar: "مخرج طوارئ رئيسي", use_en: "Main Emergency Exit" },
  ],
  acoustic: [
    { width: 80, height: 200, use_ar: "غرفة تسجيل صغيرة", use_en: "Small Recording Room" },
    { width: 90, height: 210, use_ar: "استوديو / مكتب هادئ", use_en: "Studio / Quiet Office" },
    { width: 100, height: 210, use_ar: "قاعة اجتماعات", use_en: "Meeting Room" },
  ],
};

const MEASUREMENT_STEPS = [
  {
    step: 1,
    icon: "📏",
    title_ar: "قِس العرض",
    title_en: "Measure the Width",
    desc_ar: "قِس عرض الفتحة من الداخل في ثلاثة مواضع: أعلى، منتصف، أسفل. استخدم أصغر قيمة.",
    desc_en: "Measure the opening width at three points: top, middle, bottom. Use the smallest value.",
    tip_ar: "اطرح 1 سم من كل جانب للمسافة بين الإطار والحائط",
    tip_en: "Subtract 1 cm from each side for frame-to-wall clearance",
  },
  {
    step: 2,
    icon: "📐",
    title_ar: "قِس الارتفاع",
    title_en: "Measure the Height",
    desc_ar: "قِس ارتفاع الفتحة من الأرضية إلى العتبة العلوية في ثلاثة مواضع. استخدم أصغر قيمة.",
    desc_en: "Measure the opening height from floor to lintel at three points. Use the smallest value.",
    tip_ar: "تأكد من أن الأرضية مستوية قبل القياس",
    tip_en: "Ensure the floor is level before measuring",
  },
  {
    step: 3,
    icon: "🔍",
    title_ar: "تحقق من الزوايا",
    title_en: "Check the Corners",
    desc_ar: "تأكد أن زوايا الفتحة قائمة (90°) باستخدام زاوية قياس. الانحراف يؤثر على التركيب.",
    desc_en: "Verify the opening corners are square (90°) using a square. Deviation affects installation.",
    tip_ar: "الانحراف المسموح به: ≤ 3 مم",
    tip_en: "Acceptable deviation: ≤ 3 mm",
  },
  {
    step: 4,
    icon: "📋",
    title_ar: "اختر المقاس المناسب",
    title_en: "Choose the Right Size",
    desc_ar: "اختر الباب الذي يكون عرضه وارتفاعه أكبر من قياسات الفتحة بـ 2-5 سم لكل بُعد.",
    desc_en: "Choose a door 2-5 cm larger than your opening measurements in each dimension.",
    tip_ar: "الفرق يُستوعب في إطار الباب",
    tip_en: "The difference is absorbed by the door frame",
  },
];

const TIPS = [
  {
    type: "info" as const,
    text_ar: "الأبواب القياسية تُركَّب مع إطار خشبي يُضاف إلى المقاس الإجمالي",
    text_en: "Standard doors are installed with a wooden frame added to the total dimension",
  },
  {
    type: "warning" as const,
    text_ar: "تجنب قياس الباب القديم مباشرةً — قِس الفتحة في الحائط بعد إزالة الإطار",
    text_en: "Avoid measuring the old door directly — measure the wall opening after removing the frame",
  },
  {
    type: "info" as const,
    text_ar: "للأبواب المزدوجة: قِس العرض الكلي ثم اقسمه على 2 للحصول على عرض كل ورقة",
    text_en: "For double doors: measure total width then divide by 2 for each leaf width",
  },
  {
    type: "warning" as const,
    text_ar: "الأبواب المقاومة للحريق تتطلب مقاسات دقيقة — لا تقل عن المقاس القياسي",
    text_en: "Fire doors require precise measurements — never go below the standard size",
  },
];

// ============================================================
// رسم SVG للباب مع الأبعاد
// ============================================================
function DoorDiagram({ width, height, dir }: { width: number; height: number; dir: string }) {
  const svgW = 220;
  const svgH = 300;
  const doorX = 50;
  const doorY = 20;
  const doorW = 120;
  const doorH = 220;
  const frameT = 8; // frame thickness

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full max-w-[220px] mx-auto"
      aria-label={dir === "rtl" ? "رسم توضيحي للباب" : "Door diagram"}
    >
      {/* Wall background */}
      <rect x="0" y="0" width={svgW} height={svgH} fill="#F5F0E8" rx="8" />

      {/* Door frame */}
      <rect
        x={doorX - frameT}
        y={doorY - frameT}
        width={doorW + frameT * 2}
        height={doorH + frameT}
        fill="#2C4A3E"
        rx="3"
      />

      {/* Door panel */}
      <rect x={doorX} y={doorY} width={doorW} height={doorH} fill="#C4956A" rx="2" />

      {/* Door panel inset */}
      <rect x={doorX + 10} y={doorY + 15} width={doorW - 20} height={doorH * 0.38} fill="rgba(255,255,255,0.15)" rx="2" />
      <rect x={doorX + 10} y={doorY + doorH * 0.45} width={doorW - 20} height={doorH * 0.48} fill="rgba(255,255,255,0.15)" rx="2" />

      {/* Handle */}
      <circle cx={doorX + doorW - 15} cy={doorY + doorH / 2} r="4" fill="#2C4A3E" />
      <rect x={doorX + doorW - 17} y={doorY + doorH / 2 - 12} width="4" height="24" rx="2" fill="#2C4A3E" />

      {/* Floor line */}
      <line x1="10" y1={doorY + doorH} x2={svgW - 10} y2={doorY + doorH} stroke="#2C4A3E" strokeWidth="3" strokeLinecap="round" />

      {/* Width arrow */}
      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#C4956A" />
        </marker>
        <marker id="arrowhead-rev" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
          <path d="M0,0 L6,3 L0,6 Z" fill="#C4956A" />
        </marker>
      </defs>

      {/* Width dimension line */}
      <line
        x1={doorX}
        y1={doorY + doorH + 20}
        x2={doorX + doorW}
        y2={doorY + doorH + 20}
        stroke="#C4956A"
        strokeWidth="1.5"
        markerStart="url(#arrowhead-rev)"
        markerEnd="url(#arrowhead)"
      />
      <text
        x={doorX + doorW / 2}
        y={doorY + doorH + 35}
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="#C4956A"
        fontFamily="system-ui"
      >
        {width} سم
      </text>

      {/* Height dimension line */}
      <line
        x1={doorX + doorW + 20}
        y1={doorY}
        x2={doorX + doorW + 20}
        y2={doorY + doorH}
        stroke="#C4956A"
        strokeWidth="1.5"
        markerStart="url(#arrowhead-rev)"
        markerEnd="url(#arrowhead)"
      />
      <text
        x={doorX + doorW + 38}
        y={doorY + doorH / 2 + 4}
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="#C4956A"
        fontFamily="system-ui"
        transform={`rotate(-90, ${doorX + doorW + 38}, ${doorY + doorH / 2 + 4})`}
      >
        {height} سم
      </text>

      {/* Label */}
      <text x={svgW / 2} y={svgH - 8} textAnchor="middle" fontSize="9" fill="#888" fontFamily="system-ui">
        {dir === "rtl" ? "رسم توضيحي — ليس للمقياس" : "Illustration — Not to scale"}
      </text>
    </svg>
  );
}

// ============================================================
// المكوّن الرئيسي
// ============================================================
export default function SizeGuideModal({ isOpen, onClose, doorType = "interior" }: SizeGuideModalProps) {
  const { dir } = useLanguage();
  const isRTL = dir === "rtl";

  const [activeTab, setActiveTab] = useState<"sizes" | "how-to" | "tips">("sizes");
  const [selectedSize, setSelectedSize] = useState<{ width: number; height: number } | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(1);

  // Resolve sizes for this door type
  const sizes =
    STANDARD_SIZES[doorType as keyof typeof STANDARD_SIZES] ||
    STANDARD_SIZES.interior;

  const doorTypeLabel: Record<string, { ar: string; en: string }> = {
    interior: { ar: "أبواب داخلية", en: "Interior Doors" },
    exterior: { ar: "أبواب خارجية", en: "Exterior Doors" },
    fire: { ar: "أبواب حريق", en: "Fire Doors" },
    acoustic: { ar: "أبواب عازلة للصوت", en: "Acoustic Doors" },
  };
  const typeLabel = doorTypeLabel[doorType] || doorTypeLabel.interior;

  const tabs = [
    { id: "sizes" as const, label_ar: "المقاسات القياسية", label_en: "Standard Sizes" },
    { id: "how-to" as const, label_ar: "كيفية القياس", label_en: "How to Measure" },
    { id: "tips" as const, label_ar: "نصائح الاختيار", label_en: "Selection Tips" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        dir={dir}
        className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border-0 shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-l from-oak to-oak-dark p-6 rounded-t-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Ruler className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-white text-xl font-bold">
                  {isRTL ? "دليل المقاسات" : "Size Guide"}
                </DialogTitle>
                <p className="text-white/70 text-sm mt-0.5">
                  {isRTL ? typeLabel.ar : typeLabel.en}
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border/40 bg-white px-4 pt-2 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-oak text-oak bg-oak/5"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {isRTL ? tab.label_ar : tab.label_en}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 bg-white rounded-b-2xl">
          <AnimatePresence mode="wait">
            {/* ── Tab 1: المقاسات القياسية ── */}
            {activeTab === "sizes" && (
              <motion.div
                key="sizes"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: size table */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-foreground text-sm">
                      {isRTL ? "اختر المقاس لمعاينته" : "Select a size to preview"}
                    </h3>
                    <div className="space-y-2">
                      {sizes.map((s, i) => {
                        const isSelected = selectedSize?.width === s.width && selectedSize?.height === s.height;
                        return (
                          <button
                            key={i}
                            onClick={() => setSelectedSize({ width: s.width, height: s.height })}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-start ${
                              isSelected
                                ? "border-oak bg-oak/5 shadow-sm"
                                : "border-border/40 hover:border-oak/40 bg-white"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-oak flex-shrink-0" />
                              )}
                              {!isSelected && (
                                <div className="w-4 h-4 rounded-full border-2 border-border/60 flex-shrink-0" />
                              )}
                              <div>
                                <div className="font-bold text-foreground text-sm">
                                  {s.width} × {s.height} سم
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {isRTL ? s.use_ar : s.use_en}
                                </div>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-[10px] flex-shrink-0 ${isSelected ? "border-oak text-oak" : ""}`}
                            >
                              {s.width}×{s.height}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: door diagram */}
                  <div className="flex flex-col items-center justify-center gap-4">
                    {selectedSize ? (
                      <motion.div
                        key={`${selectedSize.width}-${selectedSize.height}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25 }}
                        className="w-full"
                      >
                        <DoorDiagram
                          width={selectedSize.width}
                          height={selectedSize.height}
                          dir={dir}
                        />
                        <div className="mt-3 bg-beige-light rounded-xl p-4 text-center space-y-1">
                          <div className="text-2xl font-bold text-oak">
                            {selectedSize.width} × {selectedSize.height}
                            <span className="text-base font-normal text-muted-foreground mr-1">سم</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {isRTL
                              ? `المساحة: ${((selectedSize.width * selectedSize.height) / 10000).toFixed(2)} م²`
                              : `Area: ${((selectedSize.width * selectedSize.height) / 10000).toFixed(2)} m²`}
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3 text-center py-8 text-muted-foreground">
                        <Ruler className="w-12 h-12 opacity-20" />
                        <p className="text-sm">
                          {isRTL ? "اختر مقاساً لمعاينة الرسم التوضيحي" : "Select a size to preview the diagram"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Note */}
                <div className="flex items-start gap-2 bg-blue-50 rounded-xl p-3 border border-blue-100">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    {isRTL
                      ? "المقاسات أعلاه هي أبعاد الباب نفسه. فتحة الحائط يجب أن تكون أكبر بـ 4-6 سم في العرض و2-3 سم في الارتفاع لاستيعاب الإطار."
                      : "The sizes above are the door leaf dimensions. The wall opening should be 4-6 cm wider and 2-3 cm taller to accommodate the frame."}
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── Tab 2: كيفية القياس ── */}
            {activeTab === "how-to" && (
              <motion.div
                key="how-to"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <p className="text-sm text-muted-foreground">
                  {isRTL
                    ? "اتبع هذه الخطوات للحصول على قياسات دقيقة قبل طلب بابك."
                    : "Follow these steps to get accurate measurements before ordering your door."}
                </p>
                {MEASUREMENT_STEPS.map((step) => {
                  const isExpanded = expandedStep === step.step;
                  return (
                    <div
                      key={step.step}
                      className="border border-border/40 rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandedStep(isExpanded ? null : step.step)}
                        className="w-full flex items-center gap-4 p-4 text-start hover:bg-beige-light/50 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-xl bg-oak/10 flex items-center justify-center flex-shrink-0 text-xl">
                          {step.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-oak uppercase tracking-wider">
                              {isRTL ? `الخطوة ${step.step}` : `Step ${step.step}`}
                            </span>
                          </div>
                          <div className="font-semibold text-foreground text-sm">
                            {isRTL ? step.title_ar : step.title_en}
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
                              <p className="text-sm text-foreground leading-relaxed">
                                {isRTL ? step.desc_ar : step.desc_en}
                              </p>
                              <div className="flex items-start gap-2 bg-amber-50 rounded-lg p-3 border border-amber-100">
                                <span className="text-amber-500 text-sm flex-shrink-0">💡</span>
                                <p className="text-xs text-amber-800 leading-relaxed">
                                  {isRTL ? step.tip_ar : step.tip_en}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {/* Measurement diagram */}
                <div className="bg-beige-light rounded-xl p-4 mt-2">
                  <h4 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-oak" />
                    {isRTL ? "نقاط القياس الصحيحة" : "Correct Measurement Points"}
                  </h4>
                  <svg viewBox="0 0 280 180" className="w-full max-w-xs mx-auto">
                    {/* Wall opening */}
                    <rect x="60" y="20" width="160" height="140" fill="none" stroke="#2C4A3E" strokeWidth="3" strokeDasharray="6,3" rx="2" />
                    {/* Width measurements */}
                    {[35, 90, 145].map((y, i) => (
                      <g key={i}>
                        <line x1="60" y1={y} x2="220" y2={y} stroke="#C4956A" strokeWidth="1" strokeDasharray="3,2" />
                        <circle cx="60" cy={y} r="3" fill="#C4956A" />
                        <circle cx="220" cy={y} r="3" fill="#C4956A" />
                      </g>
                    ))}
                    {/* Height measurements */}
                    {[85, 140, 195].map((x, i) => (
                      <g key={i}>
                        <line x1={x} y1="20" x2={x} y2="160" stroke="#C4956A" strokeWidth="1" strokeDasharray="3,2" />
                        <circle cx={x} cy="20" r="3" fill="#C4956A" />
                        <circle cx={x} cy="160" r="3" fill="#C4956A" />
                      </g>
                    ))}
                    {/* Labels */}
                    <text x="140" y="175" textAnchor="middle" fontSize="10" fill="#2C4A3E" fontWeight="600" fontFamily="system-ui">
                      {isRTL ? "العرض — 3 قياسات" : "Width — 3 measurements"}
                    </text>
                    <text x="15" y="95" textAnchor="middle" fontSize="10" fill="#2C4A3E" fontWeight="600" fontFamily="system-ui" transform="rotate(-90,15,95)">
                      {isRTL ? "الارتفاع — 3 قياسات" : "Height — 3 measurements"}
                    </text>
                  </svg>
                </div>
              </motion.div>
            )}

            {/* ── Tab 3: نصائح الاختيار ── */}
            {activeTab === "tips" && (
              <motion.div
                key="tips"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <p className="text-sm text-muted-foreground">
                  {isRTL
                    ? "نصائح من خبراء سنديان لمساعدتك على اختيار الباب المناسب."
                    : "Tips from Sindian experts to help you choose the right door."}
                </p>

                {TIPS.map((tip, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className={`flex items-start gap-3 p-4 rounded-xl border ${
                      tip.type === "warning"
                        ? "bg-amber-50 border-amber-100"
                        : "bg-blue-50 border-blue-100"
                    }`}
                  >
                    {tip.type === "warning" ? (
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    )}
                    <p className={`text-sm leading-relaxed ${tip.type === "warning" ? "text-amber-800" : "text-blue-800"}`}>
                      {isRTL ? tip.text_ar : tip.text_en}
                    </p>
                  </motion.div>
                ))}

                {/* Quick reference table */}
                <div className="mt-4">
                  <h4 className="font-semibold text-foreground text-sm mb-3">
                    {isRTL ? "جدول المقاسات السريع" : "Quick Reference Table"}
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-border/40">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-oak text-white">
                          <th className="px-4 py-2.5 text-start font-semibold text-xs">
                            {isRTL ? "نوع الغرفة" : "Room Type"}
                          </th>
                          <th className="px-4 py-2.5 text-center font-semibold text-xs">
                            {isRTL ? "العرض الموصى" : "Rec. Width"}
                          </th>
                          <th className="px-4 py-2.5 text-center font-semibold text-xs">
                            {isRTL ? "الارتفاع الموصى" : "Rec. Height"}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { room_ar: "حمام / دورة مياه", room_en: "Bathroom / WC", w: "60–70 سم", h: "200 سم" },
                          { room_ar: "غرفة نوم", room_en: "Bedroom", w: "70–80 سم", h: "200–210 سم" },
                          { room_ar: "صالة / معيشة", room_en: "Living Room", w: "90–100 سم", h: "210 سم" },
                          { room_ar: "مدخل رئيسي", room_en: "Main Entrance", w: "100–120 سم", h: "210–220 سم" },
                          { room_ar: "مخرج طوارئ", room_en: "Emergency Exit", w: "≥ 80 سم", h: "≥ 200 سم" },
                        ].map((row, i) => (
                          <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-beige-light/40"}>
                            <td className="px-4 py-2.5 text-foreground font-medium text-xs">
                              {isRTL ? row.room_ar : row.room_en}
                            </td>
                            <td className="px-4 py-2.5 text-center text-muted-foreground text-xs">{row.w}</td>
                            <td className="px-4 py-2.5 text-center text-muted-foreground text-xs">{row.h}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 bg-white rounded-b-2xl border-t border-border/20 pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {isRTL
                ? "هل تحتاج مساعدة؟ تواصل مع فريق سنديان: 920-000-000"
                : "Need help? Contact Sindian team: 920-000-000"}
            </p>
            <Button
              onClick={onClose}
              className="bg-oak hover:bg-oak-dark text-white rounded-lg px-5"
            >
              {isRTL ? "فهمت، شكراً" : "Got it, thanks"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
