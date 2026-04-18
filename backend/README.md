# Backend Scaffold for Android Subscription Launch

This folder provides the minimum backend skeleton needed to move from a local-only web app to an Android app with paid subscriptions.

## What is included

- `POST /v1/auth/device` device-based sign-in (stub)
- `GET /v1/me/subscription` subscription status for current user
- `POST /v1/subscriptions/verify/google` purchase verification endpoint (stub; must integrate Google Play Developer API)
- `POST /v1/subscriptions/webhook/google` webhook receiver for RTDN/PubSub push events (stub)
- `GET /health` health endpoint for uptime checks

## Quick start

```bash
cd backend
cp .env.example .env
npm start
```

Server starts on `http://localhost:8080` by default.

## Production tasks still required

1. Replace token signer with real JWT (RS256).
2. Add PostgreSQL + migration layer.
3. Add Redis for idempotency/event processing.
4. Verify Google purchases via Android Publisher API.
5. Verify RTDN signatures and implement idempotent webhook processor.
6. Add rate limiting, audit logs, and abuse controls.
7. Add monitoring (Sentry + Prometheus/Grafana + uptime).

See `ANDROID_PRODUCTION_INFRA_FA.md` at repo root for a full launch checklist.
