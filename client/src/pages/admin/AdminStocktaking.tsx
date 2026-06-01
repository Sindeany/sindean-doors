// ============================================================
// AdminStocktaking - نظام الجرد الدوري الشامل
// مقارنة الرصيد الفعلي بالنظري + تقرير الفروقات + اعتماد الجرد
// ============================================================
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, Search, Filter, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown,
  Minus, FileText, Printer, Save, RotateCcw, Package,
  Calendar, User, Hash, ArrowRight, Warehouse, ShieldCheck,
  Info, Download, Eye, EyeOff, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import type { MaterialCategory } from "@/pages/admin/AdminInventory";

// ─── أنواع الجرد ──────────────────────────────────────────────
interface StocktakingEntry {
  itemId: string;
  itemCode: string;
  itemName: string;
  category: MaterialCategory;
  unit: string;
  systemQty: number;      // الرصيد النظري (من النظام)
  actualQty: number | ""; // الرصيد الفعلي (يُدخله المستخدم)
  difference: number;     // الفرق (فعلي - نظري)
  status: "surplus" | "deficit" | "match" | "pending"; // الحالة
  note: string;           // ملاحظة
}

interface StocktakingSession {
  id: string;
  date: string;
  performedBy: string;
  location: string;
  entries: StocktakingEntry[];
  status: "draft" | "completed" | "approved";
  totalItems: number;
  matchCount: number;
  surplusCount: number;
  deficitCount: number;
  totalVarianceValue: number;
}

// ─── تصنيفات المواد ───────────────────────────────────────────
const CATEGORY_LABELS: Record<MaterialCategory, string> = {
  wpc_board: "ألواح WPC",
  film: "أفلام PVC",
  edge: "حواف",
  frame: "إطارات",
  lock: "أقفال",
  hinge: "مفصلات",
  accessory: "إكسسوارات",
  packaging: "مواد تغليف",
  chemical: "مواد كيميائية",
};

const CATEGORY_COLORS: Record<MaterialCategory, string> = {
  wpc_board: "oklch(0.45 0.15 250)",
  film:      "oklch(0.45 0.15 300)",
  edge:      "oklch(0.45 0.15 160)",
  frame:     "oklch(0.45 0.15 30)",
  lock:      "oklch(0.45 0.15 0)",
  hinge:     "oklch(0.45 0.15 60)",
  accessory: "oklch(0.45 0.15 90)",
  packaging: "oklch(0.45 0.15 200)",
  chemical:  "oklch(0.45 0.10 280)",
};

const SUPERVISORS = ["م. خالد العتيبي", "م. سعد الغامدي", "م. فهد الحربي", "م. عبدالله الزهراني", "م. محمد العسيري"];
const LOCATIONS = ["المستودع الرئيسي", "مستودع A", "مستودع B", "مستودع C", "مستودع D", "مستودع E", "جميع المستودعات"];

