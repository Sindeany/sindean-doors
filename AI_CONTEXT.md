# AI Context — Sindian Doors

> هذا الملف موجَّه لأدوات الذكاء الاصطناعي العاملة على هذا المشروع (GitHub Copilot، Cursor، Claude Code، Cline وما شابهها).
> هدفه: توفير سياق هندسي دقيق وقواعد عمل واضحة تمنع التعديلات العشوائية أو تجاوز القواعد الحساسة.
> **اقرأ هذا الملف بالكامل قبل أي تعديل.**
>
> للتفاصيل الكاملة: راجع [README.md](README.md) و[PROJECT_STATUS.md](PROJECT_STATUS.md).
> المصادر المستخدمة في بناء هذا الملف: §12.

---

## 1. قواعد التطوير للوكلاء (اقرأ هذا أولاً)

هذه قواعد صارمة يجب على كل وكيل الالتزام بها قبل أي تعديل:

### القواعد العامة

- **اقرأ هذا الملف + README.md + PROJECT_STATUS.md** قبل أي تعديل.
- **لا تتجاوز نطاق المهمة.** لا refactor واسع، ولا إعادة هيكلة، ولا "تحسينات" لم يُطلب بها صراحةً.
- **استخدم الأنماط الموجودة** في المشروع بدل إنشاء patterns جديدة (انظر §4 للمصادقة، §6 لقواعد العمل).
- **لا تضع أسرار أو API keys أو كلمات مرور في الكود.** لا تعدّل ملفات `.env` إطلاقاً.
- **لا تعدّل `package.json`** إلا بإذن صريح من المستخدم.

### قواعد الأمان

- **الحماية الأمنية الحقيقية تكون دائماً على الخادم (server-side).** أي تحقق صلاحيات في الواجهة (client) وحدها لا يُعدّ حماية.
- **لا تتجاوز `adminProcedure`** في أي endpoint إداري. لا تضف endpoint إدارياً بدون تحقق صلاحيات عبر `adminProcedure`.
- **لا تستخدم mock auth في الإنتاج** — راجع §2 و§4 لتفاصيل الأنظمة الحالية.

### قواعد ZATCA والمحاسبة

- **لا تعدّل منطق ZATCA أو QR أو XML أو الضريبة أو الإجماليات** بدون اختبارات واضحة.
- **لا تكرّر منطق حساب الضريبة داخل الواجهات** — المنطق المعتمد في `server/zatca.service.ts`.
- **أي تغيير مالي أو محاسبي يجب أن يكون له اختبار.** أي تغيير في الصلاحيات يجب أن يذكر أثره الأمني.

### قواعد قاعدة البيانات

- **لا تعدّل `drizzle/schema.ts`** بدون توضيح أثر التغيير وخطة migration.
- **لا تشغّل `pnpm db:push` أو أي migration** بدون إذن صريح من المستخدم.

### سير عمل التعديل البرمجي

- عند تنفيذ أي تعديل برمجي (إذا طُلب)، شغّل `pnpm check` و`pnpm test` بعده.
- حافظ على TypeScript بدون أخطاء (0 errors) — الأمر: `pnpm check`.

---

## 2. المخاطر المعروفة (Known Risks)

### 🔴 عالية الأولوية — تمنع النشر في الإنتاج

| المخاطرة                    | التفاصيل                                                                                        | الملف                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Mock auth — الموزعون**    | `DistributorAuthContext.tsx` يقبل أي email يحتوي "@" بأي كلمة مرور. لا يوجد أي تحقق على الخادم. | `client/src/contexts/DistributorAuthContext.tsx` |
| **Mock auth — الشركات**     | `CompanyAuthContext.tsx` نفس المشكلة تماماً.                                                    | `client/src/contexts/CompanyAuthContext.tsx`     |
| **ZATCA غير جاهزة للإنتاج** | يتطلب Onboarding رسمي في بوابة Fatoorah والحصول على CSID والتحقق عبر Sandbox.                   | `server/zatca.service.ts`                        |
| **أسرار البيئة**            | يجب توليد `ADMIN_PASSWORD_HASH` وأسرار قوية وعشوائية في الإنتاج.                                | `env-template.txt`                               |

