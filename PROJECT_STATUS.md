# حالة المشروع — سنديان للأبواب الخشبية

> آخر تحديث لهذا الملف: يونيو 2026
> المصدر الرئيسي لبنود "المنجز": ملف `todo.md` في جذر المشروع.

---

## ملخص الحالة

المشروع يحتوي على وحدات متعددة مكتملة البناء وجاهزة للتطوير والاختبار المحلي. الأنظمة الأساسية (طلبات الأبواب، المشتريات، RFQ، ZATCA، المصادقة الإدارية) مبنية ومختبرة. توجد نقاط محددة **يجب مراجعتها قبل النشر في الإنتاج**، أبرزها: مصادقة الموزعين والشركات (mock حالياً)، وجاهزية ZATCA للإنتاج.

---

## الوحدات المنجزة

### طلبات الأبواب

- [x] إصلاح مشكلة validation في قسم المقاسات (حقل height كـ radio_cards)
- [x] إصلاح خطأ removeChild عند إرسال طلب الباب
- [x] إنشاء جدول `door_orders` في قاعدة البيانات
- [x] tRPC procedures: إنشاء، جلب، تحديث، حذف الطلبات
- [x] ربط نموذج الطلب بـ tRPC لحفظ البيانات في قاعدة البيانات
- [x] إضافة حقول بيانات العميل (الاسم، الجوال، البريد) في شاشة الملخص
- [x] بناء صفحة `AdminOrdersDB` لعرض الطلبات من قاعدة البيانات
- [x] إشعار للمدير عبر Manus Forge API عند كل طلب جديد
- [x] تحديث badge عدد الطلبات في AdminLayout ليعرض العدد الحقيقي
- [x] رسم توضيحي للباب في قسم المقاسات
- [x] نظام الفواتير مع تصدير PDF

### المشتريات والموردين

- [x] جداول قاعدة البيانات: `suppliers`, `rfqs`, `rfq_invitations`, `supplier_quotes`, `purchase_orders`, `supplier_sessions`
- [x] `suppliers.router.ts`: تسجيل، تسجيل دخول، قائمة، تحديث الحالة
- [x] `SupplierAuthContext` لإدارة جلسة المورد في الـ client
- [x] `SupplierLogin`: تسجيل الدخول والتسجيل
- [x] `SupplierDashboard`: عرض الدعوات وتقديم العروض
- [x] `SupplierQuoteForm`: نموذج تقديم عرض السعر
- [x] `AdminSuppliers`: إدارة الموردين في لوحة الإدارة
- [x] إضافة مسارات الموردين والمشتريات في `App.tsx`

### نظام RFQ (طلبات عروض الأسعار)

- [x] `rfq.router.ts`: إنشاء RFQ، إرسال الدعوات، تقديم العروض، التقييم بالذكاء الاصطناعي، الترسية
- [x] `AdminRFQ`: إنشاء وإدارة طلبات التسعير
- [x] `AdminRFQDetail`: تفاصيل RFQ مع مقارنة العروض وتقييم AI

### تعليقات RFQ

- [x] جدول `rfq_comments` في قاعدة البيانات (مع دعم التعليقات الداخلية والردود المتداخلة)
- [x] tRPC procedures للتعليقات (إضافة، جلب، حذف)
- [x] مكوّن `RFQComments` في صفحة تفاصيل RFQ (لوحة الإدارة)
- [x] تبويب التعليقات في `SupplierDashboard`
- [x] إشعار للإدارة عند تعليق جديد من المورد

### خيارات المنتجات ورفع Excel

- [x] tRPC procedure لحفظ وجلب `productOptions` من قاعدة البيانات
- [x] `NewOrderWizard` يجلب الخيارات ديناميكياً من قاعدة البيانات
- [x] مكوّن `ExcelOrderUpload` لرفع وتحليل ملفات Excel بالذكاء الاصطناعي
- [x] توليد قالب Excel ديناميكي يعكس الخيارات الحالية
- [x] تسجيل الطلبات المرفوعة من Excel في `distributor_orders`
- [x] جداول `distributor_orders` و `product_options` في قاعدة البيانات
- [x] تعديل مباشر للبنود في معاينة Excel (inline edit)
- [x] fuzzy matching بين قيم Excel والخيارات المتاحة مع badge "صُحِّح آلياً"
- [x] تحديث `parseExcel` في الخادم لاستخدام الخيارات الديناميكية من قاعدة البيانات
- [x] إضافة `vitest.config.ts` لتشغيل اختبارات الخادم

