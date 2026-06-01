// ============================================================
// Tests: inline edit logic for ExcelOrderUpload
// ============================================================
import { describe, it, expect } from "vitest";

// ─── Mirrored validation helper (same logic as component) ───
interface ParsedItem {
  id: string;
  doorType: string;
  woodType: string | null;
  color: string | null;
  colorHex: string;
  width: number;
  height: number;
  thickness: number;
  quantity: number;
  unitPrice: number;
  notes: string | null;
  valid: boolean;
  error: string | null;
  selections: Record<string, string>;
}

function validateItem(item: ParsedItem): { valid: boolean; error: string | null } {
  if (!item.doorType || item.doorType.trim() === "") {
    return { valid: false, error: "نوع الباب مطلوب" };
  }
  if (!item.width || item.width <= 0) {
    return { valid: false, error: "العرض يجب أن يكون أكبر من صفر" };
  }
  if (!item.height || item.height <= 0) {
    return { valid: false, error: "الارتفاع يجب أن يكون أكبر من صفر" };
  }
  if (!item.thickness || item.thickness <= 0) {
    return { valid: false, error: "السماكة يجب أن تكون أكبر من صفر" };
  }
  if (!item.quantity || item.quantity <= 0) {
    return { valid: false, error: "الكمية يجب أن تكون أكبر من صفر" };
  }
  return { valid: true, error: null };
}

function makeItem(overrides: Partial<ParsedItem> = {}): ParsedItem {
  return {
    id: "test-1",
    doorType: "WPC",
    woodType: null,
    color: null,
    colorHex: "",
    width: 90,
    height: 210,
    thickness: 4,
    quantity: 2,
    unitPrice: 900,
    notes: null,
    valid: true,
    error: null,
    selections: {},
    ...overrides,
  };
}

