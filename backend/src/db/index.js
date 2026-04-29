import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;

  console.log(JSON.stringify({
    event: 'db_query',
    query: text.slice(0, 120),
    durationMs: duration
  }));

  return res;
}

export async function getClient() {
  return pool.connect();
}

export default pool;
