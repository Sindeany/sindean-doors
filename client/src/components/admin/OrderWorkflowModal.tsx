// ============================================================
// OrderWorkflowModal - نافذة سير العمل الشاملة لكل طلب
// 15 مرحلة موزعة على 4 أقسام: Pre-Production → After Delivery
// ============================================================
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, CheckCircle2, Circle, RefreshCw, AlertTriangle, Clock,
  ChevronRight, ChevronDown, ChevronUp,
  ClipboardCheck, Search, FileText, Palette, Calendar,
  Package, ShieldCheck, Wrench, Eye, CheckSquare,
  Box, FileStack, Truck, DollarSign, Star,
  MessageCircle, Upload, Plus, Check, AlertCircle,
  Phone, User, Hash, Layers, ArrowRight, Info,
  Camera, Download, Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { WorkflowOrder, WorkflowStage, StageStatus } from "@/pages/admin/AdminWorkflow";
import { WORKFLOW_PHASES } from "@/pages/admin/AdminWorkflow";
import { KEY_TRANSLATIONS } from "@/components/distributor/NewOrderWizard";

// ─── مكوّن مرحلة واحدة ───────────────────────────────────────
// ─── مكوّن مرحلة واحدة ───────────────────────────────────────
function StagePanel({
  stageId,
  stageInfo,
  status,
  phaseColor,
  isActive,
  onAdvance,
  onBlock,
  order,
}: {
  stageId: WorkflowStage;
  stageInfo: { labelAr: string; labelEn: string; icon: React.ReactNode; step: number };
  status: StageStatus;
  phaseColor: string;
  isActive: boolean;
  onAdvance: (notes: string) => void;
  onBlock: (reason: string) => void;
  order: WorkflowOrder;
}) {
  const [expanded, setExpanded] = useState(isActive);
  const [notes, setNotes] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [showBlock, setShowBlock] = useState(false);

  const statusConfig = {
    done: { label: "مكتمل", color: "oklch(0.55 0.15 140)", bg: "oklch(0.95 0.05 140)", icon: <CheckCircle2 className="w-4 h-4" /> },
    in_progress: { label: "جارٍ", color: "oklch(0.55 0.15 250)", bg: "oklch(0.95 0.05 250)", icon: <RefreshCw className="w-4 h-4 animate-spin" /> },
    blocked: { label: "محظور", color: "oklch(0.55 0.15 25)", bg: "oklch(0.95 0.05 25)", icon: <AlertTriangle className="w-4 h-4" /> },
    pending: { label: "معلق", color: "#9CA3AF", bg: "#F3F4F6", icon: <Circle className="w-4 h-4" /> },
    skipped: { label: "متجاوز", color: "#9CA3AF", bg: "#F3F4F6", icon: <Circle className="w-4 h-4" /> },
  };

  const cfg = statusConfig[status];

  // محتوى خاص بكل مرحلة
  const stageContent: Partial<Record<WorkflowStage, React.ReactNode>> = {
    po_review: (() => {
      const dim = order.dimensions;
      const dimStr = dim ? `${dim.height || 210}×${dim.width || 90}×${dim.thickness || 4} سم` : "—";
      const cleanNotes = order.notes?.replace(/^DIST_ORDER_ID:\d+\s*-\s*/, "") || "لا توجد ملاحظات";

      return (
        <div className="space-y-4 text-right" dir="rtl">
          {/* تفاصيل أساسية */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "عدد الأبواب", value: `${order.totalDoors} أبواب` },
              { label: "الموديل", value: order.productName || "—" },
              { label: "المقاسات", value: dimStr },
              { label: "تاريخ الطلب", value: order.createdAt || "—" },
              { label: "التسليم المتوقع", value: order.expectedDelivery || "—" },
              { label: "القيمة الإجمالية", value: `${order.totalValue.toLocaleString()} ر.س` },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="text-xs text-gray-400 mb-0.5">{item.label}</div>
                <div className="text-sm font-semibold text-gray-800">{item.value}</div>
              </div>
            ))}
          </div>

          {/* الخيارات المحددة */}
          {order.selections && Object.keys(order.selections).length > 0 && (
            <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100 space-y-2">
              <div className="text-xs font-semibold text-gray-500 mb-2">الخيارات الفنية للمنتج</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(order.selections).map(([key, val]) => {
                  if (["width", "door_leaf_height", "wall_thickness", "material", "color_choice"].includes(key)) return null;
                  const label = KEY_TRANSLATIONS[key] || key.replace(/_/g, " ");
                  const cleanVal = val === "true" ? "نعم" : val === "false" ? "لا" : val;
                  return (
                    <div key={key} className="bg-white rounded-lg p-2 border border-gray-50 flex justify-between items-center text-xs">
                      <span className="text-gray-450">{label}:</span>
                      <strong className="text-gray-800 font-semibold">{String(cleanVal)}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* متطلبات خاصة / ملاحظات */}
          <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-100">
            <div className="text-xs font-semibold text-amber-700 mb-1">متطلبات خاصة / ملاحظات</div>
            <div className="text-sm text-amber-900 leading-relaxed">{cleanNotes}</div>
          </div>
        </div>
      );
    })(),
    catalog_match: (() => {
      const isCustom = order.orderType === "custom" || (order.selections && (order.selections.custom_dimensions === "true" || order.selections.special_colors === "true"));
      return (
        <div className="space-y-3 text-right" dir="rtl">
          <div className="grid grid-cols-1 gap-2">
            {[
              { label: "المقاسات ضمن حدود الإنتاج", ok: true },
              { label: "اللون متوفر في المخزون", ok: true },
              { label: "الإكسسوارات متوافقة مع السماكة", ok: true },
              { label: "نوع الطلب", value: isCustom ? "طلب خاص (تفصيل)" : "طلب معياري (جاهز)" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                <span className="text-sm text-gray-700">{item.label}</span>
                {item.ok !== undefined ? (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700`}>
                    {item.ok ? "✓ مطابق" : "✗ غير مطابق"}
                  </span>
                ) : (
                  <span className="text-sm font-bold text-gray-900">{item.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    })(),
    job_order_file: (
      <div className="space-y-3 text-right" dir="rtl">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs text-gray-400 mb-1">كود تشغيل الطلب</div>
            <div className="font-mono font-bold text-gray-900">{`JOB-2026-${String(order.id).padStart(4, "0")}`}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs text-gray-400 mb-1">تاريخ الإصدار</div>
            <div className="font-bold text-gray-900">{order.createdAt || "—"}</div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-500 mb-1">المستندات المرفقة</div>
          {["رسومات المقاسات.pdf", "جدول الألوان.xlsx", "جدول الإكسسوارات.xlsx"].map((doc) => (
            <div key={doc} className="flex items-center justify-between bg-blue-50 rounded-xl px-3 py-2.5 border border-blue-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-700">{doc}</span>
              </div>
              <button className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <Download className="w-3 h-3" /> تنزيل
              </button>
            </div>
          ))}
        </div>
        <button className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors">
          <Upload className="w-4 h-4" />
          رفع مستند جديد
        </button>
      </div>
    ),
    sample_approval: (() => {
      const sampleRef = order.productId ? `${order.productId.toUpperCase()}-${order.selections?.color_choice || "Default"}` : "WPC-Classic-White";
      return (
        <div className="space-y-3 text-right" dir="rtl">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "عينة اللون", status: "مُرسَلة", color: "blue" },
              { label: "قطعة الباب", status: "مُرسَلة", color: "blue" },
              { label: "عينة الفيلم", status: "جاهز", color: "blue" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl p-3 text-center border bg-blue-50 border-blue-100`}>
                <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                <div className={`text-xs font-bold text-blue-700`}>{s.status}</div>
              </div>
            ))}
          </div>
          <div className="bg-red-50 rounded-xl p-3 border border-red-100">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-semibold">تنبيه: لا يبدأ الإنتاج قبل اعتماد جميع العينات</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-400 mb-1">العينة المرجعية</div>
              <div className="font-bold text-gray-900">{sampleRef}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-400 mb-1">تاريخ الاعتماد المتوقع</div>
              <div className="font-bold text-gray-900">{order.createdAt || "—"}</div>
            </div>
          </div>
        </div>
      );
    })(),
    production_planning: (
      <div className="space-y-3 text-right" dir="rtl">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs text-gray-400 mb-1">تاريخ بدء الإنتاج</div>
            <div className="font-bold text-gray-900">{order.createdAt}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs text-gray-400 mb-1">تاريخ الانتهاء المتوقع</div>
            <div className="font-bold text-gray-900">{order.expectedDelivery || "—"}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs text-gray-400 mb-1">خط الإنتاج</div>
            <div className="font-bold text-gray-900">{order.productId ? `خط ${order.productId.toUpperCase()}` : "خط A - WPC"}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs text-gray-400 mb-1">الأولوية في الجدول</div>
            <div className={`font-bold ${order.priority === "urgent" ? "text-red-650" : order.priority === "vip" ? "text-purple-650" : "text-gray-750"}`}>
              {order.priority === "urgent" ? "عاجل" : order.priority === "vip" ? "VIP" : "عادي"}
            </div>
          </div>
        </div>
      </div>
    ),
    material_procurement: (() => {
      const materialLabel = order.productId ? (order.productId.includes("wpc") ? "ألواح WPC" : "ألواح خشب") : "ألواح خشب";
      return (
        <div className="space-y-2 text-right" dir="rtl">
          {[
            { item: materialLabel, qty: `${order.totalDoors} لوح`, status: "متوفر", ok: true },
            { item: "أفلام الألوان", qty: "متوفر بالمستودع", status: "متوفر", ok: true },
            { item: "حواف ABS", qty: "ABS 2mm", status: "متوفر", ok: true },
            { item: "إطارات الأبواب", qty: `${order.totalDoors} مجموعة`, status: "متوفر", ok: true },
            { item: "إكسسوارات (أقفال+مفصلات)", qty: `${order.totalDoors} مجموعة`, status: "متوفر", ok: true },
            { item: "مواد التغليف", qty: "متوفر", status: "متوفر", ok: true },
          ].map((m) => (
            <div key={m.item} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
              <div>
                <div className="text-sm font-medium text-gray-800">{m.item}</div>
                <div className="text-xs text-gray-400">{m.qty}</div>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.ok ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {m.status}
              </span>
            </div>
          ))}
        </div>
      );
    })(),
    incoming_qc: (
      <div className="space-y-3 text-right" dir="rtl">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "اللون", result: "مطابق", ok: true },
            { label: "السماكة", result: "مطابق", ok: true },
            { label: "الاستقامة", result: "مطابق", ok: true },
            { label: "العيوب البصرية", result: "لا عيوب", ok: true },
          ].map((q) => (
            <div key={q.label} className={`rounded-xl p-3 border ${q.ok ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
              <div className="text-xs text-gray-500 mb-0.5">{q.label}</div>
              <div className={`text-sm font-bold ${q.ok ? "text-green-700" : "text-red-700"}`}>{q.result}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2.5 border border-green-100">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span className="text-sm text-green-700 font-medium">جميع المواد مطابقة للمواصفات</span>
        </div>
      </div>
    ),
    work_order: (
      <div className="space-y-3 text-right" dir="rtl">
        <div className="text-xs font-semibold text-gray-500 mb-2">توجيه الأقسام</div>
        {[
          { dept: "خط الأبواب", qty: `${order.totalDoors} باب`, assignee: "أحمد محمد", status: "جارٍ" },
          { dept: "خط الإطارات", qty: `${order.totalDoors} مجموعة إطار`, assignee: "خالد علي", status: "جارٍ" },
          { dept: "قسم الإكسسوارات", qty: `${order.totalDoors} مجموعة`, assignee: "محمد سالم", status: "معلق" },
        ].map((w) => (
          <div key={w.dept} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-3">
            <div>
              <div className="text-sm font-bold text-gray-800">{w.dept}</div>
              <div className="text-xs text-gray-400">{w.qty} · {w.assignee}</div>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${w.status === "جارٍ" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
              {w.status}
            </span>
          </div>
        ))}
      </div>
    ),
    final_qc: (
      <div className="space-y-3 text-right" dir="rtl">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "المقاسات", result: "مطابق", ok: true },
            { label: "اللون", result: "مطابق", ok: true },
            { label: "الاتجاه (يمين/يسار)", result: "مطابق", ok: true },
            { label: "أماكن القفل", result: "مطابق", ok: true },
            { label: "المفصلات", result: "مطابق", ok: true },
            { label: "العيوب البصرية", result: "لا عيوب", ok: true },
            { label: "الوظيفية (فتح/إغلاق)", result: "سليم", ok: true },
          ].map((q) => (
            <div key={q.label} className={`rounded-xl p-3 border ${q.ok ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
              <div className="text-xs text-gray-500 mb-0.5">{q.label}</div>
              <div className={`text-sm font-bold ${q.ok ? "text-green-700" : "text-red-700"}`}>{q.result}</div>
            </div>
          ))}
        </div>
        <button className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-gray-300 transition-colors">
          <Camera className="w-4 h-4" />
          رفع صور التوثيق
        </button>
      </div>
    ),
    po_matching: (
      <div className="space-y-3 text-right" dir="rtl">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs text-gray-400 mb-1">الكمية المطلوبة</div>
            <div className="text-xl font-bold text-gray-900">{order.totalDoors} باب</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs text-gray-400 mb-1">الكمية المنتجة</div>
            <div className="text-xl font-bold text-green-600">{order.totalDoors} باب</div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2.5 border border-green-100">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span className="text-sm text-green-700 font-medium">الكمية مطابقة تماماً - لا نقص ولا زيادة</span>
        </div>
      </div>
    ),
    packing: (
      <div className="space-y-3 text-right" dir="rtl">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs text-gray-400 mb-1">نوع التغليف</div>
            <div className="font-bold text-gray-900">سوق محلي</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs text-gray-400 mb-1">طريقة التغليف</div>
            <div className="font-bold text-gray-900">حماية زوايا كرتون + فيلم</div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-500">بيانات الأبواب المغلفة</div>
          {[
            { code: `DR-${String(order.id).padStart(4, "0")}-1`, order: order.orderNumber, dir: order.selections?.direction || "يمين", room: "باب رئيسي" },
          ].map((d) => (
            <div key={d.code} className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-800">{d.code}</div>
                <div className="text-xs text-gray-400">{d.room}</div>
              </div>
              <div className="text-left">
                <div className="text-xs text-gray-500">{d.dir}</div>
                <div className="text-xs text-gray-400">{d.order}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    delivery_docs: (
      <div className="space-y-2 text-right" dir="rtl">
        {[
          { doc: "Packing List", status: "جاهز", ready: true },
          { doc: "Invoice", status: "جاهز", ready: true },
          { doc: "صور المنتج قبل الشحن", status: "جاهز (6 صور)", ready: true },
        ].map((d) => (
          <div key={d.doc} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-2">
              <FileStack className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700">{d.doc}</span>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${d.ready ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
              {d.status}
            </span>
          </div>
        ))}
        <button className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-gray-300 transition-colors">
          <Download className="w-4 h-4" />
          تنزيل جميع المستندات
        </button>
      </div>
    ),
    delivery: (
      <div className="space-y-3 text-right" dir="rtl">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs text-gray-400 mb-1">تاريخ الشحن المتوقع</div>
            <div className="font-bold text-gray-900">{order.expectedDelivery || "—"}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs text-gray-400 mb-1">العنوان</div>
            <div className="font-bold text-gray-900">مستودع العميل</div>
          </div>
        </div>
      </div>
    ),
    accounting_close: (() => {
      const isPaid = order.paymentStatus === "paid";
      const isPartial = order.paymentStatus === "partial";
      const total = order.totalValue;
      const paid = isPaid ? total : isPartial ? total / 2 : 0;
      const remaining = total - paid;
      return (
        <div className="space-y-3 text-right" dir="rtl">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-400 mb-1">قيمة الفاتورة</div>
              <div className="text-base font-bold text-gray-900">{total.toLocaleString()} ر.س</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-400 mb-1">المبلغ المحصّل</div>
              <div className="text-base font-bold text-green-600">{paid.toLocaleString()} ر.س</div>
            </div>
          </div>
          {remaining > 0 && (
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
              <div className="text-xs font-semibold text-amber-700 mb-1">الدفعة المتبقية</div>
              <div className="text-sm font-bold text-amber-800">{remaining.toLocaleString()} ر.س ({isPartial ? "50%" : "100%"})</div>
            </div>
          )}
          {remaining === 0 && (
            <div className="bg-green-50 rounded-xl p-3 border border-green-100 text-green-700 text-xs font-semibold text-center">
              الطلب مسدد بالكامل
            </div>
          )}
        </div>
      );
    })(),
    post_order_review: (
      <div className="space-y-3 text-right" dir="rtl">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">زمن التوريد الفعلي</div>
            <div className="text-base font-bold text-gray-900">في الوقت المحدد</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">حالة رضا العميل</div>
            <div className="text-base font-bold text-green-600">ممتاز</div>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div className={`rounded-2xl border transition-all ${isActive ? "border-blue-200 shadow-sm" : status === "done" ? "border-green-100" : "border-gray-100"}`}>
      {/* Stage Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors rounded-2xl"
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: cfg.bg, color: cfg.color }}
        >
          {stageInfo.step}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0" style={{ color: phaseColor }}>
          {stageInfo.icon}
        </div>
        <div className="flex-1 text-right min-w-0">
          <div className="text-sm font-bold text-gray-800">{stageInfo.labelAr}</div>
          <div className="text-xs text-gray-400">{stageInfo.labelEn}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.icon} {cfg.label}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Stage Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Stage-specific content */}
              {stageContent[stageId] && (
                <div>{stageContent[stageId]}</div>
              )}

              {/* Notes */}
              {(status === "in_progress" || status === "pending") && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="ملاحظات المرحلة..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="text-sm resize-none h-20"
                  />
                  <div className="flex gap-2">
                    {status === "in_progress" && (
                      <>
                        <Button
                          size="sm"
                          className="flex-1 gap-1.5"
                          style={{ background: "oklch(0.55 0.15 140)" }}
                          onClick={() => { onAdvance(notes); setNotes(""); }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          إتمام المرحلة
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-red-600 border-red-200"
                          onClick={() => setShowBlock(!showBlock)}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          تعليق
                        </Button>
                      </>
                    )}
                    {status === "pending" && (
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5"
                        style={{ background: "oklch(0.55 0.15 250)" }}
                        onClick={() => onAdvance(notes)}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        بدء المرحلة
                      </Button>
                    )}
                  </div>
                  {showBlock && (
                    <div className="space-y-2">
                      <Input
                        placeholder="سبب التعليق..."
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        className="text-sm h-9"
                      />
                      <Button
                        size="sm"
                        className="w-full gap-1.5 bg-red-500 hover:bg-red-600 text-white"
                        onClick={() => { onBlock(blockReason); setShowBlock(false); setBlockReason(""); }}
                      >
                        تأكيد التعليق
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── النافذة الرئيسية ─────────────────────────────────────────
export default function OrderWorkflowModal({
  order,
  onClose,
  onUpdate,
}: {
  order: WorkflowOrder;
  onClose: () => void;
  onUpdate: (updated: WorkflowOrder) => void;
}) {
  const [activeTab, setActiveTab] = useState<"workflow" | "info" | "whatsapp">("workflow");
  const [localOrder, setLocalOrder] = useState<WorkflowOrder>(order);

  const allStages: WorkflowStage[] = [
    "po_review","catalog_match","job_order_file","sample_approval","production_planning",
    "material_procurement","incoming_qc","work_order",
    "final_qc","po_matching","packing","delivery_docs",
    "delivery","accounting_close","post_order_review",
  ];

  const handleAdvance = (stageId: WorkflowStage, notes: string) => {
    const currentIdx = allStages.indexOf(stageId);
    const nextStage = allStages[currentIdx + 1];
    const updated: WorkflowOrder = {
      ...localOrder,
      currentStage: nextStage || stageId,
      stages: {
        ...localOrder.stages,
        [stageId]: { status: "done" as StageStatus, completedAt: new Date().toISOString().split("T")[0], notes },
        ...(nextStage ? { [nextStage]: { status: "in_progress" as StageStatus } } : {}),
      },
    };
    setLocalOrder(updated);
    onUpdate(updated);
    toast.success(`تم إتمام مرحلة: ${WORKFLOW_PHASES.flatMap(p => p.stages).find(s => s.id === stageId)?.labelAr}`);
  };

  const handleBlock = (stageId: WorkflowStage, reason: string) => {
    const updated: WorkflowOrder = {
      ...localOrder,
      stages: {
        ...localOrder.stages,
        [stageId]: { status: "blocked" as StageStatus, notes: reason },
      },
    };
    setLocalOrder(updated);
    onUpdate(updated);
    toast.error(`تم تعليق مرحلة: ${WORKFLOW_PHASES.flatMap(p => p.stages).find(s => s.id === stageId)?.labelAr}`);
  };

  const progress = Math.round(
    (Object.values(localOrder.stages).filter(s => s.status === "done").length / allStages.length) * 100
  );

  const phase = WORKFLOW_PHASES.find(p => p.stages.some(s => s.id === localOrder.currentStage));

  // WhatsApp messages
  const waMessages: Record<string, string> = {
    po_review: `مرحباً ${localOrder.distributorName}،\nتم استلام طلبكم رقم ${localOrder.orderNumber} وهو قيد المراجعة الفنية.\nسنتواصل معكم خلال 24 ساعة.`,
    sample_approval: `مرحباً ${localOrder.distributorName}،\nتم إرسال عينات اللون والمواد للطلب ${localOrder.orderNumber}.\nيرجى المراجعة والاعتماد لبدء الإنتاج.`,
    work_order: `مرحباً ${localOrder.distributorName}،\nتم بدء إنتاج طلبكم ${localOrder.orderNumber}.\nالتسليم المتوقع: ${localOrder.expectedDelivery}.`,
    delivery: `مرحباً ${localOrder.distributorName}،\nطلبكم ${localOrder.orderNumber} جاهز للشحن.\nسيتم التسليم في الموعد المحدد.`,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <motion.div
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-lg text-gray-900">{localOrder.orderNumber}</span>
              {localOrder.priority === "urgent" && (
                <Badge style={{ background: "oklch(0.92 0.15 25)", color: "oklch(0.40 0.15 25)" }}>عاجل</Badge>
              )}
              {localOrder.priority === "vip" && (
                <Badge style={{ background: "oklch(0.92 0.12 60)", color: "oklch(0.40 0.12 60)" }}>VIP</Badge>
              )}
              {localOrder.orderType === "custom" && (
                <Badge variant="outline" className="border-purple-200 text-purple-700">مخصص</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{localOrder.distributorName}</span>
              <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" />{localOrder.totalDoors} باب</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{localOrder.expectedDelivery}</span>
            </div>
          </div>
          {/* Progress */}
          <div className="flex items-center gap-3 mx-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{progress}%</div>
              <div className="text-xs text-gray-400">مكتمل</div>
            </div>
            <div className="w-12 h-12 relative">
              <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F3F4F6" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke={phase?.color || "oklch(0.55 0.15 160)"}
                  strokeWidth="3"
                  strokeDasharray={`${progress} ${100 - progress}`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {allStages.map((s) => {
              const st = localOrder.stages[s];
              const stageInfo = WORKFLOW_PHASES.flatMap(p => p.stages).find(x => x.id === s);
              const phaseInfo = WORKFLOW_PHASES.find(p => p.stages.some(x => x.id === s));
              return (
                <div
                  key={s}
                  className="flex-1 h-2 rounded-full min-w-3 transition-all"
                  title={stageInfo?.labelAr}
                  style={{
                    background: st.status === "done" ? "oklch(0.55 0.15 140)" :
                      st.status === "in_progress" ? phaseInfo?.color || "oklch(0.55 0.15 250)" :
                      st.status === "blocked" ? "oklch(0.55 0.15 25)" : "#E5E7EB"
                  }}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
            <span>استلام PO</span>
            <span>ما بعد التسليم</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-5 py-2 border-b border-gray-100 flex-shrink-0">
          {[
            { id: "workflow", label: "سير العمل", icon: <ArrowRight className="w-3.5 h-3.5" /> },
            { id: "info", label: "معلومات الطلب", icon: <Info className="w-3.5 h-3.5" /> },
            { id: "whatsapp", label: "إشعارات واتساب", icon: <MessageCircle className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${activeTab === tab.id ? "text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              style={activeTab === tab.id ? { background: "oklch(0.38 0.06 160)" } : {}}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ─── تبويب سير العمل ─── */}
          {activeTab === "workflow" && (
            <div className="space-y-3">
              {WORKFLOW_PHASES.map((phase) => (
                <div key={phase.id}>
                  {/* Phase Label */}
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2 text-xs font-bold"
                    style={{ background: `${phase.color}12`, color: phase.color }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ background: phase.color }} />
                    {phase.labelAr}
                    <span className="font-normal text-gray-400 mr-auto">{phase.labelEn}</span>
                  </div>
                  {/* Stages */}
                  <div className="space-y-2 mr-4">
                    {phase.stages.map((s) => (
                      <StagePanel
                        key={s.id}
                        stageId={s.id}
                        stageInfo={s}
                        status={localOrder.stages[s.id]?.status || "pending"}
                        phaseColor={phase.color}
                        isActive={localOrder.currentStage === s.id}
                        onAdvance={(notes) => handleAdvance(s.id, notes)}
                        onBlock={(reason) => handleBlock(s.id, reason)}
                        order={localOrder}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ─── تبويب معلومات الطلب ─── */}
          {activeTab === "info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "رقم الطلب", value: localOrder.orderNumber },
                  { label: "الموزع", value: localOrder.distributorName },
                  { label: "رقم الهاتف", value: localOrder.distributorPhone },
                  { label: "عدد الأبواب", value: `${localOrder.totalDoors} باب` },
                  { label: "نوع الطلب", value: localOrder.orderType === "custom" ? "مخصص" : "قياسي" },
                  { label: "القيمة الإجمالية", value: `${localOrder.totalValue.toLocaleString()} ر.س` },
                  { label: "تاريخ الإنشاء", value: localOrder.createdAt },
                  { label: "تاريخ التسليم المتوقع", value: localOrder.expectedDelivery },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-400 mb-0.5">{item.label}</div>
                    <div className="text-sm font-semibold text-gray-800">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── تبويب واتساب ─── */}
          {activeTab === "whatsapp" && (
            <div className="space-y-4">
              <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-green-800">إشعارات واتساب التلقائية</span>
                </div>
                <div className="text-xs text-green-700 mb-3">
                  يتم إرسال إشعار تلقائي للموزع عند الانتقال لكل مرحلة رئيسية
                </div>
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <Phone className="w-4 h-4" />
                  <span>{localOrder.distributorPhone}</span>
                </div>
              </div>

              {Object.entries(waMessages).map(([stage, msg]) => {
                const stageInfo = WORKFLOW_PHASES.flatMap(p => p.stages).find(s => s.id === stage);
                return (
                  <div key={stage} className="bg-white rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold px-2 py-1 rounded-lg bg-gray-100 text-gray-600">
                        {stageInfo?.labelAr}
                      </span>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 text-sm text-gray-700 whitespace-pre-line mb-3 border border-green-100 font-mono text-xs">
                      {msg}
                    </div>
                    <a
                      href={`https://wa.me/${localOrder.distributorPhone.replace(/^0/, "966")}?text=${encodeURIComponent(msg)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-sm font-medium text-white transition-colors"
                      style={{ background: "#25D366" }}
                    >
                      <Send className="w-4 h-4" />
                      إرسال عبر واتساب
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
