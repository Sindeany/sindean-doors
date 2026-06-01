/**
 * Shared products data for Sindian Doors store
 * Used across Products page, Product Detail, and Featured sections
 */

import {
  INTERIOR_DOOR_OPTIONS,
  EXTERIOR_DOOR_OPTIONS,
  FIRE_DOOR_OPTIONS,
  ACOUSTIC_DOOR_OPTIONS,
} from "./productOptions";

const CLASSIC_DOOR =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/product-classic-door-BVsWk2zwi8AhwPnCA2bPST.webp";
const MODERN_DOOR =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/product-modern-door-ZUHyARH6878fCSEmyEDhqJ.webp";
const HERO_DOOR =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/hero-door-XRVFQ3nypbQtd5qxWnjggQ.webp";
const B2B_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/b2b-meeting-mwGMjJwsNUmxPJQPyMhAHb.webp";
const WORKSHOP_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC/workshop-craftsmanship-5Wnk3rHkNrAWAYJQbFcK9c.webp";

export interface PriceTier {
  min: number;
  max: number | null;
  price: number;
  label: string;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Review {
  id: string;
  author: string;
  date: string;
  rating: number;
  title: string;
  content: string;
  verified: boolean;
  helpful: number;
}

// ── Product customization options ──────────────────────────────
export type ProductOptionType = "color" | "size" | "handle" | "finish" | "wood" | "glass" | "hinge";

export interface ProductOptionValue {
  id: string;
  label: string;       // Arabic label
  labelEn?: string;    // English label
  hex?: string;        // For color swatches
  priceAdj?: number;   // Price adjustment (+ or -)
  image?: string;      // Optional swatch image
  available?: boolean; // Default true
}

export interface ProductOption {
  id: string;
  type: ProductOptionType;
  label: string;       // Arabic
  labelEn?: string;    // English
  required: boolean;
  values: ProductOptionValue[];
}
// ────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  woodType: string;
  image: string;
  images: string[];
  tiers: PriceTier[];
  badge?: string;
  badgeColor?: "copper" | "oak" | "green" | "red";
  features: string[];
  description: string;
  specs: ProductSpec[];
  dimensions?: string;
  rating: number;
  reviewCount: number;
  reviews: Review[];
  inStock: boolean;
  isNew?: boolean;
  isBestseller?: boolean;
  isCertified?: boolean;
  tags: string[];
  sku: string;
  weight?: string;
  warranty?: string;
  options?: ProductOption[]; // Customization options
}

export const CATEGORIES = [
  { id: "all", label: "جميع المنتجات", count: 12 },
  { id: "interior", label: "أبواب داخلية", count: 4 },
  { id: "exterior", label: "أبواب خارجية", count: 3 },
  { id: "fire", label: "أبواب مقاومة للحريق", count: 2 },
  { id: "acoustic", label: "أبواب عازلة للصوت", count: 2 },
  { id: "accessories", label: "مستلزمات الأبواب", count: 1 },
];

export const WOOD_TYPES = [
  { id: "all", label: "جميع الأنواع" },
  { id: "oak", label: "خشب السنديان" },
  { id: "walnut", label: "خشب الجوز" },
  { id: "teak", label: "خشب الساج" },
  { id: "mahogany", label: "خشب الماهوجني" },
  { id: "pine", label: "خشب الصنوبر" },
];

export const SORT_OPTIONS = [
  { id: "featured", label: "الأكثر تميزاً" },
  { id: "price-asc", label: "السعر: من الأقل" },
  { id: "price-desc", label: "السعر: من الأعلى" },
  { id: "newest", label: "الأحدث" },
  { id: "rating", label: "الأعلى تقييماً" },
];

