/**
 * RFQ Router — إدارة طلبات عروض الأسعار
 * إنشاء RFQ، إرسال الدعوات، استقبال العروض، المقارنة، التقييم بالذكاء الاصطناعي
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { db, schema } from "./db.js";
import { eq, and, inArray } from "drizzle-orm";
import { invokeLLM } from "./llm.js";
import { t, publicProcedure, adminProcedure, router } from "./trpc.js";

// ── Zod Schemas ──────────────────────────────────────────────────────────────
const rfqItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  qty: z.number().min(0.01),
  unit: z.string().default("قطعة"),
  specs: z.string().optional(),
});

const lineItemSchema = z.object({
  itemIndex: z.number(),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0),
  notes: z.string().optional(),
});

// ── Router ───────────────────────────────────────────────────────────────────
export const rfqRouter = router({

  // ── إنشاء RFQ جديد ──────────────────────────────────────────────────────
  create: publicProcedure
    .input(z.object({
      title: z.string().min(3),
      description: z.string().optional(),
      items: z.array(rfqItemSchema).min(1),
      deliveryLocation: z.string().optional(),
      deliveryDays: z.number().optional(),
      paymentTerms: z.string().optional(),
      warrantyMonths: z.number().optional(),
      submissionDeadline: z.number(), // UTC ms
    }))
    .mutation(async ({ input }) => {
      const now = Date.now();
      // توليد رقم RFQ
      const count = await db.query.rfqs.findMany();
      const rfqNumber = `RFQ-${new Date().getFullYear()}-${String(count.length + 1).padStart(3, "0")}`;

      const [result] = await db.insert(schema.rfqs).values({
        rfqNumber,
        title: input.title,
        description: input.description || null,
        items: input.items,
        deliveryLocation: input.deliveryLocation || null,
        deliveryDays: input.deliveryDays || null,
        paymentTerms: input.paymentTerms || null,
        warrantyMonths: input.warrantyMonths || null,
        submissionDeadline: input.submissionDeadline,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      });
      return { id: (result as any).insertId, rfqNumber };
    }),

  // ── قائمة الـ RFQs ───────────────────────────────────────────────────────
  list: publicProcedure
    .input(z.object({
      status: z.enum(["draft","published","closed","evaluated","awarded","cancelled"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const rfqs = await db.query.rfqs.findMany({
        orderBy: (r, { desc }) => [desc(r.createdAt)],
        where: input?.status ? eq(schema.rfqs.status, input.status) : undefined,
      });
      // إضافة عدد العروض لكل RFQ
      const result = await Promise.all(rfqs.map(async (rfq) => {
        const quotes = await db.query.supplierQuotes.findMany({
          where: eq(schema.supplierQuotes.rfqId, rfq.id),
        });
        const invitations = await db.query.rfqInvitations.findMany({
          where: eq(schema.rfqInvitations.rfqId, rfq.id),
        });
        return { ...rfq, quotesCount: quotes.length, invitationsCount: invitations.length };
      }));
      return result;
    }),

  // ── تفاصيل RFQ واحد ──────────────────────────────────────────────────────
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const rfq = await db.query.rfqs.findFirst({ where: eq(schema.rfqs.id, input.id) });
      if (!rfq) throw new TRPCError({ code: "NOT_FOUND" });
      const invitations = await db.query.rfqInvitations.findMany({
        where: eq(schema.rfqInvitations.rfqId, input.id),
      });
      const quotes = await db.query.supplierQuotes.findMany({
        where: eq(schema.supplierQuotes.rfqId, input.id),
        orderBy: (q, { asc }) => [asc(q.totalPrice)],
      });
      // جلب بيانات الموردين
      const supplierIdsSet = new Set([
        ...invitations.map(i => i.supplierId),
        ...quotes.map(q => q.supplierId),
      ]);
      const supplierIds = Array.from(supplierIdsSet);
      const suppliers = supplierIds.length > 0
        ? await db.query.suppliers.findMany({
            where: inArray(schema.suppliers.id, supplierIds),
          })
        : [];
      const safeSuppliers = suppliers.map(({ passwordHash: _, ...s }) => s);
      return { rfq, invitations, quotes, suppliers: safeSuppliers };
    }),

  // ── تحديث RFQ ────────────────────────────────────────────────────────────
  update: publicProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(3).optional(),
      description: z.string().optional(),
      items: z.array(rfqItemSchema).optional(),
      deliveryLocation: z.string().optional(),
      deliveryDays: z.number().optional(),
      paymentTerms: z.string().optional(),
      warrantyMonths: z.number().optional(),
      submissionDeadline: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.update(schema.rfqs)
        .set({ ...data, updatedAt: Date.now() })
        .where(eq(schema.rfqs.id, id));
      return { success: true };
    }),

  // ── إرسال الدعوات للموردين ───────────────────────────────────────────────
  sendInvitations: publicProcedure
    .input(z.object({
      rfqId: z.number(),
      supplierIds: z.array(z.number()).min(1),
    }))
    .mutation(async ({ input }) => {
      const rfq = await db.query.rfqs.findFirst({ where: eq(schema.rfqs.id, input.rfqId) });
      if (!rfq) throw new TRPCError({ code: "NOT_FOUND" });

      const now = Date.now();
      const results = [];

      for (const supplierId of input.supplierIds) {
        // التحقق من عدم وجود دعوة سابقة
        const existing = await db.query.rfqInvitations.findFirst({
          where: and(
            eq(schema.rfqInvitations.rfqId, input.rfqId),
            eq(schema.rfqInvitations.supplierId, supplierId)
          ),
        });
        if (existing) continue;

        const [inv] = await db.insert(schema.rfqInvitations).values({
          rfqId: input.rfqId,
          supplierId,
          status: "sent",
          sentAt: now,
        });

        // إشعار المورد
        const supplier = await db.query.suppliers.findFirst({ where: eq(schema.suppliers.id, supplierId) });
        if (supplier) {
          notifySupplier(supplier, rfq);
        }
        results.push((inv as any).insertId);
      }

      // تحديث حالة الـ RFQ إلى published
      await db.update(schema.rfqs)
        .set({ status: "published", updatedAt: now })
        .where(eq(schema.rfqs.id, input.rfqId));

      return { success: true, invitationsSent: results.length };
    }),

  // ── تقديم عرض سعر (من المورد) ───────────────────────────────────────────
  submitQuote: publicProcedure
    .input(z.object({
      rfqId: z.number(),
      supplierId: z.number(),
      supplierToken: z.string(),
      totalPrice: z.number().min(0),
      lineItems: z.array(lineItemSchema),
      deliveryDays: z.number().optional(),
      paymentTerms: z.string().optional(),
      warrantyMonths: z.number().optional(),
      validUntil: z.number().optional(),
      notes: z.string().optional(),
      technicalNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // التحقق من صحة الـ token
      const session = await db.query.supplierSessions.findFirst({
        where: and(
          eq(schema.supplierSessions.token, input.supplierToken),
          eq(schema.supplierSessions.supplierId, input.supplierId)
        ),
      });
      if (!session || session.expiresAt < Date.now()) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const rfq = await db.query.rfqs.findFirst({ where: eq(schema.rfqs.id, input.rfqId) });
      if (!rfq) throw new TRPCError({ code: "NOT_FOUND" });
      if (rfq.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "هذا الطلب ملغي" });
      if (rfq.submissionDeadline < Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "انتهى موعد تقديم العروض" });

      const now = Date.now();
      const count = await db.query.supplierQuotes.findMany({ where: eq(schema.supplierQuotes.rfqId, input.rfqId) });
      const quoteNumber = `Q-${rfq.rfqNumber}-${String(count.length + 1).padStart(2, "0")}`;

      // التحقق من وجود عرض سابق
      const existingQuote = await db.query.supplierQuotes.findFirst({
        where: and(
          eq(schema.supplierQuotes.rfqId, input.rfqId),
          eq(schema.supplierQuotes.supplierId, input.supplierId)
        ),
      });

      if (existingQuote) {
        // تحديث العرض الموجود
        await db.update(schema.supplierQuotes)
          .set({
            totalPrice: input.totalPrice,
            lineItems: input.lineItems,
            deliveryDays: input.deliveryDays || null,
            paymentTerms: input.paymentTerms || null,
            warrantyMonths: input.warrantyMonths || null,
            validUntil: input.validUntil || null,
            notes: input.notes || null,
            technicalNotes: input.technicalNotes || null,
            updatedAt: now,
          })
          .where(eq(schema.supplierQuotes.id, existingQuote.id));

        // تحديث حالة الدعوة
        await db.update(schema.rfqInvitations)
          .set({ status: "submitted", respondedAt: now })
          .where(and(
            eq(schema.rfqInvitations.rfqId, input.rfqId),
            eq(schema.rfqInvitations.supplierId, input.supplierId)
          ));

        return { success: true, quoteId: existingQuote.id, updated: true };
      }

      const [result] = await db.insert(schema.supplierQuotes).values({
        rfqId: input.rfqId,
        supplierId: input.supplierId,
        quoteNumber,
        totalPrice: input.totalPrice,
        lineItems: input.lineItems,
        deliveryDays: input.deliveryDays || null,
        paymentTerms: input.paymentTerms || null,
        warrantyMonths: input.warrantyMonths || null,
        validUntil: input.validUntil || null,
        notes: input.notes || null,
        technicalNotes: input.technicalNotes || null,
        status: "submitted",
        createdAt: now,
        updatedAt: now,
      });

      // تحديث حالة الدعوة
      await db.update(schema.rfqInvitations)
        .set({ status: "submitted", respondedAt: now })
        .where(and(
          eq(schema.rfqInvitations.rfqId, input.rfqId),
          eq(schema.rfqInvitations.supplierId, input.supplierId)
        ));

      // تحديث إحصائيات المورد
      const supplier = await db.query.suppliers.findFirst({ where: eq(schema.suppliers.id, input.supplierId) });
      if (supplier) {
        await db.update(schema.suppliers)
          .set({ totalQuotes: (supplier.totalQuotes || 0) + 1, updatedAt: now })
          .where(eq(schema.suppliers.id, input.supplierId));
      }

      // إشعار الإدارة
      notifyAdminAboutNewQuote(rfq.rfqNumber, rfq.title, input.totalPrice);

      return { success: true, quoteId: (result as any).insertId, updated: false };
    }),

  // ── تقييم العروض بالذكاء الاصطناعي ─────────────────────────────────────
  evaluateWithAI: publicProcedure
    .input(z.object({ rfqId: z.number() }))
    .mutation(async ({ input }) => {
      const rfq = await db.query.rfqs.findFirst({ where: eq(schema.rfqs.id, input.rfqId) });
      if (!rfq) throw new TRPCError({ code: "NOT_FOUND" });

      const quotes = await db.query.supplierQuotes.findMany({
        where: eq(schema.supplierQuotes.rfqId, input.rfqId),
        orderBy: (q, { asc }) => [asc(q.totalPrice)],
      });

      if (quotes.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "لا توجد عروض لتقييمها" });

      const supplierIds = quotes.map(q => q.supplierId);
      const suppliers = await db.query.suppliers.findMany({
        where: inArray(schema.suppliers.id, supplierIds),
      });

      // بناء بيانات التقييم
      const quotesData = quotes.map(q => {
        const supplier = suppliers.find(s => s.id === q.supplierId);
        return {
          quoteId: q.id,
          supplierName: supplier?.companyName || "غير معروف",
          totalPrice: q.totalPrice,
          deliveryDays: q.deliveryDays,
          paymentTerms: q.paymentTerms,
          warrantyMonths: q.warrantyMonths,
          rating: supplier?.rating || 0,
          wonQuotes: supplier?.wonQuotes || 0,
          totalQuotes: supplier?.totalQuotes || 0,
          notes: q.notes,
        };
      });

      const minPrice = Math.min(...quotes.map(q => q.totalPrice));
      const maxPrice = Math.max(...quotes.map(q => q.totalPrice));
      const minDelivery = Math.min(...quotes.filter(q => q.deliveryDays).map(q => q.deliveryDays!));

      const prompt = `أنت خبير مشتريات متخصص. قيّم عروض الأسعار التالية لطلب "${rfq.title}" وأعطِ توصية واضحة.

معلومات الطلب:
- العنوان: ${rfq.title}
- المدة المطلوبة: ${rfq.deliveryDays ? rfq.deliveryDays + " يوم" : "غير محدد"}
- شروط الدفع المطلوبة: ${rfq.paymentTerms || "غير محدد"}
- الضمان المطلوب: ${rfq.warrantyMonths ? rfq.warrantyMonths + " شهر" : "غير محدد"}

العروض المقدمة:
${quotesData.map((q, i) => `
${i + 1}. ${q.supplierName}
   - السعر الإجمالي: ${q.totalPrice.toLocaleString()} ر.س
   - مدة التوريد: ${q.deliveryDays ? q.deliveryDays + " يوم" : "غير محدد"}
   - شروط الدفع: ${q.paymentTerms || "غير محدد"}
   - الضمان: ${q.warrantyMonths ? q.warrantyMonths + " شهر" : "غير محدد"}
   - تقييم المورد: ${q.rating}/5 (${q.wonQuotes}/${q.totalQuotes} طلبات ناجحة)
`).join("")}

قيّم كل عرض على مقياس 0-100 بناءً على:
1. السعر (30%): أفضل سعر = ${minPrice.toLocaleString()} ر.س
2. مدة التوريد (25%): أسرع توريد = ${minDelivery} يوم
3. شروط الدفع (15%): كلما كانت أطول كلما كانت أفضل
4. الضمان (10%): كلما كان أطول كلما كان أفضل
5. سجل المورد (20%): التقييم والطلبات الناجحة

أعد النتيجة بتنسيق JSON فقط بدون أي نص إضافي:
{
  "scores": [
    {
      "quoteId": <رقم>,
      "totalScore": <0-100>,
      "breakdown": {
        "price": <0-30>,
        "delivery": <0-25>,
        "payment": <0-15>,
        "warranty": <0-10>,
        "history": <0-20>
      },
      "strengths": ["نقطة قوة 1", "نقطة قوة 2"],
      "weaknesses": ["نقطة ضعف 1"],
      "recommendation": "تعليق مختصر"
    }
  ],
  "winner": {
    "quoteId": <رقم>,
    "reason": "سبب الاختيار بالعربية (3-4 جمل)"
  },
  "summary": "ملخص عام للتقييم بالعربية (2-3 جمل)"
}`;

      let evaluation: any;
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "أنت خبير مشتريات. أجب بـ JSON فقط بدون markdown أو نص إضافي." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" } as any,
        });
        const content = response.choices[0]?.message?.content || "{}";
        evaluation = JSON.parse(content);
      } catch (e) {
        // fallback: تقييم بسيط بناءً على السعر فقط
        evaluation = generateFallbackEvaluation(quotesData, minPrice, maxPrice);
      }

      // حفظ التقييم في قاعدة البيانات
      const now = Date.now();
      for (const score of evaluation.scores || []) {
        await db.update(schema.supplierQuotes)
          .set({
            aiScore: score.totalScore,
            aiScoreBreakdown: score.breakdown,
            aiRecommendation: score.recommendation,
            updatedAt: now,
          })
          .where(eq(schema.supplierQuotes.id, score.quoteId));
      }

      await db.update(schema.rfqs)
        .set({ status: "evaluated", aiEvaluation: evaluation, updatedAt: now })
        .where(eq(schema.rfqs.id, input.rfqId));

      return { success: true, evaluation };
    }),

  // ── ترسية العقد على مورد ─────────────────────────────────────────────────
  award: publicProcedure
    .input(z.object({
      rfqId: z.number(),
      quoteId: z.number(),
      awardNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const quote = await db.query.supplierQuotes.findFirst({ where: eq(schema.supplierQuotes.id, input.quoteId) });
      if (!quote) throw new TRPCError({ code: "NOT_FOUND" });

      const now = Date.now();

      // تحديث حالة الـ RFQ
      await db.update(schema.rfqs)
        .set({
          status: "awarded",
          awardedSupplierId: quote.supplierId,
          awardedAt: now,
          awardNotes: input.awardNotes || null,
          updatedAt: now,
        })
        .where(eq(schema.rfqs.id, input.rfqId));

      // تحديث حالة العروض
      const allQuotes = await db.query.supplierQuotes.findMany({
        where: eq(schema.supplierQuotes.rfqId, input.rfqId),
      });
      for (const q of allQuotes) {
        await db.update(schema.supplierQuotes)
          .set({ status: q.id === input.quoteId ? "awarded" : "rejected", updatedAt: now })
          .where(eq(schema.supplierQuotes.id, q.id));
      }

      // تحديث إحصائيات المورد الفائز
      const supplier = await db.query.suppliers.findFirst({ where: eq(schema.suppliers.id, quote.supplierId) });
      if (supplier) {
        await db.update(schema.suppliers)
          .set({ wonQuotes: (supplier.wonQuotes || 0) + 1, updatedAt: now })
          .where(eq(schema.suppliers.id, quote.supplierId));
      }

      // إنشاء أمر شراء تلقائي
      const rfq = await db.query.rfqs.findFirst({ where: eq(schema.rfqs.id, input.rfqId) });
      const poCount = await db.query.purchaseOrders.findMany();
      const poNumber = `PO-${new Date().getFullYear()}-${String(poCount.length + 1).padStart(3, "0")}`;

      const [poResult] = await db.insert(schema.purchaseOrders).values({
        poNumber,
        rfqId: input.rfqId,
        supplierId: quote.supplierId,
        quoteId: input.quoteId,
        title: rfq?.title || "أمر شراء",
        items: rfq?.items || [],
        totalPrice: quote.totalPrice,
        currency: quote.currency || "SAR",
        deliveryDays: quote.deliveryDays || null,
        paymentTerms: quote.paymentTerms || null,
        deliveryLocation: rfq?.deliveryLocation || null,
        status: "issued",
        issuedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, poId: (poResult as any).insertId, poNumber };
    }),

  // ── قائمة أوامر الشراء ───────────────────────────────────────────────────
  listPurchaseOrders: publicProcedure
    .input(z.object({
      status: z.enum(["issued","confirmed","in_progress","delivered","invoiced","paid","cancelled"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const pos = await db.query.purchaseOrders.findMany({
        orderBy: (po, { desc }) => [desc(po.createdAt)],
        where: input?.status ? eq(schema.purchaseOrders.status, input.status) : undefined,
      });
      const result = await Promise.all(pos.map(async (po) => {
        const supplier = await db.query.suppliers.findFirst({ where: eq(schema.suppliers.id, po.supplierId) });
        return { ...po, supplier: supplier ? { id: supplier.id, companyName: supplier.companyName, contactName: supplier.contactName, phone: supplier.phone } : null };
      }));
      return result;
    }),

  // ── تحديث حالة أمر الشراء ───────────────────────────────────────────────
  updatePOStatus: publicProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["issued","confirmed","in_progress","delivered","invoiced","paid","cancelled"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const update: any = { status: input.status, updatedAt: Date.now() };
      if (input.status === "confirmed") update.confirmedAt = Date.now();
      if (input.status === "delivered") update.deliveredAt = Date.now();
      if (input.notes) update.notes = input.notes;
      await db.update(schema.purchaseOrders)
        .set(update)
        .where(eq(schema.purchaseOrders.id, input.id));
      return { success: true };
    }),

  // ── تحديث حالة عرض السعر يدوياً ─────────────────────────────────────────
  updateQuoteStatus: publicProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["submitted","under_review","shortlisted","awarded","rejected"]),
      adminNotes: z.string().optional(),
      adminScore: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      await db.update(schema.supplierQuotes)
        .set({
          status: input.status,
          adminNotes: input.adminNotes || null,
          adminScore: input.adminScore || null,
          updatedAt: Date.now(),
        })
        .where(eq(schema.supplierQuotes.id, input.id));
      return { success: true };
    }),

  // ── تحديث حالة الدعوة (قبول/رفض من المورد) ─────────────────────────────
  respondToInvitation: publicProcedure
    .input(z.object({
      invitationId: z.number(),
      supplierId: z.number(),
      supplierToken: z.string(),
      response: z.enum(["accepted", "declined"]),
      declineReason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // التحقق من الـ token
      const session = await db.query.supplierSessions.findFirst({
        where: and(
          eq(schema.supplierSessions.token, input.supplierToken),
          eq(schema.supplierSessions.supplierId, input.supplierId)
        ),
      });
      if (!session || session.expiresAt < Date.now()) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      await db.update(schema.rfqInvitations)
        .set({
          status: input.response,
          respondedAt: Date.now(),
          declineReason: input.declineReason || null,
          viewedAt: Date.now(),
        })
        .where(and(
          eq(schema.rfqInvitations.id, input.invitationId),
          eq(schema.rfqInvitations.supplierId, input.supplierId)
        ));
      return { success: true };
    }),

  // ── تحديث حالة الدعوة إلى "viewed" ─────────────────────────────────────
  markInvitationViewed: publicProcedure
    .input(z.object({
      invitationId: z.number(),
      supplierId: z.number(),
      supplierToken: z.string(),
    }))
    .mutation(async ({ input }) => {
      const session = await db.query.supplierSessions.findFirst({
        where: and(
          eq(schema.supplierSessions.token, input.supplierToken),
          eq(schema.supplierSessions.supplierId, input.supplierId)
        ),
      });
      if (!session || session.expiresAt < Date.now()) return { success: false };

      await db.update(schema.rfqInvitations)
        .set({ status: "viewed", viewedAt: Date.now() })
        .where(and(
          eq(schema.rfqInvitations.id, input.invitationId),
          eq(schema.rfqInvitations.supplierId, input.supplierId),
          eq(schema.rfqInvitations.status, "sent")
        ));
      return { success: true };
    }),
});

// ── Helpers ──────────────────────────────────────────────────────────────────
async function notifySupplier(supplier: any, rfq: any) {
  const apiUrl = process.env.BUILT_IN_FORGE_API_URL;
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  if (!apiUrl || !apiKey) return;
  try {
    await fetch(`${apiUrl}/v1/notification/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        open_id: supplier.email, // fallback
        title: `📋 دعوة لتقديم عرض سعر — ${rfq.rfqNumber}`,
        content: `تمت دعوتك لتقديم عرض سعر لـ: ${rfq.title}\nالموعد النهائي: ${new Date(rfq.submissionDeadline).toLocaleDateString("ar-SA")}\n\nيرجى تسجيل الدخول لعرض التفاصيل وتقديم عرضك.`,
      }),
    });
  } catch { /* non-blocking */ }
}

