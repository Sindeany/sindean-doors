# سنديان للأبواب الخشبية

منصة تجارة إلكترونية متكاملة وERP لإدارة طلبات الأبواب الخشبية، تشمل لوحات متخصصة للإدارة والعملاء والموزعين والموردين، إلى جانب أنظمة مشتريات وRFQ ومخزون وإنتاج ومحاسبة وفواتير ضريبية إلكترونية متوافقة مع ZATCA.

---

## نظرة عامة

النظام مبني كتطبيق full-stack أحادي المستودع (monorepo) يجمع بين:

- **متجر عام (B2C):** تصفح المنتجات، معالج تكوين الأبواب (Door Order Wizard)، سلة تسوق، وصفحة تفاصيل المنتج.
- **لوحة الإدارة:** إدارة الطلبات بـ workflow مفصّل (15 مرحلة)، المنتجات، الموزعين، الموردين، المخزون، الإنتاج، الجودة، التعبئة، المحاسبة، التقارير، والفواتير الضريبية ZATCA.
- **بوابة الموزعين:** رفع الطلبات يدوياً أو عبر Excel، متابعة الطلبات، الشكاوى، التقارير.
- **بوابة الموردين:** استقبال دعوات عروض الأسعار (RFQ)، تقديم العروض، متابعة أوامر الشراء.
- **بوابة الشركات (B2B):** متابعة الطلبات والفواتير.
- **بوابة العملاء:** تتبع الطلبات.

---

## الهدف من المشروع

يهدف النظام إلى رقمنة العمليات التشغيلية الكاملة لشركة سنديان للأبواب الخشبية، بدءاً من استقبال طلبات العملاء، مروراً بدورة الشراء من الموردين (RFQ → PO)، وانتهاءً بإصدار الفواتير الضريبية الإلكترونية المتوافقة مع متطلبات هيئة الزكاة والضريبة والجمارك (ZATCA Phase 2).

---

## التقنيات المستخدمة

| الطبقة                | التقنية                             | الملاحظة        |
| --------------------- | ----------------------------------- | --------------- |
| **الواجهة الأمامية**  | React 19                            | `package.json`  |
| **اللغة**             | TypeScript 5.6.3                    | `package.json`  |
| **أداة البناء**       | Vite 7                              | `package.json`  |
| **تنسيق CSS**         | TailwindCSS 4                       | `package.json`  |
| **مكونات UI**         | Radix UI (كامل المكتبة) + shadcn/ui | `package.json`  |
| **الـ API**           | tRPC 11 + SuperJSON                 | `package.json`  |
| **إدارة الحالة**      | TanStack Query v5                   | `package.json`  |
| **التوجيه**           | wouter 3                            | `package.json`  |
| **الرسوم البيانية**   | Recharts 2                          | `package.json`  |
| **رفع Excel**         | xlsx 0.18.5                         | `package.json`  |
| **الحركة**            | Framer Motion 12                    | `package.json`  |
| **الخادم**            | Express 4                           | `package.json`  |
| **ORM**               | Drizzle ORM                         | `package.json`  |
| **قاعدة البيانات**    | MySQL / TiDB (mysql2)               | `package.json`  |
| **التحقق**            | Zod v4                              | `package.json`  |
| **المصادقة**          | bcryptjs + nanoid                   | `package.json`  |
| **البريد الإلكتروني** | Nodemailer 8                        | `package.json`  |
| **QR Code**           | qrcode 1.5                          | `package.json`  |
| **الاختبارات**        | Vitest 2                            | `package.json`  |
| **Manus Forge API**   | إشعارات + AI                        | `server/env.ts` |

---

## هيكل المشروع

```
sindian-doors/
├── client/                  # الواجهة الأمامية (React + Vite)
│   └── src/
│       ├── pages/
│       │   ├── admin/       # 31 صفحة إدارية
│       │   ├── supplier/    # بوابة الموردين (3 صفحات)
│       │   ├── distributor/ # بوابة الموزعين (8 صفحات)
│       │   ├── company/     # بوابة الشركات (5 صفحات)
│       │   ├── customer/    # بوابة العملاء
│       │   └── user/        # حسابات التجزئة
│       ├── components/      # مكونات مشتركة
│       ├── contexts/        # 8 contexts (auth + cart + theme + language)
│       ├── hooks/
│       └── lib/             # trpc.ts, translations/, workOrderPDF.ts
├── server/                  # الخادم (Express + tRPC)
│   ├── index.ts             # نقطة الدخول
│   ├── routers.ts           # تجميع جميع الـ routers
│   ├── trpc.ts              # publicProcedure / adminProcedure
│   ├── db.ts                # Drizzle + MySQL pool
│   ├── zatca.service.ts     # UBL 2.1 XML + QR TLV
│   └── *.router.ts          # 23+ router منفصل
├── drizzle/
│   └── schema.ts            # تعريف 33 جدولاً
├── shared/
│   └── const.ts
├── drizzle.config.ts
├── vite.config.ts
├── vitest.config.ts
└── package.json
```

