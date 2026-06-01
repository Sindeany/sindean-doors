// ============================================================
// workOrderPDF.ts - توليد PDF لأمر التشغيل عبر نافذة الطباعة
// يُنشئ نافذة طباعة HTML كاملة تشمل:
//   - رأس الشركة + بيانات الأمر
//   - جدول الأبواب التفصيلي
//   - توزيع الأقسام مع شريط التقدم
//   - ملاحظات وتوقيعات
// ============================================================
import type { WorkOrder, DoorItem, DeptTask } from "@/pages/admin/AdminWorkOrders";

// ─── خرائط النصوص ─────────────────────────────────────────────
const DEPT_LABELS: Record<string, string> = {
  door_line:   "خط الأبواب",
  frame_line:  "خط الإطارات",
  accessories: "قسم الإكسسوارات",
  qc:          "ضبط الجودة",
  packing:     "قسم التغليف",
};

const STATUS_LABELS: Record<string, string> = {
  draft:       "مسودة",
  issued:      "صادر",
  in_progress: "قيد التنفيذ",
  completed:   "مكتمل",
  on_hold:     "موقوف",
  cancelled:   "ملغي",
};

const PRIORITY_LABELS: Record<string, string> = {
  normal: "عادي",
  urgent: "عاجل",
  vip:    "VIP",
};

const PRIORITY_COLORS: Record<string, string> = {
  normal: "#2D6A4F",
  urgent: "#D97706",
  vip:    "#7C3AED",
};

const STATUS_COLORS: Record<string, string> = {
  draft:       "#6B7280",
  issued:      "#2563EB",
  in_progress: "#D97706",
  completed:   "#059669",
  on_hold:     "#DC2626",
  cancelled:   "#9CA3AF",
};

// ─── تنسيق التاريخ ────────────────────────────────────────────
function fmtDate(d: string): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("ar-SA", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch { return d; }
}

// ─── توليد صف باب ─────────────────────────────────────────────
function doorRow(door: DoorItem, idx: number): string {
  return `
    <tr style="background:${idx % 2 === 0 ? "#F9FAFB" : "#FFFFFF"}">
      <td style="padding:8px 10px;border:1px solid #E5E7EB;text-align:center;font-weight:600;color:#374151">${idx + 1}</td>
      <td style="padding:8px 10px;border:1px solid #E5E7EB;font-family:monospace;font-size:12px;color:#1F2937">${door.code}</td>
      <td style="padding:8px 10px;border:1px solid #E5E7EB;color:#1F2937">${door.model}</td>
      <td style="padding:8px 10px;border:1px solid #E5E7EB;text-align:center;color:#374151">${door.width}×${door.height}</td>
      <td style="padding:8px 10px;border:1px solid #E5E7EB;text-align:center;color:#374151">${door.direction === "right" ? "يمين ←" : "يسار →"}</td>
      <td style="padding:8px 10px;border:1px solid #E5E7EB;color:#374151">${door.frameType}</td>
      <td style="padding:8px 10px;border:1px solid #E5E7EB;text-align:center;color:#374151">${door.edgeType}</td>
      <td style="padding:8px 10px;border:1px solid #E5E7EB;color:#374151">${door.doorColor}</td>
      <td style="padding:8px 10px;border:1px solid #E5E7EB;color:#374151">${door.frameColor}</td>
      <td style="padding:8px 10px;border:1px solid #E5E7EB;color:#374151">${door.lockType}</td>
      <td style="padding:8px 10px;border:1px solid #E5E7EB;color:#374151">${door.hingeType}</td>
      <td style="padding:8px 10px;border:1px solid #E5E7EB;text-align:center;font-weight:700;color:#2D6A4F">${door.quantity}</td>
      <td style="padding:8px 10px;border:1px solid #E5E7EB;font-size:11px;color:#6B7280">${door.specialReqs || "—"}</td>
    </tr>`;
}

// ─── توليد بطاقة قسم ──────────────────────────────────────────
function deptCard(task: DeptTask): string {
  const pct = task.quantity > 0 ? Math.round((task.completedQty / task.quantity) * 100) : 0;
  const statusColor = STATUS_COLORS[task.status] || "#6B7280";
  const barColor = pct >= 100 ? "#059669" : pct > 0 ? "#D97706" : "#E5E7EB";
  return `
    <div style="border:1px solid #E5E7EB;border-radius:12px;padding:16px;background:#FFFFFF;break-inside:avoid">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
        <div>
          <div style="font-size:15px;font-weight:700;color:#1F2937;margin-bottom:3px">${DEPT_LABELS[task.deptId] || task.deptId}</div>
          <div style="font-size:12px;color:#6B7280">${task.assignedTo}</div>
        </div>
        <span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:${statusColor}20;color:${statusColor}">
          ${STATUS_LABELS[task.status] || task.status}
        </span>
      </div>
      <div style="font-size:12px;color:#374151;margin-bottom:10px;line-height:1.5">${task.specs}</div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#6B7280;margin-bottom:6px">
        <span>الكمية: <strong style="color:#1F2937">${task.completedQty} / ${task.quantity} ${task.unit}</strong></span>
        <span>التقدم: <strong style="color:${barColor}">${pct}%</strong></span>
      </div>
      <div style="background:#F3F4F6;border-radius:4px;height:8px;overflow:hidden">
        <div style="background:${barColor};height:100%;width:${pct}%;border-radius:4px;transition:width 0.3s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#9CA3AF;margin-top:8px">
        <span>البداية: ${fmtDate(task.startDate)}</span>
        <span>الانتهاء: ${fmtDate(task.dueDate)}</span>
      </div>
      ${task.notes ? `<div style="margin-top:8px;font-size:11px;color:#6B7280;background:#FEF9C3;padding:6px 10px;border-radius:6px">📌 ${task.notes}</div>` : ""}
    </div>`;
}

