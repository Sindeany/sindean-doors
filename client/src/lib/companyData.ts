// ============================================================
// Company B2B Portal Data - Sindian Doors
// Design: Architectural Luxury | Oak Green + Copper + Beige
// ============================================================

// ─── Types ───────────────────────────────────────────────────

export interface CompanyProfile {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  companyType: "contractor" | "developer" | "government" | "hospitality" | "retail";
  registrationNumber: string;
  vatNumber: string;
  accountManager: string;
  joinDate: string;
  creditLimit: number;
  creditUsed: number;
}

export interface RFQItem {
  productName: string;
  category: string;
  quantity: number;
  specifications?: string;
}

export type RFQStatus =
  | "submitted"       // تم الإرسال
  | "under_review"    // قيد المراجعة
  | "quoted"          // تم تقديم العرض
  | "negotiating"     // قيد التفاوض
  | "accepted"        // تم القبول
  | "rejected"        // مرفوض
  | "expired";        // منتهي الصلاحية

export interface RFQStatusHistory {
  status: RFQStatus;
  date: string;
  note?: string;
  by?: string;
}

export interface RFQ {
  id: string;
  rfqNumber: string;
  submittedDate: string;
  projectName: string;
  projectType: string;
  city: string;
  items: RFQItem[];
  totalEstimatedQty: number;
  status: RFQStatus;
  statusHistory: RFQStatusHistory[];
  quotedAmount?: number;
  validUntil?: string;
  assignedTo?: string;
  notes?: string;
  attachments?: string[];
  responseDeadline?: string;
}

export type POStatus =
  | "draft"           // مسودة
  | "submitted"       // تم الإرسال
  | "confirmed"       // مؤكد
  | "manufacturing"   // قيد التصنيع
  | "quality_check"   // فحص الجودة
  | "ready"           // جاهز للشحن
  | "shipped"         // تم الشحن
  | "delivered"       // تم التسليم
  | "cancelled";      // ملغي

