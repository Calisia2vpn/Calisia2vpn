import { randomUUID } from 'node:crypto';
import { query } from '../db/index.js';

export async function createSession({ userId, refreshToken, deviceId }) {
  const id = randomUUID();
  await query(
    `INSERT INTO sessions (id, user_id, refresh_token, device_id)
     VALUES ($1, $2, $3, $4)`,
    [id, userId, refreshToken, deviceId || null]
  );
  return { id, userId, refreshToken, deviceId };
}

export async function findSessionByToken(refreshToken) {
  const result = await query(
    'SELECT * FROM sessions WHERE refresh_token = $1 LIMIT 1',
    [refreshToken]
  );
  return result.rows[0] || null;
}

export async function deleteSession(refreshToken) {
  await query('DELETE FROM sessions WHERE refresh_token = $1', [refreshToken]);
}
