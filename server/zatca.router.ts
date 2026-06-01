/**
 * ZATCA Tax Invoice Router
 * فواتير ضريبية إلكترونية متوافقة مع متطلبات هيئة الزكاة والضريبة والجمارك
 * المرحلة الثانية (Phase 2) - الربط والتكامل
 */

import { z } from "zod/v4";
import { db } from "./db.js";
import * as schema from "../drizzle/schema.js";
import { eq, desc, sql } from "drizzle-orm";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { publicProcedure, adminProcedure, router } from "./trpc.js";
import {
  buildZatcaQRData as _buildZatcaQRDataFromService,
  submitToZatcaPortal,
  createInvoiceFromOrder,
} from "./zatca.service.js";

// Re-export so existing tests (`import { buildZatcaQRData } from "./zatca.router.js"`) keep working
export { buildZatcaQRData } from "./zatca.service.js";

/**
 * ملاحظة التوافق مع ZATCA:
 * هذا النظام يُنتج فواتير ضريبية UBL 2.1 متوافقة مع ZATCA المرحلة الثانية.
 * يدعم الإرسال التلقائي لبوابة ZATCA (clearance/reporting) عبر CSID.
 * وظائف البناء والإرسال موجودة في zatca.service.ts.
 */

// ── Invoice Hash (SHA-256) ────────────────────────────────────────────────────
function computeInvoiceHash(data: object): string {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

// ── Sequential Invoice Number ─────────────────────────────────────────────────
function formatInvoiceNumber(counter: number, year: number): string {
  return `SIND-${year}-${String(counter).padStart(6, "0")}`;
}

// ── Halala Helpers ────────────────────────────────────────────────────────────
const toHalala = (riyals: number) => Math.round(riyals * 100);
const fromHalala = (halala: number) => (halala / 100).toFixed(2);

// ── Line Item Schema ──────────────────────────────────────────────────────────
const lineItemSchema = z.object({
  description: z.string().min(1),
  descriptionEn: z.string().optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(), // بدون ضريبة
  vatRate: z.number().min(0).max(100).default(15),
});

// ── Router ────────────────────────────────────────────────────────────────────
export const zatcaRouter = router({
  // ── جلب إعدادات الشركة الضريبية ──────────────────────────────────────────
  getSettings: adminProcedure.query(async () => {
    const rows = await db.select().from(schema.zatcaSettings).limit(1);
    return rows[0] ?? null;
  }),

  // ── تحديث إعدادات الشركة الضريبية ────────────────────────────────────────
  updateSettings: adminProcedure
    .input(
      z.object({
        sellerName: z.string().min(1),
        sellerNameEn: z.string().optional(),
        vatNumber: z.string().length(15),
        crNumber: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        postalCode: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        // ZATCA Phase 2 API credentials
        zatcaEnvironment: z.enum(["sandbox", "production"]).optional(),
        zatcaCsid: z.string().optional(),
        zatcaCsidSecret: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const existing = await db
        .select({ id: schema.zatcaSettings.id })
        .from(schema.zatcaSettings)
        .limit(1);

      const now = Date.now();
      if (existing.length > 0) {
        await db
          .update(schema.zatcaSettings)
          .set({ ...input, updatedAt: now })
          .where(eq(schema.zatcaSettings.id, existing[0].id));
      } else {
        await db
          .insert(schema.zatcaSettings)
          .values({ ...input, updatedAt: now });
      }
      return { success: true };
    }),

  // ── قائمة الفواتير الضريبية ───────────────────────────────────────────────
  list: adminProcedure
    .input(
      z
        .object({
          status: z.enum(["draft", "issued", "paid", "cancelled"]).optional(),
          invoiceType: z.enum(["standard", "simplified"]).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const rows = await db
        .select()
        .from(schema.taxInvoices)
        .orderBy(desc(schema.taxInvoices.createdAt));

      return rows.map(r => ({
        ...r,
        lineItems: (() => {
          try {
            return typeof r.lineItems === "string"
              ? JSON.parse(r.lineItems)
              : r.lineItems;
          } catch {
            return [];
          }
        })(),
        subtotalRiyals: fromHalala(r.subtotalHalala),
        vatAmountRiyals: fromHalala(r.vatAmountHalala),
        totalRiyals: fromHalala(r.totalHalala),
      }));
    }),

  // ── جلب فاتورة واحدة ─────────────────────────────────────────────────────
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const rows = await db
        .select()
        .from(schema.taxInvoices)
        .where(eq(schema.taxInvoices.id, input.id));
      if (!rows[0]) throw new Error("الفاتورة غير موجودة");
      const r = rows[0];
      return {
        ...r,
        lineItems: (() => {
          try {
            return typeof r.lineItems === "string"
              ? JSON.parse(r.lineItems)
              : r.lineItems;
          } catch {
            return [];
          }
        })(),
        subtotalRiyals: fromHalala(r.subtotalHalala),
        vatAmountRiyals: fromHalala(r.vatAmountHalala),
        totalRiyals: fromHalala(r.totalHalala),
      };
    }),

  // ── إنشاء فاتورة ضريبية جديدة ────────────────────────────────────────────
  create: adminProcedure
    .input(
      z
        .object({
          invoiceType: z.enum(["standard", "simplified"]).default("simplified"),

          // بيانات المشتري
          buyerName: z.string().min(1),
          buyerVatNumber: z.string().length(15).optional(),
          buyerCrNumber: z.string().optional(),
          buyerAddress: z.string().optional(),
          buyerPhone: z.string().optional(),
          buyerEmail: z.string().email().optional(),

          // بنود الفاتورة
          lineItems: z.array(lineItemSchema).min(1),

          // مرجع الطلب (اختياري)
          sourceType: z
            .enum(["door_order", "distributor_order", "manual"])
            .default("manual"),
          sourceId: z.number().optional(),

          notes: z.string().optional(),
        })
        .refine(
          data => data.invoiceType !== "standard" || !!data.buyerVatNumber,
          {
            message: "رقم الضريبة للمشتري إلزامي في الفواتير القياسية (B2B)",
            path: ["buyerVatNumber"],
          }
        )
    )
    .mutation(async ({ input }) => {
      // 1. جلب إعدادات الشركة
      const settingsRows = await db
        .select()
        .from(schema.zatcaSettings)
        .limit(1);
      const settings = settingsRows[0];
      if (!settings) throw new Error("يرجى إعداد بيانات الشركة الضريبية أولاً");

      // 2. حساب الإجماليات
      let subtotalHalala = 0;
      let vatAmountHalala = 0;

      const processedItems = input.lineItems.map(item => {
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
          lineTotal: parseFloat(lineTotal.toFixed(2)),
        };
      });

      const totalHalala = subtotalHalala + vatAmountHalala;

      // 3. توليد رقم الفاتورة التسلسلي بشكل ذري (atomic) لتجنب التكرار عند التزامن
      const year = new Date().getFullYear();
      // نزيد العداد أولاً بـ SQL ذري ثم نقرأ القيمة الجديدة
      await db
        .update(schema.zatcaSettings)
        .set({
          invoiceCounter: sql`invoice_counter + 1`,
          updatedAt: Date.now(),
        })
        .where(eq(schema.zatcaSettings.id, settings.id));
      const updatedSettings = await db
        .select({ counter: schema.zatcaSettings.invoiceCounter })
        .from(schema.zatcaSettings)
        .where(eq(schema.zatcaSettings.id, settings.id))
        .limit(1);
      const newCounter = updatedSettings[0]?.counter ?? 1;
      const invoiceNumber = formatInvoiceNumber(newCounter, year);

      // 3b. جلب هاش الفاتورة السابقة لربط السلسلة
      const prevInvoiceRows = await db
        .select({
          invoiceHash: schema.taxInvoices.invoiceHash,
          invoiceNumber: schema.taxInvoices.invoiceNumber,
        })
        .from(schema.taxInvoices)
        .orderBy(desc(schema.taxInvoices.createdAt))
        .limit(1);
      const previousInvoiceHash = prevInvoiceRows[0]?.invoiceHash ?? null;
      const previousInvoiceNumber = prevInvoiceRows[0]?.invoiceNumber ?? null;

      // 4. تاريخ ووقت الإصدار
      const now = new Date();
      const issueDate = now.toISOString().split("T")[0];
      const issueTime = now.toTimeString().split(" ")[0];
      const timestamp = now.toISOString().replace(/\.\d{3}Z$/, "Z");

      // 5. UUID
      const uuid = uuidv4();

      // 6. حساب هاش الفاتورة (يشمل هاش الفاتورة السابقة لضمان سلسلة التكامل)
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
        previousInvoiceHash: previousInvoiceHash ?? "FIRST",
      };
      const invoiceHash = computeInvoiceHash(hashInput);

      // 7. توليد بيانات QR Code (TLV)
      const qrData = _buildZatcaQRDataFromService({
        sellerName: settings.sellerName,
        vatNumber: settings.vatNumber,
        timestamp,
        totalWithVat: fromHalala(totalHalala),
        vatAmount: fromHalala(vatAmountHalala),
        invoiceHash,
      });

      // 8. حفظ الفاتورة في قاعدة البيانات
      const nowMs = Date.now();
      const [result] = await db.insert(schema.taxInvoices).values({
        uuid,
        invoiceNumber,
        invoiceType: input.invoiceType,
        // BT-3: 388 = Tax Invoice (standard & simplified), 381 = Credit Note
        invoiceTypeCode: "388",
        // KSA-2: 010000 = Standard B2B, 020000 = Simplified B2C
        invoiceSubTypeCode:
          input.invoiceType === "standard" ? "010000" : "020000",
        previousInvoiceHash: previousInvoiceHash ?? undefined,
        previousInvoiceNumber: previousInvoiceNumber ?? undefined,
        issueDate,
        issueTime,
        sellerName: settings.sellerName,
        sellerVatNumber: settings.vatNumber,
        sellerCrNumber: settings.crNumber ?? undefined,
        sellerAddress: settings.address ?? undefined,
        sellerCity: settings.city ?? undefined,
        sellerPostalCode: settings.postalCode ?? undefined,
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
        updatedAt: nowMs,
      });

      // ملاحظة: تحديث العداد تم بشكل ذري في الخطوة 3 أعلاه

      // 9. إنشاء قيد محاسبي تلقائي (Dr ذمم مدينة / Cr إيرادات + ضريبة)
      const invoiceId = Number((result as any).insertId);
      try {
        const jeCountResult = await db
          .select({ cnt: sql<number>`COUNT(*)` })
          .from(schema.journalEntries);
        const jeCounter = (jeCountResult[0]?.cnt ?? 0) + 1;
        const jeNumber = `JE-${year}-${String(jeCounter).padStart(6, "0")}`;
        const [jeResult] = await db.insert(schema.journalEntries).values({
          entryNumber: jeNumber,
          entryDate: issueDate,
          description: `فاتورة ضريبية رقم ${invoiceNumber} — ${input.buyerName}`,
          sourceType: "invoice",
          sourceId: invoiceId,
          totalDebitHalala: totalHalala,
          totalCreditHalala: totalHalala,
          isPosted: true,
          createdAt: nowMs,
          updatedAt: nowMs,
        });
        const jeId = Number((jeResult as any).insertId);
        await db.insert(schema.journalLines).values([
          {
            journalEntryId: jeId,
            accountCode: "1120",
            accountName: "الذمم المدينة — العملاء",
            debitHalala: totalHalala,
            creditHalala: 0,
            description: invoiceNumber,
            sequence: 1,
          },
          {
            journalEntryId: jeId,
            accountCode: "4100",
            accountName: "إيرادات مبيعات الأبواب",
            debitHalala: 0,
            creditHalala: subtotalHalala,
            description: invoiceNumber,
            sequence: 2,
          },
          {
            journalEntryId: jeId,
            accountCode: "2120",
            accountName: "ضريبة القيمة المضافة المستحقة",
            debitHalala: 0,
            creditHalala: vatAmountHalala,
            description: `ضريبة ${invoiceNumber}`,
            sequence: 3,
          },
        ]);
      } catch {
        // القيد المحاسبي اختياري — لا يُوقف إنشاء الفاتورة عند الفشل
      }

      return {
        success: true,
        invoiceId: Number((result as any).insertId),
        invoiceNumber,
        uuid,
        qrCodeData: qrData,
        invoiceHash,
      };
    }),

  // ── توليد QR Code كـ Data URL (PNG) ──────────────────────────────────────
  generateQRImage: adminProcedure
    .input(z.object({ invoiceId: z.number() }))
    .query(async ({ input }) => {
      const rows = await db
        .select({
          qrCodeData: schema.taxInvoices.qrCodeData,
          invoiceNumber: schema.taxInvoices.invoiceNumber,
        })
        .from(schema.taxInvoices)
        .where(eq(schema.taxInvoices.id, input.invoiceId));

      if (!rows[0]?.qrCodeData) throw new Error("بيانات QR غير موجودة");

      // تحويل Base64 TLV إلى QR Code PNG
      const qrDataUrl = await QRCode.toDataURL(rows[0].qrCodeData, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 200,
        color: { dark: "#000000", light: "#ffffff" },
      });

      return { qrDataUrl, invoiceNumber: rows[0].invoiceNumber };
    }),

  // ── تحديث حالة الدفع ─────────────────────────────────────────────────────
  updatePaymentStatus: adminProcedure
    .input(
      z.object({
        id: z.number(),
        paymentStatus: z.enum(["unpaid", "partial", "paid"]),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(schema.taxInvoices)
        .set({
          paymentStatus: input.paymentStatus,
          status: input.paymentStatus === "paid" ? "paid" : "issued",
          updatedAt: Date.now(),
        })
        .where(eq(schema.taxInvoices.id, input.id));
      return { success: true };
    }),

  // ── إلغاء فاتورة ─────────────────────────────────────────────────────────
  cancel: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db
        .update(schema.taxInvoices)
        .set({ status: "cancelled", updatedAt: Date.now() })
        .where(eq(schema.taxInvoices.id, input.id));
      return { success: true };
    }),

  // ── إرسال الفاتورة إلى بوابة ZATCA (Phase 2) ─────────────────────────────
  submitToZatca: adminProcedure
    .input(z.object({ invoiceId: z.number() }))
    .mutation(async ({ input }) => {
      const result = await submitToZatcaPortal(input.invoiceId);
      return result;
    }),

  // ── إعادة محاولة الإرسال للفواتير الفاشلة أو المعلّقة ────────────────────
  retryFailed: adminProcedure
    .input(
      z
        .object({
          /** تحديد فواتير بعينها — إذا لم يُحدد يُعالج جميع pending/error */
          invoiceIds: z.array(z.number()).optional(),
        })
        .optional()
    )
    .mutation(async ({ input }) => {
      const { and: drAnd, inArray, or } = await import("drizzle-orm");

      let ids: number[];
      if (input?.invoiceIds?.length) {
        ids = input.invoiceIds;
      } else {
        // جلب جميع الفواتير المعلّقة أو الفاشلة
        const rows = await db
          .select({ id: schema.taxInvoices.id })
          .from(schema.taxInvoices)
          .where(
            or(
              eq(schema.taxInvoices.zatcaStatus, "pending"),
              eq(schema.taxInvoices.zatcaStatus, "error")
            )
          );
        ids = rows.map(r => r.id);
      }

      const results = await Promise.allSettled(
        ids.map(id => submitToZatcaPortal(id))
      );

      const succeeded = results.filter(
        r => r.status === "fulfilled" && r.value.success
      ).length;
      const failed = results.length - succeeded;

      return { total: ids.length, succeeded, failed };
    }),

  // ── إنشاء فاتورة تلقائياً من طلب باب ────────────────────────────────────
  createFromOrder: adminProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input }) => {
      const result = await createInvoiceFromOrder(input.orderId);
      return result;
    }),

  // ── حالة إرسال ZATCA لفاتورة ─────────────────────────────────────────────
  getZatcaStatus: adminProcedure
    .input(z.object({ invoiceId: z.number() }))
    .query(async ({ input }) => {
      const [row] = await db
        .select({
          id: schema.taxInvoices.id,
          invoiceNumber: schema.taxInvoices.invoiceNumber,
          zatcaStatus: schema.taxInvoices.zatcaStatus,
          zatcaSubmittedAt: schema.taxInvoices.zatcaSubmittedAt,
          zatcaResponseCode: schema.taxInvoices.zatcaResponseCode,
          zatcaWarnings: schema.taxInvoices.zatcaWarnings,
        })
        .from(schema.taxInvoices)
        .where(eq(schema.taxInvoices.id, input.invoiceId));
      if (!row) throw new Error("الفاتورة غير موجودة");
      return {
        ...row,
        zatcaWarnings: (() => {
          try {
            return row.zatcaWarnings ? JSON.parse(row.zatcaWarnings) : [];
          } catch {
            return [];
          }
        })() as string[],
      };
    }),
});
