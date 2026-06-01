/**
 * AdminAccounting — النظام المحاسبي
 * دليل الحسابات | القيود اليومية | تقرير ضريبة القيمة المضافة
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
  BookOpen,
  GitBranch,
  FileText,
  Plus,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  RefreshCw,
  DollarSign,
  BarChart2,
  Layers,
  AlertCircle,
  Download,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

interface Account {
  id: number;
  code: string;
  name: string;
  nameEn: string;
  type: AccountType;
  normalBalance: "debit" | "credit";
  parentCode?: string | null;
  isSystem: boolean;
  isActive: boolean;
}

interface JournalLine {
  id: number;
  accountCode: string;
  accountName: string;
  debitHalala: number;
  creditHalala: number;
  description?: string | null;
  sequence: number;
}

interface JournalEntry {
  id: number;
  entryNumber: string;
  entryDate: string;
  description: string;
  sourceType: string;
  sourceId?: number | null;
  totalDebitHalala: number;
  totalCreditHalala: number;
  totalDebitRiyals: string;
  totalCreditRiyals: string;
  isPosted: boolean;
  createdAt: number;
  lines: JournalLine[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fromHalala = (h: number) =>
  (h / 100).toLocaleString("ar-SA", { minimumFractionDigits: 2 });
const riyals = (h: number) => `${fromHalala(h)} ر.س`;

const TYPE_LABELS: Record<
  AccountType,
  { ar: string; color: string; bg: string }
> = {
  asset: { ar: "أصول", color: "text-blue-600", bg: "bg-blue-50" },
  liability: { ar: "خصوم", color: "text-red-600", bg: "bg-red-50" },
  equity: { ar: "حقوق ملكية", color: "text-purple-600", bg: "bg-purple-50" },
  revenue: { ar: "إيرادات", color: "text-green-600", bg: "bg-green-50" },
  expense: { ar: "مصروفات", color: "text-orange-600", bg: "bg-orange-50" },
};

const SOURCE_LABELS: Record<string, string> = {
  invoice: "فاتورة ضريبية",
  payment: "استلام دفعة",
  manual: "قيد يدوي",
  vat_settlement: "تسوية ضريبة",
};

// ── Tab definitions ───────────────────────────────────────────────────────────
type Tab = "accounts" | "journal" | "vat";

// ── Quarter helpers ───────────────────────────────────────────────────────────
function currentQuarter(): { start: string; end: string; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const q = Math.floor(now.getMonth() / 3);
  const starts = ["01-01", "04-01", "07-01", "10-01"];
  const ends = ["03-31", "06-30", "09-30", "12-31"];
  return {
    start: `${y}-${starts[q]}`,
    end: `${y}-${ends[q]}`,
    label: `الربع ${["الأول", "الثاني", "الثالث", "الرابع"][q]} ${y}`,
  };
}

// ── New Account Dialog ────────────────────────────────────────────────────────
function NewAccountDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    nameEn: "",
    type: "asset" as AccountType,
    normalBalance: "debit" as "debit" | "credit",
    parentCode: "",
  });

  const mutation = trpc.accounting.createAccount.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الحساب");
      onSuccess();
      onClose();
    },
    onError: e => toast.error(e.message),
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة حساب جديد</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>رمز الحساب *</Label>
              <Input
                placeholder="مثال: 1150"
                value={form.code}
                onChange={e => set("code", e.target.value)}
              />
            </div>
            <div>
              <Label>الحساب الأب</Label>
              <Input
                placeholder="مثال: 1100"
                value={form.parentCode}
                onChange={e => set("parentCode", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>اسم الحساب (عربي) *</Label>
            <Input
              placeholder="اسم الحساب"
              value={form.name}
              onChange={e => set("name", e.target.value)}
            />
          </div>
          <div>
            <Label>اسم الحساب (إنجليزي)</Label>
            <Input
              placeholder="Account Name"
              value={form.nameEn}
              onChange={e => set("nameEn", e.target.value)}
              dir="ltr"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>نوع الحساب</Label>
              <Select value={form.type} onValueChange={v => set("type", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(TYPE_LABELS) as [
                      AccountType,
                      { ar: string },
                    ][]
                  ).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الرصيد الطبيعي</Label>
              <Select
                value={form.normalBalance}
                onValueChange={v => set("normalBalance", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">مدين (Debit)</SelectItem>
                  <SelectItem value="credit">دائن (Credit)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            onClick={() =>
              mutation.mutate({
                ...form,
                parentCode: form.parentCode || undefined,
              })
            }
            disabled={!form.code || !form.name || mutation.isPending}
          >
            {mutation.isPending ? "جارٍ الحفظ…" : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── New Manual Journal Entry Dialog ──────────────────────────────────────────
function NewJournalDialog({
  accounts,
  onClose,
  onSuccess,
}: {
  accounts: Account[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [entryDate, setEntryDate] = useState(today);
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState([
    {
      accountCode: "",
      accountName: "",
      debitRiyals: 0,
      creditRiyals: 0,
      description: "",
    },
    {
      accountCode: "",
      accountName: "",
      debitRiyals: 0,
      creditRiyals: 0,
      description: "",
    },
  ]);

  const totalDebit = lines.reduce((s, l) => s + (l.debitRiyals || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.creditRiyals || 0), 0);
  const isBalanced =
    Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const mutation = trpc.accounting.createManualEntry.useMutation({
    onSuccess: r => {
      toast.success(`تم حفظ القيد ${r.entryNumber}`);
      onSuccess();
      onClose();
    },
    onError: e => toast.error(e.message),
  });

  const setLine = (i: number, k: string, v: string | number) =>
    setLines(p => p.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));

  const selectAccount = (i: number, code: string) => {
    const acc = accounts.find(a => a.code === code);
    setLines(p =>
      p.map((l, idx) =>
        idx === i
          ? { ...l, accountCode: code, accountName: acc?.name ?? "" }
          : l
      )
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>قيد يومي جديد</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>تاريخ القيد</Label>
              <Input
                type="date"
                value={entryDate}
                onChange={e => setEntryDate(e.target.value)}
              />
            </div>
            <div>
              <Label>البيان</Label>
              <Input
                placeholder="وصف القيد"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Lines table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">
                    الحساب
                  </th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600 w-28">
                    مدين (ر.س)
                  </th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600 w-28">
                    دائن (ر.س)
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">
                    بيان
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1.5">
                      <Select
                        value={line.accountCode}
                        onValueChange={v => selectAccount(i, v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="اختر الحساب" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts
                            .filter(a => a.isActive)
                            .map(a => (
                              <SelectItem key={a.code} value={a.code}>
                                {a.code} — {a.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        className="h-8 text-center text-xs"
                        value={line.debitRiyals || ""}
                        onChange={e =>
                          setLine(
                            i,
                            "debitRiyals",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        className="h-8 text-center text-xs"
                        value={line.creditRiyals || ""}
                        onChange={e =>
                          setLine(
                            i,
                            "creditRiyals",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        className="h-8 text-xs"
                        placeholder="بيان"
                        value={line.description}
                        onChange={e =>
                          setLine(i, "description", e.target.value)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2">
                <tr>
                  <td className="px-3 py-2 text-sm font-bold text-gray-700">
                    الإجمالي
                  </td>
                  <td
                    className={`px-3 py-2 text-center font-bold text-sm ${isBalanced ? "text-green-600" : "text-red-600"}`}
                  >
                    {totalDebit.toFixed(2)}
                  </td>
                  <td
                    className={`px-3 py-2 text-center font-bold text-sm ${isBalanced ? "text-green-600" : "text-red-600"}`}
                  >
                    {totalCredit.toFixed(2)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setLines(p => [
                  ...p,
                  {
                    accountCode: "",
                    accountName: "",
                    debitRiyals: 0,
                    creditRiyals: 0,
                    description: "",
                  },
                ])
              }
            >
              <Plus className="w-4 h-4 ml-1" /> إضافة سطر
            </Button>
            {!isBalanced && totalDebit > 0 && (
              <span className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> القيد غير متوازن (فرق:{" "}
                {Math.abs(totalDebit - totalCredit).toFixed(2)} ر.س)
              </span>
            )}
            {isBalanced && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> القيد متوازن
              </span>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            disabled={!isBalanced || !description || mutation.isPending}
            onClick={() =>
              mutation.mutate({
                entryDate,
                description,
                lines: lines.filter(l => l.accountCode),
              })
            }
          >
            {mutation.isPending ? "جارٍ الحفظ…" : "تسجيل القيد"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Chart of Accounts Tab ─────────────────────────────────────────────────────
function AccountsTab() {
  const [showNew, setShowNew] = useState(false);
  const { data: accounts = [], refetch } =
    trpc.accounting.getAccounts.useQuery();
  const { data: balances = [] } = trpc.accounting.getAccountBalances.useQuery();
  const seedMutation = trpc.accounting.seedDefaultAccounts.useMutation({
    onSuccess: r => {
      toast.success(`تم تهيئة ${r.count} حساباً`);
      refetch();
    },
  });
  const toggleMutation = trpc.accounting.toggleAccount.useMutation({
    onSuccess: () => refetch(),
  });

  const balanceMap = Object.fromEntries(balances.map(b => [b.code, b]));
  const grouped = (Object.keys(TYPE_LABELS) as AccountType[]).map(type => ({
    type,
    ...TYPE_LABELS[type],
    accounts: accounts.filter(a => a.type === type),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <BookOpen className="w-4 h-4" />
          <span>{accounts.length} حساب مُسجَّل</span>
        </div>
        <div className="flex gap-2">
          {accounts.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              <RefreshCw className="w-4 h-4 ml-1" />
              {seedMutation.isPending
                ? "جارٍ التهيئة…"
                : "تهيئة الحسابات الافتراضية"}
            </Button>
          )}
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 ml-1" /> حساب جديد
          </Button>
        </div>
      </div>

      {grouped.map(({ type, ar, color, bg, accounts: accs }) =>
        accs.length === 0 ? null : (
          <div
            key={type}
            className="bg-white rounded-xl border overflow-hidden"
          >
            <div
              className={`px-4 py-2.5 flex items-center justify-between ${bg}`}
            >
              <span className={`font-bold text-sm ${color}`}>{ar}</span>
              <span className={`text-xs font-medium ${color}`}>
                {accs.length} حساب
              </span>
            </div>
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-right py-2 px-4 text-gray-500 font-medium w-24">
                    الرمز
                  </th>
                  <th className="text-right py-2 px-4 text-gray-500 font-medium">
                    الحساب
                  </th>
                  <th className="text-right py-2 px-4 text-gray-500 font-medium hidden md:table-cell">
                    الأب
                  </th>
                  <th className="text-center py-2 px-4 text-gray-500 font-medium w-28">
                    رصيد المدين
                  </th>
                  <th className="text-center py-2 px-4 text-gray-500 font-medium w-28">
                    رصيد الدائن
                  </th>
                  <th className="text-center py-2 px-4 text-gray-500 font-medium w-28">
                    الرصيد
                  </th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {accs.map(acc => {
                  const b = balanceMap[acc.code];
                  return (
                    <tr
                      key={acc.id}
                      className={`border-b last:border-0 hover:bg-gray-50 ${!acc.isActive ? "opacity-40" : ""}`}
                    >
                      <td className="py-2 px-4">
                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                          {acc.code}
                        </code>
                      </td>
                      <td className="py-2 px-4">
                        <div className="font-medium text-gray-800">
                          {acc.name}
                        </div>
                        {acc.nameEn && (
                          <div className="text-xs text-gray-400 dir-ltr">
                            {acc.nameEn}
                          </div>
                        )}
                        {acc.isSystem && (
                          <span className="text-xs text-blue-500">(نظام)</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-gray-400 text-xs hidden md:table-cell">
                        {acc.parentCode ?? "—"}
                      </td>
                      <td className="py-2 px-4 text-center font-mono text-sm text-blue-700">
                        {b ? fromHalala(b.debitHalala) : "0.00"}
                      </td>
                      <td className="py-2 px-4 text-center font-mono text-sm text-red-600">
                        {b ? fromHalala(b.creditHalala) : "0.00"}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {b ? (
                          <span
                            className={`font-bold font-mono text-sm ${b.isNegative ? "text-red-600" : "text-green-700"}`}
                          >
                            {b.isNegative ? "-" : ""}
                            {b.balanceRiyals}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {!acc.isSystem && (
                          <button
                            onClick={() =>
                              toggleMutation.mutate({
                                id: acc.id,
                                isActive: !acc.isActive,
                              })
                            }
                            className={`text-xs px-2 py-0.5 rounded-full border ${acc.isActive ? "border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500" : "border-green-300 text-green-600"}`}
                          >
                            {acc.isActive ? "تعطيل" : "تفعيل"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {showNew && (
        <NewAccountDialog
          onClose={() => setShowNew(false)}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}

// ── Journal Entries Tab ───────────────────────────────────────────────────────
function JournalTab() {
  const [showNew, setShowNew] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [postInvoiceId, setPostInvoiceId] = useState("");

  const { data: entries = [], refetch } =
    trpc.accounting.getJournalEntries.useQuery();
  const { data: accounts = [] } = trpc.accounting.getAccounts.useQuery();
  const postInvoiceMutation = trpc.accounting.postInvoiceEntry.useMutation({
    onSuccess: r => {
      toast.success(`تم تسجيل القيد ${r.entryNumber}`);
      refetch();
      setPostInvoiceId("");
    },
    onError: e => toast.error(e.message),
  });
  const postPaymentMutation = trpc.accounting.postPaymentEntry.useMutation({
    onSuccess: r => {
      toast.success(`تم تسجيل قيد الدفع ${r.entryNumber}`);
      refetch();
      setPostInvoiceId("");
    },
    onError: e => toast.error(e.message),
  });

  const sourceColors: Record<string, string> = {
    invoice: "bg-blue-100 text-blue-700",
    payment: "bg-green-100 text-green-700",
    manual: "bg-gray-100 text-gray-600",
    vat_settlement: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <GitBranch className="w-4 h-4" />
          <span>{entries.length} قيد مُسجَّل</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Manual post for an invoice */}
          <div className="flex gap-1 items-center">
            <Input
              type="number"
              placeholder="رقم الفاتورة"
              className="h-8 w-28 text-sm"
              value={postInvoiceId}
              onChange={e => setPostInvoiceId(e.target.value)}
              dir="ltr"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                postInvoiceMutation.mutate({ invoiceId: Number(postInvoiceId) })
              }
              disabled={!postInvoiceId || postInvoiceMutation.isPending}
            >
              قيد فاتورة
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                postPaymentMutation.mutate({ invoiceId: Number(postInvoiceId) })
              }
              disabled={!postInvoiceId || postPaymentMutation.isPending}
            >
              قيد دفع
            </Button>
          </div>
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 ml-1" /> قيد يدوي
          </Button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
          <GitBranch className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>لا توجد قيود محاسبية بعد</p>
          <p className="text-xs mt-1">
            ستُنشأ القيود تلقائياً عند إصدار الفواتير
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">
                  رقم القيد
                </th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">
                  التاريخ
                </th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium hidden md:table-cell">
                  البيان
                </th>
                <th className="text-center py-3 px-4 text-gray-500 font-medium w-24">
                  المصدر
                </th>
                <th className="text-center py-3 px-4 text-gray-500 font-medium w-32">
                  إجمالي المدين
                </th>
                <th className="text-center py-3 px-4 text-gray-500 font-medium w-32">
                  إجمالي الدائن
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <>
                  <tr
                    key={entry.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      setExpanded(expanded === entry.id ? null : entry.id)
                    }
                  >
                    <td className="py-3 px-4">
                      <code className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono">
                        {entry.entryNumber}
                      </code>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs">
                      {entry.entryDate}
                    </td>
                    <td className="py-3 px-4 text-gray-700 hidden md:table-cell max-w-xs truncate">
                      {entry.description}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${sourceColors[entry.sourceType] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {SOURCE_LABELS[entry.sourceType] ?? entry.sourceType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-sm text-blue-700 font-medium">
                      {entry.totalDebitRiyals}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-sm text-red-600 font-medium">
                      {entry.totalCreditRiyals}
                    </td>
                    <td className="py-3 px-4 text-gray-400">
                      {expanded === entry.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </td>
                  </tr>
                  {expanded === entry.id && (
                    <tr key={`${entry.id}-lines`} className="bg-blue-50/40">
                      <td colSpan={7} className="px-8 py-3">
                        <table className="w-full text-xs border rounded overflow-hidden">
                          <thead className="bg-white border-b">
                            <tr>
                              <th className="text-right py-2 px-3 text-gray-500">
                                #
                              </th>
                              <th className="text-right py-2 px-3 text-gray-500">
                                الحساب
                              </th>
                              <th className="text-right py-2 px-3 text-gray-500 hidden sm:table-cell">
                                البيان
                              </th>
                              <th className="text-center py-2 px-3 text-blue-600 w-28">
                                مدين
                              </th>
                              <th className="text-center py-2 px-3 text-red-600 w-28">
                                دائن
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {entry.lines.map(line => (
                              <tr
                                key={line.id}
                                className="border-b last:border-0 bg-white hover:bg-gray-50"
                              >
                                <td className="py-1.5 px-3 text-gray-400">
                                  {line.sequence}
                                </td>
                                <td className="py-1.5 px-3">
                                  <span className="font-mono text-gray-500 ml-1">
                                    {line.accountCode}
                                  </span>
                                  <span className="text-gray-800">
                                    {line.accountName}
                                  </span>
                                </td>
                                <td className="py-1.5 px-3 text-gray-400 hidden sm:table-cell">
                                  {line.description || "—"}
                                </td>
                                <td className="py-1.5 px-3 text-center font-mono text-blue-700 font-medium">
                                  {line.debitHalala > 0
                                    ? fromHalala(line.debitHalala)
                                    : "—"}
                                </td>
                                <td className="py-1.5 px-3 text-center font-mono text-red-600 font-medium">
                                  {line.creditHalala > 0
                                    ? fromHalala(line.creditHalala)
                                    : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <NewJournalDialog
          accounts={accounts}
          onClose={() => setShowNew(false)}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}

// ── VAT Report Tab ────────────────────────────────────────────────────────────
function VatReportTab() {
  const q = currentQuarter();
  const [startDate, setStartDate] = useState(q.start);
  const [endDate, setEndDate] = useState(q.end);
  const [queried, setQueried] = useState({ start: q.start, end: q.end });

  const {
    data: report,
    isLoading,
    refetch,
  } = trpc.accounting.getVatReport.useQuery({
    startDate: queried.start,
    endDate: queried.end,
  });

  const handleFetch = () => {
    setQueried({ start: startDate, end: endDate });
  };

  const quarters = [
    {
      label: "الربع الأول",
      start: `${new Date().getFullYear()}-01-01`,
      end: `${new Date().getFullYear()}-03-31`,
    },
    {
      label: "الربع الثاني",
      start: `${new Date().getFullYear()}-04-01`,
      end: `${new Date().getFullYear()}-06-30`,
    },
    {
      label: "الربع الثالث",
      start: `${new Date().getFullYear()}-07-01`,
      end: `${new Date().getFullYear()}-09-30`,
    },
    {
      label: "الربع الرابع",
      start: `${new Date().getFullYear()}-10-01`,
      end: `${new Date().getFullYear()}-12-31`,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">من تاريخ</Label>
            <Input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="h-8 w-36"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">
              إلى تاريخ
            </Label>
            <Input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="h-8 w-36"
            />
          </div>
          <Button size="sm" onClick={handleFetch}>
            <BarChart2 className="w-4 h-4 ml-1" /> إنشاء التقرير
          </Button>
          <div className="flex gap-1 flex-wrap">
            {quarters.map(qtr => (
              <button
                key={qtr.label}
                onClick={() => {
                  setStartDate(qtr.start);
                  setEndDate(qtr.end);
                  setQueried({ start: qtr.start, end: qtr.end });
                }}
                className="text-xs px-2 py-1 rounded border border-gray-200 hover:border-blue-300 hover:text-blue-600 transition-colors"
              >
                {qtr.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-gray-400">
          <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
          جارٍ إعداد التقرير…
        </div>
      )}

      {report && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "إجمالي المبيعات (قبل الضريبة)",
                value: `${report.summary.salesRiyals} ر.س`,
                icon: <TrendingUp className="w-5 h-5" />,
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
              {
                label: "ضريبة المخرجات (مستحقة)",
                value: `${report.summary.outputVatRiyals} ر.س`,
                icon: <DollarSign className="w-5 h-5" />,
                color: "text-orange-600",
                bg: "bg-orange-50",
              },
              {
                label: "ضريبة المدخلات (مدفوعة)",
                value: `${report.summary.inputVatRiyals} ر.س`,
                icon: <TrendingDown className="w-5 h-5" />,
                color: "text-green-600",
                bg: "bg-green-50",
              },
              {
                label: "صافي الضريبة المستحقة للهيئة",
                value: `${report.summary.netVatPayableRiyals} ر.س`,
                icon: <Layers className="w-5 h-5" />,
                color: "text-red-600",
                bg: "bg-red-50",
              },
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-xl border p-4">
                <div
                  className={`w-9 h-9 ${card.bg} ${card.color} rounded-lg flex items-center justify-center mb-3`}
                >
                  {card.icon}
                </div>
                <div className={`text-xl font-bold font-mono ${card.color}`}>
                  {card.value}
                </div>
                <div className="text-xs text-gray-500 mt-1">{card.label}</div>
              </div>
            ))}
          </div>

          {/* By invoice type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                label: "الفواتير القياسية (B2B)",
                data: report.byType.standard,
                color: "blue",
              },
              {
                label: "الفواتير المبسطة (B2C)",
                data: report.byType.simplified,
                color: "purple",
              },
            ].map(({ label, data, color }) => (
              <div key={label} className="bg-white rounded-xl border p-4">
                <h4 className="font-semibold text-gray-700 mb-3 text-sm">
                  {label}
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">عدد الفواتير</span>
                    <span className={`font-bold text-${color}-600`}>
                      {data.count}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      المبيعات (قبل الضريبة)
                    </span>
                    <span className="font-mono font-medium">
                      {data.salesRiyals} ر.س
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">الضريبة</span>
                    <span className="font-mono font-medium text-orange-600">
                      {data.vatRiyals} ر.س
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Collection status */}
          <div className="bg-white rounded-xl border p-4">
            <h4 className="font-semibold text-gray-700 mb-3 text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" /> حالة تحصيل
              الضريبة
            </h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold font-mono text-green-600">
                  {report.summary.collectedVatRiyals} ر.س
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  ضريبة محصّلة (فواتير مدفوعة)
                </div>
              </div>
              <div>
                <div className="text-lg font-bold font-mono text-amber-600">
                  {report.summary.uncollectedVatRiyals} ر.س
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  ضريبة غير محصّلة بعد
                </div>
              </div>
              <div>
                <div className="text-lg font-bold font-mono text-blue-600">
                  {report.summary.invoiceCount}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  إجمالي الفواتير في الفترة
                </div>
              </div>
            </div>
          </div>

          {/* Invoice detail table */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h4 className="font-semibold text-gray-700 text-sm">
                تفاصيل الفواتير
              </h4>
              <span className="text-xs text-gray-400">
                {report.invoices.length} فاتورة
              </span>
            </div>
            {report.invoices.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                لا توجد فواتير في هذه الفترة
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="text-right py-2 px-4 text-gray-500 font-medium">
                        رقم الفاتورة
                      </th>
                      <th className="text-right py-2 px-4 text-gray-500 font-medium">
                        التاريخ
                      </th>
                      <th className="text-right py-2 px-4 text-gray-500 font-medium hidden md:table-cell">
                        المشتري
                      </th>
                      <th className="text-center py-2 px-4 text-gray-500 font-medium w-20">
                        النوع
                      </th>
                      <th className="text-center py-2 px-4 text-gray-500 font-medium w-28">
                        المبيعات
                      </th>
                      <th className="text-center py-2 px-4 text-gray-500 font-medium w-28">
                        الضريبة
                      </th>
                      <th className="text-center py-2 px-4 text-gray-500 font-medium w-28">
                        الإجمالي
                      </th>
                      <th className="text-center py-2 px-4 text-gray-500 font-medium w-20">
                        الدفع
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.invoices.map(inv => (
                      <tr
                        key={inv.invoiceNumber}
                        className="border-b last:border-0 hover:bg-gray-50"
                      >
                        <td className="py-2 px-4">
                          <code className="text-xs font-mono text-blue-600">
                            {inv.invoiceNumber}
                          </code>
                        </td>
                        <td className="py-2 px-4 text-gray-500 text-xs">
                          {inv.issueDate}
                        </td>
                        <td className="py-2 px-4 text-gray-700 hidden md:table-cell max-w-[160px] truncate">
                          {inv.buyerName}
                        </td>
                        <td className="py-2 px-4 text-center">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${inv.invoiceType === "standard" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}
                          >
                            {inv.invoiceType === "standard"
                              ? "قياسية"
                              : "مبسطة"}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-center font-mono text-sm">
                          {inv.salesRiyals}
                        </td>
                        <td className="py-2 px-4 text-center font-mono text-sm text-orange-600">
                          {inv.vatRiyals}
                        </td>
                        <td className="py-2 px-4 text-center font-mono text-sm font-bold">
                          {inv.totalRiyals}
                        </td>
                        <td className="py-2 px-4 text-center">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full ${
                              inv.paymentStatus === "paid"
                                ? "bg-green-50 text-green-600"
                                : inv.paymentStatus === "partial"
                                  ? "bg-yellow-50 text-yellow-600"
                                  : "bg-red-50 text-red-500"
                            }`}
                          >
                            {inv.paymentStatus === "paid"
                              ? "مدفوعة"
                              : inv.paymentStatus === "partial"
                                ? "جزئي"
                                : "غير مدفوعة"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 bg-gray-50">
                    <tr>
                      <td
                        colSpan={4}
                        className="py-2 px-4 font-bold text-gray-700 text-sm"
                      >
                        الإجمالي
                      </td>
                      <td className="py-2 px-4 text-center font-bold font-mono text-sm">
                        {report.summary.salesRiyals}
                      </td>
                      <td className="py-2 px-4 text-center font-bold font-mono text-sm text-orange-600">
                        {report.summary.outputVatRiyals}
                      </td>
                      <td className="py-2 px-4 text-center font-bold font-mono text-sm">
                        {report.summary.totalWithVatRiyals}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminAccounting() {
  const { lang } = useLanguage();
  const isRtl = lang !== "en";
  const [activeTab, setActiveTab] = useState<Tab>("accounts");

  const tabs: {
    id: Tab;
    labelAr: string;
    labelEn: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "accounts",
      labelAr: "دليل الحسابات",
      labelEn: "Chart of Accounts",
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      id: "journal",
      labelAr: "القيود اليومية",
      labelEn: "Journal Entries",
      icon: <GitBranch className="w-4 h-4" />,
    },
    {
      id: "vat",
      labelAr: "تقرير الضريبة",
      labelEn: "VAT Report",
      icon: <FileText className="w-4 h-4" />,
    },
  ];

  return (
    <AdminLayout
      title={isRtl ? "النظام المحاسبي" : "Accounting"}
      subtitle={
        isRtl
          ? "دليل الحسابات · القيود اليومية · تقرير ضريبة القيمة المضافة"
          : "Chart of Accounts · Journal Entries · VAT Report"
      }
    >
      <div className="space-y-4" dir={isRtl ? "rtl" : "ltr"}>
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon}
              {isRtl ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "accounts" && <AccountsTab />}
        {activeTab === "journal" && <JournalTab />}
        {activeTab === "vat" && <VatReportTab />}
      </div>
    </AdminLayout>
  );
}
