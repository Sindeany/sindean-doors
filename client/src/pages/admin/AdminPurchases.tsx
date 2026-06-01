/**
 * AdminPurchases — فواتير المشتريات
 * تسجيل فواتير الموردين وتتبع ضريبة المدخلات القابلة للاسترداد
 */

import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ShoppingCart,
  Plus,
  RefreshCw,
  CheckCircle,
  DollarSign,
  TrendingDown,
  FileText,
  Package,
  Zap,
  Wrench,
  MoreHorizontal,
  AlertCircle,
  Trash2,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fromHalala = (h: number) =>
  (h / 100).toLocaleString("ar-SA", { minimumFractionDigits: 2 });

type Category = "materials" | "equipment" | "services" | "utilities" | "other";

const CATEGORIES: {
  value: Category;
  labelAr: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: "materials",
    labelAr: "مواد خام",
    icon: <Package className="w-4 h-4" />,
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    value: "equipment",
    labelAr: "معدات وآلات",
    icon: <Wrench className="w-4 h-4" />,
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    value: "services",
    labelAr: "خدمات",
    icon: <MoreHorizontal className="w-4 h-4" />,
    color: "bg-green-50 text-green-700 border-green-200",
  },
  {
    value: "utilities",
    labelAr: "مرافق",
    icon: <Zap className="w-4 h-4" />,
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  {
    value: "other",
    labelAr: "أخرى",
    icon: <FileText className="w-4 h-4" />,
    color: "bg-gray-50 text-gray-600 border-gray-200",
  },
];

function getCategoryInfo(cat: string | null) {
  return CATEGORIES.find(c => c.value === cat) ?? CATEGORIES[4];
}

