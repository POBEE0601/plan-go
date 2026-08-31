// 2026-08-31 스키마 적용 후 로컬 db.json을 Supabase로 이전
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '../../.env') });

if (!process.env.DATABASE_URL?.trim()) {
  console.error(
    'DATABASE_URL이 없습니다.\nSupabase Dashboard → Project Settings → Database → Connection string (URI)을 server/.env에 넣으세요.',
  );
  process.exit(1);
}

const { pool } = await import('../db/pool.js');

interface JsonDb {
  users?: Array<{
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    createdAt: string;
  }>;
  travelPlans?: Array<{
    id: string;
    userId: string;
    title: string;
    startDate: string;
    endDate: string;
    regionName?: string;
    regionLat?: number;
    regionLng?: number;
    places?: Array<Record<string, unknown>>;
    dayAssignments?: Array<Record<string, unknown>>;
    members?: Array<Record<string, unknown>>;
  }>;
  boardPosts?: Array<Record<string, unknown>>;
  boardComments?: Array<Record<string, unknown>>;
  boardLikes?: Array<Record<string, unknown>>;
  noticePosts?: Array<Record<string, unknown>>;
  releasePosts?: Array<Record<string, unknown>>;
}

const applySchema = async (): Promise<void> => {
  const sqlPath = path.join(__dirname, '../../sql/001_init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  // 주석 제거 후 문장 단위 실행
  const statements = sql
    .split(';')
    .map((chunk) =>
      chunk
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim(),
    )
    .filter((s) => s.length > 0);
  for (const statement of statements) {
    await pool.query(statement);
  }
  console.log('스키마 적용 완료');
};

const importJson = async (): Promise<void> => {
  const jsonPath = path.join(__dirname, '../../data/db.json');
  if (!fs.existsSync(jsonPath)) {
    console.log('server/data/db.json이 없어 데이터 이전을 건너뜁니다.');
    return;
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as JsonDb;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const user of data.users ?? []) {
      await client.query(
        `INSERT INTO users (id, email, password_hash, name, created_at)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO NOTHING`,
        [user.id, user.email, user.passwordHash, user.name, user.createdAt],
      );
    }

    for (const plan of data.travelPlans ?? []) {
      await client.query(
        `INSERT INTO travel_plans
          (id, user_id, title, start_date, end_date, region_name, region_lat, region_lng)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (id) DO NOTHING`,
        [
          plan.id,
          plan.userId,
          plan.title,
          plan.startDate,
          plan.endDate,
          plan.regionName ?? null,
          plan.regionLat ?? null,
          plan.regionLng ?? null,
        ],
      );

      for (const place of plan.places ?? []) {
        await client.query(
          `INSERT INTO places
            (id, plan_id, google_place_id, name, address, lat, lng, category, rating, photo_url, memo, types)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           ON CONFLICT (id) DO NOTHING`,
          [
            place.id,
            place.planId ?? plan.id,
            place.googlePlaceId ?? null,
            place.name,
            place.address ?? '',
            place.lat,
            place.lng,
            place.category ?? 'other',
            place.rating ?? null,
            place.photoUrl ?? null,
            place.memo ?? null,
            place.types ? JSON.stringify(place.types) : null,
          ],
        );
      }

      for (const day of plan.dayAssignments ?? []) {
        await client.query(
          `INSERT INTO day_assignments
            (id, plan_id, place_id, day_index, sort_order, time, memo)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (id) DO NOTHING`,
          [
            day.id,
            day.planId ?? plan.id,
            day.placeId,
            day.dayIndex,
            day.order ?? 0,
            day.time ?? null,
            day.memo ?? null,
          ],
        );
      }

      for (const member of plan.members ?? []) {
        await client.query(
          `INSERT INTO plan_members
            (id, plan_id, user_id, email, name, role, status, invite_token, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (id) DO NOTHING`,
          [
            member.id,
            member.planId ?? plan.id,
            member.userId ?? '',
            member.email ?? '',
            member.name ?? '',
            member.role,
            member.status,
            member.inviteToken ?? null,
            member.createdAt ?? new Date().toISOString(),
          ],
        );
      }
    }

    for (const post of data.boardPosts ?? []) {
      await client.query(
        `INSERT INTO board_posts
          (id, author_id, title, content, attachments, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO NOTHING`,
        [
          post.id,
          post.authorId,
          post.title,
          post.content,
          JSON.stringify(post.attachments ?? []),
          post.createdAt,
          post.updatedAt,
        ],
      );
    }

    for (const comment of data.boardComments ?? []) {
      await client.query(
        `INSERT INTO board_comments (id, post_id, author_id, content, created_at)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO NOTHING`,
        [
          comment.id,
          comment.postId,
          comment.authorId,
          comment.content,
          comment.createdAt,
        ],
      );
    }

    for (const like of data.boardLikes ?? []) {
      await client.query(
        `INSERT INTO board_likes (post_id, user_id, created_at)
         VALUES ($1,$2,$3)
         ON CONFLICT (post_id, user_id) DO NOTHING`,
        [like.postId, like.userId, like.createdAt],
      );
    }

    for (const post of data.noticePosts ?? []) {
      await client.query(
        `INSERT INTO notice_posts
          (id, author_id, title, content, attachments, view_count, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (id) DO NOTHING`,
        [
          post.id,
          post.authorId,
          post.title,
          post.content,
          JSON.stringify(post.attachments ?? []),
          post.viewCount ?? 0,
          post.createdAt,
          post.updatedAt,
        ],
      );
    }

    for (const post of data.releasePosts ?? []) {
      await client.query(
        `INSERT INTO release_posts
          (id, author_id, title, content, status, released_at, attachments, view_count, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [
          post.id,
          post.authorId,
          post.title,
          post.content,
          post.status,
          post.releasedAt,
          JSON.stringify(post.attachments ?? []),
          post.viewCount ?? 0,
          post.createdAt,
          post.updatedAt,
        ],
      );
    }

    await client.query('COMMIT');
    console.log(
      `데이터 이전 완료: users=${data.users?.length ?? 0}, plans=${data.travelPlans?.length ?? 0}`,
    );
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

try {
  await applySchema();
  await importJson();
  const counts = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM travel_plans) AS plans,
      (SELECT COUNT(*) FROM board_posts) AS board,
      (SELECT COUNT(*) FROM notice_posts) AS notices,
      (SELECT COUNT(*) FROM release_posts) AS releases
  `);
  console.log('Supabase 현재 건수:', counts.rows[0]);
} catch (err) {
  console.error('Supabase 설정 실패:', err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