// Shared review pool
const REVIEW_POOL: Review[] = [
  { id: "r1", author: "أحمد المطيري", date: "2026-03-15", rating: 5, title: "جودة استثنائية", content: "الباب وصل بحالة ممتازة والتشطيب رائع. خشب طبيعي حقيقي وليس صناعي. أنصح به بشدة لمن يبحث عن الجودة.", verified: true, helpful: 24 },
  { id: "r2", author: "فاطمة الزهراني", date: "2026-02-28", rating: 5, title: "أفضل أبواب اشتريتها", content: "طلبت 8 أبواب لمنزلي الجديد واستفدت من سعر الجملة. التركيب كان سهلاً والنتيجة مذهلة. شكراً سنديان!", verified: true, helpful: 18 },
  { id: "r3", author: "محمد العتيبي", date: "2026-01-20", rating: 4, title: "جيد جداً مع ملاحظة بسيطة", content: "الباب ممتاز من حيث الخامة والتصميم. فقط التوصيل تأخر يومين عن الموعد المحدد. بخلاف ذلك كل شيء رائع.", verified: true, helpful: 12 },
  { id: "r4", author: "سارة القحطاني", date: "2026-03-02", rating: 5, title: "تصميم راقي وعملي", content: "اخترت التصميم الكلاسيكي وكان الاختيار الأمثل لديكور منزلنا. الخشب فعلاً طبيعي وملمسه رائع.", verified: true, helpful: 15 },
  { id: "r5", author: "خالد الشمري", date: "2025-12-10", rating: 5, title: "ممتاز للمشاريع", content: "طلبنا 50 باب لمشروع سكني واستفدنا من أسعار الجملة الممتازة. الجودة موحدة في جميع الأبواب والتسليم كان في الموعد.", verified: true, helpful: 31 },
  { id: "r6", author: "نورة الدوسري", date: "2026-02-14", rating: 4, title: "جودة عالية", content: "الباب جميل جداً وثقيل مما يدل على جودة الخشب. التغليف كان ممتازاً ووصل بدون أي خدوش.", verified: true, helpful: 9 },
  { id: "r7", author: "عبدالله الحربي", date: "2026-03-22", rating: 5, title: "خدمة عملاء رائعة", content: "تواصلت معهم لتخصيص المقاسات وكانوا متعاونين جداً. النتيجة النهائية فاقت توقعاتي.", verified: true, helpful: 20 },
  { id: "r8", author: "ريم السبيعي", date: "2026-01-05", rating: 5, title: "أنصح به بقوة", content: "هذا ثاني طلب لي من سنديان. المرة الأولى كانت لمنزلي والآن لمكتبي. لن أشتري من مكان آخر.", verified: true, helpful: 27 },
];

function getReviews(ids: number[]): Review[] {
  return ids.map((i) => REVIEW_POOL[i]);
}

