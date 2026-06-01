/**
 * اختبارات وحدة للنظام المحاسبي
 * يختبر: تحويل الهللة، ترقيم القيود، دليل الحسابات الافتراضي،
 *         مخططات التحقق من المدخلات، منطق التوازن المحاسبي
 */

import { describe, it, expect } from "vitest";
import { z } from "zod/v4";
import {
  fromHalala,
  toHalala,
  formatEntryNumber,
  DEFAULT_ACCOUNTS,
} from "./accounting.router.js";

// ═══════════════════════════════════════════════════════════════════════════════
// 1. تحويل الهللة ↔ ريال
// ═══════════════════════════════════════════════════════════════════════════════

describe("toHalala — تحويل الريال إلى هللة", () => {
  it("يحوّل 1 ريال = 100 هللة", () => {
    expect(toHalala(1)).toBe(100);
  });

  it("يحوّل 15.00 ريال = 1500 هللة", () => {
    expect(toHalala(15)).toBe(1500);
  });

  it("يقرّب 0.005 ريال إلى 1 هللة (تقريب رياضي)", () => {
    expect(toHalala(0.005)).toBe(1);
  });

  it("يتعامل مع أرقام ذات منازل عشرية كثيرة", () => {
    // 150.15 ريال → 15015 هللة
    expect(toHalala(150.15)).toBe(15015);
  });

  it("يعيد 0 عند الإدخال صفر", () => {
    expect(toHalala(0)).toBe(0);
  });

  it("يتعامل مع مبالغ كبيرة — مليون ريال", () => {
    expect(toHalala(1_000_000)).toBe(100_000_000);
  });
});