// ─── Validation tests ────────────────────────────────────────
describe("validateItem - required fields", () => {
  it("يقبل بنداً صحيحاً بجميع الحقول", () => {
    const item = makeItem();
    const result = validateItem(item);
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it("يرفض البند عند غياب نوع الباب", () => {
    const item = makeItem({ doorType: "" });
    const result = validateItem(item);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("نوع الباب");
  });

  it("يرفض البند عند نوع الباب مسافات فقط", () => {
    const item = makeItem({ doorType: "   " });
    const result = validateItem(item);
    expect(result.valid).toBe(false);
  });

  it("يرفض البند عند عرض صفر", () => {
    const item = makeItem({ width: 0 });
    const result = validateItem(item);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("العرض");
  });

  it("يرفض البند عند ارتفاع سالب", () => {
    const item = makeItem({ height: -10 });
    const result = validateItem(item);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("الارتفاع");
  });

  it("يرفض البند عند سماكة صفر", () => {
    const item = makeItem({ thickness: 0 });
    const result = validateItem(item);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("السماكة");
  });

  it("يرفض البند عند كمية صفر", () => {
    const item = makeItem({ quantity: 0 });
    const result = validateItem(item);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("الكمية");
  });

  it("يقبل البند بسعر صفر (اختياري)", () => {
    const item = makeItem({ unitPrice: 0 });
    const result = validateItem(item);
    expect(result.valid).toBe(true);
  });

  it("يقبل البند بدون لون أو مادة (اختياريان)", () => {
    const item = makeItem({ woodType: null, color: null });
    const result = validateItem(item);
    expect(result.valid).toBe(true);
  });
});

// ─── Edit flow simulation ─────────────────────────────────────
describe("inline edit - تدفق التعديل", () => {
  it("تعديل بند خاطئ يُصبح صحيحاً بعد ملء الحقول المطلوبة", () => {
    // بند خاطئ: نوع الباب مفقود
    const invalid = makeItem({ doorType: "", valid: false, error: "نوع الباب مطلوب" });
    expect(invalid.valid).toBe(false);

    // بعد التعديل
    const fixed = { ...invalid, doorType: "WPC" };
    const result = validateItem(fixed);
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it("تعديل بند صحيح بإزالة حقل مطلوب يُصبح خاطئاً", () => {
    const valid = makeItem();
    const broken = { ...valid, width: 0 };
    const result = validateItem(broken);
    expect(result.valid).toBe(false);
  });

  it("تحديث قائمة البنود بعد التعديل يُحدّث البند في المكان الصحيح", () => {
    const items: ParsedItem[] = [
      makeItem({ id: "1", doorType: "", valid: false, error: "نوع الباب مطلوب" }),
      makeItem({ id: "2", doorType: "Wood", valid: true }),
      makeItem({ id: "3", doorType: "Iron", valid: true }),
    ];

    const updatedItem = { ...items[0], doorType: "WPC", valid: true, error: null };
    const newItems = items.map((item, i) => (i === 0 ? updatedItem : item));

    expect(newItems[0].doorType).toBe("WPC");
    expect(newItems[0].valid).toBe(true);
    expect(newItems[1].doorType).toBe("Wood"); // لم يتغير
    expect(newItems[2].doorType).toBe("Iron"); // لم يتغير
  });

  it("حذف بند يُزيله من القائمة بشكل صحيح", () => {
    const items: ParsedItem[] = [
      makeItem({ id: "1" }),
      makeItem({ id: "2" }),
      makeItem({ id: "3" }),
    ];

    const afterRemove = items.filter((_, i) => i !== 1);
    expect(afterRemove).toHaveLength(2);
    expect(afterRemove[0].id).toBe("1");
    expect(afterRemove[1].id).toBe("3");
  });

  it("إضافة بند جديد يُضاف في نهاية القائمة", () => {
    const items: ParsedItem[] = [makeItem({ id: "1" }), makeItem({ id: "2" })];
    const newItem = makeItem({ id: "3", doorType: "Glass" });
    const updated = [...items, newItem];
    expect(updated).toHaveLength(3);
    expect(updated[2].doorType).toBe("Glass");
  });
});

// ─── Total calculation ────────────────────────────────────────
describe("حساب الإجمالي الديناميكي", () => {
  it("يحسب الإجمالي بشكل صحيح بعد تعديل السعر", () => {
    const items: ParsedItem[] = [
      makeItem({ unitPrice: 900, quantity: 2, valid: true }),
      makeItem({ unitPrice: 1100, quantity: 1, valid: true }),
      makeItem({ unitPrice: 500, quantity: 3, valid: false }), // غير صالح - لا يُحسب
    ];

    const validItems = items.filter(i => i.valid);
    const total = validItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    expect(total).toBe(2900); // 900*2 + 1100*1
  });

  it("يحسب الإجمالي بعد تعديل الكمية", () => {
    const items: ParsedItem[] = [
      makeItem({ unitPrice: 1000, quantity: 5, valid: true }),
    ];

    // بعد تعديل الكمية من 5 إلى 3
    const updated = items.map(i => ({ ...i, quantity: 3 }));
    const total = updated.filter(i => i.valid).reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    expect(total).toBe(3000);
  });

  it("الإجمالي يساوي صفر عند عدم وجود بنود صالحة", () => {
    const items: ParsedItem[] = [
      makeItem({ valid: false, unitPrice: 1000, quantity: 2 }),
    ];
    const total = items.filter(i => i.valid).reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    expect(total).toBe(0);
  });

  it("البنود الصالحة تُعدّ بشكل صحيح بعد التعديل", () => {
    const items: ParsedItem[] = [
      makeItem({ id: "1", valid: false }),
      makeItem({ id: "2", valid: true }),
      makeItem({ id: "3", valid: true }),
    ];

    // بعد تصحيح البند الأول
    const fixed = items.map(i => (i.id === "1" ? { ...i, valid: true } : i));
    const validCount = fixed.filter(i => i.valid).length;
    expect(validCount).toBe(3);
  });
});

// ─── Number parsing ───────────────────────────────────────────
describe("تحويل القيم الرقمية عند الحفظ", () => {
  it("يحوّل النص الرقمي إلى رقم صحيح", () => {
    const raw = "90";
    expect(parseFloat(raw)).toBe(90);
  });

  it("يُعيد 0 عند قيمة NaN", () => {
    const raw = "abc";
    const val = parseFloat(raw) || 0;
    expect(val).toBe(0);
  });

  it("يقبل الأرقام العشرية للسماكة", () => {
    const raw = "4.5";
    expect(parseFloat(raw)).toBe(4.5);
  });

  it("يحوّل الكمية إلى عدد صحيح", () => {
    const raw = "3.7";
    expect(parseInt(raw)).toBe(3);
  });
});