---

## المتطلبات الأساسية

- **Node.js** 18 أو أحدث
- **pnpm** (مدير الحزم المستخدم في المشروع)
- **MySQL** أو **TiDB** (يمكن استخدام MySQL محلي أو TiDB Cloud)
- **VS Code** (اختياري، لكن موصى به)

---

## إعداد البيئة

1. انسخ ملف القالب وأعد تسميته:

```bash
cp env-template.txt .env
```

2. افتح `.env` وعدّل القيم التالية (الحد الأدنى للتشغيل):

```env
# ── مطلوب ──────────────────────────────────────────────────────────────────
DATABASE_URL=mysql://USER:PASSWORD@localhost:3306/sindian_doors

# ── مصادقة الإدارة: يجب وجود واحد على الأقل ───────────────────────────────
# الخيار الأفضل: bcrypt hash لكلمة المرور
ADMIN_PASSWORD_HASH=<hash_generated_by_bcrypt>
# أو: مفتاح نصي بديل
ADMIN_INTERNAL_KEY=<secret_random_string>
```

3. المتغيرات الاختيارية (تُفعّل ميزات إضافية):

| المتغير                                                          | الغرض                                         |
| ---------------------------------------------------------------- | --------------------------------------------- |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | إرسال تأكيد الطلب للعميل                      |
| `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`               | إشعارات المالك والـ AI                        |
| `OWNER_OPEN_ID`, `OWNER_NAME`                                    | تحديد هوية المالك للإشعارات                   |
| `ALLOWED_ORIGIN`                                                 | تقييد CORS في الإنتاج                         |
| `PORT`                                                           | تغيير المنفذ (الافتراضي: 3001 dev، 3000 prod) |

> **تحذير أمني:** لا ترفع ملف `.env` إلى Git مطلقاً. تأكد من وجوده في `.gitignore`.

---

## إعداد قاعدة البيانات

بعد إعداد `DATABASE_URL` في `.env`، شغّل الأمر التالي لإنشاء جميع الجداول (33 جدولاً):

```bash
pnpm db:push
```

لفتح واجهة إدارة قاعدة البيانات (Drizzle Studio):

```bash
pnpm db:studio
```

---

## تشغيل المشروع

**تثبيت الحزم:**

```bash
pnpm install
```

**تشغيل بيئة التطوير (server + client معاً):**

```bash
pnpm dev
```

- الخادم يعمل على: `http://localhost:3001`
- العميل يعمل على: المنفذ الذي يحدده Vite (يظهر في الطرفية عند التشغيل)

**تشغيل كل جزء منفرداً:**

```bash
pnpm dev:server   # الخادم فقط (tsx watch)
pnpm dev:client   # العميل فقط (Vite)
```

---

## أوامر التطوير

| الأمر          | الغرض                                       |
| -------------- | ------------------------------------------- |
| `pnpm check`   | التحقق من أخطاء TypeScript (`tsc --noEmit`) |
| `pnpm test`    | تشغيل الاختبارات (Vitest)                   |
| `pnpm build`   | بناء الإنتاج (Vite + esbuild للخادم)        |
| `pnpm start`   | تشغيل بيئة الإنتاج (`NODE_ENV=production`)  |
| `pnpm format`  | تنسيق الكود (Prettier)                      |
| `pnpm preview` | معاينة build الإنتاج محلياً                 |

---

## الوحدات الرئيسية

