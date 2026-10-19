// 2026-10-06 서버가 Google·Gemini에 실제로 보낸 횟수를 월 단위로 쌓는다
import { pool } from '../db/pool.js';

export type ApiKind =
  | 'places_text'
  | 'places_autocomplete'
  | 'places_details'
  | 'places_phone'
  | 'places_nearby'
  | 'directions'
  | 'directions_transit'
  | 'gemini_chat'
  | 'gemini_receipt';

export interface UsageItem {
  kind: string;
  label: string;
  detail: string;
  used: number;
  limit: number | null;
  today: number | null;
  note: string | null;
}

interface CatalogItem {
  kind: string;
  label: string;
  detail: string;
  limit: number | null;
  note?: string;
  daily?: boolean;
}

// Google Maps Platform 공개 무료 한도 (SKU별, 월). 장소 사진은 기존 900건 가드와 맞춘다.
const CATALOG: CatalogItem[] = [
  {
    kind: 'place_photo',
    label: '장소 사진',
    detail: 'Places Photo',
    limit: 1000,
    note: '900건부터 새 사진 다운로드를 멈춥니다.',
  },
  {
    kind: 'places_text',
    label: '장소 검색',
    detail: 'Text Search',
    limit: 5000,
  },
  {
    kind: 'places_autocomplete',
    label: '도시 자동완성',
    detail: 'Autocomplete',
    limit: 10000,
  },
  {
    kind: 'places_details',
    label: '도시 상세',
    detail: 'Place Details',
    limit: 10000,
  },
  {
    kind: 'places_phone',
    label: '전화번호',
    detail: 'Place Details Contact',
    limit: 5000,
  },
  {
    kind: 'places_nearby',
    label: '근처 병원',
    detail: 'Nearby Search',
    limit: 5000,
  },
  {
    kind: 'directions',
    label: '길찾기 · 도보·자동차',
    detail: 'Directions',
    limit: 10000,
  },
  {
    kind: 'directions_transit',
    label: '길찾기 · 대중교통',
    detail: 'Directions Advanced',
    limit: 5000,
  },
  {
    kind: 'gemini_chat',
    label: 'Gemini 대화',
    detail: 'generateContent',
    limit: null,
    daily: true,
  },
  {
    kind: 'gemini_receipt',
    label: 'Gemini 영수증',
    detail: 'generateContent',
    limit: null,
    daily: true,
  },
];

export const seoulPeriod = (part: 'month' | 'day'): string => {
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return part === 'month' ? formatted.slice(0, 7) : formatted;
};

const bump = async (periods: string[], kind: ApiKind): Promise<void> => {
  await pool.query(
    `INSERT INTO api_usage (period, kind, used)
     SELECT p, $2, 1 FROM unnest($1::text[]) AS p
     ON CONFLICT (period, kind)
     DO UPDATE SET used = api_usage.used + 1`,
    [periods, kind],
  );
};

export const recordApiUse = (kind: ApiKind): void => {
  const periods = [seoulPeriod('month')];
  if (kind === 'gemini_chat' || kind === 'gemini_receipt') {
    periods.push(seoulPeriod('day'));
  }
  void bump(periods, kind).catch((err) => {
    console.warn('API 사용량 기록 실패:', err);
  });
};

const readCounts = async (period: string): Promise<Map<string, number>> => {
  const { rows } = await pool.query(
    `SELECT kind, used FROM api_usage WHERE period = $1`,
    [period],
  );
  const counts = new Map<string, number>();
  for (const row of rows) {
    const record = row as { kind: string; used: number };
    counts.set(record.kind, Number(record.used) || 0);
  }
  return counts;
};

export const getUsageSummary = async (): Promise<{
  month: string;
  usage: UsageItem[];
}> => {
  const month = seoulPeriod('month');
  const today = seoulPeriod('day');
  const [monthCounts, dayCounts, photo] = await Promise.all([
    readCounts(month),
    readCounts(today),
    pool.query(`SELECT used FROM maps_photo_budget WHERE month = $1`, [month]),
  ]);
  const photoUsed = Number(photo.rows[0]?.used ?? 0);

  const usage = CATALOG.map((item) => ({
    kind: item.kind,
    label: item.label,
    detail: item.detail,
    used: item.kind === 'place_photo' ? photoUsed : (monthCounts.get(item.kind) ?? 0),
    limit: item.limit,
    today: item.daily ? (dayCounts.get(item.kind) ?? 0) : null,
    note: item.note ?? null,
  }));

  return { month, usage };
};
