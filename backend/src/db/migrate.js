import { query } from './index.js';

async function migrate() {
  console.log('Running migrations...');

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      full_name TEXT NOT NULL,
      mobile TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES users(id),
      refresh_token TEXT NOT NULL,
      device_id TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS otps (
      mobile TEXT,
      code TEXT,
      expires_at TIMESTAMP,
      attempts INTEGER DEFAULT 0
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      user_id UUID PRIMARY KEY,
      plan TEXT,
      status TEXT,
      expires_at TIMESTAMP
    );
  `);

  console.log('Migrations complete');
}

migrate().then(() => process.exit(0));
