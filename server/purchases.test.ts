/**
 * اختبارات وحدة لنظام فواتير المشتريات
 * يختبر: تحويل الهللة، تصنيفات المشتريات، مخططات التحقق،
 *         منطق حساب الضريبة، فلترة النتائج
 */

import { describe, it, expect } from "vitest";
import { z } from "zod/v4";
import { fromHalala, toHalala, CATEGORY_LABELS } from "./purchases.router.js";

// ═══════════════════════════════════════════════════════════════════════════════
// 1. تحويل الهللة ↔ ريال
// ═══════════════════════════════════════════════════════════════════════════════

describe("toHalala / fromHalala — تحويل العملة في فواتير المشتريات", () => {
  it("يحوّل 1000 ريال إلى 100000 هللة", () => {
    expect(toHalala(1000)).toBe(100000);
  });

  it("يحوّل 150.75 ريال إلى 15075 هللة", () => {
    expect(toHalala(150.75)).toBe(15075);
  });

  it("يتعامل مع قيمة الضريبة: 15% من 1000 = 150 ريال = 15000 هللة", () => {
    const base = 1000;
    const vat = base * 0.15;
    expect(toHalala(vat)).toBe(15000);
  });

  it("يقرّب كل قيمة مستقلة بشكل صحيح (Math.round)", () => {
    // 0.333 ريال = 33.3 هللة → 33 (تقريب للأسفل)
    expect(toHalala(0.333)).toBe(33);
    // 0.005 ريال = 0.5 هللة → 1 (تقريب للأعلى عند 0.5)
    expect(toHalala(0.005)).toBe(1);
    // 0.004 ريال = 0.4 هللة → 0 (تقريب للأسفل)
    expect(toHalala(0.004)).toBe(0);
  });

  it("fromHalala يعيد نصاً بمنزلتين عشريتين دائماً", () => {
    expect(fromHalala(100000)).toBe("1000.00");
    expect(fromHalala(15075)).toBe("150.75");
    expect(fromHalala(1)).toBe("0.01");
    expect(fromHalala(0)).toBe("0.00");
  });

  it("التحويل ذهاباً وإياباً دقيق لمبالغ شائعة", () => {
    const amounts = [500, 1250.5, 9999.99, 0.01];
    for (const amount of amounts) {
      const halala = toHalala(amount);
      const back = parseFloat(fromHalala(halala));
      expect(Math.abs(back - amount)).toBeLessThan(0.005);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. تصنيفات المشتريات
// ═══════════════════════════════════════════════════════════════════════════════

describe("CATEGORY_LABELS — تصنيفات فواتير المشتريات", () => {
  it("يشمل جميع الفئات الخمس", () => {
    const requiredCategories = [
      "materials",
      "equipment",
      "services",
      "utilities",
      "other",
    ];
    for (const cat of requiredCategories) {
      expect(CATEGORY_LABELS[cat]).toBeDefined();
      expect(CATEGORY_LABELS[cat].length).toBeGreaterThan(0);
    }
  });

  it("تسمية 'materials' تحتوي على نص عربي", () => {
    expect(CATEGORY_LABELS["materials"]).toBe("مواد خام");
  });

  it("تسمية 'equipment' تحتوي على نص عربي", () => {
    expect(CATEGORY_LABELS["equipment"]).toBe("معدات وآلات");
  });

  it("يعيد undefined لفئة غير معرّفة", () => {
    expect(CATEGORY_LABELS["unknown_category"]).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. مخطط إنشاء فاتورة الشراء
// ═══════════════════════════════════════════════════════════════════════════════

const createPurchaseSchema = z.object({
  invoiceNumber: z.string().min(1),
  supplierName: z.string().min(1),
  supplierVatNumber: z.string().length(15).optional(),
  issueDate: z.string().min(10).max(10),
  subtotalRiyals: z.number().nonnegative(),
  vatAmountRiyals: z.number().nonnegative(),
  category: z
    .enum(["materials", "equipment", "services", "utilities", "other"])
    .default("materials"),
  description: z.string().min(1),
  notes: z.string().optional(),
});

describe("purchaseInvoice.create — التحقق من المدخلات", () => {
  const validInput = {
    invoiceNumber: "INV-2026-001",
    supplierName: "شركة الموارد الخشبية",
    issueDate: "2026-05-15",
    subtotalRiyals: 5000,
    vatAmountRiyals: 750,
    category: "materials" as const,
    description: "ألواح خشبية WPC",
  };

  it("يقبل فاتورة شراء صحيحة كاملة", () => {
    const result = createPurchaseSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("يرفض رقم الفاتورة الفارغ", () => {
    const result = createPurchaseSchema.safeParse({
      ...validInput,
      invoiceNumber: "",
    });
    expect(result.success).toBe(false);
  });

  it("يرفض اسم المورد الفارغ", () => {
    const result = createPurchaseSchema.safeParse({
      ...validInput,
      supplierName: "",
    });
    expect(result.success).toBe(false);
  });

  it("يرفض الرقم الضريبي للمورد بأقل أو أكثر من 15 خانة", () => {
    const short = createPurchaseSchema.safeParse({
      ...validInput,
      supplierVatNumber: "30000000000",
    });
    const long = createPurchaseSchema.safeParse({
      ...validInput,
      supplierVatNumber: "3000000000000031",
    });
    expect(short.success).toBe(false);
    expect(long.success).toBe(false);
  });

  it("يقبل الرقم الضريبي للمورد الفارغ (اختياري)", () => {
    const { supplierVatNumber: _, ...withoutVat } = validInput as any;
    const result = createPurchaseSchema.safeParse(withoutVat);
    expect(result.success).toBe(true);
  });

  it("يرفض المبالغ السالبة", () => {
    const negative = createPurchaseSchema.safeParse({
      ...validInput,
      subtotalRiyals: -100,
    });
    expect(negative.success).toBe(false);
  });

  it("يقبل صفر كمبلغ ضريبة (بعض المشتريات معفاة)", () => {
    const result = createPurchaseSchema.safeParse({
      ...validInput,
      vatAmountRiyals: 0,
    });
    expect(result.success).toBe(true);
  });

  it("يرفض الوصف الفارغ", () => {
    const result = createPurchaseSchema.safeParse({
      ...validInput,
      description: "",
    });
    expect(result.success).toBe(false);
  });

  it("يرفض التاريخ بصيغة خاطئة (أقل من 10 أحرف)", () => {
    const result = createPurchaseSchema.safeParse({
      ...validInput,
      issueDate: "2026-5-1",
    });
    expect(result.success).toBe(false);
  });

  it("يرفض الفئة غير المعرّفة", () => {
    const result = createPurchaseSchema.safeParse({
      ...validInput,
      category: "other_invalid",
    });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. حساب الضريبة (15%)
// ═══════════════════════════════════════════════════════════════════════════════

describe("حسابات ضريبة القيمة المضافة على المشتريات", () => {
  // نموذج دالة الحساب التلقائي للضريبة 15%
  function calcAutoVat(subtotalRiyals: number): number {
    return parseFloat((subtotalRiyals * 0.15).toFixed(2));
  }

  function calcTotal(subtotal: number, vat: number): number {
    return parseFloat((subtotal + vat).toFixed(2));
  }

  it("1000 ريال × 15% = 150 ريال ضريبة", () => {
    expect(calcAutoVat(1000)).toBe(150);
  });

  it("5000 ريال × 15% = 750 ريال ضريبة", () => {
    expect(calcAutoVat(5000)).toBe(750);
  });

  it("الإجمالي الكلي يساوي المبلغ + الضريبة", () => {
    const subtotal = 3000;
    const vat = calcAutoVat(subtotal);
    expect(calcTotal(subtotal, vat)).toBe(3450);
  });

  it("تخزين بالهللة — لا يوجد فقدان في الدقة للمبالغ الشائعة", () => {
    const subtotal = 1333.33;
    const vat = calcAutoVat(subtotal);
    const totalRiyals = calcTotal(subtotal, vat);
    const totalHalala = toHalala(totalRiyals);
    // يجب أن تكون عدداً صحيحاً (لا كسور هللة)
    expect(Number.isInteger(totalHalala)).toBe(true);
  });

  it("نظام صافي الضريبة: مخرجات - مدخلات = صافي مستحق", () => {
    const outputVatHalala = toHalala(1500); // ضريبة مبيعات
    const inputVatHalala = toHalala(750); // ضريبة مشتريات
    const netVat = outputVatHalala - inputVatHalala;
    expect(fromHalala(netVat)).toBe("750.00");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. منطق فلترة قائمة المشتريات
// ═══════════════════════════════════════════════════════════════════════════════

describe("فلترة قائمة المشتريات (منطق مطابق للـ router)", () => {
  // بيانات تجريبية
  const mockPurchases = [
    {
      id: 1,
      issueDate: "2026-01-15",
      category: "materials",
      paymentStatus: "unpaid",
      vatAmountHalala: 15000,
    },
    {
      id: 2,
      issueDate: "2026-02-20",
      category: "equipment",
      paymentStatus: "paid",
      vatAmountHalala: 22500,
    },
    {
      id: 3,
      issueDate: "2026-03-10",
      category: "materials",
      paymentStatus: "paid",
      vatAmountHalala: 9000,
    },
    {
      id: 4,
      issueDate: "2026-04-05",
      category: "services",
      paymentStatus: "unpaid",
      vatAmountHalala: 7500,
    },
    {
      id: 5,
      issueDate: "2026-05-01",
      category: "utilities",
      paymentStatus: "unpaid",
      vatAmountHalala: 3000,
    },
  ];

  function filterPurchases(
    rows: typeof mockPurchases,
    opts: {
      startDate?: string;
      endDate?: string;
      paymentStatus?: string;
      category?: string;
    }
  ) {
    let result = [...rows];
    if (opts.startDate)
      result = result.filter(r => r.issueDate >= opts.startDate!);
    if (opts.endDate) result = result.filter(r => r.issueDate <= opts.endDate!);
    if (opts.paymentStatus)
      result = result.filter(r => r.paymentStatus === opts.paymentStatus);
    if (opts.category)
      result = result.filter(r => r.category === opts.category);
    return result;
  }

  it("بدون فلاتر يُرجع جميع الفواتير", () => {
    expect(filterPurchases(mockPurchases, {})).toHaveLength(5);
  });

  it("الفلترة بالفئة: materials فقط", () => {
    const result = filterPurchases(mockPurchases, { category: "materials" });
    expect(result).toHaveLength(2);
    expect(result.every(r => r.category === "materials")).toBe(true);
  });

  it("الفلترة بحالة الدفع: unpaid فقط", () => {
    const result = filterPurchases(mockPurchases, { paymentStatus: "unpaid" });
    expect(result).toHaveLength(3);
  });

  it("الفلترة بنطاق تاريخ: الربع الأول 2026", () => {
    const result = filterPurchases(mockPurchases, {
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    });
    expect(result).toHaveLength(3);
  });

  it("دمج فلترين: materials غير مدفوعة", () => {
    const result = filterPurchases(mockPurchases, {
      category: "materials",
      paymentStatus: "unpaid",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("حساب إجمالي ضريبة المدخلات للفترة", () => {
    const q1 = filterPurchases(mockPurchases, {
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    });
    const totalInputVat = q1.reduce((s, r) => s + r.vatAmountHalala, 0);
    expect(totalInputVat).toBe(15000 + 22500 + 9000); // 46500 هللة = 465 ريال
    expect(fromHalala(totalInputVat)).toBe("465.00");
  });
});
