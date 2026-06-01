# دليل التطوير المحلي — سنديان للأبواب الخشبية

## المتطلبات الأساسية

قبل البدء، تأكد من تثبيت البرامج التالية على جهازك:

| البرنامج | الإصدار المطلوب | رابط التحميل |
|---------|----------------|-------------|
| Node.js | 18 أو أحدث | https://nodejs.org |
| pnpm | 8 أو أحدث | `npm install -g pnpm` |
| VS Code | أحدث إصدار | https://code.visualstudio.com |
| MySQL | 8.0+ أو TiDB | https://dev.mysql.com/downloads/ |

---

## خطوات الإعداد

### 1. فتح المشروع في VS Code

```bash
# فك ضغط الملف المحمّل
# ثم افتح المجلد في VS Code
code sindian-doors
```

### 2. تثبيت الاعتماديات

```bash
pnpm install
```

### 3. إعداد متغيرات البيئة

انسخ ملف `.env.example` إلى `.env`:

```bash
cp .env.example .env
```

ثم افتح `.env` وعدّل القيم كما يلي:

```env
# ── قاعدة البيانات (MySQL / TiDB) ──────────────────────────────────────────
DATABASE_URL=mysql://root:password@localhost:3306/sindian_doors

# ── مصادقة JWT ──────────────────────────────────────────────────────────────
JWT_SECRET=your-super-secret-key-change-this-in-production

# ── Manus OAuth (اختياري للتطوير المحلي) ──────────────────────────────────
VITE_APP_ID=your-manus-app-id
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im
OAUTH_SERVER_URL=https://oauth.manus.im

# ── Manus Forge API (للذكاء الاصطناعي والإشعارات) ─────────────────────────
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your-forge-api-key
VITE_FRONTEND_FORGE_API_KEY=your-frontend-forge-key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im

# ── معلومات المالك ──────────────────────────────────────────────────────────
OWNER_OPEN_ID=your-open-id
OWNER_NAME=your-name

# ── مفتاح داخلي للـ Admin ──────────────────────────────────────────────────
ADMIN_INTERNAL_KEY=change-this-secret-key
```

> **ملاحظة:** للتطوير المحلي يمكنك تشغيل المشروع بدون ميزات OAuth والذكاء الاصطناعي، لكن ستحتاج `DATABASE_URL` و `JWT_SECRET` على الأقل.

### 4. إعداد قاعدة البيانات

```bash
# إنشاء قاعدة البيانات في MySQL
mysql -u root -p -e "CREATE DATABASE sindian_doors CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# تطبيق مخطط قاعدة البيانات
pnpm db:push
```

### 5. تشغيل المشروع

```bash
# تشغيل الـ server والـ client معاً (الطريقة الموصى بها)
pnpm dev
```

سيعمل المشروع على:
- **الواجهة الأمامية:** http://localhost:5173
- **الـ Server:** http://localhost:3001

---

## إضافات VS Code الموصى بها

ثبّت هذه الإضافات للحصول على أفضل تجربة تطوير:

```
# لغة TypeScript والـ React
ms-vscode.vscode-typescript-next
bradlc.vscode-tailwindcss
dsznajder.es7-react-js-snippets

# جودة الكود
dbaeumer.vscode-eslint
esbenp.prettier-vscode

# قواعد البيانات
cweijan.vscode-mysql-client2

# Git
eamodio.gitlens
```

أو ثبّتها دفعة واحدة:

```bash
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension bradlc.vscode-tailwindcss
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension cweijan.vscode-mysql-client2
code --install-extension eamodio.gitlens
```

---

## هيكل المشروع

```
sindian-doors/
├── client/                    ← الواجهة الأمامية (React + Vite)
│   └── src/
│       ├── pages/             ← صفحات التطبيق
│       │   ├── admin/         ← لوحة تحكم الإدارة
│       │   └── distributor/   ← بوابة الموزعين
│       ├── components/        ← مكوّنات قابلة للإعادة
│       └── stores/            ← حالة التطبيق (Zustand)
├── server/                    ← الـ Backend (Express + tRPC)
│   ├── routers.ts             ← نقاط النهاية الرئيسية
│   ├── zatca.router.ts        ← نظام الفواتير الضريبية
│   ├── productOptions.router.ts ← إدارة خيارات المنتجات
│   └── db.ts                  ← مساعدات قاعدة البيانات
├── drizzle/
│   └── schema.ts              ← مخطط قاعدة البيانات
├── shared/                    ← أنواع TypeScript المشتركة
└── .env.example               ← نموذج متغيرات البيئة
```

---

## أوامر التطوير المفيدة

```bash
# تشغيل المشروع كاملاً
pnpm dev

# تشغيل الـ server فقط
pnpm dev:server

# تشغيل الـ client فقط
pnpm dev:client

# تطبيق تغييرات قاعدة البيانات
pnpm db:push

# فتح واجهة Drizzle Studio لإدارة قاعدة البيانات
pnpm db:studio

# تشغيل الاختبارات
pnpm test

# فحص أخطاء TypeScript
pnpm check

# بناء المشروع للإنتاج
pnpm build
```

---

## ملاحظات مهمة

1. **قاعدة البيانات:** المشروع يستخدم MySQL (أو TiDB). تأكد من تشغيل خدمة MySQL قبل تشغيل المشروع.

2. **الذكاء الاصطناعي:** ميزات الـ AI (تحليل Excel، الدردشة) تتطلب `BUILT_IN_FORGE_API_KEY` صالح من منصة Manus.

3. **الفواتير الضريبية:** نظام ZATCA يعمل محلياً بالكامل. QR Code يُولَّد بتشفير TLV بدون الحاجة لاتصال خارجي.

4. **المصادقة:** نظام تسجيل الدخول يعتمد على Manus OAuth. للتطوير المحلي يمكن تجاوزه بتعديل `server/routers.ts`.

---

## حل المشكلات الشائعة

**خطأ: `Cannot connect to database`**
```bash
# تأكد من تشغيل MySQL
sudo service mysql start  # Linux
# أو ابدأ MySQL من لوحة التحكم على Windows/Mac
```

**خطأ: `Port 3001 already in use`**
```bash
# أوقف العملية التي تستخدم المنفذ
npx kill-port 3001
```

**خطأ: `pnpm: command not found`**
```bash
npm install -g pnpm
```
