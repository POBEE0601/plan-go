// 2026-09-04 준비 메모·체크리스트 컬럼/테이블을 기존 DB에도 적용
import { pool } from './pool.js';

export const ensurePrepSchema = async (): Promise<void> => {
  await pool.query(
    `ALTER TABLE travel_plans
      ADD COLUMN IF NOT EXISTS prep_memo TEXT NOT NULL DEFAULT ''`,
  );
  await pool.query(
    `ALTER TABLE travel_plans
      ADD COLUMN IF NOT EXISTS prep_seeded BOOLEAN NOT NULL DEFAULT false`,
  );
  await pool.query(`
    CREATE TABLE IF NOT EXISTS plan_prep_items (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL REFERENCES travel_plans(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      checked BOOLEAN NOT NULL DEFAULT false,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_template BOOLEAN NOT NULL DEFAULT false
    )
  `);
  await pool.query(
    `ALTER TABLE plan_prep_items
      ADD COLUMN IF NOT EXISTS detail TEXT NOT NULL DEFAULT ''`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_plan_prep_items_plan
      ON plan_prep_items(plan_id)`,
  );
};
