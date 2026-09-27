# راهنمای اجرا و نصب روی سرور

این پروژه دیگر به Lovable وابسته نیست و روی هر سروری که Node.js 22 داشته باشد اجرا می‌شود.

## ۱. پیش‌نیازها

| مورد | توضیح |
| --- | --- |
| Node.js 22 | روی سرور یا کامپیوتر خودتان |
| یک پروژه Supabase | دیتابیس و ورود کاربران — رایگان در [supabase.com](https://supabase.com) |
| کلید API هوش مصنوعی | OpenAI، OpenRouter، Gemini یا هر سرویس سازگار با OpenAI |

## ۲. راه‌اندازی دیتابیس (Supabase)

اگر Supabase فعلی را Lovable Cloud ساخته، باید یک پروژه‌ی Supabase برای خودتان بسازید:

1. در supabase.com یک پروژه‌ی جدید بسازید.
2. در بخش **SQL Editor** محتوای فایل‌های پوشه‌ی `supabase/migrations` را **به ترتیب نام** اجرا کنید. جدول‌ها، دسترسی‌ها و… ساخته می‌شوند.
   (یا با Supabase CLI: `supabase link --project-ref <ID>` و سپس `supabase db push`)
3. در **Authentication > URL Configuration** آدرس سایت خودتان (مثلاً `https://example.com`) را وارد کنید.
4. از **Project Settings > API** مقادیر URL، کلید anon/publishable و service_role را بردارید.

> داده‌های فعلی (کاربران و گیاهان ثبت‌شده) خودکار منتقل نمی‌شوند. اگر لازم است، از Lovable Cloud خروجی بگیرید و در پروژه‌ی جدید وارد کنید.

## ۳. تنظیم متغیرها

```sh
cp .env.example .env
```

و مقادیر را پر کنید. نمونه برای سرویس‌های مختلف هوش مصنوعی:

| سرویس | `AI_BASE_URL` | نمونه `AI_MODEL` |
| --- | --- | --- |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| OpenRouter | `https://openrouter.ai/api/v1` | `google/gemini-2.5-flash` |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-2.5-flash` |

## ۴. اجرای محلی

```sh
npm install
npm run dev      # http://localhost:8080
```

## ۵. نصب روی سرور (VPS)

### روش الف: مستقیم با Node

```sh
git clone https://github.com/Zahrabehnambakhsh/negahdar-bartar.git
cd negahdar-bartar
cp .env.example .env   # و پر کردن مقادیر
npm ci
npm run build
npm start              # روی پورت PORT (پیش‌فرض 3000)
```

برای اینکه همیشه روشن بماند از pm2 استفاده کنید:

```sh
npm i -g pm2
pm2 start .output/server/index.mjs --name negahdar --node-args="--env-file=.env"
pm2 save && pm2 startup
```

### روش ب: با Docker

```sh
docker build \
  --build-arg VITE_SUPABASE_URL="https://YOUR-PROJECT.supabase.co" \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="..." \
  -t negahdar .
docker run -d --restart always --env-file .env -p 3000:3000 negahdar
```

### دامنه و HTTPS

جلوی برنامه یک Nginx یا Caddy بگذارید. نمونه‌ی Caddy (خودش گواهی SSL می‌گیرد):

```
example.com {
    reverse_proxy localhost:3000
}
```

## ۶. انتشار روی سرویس‌های دیگر

خروجی به‌صورت پیش‌فرض برای Node ساخته می‌شود. برای سرویس‌های دیگر هنگام build متغیر `NITRO_PRESET` را بدهید:

```sh
NITRO_PRESET=vercel npm run build            # Vercel
NITRO_PRESET=netlify npm run build           # Netlify
NITRO_PRESET=cloudflare-module npm run build # Cloudflare Workers
```

## نکته امنیتی

`SUPABASE_SERVICE_ROLE_KEY` و `AI_API_KEY` کلیدهای محرمانه‌اند؛ آن‌ها را فقط در `.env` روی سرور بگذارید و در گیت‌هاب commit نکنید.
