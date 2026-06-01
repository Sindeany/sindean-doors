// ============================================================
// Products Router — إدارة كتالوج المنتجات
// CRUD + seed من البيانات الثابتة
// ============================================================
import { z } from "zod/v4";
import { eq, asc, desc, or, like } from "drizzle-orm";
import { router, publicProcedure, adminProcedure } from "./trpc.js";
import { db, schema } from "./db.js";

// ── Cloudfront images (same as static productsData.ts) ──────────────────────
const CDN =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC";
const CLASSIC_DOOR = `${CDN}/product-classic-door-BVsWk2zwi8AhwPnCA2bPST.webp`;
const MODERN_DOOR = `${CDN}/product-modern-door-ZUHyARH6878fCSEmyEDhqJ.webp`;
const HERO_DOOR = `${CDN}/hero-door-XRVFQ3nypbQtd5qxWnjggQ.webp`;
const B2B_IMAGE = `${CDN}/b2b-meeting-mwGMjJwsNUmxPJQPyMhAHb.webp`;
const WORKSHOP_IMAGE = `${CDN}/workshop-craftsmanship-5Wnk3rHkNrAWAYJQbFcK9c.webp`;

// ── Seed data (mirrors client/src/lib/productsData.ts) ──────────────────────
const SEED_PRODUCTS = [
  {
    sku: "SND-INT-OAK-001",
    name: "باب كلاسيكي من خشب السنديان",
    nameEn: "Classic Oak Interior Door",
    category: "interior",
    subcategory: "interior",
    woodType: "oak",
    basePrice: 1200,
    distributorPrice: 960,
    tiers: [
      { min: 1, max: 4, price: 1200, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 980, label: "5-9 أبواب" },
      { min: 10, max: null, price: 850, label: "10+ أبواب" },
    ],
    image: CLASSIC_DOOR,
    images: [CLASSIC_DOOR, HERO_DOOR, WORKSHOP_IMAGE, MODERN_DOOR],
    sizes: ["90×210", "80×200", "100×220"],
    colors: ["بلوط طبيعي", "جوزي داكن", "أبيض مطفي"],
    stock: 45,
    badge: "الأكثر مبيعاً",
    badgeColor: "copper",
    features: [
      "خشب سنديان طبيعي 100%",
      "مقاوم للرطوبة",
      "ضمان 10 سنوات",
      "تشطيب ممتاز",
    ],
    description:
      "باب داخلي كلاسيكي مصنوع من خشب السنديان الطبيعي بنسبة 100%. يتميز بتصميم أنيق يجمع بين الطابع التقليدي والمتانة العالية. مقاوم للرطوبة ومعالج بطبقات حماية متعددة لضمان عمر افتراضي طويل. مثالي للغرف الداخلية والصالات.",
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
    dimensions: "210 × 90 سم",
    rating: 4.9,
    reviewCount: 128,
    inStock: true,
    isNew: false,
    isBestseller: true,
    isCertified: false,
    tags: ["كلاسيكي", "داخلي", "سنديان"],
    weight: "38 كجم",
    warranty: "10 سنوات",
  },
  {
    sku: "SND-INT-WAL-002",
    name: "باب عصري بقشرة الجوز",
    nameEn: "Modern Walnut Veneer Door",
    category: "interior",
    subcategory: "interior",
    woodType: "walnut",
    basePrice: 1450,
    distributorPrice: 1160,
    tiers: [
      { min: 1, max: 4, price: 1450, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 1180, label: "5-9 أبواب" },
      { min: 10, max: null, price: 1020, label: "10+ أبواب" },
    ],
    image: MODERN_DOOR,
    images: [MODERN_DOOR, HERO_DOOR, CLASSIC_DOOR, WORKSHOP_IMAGE],
    sizes: ["90×210", "80×200"],
    colors: ["جوز طبيعي", "جوز داكن"],
    stock: 32,
    badge: "جديد",
    badgeColor: "oak",
    features: [
      "قشرة جوز طبيعية",
      "تصميم مينيمالست",
      "عزل صوتي محسّن",
      "سطح مقاوم للخدش",
    ],
    description:
      "باب عصري بتصميم مينيمالست أنيق مغطى بقشرة الجوز الطبيعية. يوفر عزلاً صوتياً محسّناً بفضل طبقاته المتعددة. سطحه مقاوم للخدش مما يجعله مثالياً للاستخدام اليومي المكثف في المنازل والمكاتب.",
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
    dimensions: "210 × 90 سم",
    rating: 4.7,
    reviewCount: 54,
    inStock: true,
    isNew: true,
    isBestseller: false,
    isCertified: false,
    tags: ["عصري", "داخلي", "جوز"],
    weight: "35 كجم",
    warranty: "10 سنوات",
  },
  {
    sku: "SND-INT-OAK-003",
    name: "باب داخلي بإطار مزدوج",
    nameEn: "Double Frame Interior Door",
    category: "interior",
    subcategory: "interior",
    woodType: "oak",
    basePrice: 1650,
    distributorPrice: 1320,
    tiers: [
      { min: 1, max: 4, price: 1650, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 1350, label: "5-9 أبواب" },
      { min: 10, max: null, price: 1180, label: "10+ أبواب" },
    ],
    image: CLASSIC_DOOR,
    images: [CLASSIC_DOOR, MODERN_DOOR, HERO_DOOR, B2B_IMAGE],
    sizes: ["120×210", "140×210"],
    colors: ["بلوط طبيعي", "أبيض"],
    stock: 18,
    badge: "",
    badgeColor: "",
    features: [
      "إطار مزدوج فاخر",
      "زجاج مصنفر اختياري",
      "خشب سنديان صلب",
      "تصميم مخصص",
    ],
    description:
      "باب داخلي فاخر بإطار مزدوج من خشب السنديان الصلب. يتوفر بخيار زجاج مصنفر يضيف لمسة عصرية. مثالي للصالات الكبيرة وغرف المعيشة حيث يمنح إحساساً بالفخامة والرحابة.",
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
    dimensions: "210 × 120 سم",
    rating: 4.6,
    reviewCount: 37,
    inStock: true,
    isNew: false,
    isBestseller: false,
    isCertified: false,
    tags: ["إطار مزدوج", "داخلي", "سنديان"],
    weight: "52 كجم",
    warranty: "10 سنوات",
  },
  {
    sku: "SND-INT-TEK-004",
    name: "باب داخلي ساج طبيعي",
    nameEn: "Natural Teak Interior Door",
    category: "interior",
    subcategory: "interior",
    woodType: "teak",
    basePrice: 1900,
    distributorPrice: 1520,
    tiers: [
      { min: 1, max: 4, price: 1900, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 1550, label: "5-9 أبواب" },
      { min: 10, max: null, price: 1350, label: "10+ أبواب" },
    ],
    image: MODERN_DOOR,
    images: [MODERN_DOOR, CLASSIC_DOOR, WORKSHOP_IMAGE, HERO_DOOR],
    sizes: ["90×210", "80×210"],
    colors: ["ساج طبيعي", "ساج داكن"],
    stock: 25,
    badge: "",
    badgeColor: "",
    features: [
      "خشب ساج أصلي",
      "مقاوم للحشرات طبيعياً",
      "ضمان 15 سنة",
      "لمسة نهائية طبيعية",
    ],
    description:
      "باب داخلي فاخر من خشب الساج الأصلي المعروف بمقاومته الطبيعية للحشرات والرطوبة. يتميز بلمسة نهائية طبيعية تبرز جمال ألياف الخشب. يأتي مع ضمان 15 سنة مما يعكس ثقتنا في جودته.",
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
    dimensions: "210 × 90 سم",
    rating: 4.8,
    reviewCount: 82,
    inStock: true,
    isNew: false,
    isBestseller: false,
    isCertified: false,
    tags: ["ساج", "داخلي", "فاخر"],
    weight: "40 كجم",
    warranty: "15 سنوات",
  },
  {
    sku: "SND-EXT-MAH-005",
    name: "باب رئيسي فاخر محفور",
    nameEn: "Luxury Carved Main Entrance Door",
    category: "exterior",
    subcategory: "exterior",
    woodType: "mahogany",
    basePrice: 2800,
    distributorPrice: 2240,
    tiers: [
      { min: 1, max: 4, price: 2800, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 2350, label: "5-9 أبواب" },
      { min: 10, max: null, price: 2100, label: "10+ أبواب" },
    ],
    image: CLASSIC_DOOR,
    images: [CLASSIC_DOOR, HERO_DOOR, WORKSHOP_IMAGE, B2B_IMAGE],
    sizes: ["100×220", "110×220"],
    colors: ["ماهوجني طبيعي", "ماهوجني داكن", "كرز"],
    stock: 12,
    badge: "حصري",
    badgeColor: "copper",
    features: [
      "نقش يدوي فاخر",
      "مقاوم للعوامل الجوية",
      "قفل أمان متعدد النقاط",
      "طلاء UV",
    ],
    description:
      "باب رئيسي فاخر من خشب الماهوجني بنقوش يدوية فنية. مصمم خصيصاً للمداخل الرئيسية ويتميز بقفل أمان متعدد النقاط وطلاء UV لحمايته من أشعة الشمس. تحفة فنية تجمع بين الأمان والجمال.",
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
    dimensions: "220 × 100 سم",
    rating: 4.9,
    reviewCount: 43,
    inStock: true,
    isNew: false,
    isBestseller: false,
    isCertified: false,
    tags: ["خارجي", "محفور", "ماهوجني", "فاخر"],
    weight: "55 كجم",
    warranty: "12 سنوات",
  },
  {
    sku: "SND-EXT-TEK-006",
    name: "باب خارجي مقاوم للعوامل الجوية",
    nameEn: "Weather-Resistant Exterior Door",
    category: "exterior",
    subcategory: "exterior",
    woodType: "teak",
    basePrice: 2200,
    distributorPrice: 1760,
    tiers: [
      { min: 1, max: 4, price: 2200, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 1850, label: "5-9 أبواب" },
      { min: 10, max: null, price: 1650, label: "10+ أبواب" },
    ],
    image: MODERN_DOOR,
    images: [MODERN_DOOR, HERO_DOOR, CLASSIC_DOOR, WORKSHOP_IMAGE],
    sizes: ["95×215", "90×210"],
    colors: ["ساج معالج", "بني داكن"],
    stock: 28,
    badge: "",
    badgeColor: "",
    features: [
      "معالجة ضد الرطوبة",
      "ضمان 12 سنة",
      "مقاوم للأشعة فوق البنفسجية",
      "سهل الصيانة",
    ],
    description:
      "باب خارجي من خشب الساج المعالج ضد الرطوبة والأشعة فوق البنفسجية. مصمم لتحمل الظروف المناخية القاسية مع الحفاظ على مظهره الأنيق لسنوات طويلة. سهل الصيانة ويأتي مع ضمان 12 سنة.",
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
    dimensions: "215 × 95 سم",
    rating: 4.7,
    reviewCount: 61,
    inStock: true,
    isNew: false,
    isBestseller: false,
    isCertified: false,
    tags: ["خارجي", "مقاوم للطقس", "ساج"],
    weight: "48 كجم",
    warranty: "12 سنوات",
  },
  {
    sku: "SND-EXT-OAK-007",
    name: "باب خارجي بنافذة جانبية",
    nameEn: "Exterior Door with Sidelite",
    category: "exterior",
    subcategory: "exterior",
    woodType: "oak",
    basePrice: 3200,
    distributorPrice: 2560,
    tiers: [
      { min: 1, max: 4, price: 3200, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 2700, label: "5-9 أبواب" },
      { min: 10, max: null, price: 2400, label: "10+ أبواب" },
    ],
    image: CLASSIC_DOOR,
    images: [CLASSIC_DOOR, MODERN_DOOR, HERO_DOOR, B2B_IMAGE],
    sizes: ["130×220"],
    colors: ["بلوط طبيعي", "بيج"],
    stock: 0,
    badge: "",
    badgeColor: "",
    features: ["نافذة جانبية مزدوجة", "زجاج مقسى", "سنديان صلب", "عزل حراري"],
    description:
      "باب خارجي أنيق مع نافذة جانبية مزدوجة من الزجاج المقسى. يوفر إضاءة طبيعية للمدخل مع الحفاظ على الخصوصية والعزل الحراري. مصنوع من خشب السنديان الصلب بتصميم يجمع بين الوظيفية والجمال.",
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
    dimensions: "220 × 130 سم",
    rating: 4.5,
    reviewCount: 29,
    inStock: false,
    isNew: false,
    isBestseller: false,
    isCertified: false,
    tags: ["خارجي", "نافذة جانبية", "سنديان"],
    weight: "62 كجم",
    warranty: "10 سنوات",
  },
  {
    sku: "SND-FIR-OAK-008",
    name: "باب مقاوم للحريق 60 دقيقة",
    nameEn: "60-Minute Fire Door",
    category: "fire",
    subcategory: "fire",
    woodType: "oak",
    basePrice: 1800,
    distributorPrice: 1440,
    tiers: [
      { min: 1, max: 4, price: 1800, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 1500, label: "5-9 أبواب" },
      { min: 10, max: null, price: 1350, label: "10+ أبواب" },
    ],
    image: MODERN_DOOR,
    images: [MODERN_DOOR, CLASSIC_DOOR, B2B_IMAGE, WORKSHOP_IMAGE],
    sizes: ["90×210", "80×200"],
    colors: ["أبيض", "بيج", "رمادي"],
    stock: 40,
    badge: "معتمد",
    badgeColor: "red",
    features: [
      "مقاوم للحريق 60 دقيقة",
      "شهادة UL معتمدة",
      "إغلاق ذاتي",
      "مانع دخان",
    ],
    description:
      "باب مقاوم للحريق لمدة 60 دقيقة حاصل على شهادة UL المعتمدة دولياً. مزود بنظام إغلاق ذاتي ومانع دخان. مثالي للمباني التجارية والسكنية التي تتطلب معايير السلامة العالية.",
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
    dimensions: "210 × 90 سم",
    rating: 4.9,
    reviewCount: 95,
    inStock: true,
    isNew: false,
    isBestseller: false,
    isCertified: true,
    tags: ["حريق", "معتمد", "أمان"],
    weight: "45 كجم",
    warranty: "10 سنوات",
  },
  {
    sku: "SND-FIR-OAK-009",
    name: "باب مقاوم للحريق 90 دقيقة",
    nameEn: "90-Minute Fire Door",
    category: "fire",
    subcategory: "fire",
    woodType: "oak",
    basePrice: 2400,
    distributorPrice: 1920,
    tiers: [
      { min: 1, max: 4, price: 2400, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 2000, label: "5-9 أبواب" },
      { min: 10, max: null, price: 1800, label: "10+ أبواب" },
    ],
    image: CLASSIC_DOOR,
    images: [CLASSIC_DOOR, MODERN_DOOR, B2B_IMAGE, WORKSHOP_IMAGE],
    sizes: ["90×210", "100×220"],
    colors: ["أبيض", "رمادي"],
    stock: 22,
    badge: "معتمد",
    badgeColor: "red",
    features: [
      "مقاوم للحريق 90 دقيقة",
      "شهادة ISO معتمدة",
      "إغلاق ذاتي مزدوج",
      "عزل حراري عالي",
    ],
    description:
      "باب مقاوم للحريق لمدة 90 دقيقة بأعلى معايير السلامة. حاصل على شهادة ISO ومزود بنظام إغلاق ذاتي مزدوج وعزل حراري عالي. الخيار الأمثل للمنشآت التي تتطلب أقصى درجات الحماية.",
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
    dimensions: "210 × 90 سم",
    rating: 4.9,
    reviewCount: 67,
    inStock: true,
    isNew: false,
    isBestseller: false,
    isCertified: true,
    tags: ["حريق", "معتمد", "أمان", "90 دقيقة"],
    weight: "52 كجم",
    warranty: "10 سنوات",
  },
  {
    sku: "SND-ACO-WAL-010",
    name: "باب عازل للصوت - درجة احترافية",
    nameEn: "Professional Acoustic Door",
    category: "acoustic",
    subcategory: "acoustic",
    woodType: "walnut",
    basePrice: 2100,
    distributorPrice: 1680,
    tiers: [
      { min: 1, max: 4, price: 2100, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 1750, label: "5-9 أبواب" },
      { min: 10, max: null, price: 1550, label: "10+ أبواب" },
    ],
    image: MODERN_DOOR,
    images: [MODERN_DOOR, CLASSIC_DOOR, HERO_DOOR, WORKSHOP_IMAGE],
    sizes: ["90×210", "100×210"],
    colors: ["جوز داكن", "رمادي مطفي"],
    stock: 15,
    badge: "احترافي",
    badgeColor: "oak",
    features: [
      "عزل صوتي 45 ديسيبل",
      "مناسب للاستوديوهات",
      "طبقات متعددة",
      "مانع صوت مطاطي",
    ],
    description:
      "باب عازل للصوت بدرجة احترافية يوفر عزلاً صوتياً يصل إلى 45 ديسيبل. مصمم خصيصاً للاستوديوهات وغرف الاجتماعات والمكاتب التنفيذية. يتكون من طبقات متعددة مع مانع صوت مطاطي محيطي.",
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
    dimensions: "210 × 90 سم",
    rating: 4.8,
    reviewCount: 44,
    inStock: true,
    isNew: false,
    isBestseller: false,
    isCertified: false,
    tags: ["عازل للصوت", "استوديو", "احترافي"],
    weight: "48 كجم",
    warranty: "10 سنوات",
  },
  {
    sku: "SND-ACO-PIN-011",
    name: "باب عازل للصوت - للمنازل",
    nameEn: "Residential Acoustic Door",
    category: "acoustic",
    subcategory: "acoustic",
    woodType: "pine",
    basePrice: 1550,
    distributorPrice: 1240,
    tiers: [
      { min: 1, max: 4, price: 1550, label: "1-4 أبواب" },
      { min: 5, max: 9, price: 1280, label: "5-9 أبواب" },
      { min: 10, max: null, price: 1100, label: "10+ أبواب" },
    ],
    image: CLASSIC_DOOR,
    images: [CLASSIC_DOOR, MODERN_DOOR, HERO_DOOR, WORKSHOP_IMAGE],
    sizes: ["90×210", "80×200"],
    colors: ["أبيض", "بيج", "رمادي فاتح"],
    stock: 35,
    badge: "",
    badgeColor: "",
    features: [
      "عزل صوتي 38 ديسيبل",
      "مناسب للغرف السكنية",
      "تصميم أنيق",
      "سهل التركيب",
    ],
    description:
      "باب عازل للصوت مصمم للاستخدام السكني بعزل صوتي 38 ديسيبل. يوفر الهدوء والخصوصية للغرف السكنية بتصميم أنيق وسعر مناسب. سهل التركيب ومتوفر بعدة ألوان.",
    specs: [
      { label: "نوع الخشب", value: "صنوبر مع حشو عازل" },
      { label: "العزل الصوتي", value: "38 ديسيبل (STC 38)" },
      { label: "السماكة", value: "45 مم" },
      { label: "الارتفاع", value: "210 سم" },
      { label: "العرض", value: "90 سم" },
      { label: "الوزن", value: "38 كجم" },
      { label: "الضمان", value: "8 سنوات" },
    ],
    dimensions: "210 × 90 سم",
    rating: 4.6,
    reviewCount: 33,
    inStock: true,
    isNew: false,
    isBestseller: false,
    isCertified: false,
    tags: ["عازل للصوت", "سكني", "صنوبر"],
    weight: "38 كجم",
    warranty: "8 سنوات",
  },
  {
    sku: "SND-ACC-STL-012",
    name: "طقم مقابض وأقفال فاخرة",
    nameEn: "Luxury Hardware Set",
    category: "accessories",
    subcategory: "accessories",
    woodType: "oak",
    basePrice: 380,
    distributorPrice: 304,
    tiers: [
      { min: 1, max: 4, price: 380, label: "1-4 طقم" },
      { min: 5, max: 9, price: 310, label: "5-9 طقم" },
      { min: 10, max: null, price: 270, label: "10+ طقم" },
    ],
    image: MODERN_DOOR,
    images: [MODERN_DOOR, CLASSIC_DOOR, WORKSHOP_IMAGE, B2B_IMAGE],
    sizes: ["قياسي"],
    colors: ["فضي مصقول", "ذهبي مطفي", "أسود مطفي"],
    stock: 120,
    badge: "مجموعة",
    badgeColor: "copper",
    features: ["ستانلس ستيل 304", "مقاوم للصدأ", "ضمان 5 سنوات", "سهل التركيب"],
    description:
      "طقم مقابض وأقفال فاخرة من الستانلس ستيل 304 المقاوم للصدأ. يشمل الطقم مقبض، قفل، ومفصلات بتصميم عصري أنيق. سهل التركيب ومتوافق مع جميع أنواع الأبواب.",
    specs: [
      { label: "المادة", value: "ستانلس ستيل 304" },
      { label: "التشطيب", value: "مصقول / مطفي" },
      { label: "محتويات الطقم", value: "مقبض + قفل + مفصلات" },
      { label: "التوافق", value: "جميع أنواع الأبواب" },
      { label: "الوزن", value: "2.5 كجم" },
      { label: "الضمان", value: "5 سنوات" },
    ],
    dimensions: "متعدد الأحجام",
    rating: 4.7,
    reviewCount: 156,
    inStock: true,
    isNew: false,
    isBestseller: false,
    isCertified: false,
    tags: ["مستلزمات", "مقابض", "أقفال", "ستانلس"],
    weight: "2.5 كجم",
    warranty: "5 سنوات",
  },
] as const;

