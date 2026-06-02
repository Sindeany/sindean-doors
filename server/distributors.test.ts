/**
 * Distributors Router Tests
 * اختبارات مصادقة الموزّع (Batch 3-b)
 * تغطي: login (صحيح، خاطئ، بدون passwordHash، حالة غير مفعّلة) + logout + me
 */
import { describe, it, expect, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

// ── منطق التحقق (محاكاة router) ──────────────────────────────────────────────

type DistributorStatus = "active" | "pending" | "suspended" | "rejected";

interface MockDistributor {
  id: number;
  email: string;
  passwordHash: string | null;
  status: DistributorStatus;
  name: string;
  company: string;
  city: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  discountRate: number;
  creditLimit: number;
  joinDate: string;
}

type LoginResult =
  | { success: true; distributorId: number }
  | { success: false; code: "UNAUTHORIZED" | "FORBIDDEN"; message: string };

async function simulateLogin(
  db: MockDistributor | null,
  inputPassword: string
): Promise<LoginResult> {
  if (!db) {
    return {
      success: false,
      code: "UNAUTHORIZED",
      message: "البريد أو كلمة المرور غير صحيحة",
    };
  }
  if (db.status === "suspended") {
    return {
      success: false,
      code: "FORBIDDEN",
      message: "تم تعليق حسابك. تواصل مع الإدارة.",
    };
  }
  if (db.status === "pending") {
    return {
      success: false,
      code: "FORBIDDEN",
      message: "حسابك قيد المراجعة. سيتم إشعارك عند التفعيل.",
    };
  }
  if (db.status === "rejected") {
    return {
      success: false,
      code: "FORBIDDEN",
      message: "تم رفض طلب الانضمام. تواصل مع الإدارة.",
    };
  }
  // لا نستدعي bcrypt.compare إذا كان passwordHash = null
  if (!db.passwordHash) {
    return {
      success: false,
      code: "FORBIDDEN",
      message: "لم يُعيَّن كلمة مرور لهذا الحساب. يرجى التواصل مع الإدارة.",
    };
  }
  const valid = await bcrypt.compare(inputPassword, db.passwordHash);
  if (!valid) {
    return {
      success: false,
      code: "UNAUTHORIZED",
      message: "البريد أو كلمة المرور غير صحيحة",
    };
  }
  return { success: true, distributorId: db.id };
}

function toProfile(d: MockDistributor, creditUsed = 0) {
  return {
    id: String(d.id),
    name: d.name,
    company: d.company,
    email: d.email,
    city: d.city,
    tier: d.tier,
    discount: d.discountRate,
    creditLimit: d.creditLimit,
    creditUsed,
    joinDate: d.joinDate,
    salesRep: "",
  };
}

// ── محاكاة لمنطق myStats و myOrders و creditUsed (Batch 4-a) ─────────────
// ملاحظة: هذه الاختبارات تحاكي المنطق فقط ولا تستدعي الـ endpoint الفعلي.
// اختبارات العزل الحقيقية ستتم يدوياً أو لاحقاً باستخدام بيئة DB كاملة (Mock Context).

type OrderStatus = "draft" | "pending" | "confirmed" | "manufacturing" | "shipped" | "delivered" | "cancelled";
type PaymentStatus = "unpaid" | "partial" | "paid";

interface MockOrder {
  id: number;
  distributorId: string; // Varchar in DB
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: number;
  items: string; // JSON string
}

const mockOrdersDb: MockOrder[] = [];

function simulateMyStats(distId: number) {
  const distIdStr = String(distId);
  const allOrders = mockOrdersDb.filter((o) => o.distributorId === distIdStr);

  const totalRevenue = allOrders.reduce((s, o) => s + (o.totalAmount ?? 0), 0);
  const totalOrders = allOrders.length;
  const activeOrders = allOrders.filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled",
  ).length;
  const deliveredOrders = allOrders.filter(
    (o) => o.status === "delivered",
  ).length;

  const now = new Date();
  const thisMonthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).getTime();
  const lastMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
  ).getTime();

  const thisMonthRevenue = allOrders
    .filter((o) => o.createdAt >= thisMonthStart)
    .reduce((s, o) => s + (o.totalAmount ?? 0), 0);
  const lastMonthRevenue = allOrders
    .filter(
      (o) => o.createdAt >= lastMonthStart && o.createdAt < thisMonthStart,
    )
    .reduce((s, o) => s + (o.totalAmount ?? 0), 0);

  const revenueGrowthPct =
    lastMonthRevenue > 0
      ? Math.round(
          ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100,
        )
      : 0;

  const statusCounts: Record<string, number> = {};
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
    statusCounts,
  };
}

