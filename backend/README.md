# Backend Scaffold for Android Subscription + Auth Launch

This backend is suitable for local development and integration testing. It is now safer and stricter, but it is **not yet a complete production product** because persistence and real provider integrations are still missing.

## Available endpoints

### Auth
- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `GET /v1/auth/me`
- `POST /v1/auth/otp/request`
- `POST /v1/auth/otp/verify`
- `POST /v1/auth/device`

### Subscription/Payments
- `GET /v1/me/subscription`
- `POST /v1/subscriptions/verify/google`
- `POST /v1/payments/checkout`
- `POST /v1/subscriptions/webhook/google`

### System
- `GET /health`
- `GET /v1/meta`

## What was hardened

- Access token signature verification is now timing-safe.
- Production boot now fails on unsafe config instead of only warning.
- OTP debug code is hidden by default and blocked in production.
- OTP requests now have cooldown and max verify attempts.
- Login now has a basic brute-force throttle.
- SMS/payment non-mock providers now fail explicitly until implemented.
- Register/login/device responses are more consistent.
- Mobile/email/password validation is stricter.

## Gateway architecture

- SMS adapter: `src/gateways/sms.js`
- Payment adapter: `src/gateways/payment.js`

Configure providers via env:

```env
SMS_PROVIDER=mock
PAYMENT_PROVIDER=mock
```

## Quick start

```bash
cd backend
cp .env.example .env
npm start
```

## Environment variables

```env
PORT=8080
HOST=0.0.0.0
APP_ENV=development
JWT_SECRET=change-this-to-a-long-random-secret
WEBHOOK_SECRET=change-this-too
TOKEN_TTL_MS=86400000
OTP_TTL_MS=120000
OTP_MAX_ATTEMPTS=5
OTP_REQUEST_COOLDOWN_MS=60000
EXPOSE_OTP_DEBUG_CODE=false
SMS_PROVIDER=mock
PAYMENT_PROVIDER=mock
```

## Production blockers still remaining

1. Replace in-memory stores with PostgreSQL + migrations.
2. Add Redis-backed rate limiting and OTP storage.
3. Integrate real SMS provider and payment provider.
4. Integrate real Google Play purchase verification and RTDN idempotency.
5. Add refresh tokens / session revocation.
6. Add structured logging, monitoring, backups, and alerting.
7. Add automated tests before launch.

## Update notes (v0.4.0)

- Hardened auth, OTP, and config validation.
- Startup now aborts on unsafe production configuration.
- Mock-only behavior is clearer and safer for deployment review.
