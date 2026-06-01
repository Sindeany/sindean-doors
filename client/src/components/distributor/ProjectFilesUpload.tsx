// ============================================================
// ProjectFilesUpload - Upload Project Plans & Files
// Sindian Doors - Distributor Portal
// ============================================================
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Upload, FileText, Image, File, Trash2,
  CheckCircle, AlertCircle, Eye, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: "uploading" | "done" | "error";
  progress: number;
  url?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <Image className="w-5 h-5 text-blue-400" />;
  if (type === "application/pdf") return <FileText className="w-5 h-5 text-red-400" />;
  return <File className="w-5 h-5 text-gray-400" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProjectFilesUpload({ isOpen, onClose, orderId }: Props) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [projectName, setProjectName] = useState("");
  const [notes, setNotes] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (newFiles: FileList) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

    Array.from(newFiles).forEach((file) => {
      if (!allowed.includes(file.type) && !file.name.match(/\.(dwg|dxf|rvt)$/i)) {
        toast.error(isRtl ? `نوع الملف غير مدعوم: ${file.name}` : `Unsupported file type: ${file.name}`);
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error(isRtl ? `الملف ${file.name} أكبر من 50 MB` : `File ${file.name} exceeds 50 MB`);
        return;
      }

      const id = `file-${Date.now()}-${Math.random()}`;
      const newFile: UploadedFile = {
        id, name: file.name, size: file.size, type: file.type,
        status: "uploading", progress: 0,
      };
      setFiles((prev) => [...prev, newFile]);

      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 25;
        if (progress >= 100) {
          clearInterval(interval);
          setFiles((prev) => prev.map((f) => f.id === id ? { ...f, status: "done", progress: 100 } : f));
        } else {
          setFiles((prev) => prev.map((f) => f.id === id ? { ...f, progress: Math.min(progress, 95) } : f));
        }
      }, 300);
    });
  };

  const handleSubmit = () => {
    if (files.filter((f) => f.status === "done").length === 0) {
      toast.error(isRtl ? "يرجى رفع ملف واحد على الأقل" : "Please upload at least one file");
      return;
    }
    toast.success(isRtl ? "تم إرسال ملفات المشروع بنجاح!" : "Project files submitted successfully!");
    onClose();
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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
          dir={dir}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold" style={{ color: "oklch(0.25 0.04 160)", fontFamily: "DM Serif Display, serif" }}>
                {isRtl ? "رفع ملفات المشروع" : "Upload Project Files"}
              </h2>
              {orderId && (
                <p className="text-xs text-gray-400 mt-0.5">{isRtl ? `مرتبط بالطلب: ${orderId}` : `Linked to order: ${orderId}`}</p>
              )}
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Project name */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                {isRtl ? "اسم المشروع" : "Project Name"}
              </label>
              <Input
                placeholder={isRtl ? "مثال: فيلا الرياض - الدور الأول" : "e.g. Riyadh Villa - First Floor"}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all"
              style={{
                borderColor: dragOver ? "oklch(0.38 0.06 160)" : "#d1d5db",
                background: dragOver ? "oklch(0.38 0.06 160 / 0.03)" : "#fafafa",
              }}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <h3 className="font-semibold text-sm text-gray-600 mb-1">
                {isRtl ? "اسحب الملفات هنا أو انقر للرفع" : "Drag files here or click to upload"}
              </h3>
              <p className="text-xs text-gray-400">
                {isRtl ? "PDF, صور, DWG, DXF, Word, Excel · حجم أقصى 50 MB للملف" : "PDF, Images, DWG, DXF, Word, Excel · Max 50 MB per file"}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp,.dwg,.dxf,.rvt,.xlsx,.xls,.doc,.docx"
                className="hidden"
                onChange={(e) => { if (e.target.files) handleFiles(e.target.files); }}
              />
            </div>

            {/* File list */}
            <AnimatePresence>
              {files.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white"
                >
                  <div className="flex-shrink-0">{getFileIcon(file.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-700 truncate">{file.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{formatSize(file.size)}</div>
                    {file.status === "uploading" && (
                      <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: "oklch(0.38 0.06 160)" }}
                          initial={{ width: 0 }}
                          animate={{ width: `${file.progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1.5">
                    {file.status === "done" && <CheckCircle className="w-5 h-5 text-green-500" />}
                    {file.status === "error" && <AlertCircle className="w-5 h-5 text-red-400" />}
                    {file.status === "uploading" && (
                      <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "oklch(0.38 0.06 160)", borderTopColor: "transparent" }} />
                    )}
                    <button
                      onClick={() => setFiles((prev) => prev.filter((f) => f.id !== file.id))}
                      className="p-1 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-gray-300 hover:text-red-400" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                {isRtl ? "ملاحظات إضافية" : "Additional Notes"}
              </label>
              <textarea
                rows={3}
                placeholder={isRtl ? "أي تعليمات أو ملاحظات خاصة بالمشروع..." : "Any special instructions or project notes..."}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-offset-0"
                style={{ "--tw-ring-color": "oklch(0.38 0.06 160 / 0.3)" } as React.CSSProperties}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <Button variant="outline" onClick={onClose}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={files.filter((f) => f.status === "done").length === 0}
              className="gap-1.5 text-white"
              style={{ background: "oklch(0.38 0.06 160)" }}
            >
              <Upload className="w-4 h-4" />
              {isRtl
                ? `إرسال ${files.filter((f) => f.status === "done").length} ملف`
                : `Submit ${files.filter((f) => f.status === "done").length} File(s)`}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
