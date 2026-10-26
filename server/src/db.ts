import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const isLocalDb = 
  process.env.DATABASE_URL?.includes('localhost') || 
  process.env.DATABASE_URL?.includes('127.0.0.1');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: isLocalDb ? false : { rejectUnauthorized: false },
});

// Prevent idle pool connection resets from crashing the Node.js process
pool.on('error', (err) => {
  console.error('[DB Pool Error] Unexpected idle client error:', err.message);
});

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

export const getClient = async (): Promise<PoolClient> => {
  return await pool.connect();
};

export default pool;
