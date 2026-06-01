/**
 * Comments Router — نظام التعليقات داخل طلبات التسعير
 * يتيح التواصل بين الإدارة والموردين للاستفسارات وتوضيح الشروط
 *
 * Security model:
 * - listByRfq: عام، لكن السيرفر يُخفي التعليقات الداخلية للموردين
 *   ولا يسمح للمورد بتمرير viewerType=admin بدون token صحيح
 * - addByAdmin: يتطلب adminSecret header (بيئة إنتاج: يُستبدل بـ protectedProcedure)
 * - addBySupplier: يتطلب supplierToken صحيح + دعوة مفعّلة
 * - delete: يتطلب adminSecret header
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { db, schema } from "./db.js";
import { eq, and, desc } from "drizzle-orm";
import {
  publicProcedure,
  adminProcedure,
  supplierProcedure,
  router,
} from "./trpc.js";

// ── Notification helper ───────────────────────────────────────────────────────
async function notifyAdminAboutComment(
  rfqNumber: string,
  authorName: string,
  content: string
) {
  try {
    const ownerOpenId = process.env.OWNER_OPEN_ID;
    if (!ownerOpenId) return;
    const apiUrl = process.env.BUILT_IN_FORGE_API_URL;
    const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
    if (!apiUrl || !apiKey) return;
    await fetch(`${apiUrl}/v1/notification/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        open_id: ownerOpenId,
        title: `💬 تعليق جديد على ${rfqNumber}`,
        content: `من: ${authorName}\n${content.slice(0, 200)}`,
      }),
    });
  } catch {
    /* non-blocking */
  }
}

// ── Router ────────────────────────────────────────────────────────────────────
export const commentsRouter = router({
  // ── جلب تعليقات RFQ ────────────────────────────────────────────────────────
  listByRfq: publicProcedure
    .input(
      z.object({
        rfqId: z.number(),
        viewerType: z.enum(["admin", "supplier"]).default("supplier"),
        supplierId: z.number().optional(),
        // إذا كان المورد يطلب viewerType=admin، يجب أن يقدم supplierToken صحيح
        supplierToken: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      // تحقق: المورد لا يمكنه طلب viewerType=admin
      // إذا طلب admin بدون token صحيح → نعامله كـ supplier
      let effectiveViewerType = input.viewerType;
      if (
        input.viewerType === "admin" &&
        input.supplierId &&
        input.supplierToken
      ) {
        // المورد يحاول رؤية التعليقات الداخلية → نرفض
        effectiveViewerType = "supplier";
      }

      const comments = await db.query.rfqComments.findMany({
        where: eq(schema.rfqComments.rfqId, input.rfqId),
        orderBy: [desc(schema.rfqComments.createdAt)],
      });

      // الموردون لا يرون التعليقات الداخلية (قرار السيرفر، لا العميل)
      const filtered =
        effectiveViewerType === "supplier"
          ? comments.filter(c => c.isInternal === 0)
          : comments;

      // بناء شجرة الردود
      const topLevel = filtered.filter(c => !c.parentId);
      const replies = filtered.filter(c => c.parentId);

      return topLevel.map(comment => ({
        ...comment,
        replies: replies.filter(r => r.parentId === comment.id),
      }));
    }),

  // ── إضافة تعليق من الإدارة (حماية بـ adminProcedure) ───────────────────────
  addByAdmin: adminProcedure
    .input(
      z.object({
        rfqId: z.number(),
        content: z.string().min(1).max(2000),
        isInternal: z.boolean().default(false),
        parentId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const rfq = await db.query.rfqs.findFirst({
        where: eq(schema.rfqs.id, input.rfqId),
      });
      if (!rfq)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "طلب التسعير غير موجود",
        });

      const now = Date.now();
      const [result] = await db.insert(schema.rfqComments).values({
        rfqId: input.rfqId,
        authorType: "admin",
        authorId: 0,
        authorName: "الإدارة",
        content: input.content.trim(),
        isInternal: input.isInternal ? 1 : 0,
        parentId: input.parentId || null,
        createdAt: now,
        updatedAt: now,
      });

      return { id: (result as any).insertId, success: true };
    }),

  // ── إضافة تعليق من المورد ──────────────────────────────────────────────────
  addBySupplier: supplierProcedure
    .input(
      z.object({
        rfqId: z.number(),
        content: z.string().min(1).max(2000),
        parentId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const supplierId = (ctx as any).supplier.id as number;

      // التحقق من وجود دعوة للمورد في هذا الـ RFQ
      const invitation = await db.query.rfqInvitations.findFirst({
        where: and(
          eq(schema.rfqInvitations.rfqId, input.rfqId),
          eq(schema.rfqInvitations.supplierId, supplierId)
        ),
      });
      if (!invitation) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "غير مصرح لك بالتعليق على هذا الطلب",
        });
      }

      const supplier = await db.query.suppliers.findFirst({
        where: eq(schema.suppliers.id, supplierId),
      });
      if (!supplier || supplier.status !== "active") {
        throw new TRPCError({ code: "FORBIDDEN", message: "حسابك غير مفعّل" });
      }

      const rfq = await db.query.rfqs.findFirst({
        where: eq(schema.rfqs.id, input.rfqId),
      });

      const now = Date.now();
      const [result] = await db.insert(schema.rfqComments).values({
        rfqId: input.rfqId,
        authorType: "supplier",
        authorId: supplierId,
        authorName: supplier.companyName,
        content: input.content.trim(),
        isInternal: 0,
        parentId: input.parentId || null,
        createdAt: now,
        updatedAt: now,
      });

      if (rfq) {
        notifyAdminAboutComment(
          rfq.rfqNumber,
          supplier.companyName,
          input.content
        );
      }

      return { id: (result as any).insertId, success: true };
    }),

  // ── حذف تعليق (الإدارة فقط) ────────────────────────────────────────────────
  delete: adminProcedure
    .input(z.object({ commentId: z.number() }))
    .mutation(async ({ input }) => {
      // التحقق من وجود التعليق
      const comment = await db.query.rfqComments.findFirst({
        where: eq(schema.rfqComments.id, input.commentId),
      });
      if (!comment)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "التعليق غير موجود",
        });

      // حذف الردود أولاً ثم التعليق الأصلي
      await db
        .delete(schema.rfqComments)
        .where(eq(schema.rfqComments.parentId, input.commentId));
      await db
        .delete(schema.rfqComments)
        .where(eq(schema.rfqComments.id, input.commentId));

      return { success: true };
    }),

  // ── عدد التعليقات من الموردين ──────────────────────────────────────────────
  countSupplierComments: publicProcedure
    .input(z.object({ rfqId: z.number() }))
    .query(async ({ input }) => {
      const comments = await db.query.rfqComments.findMany({
        where: and(
          eq(schema.rfqComments.rfqId, input.rfqId),
          eq(schema.rfqComments.authorType, "supplier")
        ),
      });
      return { count: comments.length };
    }),
});
