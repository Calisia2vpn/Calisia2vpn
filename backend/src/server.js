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

function ensureSubscriptionFor(userId) {
  if (!subscriptions.has(userId)) {
    subscriptions.set(userId, { status: 'inactive', plan: null, source: null, expiresAt: null });
  }
  return subscriptions.get(userId);
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    fullName: user.fullName,
    mobile: user.mobile,
    email: user.email,
    createdAt: user.createdAt
  };
}

function resolveUserByLogin(loginValue) {
  const mobile = normalizeMobile(loginValue);
  const email = normalizeEmail(loginValue);
  const userId = usersByMobile.get(mobile) || usersByEmail.get(email);
  if (!userId) return null;
  return usersById.get(userId) || null;
}

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    return sendJson(res, 200, {
      ok: true,
      service: 'calisia2vpn-backend',
      env: config.appEnv,
      now: new Date().toISOString(),
      smsProvider: config.smsProvider,
      paymentProvider: config.paymentProvider
    });
  }

  if (req.method === 'POST' && url.pathname === '/v1/auth/register') {
    const body = await parseBody(req);
    const fullName = String(body.fullName || '').trim();
    const mobile = normalizeMobile(body.mobile);
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');

    if (!fullName || !mobile || !validatePassword(password)) {
      return sendJson(res, 400, { error: 'fullName, mobile and valid password(min 6) are required' });
    }
    if (usersByMobile.has(mobile)) {
      return sendJson(res, 409, { error: 'Mobile already exists' });
    }
    if (email && usersByEmail.has(email)) {
      return sendJson(res, 409, { error: 'Email already exists' });
    }

    const user = {
      id: randomUUID(),
      fullName,
      mobile,
      email: email || null,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString()
    };
    usersById.set(user.id, user);
    usersByMobile.set(mobile, user.id);
    if (email) usersByEmail.set(email, user.id);

    ensureSubscriptionFor(user.id);

    const accessToken = signToken({ userId: user.id, iat: Date.now() });
    return sendJson(res, 201, { user: sanitizeUser(user), accessToken });
  }

  if (req.method === 'POST' && url.pathname === '/v1/auth/login') {
    const body = await parseBody(req);
    const login = String(body.login || '').trim();
    const password = String(body.password || '');
    if (!login || !password) return sendJson(res, 400, { error: 'login and password are required' });

    const user = resolveUserByLogin(login);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return sendJson(res, 401, { error: 'Invalid credentials' });
    }

    const accessToken = signToken({ userId: user.id, iat: Date.now() });
    return sendJson(res, 200, { user: sanitizeUser(user), accessToken });
  }

  if (req.method === 'GET' && url.pathname === '/v1/auth/me') {
    const session = verifyToken(req.headers.authorization);
    if (!session) return sendJson(res, 401, { error: 'Unauthorized' });
    const user = usersById.get(session.userId);
    if (!user) return sendJson(res, 404, { error: 'User not found' });
    return sendJson(res, 200, { user: sanitizeUser(user), subscription: ensureSubscriptionFor(user.id) });
  }

  if (req.method === 'POST' && url.pathname === '/v1/auth/otp/request') {
    const body = await parseBody(req);
    const mobile = normalizeMobile(body.mobile);
    if (!mobile) return sendJson(res, 400, { error: 'mobile is required' });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    otpStore.set(mobile, { code, expiresAt: Date.now() + 2 * 60 * 1000 });
    const providerResult = await smsGateway.sendOtp({ mobile, code });

    return sendJson(res, 200, {
      sent: true,
      provider: providerResult.provider,
      messageId: providerResult.messageId,
      expiresInSeconds: 120,
      // In production remove debugCode from response.
      debugCode: code
    });
  }

  if (req.method === 'POST' && url.pathname === '/v1/auth/otp/verify') {
    const body = await parseBody(req);
    const mobile = normalizeMobile(body.mobile);
    const code = String(body.code || '').trim();
    const item = otpStore.get(mobile);

    if (!item || Date.now() > item.expiresAt) {
      return sendJson(res, 400, { error: 'OTP expired or not found' });
    }
    if (item.code !== code) {
      return sendJson(res, 401, { error: 'Invalid OTP code' });
    }

    otpStore.delete(mobile);
    return sendJson(res, 200, { verified: true });
  }

  if (req.method === 'POST' && url.pathname === '/v1/auth/device') {
    const body = await parseBody(req);
    const deviceId = String(body.deviceId || '').trim();
    const fullName = String(body.fullName || 'Device User').trim();
    if (!deviceId) return sendJson(res, 400, { error: 'deviceId is required' });

    const pseudoMobile = `09${String(deviceId).replace(/\D/g, '').slice(0, 9).padStart(9, '0')}`;
    let userId = usersByMobile.get(pseudoMobile);
    if (!userId) {
      const user = {
        id: randomUUID(),
        fullName,
        mobile: pseudoMobile,
        email: null,
        passwordHash: hashPassword(randomUUID()),
        createdAt: new Date().toISOString()
      };
      usersById.set(user.id, user);
      usersByMobile.set(pseudoMobile, user.id);
      userId = user.id;
    }

    ensureSubscriptionFor(userId);
    const accessToken = signToken({ userId, deviceId, iat: Date.now() });
    return sendJson(res, 200, { userId, accessToken });
  }

  if (req.method === 'GET' && url.pathname === '/v1/me/subscription') {
    const session = verifyToken(req.headers.authorization);
    if (!session) return sendJson(res, 401, { error: 'Unauthorized' });
    const sub = ensureSubscriptionFor(session.userId);
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

  if (req.method === 'POST' && url.pathname === '/v1/payments/checkout') {
    const session = verifyToken(req.headers.authorization);
    if (!session) return sendJson(res, 401, { error: 'Unauthorized' });

    const body = await parseBody(req);
    const amount = Number(body.amount);
    const planId = String(body.planId || '').trim();
    if (!Number.isFinite(amount) || amount <= 0) {
      return sendJson(res, 400, { error: 'Valid amount is required' });
    }

    const result = await paymentGateway.createCheckoutSession({
      userId: session.userId,
      amount,
      currency: String(body.currency || 'IRR'),
      planId
    });

    return sendJson(res, 200, result);
  }

  if (req.method === 'POST' && url.pathname === '/v1/subscriptions/webhook/google') {
    const signature = req.headers['x-webhook-secret'];
    if (signature !== config.webhookSecret) {
      return sendJson(res, 401, { error: 'Invalid webhook secret' });
    }

    const body = await parseBody(req);
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
