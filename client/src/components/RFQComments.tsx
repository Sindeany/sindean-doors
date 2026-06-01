/**
 * RFQComments — مكوّن التعليقات المشترك
 * يُستخدم في لوحة الإدارة ولوحة المورد على حدٍّ سواء
 */
import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare, Send, Trash2, Reply, Lock, Globe,
  ChevronDown, ChevronUp, Loader2, AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface CommentAuthor {
  type: "admin" | "supplier";
  id?: number;
}

interface Props {
  rfqId: number;
  viewer: CommentAuthor;
  /** اسم المستخدم الحالي للعرض */
  viewerName?: string;
}

interface CommentItem {
  id: number;
  rfqId: number;
  authorType: "admin" | "supplier";
  authorId: number;
  authorName: string;
  content: string;
  isInternal: number;
  parentId: number | null;
  createdAt: number;
  updatedAt: number;
  replies: CommentItem[];
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return "الآن";
  if (diff < 3600_000) return `منذ ${Math.floor(diff / 60_000)} دقيقة`;
  if (diff < 86400_000) return `منذ ${Math.floor(diff / 3600_000)} ساعة`;
  return d.toLocaleDateString("ar-SA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function CommentBubble({
  comment,
  viewer,
  onReply,
  onDelete,
  depth = 0,
}: {
  comment: CommentItem;
  viewer: CommentAuthor;
  onReply: (id: number, name: string) => void;
  onDelete: (id: number) => void;
  depth?: number;
}) {
  const isAdmin = comment.authorType === "admin";
  const isOwn = viewer.type === comment.authorType &&
    (viewer.type === "admin" || viewer.id === comment.authorId);

  return (
    <div className={`${depth > 0 ? "mr-6 border-r-2 border-stone-100 pr-3" : ""}`}>
      <div className={`flex gap-3 group ${isAdmin ? "flex-row-reverse" : ""}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
          ${isAdmin ? "bg-amber-700 text-white" : "bg-stone-200 text-stone-700"}`}>
          {comment.authorName.charAt(0)}
        </div>

        {/* Bubble */}
        <div className={`flex-1 max-w-[85%] ${isAdmin ? "items-end" : "items-start"} flex flex-col`}>
          {/* Header */}
          <div className={`flex items-center gap-2 mb-1 ${isAdmin ? "flex-row-reverse" : ""}`}>
            <span className="text-xs font-semibold text-stone-700">{comment.authorName}</span>
            {comment.isInternal === 1 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-700 gap-1">
                <Lock className="w-2.5 h-2.5" /> داخلي
              </Badge>
            )}
            <span className="text-[10px] text-stone-400">{formatTime(comment.createdAt)}</span>
          </div>

          {/* Content */}
          <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
            ${isAdmin
              ? "bg-amber-700 text-white rounded-tr-sm"
              : "bg-stone-100 text-stone-800 rounded-tl-sm"
            }
            ${comment.isInternal === 1 ? "border-2 border-dashed border-amber-400" : ""}
          `}>
            {comment.content}
          </div>

          {/* Actions */}
          <div className={`flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity
            ${isAdmin ? "flex-row-reverse" : ""}`}>
            {depth === 0 && (
              <button
                onClick={() => onReply(comment.id, comment.authorName)}
                className="text-[11px] text-stone-400 hover:text-stone-600 flex items-center gap-1"
              >
                <Reply className="w-3 h-3" /> رد
              </button>
            )}
            {viewer.type === "admin" && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-[11px] text-red-400 hover:text-red-600 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> حذف
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies?.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map(reply => (
            <CommentBubble
              key={reply.id}
              comment={reply}
              viewer={viewer}
              onReply={onReply}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RFQComments({ rfqId, viewer, viewerName }: Props) {
  const [text, setText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data: comments = [], refetch, isLoading } = trpc.comments.listByRfq.useQuery(
    {
      rfqId,
      viewerType: viewer.type,
      supplierId: viewer.id,
    },
    { refetchInterval: 15_000 } // تحديث كل 15 ثانية
  );

  const addByAdmin = trpc.comments.addByAdmin.useMutation({
    onSuccess: () => { setText(""); setReplyTo(null); refetch(); },
    onError: (err: { message: string }) => toast.error("خطأ في إرسال التعليق: " + err.message),
  });

  const addBySupplier = trpc.comments.addBySupplier.useMutation({
    onSuccess: () => { setText(""); setReplyTo(null); refetch(); },
    onError: (err: { message: string }) => toast.error("خطأ في إرسال التعليق: " + err.message),
  });

  const deleteComment = trpc.comments.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("تم حذف التعليق"); },
    onError: (err: { message: string }) => toast.error("خطأ في الحذف: " + err.message),
  });

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (viewer.type === "admin") {
      addByAdmin.mutate({
        rfqId,
        content: trimmed,
        isInternal,
        parentId: replyTo?.id,
      });
    } else {
      if (!viewer.id) return;
      addBySupplier.mutate({
        rfqId,
        content: trimmed,
        parentId: replyTo?.id,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleSend();
    }
  };

  // التمرير للأسفل عند وصول تعليقات جديدة
  useEffect(() => {
    if (isExpanded) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments.length, isExpanded]);

  const totalCount = comments.reduce((acc: number, c: { replies?: unknown[] }) => acc + 1 + (c.replies?.length || 0), 0);
  const isSending = addByAdmin.isPending || addBySupplier.isPending;

  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 hover:bg-stone-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-stone-500" />
          <span className="text-sm font-semibold text-stone-700">التعليقات والاستفسارات</span>
          {totalCount > 0 && (
            <Badge className="bg-amber-700 text-white text-[10px] px-1.5 py-0">{totalCount}</Badge>
          )}
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
      </button>

      {isExpanded && (
        <>
          {/* Messages Area */}
          <div className="max-h-96 overflow-y-auto p-4 space-y-4 bg-white">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-sm text-stone-400">لا توجد تعليقات بعد</p>
                <p className="text-xs text-stone-300 mt-1">ابدأ المحادثة لتوضيح الشروط أو الاستفسار</p>
              </div>
            ) : (
              (comments as CommentItem[]).map(comment => (
                <CommentBubble
                  key={comment.id}
                  comment={comment}
                  viewer={viewer}
                  onReply={(id, name) => setReplyTo({ id, name })}
                  onDelete={(id) => deleteComment.mutate({ commentId: id })}
                />
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Reply indicator */}
          {replyTo && (
            <div className="flex items-center justify-between px-4 py-2 bg-amber-50 border-t border-amber-100">
              <span className="text-xs text-amber-700">
                <Reply className="w-3 h-3 inline ml-1" />
                رد على: <strong>{replyTo.name}</strong>
              </span>
              <button onClick={() => setReplyTo(null)} className="text-amber-500 hover:text-amber-700">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-stone-100 p-3 bg-stone-50">
            {/* Internal toggle (admin only) */}
            {viewer.type === "admin" && (
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setIsInternal(v => !v)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors
                    ${isInternal
                      ? "bg-amber-100 border-amber-300 text-amber-700"
                      : "bg-white border-stone-200 text-stone-500 hover:border-stone-300"
                    }`}
                >
                  {isInternal ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                  {isInternal ? "داخلي (للإدارة فقط)" : "مرئي للمورد"}
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <Textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  viewer.type === "admin"
                    ? "اكتب تعليقاً أو استفساراً... (Ctrl+Enter للإرسال)"
                    : "اكتب استفساراً أو ردك على الشروط... (Ctrl+Enter للإرسال)"
                }
                className="flex-1 min-h-[60px] max-h-32 text-sm resize-none border-stone-200 focus:border-amber-400"
                dir="rtl"
              />
              <Button
                onClick={handleSend}
                disabled={!text.trim() || isSending}
                className="bg-amber-700 hover:bg-amber-800 text-white self-end px-3"
                size="sm"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-stone-400 mt-1 text-left">Ctrl+Enter للإرسال السريع</p>
          </div>
        </>
      )}
    </div>
  );
}
