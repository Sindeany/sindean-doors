// ============================================================
// AdminJobOrderDetail - ملف الطلب الفني الكامل (Job Order File)
// يشمل: PO Review + Technical Confirmation + Job Order File
// + Sample Approval + Production Planning
// ============================================================
import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, CheckCircle2, AlertTriangle, Clock, Download,
  Upload, Plus, Trash2, Edit3, Save, X, Check,
  ChevronDown, ChevronUp, Package, Palette, Calendar,
  Hash, User, Phone, DollarSign, Layers, ArrowRight,
  Camera, MessageCircle, Send, RefreshCw, Star,
  ClipboardCheck, Search, Wrench, Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// ─── بيانات تجريبية ───────────────────────────────────────────
const JOB_ORDER = {
  id: "JOB-2026-0451",
  orderNumber: "ORD-2026-0451",
  distributorName: "شركة الأفق للمقاولات",
  distributorPhone: "0501234567",
  createdAt: "2026-05-02",
  status: "in_progress" as const,

  // PO Details
  po: {
    totalDoors: 48,
    model: "Classic WPC 900",
    dimensions: "210×90 سم",
    direction: "يمين" as const,
    frameType: "إطار مقاوم للرطوبة",
    edgeType: "ABS 2mm",
    doorColor: "أبيض ناصع (RAL 9003)",
    frameColor: "رمادي فاتح (RAL 7035)",
    lockType: "قفل مقبض ذهبي",
    hingeType: "مفصلة مخفية 3 قطع",
    specialReqs: "مقاومة رطوبة عالية - مناسب للحمامات والمطابخ",
    orderType: "custom" as const,
  },

  // Technical Confirmation
  technical: {
    dimensionsOk: true,
    colorAvailable: true,
    accessoriesCompatible: true,
    classification: "Custom",
    confirmedBy: "م. أحمد الشمري",
    confirmedAt: "2026-05-03",
    notes: "يتطلب تصنيع خاص للحافة ABS مقاومة الرطوبة",
  },

  // Colors Table
  colors: [
    { code: "RAL-9003", name: "أبيض ناصع", type: "باب", qty: 48, available: true },
    { code: "RAL-7035", name: "رمادي فاتح", type: "إطار", qty: 48, available: true },
  ],

  // Accessories Table
  accessories: [
    { name: "قفل مقبض ذهبي", model: "LK-G200", qty: 48, unit: "قطعة", status: "متوفر" },
    { name: "مفصلة مخفية", model: "HG-H3", qty: 144, unit: "قطعة", status: "متوفر" },
    { name: "حافة ABS 2mm", model: "ABS-WR-2", qty: 200, unit: "متر", status: "طلب مفتوح" },
    { name: "مواد تغليف", model: "PK-STD", qty: 48, unit: "طقم", status: "متوفر" },
  ],

  // Sample Approval
  samples: [
    { type: "عينة لون الباب", code: "RAL-9003", sentAt: "2026-05-04", status: "معتمد", approvedAt: "2026-05-05" },
    { type: "قطعة WPC", code: "WPC-12mm", sentAt: "2026-05-04", status: "معتمد", approvedAt: "2026-05-05" },
    { type: "عينة حافة ABS", code: "ABS-WR-2", sentAt: "2026-05-04", status: "في الانتظار", approvedAt: null },
  ],

  // Production Schedule
  schedule: {
    startDate: "2026-05-12",
    endDate: "2026-05-22",
    productionLine: "خط A - WPC",
    priority: "عاجل",
    assignedSupervisor: "م. خالد العتيبي",
  },

  // Special Notes
  notes: "العميل يطلب تسليم الأبواب مرتبة حسب الدور والغرفة مع ملصقات واضحة. يُمنع التكديس الأفقي.",
};

