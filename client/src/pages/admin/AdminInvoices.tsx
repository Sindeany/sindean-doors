/**
 * AdminInvoices — نظام الفواتير مع تصدير PDF
 * يدعم: طلبات العملاء (door_orders) وطلبات الموزعين (distributor_orders)
 */
import { useState, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import {
  FileText,
  Download,
  Printer,
  Eye,
  Search,
  User,
  Building2,
  Calendar,
  DollarSign,
  Package,
  CheckCircle2,
  Clock,
  X,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

type InvoiceSource = "door_order" | "distributor_order";

interface InvoiceItem {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  source: InvoiceSource;
  sourceId: number;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  company?: string;
  items: InvoiceItem[];
  subtotal: number;
  vat: number;
  vatAmount: number;
  total: number;
  status: "draft" | "issued" | "paid";
  createdAt: number;
  notes?: string;
}

// ── Invoice Number Generator ──────────────────────────────────────────────────

function generateInvoiceNumber(id: number, source: InvoiceSource): string {
  const year = new Date().getFullYear();
  const prefix = source === "door_order" ? "INV" : "BINV";
  return `${prefix}-${year}-${String(id).padStart(4, "0")}`;
}

// ── Build Invoice from Door Order ────────────────────────────────────────────

function buildDoorOrderInvoice(order: any): Invoice {
  const items: InvoiceItem[] = [
    {
      name: order.productName || "باب سنديان",
      description: order.notes || undefined,
      quantity: 1,
      unitPrice: order.basePrice || 0,
      total: order.totalPrice || 0,
    },
  ];

  // إضافة إضافات الخيارات إن وجدت
  const priceAdj = (order.totalPrice || 0) - (order.basePrice || 0);
  if (priceAdj > 0) {
    items.push({
      name: "إضافات الخيارات",
      description: "خيارات إضافية محددة من العميل",
      quantity: 1,
      unitPrice: priceAdj,
      total: priceAdj,
    });
  }

  const subtotal = order.totalPrice || 0;
  const vatRate = 0.15;
  const vatAmount = Math.round(subtotal * vatRate);

  return {
    id: `door-${order.id}`,
    invoiceNumber: generateInvoiceNumber(order.id, "door_order"),
    source: "door_order",
    sourceId: order.id,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail || undefined,
    items,
    subtotal,
    vat: vatRate * 100,
    vatAmount,
    total: subtotal + vatAmount,
    status:
      order.paymentStatus === "paid"
        ? "paid"
        : order.status === "delivered"
          ? "issued"
          : "draft",
    createdAt: order.createdAt,
    notes: order.notes || undefined,
  };
}

// ── Build Invoice from Distributor Order ─────────────────────────────────────

function buildDistributorOrderInvoice(order: any): Invoice {
  // items تأتي مُحلَّلة من الـ server (JSON.parse مسبقاً)
  const parsedItems: any[] = Array.isArray(order.items) ? order.items : [];

  const invoiceItems: InvoiceItem[] = parsedItems.map((item: any) => ({
    name: item.doorType || "باب",
    description:
      [
        item.woodType && `المادة: ${item.woodType}`,
        item.color && `اللون: ${item.color}`,
        item.width && item.height && `المقاس: ${item.width}×${item.height} سم`,
        item.notes,
      ]
        .filter(Boolean)
        .join(" | ") || undefined,
    quantity: item.quantity || 1,
    unitPrice: item.unitPrice || 0,
    total: (item.quantity || 1) * (item.unitPrice || 0),
  }));

  if (invoiceItems.length === 0) {
    invoiceItems.push({
      name: "طلب أبواب",
      quantity: 1,
      unitPrice: order.totalAmount || 0,
      total: order.totalAmount || 0,
    });
  }

  const subtotal = order.totalAmount || 0;
  const vatRate = 0.15;
  const vatAmount = Math.round(subtotal * vatRate);

  return {
    id: `dist-${order.id}`,
    invoiceNumber: generateInvoiceNumber(order.id, "distributor_order"),
    source: "distributor_order",
    sourceId: order.id,
    customerName: order.distributorName,
    company: order.distributorCompany || undefined,
    items: invoiceItems,
    subtotal,
    vat: vatRate * 100,
    vatAmount,
    total: subtotal + vatAmount,
    status:
      order.paymentStatus === "paid"
        ? "paid"
        : order.status === "delivered"
          ? "issued"
          : "draft",
    createdAt: order.createdAt,
    notes: order.notes || undefined,
  };
}

// ── HTML Escape Helper ──────────────────────────────────────────────────────

function esc(v: string | number | undefined | null): string {
  if (v === undefined || v === null) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Invoice PDF Template ──────────────────────────────────────────────────────

function buildInvoiceHTML(invoice: Invoice): string {
  const dateStr = new Date(invoice.createdAt).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const itemsRows = invoice.items
    .map(
      item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;">
        <div style="font-weight:600;color:#1a1a1a;">${esc(item.name)}</div>
        ${item.description ? `<div style="font-size:11px;color:#888;margin-top:2px;">${esc(item.description)}</div>` : ""}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;color:#555;">${esc(item.quantity)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;color:#555;">${item.unitPrice.toLocaleString("ar-SA")} ر.س</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;font-weight:600;color:#2C4A3E;">${item.total.toLocaleString("ar-SA")} ر.س</td>
    </tr>
  `
    )
    .join("");

  const statusLabel =
    invoice.status === "paid"
      ? "مدفوعة"
      : invoice.status === "issued"
        ? "صادرة"
        : "مسودة";
  const statusColor =
    invoice.status === "paid"
      ? "#16a34a"
      : invoice.status === "issued"
        ? "#2563eb"
        : "#d97706";

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>فاتورة ${invoice.invoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Cairo', 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a1a; direction: rtl; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 3px solid #2C4A3E; }
    .logo-area { display: flex; flex-direction: column; gap: 4px; }
    .logo-name { font-size: 28px; font-weight: 900; color: #2C4A3E; }
    .logo-sub { font-size: 13px; color: #888; }
    .invoice-meta { text-align: left; }
    .invoice-number { font-size: 22px; font-weight: 700; color: #2C4A3E; }
    .invoice-date { font-size: 13px; color: #888; margin-top: 4px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-top: 8px; background: ${statusColor}20; color: ${statusColor}; border: 1px solid ${statusColor}40; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    .party-box { background: #f8f8f6; border-radius: 12px; padding: 16px 20px; }
    .party-label { font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .party-name { font-size: 16px; font-weight: 700; color: #1a1a1a; }
    .party-detail { font-size: 13px; color: #555; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr { background: #2C4A3E; }
    thead th { padding: 12px; color: #fff; font-size: 13px; font-weight: 600; text-align: center; }
    thead th:first-child { text-align: right; }
    tbody tr:nth-child(even) { background: #fafaf8; }
    .totals { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; background: #f8f8f6; border-radius: 12px; padding: 20px 24px; margin-bottom: 32px; max-width: 320px; }
    .total-row { display: flex; justify-content: space-between; width: 100%; font-size: 14px; color: #555; }
    .total-row.grand { border-top: 2px solid #2C4A3E; padding-top: 10px; margin-top: 4px; font-size: 18px; font-weight: 900; color: #2C4A3E; }
    .notes-box { background: #fffbf0; border: 1px solid #f0e0a0; border-radius: 10px; padding: 14px 18px; margin-bottom: 24px; }
    .notes-label { font-size: 12px; font-weight: 700; color: #b45309; margin-bottom: 6px; }
    .notes-text { font-size: 13px; color: #555; }
    .footer { text-align: center; padding-top: 24px; border-top: 1px solid #eee; color: #aaa; font-size: 12px; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .page { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="logo-area">
        <div class="logo-name">🌳 سنديان للأبواب</div>
        <div class="logo-sub">Sindian Wooden Doors</div>
        <div class="logo-sub" style="margin-top:6px;">info@sindian.sa | 920-000-000</div>
      </div>
      <div class="invoice-meta">
        <div class="invoice-number">فاتورة رقم: ${esc(invoice.invoiceNumber)}</div>
        <div class="invoice-date">التاريخ: ${dateStr}</div>
        <div class="status-badge">${statusLabel}</div>
      </div>
    </div>

    <!-- Parties -->
    <div class="parties">
      <div class="party-box">
        <div class="party-label">من</div>
        <div class="party-name">سنديان للأبواب الخشبية</div>
        <div class="party-detail">المملكة العربية السعودية</div>
        <div class="party-detail">الرقم الضريبي: 300000000000003</div>
      </div>
      <div class="party-box">
        <div class="party-label">إلى</div>
        <div class="party-name">${esc(invoice.customerName)}</div>
        ${invoice.company ? `<div class="party-detail">${esc(invoice.company)}</div>` : ""}
        ${invoice.customerPhone ? `<div class="party-detail">📞 ${esc(invoice.customerPhone)}</div>` : ""}
        ${invoice.customerEmail ? `<div class="party-detail">✉️ ${esc(invoice.customerEmail)}</div>` : ""}
      </div>
    </div>

    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th style="text-align:right;width:45%;">الصنف / الوصف</th>
          <th>الكمية</th>
          <th>سعر الوحدة</th>
          <th>الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <div class="total-row">
        <span>المجموع قبل الضريبة</span>
        <span>${invoice.subtotal.toLocaleString("ar-SA")} ر.س</span>
      </div>
      <div class="total-row">
        <span>ضريبة القيمة المضافة (${invoice.vat}%)</span>
        <span>${invoice.vatAmount.toLocaleString("ar-SA")} ر.س</span>
      </div>
      <div class="total-row grand">
        <span>الإجمالي الكلي</span>
        <span>${invoice.total.toLocaleString("ar-SA")} ر.س</span>
      </div>
    </div>

    ${
      invoice.notes
        ? `
    <div class="notes-box">
      <div class="notes-label">📝 ملاحظات</div>
      <div class="notes-text">${invoice.notes}</div>
    </div>
    `
        : ""
    }

    <!-- Footer -->
    <div class="footer">
      <p>شكراً لثقتكم بسنديان للأبواب الخشبية</p>
      <p style="margin-top:4px;">هذه الفاتورة صادرة إلكترونياً وصالحة بدون توقيع</p>
    </div>
  </div>
</body>
</html>`;
}

// ── Invoice Preview Modal ─────────────────────────────────────────────────────

function InvoicePreviewModal({
  invoice,
  onClose,
}: {
  invoice: Invoice;
  onClose: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const htmlContent = buildInvoiceHTML(invoice);

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      toast.error("يرجى السماح بالنوافذ المنبثقة");
      return;
    }
    win.document.write(htmlContent);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 500);
  };

  const handleDownload = () => {
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoice.invoiceNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تحميل الفاتورة");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      dir="rtl"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col"
        style={{ maxHeight: "95vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-oak" /> {invoice.invoiceNumber}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {invoice.customerName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-oak text-white rounded-xl text-sm font-semibold hover:bg-oak/90 transition-colors"
            >
              <Printer className="w-4 h-4" /> طباعة / PDF
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" /> تحميل HTML
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
        {/* Preview */}
        <div className="flex-1 overflow-hidden rounded-b-2xl">
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            className="w-full h-full border-0"
            style={{ minHeight: "600px" }}
            title="معاينة الفاتورة"
          />
        </div>
      </div>
    </div>
  );
}

// ── Invoice Card ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<
  string,
  { label: string; bg: string; color: string; icon: React.ReactNode }
> = {
  draft: {
    label: "مسودة",
    bg: "bg-amber-50 border-amber-200",
    color: "text-amber-700",
    icon: <Clock className="w-3 h-3" />,
  },
  issued: {
    label: "صادرة",
    bg: "bg-blue-50 border-blue-200",
    color: "text-blue-700",
    icon: <FileText className="w-3 h-3" />,
  },
  paid: {
    label: "مدفوعة",
    bg: "bg-green-50 border-green-200",
    color: "text-green-700",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
};

function InvoiceCard({
  invoice,
  onPreview,
  onMarkPaid,
}: {
  invoice: Invoice;
  onPreview: () => void;
  onMarkPaid?: () => void;
}) {
  const st = STATUS_STYLES[invoice.status];
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-gray-800 text-sm">
              {invoice.invoiceNumber}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${st.bg} ${st.color}`}
            >
              {st.icon} {st.label}
            </span>
          </div>
          <p className="font-semibold text-gray-700 text-sm truncate">
            {invoice.customerName}
          </p>
          {invoice.company && (
            <p className="text-xs text-gray-400 truncate">{invoice.company}</p>
          )}
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
            <Calendar className="w-3 h-3" />
            {new Date(invoice.createdAt).toLocaleDateString("ar-SA")}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-black text-oak text-base">
            {invoice.total.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">ر.س (شامل VAT)</p>
          <p className="text-xs text-gray-500 mt-1">
            {invoice.source === "door_order" ? "🏠 طلب عميل" : "🏢 موزع"}
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
        <button
          onClick={onPreview}
          className="flex-1 py-1.5 text-xs font-semibold text-oak border border-oak/30 rounded-lg hover:bg-oak/5 transition-colors flex items-center justify-center gap-1"
        >
          <Eye className="w-3 h-3" /> معاينة وطباعة
        </button>
        {invoice.status !== "paid" && onMarkPaid && (
          <button
            onClick={onMarkPaid}
            className="flex-1 py-1.5 text-xs font-semibold text-green-700 border border-green-300 rounded-lg hover:bg-green-50 transition-colors flex items-center justify-center gap-1"
          >
            <CheckCircle2 className="w-3 h-3" /> تم الدفع
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminInvoices() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState<
    "all" | "door_order" | "distributor_order"
  >("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "draft" | "issued" | "paid"
  >("all");

  // جلب الطلبات من قاعدة البيانات
  const {
    data: doorOrders = [],
    isLoading: loadingDoor,
    refetch: refetchDoor,
  } = trpc.orders.list.useQuery(undefined);
  const {
    data: distOrders = [],
    isLoading: loadingDist,
    refetch: refetchDist,
  } = trpc.distributorOrders.list.useQuery();

  // تحديث حالة الدفع
  const updateDoorPayment = trpc.orders.updatePaymentStatus.useMutation({
    onSuccess: () => {
      refetchDoor();
      toast.success("تم تحديث حالة الدفع");
    },
  });
  const updateDistPayment =
    trpc.distributorOrders.updatePaymentStatus.useMutation({
      onSuccess: () => {
        refetchDist();
        toast.success("تم تحديث حالة الدفع");
      },
    });

  const handleMarkPaid = (invoice: Invoice) => {
    if (invoice.source === "door_order") {
      updateDoorPayment.mutate({ id: invoice.sourceId, paymentStatus: "paid" });
    } else {
      updateDistPayment.mutate({
        orderId: invoice.sourceId,
        paymentStatus: "paid",
      });
    }
  };

  const isLoading = loadingDoor || loadingDist;

  // بناء الفواتير من الطلبات
  const allInvoices: Invoice[] = [
    ...doorOrders.map(buildDoorOrderInvoice),
    ...distOrders.map(buildDistributorOrderInvoice),
  ].sort((a, b) => b.createdAt - a.createdAt);

  // تصفية
  const filtered = allInvoices.filter(inv => {
    if (filterSource !== "all" && inv.source !== filterSource) return false;
    if (filterStatus !== "all" && inv.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        (inv.company || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // إحصائيات
  const stats = {
    total: allInvoices.length,
    issued: allInvoices.filter(i => i.status === "issued").length,
    paid: allInvoices.filter(i => i.status === "paid").length,
    totalRevenue: allInvoices
      .filter(i => i.status === "paid")
      .reduce((s, i) => s + i.total, 0),
    pendingRevenue: allInvoices
      .filter(i => i.status !== "paid")
      .reduce((s, i) => s + i.total, 0),
  };

  return (
    <AdminLayout title="الفواتير" subtitle="إنشاء وتصدير فواتير الطلبات">
      <div className="p-6 space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-oak" /> نظام الفواتير
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              إنشاء وتصدير فواتير طلبات العملاء والموزعين
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "إجمالي الفواتير",
              value: stats.total,
              icon: <FileText className="w-5 h-5" />,
              color: "text-gray-700",
              bg: "bg-gray-50",
            },
            {
              label: "فواتير صادرة",
              value: stats.issued,
              icon: <Clock className="w-5 h-5" />,
              color: "text-blue-700",
              bg: "bg-blue-50",
            },
            {
              label: "فواتير مدفوعة",
              value: stats.paid,
              icon: <CheckCircle2 className="w-5 h-5" />,
              color: "text-green-700",
              bg: "bg-green-50",
            },
            {
              label: "إيرادات مستحقة",
              value: `${stats.pendingRevenue.toLocaleString()} ر.س`,
              icon: <DollarSign className="w-5 h-5" />,
              color: "text-amber-700",
              bg: "bg-amber-50",
            },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
              <div className={`${s.color} mb-1`}>{s.icon}</div>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="بحث برقم الفاتورة أو اسم العميل..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oak/50"
            />
          </div>
          {/* Source Filter */}
          <div className="relative">
            <select
              value={filterSource}
              onChange={e => setFilterSource(e.target.value as any)}
              className="appearance-none pr-4 pl-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oak/50 bg-white"
            >
              <option value="all">كل المصادر</option>
              <option value="door_order">طلبات العملاء</option>
              <option value="distributor_order">طلبات الموزعين</option>
            </select>
            <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          {/* Status Filter */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              className="appearance-none pr-4 pl-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oak/50 bg-white"
            >
              <option value="all">كل الحالات</option>
              <option value="draft">مسودة</option>
              <option value="issued">صادرة</option>
              <option value="paid">مدفوعة</option>
            </select>
            <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Invoices Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-gray-100 rounded-xl h-36 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">لا توجد فواتير</p>
            <p className="text-sm mt-1">
              ستظهر الفواتير هنا عند وجود طلبات في النظام
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(inv => (
              <InvoiceCard
                key={inv.id}
                invoice={inv}
                onPreview={() => setSelectedInvoice(inv)}
                onMarkPaid={
                  inv.status !== "paid" ? () => handleMarkPaid(inv) : undefined
                }
              />
            ))}
          </div>
        )}

        {/* Invoice Preview Modal */}
        {selectedInvoice && (
          <InvoicePreviewModal
            invoice={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
          />
        )}
      </div>
    </AdminLayout>
  );
}
