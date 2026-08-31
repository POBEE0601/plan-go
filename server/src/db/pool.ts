// 2026-08-31 Supabase Postgres 연결 풀
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '../../.env') });

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error(
    'DATABASE_URL이 없습니다. server/.env에 Supabase Connection string(URI)을 넣으세요.',
  );
}

export const pool = new Pool({
  connectionString,
  // 2026-08-31 Supabase는 SSL 필수. 로컬 개발 인증서 검증은 완화
  ssl: { rejectUnauthorized: false },
  max: 10,
});

export const pingDb = async (): Promise<void> => {
  await pool.query('SELECT 1');
};