// ─── مكوّن قسم قابل للطي ─────────────────────────────────────
function Section({
  title, subtitle, icon, color, children, defaultOpen = true,
}: {
  title: string; subtitle?: string; icon: React.ReactNode; color: string;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="p-2 rounded-xl flex-shrink-0" style={{ background: `${color}15`, color }}>
          {icon}
        </div>
        <div className="flex-1 text-right">
          <div className="font-bold text-gray-900">{title}</div>
          {subtitle && <div className="text-xs text-gray-400">{subtitle}</div>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── الصفحة الرئيسية ─────────────────────────────────────────
export default function AdminJobOrderDetail() {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(JOB_ORDER.notes);
  const [sampleStatuses, setSampleStatuses] = useState(JOB_ORDER.samples.map(s => s.status));

  const approveSample = (idx: number) => {
    const updated = [...sampleStatuses];
    updated[idx] = "معتمد";
    setSampleStatuses(updated);
    toast.success("تم اعتماد العينة بنجاح");
  };

  const allSamplesApproved = sampleStatuses.every(s => s === "معتمد");

  return (
    <AdminLayout
      title={`ملف الطلب الفني: ${JOB_ORDER.id}`}
      subtitle={`${JOB_ORDER.orderNumber} · ${JOB_ORDER.distributorName}`}
      backHref="/admin/workflow"
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 px-4 py-2.5 flex items-center gap-2">
            <Hash className="w-4 h-4 text-gray-400" />
            <span className="font-bold text-gray-900 font-mono">{JOB_ORDER.id}</span>
          </div>
          <Badge style={{ background: "oklch(0.92 0.15 25)", color: "oklch(0.40 0.15 25)" }}>جارٍ</Badge>
          <Badge variant="outline" className="border-purple-200 text-purple-700">مخصص</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="w-4 h-4" />
            تصدير PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Send className="w-4 h-4" />
            إرسال للموزع
          </Button>
          <Button size="sm" className="gap-1.5" style={{ background: "oklch(0.38 0.06 160)" }}>
            <Check className="w-4 h-4" />
            اعتماد الملف
          </Button>
        </div>
      </div>

      {/* Alert: Pending Sample */}
      {!allSamplesApproved && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-6"
        >
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <div className="font-semibold text-amber-800 text-sm">تنبيه: لا يبدأ الإنتاج قبل اعتماد جميع العينات</div>
            <div className="text-xs text-amber-600">عينة حافة ABS في انتظار الاعتماد من الموزع</div>
          </div>
        </motion.div>
      )}

      <div className="space-y-4">
        {/* ─── 1. مراجعة أمر الشراء ─── */}
        <Section
          title="1. مراجعة أمر الشراء (PO Review)"
          subtitle="تفاصيل الطلب الكاملة كما وردت من الموزع"
          icon={<ClipboardCheck className="w-5 h-5" />}
          color="oklch(0.55 0.15 250)"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "عدد الأبواب", value: `${JOB_ORDER.po.totalDoors} باب` },
              { label: "الموديل", value: JOB_ORDER.po.model },
              { label: "المقاسات", value: JOB_ORDER.po.dimensions },
              { label: "الاتجاه", value: JOB_ORDER.po.direction },
              { label: "نوع الإطار", value: JOB_ORDER.po.frameType },
              { label: "نوع الحافة", value: JOB_ORDER.po.edgeType },
              { label: "لون الباب", value: JOB_ORDER.po.doorColor },
              { label: "لون الإطار", value: JOB_ORDER.po.frameColor },
              { label: "نوع القفل", value: JOB_ORDER.po.lockType },
              { label: "المفصلات", value: JOB_ORDER.po.hingeType },
              { label: "تصنيف الطلب", value: JOB_ORDER.po.orderType === "custom" ? "مخصص (Custom)" : "قياسي (Standard)" },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-400 mb-0.5">{item.label}</div>
                <div className="text-sm font-semibold text-gray-800">{item.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 bg-amber-50 rounded-xl p-3 border border-amber-100">
            <div className="text-xs font-semibold text-amber-700 mb-1">متطلبات خاصة</div>
            <div className="text-sm text-amber-800">{JOB_ORDER.po.specialReqs}</div>
          </div>
        </Section>

        {/* ─── 2. التأكيد الفني ─── */}
        <Section
          title="2. التأكيد الفني (Technical Confirmation)"
          subtitle="مطابقة الطلب مع الكتالوج والمواصفات القياسية"
          icon={<Search className="w-5 h-5" />}
          color="oklch(0.55 0.15 200)"
        >
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { label: "المقاسات ضمن حدود الإنتاج", ok: JOB_ORDER.technical.dimensionsOk },
              { label: "اللون متوفر أو يحتاج تصنيع خاص", ok: JOB_ORDER.technical.colorAvailable },
              { label: "الإكسسوارات متوافقة مع السماكة", ok: JOB_ORDER.technical.accessoriesCompatible },
            ].map((item) => (
              <div key={item.label} className={`rounded-xl p-3 border flex items-center justify-between ${item.ok ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
                <span className="text-sm text-gray-700">{item.label}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {item.ok ? "✓ مطابق" : "✗ غير مطابق"}
                </span>
              </div>
            ))}
            <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
              <div className="text-xs text-gray-400 mb-0.5">تصنيف الطلب</div>
              <div className="font-bold text-purple-700">{JOB_ORDER.technical.classification}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-400 mb-0.5">اعتمد بواسطة</div>
              <div className="text-sm font-semibold text-gray-800">{JOB_ORDER.technical.confirmedBy}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-400 mb-0.5">تاريخ التأكيد</div>
              <div className="text-sm font-semibold text-gray-800">{JOB_ORDER.technical.confirmedAt}</div>
            </div>
          </div>
          {JOB_ORDER.technical.notes && (
            <div className="mt-3 bg-blue-50 rounded-xl p-3 border border-blue-100">
              <div className="text-xs font-semibold text-blue-700 mb-1">ملاحظات فنية</div>
              <div className="text-sm text-blue-800">{JOB_ORDER.technical.notes}</div>
            </div>
          )}
        </Section>

        {/* ─── 3. جدول الألوان ─── */}
        <Section
          title="3. جدول الألوان"
          subtitle="الألوان المطلوبة للأبواب والإطارات"
          icon={<Palette className="w-5 h-5" />}
          color="oklch(0.55 0.15 320)"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">الكود</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">الاسم</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">النوع</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">الكمية</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">التوفر</th>
                </tr>
              </thead>
              <tbody>
                {JOB_ORDER.colors.map((c, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-mono text-xs text-gray-600">{c.code}</td>
                    <td className="py-2.5 px-3 font-medium text-gray-800">{c.name}</td>
                    <td className="py-2.5 px-3 text-gray-600">{c.type}</td>
                    <td className="py-2.5 px-3 text-gray-600">{c.qty}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.available ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {c.available ? "متوفر" : "يحتاج تصنيع"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ─── 4. جدول الإكسسوارات ─── */}
        <Section
          title="4. جدول الإكسسوارات"
          subtitle="قائمة جميع الإكسسوارات والمواد المطلوبة"
          icon={<Package className="w-5 h-5" />}
          color="oklch(0.55 0.15 50)"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">الاسم</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">الموديل</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">الكمية</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">الوحدة</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {JOB_ORDER.accessories.map((a, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-medium text-gray-800">{a.name}</td>
                    <td className="py-2.5 px-3 font-mono text-xs text-gray-500">{a.model}</td>
                    <td className="py-2.5 px-3 text-gray-600">{a.qty}</td>
                    <td className="py-2.5 px-3 text-gray-600">{a.unit}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.status === "متوفر" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-gray-300 transition-colors">
            <Plus className="w-4 h-4" />
            إضافة إكسسوار
          </button>
        </Section>

        {/* ─── 5. اعتماد العينات ─── */}
        <Section
          title="5. اعتماد العينات / الألوان"
          subtitle="يجب اعتماد جميع العينات قبل بدء الإنتاج"
          icon={<Palette className="w-5 h-5" />}
          color="oklch(0.55 0.15 140)"
        >
          <div className="space-y-3">
            {JOB_ORDER.samples.map((s, i) => (
              <div
                key={i}
                className={`flex items-center justify-between rounded-xl px-4 py-3 border ${sampleStatuses[i] === "معتمد" ? "bg-green-50 border-green-100" : "bg-amber-50 border-amber-100"}`}
              >
                <div>
                  <div className="font-semibold text-sm text-gray-800">{s.type}</div>
                  <div className="text-xs text-gray-500">الكود: {s.code} · أُرسل: {s.sentAt}</div>
                  {sampleStatuses[i] === "معتمد" && s.approvedAt && (
                    <div className="text-xs text-green-600 mt-0.5">اعتُمد في: {s.approvedAt}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${sampleStatuses[i] === "معتمد" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {sampleStatuses[i]}
                  </span>
                  {sampleStatuses[i] !== "معتمد" && (
                    <Button
                      size="sm"
                      className="gap-1 h-7 text-xs"
                      style={{ background: "oklch(0.55 0.15 140)" }}
                      onClick={() => approveSample(i)}
                    >
                      <Check className="w-3 h-3" />
                      اعتماد
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {allSamplesApproved && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-center gap-2 bg-green-50 rounded-xl px-4 py-3 border border-green-100"
            >
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="font-semibold text-green-800 text-sm">جميع العينات معتمدة - يمكن بدء الإنتاج</span>
            </motion.div>
          )}
        </Section>

        {/* ─── 6. جدول الإنتاج ─── */}
        <Section
          title="6. جدول الإنتاج (Production Schedule)"
          subtitle="تواريخ الإنتاج وتخصيص خطوط التصنيع"
          icon={<Calendar className="w-5 h-5" />}
          color="oklch(0.55 0.15 160)"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "تاريخ بدء الإنتاج", value: JOB_ORDER.schedule.startDate },
              { label: "تاريخ الانتهاء المتوقع", value: JOB_ORDER.schedule.endDate },
              { label: "خط الإنتاج", value: JOB_ORDER.schedule.productionLine },
              { label: "الأولوية", value: JOB_ORDER.schedule.priority },
              { label: "المشرف المسؤول", value: JOB_ORDER.schedule.assignedSupervisor },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-400 mb-0.5">{item.label}</div>
                <div className="text-sm font-semibold text-gray-800">{item.value}</div>
              </div>
            ))}
          </div>
          {/* Timeline Visual */}
          <div className="mt-4 bg-gray-50 rounded-xl p-4">
            <div className="text-xs font-semibold text-gray-500 mb-3">الجدول الزمني</div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-xs text-gray-400">بدء الإنتاج</div>
                <div className="font-bold text-gray-900 text-sm">{JOB_ORDER.schedule.startDate}</div>
              </div>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: "45%", background: "oklch(0.55 0.15 160)" }} />
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400">الانتهاء</div>
                <div className="font-bold text-gray-900 text-sm">{JOB_ORDER.schedule.endDate}</div>
              </div>
            </div>
            <div className="text-center mt-2 text-xs text-gray-400">10 أيام إنتاج</div>
          </div>
        </Section>

        {/* ─── 7. ملاحظات خاصة ─── */}
        <Section
          title="7. ملاحظات خاصة"
          subtitle="تعليمات إضافية لجميع الأقسام"
          icon={<FileText className="w-5 h-5" />}
          color="oklch(0.55 0.15 280)"
        >
          {editingNotes ? (
            <div className="space-y-2">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-sm resize-none h-24"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-1.5"
                  style={{ background: "oklch(0.38 0.06 160)" }}
                  onClick={() => { setEditingNotes(false); toast.success("تم حفظ الملاحظات"); }}
                >
                  <Save className="w-3.5 h-3.5" /> حفظ
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingNotes(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-gray-700 leading-relaxed flex-1">{notes}</p>
              <button
                onClick={() => setEditingNotes(true)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                <Edit3 className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          )}
        </Section>

        {/* ─── 8. المستندات المرفقة ─── */}
        <Section
          title="8. المستندات المرفقة"
          subtitle="الرسومات والجداول والمرفقات الفنية"
          icon={<FileText className="w-5 h-5" />}
          color="oklch(0.55 0.15 220)"
        >
          <div className="space-y-2">
            {[
              { name: "رسومات المقاسات.pdf", size: "2.4 MB", type: "PDF" },
              { name: "جدول الألوان.xlsx", size: "145 KB", type: "Excel" },
              { name: "جدول الإكسسوارات.xlsx", size: "98 KB", type: "Excel" },
              { name: "صور عينات الألوان.zip", size: "8.2 MB", type: "ZIP" },
            ].map((doc) => (
              <div key={doc.name} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ background: doc.type === "PDF" ? "#FEE2E2" : doc.type === "Excel" ? "#D1FAE5" : "#E0E7FF", color: doc.type === "PDF" ? "#DC2626" : doc.type === "Excel" ? "#059669" : "#4F46E5" }}>
                    {doc.type.slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800">{doc.name}</div>
                    <div className="text-xs text-gray-400">{doc.size}</div>
                  </div>
                </div>
                <button className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  <Download className="w-3.5 h-3.5" /> تنزيل
                </button>
              </div>
            ))}
          </div>
          <button className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-gray-300 transition-colors">
            <Upload className="w-4 h-4" />
            رفع مستند جديد
          </button>
        </Section>
      </div>

      {/* Bottom Action Bar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>آخر تحديث: 2026-05-10 14:30</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <MessageCircle className="w-4 h-4" />
            إرسال للموزع عبر واتساب
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            style={{ background: "oklch(0.38 0.06 160)" }}
            onClick={() => toast.success("تم اعتماد ملف الطلب الفني وإرساله للإنتاج")}
          >
            <CheckCircle2 className="w-4 h-4" />
            اعتماد الملف وإرسال للإنتاج
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