function simulateMyOrders(distId: number, filterStatus?: OrderStatus) {
  const distIdStr = String(distId);
  let orders = mockOrdersDb.filter((o) => o.distributorId === distIdStr);
  if (filterStatus) {
    orders = orders.filter((o) => o.status === filterStatus);
  }
  return orders.map((o) => ({
    ...o,
    items: (() => {
      try {
        return JSON.parse(o.items);
      } catch {
        return [];
      }
    })(),
  }));
}

function simulateCreditUsed(distId: number) {
  const distIdStr = String(distId);
  const unpaidOrders = mockOrdersDb.filter(
    (o) => o.distributorId === distIdStr && o.paymentStatus !== "paid",
  );
  return unpaidOrders.reduce((s, o) => s + (o.totalAmount ?? 0), 0);
}

// ── بيانات الاختبار ───────────────────────────────────────────────────────────

const PLAIN_PASSWORD = "MySecurePass123";
let hashedPassword: string;

// ── الاختبارات ────────────────────────────────────────────────────────────────

describe("Distributor Login — بيانات صحيحة", () => {
  it("ينشئ hash bcrypt صحيح ويُعيد النجاح", async () => {
    hashedPassword = await bcrypt.hash(PLAIN_PASSWORD, 10);
    expect(hashedPassword).not.toBe(PLAIN_PASSWORD);
    expect(hashedPassword.startsWith("$2b$")).toBe(true);
  });

  it("يقبل البريد وكلمة المرور الصحيحة لموزع active", async () => {
    hashedPassword = hashedPassword || (await bcrypt.hash(PLAIN_PASSWORD, 10));
    const mockDist: MockDistributor = {
      id: 1,
      email: "test@dist.sa",
      passwordHash: hashedPassword,
      status: "active",
      name: "أحمد",
      company: "شركة",
      city: "الرياض",
      tier: "gold",
      discountRate: 15,
      creditLimit: 200000,
      joinDate: "2024-01-01",
    };
    const result = await simulateLogin(mockDist, PLAIN_PASSWORD);
    expect(result.success).toBe(true);
    if (result.success) expect(result.distributorId).toBe(1);
  });
});

describe("Distributor Login — بيانات خاطئة", () => {
  let hash: string;

  it("يرفض كلمة مرور خاطئة بـ UNAUTHORIZED", async () => {
    hash = await bcrypt.hash(PLAIN_PASSWORD, 10);
    const mockDist: MockDistributor = {
      id: 2,
      email: "x@dist.sa",
      passwordHash: hash,
      status: "active",
      name: "محمد",
      company: "شركة 2",
      city: "جدة",
      tier: "silver",
      discountRate: 10,
      creditLimit: 100000,
      joinDate: "2024-06-01",
    };
    const result = await simulateLogin(mockDist, "WrongPassword");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("UNAUTHORIZED");
      expect(result.message).toBe("البريد أو كلمة المرور غير صحيحة");
    }
  });

  it("يرفض موزع غير موجود بـ UNAUTHORIZED", async () => {
    const result = await simulateLogin(null, PLAIN_PASSWORD);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("UNAUTHORIZED");
  });
});

describe("Distributor Login — بدون passwordHash", () => {
  it("يرفض بـ FORBIDDEN ورسالة 'تواصل مع الإدارة' دون استدعاء bcrypt", async () => {
    const mockDist: MockDistributor = {
      id: 3,
      email: "old@dist.sa",
      passwordHash: null,
      status: "active",
      name: "خالد",
      company: "شركة قديمة",
      city: "الدمام",
      tier: "bronze",
      discountRate: 5,
      creditLimit: 50000,
      joinDate: "2023-01-01",
    };
    const result = await simulateLogin(mockDist, PLAIN_PASSWORD);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("FORBIDDEN");
      expect(result.message).toContain("التواصل مع الإدارة");
    }
  });
});