async function notifyAdminAboutNewQuote(rfqNumber: string, rfqTitle: string, price: number) {
  const apiUrl = process.env.BUILT_IN_FORGE_API_URL;
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  if (!apiUrl || !apiKey || !ownerOpenId) return;
  try {
    await fetch(`${apiUrl}/v1/notification/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        open_id: ownerOpenId,
        title: `💰 عرض سعر جديد — ${rfqNumber}`,
        content: `تم استلام عرض سعر جديد لـ: ${rfqTitle}\nالسعر: ${price.toLocaleString()} ر.س\n\nيمكنك مراجعة العروض ومقارنتها من لوحة التحكم.`,
      }),
    });
  } catch { /* non-blocking */ }
}

function generateFallbackEvaluation(quotesData: any[], minPrice: number, maxPrice: number) {
  const priceRange = maxPrice - minPrice || 1;
  const scores = quotesData.map((q) => {
    const priceScore = 30 * (1 - (q.totalPrice - minPrice) / priceRange);
    const deliveryScore = q.deliveryDays ? Math.max(0, 25 - q.deliveryDays / 10) : 12;
    const paymentScore = q.paymentTerms ? 10 : 5;
    const warrantyScore = q.warrantyMonths ? Math.min(10, q.warrantyMonths) : 5;
    const historyScore = Math.min(20, (q.rating / 5) * 15 + (q.wonQuotes / Math.max(1, q.totalQuotes)) * 5);
    const totalScore = Math.round(priceScore + deliveryScore + paymentScore + warrantyScore + historyScore);
    return {
      quoteId: q.quoteId,
      totalScore,
      breakdown: {
        price: Math.round(priceScore),
        delivery: Math.round(deliveryScore),
        payment: Math.round(paymentScore),
        warranty: Math.round(warrantyScore),
        history: Math.round(historyScore),
      },
      strengths: q.totalPrice === minPrice ? ["أفضل سعر"] : [],
      weaknesses: q.totalPrice === maxPrice ? ["أعلى سعر"] : [],
      recommendation: `السعر: ${q.totalPrice.toLocaleString()} ر.س`,
    };
  });

  const winner = scores.reduce((a, b) => a.totalScore > b.totalScore ? a : b);
  return {
    scores,
    winner: { quoteId: winner.quoteId, reason: "أفضل نقاط إجمالية بناءً على السعر والتوريد والسجل." },
    summary: "تم التقييم بناءً على معايير السعر ومدة التوريد وشروط الدفع والضمان وسجل المورد.",
  };
}