### 🟡 تستحق المراجعة

| المخاطرة                                      | التفاصيل                                                                                                                                                                                                                                                       | الملف                                            |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **localStorage للـ tokens (User & Supplier)** | Token العميل (`sindian_user_token`) وtoken المورد (`supplier_auth`) مخزَّنان في `localStorage`، وهو قابل للقراءة بـ JavaScript وعرضة لهجمات XSS — بخلاف Admin الذي يستخدم httpOnly cookie. هذه ملاحظة أمنية تستحق المراجعة، وليست ثغرة مؤكدة في السياق الحالي. | `UserAuthContext.tsx`، `SupplierAuthContext.tsx` |
| **صلاحيات لوحات الموزعين والشركات**           | الصلاحيات client-side فقط حالياً — راجع §4.                                                                                                                                                                                                                    | `contexts/`                                      |
| **إعداد CORS**                                | يجب تعيين `ALLOWED_ORIGIN` في الإنتاج.                                                                                                                                                                                                                         | `server/index.ts`                                |
| **لا توجد اختبارات E2E**                      | Vitest يغطي الخادم فقط.                                                                                                                                                                                                                                        | `vitest.config.ts`                               |
| **صفحة `AdminInvoices`**                      | مستوردة في `App.tsx` لكن غير موثَّقة في README أو PROJECT_STATUS، ولم يُقرأ محتواها. قد تكون تكراراً أو بديلاً لـ `AdminZATCAInvoices`.                                                                                                                        | `client/src/App.tsx`                             |

### 🟢 منخفضة (للتخطيط المستقبلي)

- لا يوجد Logging منظَّم أو Audit Trail مرئيَّان في الكود.
- لا يوجد Monitoring أو Error Tracking.
- لا توجد سياسة موثَّقة للنسخ الاحتياطي.

---

## 3. سير العمل الآمن للوكلاء

```
1. اقرأ التوثيق ← هذا الملف + README.md + PROJECT_STATUS.md
2. افهم نطاق المهمة بدقة
3. اعرض خطة على المستخدم وانتظر الموافقة (خاصةً للكود الحساس)
4. عدّل ملفات محددة فقط ضمن النطاق المعتمد
5. لا تلمس الكود الحساس (auth، ZATCA، schema، الفواتير) بدون إذن صريح
6. شغّل الفحوصات: pnpm check، pnpm test
7. لخّص ما تغيّر واذكر الملفات المعدّلة بوضوح
```

---

## 4. المصادقة والصلاحيات (تفصيلي)

> المصادر: `server/index.ts`، `server/trpc.ts`، `server/admin-sessions.ts`، `client/src/contexts/`.

### Admin (المدير)

| العنصر               | القيمة                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **التحقق من الهوية** | bcrypt — `ADMIN_PASSWORD_HASH` أو `ADMIN_INTERNAL_KEY` (من `server/env.ts`)                                        |
| **تخزين الجلسة**     | جدول `admin_sessions` في قاعدة البيانات                                                                            |
| **مدة الجلسة**       | 8 ساعات (TTL = 8h — `server/admin-sessions.ts`)                                                                    |
| **نقل الـ token**    | httpOnly cookie باسم `adminSession` (الطريقة المفضّلة)، أو header `x-admin-token` (backward compat)                |
| **تحقق في الخادم**   | `adminProcedure` في `server/trpc.ts` — تستدعي `validateAdminSession(ctx.adminToken)` وتُرجع `UNAUTHORIZED` إن فشلت |
| **Context**          | `AdminAuthContext.tsx` + تحقق عبر `trpc.adminAuth.verify`                                                          |

