// 2026-09-28 여행 지출 테이블
// 2026-09-22 장소 핀 색·카테고리 정규화
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

export const ensureExpenseSchema = async (): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS plan_expenses (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL REFERENCES travel_plans(id) ON DELETE CASCADE,
      day_index INTEGER,
      place_id TEXT,
      amount NUMERIC(14, 2) NOT NULL,
      currency TEXT NOT NULL,
      merchant TEXT NOT NULL DEFAULT '',
      method TEXT NOT NULL DEFAULT 'cash',
      note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_plan_expenses_plan
      ON plan_expenses(plan_id, created_at DESC)`,
  );
};

// 2026-09-22 핀 색 컬럼 + 레거시 카테고리 정규화
export const ensurePlaceMetaSchema = async (): Promise<void> => {
  await pool.query(
    `ALTER TABLE places ADD COLUMN IF NOT EXISTS pin_color TEXT`,
  );
  // 2026-09-28 장소가 계획에 들어간 시각. 예전 행은 비워 둔다
  await pool.query(
    `ALTER TABLE places ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ`,
  );
  await pool.query(
    `UPDATE places SET category = 'attraction'
     WHERE category IN ('hotel', 'other') OR category IS NULL OR category = ''`,
  );
  // 2026-09-23 여행별 커스텀 카테고리
  await pool.query(
    `ALTER TABLE travel_plans
      ADD COLUMN IF NOT EXISTS custom_categories JSONB NOT NULL DEFAULT '[]'::jsonb`,
  );
};
