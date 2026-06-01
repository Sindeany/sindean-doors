/**
 * AdminZATCAInvoices - نظام الفواتير الضريبية الإلكترونية
 * متوافق مع متطلبات هيئة الزكاة والضريبة والجمارك (ZATCA) المرحلة الثانية
 */

import { useState, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus, Printer, Eye, CheckCircle, XCircle, Settings,
  FileText, TrendingUp, Clock, DollarSign, Trash2, Search,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface LineItem {
  description: string;
  descriptionEn?: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  vatAmount?: number;
  lineSubtotal?: number;
  lineTotal?: number;
}

interface TaxInvoice {
  id: number;
  uuid: string;
  invoiceNumber: string;
  invoiceType: "standard" | "simplified";
  invoiceTypeCode: string;
  issueDate: string;
  issueTime: string;
  sellerName: string;
  sellerVatNumber: string;
  sellerCrNumber?: string;
  sellerAddress?: string;
  sellerCity?: string;
  sellerPostalCode?: string;
  buyerName: string;
  buyerVatNumber?: string;
  buyerAddress?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  lineItems: LineItem[];
  subtotalRiyals: string;
  vatAmountRiyals: string;
  totalRiyals: string;
  vatRate: number;
  qrCodeData?: string;
  invoiceHash?: string;
  status: "draft" | "issued" | "paid" | "cancelled";
  paymentStatus: "unpaid" | "partial" | "paid";
  notes?: string;
  createdAt: number;
}

// ── HTML Escape ───────────────────────────────────────────────────────────────
function esc(v: string | number | undefined | null): string {
  if (v === undefined || v === null) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Build ZATCA-Compliant Invoice HTML ────────────────────────────────────────
function buildZATCAInvoiceHTML(invoice: TaxInvoice, qrDataUrl?: string): string {
  const isStandard = invoice.invoiceType === "standard";
  const invoiceLabel = isStandard ? "فاتورة ضريبية" : "فاتورة ضريبية مبسطة";
  const invoiceLabelEn = isStandard ? "Tax Invoice" : "Simplified Tax Invoice";
  const typeCode = invoice.invoiceTypeCode;

  const itemsRows = invoice.lineItems.map((item, i) => `
    <tr>
      <td class="item-num">${i + 1}</td>
      <td class="item-desc">
        <div class="item-name-ar">${esc(item.description)}</div>
        ${item.descriptionEn ? `<div class="item-name-en">${esc(item.descriptionEn)}</div>` : ""}
      </td>
      <td class="num-cell">${esc(item.quantity)}</td>
      <td class="num-cell">${Number(item.unitPrice).toFixed(2)}</td>
      <td class="num-cell">${item.vatRate ?? 15}%</td>
      <td class="num-cell">${Number(item.vatAmount ?? 0).toFixed(2)}</td>
      <td class="num-cell bold">${Number(item.lineTotal ?? 0).toFixed(2)}</td>
    </tr>
  `).join("");

  const statusMap: Record<string, string> = {
    issued: "صادرة", paid: "مدفوعة", draft: "مسودة", cancelled: "ملغاة",
  };
  const payStatusMap: Record<string, string> = {
    unpaid: "غير مدفوعة", partial: "مدفوعة جزئياً", paid: "مدفوعة بالكامل",
  };

  const qrSection = qrDataUrl
    ? `<img src="${qrDataUrl}" alt="QR Code ZATCA" class="qr-img" />`
    : `<div class="qr-placeholder">QR Code<br/><small>${esc(invoice.qrCodeData?.substring(0, 20))}...</small></div>`;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>فاتورة ضريبية - ${esc(invoice.invoiceNumber)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 12px;
      color: #1a1a1a;
      background: #fff;
      direction: rtl;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 15mm 15mm 20mm;
      background: #fff;
    }

    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #2C4A3E;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .logo-area { flex: 1; }
    .logo-name { font-size: 22px; font-weight: 800; color: #2C4A3E; }
    .logo-name-en { font-size: 13px; color: #666; margin-top: 2px; direction: ltr; text-align: left; }
    .logo-vat { font-size: 11px; color: #555; margin-top: 4px; }
    .logo-vat span { font-weight: 700; color: #2C4A3E; }
    .invoice-badge {
      text-align: center;
      padding: 10px 20px;
      background: #2C4A3E;
      color: #fff;
      border-radius: 8px;
      min-width: 160px;
    }
    .invoice-badge-title { font-size: 16px; font-weight: 800; }
    .invoice-badge-en { font-size: 11px; opacity: 0.85; margin-top: 2px; direction: ltr; }
    .invoice-badge-type { font-size: 10px; opacity: 0.7; margin-top: 4px; }

    /* ── Meta Info ── */
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }
    .meta-box {
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 10px 12px;
      background: #fafafa;
    }
    .meta-box-title {
      font-size: 10px;
      font-weight: 700;
      color: #888;
      text-transform: uppercase;
      margin-bottom: 6px;
      border-bottom: 1px solid #eee;
      padding-bottom: 4px;
    }
    .meta-row { display: flex; justify-content: space-between; margin-top: 4px; }
    .meta-label { color: #666; font-size: 11px; }
    .meta-value { font-weight: 600; font-size: 11px; color: #1a1a1a; }
    .meta-value.highlight { color: #2C4A3E; }

    /* ── Parties ── */
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }
    .party-box {
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 10px 12px;
    }
    .party-label {
      font-size: 10px;
      font-weight: 700;
      color: #888;
      margin-bottom: 6px;
      border-bottom: 1px solid #eee;
      padding-bottom: 4px;
    }
    .party-name { font-size: 14px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }
    .party-detail { font-size: 11px; color: #555; margin-top: 2px; }
    .party-vat { font-size: 11px; color: #2C4A3E; font-weight: 600; margin-top: 3px; }

    /* ── Items Table ── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 11px;
    }
    thead tr { background: #2C4A3E; color: #fff; }
    thead th {
      padding: 8px 10px;
      text-align: center;
      font-weight: 600;
      font-size: 11px;
    }
    thead th:first-child { text-align: center; }
    thead th:nth-child(2) { text-align: right; }
    tbody tr:nth-child(even) { background: #f8f9fa; }
    tbody tr:hover { background: #f0f4f2; }
    td { padding: 8px 10px; border-bottom: 1px solid #eee; vertical-align: middle; }
    .item-num { text-align: center; color: #888; width: 30px; }
    .item-desc { text-align: right; }
    .item-name-ar { font-weight: 600; color: #1a1a1a; }
    .item-name-en { font-size: 10px; color: #888; direction: ltr; text-align: left; margin-top: 2px; }
    .num-cell { text-align: center; }
    .bold { font-weight: 700; color: #2C4A3E; }

    /* ── Totals ── */
    .totals-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 14px;
      gap: 16px;
    }
    .totals-box {
      min-width: 260px;
      border: 1px solid #ddd;
      border-radius: 6px;
      overflow: hidden;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 7px 12px;
      font-size: 12px;
      border-bottom: 1px solid #eee;
    }
    .total-row:last-child { border-bottom: none; }
    .total-row.vat-row { background: #fff8f0; }
    .total-row.grand-total {
      background: #2C4A3E;
      color: #fff;
      font-size: 14px;
      font-weight: 800;
    }
    .total-label { color: inherit; }
    .total-value { font-weight: 700; color: inherit; }

    /* ── QR Code ── */
    .qr-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .qr-img { width: 100px; height: 100px; border: 1px solid #ddd; border-radius: 4px; }
    .qr-placeholder {
      width: 100px; height: 100px;
      border: 2px dashed #ccc;
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: #999;
      text-align: center;
    }
    .qr-label { font-size: 9px; color: #888; text-align: center; max-width: 110px; }

    /* ── Hash & UUID ── */
    .crypto-section {
      background: #f8f9fa;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 12px;
      font-size: 9px;
      color: #888;
    }
    .crypto-row { display: flex; gap: 8px; margin-top: 3px; }
    .crypto-label { font-weight: 700; color: #555; min-width: 80px; }
    .crypto-value { font-family: monospace; word-break: break-all; }

    /* ── Notes ── */
    .notes-section {
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 12px;
      font-size: 11px;
      color: #555;
    }
    .notes-title { font-weight: 700; color: #333; margin-bottom: 4px; }

    /* ── Footer ── */
    .footer {
      border-top: 2px solid #2C4A3E;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #888;
    }
    .footer-zatca {
      text-align: center;
      font-size: 9px;
      color: #aaa;
      margin-top: 4px;
    }
    .status-stamp {
      display: inline-block;
      padding: 4px 12px;
      border: 2px solid;
      border-radius: 4px;
      font-weight: 800;
      font-size: 13px;
      transform: rotate(-15deg);
      opacity: 0.6;
    }
    .status-stamp.paid { color: #16a34a; border-color: #16a34a; }
    .status-stamp.cancelled { color: #dc2626; border-color: #dc2626; }

    @media print {
      body { margin: 0; }
      .page { padding: 10mm; width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- ── Header ── -->
  <div class="header">
    <div class="logo-area">
      <div class="logo-name">🌳 سنديان للأبواب الخشبية</div>
      <div class="logo-name-en">Sindian Wooden Doors Co.</div>
      <div class="logo-vat">الرقم الضريبي: <span>${esc(invoice.sellerVatNumber)}</span></div>
      ${invoice.sellerCrNumber ? `<div class="logo-vat">السجل التجاري: <span>${esc(invoice.sellerCrNumber)}</span></div>` : ""}
      ${invoice.sellerCity ? `<div class="logo-vat">المدينة: <span>${esc(invoice.sellerCity)}</span></div>` : ""}
    </div>
    <div class="invoice-badge">
      <div class="invoice-badge-title">${esc(invoiceLabel)}</div>
      <div class="invoice-badge-en">${esc(invoiceLabelEn)}</div>
      <div class="invoice-badge-type">رمز النوع: ${esc(typeCode)}</div>
    </div>
  </div>

  <!-- ── Invoice Meta ── -->
  <div class="meta-grid">
    <div class="meta-box">
      <div class="meta-box-title">بيانات الفاتورة | Invoice Details</div>
      <div class="meta-row">
        <span class="meta-label">رقم الفاتورة:</span>
        <span class="meta-value highlight">${esc(invoice.invoiceNumber)}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">تاريخ الإصدار:</span>
        <span class="meta-value">${esc(invoice.issueDate)}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">وقت الإصدار:</span>
        <span class="meta-value">${esc(invoice.issueTime)}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">نوع الفاتورة:</span>
        <span class="meta-value">${esc(invoiceLabel)}</span>
      </div>
    </div>
    <div class="meta-box">
      <div class="meta-box-title">الحالة | Status</div>
      <div class="meta-row">
        <span class="meta-label">حالة الفاتورة:</span>
        <span class="meta-value">${esc(statusMap[invoice.status] ?? invoice.status)}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">حالة الدفع:</span>
        <span class="meta-value">${esc(payStatusMap[invoice.paymentStatus] ?? invoice.paymentStatus)}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">العملة:</span>
        <span class="meta-value">ريال سعودي (SAR)</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">نسبة الضريبة:</span>
        <span class="meta-value">${esc(invoice.vatRate)}%</span>
      </div>
    </div>
  </div>

  <!-- ── Parties ── -->
  <div class="parties">
    <div class="party-box">
      <div class="party-label">البائع | Seller</div>
      <div class="party-name">${esc(invoice.sellerName)}</div>
      <div class="party-vat">الرقم الضريبي: ${esc(invoice.sellerVatNumber)}</div>
      ${invoice.sellerCrNumber ? `<div class="party-detail">السجل التجاري: ${esc(invoice.sellerCrNumber)}</div>` : ""}
      ${invoice.sellerAddress ? `<div class="party-detail">${esc(invoice.sellerAddress)}</div>` : ""}
      ${invoice.sellerCity ? `<div class="party-detail">${esc(invoice.sellerCity)}${invoice.sellerPostalCode ? ` - ${esc(invoice.sellerPostalCode)}` : ""}</div>` : ""}
    </div>
    <div class="party-box">
      <div class="party-label">المشتري | Buyer</div>
      <div class="party-name">${esc(invoice.buyerName)}</div>
      ${invoice.buyerVatNumber ? `<div class="party-vat">الرقم الضريبي: ${esc(invoice.buyerVatNumber)}</div>` : ""}
      ${invoice.buyerAddress ? `<div class="party-detail">${esc(invoice.buyerAddress)}</div>` : ""}
      ${invoice.buyerPhone ? `<div class="party-detail">📞 ${esc(invoice.buyerPhone)}</div>` : ""}
      ${invoice.buyerEmail ? `<div class="party-detail">✉️ ${esc(invoice.buyerEmail)}</div>` : ""}
    </div>
  </div>

  <!-- ── Line Items ── -->
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th style="text-align:right;">الصنف / الوصف</th>
        <th>الكمية</th>
        <th>سعر الوحدة (ر.س)</th>
        <th>نسبة الضريبة</th>
        <th>مبلغ الضريبة (ر.س)</th>
        <th>الإجمالي (ر.س)</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <!-- ── Totals + QR ── -->
  <div class="totals-section">
    <div class="qr-section">
      ${qrSection}
      <div class="qr-label">امسح الرمز للتحقق<br/>Scan to Verify</div>
      ${invoice.status === "paid" ? '<div class="status-stamp paid">مدفوعة</div>' : ""}
      ${invoice.status === "cancelled" ? '<div class="status-stamp cancelled">ملغاة</div>' : ""}
    </div>
    <div class="totals-box">
      <div class="total-row">
        <span class="total-label">المجموع قبل الضريبة</span>
        <span class="total-value">${esc(invoice.subtotalRiyals)} ر.س</span>
      </div>
      <div class="total-row vat-row">
        <span class="total-label">ضريبة القيمة المضافة (${esc(invoice.vatRate)}%)</span>
        <span class="total-value">${esc(invoice.vatAmountRiyals)} ر.س</span>
      </div>
      <div class="total-row grand-total">
        <span class="total-label">الإجمالي الكلي شامل الضريبة</span>
        <span class="total-value">${esc(invoice.totalRiyals)} ر.س</span>
      </div>
    </div>
  </div>

  <!-- ── Crypto Info (ZATCA Phase 2) ── -->
  <div class="crypto-section">
    <div class="crypto-row">
      <span class="crypto-label">UUID:</span>
      <span class="crypto-value">${esc(invoice.uuid)}</span>
    </div>
    ${invoice.invoiceHash ? `
    <div class="crypto-row">
      <span class="crypto-label">Invoice Hash:</span>
      <span class="crypto-value">${esc(invoice.invoiceHash)}</span>
    </div>` : ""}
  </div>

  <!-- ── Notes ── -->
  ${invoice.notes ? `
  <div class="notes-section">
    <div class="notes-title">ملاحظات:</div>
    <div>${esc(invoice.notes)}</div>
  </div>` : ""}

  <!-- ── Footer ── -->
  <div class="footer">
    <div>
      <div>📞 ${esc(invoice.sellerCity ? "920-000-000" : "")}</div>
      <div>✉️ info@sindian.sa</div>
    </div>
    <div style="text-align:center;">
      <div class="footer-zatca">
        هذه الفاتورة متوافقة مع متطلبات الفوترة الإلكترونية لهيئة الزكاة والضريبة والجمارك
      </div>
      <div class="footer-zatca">
        This invoice complies with ZATCA e-invoicing requirements (Phase 2)
      </div>
    </div>
    <div style="text-align:left;">
      <div>www.sindian.sa</div>
    </div>
  </div>

</div>
</body>
</html>`;
}

// ── Empty Line Item ───────────────────────────────────────────────────────────
const emptyLine = (): LineItem => ({
  description: "",
  descriptionEn: "",
  quantity: 1,
  unitPrice: 0,
  vatRate: 15,
});

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminZATCAInvoices() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<TaxInvoice | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [invoiceType, setInvoiceType] = useState<"standard" | "simplified">("simplified");
  const [buyerName, setBuyerName] = useState("");
  const [buyerVatNumber, setBuyerVatNumber] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLine()]);
  const [notes, setNotes] = useState("");

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    sellerName: "", sellerNameEn: "", vatNumber: "", crNumber: "",
    address: "", city: "", postalCode: "", phone: "", email: "",
  });

  // tRPC queries
  const { data: invoices = [], refetch } = trpc.zatca.list.useQuery();
  const { data: settings } = trpc.zatca.getSettings.useQuery();
  const { data: qrData } = trpc.zatca.generateQRImage.useQuery(
    { invoiceId: previewInvoice?.id ?? 0 },
    { enabled: !!previewInvoice?.id }
  );

  const createMutation = trpc.zatca.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الفاتورة الضريبية بنجاح");
      setShowCreateDialog(false);
      resetForm();
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const updatePaymentMutation = trpc.zatca.updatePaymentStatus.useMutation({
    onSuccess: () => { toast.success("تم تحديث حالة الدفع"); refetch(); },
  });

  const cancelMutation = trpc.zatca.cancel.useMutation({
    onSuccess: () => { toast.success("تم إلغاء الفاتورة"); refetch(); },
  });

  const updateSettingsMutation = trpc.zatca.updateSettings.useMutation({
    onSuccess: () => { toast.success("تم حفظ إعدادات الشركة"); setShowSettingsDialog(false); },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setBuyerName(""); setBuyerVatNumber(""); setBuyerAddress("");
    setBuyerPhone(""); setBuyerEmail(""); setNotes("");
    setLineItems([emptyLine()]); setInvoiceType("simplified");
  };

  const handleOpenSettings = () => {
    if (settings) {
      setSettingsForm({
        sellerName: settings.sellerName ?? "",
        sellerNameEn: settings.sellerNameEn ?? "",
        vatNumber: settings.vatNumber ?? "",
        crNumber: settings.crNumber ?? "",
        address: settings.address ?? "",
        city: settings.city ?? "",
        postalCode: settings.postalCode ?? "",
        phone: settings.phone ?? "",
        email: settings.email ?? "",
      });
    }
    setShowSettingsDialog(true);
  };

  const handlePrint = useCallback((invoice: TaxInvoice, qrDataUrl?: string) => {
    const html = buildZATCAInvoiceHTML(invoice, qrDataUrl);
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) { toast.error("يرجى السماح بالنوافذ المنبثقة"); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  }, []);

  const calcLineTotal = (item: LineItem) => {
    const sub = item.quantity * item.unitPrice;
    const vat = sub * (item.vatRate / 100);
    return { sub, vat, total: sub + vat };
  };

  const totals = lineItems.reduce((acc, item) => {
    const { sub, vat, total } = calcLineTotal(item);
    return { sub: acc.sub + sub, vat: acc.vat + vat, total: acc.total + total };
  }, { sub: 0, vat: 0, total: 0 });

  const handleSubmit = () => {
    if (!buyerName.trim()) { toast.error("يرجى إدخال اسم المشتري"); return; }
    if (invoiceType === "standard" && !buyerVatNumber.trim()) {
      toast.error("الرقم الضريبي للمشتري إلزامي في الفاتورة القياسية"); return;
    }
    if (lineItems.some(l => !l.description.trim())) {
      toast.error("يرجى إدخال وصف لجميع البنود"); return;
    }
    createMutation.mutate({
      invoiceType,
      buyerName,
      buyerVatNumber: buyerVatNumber || undefined,
      buyerAddress: buyerAddress || undefined,
      buyerPhone: buyerPhone || undefined,
      buyerEmail: buyerEmail || undefined,
      lineItems,
      notes: notes || undefined,
    });
  };

  // Filter invoices
  const filtered = invoices.filter(inv =>
    !searchQuery ||
    inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.buyerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      issued: { label: "صادرة", variant: "default" },
      paid: { label: "مدفوعة", variant: "default" },
      draft: { label: "مسودة", variant: "secondary" },
      cancelled: { label: "ملغاة", variant: "destructive" },
    };
    const s = map[status] ?? { label: status, variant: "outline" };
    return <Badge variant={s.variant} className={status === "paid" ? "bg-green-600" : ""}>{s.label}</Badge>;
  };

  const payBadge = (status: string) => {
    const map: Record<string, string> = { unpaid: "غير مدفوعة", partial: "جزئي", paid: "مدفوعة" };
    const colors: Record<string, string> = {
      unpaid: "bg-red-100 text-red-700", partial: "bg-yellow-100 text-yellow-700", paid: "bg-green-100 text-green-700",
    };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] ?? ""}`}>{map[status] ?? status}</span>;
  };

  // Summary stats
  const totalIssued = invoices.filter(i => i.status !== "cancelled").length;
  const totalRevenue = invoices.filter(i => i.status !== "cancelled")
    .reduce((s, i) => s + parseFloat(i.totalRiyals), 0);
  const totalVat = invoices.filter(i => i.status !== "cancelled")
    .reduce((s, i) => s + parseFloat(i.vatAmountRiyals), 0);
  const totalPaid = invoices.filter(i => i.paymentStatus === "paid").length;

  return (
    <AdminLayout title="الفواتير الضريبية الإلكترونية" subtitle="متوافقة مع ZATCA المرحلة الثانية">
      <div className="p-6 space-y-6" dir="rtl">
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">الفواتير الضريبية الإلكترونية</h1>
            <p className="text-sm text-muted-foreground mt-1">
              متوافقة مع متطلبات ZATCA المرحلة الثانية
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleOpenSettings}>
              <Settings className="w-4 h-4 ml-1" />
              إعدادات الشركة
            </Button>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 ml-1" />
              فاتورة جديدة
            </Button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "إجمالي الفواتير", value: totalIssued, icon: <FileText className="w-5 h-5 text-blue-500" /> },
            { label: "الإيرادات الكلية", value: `${totalRevenue.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س`, icon: <TrendingUp className="w-5 h-5 text-green-500" /> },
            { label: "إجمالي الضريبة", value: `${totalVat.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س`, icon: <DollarSign className="w-5 h-5 text-amber-500" /> },
            { label: "مدفوعة", value: totalPaid, icon: <CheckCircle className="w-5 h-5 text-emerald-500" /> },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-3">
                {s.icon}
                <div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="font-bold text-lg">{s.value}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Search ── */}
        <div className="relative max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث برقم الفاتورة أو اسم المشتري..."
            className="pr-9"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* ── Invoices Table ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">قائمة الفواتير الضريبية</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {["رقم الفاتورة", "المشتري", "النوع", "التاريخ", "الإجمالي", "الضريبة", "الحالة", "الدفع", "إجراءات"].map(h => (
                      <th key={h} className="px-4 py-3 text-right font-medium text-muted-foreground text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-muted-foreground">
                        <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        لا توجد فواتير ضريبية بعد
                      </td>
                    </tr>
                  ) : filtered.map(inv => (
                    <tr key={inv.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-primary">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{inv.buyerName}</div>
                        {inv.buyerVatNumber && <div className="text-xs text-muted-foreground">{inv.buyerVatNumber}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {inv.invoiceType === "standard" ? "قياسية" : "مبسطة"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{inv.issueDate}</td>
                      <td className="px-4 py-3 font-bold text-primary">{parseFloat(inv.totalRiyals).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</td>
                      <td className="px-4 py-3 text-amber-600">{parseFloat(inv.vatAmountRiyals).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</td>
                      <td className="px-4 py-3">{statusBadge(inv.status)}</td>
                      <td className="px-4 py-3">{payBadge(inv.paymentStatus)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="معاينة وطباعة"
                            onClick={() => setPreviewInvoice(inv as TaxInvoice)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="طباعة"
                            onClick={() => handlePrint(inv as TaxInvoice, undefined)}>
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                          {inv.paymentStatus !== "paid" && inv.status !== "cancelled" && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" title="تعليم مدفوعة"
                              onClick={() => updatePaymentMutation.mutate({ id: inv.id, paymentStatus: "paid" })}>
                              <CheckCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {inv.status !== "cancelled" && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="إلغاء"
                              onClick={() => {
                                if (confirm("هل تريد إلغاء هذه الفاتورة؟")) cancelMutation.mutate({ id: inv.id });
                              }}>
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ── Create Invoice Dialog ── */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>إنشاء فاتورة ضريبية جديدة</DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              {/* نوع الفاتورة */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>نوع الفاتورة *</Label>
                  <Select value={invoiceType} onValueChange={(v) => setInvoiceType(v as "standard" | "simplified")}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simplified">مبسطة (B2C) - رمز 381</SelectItem>
                      <SelectItem value="standard">قياسية (B2B) - رمز 388</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {invoiceType === "standard" ? "للشركات والموزعين - يتطلب الرقم الضريبي للمشتري" : "للأفراد والمستهلكين"}
                  </p>
                </div>
              </div>

              {/* بيانات المشتري */}
              <div className="border rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-sm">بيانات المشتري</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>اسم المشتري *</Label>
                    <Input className="mt-1" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="الاسم القانوني" />
                  </div>
                  <div>
                    <Label>الرقم الضريبي {invoiceType === "standard" ? "*" : "(اختياري)"}</Label>
                    <Input className="mt-1" value={buyerVatNumber} onChange={e => setBuyerVatNumber(e.target.value)}
                      placeholder="300XXXXXXXXXXX" maxLength={15} />
                  </div>
                  <div>
                    <Label>رقم الجوال</Label>
                    <Input className="mt-1" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="05XXXXXXXX" />
                  </div>
                  <div>
                    <Label>البريد الإلكتروني</Label>
                    <Input className="mt-1" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} placeholder="example@email.com" />
                  </div>
                  <div className="col-span-2">
                    <Label>العنوان</Label>
                    <Input className="mt-1" value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)} placeholder="المدينة، الحي، الشارع" />
                  </div>
                </div>
              </div>

              {/* بنود الفاتورة */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">بنود الفاتورة</h3>
                  <Button size="sm" variant="outline" onClick={() => setLineItems(prev => [...prev, emptyLine()])}>
                    <Plus className="w-3.5 h-3.5 ml-1" /> إضافة بند
                  </Button>
                </div>

                <div className="space-y-2">
                  {lineItems.map((item, idx) => {
                    const { sub, vat, total } = calcLineTotal(item);
                    return (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-start bg-muted/30 rounded p-2">
                        <div className="col-span-4">
                          <Label className="text-xs">الوصف (عربي) *</Label>
                          <Input className="mt-0.5 h-8 text-xs" value={item.description}
                            onChange={e => setLineItems(prev => prev.map((l, i) => i === idx ? { ...l, description: e.target.value } : l))} />
                        </div>
                        <div className="col-span-3">
                          <Label className="text-xs">الوصف (إنجليزي)</Label>
                          <Input className="mt-0.5 h-8 text-xs" value={item.descriptionEn ?? ""}
                            onChange={e => setLineItems(prev => prev.map((l, i) => i === idx ? { ...l, descriptionEn: e.target.value } : l))} />
                        </div>
                        <div className="col-span-1">
                          <Label className="text-xs">الكمية</Label>
                          <Input className="mt-0.5 h-8 text-xs" type="number" min={1} value={item.quantity}
                            onChange={e => setLineItems(prev => prev.map((l, i) => i === idx ? { ...l, quantity: Number(e.target.value) } : l))} />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">سعر الوحدة (ر.س)</Label>
                          <Input className="mt-0.5 h-8 text-xs" type="number" min={0} step={0.01} value={item.unitPrice}
                            onChange={e => setLineItems(prev => prev.map((l, i) => i === idx ? { ...l, unitPrice: Number(e.target.value) } : l))} />
                        </div>
                        <div className="col-span-1">
                          <Label className="text-xs">الضريبة %</Label>
                          <Input className="mt-0.5 h-8 text-xs" type="number" min={0} max={100} value={item.vatRate}
                            onChange={e => setLineItems(prev => prev.map((l, i) => i === idx ? { ...l, vatRate: Number(e.target.value) } : l))} />
                        </div>
                        <div className="col-span-1 flex items-end pb-0.5">
                          <div className="text-xs text-right w-full">
                            <div className="text-muted-foreground">{total.toFixed(2)} ر.س</div>
                            {lineItems.length > 1 && (
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive mt-0.5"
                                onClick={() => setLineItems(prev => prev.filter((_, i) => i !== idx))}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Totals preview */}
                <div className="border-t pt-3 space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>المجموع قبل الضريبة:</span>
                    <span>{totals.sub.toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between text-amber-600">
                    <span>ضريبة القيمة المضافة (15%):</span>
                    <span>{totals.vat.toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between font-bold text-primary text-base">
                    <span>الإجمالي الكلي:</span>
                    <span>{totals.total.toFixed(2)} ر.س</span>
                  </div>
                </div>
              </div>

              {/* ملاحظات */}
              <div>
                <Label>ملاحظات (اختياري)</Label>
                <Textarea className="mt-1" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>إلغاء</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? "جاري الإنشاء..." : "إنشاء الفاتورة"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Preview Dialog ── */}
        {previewInvoice && (
          <Dialog open={!!previewInvoice} onOpenChange={() => setPreviewInvoice(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle>معاينة الفاتورة - {previewInvoice.invoiceNumber}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/40 rounded p-3">
                    <div className="text-xs text-muted-foreground mb-1">رقم الفاتورة</div>
                    <div className="font-mono font-bold text-primary">{previewInvoice.invoiceNumber}</div>
                  </div>
                  <div className="bg-muted/40 rounded p-3">
                    <div className="text-xs text-muted-foreground mb-1">UUID</div>
                    <div className="font-mono text-xs break-all">{previewInvoice.uuid}</div>
                  </div>
                  <div className="bg-muted/40 rounded p-3">
                    <div className="text-xs text-muted-foreground mb-1">المشتري</div>
                    <div className="font-bold">{previewInvoice.buyerName}</div>
                    {previewInvoice.buyerVatNumber && <div className="text-xs text-muted-foreground">{previewInvoice.buyerVatNumber}</div>}
                  </div>
                  <div className="bg-muted/40 rounded p-3">
                    <div className="text-xs text-muted-foreground mb-1">الإجمالي</div>
                    <div className="font-bold text-primary text-lg">{parseFloat(previewInvoice.totalRiyals).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</div>
                    <div className="text-xs text-amber-600">ضريبة: {parseFloat(previewInvoice.vatAmountRiyals).toFixed(2)} ر.س</div>
                  </div>
                </div>

                {qrData?.qrDataUrl && (
                  <div className="flex items-center gap-4 bg-muted/30 rounded p-3">
                    <img src={qrData.qrDataUrl} alt="QR Code" className="w-24 h-24 border rounded" />
                    <div className="text-xs text-muted-foreground">
                      <div className="font-semibold text-foreground mb-1">رمز QR المتوافق مع ZATCA</div>
                      <div>يحتوي على: اسم البائع، الرقم الضريبي، الطابع الزمني، الإجمالي، مبلغ الضريبة، وهاش الفاتورة</div>
                    </div>
                  </div>
                )}

                {previewInvoice.invoiceHash && (
                  <div className="bg-muted/30 rounded p-3">
                    <div className="text-xs text-muted-foreground mb-1">هاش الفاتورة (SHA-256)</div>
                    <div className="font-mono text-xs break-all">{previewInvoice.invoiceHash}</div>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setPreviewInvoice(null)}>إغلاق</Button>
                <Button onClick={() => handlePrint(previewInvoice, qrData?.qrDataUrl)}>
                  <Printer className="w-4 h-4 ml-1" /> طباعة / تصدير PDF
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* ── Settings Dialog ── */}
        <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle>إعدادات بيانات الشركة الضريبية</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>اسم الشركة (عربي) *</Label>
                  <Input className="mt-1" value={settingsForm.sellerName}
                    onChange={e => setSettingsForm(p => ({ ...p, sellerName: e.target.value }))} />
                </div>
                <div>
                  <Label>اسم الشركة (إنجليزي)</Label>
                  <Input className="mt-1" value={settingsForm.sellerNameEn}
                    onChange={e => setSettingsForm(p => ({ ...p, sellerNameEn: e.target.value }))} />
                </div>
                <div>
                  <Label>الرقم الضريبي (15 رقماً) *</Label>
                  <Input className="mt-1" value={settingsForm.vatNumber} maxLength={15}
                    onChange={e => setSettingsForm(p => ({ ...p, vatNumber: e.target.value }))} />
                </div>
                <div>
                  <Label>رقم السجل التجاري</Label>
                  <Input className="mt-1" value={settingsForm.crNumber}
                    onChange={e => setSettingsForm(p => ({ ...p, crNumber: e.target.value }))} />
                </div>
                <div>
                  <Label>المدينة</Label>
                  <Input className="mt-1" value={settingsForm.city}
                    onChange={e => setSettingsForm(p => ({ ...p, city: e.target.value }))} />
                </div>
                <div>
                  <Label>الرمز البريدي</Label>
                  <Input className="mt-1" value={settingsForm.postalCode}
                    onChange={e => setSettingsForm(p => ({ ...p, postalCode: e.target.value }))} />
                </div>
                <div>
                  <Label>رقم الهاتف</Label>
                  <Input className="mt-1" value={settingsForm.phone}
                    onChange={e => setSettingsForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <Label>البريد الإلكتروني</Label>
                  <Input className="mt-1" value={settingsForm.email}
                    onChange={e => setSettingsForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <Label>العنوان</Label>
                  <Input className="mt-1" value={settingsForm.address}
                    onChange={e => setSettingsForm(p => ({ ...p, address: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>إلغاء</Button>
              <Button onClick={() => updateSettingsMutation.mutate(settingsForm as any)}
                disabled={updateSettingsMutation.isPending}>
                {updateSettingsMutation.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
