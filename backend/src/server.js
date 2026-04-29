import { createServer } from 'node:http';
import { createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import { config, assertConfig } from './config.js';
import { createSmsGateway } from './gateways/sms.js';
import { createPaymentGateway } from './gateways/payment.js';
import { createMemoryRateLimiter, requestPersonalCoachReply } from './ai.js';
import { query } from './db/index.js';
import { createUser, findUserById, findUserByLogin, sanitizeUser } from './repositories/users.js';
import { upsertOtp, getOtp, incrementOtpAttempts, deleteOtp } from './repositories/otps.js';
import { createSession } from './repositories/sessions.js';

const loginAttempts = new Map();
const smsGateway = createSmsGateway(config.smsProvider);
const paymentGateway = createPaymentGateway(config.paymentProvider);
const aiRateLimiter = createMemoryRateLimiter({ windowMs: config.aiRateLimitWindowMs, maxRequests: config.aiRateLimitMax });

function normalizeMobile(value) {
  const digits = String(value || '').replace(/\D+/g, '');
  if (!digits) return '';
  if (digits.startsWith('98') && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.startsWith('0098') && digits.length === 14) return `0${digits.slice(4)}`;
  if (digits.startsWith('9') && digits.length === 10) return `0${digits}`;
  return digits;
}
function isValidMobile(value) { return /^09\d{9}$/.test(value); }
function normalizeEmail(value) { return String(value || '').trim().toLowerCase(); }
function isValidEmail(value) { return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function normalizeLoginKey(value) {
  const raw = String(value || '').trim();
  const mobile = normalizeMobile(raw);
  return isValidMobile(mobile) ? `mobile:${mobile}` : `email:${normalizeEmail(raw)}`;
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
  return incoming.length === saved.length && timingSafeEqual(incoming, saved);
}
function validatePassword(password) { return typeof password === 'string' && password.length >= 8; }
function getClientIdentifier(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket?.remoteAddress || 'unknown';
}
function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-webhook-secret',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  });
  res.end(JSON.stringify(data));
}
function parseBody(req) {
  return new Promise((resolve, reject) => {
    const contentType = String(req.headers['content-type'] || '').toLowerCase();
    if (req.method !== 'GET' && contentType && !contentType.includes('application/json')) {
      reject(Object.assign(new Error('Content-Type must be application/json'), { statusCode: 415 }));
      req.resume(); return;
    }
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > config.requestBodyLimitBytes) {
        reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('bad');
        resolve(parsed);
      } catch {
        reject(Object.assign(new Error('Invalid JSON body'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}
function signToken(payload) {
  const now = Date.now();
  const body = Buffer.from(JSON.stringify({ ...payload, iat: payload.iat || now, exp: payload.exp || now + config.tokenTtlMs })).toString('base64url');
  const sig = createHmac('sha256', config.jwtSecret).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function verifyToken(authHeader = '') {
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  let actual;
  try { actual = Buffer.from(sig, 'base64url'); } catch { return null; }
  const expected = createHmac('sha256', config.jwtSecret).update(body).digest();
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!parsed.userId || Date.now() > Number(parsed.exp)) return null;
    return parsed;
  } catch { return null; }
}
function recordLoginFailure(key) {
  const now = Date.now();
  const current = loginAttempts.get(key) || { count: 0, blockedUntil: 0 };
  const count = current.blockedUntil > now ? current.count : current.count + 1;
  loginAttempts.set(key, { count, blockedUntil: count >= 5 ? now + 10 * 60 * 1000 : 0 });
}
function ensureLoginAllowed(key) {
  const current = loginAttempts.get(key);
  if (current?.blockedUntil > Date.now()) return { allowed: false, retryAfter: Math.ceil((current.blockedUntil - Date.now()) / 1000) };
  return { allowed: true, retryAfter: 0 };
}
async function ensureSubscriptionFor(userId) {
  const found = await query('SELECT * FROM subscriptions WHERE user_id = $1', [userId]);
  if (found.rows[0]) return found.rows[0];
  const created = await query('INSERT INTO subscriptions (user_id, plan, status, expires_at) VALUES ($1, NULL, $2, NULL) RETURNING *', [userId, 'inactive']);
  return created.rows[0];
}

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-webhook-secret', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }); res.end(); return; }
  if (req.method === 'GET' && url.pathname === '/health') return sendJson(res, 200, { ok: true, service: 'calisia2vpn-backend', version: '1.0.0', env: config.appEnv, now: new Date().toISOString() });
  if (req.method === 'GET' && url.pathname === '/ready') { await query('SELECT 1'); return sendJson(res, 200, { ready: true }); }
  if (req.method === 'GET' && url.pathname === '/v1/meta') return sendJson(res, 200, { app: 'Calisia API', version: '1.0.0', env: config.appEnv, serverTime: new Date().toISOString() });

  if (req.method === 'POST' && url.pathname === '/v1/ai/chat') {
    const limiter = aiRateLimiter(getClientIdentifier(req));
    if (!limiter.allowed) return sendJson(res, 429, { error: 'AI chat rate limit exceeded', retryAfterSeconds: limiter.retryAfterSeconds });
    const body = await parseBody(req);
    const message = String(body.message || '').trim();
    if (!message) return sendJson(res, 400, { error: 'message is required' });
    const reply = await requestPersonalCoachReply({ apiKey: config.gapgptApiKey, baseUrl: config.gapgptBaseUrl, model: String(body.model || config.gapgptModel), timeoutMs: config.aiRequestTimeoutMs, message, profile: body.profile ?? null, context: body.context ?? null, history: Array.isArray(body.history) ? body.history : [], language: body.language === 'en' ? 'en' : 'fa' });
    return sendJson(res, 200, { ok: true, provider: 'gapgpt', reply });
  }

  if (req.method === 'POST' && url.pathname === '/v1/auth/register') {
    const body = await parseBody(req);
    const fullName = String(body.fullName || '').trim();
    const mobile = normalizeMobile(body.mobile);
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');
    if (!fullName || !isValidMobile(mobile) || !validatePassword(password)) return sendJson(res, 400, { error: 'fullName, valid mobile and password(min 8) are required' });
    if (!isValidEmail(email)) return sendJson(res, 400, { error: 'Valid email is required' });
    const existing = await findUserByLogin({ mobile, email });
    if (existing) return sendJson(res, 409, { error: 'User already exists' });
    const user = await createUser({ fullName, mobile, email, passwordHash: hashPassword(password) });
    await ensureSubscriptionFor(user.id);
    const refreshToken = randomBytes(48).toString('hex');
    await createSession({ userId: user.id, refreshToken, deviceId: body.deviceId });
    return sendJson(res, 201, { user: sanitizeUser(user), accessToken: signToken({ userId: user.id }), refreshToken, expiresInMs: config.tokenTtlMs });
  }

  if (req.method === 'POST' && url.pathname === '/v1/auth/login') {
    const body = await parseBody(req);
    const login = String(body.login || '').trim();
    const password = String(body.password || '');
    if (!login || !password) return sendJson(res, 400, { error: 'login and password are required' });
    const key = normalizeLoginKey(login);
    const throttle = ensureLoginAllowed(key);
    if (!throttle.allowed) return sendJson(res, 429, { error: 'Too many failed login attempts', retryAfterSeconds: throttle.retryAfter });
    const mobile = normalizeMobile(login);
    const user = await findUserByLogin({ mobile: isValidMobile(mobile) ? mobile : null, email: normalizeEmail(login) });
    if (!user || !verifyPassword(password, user.password_hash)) { recordLoginFailure(key); return sendJson(res, 401, { error: 'Invalid credentials' }); }
    loginAttempts.delete(key);
    const refreshToken = randomBytes(48).toString('hex');
    await createSession({ userId: user.id, refreshToken, deviceId: body.deviceId });
    return sendJson(res, 200, { user: sanitizeUser(user), accessToken: signToken({ userId: user.id }), refreshToken, expiresInMs: config.tokenTtlMs });
  }

  if (req.method === 'GET' && url.pathname === '/v1/auth/me') {
    const session = verifyToken(req.headers.authorization);
    if (!session) return sendJson(res, 401, { error: 'Unauthorized' });
    const user = await findUserById(session.userId);
    if (!user) return sendJson(res, 404, { error: 'User not found' });
    return sendJson(res, 200, { user: sanitizeUser(user), subscription: await ensureSubscriptionFor(user.id) });
  }

  if (req.method === 'POST' && url.pathname === '/v1/auth/otp/request') {
    const body = await parseBody(req);
    const mobile = normalizeMobile(body.mobile);
    if (!isValidMobile(mobile)) return sendJson(res, 400, { error: 'Valid mobile is required' });
    const code = String(randomInt(100000, 1000000));
    await upsertOtp({ mobile, code, expiresAt: new Date(Date.now() + config.otpTtlMs) });
    const providerResult = await smsGateway.sendOtp({ mobile, code });
    const response = { sent: true, provider: providerResult.provider, messageId: providerResult.messageId, expiresInSeconds: Math.floor(config.otpTtlMs / 1000) };
    if (config.exposeOtpDebugCode && config.appEnv !== 'production') response.debugCode = code;
    return sendJson(res, 200, response);
  }

  if (req.method === 'POST' && url.pathname === '/v1/auth/otp/verify') {
    const body = await parseBody(req);
    const mobile = normalizeMobile(body.mobile);
    const code = String(body.code || '').trim();
    if (!isValidMobile(mobile) || !/^\d{6}$/.test(code)) return sendJson(res, 400, { error: 'Valid mobile and 6-digit code are required' });
    const item = await getOtp(mobile);
    if (!item || Date.now() > new Date(item.expires_at).getTime()) { await deleteOtp(mobile); return sendJson(res, 400, { error: 'OTP expired or not found' }); }
    if (item.attempts >= config.otpMaxAttempts) { await deleteOtp(mobile); return sendJson(res, 429, { error: 'OTP maximum attempts exceeded' }); }
    if (item.code !== code) { await incrementOtpAttempts(mobile); return sendJson(res, 401, { error: 'Invalid OTP code' }); }
    await deleteOtp(mobile);
    return sendJson(res, 200, { verified: true });
  }

  if (req.method === 'GET' && url.pathname === '/v1/me/subscription') {
    const session = verifyToken(req.headers.authorization);
    if (!session) return sendJson(res, 401, { error: 'Unauthorized' });
    return sendJson(res, 200, { userId: session.userId, subscription: await ensureSubscriptionFor(session.userId) });
  }

  if (req.method === 'POST' && url.pathname === '/v1/subscriptions/verify/google') {
    const session = verifyToken(req.headers.authorization);
    if (!session) return sendJson(res, 401, { error: 'Unauthorized' });
    const body = await parseBody(req);
    const productId = String(body.productId || '').trim();
    const purchaseToken = String(body.purchaseToken || '').trim();
    if (!productId || !purchaseToken) return sendJson(res, 400, { error: 'productId and purchaseToken are required' });
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    const result = await query(`INSERT INTO subscriptions (user_id, plan, status, expires_at) VALUES ($1,$2,$3,$4) ON CONFLICT (user_id) DO UPDATE SET plan=$2,status=$3,expires_at=$4 RETURNING *`, [session.userId, productId, 'active', expiresAt]);
    return sendJson(res, 200, { verified: true, subscription: result.rows[0] });
  }

  if (req.method === 'POST' && url.pathname === '/v1/payments/checkout') {
    const session = verifyToken(req.headers.authorization);
    if (!session) return sendJson(res, 401, { error: 'Unauthorized' });
    const body = await parseBody(req);
    const result = await paymentGateway.createCheckoutSession({ userId: session.userId, amount: Number(body.amount), currency: String(body.currency || 'IRR').toUpperCase(), planId: String(body.planId || '').trim() });
    return sendJson(res, 200, result);
  }

  return sendJson(res, 404, { error: 'Not found' });
}

const configErrors = assertConfig();
if (configErrors.length) {
  console.error('Configuration errors:');
  configErrors.forEach(err => console.error(`- ${err}`));
  if (config.appEnv === 'production') process.exit(1);
}
const server = createServer((req, res) => route(req, res).catch(error => sendJson(res, Number(error?.statusCode) || 500, { error: error.message || 'Internal server error' })));
server.listen(config.port, config.host, () => console.log(`API listening on http://${config.host}:${config.port}`));
