# Calisia2vpn Production Backend

This branch upgrades the backend toward a startup-ready architecture.

## Stack

- Node.js 20+
- PostgreSQL
- Repository layer
- JSON structured logs
- Environment based configuration

## Required environment

```env
APP_ENV=production
PORT=8080
HOST=0.0.0.0
DATABASE_URL=postgres://postgres:postgres@db:5432/calisia
JWT_SECRET=replace-with-strong-secret
WEBHOOK_SECRET=replace-with-strong-secret
ALLOWED_ORIGINS=https://your-domain.com
SMS_PROVIDER=mock
PAYMENT_PROVIDER=mock
GAPGPT_API_KEY=
```

## Local setup

```bash
cd backend
npm install
npm run migrate
npm run start
```

## Production checklist

- Replace mock SMS provider.
- Replace mock payment provider.
- Set strong JWT_SECRET and WEBHOOK_SECRET.
- Set ALLOWED_ORIGINS to the real frontend domain.
- Run migrations before starting the API.
- Move OTP, session and rate-limit state to Redis before horizontal scaling.

## Database tables

- users
- sessions
- otps
- subscriptions

## Notes

The backend now has PostgreSQL connectivity and repository files. The next hardening step is fully replacing the remaining in-memory maps inside `src/server.js` with repository calls.