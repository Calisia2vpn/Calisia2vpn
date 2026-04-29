import { query } from '../db/index.js';

export async function upsertOtp({ mobile, code, expiresAt }) {
  await query('DELETE FROM otps WHERE mobile = $1', [mobile]);
  await query(
    'INSERT INTO otps (mobile, code, expires_at, attempts) VALUES ($1, $2, $3, 0)',
    [mobile, code, expiresAt]
  );
}

export async function getOtp(mobile) {
  const result = await query('SELECT * FROM otps WHERE mobile = $1 LIMIT 1', [mobile]);
  return result.rows[0] || null;
}

export async function incrementOtpAttempts(mobile) {
  await query('UPDATE otps SET attempts = attempts + 1 WHERE mobile = $1', [mobile]);
}

export async function deleteOtp(mobile) {
  await query('DELETE FROM otps WHERE mobile = $1', [mobile]);
}