// ─── الوظيفة الرئيسية: فتح نافذة طباعة HTML ──────────────────
export function printWorkOrder(wo: WorkOrder): void {
  const priorityColor = PRIORITY_COLORS[wo.priority] || "#2D6A4F";
  const statusColor   = STATUS_COLORS[wo.status]     || "#6B7280";
  const totalDoors    = wo.doors.reduce((s, d) => s + d.quantity, 0);
  const printDate     = new Date().toLocaleDateString("ar-SA", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>أمر التشغيل ${wo.woNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Cairo', 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      color: #1F2937;
      background: #FFFFFF;
      direction: rtl;
    }
    .page { max-width: 1000px; margin: 0 auto; padding: 24px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .page { padding: 12px; }
      .page-break { page-break-before: always; }
    }
    table { width:100%; border-collapse:collapse; }
    th { background:#2D6A4F; color:#FFFFFF; padding:10px; font-size:12px; font-weight:700; border:1px solid #2D6A4F; }
    .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; }
    .section-title {
      font-size:16px; font-weight:800; color:#1F2937;
      border-right:4px solid #2D6A4F; padding-right:12px;
      margin:24px 0 14px;
    }
    .info-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:20px; }
    .info-card { background:#F9FAFB; border:1px solid #E5E7EB; border-radius:10px; padding:14px; }
    .info-label { font-size:11px; color:#6B7280; margin-bottom:4px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; }
    .info-value { font-size:14px; font-weight:700; color:#1F2937; }
    .dept-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .sig-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; margin-top:30px; }
    .sig-box { border-top:2px solid #E5E7EB; padding-top:10px; text-align:center; }
    .sig-label { font-size:11px; color:#6B7280; margin-bottom:30px; }
    .watermark { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-30deg); font-size:80px; font-weight:900; color:rgba(45,106,79,0.04); pointer-events:none; z-index:0; white-space:nowrap; }
  </style>
</head>
<body>
  <div class="watermark">سنديان للأبواب</div>
  <div class="page">

    <!-- ── Header ─────────────────────────────────────────────── -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:3px solid #2D6A4F;margin-bottom:20px">
      <div>
        <div style="font-size:28px;font-weight:900;color:#2D6A4F;letter-spacing:-0.5px">سنديان للأبواب</div>
        <div style="font-size:12px;color:#6B7280;margin-top:3px">مصنع أبواب خشبية — المملكة العربية السعودية</div>
        <div style="font-size:11px;color:#9CA3AF;margin-top:2px">info@sindian.sa · 920-000-000</div>
      </div>
      <div style="text-align:left">
        <div style="font-size:22px;font-weight:800;color:#1F2937">${wo.woNumber}</div>
        <div style="margin-top:6px">
          <span class="badge" style="background:${priorityColor}20;color:${priorityColor}">
            ${wo.priority === "vip" ? "⭐ VIP" : wo.priority === "urgent" ? "⚡ عاجل" : "● عادي"}
          </span>
          <span class="badge" style="background:${statusColor}20;color:${statusColor};margin-right:6px">
            ${STATUS_LABELS[wo.status] || wo.status}
          </span>
        </div>
        <div style="font-size:11px;color:#9CA3AF;margin-top:8px">طُبع: ${printDate}</div>
      </div>
    </div>

    <!-- ── بيانات الأمر ────────────────────────────────────────── -->
    <div class="info-grid">
      <div class="info-card">
        <div class="info-label">رقم أمر الشراء (PO)</div>
        <div class="info-value" style="font-family:monospace">${wo.poNumber}</div>
      </div>
      <div class="info-card">
        <div class="info-label">الموزع / العميل</div>
        <div class="info-value">${wo.distributorName}</div>
        <div style="font-size:11px;color:#6B7280;margin-top:3px">${wo.distributorPhone}</div>
      </div>
      <div class="info-card">
        <div class="info-label">المشرف المسؤول</div>
        <div class="info-value">${wo.supervisorName}</div>
      </div>
      <div class="info-card">
        <div class="info-label">تاريخ الإصدار</div>
        <div class="info-value">${fmtDate(wo.issuedAt)}</div>
      </div>
      <div class="info-card">
        <div class="info-label">تاريخ بدء الإنتاج</div>
        <div class="info-value">${fmtDate(wo.startDate)}</div>
      </div>
      <div class="info-card">
        <div class="info-label">الموعد النهائي</div>
        <div class="info-value" style="color:#DC2626">${fmtDate(wo.dueDate)}</div>
      </div>
    </div>

    <!-- ── ملخص الكميات ───────────────────────────────────────── -->
    <div style="display:flex;gap:12px;margin-bottom:20px">
      <div style="flex:1;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:#059669">${totalDoors}</div>
        <div style="font-size:12px;color:#065F46;font-weight:600">إجمالي الأبواب</div>
      </div>
      <div style="flex:1;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:#2563EB">${wo.doors.length}</div>
        <div style="font-size:12px;color:#1E40AF;font-weight:600">أنواع مختلفة</div>
      </div>
      <div style="flex:1;background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:#EA580C">${wo.deptTasks.length}</div>
        <div style="font-size:12px;color:#9A3412;font-weight:600">أقسام معنية</div>
      </div>
      <div style="flex:1;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:#7C3AED">${wo.progressPercent}%</div>
        <div style="font-size:12px;color:#5B21B6;font-weight:600">نسبة الإنجاز</div>
      </div>
    </div>

    ${wo.notes ? `
    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:12px 16px;margin-bottom:20px;display:flex;gap:10px;align-items:flex-start">
      <span style="font-size:16px">📌</span>
      <div>
        <div style="font-size:12px;font-weight:700;color:#92400E;margin-bottom:3px">ملاحظات خاصة</div>
        <div style="font-size:13px;color:#78350F">${wo.notes}</div>
      </div>
    </div>` : ""}

    <!-- ── جدول الأبواب ───────────────────────────────────────── -->
    <div class="section-title">جدول الأبواب التفصيلي</div>
    <div style="overflow-x:auto;margin-bottom:24px">
      <table>
        <thead>
          <tr>
            <th style="width:40px">#</th>
            <th>الكود</th>
            <th>الموديل</th>
            <th>المقاس (سم)</th>
            <th>الاتجاه</th>
            <th>الإطار</th>
            <th>الحافة</th>
            <th>لون الباب</th>
            <th>لون الإطار</th>
            <th>القفل</th>
            <th>المفصلات</th>
            <th style="width:50px">الكمية</th>
            <th>متطلبات خاصة</th>
          </tr>
        </thead>
        <tbody>
          ${wo.doors.map((d, i) => doorRow(d, i)).join("")}
          <tr style="background:#F0FDF4;font-weight:700">
            <td colspan="11" style="padding:10px;border:1px solid #E5E7EB;text-align:left;color:#065F46">الإجمالي</td>
            <td style="padding:10px;border:1px solid #E5E7EB;text-align:center;font-size:16px;color:#059669">${totalDoors}</td>
            <td style="border:1px solid #E5E7EB"></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── توزيع الأقسام ──────────────────────────────────────── -->
    <div class="page-break"></div>
    <div class="section-title">توزيع المهام على الأقسام</div>
    <div class="dept-grid">
      ${wo.deptTasks.map(t => deptCard(t)).join("")}
    </div>

    <!-- ── التوقيعات ──────────────────────────────────────────── -->
    <div class="sig-grid">
      <div class="sig-box">
        <div class="sig-label">مدير الإنتاج</div>
        <div style="font-size:11px;color:#9CA3AF">الاسم والتوقيع والتاريخ</div>
      </div>
      <div class="sig-box">
        <div class="sig-label">المشرف المسؤول · ${wo.supervisorName}</div>
        <div style="font-size:11px;color:#9CA3AF">الاسم والتوقيع والتاريخ</div>
      </div>
      <div class="sig-box">
        <div class="sig-label">مدير الجودة</div>
        <div style="font-size:11px;color:#9CA3AF">الاسم والتوقيع والتاريخ</div>
      </div>
    </div>

    <!-- ── Footer ─────────────────────────────────────────────── -->
    <div style="margin-top:30px;padding-top:16px;border-top:1px solid #E5E7EB;display:flex;justify-content:space-between;font-size:10px;color:#9CA3AF">
      <span>سنديان للأبواب الخشبية — وثيقة داخلية سرية</span>
      <span>${wo.woNumber} · طُبع: ${printDate}</span>
    </div>

    <!-- ── زر الطباعة (يختفي عند الطباعة) ─────────────────────── -->
    <div class="no-print" style="text-align:center;margin-top:30px">
      <button onclick="window.print()"
        style="background:#2D6A4F;color:#fff;border:none;padding:12px 36px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit">
        🖨️ طباعة / حفظ PDF
      </button>
      <button onclick="window.close()"
        style="background:#F3F4F6;color:#374151;border:none;padding:12px 36px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;margin-right:12px">
        إغلاق
      </button>
    </div>

  </div>
</body>
</html>`;

  // فتح نافذة طباعة جديدة
  const win = window.open("", "_blank", "width=1100,height=800,scrollbars=yes");
  if (!win) {
    alert("يرجى السماح بالنوافذ المنبثقة لتتمكن من طباعة أمر التشغيل");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
}
