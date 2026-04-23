import process from 'node:process';

export const config = {
  port: Number(process.env.PORT || 8080),
  host: process.env.HOST || '0.0.0.0',
  appEnv: process.env.APP_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  googlePackageName: process.env.GOOGLE_PACKAGE_NAME || 'com.example.calisia2vpn',
  googlePubSubTopic: process.env.GOOGLE_PUBSUB_TOPIC || 'projects/example/topics/google-rtdn',
  webhookSecret: process.env.WEBHOOK_SECRET || 'dev-webhook-secret',
  smsProvider: process.env.SMS_PROVIDER || 'mock',
  paymentProvider: process.env.PAYMENT_PROVIDER || 'mock',
  gapgptApiKey: process.env.GAPGPT_API_KEY || '',
  gapgptBaseUrl: process.env.GAPGPT_BASE_URL || 'https://api.gapgpt.app/v1/chat/completions',
  gapgptModel: process.env.GAPGPT_MODEL || 'gemini-3.1-pro-preview',
  aiRequestTimeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS || 45_000),
  aiRateLimitWindowMs: Number(process.env.AI_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000),
  aiRateLimitMax: Number(process.env.AI_RATE_LIMIT_MAX || 30),
  tokenTtlMs: Number(process.env.TOKEN_TTL_MS || 24 * 60 * 60 * 1000),
  otpTtlMs: Number(process.env.OTP_TTL_MS || 2 * 60 * 1000),
  otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS || 5),
  otpRequestCooldownMs: Number(process.env.OTP_REQUEST_COOLDOWN_MS || 60 * 1000),
  exposeOtpDebugCode: process.env.EXPOSE_OTP_DEBUG_CODE === 'true'
};

export function assertConfig() {
  const errors = [];
  const isProduction = config.appEnv === 'production';

  if (!Number.isInteger(config.port) || config.port <= 0 || config.port > 65535) {
    errors.push('PORT must be a valid TCP port.');
  }
  if (!config.jwtSecret || config.jwtSecret.length < 12) {
    errors.push('JWT_SECRET must be at least 12 characters long.');
  }
  if (!config.webhookSecret || config.webhookSecret.length < 12) {
    errors.push('WEBHOOK_SECRET must be at least 12 characters long.');
  }
  if (!config.googlePackageName.includes('.')) {
    errors.push('GOOGLE_PACKAGE_NAME should look like a valid Android package name.');
  }
  if (!Number.isFinite(config.tokenTtlMs) || config.tokenTtlMs < 60_000) {
    errors.push('TOKEN_TTL_MS must be at least 60000.');
  }
  if (!Number.isFinite(config.otpTtlMs) || config.otpTtlMs < 30_000) {
    errors.push('OTP_TTL_MS must be at least 30000.');
  }
  if (!Number.isInteger(config.otpMaxAttempts) || config.otpMaxAttempts < 1) {
    errors.push('OTP_MAX_ATTEMPTS must be an integer >= 1.');
  }
  if (!Number.isFinite(config.otpRequestCooldownMs) || config.otpRequestCooldownMs < 0) {
    errors.push('OTP_REQUEST_COOLDOWN_MS must be a non-negative number.');
  }
  if (!Number.isFinite(config.aiRequestTimeoutMs) || config.aiRequestTimeoutMs < 5_000) {
    errors.push('AI_REQUEST_TIMEOUT_MS must be at least 5000.');
  }
  if (!Number.isFinite(config.aiRateLimitWindowMs) || config.aiRateLimitWindowMs < 60_000) {
    errors.push('AI_RATE_LIMIT_WINDOW_MS must be at least 60000.');
  }
  if (!Number.isInteger(config.aiRateLimitMax) || config.aiRateLimitMax < 1) {
    errors.push('AI_RATE_LIMIT_MAX must be an integer >= 1.');
  }
  if (isProduction && config.jwtSecret === 'dev-secret-change-me') {
    errors.push('JWT_SECRET cannot use the development default in production.');
  }
  if (isProduction && config.webhookSecret === 'dev-webhook-secret') {
    errors.push('WEBHOOK_SECRET cannot use the development default in production.');
  }
  if (isProduction && config.exposeOtpDebugCode) {
    errors.push('EXPOSE_OTP_DEBUG_CODE must be false in production.');
  }
  if (isProduction && (config.smsProvider === 'mock' || config.paymentProvider === 'mock')) {
    errors.push('Production requires real SMS_PROVIDER and PAYMENT_PROVIDER values.');
  }
  return errors;
}