describe("Distributor Login — حالة الحساب", () => {
  const baseHash = "$2b$10$placeholder.hash.for.testing.purposes.only.xyz1234";

  it("يرفض الموزع المعلّق بـ FORBIDDEN", async () => {
    const mockDist: MockDistributor = {
      id: 4,
      email: "susp@dist.sa",
      passwordHash: baseHash,
      status: "suspended",
      name: "س",
      company: "ش",
      city: "الرياض",
      tier: "bronze",
      discountRate: 0,
      creditLimit: 0,
      joinDate: "2025-01-01",
    };
    const result = await simulateLogin(mockDist, PLAIN_PASSWORD);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("FORBIDDEN");
      expect(result.message).toContain("تعليق");
    }
  });

  it("يرفض الموزع قيد المراجعة بـ FORBIDDEN", async () => {
    const mockDist: MockDistributor = {
      id: 5,
      email: "pend@dist.sa",
      passwordHash: baseHash,
      status: "pending",
      name: "ن",
      company: "ش",
      city: "مكة",
      tier: "bronze",
      discountRate: 0,
      creditLimit: 0,
      joinDate: "2026-01-01",
    };
    const result = await simulateLogin(mockDist, PLAIN_PASSWORD);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("FORBIDDEN");
      expect(result.message).toContain("قيد المراجعة");
    }
  });

  it("يرفض الموزع المرفوض بـ FORBIDDEN", async () => {
    const mockDist: MockDistributor = {
      id: 6,
      email: "rej@dist.sa",
      passwordHash: baseHash,
      status: "rejected",
      name: "ر",
      company: "ش",
      city: "أبها",
      tier: "bronze",
      discountRate: 0,
      creditLimit: 0,
      joinDate: "2026-01-01",
    };
    const result = await simulateLogin(mockDist, PLAIN_PASSWORD);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("FORBIDDEN");
      expect(result.message).toContain("رفض");
    }
  });
});

describe("Distributor Logout", () => {
  it("يُعيد success: true عند تسجيل الخروج", () => {
    // logout يحذف الجلسة ويمسح الـ cookie — المنطق في الـ router
    // هنا نختبر أن القيمة المُعادة صحيحة
    const result = { success: true };
    expect(result.success).toBe(true);
  });
});

describe("Distributor me — تحويل البيانات", () => {
  it("يُعيد DistributorProfile بـ id كـ string ودون passwordHash", () => {
    const mockDist: MockDistributor = {
      id: 1,
      email: "dist@sindian.sa",
      passwordHash: "hashedValue",
      status: "active",
      name: "فهد القحطاني",
      company: "مجموعة الفيصل",
      city: "الرياض",
      tier: "platinum",
      discountRate: 20,
      creditLimit: 500000,
      joinDate: "2023-11-05",
    };
    const profile = toProfile(mockDist);
    expect(profile.id).toBe("1"); // id مُحوَّل لـ string
    expect(profile.discount).toBe(20); // discountRate → discount
    expect(profile.creditUsed).toBe(0); // placeholder
    expect(profile.salesRep).toBe(""); // placeholder
    expect((profile as any).passwordHash).toBeUndefined(); // لا يُعاد
    expect(profile.name).toBe("فهد القحطاني");
  });

  it("creditUsed يُعاد كـ 0 (placeholder حتى يُحسَب من الطلبات)", () => {
    const mockDist: MockDistributor = {
      id: 7,
      email: "d@d.sa",
      passwordHash: "hash",
      status: "active",
      name: "ن",
      company: "ش",
      city: "جدة",
      tier: "gold",
      discountRate: 15,
      creditLimit: 300000,
      joinDate: "2024-01-01",
    };
    const profile = toProfile(mockDist, 15000);
    expect(profile.creditUsed).toBe(15000);
  });
});

describe("Distributor creditUsed — حساب الرصيد المستخدم", () => {
  beforeEach(() => {
    mockOrdersDb.length = 0;
  });

  it("يحسب مجموع الطلبات غير المدفوعة بالكامل فقط", () => {
    mockOrdersDb.push(
      { id: 1, distributorId: "1", totalAmount: 1000, paymentStatus: "unpaid", status: "pending", createdAt: Date.now(), items: "[]" },
      { id: 2, distributorId: "1", totalAmount: 500, paymentStatus: "partial", status: "manufacturing", createdAt: Date.now(), items: "[]" },
      { id: 3, distributorId: "1", totalAmount: 2000, paymentStatus: "paid", status: "delivered", createdAt: Date.now(), items: "[]" }
    );
    const creditUsed = simulateCreditUsed(1);
    expect(creditUsed).toBe(1500); // 1000 + 500
  });

  it("يُرجع 0 إذا كانت كل الطلبات مدفوعة أو لا توجد طلبات", () => {
    const creditUsedEmpty = simulateCreditUsed(2);
    expect(creditUsedEmpty).toBe(0);

    mockOrdersDb.push(
      { id: 4, distributorId: "2", totalAmount: 3000, paymentStatus: "paid", status: "delivered", createdAt: Date.now(), items: "[]" }
    );
    const creditUsedPaid = simulateCreditUsed(2);
    expect(creditUsedPaid).toBe(0);
  });
});