### الفواتير الضريبية ZATCA

- [x] جدول `tax_invoices` (UUID، رقم تسلسلي، بيانات البائع/المشتري، بنود، ضريبة، QR)
- [x] جدول `zatca_settings` (الرقم الضريبي، العنوان، الرقم التجاري، عداد الفواتير، CSID)
- [x] `zatca.router.ts`: إنشاء الفاتورة، حساب الضريبة 15%، تحديث العداد
- [x] توليد QR Code بتشفير TLV Base64 (6 حقول ZATCA)
- [x] بناء UBL 2.1 XML لكلا نوعَي الفاتورة (Standard B2B / Simplified B2C)
- [x] ربط سلسلة الفواتير (`previousInvoiceHash` — SHA-256)
- [x] `AdminZATCAInvoices`: نموذج إنشاء الفاتورة وإعدادات الشركة
- [x] قالب HTML للفاتورة الضريبية (ثنائي اللغة + QR)
- [x] زر "إنشاء فاتورة ضريبية ZATCA" في صفحة تفاصيل الطلب
- [x] `createInvoiceFromOrder`: تحويل تلقائي من طلب باب → فاتورة ضريبية

### الأمان والبنية التحتية

- [x] قفل CORS في بيئة الإنتاج (`ALLOWED_ORIGIN`)
- [x] `trpc.ts` موحَّد مع `adminProcedure` لحماية جميع Admin endpoints
- [x] `admin-sessions.ts`: إدارة جلسات الإدارة (TTL 8 ساعات، تخزين في DB)
- [x] `admin.router.ts`: تسجيل الدخول، الخروج، التحقق
- [x] حماية جميع procedures الإدارية في جميع الـ routers
- [x] `AdminAuthContext.tsx` + `AdminLogin.tsx` + auth guard على AdminLayout
- [x] `users.router.ts`: تسجيل دخول/تسجيل حقيقي (bcrypt + nanoid)
- [x] جدولا `users` و `user_sessions` في قاعدة البيانات
- [x] `UserAuthContext.tsx`: مصادقة حقيقية بدلاً من mock
- [x] Rate limiting: general (100/15min)، auth (20/15min)، upload (10/1min)
- [x] إعداد `env.ts` للتحقق من المتغيرات عند بدء الخادم (Zod schema)
- [x] التحقق من صحة رفع الملفات (نوع + حجم + sanitize filename)

### وحدات أخرى مكتملة البناء

> مبنية استناداً إلى وجود ملفات `*.router.ts` وصفحات `pages/admin/` المقابلة.

- [x] `inventory.router.ts` + `AdminInventory.tsx` — المخزون
- [x] `workOrders.router.ts` + `AdminWorkOrders.tsx` + `AdminJobOrderDetail.tsx` — أوامر العمل
- [x] `production.router.ts` + `AdminProductionPlanning.tsx` — الإنتاج
- [x] `qc.router.ts` + `AdminQCInspection.tsx` — فحص الجودة
- [x] `packing.router.ts` + `AdminPackingDelivery.tsx` — التعبئة والتسليم
- [x] `accounting.router.ts` + `AdminAccounting.tsx` — المحاسبة
- [x] `purchases.router.ts` + `AdminPurchases.tsx` — فواتير المشتريات
- [x] `products.router.ts` + `AdminProducts.tsx` + `AdminProductForm.tsx` — كتالوج المنتجات
- [x] `complaints.router.ts` + `AdminComplaints.tsx` — الشكاوى
- [x] `analytics.router.ts` + `AdminBIDashboard.tsx` + `AdminReports.tsx` — التحليلات
- [x] `dailySummary.router.ts` + `AdminDailySummary.tsx` — التقرير اليومي
- [x] `decisionLog.router.ts` + `AdminDecisionLog.tsx` — سجل القرارات
- [x] `postOrderReview.router.ts` + `AdminPostOrderReview.tsx` — مراجعات ما بعد التسليم
- [x] `distributors-admin.router.ts` + `AdminDistributors.tsx` + `AdminDistributorProfile.tsx` — إدارة الموزعين
- [x] `customer-portal.router.ts` + `pages/customer/` — بوابة العملاء

---

## الاختبارات الحالية

