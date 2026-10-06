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

و مقادیر را پر کنید.

### هوش مصنوعی رایگان

| سرویس | هزینه | `AI_BASE_URL` | `AI_MODEL` |
| --- | --- | --- | --- |
| **Google Gemini** (پیش‌فرض) | سهمیه‌ی روزانه‌ی رایگان | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-flash-latest` |
| OpenRouter | مدل‌های `:free` رایگان‌اند | `https://openrouter.ai/api/v1` | `google/gemma-3-27b-it:free` |
| OpenAI | پولی | `https://api.openai.com/v1` | `gpt-4o-mini` |

گرفتن کلید رایگان Gemini:
1. به [aistudio.google.com/apikey](https://aistudio.google.com/apikey) بروید و با حساب گوگل وارد شوید.
2. روی **Create API key** بزنید و کلید را کپی کنید.
3. در `.env` جلوی `AI_API_KEY` بگذارید.

> سرویس‌های گوگل و OpenRouter از ایران مستقیم در دسترس نیستند. برای ساخت کلید ممکن است به VPN نیاز باشد، و سروری که برنامه روی آن اجرا می‌شود باید خارج از ایران باشد.
> در سهمیه‌ی رایگان، گوگل ممکن است از پیام‌ها برای بهبود مدل‌هایش استفاده کند.

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
docker build -t negahdar .
docker run -d --restart always --env-file .env -p 3000:3000 negahdar
```

### دامنه و HTTPS

جلوی برنامه یک Nginx یا Caddy بگذارید. نمونه‌ی Caddy (خودش گواهی SSL می‌گیرد):

```
example.com {
    reverse_proxy localhost:3000
}
```

## ۶. انتشار روی همروش (Darkube)

[همروش](https://hamravesh.com) برنامه را از روی `Dockerfile` همین مخزن می‌سازد و اجرا می‌کند. تنظیمات Supabase هنگام اجرا خوانده می‌شوند، پس لازم نیست موقع build چیزی بدهید.

1. در کنسول همروش یک اپ از نوع **Dockerfile / گیت** بسازید و مخزن گیت‌هاب را وصل کنید:
   - شاخه: `main`
   - مسیر Dockerfile: `./Dockerfile`
   - build context: `.`
2. **پورت سرویس** را `3000` بگذارید.
3. در بخش **متغیرهای محیطی** این‌ها را وارد کنید:

   | متغیر | مقدار |
   | --- | --- |
   | `SUPABASE_URL` | آدرس پروژهٔ Supabase |
   | `SUPABASE_PUBLISHABLE_KEY` | کلید anon/publishable |
   | `AI_API_KEY` | کلید سرویس هوش مصنوعی |
   | `AI_BASE_URL` | `https://api.avalai.ir/v1` |
   | `AI_MODEL` | `gemini-2.5-flash` |

4. دامنه را در بخش دامنه‌ها وصل کنید و همان آدرس را در Supabase در **Authentication > URL Configuration** هم وارد کنید.

نکته‌های سرور داخل ایران:
- **هوش مصنوعی:** گوگل (Gemini) و OpenRouter درخواست‌های سرورهای ایران را رد می‌کنند. از سرویس ایرانی سازگار با OpenAI مثل [AvalAI](https://avalai.ir) استفاده کنید (مقادیر جدول بالا).
- **Docker Hub:** اگر build در دریافت `node:22-alpine` خطا داد، آینهٔ رجیستری همروش را با build arg بدهید: `NODE_IMAGE=<آدرس آینه>/library/node:22-alpine`.
- **Supabase:** کاربران مستقیماً از مرورگر به Supabase وصل می‌شوند؛ بعد از راه‌اندازی، ورود و ثبت‌نام را از اینترنت ایران امتحان کنید.

## ۷. انتشار روی سرویس‌های دیگر

خروجی به‌صورت پیش‌فرض برای Node ساخته می‌شود. برای سرویس‌های دیگر هنگام build متغیر `NITRO_PRESET` را بدهید:

```sh
NITRO_PRESET=vercel npm run build            # Vercel
NITRO_PRESET=netlify npm run build           # Netlify
NITRO_PRESET=cloudflare-module npm run build # Cloudflare Workers
```

## نکته امنیتی

`SUPABASE_SERVICE_ROLE_KEY` و `AI_API_KEY` کلیدهای محرمانه‌اند؛ آن‌ها را فقط در `.env` روی سرور بگذارید و در گیت‌هاب commit نکنید.
