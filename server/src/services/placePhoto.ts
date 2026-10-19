// 2026-10-02 장소 사진은 구글에 한 번만 받고 29일간 우리 저장소에서 보여 준다
// Place Photo 무료 한도는 월 약 1,000건. 900건에서 새 요청을 멈춘다
import { createHash } from 'crypto';
import { pool } from '../db/pool.js';
import { seoulPeriod } from './apiUsage.js';
import { removeStoredObject, savePublicBuffer } from './fileStore.js';

const MONTHLY_CAP = 900;
const CACHE_MS = 29 * 24 * 60 * 60 * 1000;
const MAX_FETCH_PER_PLAN = 20;

export const publicPhotoUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  const value = url.trim();
  if (!value) return undefined;
  if (/maps\.googleapis\.com\/maps\/api\/place\/photo/i.test(value)) return undefined;
  if (/[?&]photo_reference=/i.test(value)) return undefined;
  return value;
};

export const extractPhotoRef = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  const match = url.match(/[?&]photo_reference=([^&]+)/);
  if (!match?.[1]) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

const decodeRef = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const seoulMonth = (): string => seoulPeriod('month');

const cacheKeyFor = (googlePlaceId?: string, photoRef?: string): string => {
  if (googlePlaceId) return `place:${googlePlaceId}`;
  return `ref:${createHash('sha256').update(photoRef ?? '').digest('hex')}`;
};

const storedNameFor = (cacheKey: string): string =>
  `place-photos/${createHash('sha256').update(cacheKey).digest('hex')}.jpg`;

const isFresh = (fetchedAt: Date | string | null | undefined): boolean => {
  if (!fetchedAt) return false;
  return Date.now() - new Date(fetchedAt).getTime() < CACHE_MS;
};

const budgetLeft = async (): Promise<boolean> => {
  const { rows } = await pool.query(
    `SELECT used FROM maps_photo_budget WHERE month = $1`,
    [seoulMonth()],
  );
  return Number(rows[0]?.used ?? 0) < MONTHLY_CAP;
};

const countFetch = async (): Promise<void> => {
  await pool.query(
    `INSERT INTO maps_photo_budget (month, used) VALUES ($1, 1)
     ON CONFLICT (month) DO UPDATE SET used = maps_photo_budget.used + 1`,
    [seoulMonth()],
  );
};

const readCache = async (
  cacheKey: string,
): Promise<{ url: string; storedName: string; fetchedAt: Date } | null> => {
  const { rows } = await pool.query(
    `SELECT url, stored_name, fetched_at FROM place_photo_files WHERE cache_key = $1`,
    [cacheKey],
  );
  const row = rows[0] as
    | { url: string; stored_name: string; fetched_at: Date }
    | undefined;
  if (!row) return null;
  return {
    url: row.url,
    storedName: row.stored_name,
    fetchedAt: row.fetched_at,
  };
};

const dropCache = async (
  cacheKey: string,
  storedName?: string,
): Promise<void> => {
  if (storedName) {
    try {
      await removeStoredObject(storedName);
    } catch {
      // 저장소 삭제가 실패해도 새 사진을 막지 않는다
    }
  }
  await pool.query(`DELETE FROM place_photo_files WHERE cache_key = $1`, [
    cacheKey,
  ]);
};

const failedUntil = new Map<string, number>();

