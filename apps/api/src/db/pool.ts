import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;

  const ssl = process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false;

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl,
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected database pool error', err);
  });

  return pool;
}
