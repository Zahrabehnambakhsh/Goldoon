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

### حالت دعوتی (فعلاً)

تا وقتی `SIGNUP_OPEN` روی `true` نباشد، صفحهٔ ورود فقط «ایمیل و رمز» و «فراموشی رمز» را نشان می‌دهد و فقط کاربرانی که برایشان حساب ساخته شده وارد می‌شوند.

1. **بستن ثبت‌نام در خود Supabase (مهم):** در **Authentication > Sign In / Providers** گزینهٔ **Allow new users to sign up** را خاموش کنید. مخفی بودن دکمه‌ها کافی نیست؛ این تنظیم جلوی ساخت حساب از هر راهی را می‌گیرد.
2. **ساختن حساب‌ها**:
   - حساب‌های دعوت‌شدهٔ فعلی در مایگریشن `20261006130000_invited_users.sql` تعریف شده‌اند (رمزها فقط به‌صورت هش). با اجرای مایگریشن‌ها خودکار و تأییدشده ساخته می‌شوند. هر کس بعد از اولین ورود از **پروفایل > اطلاعات حساب > تغییر رمز عبور** رمزش را عوض کند.
   - برای اضافه کردن کاربر دیگر، یکی از دو راه زیر:
   - چند کاربر: در **Authentication > Users > Add user > Create new user** ایمیل و رمز را بدهید و **Auto Confirm User** را بزنید.
   - تعداد زیاد: یک فایل `users.csv` (هر خط `email,password,name`) بسازید، `SUPABASE_SERVICE_ROLE_KEY` را در `.env` بگذارید و اجرا کنید:
     ```sh
     npm run create-users -- users.csv
     ```
     فایل CSV رمزها را دارد و در گیت ثبت نمی‌شود؛ بعد از استفاده پاکش کنید.
3. **باز کردن ثبت‌نام بعداً:** در Supabase دوباره Allow new users to sign up را روشن کنید و روی سرور `SIGNUP_OPEN=true` بگذارید. با این کار هر کس می‌تواند با ایمیل ثبت‌نام کند. اگر نمی‌خواهید کاربر بدون تأیید ایمیل وارد شود، Confirm email را روشن نگه دارید (و یک SMTP وصل کنید).
4. **گوگل و موبایل جدا روشن می‌شوند:** ورود با گوگل فقط وقتی دکمه دارد که `SIGNUP_OPEN=true` و `GOOGLE_LOGIN=true` باشد؛ ورود با موبایل فقط با `SIGNUP_OPEN=true` و `PHONE_LOGIN=true`. اگر این دو را نگذارید، فقط ایمیل نشان داده می‌شود.
5. **سقف هوش مصنوعی:** هر کاربر روزی `AI_DAILY_LIMIT` پیام (پیش‌فرض ۳۰) به چت و تشخیص گیاه می‌تواند بدهد.

### روش‌های ورود

برنامه چهار روش ورود دارد. هر کدام باید یک بار در Supabase روشن شود:

**ایمیل و رمز عبور، فراموشی رمز و تأیید ایمیل**
- به‌صورت پیش‌فرض روشن است. در **Authentication > URL Configuration** آدرس سایت را در Site URL بگذارید و این دو را به Redirect URLs اضافه کنید: `https://دامنه/home` و `https://دامنه/reset-password`.
- اگر تأیید ایمیل (Confirm email) روشن باشد، کاربر بعد از ثبت‌نام باید روی لینک ایمیل بزند. در صفحهٔ ورود دکمهٔ «دوباره بفرست» برای ارسال دوبارهٔ ایمیل تأیید هست.
- ایمیل‌های پیش‌فرض Supabase محدودیت تعداد دارند. برای استفادهٔ واقعی در **Authentication > Emails > SMTP Settings** یک سرویس ایمیل (SMTP) وصل کنید.

**ورود با گوگل**
1. در [Google Cloud Console](https://console.cloud.google.com) یک OAuth Client از نوع Web بسازید و در Authorized redirect URIs آدرسی را بگذارید که Supabase در صفحهٔ Google provider نشان می‌دهد (`https://<پروژه>.supabase.co/auth/v1/callback`).
2. در Supabase در **Authentication > Providers > Google** آن را روشن کنید و Client ID و Client Secret را وارد کنید.

**ورود با موبایل و کد پیامکی (کاوه‌نگار)**
1. در [کاوه‌نگار](https://kavenegar.com) حساب بسازید، کلید API بگیرید و یک الگوی «تأیید» بسازید که متنش مثلاً این باشد: `کد ورود گلدون: %token%`. صبر کنید تا الگو تأیید شود.
2. در Supabase در **Authentication > Providers > Phone** ورود با موبایل را روشن کنید (سرویس پیامک داخلی Supabase را لازم ندارید).
3. در **Authentication > Hooks** یک **Send SMS hook** از نوع HTTPS بسازید با آدرس `https://دامنه/api/sms-hook` و رمزی که Supabase می‌سازد را بردارید.
4. این متغیرها را روی سرور بگذارید: `KAVENEGAR_API_KEY`، `KAVENEGAR_TEMPLATE` (نام الگو) و `SEND_SMS_HOOK_SECRET` (رمز مرحلهٔ ۳).

Supabase کد را می‌سازد و بررسی می‌کند. سرور گلدون فقط آن را با کاوه‌نگار پیامک می‌کند.

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
   | `KAVENEGAR_API_KEY` | کلید کاوه‌نگار (برای ورود با موبایل) |
   | `KAVENEGAR_TEMPLATE` | نام الگوی تأیید در کاوه‌نگار |
   | `SEND_SMS_HOOK_SECRET` | رمز Send SMS hook در Supabase |

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
