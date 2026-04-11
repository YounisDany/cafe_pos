# 🚀 دليل نشر مشروع CafePOS على Vercel

## ⚠️ ملاحظة مهمة قبل البدء

هذا المشروع يستخدم **SQLite** (قاعدة بيانات ملفية). Vercel بيئة **Serverless** ولا تدعم تخزين ملفات ثابتة.
لذلك ستحتاج لاستبدال SQLite بقاعدة بيانات سحابية مثل **Turso (LibSQL)**.

---

## 📋 الخطوة 1: إعداد قاعدة البيانات السحابية (Turso)

### 1. إنشاء حساب Turso
- اذهب إلى: https://turso.tech
- سجّل حساب جديد مجاني

### 2. إنشاء قاعدة بيانات
```bash
# ثبّت Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# سجّل الدخول
turso auth login

# أنشئ قاعدة بيانات
turso db create cafe-pos-db
```

### 3. نسخ رابط الاتصال
```bash
turso db show cafe-pos-db --url
# ستحصل على رابط مثل: libsql://cafe-pos-db-yourname.turso.io
```

### 4. إنشاء Auth Token
```bash
turso db tokens create cafe-pos-db
# ستحصل على توكن طويل
```

---

## 📋 الخطوة 2: ربط المشروع بـ Vercel

### الطريقة الأولى: من الموقع (الأسهل)

1. اذهب إلى: https://vercel.com
2. سجّل دخول بحساب GitHub
3. اضغط **"Add New Project"**
4. اختر مستودع **cafe** من قائمة المستودعات
5. اضغط **"Import"**

### إعدادات النشر:
| الإعداد | القيمة |
|---|---|
| **Framework Preset** | Next.js (يتعرف تلقائياً) |
| **Build Command** | `npx prisma generate && next build` |
| **Install Command** | `bun install` |

---

## 📋 الخطوة 3: إعداد متغيرات البيئة (Environment Variables)

في صفحة المشروع في Vercel، اذهب إلى:
**Settings → Environment Variables**

أضف المتغيرات التالية:

| المتغير | القيمة | الوصف |
|---|---|---|
| `DATABASE_URL` | `libsql://cafe-pos-db-xxx.turso.io?authToken=xxx` | رابط قاعدة بيانات Turso |
| `AUTH_SECRET` | `any-random-string-here-123` | سر عشوائي للتشفير |

> استبدل القيم بالبيانات الحقيقية من الخطوة 1

---

## 📋 الخطوة 4: تغيير قاعدة البيانات في المشروع

### تعديل ملف `prisma/schema.prisma`

غيّر السطر التالي:
```prisma
// من:
provider = "sqlite"

// إلى:
provider = "libsql"
```

وغيّر رابط قاعدة البيانات:
```prisma
// من:
url = env("DATABASE_URL")

// إلى:
url = env("DATABASE_URL")  // نفس الشيء لكن القيمة ستكون رابط Turso
```

### تثبيت حزمة Turso
```bash
bun add @prisma/adapter-libsql @libsql/client
```

### تعديل ملف `src/lib/db.ts`
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

### دفع التعديلات إلى GitHub
```bash
git add -A
git commit -m "Switch to Turso/LibSQL for Vercel deployment"
git push
```

---

## 📋 الخطوة 5: نشر المشروع

بعد دفع التعديلات:
1. اذهب إلى صفحة المشروع في Vercel
2. سيبدأ النشر تلقائياً ⚡
3. انتظر حتى يكتمل (دقيقة تقريباً)
4. اضغط على رابط المشروع لفتحه

---

## 📋 الخطوة 6: تهيئة قاعدة البيانات

أول مرة يشتغل المشروع، تحتاج إنشاء الجداول:

### من جهازك المحلي:
```bash
# حدّث رابط قاعدة البيانات
export DATABASE_URL="libsql://cafe-pos-db-xxx.turso.io?authToken=xxx"

# ادفع الـ Schema
bunx prisma db push

# أنشئ المستخدم الأول (مالك)
# يمكنك عمل ذلك من لوحة التحكم بعد فتح الموقع
```

### إنشاء حساب المالك الأول:
المشروع لا يملك مستخدم افتراضي. بعد فتح الموقع:
1. ستحتاج إنشاء مستخدم مالك يدوياً عبر قاعدة البيانات
2. أو إضافة صفحة تسجيل أولية (تطلب من العميل)

---

## 🔄 بديل أسهل: النشر على VPS (خادم افتراضي)

إذا كنت تريد تجنب تعقيدات قاعدة البيانات السحابية، النشر على VPS أسهل:

### متطلبات:
- خادم VPS (Ubuntu) مع **Node.js 18+** و **Bun**
- نطاق (Domain) اختياري

### الخطوات:
```bash
# 1. انسخ المشروع للخادم
git clone https://github.com/YounisDany/cafe.git
cd cafe

# 2. ثبّت التبعيات
bun install

# 3. أعد قاعدة البيانات
bun run db:push

# 4. شغّل المشروع
bun run dev

# أو للإنتاج:
bun run build
bun run start
```

### تشغيل في الخلفية مع PM2:
```bash
npm install -g pm2
pm2 start "bun run start" --name cafe-pos
pm2 save
pm2 startup
```

---

## 🆘 دعم واستفسارات

- **مشاكل النشر؟** تأكد من صحة `DATABASE_URL` ومتغيرات البيئة
- **أخطاء البناء؟** تأكد من إصدارات Node.js و Bun متوافقة
- **قاعدة البيانات لا تعمل؟** تحقق من صلاحيات التوكن
