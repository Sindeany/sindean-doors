/**
 * env.ts — التحقق من متغيرات البيئة عند بدء السيرفر
 *
 * يجب استيراده أولاً في index.ts قبل أي شيء آخر:
 *   import "./env.js";
 *
 * المتغيرات المطلوبة (Required):
 *   DATABASE_URL — رابط قاعدة البيانات
 *   وواحد على الأقل من ADMIN_PASSWORD_HASH أو ADMIN_INTERNAL_KEY
 *
 * المتغيرات الاختيارية (Optional):
 *   SMTP_* — لإرسال البريد الإلكتروني (تُفعّل email confirmation)
 *   BUILT_IN_FORGE_API_* — لإرسال إشعارات المالك
 *   ALLOWED_ORIGIN — تقييد CORS في الإنتاج
 *   PORT, NODE_ENV
 */
import { z } from "zod/v4";

// ── Schema ────────────────────────────────────────────────────────────────────

const envSchema = z.object({
  // ── Required ──────────────────────────────────────────────────────────────
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL مطلوب — مثال: mysql://user:pass@host:3306/dbname"),

  // ── Admin auth: يجب وجود واحد على الأقل ──────────────────────────────────
  ADMIN_PASSWORD_HASH: z.string().optional(),
  ADMIN_INTERNAL_KEY: z.string().optional(),

  // ── Optional: SMTP ────────────────────────────────────────────────────────
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z
    .string()
    .optional()
    .refine(v => !v || !isNaN(Number(v)), {
      message: "SMTP_PORT يجب أن يكون رقماً",
    }),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // ── Optional: Manus Forge (notifications + LLM) ───────────────────────────
  BUILT_IN_FORGE_API_URL: z
    .url()
    .optional()
    .or(z.literal(""))
    .or(z.undefined()),
  BUILT_IN_FORGE_API_KEY: z.string().optional(),
  OWNER_OPEN_ID: z.string().optional(),
  OWNER_NAME: z.string().optional(),

  // ── Optional: CORS ────────────────────────────────────────────────────────
  ALLOWED_ORIGIN: z.string().optional(),

  // ── Optional: Runtime ─────────────────────────────────────────────────────
  PORT: z
    .string()
    .optional()
    .refine(v => !v || !isNaN(Number(v)), {
      message: "PORT يجب أن يكون رقماً",
    }),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

// ── Cross-field rules ─────────────────────────────────────────────────────────

function validate(): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map(i => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(`\n❌ [env] متغيرات البيئة غير مكتملة:\n${issues}\n`);
    process.exit(1);
  }

  const env = result.data;

  // At least one admin credential must be present
  if (!env.ADMIN_PASSWORD_HASH && !env.ADMIN_INTERNAL_KEY) {
    console.error(
      "\n❌ [env] يجب تعيين ADMIN_PASSWORD_HASH (bcrypt) أو ADMIN_INTERNAL_KEY\n" +
        "  لتوليد hash: node -e \"require('bcryptjs').hash('كلمة_المرور',12).then(h=>console.log(h))\"\n"
    );
    process.exit(1);
  }

  // Warn (don't exit) if ADMIN_INTERNAL_KEY is used without hash — less secure
  if (!env.ADMIN_PASSWORD_HASH && env.ADMIN_INTERNAL_KEY) {
    console.warn(
      "⚠️  [env] ADMIN_INTERNAL_KEY مُستخدم كنص عادي. " +
        "يُنصح باستبداله بـ ADMIN_PASSWORD_HASH (bcrypt) للأمان الأمثل."
    );
  }

  // Warn if SMTP is partially configured
  const smtpFields = [env.SMTP_HOST, env.SMTP_USER, env.SMTP_PASS];
  const smtpFilled = smtpFields.filter(Boolean).length;
  if (smtpFilled > 0 && smtpFilled < 3) {
    console.warn(
      "⚠️  [env] إعدادات SMTP غير مكتملة — يجب تعيين SMTP_HOST و SMTP_USER و SMTP_PASS معاً لتفعيل البريد."
    );
  }

  // Warn if Forge API is partially configured
  if (
    (env.BUILT_IN_FORGE_API_URL && !env.BUILT_IN_FORGE_API_KEY) ||
    (!env.BUILT_IN_FORGE_API_URL && env.BUILT_IN_FORGE_API_KEY)
  ) {
    console.warn(
      "⚠️  [env] BUILT_IN_FORGE_API_URL و BUILT_IN_FORGE_API_KEY يجب تعيينهما معاً."
    );
  }

  // In production, ALLOWED_ORIGIN should be set
  if (env.NODE_ENV === "production" && !env.ALLOWED_ORIGIN) {
    console.warn(
      "⚠️  [env] ALLOWED_ORIGIN غير مُعيَّن في بيئة الإنتاج — CORS مفتوح لجميع الأصول."
    );
  }

  return env;
}

export const env = validate();
