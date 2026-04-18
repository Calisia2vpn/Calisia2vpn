# زیرساخت لازم برای لانچ اپ اندروید + فروش اشتراک

این سند دقیقاً برای این نوشته شده که بدون ابهام بدانی برای بردن محصول به مارکت و فروش اشتراک چه چیزهایی لازم است و چه چیزهایی در همین ریپو اضافه شده.

## 1) چیزهایی که همین الان در این ریپو انجام شد

### ✅ بک‌اند پایه (اسکلت اولیه)
- مسیر سلامت سرویس: `GET /health`
- احراز هویت دستگاه: `POST /v1/auth/device`
- دریافت وضعیت اشتراک کاربر: `GET /v1/me/subscription`
- تایید خرید گوگل (نسخه استاب): `POST /v1/subscriptions/verify/google`
- وبهوک RTDN گوگل (نسخه استاب): `POST /v1/subscriptions/webhook/google`

فایل‌ها:
- `backend/src/server.js`
- `backend/src/config.js`
- `backend/.env.example`
- `backend/README.md`

### ✅ زیرساخت اجرای محلی
- Dockerfile برای API
- Docker Compose برای API + PostgreSQL + Redis

فایل‌ها:
- `backend/Dockerfile`
- `infra/docker-compose.yml`

---

## 2) چیزهایی که برای فروش واقعی اشتراک باید حتماً کامل شوند

> اینها «اختیاری» نیستند؛ برای محیط production لازم‌اند.

### 🔒 امنیت و هویت
1. جایگزینی توکن فعلی با JWT استاندارد (ترجیحاً RS256 + rotation).
2. افزودن Refresh Token + Revocation List.
3. Rate Limit روی endpointها.
4. Device Integrity (Play Integrity API) برای کاهش تقلب.

### 💳 اشتراک و پرداخت
1. اتصال واقعی `verify/google` به Google Play Developer API.
2. نگهداری جدول Purchase/Entitlement با وضعیت lifecycle کامل:
   - purchased
   - grace
   - paused
   - on_hold
   - expired
   - canceled
3. پردازش idempotent رویدادهای RTDN از Pub/Sub.
4. اعمال تغییر پلن (upgrade/downgrade/proration) و renewal logic.

### 🗃️ دیتابیس و داده
1. طراحی اسکیما PostgreSQL (users, devices, subscriptions, entitlements, events).
2. migration و backup policy.
3. log/audit trail برای پیگیری مالی و پشتیبانی.

### 📡 پایداری سرویس
1. مانیتورینگ (Sentry + metrics + uptime checks).
2. structured logging و trace id.
3. alerting (خطای webhook، افت verify success rate، latency).

### 🧾 حقوقی و عملیات
1. Privacy Policy + Terms of Service + Refund Policy.
2. صفحه FAQ اشتراک و قوانین لغو.
3. پنل پشتیبانی برای restore purchase / issue resolution.

### 🚀 انتشار
1. CI/CD برای backend + signing اندروید.
2. staging محیط جدا + smoke test قبل rollout.
3. rollout تدریجی Play Console (مثلاً 10% → 30% → 100%).

---

## 3) ترتیب اجرای پیشنهادی (کم‌ریسک‌ترین مسیر)

1. تکمیل مدل دیتابیس + migration
2. اتصال واقعی Google verify
3. RTDN webhook + idempotency
4. entitlement engine (منطق دسترسی)
5. observability + alerting
6. CI/CD + staging + rollout strategy

---

## 4) Definition of Done برای «آماده فروش اشتراک»

وقتی این موارد برقرار باشد، می‌توان گفت آماده‌ای:
- [ ] verify خرید روی سرور واقعی و قابل اعتماد
- [ ] entitlement دقیق و realtime
- [ ] webhookها بدون دوباره‌کاری و از دست‌دادن event
- [ ] داشبورد مانیتورینگ + alert
- [ ] سند حقوقی کامل
- [ ] تست end-to-end خرید، تمدید، لغو، refund

