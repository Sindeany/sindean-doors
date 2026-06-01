# Project TODO

- [x] إصلاح مشكلة validation في قسم المقاسات (حقل height كـ radio_cards فارغ)
- [x] إصلاح خطأ removeChild عند إرسال طلب الباب
- [x] إنشاء جدول door_orders في قاعدة البيانات
- [x] إنشاء tRPC procedures لإنشاء وجلب وتحديث وحذف الطلبات
- [x] ربط نموذج الطلب بـ tRPC لحفظ البيانات في قاعدة البيانات
- [x] إضافة حقول بيانات العميل (الاسم، الجوال، البريد) في شاشة الملخص
- [x] بناء صفحة AdminOrdersDB لعرض الطلبات من قاعدة البيانات
- [x] إضافة إشعار للمدير عند كل طلب جديد
- [x] تحديث badge عدد الطلبات في AdminLayout ليعرض العدد الحقيقي من قاعدة البيانات
- [x] كتابة اختبارات Vitest لـ orders router (18 اختبار)
- [x] إضافة رسم توضيحي للباب في قسم المقاسات
- [x] نظام الفواتير مع تصدير PDF

## نظام إدارة المشتريات والموردين

- [x] تصميم قاعدة البيانات: جداول suppliers, rfqs, rfq_invitations, supplier_quotes, purchase_orders, supplier_sessions
- [x] بناء suppliers.router.ts: تسجيل المورد، تسجيل الدخول، قائمة الموردين، تحديث الحالة
- [x] بناء rfq.router.ts: إنشاء RFQ، إرسال الدعوات، تقديم العروض، التقييم بالذكاء الاصطناعي، الترسية
- [x] بناء SupplierAuthContext للإدارة المحلية لجلسة المورد
- [x] بناء SupplierLogin: صفحة تسجيل الدخول والتسجيل للموردين
- [x] بناء SupplierDashboard: لوحة تحكم المورد مع عرض الدعوات وتقديم العروض
- [x] بناء SupplierQuoteForm: نموذج تقديم عرض السعر
- [x] بناء AdminSuppliers: إدارة الموردين في لوحة الإدارة
- [x] بناء AdminRFQ: إنشاء وإدارة طلبات التسعير
- [x] بناء AdminRFQDetail: تفاصيل RFQ مع مقارنة العروض وتقييم AI
- [x] إضافة قائمة الموردين وطلبات التسعير في AdminLayout
- [x] إضافة مسارات الموردين والمشتريات في App.tsx
- [x] إصلاح جميع أخطاء TypeScript (0 أخطاء)

## نظام التعليقات في طلبات التسعير

- [x] إنشاء جدول rfq_comments في قاعدة البيانات
- [x] إضافة tRPC procedures للتعليقات (إضافة، جلب، حذف)
- [x] بناء مكوّن RFQComments في صفحة تفاصيل RFQ (لوحة الإدارة)
- [x] إضافة تبويب التعليقات في SupplierDashboard (لوحة المورد)
- [x] إشعار للإدارة عند تعليق جديد من المورد

## ربط خيارات المنتج في NewOrderWizard ورفع Excel

- [x] إضافة tRPC procedure لحفظ وجلب productOptions من قاعدة البيانات
- [x] تحديث NewOrderWizard لجلب الخيارات ديناميكياً من قاعدة البيانات (نفس خيارات صفحة المنتج)
- [x] بناء مكوّن ExcelOrderUpload لرفع وتحليل ملفات Excel بالذكاء الاصطناعي
- [x] توليد قالب Excel ديناميكي يعكس الخيارات الحالية
- [x] تسجيل الطلبات المرفوعة من Excel في قاعدة البيانات عبر distributorOrders.create
- [x] إضافة جدول distributor_orders وproduct_options في قاعدة البيانات
- [x] ربط handleSubmit بـ tRPC حقيقي (distributorOrders.create)
- [x] إضافة زر رفع Excel في Step 0 من المعالج
- [x] كتابة 58 اختبار Vitest (ناجحة 100%)

## التعديل المباشر للبنود في معاينة Excel

- [x] إضافة زر تعديل في كل بند في ItemPreviewCard
- [x] بناء نموذج تعديل مضمّن (inline edit form) بحقول: نوع الباب، المادة، اللون، العرض، الارتفاع، السماكة، الكمية، السعر، الملاحظات
- [x] إعادة التحقق من صحة البند بعد التعديل وتحديث حالة valid/error
- [x] تحديث الإجمالي ديناميكياً عند تعديل الأسعار أو الكميات
- [x] إضافة زر "إضافة بند جديد" يدوياً في قائمة المعاينة

## ربط خيارات المنتج الديناميكية في NewOrderWizard

