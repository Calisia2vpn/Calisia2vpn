# Backend Scaffold for Android Subscription + Auth Launch

This backend is now ready for **initial signup/login** and prepared for future online release with pluggable SMS and payment gateways.

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

## Gateway architecture (future-proof)

- SMS adapter: `src/gateways/sms.js`
- Payment adapter: `src/gateways/payment.js`

Both are provider-based so later you can plug real gateways (e.g. Kavenegar/Twilio for SMS, Zarinpal/Stripe for payments) without rewriting auth/subscription flows.

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

## Hosting-ready API base

Frontend now reads API base from `runtime-config.js` (defaults to `/api`), which is ideal behind nginx reverse proxy in production.

## Production tasks still required

1. Replace custom token signer with proper JWT (RS256) + refresh tokens.
2. Move from in-memory stores to PostgreSQL + migrations.
3. Integrate real SMS provider and remove OTP debug codes from responses.
4. Integrate real payment provider + callback signature verification.
5. Integrate Google Play verification + RTDN idempotent processing.
6. Add rate limiting, audit logs, monitoring, and alerting.

## Update notes (v0.3.0)

- Access tokens now carry an expiry (`exp`) and are rejected after expiration.
- Added `GET /v1/meta` for app/version/feature capability checks from clients.
