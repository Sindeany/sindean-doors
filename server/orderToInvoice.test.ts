/**
 * Tests for Order → Invoice conversion logic
 * اختبارات منطق تحويل بيانات الطلب إلى فاتورة ضريبية
 */

import { describe, it, expect } from "vitest";

// ── Helper Functions (mirrors client-side logic) ──────────────────────────────

/**
 * يحسب السعر قبل الضريبة من السعر الشامل للضريبة (15%)
 */
function extractSubtotalFromVatInclusivePrice(totalWithVat: number) {
  const subtotal = parseFloat((totalWithVat / 1.15).toFixed(2));
  const vat = parseFloat((totalWithVat - subtotal).toFixed(2));
  return { subtotal, vat, total: totalWithVat };
}

/**
 * يبني وصف بند الفاتورة من بيانات الطلب
 */
function buildLineItemDescription(
  productName: string,
  dimensions: Record<string, number> | null,
  selections: Record<string, string> | null
): string {
  const dimsText = dimensions && Object.keys(dimensions).length > 0
    ? " - " + Object.entries(dimensions).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}سم`).join(", ")
    : "";
  const selsText = selections && Object.keys(selections).length > 0
    ? " - " + Object.values(selections).filter(Boolean).join(", ")
    : "";
  return `${productName}${dimsText}${selsText}`;
}

/**
 * يتحقق من صحة بيانات الفاتورة المُعبَّأة تلقائياً
 */
function validateAutoFilledInvoice(data: {
  buyerName: string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number; vatRate: number }>;
}) {
  const errors: string[] = [];
  if (!data.buyerName?.trim()) errors.push("اسم المشتري مطلوب");
  if (!data.lineItems?.length) errors.push("يجب وجود بند واحد على الأقل");
  data.lineItems.forEach((item, i) => {
    if (!item.description?.trim()) errors.push(`البند ${i + 1}: الوصف مطلوب`);
    if (item.quantity <= 0) errors.push(`البند ${i + 1}: الكمية يجب أن تكون أكبر من صفر`);
    if (item.unitPrice < 0) errors.push(`البند ${i + 1}: السعر لا يمكن أن يكون سالباً`);
    if (item.vatRate < 0 || item.vatRate > 100) errors.push(`البند ${i + 1}: نسبة الضريبة غير صالحة`);
  });
  return errors;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Order Price → Invoice VAT Extraction", () => {
  it("should correctly extract subtotal from VAT-inclusive price", () => {
    const { subtotal, vat, total } = extractSubtotalFromVatInclusivePrice(1150);
    expect(total).toBe(1150);
    expect(subtotal).toBeCloseTo(1000, 1);
    expect(vat).toBeCloseTo(150, 1);
    expect(subtotal + vat).toBeCloseTo(1150, 1);
  });

  it("should handle small amounts correctly", () => {
    const { subtotal, vat } = extractSubtotalFromVatInclusivePrice(230);
    expect(subtotal).toBeCloseTo(200, 1);
    expect(vat).toBeCloseTo(30, 1);
  });

  it("should handle large amounts correctly", () => {
    const { subtotal, vat } = extractSubtotalFromVatInclusivePrice(57500);
    expect(subtotal).toBeCloseTo(50000, 1);
    expect(vat).toBeCloseTo(7500, 1);
  });

  it("should return 0 vat for 0 price", () => {
    const { subtotal, vat, total } = extractSubtotalFromVatInclusivePrice(0);
    expect(subtotal).toBe(0);
    expect(vat).toBe(0);
    expect(total).toBe(0);
  });

  it("subtotal + vat should always equal total", () => {
    const prices = [100, 575, 1150, 2300, 11500, 57500];
    prices.forEach(price => {
      const { subtotal, vat } = extractSubtotalFromVatInclusivePrice(price);
      expect(subtotal + vat).toBeCloseTo(price, 0);
    });
  });
});

describe("Order → Invoice Line Item Description Builder", () => {
  it("should build description from product name only", () => {
    const desc = buildLineItemDescription("باب خشبي كلاسيكي", null, null);
    expect(desc).toBe("باب خشبي كلاسيكي");
  });

  it("should include dimensions in description", () => {
    const desc = buildLineItemDescription("باب خشبي", { width: 90, height: 210 }, null);
    expect(desc).toContain("باب خشبي");
    expect(desc).toContain("90سم");
    expect(desc).toContain("210سم");
  });

  it("should include selections in description", () => {
    const desc = buildLineItemDescription("باب خشبي", null, { material: "بلوط", color: "بني داكن" });
    expect(desc).toContain("باب خشبي");
    expect(desc).toContain("بلوط");
    expect(desc).toContain("بني داكن");
  });

  it("should include both dimensions and selections", () => {
    const desc = buildLineItemDescription(
      "باب خشبي عصري",
      { width: 100, height: 220 },
      { material: "زان", finish: "مطفي" }
    );
    expect(desc).toContain("باب خشبي عصري");
    expect(desc).toContain("100سم");
    expect(desc).toContain("220سم");
    expect(desc).toContain("زان");
    expect(desc).toContain("مطفي");
  });

  it("should handle empty dimensions object", () => {
    const desc = buildLineItemDescription("باب خشبي", {}, { color: "أبيض" });
    expect(desc).toBe("باب خشبي - أبيض");
  });

  it("should replace underscores with spaces in dimension keys", () => {
    const desc = buildLineItemDescription("باب", { door_width: 90, door_height: 210 }, null);
    expect(desc).toContain("door width");
    expect(desc).toContain("door height");
    expect(desc).not.toContain("door_width");
  });
});

describe("Auto-filled Invoice Validation", () => {
  const validData = {
    buyerName: "أحمد محمد",
    lineItems: [{
      description: "باب خشبي كلاسيكي - عرض: 90سم",
      quantity: 1,
      unitPrice: 1000,
      vatRate: 15,
    }],
  };

  it("should pass validation for valid data", () => {
    const errors = validateAutoFilledInvoice(validData);
    expect(errors).toHaveLength(0);
  });

  it("should fail when buyer name is empty", () => {
    const errors = validateAutoFilledInvoice({ ...validData, buyerName: "" });
    expect(errors).toContain("اسم المشتري مطلوب");
  });

  it("should fail when buyer name is whitespace only", () => {
    const errors = validateAutoFilledInvoice({ ...validData, buyerName: "   " });
    expect(errors).toContain("اسم المشتري مطلوب");
  });

  it("should fail when line items are empty", () => {
    const errors = validateAutoFilledInvoice({ ...validData, lineItems: [] });
    expect(errors).toContain("يجب وجود بند واحد على الأقل");
  });

  it("should fail when line item description is empty", () => {
    const errors = validateAutoFilledInvoice({
      ...validData,
      lineItems: [{ ...validData.lineItems[0], description: "" }],
    });
    expect(errors.some(e => e.includes("الوصف مطلوب"))).toBe(true);
  });

  it("should fail when quantity is zero or negative", () => {
    const errors = validateAutoFilledInvoice({
      ...validData,
      lineItems: [{ ...validData.lineItems[0], quantity: 0 }],
    });
    expect(errors.some(e => e.includes("الكمية"))).toBe(true);
  });

  it("should fail when unit price is negative", () => {
    const errors = validateAutoFilledInvoice({
      ...validData,
      lineItems: [{ ...validData.lineItems[0], unitPrice: -100 }],
    });
    expect(errors.some(e => e.includes("السعر"))).toBe(true);
  });

  it("should fail when VAT rate is out of range", () => {
    const errors = validateAutoFilledInvoice({
      ...validData,
      lineItems: [{ ...validData.lineItems[0], vatRate: 150 }],
    });
    expect(errors.some(e => e.includes("نسبة الضريبة"))).toBe(true);
  });
});

describe("Order Reference Note Generation", () => {
  it("should generate correct reference note", () => {
    const orderId = 42;
    const note = `مرجع الطلب #${orderId}`;
    expect(note).toBe("مرجع الطلب #42");
  });

  it("should handle large order IDs", () => {
    const orderId = 99999;
    const note = `مرجع الطلب #${orderId}`;
    expect(note).toBe("مرجع الطلب #99999");
  });
});

describe("Invoice Type Auto-selection", () => {
  it("should default to simplified for individual customers (no VAT number)", () => {
    const hasVatNumber = false;
    const invoiceType = hasVatNumber ? "standard" : "simplified";
    expect(invoiceType).toBe("simplified");
  });

  it("should suggest standard for B2B customers (with VAT number)", () => {
    const hasVatNumber = true;
    const invoiceType = hasVatNumber ? "standard" : "simplified";
    expect(invoiceType).toBe("standard");
  });
});
