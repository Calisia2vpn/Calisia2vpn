import { createServer } from 'node:http';
import { randomUUID, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { config, assertConfig } from './config.js';
import { createSmsGateway } from './gateways/sms.js';
import { createPaymentGateway } from './gateways/payment.js';

const usersById = new Map();
const usersByMobile = new Map();
const usersByEmail = new Map();
const subscriptions = new Map();
const otpStore = new Map();

const smsGateway = createSmsGateway(config.smsProvider);
const paymentGateway = createPaymentGateway(config.paymentProvider);

function normalizeMobile(value) {
  return String(value || '').replace(/\s+/g, '').replace(/^\+?98/, '0').trim();
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const incoming = scryptSync(password, salt, 64);
  const saved = Buffer.from(hash, 'hex');
  if (incoming.length !== saved.length) return false;
  return timingSafeEqual(incoming, saved);
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

function sendJson(res, status, data) {
  const payload = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(payload);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', config.jwtSecret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(authHeader = '') {
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = createHmac('sha256', config.jwtSecret).update(body).digest('base64url');
  if (sig !== expected) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    return sendJson(res, 200, {
      ok: true,
      service: 'calisia2vpn-backend',
      env: config.appEnv,
      now: new Date().toISOString()
    });
  }

  if (req.method === 'POST' && url.pathname === '/v1/auth/device') {
    const body = await parseBody(req);
    const deviceId = String(body.deviceId || '').trim();
    if (!deviceId) return sendJson(res, 400, { error: 'deviceId is required' });

    const userId = users.get(deviceId) || randomUUID();
    users.set(deviceId, userId);
    if (!subscriptions.has(userId)) {
      subscriptions.set(userId, { status: 'inactive', plan: null, source: null, expiresAt: null });
    }

    const token = signToken({ userId, deviceId, iat: Date.now() });
    return sendJson(res, 200, { userId, accessToken: token });
  }

  if (req.method === 'GET' && url.pathname === '/v1/me/subscription') {
    const session = verifyToken(req.headers.authorization);
    if (!session) return sendJson(res, 401, { error: 'Unauthorized' });
    const sub = subscriptions.get(session.userId) || { status: 'inactive' };
    return sendJson(res, 200, { userId: session.userId, subscription: sub });
  }

  if (req.method === 'POST' && url.pathname === '/v1/subscriptions/verify/google') {
    const session = verifyToken(req.headers.authorization);
    if (!session) return sendJson(res, 401, { error: 'Unauthorized' });

    const body = await parseBody(req);
    const productId = String(body.productId || '').trim();
    const purchaseToken = String(body.purchaseToken || '').trim();
    const orderId = String(body.orderId || '').trim();

    if (!productId || !purchaseToken) {
      return sendJson(res, 400, { error: 'productId and purchaseToken are required' });
    }

    // TODO: replace this stub with Google Play Developer API verification.
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    const next = {
      status: 'active',
      plan: productId,
      source: 'google_play',
      orderId,
      purchaseToken,
      expiresAt,
      updatedAt: new Date().toISOString()
    };
    subscriptions.set(session.userId, next);

    return sendJson(res, 200, {
      verified: true,
      note: 'Stub verification passed. Integrate with Google Play Developer API before production.',
      subscription: next
    });
  }

  if (req.method === 'POST' && url.pathname === '/v1/subscriptions/webhook/google') {
    const signature = req.headers['x-webhook-secret'];
    if (signature !== config.webhookSecret) {
      return sendJson(res, 401, { error: 'Invalid webhook secret' });
    }

    const body = await parseBody(req);
    // TODO: decode and verify Google RTDN Pub/Sub payload and apply changes idempotently.
    return sendJson(res, 202, {
      accepted: true,
      receivedAt: new Date().toISOString(),
      note: 'Webhook received. Hook this endpoint to Pub/Sub push subscription with signature verification.',
      sample: body
    });
  }

  return sendJson(res, 404, { error: 'Not found' });
}

const configErrors = assertConfig();
if (configErrors.length) {
  console.error('Configuration errors:');
  configErrors.forEach(err => console.error(`- ${err}`));
}

const server = createServer((req, res) => {
  route(req, res).catch(error => {
    console.error('Unhandled error:', error);
    sendJson(res, 500, { error: 'Internal server error' });
  });
});

server.listen(config.port, config.host, () => {
  console.log(`API listening on http://${config.host}:${config.port}`);
  if (configErrors.length) {
    console.log('⚠️ Running with configuration warnings. Fix .env before production launch.');
  }
});