**ملاحظة أمنية:** httpOnly cookie لا يمكن الوصول إليه بـ JavaScript — هذا النمط هو الأكثر أماناً في المشروع.

---

### User (عميل التجزئة)

| العنصر                       | القيمة                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| **التحقق من الهوية**         | bcrypt — `users.router.ts`                                                                             |
| **تخزين الجلسة**             | جدول `user_sessions` في قاعدة البيانات                                                                 |
| **تخزين الـ token (client)** | `localStorage` بمفتاح `sindian_user_token`                                                             |
| **نقل الـ token**            | header `x-user-token` في كل طلب tRPC                                                                   |
| **Context**                  | `UserAuthContext.tsx` — مصادقة حقيقية عبر `trpc.users.login` / `trpc.users.register` / `trpc.users.me` |

> 🟡 **ملاحظة أمنية:** الـ token مخزَّن في `localStorage` القابل للقراءة بـ JavaScript، بخلاف Admin الذي يستخدم httpOnly cookie. تستحق المراجعة إذا كانت الحسابات تصل لبيانات حساسة.

---

### Supplier (المورد)

| العنصر                       | القيمة                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------- |
| **التحقق من الهوية**         | bcrypt — `suppliers.router.ts`                                               |
| **تخزين الجلسة**             | جدول `supplier_sessions` في قاعدة البيانات                                   |
| **تخزين الـ token (client)** | `localStorage` بمفتاح `supplier_auth` (يحفظ `{ token, supplier }`)           |
| **نقل الـ token**            | header `x-supplier-token` في كل طلب tRPC                                     |
| **Context**                  | `SupplierAuthContext.tsx` — يقرأ من localStorage عند التحميل، يُرسل عبر trpc |

> 🟡 **ملاحظة أمنية:** نفس تحفظ localStorage الوارد في User أعلاه.

---

### Distributor (الموزع) — ⚠️ MOCK

| العنصر                         | القيمة                                                                    |
| ------------------------------ | ------------------------------------------------------------------------- |
| **آلية المصادقة**              | **client-side mock فقط** — يقبل أي email يحتوي `@` مع أي كلمة مرور        |
| **لا يوجد أي تحقق على الخادم** | لا endpoint، لا جلسة في DB، لا token                                      |
| **الحالة**                     | **غير مناسب للإنتاج** — يجب استبداله بمصادقة حقيقية على نمط Supplier auth |
| **الملف**                      | `client/src/contexts/DistributorAuthContext.tsx`                          |
| **البنية الجاهزة**             | جدول `distributors` موجود في `drizzle/schema.ts` ويمكن بناء auth عليه     |

---

### Company (الشركة B2B) — ⚠️ MOCK

| العنصر                         | القيمة                                                             |
| ------------------------------ | ------------------------------------------------------------------ |
| **آلية المصادقة**              | **client-side mock فقط** — يقبل أي email يحتوي `@` مع أي كلمة مرور |
| **لا يوجد أي تحقق على الخادم** | لا endpoint، لا جلسة في DB، لا token                               |
| **الحالة**                     | **غير مناسب للإنتاج** — يجب استبداله بمصادقة حقيقية                |
| **الملف**                      | `client/src/contexts/CompanyAuthContext.tsx`                       |

---

### adminProcedure — آلية حماية المسارات

```typescript
// server/trpc.ts
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.adminToken || !(await validateAdminSession(ctx.adminToken))) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "غير مصرح: يرجى تسجيل الدخول كمدير",
    });
  }
  return next({ ctx });
});
```

- كل procedure إدارية **يجب** أن تستخدم `adminProcedure` وليس `publicProcedure`.
- `ctx.adminToken` يُقرأ من cookie `adminSession` أولاً، ثم من header `x-admin-token` (backward compat) — انظر `server/index.ts`.

---

## 5. قواعد ZATCA والفواتير الضريبية

> المصدر: `server/zatca.service.ts`، `drizzle/schema.ts`، `README.md`.