export interface POItem {
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface POStatusHistory {
  status: POStatus;
  date: string;
  note?: string;
  by?: string;
  location?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  rfqRef?: string;
  submittedDate: string;
  expectedDelivery: string;
  actualDelivery?: string;
  projectName: string;
  deliveryAddress: string;
  city: string;
  items: POItem[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  status: POStatus;
  statusHistory: POStatusHistory[];
  paymentStatus: "unpaid" | "partial" | "paid";
  paymentTerms: string;
  trackingNumber?: string;
  invoiceNumber?: string;
  notes?: string;
}

// ─── Mock Company Profile ────────────────────────────────────

export const mockCompany: CompanyProfile = {
  id: "COMP-001",
  companyName: "شركة الأفق للتطوير العقاري",
  contactName: "عبدالله الشمري",
  email: "a.shamri@ufuq-dev.sa",
  phone: "0551234567",
  city: "الرياض",
  companyType: "developer",
  registrationNumber: "1010123456",
  vatNumber: "310123456700003",
  accountManager: "سارة الغامدي",
  joinDate: "2024-01-10",
  creditLimit: 1000000,
  creditUsed: 342500,
};

// ─── Mock RFQs ───────────────────────────────────────────────

export const mockRFQs: RFQ[] = [
  {
    id: "RFQ-001",
    rfqNumber: "RFQ-2026-0018",
    submittedDate: "2026-04-10",
    projectName: "مشروع أبراج الأفق السكني",
    projectType: "مجمع سكني",
    city: "الرياض",
    items: [
      { productName: "أبواب داخلية خشب السنديان", category: "أبواب داخلية", quantity: 120, specifications: "مقاس 90×210 سم، لون بلوط فاتح" },
      { productName: "أبواب خارجية مدخل رئيسي", category: "أبواب خارجية", quantity: 24, specifications: "مقاس 120×240 سم، مع إطار مزدوج" },
      { productName: "أبواب مقاومة للحريق", category: "أبواب حماية", quantity: 36, specifications: "تصنيف FD60، شهادة SASO" },
    ],
    totalEstimatedQty: 180,
    status: "quoted",
    quotedAmount: 342500,
    validUntil: "2026-05-10",
    assignedTo: "سارة الغامدي",
    responseDeadline: "2026-04-25",
    notes: "المشروع يتضمن 24 وحدة سكنية في حي النرجس",
    statusHistory: [
      { status: "submitted", date: "2026-04-10 09:15", note: "تم إرسال طلب عرض السعر", by: "عبدالله الشمري" },
      { status: "under_review", date: "2026-04-11 10:30", note: "قيد المراجعة من قِبل فريق المبيعات", by: "سارة الغامدي" },
      { status: "quoted", date: "2026-04-14 14:00", note: "تم إعداد عرض السعر وإرساله للعميل", by: "سارة الغامدي" },
    ],
  },
  {
    id: "RFQ-002",
    rfqNumber: "RFQ-2026-0009",
    submittedDate: "2026-03-01",
    projectName: "فندق الأفق الفاخر",
    projectType: "فندقي",
    city: "جدة",
    items: [
      { productName: "أبواب غرف فندقية", category: "أبواب داخلية", quantity: 200, specifications: "مقاس 90×210 سم، عازل للصوت 35dB" },
      { productName: "أبواب مداخل الفندق", category: "أبواب خارجية", quantity: 8, specifications: "أبواب زجاجية مؤطرة بالخشب" },
    ],
    totalEstimatedQty: 208,
    status: "accepted",
    quotedAmount: 520000,
    validUntil: "2026-04-01",
    assignedTo: "سارة الغامدي",
    notes: "تم قبول العرض وتحويله لأمر شراء PO-2026-0007",
    statusHistory: [
      { status: "submitted", date: "2026-03-01 11:00", by: "عبدالله الشمري" },
      { status: "under_review", date: "2026-03-02 09:00", by: "سارة الغامدي" },
      { status: "quoted", date: "2026-03-05 15:30", note: "عرض سعر شامل بخصم 15%", by: "سارة الغامدي" },
      { status: "negotiating", date: "2026-03-10 10:00", note: "طلب العميل مراجعة سعر الأبواب الخارجية", by: "عبدالله الشمري" },
      { status: "accepted", date: "2026-03-15 13:00", note: "تم قبول العرض النهائي", by: "عبدالله الشمري" },
    ],
  },
  {
    id: "RFQ-003",
    rfqNumber: "RFQ-2026-0022",
    submittedDate: "2026-04-16",
    projectName: "مكاتب الأفق التجارية",
    projectType: "تجاري",
    city: "الرياض",
    items: [
      { productName: "أبواب مكاتب زجاجية مؤطرة", category: "أبواب داخلية", quantity: 45, specifications: "إطار خشب الجوز، زجاج مزدوج" },
      { productName: "أبواب مقاومة للحريق FD30", category: "أبواب حماية", quantity: 12, specifications: "مع إغلاق تلقائي" },
    ],
    totalEstimatedQty: 57,
    status: "under_review",
    assignedTo: "سارة الغامدي",
    responseDeadline: "2026-04-23",
    statusHistory: [
      { status: "submitted", date: "2026-04-16 08:45", note: "تم إرسال طلب عرض السعر", by: "عبدالله الشمري" },
      { status: "under_review", date: "2026-04-16 11:00", note: "قيد المراجعة", by: "سارة الغامدي" },
    ],
  },
  {
    id: "RFQ-004",
    rfqNumber: "RFQ-2025-0087",
    submittedDate: "2025-11-10",
    projectName: "مشروع الواجهة التجارية",
    projectType: "تجاري",
    city: "الدمام",
    items: [
      { productName: "أبواب خارجية فاخرة", category: "أبواب خارجية", quantity: 15 },
    ],
    totalEstimatedQty: 15,
    status: "expired",
    quotedAmount: 75000,
    validUntil: "2025-12-10",
    statusHistory: [
      { status: "submitted", date: "2025-11-10", by: "عبدالله الشمري" },
      { status: "under_review", date: "2025-11-11", by: "سارة الغامدي" },
      { status: "quoted", date: "2025-11-15", by: "سارة الغامدي" },
      { status: "expired", date: "2025-12-10", note: "انتهت صلاحية العرض دون رد" },
    ],
  },
];

// ─── Mock Purchase Orders ────────────────────────────────────

export const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: "PO-001",
    poNumber: "PO-2026-0007",
    rfqRef: "RFQ-2026-0009",
    submittedDate: "2026-03-18",
    expectedDelivery: "2026-05-20",
    projectName: "فندق الأفق الفاخر",
    deliveryAddress: "شارع الأمير محمد بن عبدالعزيز، حي البلد",
    city: "جدة",
    items: [
      { productName: "أبواب غرف فندقية - عازل صوت", sku: "DR-INT-SND-003", quantity: 200, unitPrice: 2200, discount: 15, total: 374000 },
      { productName: "أبواب مداخل فندقية", sku: "DR-EXT-MHG-001", quantity: 8, unitPrice: 18000, discount: 15, total: 122400 },
    ],
    subtotal: 496400,
    vatAmount: 74460,
    totalAmount: 570860,
    status: "manufacturing",
    paymentStatus: "partial",
    paymentTerms: "30% مقدم، 70% عند التسليم",
    trackingNumber: "TRK-20260318-007",
    invoiceNumber: "INV-2026-0312",
    notes: "يرجى التنسيق مع مدير الموقع م. فهد قبل التسليم",
    statusHistory: [
      { status: "submitted", date: "2026-03-18 10:00", note: "تم إرسال أمر الشراء", by: "عبدالله الشمري" },
      { status: "confirmed", date: "2026-03-19 09:30", note: "تم تأكيد الطلب وإصدار الفاتورة", by: "سارة الغامدي" },
      { status: "manufacturing", date: "2026-03-25 08:00", note: "بدأ التصنيع في مصنع الرياض - خط الإنتاج 3", by: "قسم الإنتاج", location: "مصنع الرياض" },
    ],
  },
  {
    id: "PO-002",
    poNumber: "PO-2026-0003",
    submittedDate: "2026-02-05",
    expectedDelivery: "2026-03-20",
    actualDelivery: "2026-03-22",
    projectName: "مجمع الأفق السكني - المرحلة الأولى",
    deliveryAddress: "حي النرجس، طريق الملك سلمان",
    city: "الرياض",
    items: [
      { productName: "باب كلاسيكي خشب السنديان", sku: "DR-INT-OAK-001", quantity: 60, unitPrice: 900, discount: 20, total: 43200 },
      { productName: "باب عصري بقشرة الجوز", sku: "DR-INT-WAL-002", quantity: 30, unitPrice: 1087.5, discount: 20, total: 26100 },
    ],
    subtotal: 69300,
    vatAmount: 10395,
    totalAmount: 79695,
    status: "delivered",
    paymentStatus: "paid",
    paymentTerms: "50% مقدم، 50% عند التسليم",
    trackingNumber: "TRK-20260205-003",
    invoiceNumber: "INV-2026-0198",
    statusHistory: [
      { status: "submitted", date: "2026-02-05 11:00", by: "عبدالله الشمري" },
      { status: "confirmed", date: "2026-02-06 10:00", by: "سارة الغامدي" },
      { status: "manufacturing", date: "2026-02-10 08:00", note: "بدأ التصنيع", by: "قسم الإنتاج", location: "مصنع الرياض" },
      { status: "quality_check", date: "2026-03-01 14:00", note: "اجتازت الأبواب فحص الجودة بتقييم ممتاز", by: "قسم الجودة" },
      { status: "ready", date: "2026-03-05 09:00", note: "جاهز للشحن - مستودع الرياض", by: "المستودع", location: "مستودع الرياض" },
      { status: "shipped", date: "2026-03-18 07:30", note: "تم الشحن بواسطة شركة النقل السريع", by: "قسم الشحن", location: "في الطريق" },
      { status: "delivered", date: "2026-03-22 14:00", note: "تم التسليم بحالة ممتازة، استلم م. فهد", by: "سائق التوصيل", location: "موقع المشروع - الرياض" },
    ],
  },
  {
    id: "PO-003",
    poNumber: "PO-2026-0011",
    submittedDate: "2026-04-01",
    expectedDelivery: "2026-05-15",
    projectName: "برج الأفق التجاري",
    deliveryAddress: "طريق الملك فهد، حي العليا",
    city: "الرياض",
    items: [
      { productName: "أبواب مقاومة للحريق FD60", sku: "DR-FIRE-FD60-001", quantity: 40, unitPrice: 3200, discount: 10, total: 115200 },
      { productName: "أبواب عازلة للصوت 45dB", sku: "DR-SND-45DB-001", quantity: 25, unitPrice: 2800, discount: 10, total: 63000 },
    ],
    subtotal: 178200,
    vatAmount: 26730,
    totalAmount: 204930,
    status: "quality_check",
    paymentStatus: "partial",
    paymentTerms: "40% مقدم، 60% عند التسليم",
    trackingNumber: "TRK-20260401-011",
    invoiceNumber: "INV-2026-0389",
    statusHistory: [
      { status: "submitted", date: "2026-04-01 09:00", by: "عبدالله الشمري" },
      { status: "confirmed", date: "2026-04-02 10:30", by: "سارة الغامدي" },
      { status: "manufacturing", date: "2026-04-05 08:00", note: "بدأ التصنيع - خط الإنتاج المتخصص", by: "قسم الإنتاج", location: "مصنع الرياض" },
      { status: "quality_check", date: "2026-04-17 13:00", note: "جاري إجراء اختبارات مقاومة الحريق والعزل الصوتي", by: "قسم الجودة" },
    ],
  },
  {
    id: "PO-004",
    poNumber: "PO-2025-0089",
    submittedDate: "2025-10-15",
    expectedDelivery: "2025-11-30",
    actualDelivery: "2025-11-28",
    projectName: "فيلات الأفق الراقية",
    deliveryAddress: "حي الملقا، الرياض",
    city: "الرياض",
    items: [
      { productName: "باب رئيسي فاخر من خشب الماهوجني", sku: "DR-EXT-MHG-002", quantity: 12, unitPrice: 4200, discount: 10, total: 45360 },
    ],
    subtotal: 45360,
    vatAmount: 6804,
    totalAmount: 52164,
    status: "delivered",
    paymentStatus: "paid",
    paymentTerms: "دفع كامل مقدم",
    trackingNumber: "TRK-20251015-089",
    invoiceNumber: "INV-2025-1102",
    statusHistory: [
      { status: "submitted", date: "2025-10-15", by: "عبدالله الشمري" },
      { status: "confirmed", date: "2025-10-16", by: "سارة الغامدي" },
      { status: "manufacturing", date: "2025-10-20", by: "قسم الإنتاج" },
      { status: "quality_check", date: "2025-11-10", by: "قسم الجودة" },
      { status: "ready", date: "2025-11-15", by: "المستودع" },
      { status: "shipped", date: "2025-11-25", by: "قسم الشحن" },
      { status: "delivered", date: "2025-11-28", by: "سائق التوصيل" },
    ],
  },
];

