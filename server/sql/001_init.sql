-- 2026-08-31 plan-go Supabase(Postgres) 초기 스키마
-- Studio SQL Editor에 붙여 실행하거나 npm run db:setup -w server 로 적용

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS travel_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  region_name TEXT,
  region_lat DOUBLE PRECISION,
  region_lng DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES travel_plans(id) ON DELETE CASCADE,
  google_place_id TEXT,
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  rating DOUBLE PRECISION,
  photo_url TEXT,
  memo TEXT,
  types JSONB
);

CREATE TABLE IF NOT EXISTS day_assignments (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES travel_plans(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  time TEXT,
  memo TEXT
);

CREATE TABLE IF NOT EXISTS plan_members (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES travel_plans(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  invite_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS board_posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS board_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES board_posts(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS board_likes (
  post_id TEXT NOT NULL REFERENCES board_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS notice_posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS release_posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL,
  released_at TIMESTAMPTZ NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_plans_user ON travel_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_places_plan ON places(plan_id);
CREATE INDEX IF NOT EXISTS idx_day_assignments_plan ON day_assignments(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_members_plan ON plan_members(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_members_token ON plan_members(invite_token);
CREATE INDEX IF NOT EXISTS idx_board_comments_post ON board_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_board_likes_post ON board_likes(post_id);