| الوحدة                      | الملفات الدالة                                                                            | الوصف                                     |
| --------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------- |
| **المتجر العام**            | `pages/Home.tsx`, `Products.tsx`, `ProductDetail.tsx`, `Cart.tsx`, `Checkout.tsx`         | تصفح وشراء                                |
| **لوحة الإدارة**            | `pages/admin/` (31 صفحة)                                                                  | إدارة شاملة لجميع العمليات                |
| **نظام طلبات الأبواب**      | `components/DoorOrderWizard.tsx`, `server/routers.ts` → `ordersRouter`                    | معالج تكوين الباب + workflow 15 مرحلة     |
| **بوابة الموزعين**          | `pages/distributor/` (8 صفحات)                                                            | طلبات، رفع Excel، شكاوى، تقارير           |
| **بوابة الموردين**          | `pages/supplier/` (3 صفحات)                                                               | استقبال RFQ، تقديم عروض، متابعة PO        |
| **RFQ وإدارة المشتريات**    | `server/rfq.router.ts`, `server/purchases.router.ts`                                      | دورة شراء كاملة بتقييم AI                 |
| **المخزون**                 | `server/inventory.router.ts`, `pages/admin/AdminInventory.tsx`                            | مواد خام + حركات                          |
| **الإنتاج وأوامر العمل**    | `server/workOrders.router.ts`, `server/production.router.ts`                              | تخطيط + تتبع                              |
| **فحص الجودة**              | `server/qc.router.ts`, `pages/admin/AdminQCInspection.tsx`                                | incoming / final / po_matching            |
| **التعبئة والتسليم**        | `server/packing.router.ts`, `pages/admin/AdminPackingDelivery.tsx`                        | أوامر التعبئة                             |
| **المحاسبة**                | `server/accounting.router.ts`, `pages/admin/AdminAccounting.tsx`                          | دليل حسابات + قيود يومية + فواتير مشتريات |
| **الفواتير الضريبية ZATCA** | `server/zatca.service.ts`, `server/zatca.router.ts`, `pages/admin/AdminZATCAInvoices.tsx` | UBL 2.1 + QR TLV + Phase 2                |
| **خيارات المنتجات**         | `server/productOptions.router.ts`, `pages/admin/AdminProductOptions.tsx`                  | إدارة الخيارات ديناميكياً                 |
| **رفع Excel**               | `components/` → ExcelOrderUpload (داخل DoorOrderWizard)                                   | تحليل بالـ AI + fuzzy matching            |
| **الشكاوى**                 | `server/complaints.router.ts`, `pages/admin/AdminComplaints.tsx`                          | تذاكر شكاوى مع رسائل                      |
| **التحليلات والتقارير**     | `server/analytics.router.ts`, `pages/admin/AdminBIDashboard.tsx`, `AdminReports.tsx`      | إحصاءات + BI                              |

---

## المصادقة والصلاحيات

### أنظمة المصادقة

| النظام                   | الآلية                                                        | الحالة                   |
| ------------------------ | ------------------------------------------------------------- | ------------------------ |
| **المدير (Admin)**       | bcrypt + جدول `admin_sessions` (httpOnly cookie، TTL 8 ساعات) | ✅ مصادقة حقيقية         |
| **العميل (User)**        | bcrypt + جدول `user_sessions` (header `x-user-token`)         | ✅ مصادقة حقيقية         |
| **المورد (Supplier)**    | bcrypt + جدول `supplier_sessions` (header `x-supplier-token`) | ✅ مصادقة حقيقية         |
| **الموزع (Distributor)** | mock — يقبل أي email يحتوي "@" مع أي كلمة مرور                | ⚠️ **غير جاهزة للإنتاج** |
| **الشركة (Company)**     | mock — يقبل أي email يحتوي "@" مع أي كلمة مرور                | ⚠️ **غير جاهزة للإنتاج** |

> **تحذير:** مصادقة الموزعين والشركات حالياً محاكاة (mock) موجودة في `DistributorAuthContext.tsx` و `CompanyAuthContext.tsx`. **يجب استبدالها بمصادقة حقيقية قبل النشر في الإنتاج.**

### حماية المسارات الإدارية

- `adminProcedure` (معرَّفة في `server/trpc.ts`) تتحقق من صحة جلسة المدير قبل تنفيذ أي إجراء إداري.
- Rate limiting مضاعف على نقاط الدخول الحساسة:
  - `/api/trpc/adminAuth` — 20 طلب / 15 دقيقة
  - `/api/trpc/users` — 20 طلب / 15 دقيقة
  - `/api/trpc/suppliers` — 20 طلب / 15 دقيقة
  - `/api/upload` — 10 رفع / دقيقة
  - عموم `/api` — 100 طلب / 15 دقيقة