describe("fromHalala — تحويل الهللة إلى ريال (نص)", () => {
  it("يحوّل 100 هللة = '1.00' ريال", () => {
    expect(fromHalala(100)).toBe("1.00");
  });

  it("يحوّل 1500 هللة = '15.00' ريال", () => {
    expect(fromHalala(1500)).toBe("15.00");
  });

  it("يضيف منزلتين عشريتين دائماً (15000 → '150.00')", () => {
    expect(fromHalala(15000)).toBe("150.00");
  });

  it("يعيد '0.00' عند الإدخال صفر", () => {
    expect(fromHalala(0)).toBe("0.00");
  });

  it("يتعامل مع الكسور — 1 هللة = '0.01' ريال", () => {
    expect(fromHalala(1)).toBe("0.01");
  });

  it("التحويل ذهاباً وإياباً متسق: toHalala(fromHalala(x)) === x", () => {
    const halala = 11525; // 115.25 ريال
    expect(toHalala(parseFloat(fromHalala(halala)))).toBe(halala);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. ترقيم القيود المحاسبية
// ═══════════════════════════════════════════════════════════════════════════════

describe("formatEntryNumber — ترقيم القيود", () => {
  it("يُنتج صيغة JE-السنة-XXXXXX", () => {
    expect(formatEntryNumber(1, 2026)).toBe("JE-2026-000001");
  });

  it("يملأ الرقم التسلسلي بأصفار حتى 6 خانات", () => {
    expect(formatEntryNumber(42, 2026)).toBe("JE-2026-000042");
  });

  it("يتعامل مع الأرقام الكبيرة (999999)", () => {
    expect(formatEntryNumber(999999, 2026)).toBe("JE-2026-999999");
  });

  it("يعكس السنة الصحيحة", () => {
    expect(formatEntryNumber(1, 2025)).toBe("JE-2025-000001");
    expect(formatEntryNumber(1, 2030)).toBe("JE-2030-000001");
  });

  it("القيد الأول دائماً 000001", () => {
    const num = formatEntryNumber(1, new Date().getFullYear());
    expect(num).toMatch(/^JE-\d{4}-000001$/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. دليل الحسابات الافتراضي
// ═══════════════════════════════════════════════════════════════════════════════

describe("DEFAULT_ACCOUNTS — دليل الحسابات الافتراضي", () => {
  it("يحتوي على 23 حساباً افتراضياً", () => {
    expect(DEFAULT_ACCOUNTS.length).toBe(23);
  });

  it("جميع الحسابات لها code و name و type و normalBalance", () => {
    for (const acc of DEFAULT_ACCOUNTS) {
      expect(acc.code).toBeTruthy();
      expect(acc.name).toBeTruthy();
      expect(["asset", "liability", "equity", "revenue", "expense"]).toContain(
        acc.type
      );
      expect(["debit", "credit"]).toContain(acc.normalBalance);
    }
  });

  it("لا توجد رموز مكررة", () => {
    const codes = DEFAULT_ACCOUNTS.map(a => a.code);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });

  it("حسابات الأصول والمصروفات رصيدها الطبيعي مدين", () => {
    const assetExpense = DEFAULT_ACCOUNTS.filter(
      a => a.type === "asset" || a.type === "expense"
    ).filter(a => a.code !== "1220"); // مجمع الإهلاك استثناء
    for (const acc of assetExpense) {
      expect(acc.normalBalance).toBe("debit");
    }
  });

  it("حسابات الخصوم والإيرادات وحقوق الملكية رصيدها الطبيعي دائن", () => {
    const creditNormal = DEFAULT_ACCOUNTS.filter(
      a => a.type === "liability" || a.type === "revenue" || a.type === "equity"
    );
    for (const acc of creditNormal) {
      expect(acc.normalBalance).toBe("credit");
    }
  });

  it("الحسابات الجذر (بدون أب) تحمل أكواداً رباعية", () => {
    const roots = DEFAULT_ACCOUNTS.filter(a => !a.parentCode);
    for (const acc of roots) {
      expect(acc.code).toMatch(/^\d{4}$/);
    }
  });

  it("الحسابات الفرعية لها parentCode معرّف", () => {
    const children = DEFAULT_ACCOUNTS.filter(a => a.parentCode);
    expect(children.length).toBeGreaterThan(0);
    for (const acc of children) {
      // يجب أن يوجد الأب في نفس القائمة
      const parent = DEFAULT_ACCOUNTS.find(p => p.code === acc.parentCode);
      expect(parent).toBeDefined();
    }
  });

  it("يشمل الحسابات الإلزامية لقيود الفواتير الضريبية", () => {
    const requiredCodes = ["1120", "2120", "4100"];
    for (const code of requiredCodes) {
      const acc = DEFAULT_ACCOUNTS.find(a => a.code === code);
      expect(acc).toBeDefined();
    }
  });

  it("يشمل الحسابات الإلزامية لقيود المشتريات", () => {
    const requiredCodes = ["2110", "1110"];
    for (const code of requiredCodes) {
      const acc = DEFAULT_ACCOUNTS.find(a => a.code === code);
      expect(acc).toBeDefined();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. مخطط التحقق من إنشاء الحسابات
// ═══════════════════════════════════════════════════════════════════════════════

const createAccountSchema = z.object({
  code: z.string().min(2).max(10),
  name: z.string().min(1),
  nameEn: z.string().default(""),
  type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
  normalBalance: z.enum(["debit", "credit"]),
  parentCode: z.string().optional(),
});

describe("createAccount — التحقق من المدخلات", () => {
  it("يقبل حساباً صحيحاً كاملاً", () => {
    const result = createAccountSchema.safeParse({
      code: "1150",
      name: "أوراق مالية",
      nameEn: "Securities",
      type: "asset",
      normalBalance: "debit",
      parentCode: "1100",
    });
    expect(result.success).toBe(true);
  });

  it("يرفض رمز الحساب من حرف واحد (أقل من 2)", () => {
    const result = createAccountSchema.safeParse({
      code: "1",
      name: "حساب",
      type: "asset",
      normalBalance: "debit",
    });
    expect(result.success).toBe(false);
  });

  it("يرفض رمز الحساب الأطول من 10 أحرف", () => {
    const result = createAccountSchema.safeParse({
      code: "12345678901",
      name: "حساب",
      type: "asset",
      normalBalance: "debit",
    });
    expect(result.success).toBe(false);
  });

  it("يرفض نوع الحساب غير المعرّف", () => {
    const result = createAccountSchema.safeParse({
      code: "9000",
      name: "حساب",
      type: "invalid_type",
      normalBalance: "debit",
    });
    expect(result.success).toBe(false);
  });

  it("يرفض الرصيد الطبيعي غير المعرّف", () => {
    const result = createAccountSchema.safeParse({
      code: "9000",
      name: "حساب",
      type: "asset",
      normalBalance: "both",
    });
    expect(result.success).toBe(false);
  });

  it("parentCode اختياري — يقبل بدونه", () => {
    const result = createAccountSchema.safeParse({
      code: "9000",
      name: "حساب جذر",
      type: "asset",
      normalBalance: "debit",
    });
    expect(result.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. منطق التوازن المحاسبي
// ═══════════════════════════════════════════════════════════════════════════════

describe("منطق توازن القيد المحاسبي", () => {
  // نموذج دالة التحقق من التوازن (مطابقة لمنطق createManualEntry)
  function isBalanced(lines: { debitRiyals: number; creditRiyals: number }[]) {
    const totalDebit = lines.reduce((s, l) => s + l.debitRiyals, 0);
    const totalCredit = lines.reduce((s, l) => s + l.creditRiyals, 0);
    return Math.abs(totalDebit - totalCredit) <= 0.001;
  }

  it("قيد متوازن: مدين = دائن", () => {
    const lines = [
      { debitRiyals: 1000, creditRiyals: 0 },
      { debitRiyals: 0, creditRiyals: 1000 },
    ];
    expect(isBalanced(lines)).toBe(true);
  });

  it("قيد غير متوازن: مدين ≠ دائن", () => {
    const lines = [
      { debitRiyals: 1000, creditRiyals: 0 },
      { debitRiyals: 0, creditRiyals: 800 },
    ];
    expect(isBalanced(lines)).toBe(false);
  });

  it("قيد متعدد السطور — يتوازن عبر سطور متعددة", () => {
    const lines = [
      { debitRiyals: 1150, creditRiyals: 0 }, // المدين الإجمالي
      { debitRiyals: 0, creditRiyals: 1000 }, // إيراد
      { debitRiyals: 0, creditRiyals: 150 }, // ضريبة
    ];
    expect(isBalanced(lines)).toBe(true);
  });

  it("يقبل فرق أقل من 0.001 ريال (تقريب عشري مقبول)", () => {
    const lines = [
      { debitRiyals: 100.0001, creditRiyals: 0 },
      { debitRiyals: 0, creditRiyals: 100 },
    ];
    expect(isBalanced(lines)).toBe(true);
  });

  it("يرفض فرق 0.01 ريال (هللة واحدة)", () => {
    const lines = [
      { debitRiyals: 100.01, creditRiyals: 0 },
      { debitRiyals: 0, creditRiyals: 100 },
    ];
    expect(isBalanced(lines)).toBe(false);
  });

  it("قيد فاتورة ضريبية نموذجي — 3 سطور متوازنة", () => {
    // فاتورة 1000 ريال + 150 ريال ضريبة = 1150 إجمالي
    const lines = [
      { debitRiyals: 1150, creditRiyals: 0 }, // Dr ذمم مدينة
      { debitRiyals: 0, creditRiyals: 1000 }, // Cr إيرادات
      { debitRiyals: 0, creditRiyals: 150 }, // Cr ضريبة مستحقة
    ];
    expect(isBalanced(lines)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. مخطط القيد اليدوي
// ═══════════════════════════════════════════════════════════════════════════════

const manualEntrySchema = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1),
  lines: z
    .array(
      z.object({
        accountCode: z.string().min(2),
        accountName: z.string().min(1),
        debitRiyals: z.number().nonnegative().default(0),
        creditRiyals: z.number().nonnegative().default(0),
        description: z.string().default(""),
      })
    )
    .min(2),
});

describe("createManualEntry — التحقق من المدخلات", () => {
  it("يقبل قيداً صحيحاً بسطرين", () => {
    const result = manualEntrySchema.safeParse({
      entryDate: "2026-05-15",
      description: "قيد تجريبي",
      lines: [
        {
          accountCode: "1120",
          accountName: "ذمم مدينة",
          debitRiyals: 500,
          creditRiyals: 0,
        },
        {
          accountCode: "4100",
          accountName: "إيرادات",
          debitRiyals: 0,
          creditRiyals: 500,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("يرفض التاريخ بصيغة غير YYYY-MM-DD", () => {
    const result = manualEntrySchema.safeParse({
      entryDate: "15-05-2026",
      description: "قيد",
      lines: [
        {
          accountCode: "1120",
          accountName: "X",
          debitRiyals: 100,
          creditRiyals: 0,
        },
        {
          accountCode: "4100",
          accountName: "Y",
          debitRiyals: 0,
          creditRiyals: 100,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("يرفض البيان الفارغ", () => {
    const result = manualEntrySchema.safeParse({
      entryDate: "2026-05-15",
      description: "",
      lines: [
        {
          accountCode: "1120",
          accountName: "X",
          debitRiyals: 100,
          creditRiyals: 0,
        },
        {
          accountCode: "4100",
          accountName: "Y",
          debitRiyals: 0,
          creditRiyals: 100,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("يرفض قيداً بسطر واحد فقط (الحد الأدنى 2)", () => {
    const result = manualEntrySchema.safeParse({
      entryDate: "2026-05-15",
      description: "قيد",
      lines: [
        {
          accountCode: "1120",
          accountName: "X",
          debitRiyals: 100,
          creditRiyals: 0,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("يرفض المبالغ السالبة", () => {
    const result = manualEntrySchema.safeParse({
      entryDate: "2026-05-15",
      description: "قيد",
      lines: [
        {
          accountCode: "1120",
          accountName: "X",
          debitRiyals: -100,
          creditRiyals: 0,
        },
        {
          accountCode: "4100",
          accountName: "Y",
          debitRiyals: 0,
          creditRiyals: 100,
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