// ─── دالة توليد تقرير PDF ─────────────────────────────────────
function printStocktakingReport(session: StocktakingSession) {
  const today = new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
  const matchPct = session.totalItems > 0 ? Math.round((session.matchCount / session.totalItems) * 100) : 0;

  const rows = session.entries.map(e => {
    const diffColor = e.status === "match" ? "#166534" : e.status === "surplus" ? "#1e40af" : "#991b1b";
    const diffSign = e.difference > 0 ? "+" : "";
    const statusLabel = e.status === "match" ? "✅ مطابق" : e.status === "surplus" ? "📈 زيادة" : e.status === "deficit" ? "📉 نقص" : "⏳ معلق";
    return `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:8px 12px;font-size:12px;color:#374151;">${e.itemCode}</td>
        <td style="padding:8px 12px;font-size:12px;color:#111827;font-weight:600;">${e.itemName}</td>
        <td style="padding:8px 12px;font-size:12px;color:#374151;text-align:center;">${CATEGORY_LABELS[e.category]}</td>
        <td style="padding:8px 12px;font-size:13px;font-weight:700;color:#1f2937;text-align:center;">${e.systemQty}</td>
        <td style="padding:8px 12px;font-size:13px;font-weight:700;color:#1f2937;text-align:center;">${e.actualQty === "" ? "—" : e.actualQty}</td>
        <td style="padding:8px 12px;font-size:13px;font-weight:700;color:${diffColor};text-align:center;">${e.actualQty === "" ? "—" : `${diffSign}${e.difference}`}</td>
        <td style="padding:8px 12px;font-size:11px;text-align:center;">${statusLabel}</td>
        <td style="padding:8px 12px;font-size:11px;color:#6b7280;">${e.note || "—"}</td>
      </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تقرير الجرد الدوري - ${session.id}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #111; direction: rtl; }
    @media print { @page { size: A4 landscape; margin: 15mm; } .no-print { display: none; } }
    .header { background: linear-gradient(135deg, #1a3a2a 0%, #2d5a3d 100%); color: white; padding: 24px 32px; border-radius: 12px; margin-bottom: 24px; }
    .logo { font-size: 26px; font-weight: 900; letter-spacing: -1px; }
    .logo span { color: #86efac; }
    .title { font-size: 18px; font-weight: 700; margin-top: 4px; opacity: 0.9; }
    .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .meta-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 16px; }
    .meta-label { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
    .meta-value { font-size: 14px; font-weight: 700; color: #111; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .kpi { border-radius: 10px; padding: 14px 16px; text-align: center; }
    .kpi-num { font-size: 28px; font-weight: 900; }
    .kpi-label { font-size: 11px; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead tr { background: #1a3a2a; color: white; }
    thead th { padding: 10px 12px; font-weight: 700; font-size: 12px; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    .footer { margin-top: 32px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    .sig-box { border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; text-align: center; }
    .sig-title { font-size: 12px; font-weight: 700; color: #374151; margin-bottom: 32px; }
    .sig-line { border-top: 1px solid #9ca3af; padding-top: 8px; font-size: 11px; color: #6b7280; }
    .print-btn { position: fixed; bottom: 24px; left: 24px; background: #1a3a2a; color: white; border: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">سنديان <span>للأبواب</span></div>
    <div class="title">تقرير الجرد الدوري — ${session.id}</div>
    <div style="font-size:13px;opacity:0.8;margin-top:4px;">تاريخ الطباعة: ${today}</div>
  </div>

  <div class="meta">
    <div class="meta-card"><div class="meta-label">تاريخ الجرد</div><div class="meta-value">${session.date}</div></div>
    <div class="meta-card"><div class="meta-label">المشرف المسؤول</div><div class="meta-value">${session.performedBy}</div></div>
    <div class="meta-card"><div class="meta-label">الموقع</div><div class="meta-value">${session.location}</div></div>
    <div class="meta-card"><div class="meta-label">الحالة</div><div class="meta-value">${session.status === "approved" ? "✅ معتمد" : session.status === "completed" ? "📋 مكتمل" : "📝 مسودة"}</div></div>
  </div>

  <div class="kpi-grid">
    <div class="kpi" style="background:#f0fdf4;border:1px solid #bbf7d0;">
      <div class="kpi-num" style="color:#166534;">${session.matchCount}</div>
      <div class="kpi-label" style="color:#166534;">مادة مطابقة</div>
    </div>
    <div class="kpi" style="background:#eff6ff;border:1px solid #bfdbfe;">
      <div class="kpi-num" style="color:#1e40af;">${session.surplusCount}</div>
      <div class="kpi-label" style="color:#1e40af;">مادة بزيادة</div>
    </div>
    <div class="kpi" style="background:#fef2f2;border:1px solid #fecaca;">
      <div class="kpi-num" style="color:#991b1b;">${session.deficitCount}</div>
      <div class="kpi-label" style="color:#991b1b;">مادة بنقص</div>
    </div>
    <div class="kpi" style="background:#fafafa;border:1px solid #e5e7eb;">
      <div class="kpi-num" style="color:#374151;">${matchPct}%</div>
      <div class="kpi-label" style="color:#374151;">نسبة المطابقة</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>الكود</th>
        <th>اسم المادة</th>
        <th>الفئة</th>
        <th>الرصيد النظري</th>
        <th>الرصيد الفعلي</th>
        <th>الفرق</th>
        <th>الحالة</th>
        <th>الملاحظة</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    <div class="sig-box"><div class="sig-title">المشرف المسؤول عن الجرد</div><div class="sig-line">التوقيع: ________________</div></div>
    <div class="sig-box"><div class="sig-title">مدير المستودع</div><div class="sig-line">التوقيع: ________________</div></div>
    <div class="sig-box"><div class="sig-title">مدير الإنتاج</div><div class="sig-line">التوقيع: ________________</div></div>
  </div>

  <button class="print-btn no-print" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
  <script>setTimeout(() => window.print(), 600);</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); }
}

// ─── الصفحة الرئيسية ─────────────────────────────────────────
export default function AdminStocktaking() {
  const today = new Date().toISOString().split("T")[0];
  const { lang } = useLanguage();

  // ── حالة الجلسة ──
  const [sessionId]         = useState(`ST-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`);
  const [performedBy, setPerformedBy] = useState("");
  const [location, setLocation]       = useState("جميع المستودعات");
  const [sessionDate, setSessionDate] = useState(today);
  const [sessionStatus, setSessionStatus] = useState<"draft" | "completed" | "approved">("draft");

  // ── حالة الجرد ──
  const [entries, setEntries] = useState<StocktakingEntry[]>([]);

  // ── فلاتر ──
  const [searchQ, setSearchQ]         = useState("");
  const [filterCat, setFilterCat]     = useState<MaterialCategory | "all">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "match" | "surplus" | "deficit">("all");
  const [showOnlyDiff, setShowOnlyDiff] = useState(false);

  // ── tRPC ──
  const { data: dbItems, isLoading, refetch } = trpc.inventory.list.useQuery(undefined, { refetchInterval: false });
  const utils = trpc.useUtils();
  const loadedFromDB = useRef(false);

  const bulkAdjustMutation = trpc.inventory.bulkAdjustForStocktaking.useMutation({
    onSuccess: () => {
      setSessionStatus("approved");
      toast.success(`تم اعتماد الجرد ${sessionId} وتحديث المخزون`, {
        description: `${stats.matchCount} مطابق · ${stats.surplusCount} زيادة · ${stats.deficitCount} نقص`,
      });
      utils.inventory.list.invalidate();
    },
    onError: (err) => {
      toast.error("فشل اعتماد الجرد: " + err.message);
    },
  });

  useEffect(() => {
    if (!dbItems || loadedFromDB.current) return;
    loadedFromDB.current = true;
    setEntries(dbItems.map(item => ({
      itemId:    String(item.id),
      itemCode:  item.code,
      itemName:  item.name,
      category:  item.category as MaterialCategory,
      unit:      item.unit,
      systemQty: item.currentQty,
      actualQty: "",
      difference: 0,
      status:    "pending" as const,
      note:      "",
    })));
  }, [dbItems]);

  // ── تحديث إدخال ──
  const updateEntry = useCallback((itemId: string, field: "actualQty" | "note", value: string | number) => {
    setEntries(prev => prev.map(e => {
      if (e.itemId !== itemId) return e;
      if (field === "actualQty") {
        const actual = value === "" ? "" : Number(value);
        const diff = actual === "" ? 0 : (actual as number) - e.systemQty;
        const status: StocktakingEntry["status"] =
          actual === "" ? "pending" :
          diff === 0 ? "match" :
          diff > 0 ? "surplus" : "deficit";
        return { ...e, actualQty: actual, difference: diff, status };
      }
      return { ...e, note: value as string };
    }));
  }, []);

  // ── إعادة تحميل الأرصدة النظرية ──
  const refreshSystemQty = useCallback(async () => {
    const { data } = await refetch();
    if (!data) return;
    setEntries(prev => prev.map(e => {
      const item = data.find(i => String(i.id) === e.itemId);
      if (!item) return e;
      const actual = e.actualQty;
      const diff = actual === "" ? 0 : (actual as number) - item.currentQty;
      const status: StocktakingEntry["status"] =
        actual === "" ? "pending" :
        diff === 0 ? "match" :
        diff > 0 ? "surplus" : "deficit";
      return { ...e, systemQty: item.currentQty, difference: diff, status };
    }));
    toast.success("تم تحديث الأرصدة النظرية من المخزون");
  }, [refetch]);

  // ── الإحصائيات ──
  const stats = useMemo(() => {
    const filled = entries.filter(e => e.actualQty !== "");
    const matchCount   = filled.filter(e => e.status === "match").length;
    const surplusCount = filled.filter(e => e.status === "surplus").length;
    const deficitCount = filled.filter(e => e.status === "deficit").length;
    const pendingCount = entries.filter(e => e.status === "pending").length;
    const totalVariance = filled.reduce((s, e) => s + Math.abs(e.difference), 0);
    const completionPct = entries.length > 0 ? Math.round((filled.length / entries.length) * 100) : 0;
    return { matchCount, surplusCount, deficitCount, pendingCount, totalVariance, completionPct, filledCount: filled.length };
  }, [entries]);

  // ── الإدخالات المفلترة ──
  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (searchQ && !e.itemName.includes(searchQ) && !e.itemCode.includes(searchQ)) return false;
      if (filterCat !== "all" && e.category !== filterCat) return false;
      if (filterStatus !== "all" && e.status !== filterStatus) return false;
      if (showOnlyDiff && e.status !== "surplus" && e.status !== "deficit") return false;
      return true;
    });
  }, [entries, searchQ, filterCat, filterStatus, showOnlyDiff]);

  // ── اعتماد الجرد وتحديث المخزون ──
  function handleApprove() {
    if (!performedBy) { toast.error("أدخل اسم المشرف المسؤول"); return; }
    const unfilled = entries.filter(e => e.actualQty === "");
    if (unfilled.length > 0) {
      toast.error(`يوجد ${unfilled.length} مادة لم يُدخل رصيدها الفعلي بعد`);
      return;
    }
    bulkAdjustMutation.mutate({
      sessionRef:  sessionId,
      performedBy,
      date:        sessionDate,
      adjustments: entries.map(e => ({
        itemId:    parseInt(e.itemId),
        actualQty: e.actualQty as number,
        note:      e.note || undefined,
      })),
    });
  }

  // ── حفظ مسودة ──
  function handleSaveDraft() {
    setSessionStatus("completed");
    toast.success("تم حفظ الجرد كمسودة مكتملة");
  }

  // ── طباعة التقرير ──
  function handlePrint() {
    const session: StocktakingSession = {
      id: sessionId,
      date: sessionDate,
      performedBy: performedBy || "غير محدد",
      location,
      entries,
      status: sessionStatus,
      totalItems: entries.length,
      matchCount: stats.matchCount,
      surplusCount: stats.surplusCount,
      deficitCount: stats.deficitCount,
      totalVarianceValue: stats.totalVariance,
    };
    printStocktakingReport(session);
  }

  // ── ألوان الحالة ──
  function statusStyle(status: StocktakingEntry["status"]) {
    switch (status) {
      case "match":   return { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700",  badge: "bg-green-100 text-green-700" };
      case "surplus": return { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700",   badge: "bg-blue-100 text-blue-700" };
      case "deficit": return { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700",    badge: "bg-red-100 text-red-700" };
      default:        return { bg: "bg-gray-50",   border: "border-gray-200",   text: "text-gray-500",   badge: "bg-gray-100 text-gray-500" };
    }
  }

  return (
    <AdminLayout title={lang === "zh" ? "定期盘点" : lang === "en" ? "Periodic Stocktaking" : "الجرد الدوري"}>
      <div className="space-y-6">

        {/* ── حالة التحميل ──────────────────────────────────── */}
        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-sm">جاري تحميل بيانات المخزون...</span>
          </div>
        )}

        {!isLoading && entries.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-bold mb-1">لا توجد مواد في المخزون</p>
            <p className="text-xs">أضف مواد من صفحة المخزون أولاً</p>
          </div>
        )}

        {(isLoading || entries.length === 0) ? null : (<>

        {/* ── رأس الصفحة ─────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl" style={{ background: "oklch(0.95 0.03 160)", color: "oklch(0.38 0.06 160)" }}>
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900" style={{ fontFamily: "DM Serif Display, serif" }}>
                الجرد الدوري
              </h1>
              <p className="text-sm text-gray-500">مقارنة الرصيد الفعلي بالنظري وتحديث المخزون</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={refreshSystemQty} className="gap-2">
              <RefreshCw className="w-4 h-4" /> تحديث الأرصدة
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" /> طباعة PDF
            </Button>
            {sessionStatus !== "approved" && (
              <>
                <Button variant="outline" size="sm" onClick={handleSaveDraft} className="gap-2">
                  <Save className="w-4 h-4" /> حفظ مسودة
                </Button>
                <Button size="sm" onClick={handleApprove} disabled={bulkAdjustMutation.isPending} className="gap-2"
                  style={{ background: "oklch(0.38 0.06 160)", color: "white" }}>
                  {bulkAdjustMutation.isPending
                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                    : <ShieldCheck className="w-4 h-4" />}
                  اعتماد الجرد وتحديث المخزون
                </Button>
              </>
            )}
            {sessionStatus === "approved" && (
              <Badge className="bg-green-100 text-green-700 border-green-200 px-4 py-2 text-sm font-bold">
                ✅ جرد معتمد ومُطبَّق
              </Badge>
            )}
          </div>
        </div>

        {/* ── بيانات الجلسة ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-gray-500" />
            <h2 className="font-bold text-gray-800">بيانات جلسة الجرد</h2>
            <Badge className="bg-gray-100 text-gray-600 text-xs">{sessionId}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">تاريخ الجرد</label>
              <div className="relative">
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)}
                  className="pr-9 text-right text-sm" disabled={sessionStatus === "approved"} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">المشرف المسؤول <span className="text-red-500">*</span></label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select value={performedBy} onChange={e => setPerformedBy(e.target.value)}
                  disabled={sessionStatus === "approved"}
                  className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-right appearance-none focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">اختر المشرف...</option>
                  {SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">الموقع / المستودع</label>
              <div className="relative">
                <Warehouse className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select value={location} onChange={e => setLocation(e.target.value)}
                  disabled={sessionStatus === "approved"}
                  className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-right appearance-none focus:outline-none focus:ring-2 focus:ring-green-500">
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">اكتمال الجرد</label>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "oklch(0.50 0.16 140)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.completionPct}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
                <span className="text-sm font-bold text-gray-700 w-12 text-left">{stats.completionPct}%</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{stats.filledCount} من {entries.length} مادة</p>
            </div>
          </div>
        </div>

        {/* ── KPI ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "مطابق", value: stats.matchCount,   icon: <CheckCircle className="w-5 h-5" />, color: "oklch(0.45 0.15 140)", bg: "oklch(0.97 0.02 140)" },
            { label: "زيادة", value: stats.surplusCount, icon: <TrendingUp   className="w-5 h-5" />, color: "oklch(0.45 0.15 250)", bg: "oklch(0.97 0.02 250)" },
            { label: "نقص",   value: stats.deficitCount, icon: <TrendingDown className="w-5 h-5" />, color: "oklch(0.45 0.15 15)",  bg: "oklch(0.97 0.02 15)"  },
            { label: "معلق",  value: stats.pendingCount, icon: <Minus        className="w-5 h-5" />, color: "oklch(0.45 0.05 0)",   bg: "oklch(0.97 0.01 0)"   },
          ].map((k, i) => (
            <motion.div key={k.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: k.bg, color: k.color }}>
                  {k.icon}
                </div>
                <div>
                  <div className="text-2xl font-black" style={{ color: k.color }}>{k.value}</div>
                  <div className="text-xs text-gray-500">{k.label}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── فلاتر ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex flex-wrap gap-3 items-center">
            {/* بحث */}
            <div className="relative flex-1 min-w-48">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="بحث بالاسم أو الكود..." className="pr-9 text-right text-sm" />
            </div>
            {/* فئة */}
            <select value={filterCat} onChange={e => setFilterCat(e.target.value as MaterialCategory | "all")}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-right appearance-none focus:outline-none focus:ring-2 focus:ring-green-500 min-w-36">
              <option value="all">جميع الفئات</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            {/* حالة */}
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-right appearance-none focus:outline-none focus:ring-2 focus:ring-green-500 min-w-36">
              <option value="all">جميع الحالات</option>
              <option value="pending">معلق</option>
              <option value="match">مطابق</option>
              <option value="surplus">زيادة</option>
              <option value="deficit">نقص</option>
            </select>
            {/* إظهار الفروقات فقط */}
            <button
              onClick={() => setShowOnlyDiff(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border transition-all ${
                showOnlyDiff
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "bg-white border-gray-200 text-gray-600"
              }`}
            >
              {showOnlyDiff ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              الفروقات فقط
            </button>
            <span className="text-sm text-gray-400">{filtered.length} مادة</span>
          </div>
        </div>

        {/* ── جدول الجرد ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* رأس الجدول */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500">
            <div className="col-span-1">الكود</div>
            <div className="col-span-3">اسم المادة</div>
            <div className="col-span-1 text-center">الفئة</div>
            <div className="col-span-1 text-center">الوحدة</div>
            <div className="col-span-2 text-center">الرصيد النظري</div>
            <div className="col-span-2 text-center">الرصيد الفعلي</div>
            <div className="col-span-1 text-center">الفرق</div>
            <div className="col-span-1 text-center">الحالة</div>
          </div>

          {/* صفوف الجرد */}
          <div className="divide-y divide-gray-50">
            <AnimatePresence>
              {filtered.map((entry, i) => {
                const st = statusStyle(entry.status);
                const diffSign = entry.difference > 0 ? "+" : "";
                return (
                  <motion.div
                    key={entry.itemId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={`grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-gray-50 transition-colors ${
                      entry.status !== "pending" ? st.bg : ""
                    }`}
                  >
                    {/* الكود */}
                    <div className="col-span-1">
                      <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg">{entry.itemCode}</span>
                    </div>
                    {/* الاسم */}
                    <div className="col-span-3">
                      <div className="text-sm font-bold text-gray-900 leading-tight">{entry.itemName}</div>
                    </div>
                    {/* الفئة */}
                    <div className="col-span-1 text-center">
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ background: CATEGORY_COLORS[entry.category] + "20", color: CATEGORY_COLORS[entry.category] }}>
                        {CATEGORY_LABELS[entry.category]}
                      </span>
                    </div>
                    {/* الوحدة */}
                    <div className="col-span-1 text-center text-xs text-gray-500">{entry.unit}</div>
                    {/* الرصيد النظري */}
                    <div className="col-span-2 text-center">
                      <span className="text-base font-black text-gray-700">{entry.systemQty}</span>
                    </div>
                    {/* الرصيد الفعلي - حقل إدخال */}
                    <div className="col-span-2 text-center">
                      <Input
                        type="number"
                        value={entry.actualQty}
                        onChange={e => updateEntry(entry.itemId, "actualQty", e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="أدخل..."
                        min={0}
                        disabled={sessionStatus === "approved"}
                        className={`text-center text-sm font-bold w-full border-2 transition-all ${
                          entry.status === "match"   ? "border-green-300 bg-green-50" :
                          entry.status === "surplus" ? "border-blue-300 bg-blue-50" :
                          entry.status === "deficit" ? "border-red-300 bg-red-50" :
                          "border-gray-200"
                        }`}
                      />
                    </div>
                    {/* الفرق */}
                    <div className="col-span-1 text-center">
                      {entry.actualQty === "" ? (
                        <span className="text-gray-300 text-sm">—</span>
                      ) : (
                        <span className={`text-sm font-black ${
                          entry.difference === 0 ? "text-green-600" :
                          entry.difference > 0 ? "text-blue-600" : "text-red-600"
                        }`}>
                          {diffSign}{entry.difference}
                        </span>
                      )}
                    </div>
                    {/* الحالة */}
                    <div className="col-span-1 text-center">
                      {entry.status === "match"   && <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />}
                      {entry.status === "surplus" && <TrendingUp   className="w-5 h-5 text-blue-500 mx-auto" />}
                      {entry.status === "deficit" && <TrendingDown className="w-5 h-5 text-red-500 mx-auto" />}
                      {entry.status === "pending" && <Minus        className="w-5 h-5 text-gray-300 mx-auto" />}
                    </div>

                    {/* صف الملاحظة (يظهر عند وجود فرق) */}
                    {(entry.status === "surplus" || entry.status === "deficit") && (
                      <div className="col-span-12 pt-1 pb-2">
                        <Input
                          value={entry.note}
                          onChange={e => updateEntry(entry.itemId, "note", e.target.value)}
                          placeholder="سبب الفرق (اختياري)..."
                          disabled={sessionStatus === "approved"}
                          className="text-xs text-right border-dashed"
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">لا توجد مواد تطابق الفلتر المحدد</p>
            </div>
          )}
        </div>

        {/* ── ملخص الفروقات ──────────────────────────────────── */}
        {(stats.surplusCount > 0 || stats.deficitCount > 0) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="font-bold text-gray-800">ملخص الفروقات</h2>
              <Badge className="bg-amber-100 text-amber-700 text-xs">{stats.surplusCount + stats.deficitCount} فرق</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {entries.filter(e => e.status === "surplus" || e.status === "deficit").map(e => {
                const isDeficit = e.status === "deficit";
                const diffSign = e.difference > 0 ? "+" : "";
                return (
                  <div key={e.itemId} className={`flex items-center gap-3 rounded-xl p-3 border ${
                    isDeficit ? "bg-red-50 border-red-100" : "bg-blue-50 border-blue-100"
                  }`}>
                    {isDeficit
                      ? <TrendingDown className="w-4 h-4 text-red-500 flex-shrink-0" />
                      : <TrendingUp   className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-800 truncate">{e.itemName}</div>
                      <div className="text-xs text-gray-500">
                        نظري: {e.systemQty} · فعلي: {e.actualQty} · فرق: <span className={`font-bold ${isDeficit ? "text-red-600" : "text-blue-600"}`}>{diffSign}{e.difference}</span> {e.unit}
                      </div>
                      {e.note && <div className="text-xs text-gray-400 mt-0.5">📝 {e.note}</div>}
                    </div>
                    <Badge className={isDeficit ? "bg-red-100 text-red-700 text-xs" : "bg-blue-100 text-blue-700 text-xs"}>
                      {isDeficit ? "نقص" : "زيادة"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── تعليمات ────────────────────────────────────────── */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 space-y-1">
            <p className="font-bold">كيفية إجراء الجرد:</p>
            <p>1. أدخل الرصيد الفعلي لكل مادة بعد العد الفعلي في المستودع.</p>
            <p>2. سيُحسب الفرق تلقائياً ويُصنَّف كـ "مطابق" أو "زيادة" أو "نقص".</p>
            <p>3. أضف ملاحظة لأي فرق لتوثيق السبب.</p>
            <p>4. بعد الانتهاء، اضغط "اعتماد الجرد" لتحديث أرصدة المخزون بالأرصدة الفعلية.</p>
          </div>
        </div>

        </>)}
      </div>
    </AdminLayout>
  );
}
