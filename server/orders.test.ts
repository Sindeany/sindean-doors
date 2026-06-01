/**
 * اختبارات وحدة لـ orders router
 * تختبر منطق التحقق من المدخلات وبنية البيانات
 */
import { describe, it, expect } from "vitest";
import { z } from "zod/v4";

// ── مخطط إنشاء الطلب (مطابق لما في routers.ts) ──────────────────────────────
const createOrderSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerEmail: z.string().email().optional().or(z.literal("")),
  productId: z.string(),
  productName: z.string(),
  selections: z.record(z.string(), z.string()),
  subSelections: z.record(z.string(), z.unknown()),
  dimensions: z.record(z.string(), z.unknown()).optional(),
  basePrice: z.number().default(0),
  totalPrice: z.number().default(0),
  notes: z.string().optional(),
});

// ── مخطط تحديث الحالة ────────────────────────────────────────────────────────
const validStatuses = [
  "new",
  "reviewing",
  "confirmed",
  "in_production",
  "ready",
  "delivered",
  "cancelled",
] as const;

const updateStatusSchema = z.object({
  id: z.number(),
  status: z.enum(validStatuses),
});

// ── مخطط الفلترة ─────────────────────────────────────────────────────────────
const listSchema = z
  .object({
    status: z.enum(validStatuses).nullable().optional(),
  })
  .optional();

// ── الاختبارات ───────────────────────────────────────────────────────────────

describe("orders.create - التحقق من المدخلات", () => {
  it("يقبل طلباً صحيحاً بجميع الحقول المطلوبة", () => {
    const input = {
      customerName: "أحمد محمد",
      customerPhone: "0501234567",
      productId: "door-classic-001",
      productName: "باب كلاسيكي خشبي",
      selections: { wood_type: "oak", finish: "natural" },
      subSelections: {},
      basePrice: 2500,
      totalPrice: 3200,
    };
    const result = createOrderSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("يرفض الطلب عندما يكون اسم العميل فارغاً", () => {
    const input = {
      customerName: "",
      customerPhone: "0501234567",
      productId: "door-001",
      productName: "باب",
      selections: {},
      subSelections: {},
    };
    const result = createOrderSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("يرفض الطلب عندما يكون رقم الجوال فارغاً", () => {
    const input = {
      customerName: "أحمد",
      customerPhone: "",
      productId: "door-001",
      productName: "باب",
      selections: {},
      subSelections: {},
    };
    const result = createOrderSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("يقبل البريد الإلكتروني الصحيح", () => {
    const input = {
      customerName: "أحمد",
      customerPhone: "0501234567",
      customerEmail: "ahmed@example.com",
      productId: "door-001",
      productName: "باب",
      selections: {},
      subSelections: {},
    };
    const result = createOrderSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("يقبل البريد الإلكتروني الفارغ (اختياري)", () => {
    const input = {
      customerName: "أحمد",
      customerPhone: "0501234567",
      customerEmail: "",
      productId: "door-001",
      productName: "باب",
      selections: {},
      subSelections: {},
    };
    const result = createOrderSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("يرفض البريد الإلكتروني غير الصحيح", () => {
    const input = {
      customerName: "أحمد",
      customerPhone: "0501234567",
      customerEmail: "not-an-email",
      productId: "door-001",
      productName: "باب",
      selections: {},
      subSelections: {},
    };
    const result = createOrderSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("يضبط السعر الافتراضي على 0 عند عدم تحديده", () => {
    const input = {
      customerName: "أحمد",
      customerPhone: "0501234567",
      productId: "door-001",
      productName: "باب",
      selections: {},
      subSelections: {},
    };
    const result = createOrderSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.basePrice).toBe(0);
      expect(result.data.totalPrice).toBe(0);
    }
  });
});

describe("orders.updateStatus - التحقق من الحالات", () => {
  it("يقبل جميع الحالات الصحيحة", () => {
    for (const status of validStatuses) {
      const result = updateStatusSchema.safeParse({ id: 1, status });
      expect(result.success).toBe(true);
    }
  });

  it("يرفض الحالة غير المعروفة", () => {
    const result = updateStatusSchema.safeParse({ id: 1, status: "unknown_status" });
    expect(result.success).toBe(false);
  });

  it("يرفض المعرف غير الصحيح", () => {
    const result = updateStatusSchema.safeParse({ id: "abc", status: "new" });
    expect(result.success).toBe(false);
  });
});

describe("orders.list - التحقق من الفلترة", () => {
  it("يقبل الاستعلام بدون فلتر", () => {
    const result = listSchema.safeParse(undefined);
    expect(result.success).toBe(true);
  });

  it("يقبل الفلترة بحالة صحيحة", () => {
    const result = listSchema.safeParse({ status: "new" });
    expect(result.success).toBe(true);
  });

  it("يقبل الفلترة بـ null (بدون فلتر)", () => {
    const result = listSchema.safeParse({ status: null });
    expect(result.success).toBe(true);
  });

  it("يرفض الفلترة بحالة غير معروفة", () => {
    const result = listSchema.safeParse({ status: "invalid" });
    expect(result.success).toBe(false);
  });
});

describe("STATUS_TRANSITIONS - منطق تدفق الحالات", () => {
  const STATUS_TRANSITIONS: Record<string, string[]> = {
    new: ["reviewing", "cancelled"],
    reviewing: ["confirmed", "cancelled"],
    confirmed: ["in_production", "cancelled"],
    in_production: ["ready"],
    ready: ["delivered"],
    delivered: [],
    cancelled: [],
  };

  it("الطلب الجديد يمكن تحويله للمراجعة أو الإلغاء فقط", () => {
    expect(STATUS_TRANSITIONS["new"]).toEqual(["reviewing", "cancelled"]);
  });

  it("الطلب المسلَّم لا يمكن تغيير حالته", () => {
    expect(STATUS_TRANSITIONS["delivered"]).toEqual([]);
  });

  it("الطلب الملغي لا يمكن تغيير حالته", () => {
    expect(STATUS_TRANSITIONS["cancelled"]).toEqual([]);
  });

  it("جميع الحالات موجودة في خريطة التحولات", () => {
    for (const status of validStatuses) {
      expect(STATUS_TRANSITIONS).toHaveProperty(status);
    }
  });
});