// ─── Helper functions ────────────────────────────────────────

export const rfqStatusLabels: Record<RFQStatus, string> = {
  submitted: "تم الإرسال",
  under_review: "قيد المراجعة",
  quoted: "تم تقديم العرض",
  negotiating: "قيد التفاوض",
  accepted: "مقبول",
  rejected: "مرفوض",
  expired: "منتهي الصلاحية",
};

export const rfqStatusColors: Record<RFQStatus, string> = {
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  quoted: "bg-purple-100 text-purple-700",
  negotiating: "bg-orange-100 text-orange-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-500",
};

export const poStatusLabels: Record<POStatus, string> = {
  draft: "مسودة",
  submitted: "تم الإرسال",
  confirmed: "مؤكد",
  manufacturing: "قيد التصنيع",
  quality_check: "فحص الجودة",
  ready: "جاهز للشحن",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

export const poStatusColors: Record<POStatus, string> = {
  draft: "bg-gray-100 text-gray-500",
  submitted: "bg-blue-100 text-blue-700",
  confirmed: "bg-indigo-100 text-indigo-700",
  manufacturing: "bg-amber-100 text-amber-700",
  quality_check: "bg-purple-100 text-purple-700",
  ready: "bg-teal-100 text-teal-700",
  shipped: "bg-cyan-100 text-cyan-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

// PO progress steps in order
export const poProgressSteps: POStatus[] = [
  "submitted",
  "confirmed",
  "manufacturing",
  "quality_check",
  "ready",
  "shipped",
  "delivered",
];

export function getPoProgressIndex(status: POStatus): number {
  return poProgressSteps.indexOf(status);
}
