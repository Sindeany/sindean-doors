/**
 * Email Helper — إرسال البريد الإلكتروني عبر SMTP
 * يتطلب متغيرات البيئة: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 * إذا لم تُعيَّن هذه المتغيرات، يتجاهل الإرسال بصمت (non-blocking).
 */
import nodemailer from "nodemailer";

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const FROM_ADDRESS =
  process.env.EMAIL_FROM ??
  "سنديان للأبواب الخشبية <no-reply@sindian-doors.com>";

export interface OrderConfirmationData {
  orderId: number;
  customerName: string;
  customerEmail: string;
  productName: string;
  selections: Record<string, string>;
  dimensions: Record<string, unknown> | null | undefined;
  totalPrice: number;
  notes?: string | null;
}

/** Sends a bilingual (Arabic + English) order confirmation to the customer. */
export async function sendOrderConfirmation(
  data: OrderConfirmationData
): Promise<void> {
  const transporter = createTransporter();
  if (!transporter) return; // SMTP not configured — skip silently

  const dimRows = data.dimensions
    ? Object.entries(data.dimensions)
        .map(
          ([k, v]) =>
            `<tr><td style="padding:4px 8px;color:#555;">${k.replace(/_/g, " ")}</td><td style="padding:4px 8px;font-weight:600;">${v} سم</td></tr>`
        )
        .join("")
    : "";

  const selRows = Object.entries(data.selections)
    .filter(([, v]) => v && v !== "false")
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 8px;color:#555;">${k.replace(/_/g, " ")}</td><td style="padding:4px 8px;font-weight:600;">${v}</td></tr>`
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#2C4A3E,#3d6b5e);padding:32px 40px;text-align:center;">
            <h1 style="color:#C4956A;margin:0;font-size:28px;">سنديان</h1>
            <p style="color:#e0d5c8;margin:6px 0 0;font-size:14px;">للأبواب الخشبية الفاخرة</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px;">
            <h2 style="color:#2C4A3E;margin:0 0 8px;">تم استلام طلبك بنجاح ✅</h2>
            <p style="color:#555;margin:0 0 24px;line-height:1.7;">
              عزيزنا ${data.customerName}،<br>
              يسعدنا إعلامك بأننا استلمنا طلبك رقم <strong style="color:#2C4A3E;">#${data.orderId}</strong>
              وسيتواصل معك فريقنا خلال 24 ساعة لتأكيد التفاصيل.
            </p>

            <!-- Order summary -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;border-radius:12px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #e8e0d5;">
                  <strong style="color:#2C4A3E;">المنتج:</strong>
                  <span style="margin-right:8px;">${data.productName}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #e8e0d5;">
                  <strong style="color:#2C4A3E;">رقم الطلب:</strong>
                  <span style="margin-right:8px;">#${data.orderId}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;">
                  <strong style="color:#2C4A3E;">السعر التقديري:</strong>
                  <span style="margin-right:8px;color:#C4956A;font-size:18px;font-weight:700;">
                    ${data.totalPrice.toLocaleString("ar-SA")} ر.س
                  </span>
                </td>
              </tr>
            </table>

            ${
              dimRows
                ? `
            <h3 style="color:#2C4A3E;margin:0 0 12px;font-size:15px;">المقاسات</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;border-radius:12px;margin-bottom:24px;">
              ${dimRows}
            </table>`
                : ""
            }

            ${
              selRows
                ? `
            <h3 style="color:#2C4A3E;margin:0 0 12px;font-size:15px;">الخيارات المختارة</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;border-radius:12px;margin-bottom:24px;">
              ${selRows}
            </table>`
                : ""
            }

            ${
              data.notes
                ? `
            <div style="background:#fffbf5;border-right:4px solid #C4956A;padding:12px 16px;border-radius:8px;margin-bottom:24px;">
              <strong style="color:#2C4A3E;font-size:13px;">ملاحظات:</strong>
              <p style="margin:4px 0 0;color:#555;font-size:13px;">${data.notes}</p>
            </div>`
                : ""
            }

            <p style="color:#888;font-size:13px;line-height:1.6;margin:0;">
              * السعر المذكور تقديري ويخضع للمراجعة النهائية بعد دراسة المواصفات الكاملة.<br>
              * للاستفسار تواصل معنا عبر البريد الإلكتروني أو الهاتف.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#2C4A3E;padding:20px 40px;text-align:center;">
            <p style="color:#C4956A;margin:0;font-size:13px;">
              سنديان للأبواب الخشبية — المملكة العربية السعودية
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to: data.customerEmail,
      subject: `تأكيد طلبك #${data.orderId} — ${data.productName} | سنديان`,
      html,
    });
  } catch (err) {
    // Email failure must never block the order
    console.error("[email] Failed to send order confirmation:", err);
  }
}
