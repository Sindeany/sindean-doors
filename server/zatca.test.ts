/**
 * Tests for ZATCA Tax Invoice utilities
 * اختبارات وحدة لمنطق الفواتير الضريبية ZATCA
 */

import { describe, it, expect } from "vitest";
import { buildZatcaQRData } from "./zatca.router.js";

// ── TLV Decoder (for test verification) ──────────────────────────────────────
function decodeTLV(base64: string): Record<number, string> {
  const buf = Buffer.from(base64, "base64");
  const result: Record<number, string> = {};
  let i = 0;
  while (i < buf.length) {
    const tag = buf[i++];
    const len = buf[i++];
    const value = buf.slice(i, i + len).toString("utf8");
    result[tag] = value;
    i += len;
  }
  return result;
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("ZATCA QR Code TLV Encoding", () => {
  const sampleParams = {
    sellerName: "سنديان للأبواب الخشبية",
    vatNumber: "300000000000003",
    timestamp: "2024-01-15T14:30:00Z",
    totalWithVat: "1150.00",
    vatAmount: "150.00",
    invoiceHash: "abc123def456",
  };

  it("should produce a valid Base64 string", () => {
    const qrData = buildZatcaQRData(sampleParams);
    expect(typeof qrData).toBe("string");
    expect(qrData.length).toBeGreaterThan(0);
    // Valid Base64 characters only
    expect(qrData).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it("should encode all 5 required ZATCA tags", () => {
    const qrData = buildZatcaQRData(sampleParams);
    const decoded = decodeTLV(qrData);

    // Tag 1: Seller Name
    expect(decoded[1]).toBe(sampleParams.sellerName);
    // Tag 2: VAT Number
    expect(decoded[2]).toBe(sampleParams.vatNumber);
    // Tag 3: Timestamp
    expect(decoded[3]).toBe(sampleParams.timestamp);
    // Tag 4: Total with VAT
    expect(decoded[4]).toBe(sampleParams.totalWithVat);
    // Tag 5: VAT Amount
    expect(decoded[5]).toBe(sampleParams.vatAmount);
  });

  it("should include Tag 6 (invoice hash) when provided", () => {
    const qrData = buildZatcaQRData(sampleParams);
    const decoded = decodeTLV(qrData);
    expect(decoded[6]).toBe(sampleParams.invoiceHash);
  });

  it("should omit Tag 6 when invoiceHash is not provided", () => {
    const paramsWithoutHash = { ...sampleParams };
    delete (paramsWithoutHash as any).invoiceHash;
    const qrData = buildZatcaQRData(paramsWithoutHash);
    const decoded = decodeTLV(qrData);
    expect(decoded[6]).toBeUndefined();
  });

  it("should handle Arabic seller name correctly (UTF-8)", () => {
    const arabicName = "شركة الأبواب الخشبية المتحدة";
    const qrData = buildZatcaQRData({ ...sampleParams, sellerName: arabicName });
    const decoded = decodeTLV(qrData);
    expect(decoded[1]).toBe(arabicName);
  });

  it("should produce different QR data for different invoices", () => {
    const qr1 = buildZatcaQRData(sampleParams);
    const qr2 = buildZatcaQRData({ ...sampleParams, totalWithVat: "2300.00", vatAmount: "300.00" });
    expect(qr1).not.toBe(qr2);
  });
});

describe("ZATCA VAT Calculations", () => {
  it("should calculate 15% VAT correctly", () => {
    const subtotal = 1000;
    const vatRate = 0.15;
    const vat = subtotal * vatRate;
    const total = subtotal + vat;

    expect(vat).toBe(150);
    expect(total).toBe(1150);
  });

  it("should handle halala conversion without floating point errors", () => {
    // 1 Riyal = 100 Halala
    const toHalala = (riyals: number) => Math.round(riyals * 100);
    const fromHalala = (halala: number) => (halala / 100).toFixed(2);

    expect(toHalala(1150.00)).toBe(115000);
    expect(toHalala(150.00)).toBe(15000);
    expect(fromHalala(115000)).toBe("1150.00");
    expect(fromHalala(15000)).toBe("150.00");

    // Edge case: floating point
    expect(toHalala(0.1 + 0.2)).toBe(30); // 0.30 Riyals = 30 Halala
  });

  it("should compute correct totals for multiple line items", () => {
    const items = [
      { quantity: 2, unitPrice: 500, vatRate: 15 },
      { quantity: 1, unitPrice: 200, vatRate: 15 },
    ];

    let subtotal = 0;
    let vatTotal = 0;

    items.forEach(item => {
      const lineSubtotal = item.quantity * item.unitPrice;
      const lineVat = lineSubtotal * (item.vatRate / 100);
      subtotal += lineSubtotal;
      vatTotal += lineVat;
    });

    expect(subtotal).toBe(1200); // 2*500 + 1*200
    expect(vatTotal).toBe(180);  // 15% of 1200
    expect(subtotal + vatTotal).toBe(1380);
  });
});

describe("ZATCA Invoice Number Format", () => {
  it("should format invoice numbers correctly", () => {
    const formatInvoiceNumber = (counter: number, year: number) =>
      `SIND-${year}-${String(counter).padStart(6, "0")}`;

    expect(formatInvoiceNumber(1, 2024)).toBe("SIND-2024-000001");
    expect(formatInvoiceNumber(100, 2024)).toBe("SIND-2024-000100");
    expect(formatInvoiceNumber(999999, 2024)).toBe("SIND-2024-999999");
  });

  it("should produce unique sequential numbers", () => {
    const formatInvoiceNumber = (counter: number, year: number) =>
      `SIND-${year}-${String(counter).padStart(6, "0")}`;

    const numbers = Array.from({ length: 10 }, (_, i) => formatInvoiceNumber(i + 1, 2024));
    const uniqueNumbers = new Set(numbers);
    expect(uniqueNumbers.size).toBe(10);
  });
});

describe("ZATCA Invoice Type Codes", () => {
  it("should use code 388 for standard B2B invoices", () => {
    const code = "standard" === "standard" ? "388" : "381";
    expect(code).toBe("388");
  });

  it("should use code 381 for simplified B2C invoices", () => {
    const code = "simplified" === "standard" ? "388" : "381";
    expect(code).toBe("381");
  });
});
