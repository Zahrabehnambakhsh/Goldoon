# باغچه هوشمند (Smart Garden)

Build a full-stack mobile-first plant care web app called "Future Plant Care" in Farsi/Persian (RTL).

TECH STACK:

- Frontend: React + Tailwind CSS (mobile-first, max-width 390px centered)

- Backend: Node.js + Express

- Database: PostgreSQL (via Replit DB or Supabase)

- Auth: Email/password with JWT

- AI Chat: OpenAI API (gpt-4o) for plant diagnosis chat

- RTL: dir="rtl" on html tag, Vazirmatn font from Google Fonts

DESIGN SYSTEM:

- Primary: #1B4332, #2D6A4F, #40916C, #52B788

- Light: #D8F3DC (card bg), #F0FFF4 (page bg), #B7E4C7 (borders)

- Border radius: cards 16px, buttons pill (9999px), inputs 12px

- Shadows: 0 4px 12px rgba(27,67,50,0.12)

- Glass nav: background rgba(27,67,50,0.75), backdrop-filter blur(24px), border rgba(255,255,255,0.15)

- All text RTL, Farsi numerals

---

PAGES & FEATURES:

1. AUTH SCREENS:

- Login: email + password, "ورود" button (#1B4332 pill), link to register

- Register: name + email + password, "ثبت‌نام" button

- Both screens: centered card on #F0FFF4 bg, logo/plant emoji top

2. HOME SCREEN (/home):

Header (RTL):

- Right: user avatar circle (#1B4332 bg, white initial letter) + "سلام [نام کاربر]" bold + subtitle "گیاهانت منتظرتن!"

- Left: notification bell in circle (#D8F3DC bg)

Search bar: pill shape, bg white, border #B7E4C7, placeholder "جستجوی گیاه..."

Stats row (3 cards, #D8F3DC bg, 16px radius):

- آبیاری امروز (count from DB)

- نیازمند آب (count of overdue plants)

- تعداد گیاه (total plants)

Section "گیاهان من 🌿" + "مشاهده همه" link:

Plant cards (each card):

- bg white, border 0.5px #B7E4C7, radius 16px, padding 14px

- RTL: plant name (Farsi, bold #1B4332) + latin name (#9CA3AF) + status dot + status text

- Circular progress ring (SVG): green #40916C if healthy, yellow #F59E0B if needs water

- Plant emoji/image in rounded square #D8F3DC

- Status: "سالم · آبیاری: X روز دیگر" or "نیاز به آب! X روز تأخیر"

AI Banner card (#D8F3DC, radius 20px):

- Text: "تشخیص هوشمند گیاه" + "عکس بگیر، گیاهت رو بشناس"

- Button: "امتحان کن" pill #1B4332

FAB button: fixed center-bottom above nav, circle 64px, #1B4332, white + icon, opens Add Plant screen

Bottom nav (glass effect):

- 4 tabs: باغچه 🏠 · تشخیص 📷 · یادآور ⏰ · پروفایل 👤

- Active tab: white pill bg, #1B4332 text

- Inactive: rgba(255,255,255,0.6)

3. ADD PLANT SCREEN (/add-plant):

Header: back arrow + "افزودن گیاه" center title

Image upload box: dashed border #74C69D, bg #D8F3DC, radius 20px, height 180px

- Center: 🌿 emoji + "عکس گیاه را اضافه کنید" + camera button circle

Form fields (label above, input below, radius 12px, border #B7E4C7):

- نام گیاه (text)

- نام علمی (text, LTR)

- نوع گیاه (select: آپارتمانی · باغی · کاکتوس · آبزی)

Watering settings:

- دور آبیاری: minus/plus stepper, default ۷ روز

- آخرین آبیاری: date picker (Farsi calendar display)

Light level: 3 pill toggle buttons (کم · متوسط · زیاد), selected = #1B4332 white text

Notes textarea: height 100px, char count ۰/۲۰۰

Submit button: full width pill, "افزودن گیاه 🌱" #1B4332, saves to DB

4. AI PLANT DIAGNOSIS SCREEN (/diagnose):

Top half: camera/image upload area

- Large box, bg #1B4332, radius 20px

- Center: camera icon + "عکس گیاه را آپلود کن"

- Upload button: pill, glass style

After image upload:

- Show uploaded image in the box

- Auto-send to OpenAI Vision API: "این گیاه چیست و چه مشکلاتی دارد؟ به فارسی پاسخ بده."

- Show result card: glass-white style, plant name bold + match % + description

CHAT SECTION below image (full chat interface):

- Chat bubbles: user messages right-aligned (#1B4332 bg, white text), AI messages left-aligned (white bg, #1B4332 text, border #B7E4C7)

- Input bar at bottom: text input + send button (#1B4332 circle)

- System prompt for AI: "تو یک متخصص گیاه‌شناس هستی. به سوالات کاربر درباره گیاهان به فارسی پاسخ بده. اگر عکسی آپلود شده، آن را تحلیل کن."

- Suggested questions as pill chips above input: "چه بیماری‌ای داره؟" · "چطور نگهداری کنم؟" · "چقدر آب نیاز داره؟"

- Streaming response support (typewriter effect)

5. WATERING REMINDER SCREEN (/reminders):

Header: "یادآورها ⏰" center title

Today section: "امروز" title

- List of plants needing water today, each row:

  - Plant emoji + name + "آبیاری کن" pill button (#1B4332)

  - On click: mark as watered, update lastWatered in DB, show ✅

Upcoming section: "هفته آینده"

- Timeline list, each item: day name + plant name + days remaining badge

Add reminder button: "+ یادآور جدید" pill outline button

6. PROFILE SCREEN (/profile):

- Avatar circle (large, #1B4332, initial letter)

- User name + email

- Stats: تعداد گیاه · روزهای استفاده · آبیاری انجام شده

- Settings list (card style):

  - اطلاعات حساب

  - اعلان‌ها toggle

  - زبان برنامه

  - خروج از حساب (red text)

---

DATABASE SCHEMA:

users: id, name, email, password_hash, created_at

plants: id, user_id, name, latin_name, type, image_url, watering_interval_days, last_watered, light_level, location, notes, created_at

reminders: id, plant_id, user_id, next_water_date, is_done, created_at

chat_messages: id, user_id, session_id, role (user/assistant), content, image_url, created_at

---

API ROUTES:

POST /api/auth/register

POST /api/auth/login

GET  /api/plants (auth required)

POST /api/plants (auth required)

PUT  /api/plants/:id (auth required)

DELETE /api/plants/:id (auth required)

POST /api/plants/:id/water (mark as watered)

GET  /api/reminders (auth required)

POST /api/diagnose (upload image → OpenAI Vision)

POST /api/chat (send message → OpenAI, stream response)

GET  /api/chat/:session_id (get chat history)

---

IMPORTANT TECHNICAL NOTES:

- Mobile-first: max-width 390px, centered on desktop with #F0FFF4 bg

- All pages protected by JWT auth except login/register

- Use React Router for navigation

- Bottom nav always visible on authenticated pages

- Smooth page transitions (fade or slide)

- Loading skeletons for plant cards while fetching

- Toast notifications for success/error (Farsi text)

- PWA ready: add manifest.json + service worker so user can "Add to Home Screen"

- OpenAI API key stored in Replit Secrets as OPENAI_API_KEY

- Image upload: store in Replit Object Storage or Cloudinary

- Vazirmatn font: import from Google Fonts

## اجرا و انتشار

راهنمای کامل اجرای محلی و نصب روی سرور در [DEPLOY.md](DEPLOY.md) است.

```sh
cp .env.example .env   # مقادیر را پر کنید
npm install
npm run dev            # http://localhost:8080
```
