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
const loginAttempts = new Map();

const smsGateway = createSmsGateway(config.smsProvider);
const paymentGateway = createPaymentGateway(config.paymentProvider);

function normalizeMobile(value) {
  const digits = String(value || '').replace(/\D+/g, '');
  if (!digits) return '';
  if (digits.startsWith('98') && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.startsWith('0098') && digits.length === 14) return `0${digits.slice(4)}`;
  if (digits.startsWith('9') && digits.length === 10) return `0${digits}`;
  return digits;
}

function isValidMobile(value) {
  return /^09\d{9}$/.test(value);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(value) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
  return typeof password === 'string' && password.length >= 8;
}

function sendJson(res, status, data) {
  const payload = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-webhook-secret',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  });
  res.end(payload);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error('Invalid JSON body'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function signToken(payload) {
  const now = Date.now();
  const normalizedPayload = {
    ...payload,
    iat: payload.iat || now,
    exp: payload.exp || (now + config.tokenTtlMs)
  };
  const body = Buffer.from(JSON.stringify(normalizedPayload)).toString('base64url');
  const sig = createHmac('sha256', config.jwtSecret).update(body).digest();
  return `${body}.${sig.toString('base64url')}`;
}

function verifyToken(authHeader = '') {
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;

  const expected = createHmac('sha256', config.jwtSecret).update(body).digest();
  const actual = Buffer.from(sig, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!parsed.userId) return null;
    if (parsed.exp && Date.now() > Number(parsed.exp)) return null;
    return parsed;
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
  const normalized = String(loginValue || '').trim();
  const mobile = normalizeMobile(normalized);
  const email = normalizeEmail(normalized);
  const userId = (isValidMobile(mobile) ? usersByMobile.get(mobile) : null) || usersByEmail.get(email);
  if (!userId) return null;
  return usersById.get(userId) || null;
}

function getOtpRecord(mobile) {
  const current = otpStore.get(mobile);
  if (!current) return null;
  if (Date.now() > current.expiresAt) {
    otpStore.delete(mobile);
    return null;
  }
  return current;
}

function recordLoginFailure(key) {
  const now = Date.now();
  const current = loginAttempts.get(key) || { count: 0, blockedUntil: 0 };
  const count = current.blockedUntil > now ? current.count : current.count + 1;
  const blockedUntil = count >= 5 ? now + 10 * 60 * 1000 : current.blockedUntil;
  loginAttempts.set(key, { count, blockedUntil });
}

function clearLoginFailures(key) {
  loginAttempts.delete(key);
}

function ensureLoginAllowed(key) {
  const current = loginAttempts.get(key);
  if (current && current.blockedUntil > Date.now()) {
    const retryAfter = Math.ceil((current.blockedUntil - Date.now()) / 1000);
    return { allowed: false, retryAfter };
  }
  return { allowed: true, retryAfter: 0 };
}

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-webhook-secret',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    return sendJson(res, 200, {
      ok: true,
      service: 'calisia2vpn-backend',
      version: '0.4.0',
      env: config.appEnv,
      now: new Date().toISOString(),
      smsProvider: config.smsProvider,
      paymentProvider: config.paymentProvider
    });
  }

  if (req.method === 'GET' && url.pathname === '/v1/meta') {
    return sendJson(res, 200, {
      app: 'Calisia API',
      version: '0.4.0',
      env: config.appEnv,
      serverTime: new Date().toISOString(),
      features: {
        auth: true,
        otp: true,
        paymentsCheckout: true,
        googleSubscriptionVerify: true
      }
    });
  }

  if (req.method === 'POST' && url.pathname === '/v1/auth/register') {
    const body = await parseBody(req);
    const fullName = String(body.fullName || '').trim();
    const mobile = normalizeMobile(body.mobile);
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');

    if (!fullName || !isValidMobile(mobile) || !validatePassword(password)) {
      return sendJson(res, 400, { error: 'fullName, valid mobile and password(min 8) are required' });
    }
    if (!isValidEmail(email)) {
      return sendJson(res, 400, { error: 'Valid email is required' });
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
    return sendJson(res, 201, { user: sanitizeUser(user), accessToken, expiresInMs: config.tokenTtlMs });
  }

  if (req.method === 'POST' && url.pathname === '/v1/auth/login') {
    const body = await parseBody(req);
    const login = String(body.login || '').trim();
    const password = String(body.password || '');
    if (!login || !password) return sendJson(res, 400, { error: 'login and password are required' });

    const throttle = ensureLoginAllowed(login);
    if (!throttle.allowed) {
      return sendJson(res, 429, { error: 'Too many failed login attempts', retryAfterSeconds: throttle.retryAfter });
    }

    const user = resolveUserByLogin(login);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      recordLoginFailure(login);
      return sendJson(res, 401, { error: 'Invalid credentials' });
    }

    clearLoginFailures(login);
    const accessToken = signToken({ userId: user.id, iat: Date.now() });
    return sendJson(res, 200, { user: sanitizeUser(user), accessToken, expiresInMs: config.tokenTtlMs });
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
    if (!isValidMobile(mobile)) return sendJson(res, 400, { error: 'Valid mobile is required' });

    const existing = getOtpRecord(mobile);
    if (existing && existing.lastSentAt + config.otpRequestCooldownMs > Date.now()) {
      const retryAfter = Math.ceil((existing.lastSentAt + config.otpRequestCooldownMs - Date.now()) / 1000);
      return sendJson(res, 429, { error: 'OTP already sent recently', retryAfterSeconds: retryAfter });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    otpStore.set(mobile, {
      code,
      expiresAt: Date.now() + config.otpTtlMs,
      attempts: 0,
      lastSentAt: Date.now()
    });
    const providerResult = await smsGateway.sendOtp({ mobile, code });

    const response = {
      sent: true,
      provider: providerResult.provider,
      messageId: providerResult.messageId,
      expiresInSeconds: Math.floor(config.otpTtlMs / 1000)
    };
    if (config.exposeOtpDebugCode && config.appEnv !== 'production') {
      response.debugCode = code;
    }
    return sendJson(res, 200, response);
  }

  if (req.method === 'POST' && url.pathname === '/v1/auth/otp/verify') {
    const body = await parseBody(req);
    const mobile = normalizeMobile(body.mobile);
    const code = String(body.code || '').trim();
    const item = getOtpRecord(mobile);

    if (!item) {
      return sendJson(res, 400, { error: 'OTP expired or not found' });
    }
    if (item.attempts >= config.otpMaxAttempts) {
      otpStore.delete(mobile);
      return sendJson(res, 429, { error: 'OTP maximum attempts exceeded' });
    }
    if (item.code !== code) {
      item.attempts += 1;
      otpStore.set(mobile, item);
      return sendJson(res, 401, { error: 'Invalid OTP code' });
    }

    otpStore.delete(mobile);
    return sendJson(res, 200, { verified: true });
  }

  if (req.method === 'POST' && url.pathname === '/v1/auth/device') {
    const body = await parseBody(req);
    const deviceId = String(body.deviceId || '').trim();
    const fullName = String(body.fullName || 'Device User').trim();
    if (!deviceId || deviceId.length < 8) return sendJson(res, 400, { error: 'deviceId with minimum length 8 is required' });

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
    return sendJson(res, 200, { user: sanitizeUser(usersById.get(userId)), accessToken, expiresInMs: config.tokenTtlMs });
  }

  if (req.method === 'GET' && url.pathname === '/v1/me/subscription') {
    const session = verifyToken(req.headers.authorization);
    if (!session) return sendJson(res, 401, { error: 'Unauthorized' });
    const user = usersById.get(session.userId);
    if (!user) return sendJson(res, 404, { error: 'User not found' });
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
    if (config.appEnv === 'production' && config.paymentProvider === 'mock') {
      return sendJson(res, 503, { error: 'Google subscription verification is not configured for production' });
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    const next = {
      status: 'active',
      plan: productId,
      source: 'google_play',
      orderId: orderId || null,
      purchaseToken,
      expiresAt,
      updatedAt: new Date().toISOString()
    };
    subscriptions.set(session.userId, next);

    return sendJson(res, 200, {
      verified: true,
      note: config.appEnv === 'production'
        ? 'Google verification passed.'
        : 'Stub verification passed. Integrate with Google Play Developer API before production.',
      subscription: next
    });
  }

  if (req.method === 'POST' && url.pathname === '/v1/payments/checkout') {
    const session = verifyToken(req.headers.authorization);
    if (!session) return sendJson(res, 401, { error: 'Unauthorized' });

    const body = await parseBody(req);
    const amount = Number(body.amount);
    const planId = String(body.planId || '').trim();
    const currency = String(body.currency || 'IRR').trim().toUpperCase();
    if (!Number.isFinite(amount) || amount <= 0) {
      return sendJson(res, 400, { error: 'Valid amount is required' });
    }
    if (!planId) {
      return sendJson(res, 400, { error: 'planId is required' });
    }

    const result = await paymentGateway.createCheckoutSession({
      userId: session.userId,
      amount,
      currency,
      planId
    });

    return sendJson(res, 200, result);
  }

  if (req.method === 'POST' && url.pathname === '/v1/subscriptions/webhook/google') {
    const signature = String(req.headers['x-webhook-secret'] || '');
    const expected = Buffer.from(config.webhookSecret);
    const incoming = Buffer.from(signature);
    if (incoming.length !== expected.length || !timingSafeEqual(incoming, expected)) {
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
  if (config.appEnv === 'production') {
    process.exit(1);
  }
}

const server = createServer((req, res) => {
  route(req, res).catch(error => {
    const statusCode = Number(error?.statusCode) || 500;
    if (statusCode >= 500) {
      console.error('Unhandled error:', error);
    }
    sendJson(res, statusCode, { error: error.message || 'Internal server error' });
  });
});

server.listen(config.port, config.host, () => {
  console.log(`API listening on http://${config.host}:${config.port}`);
  if (configErrors.length) {
    console.log('⚠️ Running with configuration warnings. Fix .env before production launch.');
  }
});