- [x] جلب جميع أقسام productOptions (door_type, wood_type, door_color, dimensions) من قاعدة البيانات
- [x] استبدال الثوابت الثابتة (DOOR_TYPES, WOOD_TYPES, COLORS, DIMENSIONS) بالبيانات الديناميكية
- [x] ربط قسم المقاسات (dimensions) بالخيارات المحفوظة في productOptionsStore
- [x] التأكد من أن أي تعديل في AdminProductOptions ينعكس فوراً على NewOrderWizard

## تحديث رفع Excel للخيارات الديناميكية

- [x] تحديث parseExcel في server لجلب الخيارات من قاعدة البيانات وتمريرها للـ AI
- [x] تحديث generateTemplate لتضمين الخيارات الديناميكية في قائمة التحقق
- [x] تحديث ExcelOrderUpload لاستهلاك availableOptions الحقيقية المُعادة من الـ server وعرضها في نماذج التعديل
- [x] إضافة مطابقة ذكية بين قيم Excel والخيارات المتاحة (fuzzy matching)
- [x] إضافة badge "صُحِّح آلياً" في ItemPreviewCard عند matchInfo
- [x] إضافة عداد "صُحِّح آلياً" في Summary bar
- [x] استبدال Input بـ select ديناميكي للمادة واللون في نماذج التعديل والإضافة
- [x] إرجاع availableOptions من parseExcel للواجهة
- [x] إضافة vitest.config.ts لتشغيل اختبارات الـ server

## نظام الفواتير الضريبية ZATCA المرحلة الثانية

- [x] إضافة جدول tax_invoices في قاعدة البيانات (UUID، رقم تسلسلي، بيانات البائع/المشتري، بنود، ضريبة، QR)
- [x] إضافة جدول zatca_settings لإعدادات الشركة (الرقم الضريبي، العنوان، الرقم التجاري)
- [x] بناء zatca.router.ts لإنشاء الفاتورة وحساب الضريبة 15% وتحديث عداد الفواتير
- [x] توليد QR Code بتشفير TLV (6 حقول ZATCA: البائع، رقم ضريبي، طابع زمني، إجمالي، ضريبة، hash)
- [x] بناء صفحة AdminZATCAInvoices مع نموذج إنشاء فاتورة ضريبية وإعدادات الشركة
- [x] تصميم قالب HTML للفاتورة الضريبية المتوافق مع ZATCA (ثنائي اللغة، QR، ختم ضريبي)
- [x] إضافة مسار /admin/zatca-invoices في App.tsx وبند في AdminLayout
- [x] 13 اختبار Vitest ناجح لتشفير TLV وحسابات الضريبة وأرقام الفواتير

## زر إنشاء الفاتورة من تفاصيل الطلب

- [x] قراءة بنية AdminOrdersDB وفهم بيانات الطلب المتاحة
- [x] إضافة زر "إنشاء فاتورة ضريبية ZATCA" في صفحة تفاصيل الطلب
- [x] بناء CreateInvoiceFromOrderModal مع تعبئة تلقائية للاسم والجوال والبريد والسعر ووصف البند
- [x] استخدام trpc.zatca.create مباشرة مع sourceType="door_order" وsourceId=order.id
- [x] 23 اختبار Vitest ناجح لمنطق تحويل الطلب إلى فاتورة

## إصلاحات الأمان والبنية التحتية

- [x] قفل CORS في بيئة الإنتاج (يستخدم ALLOWED_ORIGIN)
- [x] إنشاء ملف trpc.ts موحّد مع adminProcedure لحماية الـ Admin endpoints
- [x] إنشاء admin-sessions.ts لإدارة جلسات الإدارة (TTL 8 ساعات)
- [x] إنشاء admin.router.ts لتسجيل الدخول والخروج والتحقق
- [x] حماية جميع procedures الإدارية في: routers.ts, suppliers.router.ts, comments.router.ts, zatca.router.ts, productOptions.router.ts
- [x] تحديث جميع الـ routers لاستخدام shared tRPC (إزالة initTRPC.create المتعددة)
- [x] إنشاء AdminAuthContext.tsx لإدارة جلسة الإدارة في الـ client
- [x] إنشاء AdminLogin.tsx صفحة تسجيل دخول الإدارة
- [x] حماية AdminLayout بـ auth guard
- [x] إنشاء users.router.ts مع تسجيل الدخول/التسجيل الحقيقي (bcrypt + nanoid)
- [x] إضافة جدولي users و user_sessions في قاعدة البيانات
- [x] تحديث UserAuthContext.tsx لاستخدام مصادقة حقيقية بدلاً من Mock
- [x] تحديث trpc.ts في الـ client لإرسال auth tokens في الـ headers
- [x] توليد أسرار عشوائية قوية لـ JWT_SECRET و ADMIN_INTERNAL_KEY
- [x] 116 اختبار Vitest ناجح (0 أخطاء TypeScript)
