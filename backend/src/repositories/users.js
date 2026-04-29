import { randomUUID } from 'node:crypto';
import { query } from '../db/index.js';

export function sanitizeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    mobile: row.mobile,
    email: row.email,
    createdAt: row.created_at
  };
}

export async function createUser({ fullName, mobile, email, passwordHash }) {
  const id = randomUUID();
  const result = await query(
    `INSERT INTO users (id, full_name, mobile, email, password_hash)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id, fullName, mobile, email || null, passwordHash]
  );
  return result.rows[0];
}

export async function findUserById(id) {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function findUserByMobile(mobile) {
  const result = await query('SELECT * FROM users WHERE mobile = $1', [mobile]);
  return result.rows[0] || null;
}

export async function findUserByEmail(email) {
  if (!email) return null;
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

export async function findUserByLogin({ mobile, email }) {
  const result = await query(
    'SELECT * FROM users WHERE mobile = $1 OR email = $2 LIMIT 1',
    [mobile || null, email || null]
  );
  return result.rows[0] || null;
}
