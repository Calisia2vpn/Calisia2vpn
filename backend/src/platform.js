import { randomUUID } from 'node:crypto';

export function createRateLimiter({ windowMs, maxRequests }) {
  const buckets = new Map();

  return function check(identifier) {
    const now = Date.now();
    const key = String(identifier || 'anonymous');
    const recent = (buckets.get(key) || []).filter(timestamp => now - timestamp < windowMs);

    if (recent.length >= maxRequests) {
      const retryAfterMs = windowMs - (now - recent[0]);
      buckets.set(key, recent);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000))
      };
    }

    recent.push(now);
    buckets.set(key, recent);
    return { allowed: true, retryAfterSeconds: 0 };
  };
}

export function getRequestId(req) {
  const incoming = String(req.headers['x-request-id'] || '').trim();
  return incoming && incoming.length <= 128 ? incoming : randomUUID();
}

export function getClientIdentifier(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket?.remoteAddress || 'unknown';
}

export function resolveCorsOrigin(req, allowedOrigins) {
  const origin = String(req.headers.origin || '').trim();
  if (!origin) return '*';
  if (allowedOrigins.includes('*')) return '*';
  return allowedOrigins.includes(origin) ? origin : null;
}

export function applySecurityHeaders(res, { requestId, corsOrigin }) {
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Cache-Control', 'no-store');
  if (corsOrigin) {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-webhook-secret, x-request-id');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  }
}

export function logRequest({ req, res, requestId, startedAt }) {
  const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  const line = {
    level: res.statusCode >= 500 ? 'error' : 'info',
    event: 'http_request',
    requestId,
    method: req.method,
    path: req.url?.split('?')[0],
    statusCode: res.statusCode,
    durationMs: Number(durationMs.toFixed(2)),
    remoteAddress: getClientIdentifier(req),
    userAgent: req.headers['user-agent'] || null,
    at: new Date().toISOString()
  };
  console.log(JSON.stringify(line));
}

export function jsonError(message, statusCode = 500, code = 'ERROR') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
