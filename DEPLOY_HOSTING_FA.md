# راه‌اندازی روی هاست/VPS (نسخه آماده استقرار)

این پروژه الان برای استقرار روی هاست لینوکسی آماده شده (Frontend + Backend + Reverse Proxy).

## معماری پیشنهادی
- Nginx برای سرو فایل‌های استاتیک و TLS
- Node API روی `127.0.0.1:8080`
- مسیر `/api/*` توسط Nginx به API پروکسی می‌شود

## فایل‌های مهم Deployment
- `runtime-config.js` → تنظیم آدرس API (پیش‌فرض `/api`)
- `nginx/calisia.conf` → کانفیگ Reverse Proxy و Static
- `backend/.env.production.example` → env تولید
- `backend/ecosystem.config.cjs` → اجرای پایدار با PM2

## مراحل سریع
1. آپلود کل پروژه روی سرور (مثلاً `/var/www/calisia`)
2. تنظیم env:
   - `cp backend/.env.production.example backend/.env`
   - مقدار `JWT_SECRET` و `WEBHOOK_SECRET` را امن و قوی بگذار
3. اجرای API:
   - `cd backend && npm install`
   - `pm2 start ecosystem.config.cjs`
4. فعال‌سازی Nginx:
   - `sudo cp nginx/calisia.conf /etc/nginx/sites-available/calisia`
   - `sudo ln -s /etc/nginx/sites-available/calisia /etc/nginx/sites-enabled/calisia`
   - `sudo nginx -t && sudo systemctl reload nginx`

## SSL (توصیه شدید)
- با certbot:
  - `sudo apt install certbot python3-certbot-nginx`
  - `sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com`

## چک نهایی
- `GET https://yourdomain.com/` → صفحه لود شود
- `GET https://yourdomain.com/api/health` → پاسخ JSON OK
- ثبت‌نام/ورود در `auth.html` کار کند

## نکته
اگر بعداً API را روی دامنه جدا بردی، فقط `runtime-config.js` را تغییر بده:
```js
window.__APP_CONFIG = { API_BASE_URL: 'https://api.yourdomain.com' };
```