### ما هو مُنفَّذ (مستخلَص من الكود)

- **QR Code:** تشفير TLV Base64 — 5 حقول إلزامية (اسم البائع، رقم VAT، التاريخ، الإجمالي، الضريبة) + حقل 6 اختياري (invoice hash).
- **UBL 2.1 XML:** مبني بـ `buildUblXml()` في `zatca.service.ts` — يدعم Standard (B2B) وSimplified (B2C).
- **ربط سلسلة الفواتير:** `previousInvoiceHash` (SHA-256) مخزَّن لكل فاتورة.
- **التحويل التلقائي:** عند تحديث حالة الطلب إلى `confirmed`، تُستدعى `createInvoiceFromOrder()` بشكل fire-and-forget (الفشل لا يوقف تحديث الطلب).
- **عداد الفواتير:** مخزَّن في جدول `zatca_settings` (`invoiceCounter`) — يُزاد بمقدار 1 لكل فاتورة جديدة.
- **التخزين بالهللة:** كل الإجماليات مخزَّنة كـ integers بالهللة لتجنب أخطاء الفاصلة العشرية.

### قيود مهمة

> ⚠️ **النظام غير مؤكد الجاهزية للإنتاج** قبل:
>
> 1. إتمام Onboarding في بوابة Fatoorah.
> 2. الحصول على CSID (Cryptographic Stamp ID) الحقيقي.
> 3. التحقق عبر ZATCA Sandbox (Developer Portal).
>
> لا تكتب عبارة "متوافق بالكامل مع ZATCA Production" بدون تحفظ.

### قواعد التعديل

- **لا تعدّل** `buildUblXml()`، `buildZatcaQRData()`، `toHalala()`، `fromHalala()` أو منطق حساب الضريبة بدون اختبارات.
- **لا تكرّر** منطق حساب الضريبة في الواجهة — المصدر الوحيد المعتمد هو `server/zatca.service.ts`.
- **أضف اختباراً** لأي تغيير في منطق TLV أو XML أو الإجماليات.

---

## 6. قواعد العمل (Business Rules)

> ⚠️ **تنبيه:** الحالات أدناه مستخلَصة من `drizzle/schema.ts` وقت كتابة هذا الملف (يونيو 2026). **المرجع الدائم هو الكود نفسه** — قد تتغير الحالات مع تطور المشروع. لا تعتمد هذه القائمة وحدها دون التحقق من المصدر.

### دورة حياة طلب الباب (`door_orders`)

```
new → reviewing → confirmed → in_production → ready → delivered
                                                      ↘ cancelled (من أي مرحلة)
```

- **الإنشاء:** `orders.create` (public) — يُرسل إشعاراً للمالك وبريداً للعميل (إن أُعطي email).
- **تحديث الحالة:** `orders.updateStatus` (admin) — عند `confirmed`: تُستدعى `createInvoiceFromOrder()` تلقائياً (fire-and-forget).
- **الأولويات:** `normal | urgent | vip`.
- **حالة الدفع:** `unpaid | partial | paid`.
- **الـ workflow التفصيلي:** 15 مرحلة تبدأ من `po_review`، مخزَّنة في `workflowStagesData` (JSON).

### دورة طلب عرض السعر RFQ (`rfqs`)

```
draft → published → closed → evaluated → awarded → cancelled
```

- **الإنشاء والنشر:** admin فقط عبر `rfq` router.
- **الدعوات:** جدول `rfq_invitations` بحالات: `sent | viewed | accepted | declined | submitted`.
- **التقييم:** يدوي من الإدارة + AI Score تلقائي على كل عرض.

### دورة عروض الموردين (`supplier_quotes`)

```
submitted → under_review → shortlisted → awarded
                         ↘ rejected
```

- **AI Score:** حقل `aiScore` (0–100) مع تفاصيل `aiScoreBreakdown`.

### دورة أمر الشراء (`purchase_orders`)