// ── New Purchase Dialog ───────────────────────────────────────────────────────
function NewPurchaseDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    invoiceNumber: "",
    supplierName: "",
    supplierVatNumber: "",
    issueDate: today,
    subtotalRiyals: "",
    vatAmountRiyals: "",
    category: "materials" as Category,
    description: "",
    notes: "",
  });
  const [autoVat, setAutoVat] = useState(true);

  const subtotal = parseFloat(form.subtotalRiyals) || 0;
  const vatAmount = autoVat
    ? parseFloat((subtotal * 0.15).toFixed(2))
    : parseFloat(form.vatAmountRiyals) || 0;
  const total = subtotal + vatAmount;

  const mutation = trpc.purchases.create.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ فاتورة الشراء وتسجيل القيد");
      onSuccess();
      onClose();
    },
    onError: e => toast.error(e.message),
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة فاتورة شراء جديدة</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>رقم الفاتورة *</Label>
              <Input
                placeholder="INV-001"
                value={form.invoiceNumber}
                onChange={e => set("invoiceNumber", e.target.value)}
                dir="ltr"
              />
            </div>
            <div>
              <Label>تاريخ الفاتورة *</Label>
              <Input
                type="date"
                value={form.issueDate}
                onChange={e => set("issueDate", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>اسم المورّد *</Label>
            <Input
              placeholder="اسم الشركة المورّدة"
              value={form.supplierName}
              onChange={e => set("supplierName", e.target.value)}
            />
          </div>
          <div>
            <Label>الرقم الضريبي للمورّد (اختياري)</Label>
            <Input
              placeholder="300000000000003"
              value={form.supplierVatNumber}
              onChange={e => set("supplierVatNumber", e.target.value)}
              dir="ltr"
              maxLength={15}
            />
          </div>
          <div>
            <Label>تصنيف المشتريات</Label>
            <Select
              value={form.category}
              onValueChange={v => set("category", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    <span className="flex items-center gap-2">
                      {c.icon} {c.labelAr}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>وصف المشتريات *</Label>
            <Input
              placeholder="مثال: مواد خام WPC لإنتاج أبواب"
              value={form.description}
              onChange={e => set("description", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>المبلغ قبل الضريبة (ر.س) *</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={form.subtotalRiyals}
                onChange={e => set("subtotalRiyals", e.target.value)}
                dir="ltr"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                ضريبة القيمة المضافة (ر.س)
                <button
                  type="button"
                  onClick={() => setAutoVat(!autoVat)}
                  className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${autoVat ? "bg-blue-50 text-blue-600 border-blue-200" : "border-gray-200 text-gray-400"}`}
                >
                  {autoVat ? "15% تلقائي" : "يدوي"}
                </button>
              </Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={autoVat ? vatAmount.toFixed(2) : form.vatAmountRiyals}
                readOnly={autoVat}
                onChange={e => set("vatAmountRiyals", e.target.value)}
                dir="ltr"
                className={autoVat ? "bg-gray-50 text-gray-500" : ""}
              />
            </div>
          </div>
          {subtotal > 0 && (
            <div className="bg-blue-50 rounded-lg px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm text-blue-600">الإجمالي الكلي</span>
              <span className="font-bold text-blue-800 text-lg font-mono">
                {total.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}{" "}
                ر.س
              </span>
            </div>
          )}
          <div>
            <Label>ملاحظات (اختياري)</Label>
            <Input
              placeholder="أي ملاحظات إضافية"
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            disabled={
              !form.invoiceNumber ||
              !form.supplierName ||
              !form.subtotalRiyals ||
              !form.description ||
              mutation.isPending
            }
            onClick={() =>
              mutation.mutate({
                invoiceNumber: form.invoiceNumber,
                supplierName: form.supplierName,
                supplierVatNumber: form.supplierVatNumber || undefined,
                issueDate: form.issueDate,
                subtotalRiyals: subtotal,
                vatAmountRiyals: vatAmount,
                category: form.category,
                description: form.description,
                notes: form.notes || undefined,
              })
            }
          >
            {mutation.isPending ? "جارٍ الحفظ…" : "حفظ الفاتورة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminPurchases() {
  const { lang } = useLanguage();
  const isRtl = lang !== "en";
  const [showNew, setShowNew] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPayment, setFilterPayment] = useState<string>("all");

  const {
    data: purchases = [],
    refetch,
    isLoading,
  } = trpc.purchases.list.useQuery();
  const updatePaymentMutation = trpc.purchases.updatePaymentStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة الدفع");
      refetch();
    },
  });
  const deleteMutation = trpc.purchases.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الفاتورة");
      refetch();
    },
  });

  // Filter
  const filtered = purchases.filter(p => {
    if (filterCategory !== "all" && p.category !== filterCategory) return false;
    if (filterPayment !== "all" && p.paymentStatus !== filterPayment)
      return false;
    return true;
  });

  // KPI summary
  const totalPurchasesHalala = purchases.reduce(
    (s, p) => s + p.subtotalHalala,
    0
  );
  const totalVatHalala = purchases.reduce((s, p) => s + p.vatAmountHalala, 0);
  const unpaidHalala = purchases
    .filter(p => p.paymentStatus === "unpaid")
    .reduce((s, p) => s + p.totalHalala, 0);

  return (
    <AdminLayout
      title={isRtl ? "فواتير المشتريات" : "Purchase Invoices"}
      subtitle={
        isRtl
          ? "تسجيل فواتير الموردين وتتبع ضريبة المدخلات القابلة للاسترداد"
          : "Supplier invoices & input VAT tracking"
      }
    >
      <div className="space-y-4" dir={isRtl ? "rtl" : "ltr"}>
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "إجمالي المشتريات (قبل الضريبة)",
              value: `${fromHalala(totalPurchasesHalala)} ر.س`,
              icon: <ShoppingCart className="w-5 h-5" />,
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              label: "ضريبة المدخلات القابلة للاسترداد",
              value: `${fromHalala(totalVatHalala)} ر.س`,
              icon: <TrendingDown className="w-5 h-5" />,
              color: "text-green-600",
              bg: "bg-green-50",
            },
            {
              label: "مستحق السداد للموردين",
              value: `${fromHalala(unpaidHalala)} ر.س`,
              icon: <AlertCircle className="w-5 h-5" />,
              color: "text-red-600",
              bg: "bg-red-50",
            },
            {
              label: "إجمالي الفواتير المسجّلة",
              value: purchases.length.toString(),
              icon: <FileText className="w-5 h-5" />,
              color: "text-gray-600",
              bg: "bg-gray-100",
            },
          ].map((card, i) => (
            <div key={i} className="bg-white rounded-xl border p-4">
              <div
                className={`w-9 h-9 ${card.bg} ${card.color} rounded-lg flex items-center justify-center mb-3`}
              >
                {card.icon}
              </div>
              <div className={`text-lg font-bold font-mono ${card.color}`}>
                {card.value}
              </div>
              <div className="text-xs text-gray-500 mt-1">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="كل الفئات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفئات</SelectItem>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.labelAr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPayment} onValueChange={setFilterPayment}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue placeholder="حالة الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="unpaid">غير مدفوعة</SelectItem>
                <SelectItem value="paid">مدفوعة</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 ml-1" /> إضافة فاتورة
          </Button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" /> جارٍ
            التحميل…
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
            <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>لا توجد فواتير مشتريات بعد</p>
            <p className="text-xs mt-1">
              سجّل فواتير الموردين لتتبع ضريبة المدخلات
            </p>
            <Button size="sm" className="mt-4" onClick={() => setShowNew(true)}>
              <Plus className="w-4 h-4 ml-1" /> إضافة أول فاتورة
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">
                    رقم الفاتورة
                  </th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">
                    المورّد
                  </th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium hidden md:table-cell">
                    الوصف
                  </th>
                  <th className="text-center py-3 px-4 text-gray-500 font-medium w-24">
                    الفئة
                  </th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium w-24">
                    التاريخ
                  </th>
                  <th className="text-center py-3 px-4 text-gray-500 font-medium w-28">
                    المبلغ
                  </th>
                  <th className="text-center py-3 px-4 text-gray-500 font-medium w-24">
                    الضريبة
                  </th>
                  <th className="text-center py-3 px-4 text-gray-500 font-medium w-28">
                    الإجمالي
                  </th>
                  <th className="text-center py-3 px-4 text-gray-500 font-medium w-24">
                    الدفع
                  </th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const cat = getCategoryInfo(p.category);
                  return (
                    <tr
                      key={p.id}
                      className="border-b last:border-0 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">
                        <code className="text-xs font-mono text-blue-600">
                          {p.invoiceNumber}
                        </code>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-800 text-sm">
                          {p.supplierName}
                        </div>
                        {p.supplierVatNumber && (
                          <div className="text-xs text-gray-400 font-mono">
                            {p.supplierVatNumber}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm hidden md:table-cell max-w-[180px] truncate">
                        {p.description}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cat.color}`}
                        >
                          {cat.icon} {cat.labelAr}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {p.issueDate}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-sm">
                        {p.subtotalRiyals}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-sm text-green-600">
                        {p.vatAmountRiyals}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-sm font-bold">
                        {p.totalRiyals}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {p.paymentStatus === "paid" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" /> مدفوعة
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              updatePaymentMutation.mutate({
                                id: p.id,
                                paymentStatus: "paid",
                              })
                            }
                            className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 hover:bg-amber-100 transition-colors"
                          >
                            تسديد
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            if (window.confirm("هل تريد حذف هذه الفاتورة؟")) {
                              deleteMutation.mutate({ id: p.id });
                            }
                          }}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 bg-gray-50">
                <tr>
                  <td
                    colSpan={5}
                    className="py-2 px-4 font-bold text-gray-700 text-sm"
                  >
                    الإجمالي ({filtered.length} فاتورة)
                  </td>
                  <td className="py-2 px-4 text-center font-bold font-mono text-sm">
                    {fromHalala(
                      filtered.reduce((s, p) => s + p.subtotalHalala, 0)
                    )}
                  </td>
                  <td className="py-2 px-4 text-center font-bold font-mono text-sm text-green-600">
                    {fromHalala(
                      filtered.reduce((s, p) => s + p.vatAmountHalala, 0)
                    )}
                  </td>
                  <td className="py-2 px-4 text-center font-bold font-mono text-sm">
                    {fromHalala(
                      filtered.reduce((s, p) => s + p.totalHalala, 0)
                    )}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {showNew && (
        <NewPurchaseDialog
          onClose={() => setShowNew(false)}
          onSuccess={refetch}
        />
      )}
    </AdminLayout>
  );
}
