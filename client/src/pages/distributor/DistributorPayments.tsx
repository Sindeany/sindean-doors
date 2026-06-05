// ============================================================
// Distributor Payments Page — عرض دفعات الموزّع (قراءة فقط)
// Sindian Doors - Distributor Portal
// ============================================================
import DistributorLayout from "@/components/distributor/DistributorLayout";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { DollarSign, Loader2, AlertCircle } from "lucide-react";

const METHOD_LABELS: Record<string, { ar: string; en: string }> = {
  cash: { ar: "نقداً", en: "Cash" },
  bank_transfer: { ar: "تحويل بنكي", en: "Bank Transfer" },
  cheque: { ar: "شيك", en: "Cheque" },
  card: { ar: "بطاقة", en: "Card" },
  other: { ar: "أخرى", en: "Other" },
};

const STATUS_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  confirmed: { ar: "مؤكّدة", en: "Confirmed", color: "bg-emerald-50 text-emerald-700" },
  pending: { ar: "معلّقة", en: "Pending", color: "bg-amber-50 text-amber-700" },
  cancelled: { ar: "ملغاة", en: "Cancelled", color: "bg-red-50 text-red-700" },
};

export default function DistributorPayments() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";

  const { data: payments, isLoading, isError } = trpc.payments.myPayments.useQuery(undefined, {
    retry: false,
  });

  const tr = (o: { ar: string; en: string }) => (isRtl ? o.ar : o.en);

  const headers = isRtl
    ? ["التاريخ", "المبلغ", "طريقة الدفع", "المرجع", "رقم الطلب", "الحالة", "ملاحظة"]
    : ["Date", "Amount", "Method", "Reference", "Order", "Status", "Note"];

  return (
    <DistributorLayout
      title={isRtl ? "سجل المدفوعات" : "Payments"}
      subtitle={isRtl ? "عرض جميع دفعاتك المسجّلة" : "View all your recorded payments"}
    >
      <div className="space-y-5">
        {isLoading && (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm">{isRtl ? "تعذّر تحميل المدفوعات" : "Failed to load payments"}</p>
          </div>
        )}

        {!isLoading && !isError && (payments?.length ?? 0) === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
            <DollarSign className="w-8 h-8 text-gray-300" />
            <p className="text-sm">{isRtl ? "لا توجد دفعات مسجّلة بعد" : "No payments recorded yet"}</p>
          </div>
        )}

        {!isLoading && !isError && (payments?.length ?? 0) > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "oklch(0.98 0.005 80)" }}>
                  {headers.map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 ${isRtl ? "text-right" : "text-left"} text-xs font-medium`}
                      style={{ color: "oklch(0.45 0.03 160)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(payments ?? []).map((p) => {
                  const methodLabel = METHOD_LABELS[p.method] ?? { ar: p.method, en: p.method };
                  const statusCfg = STATUS_LABELS[p.status] ?? { ar: p.status, en: p.status, color: "bg-gray-50 text-gray-600" };
                  const dateStr = p.paymentDate
                    ? new Date(p.paymentDate).toISOString().slice(0, 10)
                    : "—";
                  return (
                    <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50/40 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-600">{dateStr}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                        {(p.amount ?? 0).toLocaleString()} {isRtl ? "ر.س" : "SAR"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{tr(methodLabel)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">{p.reference || "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">{p.orderNumber || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                          {tr(statusCfg)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.note || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DistributorLayout>
  );
}