const downloadGooglePhoto = async (photoRef: string): Promise<Buffer | null> => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';
  if (!apiKey) return null;
  const params = new URLSearchParams({
    maxwidth: '400',
    photo_reference: photoRef,
    key: apiKey,
  });
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/photo?${params}`,
    { redirect: 'follow', signal: AbortSignal.timeout(8000) },
  );
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || !type.startsWith('image/')) return null;
  const body = Buffer.from(await res.arrayBuffer());
  if (body.length < 80 || body.length > 2_000_000) return null;
  return body;
};

// 캐시가 있으면 구글을 호출하지 않는다. 없거나 29일이 지났으면 한도가 남을 때만 받는다
export const ensurePlacePhoto = async (input: {
  googlePlaceId?: string;
  photoRef?: string;
}): Promise<{ url: string; fetchedAt: Date } | undefined> => {
  const photoRef = input.photoRef?.trim();
  if (!input.googlePlaceId && !photoRef) return undefined;
  const cacheKey = cacheKeyFor(input.googlePlaceId, photoRef);
  const hit = await readCache(cacheKey);
  if (hit && isFresh(hit.fetchedAt)) {
    return { url: hit.url, fetchedAt: hit.fetchedAt };
  }
  if ((failedUntil.get(cacheKey) ?? 0) > Date.now()) return undefined;
  if (!photoRef) {
    if (hit) await dropCache(cacheKey, hit.storedName);
    return undefined;
  }
  if (!(await budgetLeft())) {
    if (hit) await dropCache(cacheKey, hit.storedName);
    return undefined;
  }

  const image = await downloadGooglePhoto(photoRef);
  if (!image) {
    failedUntil.set(cacheKey, Date.now() + 60 * 60 * 1000);
    if (hit) await dropCache(cacheKey, hit.storedName);
    return undefined;
  }

  const storedName = storedNameFor(cacheKey);
  const url = await savePublicBuffer(storedName, image, 'image/jpeg');
  const fetchedAt = new Date();
  await pool.query(
    `INSERT INTO place_photo_files (cache_key, url, stored_name, fetched_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (cache_key) DO UPDATE
       SET url = EXCLUDED.url, stored_name = EXCLUDED.stored_name, fetched_at = EXCLUDED.fetched_at`,
    [cacheKey, url, storedName, fetchedAt.toISOString()],
  );
  await countFetch();
  return { url, fetchedAt };
};

export const cachedPhotoUrls = async (
  googlePlaceIds: string[],
): Promise<Map<string, string>> => {
  const ids = [...new Set(googlePlaceIds.filter(Boolean))];
  const found = new Map<string, string>();
  if (ids.length === 0) return found;
  const keys = ids.map((id) => `place:${id}`);
  const { rows } = await pool.query(
    `SELECT cache_key, url, fetched_at FROM place_photo_files
     WHERE cache_key = ANY($1::text[])`,
    [keys],
  );
  for (const row of rows as { cache_key: string; url: string; fetched_at: Date }[]) {
    if (!isFresh(row.fetched_at)) continue;
    const id = row.cache_key.slice('place:'.length);
    found.set(id, row.url);
  }
  return found;
};

export const hydratePlanPhotos = async (planId: string): Promise<void> => {
  const { rows } = await pool.query(
    `SELECT id, google_place_id, photo_url, photo_ref, photo_cached_at
     FROM places WHERE plan_id = $1`,
    [planId],
  );
  const pending = (
    rows as {
      id: string;
      google_place_id: string | null;
      photo_url: string | null;
      photo_ref: string | null;
      photo_cached_at: Date | null;
    }[]
  ).filter((row) => {
    const ref = decodeRef(row.photo_ref) || extractPhotoRef(row.photo_url);
    if (!ref) return false;
    const visible = publicPhotoUrl(row.photo_url);
    return !(visible && isFresh(row.photo_cached_at));
  });

  const batch = pending.slice(0, MAX_FETCH_PER_PLAN);
  for (let i = 0; i < batch.length; i += 4) {
    await Promise.all(
      batch.slice(i, i + 4).map(async (row) => {
        const ref = decodeRef(row.photo_ref) || extractPhotoRef(row.photo_url);
        try {
          const saved = await ensurePlacePhoto({
            googlePlaceId: row.google_place_id ?? undefined,
            photoRef: ref,
          });
          await pool.query(
            `UPDATE places
             SET photo_url = $2, photo_ref = COALESCE($3, photo_ref), photo_cached_at = $4
             WHERE id = $1`,
            [
              row.id,
              saved?.url ?? null,
              ref ?? null,
              saved?.fetchedAt.toISOString() ?? null,
            ],
          );
        } catch (err) {
          console.warn('장소 사진 캐시 실패:', err);
        }
      }),
    );
  }
};
