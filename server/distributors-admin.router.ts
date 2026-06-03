// ============================================================
// distributors-admin.router.ts - إدارة الموزعين (لوحة الإدارة)
// ============================================================
import { z } from "zod/v4";
import bcrypt from "bcryptjs";
import { db, schema } from "./db.js";
import { eq, desc } from "drizzle-orm";
import { router, adminProcedure } from "./trpc.js";
import { TRPCError } from "@trpc/server";

// ─── Zod schemas ─────────────────────────────────────────────
const distInput = z.object({
  name: z.string().min(1).max(255),
  company: z.string().min(1).max(255),
  city: z.string().max(100).default(""),
  region: z.string().max(100).default(""),
  phone: z.string().min(1).max(50),
  email: z.string().email().max(255),
  whatsapp: z.string().max(50).optional(),
  website: z.string().max(255).optional(),
  commercialReg: z.string().max(50).optional(),
  vatNumber: z.string().max(20).optional(),
  bankName: z.string().max(255).optional(),
  bankIban: z.string().max(40).optional(),
  status: z
    .enum(["active", "pending", "suspended", "rejected"])
    .default("pending"),
  tier: z.enum(["bronze", "silver", "gold", "platinum"]).default("bronze"),
  joinDate: z.string().max(10),
  contractStart: z.string().max(10).optional(),
  contractEnd: z.string().max(10).optional(),
  creditLimit: z.number().int().min(0).default(50000),
  discountRate: z.number().int().min(0).max(100).default(5),
  totalOrders: z.number().int().min(0).default(0),
  totalRevenue: z.number().min(0).default(0),
  avgRating: z.number().min(0).max(5).default(0),
  pendingOrders: z.number().int().min(0).default(0),
  openComplaints: z.number().int().min(0).default(0),
  notes: z.string().optional(),
  adminNotes: z.string().optional(),
  password: z.string().min(8).optional(), // كلمة مرور اختيارية — تُشفَّر بـ bcrypt قبل الحفظ
});