```
issued → confirmed → in_progress → delivered → invoiced → paid
                                              ↘ cancelled
```

### دورة الفاتورة الضريبية (`tax_invoices`)

```
draft → issued → paid
               ↘ cancelled
```

- **حالة ZATCA المنفصلة:** `pending → submitted → cleared (B2B) | reported (B2C) → error`.

### حركات المخزون (`inventory_transactions`)

- **الأنواع:** `receive | consume | adjust | return | transfer`.
- كل حركة تحفظ `balanceBefore` و`balanceAfter`.

### رفع Excel

- يمر عبر `distributorOrders.create` → يُحلَّل بالـ AI → fuzzy matching مع `productOptions` من DB → يُسجَّل في `distributor_orders`.
- الخيارات المستخدمة في التحليل تُجلب من `productOptions` في DB (وليست ثوابت ثابتة).

### خيارات المنتجات (`product_options`)

- تُخزَّن كـ JSON كامل في جدول `product_options`.
- أي تعديل في `AdminProductOptions` ينعكس فوراً على `DoorOrderWizard` لأنهما يقرآن من نفس المصدر في DB.

### قواعد المحاسبة

- القيود يومية بنظام double-entry: كل قيد (`journal_entries`) له بنود (`journal_lines`) بـ debit وcredit.
- الإجماليات بالهللة (integers) لتجنب أخطاء الفاصلة العشرية — نفس نهج الفواتير.
- **لا تعدّل** منطق الحسابات المحاسبية بدون اختبارات.

---

## 7. نظرة عامة على المشروع (مختصر)

منصة تجارة إلكترونية وERP متكاملة لإدارة طلبات الأبواب الخشبية، تضم: متجراً عاماً، لوحة إدارة شاملة، وبوابات مستقلة للموزعين والموردين والشركات والعملاء، مع أنظمة RFQ ومشتريات ومخزون وإنتاج ومحاسبة وفواتير ضريبية ZATCA.

**للتفاصيل الكاملة:** راجع [README.md](README.md).

---

## 8. التقنيات الأساسية (مختصر)

**Frontend:** React 19، TypeScript 5.6.3، Vite 7، TailwindCSS 4، Radix UI، tRPC 11، TanStack Query v5، wouter.
**Backend:** Express 4، tRPC 11، Drizzle ORM، MySQL/TiDB، Zod v4، bcryptjs، Nodemailer، Vitest.

جميع التقنيات مثبّتة في `package.json`. **للجدول الكامل:** راجع [README.md — التقنيات المستخدمة](README.md).

---

## 9. هيكل المستودع (مختصر)

| المجلد     | الغرض                                                     |
| ---------- | --------------------------------------------------------- |
| `client/`  | تطبيق React الكامل (pages، components، contexts، lib)     |
| `server/`  | Express API + 24 tRPC router + zatca.service + email + db |
| `drizzle/` | `schema.ts` — تعريف 33 جدولاً (المرجع الوحيد لبنية DB)    |
| `shared/`  | ثوابت مشتركة بين client وserver                           |

**للشجرة الكاملة:** راجع [README.md — هيكل المشروع](README.md).

---

## 10. الوحدات الرئيسية، قاعدة البيانات، والـ Routers (مختصر)

> ⚠️ القوائم أدناه غير شاملة — راجع `drizzle/schema.ts` وrouters.ts مباشرة.

### الـ appRouter (من `server/routers.ts`)

```
orders · suppliers · rfq · comments · productOptions · distributorOrders
zatca · adminAuth · users · inventory · distributorsAdmin · complaints
qc · packing · workOrders · decisionLog · postOrderReview · dailySummary
accounting · purchases · products · production · analytics · customerPortal
```

**المجموع:** 24 router مُصدَّرة في `appRouter`.

### أبرز الجداول (من `drizzle/schema.ts`)

