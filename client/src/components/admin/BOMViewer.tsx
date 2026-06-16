import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Clock,
  User,
  CheckCircle,
  AlertTriangle,
  ClipboardList,
  Sparkles,
  Loader2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
} from "lucide-react";

interface BOMViewerProps {
  bomId: number;
}

export function BOMViewer({ bomId }: BOMViewerProps) {
  const { data: bom, isLoading, error } = trpc.bom.get.useQuery({ bomId });
  const { data: history = [], isLoading: isLoadingHistory } = trpc.bom.getHistory.useQuery({ bomId });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
        <p className="text-sm">جاري تحميل تفاصيل المكونات والتكاليف...</p>
      </div>
    );
  }

  if (error || !bom) {
    return (
      <div className="p-6 text-center text-red-500 space-y-2" dir="rtl">
        <AlertCircle className="w-8 h-8 mx-auto text-red-400" />
        <p className="font-bold">فشل تحميل تفاصيل قائمة المواد</p>
        <p className="text-xs text-gray-400">{error?.message || "البيانات غير موجودة"}</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl px-2.5">مسودة</Badge>;
      case "active":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-xl px-2.5">نشط ومعتمد</Badge>;
      case "archived":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-xl px-2.5">مؤرشف</Badge>;
      default:
        return <Badge className="rounded-xl">{status}</Badge>;
    }
  };

  const materialsCost = bom.items.reduce((sum: number, item: any) => sum + item.totalCost, 0);
  const wastageAmount = materialsCost * (bom.wastagePercentage / 100);

  return (
    <div className="space-y-6 text-right max-h-[80vh] overflow-y-auto pr-1" dir="rtl">
      {/* رأس العرض */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{bom.productName}</h2>
          <p className="text-xs text-gray-400 mt-1">الرمز التعريفي (SKU): {bom.productSku} · إصدار: {bom.version}</p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(bom.status)}
        </div>
      </div>

      {/* تفاصيل الوصف */}
      {bom.description && (
        <div className="bg-gray-50/50 rounded-xl p-3.5 border border-gray-100 text-xs text-gray-500">
          <strong>الوصف:</strong> {bom.description}
        </div>
      )}

      {/* بطاقات ملخص التكاليف */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "إجمالي التكلفة المقدرة",
            value: `${bom.totalCost.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`,
            color: "oklch(0.50 0.16 140)", // Emerald green
            icon: <Sparkles className="w-4 h-4" />,
            badge: "المواد + العمالة + الهدر",
          },
          {
            label: "تكلفة المواد الخام",
            value: `${materialsCost.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`,
            color: "oklch(0.50 0.16 250)", // Blue
            icon: <ClipboardList className="w-4 h-4" />,
            badge: `${bom.items.length} مواد مضافة`,
          },
          {
            label: "تكلفة العمالة والتصنيع",
            value: `${bom.laborCost.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`,
            color: "oklch(0.50 0.16 330)", // Pink/purple
            icon: <User className="w-4 h-4" />,
            badge: "ثابتة لكل باب",
          },
          {
            label: `هدر المواد (${bom.wastagePercentage}%)`,
            value: `${wastageAmount.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`,
            color: "oklch(0.55 0.18 25)", // Orange
            icon: <TrendingUp className="w-4 h-4" />,
            badge: "معادلة الهدر القياسي",
          },
        ].map((card, i) => (
          <div key={i} className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{card.label}</span>
              <div
                className="p-1 rounded-lg"
                style={{ background: `${card.color}15`, color: card.color }}
              >
                {card.icon}
              </div>
            </div>
            <div className="text-base font-black text-gray-900 mt-1">{card.value}</div>
            <span className="text-[10px] text-gray-400 mt-2 block">{card.badge}</span>
          </div>
        ))}
      </div>

      {/* قائمة البنود */}
      <div className="space-y-3">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-emerald-600" />
          تفاصيل المواد والكميات
        </h3>

        <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/70 text-gray-500 font-bold text-xs border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-right">#</th>
                <th className="px-4 py-3 text-right">رمز المادة</th>
                <th className="px-4 py-3 text-right">الاسم</th>
                <th className="px-4 py-3 text-right">الكمية المطلوبة</th>
                <th className="px-4 py-3 text-right">تكلفة الوحدة</th>
                <th className="px-4 py-3 text-right">التكلفة الكلية</th>
                <th className="px-4 py-3 text-center">المخزن الحالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {bom.items.map((item: any, idx: number) => {
                const isShortage = item.currentStock < item.quantity;
                return (
                  <tr key={item.id} className="hover:bg-gray-50/40 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-xs">{item.itemCode}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">{item.itemName}</div>
                      {item.notes && <div className="text-[10px] text-gray-400 mt-0.5">{item.notes}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {item.quantity} <span className="text-xs text-gray-400">{item.itemUnit}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {item.unitCost.toFixed(2)} ر.س
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">
                      {item.totalCost.toFixed(2)} ر.س
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${
                          isShortage
                            ? "bg-red-50 text-red-600 border border-red-100"
                            : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        }`}
                      >
                        {isShortage && <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />}
                        {item.currentStock} {item.itemUnit}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* تفاصيل إضافية للـ BOM */}
      {bom.notes && (
        <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 text-xs text-gray-600">
          <strong className="block text-gray-900 mb-1.5">ملاحظات عامة:</strong>
          {bom.notes}
        </div>
      )}

      {/* بيانات المسؤول والموافقة */}
      {(bom.approvedBy || bom.createdAt) && (
        <div className="bg-gray-50/30 rounded-2xl p-4 border border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-500">
          {bom.createdAt && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>أنشئ بتاريخ: {new Date(bom.createdAt).toLocaleString("ar-SA")}</span>
            </div>
          )}
          {bom.status === "active" && bom.approvedAt && (
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>تم الاعتماد في: {new Date(bom.approvedAt).toLocaleString("ar-SA")}</span>
            </div>
          )}
        </div>
      )}

      {/* سجل التاريخ والتعديلات */}
      <div className="space-y-3 pt-2">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-gray-400" />
          سجل التغييرات والتحديثات
        </h3>
        
        {isLoadingHistory ? (
          <p className="text-xs text-gray-400">جاري تحميل سجل التعديل...</p>
        ) : history.length > 0 ? (
          <div className="border border-gray-100 rounded-2xl p-4 bg-white space-y-3.5 max-h-48 overflow-y-auto">
            {history.map((log: any) => (
              <div key={log.id} className="flex items-start gap-2 text-xs border-r-2 border-gray-200 pr-3 relative">
                <div className="w-2 h-2 rounded-full bg-gray-400 absolute right-[-5px] top-1.5" />
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-900">
                      {log.changeType === "created" && "تم إنشاء قائمة المكونات"}
                      {log.changeType === "updated" && "تم إجراء تعديل وتحديث"}
                      {log.changeType === "approved" && "تم اعتماد ونشر قائمة المواد"}
                      {log.changeType === "archived" && "تم أرشفة القائمة"}
                    </span>
                    <span className="text-[10px] text-gray-400">{new Date(log.changedAt).toLocaleString("ar-SA")}</span>
                  </div>
                  {log.changeReason && <p className="text-gray-500 mt-0.5 bg-gray-50 p-1.5 rounded">{log.changeReason}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-2">لا توجد سجلات تعديل سابقة</p>
        )}
      </div>
    </div>
  );
}