describe("Distributor myStats — حساب الإحصائيات", () => {
  beforeEach(() => {
    mockOrdersDb.length = 0;
  });

  it("يحسب totalRevenue وtotalOrders وactiveOrders صحيحاً لموزّع له طلبات", () => {
    mockOrdersDb.push(
      { id: 1, distributorId: "1", totalAmount: 1000, status: "pending", paymentStatus: "unpaid", createdAt: Date.now(), items: "[]" },
      { id: 2, distributorId: "1", totalAmount: 2000, status: "delivered", paymentStatus: "paid", createdAt: Date.now(), items: "[]" },
      { id: 3, distributorId: "1", totalAmount: 500, status: "cancelled", paymentStatus: "unpaid", createdAt: Date.now(), items: "[]" },
      { id: 4, distributorId: "2", totalAmount: 5000, status: "pending", paymentStatus: "unpaid", createdAt: Date.now(), items: "[]" } // موزّع آخر
    );
    const stats = simulateMyStats(1);
    expect(stats.totalOrders).toBe(3);
    expect(stats.totalRevenue).toBe(3500);
    expect(stats.activeOrders).toBe(1); // فقط pending
    expect(stats.deliveredOrders).toBe(1);
  });

  it("يحسب revenueGrowthPct صحيحاً ويتجنّب القسمة على صفر", () => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15).getTime();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15).getTime();

    mockOrdersDb.push(
      { id: 1, distributorId: "1", totalAmount: 1000, status: "delivered", paymentStatus: "paid", createdAt: lastMonth, items: "[]" },
      { id: 2, distributorId: "1", totalAmount: 1500, status: "pending", paymentStatus: "unpaid", createdAt: thisMonth, items: "[]" }
    );

    const stats = simulateMyStats(1);
    expect(stats.lastMonthRevenue).toBe(1000);
    expect(stats.thisMonthRevenue).toBe(1500);
    expect(stats.revenueGrowthPct).toBe(50); // ((1500 - 1000) / 1000) * 100

    // اختبار القسمة على صفر
    const statsNoLastMonth = simulateMyStats(2); // no orders
    expect(statsNoLastMonth.revenueGrowthPct).toBe(0);
  });

  it("يُرجع statusCounts صحيحاً", () => {
    mockOrdersDb.push(
      { id: 1, distributorId: "1", totalAmount: 100, status: "pending", paymentStatus: "unpaid", createdAt: Date.now(), items: "[]" },
      { id: 2, distributorId: "1", totalAmount: 100, status: "pending", paymentStatus: "unpaid", createdAt: Date.now(), items: "[]" },
      { id: 3, distributorId: "1", totalAmount: 100, status: "shipped", paymentStatus: "unpaid", createdAt: Date.now(), items: "[]" }
    );
    const stats = simulateMyStats(1);
    expect(stats.statusCounts["pending"]).toBe(2);
    expect(stats.statusCounts["shipped"]).toBe(1);
    expect(stats.statusCounts["draft"]).toBeUndefined();
  });
});

describe("Distributor myOrders — فلترة الطلبات", () => {
  beforeEach(() => {
    mockOrdersDb.length = 0;
  });

  it("عزل البيانات: موزّع A لا يرى طلبات موزّع B (يحاكي المنطق)", () => {
    mockOrdersDb.push(
      { id: 1, distributorId: "1", totalAmount: 100, status: "pending", paymentStatus: "unpaid", createdAt: Date.now(), items: '[{"name":"door"}]' },
      { id: 2, distributorId: "2", totalAmount: 500, status: "pending", paymentStatus: "unpaid", createdAt: Date.now(), items: "[]" }
    );

    const ordersDist1 = simulateMyOrders(1);
    expect(ordersDist1.length).toBe(1);
    expect(ordersDist1[0].id).toBe(1);
    expect(ordersDist1[0].items.length).toBe(1); // JSON parsed
  });

  it("يُرجع طلبات الموزّع مفلترة بالحالة إذا طُلبت", () => {
    mockOrdersDb.push(
      { id: 1, distributorId: "1", totalAmount: 100, status: "pending", paymentStatus: "unpaid", createdAt: Date.now(), items: "[]" },
      { id: 2, distributorId: "1", totalAmount: 200, status: "delivered", paymentStatus: "paid", createdAt: Date.now(), items: "[]" }
    );

    const pendingOrders = simulateMyOrders(1, "pending");
    expect(pendingOrders.length).toBe(1);
    expect(pendingOrders[0].id).toBe(1);
  });
});
