// ============================================================
// BulkOrderUpload - Excel Bulk Order Upload + Drafts Manager
// Sindian Doors - Distributor Portal
// ============================================================
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Upload, FileSpreadsheet, Download, Check, AlertCircle,
  Trash2, Edit3, Send, Clock, ChevronRight, ChevronLeft,
  RefreshCw, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Types ─────────────────────────────────────────────────
interface BulkRow {
  id: string;
  doorType: string;
  wood: string;
  color: string;
  width: number;
  height: number;
  quantity: number;
  notes: string;
  status: "valid" | "error";
  error?: string;
}

interface Draft {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  totalAmount: number;
  orderType: "purchase_order" | "rfq" | "sample_request";
}

// ─── Mock Drafts ────────────────────────────────────────────
const MOCK_DRAFTS: Draft[] = [
  {
    id: "draft-1",
    name: "مشروع فيلا الرياض - الدور الأول",
    createdAt: "2026-04-15",
    updatedAt: "2026-04-18",
    itemCount: 12,
    totalAmount: 18500,
    orderType: "purchase_order",
  },
  {
    id: "draft-2",
    name: "مجمع سكني الخبر",
    createdAt: "2026-04-10",
    updatedAt: "2026-04-16",
    itemCount: 45,
    totalAmount: 67200,
    orderType: "rfq",
  },
  {
    id: "draft-3",
    name: "فندق الأفق - الطابق الثالث",
    createdAt: "2026-04-05",
    updatedAt: "2026-04-05",
    itemCount: 8,
    totalAmount: 12400,
    orderType: "purchase_order",
  },
];