| الملف                                       | الاختبارات الموثّقة في `todo.md` |
| ------------------------------------------- | -------------------------------- |
| `orders.test.ts`                            | 18 اختبار (ذُكر في todo.md)      |
| `productOptions.test.ts` + ExcelOrderUpload | 58 اختبار (ذُكر في todo.md)      |
| `zatca.test.ts`                             | 13 اختبار (ذُكر في todo.md)      |
| `orderToInvoice.test.ts`                    | 23 اختبار (ذُكر في todo.md)      |
| مجموع موثّق في آخر إدخال بـ `todo.md`       | **116 اختبار**                   |

> **تنبيه:** رقم 116 موثَّق في `todo.md` وقت آخر تحديثه. **العدد الفعلي الحالي قد يختلف.** شغّل `pnpm test` للحصول على العدد الدقيق.

---

## نقاط تحتاج مراجعة قبل الإنتاج

### 🔴 عالية الأولوية

| النقطة              | التفاصيل                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **مصادقة الموزعين** | `DistributorAuthContext.tsx` يقبل أي email حالياً — يجب استبداله بمصادقة حقيقية مبنية على `distributors` table الموجود في قاعدة البيانات |
| **مصادقة الشركات**  | `CompanyAuthContext.tsx` نفس المشكلة — mock يقبل أي email                                                                                |
| **ZATCA Sandbox**   | يجب اختبار الفواتير على بيئة ZATCA Developer Portal وإتمام عملية Onboarding (الحصول على CSID) قبل الإنتاج                                |
| **أسرار البيئة**    | توليد `ADMIN_PASSWORD_HASH`، `ADMIN_INTERNAL_KEY` بقيم قوية وعشوائية حقيقية في الإنتاج                                                   |

### 🟡 متوسطة الأولوية

| النقطة                         | التفاصيل                                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------------------- |
| **إعداد CORS**                 | تعيين `ALLOWED_ORIGIN` في الإنتاج على نطاق الفرونتيند الفعلي                              |
| **صلاحيات كل لوحة**            | مراجعة ما يمكن لكل دور (موزع / مورد / شركة / عميل) الوصول إليه                            |
| **حماية بيانات العملاء**       | التحقق من عدم تسريب بيانات حساسة في API responses                                         |
| **اختبارات المحاسبة والضريبة** | `accounting.test.ts` موجود — تحقق من تغطيته لجميع حالات حساب الضريبة                      |
| **SSL لقاعدة البيانات**        | `db.ts` يُفعّل `rejectUnauthorized: true` في الإنتاج تلقائياً — تأكد من توافر شهادة صالحة |

### 🟢 منخفضة الأولوية

| النقطة                   | التفاصيل                                                     |
| ------------------------ | ------------------------------------------------------------ |
| **اختبارات end-to-end**  | لا توجد اختبارات E2E حالياً (Vitest يغطي الخادم فقط)         |
| **Logging وAudit Trail** | لا يوجد نظام logging منظَّم مرئي في الكود — قد يحتاج إضافة   |
| **Monitoring**           | لا يوجد إعداد monitoring (APM / error tracking)              |
| **Backup/Migration**     | لا توجد سياسة موثَّقة للنسخ الاحتياطي أو migrations strategy |

---

## TODO القادم (مقترح)

> هذه اقتراحات مبنية على تحليل ما هو غائب فعلاً في الكود الحالي.

- [ ] **تحويل مصادقة الموزعين** من mock إلى مصادقة حقيقية مبنية على جدول `distributors` (bcrypt + sessions)
- [ ] **تحويل مصادقة الشركات** من mock إلى مصادقة حقيقية
- [ ] **اختبار ZATCA مع Sandbox** وإتمام Onboarding للحصول على CSID الحقيقي
- [ ] **توحيد منطق حساب الضريبة** — التحقق من تطابق حسابات `zatca.service.ts` و `zatca.router.ts`
- [ ] **إضافة E2E tests** (Playwright أو Cypress) لتغطية flows رئيسية: طلب باب، تسجيل مورد، إنشاء فاتورة
- [ ] **تحسين Logging** — إضافة structured logging على الخادم (Winston أو Pino)
- [ ] **إضافة Audit Trail** — تسجيل من غيّر ماذا ومتى في الطلبات والفواتير
- [ ] **Monitoring & Error Tracking** — ربط Sentry أو ما يعادله
- [ ] **توثيق API** — توليد OpenAPI/Swagger من routers أو توثيق tRPC procedures
- [ ] **تحسين استراتيجية النسخ الاحتياطي** — وضع سياسة موثَّقة للـ backup والـ point-in-time recovery
- [ ] **مراجعة صلاحيات الموزعين والشركات** — تعريف دقيق لما يمكن لكل دور رؤيته وتعديله
