var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/env.ts
import { z } from "zod/v4";
var envSchema = z.object({
  // ── Required ──────────────────────────────────────────────────────────────
  DATABASE_URL: z.string().min(1, "DATABASE_URL \u0645\u0637\u0644\u0648\u0628 \u2014 \u0645\u062B\u0627\u0644: mysql://user:pass@host:3306/dbname"),
  // ── Admin auth: يجب وجود واحد على الأقل ──────────────────────────────────
  ADMIN_PASSWORD_HASH: z.string().optional(),
  ADMIN_INTERNAL_KEY: z.string().optional(),
  // ── Optional: SMTP ────────────────────────────────────────────────────────
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional().refine((v) => !v || !isNaN(Number(v)), {
    message: "SMTP_PORT \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0631\u0642\u0645\u0627\u064B"
  }),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  // ── Optional: Manus Forge (notifications + LLM) ───────────────────────────
  BUILT_IN_FORGE_API_URL: z.url().optional().or(z.literal("")).or(z.undefined()),
  BUILT_IN_FORGE_API_KEY: z.string().optional(),
  OWNER_OPEN_ID: z.string().optional(),
  OWNER_NAME: z.string().optional(),
  // ── Optional: CORS ────────────────────────────────────────────────────────
  ALLOWED_ORIGIN: z.string().optional(),
  // ── Optional: Runtime ─────────────────────────────────────────────────────
  PORT: z.string().optional().refine((v) => !v || !isNaN(Number(v)), {
    message: "PORT \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0631\u0642\u0645\u0627\u064B"
  }),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development")
});
function validate() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  \u2022 ${i.path.join(".")}: ${i.message}`).join("\n");
    console.error(`
\u274C [env] \u0645\u062A\u063A\u064A\u0631\u0627\u062A \u0627\u0644\u0628\u064A\u0626\u0629 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629:
${issues}
`);
    process.exit(1);
  }
  const env2 = result.data;
  if (!env2.ADMIN_PASSWORD_HASH && !env2.ADMIN_INTERNAL_KEY) {
    console.error(
      `
\u274C [env] \u064A\u062C\u0628 \u062A\u0639\u064A\u064A\u0646 ADMIN_PASSWORD_HASH (bcrypt) \u0623\u0648 ADMIN_INTERNAL_KEY
  \u0644\u062A\u0648\u0644\u064A\u062F hash: node -e "require('bcryptjs').hash('\u0643\u0644\u0645\u0629_\u0627\u0644\u0645\u0631\u0648\u0631',12).then(h=>console.log(h))"
`
    );
    process.exit(1);
  }
  if (!env2.ADMIN_PASSWORD_HASH && env2.ADMIN_INTERNAL_KEY) {
    console.warn(
      "\u26A0\uFE0F  [env] ADMIN_INTERNAL_KEY \u0645\u064F\u0633\u062A\u062E\u062F\u0645 \u0643\u0646\u0635 \u0639\u0627\u062F\u064A. \u064A\u064F\u0646\u0635\u062D \u0628\u0627\u0633\u062A\u0628\u062F\u0627\u0644\u0647 \u0628\u0640 ADMIN_PASSWORD_HASH (bcrypt) \u0644\u0644\u0623\u0645\u0627\u0646 \u0627\u0644\u0623\u0645\u062B\u0644."
    );
  }
  const smtpFields = [env2.SMTP_HOST, env2.SMTP_USER, env2.SMTP_PASS];
  const smtpFilled = smtpFields.filter(Boolean).length;
  if (smtpFilled > 0 && smtpFilled < 3) {
    console.warn(
      "\u26A0\uFE0F  [env] \u0625\u0639\u062F\u0627\u062F\u0627\u062A SMTP \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629 \u2014 \u064A\u062C\u0628 \u062A\u0639\u064A\u064A\u0646 SMTP_HOST \u0648 SMTP_USER \u0648 SMTP_PASS \u0645\u0639\u0627\u064B \u0644\u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0628\u0631\u064A\u062F."
    );
  }
  if (env2.BUILT_IN_FORGE_API_URL && !env2.BUILT_IN_FORGE_API_KEY || !env2.BUILT_IN_FORGE_API_URL && env2.BUILT_IN_FORGE_API_KEY) {
    console.warn(
      "\u26A0\uFE0F  [env] BUILT_IN_FORGE_API_URL \u0648 BUILT_IN_FORGE_API_KEY \u064A\u062C\u0628 \u062A\u0639\u064A\u064A\u0646\u0647\u0645\u0627 \u0645\u0639\u0627\u064B."
    );
  }
  if (env2.NODE_ENV === "production" && !env2.ALLOWED_ORIGIN) {
    console.warn(
      "\u26A0\uFE0F  [env] ALLOWED_ORIGIN \u063A\u064A\u0631 \u0645\u064F\u0639\u064A\u064E\u0651\u0646 \u0641\u064A \u0628\u064A\u0626\u0629 \u0627\u0644\u0625\u0646\u062A\u0627\u062C \u2014 CORS \u0645\u0641\u062A\u0648\u062D \u0644\u062C\u0645\u064A\u0639 \u0627\u0644\u0623\u0635\u0648\u0644."
    );
  }
  return env2;
}
var env = validate();

// server/index.ts
import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

// server/routers.ts
import { TRPCError as TRPCError13 } from "@trpc/server";
import { z as z26 } from "zod/v4";

// server/db.ts
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  accounts: () => accounts,
  adminSessions: () => adminSessions,
  complaintMessages: () => complaintMessages,
  complaints: () => complaints,
  decisionLog: () => decisionLog,
  distributorOrders: () => distributorOrders,
  distributorPaymentMethodEnum: () => distributorPaymentMethodEnum,
  distributorPaymentStatusEnum: () => distributorPaymentStatusEnum,
  distributorPayments: () => distributorPayments,
  distributorSessions: () => distributorSessions,
  distributors: () => distributors,
  doorOrders: () => doorOrders,
  inventoryItems: () => inventoryItems,
  inventoryTransactions: () => inventoryTransactions,
  journalEntries: () => journalEntries,
  journalLines: () => journalLines,
  packingOrders: () => packingOrders,
  postOrderReviews: () => postOrderReviews,
  productOptions: () => productOptions,
  productionLines: () => productionLines,
  products: () => products,
  purchaseInvoices: () => purchaseInvoices,
  purchaseOrders: () => purchaseOrders,
  qcInspections: () => qcInspections,
  rfqComments: () => rfqComments,
  rfqInvitations: () => rfqInvitations,
  rfqs: () => rfqs,
  summaryRecipients: () => summaryRecipients,
  summarySchedule: () => summarySchedule,
  summarySendHistory: () => summarySendHistory,
  supplierQuotes: () => supplierQuotes,
  supplierSessions: () => supplierSessions,
  suppliers: () => suppliers,
  taxInvoices: () => taxInvoices,
  userSessions: () => userSessions,
  users: () => users,
  workOrders: () => workOrders,
  zatcaSettings: () => zatcaSettings
});
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
  timestamp
} from "drizzle-orm/mysql-core";
var doorOrders = mysqlTable("door_orders", {
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
    "cancelled"
  ]).notNull().default("new"),
  // ── حقول سير العمل التفصيلية (15 مرحلة) ──
  workflowStage: varchar("workflow_stage", { length: 50 }).default("po_review"),
  workflowStagesData: json("workflow_stages_data"),
  // Record<WorkflowStage, {status, completedAt?, notes?, assignee?}>
  priority: mysqlEnum("priority", ["normal", "urgent", "vip"]).default(
    "normal"
  ),
  expectedDelivery: bigint("expected_delivery", { mode: "number" }),
  totalDoors: int("total_doors").default(1),
  paymentStatus: mysqlEnum("payment_status_order", [
    "unpaid",
    "partial",
    "paid"
  ]).notNull().default("unpaid"),
  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull()
});
var suppliers = mysqlTable("suppliers", {
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
  categories: json("categories"),
  // ["wood", "hardware", "glass", ...]
  // بيانات الحساب
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["pending", "active", "suspended"]).notNull().default("pending"),
  // تقييم المورد (يُحسب تلقائياً)
  rating: float("rating").default(0),
  totalQuotes: int("total_quotes").default(0),
  wonQuotes: int("won_quotes").default(0),
  // ملاحظات الإدارة
  adminNotes: text("admin_notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull()
});
var rfqs = mysqlTable("rfqs", {
  id: int("id").primaryKey().autoincrement(),
  rfqNumber: varchar("rfq_number", { length: 50 }).notNull().unique(),
  // RFQ-2024-001
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  // المواد/الخدمات المطلوبة (JSON array)
  items: json("items").notNull(),
  // [{ name, description, qty, unit, specs }]
  // شروط العرض
  currency: varchar("currency", { length: 10 }).default("SAR"),
  deliveryLocation: varchar("delivery_location", { length: 255 }),
  deliveryDays: int("delivery_days"),
  // المدة المطلوبة بالأيام
  paymentTerms: varchar("payment_terms", { length: 255 }),
  // "30 days net"
  warrantyMonths: int("warranty_months"),
  // مواعيد
  submissionDeadline: bigint("submission_deadline", {
    mode: "number"
  }).notNull(),
  // حالة الطلب
  status: mysqlEnum("status", [
    "draft",
    // مسودة
    "published",
    // منشور - تم إرسال الدعوات
    "closed",
    // مغلق - انتهى موعد التقديم
    "evaluated",
    // تم التقييم
    "awarded",
    // تم الترسية
    "cancelled"
    // ملغي
  ]).notNull().default("draft"),
  // نتيجة الترسية
  awardedSupplierId: int("awarded_supplier_id"),
  awardedAt: bigint("awarded_at", { mode: "number" }),
  awardNotes: text("award_notes"),
  // تقييم الذكاء الاصطناعي (JSON)
  aiEvaluation: json("ai_evaluation"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull()
});
var rfqInvitations = mysqlTable("rfq_invitations", {
  id: int("id").primaryKey().autoincrement(),
  rfqId: int("rfq_id").notNull(),
  supplierId: int("supplier_id").notNull(),
  status: mysqlEnum("status", [
    "sent",
    // تم الإرسال
    "viewed",
    // شاهد المورد الدعوة
    "accepted",
    // قبل المشاركة
    "declined",
    // رفض المشاركة
    "submitted"
    // قدّم عرضاً
  ]).notNull().default("sent"),
  sentAt: bigint("sent_at", { mode: "number" }).notNull(),
  viewedAt: bigint("viewed_at", { mode: "number" }),
  respondedAt: bigint("responded_at", { mode: "number" }),
  declineReason: text("decline_reason")
});
var supplierQuotes = mysqlTable("supplier_quotes", {
  id: int("id").primaryKey().autoincrement(),
  rfqId: int("rfq_id").notNull(),
  supplierId: int("supplier_id").notNull(),
  invitationId: int("invitation_id"),
  // بيانات العرض
  quoteNumber: varchar("quote_number", { length: 50 }),
  totalPrice: float("total_price").notNull(),
  currency: varchar("currency", { length: 10 }).default("SAR"),
  // بنود العرض (JSON - مطابقة لـ rfq.items مع الأسعار)
  lineItems: json("line_items").notNull(),
  // [{ itemIndex, unitPrice, totalPrice, notes }]
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
    "submitted",
    // مقدم
    "under_review",
    // قيد المراجعة
    "shortlisted",
    // في القائمة المختصرة
    "awarded",
    // فاز بالترسية
    "rejected"
    // مرفوض
  ]).notNull().default("submitted"),
  // تقييم الذكاء الاصطناعي
  aiScore: float("ai_score"),
  // 0-100
  aiScoreBreakdown: json("ai_score_breakdown"),
  // { price, delivery, payment, warranty, risk, history }
  aiRecommendation: text("ai_recommendation"),
  // تقييم يدوي من الإدارة
  adminScore: float("admin_score"),
  adminNotes: text("admin_notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull()
});
var purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").primaryKey().autoincrement(),
  poNumber: varchar("po_number", { length: 50 }).notNull().unique(),
  // PO-2024-001
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
    "issued",
    // صادر
    "confirmed",
    // مؤكد من المورد
    "in_progress",
    // جاري التنفيذ
    "delivered",
    // تم التسليم
    "invoiced",
    // صدرت فاتورة
    "paid",
    // تم الدفع
    "cancelled"
    // ملغي
  ]).notNull().default("issued"),
  notes: text("notes"),
  issuedAt: bigint("issued_at", { mode: "number" }).notNull(),
  confirmedAt: bigint("confirmed_at", { mode: "number" }),
  deliveredAt: bigint("delivered_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull()
});
var supplierSessions = mysqlTable("supplier_sessions", {
  id: int("id").primaryKey().autoincrement(),
  supplierId: int("supplier_id").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull()
});
var rfqComments = mysqlTable("rfq_comments", {
  id: int("id").primaryKey().autoincrement(),
  rfqId: int("rfq_id").notNull(),
  authorType: mysqlEnum("author_type", ["admin", "supplier"]).notNull(),
  authorId: int("author_id").notNull(),
  // supplier_id أو 0 للإدارة
  authorName: varchar("author_name", { length: 100 }).notNull(),
  content: text("content").notNull(),
  isInternal: tinyint("is_internal").notNull().default(0),
  // 1 = داخلي للإدارة فقط
  parentId: int("parent_id"),
  // للردود المتداخلة
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull()
});
var productOptions = mysqlTable("product_options", {
  id: int("id").autoincrement().primaryKey(),
  sectionsJson: text("sections_json").notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  updatedBy: varchar("updated_by", { length: 100 }).default("admin")
});
var distributorOrders = mysqlTable("distributor_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  distributorId: varchar("distributor_id", { length: 100 }).notNull(),
  distributorName: varchar("distributor_name", { length: 200 }).notNull(),
  distributorCompany: varchar("distributor_company", { length: 200 }),
  orderType: mysqlEnum("order_type", [
    "purchase_order",
    "rfq",
    "sample_request"
  ]).notNull().default("purchase_order"),
  items: text("items").notNull(),
  // JSON array of configured items
  totalAmount: float("total_amount").default(0),
  status: mysqlEnum("status", [
    "draft",
    "pending",
    "confirmed",
    "manufacturing",
    "shipped",
    "delivered",
    "cancelled"
  ]).notNull().default("pending"),
  paymentStatus: mysqlEnum("payment_status", ["unpaid", "partial", "paid"]).notNull().default("unpaid"),
  notes: text("notes"),
  source: mysqlEnum("source", ["manual", "excel_upload", "api"]).notNull().default("manual"),
  excelFileName: varchar("excel_file_name", { length: 255 }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull()
});
var distributorPaymentMethodEnum = mysqlEnum("method", [
  "cash",
  "bank_transfer",
  "cheque",
  "card",
  "other"
]);
var distributorPaymentStatusEnum = mysqlEnum("status", [
  "confirmed",
  "pending",
  "cancelled"
]);
var distributorPayments = mysqlTable("distributor_payments", {
  id: int("id").primaryKey().autoincrement(),
  distributorId: int("distributor_id").notNull(),
  orderNumber: varchar("order_number", { length: 50 }),
  amount: float("amount").notNull(),
  method: mysqlEnum("method", [
    "cash",
    "bank_transfer",
    "cheque",
    "card",
    "other"
  ]).notNull().default("bank_transfer"),
  reference: varchar("reference", { length: 191 }),
  note: text("note"),
  paymentDate: timestamp("payment_date").notNull().defaultNow(),
  status: mysqlEnum("status", [
    "confirmed",
    "pending",
    "cancelled"
  ]).notNull().default("confirmed"),
  journalEntryId: int("journal_entry_id"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var taxInvoices = mysqlTable("tax_invoices", {
  id: int("id").autoincrement().primaryKey(),
  // معرّفات الفاتورة
  uuid: varchar("uuid", { length: 36 }).notNull().unique(),
  // UUID v4
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  // INV-2024-000001
  invoiceType: mysqlEnum("invoice_type", ["standard", "simplified"]).notNull().default("simplified"),
  // BT-3: 388 = Tax Invoice (all types), 381 = Credit Note, 383 = Debit Note
  invoiceTypeCode: varchar("invoice_type_code", { length: 10 }).notNull().default("388"),
  // KSA-2: 010000 = Standard (B2B), 020000 = Simplified (B2C)
  invoiceSubTypeCode: varchar("invoice_sub_type_code", { length: 10 }).notNull().default("020000"),
  // ZATCA Phase 2: hash of the previous invoice (chain integrity)
  previousInvoiceHash: varchar("previous_invoice_hash", { length: 64 }),
  previousInvoiceNumber: varchar("previous_invoice_number", { length: 50 }),
  // تاريخ ووقت الإصدار (UTC)
  issueDate: varchar("issue_date", { length: 10 }).notNull(),
  // YYYY-MM-DD
  issueTime: varchar("issue_time", { length: 8 }).notNull(),
  // HH:MM:SS
  // بيانات البائع (سنديان)
  sellerName: varchar("seller_name", { length: 255 }).notNull(),
  sellerVatNumber: varchar("seller_vat_number", { length: 15 }).notNull(),
  sellerCrNumber: varchar("seller_cr_number", { length: 20 }),
  sellerAddress: text("seller_address"),
  sellerCity: varchar("seller_city", { length: 100 }),
  sellerPostalCode: varchar("seller_postal_code", { length: 10 }),
  // بيانات المشتري
  buyerName: varchar("buyer_name", { length: 255 }).notNull(),
  buyerVatNumber: varchar("buyer_vat_number", { length: 15 }),
  // إلزامي للفاتورة القياسية
  buyerCrNumber: varchar("buyer_cr_number", { length: 20 }),
  buyerAddress: text("buyer_address"),
  buyerPhone: varchar("buyer_phone", { length: 50 }),
  buyerEmail: varchar("buyer_email", { length: 255 }),
  // بنود الفاتورة (JSON)
  lineItems: json("line_items").notNull(),
  // [{ description, qty, unitPrice, vatRate, vatAmount, lineTotal }]
  // الإجماليات (بالهللة - أعداد صحيحة لتفادي أخطاء الفاصلة العشرية)
  subtotalHalala: int("subtotal_halala").notNull().default(0),
  // المبلغ بدون ضريبة
  vatAmountHalala: int("vat_amount_halala").notNull().default(0),
  // مبلغ الضريبة
  totalHalala: int("total_halala").notNull().default(0),
  // الإجمالي الكلي
  vatRate: float("vat_rate").notNull().default(15),
  // نسبة الضريبة %
  // QR Code (Base64 TLV encoded)
  qrCodeData: text("qr_code_data"),
  // Base64 TLV string
  invoiceHash: varchar("invoice_hash", { length: 64 }),
  // SHA-256 hash
  // حالة الفاتورة
  status: mysqlEnum("status", ["draft", "issued", "paid", "cancelled"]).notNull().default("draft"),
  paymentStatus: mysqlEnum("payment_status", ["unpaid", "partial", "paid"]).notNull().default("unpaid"),
  // مرجع الطلب الأصلي (اختياري)
  sourceType: mysqlEnum("source_type", [
    "door_order",
    "distributor_order",
    "manual"
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
    "error"
  ]).default("pending"),
  zatcaSubmittedAt: bigint("zatca_submitted_at", { mode: "number" }),
  // timestamp الإرسال
  zatcaResponseCode: varchar("zatca_response_code", { length: 10 }),
  // HTTP status: 200, 400...
  zatcaWarnings: text("zatca_warnings"),
  // JSON array of warning strings from ZATCA
  zatcaInvoiceXml: longtext("zatca_invoice_xml"),
  // UBL 2.1 XML المُرسل للأرشفة
  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull()
});
var zatcaSettings = mysqlTable("zatca_settings", {
  id: int("id").autoincrement().primaryKey(),
  sellerName: varchar("seller_name", { length: 255 }).notNull().default("\u0633\u0646\u062F\u064A\u0627\u0646 \u0644\u0644\u0623\u0628\u0648\u0627\u0628 \u0627\u0644\u062E\u0634\u0628\u064A\u0629"),
  sellerNameEn: varchar("seller_name_en", { length: 255 }).default(
    "Sindian Wooden Doors"
  ),
  vatNumber: varchar("vat_number", { length: 15 }).notNull().default("300000000000003"),
  crNumber: varchar("cr_number", { length: 20 }).default("1234567890"),
  address: text("address"),
  city: varchar("city", { length: 100 }).default("\u0627\u0644\u0631\u064A\u0627\u0636"),
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
    "production"
  ]).default("sandbox"),
  zatcaCsid: text("zatca_csid"),
  // Cryptographic Stamp ID (CSID) المُصدر من ZATCA
  zatcaCsidSecret: text("zatca_csid_secret"),
  // CSID Secret / Private Key
  updatedAt: bigint("updated_at", { mode: "number" }).notNull()
});
var users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 50 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  wishlistIds: json("wishlist_ids").$type().default([]),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull()
});
var userSessions = mysqlTable("user_sessions", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull()
});
var adminSessions = mysqlTable("admin_sessions", {
  id: int("id").primaryKey().autoincrement(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull()
});
var inventoryItems = mysqlTable("inventory_items", {
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
    "chemical"
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
  lastReceived: varchar("last_received", { length: 10 }),
  // YYYY-MM-DD
  lastConsumed: varchar("last_consumed", { length: 10 }),
  // YYYY-MM-DD
  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull()
});
var inventoryTransactions = mysqlTable("inventory_transactions", {
  id: int("id").primaryKey().autoincrement(),
  itemId: int("item_id").notNull(),
  type: mysqlEnum("type", [
    "receive",
    "consume",
    "adjust",
    "return",
    "transfer"
  ]).notNull(),
  quantity: int("quantity").notNull(),
  balanceBefore: int("balance_before").notNull(),
  balanceAfter: int("balance_after").notNull(),
  reference: varchar("reference", { length: 255 }).notNull().default(""),
  note: text("note"),
  performedBy: varchar("performed_by", { length: 255 }).notNull().default(""),
  date: varchar("date", { length: 10 }).notNull(),
  // YYYY-MM-DD
  createdAt: bigint("created_at", { mode: "number" }).notNull()
});
var distributors = mysqlTable("distributors", {
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
    "rejected"
  ]).notNull().default("pending"),
  tier: mysqlEnum("tier", ["bronze", "silver", "gold", "platinum"]).notNull().default("bronze"),
  joinDate: varchar("join_date", { length: 10 }).notNull(),
  contractStart: varchar("contract_start", { length: 10 }),
  contractEnd: varchar("contract_end", { length: 10 }),
  creditLimit: int("credit_limit").default(5e4),
  discountRate: int("discount_rate").default(5),
  totalOrders: int("total_orders").notNull().default(0),
  totalRevenue: float("total_revenue").notNull().default(0),
  avgRating: float("avg_rating").notNull().default(0),
  pendingOrders: int("pending_orders").notNull().default(0),
  openComplaints: int("open_complaints").notNull().default(0),
  notes: text("notes"),
  adminNotes: text("admin_notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull()
});
var distributorSessions = mysqlTable("distributor_sessions", {
  id: int("id").primaryKey().autoincrement(),
  distributorId: int("distributor_id").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull()
});
var complaints = mysqlTable("complaints", {
  id: int("id").primaryKey().autoincrement(),
  ticketNumber: varchar("ticket_number", { length: 50 }).notNull().unique(),
  // TKT-2026-0001
  distributorId: int("distributor_id"),
  // null = ???? ?????
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
    "other"
  ]).notNull(),
  status: mysqlEnum("complaint_status", [
    "open",
    "under_review",
    "resolved",
    "rejected",
    "return_pending"
  ]).notNull().default("open"),
  description: text("description").notNull(),
  images: json("images").$type().notNull().default([]),
  satisfactionRating: int("satisfaction_rating"),
  resolvedAt: bigint("resolved_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull()
});
var complaintMessages = mysqlTable("complaint_messages", {
  id: int("id").primaryKey().autoincrement(),
  complaintId: int("complaint_id").notNull(),
  from: mysqlEnum("msg_from", ["admin", "distributor"]).notNull(),
  text: text("text").notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  // YYYY-MM-DD
  createdAt: bigint("created_at", { mode: "number" }).notNull()
});
var qcInspections = mysqlTable("qc_inspections", {
  id: int("id").primaryKey().autoincrement(),
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  orderSource: mysqlEnum("qc_order_source", [
    "door_order",
    "distributor_order",
    "manual"
  ]).notNull().default("manual"),
  sourceId: int("source_id"),
  distributorName: varchar("distributor_name", { length: 255 }).notNull(),
  totalDoors: int("total_doors").notNull().default(1),
  qcType: mysqlEnum("qc_type", ["incoming", "final", "po_matching"]).notNull(),
  result: mysqlEnum("qc_result", ["pass", "fail", "pending"]).notNull().default("pending"),
  inspector: varchar("inspector", { length: 255 }).notNull().default(""),
  checkItems: json("check_items"),
  // { color: true/false/null, ... }
  issues: json("issues"),
  // string[]
  photos: int("photos").notNull().default(0),
  notes: text("notes"),
  inspectedAt: bigint("inspected_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull()
});
var packingOrders = mysqlTable("packing_orders", {
  id: int("id").primaryKey().autoincrement(),
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  distributorName: varchar("distributor_name", { length: 255 }).notNull(),
  totalDoors: int("total_doors").notNull().default(1),
  packingType: varchar("packing_type", { length: 50 }).notNull().default("\u0645\u062D\u0644\u064A"),
  packingMethod: varchar("packing_method", { length: 50 }).notNull().default("\u0641\u0631\u062F\u064A"),
  packingStatus: mysqlEnum("packing_status", ["pending", "in_progress", "done"]).notNull().default("pending"),
  deliveryDate: varchar("delivery_date", { length: 30 }).notNull().default(""),
  deliveryStatus: mysqlEnum("delivery_status", [
    "pending",
    "in_progress",
    "done"
  ]).notNull().default("pending"),
  accountingStatus: mysqlEnum("accounting_status", [
    "pending",
    "in_progress",
    "done"
  ]).notNull().default("pending"),
  totalValue: int("total_value").notNull().default(0),
  paidAmount: int("paid_amount").notNull().default(0),
  doors: json("doors"),
  // { code, dir, room, packed }[]
  documents: json("documents"),
  // { packingList, invoice, photos, certificate }
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull()
});
var workOrders = mysqlTable("work_orders", {
  id: int("id").primaryKey().autoincrement(),
  woNumber: varchar("wo_number", { length: 50 }).notNull().unique(),
  poNumber: varchar("po_number", { length: 50 }).notNull(),
  distributorName: varchar("distributor_name", { length: 255 }).notNull(),
  distributorPhone: varchar("distributor_phone", { length: 50 }).notNull().default(""),
  issuedAt: bigint("issued_at", { mode: "number" }).notNull(),
  startDate: varchar("start_date", { length: 20 }).notNull(),
  dueDate: varchar("due_date", { length: 20 }).notNull(),
  status: mysqlEnum("wo_status", [
    "draft",
    "issued",
    "in_progress",
    "completed",
    "on_hold",
    "cancelled"
  ]).notNull().default("issued"),
  priority: mysqlEnum("wo_priority", ["normal", "urgent", "vip"]).notNull().default("normal"),
  orderType: mysqlEnum("wo_order_type", ["standard", "custom"]).notNull().default("standard"),
  totalDoors: int("total_doors").notNull().default(1),
  totalValue: float("total_value").notNull().default(0),
  doors: json("doors"),
  // DoorItem[]
  deptTasks: json("dept_tasks"),
  // DeptTask[]
  supervisorName: varchar("supervisor_name", { length: 255 }).notNull().default(""),
  notes: text("notes"),
  progressPercent: int("progress_percent").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull()
});
var decisionLog = mysqlTable("decision_log", {
  id: int("id").primaryKey().autoincrement(),
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  distributor: varchar("distributor", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  city: varchar("city", { length: 100 }).notNull().default(""),
  orderTotal: int("order_total").notNull().default(0),
  decision: mysqlEnum("dl_decision", [
    "approved",
    "rejected",
    "revision_requested"
  ]).notNull(),
  reason: text("reason"),
  decidedBy: varchar("decided_by", { length: 255 }).notNull(),
  decidedAt: varchar("decided_at", { length: 30 }).notNull(),
  responseTime: int("response_time").notNull().default(0),
  items: json("items"),
  notified: boolean("notified").notNull().default(false),
  followUp: text("follow_up"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull()
});
var postOrderReviews = mysqlTable("post_order_reviews", {
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
  status: mysqlEnum("por_status", ["pending_review", "reviewed", "closed"]).notNull().default("pending_review"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull()
});
var summaryRecipients = mysqlTable("summary_recipients", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 255 }).notNull().default(""),
  phone: varchar("phone", { length: 50 }).notNull().default(""),
  email: varchar("email", { length: 255 }).notNull().default(""),
  channels: json("channels").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull()
});
var summarySchedule = mysqlTable("summary_schedule", {
  id: int("id").primaryKey().autoincrement(),
  sendTime: varchar("send_time", { length: 5 }).notNull().default("20:00"),
  activeDays: json("active_days").notNull(),
  enabledSections: json("enabled_sections").notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull()
});
var summarySendHistory = mysqlTable("summary_send_history", {
  id: int("id").primaryKey().autoincrement(),
  sentAt: bigint("sent_at", { mode: "number" }).notNull(),
  recipientsCount: int("recipients_count").notNull().default(0),
  channels: varchar("channels", { length: 100 }).notNull().default(""),
  status: mysqlEnum("summary_status", [
    "success",
    "partial",
    "skipped",
    "failed"
  ]).notNull().default("success"),
  snapshotStats: json("snapshot_stats"),
  createdAt: bigint("created_at", { mode: "number" }).notNull()
});
var accounts = mysqlTable("accounts", {
  id: int("id").primaryKey().autoincrement(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  // e.g. "1120"
  name: varchar("name", { length: 255 }).notNull(),
  // Arabic
  nameEn: varchar("name_en", { length: 255 }).notNull().default(""),
  type: mysqlEnum("account_type", [
    "asset",
    "liability",
    "equity",
    "revenue",
    "expense"
  ]).notNull(),
  normalBalance: mysqlEnum("normal_balance", ["debit", "credit"]).notNull(),
  parentCode: varchar("parent_code", { length: 10 }),
  isSystem: boolean("is_system").notNull().default(false),
  // cannot be deleted
  isActive: boolean("is_active").notNull().default(true),
  createdAt: bigint("created_at", { mode: "number" }).notNull()
});
var journalEntries = mysqlTable("journal_entries", {
  id: int("id").primaryKey().autoincrement(),
  entryNumber: varchar("entry_number", { length: 30 }).notNull().unique(),
  // JE-2026-000001
  entryDate: varchar("entry_date", { length: 10 }).notNull(),
  // YYYY-MM-DD
  description: varchar("description", { length: 500 }).notNull(),
  sourceType: mysqlEnum("je_source_type", [
    "invoice",
    "payment",
    "manual",
    "vat_settlement"
  ]).notNull().default("manual"),
  sourceId: int("source_id"),
  // references tax_invoices.id or other
  totalDebitHalala: int("total_debit_halala").notNull().default(0),
  totalCreditHalala: int("total_credit_halala").notNull().default(0),
  isPosted: boolean("is_posted").notNull().default(true),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull()
});
var journalLines = mysqlTable("journal_lines", {
  id: int("id").primaryKey().autoincrement(),
  journalEntryId: int("journal_entry_id").notNull(),
  accountCode: varchar("account_code", { length: 10 }).notNull(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  // denormalised
  debitHalala: int("debit_halala").notNull().default(0),
  creditHalala: int("credit_halala").notNull().default(0),
  description: varchar("line_description", { length: 500 }).default(""),
  sequence: int("sequence").notNull().default(1)
});
var purchaseInvoices = mysqlTable("purchase_invoices", {
  id: int("id").primaryKey().autoincrement(),
  invoiceNumber: varchar("invoice_number", { length: 100 }).notNull(),
  // رقم فاتورة المورّد
  supplierName: varchar("supplier_name", { length: 255 }).notNull(),
  supplierVatNumber: varchar("supplier_vat_number", { length: 15 }),
  issueDate: varchar("issue_date", { length: 10 }).notNull(),
  // YYYY-MM-DD
  subtotalHalala: int("subtotal_halala").notNull().default(0),
  vatAmountHalala: int("vat_amount_halala").notNull().default(0),
  totalHalala: int("total_halala").notNull().default(0),
  category: mysqlEnum("purchase_category", [
    "materials",
    "equipment",
    "services",
    "utilities",
    "other"
  ]).notNull().default("materials"),
  description: varchar("purchase_desc", { length: 500 }).notNull().default(""),
  paymentStatus: mysqlEnum("purchase_pay_status", ["unpaid", "paid"]).notNull().default("unpaid"),
  notes: text("purchase_notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull()
});
var products = mysqlTable("products", {
  id: int("id").primaryKey().autoincrement(),
  sku: varchar("sku", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  // Arabic name
  nameEn: varchar("name_en", { length: 255 }).notNull().default(""),
  category: varchar("category", { length: 50 }).notNull(),
  // interior/exterior/fire/acoustic/accessories
  subcategory: varchar("subcategory", { length: 50 }).notNull().default(""),
  woodType: varchar("wood_type", { length: 50 }).notNull().default("oak"),
  status: mysqlEnum("product_status", ["active", "archived"]).notNull().default("active"),
  // ── Pricing (SAR, integers) ──
  basePrice: int("base_price").notNull().default(0),
  // retail SAR
  distributorPrice: int("distributor_price").notNull().default(0),
  // distributor SAR
  tiers: json("tiers"),
  // [{min, max, price, label}]
  // ── Media ──
  image: longtext("image").notNull(),
  images: json("images"),
  // string[]
  // ── Admin catalog fields ──
  sizes: json("sizes"),
  // string[]
  colors: json("colors"),
  // string[]
  stock: int("stock").notNull().default(0),
  // ── Public display ──
  badge: varchar("badge", { length: 100 }).default(""),
  badgeColor: varchar("badge_color", { length: 50 }).default(""),
  features: json("features"),
  // string[]
  description: text("description").notNull().default(""),
  specs: json("specs"),
  // [{label, value}]
  dimensions: varchar("dimensions", { length: 100 }).default(""),
  rating: float("rating").notNull().default(0),
  reviewCount: int("review_count").notNull().default(0),
  inStock: boolean("in_stock").notNull().default(true),
  isNew: boolean("is_new").notNull().default(false),
  isBestseller: boolean("is_bestseller").notNull().default(false),
  isCertified: boolean("is_certified").notNull().default(false),
  tags: json("tags"),
  // string[]
  weight: varchar("weight", { length: 50 }).default(""),
  warranty: varchar("warranty", { length: 100 }).default(""),
  options: json("options"),
  // ProductOption[] for door configurator
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull()
});
var productionLines = mysqlTable("production_lines", {
  id: int("id").primaryKey().autoincrement(),
  lineId: varchar("line_id", { length: 50 }).notNull().unique(),
  // door_line, frame_line, accessories, qc, packing
  nameAr: varchar("name_ar", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 100 }).notNull().default(""),
  dailyCapacity: int("daily_capacity").notNull().default(20),
  // وحدات/يوم
  workDaysPerWeek: int("work_days_per_week").notNull().default(6),
  shiftHours: int("shift_hours").notNull().default(8),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull()
});

// server/db.ts
var useSsl = process.env.DB_SSL === "true";
var pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  charset: "utf8mb4",
  ...useSsl ? { ssl: { rejectUnauthorized: true } } : {}
});
var db = drizzle(pool, { schema: schema_exports, mode: "default" });

// server/routers.ts
import { eq as eq26, desc as desc22 } from "drizzle-orm";

// server/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

// server/admin-sessions.ts
import { nanoid } from "nanoid";
import { eq, lt } from "drizzle-orm";
var SESSION_TTL_MS = 8 * 60 * 60 * 1e3;
async function createAdminSession() {
  const token = nanoid(64);
  const now = Date.now();
  await db.delete(schema_exports.adminSessions).where(lt(schema_exports.adminSessions.expiresAt, now));
  await db.insert(schema_exports.adminSessions).values({
    token,
    expiresAt: now + SESSION_TTL_MS,
    createdAt: now
  });
  return token;
}
async function validateAdminSession(token) {
  const [session] = await db.select().from(schema_exports.adminSessions).where(eq(schema_exports.adminSessions.token, token)).limit(1);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    await db.delete(schema_exports.adminSessions).where(eq(schema_exports.adminSessions.token, token));
    return false;
  }
  return true;
}
async function deleteAdminSession(token) {
  await db.delete(schema_exports.adminSessions).where(eq(schema_exports.adminSessions.token, token));
}

// server/trpc.ts
import { eq as eq2, and, gt } from "drizzle-orm";
var t = initTRPC.context().create({ transformer: superjson });
var router = t.router;
var publicProcedure = t.procedure;
function validateRequestOrigin(req) {
  if (!req) return;
  const origin = req.headers["origin"];
  if (!origin) return;
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    const appUrl = process.env.APP_URL || "";
    if (!appUrl || origin !== appUrl) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "\u0637\u0644\u0628 \u0645\u0646 \u0645\u0635\u062F\u0631 \u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0628\u0647"
      });
    }
  } else {
    try {
      const { hostname, protocol } = new URL(origin);
      if (protocol !== "http:" || hostname !== "localhost" && hostname !== "127.0.0.1") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "\u0637\u0644\u0628 \u0645\u0646 \u0645\u0635\u062F\u0631 \u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0628\u0647"
        });
      }
    } catch (e) {
      if (e instanceof TRPCError) throw e;
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "\u0637\u0644\u0628 \u0645\u0646 \u0645\u0635\u062F\u0631 \u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0628\u0647"
      });
    }
  }
}
var adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.adminToken || !await validateAdminSession(ctx.adminToken)) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D: \u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0643\u0645\u062F\u064A\u0631"
    });
  }
  return next({ ctx });
});
var userProcedure = t.procedure.use(async ({ ctx, next }) => {
  validateRequestOrigin(ctx.req);
  const token = ctx.userToken;
  if (!token)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644" });
  const now = Date.now();
  const session = await db.query.userSessions.findFirst({
    where: and(
      eq2(schema_exports.userSessions.token, token),
      gt(schema_exports.userSessions.expiresAt, now)
    )
  });
  if (!session)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "\u0627\u0646\u062A\u0647\u062A \u0627\u0644\u062C\u0644\u0633\u0629\u060C \u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u062C\u062F\u062F\u0627\u064B"
    });
  const user = await db.query.users.findFirst({
    where: eq2(schema_exports.users.id, session.userId)
  });
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, user } });
});
var supplierProcedure = t.procedure.use(async ({ ctx, next }) => {
  validateRequestOrigin(ctx.req);
  const token = ctx.supplierToken;
  if (!token)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644" });
  const now = Date.now();
  const session = await db.query.supplierSessions.findFirst({
    where: and(
      eq2(schema_exports.supplierSessions.token, token),
      gt(schema_exports.supplierSessions.expiresAt, now)
    )
  });
  if (!session)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u062C\u0644\u0633\u0629"
    });
  const supplier = await db.query.suppliers.findFirst({
    where: eq2(schema_exports.suppliers.id, session.supplierId)
  });
  if (!supplier) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, supplier } });
});
var distributorProcedure = t.procedure.use(async ({ ctx, next }) => {
  validateRequestOrigin(ctx.req);
  const token = ctx.distributorToken;
  if (!token)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644" });
  const now = Date.now();
  const session = await db.query.distributorSessions.findFirst({
    where: and(
      eq2(schema_exports.distributorSessions.token, token),
      gt(schema_exports.distributorSessions.expiresAt, now)
    )
  });
  if (!session)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u062C\u0644\u0633\u0629"
    });
  const distributor = await db.query.distributors.findFirst({
    where: eq2(schema_exports.distributors.id, session.distributorId)
  });
  if (!distributor) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, distributor } });
});

// server/suppliers.router.ts
import { TRPCError as TRPCError2 } from "@trpc/server";
import { z as z2 } from "zod/v4";
import bcrypt from "bcryptjs";
import { nanoid as nanoid2 } from "nanoid";
import { eq as eq3, and as and2 } from "drizzle-orm";
var SUPPLIER_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1e3,
  path: "/"
};
var suppliersRouter = router({
  // ── تسجيل مورد جديد ─────────────────────────────────────────────────────
  register: publicProcedure.input(
    z2.object({
      companyName: z2.string().min(2, "\u0627\u0633\u0645 \u0627\u0644\u0634\u0631\u0643\u0629 \u0645\u0637\u0644\u0648\u0628"),
      contactName: z2.string().min(2, "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u0624\u0648\u0644 \u0645\u0637\u0644\u0648\u0628"),
      email: z2.string().email("\u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D"),
      phone: z2.string().min(9, "\u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644 \u0645\u0637\u0644\u0648\u0628"),
      password: z2.string().min(8, "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 8 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644"),
      city: z2.string().optional(),
      address: z2.string().optional(),
      website: z2.string().optional(),
      categories: z2.array(z2.string()).optional()
    })
  ).mutation(async ({ input }) => {
    const existing = await db.query.suppliers.findFirst({
      where: eq3(schema_exports.suppliers.email, input.email)
    });
    if (existing)
      throw new TRPCError2({
        code: "CONFLICT",
        message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B"
      });
    const passwordHash = await bcrypt.hash(input.password, 10);
    const now = Date.now();
    const [result] = await db.insert(schema_exports.suppliers).values({
      companyName: input.companyName,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone,
      passwordHash,
      city: input.city || null,
      address: input.address || null,
      website: input.website || null,
      categories: input.categories || [],
      status: "pending",
      createdAt: now,
      updatedAt: now
    });
    const supplierId = result.insertId;
    notifyOwnerAboutNewSupplier(
      input.companyName,
      input.contactName,
      input.email
    );
    return {
      success: true,
      supplierId,
      message: "\u062A\u0645 \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0628\u0646\u062C\u0627\u062D. \u0633\u064A\u062A\u0645 \u0645\u0631\u0627\u062C\u0639\u0629 \u0637\u0644\u0628\u0643 \u0648\u062A\u0641\u0639\u064A\u0644 \u062D\u0633\u0627\u0628\u0643 \u0642\u0631\u064A\u0628\u0627\u064B."
    };
  }),
  // ── تسجيل الدخول ────────────────────────────────────────────────────────
  login: publicProcedure.input(
    z2.object({
      email: z2.string().email(),
      password: z2.string().min(1)
    })
  ).mutation(async ({ input, ctx }) => {
    const supplier = await db.query.suppliers.findFirst({
      where: eq3(schema_exports.suppliers.email, input.email)
    });
    if (!supplier)
      throw new TRPCError2({
        code: "UNAUTHORIZED",
        message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629"
      });
    if (supplier.status === "suspended")
      throw new TRPCError2({
        code: "FORBIDDEN",
        message: "\u062A\u0645 \u062A\u0639\u0644\u064A\u0642 \u062D\u0633\u0627\u0628\u0643. \u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0625\u062F\u0627\u0631\u0629."
      });
    if (supplier.status === "pending")
      throw new TRPCError2({
        code: "FORBIDDEN",
        message: "\u062D\u0633\u0627\u0628\u0643 \u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629. \u0633\u064A\u062A\u0645 \u0625\u0634\u0639\u0627\u0631\u0643 \u0639\u0646\u062F \u0627\u0644\u062A\u0641\u0639\u064A\u0644."
      });
    const valid = await bcrypt.compare(input.password, supplier.passwordHash);
    if (!valid)
      throw new TRPCError2({
        code: "UNAUTHORIZED",
        message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629"
      });
    const token = nanoid2(64);
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1e3;
    await db.insert(schema_exports.supplierSessions).values({
      supplierId: supplier.id,
      token,
      expiresAt,
      createdAt: Date.now()
    });
    const { passwordHash: _, ...safeSupplier } = supplier;
    ctx.res.cookie("supplierSession", token, SUPPLIER_COOKIE_OPTIONS);
    return { supplier: safeSupplier };
  }),
  // ── تسجيل الخروج ────────────────────────────────────────────────────────
  logout: supplierProcedure.mutation(async ({ ctx }) => {
    const token = ctx.supplierToken;
    ctx.res.clearCookie("supplierSession", { path: "/" });
    await db.delete(schema_exports.supplierSessions).where(eq3(schema_exports.supplierSessions.token, token));
    return { success: true };
  }),
  // ── الملف الشخصي ────────────────────────────────────────────────────────
  me: supplierProcedure.query(async ({ ctx }) => {
    const { passwordHash: _, ...safe } = ctx.supplier;
    return safe;
  }),
  // ── تحديث الملف الشخصي ──────────────────────────────────────────────────
  updateProfile: supplierProcedure.input(
    z2.object({
      contactName: z2.string().min(2).optional(),
      phone: z2.string().min(9).optional(),
      city: z2.string().optional(),
      address: z2.string().optional(),
      website: z2.string().optional(),
      categories: z2.array(z2.string()).optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const supplier = ctx.supplier;
    await db.update(schema_exports.suppliers).set({ ...input, updatedAt: Date.now() }).where(eq3(schema_exports.suppliers.id, supplier.id));
    return { success: true };
  }),
  // ── قائمة الموردين (للإدارة فقط) ───────────────────────────────────────
  list: adminProcedure.input(
    z2.object({
      status: z2.enum(["pending", "active", "suspended"]).optional()
    }).optional()
  ).query(async ({ input }) => {
    const suppliers2 = await db.query.suppliers.findMany({
      orderBy: (s, { desc: desc23 }) => [desc23(s.createdAt)],
      where: input?.status ? eq3(schema_exports.suppliers.status, input.status) : void 0
    });
    return suppliers2.map(({ passwordHash: _, ...s }) => s);
  }),
  // ── تفعيل/تعليق مورد (للإدارة فقط) ───────────────────────────────────────
  updateStatus: adminProcedure.input(
    z2.object({
      id: z2.number(),
      status: z2.enum(["pending", "active", "suspended"]),
      adminNotes: z2.string().optional()
    })
  ).mutation(async ({ input }) => {
    await db.update(schema_exports.suppliers).set({
      status: input.status,
      adminNotes: input.adminNotes || null,
      updatedAt: Date.now()
    }).where(eq3(schema_exports.suppliers.id, input.id));
    return { success: true };
  }),
  // ── الدعوات المرسلة للمورد ──────────────────────────────────────────────
  myInvitations: supplierProcedure.query(async ({ ctx }) => {
    const supplier = ctx.supplier;
    const invitations = await db.query.rfqInvitations.findMany({
      where: eq3(schema_exports.rfqInvitations.supplierId, supplier.id),
      orderBy: (inv, { desc: desc23 }) => [desc23(inv.sentAt)]
    });
    const result = await Promise.all(
      invitations.map(async (inv) => {
        const rfq = await db.query.rfqs.findFirst({
          where: eq3(schema_exports.rfqs.id, inv.rfqId)
        });
        return { ...inv, rfq };
      })
    );
    return result;
  }),
  // ── عروض الأسعار المقدمة من المورد ─────────────────────────────────────
  myQuotes: supplierProcedure.query(async ({ ctx }) => {
    const supplier = ctx.supplier;
    const quotes = await db.query.supplierQuotes.findMany({
      where: eq3(schema_exports.supplierQuotes.supplierId, supplier.id),
      orderBy: (q, { desc: desc23 }) => [desc23(q.createdAt)]
    });
    const result = await Promise.all(
      quotes.map(async (q) => {
        const rfq = await db.query.rfqs.findFirst({
          where: eq3(schema_exports.rfqs.id, q.rfqId)
        });
        return { ...q, rfq };
      })
    );
    return result;
  }),
  // ── أوامر الشراء الخاصة بالمورد ─────────────────────────────────────────
  myPurchaseOrders: supplierProcedure.query(async ({ ctx }) => {
    const supplier = ctx.supplier;
    return db.query.purchaseOrders.findMany({
      where: eq3(schema_exports.purchaseOrders.supplierId, supplier.id),
      orderBy: (po, { desc: desc23 }) => [desc23(po.createdAt)]
    });
  }),
  // ── تأكيد أمر الشراء من المورد ──────────────────────────────────────────
  confirmPurchaseOrder: supplierProcedure.input(z2.object({ poId: z2.number() })).mutation(async ({ ctx, input }) => {
    const supplier = ctx.supplier;
    const po = await db.query.purchaseOrders.findFirst({
      where: and2(
        eq3(schema_exports.purchaseOrders.id, input.poId),
        eq3(schema_exports.purchaseOrders.supplierId, supplier.id)
      )
    });
    if (!po) throw new TRPCError2({ code: "NOT_FOUND" });
    await db.update(schema_exports.purchaseOrders).set({
      status: "confirmed",
      confirmedAt: Date.now(),
      updatedAt: Date.now()
    }).where(eq3(schema_exports.purchaseOrders.id, input.poId));
    return { success: true };
  })
});
async function notifyOwnerAboutNewSupplier(company, contact, email) {
  const apiUrl = process.env.BUILT_IN_FORGE_API_URL;
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  if (!apiUrl || !apiKey || !ownerOpenId) return;
  try {
    await fetch(`${apiUrl}/v1/notification/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        open_id: ownerOpenId,
        title: `\u{1F3ED} \u0645\u0648\u0631\u062F \u062C\u062F\u064A\u062F \u064A\u0637\u0644\u0628 \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u2014 ${company}`,
        content: `\u0627\u0644\u0634\u0631\u0643\u0629: ${company}
\u0627\u0644\u0645\u0633\u0624\u0648\u0644: ${contact}
\u0627\u0644\u0628\u0631\u064A\u062F: ${email}

\u064A\u0631\u062C\u0649 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0637\u0644\u0628 \u0648\u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u0646 \u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645.`
      })
    });
  } catch {
  }
}

// server/rfq.router.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { z as z3 } from "zod/v4";
import { eq as eq4, and as and3, inArray } from "drizzle-orm";

// server/llm.ts
async function invokeLLM(options) {
  const apiUrl = process.env.BUILT_IN_FORGE_API_URL;
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  if (!apiUrl || !apiKey) {
    throw new Error("LLM API credentials not configured");
  }
  const response = await fetch(`${apiUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: options.messages,
      response_format: options.response_format || { type: "text" },
      temperature: options.temperature ?? 0.3
    })
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LLM API error: ${response.status} \u2014 ${err}`);
  }
  return response.json();
}

// server/rfq.router.ts
var rfqItemSchema = z3.object({
  name: z3.string().min(1),
  description: z3.string().optional(),
  qty: z3.number().min(0.01),
  unit: z3.string().default("\u0642\u0637\u0639\u0629"),
  specs: z3.string().optional()
});
var lineItemSchema = z3.object({
  itemIndex: z3.number(),
  unitPrice: z3.number().min(0),
  totalPrice: z3.number().min(0),
  notes: z3.string().optional()
});
var rfqRouter = router({
  // ── إنشاء RFQ جديد ──────────────────────────────────────────────────────
  create: publicProcedure.input(
    z3.object({
      title: z3.string().min(3),
      description: z3.string().optional(),
      items: z3.array(rfqItemSchema).min(1),
      deliveryLocation: z3.string().optional(),
      deliveryDays: z3.number().optional(),
      paymentTerms: z3.string().optional(),
      warrantyMonths: z3.number().optional(),
      submissionDeadline: z3.number()
      // UTC ms
    })
  ).mutation(async ({ input }) => {
    const now = Date.now();
    const count = await db.query.rfqs.findMany();
    const rfqNumber = `RFQ-${(/* @__PURE__ */ new Date()).getFullYear()}-${String(count.length + 1).padStart(3, "0")}`;
    const [result] = await db.insert(schema_exports.rfqs).values({
      rfqNumber,
      title: input.title,
      description: input.description || null,
      items: input.items,
      deliveryLocation: input.deliveryLocation || null,
      deliveryDays: input.deliveryDays || null,
      paymentTerms: input.paymentTerms || null,
      warrantyMonths: input.warrantyMonths || null,
      submissionDeadline: input.submissionDeadline,
      status: "draft",
      createdAt: now,
      updatedAt: now
    });
    return { id: result.insertId, rfqNumber };
  }),
  // ── قائمة الـ RFQs ───────────────────────────────────────────────────────
  list: publicProcedure.input(
    z3.object({
      status: z3.enum([
        "draft",
        "published",
        "closed",
        "evaluated",
        "awarded",
        "cancelled"
      ]).optional()
    }).optional()
  ).query(async ({ input }) => {
    const rfqs2 = await db.query.rfqs.findMany({
      orderBy: (r, { desc: desc23 }) => [desc23(r.createdAt)],
      where: input?.status ? eq4(schema_exports.rfqs.status, input.status) : void 0
    });
    const result = await Promise.all(
      rfqs2.map(async (rfq) => {
        const quotes = await db.query.supplierQuotes.findMany({
          where: eq4(schema_exports.supplierQuotes.rfqId, rfq.id)
        });
        const invitations = await db.query.rfqInvitations.findMany({
          where: eq4(schema_exports.rfqInvitations.rfqId, rfq.id)
        });
        return {
          ...rfq,
          quotesCount: quotes.length,
          invitationsCount: invitations.length
        };
      })
    );
    return result;
  }),
  // ── تفاصيل RFQ واحد ──────────────────────────────────────────────────────
  getById: publicProcedure.input(z3.object({ id: z3.number() })).query(async ({ input }) => {
    const rfq = await db.query.rfqs.findFirst({
      where: eq4(schema_exports.rfqs.id, input.id)
    });
    if (!rfq) throw new TRPCError3({ code: "NOT_FOUND" });
    const invitations = await db.query.rfqInvitations.findMany({
      where: eq4(schema_exports.rfqInvitations.rfqId, input.id)
    });
    const quotes = await db.query.supplierQuotes.findMany({
      where: eq4(schema_exports.supplierQuotes.rfqId, input.id),
      orderBy: (q, { asc: asc2 }) => [asc2(q.totalPrice)]
    });
    const supplierIdsSet = /* @__PURE__ */ new Set([
      ...invitations.map((i) => i.supplierId),
      ...quotes.map((q) => q.supplierId)
    ]);
    const supplierIds = Array.from(supplierIdsSet);
    const suppliers2 = supplierIds.length > 0 ? await db.query.suppliers.findMany({
      where: inArray(schema_exports.suppliers.id, supplierIds)
    }) : [];
    const safeSuppliers = suppliers2.map(({ passwordHash: _, ...s }) => s);
    return { rfq, invitations, quotes, suppliers: safeSuppliers };
  }),
  // ── تحديث RFQ ────────────────────────────────────────────────────────────
  update: publicProcedure.input(
    z3.object({
      id: z3.number(),
      title: z3.string().min(3).optional(),
      description: z3.string().optional(),
      items: z3.array(rfqItemSchema).optional(),
      deliveryLocation: z3.string().optional(),
      deliveryDays: z3.number().optional(),
      paymentTerms: z3.string().optional(),
      warrantyMonths: z3.number().optional(),
      submissionDeadline: z3.number().optional()
    })
  ).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await db.update(schema_exports.rfqs).set({ ...data, updatedAt: Date.now() }).where(eq4(schema_exports.rfqs.id, id));
    return { success: true };
  }),
  // ── إرسال الدعوات للموردين ───────────────────────────────────────────────
  sendInvitations: publicProcedure.input(
    z3.object({
      rfqId: z3.number(),
      supplierIds: z3.array(z3.number()).min(1)
    })
  ).mutation(async ({ input }) => {
    const rfq = await db.query.rfqs.findFirst({
      where: eq4(schema_exports.rfqs.id, input.rfqId)
    });
    if (!rfq) throw new TRPCError3({ code: "NOT_FOUND" });
    const now = Date.now();
    const results = [];
    for (const supplierId of input.supplierIds) {
      const existing = await db.query.rfqInvitations.findFirst({
        where: and3(
          eq4(schema_exports.rfqInvitations.rfqId, input.rfqId),
          eq4(schema_exports.rfqInvitations.supplierId, supplierId)
        )
      });
      if (existing) continue;
      const [inv] = await db.insert(schema_exports.rfqInvitations).values({
        rfqId: input.rfqId,
        supplierId,
        status: "sent",
        sentAt: now
      });
      const supplier = await db.query.suppliers.findFirst({
        where: eq4(schema_exports.suppliers.id, supplierId)
      });
      if (supplier) {
        notifySupplier(supplier, rfq);
      }
      results.push(inv.insertId);
    }
    await db.update(schema_exports.rfqs).set({ status: "published", updatedAt: now }).where(eq4(schema_exports.rfqs.id, input.rfqId));
    return { success: true, invitationsSent: results.length };
  }),
  // ── تقديم عرض سعر (من المورد) ───────────────────────────────────────────
  submitQuote: supplierProcedure.input(
    z3.object({
      rfqId: z3.number(),
      totalPrice: z3.number().min(0),
      lineItems: z3.array(lineItemSchema),
      deliveryDays: z3.number().optional(),
      paymentTerms: z3.string().optional(),
      warrantyMonths: z3.number().optional(),
      validUntil: z3.number().optional(),
      notes: z3.string().optional(),
      technicalNotes: z3.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const supplierId = ctx.supplier.id;
    const rfq = await db.query.rfqs.findFirst({
      where: eq4(schema_exports.rfqs.id, input.rfqId)
    });
    if (!rfq) throw new TRPCError3({ code: "NOT_FOUND" });
    if (rfq.status === "cancelled")
      throw new TRPCError3({ code: "BAD_REQUEST", message: "\u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628 \u0645\u0644\u063A\u064A" });
    if (rfq.submissionDeadline < Date.now())
      throw new TRPCError3({
        code: "BAD_REQUEST",
        message: "\u0627\u0646\u062A\u0647\u0649 \u0645\u0648\u0639\u062F \u062A\u0642\u062F\u064A\u0645 \u0627\u0644\u0639\u0631\u0648\u0636"
      });
    const now = Date.now();
    const count = await db.query.supplierQuotes.findMany({
      where: eq4(schema_exports.supplierQuotes.rfqId, input.rfqId)
    });
    const quoteNumber = `Q-${rfq.rfqNumber}-${String(count.length + 1).padStart(2, "0")}`;
    const existingQuote = await db.query.supplierQuotes.findFirst({
      where: and3(
        eq4(schema_exports.supplierQuotes.rfqId, input.rfqId),
        eq4(schema_exports.supplierQuotes.supplierId, supplierId)
      )
    });
    if (existingQuote) {
      await db.update(schema_exports.supplierQuotes).set({
        totalPrice: input.totalPrice,
        lineItems: input.lineItems,
        deliveryDays: input.deliveryDays || null,
        paymentTerms: input.paymentTerms || null,
        warrantyMonths: input.warrantyMonths || null,
        validUntil: input.validUntil || null,
        notes: input.notes || null,
        technicalNotes: input.technicalNotes || null,
        updatedAt: now
      }).where(eq4(schema_exports.supplierQuotes.id, existingQuote.id));
      await db.update(schema_exports.rfqInvitations).set({ status: "submitted", respondedAt: now }).where(
        and3(
          eq4(schema_exports.rfqInvitations.rfqId, input.rfqId),
          eq4(schema_exports.rfqInvitations.supplierId, supplierId)
        )
      );
      return { success: true, quoteId: existingQuote.id, updated: true };
    }
    const [result] = await db.insert(schema_exports.supplierQuotes).values({
      rfqId: input.rfqId,
      supplierId,
      quoteNumber,
      totalPrice: input.totalPrice,
      lineItems: input.lineItems,
      deliveryDays: input.deliveryDays || null,
      paymentTerms: input.paymentTerms || null,
      warrantyMonths: input.warrantyMonths || null,
      validUntil: input.validUntil || null,
      notes: input.notes || null,
      technicalNotes: input.technicalNotes || null,
      status: "submitted",
      createdAt: now,
      updatedAt: now
    });
    await db.update(schema_exports.rfqInvitations).set({ status: "submitted", respondedAt: now }).where(
      and3(
        eq4(schema_exports.rfqInvitations.rfqId, input.rfqId),
        eq4(schema_exports.rfqInvitations.supplierId, supplierId)
      )
    );
    const supplierRow = await db.query.suppliers.findFirst({
      where: eq4(schema_exports.suppliers.id, supplierId)
    });
    if (supplierRow) {
      await db.update(schema_exports.suppliers).set({
        totalQuotes: (supplierRow.totalQuotes || 0) + 1,
        updatedAt: now
      }).where(eq4(schema_exports.suppliers.id, supplierId));
    }
    notifyAdminAboutNewQuote(rfq.rfqNumber, rfq.title, input.totalPrice);
    return {
      success: true,
      quoteId: result.insertId,
      updated: false
    };
  }),
  // ── تقييم العروض بالذكاء الاصطناعي ─────────────────────────────────────
  evaluateWithAI: publicProcedure.input(z3.object({ rfqId: z3.number() })).mutation(async ({ input }) => {
    const rfq = await db.query.rfqs.findFirst({
      where: eq4(schema_exports.rfqs.id, input.rfqId)
    });
    if (!rfq) throw new TRPCError3({ code: "NOT_FOUND" });
    const quotes = await db.query.supplierQuotes.findMany({
      where: eq4(schema_exports.supplierQuotes.rfqId, input.rfqId),
      orderBy: (q, { asc: asc2 }) => [asc2(q.totalPrice)]
    });
    if (quotes.length === 0)
      throw new TRPCError3({
        code: "BAD_REQUEST",
        message: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0639\u0631\u0648\u0636 \u0644\u062A\u0642\u064A\u064A\u0645\u0647\u0627"
      });
    const supplierIds = quotes.map((q) => q.supplierId);
    const suppliers2 = await db.query.suppliers.findMany({
      where: inArray(schema_exports.suppliers.id, supplierIds)
    });
    const quotesData = quotes.map((q) => {
      const supplier = suppliers2.find((s) => s.id === q.supplierId);
      return {
        quoteId: q.id,
        supplierName: supplier?.companyName || "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641",
        totalPrice: q.totalPrice,
        deliveryDays: q.deliveryDays,
        paymentTerms: q.paymentTerms,
        warrantyMonths: q.warrantyMonths,
        rating: supplier?.rating || 0,
        wonQuotes: supplier?.wonQuotes || 0,
        totalQuotes: supplier?.totalQuotes || 0,
        notes: q.notes
      };
    });
    const minPrice = Math.min(...quotes.map((q) => q.totalPrice));
    const maxPrice = Math.max(...quotes.map((q) => q.totalPrice));
    const minDelivery = Math.min(
      ...quotes.filter((q) => q.deliveryDays).map((q) => q.deliveryDays)
    );
    const prompt = `\u0623\u0646\u062A \u062E\u0628\u064A\u0631 \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0645\u062A\u062E\u0635\u0635. \u0642\u064A\u0651\u0645 \u0639\u0631\u0648\u0636 \u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0627\u0644\u062A\u0627\u0644\u064A\u0629 \u0644\u0637\u0644\u0628 "${rfq.title}" \u0648\u0623\u0639\u0637\u0650 \u062A\u0648\u0635\u064A\u0629 \u0648\u0627\u0636\u062D\u0629.

\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0637\u0644\u0628:
- \u0627\u0644\u0639\u0646\u0648\u0627\u0646: ${rfq.title}
- \u0627\u0644\u0645\u062F\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629: ${rfq.deliveryDays ? rfq.deliveryDays + " \u064A\u0648\u0645" : "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"}
- \u0634\u0631\u0648\u0637 \u0627\u0644\u062F\u0641\u0639 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629: ${rfq.paymentTerms || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"}
- \u0627\u0644\u0636\u0645\u0627\u0646 \u0627\u0644\u0645\u0637\u0644\u0648\u0628: ${rfq.warrantyMonths ? rfq.warrantyMonths + " \u0634\u0647\u0631" : "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"}

\u0627\u0644\u0639\u0631\u0648\u0636 \u0627\u0644\u0645\u0642\u062F\u0645\u0629:
${quotesData.map(
      (q, i) => `
${i + 1}. ${q.supplierName}
   - \u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A: ${q.totalPrice.toLocaleString()} \u0631.\u0633
   - \u0645\u062F\u0629 \u0627\u0644\u062A\u0648\u0631\u064A\u062F: ${q.deliveryDays ? q.deliveryDays + " \u064A\u0648\u0645" : "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"}
   - \u0634\u0631\u0648\u0637 \u0627\u0644\u062F\u0641\u0639: ${q.paymentTerms || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"}
   - \u0627\u0644\u0636\u0645\u0627\u0646: ${q.warrantyMonths ? q.warrantyMonths + " \u0634\u0647\u0631" : "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"}
   - \u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0645\u0648\u0631\u062F: ${q.rating}/5 (${q.wonQuotes}/${q.totalQuotes} \u0637\u0644\u0628\u0627\u062A \u0646\u0627\u062C\u062D\u0629)
`
    ).join("")}

\u0642\u064A\u0651\u0645 \u0643\u0644 \u0639\u0631\u0636 \u0639\u0644\u0649 \u0645\u0642\u064A\u0627\u0633 0-100 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649:
1. \u0627\u0644\u0633\u0639\u0631 (30%): \u0623\u0641\u0636\u0644 \u0633\u0639\u0631 = ${minPrice.toLocaleString()} \u0631.\u0633
2. \u0645\u062F\u0629 \u0627\u0644\u062A\u0648\u0631\u064A\u062F (25%): \u0623\u0633\u0631\u0639 \u062A\u0648\u0631\u064A\u062F = ${minDelivery} \u064A\u0648\u0645
3. \u0634\u0631\u0648\u0637 \u0627\u0644\u062F\u0641\u0639 (15%): \u0643\u0644\u0645\u0627 \u0643\u0627\u0646\u062A \u0623\u0637\u0648\u0644 \u0643\u0644\u0645\u0627 \u0643\u0627\u0646\u062A \u0623\u0641\u0636\u0644
4. \u0627\u0644\u0636\u0645\u0627\u0646 (10%): \u0643\u0644\u0645\u0627 \u0643\u0627\u0646 \u0623\u0637\u0648\u0644 \u0643\u0644\u0645\u0627 \u0643\u0627\u0646 \u0623\u0641\u0636\u0644
5. \u0633\u062C\u0644 \u0627\u0644\u0645\u0648\u0631\u062F (20%): \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0648\u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0646\u0627\u062C\u062D\u0629

\u0623\u0639\u062F \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0628\u062A\u0646\u0633\u064A\u0642 JSON \u0641\u0642\u0637 \u0628\u062F\u0648\u0646 \u0623\u064A \u0646\u0635 \u0625\u0636\u0627\u0641\u064A:
{
  "scores": [
    {
      "quoteId": <\u0631\u0642\u0645>,
      "totalScore": <0-100>,
      "breakdown": {
        "price": <0-30>,
        "delivery": <0-25>,
        "payment": <0-15>,
        "warranty": <0-10>,
        "history": <0-20>
      },
      "strengths": ["\u0646\u0642\u0637\u0629 \u0642\u0648\u0629 1", "\u0646\u0642\u0637\u0629 \u0642\u0648\u0629 2"],
      "weaknesses": ["\u0646\u0642\u0637\u0629 \u0636\u0639\u0641 1"],
      "recommendation": "\u062A\u0639\u0644\u064A\u0642 \u0645\u062E\u062A\u0635\u0631"
    }
  ],
  "winner": {
    "quoteId": <\u0631\u0642\u0645>,
    "reason": "\u0633\u0628\u0628 \u0627\u0644\u0627\u062E\u062A\u064A\u0627\u0631 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629 (3-4 \u062C\u0645\u0644)"
  },
  "summary": "\u0645\u0644\u062E\u0635 \u0639\u0627\u0645 \u0644\u0644\u062A\u0642\u064A\u064A\u0645 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629 (2-3 \u062C\u0645\u0644)"
}`;
    let evaluation;
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "\u0623\u0646\u062A \u062E\u0628\u064A\u0631 \u0645\u0634\u062A\u0631\u064A\u0627\u062A. \u0623\u062C\u0628 \u0628\u0640 JSON \u0641\u0642\u0637 \u0628\u062F\u0648\u0646 markdown \u0623\u0648 \u0646\u0635 \u0625\u0636\u0627\u0641\u064A."
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });
      const content = response.choices[0]?.message?.content || "{}";
      evaluation = JSON.parse(content);
    } catch (e) {
      evaluation = generateFallbackEvaluation(quotesData, minPrice, maxPrice);
    }
    const now = Date.now();
    for (const score of evaluation.scores || []) {
      await db.update(schema_exports.supplierQuotes).set({
        aiScore: score.totalScore,
        aiScoreBreakdown: score.breakdown,
        aiRecommendation: score.recommendation,
        updatedAt: now
      }).where(eq4(schema_exports.supplierQuotes.id, score.quoteId));
    }
    await db.update(schema_exports.rfqs).set({ status: "evaluated", aiEvaluation: evaluation, updatedAt: now }).where(eq4(schema_exports.rfqs.id, input.rfqId));
    return { success: true, evaluation };
  }),
  // ── ترسية العقد على مورد ─────────────────────────────────────────────────
  award: publicProcedure.input(
    z3.object({
      rfqId: z3.number(),
      quoteId: z3.number(),
      awardNotes: z3.string().optional()
    })
  ).mutation(async ({ input }) => {
    const quote = await db.query.supplierQuotes.findFirst({
      where: eq4(schema_exports.supplierQuotes.id, input.quoteId)
    });
    if (!quote) throw new TRPCError3({ code: "NOT_FOUND" });
    const now = Date.now();
    await db.update(schema_exports.rfqs).set({
      status: "awarded",
      awardedSupplierId: quote.supplierId,
      awardedAt: now,
      awardNotes: input.awardNotes || null,
      updatedAt: now
    }).where(eq4(schema_exports.rfqs.id, input.rfqId));
    const allQuotes = await db.query.supplierQuotes.findMany({
      where: eq4(schema_exports.supplierQuotes.rfqId, input.rfqId)
    });
    for (const q of allQuotes) {
      await db.update(schema_exports.supplierQuotes).set({
        status: q.id === input.quoteId ? "awarded" : "rejected",
        updatedAt: now
      }).where(eq4(schema_exports.supplierQuotes.id, q.id));
    }
    const supplier = await db.query.suppliers.findFirst({
      where: eq4(schema_exports.suppliers.id, quote.supplierId)
    });
    if (supplier) {
      await db.update(schema_exports.suppliers).set({ wonQuotes: (supplier.wonQuotes || 0) + 1, updatedAt: now }).where(eq4(schema_exports.suppliers.id, quote.supplierId));
    }
    const rfq = await db.query.rfqs.findFirst({
      where: eq4(schema_exports.rfqs.id, input.rfqId)
    });
    const poCount = await db.query.purchaseOrders.findMany();
    const poNumber = `PO-${(/* @__PURE__ */ new Date()).getFullYear()}-${String(poCount.length + 1).padStart(3, "0")}`;
    const [poResult] = await db.insert(schema_exports.purchaseOrders).values({
      poNumber,
      rfqId: input.rfqId,
      supplierId: quote.supplierId,
      quoteId: input.quoteId,
      title: rfq?.title || "\u0623\u0645\u0631 \u0634\u0631\u0627\u0621",
      items: rfq?.items || [],
      totalPrice: quote.totalPrice,
      currency: quote.currency || "SAR",
      deliveryDays: quote.deliveryDays || null,
      paymentTerms: quote.paymentTerms || null,
      deliveryLocation: rfq?.deliveryLocation || null,
      status: "issued",
      issuedAt: now,
      createdAt: now,
      updatedAt: now
    });
    return { success: true, poId: poResult.insertId, poNumber };
  }),
  // ── قائمة أوامر الشراء ───────────────────────────────────────────────────
  listPurchaseOrders: publicProcedure.input(
    z3.object({
      status: z3.enum([
        "issued",
        "confirmed",
        "in_progress",
        "delivered",
        "invoiced",
        "paid",
        "cancelled"
      ]).optional()
    }).optional()
  ).query(async ({ input }) => {
    const pos = await db.query.purchaseOrders.findMany({
      orderBy: (po, { desc: desc23 }) => [desc23(po.createdAt)],
      where: input?.status ? eq4(schema_exports.purchaseOrders.status, input.status) : void 0
    });
    const result = await Promise.all(
      pos.map(async (po) => {
        const supplier = await db.query.suppliers.findFirst({
          where: eq4(schema_exports.suppliers.id, po.supplierId)
        });
        return {
          ...po,
          supplier: supplier ? {
            id: supplier.id,
            companyName: supplier.companyName,
            contactName: supplier.contactName,
            phone: supplier.phone
          } : null
        };
      })
    );
    return result;
  }),
  // ── تحديث حالة أمر الشراء ───────────────────────────────────────────────
  updatePOStatus: publicProcedure.input(
    z3.object({
      id: z3.number(),
      status: z3.enum([
        "issued",
        "confirmed",
        "in_progress",
        "delivered",
        "invoiced",
        "paid",
        "cancelled"
      ]),
      notes: z3.string().optional()
    })
  ).mutation(async ({ input }) => {
    const update = { status: input.status, updatedAt: Date.now() };
    if (input.status === "confirmed") update.confirmedAt = Date.now();
    if (input.status === "delivered") update.deliveredAt = Date.now();
    if (input.notes) update.notes = input.notes;
    await db.update(schema_exports.purchaseOrders).set(update).where(eq4(schema_exports.purchaseOrders.id, input.id));
    return { success: true };
  }),
  // ── تحديث حالة عرض السعر يدوياً ─────────────────────────────────────────
  updateQuoteStatus: publicProcedure.input(
    z3.object({
      id: z3.number(),
      status: z3.enum([
        "submitted",
        "under_review",
        "shortlisted",
        "awarded",
        "rejected"
      ]),
      adminNotes: z3.string().optional(),
      adminScore: z3.number().optional()
    })
  ).mutation(async ({ input }) => {
    await db.update(schema_exports.supplierQuotes).set({
      status: input.status,
      adminNotes: input.adminNotes || null,
      adminScore: input.adminScore || null,
      updatedAt: Date.now()
    }).where(eq4(schema_exports.supplierQuotes.id, input.id));
    return { success: true };
  }),
  // ── تحديث حالة الدعوة (قبول/رفض من المورد) ─────────────────────────────
  respondToInvitation: supplierProcedure.input(
    z3.object({
      invitationId: z3.number(),
      response: z3.enum(["accepted", "declined"]),
      declineReason: z3.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const supplierId = ctx.supplier.id;
    await db.update(schema_exports.rfqInvitations).set({
      status: input.response,
      respondedAt: Date.now(),
      declineReason: input.declineReason || null,
      viewedAt: Date.now()
    }).where(
      and3(
        eq4(schema_exports.rfqInvitations.id, input.invitationId),
        eq4(schema_exports.rfqInvitations.supplierId, supplierId)
      )
    );
    return { success: true };
  }),
  // ── تحديث حالة الدعوة إلى "viewed" ─────────────────────────────────────
  markInvitationViewed: supplierProcedure.input(
    z3.object({
      invitationId: z3.number()
    })
  ).mutation(async ({ input, ctx }) => {
    const supplierId = ctx.supplier.id;
    await db.update(schema_exports.rfqInvitations).set({ status: "viewed", viewedAt: Date.now() }).where(
      and3(
        eq4(schema_exports.rfqInvitations.id, input.invitationId),
        eq4(schema_exports.rfqInvitations.supplierId, supplierId),
        eq4(schema_exports.rfqInvitations.status, "sent")
      )
    );
    return { success: true };
  })
});
async function notifySupplier(supplier, rfq) {
  const apiUrl = process.env.BUILT_IN_FORGE_API_URL;
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  if (!apiUrl || !apiKey) return;
  try {
    await fetch(`${apiUrl}/v1/notification/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        open_id: supplier.email,
        // fallback
        title: `\u{1F4CB} \u062F\u0639\u0648\u0629 \u0644\u062A\u0642\u062F\u064A\u0645 \u0639\u0631\u0636 \u0633\u0639\u0631 \u2014 ${rfq.rfqNumber}`,
        content: `\u062A\u0645\u062A \u062F\u0639\u0648\u062A\u0643 \u0644\u062A\u0642\u062F\u064A\u0645 \u0639\u0631\u0636 \u0633\u0639\u0631 \u0644\u0640: ${rfq.title}
\u0627\u0644\u0645\u0648\u0639\u062F \u0627\u0644\u0646\u0647\u0627\u0626\u064A: ${new Date(rfq.submissionDeadline).toLocaleDateString("ar-SA")}

\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0644\u0639\u0631\u0636 \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644 \u0648\u062A\u0642\u062F\u064A\u0645 \u0639\u0631\u0636\u0643.`
      })
    });
  } catch {
  }
}
async function notifyAdminAboutNewQuote(rfqNumber, rfqTitle, price) {
  const apiUrl = process.env.BUILT_IN_FORGE_API_URL;
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  if (!apiUrl || !apiKey || !ownerOpenId) return;
  try {
    await fetch(`${apiUrl}/v1/notification/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        open_id: ownerOpenId,
        title: `\u{1F4B0} \u0639\u0631\u0636 \u0633\u0639\u0631 \u062C\u062F\u064A\u062F \u2014 ${rfqNumber}`,
        content: `\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0639\u0631\u0636 \u0633\u0639\u0631 \u062C\u062F\u064A\u062F \u0644\u0640: ${rfqTitle}
\u0627\u0644\u0633\u0639\u0631: ${price.toLocaleString()} \u0631.\u0633

\u064A\u0645\u0643\u0646\u0643 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0639\u0631\u0648\u0636 \u0648\u0645\u0642\u0627\u0631\u0646\u062A\u0647\u0627 \u0645\u0646 \u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645.`
      })
    });
  } catch {
  }
}
function generateFallbackEvaluation(quotesData, minPrice, maxPrice) {
  const priceRange = maxPrice - minPrice || 1;
  const scores = quotesData.map((q) => {
    const priceScore = 30 * (1 - (q.totalPrice - minPrice) / priceRange);
    const deliveryScore = q.deliveryDays ? Math.max(0, 25 - q.deliveryDays / 10) : 12;
    const paymentScore = q.paymentTerms ? 10 : 5;
    const warrantyScore = q.warrantyMonths ? Math.min(10, q.warrantyMonths) : 5;
    const historyScore = Math.min(
      20,
      q.rating / 5 * 15 + q.wonQuotes / Math.max(1, q.totalQuotes) * 5
    );
    const totalScore = Math.round(
      priceScore + deliveryScore + paymentScore + warrantyScore + historyScore
    );
    return {
      quoteId: q.quoteId,
      totalScore,
      breakdown: {
        price: Math.round(priceScore),
        delivery: Math.round(deliveryScore),
        payment: Math.round(paymentScore),
        warranty: Math.round(warrantyScore),
        history: Math.round(historyScore)
      },
      strengths: q.totalPrice === minPrice ? ["\u0623\u0641\u0636\u0644 \u0633\u0639\u0631"] : [],
      weaknesses: q.totalPrice === maxPrice ? ["\u0623\u0639\u0644\u0649 \u0633\u0639\u0631"] : [],
      recommendation: `\u0627\u0644\u0633\u0639\u0631: ${q.totalPrice.toLocaleString()} \u0631.\u0633`
    };
  });
  const winner = scores.reduce((a, b) => a.totalScore > b.totalScore ? a : b);
  return {
    scores,
    winner: {
      quoteId: winner.quoteId,
      reason: "\u0623\u0641\u0636\u0644 \u0646\u0642\u0627\u0637 \u0625\u062C\u0645\u0627\u0644\u064A\u0629 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0627\u0644\u0633\u0639\u0631 \u0648\u0627\u0644\u062A\u0648\u0631\u064A\u062F \u0648\u0627\u0644\u0633\u062C\u0644."
    },
    summary: "\u062A\u0645 \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0645\u0639\u0627\u064A\u064A\u0631 \u0627\u0644\u0633\u0639\u0631 \u0648\u0645\u062F\u0629 \u0627\u0644\u062A\u0648\u0631\u064A\u062F \u0648\u0634\u0631\u0648\u0637 \u0627\u0644\u062F\u0641\u0639 \u0648\u0627\u0644\u0636\u0645\u0627\u0646 \u0648\u0633\u062C\u0644 \u0627\u0644\u0645\u0648\u0631\u062F."
  };
}

// server/comments.router.ts
import { TRPCError as TRPCError4 } from "@trpc/server";
import { z as z4 } from "zod/v4";
import { eq as eq5, and as and4, desc } from "drizzle-orm";
async function notifyAdminAboutComment(rfqNumber, authorName, content) {
  try {
    const ownerOpenId = process.env.OWNER_OPEN_ID;
    if (!ownerOpenId) return;
    const apiUrl = process.env.BUILT_IN_FORGE_API_URL;
    const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
    if (!apiUrl || !apiKey) return;
    await fetch(`${apiUrl}/v1/notification/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        open_id: ownerOpenId,
        title: `\u{1F4AC} \u062A\u0639\u0644\u064A\u0642 \u062C\u062F\u064A\u062F \u0639\u0644\u0649 ${rfqNumber}`,
        content: `\u0645\u0646: ${authorName}
${content.slice(0, 200)}`
      })
    });
  } catch {
  }
}
var commentsRouter = router({
  // ── جلب تعليقات RFQ ────────────────────────────────────────────────────────
  listByRfq: publicProcedure.input(
    z4.object({
      rfqId: z4.number(),
      viewerType: z4.enum(["admin", "supplier"]).default("supplier"),
      supplierId: z4.number().optional(),
      // إذا كان المورد يطلب viewerType=admin، يجب أن يقدم supplierToken صحيح
      supplierToken: z4.string().optional()
    })
  ).query(async ({ input }) => {
    let effectiveViewerType = input.viewerType;
    if (input.viewerType === "admin" && input.supplierId && input.supplierToken) {
      effectiveViewerType = "supplier";
    }
    const comments = await db.query.rfqComments.findMany({
      where: eq5(schema_exports.rfqComments.rfqId, input.rfqId),
      orderBy: [desc(schema_exports.rfqComments.createdAt)]
    });
    const filtered = effectiveViewerType === "supplier" ? comments.filter((c) => c.isInternal === 0) : comments;
    const topLevel = filtered.filter((c) => !c.parentId);
    const replies = filtered.filter((c) => c.parentId);
    return topLevel.map((comment) => ({
      ...comment,
      replies: replies.filter((r) => r.parentId === comment.id)
    }));
  }),
  // ── إضافة تعليق من الإدارة (حماية بـ adminProcedure) ───────────────────────
  addByAdmin: adminProcedure.input(
    z4.object({
      rfqId: z4.number(),
      content: z4.string().min(1).max(2e3),
      isInternal: z4.boolean().default(false),
      parentId: z4.number().optional()
    })
  ).mutation(async ({ input }) => {
    const rfq = await db.query.rfqs.findFirst({
      where: eq5(schema_exports.rfqs.id, input.rfqId)
    });
    if (!rfq)
      throw new TRPCError4({
        code: "NOT_FOUND",
        message: "\u0637\u0644\u0628 \u0627\u0644\u062A\u0633\u0639\u064A\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F"
      });
    const now = Date.now();
    const [result] = await db.insert(schema_exports.rfqComments).values({
      rfqId: input.rfqId,
      authorType: "admin",
      authorId: 0,
      authorName: "\u0627\u0644\u0625\u062F\u0627\u0631\u0629",
      content: input.content.trim(),
      isInternal: input.isInternal ? 1 : 0,
      parentId: input.parentId || null,
      createdAt: now,
      updatedAt: now
    });
    return { id: result.insertId, success: true };
  }),
  // ── إضافة تعليق من المورد ──────────────────────────────────────────────────
  addBySupplier: supplierProcedure.input(
    z4.object({
      rfqId: z4.number(),
      content: z4.string().min(1).max(2e3),
      parentId: z4.number().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const supplierId = ctx.supplier.id;
    const invitation = await db.query.rfqInvitations.findFirst({
      where: and4(
        eq5(schema_exports.rfqInvitations.rfqId, input.rfqId),
        eq5(schema_exports.rfqInvitations.supplierId, supplierId)
      )
    });
    if (!invitation) {
      throw new TRPCError4({
        code: "FORBIDDEN",
        message: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D \u0644\u0643 \u0628\u0627\u0644\u062A\u0639\u0644\u064A\u0642 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628"
      });
    }
    const supplier = await db.query.suppliers.findFirst({
      where: eq5(schema_exports.suppliers.id, supplierId)
    });
    if (!supplier || supplier.status !== "active") {
      throw new TRPCError4({ code: "FORBIDDEN", message: "\u062D\u0633\u0627\u0628\u0643 \u063A\u064A\u0631 \u0645\u0641\u0639\u0651\u0644" });
    }
    const rfq = await db.query.rfqs.findFirst({
      where: eq5(schema_exports.rfqs.id, input.rfqId)
    });
    const now = Date.now();
    const [result] = await db.insert(schema_exports.rfqComments).values({
      rfqId: input.rfqId,
      authorType: "supplier",
      authorId: supplierId,
      authorName: supplier.companyName,
      content: input.content.trim(),
      isInternal: 0,
      parentId: input.parentId || null,
      createdAt: now,
      updatedAt: now
    });
    if (rfq) {
      notifyAdminAboutComment(
        rfq.rfqNumber,
        supplier.companyName,
        input.content
      );
    }
    return { id: result.insertId, success: true };
  }),
  // ── حذف تعليق (الإدارة فقط) ────────────────────────────────────────────────
  delete: adminProcedure.input(z4.object({ commentId: z4.number() })).mutation(async ({ input }) => {
    const comment = await db.query.rfqComments.findFirst({
      where: eq5(schema_exports.rfqComments.id, input.commentId)
    });
    if (!comment)
      throw new TRPCError4({
        code: "NOT_FOUND",
        message: "\u0627\u0644\u062A\u0639\u0644\u064A\u0642 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F"
      });
    await db.delete(schema_exports.rfqComments).where(eq5(schema_exports.rfqComments.parentId, input.commentId));
    await db.delete(schema_exports.rfqComments).where(eq5(schema_exports.rfqComments.id, input.commentId));
    return { success: true };
  }),
  // ── عدد التعليقات من الموردين ──────────────────────────────────────────────
  countSupplierComments: publicProcedure.input(z4.object({ rfqId: z4.number() })).query(async ({ input }) => {
    const comments = await db.query.rfqComments.findMany({
      where: and4(
        eq5(schema_exports.rfqComments.rfqId, input.rfqId),
        eq5(schema_exports.rfqComments.authorType, "supplier")
      )
    });
    return { count: comments.length };
  })
});

// server/productOptions.router.ts
import { TRPCError as TRPCError5 } from "@trpc/server";
import { z as z5 } from "zod/v4";
import { eq as eq6, desc as desc2 } from "drizzle-orm";
import * as XLSX from "xlsx";
function generateOrderNumber() {
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  const rand = Math.floor(Math.random() * 9e3) + 1e3;
  return `SND-${year}-D${rand}`;
}
function fuzzyMatch(input, options) {
  if (!input || !options.length) return null;
  const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, "");
  const normInput = norm(input);
  let match = options.find(
    (o) => norm(o.label) === normInput || o.labelEn && norm(o.labelEn) === normInput
  );
  if (match) return match;
  match = options.find(
    (o) => normInput.includes(norm(o.label)) || norm(o.label).includes(normInput) || o.labelEn && (normInput.includes(norm(o.labelEn)) || norm(o.labelEn).includes(normInput))
  );
  if (match) return match;
  match = options.find((o) => norm(o.id) === normInput);
  return match || null;
}
async function fetchParsedOptions() {
  const defaults = {
    materials: [
      { id: "wpc", label: "WPC", enabled: true },
      { id: "wood", label: "\u062E\u0634\u0628", enabled: true },
      { id: "iron", label: "\u062D\u062F\u064A\u062F", enabled: true },
      { id: "aluminum", label: "\u0623\u0644\u0645\u0646\u064A\u0648\u0645", enabled: true },
      { id: "glass", label: "\u0632\u062C\u0627\u062C", enabled: true }
    ],
    colors: [
      { id: "white", label: "\u0623\u0628\u064A\u0636", hex: "#F5F5F0", enabled: true },
      { id: "beige", label: "\u0628\u064A\u062C", hex: "#E8DFD0", enabled: true },
      { id: "dark_walnut", label: "\u062C\u0648\u0632 \u062F\u0627\u0643\u0646", hex: "#3D2B1F", enabled: true },
      { id: "charcoal", label: "\u0641\u062D\u0645\u064A", hex: "#2D2D2D", enabled: true },
      { id: "grey", label: "\u0631\u0645\u0627\u062F\u064A", hex: "#8E8E8E", enabled: true }
    ],
    shapes: [],
    dimGroups: [],
    allSections: []
  };
  const optionsRow = await db.query.productOptions.findFirst({
    orderBy: [desc2(schema_exports.productOptions.updatedAt)]
  });
  if (!optionsRow) return defaults;
  try {
    const sections = JSON.parse(optionsRow.sectionsJson);
    const enabledSections = sections.filter((s) => s.enabled);
    const doorTypeSection = enabledSections.find((s) => s.id === "door_type");
    const colorSection = enabledSections.find((s) => s.id === "door_color");
    const shapeSection = enabledSections.find((s) => s.id === "door_shape");
    const dimSection = enabledSections.find((s) => s.id === "dimensions");
    const materials = doorTypeSection ? doorTypeSection.groups.find((g) => g.id === "material")?.values.filter((v) => v.enabled) ?? defaults.materials : defaults.materials;
    const colors = colorSection ? colorSection.groups.find((g) => g.id === "color_choice")?.values.filter((v) => v.enabled) ?? defaults.colors : defaults.colors;
    const shapes = shapeSection ? shapeSection.groups.find((g) => g.id === "style")?.values.filter((v) => v.enabled) ?? [] : [];
    const dimGroups = dimSection ? dimSection.groups.filter((g) => g.enabled) : [];
    return {
      materials,
      colors,
      shapes,
      dimGroups,
      allSections: enabledSections
    };
  } catch {
    return defaults;
  }
}
function buildOptionsSummary(opts) {
  const lines = [];
  lines.push(
    `\u0645\u0648\u0627\u062F \u0627\u0644\u0628\u0627\u0628 \u0627\u0644\u0645\u062A\u0627\u062D\u0629: [${opts.materials.map((m) => m.label).join(", ")}]`
  );
  lines.push(
    `\u0623\u0644\u0648\u0627\u0646 \u0627\u0644\u0628\u0627\u0628 \u0627\u0644\u0645\u062A\u0627\u062D\u0629: [${opts.colors.filter((c) => c.id !== "custom").map((c) => c.label).join(", ")}]`
  );
  if (opts.shapes.length) {
    lines.push(
      `\u0623\u0634\u0643\u0627\u0644 \u0627\u0644\u0628\u0627\u0628 \u0627\u0644\u0645\u062A\u0627\u062D\u0629: [${opts.shapes.map((s) => s.label).join(", ")}]`
    );
  }
  if (opts.dimGroups.length) {
    const standardGroup = opts.dimGroups.find((g) => g.id === "standard_sizes");
    if (standardGroup?.values.length) {
      lines.push(
        `\u0627\u0644\u0645\u0642\u0627\u0633\u0627\u062A \u0627\u0644\u0642\u064A\u0627\u0633\u064A\u0629: [${standardGroup.values.filter((v) => v.enabled).map((v) => v.label).join(", ")}]`
      );
    }
    const customGroup = opts.dimGroups.find((g) => g.id === "custom_dimensions");
    if (customGroup) {
      lines.push(
        `\u0646\u0637\u0627\u0642 \u0627\u0644\u0639\u0631\u0636: ${customGroup.min ?? 50} - ${customGroup.max ?? 200} \u0633\u0645`
      );
    }
  } else {
    lines.push("\u0646\u0637\u0627\u0642 \u0627\u0644\u0639\u0631\u0636: 50 - 200 \u0633\u0645");
    lines.push("\u0646\u0637\u0627\u0642 \u0627\u0644\u0627\u0631\u062A\u0641\u0627\u0639: 150 - 300 \u0633\u0645");
  }
  return lines.join("\n");
}
var productOptionsRouter = router({
  // جلب الخيارات الحالية (يُستخدم في نموذج الموزع)
  get: publicProcedure.query(async () => {
    const row = await db.query.productOptions.findFirst({
      orderBy: [desc2(schema_exports.productOptions.updatedAt)]
    });
    if (!row) return null;
    try {
      return JSON.parse(row.sectionsJson);
    } catch {
      return null;
    }
  }),
  // حفظ الخيارات (يُستخدم من لوحة الإدارة عند التعديل)
  save: adminProcedure.input(
    z5.object({
      sectionsJson: z5.string().min(1),
      updatedBy: z5.string().default("admin")
    })
  ).mutation(async ({ input }) => {
    const now = Date.now();
    try {
      JSON.parse(input.sectionsJson);
    } catch {
      throw new TRPCError5({
        code: "BAD_REQUEST",
        message: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629"
      });
    }
    const existing = await db.query.productOptions.findFirst();
    if (existing) {
      await db.update(schema_exports.productOptions).set({
        sectionsJson: input.sectionsJson,
        updatedAt: now,
        updatedBy: input.updatedBy
      }).where(eq6(schema_exports.productOptions.id, existing.id));
    } else {
      await db.insert(schema_exports.productOptions).values({
        sectionsJson: input.sectionsJson,
        updatedAt: now,
        updatedBy: input.updatedBy
      });
    }
    return { success: true };
  })
});
var distributorOrdersRouter = router({
  // إنشاء طلب يدوي
  create: distributorProcedure.input(
    z5.object({
      orderType: z5.enum(["purchase_order", "rfq", "sample_request"]).default("purchase_order"),
      items: z5.array(
        z5.object({
          doorType: z5.string(),
          doorTypeEn: z5.string().optional(),
          woodType: z5.string().optional(),
          woodTypeEn: z5.string().optional(),
          color: z5.string().optional(),
          colorEn: z5.string().optional(),
          colorHex: z5.string().optional(),
          width: z5.number(),
          height: z5.number(),
          thickness: z5.number().optional(),
          quantity: z5.number().min(1),
          unitPrice: z5.number().default(0),
          notes: z5.string().optional(),
          selections: z5.record(z5.string(), z5.string()).optional()
        })
      ),
      totalAmount: z5.number().default(0),
      notes: z5.string().optional(),
      source: z5.enum(["manual", "excel_upload", "api"]).default("manual"),
      excelFileName: z5.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const now = Date.now();
    const orderNumber = generateOrderNumber();
    const [result] = await db.insert(schema_exports.distributorOrders).values({
      orderNumber,
      distributorId: String(ctx.distributor.id),
      distributorName: ctx.distributor.name,
      distributorCompany: ctx.distributor.company ?? null,
      orderType: input.orderType,
      items: JSON.stringify(input.items),
      totalAmount: input.totalAmount,
      status: "pending",
      paymentStatus: "unpaid",
      notes: input.notes,
      source: input.source,
      excelFileName: input.excelFileName,
      createdAt: now,
      updatedAt: now
    });
    const orderId = result.insertId;
    try {
      const ownerOpenId = process.env.OWNER_OPEN_ID;
      const apiUrl = process.env.BUILT_IN_FORGE_API_URL;
      const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
      if (ownerOpenId && apiUrl && apiKey) {
        const typeLabel = input.orderType === "purchase_order" ? "\u0623\u0645\u0631 \u0634\u0631\u0627\u0621" : input.orderType === "rfq" ? "\u0637\u0644\u0628 \u062A\u0633\u0639\u064A\u0631" : "\u0637\u0644\u0628 \u0639\u064A\u0646\u0627\u062A";
        await fetch(`${apiUrl}/v1/notification/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            open_id: ownerOpenId,
            title: `\u{1F4E6} ${typeLabel} \u062C\u062F\u064A\u062F \u0645\u0646 \u0645\u0648\u0632\u0639 \u2014 ${orderNumber}`,
            content: `\u0627\u0644\u0645\u0648\u0632\u0639: ${ctx.distributor.name} (${ctx.distributor.company || ""})
\u0639\u062F\u062F \u0627\u0644\u0628\u0646\u0648\u062F: ${input.items.length}
\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A: ${input.totalAmount.toLocaleString()} \u0631.\u0633
\u0627\u0644\u0645\u0635\u062F\u0631: ${input.source === "excel_upload" ? "\u0631\u0641\u0639 Excel" : "\u064A\u062F\u0648\u064A"}`
          })
        });
      }
    } catch {
    }
    return { id: orderId, orderNumber, success: true };
  }),
  // جلب طلبات الموزع (للإدارة)
  list: adminProcedure.input(
    z5.object({
      distributorId: z5.string().optional(),
      status: z5.string().optional()
    }).optional()
  ).query(async ({ input }) => {
    const orders = await db.query.distributorOrders.findMany({
      orderBy: [desc2(schema_exports.distributorOrders.createdAt)],
      where: input?.distributorId ? eq6(schema_exports.distributorOrders.distributorId, input.distributorId) : void 0
    });
    return orders.map((o) => ({
      ...o,
      items: (() => {
        try {
          return JSON.parse(o.items);
        } catch {
          return [];
        }
      })()
    }));
  }),
  // تحديث حالة الطلب
  updateStatus: adminProcedure.input(
    z5.object({
      id: z5.number(),
      status: z5.enum([
        "draft",
        "pending",
        "confirmed",
        "manufacturing",
        "shipped",
        "delivered",
        "cancelled"
      ])
    })
  ).mutation(async ({ input }) => {
    await db.update(schema_exports.distributorOrders).set({ status: input.status, updatedAt: Date.now() }).where(eq6(schema_exports.distributorOrders.id, input.id));
    return { success: true };
  }),
  updatePaymentStatus: adminProcedure.input(
    z5.object({
      orderId: z5.number(),
      paymentStatus: z5.enum(["unpaid", "partial", "paid"])
    })
  ).mutation(async ({ input }) => {
    await db.update(schema_exports.distributorOrders).set({ paymentStatus: input.paymentStatus, updatedAt: Date.now() }).where(eq6(schema_exports.distributorOrders.id, input.orderId));
    return { success: true };
  }),
  // ── رفع وتحليل ملف Excel ──────────────────────────────────────────────────
  parseExcel: publicProcedure.input(
    z5.object({
      base64: z5.string(),
      fileName: z5.string(),
      distributorId: z5.string(),
      distributorName: z5.string(),
      distributorCompany: z5.string().optional(),
      orderType: z5.enum(["purchase_order", "rfq", "sample_request"]).default("purchase_order")
    })
  ).mutation(async ({ input }) => {
    let workbook;
    try {
      const buffer = Buffer.from(input.base64, "base64");
      workbook = XLSX.read(buffer, { type: "buffer" });
    } catch {
      throw new TRPCError5({
        code: "BAD_REQUEST",
        message: "\u062A\u0639\u0630\u0651\u0631 \u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0645\u0644\u0641. \u062A\u0623\u0643\u062F \u0623\u0646\u0647 \u0645\u0644\u0641 Excel \u0635\u062D\u064A\u062D (.xlsx, .xls, .csv)"
      });
    }
    const sheetName = workbook.SheetNames[0];
    if (!sheetName)
      throw new TRPCError5({ code: "BAD_REQUEST", message: "\u0627\u0644\u0645\u0644\u0641 \u0641\u0627\u0631\u063A" });
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: ""
    });
    if (rawData.length < 2) {
      throw new TRPCError5({
        code: "BAD_REQUEST",
        message: "\u0627\u0644\u0645\u0644\u0641 \u0644\u0627 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0628\u064A\u0627\u0646\u0627\u062A \u0643\u0627\u0641\u064A\u0629"
      });
    }
    const headers = rawData[0];
    const rows = rawData.slice(1).filter((r) => r.some((c) => c !== ""));
    const csvText = [
      headers.join(" | "),
      ...rows.map((r) => r.join(" | "))
    ].join("\n");
    const opts = await fetchParsedOptions();
    const optionsSummary = buildOptionsSummary(opts);
    const customDimGroup = opts.dimGroups.find(
      (g) => g.id === "custom_dimensions"
    );
    const widthMin = customDimGroup?.min ?? 50;
    const widthMax = customDimGroup?.max ?? 200;
    const heightMin = 150;
    const heightMax = 300;
    let parsedItems = [];
    let aiError = null;
    try {
      const systemPrompt = `\u0623\u0646\u062A \u0645\u0633\u0627\u0639\u062F \u0645\u062A\u062E\u0635\u0635 \u0641\u064A \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0628\u064A\u0627\u0646\u0627\u062A \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0623\u0628\u0648\u0627\u0628 \u0645\u0646 \u0645\u0644\u0641\u0627\u062A Excel.
\u0645\u0647\u0645\u062A\u0643: \u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0625\u0631\u062C\u0627\u0639 \u0645\u0635\u0641\u0648\u0641\u0629 JSON \u0645\u0646 \u0627\u0644\u0628\u0646\u0648\u062F.

\u062E\u064A\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u0646\u062A\u062C \u0627\u0644\u0645\u062A\u0627\u062D\u0629 \u0641\u064A \u0627\u0644\u0646\u0638\u0627\u0645:
${optionsSummary}

\u062A\u0639\u0644\u064A\u0645\u0627\u062A \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629:
- \u0644\u062D\u0642\u0644 "woodType" (\u0645\u0627\u062F\u0629 \u0627\u0644\u0628\u0627\u0628): \u0637\u0627\u0628\u0642 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u062F\u062E\u0644\u0629 \u0645\u0639 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u0645\u062A\u0627\u062D\u0629 \u0623\u0639\u0644\u0627\u0647. \u0625\u0630\u0627 \u0643\u0627\u0646\u062A \u0627\u0644\u0642\u064A\u0645\u0629 \u0642\u0631\u064A\u0628\u0629 \u0645\u0646 \u0623\u062D\u062F \u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A (\u0645\u062B\u0644\u0627\u064B "\u062E\u0634\u0628 \u0637\u0628\u064A\u0639\u064A" \u2192 "\u062E\u0634\u0628")\u060C \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u062E\u064A\u0627\u0631 \u0627\u0644\u0645\u062A\u0627\u062D. \u0625\u0630\u0627 \u0644\u0645 \u062A\u062C\u062F \u062A\u0637\u0627\u0628\u0642\u0627\u064B\u060C \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0642\u064A\u0645\u0629 \u0643\u0645\u0627 \u0647\u064A \u0648\u0636\u0639 valid=false.
- \u0644\u062D\u0642\u0644 "color" (\u0627\u0644\u0644\u0648\u0646): \u0637\u0627\u0628\u0642 \u0645\u0639 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0623\u0644\u0648\u0627\u0646 \u0627\u0644\u0645\u062A\u0627\u062D\u0629. \u0625\u0630\u0627 \u0643\u0627\u0646\u062A \u0627\u0644\u0642\u064A\u0645\u0629 \u0642\u0631\u064A\u0628\u0629 (\u0645\u062B\u0644\u0627\u064B "\u0628\u0646\u064A \u062F\u0627\u0643\u0646" \u2192 "\u062C\u0648\u0632 \u062F\u0627\u0643\u0646")\u060C \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u062E\u064A\u0627\u0631 \u0627\u0644\u0645\u062A\u0627\u062D.
- \u0644\u062D\u0642\u0644 "doorType" (\u0646\u0648\u0639 \u0627\u0644\u0628\u0627\u0628): \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0648\u062C\u0648\u062F\u0629 \u0641\u064A \u0627\u0644\u0645\u0644\u0641 \u0643\u0645\u0627 \u0647\u064A.
- \u0627\u0644\u0639\u0631\u0636 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0628\u064A\u0646 ${widthMin} \u0648${widthMax} \u0633\u0645.
- \u0627\u0644\u0627\u0631\u062A\u0641\u0627\u0639 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0628\u064A\u0646 ${heightMin} \u0648${heightMax} \u0633\u0645.
- \u0627\u0644\u0633\u0645\u0627\u0643\u0629 \u0628\u064A\u0646 3 \u06488 \u0633\u0645 (\u0627\u0641\u062A\u0631\u0627\u0636\u064A: 4).
- \u0627\u0644\u0643\u0645\u064A\u0629 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0631\u0642\u0645\u0627\u064B \u0645\u0648\u062C\u0628\u0627\u064B.
- \u0625\u0630\u0627 \u0643\u0627\u0646\u062A \u0627\u0644\u0642\u064A\u0645\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629 \u0623\u0648 \u063A\u064A\u0631 \u0648\u0627\u0636\u062D\u0629\u060C \u0636\u0639 null.
- \u0623\u0631\u062C\u0639 \u0641\u0642\u0637 JSON \u0628\u062F\u0648\u0646 \u0623\u064A \u0646\u0635 \u0625\u0636\u0627\u0641\u064A.`;
      const userPrompt = `\u0628\u064A\u0627\u0646\u0627\u062A Excel:
${csvText}

\u0623\u0631\u062C\u0639 \u0645\u0635\u0641\u0648\u0641\u0629 JSON \u0628\u0647\u0630\u0627 \u0627\u0644\u0634\u0643\u0644:
[{
  "doorType": "\u0646\u0648\u0639 \u0627\u0644\u0628\u0627\u0628",
  "woodType": "\u0645\u0627\u062F\u0629 \u0627\u0644\u0628\u0627\u0628 (\u0645\u0646 \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u062A\u0627\u062D\u0629)",
  "color": "\u0627\u0644\u0644\u0648\u0646 (\u0645\u0646 \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u062A\u0627\u062D\u0629)",
  "width": 90,
  "height": 210,
  "thickness": 4,
  "quantity": 1,
  "unitPrice": 0,
  "notes": "\u0645\u0644\u0627\u062D\u0638\u0627\u062A",
  "valid": true,
  "error": null,
  "selections": {}
}]`;
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "excel_items",
            strict: true,
            schema: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      doorType: { type: "string" },
                      woodType: { type: ["string", "null"] },
                      color: { type: ["string", "null"] },
                      width: { type: "number" },
                      height: { type: "number" },
                      thickness: { type: "number" },
                      quantity: { type: "number" },
                      unitPrice: { type: "number" },
                      notes: { type: ["string", "null"] },
                      valid: { type: "boolean" },
                      error: { type: ["string", "null"] },
                      selections: {
                        type: "object",
                        additionalProperties: { type: "string" }
                      }
                    },
                    required: [
                      "doorType",
                      "width",
                      "height",
                      "thickness",
                      "quantity",
                      "unitPrice",
                      "valid",
                      "error",
                      "selections"
                    ],
                    additionalProperties: false
                  }
                }
              },
              required: ["items"],
              additionalProperties: false
            }
          }
        }
      });
      const content = response.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        parsedItems = (parsed.items || []).map((item, idx) => {
          const matchedMaterial = item.woodType ? fuzzyMatch(item.woodType, opts.materials) : null;
          const matchedColor = item.color ? fuzzyMatch(item.color, opts.colors) : null;
          const widthOk = item.width >= widthMin && item.width <= widthMax;
          const heightOk = item.height >= heightMin && item.height <= heightMax;
          const qtyOk = item.quantity > 0;
          const materialOk = !item.woodType || matchedMaterial !== null;
          const colorOk = !item.color || matchedColor !== null;
          let errorMsg = item.error;
          if (!widthOk)
            errorMsg = `\u0627\u0644\u0639\u0631\u0636 ${item.width} \u0633\u0645 \u062E\u0627\u0631\u062C \u0627\u0644\u0646\u0637\u0627\u0642 (${widthMin}-${widthMax})`;
          else if (!heightOk)
            errorMsg = `\u0627\u0644\u0627\u0631\u062A\u0641\u0627\u0639 ${item.height} \u0633\u0645 \u062E\u0627\u0631\u062C \u0627\u0644\u0646\u0637\u0627\u0642 (${heightMin}-${heightMax})`;
          else if (!qtyOk) errorMsg = "\u0627\u0644\u0643\u0645\u064A\u0629 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0623\u0643\u0628\u0631 \u0645\u0646 \u0635\u0641\u0631";
          else if (!materialOk)
            errorMsg = `\u0645\u0627\u062F\u0629 \u0627\u0644\u0628\u0627\u0628 "${item.woodType}" \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629. \u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A: ${opts.materials.map((m) => m.label).join(", ")}`;
          else if (!colorOk)
            errorMsg = `\u0627\u0644\u0644\u0648\u0646 "${item.color}" \u063A\u064A\u0631 \u0645\u062A\u0627\u062D. \u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A: ${opts.colors.filter((c) => c.id !== "custom").map((c) => c.label).join(", ")}`;
          const isValid = item.valid && widthOk && heightOk && qtyOk && materialOk && colorOk;
          return {
            id: `excel-${idx}-${Date.now()}`,
            doorType: item.doorType || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F",
            woodType: matchedMaterial ? matchedMaterial.label : item.woodType || "",
            woodTypeId: matchedMaterial?.id || null,
            color: matchedColor ? matchedColor.label : item.color || "",
            colorId: matchedColor?.id || null,
            colorHex: matchedColor?.hex || "#C8A96E",
            width: item.width,
            height: item.height,
            thickness: item.thickness || 4,
            quantity: item.quantity,
            unitPrice: item.unitPrice || 0,
            notes: item.notes || "",
            selections: item.selections || {},
            valid: isValid,
            error: isValid ? null : errorMsg,
            // بيانات المطابقة للعرض في الواجهة
            matchInfo: {
              materialMatched: matchedMaterial !== null,
              colorMatched: matchedColor !== null,
              originalMaterial: item.woodType,
              originalColor: item.color
            }
          };
        });
      }
    } catch (err) {
      aiError = "\u062A\u0639\u0630\u0651\u0631 \u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u0644\u0641 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A. \u064A\u0631\u062C\u0649 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u064A\u062F\u0648\u064A\u0627\u064B.";
      parsedItems = rows.slice(0, 100).map((row, idx) => {
        const get = (i) => String(row[i] || "").trim();
        const num = (i, def = 0) => parseFloat(get(i)) || def;
        const rawMaterial = get(1);
        const rawColor = get(2);
        const matchedMaterial = rawMaterial ? fuzzyMatch(rawMaterial, opts.materials) : null;
        const matchedColor = rawColor ? fuzzyMatch(rawColor, opts.colors) : null;
        return {
          id: `excel-${idx}-${Date.now()}`,
          doorType: get(0) || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F",
          woodType: matchedMaterial ? matchedMaterial.label : rawMaterial,
          woodTypeId: matchedMaterial?.id || null,
          color: matchedColor ? matchedColor.label : rawColor,
          colorId: matchedColor?.id || null,
          colorHex: matchedColor?.hex || "#C8A96E",
          width: num(3, 90),
          height: num(4, 210),
          thickness: num(5, 4),
          quantity: Math.max(1, num(6, 1)),
          unitPrice: num(7, 0),
          notes: get(8) || "",
          selections: {},
          valid: true,
          error: null,
          matchInfo: {
            materialMatched: matchedMaterial !== null,
            colorMatched: matchedColor !== null,
            originalMaterial: rawMaterial,
            originalColor: rawColor
          }
        };
      });
    }
    return {
      items: parsedItems,
      totalRows: rows.length,
      validCount: parsedItems.filter((i) => i.valid).length,
      errorCount: parsedItems.filter((i) => !i.valid).length,
      aiError,
      fileName: input.fileName,
      // إرجاع الخيارات المتاحة للواجهة لاستخدامها في نموذج التعديل
      availableOptions: {
        materials: opts.materials.map((m) => ({ id: m.id, label: m.label })),
        colors: opts.colors.map((c) => ({
          id: c.id,
          label: c.label,
          hex: c.hex
        })),
        shapes: opts.shapes.map((s) => ({ id: s.id, label: s.label }))
      }
    };
  }),
  // ── توليد قالب Excel ديناميكي ─────────────────────────────────────────────
  generateTemplate: publicProcedure.mutation(async () => {
    const opts = await fetchParsedOptions();
    const materials = opts.materials.map((m) => m.label);
    const colors = opts.colors.filter((c) => c.id !== "custom").map((c) => c.label);
    const shapes = opts.shapes.map((s) => s.label);
    const customDimGroup = opts.dimGroups.find(
      (g) => g.id === "custom_dimensions"
    );
    const standardGroup = opts.dimGroups.find((g) => g.id === "standard_sizes");
    const widthMin = customDimGroup?.min ?? 50;
    const widthMax = customDimGroup?.max ?? 200;
    const standardSizes = standardGroup?.values.filter((v) => v.enabled).map((v) => v.label) ?? ["90\xD7210 \u0633\u0645", "100\xD7210 \u0633\u0645", "80\xD7200 \u0633\u0645"];
    const wb = XLSX.utils.book_new();
    const mainData = [
      // رأس الجدول
      [
        "\u0646\u0648\u0639 \u0627\u0644\u0628\u0627\u0628 *",
        "\u0645\u0627\u062F\u0629 \u0627\u0644\u0628\u0627\u0628",
        "\u0627\u0644\u0644\u0648\u0646",
        "\u0627\u0644\u0639\u0631\u0636 (\u0633\u0645) *",
        "\u0627\u0644\u0627\u0631\u062A\u0641\u0627\u0639 (\u0633\u0645) *",
        "\u0627\u0644\u0633\u0645\u0627\u0643\u0629 (\u0633\u0645)",
        "\u0627\u0644\u0643\u0645\u064A\u0629 *",
        "\u0633\u0639\u0631 \u0627\u0644\u0648\u062D\u062F\u0629",
        "\u0645\u0644\u0627\u062D\u0638\u0627\u062A"
      ],
      // صفوف مثال
      [
        materials[0] ?? "WPC",
        materials[0] ?? "WPC",
        colors[0] ?? "\u0623\u0628\u064A\u0636",
        90,
        210,
        4,
        5,
        0,
        "\u0645\u062B\u0627\u0644: \u0645\u0634\u0631\u0648\u0639 \u0641\u064A\u0644\u0627 \u0627\u0644\u0631\u064A\u0627\u0636"
      ],
      [
        materials[1] ?? "\u062E\u0634\u0628",
        materials[1] ?? "\u062E\u0634\u0628",
        colors[1] ?? "\u062C\u0648\u0632 \u062F\u0627\u0643\u0646",
        100,
        210,
        4,
        2,
        0,
        ""
      ],
      ["", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", ""]
    ];
    const ws = XLSX.utils.aoa_to_sheet(mainData);
    ws["!cols"] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, "\u0627\u0644\u0637\u0644\u0628");
    const maxRows = Math.max(
      materials.length,
      colors.length,
      shapes.length,
      standardSizes.length
    );
    const refHeaders = [
      "\u0645\u0648\u0627\u062F \u0627\u0644\u0628\u0627\u0628 \u0627\u0644\u0645\u062A\u0627\u062D\u0629",
      "\u0627\u0644\u0623\u0644\u0648\u0627\u0646 \u0627\u0644\u0645\u062A\u0627\u062D\u0629",
      "\u0623\u0634\u0643\u0627\u0644 \u0627\u0644\u0628\u0627\u0628",
      "\u0627\u0644\u0645\u0642\u0627\u0633\u0627\u062A \u0627\u0644\u0642\u064A\u0627\u0633\u064A\u0629",
      "\u0645\u0644\u0627\u062D\u0638\u0627\u062A"
    ];
    const refData = [refHeaders];
    for (let i = 0; i < maxRows; i++) {
      refData.push([
        materials[i] ?? "",
        colors[i] ?? "",
        shapes[i] ?? "",
        standardSizes[i] ?? "",
        i === 0 ? `\u0627\u0644\u0639\u0631\u0636: ${widthMin}-${widthMax} \u0633\u0645` : i === 1 ? "\u0627\u0644\u0627\u0631\u062A\u0641\u0627\u0639: 150-300 \u0633\u0645" : i === 2 ? "\u0627\u0644\u0633\u0645\u0627\u0643\u0629: 3-8 \u0633\u0645" : ""
      ]);
    }
    const wsRef = XLSX.utils.aoa_to_sheet(refData);
    wsRef["!cols"] = [
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
      { wch: 20 },
      { wch: 28 }
    ];
    XLSX.utils.book_append_sheet(wb, wsRef, "\u0627\u0644\u0642\u064A\u0645 \u0627\u0644\u0645\u0631\u062C\u0639\u064A\u0629");
    const instrData = [
      ["\u062A\u0639\u0644\u064A\u0645\u0627\u062A \u0645\u0644\u0621 \u0627\u0644\u0646\u0645\u0648\u0630\u062C"],
      [""],
      ["\u0627\u0644\u062D\u0642\u0648\u0644 \u0627\u0644\u0625\u0644\u0632\u0627\u0645\u064A\u0629 (*):", "\u0646\u0648\u0639 \u0627\u0644\u0628\u0627\u0628\u060C \u0627\u0644\u0639\u0631\u0636\u060C \u0627\u0644\u0627\u0631\u062A\u0641\u0627\u0639\u060C \u0627\u0644\u0643\u0645\u064A\u0629"],
      ["\u0645\u0627\u062F\u0629 \u0627\u0644\u0628\u0627\u0628:", `\u0627\u062E\u062A\u0631 \u0645\u0646: ${materials.join(", ")}`],
      ["\u0627\u0644\u0644\u0648\u0646:", `\u0627\u062E\u062A\u0631 \u0645\u0646: ${colors.join(", ")}`],
      ["\u0627\u0644\u0639\u0631\u0636:", `\u0628\u064A\u0646 ${widthMin} \u0648${widthMax} \u0633\u0645`],
      ["\u0627\u0644\u0627\u0631\u062A\u0641\u0627\u0639:", "\u0628\u064A\u0646 150 \u0648300 \u0633\u0645"],
      ["\u0627\u0644\u0633\u0645\u0627\u0643\u0629:", "\u0628\u064A\u0646 3 \u06488 \u0633\u0645 (\u0627\u0641\u062A\u0631\u0627\u0636\u064A: 4)"],
      ["\u0627\u0644\u0643\u0645\u064A\u0629:", "\u0631\u0642\u0645 \u0645\u0648\u062C\u0628"],
      [""],
      ["\u0645\u0644\u0627\u062D\u0638\u0629:", "\u064A\u0645\u0643\u0646 \u062A\u0631\u0643 \u062D\u0642\u0644 \u0627\u0644\u0633\u0639\u0631 \u0641\u0627\u0631\u063A\u0627\u064B \u0648\u0633\u064A\u062A\u0645 \u062A\u062D\u062F\u064A\u062F\u0647 \u0645\u0646 \u0642\u0650\u0628\u0644 \u0627\u0644\u0625\u062F\u0627\u0631\u0629"]
    ];
    const wsInstr = XLSX.utils.aoa_to_sheet(instrData);
    wsInstr["!cols"] = [{ wch: 20 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsInstr, "\u0627\u0644\u062A\u0639\u0644\u064A\u0645\u0627\u062A");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const base64 = buffer.toString("base64");
    return { base64, fileName: "sindian_order_template.xlsx" };
  })
});

// server/payments.router.ts
import { z as z6 } from "zod/v4";
import { eq as eq7, desc as desc3, and as and5 } from "drizzle-orm";
var paymentMethodEnum = z6.enum([
  "cash",
  "bank_transfer",
  "cheque",
  "card",
  "other"
]);
var paymentStatusEnum = z6.enum(["confirmed", "pending", "cancelled"]);
async function recomputeOrderPaymentStatus(orderNumber) {
  const order = await db.query.distributorOrders.findFirst({
    where: eq7(schema_exports.distributorOrders.orderNumber, orderNumber)
  });
  if (!order) return;
  const payments = await db.query.distributorPayments.findMany({
    where: and5(
      eq7(schema_exports.distributorPayments.orderNumber, orderNumber),
      eq7(schema_exports.distributorPayments.status, "confirmed")
    )
  });
  const totalPaid = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
  const orderTotal = order.totalAmount ?? 0;
  let newStatus;
  if (totalPaid <= 0) newStatus = "unpaid";
  else if (totalPaid < orderTotal) newStatus = "partial";
  else newStatus = "paid";
  await db.update(schema_exports.distributorOrders).set({ paymentStatus: newStatus }).where(eq7(schema_exports.distributorOrders.orderNumber, orderNumber));
}
var paymentsRouter = router({
  // ── List payments (Admin) ────────────────────────────────
  list: adminProcedure.input(z6.object({ distributorId: z6.number().int() })).query(async ({ input }) => {
    return db.query.distributorPayments.findMany({
      where: eq7(schema_exports.distributorPayments.distributorId, input.distributorId),
      orderBy: [desc3(schema_exports.distributorPayments.paymentDate)]
    });
  }),
  // ── Create payment (Admin) ───────────────────────────────
  create: adminProcedure.input(
    z6.object({
      distributorId: z6.number().int(),
      orderNumber: z6.string().min(1).optional(),
      amount: z6.number().nonnegative(),
      method: paymentMethodEnum.default("bank_transfer"),
      reference: z6.string().optional(),
      note: z6.string().optional(),
      paymentDate: z6.string().optional(),
      // ISO date string
      status: paymentStatusEnum.default("confirmed")
    })
  ).mutation(async ({ input }) => {
    const [inserted] = await db.insert(schema_exports.distributorPayments).values({
      distributorId: input.distributorId,
      orderNumber: input.orderNumber ?? null,
      amount: input.amount,
      method: input.method,
      reference: input.reference ?? null,
      note: input.note ?? null,
      paymentDate: input.paymentDate ? new Date(input.paymentDate) : /* @__PURE__ */ new Date(),
      status: input.status
    }).$returningId();
    if (input.orderNumber) {
      await recomputeOrderPaymentStatus(input.orderNumber);
    }
    return { success: true, id: inserted.id };
  }),
  // ── My payments (Distributor, read-only) ─────────────────
  myPayments: distributorProcedure.query(async ({ ctx }) => {
    return db.query.distributorPayments.findMany({
      where: eq7(schema_exports.distributorPayments.distributorId, ctx.distributor.id),
      orderBy: [desc3(schema_exports.distributorPayments.paymentDate)]
    });
  })
});

// server/zatca.router.ts
import { z as z7 } from "zod/v4";
import { eq as eq9, desc as desc5, sql as sql2 } from "drizzle-orm";
import QRCode from "qrcode";
import { v4 as uuidv42 } from "uuid";
import crypto2 from "crypto";

// server/zatca.service.ts
import crypto from "crypto";
import { eq as eq8, desc as desc4, and as and6, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
var ZATCA_API_BASE = {
  sandbox: "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal",
  production: "https://gw-fatoora.zatca.gov.sa/e-invoicing/core"
};
var ZATCA_FIRST_PIH = "NWZlY2ViYjZkYTIzOTQ5NDk0ZjUxNGZlNGI3YmNhODgxYTdiZDJiZGU3OGFiNjQxNDgxZGVhODNkNTM4ZjE4OA==";
function encodeTLV(tag, value) {
  const valueBytes = Buffer.from(value, "utf8");
  return Buffer.concat([Buffer.from([tag, valueBytes.length]), valueBytes]);
}
function buildZatcaQRData(params) {
  const parts = [
    encodeTLV(1, params.sellerName),
    encodeTLV(2, params.vatNumber),
    encodeTLV(3, params.timestamp),
    encodeTLV(4, params.totalWithVat),
    encodeTLV(5, params.vatAmount)
  ];
  if (params.invoiceHash) parts.push(encodeTLV(6, params.invoiceHash));
  return Buffer.concat(parts).toString("base64");
}
function escapeXml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function formatInvoiceNumber(counter, year) {
  return `SIND-${year}-${String(counter).padStart(6, "0")}`;
}
function buildUblXml(p) {
  const isSimplified = p.invoiceType === "simplified";
  const subTypeCode = isSimplified ? "020000" : "010000";
  const profileId = isSimplified ? "reporting:1.0" : "clearance:1.0";
  const buyerVatXml = p.buyer.vatNumber ? `
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(p.buyer.vatNumber)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>` : "";
  const linesXml = p.lineItems.map(
    (item, i) => `
    <cac:InvoiceLine>
      <cbc:ID>${i + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="PCE">${item.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="SAR">${item.lineSubtotal.toFixed(2)}</cbc:LineExtensionAmount>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="SAR">${item.vatAmount.toFixed(2)}</cbc:TaxAmount>
        <cbc:RoundingAmount currencyID="SAR">${item.lineTotal.toFixed(2)}</cbc:RoundingAmount>
      </cac:TaxTotal>
      <cac:Item>
        <cbc:Name>${escapeXml(item.description)}</cbc:Name>
        <cac:ClassifiedTaxCategory>
          <cbc:ID>S</cbc:ID>
          <cbc:Percent>${item.vatRate.toFixed(2)}</cbc:Percent>
          <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="SAR">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
        <cbc:AllowanceCharge>
          <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
          <cbc:AllowanceChargeReason>discount</cbc:AllowanceChargeReason>
          <cbc:Amount currencyID="SAR">0.00</cbc:Amount>
        </cbc:AllowanceCharge>
      </cac:Price>
    </cac:InvoiceLine>`
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionURI>urn:oasis:names:specification:ubl:dsig:ext:CADES</ext:ExtensionURI>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:ProfileID>${profileId}</cbc:ProfileID>
  <cbc:ID>${escapeXml(p.invoiceNumber)}</cbc:ID>
  <cbc:UUID>${p.uuid}</cbc:UUID>
  <cbc:IssueDate>${p.issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${p.issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="${subTypeCode}">388</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
  <cac:AdditionalDocumentReference>
    <cbc:ID>ICV</cbc:ID>
    <cbc:UUID>${p.invoiceCounter}</cbc:UUID>
  </cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference>
    <cbc:ID>PIH</cbc:ID>
    <cbc:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${p.previousInvoiceHashB64}</cbc:EmbeddedDocumentBinaryObject>
    </cbc:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="CRN">${escapeXml(p.seller.crNumber ?? "")}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(p.seller.address ?? "")}</cbc:StreetName>
        <cbc:CityName>${escapeXml(p.seller.city ?? "\u0627\u0644\u0631\u064A\u0627\u0636")}</cbc:CityName>
        <cbc:PostalZone>${escapeXml(p.seller.postalCode ?? "")}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>SA</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(p.seller.vatNumber)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(p.seller.name)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(p.buyer.address ?? "")}</cbc:StreetName>
        <cbc:CityName></cbc:CityName>
        <cac:Country><cbc:IdentificationCode>SA</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>${buyerVatXml}
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(p.buyer.name)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="SAR">${p.vatAmountRiyals.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="SAR">${p.subtotalRiyals.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="SAR">${p.vatAmountRiyals.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>15.00</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="SAR">${p.subtotalRiyals.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="SAR">${p.subtotalRiyals.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">${p.totalRiyals.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="SAR">0.00</cbc:AllowanceTotalAmount>
    <cbc:PrepaidAmount currencyID="SAR">0.00</cbc:PrepaidAmount>
    <cbc:PayableAmount currencyID="SAR">${p.totalRiyals.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${linesXml}
</Invoice>`;
}
async function submitToZatcaPortal(invoiceId) {
  const nowMs = Date.now();
  const [invoice] = await db.select().from(taxInvoices).where(eq8(taxInvoices.id, invoiceId));
  if (!invoice) throw new Error(`\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 ${invoiceId} \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629`);
  const [settings] = await db.select().from(zatcaSettings).limit(1);
  if (!settings) throw new Error("\u064A\u0631\u062C\u0649 \u0625\u0639\u062F\u0627\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u0636\u0631\u064A\u0628\u064A\u0629 \u0623\u0648\u0644\u0627\u064B");
  if (!settings.zatcaCsid || !settings.zatcaCsidSecret) {
    await db.update(taxInvoices).set({ zatcaStatus: "pending", updatedAt: nowMs }).where(eq8(taxInvoices.id, invoiceId));
    return {
      success: false,
      zatcaStatus: "pending",
      responseCode: "N/A",
      warnings: [],
      message: "\u0644\u0645 \u064A\u062A\u0645 \u0625\u0639\u062F\u0627\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0639\u062A\u0645\u0627\u062F ZATCA (CSID). \u0623\u0636\u0641\u0647\u0627 \u0645\u0646 \u0625\u0639\u062F\u0627\u062F\u0627\u062A ZATCA \u062B\u0645 \u0623\u0639\u0650\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629."
    };
  }
  const lineItems = (() => {
    try {
      return typeof invoice.lineItems === "string" ? JSON.parse(invoice.lineItems) : invoice.lineItems;
    } catch {
      return [];
    }
  })();
  const counterMatch = invoice.invoiceNumber.match(/(\d+)$/);
  const invoiceCounter = counterMatch ? parseInt(counterMatch[1], 10) : 1;
  const previousInvoiceHashB64 = invoice.previousInvoiceHash ? Buffer.from(invoice.previousInvoiceHash, "hex").toString("base64") : ZATCA_FIRST_PIH;
  const ublXml = buildUblXml({
    invoiceNumber: invoice.invoiceNumber,
    uuid: invoice.uuid,
    issueDate: invoice.issueDate,
    issueTime: invoice.issueTime,
    invoiceType: invoice.invoiceType,
    invoiceCounter,
    previousInvoiceHashB64,
    seller: {
      name: invoice.sellerName,
      vatNumber: invoice.sellerVatNumber,
      crNumber: invoice.sellerCrNumber ?? void 0,
      address: invoice.sellerAddress ?? void 0,
      city: invoice.sellerCity ?? void 0,
      postalCode: invoice.sellerPostalCode ?? void 0
    },
    buyer: {
      name: invoice.buyerName,
      vatNumber: invoice.buyerVatNumber ?? void 0,
      address: invoice.buyerAddress ?? void 0
    },
    lineItems,
    subtotalRiyals: invoice.subtotalHalala / 100,
    vatAmountRiyals: invoice.vatAmountHalala / 100,
    totalRiyals: invoice.totalHalala / 100
  });
  const xmlHashB64 = crypto.createHash("sha256").update(ublXml, "utf8").digest("base64");
  const env2 = settings.zatcaEnvironment ?? "sandbox";
  const baseUrl = ZATCA_API_BASE[env2];
  const isSimplified = invoice.invoiceType === "simplified";
  const endpoint = isSimplified ? `${baseUrl}/invoices/reporting/single` : `${baseUrl}/invoices/clearance/single`;
  const authHeader = "Basic " + Buffer.from(`${settings.zatcaCsid}:${settings.zatcaCsidSecret}`).toString(
    "base64"
  );
  await db.update(taxInvoices).set({
    zatcaStatus: "submitted",
    zatcaSubmittedAt: nowMs,
    zatcaInvoiceXml: ublXml,
    updatedAt: nowMs
  }).where(eq8(taxInvoices.id, invoiceId));
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Version": "V2",
        "Accept-Language": "en",
        Authorization: authHeader
      },
      body: JSON.stringify({
        invoiceHash: xmlHashB64,
        uuid: invoice.uuid,
        invoice: Buffer.from(ublXml, "utf8").toString("base64")
      }),
      signal: AbortSignal.timeout(3e4)
    });
    const responseCode = String(response.status);
    const body = await response.json().catch(() => ({}));
    const isSuccess = response.ok;
    const zatcaStatus = isSuccess ? isSimplified ? "reported" : "cleared" : "error";
    const rawWarnings = body.warnings ?? body.warningMessages ?? [];
    const warnings = rawWarnings.map(
      (w) => typeof w === "string" ? w : JSON.stringify(w)
    );
    const errorMessages = (body.errorMessages ?? body.errors ?? []).map((e) => typeof e === "string" ? e : JSON.stringify(e)).join(" | ");
    await db.update(taxInvoices).set({
      zatcaStatus,
      zatcaResponseCode: responseCode,
      zatcaWarnings: warnings.length ? JSON.stringify(warnings) : null,
      updatedAt: Date.now()
    }).where(eq8(taxInvoices.id, invoiceId));
    return {
      success: isSuccess,
      zatcaStatus,
      responseCode,
      warnings,
      message: isSuccess ? isSimplified ? "\u2713 \u062A\u0645 \u0627\u0644\u0625\u0628\u0644\u0627\u063A \u0628\u0646\u062C\u0627\u062D \u0625\u0644\u0649 \u0628\u0648\u0627\u0628\u0629 ZATCA (Reported)" : "\u2713 \u062A\u0645\u062A \u0627\u0644\u0645\u0642\u0627\u0635\u0629 \u0628\u0646\u062C\u0627\u062D \u0645\u0639 ZATCA (Cleared)" : errorMessages || "\u0641\u0634\u0644 \u0627\u0644\u0625\u0631\u0633\u0627\u0644 \u2014 \u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u062D\u0627\u0644\u0629 \u0641\u064A \u0628\u0648\u0627\u0628\u0629 ZATCA"
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "\u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639 \u0641\u064A \u0627\u0644\u0627\u062A\u0635\u0627\u0644";
    await db.update(taxInvoices).set({
      zatcaStatus: "error",
      zatcaResponseCode: "NET",
      zatcaWarnings: JSON.stringify([msg]),
      updatedAt: Date.now()
    }).where(eq8(taxInvoices.id, invoiceId));
    return {
      success: false,
      zatcaStatus: "error",
      responseCode: "NET",
      warnings: [msg],
      message: "\u062A\u0639\u0630\u0651\u0631 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0628\u0648\u0627\u0628\u0629 ZATCA: " + msg
    };
  }
}
async function createInvoiceFromOrder(orderId) {
  const [existing] = await db.select({
    id: taxInvoices.id,
    invoiceNumber: taxInvoices.invoiceNumber
  }).from(taxInvoices).where(
    and6(
      eq8(taxInvoices.sourceType, "door_order"),
      eq8(taxInvoices.sourceId, orderId)
    )
  ).limit(1);
  if (existing) {
    return {
      invoiceId: existing.id,
      invoiceNumber: existing.invoiceNumber,
      skipped: true
    };
  }
  const [order] = await db.select().from(doorOrders).where(eq8(doorOrders.id, orderId));
  if (!order) throw new Error(`\u0627\u0644\u0637\u0644\u0628 ${orderId} \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F`);
  const [settings] = await db.select().from(zatcaSettings).limit(1);
  if (!settings)
    throw new Error("\u064A\u0631\u062C\u0649 \u0625\u0639\u062F\u0627\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u0636\u0631\u064A\u0628\u064A\u0629 \u0623\u0648\u0644\u0627\u064B \u0645\u0646 \u0625\u0639\u062F\u0627\u062F\u0627\u062A ZATCA");
  const totalHalala = order.totalPrice;
  const subtotalHalala = Math.round(totalHalala / 1.15);
  const vatAmountHalala = totalHalala - subtotalHalala;
  const selections = order.selections;
  const dimensions = order.dimensions;
  let description = order.productName;
  if (dimensions && Object.keys(dimensions).length > 0) {
    const dimParts = Object.entries(dimensions).map(([k, v]) => `${k}: ${v}\u0633\u0645`).join(", ");
    description += ` \u2014 ${dimParts}`;
  }
  if (selections) {
    const selVals = Object.values(selections).filter((v) => v && v !== "false" && v !== "true").slice(0, 4);
    if (selVals.length) description += ` \u2014 ${selVals.join(", ")}`;
  }
  const qty = order.totalDoors ?? 1;
  const unitSubtotalHalala = Math.round(subtotalHalala / qty);
  const unitVatHalala = Math.round(vatAmountHalala / qty);
  const lineItems = [
    {
      description,
      quantity: qty,
      unitPrice: unitSubtotalHalala / 100,
      vatRate: 15,
      vatAmount: vatAmountHalala / 100,
      lineSubtotal: subtotalHalala / 100,
      lineTotal: totalHalala / 100
    }
  ];
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  await db.update(zatcaSettings).set({ invoiceCounter: sql`invoice_counter + 1`, updatedAt: Date.now() }).where(eq8(zatcaSettings.id, settings.id));
  const [updatedSettings] = await db.select({ counter: zatcaSettings.invoiceCounter }).from(zatcaSettings).where(eq8(zatcaSettings.id, settings.id));
  const newCounter = updatedSettings?.counter ?? 1;
  const invoiceNumber = formatInvoiceNumber(newCounter, year);
  const [prevInvoice] = await db.select({
    invoiceHash: taxInvoices.invoiceHash,
    invoiceNumber: taxInvoices.invoiceNumber
  }).from(taxInvoices).orderBy(desc4(taxInvoices.createdAt)).limit(1);
  const now = /* @__PURE__ */ new Date();
  const issueDate = now.toISOString().split("T")[0];
  const issueTime = now.toTimeString().split(" ")[0];
  const timestamp2 = now.toISOString().replace(/\.\d{3}Z$/, "Z");
  const uuid = uuidv4();
  const previousInvoiceHash = prevInvoice?.invoiceHash ?? null;
  const invoiceHash = crypto.createHash("sha256").update(
    JSON.stringify({
      uuid,
      invoiceNumber,
      issueDate,
      issueTime,
      sellerVatNumber: settings.vatNumber,
      buyerName: order.customerName,
      totalHalala,
      vatAmountHalala,
      lineItems,
      previousInvoiceHash: previousInvoiceHash ?? "FIRST"
    })
  ).digest("hex");
  const qrData = buildZatcaQRData({
    sellerName: settings.sellerName,
    vatNumber: settings.vatNumber,
    timestamp: timestamp2,
    totalWithVat: (totalHalala / 100).toFixed(2),
    vatAmount: (vatAmountHalala / 100).toFixed(2),
    invoiceHash
  });
  const nowMs = Date.now();
  const [insertResult] = await db.insert(taxInvoices).values({
    uuid,
    invoiceNumber,
    invoiceType: "simplified",
    invoiceTypeCode: "388",
    invoiceSubTypeCode: "020000",
    previousInvoiceHash: previousInvoiceHash ?? void 0,
    previousInvoiceNumber: prevInvoice?.invoiceNumber ?? void 0,
    issueDate,
    issueTime,
    sellerName: settings.sellerName,
    sellerVatNumber: settings.vatNumber,
    sellerCrNumber: settings.crNumber ?? void 0,
    sellerAddress: settings.address ?? void 0,
    sellerCity: settings.city ?? void 0,
    sellerPostalCode: settings.postalCode ?? void 0,
    buyerName: order.customerName,
    buyerPhone: order.customerPhone,
    buyerEmail: order.customerEmail ?? void 0,
    lineItems,
    subtotalHalala,
    vatAmountHalala,
    totalHalala,
    vatRate: 15,
    qrCodeData: qrData,
    invoiceHash,
    status: "issued",
    paymentStatus: order.paymentStatus ?? "unpaid",
    sourceType: "door_order",
    sourceId: orderId,
    zatcaStatus: "pending",
    notes: order.notes ?? void 0,
    createdAt: nowMs,
    updatedAt: nowMs
  });
  const invoiceId = Number(insertResult.insertId);
  if (settings.zatcaCsid && settings.zatcaCsidSecret) {
    submitToZatcaPortal(invoiceId).catch(() => {
    });
  }
  return { invoiceId, invoiceNumber };
}

// server/zatca.router.ts
function computeInvoiceHash(data) {
  return crypto2.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}
function formatInvoiceNumber2(counter, year) {
  return `SIND-${year}-${String(counter).padStart(6, "0")}`;
}
var toHalala = (riyals) => Math.round(riyals * 100);
var fromHalala = (halala) => (halala / 100).toFixed(2);
var lineItemSchema2 = z7.object({
  description: z7.string().min(1),
  descriptionEn: z7.string().optional(),
  quantity: z7.number().positive(),
  unitPrice: z7.number().nonnegative(),
  // بدون ضريبة
  vatRate: z7.number().min(0).max(100).default(15)
});
var zatcaRouter = router({
  // ── جلب إعدادات الشركة الضريبية ──────────────────────────────────────────
  getSettings: adminProcedure.query(async () => {
    const rows = await db.select().from(zatcaSettings).limit(1);
    return rows[0] ?? null;
  }),
  // ── تحديث إعدادات الشركة الضريبية ────────────────────────────────────────
  updateSettings: adminProcedure.input(
    z7.object({
      sellerName: z7.string().min(1),
      sellerNameEn: z7.string().optional(),
      vatNumber: z7.string().length(15),
      crNumber: z7.string().optional(),
      address: z7.string().optional(),
      city: z7.string().optional(),
      postalCode: z7.string().optional(),
      phone: z7.string().optional(),
      email: z7.string().email().optional(),
      // ZATCA Phase 2 API credentials
      zatcaEnvironment: z7.enum(["sandbox", "production"]).optional(),
      zatcaCsid: z7.string().optional(),
      zatcaCsidSecret: z7.string().optional()
    })
  ).mutation(async ({ input }) => {
    const existing = await db.select({ id: zatcaSettings.id }).from(zatcaSettings).limit(1);
    const now = Date.now();
    if (existing.length > 0) {
      await db.update(zatcaSettings).set({ ...input, updatedAt: now }).where(eq9(zatcaSettings.id, existing[0].id));
    } else {
      await db.insert(zatcaSettings).values({ ...input, updatedAt: now });
    }
    return { success: true };
  }),
  // ── قائمة الفواتير الضريبية ───────────────────────────────────────────────
  list: adminProcedure.input(
    z7.object({
      status: z7.enum(["draft", "issued", "paid", "cancelled"]).optional(),
      invoiceType: z7.enum(["standard", "simplified"]).optional()
    }).optional()
  ).query(async ({ input }) => {
    const rows = await db.select().from(taxInvoices).orderBy(desc5(taxInvoices.createdAt));
    return rows.map((r) => ({
      ...r,
      lineItems: (() => {
        try {
          return typeof r.lineItems === "string" ? JSON.parse(r.lineItems) : r.lineItems;
        } catch {
          return [];
        }
      })(),
      subtotalRiyals: fromHalala(r.subtotalHalala),
      vatAmountRiyals: fromHalala(r.vatAmountHalala),
      totalRiyals: fromHalala(r.totalHalala)
    }));
  }),
  // ── جلب فاتورة واحدة ─────────────────────────────────────────────────────
  getById: adminProcedure.input(z7.object({ id: z7.number() })).query(async ({ input }) => {
    const rows = await db.select().from(taxInvoices).where(eq9(taxInvoices.id, input.id));
    if (!rows[0]) throw new Error("\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
    const r = rows[0];
    return {
      ...r,
      lineItems: (() => {
        try {
          return typeof r.lineItems === "string" ? JSON.parse(r.lineItems) : r.lineItems;
        } catch {
          return [];
        }
      })(),
      subtotalRiyals: fromHalala(r.subtotalHalala),
      vatAmountRiyals: fromHalala(r.vatAmountHalala),
      totalRiyals: fromHalala(r.totalHalala)
    };
  }),
  // ── إنشاء فاتورة ضريبية جديدة ────────────────────────────────────────────
  create: adminProcedure.input(
    z7.object({
      invoiceType: z7.enum(["standard", "simplified"]).default("simplified"),
      // بيانات المشتري
      buyerName: z7.string().min(1),
      buyerVatNumber: z7.string().length(15).optional(),
      buyerCrNumber: z7.string().optional(),
      buyerAddress: z7.string().optional(),
      buyerPhone: z7.string().optional(),
      buyerEmail: z7.string().email().optional(),
      // بنود الفاتورة
      lineItems: z7.array(lineItemSchema2).min(1),
      // مرجع الطلب (اختياري)
      sourceType: z7.enum(["door_order", "distributor_order", "manual"]).default("manual"),
      sourceId: z7.number().optional(),
      notes: z7.string().optional()
    }).refine(
      (data) => data.invoiceType !== "standard" || !!data.buyerVatNumber,
      {
        message: "\u0631\u0642\u0645 \u0627\u0644\u0636\u0631\u064A\u0628\u0629 \u0644\u0644\u0645\u0634\u062A\u0631\u064A \u0625\u0644\u0632\u0627\u0645\u064A \u0641\u064A \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0642\u064A\u0627\u0633\u064A\u0629 (B2B)",
        path: ["buyerVatNumber"]
      }
    )
  ).mutation(async ({ input }) => {
    const settingsRows = await db.select().from(zatcaSettings).limit(1);
    const settings = settingsRows[0];
    if (!settings) throw new Error("\u064A\u0631\u062C\u0649 \u0625\u0639\u062F\u0627\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u0636\u0631\u064A\u0628\u064A\u0629 \u0623\u0648\u0644\u0627\u064B");
    let subtotalHalala = 0;
    let vatAmountHalala = 0;
    const processedItems = input.lineItems.map((item) => {
      const lineSubtotal = item.quantity * item.unitPrice;
      const lineVat = lineSubtotal * (item.vatRate / 100);
      const lineTotal = lineSubtotal + lineVat;
      subtotalHalala += toHalala(lineSubtotal);
      vatAmountHalala += toHalala(lineVat);
      return {
        description: item.description,
        descriptionEn: item.descriptionEn ?? "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        vatAmount: parseFloat(lineVat.toFixed(2)),
        lineSubtotal: parseFloat(lineSubtotal.toFixed(2)),
        lineTotal: parseFloat(lineTotal.toFixed(2))
      };
    });
    const totalHalala = subtotalHalala + vatAmountHalala;
    const year = (/* @__PURE__ */ new Date()).getFullYear();
    await db.update(zatcaSettings).set({
      invoiceCounter: sql2`invoice_counter + 1`,
      updatedAt: Date.now()
    }).where(eq9(zatcaSettings.id, settings.id));
    const updatedSettings = await db.select({ counter: zatcaSettings.invoiceCounter }).from(zatcaSettings).where(eq9(zatcaSettings.id, settings.id)).limit(1);
    const newCounter = updatedSettings[0]?.counter ?? 1;
    const invoiceNumber = formatInvoiceNumber2(newCounter, year);
    const prevInvoiceRows = await db.select({
      invoiceHash: taxInvoices.invoiceHash,
      invoiceNumber: taxInvoices.invoiceNumber
    }).from(taxInvoices).orderBy(desc5(taxInvoices.createdAt)).limit(1);
    const previousInvoiceHash = prevInvoiceRows[0]?.invoiceHash ?? null;
    const previousInvoiceNumber = prevInvoiceRows[0]?.invoiceNumber ?? null;
    const now = /* @__PURE__ */ new Date();
    const issueDate = now.toISOString().split("T")[0];
    const issueTime = now.toTimeString().split(" ")[0];
    const timestamp2 = now.toISOString().replace(/\.\d{3}Z$/, "Z");
    const uuid = uuidv42();
    const hashInput = {
      uuid,
      invoiceNumber,
      issueDate,
      issueTime,
      sellerVatNumber: settings.vatNumber,
      buyerName: input.buyerName,
      totalHalala,
      vatAmountHalala,
      lineItems: processedItems,
      previousInvoiceHash: previousInvoiceHash ?? "FIRST"
    };
    const invoiceHash = computeInvoiceHash(hashInput);
    const qrData = buildZatcaQRData({
      sellerName: settings.sellerName,
      vatNumber: settings.vatNumber,
      timestamp: timestamp2,
      totalWithVat: fromHalala(totalHalala),
      vatAmount: fromHalala(vatAmountHalala),
      invoiceHash
    });
    const nowMs = Date.now();
    const [result] = await db.insert(taxInvoices).values({
      uuid,
      invoiceNumber,
      invoiceType: input.invoiceType,
      // BT-3: 388 = Tax Invoice (standard & simplified), 381 = Credit Note
      invoiceTypeCode: "388",
      // KSA-2: 010000 = Standard B2B, 020000 = Simplified B2C
      invoiceSubTypeCode: input.invoiceType === "standard" ? "010000" : "020000",
      previousInvoiceHash: previousInvoiceHash ?? void 0,
      previousInvoiceNumber: previousInvoiceNumber ?? void 0,
      issueDate,
      issueTime,
      sellerName: settings.sellerName,
      sellerVatNumber: settings.vatNumber,
      sellerCrNumber: settings.crNumber ?? void 0,
      sellerAddress: settings.address ?? void 0,
      sellerCity: settings.city ?? void 0,
      sellerPostalCode: settings.postalCode ?? void 0,
      buyerName: input.buyerName,
      buyerVatNumber: input.buyerVatNumber,
      buyerCrNumber: input.buyerCrNumber,
      buyerAddress: input.buyerAddress,
      buyerPhone: input.buyerPhone,
      buyerEmail: input.buyerEmail,
      lineItems: processedItems,
      subtotalHalala,
      vatAmountHalala,
      totalHalala,
      vatRate: 15,
      qrCodeData: qrData,
      invoiceHash,
      status: "issued",
      paymentStatus: "unpaid",
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      notes: input.notes,
      createdAt: nowMs,
      updatedAt: nowMs
    });
    const invoiceId = Number(result.insertId);
    try {
      const jeCountResult = await db.select({ cnt: sql2`COUNT(*)` }).from(journalEntries);
      const jeCounter = (jeCountResult[0]?.cnt ?? 0) + 1;
      const jeNumber = `JE-${year}-${String(jeCounter).padStart(6, "0")}`;
      const [jeResult] = await db.insert(journalEntries).values({
        entryNumber: jeNumber,
        entryDate: issueDate,
        description: `\u0641\u0627\u062A\u0648\u0631\u0629 \u0636\u0631\u064A\u0628\u064A\u0629 \u0631\u0642\u0645 ${invoiceNumber} \u2014 ${input.buyerName}`,
        sourceType: "invoice",
        sourceId: invoiceId,
        totalDebitHalala: totalHalala,
        totalCreditHalala: totalHalala,
        isPosted: true,
        createdAt: nowMs,
        updatedAt: nowMs
      });
      const jeId = Number(jeResult.insertId);
      await db.insert(journalLines).values([
        {
          journalEntryId: jeId,
          accountCode: "1120",
          accountName: "\u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u2014 \u0627\u0644\u0639\u0645\u0644\u0627\u0621",
          debitHalala: totalHalala,
          creditHalala: 0,
          description: invoiceNumber,
          sequence: 1
        },
        {
          journalEntryId: jeId,
          accountCode: "4100",
          accountName: "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0645\u0628\u064A\u0639\u0627\u062A \u0627\u0644\u0623\u0628\u0648\u0627\u0628",
          debitHalala: 0,
          creditHalala: subtotalHalala,
          description: invoiceNumber,
          sequence: 2
        },
        {
          journalEntryId: jeId,
          accountCode: "2120",
          accountName: "\u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0633\u062A\u062D\u0642\u0629",
          debitHalala: 0,
          creditHalala: vatAmountHalala,
          description: `\u0636\u0631\u064A\u0628\u0629 ${invoiceNumber}`,
          sequence: 3
        }
      ]);
    } catch {
    }
    return {
      success: true,
      invoiceId: Number(result.insertId),
      invoiceNumber,
      uuid,
      qrCodeData: qrData,
      invoiceHash
    };
  }),
  // ── توليد QR Code كـ Data URL (PNG) ──────────────────────────────────────
  generateQRImage: adminProcedure.input(z7.object({ invoiceId: z7.number() })).query(async ({ input }) => {
    const rows = await db.select({
      qrCodeData: taxInvoices.qrCodeData,
      invoiceNumber: taxInvoices.invoiceNumber
    }).from(taxInvoices).where(eq9(taxInvoices.id, input.invoiceId));
    if (!rows[0]?.qrCodeData) throw new Error("\u0628\u064A\u0627\u0646\u0627\u062A QR \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
    const qrDataUrl = await QRCode.toDataURL(rows[0].qrCodeData, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 200,
      color: { dark: "#000000", light: "#ffffff" }
    });
    return { qrDataUrl, invoiceNumber: rows[0].invoiceNumber };
  }),
  // ── تحديث حالة الدفع ─────────────────────────────────────────────────────
  updatePaymentStatus: adminProcedure.input(
    z7.object({
      id: z7.number(),
      paymentStatus: z7.enum(["unpaid", "partial", "paid"])
    })
  ).mutation(async ({ input }) => {
    await db.update(taxInvoices).set({
      paymentStatus: input.paymentStatus,
      status: input.paymentStatus === "paid" ? "paid" : "issued",
      updatedAt: Date.now()
    }).where(eq9(taxInvoices.id, input.id));
    return { success: true };
  }),
  // ── إلغاء فاتورة ─────────────────────────────────────────────────────────
  cancel: adminProcedure.input(z7.object({ id: z7.number() })).mutation(async ({ input }) => {
    await db.update(taxInvoices).set({ status: "cancelled", updatedAt: Date.now() }).where(eq9(taxInvoices.id, input.id));
    return { success: true };
  }),
  // ── إرسال الفاتورة إلى بوابة ZATCA (Phase 2) ─────────────────────────────
  submitToZatca: adminProcedure.input(z7.object({ invoiceId: z7.number() })).mutation(async ({ input }) => {
    const result = await submitToZatcaPortal(input.invoiceId);
    return result;
  }),
  // ── إعادة محاولة الإرسال للفواتير الفاشلة أو المعلّقة ────────────────────
  retryFailed: adminProcedure.input(
    z7.object({
      /** تحديد فواتير بعينها — إذا لم يُحدد يُعالج جميع pending/error */
      invoiceIds: z7.array(z7.number()).optional()
    }).optional()
  ).mutation(async ({ input }) => {
    const { and: drAnd, inArray: inArray3, or: or2 } = await import("drizzle-orm");
    let ids;
    if (input?.invoiceIds?.length) {
      ids = input.invoiceIds;
    } else {
      const rows = await db.select({ id: taxInvoices.id }).from(taxInvoices).where(
        or2(
          eq9(taxInvoices.zatcaStatus, "pending"),
          eq9(taxInvoices.zatcaStatus, "error")
        )
      );
      ids = rows.map((r) => r.id);
    }
    const results = await Promise.allSettled(
      ids.map((id) => submitToZatcaPortal(id))
    );
    const succeeded = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    const failed = results.length - succeeded;
    return { total: ids.length, succeeded, failed };
  }),
  // ── إنشاء فاتورة تلقائياً من طلب باب ────────────────────────────────────
  createFromOrder: adminProcedure.input(z7.object({ orderId: z7.number() })).mutation(async ({ input }) => {
    const result = await createInvoiceFromOrder(input.orderId);
    return result;
  }),
  // ── حالة إرسال ZATCA لفاتورة ─────────────────────────────────────────────
  getZatcaStatus: adminProcedure.input(z7.object({ invoiceId: z7.number() })).query(async ({ input }) => {
    const [row] = await db.select({
      id: taxInvoices.id,
      invoiceNumber: taxInvoices.invoiceNumber,
      zatcaStatus: taxInvoices.zatcaStatus,
      zatcaSubmittedAt: taxInvoices.zatcaSubmittedAt,
      zatcaResponseCode: taxInvoices.zatcaResponseCode,
      zatcaWarnings: taxInvoices.zatcaWarnings
    }).from(taxInvoices).where(eq9(taxInvoices.id, input.invoiceId));
    if (!row) throw new Error("\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
    return {
      ...row,
      zatcaWarnings: (() => {
        try {
          return row.zatcaWarnings ? JSON.parse(row.zatcaWarnings) : [];
        } catch {
          return [];
        }
      })()
    };
  })
});

// server/admin.router.ts
import { TRPCError as TRPCError6 } from "@trpc/server";
import { timingSafeEqual } from "crypto";
import { z as z8 } from "zod/v4";
import bcrypt2 from "bcryptjs";
var COOKIE_NAME = "adminSession";
var COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge: 8 * 60 * 60 * 1e3,
  // 8 hours in ms
  path: "/"
};
function timingSafeStringEqual(a, b) {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
var adminAuthRouter = router({
  // تسجيل دخول المدير
  // Supports ADMIN_PASSWORD_HASH (bcrypt) or ADMIN_INTERNAL_KEY (plaintext fallback)
  login: publicProcedure.input(z8.object({ password: z8.string().min(1) })).mutation(async ({ input, ctx }) => {
    const passwordHash = (process.env.ADMIN_PASSWORD_HASH || "").replace(/\\\$/g, "$");
    const internalKey = process.env.ADMIN_INTERNAL_KEY;
    let valid = false;
    if (passwordHash) {
      valid = await bcrypt2.compare(input.password, passwordHash);
    } else if (internalKey) {
      valid = timingSafeStringEqual(input.password, internalKey);
    } else {
      throw new TRPCError6({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u0644\u0645 \u064A\u062A\u0645 \u0625\u0639\u062F\u0627\u062F \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u0627\u0644\u0645\u062F\u064A\u0631 \u0641\u064A \u0628\u064A\u0626\u0629 \u0627\u0644\u062E\u0627\u062F\u0645"
      });
    }
    if (!valid) {
      throw new TRPCError6({
        code: "UNAUTHORIZED",
        message: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629"
      });
    }
    const token = await createAdminSession();
    ctx.res?.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    return { success: true };
  }),
  // التحقق من صحة الجلسة الحالية
  verify: adminProcedure.query(() => {
    return { valid: true };
  }),
  // تسجيل الخروج
  logout: adminProcedure.mutation(async ({ ctx }) => {
    if (ctx.adminToken) await deleteAdminSession(ctx.adminToken);
    ctx.res?.clearCookie(COOKIE_NAME, { path: "/" });
    return { success: true };
  })
});

// server/users.router.ts
import { TRPCError as TRPCError7 } from "@trpc/server";
import { z as z9 } from "zod/v4";
import bcrypt3 from "bcryptjs";
import { nanoid as nanoid3 } from "nanoid";
import { eq as eq10 } from "drizzle-orm";
var SESSION_TTL_MS2 = 30 * 24 * 60 * 60 * 1e3;
var USER_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge: SESSION_TTL_MS2,
  path: "/"
};
var usersRouter = router({
  // ── تسجيل مستخدم جديد ───────────────────────────────────────────────────
  register: publicProcedure.input(
    z9.object({
      name: z9.string().min(2, "\u0627\u0644\u0627\u0633\u0645 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u062D\u0631\u0641\u064A\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644"),
      email: z9.string().email("\u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D"),
      phone: z9.string().min(10, "\u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D"),
      password: z9.string().min(8, "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 8 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644")
    })
  ).mutation(async ({ input, ctx }) => {
    const existing = await db.query.users.findFirst({
      where: eq10(schema_exports.users.email, input.email)
    });
    if (existing)
      throw new TRPCError7({
        code: "CONFLICT",
        message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B"
      });
    const passwordHash = await bcrypt3.hash(input.password, 10);
    const now = Date.now();
    const [result] = await db.insert(schema_exports.users).values({
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      wishlistIds: [],
      createdAt: now,
      updatedAt: now
    });
    const userId = result.insertId;
    const token = nanoid3(64);
    await db.insert(schema_exports.userSessions).values({
      userId,
      token,
      expiresAt: now + SESSION_TTL_MS2,
      createdAt: now
    });
    ctx.res.cookie("userSession", token, USER_COOKIE_OPTIONS);
    return {
      user: {
        id: userId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        wishlistIds: []
      }
    };
  }),
  // ── تسجيل الدخول ────────────────────────────────────────────────────────
  login: publicProcedure.input(
    z9.object({
      email: z9.string().email(),
      password: z9.string().min(1)
    })
  ).mutation(async ({ input, ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq10(schema_exports.users.email, input.email)
    });
    if (!user)
      throw new TRPCError7({
        code: "UNAUTHORIZED",
        message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629"
      });
    const valid = await bcrypt3.compare(input.password, user.passwordHash);
    if (!valid)
      throw new TRPCError7({
        code: "UNAUTHORIZED",
        message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629"
      });
    const token = nanoid3(64);
    const now = Date.now();
    await db.insert(schema_exports.userSessions).values({
      userId: user.id,
      token,
      expiresAt: now + SESSION_TTL_MS2,
      createdAt: now
    });
    const { passwordHash: _, ...safeUser } = user;
    ctx.res.cookie("userSession", token, USER_COOKIE_OPTIONS);
    return { user: safeUser };
  }),
  // ── بيانات المستخدم الحالي ──────────────────────────────────────────────
  me: userProcedure.query(async ({ ctx }) => {
    const { passwordHash: _, ...safe } = ctx.user;
    return safe;
  }),
  // ── تسجيل الخروج ────────────────────────────────────────────────────────
  logout: userProcedure.mutation(async ({ ctx }) => {
    const token = ctx.userToken;
    ctx.res.clearCookie("userSession", { path: "/" });
    await db.delete(schema_exports.userSessions).where(eq10(schema_exports.userSessions.token, token));
    return { success: true };
  }),
  // ── تحديث المفضلة ────────────────────────────────────────────────────────
  toggleWishlist: userProcedure.input(z9.object({ productId: z9.number() })).mutation(async ({ ctx, input }) => {
    const user = ctx.user;
    const wishlist = user.wishlistIds ?? [];
    const updated = wishlist.includes(input.productId) ? wishlist.filter((id) => id !== input.productId) : [...wishlist, input.productId];
    await db.update(schema_exports.users).set({ wishlistIds: updated, updatedAt: Date.now() }).where(eq10(schema_exports.users.id, user.id));
    return { wishlistIds: updated };
  })
});

// server/inventory.router.ts
import { z as z10 } from "zod/v4";
import { eq as eq11, desc as desc6 } from "drizzle-orm";
var categoryEnum = z10.enum([
  "wpc_board",
  "film",
  "edge",
  "frame",
  "lock",
  "hinge",
  "accessory",
  "packaging",
  "chemical"
]);
var itemInput = z10.object({
  code: z10.string().min(1).max(100),
  name: z10.string().min(1).max(255),
  nameEn: z10.string().max(255).optional(),
  category: categoryEnum,
  unit: z10.string().min(1).max(50),
  currentQty: z10.number().int().min(0),
  minQty: z10.number().int().min(0),
  maxQty: z10.number().int().min(0),
  reorderQty: z10.number().int().min(0),
  unitCost: z10.number().min(0),
  supplier: z10.string().max(255).default(""),
  supplierPhone: z10.string().max(50).optional(),
  location: z10.string().max(255).default(""),
  lastReceived: z10.string().max(10).optional(),
  lastConsumed: z10.string().max(10).optional(),
  notes: z10.string().optional()
});
function calcStatus(qty, minQty) {
  if (qty <= 0) return "out_of_stock";
  if (qty <= minQty * 0.5) return "critical";
  if (qty <= minQty) return "low_stock";
  return "in_stock";
}
var inventoryRouter = router({
  // جلب كل المواد مع حركاتها
  list: adminProcedure.query(async () => {
    const items = await db.query.inventoryItems.findMany({
      orderBy: [desc6(schema_exports.inventoryItems.updatedAt)]
    });
    const txs = await db.query.inventoryTransactions.findMany({
      orderBy: [desc6(schema_exports.inventoryTransactions.createdAt)]
    });
    const txByItem = {};
    for (const tx of txs) {
      txByItem[tx.itemId] ??= [];
      txByItem[tx.itemId].push(tx);
    }
    return items.map((item) => ({
      ...item,
      status: calcStatus(item.currentQty, item.minQty),
      transactions: (txByItem[item.id] ?? []).map((tx) => ({
        id: String(tx.id),
        type: tx.type,
        quantity: tx.quantity,
        balanceBefore: tx.balanceBefore,
        balanceAfter: tx.balanceAfter,
        reference: tx.reference,
        note: tx.note ?? void 0,
        performedBy: tx.performedBy,
        date: tx.date
      }))
    }));
  }),
  // إنشاء مادة جديدة
  create: adminProcedure.input(itemInput).mutation(async ({ input }) => {
    const now = Date.now();
    const [result] = await db.insert(schema_exports.inventoryItems).values({
      ...input,
      createdAt: now,
      updatedAt: now
    });
    return { id: result.insertId };
  }),
  // تحديث مادة موجودة
  update: adminProcedure.input(z10.object({ id: z10.number().int() }).merge(itemInput)).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await db.update(schema_exports.inventoryItems).set({ ...data, updatedAt: Date.now() }).where(eq11(schema_exports.inventoryItems.id, id));
    return { ok: true };
  }),
  // حذف مادة
  delete: adminProcedure.input(z10.object({ id: z10.number().int() })).mutation(async ({ input }) => {
    await db.delete(schema_exports.inventoryTransactions).where(eq11(schema_exports.inventoryTransactions.itemId, input.id));
    await db.delete(schema_exports.inventoryItems).where(eq11(schema_exports.inventoryItems.id, input.id));
    return { ok: true };
  }),
  // تسجيل حركة (استلام / صرف / تعديل / إرجاع / نقل)
  addTransaction: adminProcedure.input(z10.object({
    itemId: z10.number().int(),
    type: z10.enum(["receive", "consume", "adjust", "return", "transfer"]),
    quantity: z10.number().int(),
    reference: z10.string().max(255).default(""),
    note: z10.string().optional(),
    performedBy: z10.string().max(255).default("\u0627\u0644\u0625\u062F\u0627\u0631\u0629"),
    date: z10.string().max(10)
  })).mutation(async ({ input }) => {
    const item = await db.query.inventoryItems.findFirst({
      where: eq11(schema_exports.inventoryItems.id, input.itemId)
    });
    if (!item) throw new Error("\u0627\u0644\u0645\u0627\u062F\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
    const balanceBefore = item.currentQty;
    let newQty;
    if (input.type === "receive" || input.type === "return") {
      newQty = balanceBefore + input.quantity;
    } else if (input.type === "consume" || input.type === "transfer") {
      newQty = balanceBefore - input.quantity;
    } else {
      newQty = balanceBefore + input.quantity;
    }
    newQty = Math.max(0, newQty);
    const now = Date.now();
    await db.insert(schema_exports.inventoryTransactions).values({
      itemId: input.itemId,
      type: input.type,
      quantity: input.quantity,
      balanceBefore,
      balanceAfter: newQty,
      reference: input.reference,
      note: input.note,
      performedBy: input.performedBy,
      date: input.date,
      createdAt: now
    });
    const updateData = {
      currentQty: newQty,
      updatedAt: now
    };
    if (input.type === "receive") updateData.lastReceived = input.date;
    if (input.type === "consume") updateData.lastConsumed = input.date;
    await db.update(schema_exports.inventoryItems).set(updateData).where(eq11(schema_exports.inventoryItems.id, input.itemId));
    return {
      balanceBefore,
      balanceAfter: newQty,
      status: calcStatus(newQty, item.minQty)
    };
  }),
  // خصم تلقائي عند إنشاء أمر تشغيل
  consumeForWorkOrder: adminProcedure.input(z10.object({
    workOrderRef: z10.string(),
    performedBy: z10.string().default("\u0646\u0638\u0627\u0645 \u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u062A\u0634\u063A\u064A\u0644"),
    consumptions: z10.array(z10.object({
      itemId: z10.number().int(),
      quantity: z10.number().int()
    }))
  })).mutation(async ({ input }) => {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const warnings = [];
    for (const c of input.consumptions) {
      const item = await db.query.inventoryItems.findFirst({
        where: eq11(schema_exports.inventoryItems.id, c.itemId)
      });
      if (!item) {
        warnings.push(`\u0645\u0627\u062F\u0629 \u0631\u0642\u0645 ${c.itemId} \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629`);
        continue;
      }
      const actualConsume = Math.min(c.quantity, item.currentQty);
      const newQty = item.currentQty - actualConsume;
      const now = Date.now();
      await db.insert(schema_exports.inventoryTransactions).values({
        itemId: item.id,
        type: "consume",
        quantity: actualConsume,
        balanceBefore: item.currentQty,
        balanceAfter: newQty,
        reference: input.workOrderRef,
        performedBy: input.performedBy,
        date: today,
        createdAt: now
      });
      await db.update(schema_exports.inventoryItems).set({ currentQty: newQty, lastConsumed: today, updatedAt: now }).where(eq11(schema_exports.inventoryItems.id, item.id));
      if (item.currentQty < c.quantity) {
        warnings.push(`${item.name}: \u0646\u0642\u0635 ${c.quantity - item.currentQty} ${item.unit}`);
      }
    }
    return { ok: true, warnings };
  }),
  // تعديل جماعي للأرصدة عند اعتماد الجرد الدوري
  bulkAdjustForStocktaking: adminProcedure.input(z10.object({
    sessionRef: z10.string().max(255),
    performedBy: z10.string().max(255).default("\u0645\u0634\u0631\u0641 \u0627\u0644\u062C\u0631\u062F"),
    date: z10.string().max(10),
    adjustments: z10.array(z10.object({
      itemId: z10.number().int(),
      actualQty: z10.number().int().min(0),
      note: z10.string().optional()
    }))
  })).mutation(async ({ input }) => {
    const now = Date.now();
    let count = 0;
    for (const adj of input.adjustments) {
      const item = await db.query.inventoryItems.findFirst({
        where: eq11(schema_exports.inventoryItems.id, adj.itemId)
      });
      if (!item) continue;
      const balanceBefore = item.currentQty;
      const balanceAfter = adj.actualQty;
      const delta = balanceAfter - balanceBefore;
      await db.insert(schema_exports.inventoryTransactions).values({
        itemId: adj.itemId,
        type: "adjust",
        quantity: delta,
        balanceBefore,
        balanceAfter,
        reference: input.sessionRef,
        note: adj.note ?? null,
        performedBy: input.performedBy,
        date: input.date,
        createdAt: now
      });
      await db.update(schema_exports.inventoryItems).set({ currentQty: balanceAfter, updatedAt: now }).where(eq11(schema_exports.inventoryItems.id, adj.itemId));
      count++;
    }
    return { ok: true, count };
  }),
  // بذر البيانات التجريبية (للإعداد الأول فقط)
  seed: adminProcedure.mutation(async () => {
    const existing = await db.query.inventoryItems.findFirst();
    if (existing) return { skipped: true, message: "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0648\u062C\u0648\u062F\u0629 \u0645\u0633\u0628\u0642\u0627\u064B" };
    const now = Date.now();
    const items = [
      { code: "WPC-45-WHT", name: "\u0644\u0648\u062D WPC 45mm \u0623\u0628\u064A\u0636 \u0645\u0637\u0641\u064A", nameEn: "WPC Board 45mm White Matt", category: "wpc_board", unit: "\u0644\u0648\u062D", currentQty: 320, minQty: 100, maxQty: 600, reorderQty: 200, unitCost: 85, supplier: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0628\u0644\u0627\u0633\u062A\u064A\u0643 \u0627\u0644\u0645\u062A\u062D\u062F\u0629", supplierPhone: "0501234567", location: "\u0645\u0633\u062A\u0648\u062F\u0639 A - \u0631\u0641 1", lastReceived: "2026-05-10", lastConsumed: "2026-05-17" },
      { code: "WPC-55-BEG", name: "\u0644\u0648\u062D WPC 55mm \u0628\u064A\u062C \u0631\u0645\u0644\u064A", nameEn: "WPC Board 55mm Beige Sand", category: "wpc_board", unit: "\u0644\u0648\u062D", currentQty: 78, minQty: 80, maxQty: 400, reorderQty: 150, unitCost: 95, supplier: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0628\u0644\u0627\u0633\u062A\u064A\u0643 \u0627\u0644\u0645\u062A\u062D\u062F\u0629", supplierPhone: "0501234567", location: "\u0645\u0633\u062A\u0648\u062F\u0639 A - \u0631\u0641 2", lastReceived: "2026-04-28", lastConsumed: "2026-05-15" },
      { code: "FILM-WHT-50", name: "\u0641\u064A\u0644\u0645 PVC \u0623\u0628\u064A\u0636 \u0645\u0637\u0641\u064A 50 \u0645\u064A\u0643\u0631\u0648\u0646", nameEn: "PVC Film White Matt 50\xB5m", category: "film", unit: "\u0631\u0648\u0644", currentQty: 45, minQty: 20, maxQty: 100, reorderQty: 40, unitCost: 320, supplier: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u0623\u0641\u0644\u0627\u0645 \u0627\u0644\u0635\u0646\u0627\u0639\u064A\u0629", supplierPhone: "0551234567", location: "\u0645\u0633\u062A\u0648\u062F\u0639 B - \u0631\u0641 1", lastReceived: "2026-05-05", lastConsumed: "2026-05-16" },
      { code: "EDGE-ABS-WHT", name: "\u062D\u0627\u0641\u0629 ABS \u0623\u0628\u064A\u0636 2mm", nameEn: "ABS Edge White 2mm", category: "edge", unit: "\u0645\u062A\u0631", currentQty: 1200, minQty: 500, maxQty: 3e3, reorderQty: 1e3, unitCost: 4.5, supplier: "\u0634\u0631\u0643\u0629 \u0627\u0644\u062D\u0648\u0627\u0641 \u0627\u0644\u0635\u0646\u0627\u0639\u064A\u0629", supplierPhone: "0561234567", location: "\u0645\u0633\u062A\u0648\u062F\u0639 B - \u0631\u0641 3", lastReceived: "2026-05-08", lastConsumed: "2026-05-18" },
      { code: "FRAME-MDF-90", name: "\u0625\u0637\u0627\u0631 MDF 90mm \u0623\u0628\u064A\u0636", nameEn: "MDF Frame 90mm White", category: "frame", unit: "\u0642\u0637\u0639\u0629", currentQty: 12, minQty: 50, maxQty: 300, reorderQty: 100, unitCost: 45, supplier: "\u0645\u0635\u0646\u0639 \u0627\u0644\u0625\u0637\u0627\u0631\u0627\u062A \u0627\u0644\u062E\u0644\u064A\u062C\u064A", supplierPhone: "0571234567", location: "\u0645\u0633\u062A\u0648\u062F\u0639 C - \u0631\u0641 1", lastReceived: "2026-04-20", lastConsumed: "2026-05-14" },
      { code: "LOCK-MOR-STD", name: "\u0642\u0641\u0644 \u0645\u0648\u0631\u062A\u064A\u0632 \u0642\u064A\u0627\u0633\u064A", nameEn: "Mortise Lock Standard", category: "lock", unit: "\u0637\u0642\u0645", currentQty: 0, minQty: 30, maxQty: 200, reorderQty: 80, unitCost: 65, supplier: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0623\u0642\u0641\u0627\u0644 \u0627\u0644\u0639\u0627\u0644\u0645\u064A\u0629", supplierPhone: "0581234567", location: "\u0645\u0633\u062A\u0648\u062F\u0639 D - \u0631\u0641 1", lastReceived: "2026-04-15", lastConsumed: "2026-05-12" },
      { code: "HINGE-3-STD", name: "\u0645\u0641\u0635\u0644\u0627\u062A 3 \u0645\u0641\u0635\u0644\u0627\u062A \u0642\u064A\u0627\u0633\u064A\u0629", nameEn: "3-Hinge Set Standard", category: "hinge", unit: "\u0637\u0642\u0645", currentQty: 156, minQty: 60, maxQty: 400, reorderQty: 120, unitCost: 28, supplier: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u0645\u0641\u0635\u0644\u0627\u062A \u0627\u0644\u0635\u0646\u0627\u0639\u064A\u0629", supplierPhone: "0591234567", location: "\u0645\u0633\u062A\u0648\u062F\u0639 D - \u0631\u0641 2", lastReceived: "2026-05-01", lastConsumed: "2026-05-17" },
      { code: "PACK-FOAM-STD", name: "\u0641\u0648\u0645 \u062A\u063A\u0644\u064A\u0641 \u0642\u064A\u0627\u0633\u064A", nameEn: "Standard Packing Foam", category: "packaging", unit: "\u0642\u0637\u0639\u0629", currentQty: 280, minQty: 100, maxQty: 600, reorderQty: 200, unitCost: 8, supplier: "\u0645\u0635\u0646\u0639 \u0627\u0644\u062A\u063A\u0644\u064A\u0641 \u0627\u0644\u062D\u062F\u064A\u062B", supplierPhone: "0501111222", location: "\u0645\u0633\u062A\u0648\u062F\u0639 E - \u0631\u0641 1", lastReceived: "2026-05-12", lastConsumed: "2026-05-18" },
      { code: "SCREW-M6-BOX", name: "\u0628\u0631\u0627\u063A\u064A M6 - \u0639\u0644\u0628\u0629 100 \u062D\u0628\u0629", nameEn: "Screws M6 Box 100pcs", category: "accessory", unit: "\u0639\u0644\u0628\u0629", currentQty: 38, minQty: 15, maxQty: 100, reorderQty: 40, unitCost: 22, supplier: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0644\u0648\u0627\u0632\u0645 \u0627\u0644\u0635\u0646\u0627\u0639\u064A\u0629", supplierPhone: "0543210987", location: "\u0645\u0633\u062A\u0648\u062F\u0639 D - \u0631\u0641 3", lastReceived: "2026-04-18" },
      { code: "GLUE-PVC-5L", name: "\u063A\u0631\u0627\u0621 PVC 5 \u0644\u062A\u0631", nameEn: "PVC Glue 5L", category: "chemical", unit: "\u0639\u0644\u0628\u0629", currentQty: 24, minQty: 10, maxQty: 80, reorderQty: 30, unitCost: 55, supplier: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0643\u064A\u0645\u0627\u0648\u064A\u0627\u062A \u0627\u0644\u0635\u0646\u0627\u0639\u064A\u0629", supplierPhone: "0567890123", location: "\u0645\u0633\u062A\u0648\u062F\u0639 F", lastReceived: "2026-05-03", lastConsumed: "2026-05-15" }
    ];
    for (const item of items) {
      await db.insert(schema_exports.inventoryItems).values({ ...item, createdAt: now, updatedAt: now });
    }
    return { ok: true, count: items.length };
  })
});

// server/distributors-admin.router.ts
import { z as z11 } from "zod/v4";
import bcrypt4 from "bcryptjs";
import { eq as eq12, desc as desc7 } from "drizzle-orm";
import { TRPCError as TRPCError8 } from "@trpc/server";
var distInput = z11.object({
  name: z11.string().min(1).max(255),
  company: z11.string().min(1).max(255),
  city: z11.string().max(100).default(""),
  region: z11.string().max(100).default(""),
  phone: z11.string().min(1).max(50),
  email: z11.string().email().max(255),
  whatsapp: z11.string().max(50).optional(),
  website: z11.string().max(255).optional(),
  commercialReg: z11.string().max(50).optional(),
  vatNumber: z11.string().max(20).optional(),
  bankName: z11.string().max(255).optional(),
  bankIban: z11.string().max(40).optional(),
  status: z11.enum(["active", "pending", "suspended", "rejected"]).default("pending"),
  tier: z11.enum(["bronze", "silver", "gold", "platinum"]).default("bronze"),
  joinDate: z11.string().max(10),
  contractStart: z11.string().max(10).optional(),
  contractEnd: z11.string().max(10).optional(),
  creditLimit: z11.number().int().min(0).default(5e4),
  discountRate: z11.number().int().min(0).max(100).default(5),
  totalOrders: z11.number().int().min(0).default(0),
  totalRevenue: z11.number().min(0).default(0),
  avgRating: z11.number().min(0).max(5).default(0),
  pendingOrders: z11.number().int().min(0).default(0),
  openComplaints: z11.number().int().min(0).default(0),
  notes: z11.string().optional(),
  adminNotes: z11.string().optional(),
  password: z11.string().min(8).optional()
  // كلمة مرور اختيارية — تُشفَّر بـ bcrypt قبل الحفظ
});
var distributorsAdminRouter = router({
  list: adminProcedure.query(async () => {
    return db.query.distributors.findMany({
      orderBy: [desc7(schema_exports.distributors.createdAt)]
    });
  }),
  getById: adminProcedure.input(z11.object({ id: z11.number().int() })).query(async ({ input }) => {
    const result = await db.query.distributors.findFirst({
      where: eq12(schema_exports.distributors.id, input.id)
    });
    if (!result) {
      throw new TRPCError8({ code: "NOT_FOUND", message: "\u0627\u0644\u0645\u0648\u0632\u0651\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    }
    return result;
  }),
  create: adminProcedure.input(distInput).mutation(async ({ input }) => {
    const existing = await db.query.distributors.findFirst({
      where: eq12(schema_exports.distributors.email, input.email)
    });
    if (existing) {
      throw new TRPCError8({
        code: "CONFLICT",
        message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B"
      });
    }
    const { password, ...rest } = input;
    const passwordHash = password ? await bcrypt4.hash(password, 10) : void 0;
    const now = Date.now();
    const [result] = await db.insert(schema_exports.distributors).values({ ...rest, passwordHash, createdAt: now, updatedAt: now });
    return { id: result.insertId };
  }),
  update: adminProcedure.input(z11.object({ id: z11.number().int() }).merge(distInput)).mutation(async ({ input }) => {
    const { id, ...data } = input;
    const existing = await db.query.distributors.findFirst({
      where: eq12(schema_exports.distributors.email, data.email)
    });
    if (existing && existing.id !== id) {
      throw new TRPCError8({
        code: "CONFLICT",
        message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B \u0644\u0645\u0648\u0632\u0639 \u0622\u062E\u0631"
      });
    }
    const { password, ...rest } = data;
    const passwordHash = password ? await bcrypt4.hash(password, 10) : void 0;
    const updateData = passwordHash ? { ...rest, passwordHash, updatedAt: Date.now() } : { ...rest, updatedAt: Date.now() };
    await db.update(schema_exports.distributors).set(updateData).where(eq12(schema_exports.distributors.id, id));
    return { ok: true };
  }),
  updateStatus: adminProcedure.input(
    z11.object({
      id: z11.number().int(),
      status: z11.enum(["active", "pending", "suspended", "rejected"])
    })
  ).mutation(async ({ input }) => {
    await db.update(schema_exports.distributors).set({ status: input.status, updatedAt: Date.now() }).where(eq12(schema_exports.distributors.id, input.id));
    return { ok: true };
  }),
  updateTier: adminProcedure.input(
    z11.object({
      id: z11.number().int(),
      tier: z11.enum(["bronze", "silver", "gold", "platinum"])
    })
  ).mutation(async ({ input }) => {
    await db.update(schema_exports.distributors).set({ tier: input.tier, updatedAt: Date.now() }).where(eq12(schema_exports.distributors.id, input.id));
    return { ok: true };
  }),
  delete: adminProcedure.input(z11.object({ id: z11.number().int() })).mutation(async ({ input }) => {
    await db.delete(schema_exports.distributors).where(eq12(schema_exports.distributors.id, input.id));
    return { ok: true };
  }),
  // بذر البيانات التجريبية
  seed: adminProcedure.mutation(async () => {
    const existing = await db.query.distributors.findFirst();
    if (existing) return { skipped: true, message: "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0648\u062C\u0648\u062F\u0629 \u0645\u0633\u0628\u0642\u0627\u064B" };
    const now = Date.now();
    const mockData = [
      {
        name: "\u0623\u062D\u0645\u062F \u0627\u0644\u0632\u0647\u0631\u0627\u0646\u064A",
        company: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0646\u062E\u0628\u0629 \u0644\u0644\u0645\u0642\u0627\u0648\u0644\u0627\u062A",
        city: "\u0627\u0644\u0631\u064A\u0627\u0636",
        region: "\u0627\u0644\u0631\u064A\u0627\u0636",
        phone: "0501234567",
        email: "ahmed@nakhba.sa",
        whatsapp: "0501234567",
        commercialReg: "1010123456",
        vatNumber: "300123456700003",
        bankName: "\u0627\u0644\u0628\u0646\u0643 \u0627\u0644\u0623\u0647\u0644\u064A",
        bankIban: "SA0380000000608010167519",
        status: "active",
        tier: "gold",
        joinDate: "2024-03-15",
        contractStart: "2024-03-15",
        contractEnd: "2026-03-15",
        creditLimit: 2e5,
        discountRate: 15,
        totalOrders: 134,
        totalRevenue: 498e3,
        avgRating: 4.8,
        pendingOrders: 3,
        openComplaints: 0,
        adminNotes: "\u0645\u0648\u0632\u0639 \u0645\u062A\u0645\u064A\u0632\u060C \u064A\u064F\u0646\u0635\u062D \u0628\u062A\u0631\u0642\u064A\u062A\u0647 \u0644\u0628\u0644\u0627\u062A\u064A\u0646\u064A"
      },
      {
        name: "\u0645\u062D\u0645\u062F \u0627\u0644\u0639\u0645\u0631\u064A",
        company: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u0628\u0646\u0627\u0621 \u0627\u0644\u062D\u062F\u064A\u062B",
        city: "\u062C\u062F\u0629",
        region: "\u0645\u0643\u0629 \u0627\u0644\u0645\u0643\u0631\u0645\u0629",
        phone: "0557891234",
        email: "m.omari@bena.sa",
        whatsapp: "0557891234",
        commercialReg: "4030234567",
        vatNumber: "300234567800003",
        bankName: "\u0628\u0646\u0643 \u0627\u0644\u0631\u0627\u062C\u062D\u064A",
        bankIban: "SA4420000001234567891234",
        status: "active",
        tier: "silver",
        joinDate: "2024-06-20",
        contractStart: "2024-06-20",
        contractEnd: "2026-06-20",
        creditLimit: 1e5,
        discountRate: 10,
        totalOrders: 89,
        totalRevenue: 312e3,
        avgRating: 4.5,
        pendingOrders: 1,
        openComplaints: 1
      },
      {
        name: "\u062E\u0627\u0644\u062F \u0627\u0644\u063A\u0627\u0645\u062F\u064A",
        company: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0625\u0639\u0645\u0627\u0631 \u0644\u0644\u062A\u0637\u0648\u064A\u0631",
        city: "\u0627\u0644\u062F\u0645\u0627\u0645",
        region: "\u0627\u0644\u0634\u0631\u0642\u064A\u0629",
        phone: "0509876543",
        email: "k.ghamdi@emar.sa",
        whatsapp: "0509876543",
        commercialReg: "2050345678",
        vatNumber: "300345678900003",
        bankName: "\u0628\u0646\u0643 \u0627\u0644\u0625\u0646\u0645\u0627\u0621",
        bankIban: "SA8055000000000001234567",
        status: "active",
        tier: "silver",
        joinDate: "2024-08-10",
        contractStart: "2024-08-10",
        contractEnd: "2026-08-10",
        creditLimit: 8e4,
        discountRate: 10,
        totalOrders: 67,
        totalRevenue: 241e3,
        avgRating: 4.2,
        pendingOrders: 0,
        openComplaints: 2
      },
      {
        name: "\u0641\u0647\u062F \u0627\u0644\u0642\u062D\u0637\u0627\u0646\u064A",
        company: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0641\u064A\u0635\u0644 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629",
        city: "\u0645\u0643\u0629",
        region: "\u0645\u0643\u0629 \u0627\u0644\u0645\u0643\u0631\u0645\u0629",
        phone: "0551234567",
        email: "fahad@faisal.sa",
        whatsapp: "0551234567",
        commercialReg: "4010456789",
        vatNumber: "300456789000003",
        bankName: "\u0627\u0644\u0628\u0646\u0643 \u0627\u0644\u0623\u0647\u0644\u064A",
        bankIban: "SA0380000000608010167520",
        status: "active",
        tier: "platinum",
        joinDate: "2023-11-05",
        contractStart: "2023-11-05",
        contractEnd: "2025-11-05",
        creditLimit: 5e5,
        discountRate: 20,
        totalOrders: 218,
        totalRevenue: 812e3,
        avgRating: 4.9,
        pendingOrders: 5,
        openComplaints: 0
      },
      {
        name: "\u0633\u0639\u062F \u0627\u0644\u0645\u0627\u0644\u0643\u064A",
        company: "\u0634\u0631\u0643\u0629 \u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u062E\u0644\u064A\u062C",
        city: "\u0623\u0628\u0647\u0627",
        region: "\u0639\u0633\u064A\u0631",
        phone: "0504567890",
        email: "saad@gulf-dev.sa",
        whatsapp: "0504567890",
        commercialReg: "5150567890",
        vatNumber: "300567890100003",
        bankName: "\u0628\u0646\u0643 \u0627\u0644\u0631\u0627\u062C\u062D\u064A",
        bankIban: "SA4420000001234567891235",
        status: "active",
        tier: "bronze",
        joinDate: "2025-01-12",
        contractStart: "2025-01-12",
        contractEnd: "2027-01-12",
        creditLimit: 4e4,
        discountRate: 5,
        totalOrders: 28,
        totalRevenue: 98e3,
        avgRating: 3.9,
        pendingOrders: 0,
        openComplaints: 1
      },
      {
        name: "\u0639\u0628\u062F\u0627\u0644\u0644\u0647 \u0627\u0644\u0634\u0647\u0631\u064A",
        company: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u0648\u0641\u0627\u0621 \u0644\u0644\u0628\u0646\u0627\u0621",
        city: "\u0627\u0644\u0637\u0627\u0626\u0641",
        region: "\u0645\u0643\u0629 \u0627\u0644\u0645\u0643\u0631\u0645\u0629",
        phone: "0558765432",
        email: "a.shahri@wafa.sa",
        status: "pending",
        tier: "bronze",
        joinDate: "2026-04-18",
        totalOrders: 0,
        totalRevenue: 0,
        avgRating: 0,
        pendingOrders: 0,
        openComplaints: 0,
        notes: "\u0645\u0642\u062F\u0645 \u0637\u0644\u0628 \u0627\u0646\u0636\u0645\u0627\u0645 \u062C\u062F\u064A\u062F - \u064A\u062D\u062A\u0627\u062C \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0648\u062B\u0627\u0626\u0642"
      },
      {
        name: "\u0646\u0627\u0635\u0631 \u0627\u0644\u062F\u0648\u0633\u0631\u064A",
        company: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0631\u064A\u0627\u062F\u0629 \u0644\u0644\u0645\u0642\u0627\u0648\u0644\u0627\u062A",
        city: "\u0627\u0644\u0631\u064A\u0627\u0636",
        region: "\u0627\u0644\u0631\u064A\u0627\u0636",
        phone: "0501112233",
        email: "nasser@riada.sa",
        status: "pending",
        tier: "bronze",
        joinDate: "2026-04-15",
        totalOrders: 0,
        totalRevenue: 0,
        avgRating: 0,
        pendingOrders: 0,
        openComplaints: 0,
        notes: "\u0637\u0644\u0628 \u0627\u0646\u0636\u0645\u0627\u0645 - \u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0633\u062C\u0644 \u0627\u0644\u062A\u062C\u0627\u0631\u064A"
      },
      {
        name: "\u0637\u0627\u0631\u0642 \u0627\u0644\u062D\u0631\u0628\u064A",
        company: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062D\u0631\u0628\u064A \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629",
        city: "\u0627\u0644\u0645\u062F\u064A\u0646\u0629",
        region: "\u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0627\u0644\u0645\u0646\u0648\u0631\u0629",
        phone: "0559988776",
        email: "t.harbi@harbi.sa",
        status: "pending",
        tier: "bronze",
        joinDate: "2026-04-10",
        totalOrders: 0,
        totalRevenue: 0,
        avgRating: 0,
        pendingOrders: 0,
        openComplaints: 0
      },
      {
        name: "\u064A\u0648\u0633\u0641 \u0627\u0644\u0633\u0628\u064A\u0639\u064A",
        company: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0633\u0628\u064A\u0639\u064A \u0644\u0644\u0625\u0646\u0634\u0627\u0621\u0627\u062A",
        city: "\u062C\u062F\u0629",
        region: "\u0645\u0643\u0629 \u0627\u0644\u0645\u0643\u0631\u0645\u0629",
        phone: "0503344556",
        email: "y.subaie@subaie.sa",
        status: "suspended",
        tier: "bronze",
        joinDate: "2025-05-20",
        totalOrders: 12,
        totalRevenue: 41e3,
        avgRating: 2.8,
        pendingOrders: 0,
        openComplaints: 3,
        notes: "\u0645\u0648\u0642\u0648\u0641 \u0628\u0633\u0628\u0628 \u062A\u0623\u062E\u0631 \u0627\u0644\u0633\u062F\u0627\u062F \u0627\u0644\u0645\u062A\u0643\u0631\u0631"
      }
    ];
    for (const d of mockData) {
      await db.insert(schema_exports.distributors).values({ ...d, createdAt: now, updatedAt: now });
    }
    return { ok: true, count: mockData.length };
  }),
  // ── تعيين/تغيير كلمة مرور الموزّع (من لوحة الإدارة) ────────────────────
  setPassword: adminProcedure.input(
    z11.object({
      id: z11.number().int(),
      password: z11.string().min(8, "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 8 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644")
    })
  ).mutation(async ({ input }) => {
    const existing = await db.query.distributors.findFirst({
      where: eq12(schema_exports.distributors.id, input.id)
    });
    if (!existing)
      throw new TRPCError8({ code: "NOT_FOUND", message: "\u0627\u0644\u0645\u0648\u0632\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    const passwordHash = await bcrypt4.hash(input.password, 10);
    await db.update(schema_exports.distributors).set({ passwordHash, updatedAt: Date.now() }).where(eq12(schema_exports.distributors.id, input.id));
    return { ok: true };
  })
});

// server/distributors.router.ts
import { TRPCError as TRPCError9 } from "@trpc/server";
import { z as z12 } from "zod/v4";
import bcrypt5 from "bcryptjs";
import { nanoid as nanoid4 } from "nanoid";
import { eq as eq13, and as and8, ne, desc as desc8 } from "drizzle-orm";
var DISTRIBUTOR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1e3,
  // 7 أيام
  path: "/"
};
function toDistributorProfile(d, creditUsed = 0) {
  return {
    id: String(d.id),
    name: d.name,
    company: d.company,
    email: d.email,
    phone: d.phone,
    city: d.city,
    region: d.region ?? "",
    website: d.website ?? "",
    whatsapp: d.whatsapp ?? "",
    commercialReg: d.commercialReg ?? "",
    vatNumber: d.vatNumber ?? "",
    bankName: d.bankName ?? "",
    bankIban: d.bankIban ?? "",
    tier: d.tier,
    discount: d.discountRate ?? 0,
    creditLimit: d.creditLimit ?? 0,
    creditUsed,
    joinDate: d.joinDate,
    // salesRep غير موجود في DB حالياً — يُعاد كسلسلة فارغة
    salesRep: "",
    status: d.status
  };
}
var distributorsRouter = router({
  // ── تسجيل الدخول ────────────────────────────────────────────────────────
  login: publicProcedure.input(
    z12.object({
      email: z12.string().email(),
      password: z12.string().min(1)
    })
  ).mutation(async ({ input, ctx }) => {
    const distributor = await db.query.distributors.findFirst({
      where: eq13(schema_exports.distributors.email, input.email)
    });
    if (!distributor)
      throw new TRPCError9({
        code: "UNAUTHORIZED",
        message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629"
      });
    if (distributor.status === "suspended")
      throw new TRPCError9({
        code: "FORBIDDEN",
        message: "\u062A\u0645 \u062A\u0639\u0644\u064A\u0642 \u062D\u0633\u0627\u0628\u0643. \u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0625\u062F\u0627\u0631\u0629."
      });
    if (distributor.status === "pending")
      throw new TRPCError9({
        code: "FORBIDDEN",
        message: "\u062D\u0633\u0627\u0628\u0643 \u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629. \u0633\u064A\u062A\u0645 \u0625\u0634\u0639\u0627\u0631\u0643 \u0639\u0646\u062F \u0627\u0644\u062A\u0641\u0639\u064A\u0644."
      });
    if (distributor.status === "rejected")
      throw new TRPCError9({
        code: "FORBIDDEN",
        message: "\u062A\u0645 \u0631\u0641\u0636 \u0637\u0644\u0628 \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645. \u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0625\u062F\u0627\u0631\u0629."
      });
    if (!distributor.passwordHash)
      throw new TRPCError9({
        code: "FORBIDDEN",
        message: "\u0644\u0645 \u064A\u064F\u0639\u064A\u064E\u0651\u0646 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u0644\u0647\u0630\u0627 \u0627\u0644\u062D\u0633\u0627\u0628. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0625\u062F\u0627\u0631\u0629."
      });
    const valid = await bcrypt5.compare(
      input.password,
      distributor.passwordHash
    );
    if (!valid)
      throw new TRPCError9({
        code: "UNAUTHORIZED",
        message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629"
      });
    const token = nanoid4(64);
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1e3;
    await db.insert(schema_exports.distributorSessions).values({
      distributorId: distributor.id,
      token,
      expiresAt,
      createdAt: Date.now()
    });
    ctx.res.cookie("distributorSession", token, DISTRIBUTOR_COOKIE_OPTIONS);
    return { distributor: toDistributorProfile(distributor) };
  }),
  // ── تسجيل الخروج ────────────────────────────────────────────────────────
  logout: distributorProcedure.mutation(async ({ ctx }) => {
    const token = ctx.distributorToken;
    ctx.res.clearCookie("distributorSession", { path: "/" });
    await db.delete(schema_exports.distributorSessions).where(eq13(schema_exports.distributorSessions.token, token));
    return { success: true };
  }),
  // ── الملف الشخصي (Batch 4-a: creditUsed حقيقي) ────────────────────────────
  me: distributorProcedure.query(async ({ ctx }) => {
    const distributor = ctx.distributor;
    const distId = String(distributor.id);
    const unpaidOrders = await db.query.distributorOrders.findMany({
      where: and8(
        eq13(schema_exports.distributorOrders.distributorId, distId),
        ne(schema_exports.distributorOrders.paymentStatus, "paid")
      ),
      columns: { totalAmount: true }
    });
    const creditUsed = unpaidOrders.reduce(
      (s, o) => s + (o.totalAmount ?? 0),
      0
    );
    return toDistributorProfile(distributor, creditUsed);
  }),
  // ── إحصائيات الموزّع (Batch 4-a) ──────────────────────────────────────────
  myStats: distributorProcedure.query(async ({ ctx }) => {
    const distId = String(ctx.distributor.id);
    const allOrders = await db.query.distributorOrders.findMany({
      where: eq13(schema_exports.distributorOrders.distributorId, distId),
      orderBy: [desc8(schema_exports.distributorOrders.createdAt)]
    });
    const totalRevenue = allOrders.reduce(
      (s, o) => s + (o.totalAmount ?? 0),
      0
    );
    const totalOrders = allOrders.length;
    const activeOrders = allOrders.filter(
      (o) => o.status !== "delivered" && o.status !== "cancelled"
    ).length;
    const deliveredOrders = allOrders.filter(
      (o) => o.status === "delivered"
    ).length;
    const now = /* @__PURE__ */ new Date();
    const thisMonthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    ).getTime();
    const lastMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    ).getTime();
    const thisMonthRevenue = allOrders.filter((o) => o.createdAt >= thisMonthStart).reduce((s, o) => s + (o.totalAmount ?? 0), 0);
    const lastMonthRevenue = allOrders.filter(
      (o) => o.createdAt >= lastMonthStart && o.createdAt < thisMonthStart
    ).reduce((s, o) => s + (o.totalAmount ?? 0), 0);
    const revenueGrowthPct = lastMonthRevenue > 0 ? Math.round(
      (thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100
    ) : 0;
    const ARABIC_MONTHS = [
      "\u064A\u0646\u0627\u064A\u0631",
      "\u0641\u0628\u0631\u0627\u064A\u0631",
      "\u0645\u0627\u0631\u0633",
      "\u0623\u0628\u0631\u064A\u0644",
      "\u0645\u0627\u064A\u0648",
      "\u064A\u0648\u0646\u064A\u0648",
      "\u064A\u0648\u0644\u064A\u0648",
      "\u0623\u063A\u0633\u0637\u0633",
      "\u0633\u0628\u062A\u0645\u0628\u0631",
      "\u0623\u0643\u062A\u0648\u0628\u0631",
      "\u0646\u0648\u0641\u0645\u0628\u0631",
      "\u062F\u064A\u0633\u0645\u0628\u0631"
    ];
    const EN_MONTHS = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ];
    const monthlyMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] = {
        month: ARABIC_MONTHS[d.getMonth()],
        monthEn: EN_MONTHS[d.getMonth()],
        revenue: 0,
        orders: 0
      };
    }
    for (const o of allOrders) {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyMap[key]) {
        monthlyMap[key].revenue += o.totalAmount ?? 0;
        monthlyMap[key].orders += 1;
      }
    }
    const statusCounts = {};
    for (const o of allOrders) {
      statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
    }
    return {
      totalRevenue,
      totalOrders,
      activeOrders,
      deliveredOrders,
      thisMonthRevenue,
      lastMonthRevenue,
      revenueGrowthPct,
      monthly: Object.values(monthlyMap),
      statusCounts
    };
  }),
  // ── طلبات الموزّع (Batch 4-a) ─────────────────────────────────────────────
  myOrders: distributorProcedure.input(
    z12.object({
      status: z12.enum([
        "draft",
        "pending",
        "confirmed",
        "manufacturing",
        "shipped",
        "delivered",
        "cancelled"
      ]).optional(),
      limit: z12.number().int().min(1).max(200).default(50)
    }).optional()
  ).query(async ({ ctx, input }) => {
    const distId = String(ctx.distributor.id);
    const whereClause = input?.status ? and8(
      eq13(schema_exports.distributorOrders.distributorId, distId),
      eq13(schema_exports.distributorOrders.status, input.status)
    ) : eq13(schema_exports.distributorOrders.distributorId, distId);
    const orders = await db.query.distributorOrders.findMany({
      where: whereClause,
      orderBy: [desc8(schema_exports.distributorOrders.createdAt)],
      limit: input?.limit ?? 50
    });
    return orders.map((o) => ({
      ...o,
      items: (() => {
        try {
          return JSON.parse(o.items);
        } catch {
          return [];
        }
      })()
    }));
  }),
  // ── تحديث الملف الشخصي للموزع ─────────────────────────────────────────────
  updateProfile: distributorProcedure.input(
    z12.object({
      name: z12.string().min(1).max(255),
      company: z12.string().min(1).max(255),
      phone: z12.string().min(1).max(50),
      city: z12.string().max(100),
      region: z12.string().max(100).optional(),
      website: z12.string().max(255).optional(),
      whatsapp: z12.string().max(50).optional(),
      commercialReg: z12.string().max(50).optional(),
      vatNumber: z12.string().max(20).optional(),
      bankName: z12.string().max(255).optional(),
      bankIban: z12.string().max(40).optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const distId = ctx.distributor.id;
    await db.update(schema_exports.distributors).set({
      ...input,
      updatedAt: Date.now()
    }).where(eq13(schema_exports.distributors.id, distId));
    return { success: true };
  }),
  // ── تحديث كلمة المرور للموزع ─────────────────────────────────────────────
  updatePassword: distributorProcedure.input(
    z12.object({
      currentPassword: z12.string().min(1),
      newPassword: z12.string().min(8)
    })
  ).mutation(async ({ ctx, input }) => {
    const distId = ctx.distributor.id;
    const distributor = await db.query.distributors.findFirst({
      where: eq13(schema_exports.distributors.id, distId)
    });
    if (!distributor || !distributor.passwordHash) {
      throw new TRPCError9({
        code: "NOT_FOUND",
        message: "\u0627\u0644\u0645\u0648\u0632\u0639 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F"
      });
    }
    const valid = await bcrypt5.compare(
      input.currentPassword,
      distributor.passwordHash
    );
    if (!valid) {
      throw new TRPCError9({
        code: "UNAUTHORIZED",
        message: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629"
      });
    }
    const passwordHash = await bcrypt5.hash(input.newPassword, 10);
    await db.update(schema_exports.distributors).set({
      passwordHash,
      updatedAt: Date.now()
    }).where(eq13(schema_exports.distributors.id, distId));
    return { success: true };
  })
});

// server/complaints.router.ts
import { TRPCError as TRPCError10 } from "@trpc/server";
import { z as z13 } from "zod/v4";
import { eq as eq14, desc as desc9, and as and9 } from "drizzle-orm";
var complaintStatusEnum = z13.enum([
  "open",
  "under_review",
  "resolved",
  "rejected",
  "return_pending"
]);
var complaintTypeEnum = z13.enum([
  "size",
  "color",
  "damage",
  "shortage",
  "delay",
  "quality",
  "other"
]);
var complaintsRouter = router({
  // ── List all complaints with their messages ──────────────────────────────
  list: adminProcedure.input(z13.object({ distributorId: z13.number().int().optional() }).optional()).query(async ({ input }) => {
    const rows = await db.query.complaints.findMany({
      where: input?.distributorId !== void 0 ? eq14(schema_exports.complaints.distributorId, input.distributorId) : void 0,
      orderBy: [desc9(schema_exports.complaints.createdAt)]
    });
    const messages = await db.query.complaintMessages.findMany({
      orderBy: [desc9(schema_exports.complaintMessages.createdAt)]
    });
    return rows.map((c) => ({
      ...c,
      messages: messages.filter((m) => m.complaintId === c.id)
    }));
  }),
  // ── Create a new complaint ────────────────────────────────────────────────
  create: adminProcedure.input(
    z13.object({
      distributorId: z13.number().optional(),
      distributorName: z13.string().min(1),
      companyName: z13.string().optional(),
      orderNumber: z13.string().min(1),
      product: z13.string().min(1),
      type: complaintTypeEnum,
      description: z13.string().min(1),
      images: z13.array(z13.string()).default([])
    })
  ).mutation(async ({ input }) => {
    const now = Date.now();
    const year = (/* @__PURE__ */ new Date()).getFullYear();
    const existingCount = (await db.query.complaints.findMany()).length;
    const ticketNumber = `TKT-${year}-${String(existingCount + 1).padStart(4, "0")}`;
    const [result] = await db.insert(schema_exports.complaints).values({
      ticketNumber,
      distributorId: input.distributorId ?? null,
      distributorName: input.distributorName,
      companyName: input.companyName ?? null,
      orderNumber: input.orderNumber,
      product: input.product,
      type: input.type,
      description: input.description,
      images: input.images,
      createdAt: now,
      updatedAt: now
    });
    const id = result.insertId;
    await db.insert(schema_exports.complaintMessages).values({
      complaintId: id,
      from: "distributor",
      text: input.description,
      date: new Date(now).toISOString().split("T")[0],
      createdAt: now
    });
    return { id, ticketNumber, success: true };
  }),
  // ── Update status + optional admin reply ─────────────────────────────────
  updateStatus: adminProcedure.input(
    z13.object({
      id: z13.number(),
      status: complaintStatusEnum,
      reply: z13.string().optional(),
      satisfactionRating: z13.number().int().min(1).max(5).optional()
    })
  ).mutation(async ({ input }) => {
    const now = Date.now();
    const today = new Date(now).toISOString().split("T")[0];
    await db.update(schema_exports.complaints).set({
      status: input.status,
      updatedAt: now,
      ...input.status === "resolved" ? { resolvedAt: now } : {},
      ...input.satisfactionRating !== void 0 ? { satisfactionRating: input.satisfactionRating } : {}
    }).where(eq14(schema_exports.complaints.id, input.id));
    if (input.reply?.trim()) {
      await db.insert(schema_exports.complaintMessages).values({
        complaintId: input.id,
        from: "admin",
        text: input.reply.trim(),
        date: today,
        createdAt: now
      });
    }
    return { success: true };
  }),
  // ── myComplaints (Distributor) ──────────────────────────────────────────
  myComplaints: distributorProcedure.query(async ({ ctx }) => {
    const rows = await db.query.complaints.findMany({
      where: eq14(schema_exports.complaints.distributorId, ctx.distributor.id),
      orderBy: [desc9(schema_exports.complaints.createdAt)]
    });
    const ids = rows.map((c) => c.id);
    const messages = ids.length ? await db.query.complaintMessages.findMany({
      orderBy: [desc9(schema_exports.complaintMessages.createdAt)]
    }) : [];
    return rows.map((c) => ({
      ...c,
      messages: messages.filter((m) => m.complaintId === c.id)
    }));
  }),
  // ── submitComplaint (Distributor) ───────────────────────────────────────
  submitComplaint: distributorProcedure.input(
    z13.object({
      orderNumber: z13.string().min(1),
      product: z13.string().min(1),
      type: complaintTypeEnum,
      description: z13.string().min(1),
      images: z13.array(z13.string()).default([])
    })
  ).mutation(async ({ ctx, input }) => {
    const now = Date.now();
    const year = (/* @__PURE__ */ new Date()).getFullYear();
    const existingCount = (await db.query.complaints.findMany()).length;
    const ticketNumber = `TKT-${year}-${String(existingCount + 1).padStart(4, "0")}`;
    const [result] = await db.insert(schema_exports.complaints).values({
      ticketNumber,
      distributorId: ctx.distributor.id,
      distributorName: ctx.distributor.name,
      companyName: ctx.distributor.company ?? null,
      orderNumber: input.orderNumber,
      product: input.product,
      type: input.type,
      description: input.description,
      images: input.images,
      createdAt: now,
      updatedAt: now
    });
    const id = result.insertId;
    await db.insert(schema_exports.complaintMessages).values({
      complaintId: id,
      from: "distributor",
      text: input.description,
      date: new Date(now).toISOString().split("T")[0],
      createdAt: now
    });
    return { id, ticketNumber, success: true };
  }),
  // ── addReply (Distributor) ──────────────────────────────────────────────
  addReply: distributorProcedure.input(z13.object({ complaintId: z13.number(), text: z13.string().min(1) })).mutation(async ({ ctx, input }) => {
    const complaint = await db.query.complaints.findFirst({
      where: and9(
        eq14(schema_exports.complaints.id, input.complaintId),
        eq14(schema_exports.complaints.distributorId, ctx.distributor.id)
      )
    });
    if (!complaint) {
      throw new TRPCError10({ code: "NOT_FOUND", message: "\u0627\u0644\u0634\u0643\u0648\u0649 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
    }
    const now = Date.now();
    await db.insert(schema_exports.complaintMessages).values({
      complaintId: input.complaintId,
      from: "distributor",
      text: input.text.trim(),
      date: new Date(now).toISOString().split("T")[0],
      createdAt: now
    });
    await db.update(schema_exports.complaints).set({ updatedAt: now }).where(eq14(schema_exports.complaints.id, input.complaintId));
    return { success: true };
  }),
  // ── Seed sample complaints for testing ───────────────────────────────────
  seed: adminProcedure.mutation(async () => {
    const existing = await db.query.complaints.findMany();
    if (existing.length > 0) return { skipped: true, count: existing.length };
    const now = Date.now();
    const year = (/* @__PURE__ */ new Date()).getFullYear();
    const samples = [
      {
        ticketNumber: `TKT-${year}-0001`,
        distributorName: "\u0623\u062D\u0645\u062F \u0627\u0644\u0632\u0647\u0631\u0627\u0646\u064A",
        companyName: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0646\u062E\u0628\u0629",
        orderNumber: "SND-0001",
        product: "\u0628\u0627\u0628 \u062E\u0634\u0628\u064A \u0643\u0644\u0627\u0633\u064A\u0643\u064A 90\xD7210",
        type: "damage",
        status: "open",
        description: "\u0648\u0635\u0644\u062A \u0627\u0644\u0634\u062D\u0646\u0629 \u0648\u0628\u0647\u0627 \u0643\u0633\u0631 \u0648\u0627\u0636\u062D \u0641\u064A \u0625\u0637\u0627\u0631 \u0627\u0644\u0628\u0627\u0628 \u0627\u0644\u0623\u0648\u0644 \u0645\u0646 \u0627\u0644\u0623\u0633\u0641\u0644.",
        images: [],
        createdAt: now - 6 * 864e5,
        updatedAt: now - 6 * 864e5
      },
      {
        ticketNumber: `TKT-${year}-0002`,
        distributorName: "\u0645\u062D\u0645\u062F \u0627\u0644\u0639\u0645\u0631\u064A",
        companyName: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u0628\u0646\u0627\u0621 \u0627\u0644\u062D\u062F\u064A\u062B",
        orderNumber: "SND-0002",
        product: "\u0628\u0627\u0628 \u062E\u0627\u0631\u062C\u064A \u0641\u0627\u062E\u0631 100\xD7220",
        type: "color",
        status: "under_review",
        description: "\u0627\u0644\u0644\u0648\u0646 \u0627\u0644\u0645\u0633\u062A\u0644\u0645 \u0645\u062E\u062A\u0644\u0641 \u062A\u0645\u0627\u0645\u0627\u064B \u0639\u0646 \u0627\u0644\u0639\u064A\u0646\u0629 \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629. \u0637\u0644\u0628\u0646\u0627 \u0627\u0644\u062C\u0648\u0632\u064A \u0627\u0644\u062F\u0627\u0643\u0646 \u0648\u0648\u0635\u0644 \u0627\u0644\u0639\u0633\u0644\u064A \u0627\u0644\u0641\u0627\u062A\u062D.",
        images: [],
        createdAt: now - 8 * 864e5,
        updatedAt: now - 7 * 864e5
      },
      {
        ticketNumber: `TKT-${year}-0003`,
        distributorName: "\u0641\u0647\u062F \u0627\u0644\u0642\u062D\u0637\u0627\u0646\u064A",
        companyName: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0641\u064A\u0635\u0644",
        orderNumber: "SND-0003",
        product: "\u0628\u0627\u0628 \u062F\u0627\u062E\u0644\u064A \u0639\u0635\u0631\u064A 80\xD7200",
        type: "shortage",
        status: "resolved",
        description: "\u0627\u0644\u0637\u0644\u0628 \u0643\u0627\u0646 6 \u0623\u0628\u0648\u0627\u0628\u060C \u0648\u0635\u0644 5 \u0623\u0628\u0648\u0627\u0628 \u0641\u0642\u0637.",
        images: [],
        satisfactionRating: 5,
        resolvedAt: now - 3 * 864e5,
        createdAt: now - 14 * 864e5,
        updatedAt: now - 3 * 864e5
      }
    ];
    const msgs = [
      {
        ticketIdx: 0,
        from: "distributor",
        text: samples[0].description,
        daysAgo: 6
      },
      {
        ticketIdx: 1,
        from: "distributor",
        text: samples[1].description,
        daysAgo: 8
      },
      {
        ticketIdx: 1,
        from: "admin",
        text: "\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0634\u0643\u0648\u0627\u0643\u0645 \u0648\u062C\u0627\u0631\u064D \u0645\u0631\u0627\u062C\u0639\u0629 \u0623\u0645\u0631 \u0627\u0644\u0625\u0646\u062A\u0627\u062C \u0644\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0645\u0648\u0627\u0635\u0641\u0627\u062A.",
        daysAgo: 7
      },
      {
        ticketIdx: 2,
        from: "distributor",
        text: samples[2].description,
        daysAgo: 14
      },
      {
        ticketIdx: 2,
        from: "admin",
        text: "\u062A\u0645 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0645\u0634\u0643\u0644\u0629 \u0648\u0633\u064A\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0628\u0627\u0628 \u0627\u0644\u0645\u0641\u0642\u0648\u062F \u062E\u0644\u0627\u0644 3 \u0623\u064A\u0627\u0645.",
        daysAgo: 13
      },
      {
        ticketIdx: 2,
        from: "distributor",
        text: "\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u0628\u0627\u0628 \u0627\u0644\u0645\u0641\u0642\u0648\u062F. \u0634\u0643\u0631\u0627\u064B \u0639\u0644\u0649 \u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629.",
        daysAgo: 3
      }
    ];
    const ids = [];
    for (const s of samples) {
      const [r] = await db.insert(schema_exports.complaints).values(s);
      ids.push(r.insertId);
    }
    for (const m of msgs) {
      const ts = now - m.daysAgo * 864e5;
      await db.insert(schema_exports.complaintMessages).values({
        complaintId: ids[m.ticketIdx],
        from: m.from,
        text: m.text,
        date: new Date(ts).toISOString().split("T")[0],
        createdAt: ts
      });
    }
    return { success: true, count: samples.length };
  })
});

// server/qc.router.ts
import { z as z14 } from "zod/v4";
import { eq as eq15, desc as desc10 } from "drizzle-orm";
var qcRouter = router({
  // ── جلب كل الفحوصات ──────────────────────────────────────────
  list: adminProcedure.query(async () => {
    const rows = await db.query.qcInspections.findMany({
      orderBy: [desc10(schema_exports.qcInspections.createdAt)]
    });
    return rows;
  }),
  // ── إنشاء فحص جديد ───────────────────────────────────────────
  create: adminProcedure.input(
    z14.object({
      orderNumber: z14.string().min(1),
      orderSource: z14.enum(["door_order", "distributor_order", "manual"]).default("manual"),
      sourceId: z14.number().optional(),
      distributorName: z14.string().min(1),
      totalDoors: z14.number().int().min(1).default(1),
      qcType: z14.enum(["incoming", "final", "po_matching"]),
      inspector: z14.string().default(""),
      checkItems: z14.record(z14.string(), z14.union([z14.boolean(), z14.null()])).optional(),
      issues: z14.array(z14.string()).default([]),
      photos: z14.number().int().min(0).default(0),
      notes: z14.string().optional()
    })
  ).mutation(async ({ input }) => {
    const now = Date.now();
    let result = "pending";
    if (input.checkItems) {
      const vals = Object.values(input.checkItems);
      const answered = vals.filter((v) => v !== null);
      if (answered.length === vals.length && vals.length > 0) {
        result = vals.every((v) => v === true) ? "pass" : "fail";
      }
    }
    if (input.issues && input.issues.length > 0) result = "fail";
    const [res] = await db.insert(schema_exports.qcInspections).values({
      orderNumber: input.orderNumber,
      orderSource: input.orderSource,
      sourceId: input.sourceId ?? null,
      distributorName: input.distributorName,
      totalDoors: input.totalDoors,
      qcType: input.qcType,
      result,
      inspector: input.inspector,
      checkItems: input.checkItems ?? null,
      issues: input.issues,
      photos: input.photos,
      notes: input.notes ?? null,
      inspectedAt: now,
      createdAt: now,
      updatedAt: now
    });
    return { id: res.insertId, result };
  }),
  // ── تحديث نتيجة الفحص (اعتماد / عزل) ─────────────────────────
  updateResult: adminProcedure.input(
    z14.object({
      id: z14.number(),
      result: z14.enum(["pass", "fail"]),
      notes: z14.string().optional()
    })
  ).mutation(async ({ input }) => {
    await db.update(schema_exports.qcInspections).set({
      result: input.result,
      notes: input.notes,
      updatedAt: Date.now()
    }).where(eq15(schema_exports.qcInspections.id, input.id));
    return { success: true };
  }),
  // ── بيانات تجريبية ────────────────────────────────────────────
  seed: adminProcedure.mutation(async () => {
    const now = Date.now();
    const seeds = [
      {
        orderNumber: "ORD-2026-0452",
        orderSource: "door_order",
        distributorName: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u0646\u062E\u0628\u0629 \u0644\u0644\u062A\u0648\u0631\u064A\u062F\u0627\u062A",
        totalDoors: 24,
        qcType: "incoming",
        result: "pass",
        inspector: "\u0645. \u0633\u0627\u0644\u0645 \u0627\u0644\u0639\u0645\u0631\u064A",
        checkItems: {
          color: true,
          thickness: true,
          straightness: true,
          defects: true
        },
        issues: [],
        photos: 8,
        notes: "\u062F\u0641\u0639\u0629 \u0633\u0644\u064A\u0645\u0629 - \u0644\u0627 \u0645\u0644\u0627\u062D\u0638\u0627\u062A",
        inspectedAt: now - 1e3 * 60 * 60 * 48,
        createdAt: now - 1e3 * 60 * 60 * 48,
        updatedAt: now - 1e3 * 60 * 60 * 48
      },
      {
        orderNumber: "ORD-2026-0453",
        orderSource: "distributor_order",
        distributorName: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0631\u0627\u0634\u062F \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629",
        totalDoors: 120,
        qcType: "final",
        result: "pending",
        inspector: "\u0645. \u0641\u0647\u062F \u0627\u0644\u0632\u0647\u0631\u0627\u0646\u064A",
        checkItems: {
          dimensions: true,
          color: true,
          direction: null,
          lockPosition: null,
          defects: false,
          functional: null
        },
        issues: ["3 \u0623\u0628\u0648\u0627\u0628 \u0628\u0647\u0627 \u062E\u062F\u0634 \u0637\u0641\u064A\u0641 \u0641\u064A \u0627\u0644\u062D\u0627\u0641\u0629", "\u0628\u0627\u0628 \u0648\u0627\u062D\u062F \u0628\u0645\u0642\u0627\u0633 \u0645\u062E\u062A\u0644\u0641"],
        photos: 24,
        notes: null,
        inspectedAt: now - 1e3 * 60 * 60 * 24,
        createdAt: now - 1e3 * 60 * 60 * 24,
        updatedAt: now - 1e3 * 60 * 60 * 24
      },
      {
        orderNumber: "ORD-2026-0451",
        orderSource: "door_order",
        distributorName: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0623\u0641\u0642 \u0644\u0644\u0645\u0642\u0627\u0648\u0644\u0627\u062A",
        totalDoors: 48,
        qcType: "incoming",
        result: "fail",
        inspector: "\u0645. \u062E\u0627\u0644\u062F \u0627\u0644\u0645\u0637\u064A\u0631\u064A",
        checkItems: {
          color: false,
          thickness: true,
          straightness: true,
          defects: true
        },
        issues: ["\u062F\u0641\u0639\u0629 \u0627\u0644\u0625\u0637\u0627\u0631\u0627\u062A \u0644\u0627 \u062A\u0637\u0627\u0628\u0642 \u0627\u0644\u0645\u0648\u0627\u0635\u0641\u0627\u062A - \u0627\u0644\u0644\u0648\u0646 \u0645\u062E\u062A\u0644\u0641"],
        photos: 12,
        notes: "\u062A\u0645 \u0639\u0632\u0644 \u0627\u0644\u062F\u0641\u0639\u0629 - \u0625\u0634\u0639\u0627\u0631 \u0627\u0644\u0645\u0648\u0631\u062F",
        inspectedAt: now - 1e3 * 60 * 60 * 72,
        createdAt: now - 1e3 * 60 * 60 * 72,
        updatedAt: now - 1e3 * 60 * 60 * 72
      },
      {
        orderNumber: "ORD-2026-0455",
        orderSource: "distributor_order",
        distributorName: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u0625\u062A\u0642\u0627\u0646 \u0644\u0644\u0645\u0642\u0627\u0648\u0644\u0627\u062A",
        totalDoors: 60,
        qcType: "po_matching",
        result: "pass",
        inspector: "\u0645. \u0623\u062D\u0645\u062F \u0627\u0644\u0634\u0645\u0631\u064A",
        checkItems: { qtyMatch: true, allItems: true, defects: true },
        issues: [],
        photos: 6,
        notes: null,
        inspectedAt: now - 1e3 * 60 * 60 * 36,
        createdAt: now - 1e3 * 60 * 60 * 36,
        updatedAt: now - 1e3 * 60 * 60 * 36
      }
    ];
    for (const s of seeds) {
      await db.insert(schema_exports.qcInspections).values(s);
    }
    return { seeded: seeds.length };
  })
});

// server/packing.router.ts
import { z as z15 } from "zod/v4";
import { eq as eq16, desc as desc11 } from "drizzle-orm";
var packingRouter = router({
  // ── جلب كل طلبات التغليف ─────────────────────────────────────
  list: adminProcedure.query(async () => {
    const rows = await db.query.packingOrders.findMany({
      orderBy: [desc11(schema_exports.packingOrders.createdAt)]
    });
    return rows;
  }),
  // ── تحديث مرحلة (تغليف / تسليم / محاسبة) ────────────────────
  updateStage: adminProcedure.input(
    z15.object({
      id: z15.number(),
      stage: z15.enum(["packing", "delivery", "accounting"]),
      status: z15.enum(["pending", "in_progress", "done"])
    })
  ).mutation(async ({ input }) => {
    const now = Date.now();
    if (input.stage === "packing") {
      await db.update(schema_exports.packingOrders).set({ packingStatus: input.status, updatedAt: now }).where(eq16(schema_exports.packingOrders.id, input.id));
    } else if (input.stage === "delivery") {
      await db.update(schema_exports.packingOrders).set({ deliveryStatus: input.status, updatedAt: now }).where(eq16(schema_exports.packingOrders.id, input.id));
    } else {
      await db.update(schema_exports.packingOrders).set({ accountingStatus: input.status, updatedAt: now }).where(eq16(schema_exports.packingOrders.id, input.id));
    }
    return { success: true };
  }),
  // ── إقفال الحساب (تسجيل الدفعة الكاملة) ─────────────────────
  closeAccounting: adminProcedure.input(z15.object({ id: z15.number() })).mutation(async ({ input }) => {
    const [order] = await db.query.packingOrders.findMany({
      where: eq16(schema_exports.packingOrders.id, input.id),
      limit: 1
    });
    if (!order) throw new Error("Packing order not found");
    await db.update(schema_exports.packingOrders).set({
      paidAmount: order.totalValue,
      accountingStatus: "done",
      updatedAt: Date.now()
    }).where(eq16(schema_exports.packingOrders.id, input.id));
    return { success: true };
  }),
  // ── بيانات تجريبية ───────────────────────────────────────────
  seed: adminProcedure.mutation(async () => {
    const now = Date.now();
    await db.insert(schema_exports.packingOrders).values([
      {
        orderNumber: "ORD-2026-0453",
        distributorName: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0631\u0627\u0634\u062F \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629",
        totalDoors: 120,
        packingType: "\u0645\u062D\u0644\u064A",
        packingMethod: "\u0641\u0631\u062F\u064A",
        packingStatus: "in_progress",
        deliveryDate: "2026-05-25",
        deliveryStatus: "pending",
        accountingStatus: "pending",
        totalValue: 216e3,
        paidAmount: 108e3,
        doors: [
          {
            code: "DR-001",
            dir: "\u064A\u0645\u064A\u0646",
            room: "\u063A\u0631\u0641\u0629 \u0631\u0626\u064A\u0633\u064A\u0629 - \u062F\u0648\u0631 1",
            packed: true
          },
          {
            code: "DR-002",
            dir: "\u064A\u0633\u0627\u0631",
            room: "\u063A\u0631\u0641\u0629 \u0646\u0648\u0645 - \u062F\u0648\u0631 1",
            packed: true
          },
          { code: "DR-003", dir: "\u064A\u0645\u064A\u0646", room: "\u062D\u0645\u0627\u0645 - \u062F\u0648\u0631 1", packed: false }
        ],
        documents: {
          packingList: true,
          invoice: true,
          photos: 12,
          certificate: false
        },
        createdAt: now - 3 * 864e5,
        updatedAt: now - 3 * 864e5
      },
      {
        orderNumber: "ORD-2026-0455",
        distributorName: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u0625\u062A\u0642\u0627\u0646 \u0644\u0644\u0645\u0642\u0627\u0648\u0644\u0627\u062A",
        totalDoors: 60,
        packingType: "\u0645\u062D\u0644\u064A",
        packingMethod: "\u062C\u0645\u0627\u0639\u064A",
        packingStatus: "done",
        deliveryDate: "2026-05-22",
        deliveryStatus: "in_progress",
        accountingStatus: "pending",
        totalValue: 108e3,
        paidAmount: 54e3,
        doors: [],
        documents: {
          packingList: true,
          invoice: true,
          photos: 18,
          certificate: true
        },
        createdAt: now - 5 * 864e5,
        updatedAt: now - 2 * 864e5
      },
      {
        orderNumber: "ORD-2026-0457",
        distributorName: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0623\u0645\u0644 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629",
        totalDoors: 80,
        packingType: "\u062A\u0635\u062F\u064A\u0631",
        packingMethod: "\u0641\u0631\u062F\u064A",
        packingStatus: "done",
        deliveryDate: "2026-05-20",
        deliveryStatus: "done",
        accountingStatus: "in_progress",
        totalValue: 144e3,
        paidAmount: 144e3,
        doors: [],
        documents: {
          packingList: true,
          invoice: true,
          photos: 24,
          certificate: true
        },
        createdAt: now - 7 * 864e5,
        updatedAt: now - 1 * 864e5
      }
    ]);
    return { success: true };
  })
});

// server/workOrders.router.ts
import { z as z16 } from "zod/v4";
import { eq as eq17, desc as desc12 } from "drizzle-orm";
var woStatusEnum = z16.enum([
  "draft",
  "issued",
  "in_progress",
  "completed",
  "on_hold",
  "cancelled"
]);
var woPriorityEnum = z16.enum(["normal", "urgent", "vip"]);
var workOrdersRouter = router({
  // ── جلب كل أوامر التشغيل ──────────────────────────────────
  list: adminProcedure.query(async () => {
    return db.query.workOrders.findMany({
      orderBy: [desc12(schema_exports.workOrders.createdAt)]
    });
  }),
  // ── إنشاء أمر تشغيل جديد ────────────────────────────────
  create: adminProcedure.input(
    z16.object({
      woNumber: z16.string().min(1),
      poNumber: z16.string().min(1),
      distributorName: z16.string().min(1),
      distributorPhone: z16.string().default(""),
      issuedAt: z16.number(),
      startDate: z16.string(),
      dueDate: z16.string(),
      status: woStatusEnum,
      priority: woPriorityEnum,
      orderType: z16.enum(["standard", "custom"]),
      totalDoors: z16.number().int().min(1),
      totalValue: z16.number().min(0),
      doors: z16.any(),
      deptTasks: z16.any(),
      supervisorName: z16.string().default(""),
      notes: z16.string().optional(),
      progressPercent: z16.number().int().min(0).max(100).default(0)
    })
  ).mutation(async ({ input }) => {
    const now = Date.now();
    await db.insert(schema_exports.workOrders).values({
      woNumber: input.woNumber,
      poNumber: input.poNumber,
      distributorName: input.distributorName,
      distributorPhone: input.distributorPhone,
      issuedAt: input.issuedAt,
      startDate: input.startDate,
      dueDate: input.dueDate,
      status: input.status,
      priority: input.priority,
      orderType: input.orderType,
      totalDoors: input.totalDoors,
      totalValue: input.totalValue,
      doors: input.doors,
      deptTasks: input.deptTasks,
      supervisorName: input.supervisorName,
      notes: input.notes ?? null,
      progressPercent: input.progressPercent,
      createdAt: now,
      updatedAt: now
    });
    return { success: true };
  }),
  // ── تحديث تقدم الأقسام ───────────────────────────────────
  updateProgress: adminProcedure.input(
    z16.object({
      id: z16.number(),
      deptTasks: z16.any(),
      progressPercent: z16.number().int().min(0).max(100),
      status: woStatusEnum
    })
  ).mutation(async ({ input }) => {
    await db.update(schema_exports.workOrders).set({
      deptTasks: input.deptTasks,
      progressPercent: input.progressPercent,
      status: input.status,
      updatedAt: Date.now()
    }).where(eq17(schema_exports.workOrders.id, input.id));
    return { success: true };
  }),
  // ── تحديث الحالة فقط ─────────────────────────────────────
  updateStatus: adminProcedure.input(z16.object({ id: z16.number(), status: woStatusEnum })).mutation(async ({ input }) => {
    await db.update(schema_exports.workOrders).set({ status: input.status, updatedAt: Date.now() }).where(eq17(schema_exports.workOrders.id, input.id));
    return { success: true };
  }),
  // ── بيانات تجريبية ───────────────────────────────────────
  seed: adminProcedure.mutation(async () => {
    const now = Date.now();
    const d = (days) => new Date(now + days * 864e5).toISOString().split("T")[0];
    const makeTasks = (qty, status, pct, start, due) => ["door_line", "frame_line", "accessories", "qc", "packing"].map(
      (deptId) => ({
        deptId,
        quantity: qty,
        unit: deptId === "frame_line" ? "\u0625\u0637\u0627\u0631" : deptId === "accessories" ? "\u0637\u0642\u0645" : "\u0628\u0627\u0628",
        specs: "\u062D\u0633\u0628 \u0627\u0644\u0637\u0644\u0628",
        assignedTo: deptId === "qc" ? "\u0645. \u0633\u0627\u0631\u0629" : deptId === "packing" ? "\u0641\u0631\u064A\u0642 \u0627\u0644\u062A\u063A\u0644\u064A\u0641" : "\u0641\u0631\u064A\u0642 \u062E\u0637 A",
        startDate: start,
        dueDate: due,
        status,
        completedQty: Math.round(qty * pct / 100),
        notes: ""
      })
    );
    await db.insert(schema_exports.workOrders).values([
      {
        woNumber: "WO-2026-0001",
        poNumber: "SND-0453",
        distributorName: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0631\u0627\u0634\u062F \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629",
        distributorPhone: "0501234567",
        issuedAt: now - 8 * 864e5,
        startDate: d(-8),
        dueDate: d(6),
        status: "in_progress",
        priority: "urgent",
        orderType: "standard",
        totalDoors: 120,
        totalValue: 216e3,
        doors: [],
        deptTasks: makeTasks(120, "in_progress", 60, d(-8), d(6)),
        supervisorName: "\u0645. \u062E\u0627\u0644\u062F \u0627\u0644\u0639\u062A\u064A\u0628\u064A",
        notes: "\u0623\u0648\u0644\u0648\u064A\u0629 \u0642\u0635\u0648\u0649 - \u0645\u0634\u0631\u0648\u0639 \u0633\u0643\u0646\u064A",
        progressPercent: 60,
        createdAt: now - 8 * 864e5,
        updatedAt: now - 1 * 864e5
      },
      {
        woNumber: "WO-2026-0002",
        poNumber: "SND-0455",
        distributorName: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u0625\u062A\u0642\u0627\u0646 \u0644\u0644\u0645\u0642\u0627\u0648\u0644\u0627\u062A",
        distributorPhone: "0507654321",
        issuedAt: now - 5 * 864e5,
        startDate: d(-5),
        dueDate: d(9),
        status: "issued",
        priority: "normal",
        orderType: "standard",
        totalDoors: 60,
        totalValue: 108e3,
        doors: [],
        deptTasks: makeTasks(60, "issued", 0, d(-5), d(9)),
        supervisorName: "\u0645. \u0633\u0639\u062F \u0627\u0644\u063A\u0627\u0645\u062F\u064A",
        notes: "",
        progressPercent: 0,
        createdAt: now - 5 * 864e5,
        updatedAt: now - 5 * 864e5
      },
      {
        woNumber: "WO-2026-0003",
        poNumber: "SND-0449",
        distributorName: "\u0634\u0631\u0643\u0629 \u0627\u0644\u062F\u064A\u0627\u0631 \u0644\u0644\u062A\u0637\u0648\u064A\u0631",
        distributorPhone: "0551112233",
        issuedAt: now - 18 * 864e5,
        startDate: d(-18),
        dueDate: d(-4),
        status: "completed",
        priority: "vip",
        orderType: "custom",
        totalDoors: 80,
        totalValue: 18e4,
        doors: [],
        deptTasks: makeTasks(80, "completed", 100, d(-18), d(-4)),
        supervisorName: "\u0645. \u0641\u0647\u062F \u0627\u0644\u062D\u0631\u0628\u064A",
        notes: "\u062A\u0635\u0645\u064A\u0645 \u0645\u062E\u0635\u0635 VIP",
        progressPercent: 100,
        createdAt: now - 18 * 864e5,
        updatedAt: now - 4 * 864e5
      }
    ]);
    return { success: true };
  })
});

// server/decisionLog.router.ts
import { z as z17 } from "zod/v4";
import { desc as desc13, eq as eq18 } from "drizzle-orm";
var decisionEnum = z17.enum(["approved", "rejected", "revision_requested"]);
var decisionLogRouter = router({
  // ── جلب كل سجلات القرارات ─────────────────────────────────
  list: adminProcedure.query(async () => {
    return db.query.decisionLog.findMany({
      orderBy: [desc13(schema_exports.decisionLog.createdAt)]
    });
  }),
  // ── إضافة سجل قرار جديد ──────────────────────────────────
  add: adminProcedure.input(
    z17.object({
      orderNumber: z17.string().min(1),
      distributor: z17.string().min(1),
      company: z17.string().min(1),
      city: z17.string().default(""),
      orderTotal: z17.number().int().min(0),
      decision: decisionEnum,
      reason: z17.string().optional(),
      decidedBy: z17.string().min(1),
      decidedAt: z17.string().min(1),
      responseTime: z17.number().int().min(0),
      items: z17.any(),
      notified: z17.boolean().default(false),
      followUp: z17.string().optional()
    })
  ).mutation(async ({ input }) => {
    const now = Date.now();
    await db.insert(schema_exports.decisionLog).values({
      orderNumber: input.orderNumber,
      distributor: input.distributor,
      company: input.company,
      city: input.city,
      orderTotal: input.orderTotal,
      decision: input.decision,
      reason: input.reason ?? null,
      decidedBy: input.decidedBy,
      decidedAt: input.decidedAt,
      responseTime: input.responseTime,
      items: input.items ?? [],
      notified: input.notified,
      followUp: input.followUp ?? null,
      createdAt: now,
      updatedAt: now
    });
    return { success: true };
  }),
  // ── تحديث حقل الإشعار ────────────────────────────────────
  markNotified: adminProcedure.input(z17.object({ id: z17.number() })).mutation(async ({ input }) => {
    await db.update(schema_exports.decisionLog).set({ notified: true, updatedAt: Date.now() }).where(eq18(schema_exports.decisionLog.id, input.id));
    return { success: true };
  }),
  // ── بيانات تجريبية ───────────────────────────────────────
  seed: adminProcedure.mutation(async () => {
    const now = Date.now();
    const samples = [
      {
        orderNumber: "SND-2026-0091",
        distributor: "\u0623\u062D\u0645\u062F \u0627\u0644\u0632\u0647\u0631\u0627\u0646\u064A",
        company: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0646\u062E\u0628\u0629",
        city: "\u0627\u0644\u0631\u064A\u0627\u0636",
        orderTotal: 19100,
        decision: "approved",
        decidedBy: "\u0645\u062D\u0645\u062F \u0627\u0644\u0639\u062A\u064A\u0628\u064A (\u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0627\u0645)",
        decidedAt: "2026-04-28 09:22",
        responseTime: 8,
        items: [
          { name: "\u0628\u0627\u0628 \u062E\u0634\u0628\u064A \u0643\u0644\u0627\u0633\u064A\u0643\u064A", qty: 4 },
          { name: "\u0628\u0627\u0628 \u062F\u0627\u062E\u0644\u064A \u0639\u0635\u0631\u064A", qty: 3 }
        ],
        notified: true
      },
      {
        orderNumber: "SND-2026-0090",
        distributor: "\u0645\u062D\u0645\u062F \u0627\u0644\u0639\u0645\u0631\u064A",
        company: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u0628\u0646\u0627\u0621 \u0627\u0644\u062D\u062F\u064A\u062B",
        city: "\u062C\u062F\u0629",
        orderTotal: 9600,
        decision: "revision_requested",
        reason: "\u064A\u0631\u062C\u0649 \u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0644\u0648\u0646 \u0642\u0628\u0644 \u0628\u062F\u0621 \u0627\u0644\u0625\u0646\u062A\u0627\u062C",
        decidedBy: "\u0645\u062D\u0645\u062F \u0627\u0644\u0639\u062A\u064A\u0628\u064A (\u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0627\u0645)",
        decidedAt: "2026-04-28 08:55",
        responseTime: 13,
        items: [{ name: "\u0628\u0627\u0628 \u062E\u0627\u0631\u062C\u064A \u0641\u0627\u062E\u0631", qty: 2 }],
        notified: true,
        followUp: "\u0623\u0643\u062F \u0627\u0644\u0645\u0648\u0632\u0639 \u0627\u0644\u0644\u0648\u0646 \u2014 \u062A\u0645 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0644\u0627\u062D\u0642\u0627\u064B"
      },
      {
        orderNumber: "SND-2026-0086",
        distributor: "\u0646\u0648\u0631\u0629 \u0627\u0644\u0634\u0647\u0631\u064A",
        company: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u064A",
        city: "\u0627\u0644\u0631\u064A\u0627\u0636",
        orderTotal: 34500,
        decision: "approved",
        decidedBy: "\u0633\u0627\u0631\u0629 \u0627\u0644\u0642\u062D\u0637\u0627\u0646\u064A (\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A)",
        decidedAt: "2026-04-27 14:10",
        responseTime: 22,
        items: [
          { name: "\u0628\u0627\u0628 \u062E\u0634\u0628\u064A \u0643\u0644\u0627\u0633\u064A\u0643\u064A", qty: 10 },
          { name: "\u0628\u0627\u0628 \u062E\u0627\u0631\u062C\u064A \u0641\u0627\u062E\u0631", qty: 1 }
        ],
        notified: true
      },
      {
        orderNumber: "SND-2026-0085",
        distributor: "\u062E\u0627\u0644\u062F \u0627\u0644\u063A\u0627\u0645\u062F\u064A",
        company: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0625\u0639\u0645\u0627\u0631",
        city: "\u0627\u0644\u062F\u0645\u0627\u0645",
        orderTotal: 8400,
        decision: "rejected",
        reason: "\u0627\u0644\u0637\u0627\u0642\u0629 \u0627\u0644\u0625\u0646\u062A\u0627\u062C\u064A\u0629 \u0645\u0645\u062A\u0644\u0626\u0629 \u0644\u0647\u0630\u0647 \u0627\u0644\u0641\u062A\u0631\u0629",
        decidedBy: "\u0645\u062D\u0645\u062F \u0627\u0644\u0639\u062A\u064A\u0628\u064A (\u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0627\u0645)",
        decidedAt: "2026-04-27 11:30",
        responseTime: 45,
        items: [{ name: "\u0628\u0627\u0628 \u062F\u0627\u062E\u0644\u064A \u0639\u0635\u0631\u064A", qty: 4 }],
        notified: true
      },
      {
        orderNumber: "SND-2026-0084",
        distributor: "\u0641\u0647\u062F \u0627\u0644\u0642\u062D\u0637\u0627\u0646\u064A",
        company: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0641\u064A\u0635\u0644",
        city: "\u0645\u0643\u0629",
        orderTotal: 25600,
        decision: "approved",
        decidedBy: "\u0633\u0627\u0631\u0629 \u0627\u0644\u0642\u062D\u0637\u0627\u0646\u064A (\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A)",
        decidedAt: "2026-04-26 16:45",
        responseTime: 5,
        items: [{ name: "\u0628\u0627\u0628 \u062E\u0634\u0628\u064A \u0643\u0644\u0627\u0633\u064A\u0643\u064A", qty: 8 }],
        notified: true
      },
      {
        orderNumber: "SND-2026-0083",
        distributor: "\u0633\u0639\u062F \u0627\u0644\u0645\u0627\u0644\u0643\u064A",
        company: "\u0634\u0631\u0643\u0629 \u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u062E\u0644\u064A\u062C",
        city: "\u0623\u0628\u0647\u0627",
        orderTotal: 12e3,
        decision: "revision_requested",
        reason: "\u064A\u0631\u062C\u0649 \u0625\u0631\u0641\u0627\u0642 \u0645\u062E\u0637\u0637 \u0627\u0644\u0645\u0634\u0631\u0648\u0639",
        decidedBy: "\u0645\u062D\u0645\u062F \u0627\u0644\u0639\u062A\u064A\u0628\u064A (\u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0627\u0645)",
        decidedAt: "2026-04-26 09:00",
        responseTime: 30,
        items: [
          { name: "\u0628\u0627\u0628 \u062F\u0627\u062E\u0644\u064A \u0627\u0642\u062A\u0635\u0627\u062F\u064A", qty: 6 },
          { name: "\u0628\u0627\u0628 \u062F\u0627\u062E\u0644\u064A \u0639\u0635\u0631\u064A", qty: 2 }
        ],
        notified: true,
        followUp: "\u0644\u0645 \u064A\u0631\u062F \u0627\u0644\u0645\u0648\u0632\u0639 \u0628\u0639\u062F"
      },
      {
        orderNumber: "SND-2026-0082",
        distributor: "\u0639\u0628\u062F\u0627\u0644\u0644\u0647 \u0627\u0644\u0632\u0647\u0631\u0627\u0646\u064A",
        company: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u0648\u0641\u0627\u0621",
        city: "\u0627\u0644\u0631\u064A\u0627\u0636",
        orderTotal: 6300,
        decision: "rejected",
        reason: "\u062A\u0623\u062E\u0631 \u0627\u0644\u0645\u0648\u0632\u0639 \u0641\u064A \u0633\u062F\u0627\u062F \u0645\u0633\u062A\u062D\u0642\u0627\u062A \u0633\u0627\u0628\u0642\u0629",
        decidedBy: "\u0645\u062D\u0645\u062F \u0627\u0644\u0639\u062A\u064A\u0628\u064A (\u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0627\u0645)",
        decidedAt: "2026-04-25 13:20",
        responseTime: 60,
        items: [{ name: "\u0628\u0627\u0628 \u062F\u0627\u062E\u0644\u064A \u0627\u0642\u062A\u0635\u0627\u062F\u064A", qty: 3 }],
        notified: true
      },
      {
        orderNumber: "SND-2026-0081",
        distributor: "\u0631\u064A\u0645 \u0627\u0644\u0639\u0646\u0632\u064A",
        company: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0631\u064A\u0645 \u0644\u0644\u062F\u064A\u0643\u0648\u0631",
        city: "\u062C\u062F\u0629",
        orderTotal: 18900,
        decision: "approved",
        decidedBy: "\u0633\u0627\u0631\u0629 \u0627\u0644\u0642\u062D\u0637\u0627\u0646\u064A (\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A)",
        decidedAt: "2026-04-25 10:05",
        responseTime: 12,
        items: [
          { name: "\u0628\u0627\u0628 \u062E\u0634\u0628\u064A \u0643\u0644\u0627\u0633\u064A\u0643\u064A", qty: 5 },
          { name: "\u0628\u0627\u0628 \u062E\u0627\u0631\u062C\u064A \u0641\u0627\u062E\u0631", qty: 1 }
        ],
        notified: true
      },
      {
        orderNumber: "SND-2026-0080",
        distributor: "\u062A\u0631\u0643\u064A \u0627\u0644\u062D\u0631\u0628\u064A",
        company: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u062D\u0631\u0628\u064A",
        city: "\u0627\u0644\u0637\u0627\u0626\u0641",
        orderTotal: 7200,
        decision: "approved",
        decidedBy: "\u0645\u062D\u0645\u062F \u0627\u0644\u0639\u062A\u064A\u0628\u064A (\u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0627\u0645)",
        decidedAt: "2026-04-24 15:30",
        responseTime: 18,
        items: [{ name: "\u0628\u0627\u0628 \u062F\u0627\u062E\u0644\u064A \u0639\u0635\u0631\u064A", qty: 3 }],
        notified: true
      },
      {
        orderNumber: "SND-2026-0079",
        distributor: "\u0645\u0646\u0649 \u0627\u0644\u0634\u0645\u0631\u064A",
        company: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u0634\u0645\u0631\u064A",
        city: "\u062D\u0627\u0626\u0644",
        orderTotal: 4800,
        decision: "rejected",
        reason: "\u0627\u0644\u0645\u0642\u0627\u0633\u0627\u062A \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629",
        decidedBy: "\u0633\u0627\u0631\u0629 \u0627\u0644\u0642\u062D\u0637\u0627\u0646\u064A (\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A)",
        decidedAt: "2026-04-24 11:00",
        responseTime: 25,
        items: [{ name: "\u0628\u0627\u0628 \u062E\u0627\u0631\u062C\u064A \u0641\u0627\u062E\u0631", qty: 1 }],
        notified: true
      }
    ];
    for (const r of samples) {
      await db.insert(schema_exports.decisionLog).values({
        orderNumber: r.orderNumber,
        distributor: r.distributor,
        company: r.company,
        city: r.city,
        orderTotal: r.orderTotal,
        decision: r.decision,
        reason: r.reason ?? null,
        decidedBy: r.decidedBy,
        decidedAt: r.decidedAt,
        responseTime: r.responseTime,
        items: r.items,
        notified: r.notified,
        followUp: r.followUp ?? null,
        createdAt: now,
        updatedAt: now
      });
    }
    return { success: true };
  })
});

// server/postOrderReview.router.ts
import { z as z18 } from "zod/v4";
import { eq as eq19, desc as desc14 } from "drizzle-orm";
import { TRPCError as TRPCError11 } from "@trpc/server";
var porStatusEnum = z18.enum(["pending_review", "reviewed", "closed"]);
var postOrderReviewRouter = router({
  // ── جلب كل المراجعات ─────────────────────────────────────
  list: adminProcedure.query(async () => {
    return db.query.postOrderReviews.findMany({
      orderBy: [desc14(schema_exports.postOrderReviews.createdAt)]
    });
  }),
  // ── تحديث حالة المراجعة ──────────────────────────────────
  updateStatus: adminProcedure.input(z18.object({ id: z18.number(), status: porStatusEnum })).mutation(async ({ input }) => {
    await db.update(schema_exports.postOrderReviews).set({ status: input.status, updatedAt: Date.now() }).where(eq19(schema_exports.postOrderReviews.id, input.id));
    return { success: true };
  }),
  // ── إضافة مقترح تحسين ────────────────────────────────────
  addImprovement: adminProcedure.input(z18.object({ id: z18.number(), improvement: z18.string().min(1) })).mutation(async ({ input }) => {
    const existing = await db.query.postOrderReviews.findFirst({
      where: eq19(schema_exports.postOrderReviews.id, input.id)
    });
    if (!existing) throw new TRPCError11({ code: "NOT_FOUND" });
    const current = Array.isArray(existing.improvements) ? existing.improvements : [];
    await db.update(schema_exports.postOrderReviews).set({
      improvements: [...current, input.improvement],
      updatedAt: Date.now()
    }).where(eq19(schema_exports.postOrderReviews.id, input.id));
    return { success: true };
  }),
  // ── بيانات تجريبية ───────────────────────────────────────
  seed: adminProcedure.mutation(async () => {
    const now = Date.now();
    const samples = [
      {
        orderNumber: "ORD-2026-0457",
        distributorName: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0623\u0645\u0644 \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629",
        totalDoors: 80,
        completedAt: "2026-05-20",
        plannedDays: 12,
        actualDays: 11,
        clientRating: 5,
        clientFeedback: "\u0645\u0645\u062A\u0627\u0632 \u062C\u062F\u0627\u064B\u060C \u0627\u0644\u0623\u0628\u0648\u0627\u0628 \u0648\u0635\u0644\u062A \u0641\u064A \u0627\u0644\u0648\u0642\u062A \u0627\u0644\u0645\u062D\u062F\u062F \u0648\u0628\u062C\u0648\u062F\u0629 \u0639\u0627\u0644\u064A\u0629",
        errors: [],
        improvements: ["\u062A\u062D\u0633\u064A\u0646 \u062A\u0633\u0645\u064A\u0629 \u0627\u0644\u0637\u0631\u0648\u062F \u0628\u0634\u0643\u0644 \u0623\u0648\u0636\u062D"],
        status: "reviewed"
      },
      {
        orderNumber: "ORD-2026-0453",
        distributorName: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0631\u0627\u0634\u062F \u0627\u0644\u0639\u0642\u0627\u0631\u064A\u0629",
        totalDoors: 120,
        completedAt: "2026-05-18",
        plannedDays: 14,
        actualDays: 17,
        clientRating: 3,
        clientFeedback: "\u0627\u0644\u062A\u0623\u062E\u064A\u0631 \u0641\u064A \u0627\u0644\u062A\u0633\u0644\u064A\u0645 \u0623\u062B\u0651\u0631 \u0639\u0644\u0649 \u062C\u062F\u0648\u0644 \u0627\u0644\u0645\u0634\u0631\u0648\u0639",
        errors: [
          {
            category: "\u062A\u062E\u0637\u064A\u0637 \u0627\u0644\u0625\u0646\u062A\u0627\u062C",
            description: "\u062A\u0623\u062E\u0631 3 \u0623\u064A\u0627\u0645 \u0628\u0633\u0628\u0628 \u0646\u0642\u0635 \u0641\u064A \u0645\u0627\u062F\u0629 \u0627\u0644\u062D\u0627\u0641\u0629 ABS",
            severity: "high"
          },
          {
            category: "\u0641\u062D\u0635 \u0627\u0644\u062C\u0648\u062F\u0629",
            description: "\u0625\u0639\u0627\u062F\u0629 \u062A\u0635\u0646\u064A\u0639 4 \u0623\u0628\u0648\u0627\u0628 \u0628\u0633\u0628\u0628 \u0639\u064A\u0648\u0628 \u0641\u064A \u0627\u0644\u0637\u0644\u0627\u0621",
            severity: "medium"
          }
        ],
        improvements: [
          "\u062A\u0623\u0645\u064A\u0646 \u0645\u062E\u0632\u0648\u0646 \u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0645\u0646 \u0627\u0644\u062D\u0648\u0627\u0641",
          "\u062A\u0639\u0632\u064A\u0632 \u0641\u062D\u0635 \u0627\u0644\u062C\u0648\u062F\u0629 \u0641\u064A \u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u0625\u0646\u062A\u0627\u062C"
        ],
        status: "pending_review"
      },
      {
        orderNumber: "ORD-2026-0449",
        distributorName: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0645\u062F\u0627\u0631 \u0644\u0644\u062A\u0637\u0648\u064A\u0631",
        totalDoors: 36,
        completedAt: "2026-05-12",
        plannedDays: 8,
        actualDays: 8,
        clientRating: 4,
        clientFeedback: "\u062C\u064A\u062F\u060C \u0644\u0643\u0646 \u0628\u0639\u0636 \u0627\u0644\u0623\u0628\u0648\u0627\u0628 \u0643\u0627\u0646\u062A \u062A\u062D\u062A\u0627\u062C \u0636\u0628\u0637 \u0641\u064A \u0627\u0644\u0645\u0641\u0635\u0644\u0627\u062A",
        errors: [
          {
            category: "\u062A\u062C\u0645\u064A\u0639",
            description: "\u0636\u0628\u0637 \u0627\u0644\u0645\u0641\u0635\u0644\u0627\u062A \u063A\u064A\u0631 \u062F\u0642\u064A\u0642 \u0641\u064A 3 \u0623\u0628\u0648\u0627\u0628",
            severity: "low"
          }
        ],
        improvements: ["\u0645\u0631\u0627\u062C\u0639\u0629 \u0645\u0639\u0627\u064A\u064A\u0631 \u0636\u0628\u0637 \u0627\u0644\u0645\u0641\u0635\u0644\u0627\u062A \u0641\u064A \u0627\u0644\u0641\u062D\u0635 \u0627\u0644\u0646\u0647\u0627\u0626\u064A"],
        status: "closed"
      }
    ];
    for (const r of samples) {
      await db.insert(schema_exports.postOrderReviews).values({
        orderNumber: r.orderNumber,
        distributorName: r.distributorName,
        totalDoors: r.totalDoors,
        completedAt: r.completedAt,
        plannedDays: r.plannedDays,
        actualDays: r.actualDays,
        clientRating: r.clientRating,
        clientFeedback: r.clientFeedback,
        errors: r.errors,
        improvements: r.improvements,
        status: r.status,
        createdAt: now,
        updatedAt: now
      });
    }
    return { success: true };
  })
});

// server/dailySummary.router.ts
import { z as z19 } from "zod/v4";
import { eq as eq20, desc as desc15 } from "drizzle-orm";
var DEFAULT_SCHEDULE = {
  sendTime: "20:00",
  activeDays: ["sun", "mon", "tue", "wed", "thu"],
  enabledSections: ["orders", "decisions", "production", "complaints"]
};
var dailySummaryRouter = router({
  // ─── Recipients ──────────────────────────────────────────────────────────────
  getRecipients: adminProcedure.query(async () => {
    return db.query.summaryRecipients.findMany({
      orderBy: [desc15(schema_exports.summaryRecipients.createdAt)]
    });
  }),
  addRecipient: adminProcedure.input(
    z19.object({
      name: z19.string().min(1),
      role: z19.string().default(""),
      phone: z19.string().default(""),
      email: z19.string().default(""),
      channels: z19.array(z19.enum(["whatsapp", "email"]))
    })
  ).mutation(async ({ input }) => {
    const now = Date.now();
    await db.insert(schema_exports.summaryRecipients).values({
      name: input.name,
      role: input.role,
      phone: input.phone,
      email: input.email,
      channels: input.channels,
      active: true,
      createdAt: now,
      updatedAt: now
    });
    return { success: true };
  }),
  toggleRecipient: adminProcedure.input(z19.object({ id: z19.number().int(), active: z19.boolean() })).mutation(async ({ input }) => {
    await db.update(schema_exports.summaryRecipients).set({ active: input.active, updatedAt: Date.now() }).where(eq20(schema_exports.summaryRecipients.id, input.id));
    return { success: true };
  }),
  deleteRecipient: adminProcedure.input(z19.object({ id: z19.number().int() })).mutation(async ({ input }) => {
    await db.delete(schema_exports.summaryRecipients).where(eq20(schema_exports.summaryRecipients.id, input.id));
    return { success: true };
  }),
  // ─── Schedule ─────────────────────────────────────────────────────────────────
  getSchedule: adminProcedure.query(async () => {
    const row = await db.query.summarySchedule.findFirst();
    if (!row) return DEFAULT_SCHEDULE;
    return {
      sendTime: row.sendTime,
      activeDays: Array.isArray(row.activeDays) ? row.activeDays : DEFAULT_SCHEDULE.activeDays,
      enabledSections: Array.isArray(row.enabledSections) ? row.enabledSections : DEFAULT_SCHEDULE.enabledSections
    };
  }),
  saveSchedule: adminProcedure.input(
    z19.object({
      sendTime: z19.string().regex(/^\d{2}:\d{2}$/),
      activeDays: z19.array(z19.string()),
      enabledSections: z19.array(z19.string())
    })
  ).mutation(async ({ input }) => {
    const now = Date.now();
    const existing = await db.query.summarySchedule.findFirst();
    if (existing) {
      await db.update(schema_exports.summarySchedule).set({
        sendTime: input.sendTime,
        activeDays: input.activeDays,
        enabledSections: input.enabledSections,
        updatedAt: now
      }).where(eq20(schema_exports.summarySchedule.id, existing.id));
    } else {
      await db.insert(schema_exports.summarySchedule).values({
        sendTime: input.sendTime,
        activeDays: input.activeDays,
        enabledSections: input.enabledSections,
        updatedAt: now
      });
    }
    return { success: true };
  }),
  // ─── Send History ─────────────────────────────────────────────────────────────
  getHistory: adminProcedure.query(async () => {
    return db.query.summarySendHistory.findMany({
      orderBy: [desc15(schema_exports.summarySendHistory.sentAt)],
      limit: 10
    });
  }),
  recordSend: adminProcedure.input(
    z19.object({
      recipientsCount: z19.number().int(),
      channels: z19.string(),
      status: z19.enum(["success", "partial", "skipped", "failed"]),
      snapshotStats: z19.record(z19.string(), z19.unknown()).optional()
    })
  ).mutation(async ({ input }) => {
    const now = Date.now();
    await db.insert(schema_exports.summarySendHistory).values({
      sentAt: now,
      recipientsCount: input.recipientsCount,
      channels: input.channels,
      status: input.status,
      snapshotStats: input.snapshotStats ?? null,
      createdAt: now
    });
    return { success: true };
  }),
  // ─── Today's Stats ─────────────────────────────────────────────────────────────
  getTodayStats: adminProcedure.query(async () => {
    const now = Date.now();
    const riyadhDate = new Date(now + 3 * 36e5);
    const todayStr = riyadhDate.toISOString().slice(0, 10);
    const todayStartMs = (/* @__PURE__ */ new Date(todayStr + "T00:00:00+03:00")).getTime();
    const [
      doorOrderRows,
      decisionRows,
      workOrderRows,
      complaintRows,
      distOrderRows
    ] = await Promise.all([
      db.query.doorOrders.findMany({
        columns: { status: true, totalPrice: true, createdAt: true }
      }),
      db.query.decisionLog.findMany({
        columns: { decision: true, responseTime: true, createdAt: true }
      }),
      db.query.workOrders.findMany({
        columns: { status: true, progressPercent: true }
      }),
      db.query.complaints.findMany({
        columns: { status: true, resolvedAt: true, createdAt: true }
      }),
      db.query.distributorOrders.findMany({
        columns: { totalAmount: true, createdAt: true }
      })
    ]);
    const todayDoorOrders = doorOrderRows.filter(
      (o) => o.createdAt >= todayStartMs
    );
    const newOrders = todayDoorOrders.filter((o) => o.status === "new").length;
    const pendingOrders = doorOrderRows.filter(
      (o) => o.status === "new" || o.status === "reviewing"
    ).length;
    const todayDecisions = decisionRows.filter(
      (d) => d.createdAt >= todayStartMs
    );
    const approvedOrders = todayDecisions.filter(
      (d) => d.decision === "approved"
    ).length;
    const rejectedOrders = todayDecisions.filter(
      (d) => d.decision === "rejected"
    ).length;
    const totalDecisions = todayDecisions.length;
    const avgResponseMin = totalDecisions > 0 ? Math.round(
      todayDecisions.reduce((s, d) => s + d.responseTime, 0) / totalDecisions
    ) : 0;
    const inProgressWorkOrders = workOrderRows.filter(
      (w) => w.status === "in_progress"
    );
    const activeStages = inProgressWorkOrders.length;
    const productionRate = inProgressWorkOrders.length > 0 ? Math.round(
      inProgressWorkOrders.reduce((s, w) => s + w.progressPercent, 0) / inProgressWorkOrders.length
    ) : workOrderRows.length > 0 ? Math.round(
      workOrderRows.reduce((s, w) => s + w.progressPercent, 0) / workOrderRows.length
    ) : 0;
    const openComplaints = complaintRows.filter(
      (c) => c.status === "open" || c.status === "under_review"
    ).length;
    const resolvedComplaints = complaintRows.filter(
      (c) => c.resolvedAt != null && c.resolvedAt >= todayStartMs
    ).length;
    const dailyRevenue = Math.round(
      distOrderRows.filter((o) => o.createdAt >= todayStartMs).reduce((s, o) => s + (o.totalAmount ?? 0), 0)
    );
    return {
      newOrders,
      approvedOrders,
      rejectedOrders,
      pendingOrders,
      totalDecisions,
      avgResponseMin,
      productionRate,
      activeStages,
      openComplaints,
      resolvedComplaints,
      dailyRevenue
    };
  })
});

// server/accounting.router.ts
import { z as z20 } from "zod/v4";
import { eq as eq21, desc as desc16, gte, lte, and as and10, sql as sql3 } from "drizzle-orm";
var fromHalala2 = (h) => (h / 100).toFixed(2);
var toHalala2 = (r) => Math.round(r * 100);
function formatEntryNumber(counter, year) {
  return `JE-${year}-${String(counter).padStart(6, "0")}`;
}
var DEFAULT_ACCOUNTS = [
  // ── الأصول ───────────────────────────────────────────────────────────────
  {
    code: "1000",
    name: "\u0627\u0644\u0623\u0635\u0648\u0644",
    nameEn: "Assets",
    type: "asset",
    normalBalance: "debit",
    parentCode: null,
    isSystem: true
  },
  {
    code: "1100",
    name: "\u0627\u0644\u0623\u0635\u0648\u0644 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
    nameEn: "Current Assets",
    type: "asset",
    normalBalance: "debit",
    parentCode: "1000",
    isSystem: true
  },
  {
    code: "1110",
    name: "\u0627\u0644\u0646\u0642\u062F \u0648\u0627\u0644\u0628\u0646\u0643",
    nameEn: "Cash & Bank",
    type: "asset",
    normalBalance: "debit",
    parentCode: "1100",
    isSystem: true
  },
  {
    code: "1120",
    name: "\u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u2014 \u0627\u0644\u0639\u0645\u0644\u0627\u0621",
    nameEn: "Accounts Receivable",
    type: "asset",
    normalBalance: "debit",
    parentCode: "1100",
    isSystem: true
  },
  {
    code: "1130",
    name: "\u0627\u0644\u0645\u062E\u0632\u0648\u0646",
    nameEn: "Inventory",
    type: "asset",
    normalBalance: "debit",
    parentCode: "1100",
    isSystem: false
  },
  {
    code: "1200",
    name: "\u0627\u0644\u0623\u0635\u0648\u0644 \u0627\u0644\u062B\u0627\u0628\u062A\u0629",
    nameEn: "Fixed Assets",
    type: "asset",
    normalBalance: "debit",
    parentCode: "1000",
    isSystem: false
  },
  {
    code: "1210",
    name: "\u0627\u0644\u0622\u0644\u0627\u062A \u0648\u0627\u0644\u0645\u0639\u062F\u0627\u062A",
    nameEn: "Machinery & Equipment",
    type: "asset",
    normalBalance: "debit",
    parentCode: "1200",
    isSystem: false
  },
  {
    code: "1220",
    name: "\u0645\u062C\u0645\u0639 \u0627\u0644\u0625\u0647\u0644\u0627\u0643",
    nameEn: "Accumulated Depreciation",
    type: "asset",
    normalBalance: "credit",
    parentCode: "1200",
    isSystem: false
  },
  // ── الخصوم ───────────────────────────────────────────────────────────────
  {
    code: "2000",
    name: "\u0627\u0644\u062E\u0635\u0648\u0645",
    nameEn: "Liabilities",
    type: "liability",
    normalBalance: "credit",
    parentCode: null,
    isSystem: true
  },
  {
    code: "2100",
    name: "\u0627\u0644\u062E\u0635\u0648\u0645 \u0627\u0644\u0645\u062A\u062F\u0627\u0648\u0644\u0629",
    nameEn: "Current Liabilities",
    type: "liability",
    normalBalance: "credit",
    parentCode: "2000",
    isSystem: true
  },
  {
    code: "2110",
    name: "\u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u2014 \u0627\u0644\u0645\u0648\u0631\u062F\u0648\u0646",
    nameEn: "Accounts Payable",
    type: "liability",
    normalBalance: "credit",
    parentCode: "2100",
    isSystem: false
  },
  {
    code: "2120",
    name: "\u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0633\u062A\u062D\u0642\u0629",
    nameEn: "VAT Payable",
    type: "liability",
    normalBalance: "credit",
    parentCode: "2100",
    isSystem: true
  },
  // ── حقوق الملكية ──────────────────────────────────────────────────────────
  {
    code: "3000",
    name: "\u062D\u0642\u0648\u0642 \u0627\u0644\u0645\u0644\u0643\u064A\u0629",
    nameEn: "Equity",
    type: "equity",
    normalBalance: "credit",
    parentCode: null,
    isSystem: false
  },
  {
    code: "3100",
    name: "\u0631\u0623\u0633 \u0627\u0644\u0645\u0627\u0644",
    nameEn: "Capital",
    type: "equity",
    normalBalance: "credit",
    parentCode: "3000",
    isSystem: false
  },
  {
    code: "3200",
    name: "\u0627\u0644\u0623\u0631\u0628\u0627\u062D \u0627\u0644\u0645\u062D\u062A\u062C\u0632\u0629",
    nameEn: "Retained Earnings",
    type: "equity",
    normalBalance: "credit",
    parentCode: "3000",
    isSystem: false
  },
  // ── الإيرادات ─────────────────────────────────────────────────────────────
  {
    code: "4000",
    name: "\u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A",
    nameEn: "Revenue",
    type: "revenue",
    normalBalance: "credit",
    parentCode: null,
    isSystem: true
  },
  {
    code: "4100",
    name: "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0645\u0628\u064A\u0639\u0627\u062A \u0627\u0644\u0623\u0628\u0648\u0627\u0628",
    nameEn: "Door Sales Revenue",
    type: "revenue",
    normalBalance: "credit",
    parentCode: "4000",
    isSystem: true
  },
  {
    code: "4110",
    name: "\u0645\u0628\u064A\u0639\u0627\u062A \u0627\u0644\u0645\u0648\u0632\u0639\u064A\u0646",
    nameEn: "Distributor Sales",
    type: "revenue",
    normalBalance: "credit",
    parentCode: "4100",
    isSystem: false
  },
  {
    code: "4120",
    name: "\u0645\u0628\u064A\u0639\u0627\u062A \u0627\u0644\u062A\u062C\u0632\u0626\u0629",
    nameEn: "Retail Sales",
    type: "revenue",
    normalBalance: "credit",
    parentCode: "4100",
    isSystem: false
  },
  // ── المصروفات ─────────────────────────────────────────────────────────────
  {
    code: "5000",
    name: "\u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A",
    nameEn: "Expenses",
    type: "expense",
    normalBalance: "debit",
    parentCode: null,
    isSystem: false
  },
  {
    code: "5100",
    name: "\u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u0628\u0636\u0627\u0639\u0629 \u0627\u0644\u0645\u0628\u0627\u0639\u0629",
    nameEn: "Cost of Goods Sold",
    type: "expense",
    normalBalance: "debit",
    parentCode: "5000",
    isSystem: false
  },
  {
    code: "5200",
    name: "\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u062A\u0634\u063A\u064A\u0644",
    nameEn: "Operating Expenses",
    type: "expense",
    normalBalance: "debit",
    parentCode: "5000",
    isSystem: false
  },
  {
    code: "5300",
    name: "\u0645\u0635\u0627\u0631\u064A\u0641 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0648\u0627\u0644\u0639\u0645\u0648\u0645\u064A\u0629",
    nameEn: "General & Admin Expenses",
    type: "expense",
    normalBalance: "debit",
    parentCode: "5000",
    isSystem: false
  }
];
var accountingRouter = router({
  // ── دليل الحسابات ──────────────────────────────────────────────────────────
  getAccounts: adminProcedure.query(async () => {
    return db.query.accounts.findMany({ orderBy: [schema_exports.accounts.code] });
  }),
  seedDefaultAccounts: adminProcedure.mutation(async () => {
    const now = Date.now();
    for (const acc of DEFAULT_ACCOUNTS) {
      await db.insert(schema_exports.accounts).values({
        ...acc,
        parentCode: acc.parentCode ?? void 0,
        createdAt: now
      }).onDuplicateKeyUpdate({ set: { name: acc.name } });
    }
    return { success: true, count: DEFAULT_ACCOUNTS.length };
  }),
  createAccount: adminProcedure.input(
    z20.object({
      code: z20.string().min(2).max(10),
      name: z20.string().min(1),
      nameEn: z20.string().default(""),
      type: z20.enum(["asset", "liability", "equity", "revenue", "expense"]),
      normalBalance: z20.enum(["debit", "credit"]),
      parentCode: z20.string().optional()
    })
  ).mutation(async ({ input }) => {
    await db.insert(schema_exports.accounts).values({
      ...input,
      isSystem: false,
      isActive: true,
      createdAt: Date.now()
    });
    return { success: true };
  }),
  toggleAccount: adminProcedure.input(z20.object({ id: z20.number().int(), isActive: z20.boolean() })).mutation(async ({ input }) => {
    await db.update(schema_exports.accounts).set({ isActive: input.isActive }).where(eq21(schema_exports.accounts.id, input.id));
    return { success: true };
  }),
  // ── القيود اليومية ─────────────────────────────────────────────────────────
  getJournalEntries: adminProcedure.input(
    z20.object({
      sourceType: z20.enum(["invoice", "payment", "manual", "vat_settlement"]).optional(),
      limit: z20.number().int().max(100).default(50)
    }).optional()
  ).query(async ({ input }) => {
    const entries = await db.query.journalEntries.findMany({
      orderBy: [desc16(schema_exports.journalEntries.createdAt)],
      limit: input?.limit ?? 50
    });
    const ids = entries.map((e) => e.id);
    if (ids.length === 0) return [];
    const lines = await db.query.journalLines.findMany({
      where: (t3) => sql3`${t3.journalEntryId} IN (${sql3.join(
        ids.map((id) => sql3`${id}`),
        sql3`, `
      )})`,
      orderBy: [schema_exports.journalLines.sequence]
    });
    const linesByEntry = {};
    lines.forEach((l) => {
      (linesByEntry[l.journalEntryId] ??= []).push(l);
    });
    return entries.filter((e) => !input?.sourceType || e.sourceType === input.sourceType).map((e) => ({
      ...e,
      lines: linesByEntry[e.id] ?? [],
      totalDebitRiyals: fromHalala2(e.totalDebitHalala),
      totalCreditRiyals: fromHalala2(e.totalCreditHalala)
    }));
  }),
  // ── إنشاء قيد يدوي ─────────────────────────────────────────────────────────
  createManualEntry: adminProcedure.input(
    z20.object({
      entryDate: z20.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      description: z20.string().min(1),
      lines: z20.array(
        z20.object({
          accountCode: z20.string().min(2),
          accountName: z20.string().min(1),
          debitRiyals: z20.number().nonnegative().default(0),
          creditRiyals: z20.number().nonnegative().default(0),
          description: z20.string().default("")
        })
      ).min(2)
    })
  ).mutation(async ({ input }) => {
    const totalDebit = input.lines.reduce((s, l) => s + l.debitRiyals, 0);
    const totalCredit = input.lines.reduce((s, l) => s + l.creditRiyals, 0);
    if (Math.abs(totalDebit - totalCredit) > 1e-3) {
      throw new Error(
        "\u0627\u0644\u0642\u064A\u062F \u063A\u064A\u0631 \u0645\u062A\u0648\u0627\u0632\u0646: \u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u0645\u062F\u064A\u0646 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0633\u0627\u0648\u064A \u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u062F\u0627\u0626\u0646"
      );
    }
    const now = Date.now();
    const year = (/* @__PURE__ */ new Date()).getFullYear();
    const countResult = await db.select({ cnt: sql3`COUNT(*)` }).from(schema_exports.journalEntries);
    const counter = (countResult[0]?.cnt ?? 0) + 1;
    const entryNumber = formatEntryNumber(counter, year);
    const totalDebitHalala = toHalala2(totalDebit);
    const totalCreditHalala = toHalala2(totalCredit);
    const [result] = await db.insert(schema_exports.journalEntries).values({
      entryNumber,
      entryDate: input.entryDate,
      description: input.description,
      sourceType: "manual",
      totalDebitHalala,
      totalCreditHalala,
      isPosted: true,
      createdAt: now,
      updatedAt: now
    });
    const entryId = Number(result.insertId);
    await db.insert(schema_exports.journalLines).values(
      input.lines.map((l, i) => ({
        journalEntryId: entryId,
        accountCode: l.accountCode,
        accountName: l.accountName,
        debitHalala: toHalala2(l.debitRiyals),
        creditHalala: toHalala2(l.creditRiyals),
        description: l.description,
        sequence: i + 1
      }))
    );
    return { success: true, entryNumber };
  }),
  // ── تسجيل قيد الفاتورة الضريبية (Invoice → Journal Entry) ─────────────────
  postInvoiceEntry: adminProcedure.input(z20.object({ invoiceId: z20.number().int() })).mutation(async ({ input }) => {
    const existing = await db.query.journalEntries.findFirst({
      where: (t3) => and10(eq21(t3.sourceType, "invoice"), eq21(t3.sourceId, input.invoiceId))
    });
    if (existing) throw new Error("\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0642\u064A\u062F \u0644\u0647\u0630\u0647 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0633\u0628\u0642\u0627\u064B");
    const inv = await db.query.taxInvoices.findFirst({
      where: (t3) => eq21(t3.id, input.invoiceId)
    });
    if (!inv) throw new Error("\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
    if (inv.status === "cancelled")
      throw new Error("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u0633\u062C\u064A\u0644 \u0642\u064A\u062F \u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0644\u063A\u0627\u0629");
    const now = Date.now();
    const year = (/* @__PURE__ */ new Date()).getFullYear();
    const countResult = await db.select({ cnt: sql3`COUNT(*)` }).from(schema_exports.journalEntries);
    const counter = (countResult[0]?.cnt ?? 0) + 1;
    const entryNumber = formatEntryNumber(counter, year);
    const [result] = await db.insert(schema_exports.journalEntries).values({
      entryNumber,
      entryDate: inv.issueDate,
      description: `\u0641\u0627\u062A\u0648\u0631\u0629 \u0636\u0631\u064A\u0628\u064A\u0629 \u0631\u0642\u0645 ${inv.invoiceNumber} \u2014 ${inv.buyerName}`,
      sourceType: "invoice",
      sourceId: input.invoiceId,
      totalDebitHalala: inv.totalHalala,
      totalCreditHalala: inv.totalHalala,
      isPosted: true,
      createdAt: now,
      updatedAt: now
    });
    const entryId = Number(result.insertId);
    await db.insert(schema_exports.journalLines).values([
      {
        journalEntryId: entryId,
        accountCode: "1120",
        accountName: "\u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u2014 \u0627\u0644\u0639\u0645\u0644\u0627\u0621",
        debitHalala: inv.totalHalala,
        creditHalala: 0,
        description: inv.invoiceNumber,
        sequence: 1
      },
      {
        journalEntryId: entryId,
        accountCode: "4100",
        accountName: "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0645\u0628\u064A\u0639\u0627\u062A \u0627\u0644\u0623\u0628\u0648\u0627\u0628",
        debitHalala: 0,
        creditHalala: inv.subtotalHalala,
        description: inv.invoiceNumber,
        sequence: 2
      },
      {
        journalEntryId: entryId,
        accountCode: "2120",
        accountName: "\u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0633\u062A\u062D\u0642\u0629",
        debitHalala: 0,
        creditHalala: inv.vatAmountHalala,
        description: `\u0636\u0631\u064A\u0628\u0629 ${inv.invoiceNumber}`,
        sequence: 3
      }
    ]);
    return { success: true, entryNumber };
  }),
  // ── تسجيل قيد استلام دفعة (Payment Received) ──────────────────────────────
  postPaymentEntry: adminProcedure.input(z20.object({ invoiceId: z20.number().int() })).mutation(async ({ input }) => {
    const existing = await db.query.journalEntries.findFirst({
      where: (t3) => and10(eq21(t3.sourceType, "payment"), eq21(t3.sourceId, input.invoiceId))
    });
    if (existing) throw new Error("\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0642\u064A\u062F \u0627\u0644\u062F\u0641\u0639 \u0644\u0647\u0630\u0647 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0633\u0628\u0642\u0627\u064B");
    const inv = await db.query.taxInvoices.findFirst({
      where: (t3) => eq21(t3.id, input.invoiceId)
    });
    if (!inv) throw new Error("\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
    if (inv.paymentStatus !== "paid")
      throw new Error("\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0644\u0645 \u062A\u064F\u062F\u0641\u0639 \u0628\u0639\u062F");
    const now = Date.now();
    const year = (/* @__PURE__ */ new Date()).getFullYear();
    const countResult = await db.select({ cnt: sql3`COUNT(*)` }).from(schema_exports.journalEntries);
    const counter = (countResult[0]?.cnt ?? 0) + 1;
    const entryNumber = formatEntryNumber(counter, year);
    const [result] = await db.insert(schema_exports.journalEntries).values({
      entryNumber,
      entryDate: inv.issueDate,
      description: `\u0627\u0633\u062A\u0644\u0627\u0645 \u062F\u0641\u0639\u0629 \u2014 \u0641\u0627\u062A\u0648\u0631\u0629 ${inv.invoiceNumber} \u2014 ${inv.buyerName}`,
      sourceType: "payment",
      sourceId: input.invoiceId,
      totalDebitHalala: inv.totalHalala,
      totalCreditHalala: inv.totalHalala,
      isPosted: true,
      createdAt: now,
      updatedAt: now
    });
    const entryId = Number(result.insertId);
    await db.insert(schema_exports.journalLines).values([
      {
        journalEntryId: entryId,
        accountCode: "1110",
        accountName: "\u0627\u0644\u0646\u0642\u062F \u0648\u0627\u0644\u0628\u0646\u0643",
        debitHalala: inv.totalHalala,
        creditHalala: 0,
        description: `\u062F\u0641\u0639\u0629 ${inv.invoiceNumber}`,
        sequence: 1
      },
      {
        journalEntryId: entryId,
        accountCode: "1120",
        accountName: "\u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u2014 \u0627\u0644\u0639\u0645\u0644\u0627\u0621",
        debitHalala: 0,
        creditHalala: inv.totalHalala,
        description: `\u062A\u0633\u0648\u064A\u0629 ${inv.invoiceNumber}`,
        sequence: 2
      }
    ]);
    return { success: true, entryNumber };
  }),
  // ── تقرير ضريبة القيمة المضافة ─────────────────────────────────────────────
  getVatReport: adminProcedure.input(
    z20.object({
      startDate: z20.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      // YYYY-MM-DD
      endDate: z20.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    })
  ).query(async ({ input }) => {
    const invoices = await db.query.taxInvoices.findMany({
      where: (t3) => and10(
        gte(t3.issueDate, input.startDate),
        lte(t3.issueDate, input.endDate)
      )
    });
    const issued = invoices.filter((i) => i.status !== "cancelled");
    const outputVatHalala = issued.reduce((s, i) => s + i.vatAmountHalala, 0);
    const salesHalala = issued.reduce((s, i) => s + i.subtotalHalala, 0);
    const totalWithVatHalala = issued.reduce((s, i) => s + i.totalHalala, 0);
    const paidInvoices = issued.filter((i) => i.paymentStatus === "paid");
    const collectedVatHalala = paidInvoices.reduce(
      (s, i) => s + i.vatAmountHalala,
      0
    );
    const purchaseRows = await db.query.purchaseInvoices.findMany({
      where: (p) => and10(
        gte(p.issueDate, input.startDate),
        lte(p.issueDate, input.endDate)
      )
    });
    const inputVatHalala = purchaseRows.reduce(
      (s, p) => s + p.vatAmountHalala,
      0
    );
    const netVatPayableHalala = outputVatHalala - inputVatHalala;
    const standardInvoices = issued.filter((i) => i.invoiceType === "standard");
    const simplifiedInvoices = issued.filter(
      (i) => i.invoiceType === "simplified"
    );
    return {
      period: { startDate: input.startDate, endDate: input.endDate },
      summary: {
        invoiceCount: issued.length,
        salesRiyals: fromHalala2(salesHalala),
        outputVatRiyals: fromHalala2(outputVatHalala),
        totalWithVatRiyals: fromHalala2(totalWithVatHalala),
        inputVatRiyals: fromHalala2(inputVatHalala),
        netVatPayableRiyals: fromHalala2(Math.max(0, netVatPayableHalala)),
        netVatRefundRiyals: netVatPayableHalala < 0 ? fromHalala2(Math.abs(netVatPayableHalala)) : "0.00",
        collectedVatRiyals: fromHalala2(collectedVatHalala),
        uncollectedVatRiyals: fromHalala2(
          outputVatHalala - collectedVatHalala
        ),
        purchaseCount: purchaseRows.length
      },
      byType: {
        standard: {
          count: standardInvoices.length,
          salesRiyals: fromHalala2(
            standardInvoices.reduce((s, i) => s + i.subtotalHalala, 0)
          ),
          vatRiyals: fromHalala2(
            standardInvoices.reduce((s, i) => s + i.vatAmountHalala, 0)
          )
        },
        simplified: {
          count: simplifiedInvoices.length,
          salesRiyals: fromHalala2(
            simplifiedInvoices.reduce((s, i) => s + i.subtotalHalala, 0)
          ),
          vatRiyals: fromHalala2(
            simplifiedInvoices.reduce((s, i) => s + i.vatAmountHalala, 0)
          )
        }
      },
      invoices: issued.map((i) => ({
        invoiceNumber: i.invoiceNumber,
        issueDate: i.issueDate,
        buyerName: i.buyerName,
        buyerVatNumber: i.buyerVatNumber,
        invoiceType: i.invoiceType,
        salesRiyals: fromHalala2(i.subtotalHalala),
        vatRiyals: fromHalala2(i.vatAmountHalala),
        totalRiyals: fromHalala2(i.totalHalala),
        paymentStatus: i.paymentStatus,
        status: i.status
      }))
    };
  }),
  // ── أرصدة الحسابات الرئيسية ─────────────────────────────────────────────────
  getAccountBalances: adminProcedure.query(async () => {
    const lines = await db.query.journalLines.findMany();
    const balances = {};
    for (const l of lines) {
      if (!balances[l.accountCode])
        balances[l.accountCode] = { debit: 0, credit: 0 };
      balances[l.accountCode].debit += l.debitHalala;
      balances[l.accountCode].credit += l.creditHalala;
    }
    const accs = await db.query.accounts.findMany({
      orderBy: [schema_exports.accounts.code]
    });
    return accs.map((a) => {
      const b = balances[a.code] ?? { debit: 0, credit: 0 };
      const net = a.normalBalance === "debit" ? b.debit - b.credit : b.credit - b.debit;
      return {
        ...a,
        debitHalala: b.debit,
        creditHalala: b.credit,
        balanceHalala: net,
        balanceRiyals: fromHalala2(Math.abs(net)),
        isNegative: net < 0
      };
    });
  })
});

// server/purchases.router.ts
import { z as z21 } from "zod/v4";
import { eq as eq22, desc as desc17, sql as sql4 } from "drizzle-orm";
var fromHalala3 = (h) => (h / 100).toFixed(2);
var toHalala3 = (r) => Math.round(r * 100);
var CATEGORY_LABELS = {
  materials: "\u0645\u0648\u0627\u062F \u062E\u0627\u0645",
  equipment: "\u0645\u0639\u062F\u0627\u062A \u0648\u0622\u0644\u0627\u062A",
  services: "\u062E\u062F\u0645\u0627\u062A",
  utilities: "\u0645\u0631\u0627\u0641\u0642 (\u0643\u0647\u0631\u0628\u0627\u0621/\u0645\u0627\u0621/\u0625\u0646\u062A\u0631\u0646\u062A)",
  other: "\u0623\u062E\u0631\u0649"
};
var purchasesRouter = router({
  // ── قائمة فواتير المشتريات ─────────────────────────────────────────────────
  list: adminProcedure.input(
    z21.object({
      startDate: z21.string().optional(),
      endDate: z21.string().optional(),
      paymentStatus: z21.enum(["unpaid", "paid"]).optional(),
      category: z21.enum(["materials", "equipment", "services", "utilities", "other"]).optional()
    }).optional()
  ).query(async ({ input }) => {
    const rows = await db.select().from(purchaseInvoices).orderBy(desc17(purchaseInvoices.issueDate));
    let result = rows;
    if (input?.startDate)
      result = result.filter((r) => r.issueDate >= input.startDate);
    if (input?.endDate)
      result = result.filter((r) => r.issueDate <= input.endDate);
    if (input?.paymentStatus)
      result = result.filter((r) => r.paymentStatus === input.paymentStatus);
    if (input?.category)
      result = result.filter((r) => r.category === input.category);
    return result.map((r) => ({
      ...r,
      subtotalRiyals: fromHalala3(r.subtotalHalala),
      vatAmountRiyals: fromHalala3(r.vatAmountHalala),
      totalRiyals: fromHalala3(r.totalHalala),
      categoryLabel: CATEGORY_LABELS[r.category ?? "other"] ?? r.category
    }));
  }),
  // ── جلب فاتورة واحدة ─────────────────────────────────────────────────────
  getById: adminProcedure.input(z21.object({ id: z21.number() })).query(async ({ input }) => {
    const rows = await db.select().from(purchaseInvoices).where(eq22(purchaseInvoices.id, input.id));
    if (!rows[0]) throw new Error("\u0641\u0627\u062A\u0648\u0631\u0629 \u0627\u0644\u0634\u0631\u0627\u0621 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
    const r = rows[0];
    return {
      ...r,
      subtotalRiyals: fromHalala3(r.subtotalHalala),
      vatAmountRiyals: fromHalala3(r.vatAmountHalala),
      totalRiyals: fromHalala3(r.totalHalala)
    };
  }),
  // ── إضافة فاتورة شراء جديدة ───────────────────────────────────────────────
  create: adminProcedure.input(
    z21.object({
      invoiceNumber: z21.string().min(1),
      supplierName: z21.string().min(1),
      supplierVatNumber: z21.string().length(15).optional(),
      issueDate: z21.string().min(10).max(10),
      // YYYY-MM-DD
      subtotalRiyals: z21.number().nonnegative(),
      vatAmountRiyals: z21.number().nonnegative(),
      category: z21.enum(["materials", "equipment", "services", "utilities", "other"]).default("materials"),
      description: z21.string().min(1),
      notes: z21.string().optional()
    })
  ).mutation(async ({ input }) => {
    const subtotalHalala = toHalala3(input.subtotalRiyals);
    const vatAmountHalala = toHalala3(input.vatAmountRiyals);
    const totalHalala = subtotalHalala + vatAmountHalala;
    const now = Date.now();
    const [result] = await db.insert(purchaseInvoices).values({
      invoiceNumber: input.invoiceNumber,
      supplierName: input.supplierName,
      supplierVatNumber: input.supplierVatNumber,
      issueDate: input.issueDate,
      subtotalHalala,
      vatAmountHalala,
      totalHalala,
      category: input.category,
      description: input.description,
      paymentStatus: "unpaid",
      notes: input.notes,
      createdAt: now,
      updatedAt: now
    });
    const purchaseId = Number(result.insertId);
    try {
      const year = (/* @__PURE__ */ new Date()).getFullYear();
      const jeCountResult = await db.select({ cnt: sql4`COUNT(*)` }).from(journalEntries);
      const jeCounter = (jeCountResult[0]?.cnt ?? 0) + 1;
      const jeNumber = `JE-${year}-${String(jeCounter).padStart(6, "0")}`;
      const expenseAccountMap = {
        materials: { code: "5100", name: "\u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u0645\u0648\u0627\u062F \u0627\u0644\u062E\u0627\u0645" },
        equipment: { code: "5200", name: "\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u0645\u0639\u062F\u0627\u062A \u0648\u0627\u0644\u0623\u0635\u0648\u0644" },
        services: { code: "5300", name: "\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u062E\u062F\u0645\u0627\u062A" },
        utilities: { code: "5400", name: "\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0627\u0644\u0645\u0631\u0627\u0641\u0642" },
        other: { code: "5900", name: "\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0623\u062E\u0631\u0649" }
      };
      const expenseAcc = expenseAccountMap[input.category] ?? expenseAccountMap.other;
      const [jeResult] = await db.insert(journalEntries).values({
        entryNumber: jeNumber,
        entryDate: input.issueDate,
        description: `\u0641\u0627\u062A\u0648\u0631\u0629 \u0634\u0631\u0627\u0621 \u2014 ${input.supplierName} \u2014 ${input.invoiceNumber}`,
        sourceType: "manual",
        sourceId: purchaseId,
        totalDebitHalala: totalHalala,
        totalCreditHalala: totalHalala,
        isPosted: true,
        createdAt: now,
        updatedAt: now
      });
      const jeId = Number(jeResult.insertId);
      const lines = [
        // Dr مصروف/أصل
        {
          journalEntryId: jeId,
          accountCode: expenseAcc.code,
          accountName: expenseAcc.name,
          debitHalala: subtotalHalala,
          creditHalala: 0,
          description: input.invoiceNumber,
          sequence: 1
        },
        // Dr ضريبة مدخلات قابلة للاسترداد
        {
          journalEntryId: jeId,
          accountCode: "1130",
          accountName: "\u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629 \u0627\u0644\u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0627\u0633\u062A\u0631\u062F\u0627\u062F",
          debitHalala: vatAmountHalala,
          creditHalala: 0,
          description: `\u0636\u0631\u064A\u0628\u0629 ${input.invoiceNumber}`,
          sequence: 2
        },
        // Cr حسابات الدائنين
        {
          journalEntryId: jeId,
          accountCode: "2110",
          accountName: "\u062D\u0633\u0627\u0628\u0627\u062A \u062F\u0627\u0626\u0646\u0629 \u2014 \u0627\u0644\u0645\u0648\u0631\u062F\u0648\u0646",
          debitHalala: 0,
          creditHalala: totalHalala,
          description: input.supplierName,
          sequence: 3
        }
      ];
      const filteredLines = vatAmountHalala > 0 ? lines : [lines[0], lines[2]];
      await db.insert(journalLines).values(filteredLines);
    } catch {
    }
    return { success: true, id: purchaseId };
  }),
  // ── تحديث حالة الدفع ─────────────────────────────────────────────────────
  updatePaymentStatus: adminProcedure.input(
    z21.object({ id: z21.number(), paymentStatus: z21.enum(["unpaid", "paid"]) })
  ).mutation(async ({ input }) => {
    await db.update(purchaseInvoices).set({ paymentStatus: input.paymentStatus, updatedAt: Date.now() }).where(eq22(purchaseInvoices.id, input.id));
    if (input.paymentStatus === "paid") {
      try {
        const rows = await db.select().from(purchaseInvoices).where(eq22(purchaseInvoices.id, input.id));
        const inv = rows[0];
        if (inv) {
          const year = (/* @__PURE__ */ new Date()).getFullYear();
          const jeCountResult = await db.select({ cnt: sql4`COUNT(*)` }).from(journalEntries);
          const jeCounter = (jeCountResult[0]?.cnt ?? 0) + 1;
          const jeNumber = `JE-${year}-${String(jeCounter).padStart(6, "0")}`;
          const now = Date.now();
          const [jeResult] = await db.insert(journalEntries).values({
            entryNumber: jeNumber,
            entryDate: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
            description: `\u062F\u0641\u0639 \u0641\u0627\u062A\u0648\u0631\u0629 \u0634\u0631\u0627\u0621 \u2014 ${inv.supplierName} \u2014 ${inv.invoiceNumber}`,
            sourceType: "payment",
            sourceId: inv.id,
            totalDebitHalala: inv.totalHalala,
            totalCreditHalala: inv.totalHalala,
            isPosted: true,
            createdAt: now,
            updatedAt: now
          });
          const jeId = Number(jeResult.insertId);
          await db.insert(journalLines).values([
            {
              journalEntryId: jeId,
              accountCode: "2110",
              accountName: "\u062D\u0633\u0627\u0628\u0627\u062A \u062F\u0627\u0626\u0646\u0629 \u2014 \u0627\u0644\u0645\u0648\u0631\u062F\u0648\u0646",
              debitHalala: inv.totalHalala,
              creditHalala: 0,
              description: inv.invoiceNumber,
              sequence: 1
            },
            {
              journalEntryId: jeId,
              accountCode: "1110",
              accountName: "\u0627\u0644\u0646\u0642\u062F\u064A\u0629 \u0648\u0627\u0644\u0628\u0646\u0648\u0643",
              debitHalala: 0,
              creditHalala: inv.totalHalala,
              description: inv.supplierName,
              sequence: 2
            }
          ]);
        }
      } catch {
      }
    }
    return { success: true };
  }),
  // ── حذف فاتورة ───────────────────────────────────────────────────────────
  delete: adminProcedure.input(z21.object({ id: z21.number() })).mutation(async ({ input }) => {
    await db.delete(purchaseInvoices).where(eq22(purchaseInvoices.id, input.id));
    return { success: true };
  }),
  // ── ملخص ضريبة المدخلات (للـ VAT Report) ────────────────────────────────
  getInputVatSummary: adminProcedure.input(z21.object({ startDate: z21.string(), endDate: z21.string() })).query(async ({ input }) => {
    const rows = await db.select().from(purchaseInvoices);
    const filtered = rows.filter(
      (r) => r.issueDate >= input.startDate && r.issueDate <= input.endDate
    );
    const totalSubtotalHalala = filtered.reduce(
      (s, r) => s + r.subtotalHalala,
      0
    );
    const totalVatHalala = filtered.reduce(
      (s, r) => s + r.vatAmountHalala,
      0
    );
    const totalHalala = filtered.reduce((s, r) => s + r.totalHalala, 0);
    return {
      count: filtered.length,
      purchasesRiyals: fromHalala3(totalSubtotalHalala),
      inputVatRiyals: fromHalala3(totalVatHalala),
      totalRiyals: fromHalala3(totalHalala),
      invoices: filtered.map((r) => ({
        id: r.id,
        invoiceNumber: r.invoiceNumber,
        supplierName: r.supplierName,
        issueDate: r.issueDate,
        category: r.category,
        vatRiyals: fromHalala3(r.vatAmountHalala),
        totalRiyals: fromHalala3(r.totalHalala),
        paymentStatus: r.paymentStatus
      }))
    };
  })
});

// server/products.router.ts
import { z as z22 } from "zod/v4";
import { eq as eq23, asc, desc as desc18 } from "drizzle-orm";
var CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310419663029533510/SRrXkzo3YQ7qW8GU5VPaHC";
var CLASSIC_DOOR = `${CDN}/product-classic-door-BVsWk2zwi8AhwPnCA2bPST.webp`;
var MODERN_DOOR = `${CDN}/product-modern-door-ZUHyARH6878fCSEmyEDhqJ.webp`;
var HERO_DOOR = `${CDN}/hero-door-XRVFQ3nypbQtd5qxWnjggQ.webp`;
var B2B_IMAGE = `${CDN}/b2b-meeting-mwGMjJwsNUmxPJQPyMhAHb.webp`;
var WORKSHOP_IMAGE = `${CDN}/workshop-craftsmanship-5Wnk3rHkNrAWAYJQbFcK9c.webp`;
var SEED_PRODUCTS = [
  {
    sku: "SND-INT-OAK-001",
    name: "\u0628\u0627\u0628 \u0643\u0644\u0627\u0633\u064A\u0643\u064A \u0645\u0646 \u062E\u0634\u0628 \u0627\u0644\u0633\u0646\u062F\u064A\u0627\u0646",
    nameEn: "Classic Oak Interior Door",
    category: "interior",
    subcategory: "interior",
    woodType: "oak",
    basePrice: 1200,
    distributorPrice: 960,
    tiers: [
      { min: 1, max: 4, price: 1200, label: "1-4 \u0623\u0628\u0648\u0627\u0628" },
      { min: 5, max: 9, price: 980, label: "5-9 \u0623\u0628\u0648\u0627\u0628" },
      { min: 10, max: null, price: 850, label: "10+ \u0623\u0628\u0648\u0627\u0628" }
    ],
    image: CLASSIC_DOOR,
    images: [CLASSIC_DOOR, HERO_DOOR, WORKSHOP_IMAGE, MODERN_DOOR],
    sizes: ["90\xD7210", "80\xD7200", "100\xD7220"],
    colors: ["\u0628\u0644\u0648\u0637 \u0637\u0628\u064A\u0639\u064A", "\u062C\u0648\u0632\u064A \u062F\u0627\u0643\u0646", "\u0623\u0628\u064A\u0636 \u0645\u0637\u0641\u064A"],
    stock: 45,
    badge: "\u0627\u0644\u0623\u0643\u062B\u0631 \u0645\u0628\u064A\u0639\u0627\u064B",
    badgeColor: "copper",
    features: [
      "\u062E\u0634\u0628 \u0633\u0646\u062F\u064A\u0627\u0646 \u0637\u0628\u064A\u0639\u064A 100%",
      "\u0645\u0642\u0627\u0648\u0645 \u0644\u0644\u0631\u0637\u0648\u0628\u0629",
      "\u0636\u0645\u0627\u0646 10 \u0633\u0646\u0648\u0627\u062A",
      "\u062A\u0634\u0637\u064A\u0628 \u0645\u0645\u062A\u0627\u0632"
    ],
    description: "\u0628\u0627\u0628 \u062F\u0627\u062E\u0644\u064A \u0643\u0644\u0627\u0633\u064A\u0643\u064A \u0645\u0635\u0646\u0648\u0639 \u0645\u0646 \u062E\u0634\u0628 \u0627\u0644\u0633\u0646\u062F\u064A\u0627\u0646 \u0627\u0644\u0637\u0628\u064A\u0639\u064A \u0628\u0646\u0633\u0628\u0629 100%. \u064A\u062A\u0645\u064A\u0632 \u0628\u062A\u0635\u0645\u064A\u0645 \u0623\u0646\u064A\u0642 \u064A\u062C\u0645\u0639 \u0628\u064A\u0646 \u0627\u0644\u0637\u0627\u0628\u0639 \u0627\u0644\u062A\u0642\u0644\u064A\u062F\u064A \u0648\u0627\u0644\u0645\u062A\u0627\u0646\u0629 \u0627\u0644\u0639\u0627\u0644\u064A\u0629. \u0645\u0642\u0627\u0648\u0645 \u0644\u0644\u0631\u0637\u0648\u0628\u0629 \u0648\u0645\u0639\u0627\u0644\u062C \u0628\u0637\u0628\u0642\u0627\u062A \u062D\u0645\u0627\u064A\u0629 \u0645\u062A\u0639\u062F\u062F\u0629 \u0644\u0636\u0645\u0627\u0646 \u0639\u0645\u0631 \u0627\u0641\u062A\u0631\u0627\u0636\u064A \u0637\u0648\u064A\u0644. \u0645\u062B\u0627\u0644\u064A \u0644\u0644\u063A\u0631\u0641 \u0627\u0644\u062F\u0627\u062E\u0644\u064A\u0629 \u0648\u0627\u0644\u0635\u0627\u0644\u0627\u062A.",
    specs: [
      { label: "\u0646\u0648\u0639 \u0627\u0644\u062E\u0634\u0628", value: "\u0633\u0646\u062F\u064A\u0627\u0646 \u0637\u0628\u064A\u0639\u064A \u0635\u0644\u0628" },
      { label: "\u0627\u0644\u0633\u0645\u0627\u0643\u0629", value: "45 \u0645\u0645" },
      { label: "\u0627\u0644\u0627\u0631\u062A\u0641\u0627\u0639", value: "210 \u0633\u0645" },
      { label: "\u0627\u0644\u0639\u0631\u0636", value: "90 \u0633\u0645" },
      { label: "\u0627\u0644\u0648\u0632\u0646", value: "38 \u0643\u062C\u0645" },
      { label: "\u0627\u0644\u062A\u0634\u0637\u064A\u0628", value: "\u0648\u0631\u0646\u064A\u0634 \u0645\u0627\u0626\u064A \u0645\u0642\u0627\u0648\u0645 \u0644\u0644\u062E\u062F\u0634" },
      { label: "\u0646\u0648\u0639 \u0627\u0644\u0625\u0637\u0627\u0631", value: "\u0625\u0637\u0627\u0631 \u062E\u0634\u0628\u064A \u0635\u0644\u0628" },
      { label: "\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0631\u0637\u0648\u0628\u0629", value: "\u0646\u0639\u0645 - \u0645\u0639\u0627\u0644\u062C" },
      { label: "\u0627\u0644\u0636\u0645\u0627\u0646", value: "10 \u0633\u0646\u0648\u0627\u062A" },
      { label: "\u0628\u0644\u062F \u0627\u0644\u0645\u0646\u0634\u0623", value: "\u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629" }
    ],
    dimensions: "210 \xD7 90 \u0633\u0645",
    rating: 4.9,
    reviewCount: 128,
    inStock: true,
    isNew: false,
    isBestseller: true,
    isCertified: false,
    tags: ["\u0643\u0644\u0627\u0633\u064A\u0643\u064A", "\u062F\u0627\u062E\u0644\u064A", "\u0633\u0646\u062F\u064A\u0627\u0646"],
    weight: "38 \u0643\u062C\u0645",
    warranty: "10 \u0633\u0646\u0648\u0627\u062A"
  },
  {
    sku: "SND-INT-WAL-002",
    name: "\u0628\u0627\u0628 \u0639\u0635\u0631\u064A \u0628\u0642\u0634\u0631\u0629 \u0627\u0644\u062C\u0648\u0632",
    nameEn: "Modern Walnut Veneer Door",
    category: "interior",
    subcategory: "interior",
    woodType: "walnut",
    basePrice: 1450,
    distributorPrice: 1160,
    tiers: [
      { min: 1, max: 4, price: 1450, label: "1-4 \u0623\u0628\u0648\u0627\u0628" },
      { min: 5, max: 9, price: 1180, label: "5-9 \u0623\u0628\u0648\u0627\u0628" },
      { min: 10, max: null, price: 1020, label: "10+ \u0623\u0628\u0648\u0627\u0628" }
    ],
    image: MODERN_DOOR,
    images: [MODERN_DOOR, HERO_DOOR, CLASSIC_DOOR, WORKSHOP_IMAGE],
    sizes: ["90\xD7210", "80\xD7200"],
    colors: ["\u062C\u0648\u0632 \u0637\u0628\u064A\u0639\u064A", "\u062C\u0648\u0632 \u062F\u0627\u0643\u0646"],
    stock: 32,
    badge: "\u062C\u062F\u064A\u062F",
    badgeColor: "oak",
    features: [
      "\u0642\u0634\u0631\u0629 \u062C\u0648\u0632 \u0637\u0628\u064A\u0639\u064A\u0629",
      "\u062A\u0635\u0645\u064A\u0645 \u0645\u064A\u0646\u064A\u0645\u0627\u0644\u0633\u062A",
      "\u0639\u0632\u0644 \u0635\u0648\u062A\u064A \u0645\u062D\u0633\u0651\u0646",
      "\u0633\u0637\u062D \u0645\u0642\u0627\u0648\u0645 \u0644\u0644\u062E\u062F\u0634"
    ],
    description: "\u0628\u0627\u0628 \u0639\u0635\u0631\u064A \u0628\u062A\u0635\u0645\u064A\u0645 \u0645\u064A\u0646\u064A\u0645\u0627\u0644\u0633\u062A \u0623\u0646\u064A\u0642 \u0645\u063A\u0637\u0649 \u0628\u0642\u0634\u0631\u0629 \u0627\u0644\u062C\u0648\u0632 \u0627\u0644\u0637\u0628\u064A\u0639\u064A\u0629. \u064A\u0648\u0641\u0631 \u0639\u0632\u0644\u0627\u064B \u0635\u0648\u062A\u064A\u0627\u064B \u0645\u062D\u0633\u0651\u0646\u0627\u064B \u0628\u0641\u0636\u0644 \u0637\u0628\u0642\u0627\u062A\u0647 \u0627\u0644\u0645\u062A\u0639\u062F\u062F\u0629. \u0633\u0637\u062D\u0647 \u0645\u0642\u0627\u0648\u0645 \u0644\u0644\u062E\u062F\u0634 \u0645\u0645\u0627 \u064A\u062C\u0639\u0644\u0647 \u0645\u062B\u0627\u0644\u064A\u0627\u064B \u0644\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u064A\u0648\u0645\u064A \u0627\u0644\u0645\u0643\u062B\u0641 \u0641\u064A \u0627\u0644\u0645\u0646\u0627\u0632\u0644 \u0648\u0627\u0644\u0645\u0643\u0627\u062A\u0628.",
    specs: [
      { label: "\u0646\u0648\u0639 \u0627\u0644\u062E\u0634\u0628", value: "\u0642\u0634\u0631\u0629 \u062C\u0648\u0632 \u0637\u0628\u064A\u0639\u064A\u0629 \u0639\u0644\u0649 MDF" },
      { label: "\u0627\u0644\u0633\u0645\u0627\u0643\u0629", value: "40 \u0645\u0645" },
      { label: "\u0627\u0644\u0627\u0631\u062A\u0641\u0627\u0639", value: "210 \u0633\u0645" },
      { label: "\u0627\u0644\u0639\u0631\u0636", value: "90 \u0633\u0645" },
      { label: "\u0627\u0644\u0648\u0632\u0646", value: "35 \u0643\u062C\u0645" },
      { label: "\u0627\u0644\u062A\u0634\u0637\u064A\u0628", value: "\u0644\u0627\u0643\u0631 \u0645\u0637\u0641\u064A" },
      { label: "\u0627\u0644\u0639\u0632\u0644 \u0627\u0644\u0635\u0648\u062A\u064A", value: "32 \u062F\u064A\u0633\u064A\u0628\u0644" },
      { label: "\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u062E\u062F\u0634", value: "\u0646\u0639\u0645 - \u0637\u0628\u0642\u0629 \u062D\u0645\u0627\u064A\u0629" },
      { label: "\u0627\u0644\u0636\u0645\u0627\u0646", value: "10 \u0633\u0646\u0648\u0627\u062A" },
      { label: "\u0628\u0644\u062F \u0627\u0644\u0645\u0646\u0634\u0623", value: "\u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629" }
    ],
    dimensions: "210 \xD7 90 \u0633\u0645",
    rating: 4.7,
    reviewCount: 54,
    inStock: true,
    isNew: true,
    isBestseller: false,
    isCertified: false,
    tags: ["\u0639\u0635\u0631\u064A", "\u062F\u0627\u062E\u0644\u064A", "\u062C\u0648\u0632"],
    weight: "35 \u0643\u062C\u0645",
    warranty: "10 \u0633\u0646\u0648\u0627\u062A"
  },
  {
    sku: "SND-INT-OAK-003",
    name: "\u0628\u0627\u0628 \u062F\u0627\u062E\u0644\u064A \u0628\u0625\u0637\u0627\u0631 \u0645\u0632\u062F\u0648\u062C",
    nameEn: "Double Frame Interior Door",
    category: "interior",
    subcategory: "interior",
    woodType: "oak",
    basePrice: 1650,
    distributorPrice: 1320,
    tiers: [
      { min: 1, max: 4, price: 1650, label: "1-4 \u0623\u0628\u0648\u0627\u0628" },
      { min: 5, max: 9, price: 1350, label: "5-9 \u0623\u0628\u0648\u0627\u0628" },
      { min: 10, max: null, price: 1180, label: "10+ \u0623\u0628\u0648\u0627\u0628" }
    ],
    image: CLASSIC_DOOR,
    images: [CLASSIC_DOOR, MODERN_DOOR, HERO_DOOR, B2B_IMAGE],
    sizes: ["120\xD7210", "140\xD7210"],
    colors: ["\u0628\u0644\u0648\u0637 \u0637\u0628\u064A\u0639\u064A", "\u0623\u0628\u064A\u0636"],
    stock: 18,
    badge: "",
    badgeColor: "",
    features: [
      "\u0625\u0637\u0627\u0631 \u0645\u0632\u062F\u0648\u062C \u0641\u0627\u062E\u0631",
      "\u0632\u062C\u0627\u062C \u0645\u0635\u0646\u0641\u0631 \u0627\u062E\u062A\u064A\u0627\u0631\u064A",
      "\u062E\u0634\u0628 \u0633\u0646\u062F\u064A\u0627\u0646 \u0635\u0644\u0628",
      "\u062A\u0635\u0645\u064A\u0645 \u0645\u062E\u0635\u0635"
    ],
    description: "\u0628\u0627\u0628 \u062F\u0627\u062E\u0644\u064A \u0641\u0627\u062E\u0631 \u0628\u0625\u0637\u0627\u0631 \u0645\u0632\u062F\u0648\u062C \u0645\u0646 \u062E\u0634\u0628 \u0627\u0644\u0633\u0646\u062F\u064A\u0627\u0646 \u0627\u0644\u0635\u0644\u0628. \u064A\u062A\u0648\u0641\u0631 \u0628\u062E\u064A\u0627\u0631 \u0632\u062C\u0627\u062C \u0645\u0635\u0646\u0641\u0631 \u064A\u0636\u064A\u0641 \u0644\u0645\u0633\u0629 \u0639\u0635\u0631\u064A\u0629. \u0645\u062B\u0627\u0644\u064A \u0644\u0644\u0635\u0627\u0644\u0627\u062A \u0627\u0644\u0643\u0628\u064A\u0631\u0629 \u0648\u063A\u0631\u0641 \u0627\u0644\u0645\u0639\u064A\u0634\u0629 \u062D\u064A\u062B \u064A\u0645\u0646\u062D \u0625\u062D\u0633\u0627\u0633\u0627\u064B \u0628\u0627\u0644\u0641\u062E\u0627\u0645\u0629 \u0648\u0627\u0644\u0631\u062D\u0627\u0628\u0629.",
    specs: [
      { label: "\u0646\u0648\u0639 \u0627\u0644\u062E\u0634\u0628", value: "\u0633\u0646\u062F\u064A\u0627\u0646 \u0635\u0644\u0628" },
      { label: "\u0627\u0644\u0633\u0645\u0627\u0643\u0629", value: "45 \u0645\u0645" },
      { label: "\u0627\u0644\u0627\u0631\u062A\u0641\u0627\u0639", value: "210 \u0633\u0645" },
      { label: "\u0627\u0644\u0639\u0631\u0636", value: "120 \u0633\u0645 (\u0645\u0632\u062F\u0648\u062C)" },
      { label: "\u0627\u0644\u0648\u0632\u0646", value: "52 \u0643\u062C\u0645" },
      { label: "\u0627\u0644\u062A\u0634\u0637\u064A\u0628", value: "\u0648\u0631\u0646\u064A\u0634 \u0644\u0627\u0645\u0639" },
      { label: "\u0627\u0644\u0632\u062C\u0627\u062C", value: "\u0645\u0635\u0646\u0641\u0631 \u0627\u062E\u062A\u064A\u0627\u0631\u064A 6 \u0645\u0645" },
      { label: "\u0627\u0644\u0636\u0645\u0627\u0646", value: "10 \u0633\u0646\u0648\u0627\u062A" }
    ],
    dimensions: "210 \xD7 120 \u0633\u0645",
    rating: 4.6,
    reviewCount: 37,
    inStock: true,
    isNew: false,
    isBestseller: false,
    isCertified: false,
    tags: ["\u0625\u0637\u0627\u0631 \u0645\u0632\u062F\u0648\u062C", "\u062F\u0627\u062E\u0644\u064A", "\u0633\u0646\u062F\u064A\u0627\u0646"],
    weight: "52 \u0643\u062C\u0645",
    warranty: "10 \u0633\u0646\u0648\u0627\u062A"
  },
  {
    sku: "SND-INT-TEK-004",
    name: "\u0628\u0627\u0628 \u062F\u0627\u062E\u0644\u064A \u0633\u0627\u062C \u0637\u0628\u064A\u0639\u064A",
    nameEn: "Natural Teak Interior Door",
    category: "interior",
    subcategory: "interior",
    woodType: "teak",
    basePrice: 1900,
    distributorPrice: 1520,
    tiers: [
      { min: 1, max: 4, price: 1900, label: "1-4 \u0623\u0628\u0648\u0627\u0628" },
      { min: 5, max: 9, price: 1550, label: "5-9 \u0623\u0628\u0648\u0627\u0628" },
      { min: 10, max: null, price: 1350, label: "10+ \u0623\u0628\u0648\u0627\u0628" }
    ],
    image: MODERN_DOOR,
    images: [MODERN_DOOR, CLASSIC_DOOR, WORKSHOP_IMAGE, HERO_DOOR],
    sizes: ["90\xD7210", "80\xD7210"],
    colors: ["\u0633\u0627\u062C \u0637\u0628\u064A\u0639\u064A", "\u0633\u0627\u062C \u062F\u0627\u0643\u0646"],
    stock: 25,
    badge: "",
    badgeColor: "",
    features: [
      "\u062E\u0634\u0628 \u0633\u0627\u062C \u0623\u0635\u0644\u064A",
      "\u0645\u0642\u0627\u0648\u0645 \u0644\u0644\u062D\u0634\u0631\u0627\u062A \u0637\u0628\u064A\u0639\u064A\u0627\u064B",
      "\u0636\u0645\u0627\u0646 15 \u0633\u0646\u0629",
      "\u0644\u0645\u0633\u0629 \u0646\u0647\u0627\u0626\u064A\u0629 \u0637\u0628\u064A\u0639\u064A\u0629"
    ],
    description: "\u0628\u0627\u0628 \u062F\u0627\u062E\u0644\u064A \u0641\u0627\u062E\u0631 \u0645\u0646 \u062E\u0634\u0628 \u0627\u0644\u0633\u0627\u062C \u0627\u0644\u0623\u0635\u0644\u064A \u0627\u0644\u0645\u0639\u0631\u0648\u0641 \u0628\u0645\u0642\u0627\u0648\u0645\u062A\u0647 \u0627\u0644\u0637\u0628\u064A\u0639\u064A\u0629 \u0644\u0644\u062D\u0634\u0631\u0627\u062A \u0648\u0627\u0644\u0631\u0637\u0648\u0628\u0629. \u064A\u062A\u0645\u064A\u0632 \u0628\u0644\u0645\u0633\u0629 \u0646\u0647\u0627\u0626\u064A\u0629 \u0637\u0628\u064A\u0639\u064A\u0629 \u062A\u0628\u0631\u0632 \u062C\u0645\u0627\u0644 \u0623\u0644\u064A\u0627\u0641 \u0627\u0644\u062E\u0634\u0628. \u064A\u0623\u062A\u064A \u0645\u0639 \u0636\u0645\u0627\u0646 15 \u0633\u0646\u0629 \u0645\u0645\u0627 \u064A\u0639\u0643\u0633 \u062B\u0642\u062A\u0646\u0627 \u0641\u064A \u062C\u0648\u062F\u062A\u0647.",
    specs: [
      { label: "\u0646\u0648\u0639 \u0627\u0644\u062E\u0634\u0628", value: "\u0633\u0627\u062C \u0637\u0628\u064A\u0639\u064A \u0623\u0635\u0644\u064A" },
      { label: "\u0627\u0644\u0633\u0645\u0627\u0643\u0629", value: "45 \u0645\u0645" },
      { label: "\u0627\u0644\u0627\u0631\u062A\u0641\u0627\u0639", value: "210 \u0633\u0645" },
      { label: "\u0627\u0644\u0639\u0631\u0636", value: "90 \u0633\u0645" },
      { label: "\u0627\u0644\u0648\u0632\u0646", value: "40 \u0643\u062C\u0645" },
      { label: "\u0627\u0644\u062A\u0634\u0637\u064A\u0628", value: "\u0632\u064A\u062A \u0637\u0628\u064A\u0639\u064A" },
      { label: "\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u062D\u0634\u0631\u0627\u062A", value: "\u0637\u0628\u064A\u0639\u064A\u0629" },
      { label: "\u0627\u0644\u0636\u0645\u0627\u0646", value: "15 \u0633\u0646\u0629" }
    ],
    dimensions: "210 \xD7 90 \u0633\u0645",
    rating: 4.8,
    reviewCount: 82,
    inStock: true,
    isNew: false,
    isBestseller: false,
    isCertified: false,
    tags: ["\u0633\u0627\u062C", "\u062F\u0627\u062E\u0644\u064A", "\u0641\u0627\u062E\u0631"],
    weight: "40 \u0643\u062C\u0645",
    warranty: "15 \u0633\u0646\u0648\u0627\u062A"
  },
  {
    sku: "SND-EXT-MAH-005",
    name: "\u0628\u0627\u0628 \u0631\u0626\u064A\u0633\u064A \u0641\u0627\u062E\u0631 \u0645\u062D\u0641\u0648\u0631",
    nameEn: "Luxury Carved Main Entrance Door",
    category: "exterior",
    subcategory: "exterior",
    woodType: "mahogany",
    basePrice: 2800,
    distributorPrice: 2240,
    tiers: [
      { min: 1, max: 4, price: 2800, label: "1-4 \u0623\u0628\u0648\u0627\u0628" },
      { min: 5, max: 9, price: 2350, label: "5-9 \u0623\u0628\u0648\u0627\u0628" },
      { min: 10, max: null, price: 2100, label: "10+ \u0623\u0628\u0648\u0627\u0628" }
    ],
    image: CLASSIC_DOOR,
    images: [CLASSIC_DOOR, HERO_DOOR, WORKSHOP_IMAGE, B2B_IMAGE],
    sizes: ["100\xD7220", "110\xD7220"],
    colors: ["\u0645\u0627\u0647\u0648\u062C\u0646\u064A \u0637\u0628\u064A\u0639\u064A", "\u0645\u0627\u0647\u0648\u062C\u0646\u064A \u062F\u0627\u0643\u0646", "\u0643\u0631\u0632"],
    stock: 12,
    badge: "\u062D\u0635\u0631\u064A",
    badgeColor: "copper",
    features: [
      "\u0646\u0642\u0634 \u064A\u062F\u0648\u064A \u0641\u0627\u062E\u0631",
      "\u0645\u0642\u0627\u0648\u0645 \u0644\u0644\u0639\u0648\u0627\u0645\u0644 \u0627\u0644\u062C\u0648\u064A\u0629",
      "\u0642\u0641\u0644 \u0623\u0645\u0627\u0646 \u0645\u062A\u0639\u062F\u062F \u0627\u0644\u0646\u0642\u0627\u0637",
      "\u0637\u0644\u0627\u0621 UV"
    ],
    description: "\u0628\u0627\u0628 \u0631\u0626\u064A\u0633\u064A \u0641\u0627\u062E\u0631 \u0645\u0646 \u062E\u0634\u0628 \u0627\u0644\u0645\u0627\u0647\u0648\u062C\u0646\u064A \u0628\u0646\u0642\u0648\u0634 \u064A\u062F\u0648\u064A\u0629 \u0641\u0646\u064A\u0629. \u0645\u0635\u0645\u0645 \u062E\u0635\u064A\u0635\u0627\u064B \u0644\u0644\u0645\u062F\u0627\u062E\u0644 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629 \u0648\u064A\u062A\u0645\u064A\u0632 \u0628\u0642\u0641\u0644 \u0623\u0645\u0627\u0646 \u0645\u062A\u0639\u062F\u062F \u0627\u0644\u0646\u0642\u0627\u0637 \u0648\u0637\u0644\u0627\u0621 UV \u0644\u062D\u0645\u0627\u064A\u062A\u0647 \u0645\u0646 \u0623\u0634\u0639\u0629 \u0627\u0644\u0634\u0645\u0633. \u062A\u062D\u0641\u0629 \u0641\u0646\u064A\u0629 \u062A\u062C\u0645\u0639 \u0628\u064A\u0646 \u0627\u0644\u0623\u0645\u0627\u0646 \u0648\u0627\u0644\u062C\u0645\u0627\u0644.",
    specs: [
      { label: "\u0646\u0648\u0639 \u0627\u0644\u062E\u0634\u0628", value: "\u0645\u0627\u0647\u0648\u062C\u0646\u064A \u0635\u0644\u0628" },
      { label: "\u0627\u0644\u0633\u0645\u0627\u0643\u0629", value: "55 \u0645\u0645" },
      { label: "\u0627\u0644\u0627\u0631\u062A\u0641\u0627\u0639", value: "220 \u0633\u0645" },
      { label: "\u0627\u0644\u0639\u0631\u0636", value: "100 \u0633\u0645" },
      { label: "\u0627\u0644\u0648\u0632\u0646", value: "55 \u0643\u062C\u0645" },
      { label: "\u0627\u0644\u062A\u0634\u0637\u064A\u0628", value: "\u0637\u0644\u0627\u0621 UV \u0645\u062A\u0639\u062F\u062F \u0627\u0644\u0637\u0628\u0642\u0627\u062A" },
      { label: "\u0627\u0644\u0646\u0642\u0634", value: "\u064A\u062F\u0648\u064A \u0641\u0646\u064A" },
      { label: "\u0627\u0644\u0642\u0641\u0644", value: "\u0623\u0645\u0627\u0646 \u0645\u062A\u0639\u062F\u062F \u0627\u0644\u0646\u0642\u0627\u0637" },
      { label: "\u0627\u0644\u0636\u0645\u0627\u0646", value: "12 \u0633\u0646\u0629" }
    ],
    dimensions: "220 \xD7 100 \u0633\u0645",
    rating: 4.9,
    reviewCount: 43,
    inStock: true,
    isNew: false,
    isBestseller: false,
    isCertified: false,
    tags: ["\u062E\u0627\u0631\u062C\u064A", "\u0645\u062D\u0641\u0648\u0631", "\u0645\u0627\u0647\u0648\u062C\u0646\u064A", "\u0641\u0627\u062E\u0631"],
    weight: "55 \u0643\u062C\u0645",
    warranty: "12 \u0633\u0646\u0648\u0627\u062A"
  },
  {
    sku: "SND-EXT-TEK-006",
    name: "\u0628\u0627\u0628 \u062E\u0627\u0631\u062C\u064A \u0645\u0642\u0627\u0648\u0645 \u0644\u0644\u0639\u0648\u0627\u0645\u0644 \u0627\u0644\u062C\u0648\u064A\u0629",
    nameEn: "Weather-Resistant Exterior Door",
    category: "exterior",
    subcategory: "exterior",
    woodType: "teak",
    basePrice: 2200,
    distributorPrice: 1760,
    tiers: [
      { min: 1, max: 4, price: 2200, label: "1-4 \u0623\u0628\u0648\u0627\u0628" },
      { min: 5, max: 9, price: 1850, label: "5-9 \u0623\u0628\u0648\u0627\u0628" },
      { min: 10, max: null, price: 1650, label: "10+ \u0623\u0628\u0648\u0627\u0628" }
    ],
    image: MODERN_DOOR,
    images: [MODERN_DOOR, HERO_DOOR, CLASSIC_DOOR, WORKSHOP_IMAGE],
    sizes: ["95\xD7215", "90\xD7210"],
    colors: ["\u0633\u0627\u062C \u0645\u0639\u0627\u0644\u062C", "\u0628\u0646\u064A \u062F\u0627\u0643\u0646"],
    stock: 28,
    badge: "",
    badgeColor: "",
    features: [
      "\u0645\u0639\u0627\u0644\u062C\u0629 \u0636\u062F \u0627\u0644\u0631\u0637\u0648\u0628\u0629",
      "\u0636\u0645\u0627\u0646 12 \u0633\u0646\u0629",
      "\u0645\u0642\u0627\u0648\u0645 \u0644\u0644\u0623\u0634\u0639\u0629 \u0641\u0648\u0642 \u0627\u0644\u0628\u0646\u0641\u0633\u062C\u064A\u0629",
      "\u0633\u0647\u0644 \u0627\u0644\u0635\u064A\u0627\u0646\u0629"
    ],
    description: "\u0628\u0627\u0628 \u062E\u0627\u0631\u062C\u064A \u0645\u0646 \u062E\u0634\u0628 \u0627\u0644\u0633\u0627\u062C \u0627\u0644\u0645\u0639\u0627\u0644\u062C \u0636\u062F \u0627\u0644\u0631\u0637\u0648\u0628\u0629 \u0648\u0627\u0644\u0623\u0634\u0639\u0629 \u0641\u0648\u0642 \u0627\u0644\u0628\u0646\u0641\u0633\u062C\u064A\u0629. \u0645\u0635\u0645\u0645 \u0644\u062A\u062D\u0645\u0644 \u0627\u0644\u0638\u0631\u0648\u0641 \u0627\u0644\u0645\u0646\u0627\u062E\u064A\u0629 \u0627\u0644\u0642\u0627\u0633\u064A\u0629 \u0645\u0639 \u0627\u0644\u062D\u0641\u0627\u0638 \u0639\u0644\u0649 \u0645\u0638\u0647\u0631\u0647 \u0627\u0644\u0623\u0646\u064A\u0642 \u0644\u0633\u0646\u0648\u0627\u062A \u0637\u0648\u064A\u0644\u0629. \u0633\u0647\u0644 \u0627\u0644\u0635\u064A\u0627\u0646\u0629 \u0648\u064A\u0623\u062A\u064A \u0645\u0639 \u0636\u0645\u0627\u0646 12 \u0633\u0646\u0629.",
    specs: [
      { label: "\u0646\u0648\u0639 \u0627\u0644\u062E\u0634\u0628", value: "\u0633\u0627\u062C \u0645\u0639\u0627\u0644\u062C" },
      { label: "\u0627\u0644\u0633\u0645\u0627\u0643\u0629", value: "50 \u0645\u0645" },
      { label: "\u0627\u0644\u0627\u0631\u062A\u0641\u0627\u0639", value: "215 \u0633\u0645" },
      { label: "\u0627\u0644\u0639\u0631\u0636", value: "95 \u0633\u0645" },
      { label: "\u0627\u0644\u0648\u0632\u0646", value: "48 \u0643\u062C\u0645" },
      { label: "\u0627\u0644\u062A\u0634\u0637\u064A\u0628", value: "\u0637\u0644\u0627\u0621 \u0628\u062D\u0631\u064A \u0645\u0642\u0627\u0648\u0645" },
      { label: "\u062D\u0645\u0627\u064A\u0629 UV", value: "\u0646\u0639\u0645" },
      { label: "\u0627\u0644\u0636\u0645\u0627\u0646", value: "12 \u0633\u0646\u0629" }
    ],
    dimensions: "215 \xD7 95 \u0633\u0645",
    rating: 4.7,
    reviewCount: 61,
    inStock: true,
    isNew: false,
    isBestseller: false,
    isCertified: false,
    tags: ["\u062E\u0627\u0631\u062C\u064A", "\u0645\u0642\u0627\u0648\u0645 \u0644\u0644\u0637\u0642\u0633", "\u0633\u0627\u062C"],
    weight: "48 \u0643\u062C\u0645",
    warranty: "12 \u0633\u0646\u0648\u0627\u062A"
  },
  {
    sku: "SND-EXT-OAK-007",
    name: "\u0628\u0627\u0628 \u062E\u0627\u0631\u062C\u064A \u0628\u0646\u0627\u0641\u0630\u0629 \u062C\u0627\u0646\u0628\u064A\u0629",
    nameEn: "Exterior Door with Sidelite",
    category: "exterior",
    subcategory: "exterior",
    woodType: "oak",
    basePrice: 3200,
    distributorPrice: 2560,
    tiers: [
      { min: 1, max: 4, price: 3200, label: "1-4 \u0623\u0628\u0648\u0627\u0628" },
      { min: 5, max: 9, price: 2700, label: "5-9 \u0623\u0628\u0648\u0627\u0628" },
      { min: 10, max: null, price: 2400, label: "10+ \u0623\u0628\u0648\u0627\u0628" }
    ],
    image: CLASSIC_DOOR,
    images: [CLASSIC_DOOR, MODERN_DOOR, HERO_DOOR, B2B_IMAGE],
    sizes: ["130\xD7220"],
    colors: ["\u0628\u0644\u0648\u0637 \u0637\u0628\u064A\u0639\u064A", "\u0628\u064A\u062C"],
    stock: 0,
    badge: "",
    badgeColor: "",
    features: ["\u0646\u0627\u0641\u0630\u0629 \u062C\u0627\u0646\u0628\u064A\u0629 \u0645\u0632\u062F\u0648\u062C\u0629", "\u0632\u062C\u0627\u062C \u0645\u0642\u0633\u0649", "\u0633\u0646\u062F\u064A\u0627\u0646 \u0635\u0644\u0628", "\u0639\u0632\u0644 \u062D\u0631\u0627\u0631\u064A"],
    description: "\u0628\u0627\u0628 \u062E\u0627\u0631\u062C\u064A \u0623\u0646\u064A\u0642 \u0645\u0639 \u0646\u0627\u0641\u0630\u0629 \u062C\u0627\u0646\u0628\u064A\u0629 \u0645\u0632\u062F\u0648\u062C\u0629 \u0645\u0646 \u0627\u0644\u0632\u062C\u0627\u062C \u0627\u0644\u0645\u0642\u0633\u0649. \u064A\u0648\u0641\u0631 \u0625\u0636\u0627\u0621\u0629 \u0637\u0628\u064A\u0639\u064A\u0629 \u0644\u0644\u0645\u062F\u062E\u0644 \u0645\u0639 \u0627\u0644\u062D\u0641\u0627\u0638 \u0639\u0644\u0649 \u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629 \u0648\u0627\u0644\u0639\u0632\u0644 \u0627\u0644\u062D\u0631\u0627\u0631\u064A. \u0645\u0635\u0646\u0648\u0639 \u0645\u0646 \u062E\u0634\u0628 \u0627\u0644\u0633\u0646\u062F\u064A\u0627\u0646 \u0627\u0644\u0635\u0644\u0628 \u0628\u062A\u0635\u0645\u064A\u0645 \u064A\u062C\u0645\u0639 \u0628\u064A\u0646 \u0627\u0644\u0648\u0638\u064A\u0641\u064A\u0629 \u0648\u0627\u0644\u062C\u0645\u0627\u0644.",
    specs: [
      { label: "\u0646\u0648\u0639 \u0627\u0644\u062E\u0634\u0628", value: "\u0633\u0646\u062F\u064A\u0627\u0646 \u0635\u0644\u0628" },
      { label: "\u0627\u0644\u0633\u0645\u0627\u0643\u0629", value: "50 \u0645\u0645" },
      { label: "\u0627\u0644\u0627\u0631\u062A\u0641\u0627\u0639", value: "220 \u0633\u0645" },
      { label: "\u0627\u0644\u0639\u0631\u0636", value: "130 \u0633\u0645 (\u0645\u0639 \u0627\u0644\u0646\u0648\u0627\u0641\u0630)" },
      { label: "\u0627\u0644\u0648\u0632\u0646", value: "62 \u0643\u062C\u0645" },
      { label: "\u0627\u0644\u0632\u062C\u0627\u062C", value: "\u0645\u0642\u0633\u0649 8 \u0645\u0645" },
      { label: "\u0627\u0644\u0639\u0632\u0644 \u0627\u0644\u062D\u0631\u0627\u0631\u064A", value: "\u0646\u0639\u0645" },
      { label: "\u0627\u0644\u0636\u0645\u0627\u0646", value: "10 \u0633\u0646\u0648\u0627\u062A" }
    ],
    dimensions: "220 \xD7 130 \u0633\u0645",
    rating: 4.5,
    reviewCount: 29,
    inStock: false,
    isNew: false,
    isBestseller: false,
    isCertified: false,
    tags: ["\u062E\u0627\u0631\u062C\u064A", "\u0646\u0627\u0641\u0630\u0629 \u062C\u0627\u0646\u0628\u064A\u0629", "\u0633\u0646\u062F\u064A\u0627\u0646"],
    weight: "62 \u0643\u062C\u0645",
    warranty: "10 \u0633\u0646\u0648\u0627\u062A"
  },
  {
    sku: "SND-FIR-OAK-008",
    name: "\u0628\u0627\u0628 \u0645\u0642\u0627\u0648\u0645 \u0644\u0644\u062D\u0631\u064A\u0642 60 \u062F\u0642\u064A\u0642\u0629",
    nameEn: "60-Minute Fire Door",
    category: "fire",
    subcategory: "fire",
    woodType: "oak",
    basePrice: 1800,
    distributorPrice: 1440,
    tiers: [
      { min: 1, max: 4, price: 1800, label: "1-4 \u0623\u0628\u0648\u0627\u0628" },
      { min: 5, max: 9, price: 1500, label: "5-9 \u0623\u0628\u0648\u0627\u0628" },
      { min: 10, max: null, price: 1350, label: "10+ \u0623\u0628\u0648\u0627\u0628" }
    ],
    image: MODERN_DOOR,
    images: [MODERN_DOOR, CLASSIC_DOOR, B2B_IMAGE, WORKSHOP_IMAGE],
    sizes: ["90\xD7210", "80\xD7200"],
    colors: ["\u0623\u0628\u064A\u0636", "\u0628\u064A\u062C", "\u0631\u0645\u0627\u062F\u064A"],
    stock: 40,
    badge: "\u0645\u0639\u062A\u0645\u062F",
    badgeColor: "red",
    features: [
      "\u0645\u0642\u0627\u0648\u0645 \u0644\u0644\u062D\u0631\u064A\u0642 60 \u062F\u0642\u064A\u0642\u0629",
      "\u0634\u0647\u0627\u062F\u0629 UL \u0645\u0639\u062A\u0645\u062F\u0629",
      "\u0625\u063A\u0644\u0627\u0642 \u0630\u0627\u062A\u064A",
      "\u0645\u0627\u0646\u0639 \u062F\u062E\u0627\u0646"
    ],
    description: "\u0628\u0627\u0628 \u0645\u0642\u0627\u0648\u0645 \u0644\u0644\u062D\u0631\u064A\u0642 \u0644\u0645\u062F\u0629 60 \u062F\u0642\u064A\u0642\u0629 \u062D\u0627\u0635\u0644 \u0639\u0644\u0649 \u0634\u0647\u0627\u062F\u0629 UL \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629 \u062F\u0648\u0644\u064A\u0627\u064B. \u0645\u0632\u0648\u062F \u0628\u0646\u0638\u0627\u0645 \u0625\u063A\u0644\u0627\u0642 \u0630\u0627\u062A\u064A \u0648\u0645\u0627\u0646\u0639 \u062F\u062E\u0627\u0646. \u0645\u062B\u0627\u0644\u064A \u0644\u0644\u0645\u0628\u0627\u0646\u064A \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0633\u0643\u0646\u064A\u0629 \u0627\u0644\u062A\u064A \u062A\u062A\u0637\u0644\u0628 \u0645\u0639\u0627\u064A\u064A\u0631 \u0627\u0644\u0633\u0644\u0627\u0645\u0629 \u0627\u0644\u0639\u0627\u0644\u064A\u0629.",
    specs: [
      { label: "\u0646\u0648\u0639 \u0627\u0644\u062E\u0634\u0628", value: "\u0633\u0646\u062F\u064A\u0627\u0646 \u0645\u0639 \u062D\u0634\u0648 \u0645\u0642\u0627\u0648\u0645 \u0644\u0644\u062D\u0631\u064A\u0642" },
      { label: "\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u062D\u0631\u064A\u0642", value: "60 \u062F\u0642\u064A\u0642\u0629" },
      { label: "\u0627\u0644\u0634\u0647\u0627\u062F\u0627\u062A", value: "UL, EN 1634-1" },
      { label: "\u0627\u0644\u0633\u0645\u0627\u0643\u0629", value: "50 \u0645\u0645" },
      { label: "\u0627\u0644\u0627\u0631\u062A\u0641\u0627\u0639", value: "210 \u0633\u0645" },
      { label: "\u0627\u0644\u0639\u0631\u0636", value: "90 \u0633\u0645" },
      { label: "\u0627\u0644\u0648\u0632\u0646", value: "45 \u0643\u062C\u0645" },
      { label: "\u0627\u0644\u0625\u063A\u0644\u0627\u0642", value: "\u0630\u0627\u062A\u064A \u0647\u064A\u062F\u0631\u0648\u0644\u064A\u0643\u064A" },
      { label: "\u0645\u0627\u0646\u0639 \u0627\u0644\u062F\u062E\u0627\u0646", value: "\u0646\u0639\u0645 - \u0645\u062F\u0645\u062C" },
      { label: "\u0627\u0644\u0636\u0645\u0627\u0646", value: "10 \u0633\u0646\u0648\u0627\u062A" }
    ],
    dimensions: "210 \xD7 90 \u0633\u0645",
    rating: 4.9,
    reviewCount: 95,
    inStock: true,
    isNew: false,
    isBestseller: false,
    isCertified: true,
    tags: ["\u062D\u0631\u064A\u0642", "\u0645\u0639\u062A\u0645\u062F", "\u0623\u0645\u0627\u0646"],
    weight: "45 \u0643\u062C\u0645",
    warranty: "10 \u0633\u0646\u0648\u0627\u062A"
  },
  {
    sku: "SND-FIR-OAK-009",
    name: "\u0628\u0627\u0628 \u0645\u0642\u0627\u0648\u0645 \u0644\u0644\u062D\u0631\u064A\u0642 90 \u062F\u0642\u064A\u0642\u0629",
    nameEn: "90-Minute Fire Door",
    category: "fire",
    subcategory: "fire",
    woodType: "oak",
    basePrice: 2400,
    distributorPrice: 1920,
    tiers: [
      { min: 1, max: 4, price: 2400, label: "1-4 \u0623\u0628\u0648\u0627\u0628" },
      { min: 5, max: 9, price: 2e3, label: "5-9 \u0623\u0628\u0648\u0627\u0628" },
      { min: 10, max: null, price: 1800, label: "10+ \u0623\u0628\u0648\u0627\u0628" }
    ],
    image: CLASSIC_DOOR,
    images: [CLASSIC_DOOR, MODERN_DOOR, B2B_IMAGE, WORKSHOP_IMAGE],
    sizes: ["90\xD7210", "100\xD7220"],
    colors: ["\u0623\u0628\u064A\u0636", "\u0631\u0645\u0627\u062F\u064A"],
    stock: 22,
    badge: "\u0645\u0639\u062A\u0645\u062F",
    badgeColor: "red",
    features: [
      "\u0645\u0642\u0627\u0648\u0645 \u0644\u0644\u062D\u0631\u064A\u0642 90 \u062F\u0642\u064A\u0642\u0629",
      "\u0634\u0647\u0627\u062F\u0629 ISO \u0645\u0639\u062A\u0645\u062F\u0629",
      "\u0625\u063A\u0644\u0627\u0642 \u0630\u0627\u062A\u064A \u0645\u0632\u062F\u0648\u062C",
      "\u0639\u0632\u0644 \u062D\u0631\u0627\u0631\u064A \u0639\u0627\u0644\u064A"
    ],
    description: "\u0628\u0627\u0628 \u0645\u0642\u0627\u0648\u0645 \u0644\u0644\u062D\u0631\u064A\u0642 \u0644\u0645\u062F\u0629 90 \u062F\u0642\u064A\u0642\u0629 \u0628\u0623\u0639\u0644\u0649 \u0645\u0639\u0627\u064A\u064A\u0631 \u0627\u0644\u0633\u0644\u0627\u0645\u0629. \u062D\u0627\u0635\u0644 \u0639\u0644\u0649 \u0634\u0647\u0627\u062F\u0629 ISO \u0648\u0645\u0632\u0648\u062F \u0628\u0646\u0638\u0627\u0645 \u0625\u063A\u0644\u0627\u0642 \u0630\u0627\u062A\u064A \u0645\u0632\u062F\u0648\u062C \u0648\u0639\u0632\u0644 \u062D\u0631\u0627\u0631\u064A \u0639\u0627\u0644\u064A. \u0627\u0644\u062E\u064A\u0627\u0631 \u0627\u0644\u0623\u0645\u062B\u0644 \u0644\u0644\u0645\u0646\u0634\u0622\u062A \u0627\u0644\u062A\u064A \u062A\u062A\u0637\u0644\u0628 \u0623\u0642\u0635\u0649 \u062F\u0631\u062C\u0627\u062A \u0627\u0644\u062D\u0645\u0627\u064A\u0629.",
    specs: [
      { label: "\u0646\u0648\u0639 \u0627\u0644\u062E\u0634\u0628", value: "\u0633\u0646\u062F\u064A\u0627\u0646 \u0645\u0639 \u062D\u0634\u0648 \u0645\u0642\u0627\u0648\u0645 \u0644\u0644\u062D\u0631\u064A\u0642" },
      { label: "\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u062D\u0631\u064A\u0642", value: "90 \u062F\u0642\u064A\u0642\u0629" },
      { label: "\u0627\u0644\u0634\u0647\u0627\u062F\u0627\u062A", value: "ISO 3008, EN 1634-1" },
      { label: "\u0627\u0644\u0633\u0645\u0627\u0643\u0629", value: "55 \u0645\u0645" },
      { label: "\u0627\u0644\u0627\u0631\u062A\u0641\u0627\u0639", value: "210 \u0633\u0645" },
      { label: "\u0627\u0644\u0639\u0631\u0636", value: "90 \u0633\u0645" },
      { label: "\u0627\u0644\u0648\u0632\u0646", value: "52 \u0643\u062C\u0645" },
      { label: "\u0627\u0644\u0625\u063A\u0644\u0627\u0642", value: "\u0630\u0627\u062A\u064A \u0645\u0632\u062F\u0648\u062C" },
      { label: "\u0627\u0644\u0639\u0632\u0644 \u0627\u0644\u062D\u0631\u0627\u0631\u064A", value: "\u0639\u0627\u0644\u064A" },
      { label: "\u0627\u0644\u0636\u0645\u0627\u0646", value: "10 \u0633\u0646\u0648\u0627\u062A" }
    ],
    dimensions: "210 \xD7 90 \u0633\u0645",
    rating: 4.9,
    reviewCount: 67,
    inStock: true,
    isNew: false,
    isBestseller: false,
    isCertified: true,
    tags: ["\u062D\u0631\u064A\u0642", "\u0645\u0639\u062A\u0645\u062F", "\u0623\u0645\u0627\u0646", "90 \u062F\u0642\u064A\u0642\u0629"],
    weight: "52 \u0643\u062C\u0645",
    warranty: "10 \u0633\u0646\u0648\u0627\u062A"
  },
  {
    sku: "SND-ACO-WAL-010",
    name: "\u0628\u0627\u0628 \u0639\u0627\u0632\u0644 \u0644\u0644\u0635\u0648\u062A - \u062F\u0631\u062C\u0629 \u0627\u062D\u062A\u0631\u0627\u0641\u064A\u0629",
    nameEn: "Professional Acoustic Door",
    category: "acoustic",
    subcategory: "acoustic",
    woodType: "walnut",
    basePrice: 2100,
    distributorPrice: 1680,
    tiers: [
      { min: 1, max: 4, price: 2100, label: "1-4 \u0623\u0628\u0648\u0627\u0628" },
      { min: 5, max: 9, price: 1750, label: "5-9 \u0623\u0628\u0648\u0627\u0628" },
      { min: 10, max: null, price: 1550, label: "10+ \u0623\u0628\u0648\u0627\u0628" }
    ],
    image: MODERN_DOOR,
    images: [MODERN_DOOR, CLASSIC_DOOR, HERO_DOOR, WORKSHOP_IMAGE],
    sizes: ["90\xD7210", "100\xD7210"],
    colors: ["\u062C\u0648\u0632 \u062F\u0627\u0643\u0646", "\u0631\u0645\u0627\u062F\u064A \u0645\u0637\u0641\u064A"],
    stock: 15,
    badge: "\u0627\u062D\u062A\u0631\u0627\u0641\u064A",
    badgeColor: "oak",
    features: [
      "\u0639\u0632\u0644 \u0635\u0648\u062A\u064A 45 \u062F\u064A\u0633\u064A\u0628\u0644",
      "\u0645\u0646\u0627\u0633\u0628 \u0644\u0644\u0627\u0633\u062A\u0648\u062F\u064A\u0648\u0647\u0627\u062A",
      "\u0637\u0628\u0642\u0627\u062A \u0645\u062A\u0639\u062F\u062F\u0629",
      "\u0645\u0627\u0646\u0639 \u0635\u0648\u062A \u0645\u0637\u0627\u0637\u064A"
    ],
    description: "\u0628\u0627\u0628 \u0639\u0627\u0632\u0644 \u0644\u0644\u0635\u0648\u062A \u0628\u062F\u0631\u062C\u0629 \u0627\u062D\u062A\u0631\u0627\u0641\u064A\u0629 \u064A\u0648\u0641\u0631 \u0639\u0632\u0644\u0627\u064B \u0635\u0648\u062A\u064A\u0627\u064B \u064A\u0635\u0644 \u0625\u0644\u0649 45 \u062F\u064A\u0633\u064A\u0628\u0644. \u0645\u0635\u0645\u0645 \u062E\u0635\u064A\u0635\u0627\u064B \u0644\u0644\u0627\u0633\u062A\u0648\u062F\u064A\u0648\u0647\u0627\u062A \u0648\u063A\u0631\u0641 \u0627\u0644\u0627\u062C\u062A\u0645\u0627\u0639\u0627\u062A \u0648\u0627\u0644\u0645\u0643\u0627\u062A\u0628 \u0627\u0644\u062A\u0646\u0641\u064A\u0630\u064A\u0629. \u064A\u062A\u0643\u0648\u0646 \u0645\u0646 \u0637\u0628\u0642\u0627\u062A \u0645\u062A\u0639\u062F\u062F\u0629 \u0645\u0639 \u0645\u0627\u0646\u0639 \u0635\u0648\u062A \u0645\u0637\u0627\u0637\u064A \u0645\u062D\u064A\u0637\u064A.",
    specs: [
      { label: "\u0646\u0648\u0639 \u0627\u0644\u062E\u0634\u0628", value: "\u062C\u0648\u0632 \u0645\u0639 \u062D\u0634\u0648 \u0639\u0627\u0632\u0644" },
      { label: "\u0627\u0644\u0639\u0632\u0644 \u0627\u0644\u0635\u0648\u062A\u064A", value: "45 \u062F\u064A\u0633\u064A\u0628\u0644 (STC 45)" },
      { label: "\u0627\u0644\u0633\u0645\u0627\u0643\u0629", value: "55 \u0645\u0645" },
      { label: "\u0627\u0644\u0627\u0631\u062A\u0641\u0627\u0639", value: "210 \u0633\u0645" },
      { label: "\u0627\u0644\u0639\u0631\u0636", value: "90 \u0633\u0645" },
      { label: "\u0627\u0644\u0648\u0632\u0646", value: "48 \u0643\u062C\u0645" },
      { label: "\u0645\u0627\u0646\u0639 \u0627\u0644\u0635\u0648\u062A", value: "\u0645\u0637\u0627\u0637\u064A \u0645\u062D\u064A\u0637\u064A" },
      { label: "\u0627\u0644\u0637\u0628\u0642\u0627\u062A", value: "5 \u0637\u0628\u0642\u0627\u062A \u0639\u0627\u0632\u0644\u0629" },
      { label: "\u0627\u0644\u0636\u0645\u0627\u0646", value: "10 \u0633\u0646\u0648\u0627\u062A" }
    ],
    dimensions: "210 \xD7 90 \u0633\u0645",
    rating: 4.8,
    reviewCount: 44,
    inStock: true,
    isNew: false,
    isBestseller: false,
    isCertified: false,
    tags: ["\u0639\u0627\u0632\u0644 \u0644\u0644\u0635\u0648\u062A", "\u0627\u0633\u062A\u0648\u062F\u064A\u0648", "\u0627\u062D\u062A\u0631\u0627\u0641\u064A"],
    weight: "48 \u0643\u062C\u0645",
    warranty: "10 \u0633\u0646\u0648\u0627\u062A"
  },
  {
    sku: "SND-ACO-PIN-011",
    name: "\u0628\u0627\u0628 \u0639\u0627\u0632\u0644 \u0644\u0644\u0635\u0648\u062A - \u0644\u0644\u0645\u0646\u0627\u0632\u0644",
    nameEn: "Residential Acoustic Door",
    category: "acoustic",
    subcategory: "acoustic",
    woodType: "pine",
    basePrice: 1550,
    distributorPrice: 1240,
    tiers: [
      { min: 1, max: 4, price: 1550, label: "1-4 \u0623\u0628\u0648\u0627\u0628" },
      { min: 5, max: 9, price: 1280, label: "5-9 \u0623\u0628\u0648\u0627\u0628" },
      { min: 10, max: null, price: 1100, label: "10+ \u0623\u0628\u0648\u0627\u0628" }
    ],
    image: CLASSIC_DOOR,
    images: [CLASSIC_DOOR, MODERN_DOOR, HERO_DOOR, WORKSHOP_IMAGE],
    sizes: ["90\xD7210", "80\xD7200"],
    colors: ["\u0623\u0628\u064A\u0636", "\u0628\u064A\u062C", "\u0631\u0645\u0627\u062F\u064A \u0641\u0627\u062A\u062D"],
    stock: 35,
    badge: "",
    badgeColor: "",
    features: [
      "\u0639\u0632\u0644 \u0635\u0648\u062A\u064A 38 \u062F\u064A\u0633\u064A\u0628\u0644",
      "\u0645\u0646\u0627\u0633\u0628 \u0644\u0644\u063A\u0631\u0641 \u0627\u0644\u0633\u0643\u0646\u064A\u0629",
      "\u062A\u0635\u0645\u064A\u0645 \u0623\u0646\u064A\u0642",
      "\u0633\u0647\u0644 \u0627\u0644\u062A\u0631\u0643\u064A\u0628"
    ],
    description: "\u0628\u0627\u0628 \u0639\u0627\u0632\u0644 \u0644\u0644\u0635\u0648\u062A \u0645\u0635\u0645\u0645 \u0644\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0633\u0643\u0646\u064A \u0628\u0639\u0632\u0644 \u0635\u0648\u062A\u064A 38 \u062F\u064A\u0633\u064A\u0628\u0644. \u064A\u0648\u0641\u0631 \u0627\u0644\u0647\u062F\u0648\u0621 \u0648\u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629 \u0644\u0644\u063A\u0631\u0641 \u0627\u0644\u0633\u0643\u0646\u064A\u0629 \u0628\u062A\u0635\u0645\u064A\u0645 \u0623\u0646\u064A\u0642 \u0648\u0633\u0639\u0631 \u0645\u0646\u0627\u0633\u0628. \u0633\u0647\u0644 \u0627\u0644\u062A\u0631\u0643\u064A\u0628 \u0648\u0645\u062A\u0648\u0641\u0631 \u0628\u0639\u062F\u0629 \u0623\u0644\u0648\u0627\u0646.",
    specs: [
      { label: "\u0646\u0648\u0639 \u0627\u0644\u062E\u0634\u0628", value: "\u0635\u0646\u0648\u0628\u0631 \u0645\u0639 \u062D\u0634\u0648 \u0639\u0627\u0632\u0644" },
      { label: "\u0627\u0644\u0639\u0632\u0644 \u0627\u0644\u0635\u0648\u062A\u064A", value: "38 \u062F\u064A\u0633\u064A\u0628\u0644 (STC 38)" },
      { label: "\u0627\u0644\u0633\u0645\u0627\u0643\u0629", value: "45 \u0645\u0645" },
      { label: "\u0627\u0644\u0627\u0631\u062A\u0641\u0627\u0639", value: "210 \u0633\u0645" },
      { label: "\u0627\u0644\u0639\u0631\u0636", value: "90 \u0633\u0645" },
      { label: "\u0627\u0644\u0648\u0632\u0646", value: "38 \u0643\u062C\u0645" },
      { label: "\u0627\u0644\u0636\u0645\u0627\u0646", value: "8 \u0633\u0646\u0648\u0627\u062A" }
    ],
    dimensions: "210 \xD7 90 \u0633\u0645",
    rating: 4.6,
    reviewCount: 33,
    inStock: true,
    isNew: false,
    isBestseller: false,
    isCertified: false,
    tags: ["\u0639\u0627\u0632\u0644 \u0644\u0644\u0635\u0648\u062A", "\u0633\u0643\u0646\u064A", "\u0635\u0646\u0648\u0628\u0631"],
    weight: "38 \u0643\u062C\u0645",
    warranty: "8 \u0633\u0646\u0648\u0627\u062A"
  },
  {
    sku: "SND-ACC-STL-012",
    name: "\u0637\u0642\u0645 \u0645\u0642\u0627\u0628\u0636 \u0648\u0623\u0642\u0641\u0627\u0644 \u0641\u0627\u062E\u0631\u0629",
    nameEn: "Luxury Hardware Set",
    category: "accessories",
    subcategory: "accessories",
    woodType: "oak",
    basePrice: 380,
    distributorPrice: 304,
    tiers: [
      { min: 1, max: 4, price: 380, label: "1-4 \u0637\u0642\u0645" },
      { min: 5, max: 9, price: 310, label: "5-9 \u0637\u0642\u0645" },
      { min: 10, max: null, price: 270, label: "10+ \u0637\u0642\u0645" }
    ],
    image: MODERN_DOOR,
    images: [MODERN_DOOR, CLASSIC_DOOR, WORKSHOP_IMAGE, B2B_IMAGE],
    sizes: ["\u0642\u064A\u0627\u0633\u064A"],
    colors: ["\u0641\u0636\u064A \u0645\u0635\u0642\u0648\u0644", "\u0630\u0647\u0628\u064A \u0645\u0637\u0641\u064A", "\u0623\u0633\u0648\u062F \u0645\u0637\u0641\u064A"],
    stock: 120,
    badge: "\u0645\u062C\u0645\u0648\u0639\u0629",
    badgeColor: "copper",
    features: ["\u0633\u062A\u0627\u0646\u0644\u0633 \u0633\u062A\u064A\u0644 304", "\u0645\u0642\u0627\u0648\u0645 \u0644\u0644\u0635\u062F\u0623", "\u0636\u0645\u0627\u0646 5 \u0633\u0646\u0648\u0627\u062A", "\u0633\u0647\u0644 \u0627\u0644\u062A\u0631\u0643\u064A\u0628"],
    description: "\u0637\u0642\u0645 \u0645\u0642\u0627\u0628\u0636 \u0648\u0623\u0642\u0641\u0627\u0644 \u0641\u0627\u062E\u0631\u0629 \u0645\u0646 \u0627\u0644\u0633\u062A\u0627\u0646\u0644\u0633 \u0633\u062A\u064A\u0644 304 \u0627\u0644\u0645\u0642\u0627\u0648\u0645 \u0644\u0644\u0635\u062F\u0623. \u064A\u0634\u0645\u0644 \u0627\u0644\u0637\u0642\u0645 \u0645\u0642\u0628\u0636\u060C \u0642\u0641\u0644\u060C \u0648\u0645\u0641\u0635\u0644\u0627\u062A \u0628\u062A\u0635\u0645\u064A\u0645 \u0639\u0635\u0631\u064A \u0623\u0646\u064A\u0642. \u0633\u0647\u0644 \u0627\u0644\u062A\u0631\u0643\u064A\u0628 \u0648\u0645\u062A\u0648\u0627\u0641\u0642 \u0645\u0639 \u062C\u0645\u064A\u0639 \u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0623\u0628\u0648\u0627\u0628.",
    specs: [
      { label: "\u0627\u0644\u0645\u0627\u062F\u0629", value: "\u0633\u062A\u0627\u0646\u0644\u0633 \u0633\u062A\u064A\u0644 304" },
      { label: "\u0627\u0644\u062A\u0634\u0637\u064A\u0628", value: "\u0645\u0635\u0642\u0648\u0644 / \u0645\u0637\u0641\u064A" },
      { label: "\u0645\u062D\u062A\u0648\u064A\u0627\u062A \u0627\u0644\u0637\u0642\u0645", value: "\u0645\u0642\u0628\u0636 + \u0642\u0641\u0644 + \u0645\u0641\u0635\u0644\u0627\u062A" },
      { label: "\u0627\u0644\u062A\u0648\u0627\u0641\u0642", value: "\u062C\u0645\u064A\u0639 \u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0623\u0628\u0648\u0627\u0628" },
      { label: "\u0627\u0644\u0648\u0632\u0646", value: "2.5 \u0643\u062C\u0645" },
      { label: "\u0627\u0644\u0636\u0645\u0627\u0646", value: "5 \u0633\u0646\u0648\u0627\u062A" }
    ],
    dimensions: "\u0645\u062A\u0639\u062F\u062F \u0627\u0644\u0623\u062D\u062C\u0627\u0645",
    rating: 4.7,
    reviewCount: 156,
    inStock: true,
    isNew: false,
    isBestseller: false,
    isCertified: false,
    tags: ["\u0645\u0633\u062A\u0644\u0632\u0645\u0627\u062A", "\u0645\u0642\u0627\u0628\u0636", "\u0623\u0642\u0641\u0627\u0644", "\u0633\u062A\u0627\u0646\u0644\u0633"],
    weight: "2.5 \u0643\u062C\u0645",
    warranty: "5 \u0633\u0646\u0648\u0627\u062A"
  }
];
var ProductCreateInput = z22.object({
  sku: z22.string().min(1),
  name: z22.string().min(1),
  nameEn: z22.string().default(""),
  category: z22.string().min(1),
  subcategory: z22.string().default(""),
  woodType: z22.string().default("oak"),
  basePrice: z22.number().int().min(0),
  distributorPrice: z22.number().int().min(0),
  stock: z22.number().int().min(0).default(0),
  description: z22.string().default(""),
  image: z22.string().default(""),
  sizes: z22.array(z22.string()).default([]),
  colors: z22.array(z22.string()).default([]),
  tiers: z22.any().optional(),
  images: z22.array(z22.string()).optional(),
  badge: z22.string().optional(),
  badgeColor: z22.string().optional(),
  features: z22.array(z22.string()).optional(),
  specs: z22.any().optional(),
  dimensions: z22.string().optional(),
  inStock: z22.boolean().default(true),
  isNew: z22.boolean().default(false),
  isBestseller: z22.boolean().default(false),
  isCertified: z22.boolean().default(false),
  tags: z22.array(z22.string()).optional(),
  weight: z22.string().optional(),
  warranty: z22.string().optional(),
  options: z22.any().optional()
});
var ProductUpdateInput = ProductCreateInput.partial().extend({
  id: z22.number().int()
});
function parseJson(val, fallback) {
  if (val === null || val === void 0) return fallback;
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return val;
}
function mapRow(row) {
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
    tiers: parseJson(row.tiers, []),
    image: row.image,
    images: parseJson(row.images, []),
    sizes: parseJson(row.sizes, []),
    colors: parseJson(row.colors, []),
    stock: row.stock,
    badge: row.badge ?? "",
    badgeColor: row.badgeColor || void 0,
    features: parseJson(row.features, []),
    description: row.description,
    specs: parseJson(row.specs, []),
    dimensions: row.dimensions ?? "",
    rating: row.rating,
    reviewCount: row.reviewCount,
    inStock: row.inStock,
    isNew: row.isNew,
    isBestseller: row.isBestseller,
    isCertified: row.isCertified,
    tags: parseJson(row.tags, []),
    weight: row.weight ?? "",
    warranty: row.warranty ?? "",
    options: parseJson(row.options, void 0),
    reviews: [],
    // reviews are static, not stored in DB
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}
var productsRouter = router({
  // ── Public: list all active products ──────────────────────────────────────
  list: publicProcedure.query(async () => {
    const rows = await db.select().from(schema_exports.products).where(eq23(schema_exports.products.status, "active")).orderBy(asc(schema_exports.products.id));
    return rows.map(mapRow);
  }),
  // ── Public: get single product by numeric ID or SKU ───────────────────────
  getById: publicProcedure.input(z22.object({ id: z22.string() })).query(async ({ input }) => {
    const numericId = parseInt(input.id, 10);
    const rows = isNaN(numericId) ? await db.select().from(schema_exports.products).where(eq23(schema_exports.products.sku, input.id)) : await db.select().from(schema_exports.products).where(eq23(schema_exports.products.id, numericId));
    if (!rows.length) return null;
    return mapRow(rows[0]);
  }),
  // ── Admin: list all products (active + archived) ──────────────────────────
  adminList: adminProcedure.query(async () => {
    const rows = await db.select().from(schema_exports.products).orderBy(desc18(schema_exports.products.updatedAt));
    return rows.map(mapRow);
  }),
  // ── Admin: create product ─────────────────────────────────────────────────
  create: adminProcedure.input(ProductCreateInput).mutation(async ({ input }) => {
    const now = Date.now();
    const tiers = input.tiers ?? [
      { min: 1, max: 4, price: input.basePrice, label: "1-4 \u0642\u0637\u0639\u0629" },
      {
        min: 5,
        max: 9,
        price: Math.round(input.basePrice * 0.85),
        label: "5-9 \u0642\u0637\u0639\u0629"
      },
      {
        min: 10,
        max: null,
        price: Math.round(input.basePrice * 0.75),
        label: "10+ \u0642\u0637\u0639\u0629"
      }
    ];
    const [result] = await db.insert(schema_exports.products).values({
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
      updatedAt: now
    });
    const id = result.insertId;
    const [row] = await db.select().from(schema_exports.products).where(eq23(schema_exports.products.id, id));
    return mapRow(row);
  }),
  // ── Admin: update product ─────────────────────────────────────────────────
  update: adminProcedure.input(ProductUpdateInput).mutation(async ({ input }) => {
    const { id, ...rest } = input;
    const now = Date.now();
    const updateData = { updatedAt: now };
    if (rest.name !== void 0) updateData.name = rest.name;
    if (rest.nameEn !== void 0) updateData.nameEn = rest.nameEn;
    if (rest.category !== void 0) {
      updateData.category = rest.category;
      updateData.subcategory = rest.subcategory || rest.category;
    }
    if (rest.subcategory !== void 0)
      updateData.subcategory = rest.subcategory;
    if (rest.woodType !== void 0) updateData.woodType = rest.woodType;
    if (rest.basePrice !== void 0) {
      updateData.basePrice = rest.basePrice;
      if (rest.tiers === void 0) {
        const [existing] = await db.select().from(schema_exports.products).where(eq23(schema_exports.products.id, id));
        if (existing) {
          const oldTiers = parseJson(existing.tiers, []);
          const oldBase = existing.basePrice || rest.basePrice;
          const ratio = rest.basePrice / oldBase;
          if (oldTiers.length > 0) {
            updateData.tiers = oldTiers.map((t3) => ({
              ...t3,
              price: Math.round(t3.price * ratio)
            }));
          } else {
            updateData.tiers = [
              {
                min: 1,
                max: null,
                price: rest.basePrice,
                label: "\u0633\u0639\u0631 \u0627\u0644\u0648\u062D\u062F\u0629"
              }
            ];
          }
        }
      }
    }
    if (rest.distributorPrice !== void 0)
      updateData.distributorPrice = rest.distributorPrice;
    if (rest.tiers !== void 0) updateData.tiers = rest.tiers;
    if (rest.image !== void 0) updateData.image = rest.image;
    if (rest.images !== void 0) updateData.images = rest.images;
    if (rest.sizes !== void 0) updateData.sizes = rest.sizes;
    if (rest.colors !== void 0) updateData.colors = rest.colors;
    if (rest.stock !== void 0) {
      updateData.stock = rest.stock;
      updateData.inStock = rest.stock > 0;
    }
    if (rest.badge !== void 0) updateData.badge = rest.badge;
    if (rest.badgeColor !== void 0)
      updateData.badgeColor = rest.badgeColor;
    if (rest.features !== void 0) updateData.features = rest.features;
    if (rest.description !== void 0)
      updateData.description = rest.description;
    if (rest.specs !== void 0) updateData.specs = rest.specs;
    if (rest.dimensions !== void 0)
      updateData.dimensions = rest.dimensions;
    if (rest.isNew !== void 0) updateData.isNew = rest.isNew;
    if (rest.isBestseller !== void 0)
      updateData.isBestseller = rest.isBestseller;
    if (rest.isCertified !== void 0)
      updateData.isCertified = rest.isCertified;
    if (rest.tags !== void 0) updateData.tags = rest.tags;
    if (rest.weight !== void 0) updateData.weight = rest.weight;
    if (rest.warranty !== void 0) updateData.warranty = rest.warranty;
    if (rest.options !== void 0) updateData.options = rest.options;
    await db.update(schema_exports.products).set(updateData).where(eq23(schema_exports.products.id, id));
    const [row] = await db.select().from(schema_exports.products).where(eq23(schema_exports.products.id, id));
    return mapRow(row);
  }),
  // ── Admin: update status (archive / activate) ─────────────────────────────
  updateStatus: adminProcedure.input(
    z22.object({ id: z22.number().int(), status: z22.enum(["active", "archived"]) })
  ).mutation(async ({ input }) => {
    await db.update(schema_exports.products).set({ status: input.status, updatedAt: Date.now() }).where(eq23(schema_exports.products.id, input.id));
    return { success: true };
  }),
  // ── Admin: duplicate product ───────────────────────────────────────────────
  duplicate: adminProcedure.input(
    z22.object({
      id: z22.number().int(),
      name: z22.string().min(1),
      sku: z22.string().min(1)
    })
  ).mutation(async ({ input }) => {
    const [src] = await db.select().from(schema_exports.products).where(eq23(schema_exports.products.id, input.id));
    if (!src) throw new Error("Product not found");
    const now = Date.now();
    const [result] = await db.insert(schema_exports.products).values({
      ...src,
      id: void 0,
      sku: input.sku,
      name: input.name,
      nameEn: `Copy of ${src.nameEn || src.name}`,
      status: "active",
      stock: 0,
      inStock: false,
      createdAt: now,
      updatedAt: now
    });
    const newId = result.insertId;
    const [row] = await db.select().from(schema_exports.products).where(eq23(schema_exports.products.id, newId));
    return mapRow(row);
  }),
  // ── Admin: seed 12 products from static data ──────────────────────────────
  seed: adminProcedure.mutation(async () => {
    const existing = await db.select({ sku: schema_exports.products.sku }).from(schema_exports.products);
    const existingSkus = new Set(existing.map((r) => r.sku));
    let inserted = 0;
    const now = Date.now();
    for (const p of SEED_PRODUCTS) {
      if (existingSkus.has(p.sku)) continue;
      await db.insert(schema_exports.products).values({
        sku: p.sku,
        name: p.name,
        nameEn: p.nameEn,
        category: p.category,
        subcategory: p.subcategory,
        woodType: p.woodType,
        status: "active",
        basePrice: p.basePrice,
        distributorPrice: p.distributorPrice,
        tiers: p.tiers,
        image: p.image,
        images: p.images,
        sizes: p.sizes,
        colors: p.colors,
        stock: p.stock,
        badge: p.badge,
        badgeColor: p.badgeColor,
        features: p.features,
        description: p.description,
        specs: p.specs,
        dimensions: p.dimensions,
        rating: p.rating,
        reviewCount: p.reviewCount,
        inStock: p.inStock,
        isNew: p.isNew,
        isBestseller: p.isBestseller,
        isCertified: p.isCertified,
        tags: p.tags,
        weight: p.weight,
        warranty: p.warranty,
        options: null,
        createdAt: now,
        updatedAt: now
      });
      inserted++;
    }
    return { inserted, skipped: SEED_PRODUCTS.length - inserted };
  })
});

// server/production.router.ts
import { z as z23 } from "zod/v4";
import { eq as eq24, desc as desc19 } from "drizzle-orm";
var DEFAULT_LINES = [
  {
    lineId: "door_line",
    nameAr: "\u062E\u0637 \u0627\u0644\u0623\u0628\u0648\u0627\u0628",
    nameEn: "Door Line",
    dailyCapacity: 30
  },
  {
    lineId: "frame_line",
    nameAr: "\u062E\u0637 \u0627\u0644\u0625\u0637\u0627\u0631\u0627\u062A",
    nameEn: "Frame Line",
    dailyCapacity: 40
  },
  {
    lineId: "accessories",
    nameAr: "\u0642\u0633\u0645 \u0627\u0644\u0625\u0643\u0633\u0633\u0648\u0627\u0631\u0627\u062A",
    nameEn: "Accessories",
    dailyCapacity: 60
  },
  {
    lineId: "qc",
    nameAr: "\u0636\u0628\u0637 \u0627\u0644\u062C\u0648\u062F\u0629",
    nameEn: "Quality Control",
    dailyCapacity: 50
  },
  {
    lineId: "packing",
    nameAr: "\u0627\u0644\u062A\u063A\u0644\u064A\u0641",
    nameEn: "Packing",
    dailyCapacity: 35
  }
];
var productionRouter = router({
  // ── جلب إعدادات الطاقة لجميع الخطوط ────────────────────────
  getCapacity: adminProcedure.query(async () => {
    const rows = await db.query.productionLines.findMany();
    if (rows.length === 0) {
      return DEFAULT_LINES.map((l) => ({
        ...l,
        id: 0,
        workDaysPerWeek: 6,
        shiftHours: 8,
        isActive: true,
        notes: null,
        updatedAt: Date.now()
      }));
    }
    return rows;
  }),
  // ── تحديث طاقة خط معين ──────────────────────────────────────
  upsertLine: adminProcedure.input(
    z23.object({
      lineId: z23.string().min(1),
      nameAr: z23.string().min(1),
      nameEn: z23.string().default(""),
      dailyCapacity: z23.number().int().min(1).max(999),
      workDaysPerWeek: z23.number().int().min(1).max(7).default(6),
      shiftHours: z23.number().int().min(1).max(24).default(8),
      isActive: z23.boolean().default(true),
      notes: z23.string().optional()
    })
  ).mutation(async ({ input }) => {
    const now = Date.now();
    const existing = await db.query.productionLines.findFirst({
      where: eq24(schema_exports.productionLines.lineId, input.lineId)
    });
    if (existing) {
      await db.update(schema_exports.productionLines).set({ ...input, notes: input.notes ?? null, updatedAt: now }).where(eq24(schema_exports.productionLines.lineId, input.lineId));
    } else {
      await db.insert(schema_exports.productionLines).values({
        ...input,
        notes: input.notes ?? null,
        updatedAt: now
      });
    }
    return { success: true };
  }),
  // ── حساب موعد التسليم المتوقع ────────────────────────────────
  // الأداة الرئيسية: بناءً على عدد الأبواب والأولوية والطاقة المتاحة
  estimateDelivery: adminProcedure.input(
    z23.object({
      totalDoors: z23.number().int().min(1),
      priority: z23.enum(["normal", "urgent", "vip"]).default("normal"),
      startDate: z23.string().optional()
      // YYYY-MM-DD، الافتراضي اليوم
    })
  ).query(async ({ input }) => {
    const lines = await db.query.productionLines.findMany();
    const getCapacity = (lineId) => {
      const row = lines.find((l) => l.lineId === lineId);
      if (row) return row.isActive ? row.dailyCapacity : 0;
      const def = DEFAULT_LINES.find((l) => l.lineId === lineId);
      return def ? def.dailyCapacity : 20;
    };
    const activeOrders = await db.query.workOrders.findMany();
    const inProgressOrders = activeOrders.filter(
      (o) => o.status === "in_progress" || o.status === "issued"
    );
    const lineLoad = {};
    for (const wo of inProgressOrders) {
      const tasks = Array.isArray(wo.deptTasks) ? wo.deptTasks : [];
      for (const t3 of tasks) {
        if (t3.deptId) {
          lineLoad[t3.deptId] = (lineLoad[t3.deptId] ?? 0) + (t3.quantity - t3.completedQty);
        }
      }
    }
    const priorityFactor = input.priority === "vip" ? 1.5 : input.priority === "urgent" ? 1.25 : 1;
    const stages = [
      "door_line",
      "frame_line",
      "accessories",
      "qc",
      "packing"
    ];
    const bottlenecks = [];
    for (const lineId of stages) {
      const cap = getCapacity(lineId) * priorityFactor;
      if (cap <= 0) continue;
      const currentLoad = lineLoad[lineId] ?? 0;
      const totalUnits = currentLoad + input.totalDoors;
      const daysNeeded = Math.ceil(totalUnits / cap);
      const lineMeta = DEFAULT_LINES.find((l) => l.lineId === lineId);
      bottlenecks.push({
        lineId,
        nameAr: lineMeta?.nameAr ?? lineId,
        daysNeeded
      });
    }
    const maxDays = Math.max(...bottlenecks.map((b) => b.daysNeeded), 1);
    const bottleneck = bottlenecks.find((b) => b.daysNeeded === maxDays);
    const start = input.startDate ? new Date(input.startDate) : /* @__PURE__ */ new Date();
    let workDays = 0;
    const cursor = new Date(start);
    while (workDays < maxDays) {
      cursor.setDate(cursor.getDate() + 1);
      if (cursor.getDay() !== 5) workDays++;
    }
    return {
      totalDoors: input.totalDoors,
      priority: input.priority,
      estimatedWorkDays: maxDays,
      estimatedDeliveryDate: cursor.toISOString().split("T")[0],
      bottleneck: bottleneck ?? null,
      lineBreakdown: bottlenecks
    };
  }),
  // ── بيانات مخطط غانت ──────────────────────────────────────
  ganttData: adminProcedure.query(async () => {
    const orders = await db.query.workOrders.findMany({
      orderBy: [desc19(schema_exports.workOrders.issuedAt)]
    });
    const relevant = orders.filter((o) => o.status !== "cancelled" && o.status !== "completed").slice(0, 30);
    const today = /* @__PURE__ */ new Date();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() - 14);
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 60);
    return {
      orders: relevant.map((o) => ({
        id: o.id,
        woNumber: o.woNumber,
        distributorName: o.distributorName,
        startDate: o.startDate,
        dueDate: o.dueDate,
        status: o.status,
        priority: o.priority,
        progressPercent: o.progressPercent,
        totalDoors: o.totalDoors,
        deptTasks: o.deptTasks
      })),
      chartRange: {
        from: minDate.toISOString().split("T")[0],
        to: maxDate.toISOString().split("T")[0]
      }
    };
  }),
  // ── ملخص الإنتاج (KPIs) ─────────────────────────────────────
  summary: adminProcedure.query(async () => {
    const orders = await db.query.workOrders.findMany();
    const active = orders.filter((o) => o.status === "in_progress");
    const issued = orders.filter((o) => o.status === "issued");
    const onHold = orders.filter((o) => o.status === "on_hold");
    const completed = orders.filter((o) => o.status === "completed");
    const overdue = orders.filter((o) => {
      if (o.status === "completed" || o.status === "cancelled") return false;
      return new Date(o.dueDate) < /* @__PURE__ */ new Date();
    });
    const totalDoorsInProduction = active.reduce((s, o) => s + o.totalDoors, 0);
    const avgProgress = active.length > 0 ? Math.round(
      active.reduce((s, o) => s + o.progressPercent, 0) / active.length
    ) : 0;
    const lineLoad = {};
    for (const o of active) {
      const tasks = Array.isArray(o.deptTasks) ? o.deptTasks : [];
      for (const t3 of tasks) {
        if (t3.deptId && t3.status !== "completed") {
          lineLoad[t3.deptId] = (lineLoad[t3.deptId] ?? 0) + (t3.quantity - (t3.completedQty ?? 0));
        }
      }
    }
    return {
      activeOrders: active.length,
      issuedOrders: issued.length,
      onHoldOrders: onHold.length,
      completedOrders: completed.length,
      overdueOrders: overdue.length,
      totalDoorsInProduction,
      avgProgress,
      lineLoad
    };
  })
});

// server/analytics.router.ts
import { z as z24 } from "zod/v4";
import { and as and12, gte as gte3, lte as lte3 } from "drizzle-orm";
var halalaToRiyals = (h) => Math.round(h / 100);
function tsToYM(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function dateToYM(dateStr) {
  return dateStr.slice(0, 7);
}
function ymToQuarter(ym) {
  const [y, m] = ym.split("-").map(Number);
  const q = Math.ceil(m / 3);
  return `${y}-Q${q}`;
}
var MONTH_AR = [
  "\u064A\u0646\u0627\u064A\u0631",
  "\u0641\u0628\u0631\u0627\u064A\u0631",
  "\u0645\u0627\u0631\u0633",
  "\u0623\u0628\u0631\u064A\u0644",
  "\u0645\u0627\u064A\u0648",
  "\u064A\u0648\u0646\u064A\u0648",
  "\u064A\u0648\u0644\u064A\u0648",
  "\u0623\u063A\u0633\u0637\u0633",
  "\u0633\u0628\u062A\u0645\u0628\u0631",
  "\u0623\u0643\u062A\u0648\u0628\u0631",
  "\u0646\u0648\u0641\u0645\u0628\u0631",
  "\u062F\u064A\u0633\u0645\u0628\u0631"
];
function ymToLabel(ym) {
  const [, m] = ym.split("-").map(Number);
  return MONTH_AR[(m - 1) % 12] ?? ym;
}
var analyticsRouter = router({
  // ── 1. مؤشرات KPI الرئيسية ─────────────────────────────────────────────────
  kpis: adminProcedure.query(async () => {
    const [invoices, distOrders, workOrders2, doorOrders2, purchaseInvs, rfqs2] = await Promise.all([
      db.query.taxInvoices.findMany({
        columns: {
          subtotalHalala: true,
          vatAmountHalala: true,
          totalHalala: true,
          status: true,
          paymentStatus: true,
          issueDate: true
        }
      }),
      db.query.distributorOrders.findMany({
        columns: { totalAmount: true, status: true, createdAt: true }
      }),
      db.query.workOrders.findMany({
        columns: {
          status: true,
          dueDate: true,
          updatedAt: true,
          totalDoors: true
        }
      }),
      db.query.doorOrders.findMany({
        columns: { status: true, totalPrice: true, createdAt: true }
      }),
      db.query.purchaseInvoices.findMany({
        columns: { totalHalala: true, paymentStatus: true }
      }),
      db.query.rfqs.findMany({
        columns: { id: true, status: true }
      })
    ]);
    const issuedInvs = invoices.filter((i) => i.status !== "cancelled");
    const totalRevenueRiyals = halalaToRiyals(
      issuedInvs.reduce((s, i) => s + i.subtotalHalala, 0)
    );
    const totalVatRiyals = halalaToRiyals(
      issuedInvs.reduce((s, i) => s + i.vatAmountHalala, 0)
    );
    const paidRevenueRiyals = halalaToRiyals(
      issuedInvs.filter((i) => i.paymentStatus === "paid").reduce((s, i) => s + i.totalHalala, 0)
    );
    const distRevenue = distOrders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + (o.totalAmount ?? 0), 0);
    const totalPurchasesRiyals = halalaToRiyals(
      purchaseInvs.reduce((s, p) => s + p.totalHalala, 0)
    );
    const grossMarginRiyals = totalRevenueRiyals - totalPurchasesRiyals;
    const completedWOs = workOrders2.filter((w) => w.status === "completed");
    let onTimeCount = 0;
    for (const wo of completedWOs) {
      const dueTs = (/* @__PURE__ */ new Date(wo.dueDate + "T23:59:59")).getTime();
      if (wo.updatedAt <= dueTs) onTimeCount++;
    }
    const onTimePct = completedWOs.length > 0 ? Math.round(onTimeCount / completedWOs.length * 100) : null;
    const totalDoorsProduced = workOrders2.filter((w) => w.status === "completed" || w.status === "in_progress").reduce((s, w) => s + (w.totalDoors ?? 0), 0);
    const retailRevenue = doorOrders2.filter((o) => o.status !== "cancelled").reduce((s, o) => s + (o.totalPrice ?? 0), 0);
    return {
      totalRevenueRiyals,
      totalVatRiyals,
      paidRevenueRiyals,
      distRevenueRiyals: Math.round(distRevenue),
      retailRevenueRiyals: Math.round(retailRevenue),
      totalPurchasesRiyals,
      grossMarginRiyals,
      grossMarginPct: totalRevenueRiyals > 0 ? Math.round(grossMarginRiyals / totalRevenueRiyals * 100) : 0,
      totalInvoices: issuedInvs.length,
      completedWorkOrders: completedWOs.length,
      onTimePct,
      onTimeCount,
      totalDoorsProduced,
      openRfqs: rfqs2.filter(
        (r) => r.status === "published" || r.status === "evaluated"
      ).length
    };
  }),
  // ── 2. اتجاه الإيرادات — آخر 12 شهراً ──────────────────────────────────────
  revenueTrend: adminProcedure.input(z24.object({ months: z24.number().int().min(3).max(24).default(12) })).query(async ({ input }) => {
    const [invoices, distOrders, doorOrders2] = await Promise.all([
      db.query.taxInvoices.findMany({
        columns: { subtotalHalala: true, status: true, issueDate: true }
      }),
      db.query.distributorOrders.findMany({
        columns: { totalAmount: true, status: true, createdAt: true }
      }),
      db.query.doorOrders.findMany({
        columns: { totalPrice: true, status: true, createdAt: true }
      })
    ]);
    const now = /* @__PURE__ */ new Date();
    const months = [];
    for (let i = input.months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      );
    }
    const invByMonth = {};
    for (const inv of invoices.filter((i) => i.status !== "cancelled")) {
      const ym = dateToYM(inv.issueDate);
      invByMonth[ym] = (invByMonth[ym] ?? 0) + halalaToRiyals(inv.subtotalHalala);
    }
    const distByMonth = {};
    for (const o of distOrders.filter((o2) => o2.status !== "cancelled")) {
      const ym = tsToYM(o.createdAt);
      distByMonth[ym] = (distByMonth[ym] ?? 0) + (o.totalAmount ?? 0);
    }
    const retailByMonth = {};
    for (const o of doorOrders2.filter((o2) => o2.status !== "cancelled")) {
      const ym = tsToYM(o.createdAt);
      retailByMonth[ym] = (retailByMonth[ym] ?? 0) + (o.totalPrice ?? 0);
    }
    return months.map((ym) => ({
      ym,
      label: ymToLabel(ym),
      invoicesRevenue: invByMonth[ym] ?? 0,
      distRevenue: Math.round(distByMonth[ym] ?? 0),
      retailRevenue: Math.round(retailByMonth[ym] ?? 0),
      total: (invByMonth[ym] ?? 0) + Math.round(distByMonth[ym] ?? 0) + Math.round(retailByMonth[ym] ?? 0)
    }));
  }),
  // ── 3. تقارير المبيعات حسب الفترة ──────────────────────────────────────────
  salesByPeriod: adminProcedure.input(
    z24.object({
      period: z24.enum(["monthly", "quarterly", "yearly"]).default("monthly"),
      year: z24.number().int().min(2020).max(2030).default((/* @__PURE__ */ new Date()).getFullYear())
    })
  ).query(async ({ input }) => {
    const [invoices, distOrders] = await Promise.all([
      db.query.taxInvoices.findMany({
        columns: {
          subtotalHalala: true,
          vatAmountHalala: true,
          totalHalala: true,
          status: true,
          paymentStatus: true,
          issueDate: true
        }
      }),
      db.query.distributorOrders.findMany({
        columns: { totalAmount: true, status: true, createdAt: true }
      })
    ]);
    const buckets = {};
    const ensureBucket = (key, label) => {
      if (!buckets[key]) {
        buckets[key] = {
          key,
          label,
          invoiceRevenue: 0,
          distRevenue: 0,
          invoiceCount: 0,
          vatAmount: 0
        };
      }
      return buckets[key];
    };
    for (const inv of invoices.filter((i) => i.status !== "cancelled")) {
      const ym = dateToYM(inv.issueDate);
      const invYear = Number(ym.slice(0, 4));
      if (input.period === "yearly") {
        const b = ensureBucket(String(invYear), String(invYear));
        b.invoiceRevenue += halalaToRiyals(inv.subtotalHalala);
        b.vatAmount += halalaToRiyals(inv.vatAmountHalala);
        b.invoiceCount++;
      } else if (input.period === "quarterly") {
        const qKey = ymToQuarter(ym);
        const qYear = Number(qKey.slice(0, 4));
        if (qYear !== input.year) continue;
        const b = ensureBucket(qKey, qKey.replace("-", " "));
        b.invoiceRevenue += halalaToRiyals(inv.subtotalHalala);
        b.vatAmount += halalaToRiyals(inv.vatAmountHalala);
        b.invoiceCount++;
      } else {
        if (invYear !== input.year) continue;
        const b = ensureBucket(ym, ymToLabel(ym));
        b.invoiceRevenue += halalaToRiyals(inv.subtotalHalala);
        b.vatAmount += halalaToRiyals(inv.vatAmountHalala);
        b.invoiceCount++;
      }
    }
    for (const o of distOrders.filter((o2) => o2.status !== "cancelled")) {
      const ym = tsToYM(o.createdAt);
      const oYear = Number(ym.slice(0, 4));
      if (input.period === "yearly") {
        ensureBucket(String(oYear), String(oYear)).distRevenue += Math.round(
          o.totalAmount ?? 0
        );
      } else if (input.period === "quarterly") {
        const qKey = ymToQuarter(ym);
        const qYear = Number(qKey.slice(0, 4));
        if (qYear !== input.year) continue;
        ensureBucket(qKey, qKey.replace("-", " ")).distRevenue += Math.round(
          o.totalAmount ?? 0
        );
      } else {
        if (oYear !== input.year) continue;
        ensureBucket(ym, ymToLabel(ym)).distRevenue += Math.round(
          o.totalAmount ?? 0
        );
      }
    }
    const sorted = Object.values(buckets).sort((a, b) => a.key.localeCompare(b.key)).map((b) => ({
      ...b,
      total: b.invoiceRevenue + b.distRevenue
    }));
    const grandTotal = sorted.reduce((s, b) => s + b.total, 0);
    const grandInvRevenue = sorted.reduce((s, b) => s + b.invoiceRevenue, 0);
    const grandDistRevenue = sorted.reduce((s, b) => s + b.distRevenue, 0);
    const grandVat = sorted.reduce((s, b) => s + b.vatAmount, 0);
    const grandInvoiceCount = sorted.reduce((s, b) => s + b.invoiceCount, 0);
    return {
      period: input.period,
      year: input.year,
      data: sorted,
      totals: {
        total: grandTotal,
        invoiceRevenue: grandInvRevenue,
        distRevenue: grandDistRevenue,
        vatAmount: grandVat,
        invoiceCount: grandInvoiceCount
      }
    };
  }),
  // ── 4. أداء الموردين ─────────────────────────────────────────────────────────
  supplierPerformance: adminProcedure.query(async () => {
    const [purchaseInvs, supplierQuotes2, rfqInvitations2] = await Promise.all([
      db.query.purchaseInvoices.findMany({
        columns: {
          supplierName: true,
          totalHalala: true,
          vatAmountHalala: true,
          paymentStatus: true,
          category: true,
          issueDate: true
        }
      }),
      db.query.supplierQuotes.findMany({
        columns: {
          supplierId: true,
          rfqId: true,
          totalPrice: true,
          status: true
        }
      }),
      db.query.rfqInvitations.findMany({
        columns: { supplierId: true, status: true }
      })
    ]);
    const supplierMap = {};
    for (const inv of purchaseInvs) {
      const key = inv.supplierName;
      if (!supplierMap[key]) {
        supplierMap[key] = {
          supplierName: key,
          invoiceCount: 0,
          totalSpentRiyals: 0,
          vatRiyals: 0,
          paidCount: 0,
          categories: /* @__PURE__ */ new Set(),
          latestDate: ""
        };
      }
      const s = supplierMap[key];
      s.invoiceCount++;
      s.totalSpentRiyals += halalaToRiyals(inv.totalHalala);
      s.vatRiyals += halalaToRiyals(inv.vatAmountHalala);
      if (inv.paymentStatus === "paid") s.paidCount++;
      if (inv.category) s.categories.add(inv.category);
      if (inv.issueDate > s.latestDate) s.latestDate = inv.issueDate;
    }
    const sorted = Object.values(supplierMap).sort((a, b) => b.totalSpentRiyals - a.totalSpentRiyals).map((s) => ({
      supplierName: s.supplierName,
      invoiceCount: s.invoiceCount,
      totalSpentRiyals: s.totalSpentRiyals,
      avgPerInvoiceRiyals: s.invoiceCount > 0 ? Math.round(s.totalSpentRiyals / s.invoiceCount) : 0,
      vatRiyals: s.vatRiyals,
      paidCount: s.paidCount,
      unpaidCount: s.invoiceCount - s.paidCount,
      categories: Array.from(s.categories),
      latestDate: s.latestDate,
      paymentRate: s.invoiceCount > 0 ? Math.round(s.paidCount / s.invoiceCount * 100) : 0
    }));
    const categoryMap = {};
    for (const inv of purchaseInvs) {
      const cat = inv.category ?? "other";
      categoryMap[cat] = (categoryMap[cat] ?? 0) + halalaToRiyals(inv.totalHalala);
    }
    const categoryBreakdown = Object.entries(categoryMap).map(([category, amountRiyals]) => ({ category, amountRiyals })).sort((a, b) => b.amountRiyals - a.amountRiyals);
    return {
      suppliers: sorted.slice(0, 20),
      // أكثر 20 مورداً
      totalSuppliers: sorted.length,
      categoryBreakdown
    };
  }),
  // ── 5. نسبة الالتزام بالمواعيد (On-Time Delivery) ───────────────────────────
  onTimeDelivery: adminProcedure.input(z24.object({ months: z24.number().int().min(1).max(24).default(12) })).query(async ({ input }) => {
    const cutoff = Date.now() - input.months * 30 * 24 * 36e5;
    const workOrders2 = await db.query.workOrders.findMany({
      columns: {
        status: true,
        dueDate: true,
        updatedAt: true,
        priority: true,
        totalDoors: true,
        distributorName: true
      }
    });
    const recent = workOrders2.filter((w) => w.updatedAt >= cutoff);
    const completed = recent.filter((w) => w.status === "completed");
    const onTime = [];
    const late = [];
    for (const wo of completed) {
      const dueTs = (/* @__PURE__ */ new Date(wo.dueDate + "T23:59:59")).getTime();
      if (wo.updatedAt <= dueTs) onTime.push(wo);
      else late.push(wo);
    }
    const onTimePct = completed.length > 0 ? Math.round(onTime.length / completed.length * 100) : null;
    const byPriority = ["vip", "urgent", "normal"].map((p) => {
      const pOrders = completed.filter((w) => w.priority === p);
      const pOnTime = pOrders.filter((w) => {
        const dueTs = (/* @__PURE__ */ new Date(w.dueDate + "T23:59:59")).getTime();
        return w.updatedAt <= dueTs;
      });
      return {
        priority: p,
        total: pOrders.length,
        onTime: pOnTime.length,
        pct: pOrders.length > 0 ? Math.round(pOnTime.length / pOrders.length * 100) : null
      };
    });
    const now = /* @__PURE__ */ new Date();
    const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthStart = d.getTime();
      const monthEnd = new Date(
        d.getFullYear(),
        d.getMonth() + 1,
        0,
        23,
        59,
        59
      ).getTime();
      const mCompleted = completed.filter(
        (w) => w.updatedAt >= monthStart && w.updatedAt <= monthEnd
      );
      const mOnTime = mCompleted.filter((w) => {
        const dueTs = (/* @__PURE__ */ new Date(w.dueDate + "T23:59:59")).getTime();
        return w.updatedAt <= dueTs;
      });
      return {
        ym,
        label: ymToLabel(ym),
        completed: mCompleted.length,
        onTime: mOnTime.length,
        pct: mCompleted.length > 0 ? Math.round(mOnTime.length / mCompleted.length * 100) : null
      };
    });
    const currentlyOverdue = workOrders2.filter((w) => {
      if (w.status === "completed" || w.status === "cancelled") return false;
      return new Date(w.dueDate) < /* @__PURE__ */ new Date();
    });
    return {
      totalCompleted: completed.length,
      onTimeCount: onTime.length,
      lateCount: late.length,
      onTimePct,
      byPriority,
      monthlyTrend,
      currentlyOverdue: currentlyOverdue.map((w) => ({
        distributorName: w.distributorName,
        dueDate: w.dueDate,
        daysLate: Math.ceil(
          (Date.now() - new Date(w.dueDate).getTime()) / 864e5
        ),
        priority: w.priority,
        totalDoors: w.totalDoors
      }))
    };
  }),
  // ── 6. مقارنة الإيرادات والمصروفات (P&L Overview) ───────────────────────────
  profitLoss: adminProcedure.input(
    z24.object({
      startDate: z24.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z24.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    })
  ).query(async ({ input }) => {
    const [invoices, purchases] = await Promise.all([
      db.query.taxInvoices.findMany({
        where: (t3) => and12(
          gte3(t3.issueDate, input.startDate),
          lte3(t3.issueDate, input.endDate)
        ),
        columns: {
          subtotalHalala: true,
          vatAmountHalala: true,
          totalHalala: true,
          status: true,
          paymentStatus: true,
          invoiceType: true
        }
      }),
      db.query.purchaseInvoices.findMany({
        columns: {
          subtotalHalala: true,
          totalHalala: true,
          category: true,
          paymentStatus: true,
          issueDate: true
        }
      })
    ]);
    const filteredPurchases = purchases.filter(
      (p) => p.issueDate >= input.startDate && p.issueDate <= input.endDate
    );
    const issued = invoices.filter((i) => i.status !== "cancelled");
    const totalRevenueHalala = issued.reduce(
      (s, i) => s + i.subtotalHalala,
      0
    );
    const totalVatOutHalala = issued.reduce(
      (s, i) => s + i.vatAmountHalala,
      0
    );
    const totalCostHalala = filteredPurchases.reduce(
      (s, p) => s + p.subtotalHalala,
      0
    );
    const totalVatInHalala = filteredPurchases.reduce(
      (s, p) => s + (p.totalHalala - p.subtotalHalala),
      0
    );
    const grossProfitHalala = totalRevenueHalala - totalCostHalala;
    const netVatHalala = totalVatOutHalala - totalVatInHalala;
    const costByCategory = {};
    for (const p of filteredPurchases) {
      const cat = p.category ?? "other";
      costByCategory[cat] = (costByCategory[cat] ?? 0) + halalaToRiyals(p.subtotalHalala);
    }
    return {
      period: { startDate: input.startDate, endDate: input.endDate },
      revenueRiyals: halalaToRiyals(totalRevenueHalala),
      costRiyals: halalaToRiyals(totalCostHalala),
      grossProfitRiyals: halalaToRiyals(grossProfitHalala),
      grossMarginPct: totalRevenueHalala > 0 ? Math.round(grossProfitHalala / totalRevenueHalala * 100) : 0,
      vatOutRiyals: halalaToRiyals(totalVatOutHalala),
      vatInRiyals: halalaToRiyals(totalVatInHalala),
      netVatRiyals: halalaToRiyals(Math.max(0, netVatHalala)),
      invoiceCount: issued.length,
      purchaseCount: filteredPurchases.length,
      costByCategory: Object.entries(costByCategory).map(([category, amountRiyals]) => ({
        category,
        amountRiyals
      })).sort((a, b) => b.amountRiyals - a.amountRiyals)
    };
  })
});

// server/customer-portal.router.ts
import { TRPCError as TRPCError12 } from "@trpc/server";
import { z as z25 } from "zod/v4";
import { eq as eq25, desc as desc21, and as and13, gt as gt5 } from "drizzle-orm";
var userProcedure2 = t.procedure.use(async ({ ctx, next }) => {
  const token = ctx.userToken;
  if (!token)
    throw new TRPCError12({ code: "UNAUTHORIZED", message: "\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644" });
  const now = Date.now();
  const session = await db.query.userSessions.findFirst({
    where: and13(
      eq25(schema_exports.userSessions.token, token),
      gt5(schema_exports.userSessions.expiresAt, now)
    )
  });
  if (!session)
    throw new TRPCError12({
      code: "UNAUTHORIZED",
      message: "\u0627\u0646\u062A\u0647\u062A \u0627\u0644\u062C\u0644\u0633\u0629\u060C \u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u062C\u062F\u062F\u0627\u064B"
    });
  const user = await db.query.users.findFirst({
    where: eq25(schema_exports.users.id, session.userId)
  });
  if (!user) throw new TRPCError12({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, user } });
});
var complaintTypeEnum2 = z25.enum([
  "size",
  "color",
  "damage",
  "shortage",
  "delay",
  "quality",
  "other"
]);
var customerPortalRouter = router({
  // ── طلباتي — قائمة الطلبات المرتبطة بالبريد الإلكتروني ─────────────────
  myOrders: userProcedure2.query(async ({ ctx }) => {
    const user = ctx.user;
    if (!user.email) return [];
    const orders = await db.query.doorOrders.findMany({
      where: eq25(schema_exports.doorOrders.customerEmail, user.email),
      orderBy: [desc21(schema_exports.doorOrders.createdAt)]
    });
    return orders;
  }),
  // ── الفاتورة الضريبية لطلب معين ─────────────────────────────────────────
  orderInvoice: userProcedure2.input(z25.object({ orderId: z25.number().int().positive() })).query(async ({ ctx, input }) => {
    const user = ctx.user;
    const order = await db.query.doorOrders.findFirst({
      where: and13(
        eq25(schema_exports.doorOrders.id, input.orderId),
        eq25(schema_exports.doorOrders.customerEmail, user.email)
      )
    });
    if (!order)
      throw new TRPCError12({ code: "NOT_FOUND", message: "\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
    const invoice = await db.query.taxInvoices.findFirst({
      where: and13(
        eq25(schema_exports.taxInvoices.sourceType, "door_order"),
        eq25(schema_exports.taxInvoices.sourceId, input.orderId)
      )
    });
    if (!invoice) return null;
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      issueTime: invoice.issueTime,
      buyerName: invoice.buyerName,
      buyerPhone: invoice.buyerPhone,
      sellerName: invoice.sellerName,
      sellerVatNumber: invoice.sellerVatNumber,
      lineItems: invoice.lineItems,
      subtotalHalala: invoice.subtotalHalala,
      vatAmountHalala: invoice.vatAmountHalala,
      totalHalala: invoice.totalHalala,
      vatRate: invoice.vatRate,
      qrCodeData: invoice.qrCodeData,
      invoiceHash: invoice.invoiceHash,
      status: invoice.status,
      zatcaStatus: invoice.zatcaStatus
    };
  }),
  // ── شكاواي — قائمة الشكاوى المسجلة بنفس البريد الإلكتروني ──────────────
  myComplaints: userProcedure2.query(async ({ ctx }) => {
    const user = ctx.user;
    const complaints2 = await db.query.complaints.findMany({
      where: eq25(schema_exports.complaints.distributorName, user.email),
      orderBy: [desc21(schema_exports.complaints.createdAt)]
    });
    const messages = await db.query.complaintMessages.findMany({
      orderBy: [desc21(schema_exports.complaintMessages.createdAt)]
    });
    return complaints2.map((c) => ({
      ...c,
      messages: messages.filter((m) => m.complaintId === c.id)
    }));
  }),
  // ── تقديم شكوى جديدة ────────────────────────────────────────────────────
  submitComplaint: userProcedure2.input(
    z25.object({
      orderNumber: z25.string().min(1, "\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628 \u0645\u0637\u0644\u0648\u0628"),
      product: z25.string().min(1, "\u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u062A\u062C \u0645\u0637\u0644\u0648\u0628"),
      type: complaintTypeEnum2,
      description: z25.string().min(10, "\u064A\u0631\u062C\u0649 \u0643\u062A\u0627\u0628\u0629 \u0648\u0635\u0641 \u062A\u0641\u0635\u064A\u0644\u064A (10 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644)")
    })
  ).mutation(async ({ ctx, input }) => {
    const user = ctx.user;
    const now = Date.now();
    const year = (/* @__PURE__ */ new Date()).getFullYear();
    const existingCount = (await db.query.complaints.findMany()).length;
    const ticketNumber = `TKT-${year}-${String(existingCount + 1).padStart(4, "0")}`;
    const [result] = await db.insert(schema_exports.complaints).values({
      ticketNumber,
      distributorId: null,
      distributorName: user.email,
      // نستخدم البريد الإلكتروني كمعرّف
      companyName: user.name,
      orderNumber: input.orderNumber,
      product: input.product,
      type: input.type,
      description: input.description,
      images: [],
      createdAt: now,
      updatedAt: now
    });
    const id = result.insertId;
    await db.insert(schema_exports.complaintMessages).values({
      complaintId: id,
      from: "distributor",
      // نفس enum الموجود
      text: input.description,
      date: new Date(now).toISOString().split("T")[0],
      createdAt: now
    });
    return { id, ticketNumber, success: true };
  }),
  // ── تتبع طلب بدون تسجيل دخول (بالجوال أو البريد) ──────────────────────
  trackOrder: publicProcedure.input(
    z25.object({
      identifier: z25.string().min(3, "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644 \u0623\u0648 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A")
    })
  ).query(async ({ input }) => {
    const { identifier } = input;
    const isEmail = identifier.includes("@");
    const orders = await db.query.doorOrders.findMany({
      where: isEmail ? eq25(schema_exports.doorOrders.customerEmail, identifier) : eq25(schema_exports.doorOrders.customerPhone, identifier),
      orderBy: [desc21(schema_exports.doorOrders.createdAt)]
    });
    return orders.map((o) => ({
      id: o.id,
      productName: o.productName,
      status: o.status,
      workflowStage: o.workflowStage,
      priority: o.priority,
      expectedDelivery: o.expectedDelivery,
      totalPrice: o.totalPrice,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt
    }));
  })
});

// server/email.ts
import nodemailer from "nodemailer";
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}
var FROM_ADDRESS = process.env.EMAIL_FROM ?? "\u0633\u0646\u062F\u064A\u0627\u0646 \u0644\u0644\u0623\u0628\u0648\u0627\u0628 \u0627\u0644\u062E\u0634\u0628\u064A\u0629 <no-reply@sindian-doors.com>";
async function sendOrderConfirmation(data) {
  const transporter = createTransporter();
  if (!transporter) return;
  const dimRows = data.dimensions ? Object.entries(data.dimensions).map(
    ([k, v]) => `<tr><td style="padding:4px 8px;color:#555;">${k.replace(/_/g, " ")}</td><td style="padding:4px 8px;font-weight:600;">${v} \u0633\u0645</td></tr>`
  ).join("") : "";
  const selRows = Object.entries(data.selections).filter(([, v]) => v && v !== "false").map(
    ([k, v]) => `<tr><td style="padding:4px 8px;color:#555;">${k.replace(/_/g, " ")}</td><td style="padding:4px 8px;font-weight:600;">${v}</td></tr>`
  ).join("");
  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#2C4A3E,#3d6b5e);padding:32px 40px;text-align:center;">
            <h1 style="color:#C4956A;margin:0;font-size:28px;">\u0633\u0646\u062F\u064A\u0627\u0646</h1>
            <p style="color:#e0d5c8;margin:6px 0 0;font-size:14px;">\u0644\u0644\u0623\u0628\u0648\u0627\u0628 \u0627\u0644\u062E\u0634\u0628\u064A\u0629 \u0627\u0644\u0641\u0627\u062E\u0631\u0629</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px;">
            <h2 style="color:#2C4A3E;margin:0 0 8px;">\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0637\u0644\u0628\u0643 \u0628\u0646\u062C\u0627\u062D \u2705</h2>
            <p style="color:#555;margin:0 0 24px;line-height:1.7;">
              \u0639\u0632\u064A\u0632\u0646\u0627 ${data.customerName}\u060C<br>
              \u064A\u0633\u0639\u062F\u0646\u0627 \u0625\u0639\u0644\u0627\u0645\u0643 \u0628\u0623\u0646\u0646\u0627 \u0627\u0633\u062A\u0644\u0645\u0646\u0627 \u0637\u0644\u0628\u0643 \u0631\u0642\u0645 <strong style="color:#2C4A3E;">#${data.orderId}</strong>
              \u0648\u0633\u064A\u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0643 \u0641\u0631\u064A\u0642\u0646\u0627 \u062E\u0644\u0627\u0644 24 \u0633\u0627\u0639\u0629 \u0644\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644.
            </p>

            <!-- Order summary -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;border-radius:12px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #e8e0d5;">
                  <strong style="color:#2C4A3E;">\u0627\u0644\u0645\u0646\u062A\u062C:</strong>
                  <span style="margin-right:8px;">${data.productName}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #e8e0d5;">
                  <strong style="color:#2C4A3E;">\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628:</strong>
                  <span style="margin-right:8px;">#${data.orderId}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;">
                  <strong style="color:#2C4A3E;">\u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A:</strong>
                  <span style="margin-right:8px;color:#C4956A;font-size:18px;font-weight:700;">
                    ${data.totalPrice.toLocaleString("ar-SA")} \u0631.\u0633
                  </span>
                </td>
              </tr>
            </table>

            ${dimRows ? `
            <h3 style="color:#2C4A3E;margin:0 0 12px;font-size:15px;">\u0627\u0644\u0645\u0642\u0627\u0633\u0627\u062A</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;border-radius:12px;margin-bottom:24px;">
              ${dimRows}
            </table>` : ""}

            ${selRows ? `
            <h3 style="color:#2C4A3E;margin:0 0 12px;font-size:15px;">\u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A \u0627\u0644\u0645\u062E\u062A\u0627\u0631\u0629</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;border-radius:12px;margin-bottom:24px;">
              ${selRows}
            </table>` : ""}

            ${data.notes ? `
            <div style="background:#fffbf5;border-right:4px solid #C4956A;padding:12px 16px;border-radius:8px;margin-bottom:24px;">
              <strong style="color:#2C4A3E;font-size:13px;">\u0645\u0644\u0627\u062D\u0638\u0627\u062A:</strong>
              <p style="margin:4px 0 0;color:#555;font-size:13px;">${data.notes}</p>
            </div>` : ""}

            <p style="color:#888;font-size:13px;line-height:1.6;margin:0;">
              * \u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0645\u0630\u0643\u0648\u0631 \u062A\u0642\u062F\u064A\u0631\u064A \u0648\u064A\u062E\u0636\u0639 \u0644\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0646\u0647\u0627\u0626\u064A\u0629 \u0628\u0639\u062F \u062F\u0631\u0627\u0633\u0629 \u0627\u0644\u0645\u0648\u0627\u0635\u0641\u0627\u062A \u0627\u0644\u0643\u0627\u0645\u0644\u0629.<br>
              * \u0644\u0644\u0627\u0633\u062A\u0641\u0633\u0627\u0631 \u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627 \u0639\u0628\u0631 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0623\u0648 \u0627\u0644\u0647\u0627\u062A\u0641.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#2C4A3E;padding:20px 40px;text-align:center;">
            <p style="color:#C4956A;margin:0;font-size:13px;">
              \u0633\u0646\u062F\u064A\u0627\u0646 \u0644\u0644\u0623\u0628\u0648\u0627\u0628 \u0627\u0644\u062E\u0634\u0628\u064A\u0629 \u2014 \u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to: data.customerEmail,
      subject: `\u062A\u0623\u0643\u064A\u062F \u0637\u0644\u0628\u0643 #${data.orderId} \u2014 ${data.productName} | \u0633\u0646\u062F\u064A\u0627\u0646`,
      html
    });
  } catch (err) {
    console.error("[email] Failed to send order confirmation:", err);
  }
}

// server/routers.ts
async function notifyOwner(title, content) {
  const apiUrl = process.env.BUILT_IN_FORGE_API_URL;
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  if (!apiUrl || !apiKey || !ownerOpenId) return;
  try {
    await fetch(`${apiUrl}/v1/notification/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ open_id: ownerOpenId, title, content })
    });
  } catch {
  }
}
var ordersRouter = router({
  // Create a new door order
  create: publicProcedure.input(
    z26.object({
      customerName: z26.string().min(1),
      customerPhone: z26.string().min(1),
      customerEmail: z26.string().email().optional().or(z26.literal("")),
      productId: z26.string(),
      productName: z26.string(),
      selections: z26.record(z26.string(), z26.string()),
      subSelections: z26.record(z26.string(), z26.unknown()),
      dimensions: z26.record(z26.string(), z26.unknown()).optional(),
      basePrice: z26.number().default(0),
      totalPrice: z26.number().default(0),
      notes: z26.string().optional()
    })
  ).mutation(async ({ input }) => {
    const now = Date.now();
    const [result] = await db.insert(schema_exports.doorOrders).values({
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail || null,
      productId: input.productId,
      productName: input.productName,
      selections: input.selections,
      subSelections: input.subSelections,
      dimensions: input.dimensions || null,
      basePrice: input.basePrice,
      totalPrice: input.totalPrice,
      notes: input.notes || null,
      status: "new",
      createdAt: now,
      updatedAt: now
    });
    const orderId = result.insertId;
    const dimText = input.dimensions ? Object.entries(input.dimensions).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v} \u0633\u0645`).join(" | ") : "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F";
    notifyOwner(
      `\u{1F6AA} \u0637\u0644\u0628 \u062C\u062F\u064A\u062F #${orderId} \u2014 ${input.productName}`,
      `\u0627\u0644\u0639\u0645\u064A\u0644: ${input.customerName}
\u0627\u0644\u062C\u0648\u0627\u0644: ${input.customerPhone}${input.customerEmail ? `
\u0627\u0644\u0628\u0631\u064A\u062F: ${input.customerEmail}` : ""}
\u0627\u0644\u0645\u0646\u062A\u062C: ${input.productName}
\u0627\u0644\u0633\u0639\u0631: ${input.totalPrice.toLocaleString()} \u0631.\u0633
\u0627\u0644\u0645\u0642\u0627\u0633\u0627\u062A: ${dimText}${input.notes ? `
\u0645\u0644\u0627\u062D\u0638\u0627\u062A: ${input.notes}` : ""}`
    );
    if (input.customerEmail) {
      sendOrderConfirmation({
        orderId,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        productName: input.productName,
        selections: input.selections,
        dimensions: input.dimensions,
        totalPrice: input.totalPrice,
        notes: input.notes
      });
    }
    return { id: orderId, success: true };
  }),
  // Get all orders (admin only)
  list: adminProcedure.input(
    z26.object({
      status: z26.enum([
        "new",
        "reviewing",
        "confirmed",
        "in_production",
        "ready",
        "delivered",
        "cancelled"
      ]).nullable().optional()
    }).optional()
  ).query(async ({ input }) => {
    const orders = await db.query.doorOrders.findMany({
      orderBy: [desc22(schema_exports.doorOrders.createdAt)],
      where: input?.status ? eq26(schema_exports.doorOrders.status, input.status) : void 0
    });
    return orders.map((order) => ({
      ...order,
      sizes: typeof order.dimensions === "string" ? JSON.parse(order.dimensions || "{}") : order.dimensions,
      options: typeof order.selections === "string" ? JSON.parse(order.selections || "{}") : order.selections
    }));
  }),
  // Dashboard statistics (admin only)
  stats: adminProcedure.query(async () => {
    const allOrders = await db.query.doorOrders.findMany({
      orderBy: [desc22(schema_exports.doorOrders.createdAt)]
    });
    const statusCounts = {};
    for (const o of allOrders)
      statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
    const ARABIC_MONTHS = [
      "\u064A\u0646\u0627\u064A\u0631",
      "\u0641\u0628\u0631\u0627\u064A\u0631",
      "\u0645\u0627\u0631\u0633",
      "\u0623\u0628\u0631\u064A\u0644",
      "\u0645\u0627\u064A\u0648",
      "\u064A\u0648\u0646\u064A\u0648",
      "\u064A\u0648\u0644\u064A\u0648",
      "\u0623\u063A\u0633\u0637\u0633",
      "\u0633\u0628\u062A\u0645\u0628\u0631",
      "\u0623\u0643\u062A\u0648\u0628\u0631",
      "\u0646\u0648\u0641\u0645\u0628\u0631",
      "\u062F\u064A\u0633\u0645\u0628\u0631"
    ];
    const EN_MONTHS = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ];
    const now = /* @__PURE__ */ new Date();
    const monthlyMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] = {
        revenue: 0,
        orders: 0,
        month: ARABIC_MONTHS[d.getMonth()],
        monthEn: EN_MONTHS[d.getMonth()]
      };
    }
    for (const o of allOrders) {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyMap[key]) {
        monthlyMap[key].revenue += o.totalPrice;
        monthlyMap[key].orders += 1;
      }
    }
    const totalRevenue = allOrders.reduce((s, o) => s + o.totalPrice, 0);
    const totalOrders = allOrders.length;
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const cm = monthlyMap[currentKey];
    return {
      totalRevenue,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      thisMonthRevenue: cm?.revenue ?? 0,
      thisMonthOrders: cm?.orders ?? 0,
      statusCounts,
      monthly: Object.values(monthlyMap),
      recentOrders: allOrders.slice(0, 20)
    };
  }),
  // Get single order (admin only)
  getById: adminProcedure.input(z26.object({ id: z26.number() })).query(async ({ input }) => {
    const order = await db.query.doorOrders.findFirst({
      where: eq26(schema_exports.doorOrders.id, input.id)
    });
    if (!order) throw new TRPCError13({ code: "NOT_FOUND" });
    return {
      ...order,
      sizes: typeof order.dimensions === "string" ? JSON.parse(order.dimensions || "{}") : order.dimensions,
      options: typeof order.selections === "string" ? JSON.parse(order.selections || "{}") : order.selections
    };
  }),
  // Update order status (admin only)
  updateStatus: adminProcedure.input(
    z26.object({
      id: z26.number(),
      status: z26.enum([
        "new",
        "reviewing",
        "confirmed",
        "in_production",
        "ready",
        "delivered",
        "cancelled"
      ])
    })
  ).mutation(async ({ input }) => {
    await db.update(schema_exports.doorOrders).set({ status: input.status, updatedAt: Date.now() }).where(eq26(schema_exports.doorOrders.id, input.id));
    if (input.status === "confirmed") {
      createInvoiceFromOrder(input.id).catch(() => {
      });
    }
    return { success: true };
  }),
  // Delete order (admin only)
  delete: adminProcedure.input(z26.object({ id: z26.number() })).mutation(async ({ input }) => {
    await db.delete(schema_exports.doorOrders).where(eq26(schema_exports.doorOrders.id, input.id));
    return { success: true };
  }),
  // Dashboard KPIs — aggregates from all admin tables
  kpis: adminProcedure.query(async () => {
    const [
      distributorRows,
      complaintRows,
      workOrderRows,
      qcRows,
      packingRows,
      reviewRows
    ] = await Promise.all([
      db.query.distributors.findMany({ columns: { status: true } }),
      db.query.complaints.findMany({ columns: { status: true } }),
      db.query.workOrders.findMany({ columns: { status: true } }),
      db.query.qcInspections.findMany({ columns: { result: true } }),
      db.query.packingOrders.findMany({ columns: { packingStatus: true } }),
      db.query.postOrderReviews.findMany({
        columns: { status: true, clientRating: true }
      })
    ]);
    const activeDistributors = distributorRows.filter(
      (d) => d.status === "active"
    ).length;
    const pendingDistributors = distributorRows.filter(
      (d) => d.status === "pending"
    ).length;
    const openComplaints = complaintRows.filter(
      (c) => c.status === "open" || c.status === "under_review"
    ).length;
    const inProductionWorkOrders = workOrderRows.filter(
      (w) => w.status === "in_progress"
    ).length;
    const qcTotal = qcRows.length;
    const qcPass = qcRows.filter((q) => q.result === "pass").length;
    const qcPassRate = qcTotal > 0 ? Math.round(qcPass / qcTotal * 100) : 0;
    const pendingPacking = packingRows.filter(
      (p) => p.packingStatus === "pending"
    ).length;
    const pendingReviews = reviewRows.filter(
      (r) => r.status === "pending_review"
    ).length;
    const avgReviewRating = reviewRows.length > 0 ? Math.round(
      reviewRows.reduce((sum, r) => sum + r.clientRating, 0) / reviewRows.length * 10
    ) / 10 : 0;
    return {
      activeDistributors,
      pendingDistributors,
      openComplaints,
      inProductionWorkOrders,
      qcPassRate,
      qcTotal,
      pendingPacking,
      pendingReviews,
      avgReviewRating
    };
  }),
  // Update workflow stage (admin only)
  updateWorkflowStage: adminProcedure.input(
    z26.object({
      id: z26.number(),
      workflowStage: z26.string().max(50),
      workflowStagesData: z26.record(
        z26.string(),
        z26.object({
          status: z26.enum([
            "pending",
            "in_progress",
            "done",
            "blocked",
            "skipped"
          ]),
          completedAt: z26.string().optional(),
          notes: z26.string().optional(),
          assignee: z26.string().optional()
        })
      ).optional(),
      priority: z26.enum(["normal", "urgent", "vip"]).optional(),
      expectedDelivery: z26.number().optional(),
      totalDoors: z26.number().int().optional()
    })
  ).mutation(async ({ input }) => {
    await db.update(schema_exports.doorOrders).set({
      workflowStage: input.workflowStage,
      ...input.workflowStagesData !== void 0 && {
        workflowStagesData: input.workflowStagesData
      },
      ...input.priority !== void 0 && { priority: input.priority },
      ...input.expectedDelivery !== void 0 && {
        expectedDelivery: input.expectedDelivery
      },
      ...input.totalDoors !== void 0 && {
        totalDoors: input.totalDoors
      },
      updatedAt: Date.now()
    }).where(eq26(schema_exports.doorOrders.id, input.id));
    return { success: true };
  }),
  // Update payment status (admin only)
  updatePaymentStatus: adminProcedure.input(
    z26.object({
      id: z26.number(),
      paymentStatus: z26.enum(["unpaid", "partial", "paid"])
    })
  ).mutation(async ({ input }) => {
    await db.update(schema_exports.doorOrders).set({ paymentStatus: input.paymentStatus, updatedAt: Date.now() }).where(eq26(schema_exports.doorOrders.id, input.id));
    return { success: true };
  }),
  // ── Analytics — رسوم بيانية محسّنة ──────────────────────────────────────
  analytics: adminProcedure.query(async () => {
    const allOrders = await db.query.doorOrders.findMany({
      orderBy: [desc22(schema_exports.doorOrders.createdAt)]
    });
    const now = Date.now();
    const MS_PER_DAY = 864e5;
    const cutoff90 = now - 90 * MS_PER_DAY;
    const recent90 = allOrders.filter((o) => o.createdAt >= cutoff90);
    const productMap = {};
    for (const o of recent90) {
      const key = o.productName ?? "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F";
      if (!productMap[key]) productMap[key] = { orders: 0, revenue: 0 };
      productMap[key].orders += 1;
      productMap[key].revenue += o.totalPrice;
    }
    const topProducts = Object.entries(productMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.orders - a.orders).slice(0, 8);
    const daily = [];
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(now - i * MS_PER_DAY);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = dayStart.getTime() + MS_PER_DAY;
      const dayOrders = allOrders.filter(
        (o) => o.createdAt >= dayStart.getTime() && o.createdAt < dayEnd
      );
      daily.push({
        date: dayStart.toLocaleDateString("ar-SA", {
          month: "short",
          day: "numeric"
        }),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((s, o) => s + o.totalPrice, 0)
      });
    }
    const avgByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i, 1);
      d.setHours(0, 0, 0, 0);
      const nextMonth = new Date(d);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const bucket = allOrders.filter(
        (o) => o.createdAt >= d.getTime() && o.createdAt < nextMonth.getTime()
      );
      const avg = bucket.length > 0 ? Math.round(
        bucket.reduce((s, o) => s + o.totalPrice, 0) / bucket.length
      ) : 0;
      avgByMonth.push({
        month: d.toLocaleDateString("ar-SA", {
          month: "short",
          year: "numeric"
        }),
        avg,
        orders: bucket.length
      });
    }
    const selFreq = {};
    for (const o of recent90) {
      const sels = o.selections;
      if (!sels) continue;
      for (const val of Object.values(sels)) {
        if (!val || val === "false") continue;
        selFreq[val] = (selFreq[val] ?? 0) + 1;
      }
    }
    const topSelections = Object.entries(selFreq).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 10);
    const FUNNEL_LABELS = {
      new: "\u062C\u062F\u064A\u062F",
      reviewing: "\u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629",
      confirmed: "\u0645\u0624\u0643\u062F",
      in_production: "\u0642\u064A\u062F \u0627\u0644\u062A\u0635\u0646\u064A\u0639",
      ready: "\u062C\u0627\u0647\u0632",
      delivered: "\u062A\u0645 \u0627\u0644\u062A\u0633\u0644\u064A\u0645",
      cancelled: "\u0645\u0644\u063A\u064A"
    };
    const statusCounts = {};
    for (const o of allOrders) {
      statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
    }
    const funnel = Object.entries(FUNNEL_LABELS).map(([status, label]) => ({
      status,
      label,
      count: statusCounts[status] ?? 0
    }));
    const totalRevenue = allOrders.reduce((s, o) => s + o.totalPrice, 0);
    const totalOrders = allOrders.length;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const weekAgo = now - 7 * MS_PER_DAY;
    const twoWeeksAgo = now - 14 * MS_PER_DAY;
    const thisWeek = allOrders.filter((o) => o.createdAt >= weekAgo).length;
    const lastWeek = allOrders.filter(
      (o) => o.createdAt >= twoWeeksAgo && o.createdAt < weekAgo
    ).length;
    const weeklyGrowth = lastWeek > 0 ? Math.round((thisWeek - lastWeek) / lastWeek * 100) : 0;
    return {
      topProducts,
      daily,
      avgByMonth,
      topSelections,
      funnel,
      totalRevenue,
      totalOrders,
      avgOrderValue,
      thisWeek,
      weeklyGrowth
    };
  })
});
var appRouter = router({
  orders: ordersRouter,
  suppliers: suppliersRouter,
  rfq: rfqRouter,
  comments: commentsRouter,
  productOptions: productOptionsRouter,
  distributorOrders: distributorOrdersRouter,
  payments: paymentsRouter,
  zatca: zatcaRouter,
  adminAuth: adminAuthRouter,
  users: usersRouter,
  inventory: inventoryRouter,
  distributorsAdmin: distributorsAdminRouter,
  distributors: distributorsRouter,
  complaints: complaintsRouter,
  qc: qcRouter,
  packing: packingRouter,
  workOrders: workOrdersRouter,
  decisionLog: decisionLogRouter,
  postOrderReview: postOrderReviewRouter,
  dailySummary: dailySummaryRouter,
  accounting: accountingRouter,
  purchases: purchasesRouter,
  products: productsRouter,
  production: productionRouter,
  analytics: analyticsRouter,
  customerPortal: customerPortalRouter
});

// server/index.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  const server = createServer(app);
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  app.use(
    cors({
      origin: process.env.NODE_ENV === "production" ? allowedOrigin || false : true,
      credentials: true
    })
  );
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1e3,
    // 15 minutes
    max: 100,
    // limit each IP to 100 requests per windowMs
    message: {
      error: "Too many requests, please try again later.",
      retryAfter: "15 minutes"
    },
    standardHeaders: true,
    legacyHeaders: false
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1e3,
    // 15 minutes
    max: 20,
    // limit each IP to 20 requests per windowMs
    message: {
      error: "Too many authentication attempts, please try again later.",
      retryAfter: "15 minutes"
    },
    standardHeaders: true,
    legacyHeaders: false
  });
  const uploadLimiter = rateLimit({
    windowMs: 60 * 1e3,
    // 1 minute
    max: 10,
    // limit each IP to 10 uploads per minute
    message: {
      error: "Too many upload requests, please try again later.",
      retryAfter: "1 minute"
    },
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use("/api", generalLimiter);
  app.use("/api/trpc/adminAuth", authLimiter);
  app.use("/api/trpc/users", authLimiter);
  app.use("/api/trpc/suppliers", authLimiter);
  app.use("/api/trpc/distributors", authLimiter);
  app.use("/api/trpc/distributorsAdmin", authLimiter);
  app.use("/api/upload", uploadLimiter);
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(cookieParser());
  const uploadsDir = path.resolve(__dirname, "..", "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.use("/uploads", express.static(uploadsDir));
  const ALLOWED_MIME_TYPES = {
    jpeg: "jpg",
    jpg: "jpg",
    png: "png",
    webp: "webp",
    gif: "gif"
  };
  const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
  app.post("/api/upload", (req, res) => {
    const { data, filename } = req.body;
    if (!data || !data.startsWith("data:")) {
      res.status(400).json({ error: "Invalid data" });
      return;
    }
    const matches = data.match(/^data:([^;]+);base64,(.+)$/s);
    if (!matches) {
      res.status(400).json({ error: "Invalid base64 data URL" });
      return;
    }
    const mimeType = matches[1].toLowerCase();
    const base64Data = matches[2];
    const subtype = mimeType.split("/")[1];
    const mappedExt = subtype ? ALLOWED_MIME_TYPES[subtype] : void 0;
    if (!mimeType.startsWith("image/") || !mappedExt) {
      res.status(415).json({
        error: "\u0646\u0648\u0639 \u0627\u0644\u0645\u0644\u0641 \u063A\u064A\u0631 \u0645\u062F\u0639\u0648\u0645. \u0627\u0644\u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0628\u0647\u0627: JPEG\u060C PNG\u060C WebP\u060C GIF"
      });
      return;
    }
    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length > MAX_UPLOAD_BYTES) {
      res.status(413).json({ error: "\u062D\u062C\u0645 \u0627\u0644\u0635\u0648\u0631\u0629 \u064A\u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D (5 \u0645\u064A\u063A\u0627\u0628\u0627\u064A\u062A)" });
      return;
    }
    const rawName = (filename ?? `upload-${Date.now()}`).replace(
      /[^a-z0-9_-]/gi,
      "_"
    );
    const safeName = rawName.replace(/^_+/, "") || `upload-${Date.now()}`;
    const finalName = `${safeName}.${mappedExt}`;
    fs.writeFileSync(path.join(uploadsDir, finalName), buffer);
    res.json({ url: `/uploads/${finalName}` });
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: ({ req, res }) => ({
        // Admin: httpOnly cookie (preferred) or header (backward compat for tooling)
        adminToken: req.cookies?.adminSession ?? req.headers["x-admin-token"],
        // User, supplier, distributor: httpOnly cookies only (Batch 2/3 auth hardening)
        userToken: req.cookies?.userSession,
        supplierToken: req.cookies?.supplierSession,
        distributorToken: req.cookies?.distributorSession,
        req,
        res
      }),
      onError({ path: path2, error }) {
        console.error(`[tRPC error] ${path2}:`, error.message, error.cause);
      }
    })
  );
  const staticPath = process.env.NODE_ENV === "production" ? path.resolve(__dirname, "public") : path.resolve(__dirname, "..", "dist", "public");
  app.use(express.static(staticPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });
  const port = process.env.PORT || (process.env.NODE_ENV === "production" ? 3e3 : 3001);
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