// ─── Mock parsed Excel rows ──────────────────────────────────
const MOCK_PARSED: BulkRow[] = [
  { id: "r1", doorType: "باب داخلي", wood: "بلوط طبيعي", color: "طبيعي", width: 90, height: 210, quantity: 5, notes: "", status: "valid" },
  { id: "r2", doorType: "باب خارجي", wood: "ساج طبيعي", color: "جوز داكن", width: 100, height: 210, quantity: 2, notes: "حفر قفل يمين", status: "valid" },
  { id: "r3", doorType: "باب حريق", wood: "جوز أمريكي", color: "فحمي", width: 90, height: 210, quantity: 10, notes: "", status: "valid" },
  { id: "r4", doorType: "باب داخلي", wood: "صنوبر", color: "أبيض", width: 350, height: 210, quantity: 3, notes: "", status: "error", error: "العرض 350 سم يتجاوز الحد الأقصى 200 سم" },
  { id: "r5", doorType: "باب منزلق", wood: "MDF", color: "رمادي", width: 160, height: 240, quantity: 1, notes: "مع ريل علوي", status: "valid" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenDraft: (draft: Draft) => void;
}

export default function BulkOrderUpload({ isOpen, onClose, onOpenDraft }: Props) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"upload" | "drafts">("upload");
  const [uploadState, setUploadState] = useState<"idle" | "parsing" | "preview" | "submitting">("idle");
  const [parsedRows, setParsedRows] = useState<BulkRow[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>(MOCK_DRAFTS);
  const [dragOver, setDragOver] = useState(false);

  const validRows = parsedRows.filter((r) => r.status === "valid");
  const errorRows = parsedRows.filter((r) => r.status === "error");

  const handleFileSelect = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error(isRtl ? "يرجى رفع ملف Excel أو CSV فقط" : "Please upload an Excel or CSV file only");
      return;
    }
    setUploadState("parsing");
    // Simulate parsing
    setTimeout(() => {
      setParsedRows(MOCK_PARSED);
      setUploadState("preview");
    }, 1500);
  };

  const handleSubmitBulk = () => {
    setUploadState("submitting");
    setTimeout(() => {
      toast.success(isRtl ? `تم إرسال ${validRows.length} طلب بنجاح!` : `${validRows.length} orders submitted successfully!`);
      setUploadState("idle");
      setParsedRows([]);
      onClose();
    }, 1200);
  };

  const handleDeleteDraft = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    toast.success(isRtl ? "تم حذف المسودة" : "Draft deleted");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
          dir={dir}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold" style={{ color: "oklch(0.25 0.04 160)", fontFamily: "DM Serif Display, serif" }}>
              {isRtl ? "الطلبات بالجملة والمسودات" : "Bulk Orders & Drafts"}
            </h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-6">
            {[
              { id: "upload" as const, label: isRtl ? "رفع Excel" : "Upload Excel", icon: FileSpreadsheet },
              { id: "drafts" as const, label: isRtl ? `المسودات (${drafts.length})` : `Drafts (${drafts.length})`, icon: Clock },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors"
                style={{
                  borderColor: activeTab === id ? "oklch(0.38 0.06 160)" : "transparent",
                  color: activeTab === id ? "oklch(0.38 0.06 160)" : "#9ca3af",
                }}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              {/* ── Upload Tab ── */}
              {activeTab === "upload" && (
                <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {uploadState === "idle" && (
                    <div className="space-y-4">
                      {/* Drop zone */}
                      <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOver(false);
                          const file = e.dataTransfer.files[0];
                          if (file) handleFileSelect(file);
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all"
                        style={{
                          borderColor: dragOver ? "oklch(0.38 0.06 160)" : "#d1d5db",
                          background: dragOver ? "oklch(0.38 0.06 160 / 0.03)" : "white",
                        }}
                      >
                        <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-green-500" />
                        <h3 className="font-semibold text-gray-700 mb-1">
                          {isRtl ? "اسحب ملف Excel هنا أو انقر للرفع" : "Drag Excel file here or click to upload"}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {isRtl ? "يدعم: .xlsx, .xls, .csv" : "Supports: .xlsx, .xls, .csv"}
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                        />
                      </div>

                      {/* Download template */}
                      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <div>
                          <div className="font-semibold text-sm text-blue-700">
                            {isRtl ? "تحميل نموذج Excel" : "Download Excel Template"}
                          </div>
                          <div className="text-xs text-blue-500 mt-0.5">
                            {isRtl ? "استخدم النموذج لضمان صحة البيانات" : "Use the template to ensure correct data format"}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50"
                          onClick={() => toast.info(isRtl ? "جارٍ تحميل النموذج..." : "Downloading template...")}
                        >
                          <Download className="w-4 h-4" />
                          {isRtl ? "تحميل" : "Download"}
                        </Button>
                      </div>

                      {/* Instructions */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">{isRtl ? "تعليمات الرفع" : "Upload Instructions"}</h4>
                        <ol className="space-y-1.5 text-xs text-gray-500 list-decimal list-inside">
                          {(isRtl ? [
                            "حمّل نموذج Excel من الزر أعلاه",
                            "أدخل بيانات المنتجات في الأعمدة المحددة",
                            "تأكد من صحة المقاسات (العرض 50-200 سم، الارتفاع 150-300 سم)",
                            "ارفع الملف المكتمل",
                            "راجع البيانات وأرسل الطلب",
                          ] : [
                            "Download the Excel template from the button above",
                            "Enter product data in the specified columns",
                            "Ensure dimensions are valid (Width 50-200 cm, Height 150-300 cm)",
                            "Upload the completed file",
                            "Review the data and submit the order",
                          ]).map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  )}

                  {uploadState === "parsing" && (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                      <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: "oklch(0.38 0.06 160)", borderTopColor: "transparent" }} />
                      <p className="text-sm text-gray-500">{isRtl ? "جارٍ قراءة الملف وفحص البيانات..." : "Reading file and validating data..."}</p>
                    </div>
                  )}

                  {uploadState === "preview" && (
                    <div className="space-y-4">
                      {/* Summary */}
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: isRtl ? "إجمالي الصفوف" : "Total Rows", value: parsedRows.length, color: "oklch(0.38 0.06 160)" },
                          { label: isRtl ? "صفوف صالحة" : "Valid Rows", value: validRows.length, color: "#22c55e" },
                          { label: isRtl ? "أخطاء" : "Errors", value: errorRows.length, color: errorRows.length > 0 ? "#ef4444" : "#22c55e" },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="text-center p-3 bg-gray-50 rounded-xl">
                            <div className="text-2xl font-bold" style={{ color }}>{value}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Rows table */}
                      <div className="rounded-xl border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-100">
                                {[
                                  isRtl ? "#" : "#",
                                  isRtl ? "نوع الباب" : "Door Type",
                                  isRtl ? "الخشب" : "Wood",
                                  isRtl ? "اللون" : "Color",
                                  isRtl ? "المقاس" : "Size",
                                  isRtl ? "الكمية" : "Qty",
                                  isRtl ? "الحالة" : "Status",
                                ].map((h) => (
                                  <th key={h} className="px-3 py-2 text-start font-semibold text-gray-500">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {parsedRows.map((row, i) => (
                                <tr key={row.id} className={`border-b border-gray-50 ${row.status === "error" ? "bg-red-50" : ""}`}>
                                  <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                                  <td className="px-3 py-2 font-medium text-gray-700">{row.doorType}</td>
                                  <td className="px-3 py-2 text-gray-500">{row.wood}</td>
                                  <td className="px-3 py-2 text-gray-500">{row.color}</td>
                                  <td className="px-3 py-2 font-mono text-gray-600">{row.width}×{row.height}</td>
                                  <td className="px-3 py-2 text-gray-600">{row.quantity}</td>
                                  <td className="px-3 py-2">
                                    {row.status === "valid" ? (
                                      <span className="flex items-center gap-1 text-green-600">
                                        <Check className="w-3.5 h-3.5" />
                                        {isRtl ? "صالح" : "Valid"}
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-red-500" title={row.error}>
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        {isRtl ? "خطأ" : "Error"}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {errorRows.length > 0 && (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                          <div className="flex items-center gap-2 text-red-600 font-semibold text-sm mb-2">
                            <AlertCircle className="w-4 h-4" />
                            {isRtl ? "الأخطاء المكتشفة:" : "Detected Errors:"}
                          </div>
                          {errorRows.map((r) => (
                            <div key={r.id} className="text-xs text-red-500 mb-1">• {r.error}</div>
                          ))}
                          <p className="text-xs text-red-400 mt-2">
                            {isRtl ? "سيتم إرسال الصفوف الصالحة فقط. يمكنك إصلاح الأخطاء وإعادة الرفع." : "Only valid rows will be submitted. You can fix errors and re-upload."}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Drafts Tab ── */}
              {activeTab === "drafts" && (
                <motion.div key="drafts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {drafts.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">{isRtl ? "لا توجد مسودات محفوظة" : "No saved drafts"}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {drafts.map((draft) => (
                        <motion.div
                          key={draft.id}
                          layout
                          className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:shadow-sm transition-shadow"
                        >
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.38 0.06 160 / 0.08)" }}>
                            <Clock className="w-5 h-5" style={{ color: "oklch(0.38 0.06 160)" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate" style={{ color: "oklch(0.25 0.04 160)" }}>{draft.name}</div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                              <span>{isRtl ? `${draft.itemCount} منتج` : `${draft.itemCount} items`}</span>
                              <span>·</span>
                              <span>{draft.totalAmount.toLocaleString()} {isRtl ? "ر.س" : "SAR"}</span>
                              <span>·</span>
                              <span>{isRtl ? `آخر تعديل: ${draft.updatedAt}` : `Last edited: ${draft.updatedAt}`}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => { onOpenDraft(draft); onClose(); }}
                              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-all hover:shadow-sm"
                              style={{ color: "oklch(0.38 0.06 160)", borderColor: "oklch(0.38 0.06 160 / 0.3)" }}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              {isRtl ? "إكمال" : "Continue"}
                            </button>
                            <button
                              onClick={() => handleDeleteDraft(draft.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-gray-300 hover:text-red-400" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          {activeTab === "upload" && (uploadState === "preview" || uploadState === "submitting") && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <Button
                variant="outline"
                onClick={() => { setUploadState("idle"); setParsedRows([]); }}
                className="gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                {isRtl ? "رفع ملف آخر" : "Upload Another File"}
              </Button>
              <Button
                onClick={handleSubmitBulk}
                disabled={validRows.length === 0}
                className="gap-1.5 text-white"
                style={{ background: "oklch(0.38 0.06 160)" }}
              >
                <Send className="w-4 h-4" />
                {isRtl ? `إرسال ${validRows.length} طلب` : `Submit ${validRows.length} Orders`}
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