export const allProducts: Product[] = [
  {
    id: "1",
    name: "باب كلاسيكي من خشب السنديان",
    category: "أبواب داخلية",
    subcategory: "interior",
    woodType: "oak",
    image: CLASSIC_DOOR,
    images: [CLASSIC_DOOR, HERO_DOOR, WORKSHOP_IMAGE, MODERN_DOOR],
    badge: "الأكثر مبيعاً",
    badgeColor: "copper",
    isBestseller: true,
    rating: 4.9,
    reviewCount: 128,
    inStock: true,
    dimensions: "210 × 90 سم",
    sku: "SND-INT-OAK-001",
    weight: "38 كجم",
    warranty: "10 سنوات",
    description: "باب داخلي كلاسيكي مصنوع من خشب السنديان الطبيعي بنسبة 100%. يتميز بتصميم أنيق يجمع بين الطابع التقليدي والمتانة العالية. مقاوم للرطوبة ومعالج بطبقات حماية متعددة لضمان عمر افتراضي طويل. مثالي للغرف الداخلية والصالات.",
    tiers: [
      { min: 1, max: 4, price: 1200, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 980, label: "5-9 أبواب" },
      { min: 10, max: null, price: 850, label: "10+ أبواب" },
    ],
    features: ["خشب سنديان طبيعي 100%", "مقاوم للرطوبة", "ضمان 10 سنوات", "تشطيب ممتاز"],
    specs: [
      { label: "نوع الخشب", value: "سنديان طبيعي صلب" },
      { label: "السماكة", value: "45 مم" },
      { label: "الارتفاع", value: "210 سم" },
      { label: "العرض", value: "90 سم" },
      { label: "الوزن", value: "38 كجم" },
      { label: "التشطيب", value: "ورنيش مائي مقاوم للخدش" },
      { label: "نوع الإطار", value: "إطار خشبي صلب" },
      { label: "مقاومة الرطوبة", value: "نعم - معالج" },
      { label: "الضمان", value: "10 سنوات" },
      { label: "بلد المنشأ", value: "المملكة العربية السعودية" },
    ],
    reviews: getReviews([0, 1, 3, 7]),
    tags: ["كلاسيكي", "داخلي", "سنديان"],
    options: INTERIOR_DOOR_OPTIONS,
  },
  {
    id: "2",
    name: "باب عصري بقشرة الجوز",
    category: "أبواب داخلية",
    subcategory: "interior",
    woodType: "walnut",
    image: MODERN_DOOR,
    images: [MODERN_DOOR, HERO_DOOR, CLASSIC_DOOR, WORKSHOP_IMAGE],
    badge: "جديد",
    badgeColor: "oak",
    isNew: true,
    rating: 4.7,
    reviewCount: 54,
    inStock: true,
    dimensions: "210 × 90 سم",
    sku: "SND-INT-WAL-002",
    weight: "35 كجم",
    warranty: "10 سنوات",
    description: "باب عصري بتصميم مينيمالست أنيق مغطى بقشرة الجوز الطبيعية. يوفر عزلاً صوتياً محسّناً بفضل طبقاته المتعددة. سطحه مقاوم للخدش مما يجعله مثالياً للاستخدام اليومي المكثف في المنازل والمكاتب.",
    tiers: [
      { min: 1, max: 4, price: 1450, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 1180, label: "5-9 أبواب" },
      { min: 10, max: null, price: 1020, label: "10+ أبواب" },
    ],
    features: ["قشرة جوز طبيعية", "تصميم مينيمالست", "عزل صوتي محسّن", "سطح مقاوم للخدش"],
    specs: [
      { label: "نوع الخشب", value: "قشرة جوز طبيعية على MDF" },
      { label: "السماكة", value: "40 مم" },
      { label: "الارتفاع", value: "210 سم" },
      { label: "العرض", value: "90 سم" },
      { label: "الوزن", value: "35 كجم" },
      { label: "التشطيب", value: "لاكر مطفي" },
      { label: "العزل الصوتي", value: "32 ديسيبل" },
      { label: "مقاومة الخدش", value: "نعم - طبقة حماية" },
      { label: "الضمان", value: "10 سنوات" },
      { label: "بلد المنشأ", value: "المملكة العربية السعودية" },
    ],
    reviews: getReviews([2, 5, 6]),
    tags: ["عصري", "داخلي", "جوز"],
  },
  {
    id: "3",
    name: "باب داخلي بإطار مزدوج",
    category: "أبواب داخلية",
    subcategory: "interior",
    woodType: "oak",
    image: CLASSIC_DOOR,
    images: [CLASSIC_DOOR, MODERN_DOOR, HERO_DOOR, B2B_IMAGE],
    rating: 4.6,
    reviewCount: 37,
    inStock: true,
    dimensions: "210 × 120 سم",
    sku: "SND-INT-OAK-003",
    weight: "52 كجم",
    warranty: "10 سنوات",
    description: "باب داخلي فاخر بإطار مزدوج من خشب السنديان الصلب. يتوفر بخيار زجاج مصنفر يضيف لمسة عصرية. مثالي للصالات الكبيرة وغرف المعيشة حيث يمنح إحساساً بالفخامة والرحابة.",
    tiers: [
      { min: 1, max: 4, price: 1650, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 1350, label: "5-9 أبواب" },
      { min: 10, max: null, price: 1180, label: "10+ أبواب" },
    ],
    features: ["إطار مزدوج فاخر", "زجاج مصنفر اختياري", "خشب سنديان صلب", "تصميم مخصص"],
    specs: [
      { label: "نوع الخشب", value: "سنديان صلب" },
      { label: "السماكة", value: "45 مم" },
      { label: "الارتفاع", value: "210 سم" },
      { label: "العرض", value: "120 سم (مزدوج)" },
      { label: "الوزن", value: "52 كجم" },
      { label: "التشطيب", value: "ورنيش لامع" },
      { label: "الزجاج", value: "مصنفر اختياري 6 مم" },
      { label: "الضمان", value: "10 سنوات" },
    ],
    reviews: getReviews([3, 6]),
    tags: ["إطار مزدوج", "داخلي", "سنديان"],
    options: INTERIOR_DOOR_OPTIONS,
  },
  {
    id: "4",
    name: "باب داخلي ساج طبيعي",
    category: "أبواب داخلية",
    subcategory: "interior",
    woodType: "teak",
    image: MODERN_DOOR,
    images: [MODERN_DOOR, CLASSIC_DOOR, WORKSHOP_IMAGE, HERO_DOOR],
    rating: 4.8,
    reviewCount: 82,
    inStock: true,
    dimensions: "210 × 90 سم",
    sku: "SND-INT-TEK-004",
    weight: "40 كجم",
    warranty: "15 سنوات",
    description: "باب داخلي فاخر من خشب الساج الأصلي المعروف بمقاومته الطبيعية للحشرات والرطوبة. يتميز بلمسة نهائية طبيعية تبرز جمال ألياف الخشب. يأتي مع ضمان 15 سنة مما يعكس ثقتنا في جودته.",
    tiers: [
      { min: 1, max: 4, price: 1900, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 1550, label: "5-9 أبواب" },
      { min: 10, max: null, price: 1350, label: "10+ أبواب" },
    ],
    features: ["خشب ساج أصلي", "مقاوم للحشرات طبيعياً", "ضمان 15 سنة", "لمسة نهائية طبيعية"],
    specs: [
      { label: "نوع الخشب", value: "ساج طبيعي أصلي" },
      { label: "السماكة", value: "45 مم" },
      { label: "الارتفاع", value: "210 سم" },
      { label: "العرض", value: "90 سم" },
      { label: "الوزن", value: "40 كجم" },
      { label: "التشطيب", value: "زيت طبيعي" },
      { label: "مقاومة الحشرات", value: "طبيعية" },
      { label: "الضمان", value: "15 سنة" },
    ],
    reviews: getReviews([0, 4, 7]),
    tags: ["ساج", "داخلي", "فاخر"],
    options: INTERIOR_DOOR_OPTIONS,
  },
  {
    id: "5",
    name: "باب رئيسي فاخر محفور",
    category: "أبواب خارجية",
    subcategory: "exterior",
    woodType: "mahogany",
    image: CLASSIC_DOOR,
    images: [CLASSIC_DOOR, HERO_DOOR, WORKSHOP_IMAGE, B2B_IMAGE],
    badge: "حصري",
    badgeColor: "copper",
    rating: 4.9,
    reviewCount: 43,
    inStock: true,
    dimensions: "220 × 100 سم",
    sku: "SND-EXT-MAH-005",
    weight: "55 كجم",
    warranty: "12 سنوات",
    description: "باب رئيسي فاخر من خشب الماهوجني بنقوش يدوية فنية. مصمم خصيصاً للمداخل الرئيسية ويتميز بقفل أمان متعدد النقاط وطلاء UV لحمايته من أشعة الشمس. تحفة فنية تجمع بين الأمان والجمال.",
    tiers: [
      { min: 1, max: 4, price: 2800, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 2350, label: "5-9 أبواب" },
      { min: 10, max: null, price: 2100, label: "10+ أبواب" },
    ],
    features: ["نقش يدوي فاخر", "مقاوم للعوامل الجوية", "قفل أمان متعدد النقاط", "طلاء UV"],
    specs: [
      { label: "نوع الخشب", value: "ماهوجني صلب" },
      { label: "السماكة", value: "55 مم" },
      { label: "الارتفاع", value: "220 سم" },
      { label: "العرض", value: "100 سم" },
      { label: "الوزن", value: "55 كجم" },
      { label: "التشطيب", value: "طلاء UV متعدد الطبقات" },
      { label: "النقش", value: "يدوي فني" },
      { label: "القفل", value: "أمان متعدد النقاط" },
      { label: "الضمان", value: "12 سنة" },
    ],
    reviews: getReviews([4, 7, 0, 6]),
    tags: ["خارجي", "محفور", "ماهوجني", "فاخر"],
    options: EXTERIOR_DOOR_OPTIONS,
  },
  {
    id: "6",
    name: "باب خارجي مقاوم للعوامل الجوية",
    category: "أبواب خارجية",
    subcategory: "exterior",
    woodType: "teak",
    image: MODERN_DOOR,
    images: [MODERN_DOOR, HERO_DOOR, CLASSIC_DOOR, WORKSHOP_IMAGE],
    rating: 4.7,
    reviewCount: 61,
    inStock: true,
    dimensions: "215 × 95 سم",
    sku: "SND-EXT-TEK-006",
    weight: "48 كجم",
    warranty: "12 سنوات",
    description: "باب خارجي من خشب الساج المعالج ضد الرطوبة والأشعة فوق البنفسجية. مصمم لتحمل الظروف المناخية القاسية مع الحفاظ على مظهره الأنيق لسنوات طويلة. سهل الصيانة ويأتي مع ضمان 12 سنة.",
    tiers: [
      { min: 1, max: 4, price: 2200, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 1850, label: "5-9 أبواب" },
      { min: 10, max: null, price: 1650, label: "10+ أبواب" },
    ],
    features: ["معالجة ضد الرطوبة", "ضمان 12 سنة", "مقاوم للأشعة فوق البنفسجية", "سهل الصيانة"],
    specs: [
      { label: "نوع الخشب", value: "ساج معالج" },
      { label: "السماكة", value: "50 مم" },
      { label: "الارتفاع", value: "215 سم" },
      { label: "العرض", value: "95 سم" },
      { label: "الوزن", value: "48 كجم" },
      { label: "التشطيب", value: "طلاء بحري مقاوم" },
      { label: "حماية UV", value: "نعم" },
      { label: "الضمان", value: "12 سنة" },
    ],
    reviews: getReviews([1, 5, 2]),
    tags: ["خارجي", "مقاوم للطقس", "ساج"],
    options: EXTERIOR_DOOR_OPTIONS,
  },
  {
    id: "7",
    name: "باب خارجي بنافذة جانبية",
    category: "أبواب خارجية",
    subcategory: "exterior",
    woodType: "oak",
    image: CLASSIC_DOOR,
    images: [CLASSIC_DOOR, MODERN_DOOR, HERO_DOOR, B2B_IMAGE],
    rating: 4.5,
    reviewCount: 29,
    inStock: false,
    dimensions: "220 × 130 سم",
    sku: "SND-EXT-OAK-007",
    weight: "62 كجم",
    warranty: "10 سنوات",
    description: "باب خارجي أنيق مع نافذة جانبية مزدوجة من الزجاج المقسى. يوفر إضاءة طبيعية للمدخل مع الحفاظ على الخصوصية والعزل الحراري. مصنوع من خشب السنديان الصلب بتصميم يجمع بين الوظيفية والجمال.",
    tiers: [
      { min: 1, max: 4, price: 3200, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 2700, label: "5-9 أبواب" },
      { min: 10, max: null, price: 2400, label: "10+ أبواب" },
    ],
    features: ["نافذة جانبية مزدوجة", "زجاج مقسى", "سنديان صلب", "عزل حراري"],
    specs: [
      { label: "نوع الخشب", value: "سنديان صلب" },
      { label: "السماكة", value: "50 مم" },
      { label: "الارتفاع", value: "220 سم" },
      { label: "العرض", value: "130 سم (مع النوافذ)" },
      { label: "الوزن", value: "62 كجم" },
      { label: "الزجاج", value: "مقسى 8 مم" },
      { label: "العزل الحراري", value: "نعم" },
      { label: "الضمان", value: "10 سنوات" },
    ],
    reviews: getReviews([3, 6]),
    tags: ["خارجي", "نافذة جانبية", "سنديان"],
    options: EXTERIOR_DOOR_OPTIONS,
  },
  {
    id: "8",
    name: "باب مقاوم للحريق 60 دقيقة",
    category: "أبواب مقاومة للحريق",
    subcategory: "fire",
    woodType: "oak",
    image: MODERN_DOOR,
    images: [MODERN_DOOR, CLASSIC_DOOR, B2B_IMAGE, WORKSHOP_IMAGE],
    badge: "معتمد",
    badgeColor: "red",
    isCertified: true,
    rating: 4.9,
    reviewCount: 95,
    inStock: true,
    dimensions: "210 × 90 سم",
    sku: "SND-FIR-OAK-008",
    weight: "45 كجم",
    warranty: "10 سنوات",
    description: "باب مقاوم للحريق لمدة 60 دقيقة حاصل على شهادة UL المعتمدة دولياً. مزود بنظام إغلاق ذاتي ومانع دخان. مثالي للمباني التجارية والسكنية التي تتطلب معايير السلامة العالية.",
    tiers: [
      { min: 1, max: 4, price: 1800, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 1500, label: "5-9 أبواب" },
      { min: 10, max: null, price: 1350, label: "10+ أبواب" },
    ],
    features: ["مقاوم للحريق 60 دقيقة", "شهادة UL معتمدة", "إغلاق ذاتي", "مانع دخان"],
    specs: [
      { label: "نوع الخشب", value: "سنديان مع حشو مقاوم للحريق" },
      { label: "مقاومة الحريق", value: "60 دقيقة" },
      { label: "الشهادات", value: "UL, EN 1634-1" },
      { label: "السماكة", value: "50 مم" },
      { label: "الارتفاع", value: "210 سم" },
      { label: "العرض", value: "90 سم" },
      { label: "الوزن", value: "45 كجم" },
      { label: "الإغلاق", value: "ذاتي هيدروليكي" },
      { label: "مانع الدخان", value: "نعم - مدمج" },
      { label: "الضمان", value: "10 سنوات" },
    ],
    reviews: getReviews([4, 0, 7, 2]),
    tags: ["حريق", "معتمد", "أمان"],
    options: FIRE_DOOR_OPTIONS,
  },
  {
    id: "9",
    name: "باب مقاوم للحريق 90 دقيقة",
    category: "أبواب مقاومة للحريق",
    subcategory: "fire",
    woodType: "oak",
    image: CLASSIC_DOOR,
    images: [CLASSIC_DOOR, MODERN_DOOR, B2B_IMAGE, WORKSHOP_IMAGE],
    badge: "معتمد",
    badgeColor: "red",
    isCertified: true,
    rating: 4.9,
    reviewCount: 67,
    inStock: true,
    dimensions: "210 × 90 سم",
    sku: "SND-FIR-OAK-009",
    weight: "52 كجم",
    warranty: "10 سنوات",
    description: "باب مقاوم للحريق لمدة 90 دقيقة بأعلى معايير السلامة. حاصل على شهادة ISO ومزود بنظام إغلاق ذاتي مزدوج وعزل حراري عالي. الخيار الأمثل للمنشآت التي تتطلب أقصى درجات الحماية.",
    tiers: [
      { min: 1, max: 4, price: 2400, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 2000, label: "5-9 أبواب" },
      { min: 10, max: null, price: 1800, label: "10+ أبواب" },
    ],
    features: ["مقاوم للحريق 90 دقيقة", "شهادة ISO معتمدة", "إغلاق ذاتي مزدوج", "عزل حراري عالي"],
    specs: [
      { label: "نوع الخشب", value: "سنديان مع حشو مقاوم للحريق" },
      { label: "مقاومة الحريق", value: "90 دقيقة" },
      { label: "الشهادات", value: "ISO 3008, EN 1634-1" },
      { label: "السماكة", value: "55 مم" },
      { label: "الارتفاع", value: "210 سم" },
      { label: "العرض", value: "90 سم" },
      { label: "الوزن", value: "52 كجم" },
      { label: "الإغلاق", value: "ذاتي مزدوج" },
      { label: "العزل الحراري", value: "عالي" },
      { label: "الضمان", value: "10 سنوات" },
    ],
    reviews: getReviews([4, 1, 5]),
    tags: ["حريق", "معتمد", "أمان", "90 دقيقة"],
    options: FIRE_DOOR_OPTIONS,
  },
  {
    id: "10",
    name: "باب عازل للصوت - درجة احترافية",
    category: "أبواب عازلة للصوت",
    subcategory: "acoustic",
    woodType: "walnut",
    image: MODERN_DOOR,
    images: [MODERN_DOOR, CLASSIC_DOOR, HERO_DOOR, WORKSHOP_IMAGE],
    badge: "احترافي",
    badgeColor: "oak",
    rating: 4.8,
    reviewCount: 44,
    inStock: true,
    dimensions: "210 × 90 سم",
    sku: "SND-ACO-WAL-010",
    weight: "48 كجم",
    warranty: "10 سنوات",
    description: "باب عازل للصوت بدرجة احترافية يوفر عزلاً صوتياً يصل إلى 45 ديسيبل. مصمم خصيصاً للاستوديوهات وغرف الاجتماعات والمكاتب التنفيذية. يتكون من طبقات متعددة مع مانع صوت مطاطي محيطي.",
    tiers: [
      { min: 1, max: 4, price: 2100, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 1750, label: "5-9 أبواب" },
      { min: 10, max: null, price: 1550, label: "10+ أبواب" },
    ],
    features: ["عزل صوتي 45 ديسيبل", "مناسب للاستوديوهات", "طبقات متعددة", "مانع صوت مطاطي"],
    specs: [
      { label: "نوع الخشب", value: "جوز مع حشو عازل" },
      { label: "العزل الصوتي", value: "45 ديسيبل (STC 45)" },
      { label: "السماكة", value: "55 مم" },
      { label: "الارتفاع", value: "210 سم" },
      { label: "العرض", value: "90 سم" },
      { label: "الوزن", value: "48 كجم" },
      { label: "مانع الصوت", value: "مطاطي محيطي" },
      { label: "الطبقات", value: "5 طبقات عازلة" },
      { label: "الضمان", value: "10 سنوات" },
    ],
    reviews: getReviews([7, 6, 0]),
    tags: ["عازل للصوت", "استوديو", "احترافي"],
    options: ACOUSTIC_DOOR_OPTIONS,
  },
  {
    id: "11",
    name: "باب عازل للصوت - للمنازل",
    category: "أبواب عازلة للصوت",
    subcategory: "acoustic",
    woodType: "pine",
    image: CLASSIC_DOOR,
    images: [CLASSIC_DOOR, MODERN_DOOR, HERO_DOOR, WORKSHOP_IMAGE],
    rating: 4.6,
    reviewCount: 33,
    inStock: true,
    dimensions: "210 × 90 سم",
    sku: "SND-ACO-PIN-011",
    weight: "38 كجم",
    warranty: "8 سنوات",
    description: "باب عازل للصوت مصمم للاستخدام السكني بعزل صوتي 38 ديسيبل. يوفر الهدوء والخصوصية للغرف السكنية بتصميم أنيق وسعر مناسب. سهل التركيب ومتوفر بعدة ألوان.",
    tiers: [
      { min: 1, max: 4, price: 1550, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 1280, label: "5-9 أبواب" },
      { min: 10, max: null, price: 1100, label: "10+ أبواب" },
    ],
    features: ["عزل صوتي 38 ديسيبل", "مناسب للغرف السكنية", "تصميم أنيق", "سهل التركيب"],
    specs: [
      { label: "نوع الخشب", value: "صنوبر مع حشو عازل" },
      { label: "العزل الصوتي", value: "38 ديسيبل (STC 38)" },
      { label: "السماكة", value: "45 مم" },
      { label: "الارتفاع", value: "210 سم" },
      { label: "العرض", value: "90 سم" },
      { label: "الوزن", value: "38 كجم" },
      { label: "الضمان", value: "8 سنوات" },
    ],
    reviews: getReviews([1, 3]),
    tags: ["عازل للصوت", "سكني", "صنوبر"],
    options: ACOUSTIC_DOOR_OPTIONS,
  },
  {
    id: "12",
    name: "طقم مقابض وأقفال فاخرة",
    category: "مستلزمات الأبواب",
    subcategory: "accessories",
    woodType: "oak",
    image: MODERN_DOOR,
    images: [MODERN_DOOR, CLASSIC_DOOR, WORKSHOP_IMAGE, B2B_IMAGE],
    badge: "مجموعة",
    badgeColor: "copper",
    rating: 4.7,
    reviewCount: 156,
    inStock: true,
    dimensions: "متعدد الأحجام",
    sku: "SND-ACC-STL-012",
    weight: "2.5 كجم",
    warranty: "5 سنوات",
    description: "طقم مقابض وأقفال فاخرة من الستانلس ستيل 304 المقاوم للصدأ. يشمل الطقم مقبض، قفل، ومفصلات بتصميم عصري أنيق. سهل التركيب ومتوافق مع جميع أنواع الأبواب.",
    tiers: [
      { min: 1, max: 4, price: 380, label: "1-4 طقم" },
      { min: 5, max: 9, price: 310, label: "5-9 طقم" },
      { min: 10, max: null, price: 270, label: "10+ طقم" },
    ],
    features: ["ستانلس ستيل 304", "مقاوم للصدأ", "ضمان 5 سنوات", "سهل التركيب"],
    specs: [
      { label: "المادة", value: "ستانلس ستيل 304" },
      { label: "التشطيب", value: "مصقول / مطفي" },
      { label: "محتويات الطقم", value: "مقبض + قفل + مفصلات" },
      { label: "التوافق", value: "جميع أنواع الأبواب" },
      { label: "الوزن", value: "2.5 كجم" },
      { label: "الضمان", value: "5 سنوات" },
    ],
    reviews: getReviews([2, 5, 1, 7]),
    tags: ["مستلزمات", "مقابض", "أقفال", "ستانلس"],
  },
];