export const distributorsAdminRouter = router({
  list: adminProcedure.query(async () => {
    return db.query.distributors.findMany({
      orderBy: [desc(schema.distributors.createdAt)],
    });
  }),

  getById: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const result = await db.query.distributors.findFirst({
        where: eq(schema.distributors.id, input.id),
      });
      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الموزّع غير موجود" });
      }
      return result;
    }),

  create: adminProcedure.input(distInput).mutation(async ({ input }) => {
    // تحقق من عدم تكرار البريد الإلكتروني
    const existing = await db.query.distributors.findFirst({
      where: eq(schema.distributors.email, input.email),
    });
    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "البريد الإلكتروني مسجل مسبقاً",
      });
    }
    const { password, ...rest } = input;
    const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
    const now = Date.now();
    const [result] = await db
      .insert(schema.distributors)
      .values({ ...rest, passwordHash, createdAt: now, updatedAt: now });
    return { id: result.insertId };
  }),

  update: adminProcedure
    .input(z.object({ id: z.number().int() }).merge(distInput))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      // تحقق من عدم تكرار البريد مع موزع آخر
      const existing = await db.query.distributors.findFirst({
        where: eq(schema.distributors.email, data.email),
      });
      if (existing && existing.id !== id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "البريد الإلكتروني مسجل مسبقاً لموزع آخر",
        });
      }
      const { password, ...rest } = data;
      const passwordHash = password
        ? await bcrypt.hash(password, 10)
        : undefined;
      const updateData = passwordHash
        ? { ...rest, passwordHash, updatedAt: Date.now() }
        : { ...rest, updatedAt: Date.now() };
      await db
        .update(schema.distributors)
        .set(updateData)
        .where(eq(schema.distributors.id, id));
      return { ok: true };
    }),

  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        status: z.enum(["active", "pending", "suspended", "rejected"]),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(schema.distributors)
        .set({ status: input.status, updatedAt: Date.now() })
        .where(eq(schema.distributors.id, input.id));
      return { ok: true };
    }),

  updateTier: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        tier: z.enum(["bronze", "silver", "gold", "platinum"]),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(schema.distributors)
        .set({ tier: input.tier, updatedAt: Date.now() })
        .where(eq(schema.distributors.id, input.id));
      return { ok: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db
        .delete(schema.distributors)
        .where(eq(schema.distributors.id, input.id));
      return { ok: true };
    }),

  // بذر البيانات التجريبية
  seed: adminProcedure.mutation(async () => {
    const existing = await db.query.distributors.findFirst();
    if (existing) return { skipped: true, message: "البيانات موجودة مسبقاً" };

    const now = Date.now();
    const mockData = [
      {
        name: "أحمد الزهراني",
        company: "شركة النخبة للمقاولات",
        city: "الرياض",
        region: "الرياض",
        phone: "0501234567",
        email: "ahmed@nakhba.sa",
        whatsapp: "0501234567",
        commercialReg: "1010123456",
        vatNumber: "300123456700003",
        bankName: "البنك الأهلي",
        bankIban: "SA0380000000608010167519",
        status: "active" as const,
        tier: "gold" as const,
        joinDate: "2024-03-15",
        contractStart: "2024-03-15",
        contractEnd: "2026-03-15",
        creditLimit: 200000,
        discountRate: 15,
        totalOrders: 134,
        totalRevenue: 498000,
        avgRating: 4.8,
        pendingOrders: 3,
        openComplaints: 0,
        adminNotes: "موزع متميز، يُنصح بترقيته لبلاتيني",
      },
      {
        name: "محمد العمري",
        company: "مؤسسة البناء الحديث",
        city: "جدة",
        region: "مكة المكرمة",
        phone: "0557891234",
        email: "m.omari@bena.sa",
        whatsapp: "0557891234",
        commercialReg: "4030234567",
        vatNumber: "300234567800003",
        bankName: "بنك الراجحي",
        bankIban: "SA4420000001234567891234",
        status: "active" as const,
        tier: "silver" as const,
        joinDate: "2024-06-20",
        contractStart: "2024-06-20",
        contractEnd: "2026-06-20",
        creditLimit: 100000,
        discountRate: 10,
        totalOrders: 89,
        totalRevenue: 312000,
        avgRating: 4.5,
        pendingOrders: 1,
        openComplaints: 1,
      },
      {
        name: "خالد الغامدي",
        company: "شركة الإعمار للتطوير",
        city: "الدمام",
        region: "الشرقية",
        phone: "0509876543",
        email: "k.ghamdi@emar.sa",
        whatsapp: "0509876543",
        commercialReg: "2050345678",
        vatNumber: "300345678900003",
        bankName: "بنك الإنماء",
        bankIban: "SA8055000000000001234567",
        status: "active" as const,
        tier: "silver" as const,
        joinDate: "2024-08-10",
        contractStart: "2024-08-10",
        contractEnd: "2026-08-10",
        creditLimit: 80000,
        discountRate: 10,
        totalOrders: 67,
        totalRevenue: 241000,
        avgRating: 4.2,
        pendingOrders: 0,
        openComplaints: 2,
      },
      {
        name: "فهد القحطاني",
        company: "مجموعة الفيصل العقارية",
        city: "مكة",
        region: "مكة المكرمة",
        phone: "0551234567",
        email: "fahad@faisal.sa",
        whatsapp: "0551234567",
        commercialReg: "4010456789",
        vatNumber: "300456789000003",
        bankName: "البنك الأهلي",
        bankIban: "SA0380000000608010167520",
        status: "active" as const,
        tier: "platinum" as const,
        joinDate: "2023-11-05",
        contractStart: "2023-11-05",
        contractEnd: "2025-11-05",
        creditLimit: 500000,
        discountRate: 20,
        totalOrders: 218,
        totalRevenue: 812000,
        avgRating: 4.9,
        pendingOrders: 5,
        openComplaints: 0,
      },
      {
        name: "سعد المالكي",
        company: "شركة تطوير الخليج",
        city: "أبها",
        region: "عسير",
        phone: "0504567890",
        email: "saad@gulf-dev.sa",
        whatsapp: "0504567890",
        commercialReg: "5150567890",
        vatNumber: "300567890100003",
        bankName: "بنك الراجحي",
        bankIban: "SA4420000001234567891235",
        status: "active" as const,
        tier: "bronze" as const,
        joinDate: "2025-01-12",
        contractStart: "2025-01-12",
        contractEnd: "2027-01-12",
        creditLimit: 40000,
        discountRate: 5,
        totalOrders: 28,
        totalRevenue: 98000,
        avgRating: 3.9,
        pendingOrders: 0,
        openComplaints: 1,
      },
      {
        name: "عبدالله الشهري",
        company: "مؤسسة الوفاء للبناء",
        city: "الطائف",
        region: "مكة المكرمة",
        phone: "0558765432",
        email: "a.shahri@wafa.sa",
        status: "pending" as const,
        tier: "bronze" as const,
        joinDate: "2026-04-18",
        totalOrders: 0,
        totalRevenue: 0,
        avgRating: 0,
        pendingOrders: 0,
        openComplaints: 0,
        notes: "مقدم طلب انضمام جديد - يحتاج مراجعة الوثائق",
      },
      {
        name: "ناصر الدوسري",
        company: "شركة الريادة للمقاولات",
        city: "الرياض",
        region: "الرياض",
        phone: "0501112233",
        email: "nasser@riada.sa",
        status: "pending" as const,
        tier: "bronze" as const,
        joinDate: "2026-04-15",
        totalOrders: 0,
        totalRevenue: 0,
        avgRating: 0,
        pendingOrders: 0,
        openComplaints: 0,
        notes: "طلب انضمام - بانتظار التحقق من السجل التجاري",
      },
      {
        name: "طارق الحربي",
        company: "مؤسسة الحربي التجارية",
        city: "المدينة",
        region: "المدينة المنورة",
        phone: "0559988776",
        email: "t.harbi@harbi.sa",
        status: "pending" as const,
        tier: "bronze" as const,
        joinDate: "2026-04-10",
        totalOrders: 0,
        totalRevenue: 0,
        avgRating: 0,
        pendingOrders: 0,
        openComplaints: 0,
      },
      {
        name: "يوسف السبيعي",
        company: "شركة السبيعي للإنشاءات",
        city: "جدة",
        region: "مكة المكرمة",
        phone: "0503344556",
        email: "y.subaie@subaie.sa",
        status: "suspended" as const,
        tier: "bronze" as const,
        joinDate: "2025-05-20",
        totalOrders: 12,
        totalRevenue: 41000,
        avgRating: 2.8,
        pendingOrders: 0,
        openComplaints: 3,
        notes: "موقوف بسبب تأخر السداد المتكرر",
      },
    ];

    for (const d of mockData) {
      await db
        .insert(schema.distributors)
        .values({ ...d, createdAt: now, updatedAt: now });
    }
    return { ok: true, count: mockData.length };
  }),

  // ── تعيين/تغيير كلمة مرور الموزّع (من لوحة الإدارة) ────────────────────
  setPassword: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
      })
    )
    .mutation(async ({ input }) => {
      const existing = await db.query.distributors.findFirst({
        where: eq(schema.distributors.id, input.id),
      });
      if (!existing)
        throw new TRPCError({ code: "NOT_FOUND", message: "الموزع غير موجود" });
      const passwordHash = await bcrypt.hash(input.password, 10);
      await db
        .update(schema.distributors)
        .set({ passwordHash, updatedAt: Date.now() })
        .where(eq(schema.distributors.id, input.id));
      return { ok: true };
    }),
});