| الجدول                                                                 | الغرض                    |
| ---------------------------------------------------------------------- | ------------------------ |
| `door_orders`                                                          | طلبات الأبواب الرئيسية   |
| `suppliers` + `supplier_sessions`                                      | الموردون ومصادقتهم       |
| `rfqs` + `rfq_invitations` + `supplier_quotes` + `purchase_orders`     | دورة الشراء كاملة        |
| `tax_invoices` + `zatca_settings`                                      | الفواتير الضريبية ZATCA  |
| `users` + `user_sessions` + `admin_sessions`                           | مصادقة العملاء والإدارة  |
| `inventory_items` + `inventory_transactions`                           | المخزون                  |
| `distributors` + `distributor_orders`                                  | الموزعون وطلباتهم        |
| `complaints` + `complaint_messages`                                    | نظام الشكاوى             |
| `work_orders` + `qc_inspections` + `packing_orders`                    | الإنتاج والجودة والتعبئة |
| `accounts` + `journal_entries` + `journal_lines` + `purchase_invoices` | المحاسبة                 |
| `products`                                                             | كتالوج المنتجات          |

**المجموع الموثَّق:** 33 جدولاً — **(غير شاملة — راجع `drizzle/schema.ts` مباشرة)**.

**القوائم الكاملة:** راجع [README.md](README.md) و[PROJECT_STATUS.md](PROJECT_STATUS.md).

---

## 11. ملاحظات الاختبارات

- **إطار الاختبارات:** Vitest (مثبَّت في `package.json`، مُعدَّل في `vitest.config.ts`).
- **نطاق الاختبارات:** `server/**/*.test.ts` — بيئة `node`.
- **تشغيل الاختبارات:** `pnpm test`.
- **العدد الموثَّق:** 116 اختباراً ناجحاً وقت آخر تحديث لـ `todo.md`. **يجب التحقق من العدد الفعلي عبر `pnpm test`** لأن الرقم قد تغيَّر.

### مجالات تحتاج اختبارات إضافية

- ZATCA production flow (Sandbox + CSID).
- المحاسبة (تفاصيل `accounting.test.ts` لم تُقرأ كاملاً).
- VAT rounding — حالات الحافة في حسابات الهللة.
- Distributor auth وCompany auth (لا اختبارات حالياً لأنهما mock).
- اختبارات E2E لا توجد حالياً.
- الصلاحيات (permission matrix) لكل لوحة.

---

## 12. مصادر هذا الملف

بُني هذا الملف اعتماداً على القراءة المباشرة لـ:

| الملف                                            | المعلومات المستخلصة                                    |
| ------------------------------------------------ | ------------------------------------------------------ |
| `README.md`                                      | نظرة عامة، التقنيات، الأوامر                           |
| `PROJECT_STATUS.md`                              | الوحدات المنجزة، أعداد الاختبارات، نقاط ما قبل الإنتاج |
| `package.json`                                   | التقنيات الفعلية المثبَّتة                             |
| `drizzle/schema.ts`                              | 33 جدولاً، حالات enum، بنية البيانات                   |
| `server/routers.ts`                              | قائمة الـ routers، `appRouter`، منطق `ordersRouter`    |
| `server/trpc.ts`                                 | `adminProcedure`، Context interface                    |
| `server/index.ts`                                | إنشاء Context (cookie + headers)، Rate limiting        |
| `server/zatca.service.ts`                        | QR TLV، UBL XML، `createInvoiceFromOrder`              |
| `client/src/App.tsx`                             | قائمة الصفحات والمسارات الكاملة                        |
| `client/src/contexts/AdminAuthContext.tsx`       | آلية Admin auth                                        |
| `client/src/contexts/UserAuthContext.tsx`        | آلية User auth + localStorage                          |
| `client/src/contexts/SupplierAuthContext.tsx`    | آلية Supplier auth + localStorage                      |
| `client/src/contexts/DistributorAuthContext.tsx` | كشف Mock auth                                          |
| `client/src/contexts/CompanyAuthContext.tsx`     | كشف Mock auth                                          |
