/**
 * ZATCA Phase 2 Service
 * خدمة الربط الكامل مع هيئة الزكاة والضريبة والجمارك
 *
 * تشمل:
 *  - توليد QR Code (TLV Base64)
 *  - بناء فاتورة UBL 2.1 XML متوافقة مع ZATCA Phase 2
 *  - الإرسال لبوابة ZATCA (reporting للمبسّطة / clearance للقياسية)
 *  - التحويل التلقائي من طلب باب → فاتورة ضريبية مُصدرة
 *
 * ملاحظة بيئة الإنتاج:
 *   يتطلب الربط الإنتاجي شهادة رقمية (CSID) من ZATCA يُحصل عليها
 *   عبر عملية Onboarding في بوابة Fatoorah. الكود الحالي يعمل مباشرة
 *   مع Developer Portal (sandbox) وبيئة الإنتاج بعد إدخال CSID.
 */

import crypto from "crypto";
import { db } from "./db.js";
import * as schema from "../drizzle/schema.js";
import { eq, desc, and, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// ── ZATCA API Base URLs ────────────────────────────────────────────────────────
const ZATCA_API_BASE = {
  sandbox: "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal",
  production: "https://gw-fatoora.zatca.gov.sa/e-invoicing/core",
} as const;

// ZATCA-specified first invoice Previous Invoice Hash (PIH)
// هاش الفاتورة الأولى (لا يوجد فاتورة سابقة)
const ZATCA_FIRST_PIH =
  "NWZlY2ViYjZkYTIzOTQ5NDk0ZjUxNGZlNGI3YmNhODgxYTdiZDJiZGU3OGFiNjQxNDgxZGVhODNkNTM4ZjE4OA==";

// ── TLV Encoder (ZATCA QR Code Format) ────────────────────────────────────────
function encodeTLV(tag: number, value: string): Buffer {
  const valueBytes = Buffer.from(value, "utf8");
  return Buffer.concat([Buffer.from([tag, valueBytes.length]), valueBytes]);
}

/**
 * يبني بيانات QR Code بصيغة TLV Base64 (ZATCA Phase 1 & 2)
 * مُصدَّرة هنا وأيضاً من zatca.router.ts للحفاظ على توافق الاختبارات.
 */
export function buildZatcaQRData(params: {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  totalWithVat: string;
  vatAmount: string;
  invoiceHash?: string;
}): string {
  const parts = [
    encodeTLV(1, params.sellerName),
    encodeTLV(2, params.vatNumber),
    encodeTLV(3, params.timestamp),
    encodeTLV(4, params.totalWithVat),
    encodeTLV(5, params.vatAmount),
  ];
  if (params.invoiceHash) parts.push(encodeTLV(6, params.invoiceHash));
  return Buffer.concat(parts).toString("base64");
}

// ── Helpers ────────────────────────────────────────────────────────────────────
export const toHalala = (riyals: number): number => Math.round(riyals * 100);
export const fromHalala = (halala: number): string => (halala / 100).toFixed(2);

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatInvoiceNumber(counter: number, year: number): string {
  return `SIND-${year}-${String(counter).padStart(6, "0")}`;
}

// ── UBL 2.1 XML Builder ────────────────────────────────────────────────────────
export interface UblInvoiceParams {
  invoiceNumber: string;
  uuid: string;
  issueDate: string; // YYYY-MM-DD
  issueTime: string; // HH:MM:SS
  invoiceType: "standard" | "simplified";
  invoiceCounter: number;
  /** Base64 of previous invoice hash — use ZATCA_FIRST_PIH for first invoice */
  previousInvoiceHashB64: string;
  seller: {
    name: string;
    vatNumber: string;
    crNumber?: string;
    address?: string;
    city?: string;
    postalCode?: string;
  };
  buyer: {
    name: string;
    vatNumber?: string;
    address?: string;
  };
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number; // ex-VAT
    vatRate: number;
    vatAmount: number;
    lineSubtotal: number; // ex-VAT total
    lineTotal: number; // inc-VAT total
  }>;
  subtotalRiyals: number; // ex-VAT
  vatAmountRiyals: number;
  totalRiyals: number; // inc-VAT
}

