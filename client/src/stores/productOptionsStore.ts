/**
 * productOptionsStore — نظام بيانات خيارات الباب
 * يدعم: التفعيل/التعطيل، الإلزامي/الاختياري، التسعير، الإضافة الديناميكية
 * يُحفظ في localStorage ويُشارك بين صفحة الطلب ولوحة التحكم
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type OptionDisplayType =
  | "radio_cards"   // بطاقات اختيار (نوع الباب)
  | "checkbox_cards" // بطاقات اختيار متعدد
  | "color_swatches" // ألوان
  | "chips"         // شرائح نصية
  | "checkbox_list" // قائمة مربعات
  | "number_input"  // إدخال رقمي (المقاسات)
  | "text_input"    // إدخال نصي
  | "file_upload"   // رفع ملف
  | "select"        // قائمة منسدلة
  | "toggle"        // مفتاح تبديل
  | "section_header"; // عنوان قسم فرعي (لا يتطلب إدخال)

export interface OptionValue {
  id: string;
  label: string;
  labelEn?: string;
  labelZh?: string;
  hex?: string;           // للألوان
  priceAdj?: number;      // إضافة للسعر (ر.س)
  enabled: boolean;
  image?: string;
  description?: string;
  hasSubOptions?: boolean; // يحتوي خيارات فرعية
  subOptions?: SubOption[];
}

export interface SubOption {
  id: string;
  label: string;
  type: OptionDisplayType;
  placeholder?: string;
  unit?: string;
  min?: number;
  max?: number;
  values?: OptionValue[];
}

export interface OptionGroup {
  id: string;
  sectionId: string;      // القسم الذي ينتمي إليه
  label: string;
  labelEn?: string;
  labelZh?: string;
  type: OptionDisplayType;
  required: boolean;
  enabled: boolean;
  order: number;
  priceAdj?: number;      // إضافة سعر ثابتة للمجموعة
  values: OptionValue[];
  placeholder?: string;   // للحقول النصية/الرقمية
  unit?: string;          // وحدة القياس (سم، مم...)
  min?: number;
  max?: number;
  allowCustomInput?: boolean; // للألوان: إدخال لون مخصص
  hint?: string;          // تلميح للمستخدم
}

export interface Section {
  id: string;
  label: string;
  labelEn?: string;
  labelZh?: string;
  icon: string;
  order: number;
  enabled: boolean;
  groups: OptionGroup[];
}

// ─── البيانات الافتراضية ──────────────────────────────────────────────────────

const DEFAULT_SECTIONS: Section[] = [
  // ══════════════════════════════════════════════════════════
  // 1. نوع الباب
  // ══════════════════════════════════════════════════════════
  {
    id: "door_type",
    label: "نوع الباب",
    labelEn: "Door Type",
    labelZh: "门类型",
    icon: "🚪",
    order: 1,
    enabled: true,
    groups: [
      {
        id: "material",
        sectionId: "door_type",
        label: "مادة الباب",
        labelEn: "Door Material",
        type: "radio_cards",
        required: true,
        enabled: true,
        order: 1,
        values: [
          { id: "wpc",       label: "WPC",       labelEn: "WPC",       priceAdj: 0,    enabled: true,  description: "مقاوم للرطوبة والحشرات" },
          { id: "wood",      label: "خشب",       labelEn: "Wood",      priceAdj: 200,  enabled: true,  description: "خشب طبيعي عالي الجودة" },
          { id: "iron",      label: "حديد",      labelEn: "Iron",      priceAdj: 300,  enabled: true,  description: "متانة وأمان عاليان" },
          { id: "aluminum",  label: "ألمنيوم",   labelEn: "Aluminum",  priceAdj: 150,  enabled: true,  description: "خفيف ومقاوم للصدأ" },
          { id: "glass",     label: "زجاج",      labelEn: "Glass",     priceAdj: 400,  enabled: true,  description: "أناقة وشفافية" },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // 2. لون الباب
  // ══════════════════════════════════════════════════════════
  {
    id: "door_color",
    label: "لون الباب",
    labelEn: "Door Color",
    labelZh: "门颜色",
    icon: "🎨",
    order: 2,
    enabled: true,
    groups: [
      {
        id: "color_choice",
        sectionId: "door_color",
        label: "اختر اللون",
        labelEn: "Choose Color",
        type: "color_swatches",
        required: true,
        enabled: true,
        order: 1,
        allowCustomInput: true,
        hint: "يمكنك اختيار لون من القائمة أو إدخال كود اللون المطلوب",
        values: [
          { id: "white",        label: "أبيض",         hex: "#F5F5F0", priceAdj: 0,   enabled: true },
          { id: "beige",        label: "بيج",          hex: "#E8DFD0", priceAdj: 0,   enabled: true },
          { id: "light_oak",    label: "بلوط فاتح",    hex: "#D4A96A", priceAdj: 0,   enabled: true },
          { id: "dark_walnut",  label: "جوز داكن",     hex: "#3D2B1F", priceAdj: 50,  enabled: true },
          { id: "charcoal",     label: "فحمي",         hex: "#2D2D2D", priceAdj: 80,  enabled: true },
          { id: "grey",         label: "رمادي",        hex: "#8E8E8E", priceAdj: 60,  enabled: true },
          { id: "mahogany",     label: "ماهوجني",      hex: "#7B2D00", priceAdj: 50,  enabled: true },
          { id: "black",        label: "أسود",         hex: "#1A1A1A", priceAdj: 80,  enabled: true },
          { id: "custom",       label: "لون مخصص",     hex: "",        priceAdj: 100, enabled: true, description: "سيتم التواصل معك لتحديد اللون" },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // 3. شكل الباب
  // ══════════════════════════════════════════════════════════
  {
    id: "door_shape",
    label: "شكل الباب",
    labelEn: "Door Style",
    labelZh: "门样式",
    icon: "🏛️",
    order: 3,
    enabled: true,
    groups: [
      {
        id: "style",
        sectionId: "door_shape",
        label: "تصميم الباب",
        labelEn: "Door Design",
        type: "checkbox_cards",
        required: true,
        enabled: true,
        order: 1,
        values: [
          { id: "flat",           label: "فلات (مسطح)",        labelEn: "Flat",            priceAdj: 0,   enabled: true, description: "تصميم عصري بسيط ونظيف" },
          {
            id: "top_molding",
            label: "مع تكسيات (فوق الباب)",
            labelEn: "With Top Molding",
            priceAdj: 150,
            enabled: true,
            description: "تكسيات زخرفية فوق الباب",
            hasSubOptions: true,
            subOptions: [
              {
                id: "molding_side",
                label: "جهة التكسية",
                type: "chips",
                values: [
                  { id: "one_side",  label: "جانب واحد",  priceAdj: 0,  enabled: true },
                  { id: "two_sides", label: "جانبين",     priceAdj: 80, enabled: true },
                ],
              },
            ],
          },
          { id: "hidden",         label: "باب مخفي",           labelEn: "Hidden Door",     priceAdj: 500, enabled: true, description: "يندمج مع الجدار بالكامل" },
          {
            id: "side_molding",
            label: "تكسيات جانبية",
            labelEn: "Side Molding",
            priceAdj: 200,
            enabled: true,
            description: "تكسيات على عرض الباب",
            hasSubOptions: true,
            subOptions: [
              {
                id: "side_width",
                label: "عرض التكسية",
                type: "number_input",
                unit: "سم",
                min: 5,
                max: 30,
                placeholder: "أدخل العرض بالسنتيمتر",
              },
            ],
          },
          { id: "cnc",            label: "مع حفر CNC",         labelEn: "CNC Carved",      priceAdj: 350, enabled: true, description: "نقوش وزخارف بتقنية CNC" },
          { id: "sliding",        label: "باب سحاب",           labelEn: "Sliding Door",    priceAdj: 400, enabled: true, description: "يفتح بالانزلاق الجانبي" },
          {
            id: "special",
            label: "طلبات خاصة",
            labelEn: "Special Request",
            priceAdj: 0,
            enabled: true,
            description: "ارفع صورة أو ملف لتصميمك المطلوب",
            hasSubOptions: true,
            subOptions: [
              {
                id: "special_file",
                label: "رفع ملف أو صورة",
                type: "file_upload",
                placeholder: "JPG, PNG, PDF, DWG",
              },
            ],
          },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // 4. الإكسسوارات
  // ══════════════════════════════════════════════════════════
  {
    id: "accessories",
    label: "الإكسسوارات",
    labelEn: "Accessories",
    labelZh: "配件",
    icon: "🔩",
    order: 4,
    enabled: true,
    groups: [
      {
        id: "lock",
        sectionId: "accessories",
        label: "القفل",
        labelEn: "Lock",
        type: "chips",
        required: false,
        enabled: true,
        order: 1,
        values: [
          { id: "standard_lock",   label: "قفل عادي",           priceAdj: 0,   enabled: true },
          { id: "digital_lock",    label: "قفل رقمي",           priceAdj: 350, enabled: true },
          { id: "smart_lock",      label: "قفل ذكي (بلوتوث)",   priceAdj: 600, enabled: true },
          { id: "deadbolt",        label: "قفل أمان مزدوج",     priceAdj: 150, enabled: true },
          { id: "no_lock",         label: "بدون قفل",           priceAdj: -50, enabled: true },
        ],
      },
      {
        id: "hinge",
        sectionId: "accessories",
        label: "المفصلات",
        labelEn: "Hinges",
        type: "chips",
        required: false,
        enabled: true,
        order: 2,
        values: [
          { id: "butterfly",   label: "عادي فراشة",         priceAdj: 0,   enabled: true },
          { id: "hidden_hinge",label: "مخفي",               priceAdj: 120, enabled: true },
          { id: "hydraulic",   label: "هيدروليك إغلاق ذاتي", priceAdj: 250, enabled: true },
        ],
      },
      {
        id: "handle",
        sectionId: "accessories",
        label: "المقبض",
        labelEn: "Handle",
        type: "chips",
        required: false,
        enabled: true,
        order: 3,
        values: [
          { id: "classic_handle",  label: "كلاسيكي",    priceAdj: 0,   enabled: true },
          { id: "modern_handle",   label: "عصري",       priceAdj: 80,  enabled: true },
          { id: "long_handle",     label: "طويل",       priceAdj: 120, enabled: true },
          { id: "no_handle",       label: "بدون مقبض", priceAdj: -30, enabled: true },
        ],
      },
      {
        id: "door_closer",
        sectionId: "accessories",
        label: "رداد (إغلاق ذاتي)",
        labelEn: "Door Closer",
        type: "toggle",
        required: false,
        enabled: true,
        order: 4,
        priceAdj: 180,
        values: [],
      },
      {
        id: "door_stopper",
        sectionId: "accessories",
        label: "مصد الباب",
        labelEn: "Door Stopper",
        type: "toggle",
        required: false,
        enabled: true,
        order: 5,
        priceAdj: 30,
        values: [],
      },
      {
        id: "smoke_seal",
        sectionId: "accessories",
        label: "مانع انتشار الدخان والحشرات والغبار",
        labelEn: "Smoke & Dust Seal",
        type: "toggle",
        required: false,
        enabled: true,
        order: 6,
        priceAdj: 90,
        values: [],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // 5. التوصيل
  // ══════════════════════════════════════════════════════════
  {
    id: "delivery",
    label: "التوصيل",
    labelEn: "Delivery",
    labelZh: "配送",
    icon: "🚚",
    order: 5,
    enabled: true,
    groups: [
      {
        id: "delivery_method",
        sectionId: "delivery",
        label: "طريقة الاستلام",
        labelEn: "Delivery Method",
        type: "radio_cards",
        required: true,
        enabled: true,
        order: 1,
        values: [
          { id: "delivery",  label: "توصيل للموقع",    labelEn: "Delivery",         priceAdj: 150, enabled: true, description: "يصلك الباب لموقعك مباشرة" },
          { id: "pickup",    label: "استلام من المصنع", labelEn: "Factory Pickup",   priceAdj: 0,   enabled: true, description: "استلم طلبك مجاناً من المصنع" },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // 6. التركيب
  // ══════════════════════════════════════════════════════════
  {
    id: "installation",
    label: "التركيب",
    labelEn: "Installation",
    labelZh: "安装",
    icon: "🔧",
    order: 6,
    enabled: true,
    groups: [
      {
        id: "install_choice",
        sectionId: "installation",
        label: "هل تحتاج خدمة التركيب؟",
        labelEn: "Installation Service",
        type: "radio_cards",
        required: true,
        enabled: true,
        order: 1,
        values: [
          { id: "yes", label: "نعم، أحتاج التركيب", labelEn: "Yes, install it", priceAdj: 200, enabled: true, description: "فريق متخصص يركب الباب في موقعك" },
          { id: "no",  label: "لا، سأركبه بنفسي",  labelEn: "No, self-install", priceAdj: 0,   enabled: true, description: "ستستلم الباب جاهزاً للتركيب" },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // 7. خدمات إضافية
  // ══════════════════════════════════════════════════════════
  {
    id: "extra_services",
    label: "خدمات إضافية",
    labelEn: "Extra Services",
    labelZh: "额外服务",
    icon: "⭐",
    order: 7,
    enabled: true,
    groups: [
      {
        id: "measurement",
        sectionId: "extra_services",
        label: "رفع المقاسات",
        labelEn: "Measurement Service",
        type: "toggle",
        required: false,
        enabled: true,
        order: 1,
        priceAdj: 100,
        hint: "يأتيك مهندسنا لأخذ المقاسات الدقيقة في موقعك",
        values: [],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // 8. الطلبات الخاصة
  // ══════════════════════════════════════════════════════════
  {
    id: "special_requests",
    label: "الطلبات الخاصة",
    labelEn: "Special Requests",
    labelZh: "特殊要求",
    icon: "💬",
    order: 8,
    enabled: true,
    groups: [
      {
        id: "sales_consultant",
        sectionId: "special_requests",
        label: "طلب استشاري مبيعات",
        labelEn: "Sales Consultant",
        type: "toggle",
        required: false,
        enabled: true,
        order: 1,
        priceAdj: 0,
        hint: "سيتواصل معك مستشار مبيعات متخصص خلال 24 ساعة",
        values: [],
      },
      {
        id: "special_notes",
        sectionId: "special_requests",
        label: "ملاحظات إضافية",
        labelEn: "Additional Notes",
        type: "text_input",
        required: false,
        enabled: true,
        order: 2,
        placeholder: "اكتب أي ملاحظات أو متطلبات خاصة...",
        values: [],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // 9. المقاسات
  // ══════════════════════════════════════════════════════════
  {
    id: "dimensions",
    label: "المقاسات",
    labelEn: "Dimensions",
    labelZh: "尺寸",
    icon: "📐",
    order: 9,
    enabled: true,
    groups: [
      {
        id: "height",
        sectionId: "dimensions",
        label: "الطول",
        labelEn: "Height",
        type: "section_header",
        required: false,
        enabled: true,
        order: 1,
        hint: "أدخل كلا القياسين: قياس الدرفة وقياس الفتحة الإنشائية",
        values: [],
      },
      {
        id: "door_leaf_height",
        sectionId: "dimensions",
        label: "طول الدرفة",
        labelEn: "Door Leaf Height",
        type: "number_input",
        required: true,
        enabled: true,
        order: 2,
        unit: "سم",
        min: 150,
        max: 280,
        placeholder: "مثال: 210",
        values: [],
      },
      {
        id: "opening_height",
        sectionId: "dimensions",
        label: "طول الفتحة الإنشائية",
        labelEn: "Structural Opening Height",
        type: "number_input",
        required: true,
        enabled: true,
        order: 3,
        unit: "سم",
        min: 155,
        max: 290,
        placeholder: "مثال: 215",
        hint: "الفتحة الإنشائية أكبر من الدرفة عادةً بـ 5-10 سم",
        values: [],
      },
      {
        id: "width",
        sectionId: "dimensions",
        label: "العرض",
        labelEn: "Width",
        type: "number_input",
        required: true,
        enabled: true,
        order: 4,
        unit: "سم",
        min: 60,
        max: 180,
        placeholder: "مثال: 90",
        values: [],
      },
      {
        id: "wall_thickness",
        sectionId: "dimensions",
        label: "سمك الجدار (عرض الحلق/الإطار)",
        labelEn: "Wall Thickness / Frame Width",
        type: "number_input",
        required: true,
        enabled: true,
        order: 5,
        unit: "سم",
        min: 10,
        max: 50,
        placeholder: "مثال: 15",
        values: [],
      },
      {
        id: "frame_width",
        sectionId: "dimensions",
        label: "عرض البرواز",
        labelEn: "Frame Border Width",
        type: "chips",
        required: true,
        enabled: true,
        order: 6,
        values: [
          { id: "8cm",    label: "8 سم",  priceAdj: 0,  enabled: true },
          { id: "10cm",   label: "10 سم", priceAdj: 30, enabled: true },
        ],
      },
      {
        id: "frame_height",
        sectionId: "dimensions",
        label: "طول البرواز",
        labelEn: "Frame Border Height",
        type: "number_input",
        required: false,
        enabled: true,
        order: 7,
        unit: "سم",
        placeholder: "مثال: 210",
        values: [],
      },
    ],
  },
];

// ─── Store ────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "sindian_product_options_v3";

function loadSections(): Section[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Section[];
      // Merge with defaults to pick up any new sections/groups
      return mergeWithDefaults(parsed);
    }
  } catch {
    // ignore
  }
  return DEFAULT_SECTIONS;
}

function mergeWithDefaults(saved: Section[]): Section[] {
  const savedMap = new Map(saved.map((s) => [s.id, s]));
  return DEFAULT_SECTIONS.map((def) => {
    const sv = savedMap.get(def.id);
    if (!sv) return def;
    // Merge groups
    const savedGroupMap = new Map(sv.groups.map((g) => [g.id, g]));
    const mergedGroups = def.groups.map((dg) => {
      const sg = savedGroupMap.get(dg.id);
      if (!sg) return dg;
      // Merge values
      const savedValMap = new Map(sg.values.map((v) => [v.id, v]));
      const mergedValues = dg.values.map((dv) => ({
        ...dv,
        ...(savedValMap.get(dv.id) ?? {}),
      }));
      // Add custom values that don't exist in defaults
      const extraValues = sg.values.filter((v) => !dg.values.find((dv) => dv.id === v.id));
      return { ...dg, ...sg, type: dg.type, values: [...mergedValues, ...extraValues] };
    });
    // Add custom groups not in defaults
    const extraGroups = sv.groups.filter((g) => !def.groups.find((dg) => dg.id === g.id));
    return { ...def, ...sv, groups: [...mergedGroups, ...extraGroups] };
  });
}

function saveSections(sections: Section[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
  } catch {
    // ignore
  }
}

// ─── Reactive Store ───────────────────────────────────────────────────────────

type Listener = () => void;
const listeners = new Set<Listener>();
let _sections: Section[] = loadSections();

export const productOptionsStore = {
  getSections(): Section[] {
    return _sections;
  },

  getEnabledSections(): Section[] {
    return _sections
      .filter((s) => s.enabled)
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        ...s,
        groups: s.groups
          .filter((g) => g.enabled)
          .sort((a, b) => a.order - b.order),
      }));
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  _notify(): void {
    listeners.forEach((l) => l());
  },

  updateSection(sectionId: string, updates: Partial<Section>): void {
    _sections = _sections.map((s) =>
      s.id === sectionId ? { ...s, ...updates } : s
    );
    saveSections(_sections);
    this._notify();
  },

  updateGroup(sectionId: string, groupId: string, updates: Partial<OptionGroup>): void {
    _sections = _sections.map((s) =>
      s.id === sectionId
        ? {
            ...s,
            groups: s.groups.map((g) =>
              g.id === groupId ? { ...g, ...updates } : g
            ),
          }
        : s
    );
    saveSections(_sections);
    this._notify();
  },

  updateValue(sectionId: string, groupId: string, valueId: string, updates: Partial<OptionValue>): void {
    _sections = _sections.map((s) =>
      s.id === sectionId
        ? {
            ...s,
            groups: s.groups.map((g) =>
              g.id === groupId
                ? {
                    ...g,
                    values: g.values.map((v) =>
                      v.id === valueId ? { ...v, ...updates } : v
                    ),
                  }
                : g
            ),
          }
        : s
    );
    saveSections(_sections);
    this._notify();
  },

  addSection(section: Section): void {
    _sections = [..._sections, section];
    saveSections(_sections);
    this._notify();
  },

  addGroup(sectionId: string, group: OptionGroup): void {
    _sections = _sections.map((s) =>
      s.id === sectionId ? { ...s, groups: [...s.groups, group] } : s
    );
    saveSections(_sections);
    this._notify();
  },

  addValue(sectionId: string, groupId: string, value: OptionValue): void {
    _sections = _sections.map((s) =>
      s.id === sectionId
        ? {
            ...s,
            groups: s.groups.map((g) =>
              g.id === groupId
                ? { ...g, values: [...g.values, value] }
                : g
            ),
          }
        : s
    );
    saveSections(_sections);
    this._notify();
  },

  deleteValue(sectionId: string, groupId: string, valueId: string): void {
    _sections = _sections.map((s) =>
      s.id === sectionId
        ? {
            ...s,
            groups: s.groups.map((g) =>
              g.id === groupId
                ? { ...g, values: g.values.filter((v) => v.id !== valueId) }
                : g
            ),
          }
        : s
    );
    saveSections(_sections);
    this._notify();
  },

  deleteGroup(sectionId: string, groupId: string): void {
    _sections = _sections.map((s) =>
      s.id === sectionId
        ? { ...s, groups: s.groups.filter((g) => g.id !== groupId) }
        : s
    );
    saveSections(_sections);
    this._notify();
  },

  resetToDefaults(): void {
    _sections = DEFAULT_SECTIONS;
    saveSections(_sections);
    this._notify();
  },

  reorderSections(orderedIds: string[]): void {
    _sections = _sections.map((s) => ({
      ...s,
      order: orderedIds.indexOf(s.id),
    }));
    saveSections(_sections);
    this._notify();
  },
};

// ─── React Hook ───────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";

export function useProductOptions() {
  const [sections, setSections] = useState<Section[]>(() =>
    productOptionsStore.getSections()
  );

  useEffect(() => {
    const unsub = productOptionsStore.subscribe(() => {
      setSections(productOptionsStore.getSections());
    });
    return unsub;
  }, []);

  return {
    sections,
    enabledSections: productOptionsStore.getEnabledSections(),
    store: productOptionsStore,
  };
}
