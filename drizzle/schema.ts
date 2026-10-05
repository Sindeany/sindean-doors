import {
  mysqlTable,
  varchar,
  text,
  longtext,
  int,
  bigint,
  mysqlEnum,
  json,
  float,
  boolean,
  tinyint,
  timestamp,
  index,
  unique,
} from "drizzle-orm/mysql-core";

// ── Door Orders ──────────────────────────────────────────────────────────────
export const doorOrders = mysqlTable("door_orders", {
  id: int("id").autoincrement().primaryKey(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 50 }).notNull(),
  customerEmail: varchar("customer_email", { length: 255 }),
  productId: varchar("product_id", { length: 100 }).notNull(),
  productName: varchar("product_name", { length: 255 }).notNull(),
  selections: json("selections").notNull(),
  subSelections: json("sub_selections").notNull(),
  dimensions: json("dimensions"),
  basePrice: int("base_price").notNull().default(0),
  totalPrice: int("total_price").notNull().default(0),
  status: mysqlEnum("status", [
    "new",
    "reviewing",
    "confirmed",
    "in_production",
    "ready",
    "delivered",
    "cancelled",
  ])
    .notNull()
    .default("new"),
  // ── حقول سير العمل التفصيلية (15 مرحلة) ──
  workflowStage: varchar("workflow_stage", { length: 50 }).default("po_review"),
  workflowStagesData: json("workflow_stages_data"), // Record<WorkflowStage, {status, completedAt?, notes?, assignee?}>
  priority: mysqlEnum("priority", ["normal", "urgent", "vip"]).default(
    "normal"
  ),
  expectedDelivery: bigint("expected_delivery", { mode: "number" }),
  totalDoors: int("total_doors").default(1),
  paymentStatus: mysqlEnum("payment_status_order", [
    "unpaid",
    "partial",
    "paid",
  ])
    .notNull()
    .default("unpaid"),
  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type DoorOrder = typeof doorOrders.$inferSelect;
export type NewDoorOrder = typeof doorOrders.$inferInsert;

// ── Suppliers ────────────────────────────────────────────────────────────────
// الموردون المسجلون في المنصة
export const suppliers = mysqlTable("suppliers", {
  id: int("id").primaryKey().autoincrement(),
  // بيانات الشركة
  companyName: varchar("company_name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 50 }).notNull(),
  city: varchar("city", { length: 100 }),
  address: text("address"),
  website: varchar("website", { length: 255 }),
  // تصنيف المورد
  categories: json("categories"), // ["wood", "hardware", "glass", ...]
  // بيانات الحساب
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["pending", "active", "suspended"])
    .notNull()
    .default("pending"),
  // تقييم المورد (يُحسب تلقائياً)
  rating: float("rating").default(0),
  totalQuotes: int("total_quotes").default(0),
  wonQuotes: int("won_quotes").default(0),
  // ملاحظات الإدارة
  adminNotes: text("admin_notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;

// ── RFQ (Request for Quotation) ──────────────────────────────────────────────
// طلبات عروض الأسعار التي تنشئها الإدارة
export const rfqs = mysqlTable("rfqs", {
  id: int("id").primaryKey().autoincrement(),
  rfqNumber: varchar("rfq_number", { length: 50 }).notNull().unique(), // RFQ-2024-001
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  // المواد/الخدمات المطلوبة (JSON array)
  items: json("items").notNull(), // [{ name, description, qty, unit, specs }]
  // شروط العرض
  currency: varchar("currency", { length: 10 }).default("SAR"),
  deliveryLocation: varchar("delivery_location", { length: 255 }),
  deliveryDays: int("delivery_days"), // المدة المطلوبة بالأيام
  paymentTerms: varchar("payment_terms", { length: 255 }), // "30 days net"
  warrantyMonths: int("warranty_months"),
  // مواعيد
  submissionDeadline: bigint("submission_deadline", {
    mode: "number",
  }).notNull(),
  // حالة الطلب
  status: mysqlEnum("status", [
    "draft", // مسودة
    "published", // منشور - تم إرسال الدعوات
    "closed", // مغلق - انتهى موعد التقديم
    "evaluated", // تم التقييم
    "awarded", // تم الترسية
    "cancelled", // ملغي
  ])
    .notNull()
    .default("draft"),
  // نتيجة الترسية
  awardedSupplierId: int("awarded_supplier_id"),
  awardedAt: bigint("awarded_at", { mode: "number" }),
  awardNotes: text("award_notes"),
  // تقييم الذكاء الاصطناعي (JSON)
  aiEvaluation: json("ai_evaluation"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type Rfq = typeof rfqs.$inferSelect;
export type NewRfq = typeof rfqs.$inferInsert;

// ── RFQ Invitations ──────────────────────────────────────────────────────────
// الدعوات المرسلة للموردين للمشاركة في طلب عرض الأسعار
export const rfqInvitations = mysqlTable("rfq_invitations", {
  id: int("id").primaryKey().autoincrement(),
  rfqId: int("rfq_id").notNull(),
  supplierId: int("supplier_id").notNull(),
  status: mysqlEnum("status", [
    "sent", // تم الإرسال
    "viewed", // شاهد المورد الدعوة
    "accepted", // قبل المشاركة
    "declined", // رفض المشاركة
    "submitted", // قدّم عرضاً
  ])
    .notNull()
    .default("sent"),
  sentAt: bigint("sent_at", { mode: "number" }).notNull(),
  viewedAt: bigint("viewed_at", { mode: "number" }),
  respondedAt: bigint("responded_at", { mode: "number" }),
  declineReason: text("decline_reason"),
});

export type RfqInvitation = typeof rfqInvitations.$inferSelect;

// ── Supplier Quotes ──────────────────────────────────────────────────────────
// عروض الأسعار المقدمة من الموردين
export const supplierQuotes = mysqlTable("supplier_quotes", {
  id: int("id").primaryKey().autoincrement(),
  rfqId: int("rfq_id").notNull(),
  supplierId: int("supplier_id").notNull(),
  invitationId: int("invitation_id"),
  // بيانات العرض
  quoteNumber: varchar("quote_number", { length: 50 }),
  totalPrice: float("total_price").notNull(),
  currency: varchar("currency", { length: 10 }).default("SAR"),
  // بنود العرض (JSON - مطابقة لـ rfq.items مع الأسعار)
  lineItems: json("line_items").notNull(), // [{ itemIndex, unitPrice, totalPrice, notes }]
  // شروط العرض
  deliveryDays: int("delivery_days"),
  paymentTerms: varchar("payment_terms", { length: 255 }),
  warrantyMonths: int("warranty_months"),
  validUntil: bigint("valid_until", { mode: "number" }),
  // ملفات مرفقة (JSON array of URLs)
  attachments: json("attachments"),
  // ملاحظات إضافية
  notes: text("notes"),
  technicalNotes: text("technical_notes"),
  // حالة العرض
  status: mysqlEnum("status", [
    "submitted", // مقدم
    "under_review", // قيد المراجعة
    "shortlisted", // في القائمة المختصرة
    "awarded", // فاز بالترسية
    "rejected", // مرفوض
  ])
    .notNull()
    .default("submitted"),
  // تقييم الذكاء الاصطناعي
  aiScore: float("ai_score"), // 0-100
  aiScoreBreakdown: json("ai_score_breakdown"), // { price, delivery, payment, warranty, risk, history }
  aiRecommendation: text("ai_recommendation"),
  // تقييم يدوي من الإدارة
  adminScore: float("admin_score"),
  adminNotes: text("admin_notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type SupplierQuote = typeof supplierQuotes.$inferSelect;
export type NewSupplierQuote = typeof supplierQuotes.$inferInsert;

// ── Purchase Orders ──────────────────────────────────────────────────────────
// أوامر الشراء الصادرة بعد الترسية
export const purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").primaryKey().autoincrement(),
  poNumber: varchar("po_number", { length: 50 }).notNull().unique(), // PO-2024-001
  rfqId: int("rfq_id"),
  supplierId: int("supplier_id").notNull(),
  quoteId: int("quote_id"),
  title: varchar("title", { length: 255 }).notNull(),
  items: json("items").notNull(),
  totalPrice: float("total_price").notNull(),
  currency: varchar("currency", { length: 10 }).default("SAR"),
  deliveryDays: int("delivery_days"),
  paymentTerms: varchar("payment_terms", { length: 255 }),
  deliveryLocation: varchar("delivery_location", { length: 255 }),
  status: mysqlEnum("status", [
    "issued", // صادر
    "confirmed", // مؤكد من المورد
    "in_progress", // جاري التنفيذ
    "delivered", // تم التسليم
    "invoiced", // صدرت فاتورة
    "paid", // تم الدفع
    "cancelled", // ملغي
  ])
    .notNull()
    .default("issued"),
  notes: text("notes"),
  issuedAt: bigint("issued_at", { mode: "number" }).notNull(),
  confirmedAt: bigint("confirmed_at", { mode: "number" }),
  deliveredAt: bigint("delivered_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;

// ── Supplier Sessions ────────────────────────────────────────────────────────
// جلسات تسجيل دخول الموردين (JWT بسيط)
export const supplierSessions = mysqlTable("supplier_sessions", {
  id: int("id").primaryKey().autoincrement(),
  supplierId: int("supplier_id").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

// ── RFQ Comments ─────────────────────────────────────────────────────────────
// تعليقات ورسائل التواصل داخل طلبات التسعير
export const rfqComments = mysqlTable("rfq_comments", {
  id: int("id").primaryKey().autoincrement(),
  rfqId: int("rfq_id").notNull(),
  authorType: mysqlEnum("author_type", ["admin", "supplier"]).notNull(),
  authorId: int("author_id").notNull(), // supplier_id أو 0 للإدارة
  authorName: varchar("author_name", { length: 100 }).notNull(),
  content: text("content").notNull(),
  isInternal: tinyint("is_internal").notNull().default(0), // 1 = داخلي للإدارة فقط
  parentId: int("parent_id"), // للردود المتداخلة
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type RfqComment = typeof rfqComments.$inferSelect;
export type NewRfqComment = typeof rfqComments.$inferInsert;

// ── Product Options (synced from Admin UI) ───────────────────────────────────
export const productOptions = mysqlTable("product_options", {
  id: int("id").autoincrement().primaryKey(),
  sectionsJson: text("sections_json").notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  updatedBy: varchar("updated_by", { length: 100 }).default("admin"),
});

export type ProductOptions = typeof productOptions.$inferSelect;

// ── Distributor Orders ────────────────────────────────────────────────────────
export const distributorOrders = mysqlTable("distributor_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  distributorId: varchar("distributor_id", { length: 100 }).notNull(),
  distributorName: varchar("distributor_name", { length: 200 }).notNull(),
  distributorCompany: varchar("distributor_company", { length: 200 }),
  orderType: mysqlEnum("order_type", [
    "purchase_order",
    "rfq",
    "sample_request",
  ])
    .notNull()
    .default("purchase_order"),
  items: text("items").notNull(), // JSON array of configured items
  totalAmount: float("total_amount").default(0),
  status: mysqlEnum("status", [
    "draft",
    "pending",
    "confirmed",
    "manufacturing",
    "shipped",
    "delivered",
    "cancelled",
  ])
    .notNull()
    .default("pending"),
  paymentStatus: mysqlEnum("payment_status", ["unpaid", "partial", "paid"])
    .notNull()
    .default("unpaid"),
  notes: text("notes"),
  source: mysqlEnum("source", ["manual", "excel_upload", "api"])
    .notNull()
    .default("manual"),
  excelFileName: varchar("excel_file_name", { length: 255 }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type DistributorOrder = typeof distributorOrders.$inferSelect;
export type NewDistributorOrder = typeof distributorOrders.$inferInsert;

// ── Distributor Payments ──────────────────────────────────
export const distributorPaymentMethodEnum = mysqlEnum("method", [
  "cash",
  "bank_transfer",
  "cheque",
  "card",
  "other",
]);

export const distributorPaymentStatusEnum = mysqlEnum("status", [
  "confirmed",
  "pending",
  "cancelled",
]);

export const distributorPayments = mysqlTable("distributor_payments", {
  id: int("id").primaryKey().autoincrement(),
  distributorId: int("distributor_id").notNull(),
  orderNumber: varchar("order_number", { length: 50 }),
  amount: float("amount").notNull(),
  method: mysqlEnum("method", [
    "cash",
    "bank_transfer",
    "cheque",
    "card",
    "other",
  ]).notNull().default("bank_transfer"),
  reference: varchar("reference", { length: 191 }),
  note: text("note"),
  paymentDate: timestamp("payment_date").notNull().defaultNow(),
  status: mysqlEnum("status", [
    "confirmed",
    "pending",
    "cancelled",
  ]).notNull().default("confirmed"),
  journalEntryId: int("journal_entry_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type DistributorPayment = typeof distributorPayments.$inferSelect;
export type NewDistributorPayment = typeof distributorPayments.$inferInsert;

// ── ZATCA Tax Invoices ────────────────────────────────────────────────────────
// الفواتير الضريبية الإلكترونية المتوافقة مع متطلبات هيئة الزكاة والضريبة والجمارك

export const taxInvoices = mysqlTable("tax_invoices", {
  id: int("id").autoincrement().primaryKey(),

  // معرّفات الفاتورة
  uuid: varchar("uuid", { length: 36 }).notNull().unique(), // UUID v4
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(), // INV-2024-000001
  invoiceType: mysqlEnum("invoice_type", ["standard", "simplified"])
    .notNull()
    .default("simplified"),
  // BT-3: 388 = Tax Invoice (all types), 381 = Credit Note, 383 = Debit Note
  invoiceTypeCode: varchar("invoice_type_code", { length: 10 })
    .notNull()
    .default("388"),
  // KSA-2: 010000 = Standard (B2B), 020000 = Simplified (B2C)
  invoiceSubTypeCode: varchar("invoice_sub_type_code", { length: 10 })
    .notNull()
    .default("020000"),
  // ZATCA Phase 2: hash of the previous invoice (chain integrity)
  previousInvoiceHash: varchar("previous_invoice_hash", { length: 64 }),
  previousInvoiceNumber: varchar("previous_invoice_number", { length: 50 }),

  // تاريخ ووقت الإصدار (UTC)
  issueDate: varchar("issue_date", { length: 10 }).notNull(), // YYYY-MM-DD
  issueTime: varchar("issue_time", { length: 8 }).notNull(), // HH:MM:SS

  // بيانات البائع (سنديان)
  sellerName: varchar("seller_name", { length: 255 }).notNull(),
  sellerVatNumber: varchar("seller_vat_number", { length: 15 }).notNull(),
  sellerCrNumber: varchar("seller_cr_number", { length: 20 }),
  sellerAddress: text("seller_address"),
  sellerCity: varchar("seller_city", { length: 100 }),
  sellerPostalCode: varchar("seller_postal_code", { length: 10 }),

  // بيانات المشتري
  buyerName: varchar("buyer_name", { length: 255 }).notNull(),
  buyerVatNumber: varchar("buyer_vat_number", { length: 15 }), // إلزامي للفاتورة القياسية
  buyerCrNumber: varchar("buyer_cr_number", { length: 20 }),
  buyerAddress: text("buyer_address"),
  buyerPhone: varchar("buyer_phone", { length: 50 }),
  buyerEmail: varchar("buyer_email", { length: 255 }),

  // بنود الفاتورة (JSON)
  lineItems: json("line_items").notNull(), // [{ description, qty, unitPrice, vatRate, vatAmount, lineTotal }]

  // الإجماليات (بالهللة - أعداد صحيحة لتفادي أخطاء الفاصلة العشرية)
  subtotalHalala: int("subtotal_halala").notNull().default(0), // المبلغ بدون ضريبة
  vatAmountHalala: int("vat_amount_halala").notNull().default(0), // مبلغ الضريبة
  totalHalala: int("total_halala").notNull().default(0), // الإجمالي الكلي
  vatRate: float("vat_rate").notNull().default(15), // نسبة الضريبة %

  // QR Code (Base64 TLV encoded)
  qrCodeData: text("qr_code_data"), // Base64 TLV string
  invoiceHash: varchar("invoice_hash", { length: 64 }), // SHA-256 hash

  // حالة الفاتورة
  status: mysqlEnum("status", ["draft", "issued", "paid", "cancelled"])
    .notNull()
    .default("draft"),
  paymentStatus: mysqlEnum("payment_status", ["unpaid", "partial", "paid"])
    .notNull()
    .default("unpaid"),

  // مرجع الطلب الأصلي (اختياري)
  sourceType: mysqlEnum("source_type", [
    "door_order",
    "distributor_order",
    "manual",
  ]).default("manual"),
  sourceId: int("source_id"),

  // ── ZATCA Phase 2 — حالة الإرسال لبوابة ZATCA ─────────────────────────────
  // pending: لم يُرسل بعد | submitted: تحت المعالجة | cleared: تمت المقاصة (B2B)
  // reported: تم الإبلاغ (B2C) | error: فشل الإرسال
  zatcaStatus: mysqlEnum("zatca_status", [
    "pending",
    "submitted",
    "cleared",
    "reported",
    "error",
  ]).default("pending"),
  zatcaSubmittedAt: bigint("zatca_submitted_at", { mode: "number" }), // timestamp الإرسال
  zatcaResponseCode: varchar("zatca_response_code", { length: 10 }), // HTTP status: 200, 400...
  zatcaWarnings: text("zatca_warnings"), // JSON array of warning strings from ZATCA
  zatcaInvoiceXml: longtext("zatca_invoice_xml"), // UBL 2.1 XML المُرسل للأرشفة

  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type TaxInvoice = typeof taxInvoices.$inferSelect;
export type NewTaxInvoice = typeof taxInvoices.$inferInsert;

// ── ZATCA Company Settings ────────────────────────────────────────────────────
// إعدادات بيانات الشركة الضريبية (تُستخدم كقيم افتراضية عند إنشاء الفواتير)

export const zatcaSettings = mysqlTable("zatca_settings", {
  id: int("id").autoincrement().primaryKey(),
  sellerName: varchar("seller_name", { length: 255 })
    .notNull()
    .default("سنديان للأبواب الخشبية"),
  sellerNameEn: varchar("seller_name_en", { length: 255 }).default(
    "Sindian Wooden Doors"
  ),
  vatNumber: varchar("vat_number", { length: 15 })
    .notNull()
    .default("300000000000003"),
  crNumber: varchar("cr_number", { length: 20 }).default("1234567890"),
  address: text("address"),
  city: varchar("city", { length: 100 }).default("الرياض"),
  postalCode: varchar("postal_code", { length: 10 }).default("12345"),
  country: varchar("country", { length: 5 }).default("SA"),
  phone: varchar("phone", { length: 50 }).default("920-000-000"),
  email: varchar("email", { length: 255 }).default("info@sindian.sa"),
  // عداد الفواتير (يُزاد بمقدار 1 عند كل فاتورة جديدة)
  invoiceCounter: int("invoice_counter").notNull().default(0),

  // ── ZATCA Phase 2 API Credentials ──────────────────────────────────────────
  // يُحصل عليها من بوابة ZATCA بعد عملية الإعداد (Onboarding)
  // sandbox: بيئة الاختبار (developer-portal) | production: الإنتاج
  zatcaEnvironment: mysqlEnum("zatca_environment", [
    "sandbox",
    "production",
  ]).default("sandbox"),
  zatcaCsid: text("zatca_csid"), // Cryptographic Stamp ID (CSID) المُصدر من ZATCA
  zatcaCsidSecret: text("zatca_csid_secret"), // CSID Secret / Private Key

  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type ZatcaSettings = typeof zatcaSettings.$inferSelect;

// ── Users (Retail Customers) ─────────────────────────────────────────────────
// حسابات العملاء التجزئة
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 50 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  wishlistIds: json("wishlist_ids").$type<number[]>().default([]),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ── User Sessions ────────────────────────────────────────────────────────────
export const userSessions = mysqlTable("user_sessions", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export type UserSession = typeof userSessions.$inferSelect;

// ── Admin Sessions ───────────────────────────────────────────────────────────
export const adminSessions = mysqlTable("admin_sessions", {
  id: int("id").primaryKey().autoincrement(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export type AdminSession = typeof adminSessions.$inferSelect;

// ── Staff identity (internal factory users) ──────────────────────────────────
// Individual workers. Team membership is a role assignment, not a separate table.
export const staffUsers = mysqlTable("staff_users", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  loginName: varchar("login_name", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type StaffUser = typeof staffUsers.$inferSelect;
export type NewStaffUser = typeof staffUsers.$inferInsert;

export const staffUserRoles = mysqlTable(
  "staff_user_roles",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id")
      .notNull()
      .references(() => staffUsers.id, { onDelete: "restrict" }),
    role: mysqlEnum("role", [
      "admin",
      "sales_coordinator",
      "sales_person",
      "stock_manager",
      "production_manager",
      "laminating",
      "cutting",
      "auto_line",
      "frame_architrave",
      "packing",
    ]).notNull(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    userIdRoleUnique: unique("staff_user_roles_user_id_role_unique").on(
      table.userId,
      table.role
    ),
  })
);

export type StaffUserRole = typeof staffUserRoles.$inferSelect;
export type NewStaffUserRole = typeof staffUserRoles.$inferInsert;

export const staffSessions = mysqlTable(
  "staff_sessions",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id")
      .notNull()
      .references(() => staffUsers.id, { onDelete: "restrict" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
    revokedAt: bigint("revoked_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    expiresAtIdx: index("expires_at_idx").on(table.expiresAt),
  })
);

export type StaffSession = typeof staffSessions.$inferSelect;
export type NewStaffSession = typeof staffSessions.$inferInsert;

// ── Inventory Items ──────────────────────────────────────────────────────────
// مواد المخزون الخام
export const inventoryItems = mysqlTable("inventory_items", {
  id: int("id").primaryKey().autoincrement(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  nameEn: varchar("name_en", { length: 255 }),
  category: mysqlEnum("category", [
    "wpc_board",
    "film",
    "edge",
    "frame",
    "lock",
    "hinge",
    "accessory",
    "packaging",
    "chemical",
  ]).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  currentQty: int("current_qty").notNull().default(0),
  minQty: int("min_qty").notNull().default(0),
  maxQty: int("max_qty").notNull().default(0),
  reorderQty: int("reorder_qty").notNull().default(0),
  unitCost: float("unit_cost").notNull().default(0),
  supplier: varchar("supplier", { length: 255 }).notNull().default(""),
  supplierPhone: varchar("supplier_phone", { length: 50 }),
  location: varchar("location", { length: 255 }).notNull().default(""),
  lastReceived: varchar("last_received", { length: 10 }), // YYYY-MM-DD
  lastConsumed: varchar("last_consumed", { length: 10 }), // YYYY-MM-DD
  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type InventoryItemRow = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;

// ── Inventory Transactions ───────────────────────────────────────────────────
// حركات الدخول والخروج للمخزون
export const inventoryTransactions = mysqlTable(
  "inventory_transactions",
  {
    id: int("id").primaryKey().autoincrement(),
    itemId: int("item_id").notNull(),
    type: mysqlEnum("type", [
      "receive",
      "consume",
      "adjust",
      "return",
      "transfer",
    ]).notNull(),
    quantity: int("quantity").notNull(),
    balanceBefore: int("balance_before").notNull(),
    balanceAfter: int("balance_after").notNull(),
    reference: varchar("reference", { length: 255 }).notNull().default(""),
    note: text("note"),
    performedBy: varchar("performed_by", { length: 255 }).notNull().default(""),
    /** Authenticated staff actor. NULL for historical rows created before attribution. */
    staffUserId: int("staff_user_id").references(() => staffUsers.id, {
      onDelete: "restrict",
    }),
    date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => ({
    staffUserIdIdx: index("staff_user_id_idx").on(table.staffUserId),
  })
);

export type InventoryTransactionRow = typeof inventoryTransactions.$inferSelect;
export type NewInventoryTransaction = typeof inventoryTransactions.$inferInsert;

// ── Distributors ─────────────────────────────────────────────────────────────
// الموزعون المسجلون في المنصة
export const distributors = mysqlTable("distributors", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  city: varchar("city", { length: 100 }).notNull().default(""),
  region: varchar("region", { length: 100 }).notNull().default(""),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  whatsapp: varchar("whatsapp", { length: 50 }),
  website: varchar("website", { length: 255 }),
  commercialReg: varchar("commercial_reg", { length: 50 }),
  vatNumber: varchar("vat_number", { length: 20 }),
  bankName: varchar("bank_name", { length: 255 }),
  bankIban: varchar("bank_iban", { length: 40 }),
  status: mysqlEnum("status_dist", [
    "active",
    "pending",
    "suspended",
    "rejected",
  ])
    .notNull()
    .default("pending"),
  tier: mysqlEnum("tier", ["bronze", "silver", "gold", "platinum"])
    .notNull()
    .default("bronze"),
  joinDate: varchar("join_date", { length: 10 }).notNull(),
  contractStart: varchar("contract_start", { length: 10 }),
  contractEnd: varchar("contract_end", { length: 10 }),
  creditLimit: int("credit_limit").default(50000),
  discountRate: int("discount_rate").default(5),
  totalOrders: int("total_orders").notNull().default(0),
  totalRevenue: float("total_revenue").notNull().default(0),
  avgRating: float("avg_rating").notNull().default(0),
  pendingOrders: int("pending_orders").notNull().default(0),
  openComplaints: int("open_complaints").notNull().default(0),
  notes: text("notes"),
  adminNotes: text("admin_notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type DistributorRow = typeof distributors.$inferSelect;
export type NewDistributor = typeof distributors.$inferInsert;

// ── Distributor Sessions ─────────────────────────────────────────────────────
// جلسات تسجيل دخول الموزعين
export const distributorSessions = mysqlTable("distributor_sessions", {
  id: int("id").primaryKey().autoincrement(),
  distributorId: int("distributor_id").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

// -- Complaints ----------------------------------------------------------------
// ????? ???????? ????????
export const complaints = mysqlTable("complaints", {
  id: int("id").primaryKey().autoincrement(),
  ticketNumber: varchar("ticket_number", { length: 50 }).notNull().unique(), // TKT-2026-0001
  distributorId: int("distributor_id"), // null = ???? ?????
  distributorName: varchar("distributor_name", { length: 255 }).notNull(),
  companyName: varchar("company_name", { length: 255 }),
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  product: varchar("product", { length: 255 }).notNull(),
  type: mysqlEnum("complaint_type", [
    "size",
    "color",
    "damage",
    "shortage",
    "delay",
    "quality",
    "other",
  ]).notNull(),
  status: mysqlEnum("complaint_status", [
    "open",
    "under_review",
    "resolved",
    "rejected",
    "return_pending",
  ])
    .notNull()
    .default("open"),
  description: text("description").notNull(),
  images: json("images").$type<string[]>().notNull().default([]),
  satisfactionRating: int("satisfaction_rating"),
  resolvedAt: bigint("resolved_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type ComplaintRow = typeof complaints.$inferSelect;
export type NewComplaint = typeof complaints.$inferInsert;

// -- Complaint Messages --------------------------------------------------------
// ????? ??????? ???? ?? ????
export const complaintMessages = mysqlTable("complaint_messages", {
  id: int("id").primaryKey().autoincrement(),
  complaintId: int("complaint_id").notNull(),
  from: mysqlEnum("msg_from", ["admin", "distributor"]).notNull(),
  text: text("text").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export type ComplaintMessageRow = typeof complaintMessages.$inferSelect;
export type NewComplaintMessage = typeof complaintMessages.$inferInsert;

// ── QC Inspections ────────────────────────────────────────────────────────────
export const qcInspections = mysqlTable("qc_inspections", {
  id: int("id").primaryKey().autoincrement(),
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  orderSource: mysqlEnum("qc_order_source", [
    "door_order",
    "distributor_order",
    "manual",
  ])
    .notNull()
    .default("manual"),
  sourceId: int("source_id"),
  distributorName: varchar("distributor_name", { length: 255 }).notNull(),
  totalDoors: int("total_doors").notNull().default(1),
  qcType: mysqlEnum("qc_type", ["incoming", "final", "po_matching"]).notNull(),
  result: mysqlEnum("qc_result", ["pass", "fail", "pending"])
    .notNull()
    .default("pending"),
  inspector: varchar("inspector", { length: 255 }).notNull().default(""),
  checkItems: json("check_items"), // { color: true/false/null, ... }
  issues: json("issues"), // string[]
  photos: int("photos").notNull().default(0),
  notes: text("notes"),
  inspectedAt: bigint("inspected_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type QCInspectionRow = typeof qcInspections.$inferSelect;
export type NewQCInspection = typeof qcInspections.$inferInsert;

// ── Packing Orders ────────────────────────────────────────────────────────────
export const packingOrders = mysqlTable("packing_orders", {
  id: int("id").primaryKey().autoincrement(),
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  distributorName: varchar("distributor_name", { length: 255 }).notNull(),
  totalDoors: int("total_doors").notNull().default(1),
  packingType: varchar("packing_type", { length: 50 })
    .notNull()
    .default("محلي"),
  packingMethod: varchar("packing_method", { length: 50 })
    .notNull()
    .default("فردي"),
  packingStatus: mysqlEnum("packing_status", ["pending", "in_progress", "done"])
    .notNull()
    .default("pending"),
  deliveryDate: varchar("delivery_date", { length: 30 }).notNull().default(""),
  deliveryStatus: mysqlEnum("delivery_status", [
    "pending",
    "in_progress",
    "done",
  ])
    .notNull()
    .default("pending"),
  accountingStatus: mysqlEnum("accounting_status", [
    "pending",
    "in_progress",
    "done",
  ])
    .notNull()
    .default("pending"),
  totalValue: int("total_value").notNull().default(0),
  paidAmount: int("paid_amount").notNull().default(0),
  doors: json("doors"), // { code, dir, room, packed }[]
  documents: json("documents"), // { packingList, invoice, photos, certificate }
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type PackingOrderRow = typeof packingOrders.$inferSelect;
export type NewPackingOrder = typeof packingOrders.$inferInsert;

// ── Work Orders ───────────────────────────────────────────────────────────────
export const workOrders = mysqlTable("work_orders", {
  id: int("id").primaryKey().autoincrement(),
  orderId: int("order_id")
    .notNull()
    .references(() => doorOrders.id, { onDelete: "restrict" }),
  woNumber: varchar("wo_number", { length: 50 }).notNull().unique(),
  poNumber: varchar("po_number", { length: 50 }).notNull(),
  distributorName: varchar("distributor_name", { length: 255 }).notNull(),
  distributorPhone: varchar("distributor_phone", { length: 50 })
    .notNull()
    .default(""),
  issuedAt: bigint("issued_at", { mode: "number" }).notNull(),
  startDate: varchar("start_date", { length: 20 }).notNull(),
  dueDate: varchar("due_date", { length: 20 }).notNull(),
  status: mysqlEnum("wo_status", [
    "draft",
    "issued",
    "in_progress",
    "completed",
    "on_hold",
    "cancelled",
  ])
    .notNull()
    .default("issued"),
  priority: mysqlEnum("wo_priority", ["normal", "urgent", "vip"])
    .notNull()
    .default("normal"),
  orderType: mysqlEnum("wo_order_type", ["standard", "custom"])
    .notNull()
    .default("standard"),
  totalDoors: int("total_doors").notNull().default(1),
  totalValue: float("total_value").notNull().default(0),
  doors: json("doors"), // DoorItem[]
  deptTasks: json("dept_tasks"), // DeptTask[]
  supervisorName: varchar("supervisor_name", { length: 255 })
    .notNull()
    .default(""),
  notes: text("notes"),
  progressPercent: int("progress_percent").notNull().default(0),
  cancelReason: text("cancel_reason"),
  cancelledBy: varchar("cancelled_by", { length: 255 }),
  cancelledAt: bigint("cancelled_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => ({
  orderIdIdx: index("order_id_idx").on(table.orderId),
}));

export type WorkOrderRow = typeof workOrders.$inferSelect;
export type NewWorkOrder = typeof workOrders.$inferInsert;

// ── Decision Log ─────────────────────────────────────────────────────────────
export const decisionLog = mysqlTable("decision_log", {
  id: int("id").primaryKey().autoincrement(),
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  distributor: varchar("distributor", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  city: varchar("city", { length: 100 }).notNull().default(""),
  orderTotal: int("order_total").notNull().default(0),
  decision: mysqlEnum("dl_decision", [
    "approved",
    "rejected",
    "revision_requested",
  ]).notNull(),
  reason: text("reason"),
  decidedBy: varchar("decided_by", { length: 255 }).notNull(),
  decidedAt: varchar("decided_at", { length: 30 }).notNull(),
  responseTime: int("response_time").notNull().default(0),
  items: json("items"),
  notified: boolean("notified").notNull().default(false),
  followUp: text("follow_up"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type DecisionLogRow = typeof decisionLog.$inferSelect;
export type NewDecisionLog = typeof decisionLog.$inferInsert;

// ── Post-Order Reviews ───────────────────────────────────────────────────────
export const postOrderReviews = mysqlTable("post_order_reviews", {
  id: int("id").primaryKey().autoincrement(),
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  distributorName: varchar("distributor_name", { length: 255 }).notNull(),
  totalDoors: int("total_doors").notNull().default(1),
  completedAt: varchar("completed_at", { length: 20 }).notNull(),
  plannedDays: int("planned_days").notNull().default(0),
  actualDays: int("actual_days").notNull().default(0),
  clientRating: int("client_rating").notNull().default(0),
  clientFeedback: text("client_feedback").notNull(),
  errors: json("errors"),
  improvements: json("improvements"),
  status: mysqlEnum("por_status", ["pending_review", "reviewed", "closed"])
    .notNull()
    .default("pending_review"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type PostOrderReviewRow = typeof postOrderReviews.$inferSelect;
export type NewPostOrderReview = typeof postOrderReviews.$inferInsert;

// ── Daily Summary Recipients ──────────────────────────────────────────────────
export const summaryRecipients = mysqlTable("summary_recipients", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 255 }).notNull().default(""),
  phone: varchar("phone", { length: 50 }).notNull().default(""),
  email: varchar("email", { length: 255 }).notNull().default(""),
  channels: json("channels").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type SummaryRecipientRow = typeof summaryRecipients.$inferSelect;
export type NewSummaryRecipient = typeof summaryRecipients.$inferInsert;

// ── Daily Summary Schedule (single config row) ────────────────────────────────
export const summarySchedule = mysqlTable("summary_schedule", {
  id: int("id").primaryKey().autoincrement(),
  sendTime: varchar("send_time", { length: 5 }).notNull().default("20:00"),
  activeDays: json("active_days").notNull(),
  enabledSections: json("enabled_sections").notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type SummaryScheduleRow = typeof summarySchedule.$inferSelect;

// ── Daily Summary Send History ────────────────────────────────────────────────
export const summarySendHistory = mysqlTable("summary_send_history", {
  id: int("id").primaryKey().autoincrement(),
  sentAt: bigint("sent_at", { mode: "number" }).notNull(),
  recipientsCount: int("recipients_count").notNull().default(0),
  channels: varchar("channels", { length: 100 }).notNull().default(""),
  status: mysqlEnum("summary_status", [
    "success",
    "partial",
    "skipped",
    "failed",
  ])
    .notNull()
    .default("success"),
  snapshotStats: json("snapshot_stats"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});
export type SummarySendHistoryRow = typeof summarySendHistory.$inferSelect;

// ══════════════════════════════════════════════════════════════════════════════
// ACCOUNTING MODULE — النظام المحاسبي
// ══════════════════════════════════════════════════════════════════════════════

// ── Chart of Accounts — دليل الحسابات ────────────────────────────────────────
export const accounts = mysqlTable("accounts", {
  id: int("id").primaryKey().autoincrement(),
  code: varchar("code", { length: 10 }).notNull().unique(), // e.g. "1120"
  name: varchar("name", { length: 255 }).notNull(), // Arabic
  nameEn: varchar("name_en", { length: 255 }).notNull().default(""),
  type: mysqlEnum("account_type", [
    "asset",
    "liability",
    "equity",
    "revenue",
    "expense",
  ]).notNull(),
  normalBalance: mysqlEnum("normal_balance", ["debit", "credit"]).notNull(),
  parentCode: varchar("parent_code", { length: 10 }),
  isSystem: boolean("is_system").notNull().default(false), // cannot be deleted
  isActive: boolean("is_active").notNull().default(true),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

// ── Journal Entries — القيود اليومية (header) ─────────────────────────────────
export const journalEntries = mysqlTable("journal_entries", {
  id: int("id").primaryKey().autoincrement(),
  entryNumber: varchar("entry_number", { length: 30 }).notNull().unique(), // JE-2026-000001
  entryDate: varchar("entry_date", { length: 10 }).notNull(), // YYYY-MM-DD
  description: varchar("description", { length: 500 }).notNull(),
  sourceType: mysqlEnum("je_source_type", [
    "invoice",
    "payment",
    "manual",
    "vat_settlement",
  ])
    .notNull()
    .default("manual"),
  sourceId: int("source_id"), // references tax_invoices.id or other
  totalDebitHalala: int("total_debit_halala").notNull().default(0),
  totalCreditHalala: int("total_credit_halala").notNull().default(0),
  isPosted: boolean("is_posted").notNull().default(true),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;

// ── Journal Lines — بنود القيد (detail / double-entry) ───────────────────────
export const journalLines = mysqlTable("journal_lines", {
  id: int("id").primaryKey().autoincrement(),
  journalEntryId: int("journal_entry_id").notNull(),
  accountCode: varchar("account_code", { length: 10 }).notNull(),
  accountName: varchar("account_name", { length: 255 }).notNull(), // denormalised
  debitHalala: int("debit_halala").notNull().default(0),
  creditHalala: int("credit_halala").notNull().default(0),
  description: varchar("line_description", { length: 500 }).default(""),
  sequence: int("sequence").notNull().default(1),
});
export type JournalLine = typeof journalLines.$inferSelect;
export type NewJournalLine = typeof journalLines.$inferInsert;

// ── Purchase Invoices — فواتير المشتريات (ضريبة المدخلات) ─────────────────────
export const purchaseInvoices = mysqlTable("purchase_invoices", {
  id: int("id").primaryKey().autoincrement(),
  invoiceNumber: varchar("invoice_number", { length: 100 }).notNull(), // رقم فاتورة المورّد
  supplierName: varchar("supplier_name", { length: 255 }).notNull(),
  supplierVatNumber: varchar("supplier_vat_number", { length: 15 }),
  issueDate: varchar("issue_date", { length: 10 }).notNull(), // YYYY-MM-DD
  subtotalHalala: int("subtotal_halala").notNull().default(0),
  vatAmountHalala: int("vat_amount_halala").notNull().default(0),
  totalHalala: int("total_halala").notNull().default(0),
  category: mysqlEnum("purchase_category", [
    "materials",
    "equipment",
    "services",
    "utilities",
    "other",
  ])
    .notNull()
    .default("materials"),
  description: varchar("purchase_desc", { length: 500 }).notNull().default(""),
  paymentStatus: mysqlEnum("purchase_pay_status", ["unpaid", "paid"])
    .notNull()
    .default("unpaid"),
  notes: text("purchase_notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type PurchaseInvoice = typeof purchaseInvoices.$inferSelect;
export type NewPurchaseInvoice = typeof purchaseInvoices.$inferInsert;

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTS — كتالوج المنتجات
// ══════════════════════════════════════════════════════════════════════════════
export const products = mysqlTable("products", {
  id: int("id").primaryKey().autoincrement(),
  sku: varchar("sku", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(), // Arabic name
  nameEn: varchar("name_en", { length: 255 }).notNull().default(""),
  category: varchar("category", { length: 50 }).notNull(), // interior/exterior/fire/acoustic/accessories
  subcategory: varchar("subcategory", { length: 50 }).notNull().default(""),
  woodType: varchar("wood_type", { length: 50 }).notNull().default("oak"),
  status: mysqlEnum("product_status", ["active", "archived"])
    .notNull()
    .default("active"),

  // ── Pricing (SAR, integers) ──
  basePrice: int("base_price").notNull().default(0), // retail SAR
  distributorPrice: int("distributor_price").notNull().default(0), // distributor SAR
  tiers: json("tiers"), // [{min, max, price, label}]

  // ── Media ──
  image: longtext("image").notNull(),
  images: json("images"), // string[]

  // ── Admin catalog fields ──
  sizes: json("sizes"), // string[]
  colors: json("colors"), // string[]
  stock: int("stock").notNull().default(0),

  // ── Public display ──
  badge: varchar("badge", { length: 100 }).default(""),
  badgeColor: varchar("badge_color", { length: 50 }).default(""),
  features: json("features"), // string[]
  description: text("description").notNull().default(""),
  specs: json("specs"), // [{label, value}]
  dimensions: varchar("dimensions", { length: 100 }).default(""),
  rating: float("rating").notNull().default(0),
  reviewCount: int("review_count").notNull().default(0),
  inStock: boolean("in_stock").notNull().default(true),
  isNew: boolean("is_new").notNull().default(false),
  isBestseller: boolean("is_bestseller").notNull().default(false),
  isCertified: boolean("is_certified").notNull().default(false),
  tags: json("tags"), // string[]
  weight: varchar("weight", { length: 50 }).default(""),
  warranty: varchar("warranty", { length: 100 }).default(""),
  options: json("options"), // ProductOption[] for door configurator

  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type ProductRow = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

// ── Production Lines — خطوط الإنتاج ─────────────────────────────────────────
// إعدادات الطاقة الإنتاجية لكل خط في المصنع
export const productionLines = mysqlTable("production_lines", {
  id: int("id").primaryKey().autoincrement(),
  lineId: varchar("line_id", { length: 50 }).notNull().unique(), // door_line, frame_line, accessories, qc, packing
  nameAr: varchar("name_ar", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 100 }).notNull().default(""),
  dailyCapacity: int("daily_capacity").notNull().default(20), // وحدات/يوم
  workDaysPerWeek: int("work_days_per_week").notNull().default(6),
  shiftHours: int("shift_hours").notNull().default(8),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export type ProductionLine = typeof productionLines.$inferSelect;
export type NewProductionLine = typeof productionLines.$inferInsert;

// ── Bill of Materials (BOM) — قائمة المواد ──────────────────────────────────────
export const bom = mysqlTable("bom", {
  id: int("id").primaryKey().autoincrement(),
  productId: int("product_id").notNull(),                              // references products.id
  version: int("version").notNull().default(1),
  description: text("description"),
  totalCost: float("total_cost").notNull().default(0),                 // Total cost in SAR
  laborCost: float("labor_cost").notNull().default(0),                 // Labor cost in SAR
  wastagePercentage: float("wastage_percentage").notNull().default(5), // Wastage percentage (e.g. 5 for 5%)
  status: mysqlEnum("bom_status", ["draft", "active", "archived"]).notNull().default("draft"),
  createdBy: int("created_by"),                                        // creator user ID (admin)
  approvedBy: int("approved_by"),                                      // approver user ID (admin)
  approvedAt: bigint("approved_at", { mode: "number" }),
  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type BOMRow = typeof bom.$inferSelect;
export type NewBOM = typeof bom.$inferInsert;

export const bomItems = mysqlTable("bom_items", {
  id: int("id").primaryKey().autoincrement(),
  bomId: int("bom_id").notNull(),                                      // references bom.id
  itemId: int("item_id").notNull(),                                    // references inventory_items.id
  quantity: float("quantity").notNull(),                               // Required quantity of the component
  unitCost: float("unit_cost").notNull(),                              // Component cost per unit in SAR at the time of creation
  totalCost: float("total_cost").notNull(),                             // quantity * unitCost
  notes: text("notes"),
  lineNumber: int("line_number"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type BOMItemRow = typeof bomItems.$inferSelect;
export type NewBOMItem = typeof bomItems.$inferInsert;

export const bomHistory = mysqlTable("bom_history", {
  id: int("id").primaryKey().autoincrement(),
  bomId: int("bom_id").notNull(),                                      // references bom.id
  changeType: mysqlEnum("bom_change_type", ["created", "updated", "approved", "archived"]).notNull(),
  changedBy: int("changed_by").notNull(),                              // user ID (admin)
  oldData: json("old_data"),
  newData: json("new_data"),
  changeReason: text("change_reason"),
  changedAt: bigint("changed_at", { mode: "number" }).notNull(),
});

export type BOMHistoryRow = typeof bomHistory.$inferSelect;
export type NewBOMHistory = typeof bomHistory.$inferInsert;

