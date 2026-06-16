import { describe, it, expect } from "vitest";
import { z } from "zod/v4";

// ── مخطط إنشاء BOM (طفرة create) ───────────────────────────────────────
const createBOMSchema = z.object({
  productId: z.number().int(),
  description: z.string().optional(),
  laborCost: z.number().min(0).default(0),
  wastagePercentage: z.number().min(0).max(100).default(5),
  items: z.array(
    z.object({
      itemId: z.number().int(),
      quantity: z.number().min(0.001),
      notes: z.string().optional(),
    })
  ).min(1),
  notes: z.string().optional(),
});

// ── مخطط تعديل BOM (طفرة update) ───────────────────────────────────────
const updateBOMSchema = z.object({
  bomId: z.number().int(),
  description: z.string().optional(),
  laborCost: z.number().min(0).optional(),
  wastagePercentage: z.number().min(0).max(100).optional(),
  items: z.array(
    z.object({
      itemId: z.number().int(),
      quantity: z.number().min(0.001),
      notes: z.string().optional(),
    })
  ).optional(),
  notes: z.string().optional(),
});

// ── دالة الحساب المماثلة للخادم ──────────────────────────────────────────
function calculateBOMCost(
  items: { unitCost: number; quantity: number }[],
  laborCost: number,
  wastagePercentage: number
) {
  const totalItemsCost = items.reduce((sum, item) => sum + item.unitCost * item.quantity, 0);
  const wastageAmount = totalItemsCost * (wastagePercentage / 100);
  return totalItemsCost + wastageAmount + laborCost;
}

describe("BOM System validation & Cost logic", () => {
  describe("createBOMSchema validation", () => {
    it("يقبل مدخلات إنشاء BOM صحيحة", () => {
      const input = {
        productId: 1,
        description: "BOM للبوابة الكلاسيكية",
        laborCost: 150,
        wastagePercentage: 5,
        items: [
          { itemId: 10, quantity: 15, notes: "خشب صنوبر" },
          { itemId: 12, quantity: 2, notes: "مقابض" },
        ],
        notes: "ملاحظات عامة",
      };
      const result = createBOMSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("يرفض القائمة عند خلوها من البنود", () => {
      const input = {
        productId: 1,
        items: [],
      };
      const result = createBOMSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("يرفض تكلفة عمالة سالبة", () => {
      const input = {
        productId: 1,
        laborCost: -10,
        items: [{ itemId: 1, quantity: 1 }],
      };
      const result = createBOMSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("يرفض نسبة هدر خارج النطاق 0-100", () => {
      const input = {
        productId: 1,
        wastagePercentage: 110,
        items: [{ itemId: 1, quantity: 1 }],
      };
      const result = createBOMSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("updateBOMSchema validation", () => {
    it("يقبل التعديل الجزئي للحقول", () => {
      const input = {
        bomId: 42,
        description: "تعديل الوصف فقط",
      };
      const result = updateBOMSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("حساب تكلفة BOM الإجمالية", () => {
    it("يحسب التكلفة الكلية بشكل صحيح للمواد القياسية", () => {
      const items = [
        { unitCost: 15, quantity: 10 }, // 150
        { unitCost: 50, quantity: 3 },  // 150
      ]; // إجمالي المواد = 300
      const labor = 120; // العمالة = 120
      const wastage = 5; // الهدر 5% = 15
      // التكلفة الكلية = 300 + 15 + 120 = 435
      const total = calculateBOMCost(items, labor, wastage);
      expect(total).toBe(435);
    });

    it("يتعامل مع الأرقام العشرية بدقة", () => {
      const items = [
        { unitCost: 10.5, quantity: 4 }, // 42
        { unitCost: 2.75, quantity: 10 }, // 27.5
      ]; // إجمالي المواد = 69.5
      const labor = 50.25;
      const wastage = 10; // 10% = 6.95
      // التكلفة الكلية = 69.5 + 6.95 + 50.25 = 126.7
      const total = calculateBOMCost(items, labor, wastage);
      expect(total).toBe(126.7);
    });
  });
});