// ── Input schemas ────────────────────────────────────────────────────────────
const ProductCreateInput = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  nameEn: z.string().default(""),
  category: z.string().min(1),
  subcategory: z.string().default(""),
  woodType: z.string().default("oak"),
  basePrice: z.number().int().min(0),
  distributorPrice: z.number().int().min(0),
  stock: z.number().int().min(0).default(0),
  description: z.string().default(""),
  image: z.string().default(""),
  sizes: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  tiers: z.any().optional(),
  images: z.array(z.string()).optional(),
  badge: z.string().optional(),
  badgeColor: z.string().optional(),
  features: z.array(z.string()).optional(),
  specs: z.any().optional(),
  dimensions: z.string().optional(),
  inStock: z.boolean().default(true),
  isNew: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
  isCertified: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  weight: z.string().optional(),
  warranty: z.string().optional(),
  options: z.any().optional(),
});

const ProductUpdateInput = ProductCreateInput.partial().extend({
  id: z.number().int(),
});

// ── Helper: parse JSON column (mysql2 returns JSON columns as strings) ───────
function parseJson<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") {
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }
  return val as T;
}

// ── Helper: map DB row to frontend-compatible shape ──────────────────────────
function mapRow(row: typeof schema.products.$inferSelect) {
  return {
    id: String(row.id),
    sku: row.sku,
    name: row.name,
    nameEn: row.nameEn,
    category: row.category,
    subcategory: row.subcategory,
    woodType: row.woodType,
    status: row.status,
    basePrice: row.basePrice,
    distributorPrice: row.distributorPrice,
    tiers: parseJson<any[]>(row.tiers, []),
    image: row.image,
    images: parseJson<string[]>(row.images, []),
    sizes: parseJson<string[]>(row.sizes, []),
    colors: parseJson<string[]>(row.colors, []),
    stock: row.stock,
    badge: row.badge ?? "",
    badgeColor: (row.badgeColor || undefined) as "oak" | "copper" | "red" | "green" | undefined,
    features: parseJson<string[]>(row.features, []),
    description: row.description,
    specs: parseJson<any[]>(row.specs, []),
    dimensions: row.dimensions ?? "",
    rating: row.rating,
    reviewCount: row.reviewCount,
    inStock: row.inStock,
    isNew: row.isNew,
    isBestseller: row.isBestseller,
    isCertified: row.isCertified,
    tags: parseJson<string[]>(row.tags, []),
    weight: row.weight ?? "",
    warranty: row.warranty ?? "",
    options: parseJson<any>(row.options, undefined),
    reviews: [] as any[], // reviews are static, not stored in DB
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Router ───────────────────────────────────────────────────────────────────
export const productsRouter = router({
  // ── Public: list all active products ──────────────────────────────────────
  list: publicProcedure.query(async () => {
    const rows = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.status, "active"))
      .orderBy(asc(schema.products.id));
    return rows.map(mapRow);
  }),

  // ── Public: get single product by numeric ID or SKU ───────────────────────
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const numericId = parseInt(input.id, 10);
      const rows = isNaN(numericId)
        ? await db
            .select()
            .from(schema.products)
            .where(eq(schema.products.sku, input.id))
        : await db
            .select()
            .from(schema.products)
            .where(eq(schema.products.id, numericId));
      if (!rows.length) return null;
      return mapRow(rows[0]);
    }),

  // ── Admin: list all products (active + archived) ──────────────────────────
  adminList: adminProcedure.query(async () => {
    const rows = await db
      .select()
      .from(schema.products)
      .orderBy(desc(schema.products.updatedAt));
    return rows.map(mapRow);
  }),

  // ── Admin: create product ─────────────────────────────────────────────────
  create: adminProcedure
    .input(ProductCreateInput)
    .mutation(async ({ input }) => {
      const now = Date.now();
      // Auto-generate tiers from basePrice if not provided
      const tiers = input.tiers ?? [
        { min: 1, max: 4, price: input.basePrice, label: "1-4 قطعة" },
        {
          min: 5,
          max: 9,
          price: Math.round(input.basePrice * 0.85),
          label: "5-9 قطعة",
        },
        {
          min: 10,
          max: null,
          price: Math.round(input.basePrice * 0.75),
          label: "10+ قطعة",
        },
      ];
      const [result] = await db.insert(schema.products).values({
        sku: input.sku,
        name: input.name,
        nameEn: input.nameEn,
        category: input.category,
        subcategory: input.subcategory || input.category,
        woodType: input.woodType,
        status: "active",
        basePrice: input.basePrice,
        distributorPrice: input.distributorPrice,
        tiers,
        image: input.image,
        images: input.images ?? [],
        sizes: input.sizes,
        colors: input.colors,
        stock: input.stock,
        badge: input.badge ?? "",
        badgeColor: input.badgeColor ?? "",
        features: input.features ?? [],
        description: input.description,
        specs: input.specs ?? [],
        dimensions: input.dimensions ?? "",
        rating: 0,
        reviewCount: 0,
        inStock: input.stock > 0,
        isNew: input.isNew,
        isBestseller: input.isBestseller,
        isCertified: input.isCertified,
        tags: input.tags ?? [],
        weight: input.weight ?? "",
        warranty: input.warranty ?? "",
        options: input.options ?? null,
        createdAt: now,
        updatedAt: now,
      });
      const id = (result as any).insertId as number;
      const [row] = await db
        .select()
        .from(schema.products)
        .where(eq(schema.products.id, id));
      return mapRow(row);
    }),

  // ── Admin: update product ─────────────────────────────────────────────────
  update: adminProcedure
    .input(ProductUpdateInput)
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      const now = Date.now();
      const updateData: Record<string, any> = { updatedAt: now };

      if (rest.name !== undefined) updateData.name = rest.name;
      if (rest.nameEn !== undefined) updateData.nameEn = rest.nameEn;
      if (rest.category !== undefined) {
        updateData.category = rest.category;
        updateData.subcategory = rest.subcategory || rest.category;
      }
      if (rest.subcategory !== undefined)
        updateData.subcategory = rest.subcategory;
      if (rest.woodType !== undefined) updateData.woodType = rest.woodType;
      if (rest.basePrice !== undefined) {
        updateData.basePrice = rest.basePrice;
        // Auto-rebuild tiers when basePrice changes (unless tiers explicitly provided)
        if (rest.tiers === undefined) {
          // Fetch existing product to get current tiers and basePrice ratio
          const [existing] = await db
            .select()
            .from(schema.products)
            .where(eq(schema.products.id, id));
          if (existing) {
            const oldTiers = parseJson<
              Array<{
                min: number;
                max: number | null;
                price: number;
                label: string;
              }>
            >(existing.tiers, []);
            const oldBase = existing.basePrice || rest.basePrice;
            const ratio = rest.basePrice / oldBase;
            if (oldTiers.length > 0) {
              updateData.tiers = oldTiers.map(t => ({
                ...t,
                price: Math.round(t.price * ratio),
              }));
            } else {
              // No tiers exist, create a simple single-tier
              updateData.tiers = [
                {
                  min: 1,
                  max: null,
                  price: rest.basePrice,
                  label: "سعر الوحدة",
                },
              ];
            }
          }
        }
      }
      if (rest.distributorPrice !== undefined)
        updateData.distributorPrice = rest.distributorPrice;
      if (rest.tiers !== undefined) updateData.tiers = rest.tiers;
      if (rest.image !== undefined) updateData.image = rest.image;
      if (rest.images !== undefined) updateData.images = rest.images;
      if (rest.sizes !== undefined) updateData.sizes = rest.sizes;
      if (rest.colors !== undefined) updateData.colors = rest.colors;
      if (rest.stock !== undefined) {
        updateData.stock = rest.stock;
        updateData.inStock = rest.stock > 0;
      }
      if (rest.badge !== undefined) updateData.badge = rest.badge;
      if (rest.badgeColor !== undefined)
        updateData.badgeColor = rest.badgeColor;
      if (rest.features !== undefined) updateData.features = rest.features;
      if (rest.description !== undefined)
        updateData.description = rest.description;
      if (rest.specs !== undefined) updateData.specs = rest.specs;
      if (rest.dimensions !== undefined)
        updateData.dimensions = rest.dimensions;
      if (rest.isNew !== undefined) updateData.isNew = rest.isNew;
      if (rest.isBestseller !== undefined)
        updateData.isBestseller = rest.isBestseller;
      if (rest.isCertified !== undefined)
        updateData.isCertified = rest.isCertified;
      if (rest.tags !== undefined) updateData.tags = rest.tags;
      if (rest.weight !== undefined) updateData.weight = rest.weight;
      if (rest.warranty !== undefined) updateData.warranty = rest.warranty;
      if (rest.options !== undefined) updateData.options = rest.options;

      await db
        .update(schema.products)
        .set(updateData)
        .where(eq(schema.products.id, id));
      const [row] = await db
        .select()
        .from(schema.products)
        .where(eq(schema.products.id, id));
      return mapRow(row);
    }),

  // ── Admin: update status (archive / activate) ─────────────────────────────
  updateStatus: adminProcedure
    .input(
      z.object({ id: z.number().int(), status: z.enum(["active", "archived"]) })
    )
    .mutation(async ({ input }) => {
      await db
        .update(schema.products)
        .set({ status: input.status, updatedAt: Date.now() })
        .where(eq(schema.products.id, input.id));
      return { success: true };
    }),

  // ── Admin: duplicate product ───────────────────────────────────────────────
  duplicate: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().min(1),
        sku: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const [src] = await db
        .select()
        .from(schema.products)
        .where(eq(schema.products.id, input.id));
      if (!src) throw new Error("Product not found");
      const now = Date.now();
      const [result] = await db.insert(schema.products).values({
        ...src,
        id: undefined as any,
        sku: input.sku,
        name: input.name,
        nameEn: `Copy of ${src.nameEn || src.name}`,
        status: "active",
        stock: 0,
        inStock: false,
        createdAt: now,
        updatedAt: now,
      });
      const newId = (result as any).insertId as number;
      const [row] = await db
        .select()
        .from(schema.products)
        .where(eq(schema.products.id, newId));
      return mapRow(row);
    }),

  // ── Admin: seed 12 products from static data ──────────────────────────────
  seed: adminProcedure.mutation(async () => {
    const existing = await db
      .select({ sku: schema.products.sku })
      .from(schema.products);
    const existingSkus = new Set(existing.map(r => r.sku));
    let inserted = 0;
    const now = Date.now();
    for (const p of SEED_PRODUCTS) {
      if (existingSkus.has(p.sku)) continue;
      await db.insert(schema.products).values({
        sku: p.sku,
        name: p.name,
        nameEn: p.nameEn,
        category: p.category,
        subcategory: p.subcategory,
        woodType: p.woodType,
        status: "active",
        basePrice: p.basePrice,
        distributorPrice: p.distributorPrice,
        tiers: p.tiers as any,
        image: p.image,
        images: p.images as any,
        sizes: p.sizes as any,
        colors: p.colors as any,
        stock: p.stock,
        badge: p.badge,
        badgeColor: p.badgeColor,
        features: p.features as any,
        description: p.description,
        specs: p.specs as any,
        dimensions: p.dimensions,
        rating: p.rating,
        reviewCount: p.reviewCount,
        inStock: p.inStock,
        isNew: p.isNew,
        isBestseller: p.isBestseller,
        isCertified: p.isCertified,
        tags: p.tags as any,
        weight: p.weight,
        warranty: p.warranty,
        options: null,
        createdAt: now,
        updatedAt: now,
      });
      inserted++;
    }
    return { inserted, skipped: SEED_PRODUCTS.length - inserted };
  }),
});