export function buildUblXml(p: UblInvoiceParams): string {
  const isSimplified = p.invoiceType === "simplified";
  const subTypeCode = isSimplified ? "020000" : "010000";
  const profileId = isSimplified ? "reporting:1.0" : "clearance:1.0";

  const buyerVatXml = p.buyer.vatNumber
    ? `
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(p.buyer.vatNumber)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>`
    : "";

  const linesXml = p.lineItems
    .map(
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
    )
    .join("");

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
        <cbc:CityName>${escapeXml(p.seller.city ?? "الرياض")}</cbc:CityName>
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

// ── ZATCA Portal Submission ────────────────────────────────────────────────────

export interface ZatcaSubmitResult {
  success: boolean;
  zatcaStatus: "cleared" | "reported" | "error" | "pending";
  responseCode: string;
  warnings: string[];
  message: string;
}

/**
 * يرسل الفاتورة إلى بوابة ZATCA ويحدّث حالتها في قاعدة البيانات.
 * - فاتورة مبسّطة (B2C) → reporting/single
 * - فاتورة قياسية  (B2B) → clearance/single
 */
export async function submitToZatcaPortal(
  invoiceId: number
): Promise<ZatcaSubmitResult> {
  const nowMs = Date.now();

  // 1. Fetch invoice
  const [invoice] = await db
    .select()
    .from(schema.taxInvoices)
    .where(eq(schema.taxInvoices.id, invoiceId));
  if (!invoice) throw new Error(`الفاتورة ${invoiceId} غير موجودة`);

  // 2. Fetch settings
  const [settings] = await db.select().from(schema.zatcaSettings).limit(1);
  if (!settings) throw new Error("يرجى إعداد بيانات الشركة الضريبية أولاً");

  // 3. If no credentials configured → stay pending
  if (!settings.zatcaCsid || !settings.zatcaCsidSecret) {
    await db
      .update(schema.taxInvoices)
      .set({ zatcaStatus: "pending", updatedAt: nowMs })
      .where(eq(schema.taxInvoices.id, invoiceId));
    return {
      success: false,
      zatcaStatus: "pending",
      responseCode: "N/A",
      warnings: [],
      message:
        "لم يتم إعداد بيانات اعتماد ZATCA (CSID). " +
        "أضفها من إعدادات ZATCA ثم أعِد المحاولة.",
    };
  }

  // 4. Parse line items
  const lineItems = (() => {
    try {
      return typeof invoice.lineItems === "string"
        ? (JSON.parse(invoice.lineItems) as UblInvoiceParams["lineItems"])
        : (invoice.lineItems as UblInvoiceParams["lineItems"]);
    } catch {
      return [] as UblInvoiceParams["lineItems"];
    }
  })();

  // 5. Resolve invoice counter from number (e.g. SIND-2026-000003 → 3)
  const counterMatch = invoice.invoiceNumber.match(/(\d+)$/);
  const invoiceCounter = counterMatch ? parseInt(counterMatch[1], 10) : 1;

  // 6. Previous invoice hash → Base64
  //    Stored as hex SHA-256; ZATCA XML expects Base64
  const previousInvoiceHashB64 = invoice.previousInvoiceHash
    ? Buffer.from(invoice.previousInvoiceHash, "hex").toString("base64")
    : ZATCA_FIRST_PIH;

  // 7. Build UBL XML
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
      crNumber: invoice.sellerCrNumber ?? undefined,
      address: invoice.sellerAddress ?? undefined,
      city: invoice.sellerCity ?? undefined,
      postalCode: invoice.sellerPostalCode ?? undefined,
    },
    buyer: {
      name: invoice.buyerName,
      vatNumber: invoice.buyerVatNumber ?? undefined,
      address: invoice.buyerAddress ?? undefined,
    },
    lineItems,
    subtotalRiyals: invoice.subtotalHalala / 100,
    vatAmountRiyals: invoice.vatAmountHalala / 100,
    totalRiyals: invoice.totalHalala / 100,
  });

  // 8. Compute SHA-256 of XML → Base64 (ZATCA invoiceHash field)
  const xmlHashB64 = crypto
    .createHash("sha256")
    .update(ublXml, "utf8")
    .digest("base64");

  // 9. Build request
  const env = (settings.zatcaEnvironment ??
    "sandbox") as keyof typeof ZATCA_API_BASE;
  const baseUrl = ZATCA_API_BASE[env];
  const isSimplified = invoice.invoiceType === "simplified";
  const endpoint = isSimplified
    ? `${baseUrl}/invoices/reporting/single`
    : `${baseUrl}/invoices/clearance/single`;

  const authHeader =
    "Basic " +
    Buffer.from(`${settings.zatcaCsid}:${settings.zatcaCsidSecret}`).toString(
      "base64"
    );

  // Mark as submitted before the HTTP call
  await db
    .update(schema.taxInvoices)
    .set({
      zatcaStatus: "submitted",
      zatcaSubmittedAt: nowMs,
      zatcaInvoiceXml: ublXml,
      updatedAt: nowMs,
    })
    .where(eq(schema.taxInvoices.id, invoiceId));

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Version": "V2",
        "Accept-Language": "en",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        invoiceHash: xmlHashB64,
        uuid: invoice.uuid,
        invoice: Buffer.from(ublXml, "utf8").toString("base64"),
      }),
      signal: AbortSignal.timeout(30_000),
    });

    const responseCode = String(response.status);
    const body = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const isSuccess = response.ok;
    const zatcaStatus: ZatcaSubmitResult["zatcaStatus"] = isSuccess
      ? isSimplified
        ? "reported"
        : "cleared"
      : "error";

    const rawWarnings = (body.warnings ??
      body.warningMessages ??
      []) as unknown[];
    const warnings = rawWarnings.map(w =>
      typeof w === "string" ? w : JSON.stringify(w)
    );

    const errorMessages = (
      (body.errorMessages ?? body.errors ?? []) as unknown[]
    )
      .map(e => (typeof e === "string" ? e : JSON.stringify(e)))
      .join(" | ");

    await db
      .update(schema.taxInvoices)
      .set({
        zatcaStatus,
        zatcaResponseCode: responseCode,
        zatcaWarnings: warnings.length ? JSON.stringify(warnings) : null,
        updatedAt: Date.now(),
      })
      .where(eq(schema.taxInvoices.id, invoiceId));

    return {
      success: isSuccess,
      zatcaStatus,
      responseCode,
      warnings,
      message: isSuccess
        ? isSimplified
          ? "✓ تم الإبلاغ بنجاح إلى بوابة ZATCA (Reported)"
          : "✓ تمت المقاصة بنجاح مع ZATCA (Cleared)"
        : errorMessages || "فشل الإرسال — تحقق من الحالة في بوابة ZATCA",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع في الاتصال";

    await db
      .update(schema.taxInvoices)
      .set({
        zatcaStatus: "error",
        zatcaResponseCode: "NET",
        zatcaWarnings: JSON.stringify([msg]),
        updatedAt: Date.now(),
      })
      .where(eq(schema.taxInvoices.id, invoiceId));

    return {
      success: false,
      zatcaStatus: "error",
      responseCode: "NET",
      warnings: [msg],
      message: "تعذّر الاتصال ببوابة ZATCA: " + msg,
    };
  }
}

