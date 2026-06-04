// ============================================================
// Complaints Router — CRUD + messages for admin complaints management
// ============================================================
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { db, schema } from "./db.js";
import { eq, desc, and } from "drizzle-orm";
import { router, adminProcedure, distributorProcedure } from "./trpc.js";

const complaintStatusEnum = z.enum([
  "open",
  "under_review",
  "resolved",
  "rejected",
  "return_pending",
]);

const complaintTypeEnum = z.enum([
  "size",
  "color",
  "damage",
  "shortage",
  "delay",
  "quality",
  "other",
]);

export const complaintsRouter = router({
  // ── List all complaints with their messages ──────────────────────────────
  list: adminProcedure
    .input(z.object({ distributorId: z.number().int().optional() }).optional())
    .query(async ({ input }) => {
      const rows = await db.query.complaints.findMany({
        where: input?.distributorId !== undefined
          ? eq(schema.complaints.distributorId, input.distributorId)
          : undefined,
        orderBy: [desc(schema.complaints.createdAt)],
      });
      const messages = await db.query.complaintMessages.findMany({
        orderBy: [desc(schema.complaintMessages.createdAt)],
      });
      return rows.map(c => ({
        ...c,
        messages: messages.filter(m => m.complaintId === c.id),
      }));
    }),

  // ── Create a new complaint ────────────────────────────────────────────────
  create: adminProcedure
    .input(
      z.object({
        distributorId: z.number().optional(),
        distributorName: z.string().min(1),
        companyName: z.string().optional(),
        orderNumber: z.string().min(1),
        product: z.string().min(1),
        type: complaintTypeEnum,
        description: z.string().min(1),
        images: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ input }) => {
      const now = Date.now();
      // Generate ticket number: TKT-YYYY-NNNN
      const year = new Date().getFullYear();
      const existingCount = (await db.query.complaints.findMany()).length;
      const ticketNumber = `TKT-${year}-${String(existingCount + 1).padStart(4, "0")}`;

      const [result] = await db.insert(schema.complaints).values({
        ticketNumber,
        distributorId: input.distributorId ?? null,
        distributorName: input.distributorName,
        companyName: input.companyName ?? null,
        orderNumber: input.orderNumber,
        product: input.product,
        type: input.type,
        description: input.description,
        images: input.images,
        createdAt: now,
        updatedAt: now,
      });
      const id = (result as any).insertId;
      // Add initial message from distributor
      await db.insert(schema.complaintMessages).values({
        complaintId: id,
        from: "distributor",
        text: input.description,
        date: new Date(now).toISOString().split("T")[0],
        createdAt: now,
      });
      return { id, ticketNumber, success: true };
    }),

  // ── Update status + optional admin reply ─────────────────────────────────
  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: complaintStatusEnum,
        reply: z.string().optional(),
        satisfactionRating: z.number().int().min(1).max(5).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const now = Date.now();
      const today = new Date(now).toISOString().split("T")[0];

      await db
        .update(schema.complaints)
        .set({
          status: input.status,
          updatedAt: now,
          ...(input.status === "resolved" ? { resolvedAt: now } : {}),
          ...(input.satisfactionRating !== undefined
            ? { satisfactionRating: input.satisfactionRating }
            : {}),
        })
        .where(eq(schema.complaints.id, input.id));

      if (input.reply?.trim()) {
        await db.insert(schema.complaintMessages).values({
          complaintId: input.id,
          from: "admin",
          text: input.reply.trim(),
          date: today,
          createdAt: now,
        });
      }
      return { success: true };
    }),

  // ── myComplaints (Distributor) ──────────────────────────────────────────
  myComplaints: distributorProcedure.query(async ({ ctx }) => {
    const rows = await db.query.complaints.findMany({
      where: eq(schema.complaints.distributorId, ctx.distributor.id),
      orderBy: [desc(schema.complaints.createdAt)],
    });
    const ids = rows.map((c) => c.id);
    const messages = ids.length
      ? await db.query.complaintMessages.findMany({
          orderBy: [desc(schema.complaintMessages.createdAt)],
        })
      : [];
    return rows.map((c) => ({
      ...c,
      messages: messages.filter((m) => m.complaintId === c.id),
    }));
  }),

  // ── submitComplaint (Distributor) ───────────────────────────────────────
  submitComplaint: distributorProcedure
    .input(
      z.object({
        orderNumber: z.string().min(1),
        product: z.string().min(1),
        type: complaintTypeEnum,
        description: z.string().min(1),
        images: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = Date.now();
      const year = new Date().getFullYear();
      const existingCount = (await db.query.complaints.findMany()).length;
      const ticketNumber = `TKT-${year}-${String(existingCount + 1).padStart(4, "0")}`;
      const [result] = await db.insert(schema.complaints).values({
        ticketNumber,
        distributorId: ctx.distributor.id,
        distributorName: ctx.distributor.name,
        companyName: ctx.distributor.company ?? null,
        orderNumber: input.orderNumber,
        product: input.product,
        type: input.type,
        description: input.description,
        images: input.images,
        createdAt: now,
        updatedAt: now,
      });
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const id = (result as any).insertId; // insertId من نتيجة الإدراج — نفس نمط create الموجود
      
      await db.insert(schema.complaintMessages).values({
        complaintId: id,
        from: "distributor",
        text: input.description,
        date: new Date(now).toISOString().split("T")[0],
        createdAt: now,
      });
      return { id, ticketNumber, success: true };
    }),

  // ── addReply (Distributor) ──────────────────────────────────────────────
  addReply: distributorProcedure
    .input(z.object({ complaintId: z.number(), text: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const complaint = await db.query.complaints.findFirst({
        where: and(
          eq(schema.complaints.id, input.complaintId),
          eq(schema.complaints.distributorId, ctx.distributor.id)
        ),
      });
      if (!complaint) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الشكوى غير موجودة" });
      }
      const now = Date.now();
      await db.insert(schema.complaintMessages).values({
        complaintId: input.complaintId,
        from: "distributor",
        text: input.text.trim(),
        date: new Date(now).toISOString().split("T")[0],
        createdAt: now,
      });
      await db
        .update(schema.complaints)
        .set({ updatedAt: now })
        .where(eq(schema.complaints.id, input.complaintId));
      return { success: true };
    }),

  // ── Seed sample complaints for testing ───────────────────────────────────
  seed: adminProcedure.mutation(async () => {
    const existing = await db.query.complaints.findMany();
    if (existing.length > 0) return { skipped: true, count: existing.length };

    const now = Date.now();
    const year = new Date().getFullYear();

    const samples = [
      {
        ticketNumber: `TKT-${year}-0001`,
        distributorName: "أحمد الزهراني",
        companyName: "شركة النخبة",
        orderNumber: "SND-0001",
        product: "باب خشبي كلاسيكي 90×210",
        type: "damage" as const,
        status: "open" as const,
        description: "وصلت الشحنة وبها كسر واضح في إطار الباب الأول من الأسفل.",
        images: [],
        createdAt: now - 6 * 86400000,
        updatedAt: now - 6 * 86400000,
      },
      {
        ticketNumber: `TKT-${year}-0002`,
        distributorName: "محمد العمري",
        companyName: "مؤسسة البناء الحديث",
        orderNumber: "SND-0002",
        product: "باب خارجي فاخر 100×220",
        type: "color" as const,
        status: "under_review" as const,
        description:
          "اللون المستلم مختلف تماماً عن العينة المعتمدة. طلبنا الجوزي الداكن ووصل العسلي الفاتح.",
        images: [],
        createdAt: now - 8 * 86400000,
        updatedAt: now - 7 * 86400000,
      },
      {
        ticketNumber: `TKT-${year}-0003`,
        distributorName: "فهد القحطاني",
        companyName: "مجموعة الفيصل",
        orderNumber: "SND-0003",
        product: "باب داخلي عصري 80×200",
        type: "shortage" as const,
        status: "resolved" as const,
        description: "الطلب كان 6 أبواب، وصل 5 أبواب فقط.",
        images: [],
        satisfactionRating: 5,
        resolvedAt: now - 3 * 86400000,
        createdAt: now - 14 * 86400000,
        updatedAt: now - 3 * 86400000,
      },
    ];

    const msgs: {
      ticketIdx: number;
      from: "admin" | "distributor";
      text: string;
      daysAgo: number;
    }[] = [
      {
        ticketIdx: 0,
        from: "distributor",
        text: samples[0].description,
        daysAgo: 6,
      },
      {
        ticketIdx: 1,
        from: "distributor",
        text: samples[1].description,
        daysAgo: 8,
      },
      {
        ticketIdx: 1,
        from: "admin",
        text: "تم استلام شكواكم وجارٍ مراجعة أمر الإنتاج للتحقق من المواصفات.",
        daysAgo: 7,
      },
      {
        ticketIdx: 2,
        from: "distributor",
        text: samples[2].description,
        daysAgo: 14,
      },
      {
        ticketIdx: 2,
        from: "admin",
        text: "تم التحقق من المشكلة وسيتم إرسال الباب المفقود خلال 3 أيام.",
        daysAgo: 13,
      },
      {
        ticketIdx: 2,
        from: "distributor",
        text: "تم استلام الباب المفقود. شكراً على سرعة الاستجابة.",
        daysAgo: 3,
      },
    ];

    const ids: number[] = [];
    for (const s of samples) {
      const [r] = await db.insert(schema.complaints).values(s);
      ids.push((r as any).insertId);
    }

    for (const m of msgs) {
      const ts = now - m.daysAgo * 86400000;
      await db.insert(schema.complaintMessages).values({
        complaintId: ids[m.ticketIdx],
        from: m.from,
        text: m.text,
        date: new Date(ts).toISOString().split("T")[0],
        createdAt: ts,
      });
    }

    return { success: true, count: samples.length };
  }),
});
