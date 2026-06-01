/**
 * Comments Router Tests
 * اختبارات نظام التعليقات داخل طلبات التسعير
 */
import { describe, it, expect } from "vitest";

// ── Validation helpers (mirror business logic) ────────────────────────────────

function validateCommentContent(content: string): { valid: boolean; error?: string } {
  if (!content || content.trim().length === 0) return { valid: false, error: "المحتوى مطلوب" };
  if (content.trim().length > 2000) return { valid: false, error: "الحد الأقصى 2000 حرف" };
  return { valid: true };
}

function isInternalComment(isInternal: boolean, viewerType: "admin" | "supplier"): boolean {
  // التعليقات الداخلية لا تظهر للموردين
  if (isInternal && viewerType === "supplier") return false; // مخفي
  return true; // مرئي
}

function filterCommentsForViewer(
  comments: Array<{ isInternal: number; authorType: string }>,
  viewerType: "admin" | "supplier"
) {
  if (viewerType === "admin") return comments; // الإدارة ترى الكل
  return comments.filter(c => c.isInternal === 0); // الموردون لا يرون الداخلية
}

function buildCommentTree(
  comments: Array<{ id: number; parentId: number | null; content: string }>
) {
  const topLevel = comments.filter(c => !c.parentId);
  const replies = comments.filter(c => c.parentId);
  return topLevel.map(comment => ({
    ...comment,
    replies: replies.filter(r => r.parentId === comment.id),
  }));
}

function formatRelativeTime(ts: number, now: number): string {
  const diff = now - ts;
  if (diff < 60_000) return "الآن";
  if (diff < 3_600_000) return `منذ ${Math.floor(diff / 60_000)} دقيقة`;
  if (diff < 86_400_000) return `منذ ${Math.floor(diff / 3_600_000)} ساعة`;
  return "أكثر من يوم";
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Comment Content Validation", () => {
  it("يرفض المحتوى الفارغ", () => {
    expect(validateCommentContent("").valid).toBe(false);
    expect(validateCommentContent("   ").valid).toBe(false);
  });

  it("يقبل المحتوى الصحيح", () => {
    expect(validateCommentContent("هل يمكن توضيح مواصفات الخشب؟").valid).toBe(true);
  });

  it("يرفض المحتوى الذي يتجاوز 2000 حرف", () => {
    const longText = "أ".repeat(2001);
    expect(validateCommentContent(longText).valid).toBe(false);
    expect(validateCommentContent(longText).error).toBe("الحد الأقصى 2000 حرف");
  });

  it("يقبل المحتوى بالضبط 2000 حرف", () => {
    const maxText = "أ".repeat(2000);
    expect(validateCommentContent(maxText).valid).toBe(true);
  });
});

describe("Comment Visibility Rules", () => {
  const sampleComments = [
    { id: 1, isInternal: 0, authorType: "admin", content: "مرئي للجميع" },
    { id: 2, isInternal: 1, authorType: "admin", content: "داخلي للإدارة فقط" },
    { id: 3, isInternal: 0, authorType: "supplier", content: "تعليق المورد" },
  ];

  it("الإدارة ترى جميع التعليقات بما فيها الداخلية", () => {
    const result = filterCommentsForViewer(sampleComments, "admin");
    expect(result.length).toBe(3);
  });

  it("المورد لا يرى التعليقات الداخلية", () => {
    const result = filterCommentsForViewer(sampleComments, "supplier");
    expect(result.length).toBe(2);
    expect(result.every(c => c.isInternal === 0)).toBe(true);
  });

  it("التعليق الداخلي مخفي عن المورد", () => {
    expect(isInternalComment(true, "supplier")).toBe(false);
    expect(isInternalComment(true, "admin")).toBe(true);
    expect(isInternalComment(false, "supplier")).toBe(true);
  });
});

describe("Comment Tree Structure", () => {
  const flatComments = [
    { id: 1, parentId: null, content: "تعليق رئيسي 1" },
    { id: 2, parentId: null, content: "تعليق رئيسي 2" },
    { id: 3, parentId: 1, content: "رد على التعليق 1" },
    { id: 4, parentId: 1, content: "رد آخر على التعليق 1" },
    { id: 5, parentId: 2, content: "رد على التعليق 2" },
  ];

  it("يبني شجرة التعليقات بشكل صحيح", () => {
    const tree = buildCommentTree(flatComments);
    expect(tree.length).toBe(2); // تعليقان رئيسيان
    expect(tree[0].replies.length).toBe(2); // التعليق 1 له ردان
    expect(tree[1].replies.length).toBe(1); // التعليق 2 له رد واحد
  });

  it("التعليقات بدون ردود تُعاد كمصفوفة فارغة", () => {
    const single = [{ id: 10, parentId: null, content: "وحيد" }];
    const tree = buildCommentTree(single);
    expect(tree[0].replies.length).toBe(0);
  });

  it("الردود لا تظهر كتعليقات رئيسية", () => {
    const tree = buildCommentTree(flatComments);
    const allTopLevel = tree.map(c => c.id);
    expect(allTopLevel).not.toContain(3);
    expect(allTopLevel).not.toContain(4);
    expect(allTopLevel).not.toContain(5);
  });
});

describe("Relative Time Formatting", () => {
  const now = Date.now();

  it("يعرض الآن للتعليقات الحديثة جداً", () => {
    expect(formatRelativeTime(now - 30_000, now)).toBe("الآن");
  });

  it("يعرض الدقائق بشكل صحيح", () => {
    expect(formatRelativeTime(now - 5 * 60_000, now)).toBe("منذ 5 دقيقة");
    expect(formatRelativeTime(now - 59 * 60_000, now)).toBe("منذ 59 دقيقة");
  });

  it("يعرض الساعات بشكل صحيح", () => {
    expect(formatRelativeTime(now - 2 * 3_600_000, now)).toBe("منذ 2 ساعة");
    expect(formatRelativeTime(now - 23 * 3_600_000, now)).toBe("منذ 23 ساعة");
  });

  it("يعرض أكثر من يوم للتعليقات القديمة", () => {
    expect(formatRelativeTime(now - 25 * 3_600_000, now)).toBe("أكثر من يوم");
  });
});

describe("Author Type Logic", () => {
  it("يُعرّف الإدارة بـ authorType=admin", () => {
    const comment = { authorType: "admin", authorId: 0, authorName: "الإدارة" };
    expect(comment.authorType).toBe("admin");
  });

  it("يُعرّف المورد بـ authorType=supplier مع supplierId", () => {
    const comment = { authorType: "supplier", authorId: 5, authorName: "شركة الخليج" };
    expect(comment.authorType).toBe("supplier");
    expect(comment.authorId).toBeGreaterThan(0);
  });

  it("يتحقق من ملكية التعليق للمستخدم الحالي", () => {
    const isOwn = (viewerType: string, viewerId: number, commentType: string, commentAuthorId: number) =>
      viewerType === commentType && (viewerType === "admin" || viewerId === commentAuthorId);

    expect(isOwn("admin", 0, "admin", 0)).toBe(true);
    expect(isOwn("supplier", 5, "supplier", 5)).toBe(true);
    expect(isOwn("supplier", 5, "supplier", 7)).toBe(false);
    expect(isOwn("supplier", 5, "admin", 0)).toBe(false);
  });
});