// ── Auto-create Invoice from Door Order ────────────────────────────────────────

export interface CreateFromOrderResult {
  invoiceId: number;
  invoiceNumber: string;
  /** true إذا كانت الفاتورة موجودة مسبقاً ولم تُنشأ من جديد */
  skipped?: boolean;
}

/**
 * يُنشئ فاتورة ضريبية مبسّطة تلقائياً من طلب الباب عند تأكيده.
 * إذا كانت فاتورة موجودة مسبقاً لنفس الطلب يعيد بياناتها بدون إعادة الإنشاء.
 * إذا كانت بيانات اعتماد ZATCA مضبوطة يُرسلها فوراً (fire-and-forget).
 */
export async function createInvoiceFromOrder(
  orderId: number
): Promise<CreateFromOrderResult> {
  // Check for existing invoice for this order
  const [existing] = await db
    .select({
      id: schema.taxInvoices.id,
      invoiceNumber: schema.taxInvoices.invoiceNumber,
    })
    .from(schema.taxInvoices)
    .where(
      and(
        eq(schema.taxInvoices.sourceType, "door_order"),
        eq(schema.taxInvoices.sourceId, orderId)
      )
    )
    .limit(1);

  if (existing) {
    return {
      invoiceId: existing.id,
      invoiceNumber: existing.invoiceNumber,
      skipped: true,
    };
  }

  // Fetch order
  const [order] = await db
    .select()
    .from(schema.doorOrders)
    .where(eq(schema.doorOrders.id, orderId));
  if (!order) throw new Error(`الطلب ${orderId} غير موجود`);

  // Fetch ZATCA settings
  const [settings] = await db.select().from(schema.zatcaSettings).limit(1);
  if (!settings)
    throw new Error("يرجى إعداد بيانات الشركة الضريبية أولاً من إعدادات ZATCA");

  // Price breakdown (order.totalPrice already in halala, VAT-inclusive at 15%)
  const totalHalala = order.totalPrice;
  const subtotalHalala = Math.round(totalHalala / 1.15);
  const vatAmountHalala = totalHalala - subtotalHalala;

  // Build line item description from order data
  const selections = order.selections as Record<string, string> | null;
  const dimensions = order.dimensions as Record<string, number> | null;
  let description = order.productName;
  if (dimensions && Object.keys(dimensions).length > 0) {
    const dimParts = Object.entries(dimensions)
      .map(([k, v]) => `${k}: ${v}سم`)
      .join(", ");
    description += ` — ${dimParts}`;
  }
  if (selections) {
    const selVals = Object.values(selections)
      .filter(v => v && v !== "false" && v !== "true")
      .slice(0, 4);
    if (selVals.length) description += ` — ${selVals.join(", ")}`;
  }

  const qty = order.totalDoors ?? 1;
  const unitSubtotalHalala = Math.round(subtotalHalala / qty);
  const unitVatHalala = Math.round(vatAmountHalala / qty);

  const lineItems: UblInvoiceParams["lineItems"] = [
    {
      description,
      quantity: qty,
      unitPrice: unitSubtotalHalala / 100,
      vatRate: 15,
      vatAmount: vatAmountHalala / 100,
      lineSubtotal: subtotalHalala / 100,
      lineTotal: totalHalala / 100,
    },
  ];

  // Atomic counter increment
  const year = new Date().getFullYear();
  await db
    .update(schema.zatcaSettings)
    .set({ invoiceCounter: sql`invoice_counter + 1`, updatedAt: Date.now() })
    .where(eq(schema.zatcaSettings.id, settings.id));

  const [updatedSettings] = await db
    .select({ counter: schema.zatcaSettings.invoiceCounter })
    .from(schema.zatcaSettings)
    .where(eq(schema.zatcaSettings.id, settings.id));

  const newCounter = updatedSettings?.counter ?? 1;
  const invoiceNumber = formatInvoiceNumber(newCounter, year);

  // Previous invoice for chain integrity
  const [prevInvoice] = await db
    .select({
      invoiceHash: schema.taxInvoices.invoiceHash,
      invoiceNumber: schema.taxInvoices.invoiceNumber,
    })
    .from(schema.taxInvoices)
    .orderBy(desc(schema.taxInvoices.createdAt))
    .limit(1);

  const now = new Date();
  const issueDate = now.toISOString().split("T")[0];
  const issueTime = now.toTimeString().split(" ")[0];
  const timestamp = now.toISOString().replace(/\.\d{3}Z$/, "Z");
  const uuid = uuidv4();
  const previousInvoiceHash = prevInvoice?.invoiceHash ?? null;

  // Invoice hash (consistency with existing create procedure)
  const invoiceHash = crypto
    .createHash("sha256")
    .update(
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
        previousInvoiceHash: previousInvoiceHash ?? "FIRST",
      })
    )
    .digest("hex");

  // QR Code
  const qrData = buildZatcaQRData({
    sellerName: settings.sellerName,
    vatNumber: settings.vatNumber,
    timestamp,
    totalWithVat: (totalHalala / 100).toFixed(2),
    vatAmount: (vatAmountHalala / 100).toFixed(2),
    invoiceHash,
  });

  const nowMs = Date.now();

  const [insertResult] = await db.insert(schema.taxInvoices).values({
    uuid,
    invoiceNumber,
    invoiceType: "simplified",
    invoiceTypeCode: "388",
    invoiceSubTypeCode: "020000",
    previousInvoiceHash: previousInvoiceHash ?? undefined,
    previousInvoiceNumber: prevInvoice?.invoiceNumber ?? undefined,
    issueDate,
    issueTime,
    sellerName: settings.sellerName,
    sellerVatNumber: settings.vatNumber,
    sellerCrNumber: settings.crNumber ?? undefined,
    sellerAddress: settings.address ?? undefined,
    sellerCity: settings.city ?? undefined,
    sellerPostalCode: settings.postalCode ?? undefined,
    buyerName: order.customerName,
    buyerPhone: order.customerPhone,
    buyerEmail: order.customerEmail ?? undefined,
    lineItems,
    subtotalHalala,
    vatAmountHalala,
    totalHalala,
    vatRate: 15,
    qrCodeData: qrData,
    invoiceHash,
    status: "issued",
    paymentStatus:
      (order.paymentStatus as "unpaid" | "partial" | "paid") ?? "unpaid",
    sourceType: "door_order",
    sourceId: orderId,
    zatcaStatus: "pending",
    notes: order.notes ?? undefined,
    createdAt: nowMs,
    updatedAt: nowMs,
  });

  const invoiceId = Number((insertResult as { insertId?: number }).insertId);

  // Fire-and-forget ZATCA submission if credentials exist
  if (settings.zatcaCsid && settings.zatcaCsidSecret) {
    submitToZatcaPortal(invoiceId).catch(() => {
      // Errors are persisted in the DB — no re-throw needed
    });
  }

  return { invoiceId, invoiceNumber };
}