---

## ملاحظات ZATCA والفواتير الضريبية

يحتوي النظام على تنفيذ لفواتير ضريبية إلكترونية يشمل:

- توليد **QR Code** بتشفير TLV Base64 (6 حقول)
- بناء **UBL 2.1 XML** متوافق مع هيكل ZATCA Phase 2
- دعم نوعَي الفاتورة: **Standard (B2B)** و **Simplified (B2C)**
- ربط سلسلة الفواتير (`previousInvoiceHash`) لضمان التكاملية
- إرسال للبوابة عبر Clearance (B2B) أو Reporting (B2C)

> **تحذير:** يجب **التحقق النهائي من جاهزية الإنتاج عبر ZATCA Sandbox وعملية Onboarding الرسمية** (الحصول على CSID من بوابة Fatoorah) قبل الاستخدام الفعلي. لا يُعدّ الكود الحالي متوافقاً بشكل مضمون مع بيئة ZATCA الإنتاجية دون إتمام هذه الخطوات.

---

## الاختبارات

يستخدم المشروع **Vitest** (مُعرَّف في `vitest.config.ts`) لاختبار منطق الخادم:

```bash
pnpm test
```

- نطاق الاختبارات: `server/**/*.test.ts`
- البيئة: `node`

ملفات الاختبار الموجودة في `server/`:

| الملف                    | المحتوى                               |
| ------------------------ | ------------------------------------- |
| `orders.test.ts`         | اختبارات orders router                |
| `zatca.test.ts`          | اختبارات TLV encoding وحسابات الضريبة |
| `orderToInvoice.test.ts` | اختبارات تحويل الطلب إلى فاتورة       |
| `productOptions.test.ts` | اختبارات خيارات المنتجات              |
| `purchases.test.ts`      | اختبارات المشتريات                    |
| `comments.test.ts`       | اختبارات التعليقات                    |
| `accounting.test.ts`     | اختبارات المحاسبة                     |
| `excelEdit.test.ts`      | اختبارات تعديل Excel                  |

---

## الأمان

- **لا ترفع `.env` إلى Git** — تأكد من إدراجه في `.gitignore`.
- استخدم **كلمات مرور وأسرار قوية وعشوائية** في الإنتاج (`ADMIN_PASSWORD_HASH`، `ADMIN_INTERNAL_KEY`).
- حدّد `ALLOWED_ORIGIN` في الإنتاج لتقييد CORS على نطاقك الفعلي فقط.
- **مصادقة الموزعين والشركات mock حالياً** — راجع قسم المصادقة أعلاه.
- رفع الملفات مقيَّد بالصور فقط (JPEG، PNG، WebP، GIF) بحد أقصى 5MB.
- لا تستخدم بيانات عملاء حقيقية في بيئة التطوير.
- راجع صلاحيات كل لوحة قبل النشر في الإنتاج.

---

## حل المشكلات الشائعة

### فشل الاتصال بقاعدة البيانات

```
Error: connect ECONNREFUSED
```

- تحقق من أن MySQL أو TiDB يعمل.
- تحقق من صحة `DATABASE_URL` في `.env`.
- تأكد أن قاعدة البيانات مُنشأة وأن المستخدم يمتلك الصلاحيات.

### المنفذ مستخدم بالفعل

```
Error: listen EADDRINUSE :::3001
```

- أوقف العملية التي تستخدم المنفذ، أو غيّر `PORT` في `.env`.

### pnpm غير مثبت

```
pnpm: command not found
```

```bash
npm install -g pnpm
```

### أخطاء متغيرات البيئة عند بدء الخادم

```
Error: DATABASE_URL مطلوب
```

- تأكد من وجود ملف `.env` في جذر المشروع.
- تأكد من وجود `DATABASE_URL` وواحد على الأقل من `ADMIN_PASSWORD_HASH` أو `ADMIN_INTERNAL_KEY`.

### أخطاء TypeScript

```bash
pnpm check
```

- أصلح الأخطاء المُبلَّغ عنها قبل البناء.
- تأكد من تطابق إصدار TypeScript (5.6.3 المحدد في `package.json`).

### الخادم يعمل لكن الـ client لا يتصل بـ API

- تأكد من تشغيل الخادم على المنفذ الصحيح (3001 افتراضياً في dev).
- تحقق من إعداد proxy في `vite.config.ts`.
