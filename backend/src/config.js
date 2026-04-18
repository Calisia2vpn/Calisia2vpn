import process from 'node:process';

export const config = {
  port: Number(process.env.PORT || 8080),
  host: process.env.HOST || '0.0.0.0',
  appEnv: process.env.APP_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  googlePackageName: process.env.GOOGLE_PACKAGE_NAME || 'com.example.calisia2vpn',
  googlePubSubTopic: process.env.GOOGLE_PUBSUB_TOPIC || 'projects/example/topics/google-rtdn',
  webhookSecret: process.env.WEBHOOK_SECRET || 'dev-webhook-secret'
};

export function assertConfig() {
  const errors = [];
  if (!config.jwtSecret || config.jwtSecret.length < 12) {
    errors.push('JWT_SECRET must be at least 12 characters long.');
  }
  if (!config.googlePackageName.includes('.')) {
    errors.push('GOOGLE_PACKAGE_NAME should look like a valid Android package name.');
  }
  return errors;
}
