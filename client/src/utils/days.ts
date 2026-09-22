// 2026-09-23 커스텀 카테고리 조회·라벨/핀 색 연결
// 2026-09-22 카테고리: 관광지·카페·맛집·디저트&포장·쇼핑 + 핀 색
// 2026-09-04 장기간 여행 일차 윈도우·주차 헬퍼
// 2026-09-01 카테고리 이모지 배지
// 2026-08-31 일자 계산 유틸
import type { CustomCategory } from '../types/travel';

// 이보다 긴 일정은 탭·사이드바를 압축한다
export const LONG_TRIP_DAYS = 10;

export const isLongTrip = (dayCount: number): boolean =>
  dayCount > LONG_TRIP_DAYS;

export const getDayCount = (startDate: string, endDate: string): number => {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
  return Math.max(1, diff + 1);
};

export const getDateForDay = (startDate: string, dayIndex: number): string => {
  const start = new Date(`${startDate}T00:00:00`);
  start.setDate(start.getDate() + (dayIndex - 1));
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, '0');
  const d = String(start.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// 탭 라벨용 MM/DD
export const formatDayMd = (isoDate: string): string =>
  isoDate.slice(5).replace('-', '/');

export const dayOptionLabel = (day: number, startDate: string): string =>
  `${day}일차 · ${formatDayMd(getDateForDay(startDate, day))}`;

// 활성 일차를 중심으로 radius*2+1칸. 가장자리면 반대쪽으로 채운다
export const nearbyDays = (
  active: number,
  count: number,
  radius = 3,
): number[] => {
  if (count <= 0) return [];
  const current = Math.min(Math.max(1, active), count);
  const windowSize = Math.min(count, radius * 2 + 1);
  let start = current - radius;
  let end = start + windowSize - 1;
  if (start < 1) {
    start = 1;
    end = windowSize;
  }
  if (end > count) {
    end = count;
    start = count - windowSize + 1;
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

export const weekOfDay = (day: number): number => Math.ceil(Math.max(1, day) / 7);

export const weekCount = (dayCount: number): number =>
  Math.max(1, Math.ceil(dayCount / 7));

export const weekRange = (
  week: number,
  dayCount: number,
): { start: number; end: number } => {
  const start = (week - 1) * 7 + 1;
  const end = Math.min(week * 7, dayCount);
  return { start, end };
};

export type CategoryMeta = { emoji: string; label: string; pinColor: string };

export const CATEGORY_META: Record<string, CategoryMeta> = {
  attraction: { emoji: '🌳', label: '관광지', pinColor: '#16a34a' },
  cafe: { emoji: '☕', label: '카페', pinColor: '#92400e' },
  restaurant: { emoji: '🍣', label: '맛집', pinColor: '#dc2626' },
  dessert: { emoji: '🍰', label: '디저트&포장', pinColor: '#db2777' },
  shopping: { emoji: '🛍️', label: '쇼핑', pinColor: '#7c3aed' },
};

export const CATEGORY_ORDER = [
  'attraction',
  'cafe',
  'restaurant',
  'dessert',
  'shopping',
] as const;

export const PIN_SWATCHES = [
  '#16a34a',
  '#92400e',
  '#dc2626',
  '#db2777',
  '#7c3aed',
  '#2563eb',
  '#f59e0b',
  '#0f172a',
] as const;

const LEGACY_CATEGORY: Record<string, (typeof CATEGORY_ORDER)[number]> = {
  hotel: 'attraction',
  other: 'attraction',
};

const FALLBACK_META: CategoryMeta = {
  emoji: '📌',
  label: '기타',
  pinColor: '#64748b',
};

let getCustomCategories: () => CustomCategory[] = () => [];

// 2026-09-23 선택된 여행의 커스텀 카테고리를 라벨/핀 색 조회에 연결
export const bindCustomCategoryGetter = (
  getter: () => CustomCategory[],
): void => {
  getCustomCategories = getter;
};

export const isBuiltinCategory = (category?: string): boolean => {
  if (!category) return false;
  return (
    (CATEGORY_ORDER as readonly string[]).includes(category) ||
    Boolean(LEGACY_CATEGORY[category])
  );
};

export const normalizeCategory = (
  category?: string,
): (typeof CATEGORY_ORDER)[number] => {
  if (
    category &&
    (CATEGORY_ORDER as readonly string[]).includes(category)
  ) {
    return category as (typeof CATEGORY_ORDER)[number];
  }
  if (category && LEGACY_CATEGORY[category]) return LEGACY_CATEGORY[category];
  return 'attraction';
};

export const categoryMeta = (category?: string): CategoryMeta => {
  if (isBuiltinCategory(category) || !category) {
    return CATEGORY_META[normalizeCategory(category)];
  }
  const custom = getCustomCategories().find((c) => c.id === category);
  if (custom) {
    return {
      emoji: custom.emoji,
      label: custom.label,
      pinColor: custom.pinColor,
    };
  }
  return { ...FALLBACK_META, label: category };
};

export const resolvePinColor = (
  category?: string,
  pinColor?: string,
): string => {
  if (pinColor) return pinColor;
  return categoryMeta(category).pinColor;
};

export const categoryLabel = (category: string): string =>
  categoryMeta(category).label;

export const categoryEmoji = (category: string): string =>
  categoryMeta(category).emoji;

export const categoryBadge = (category: string): string => {
  const meta = categoryMeta(category);
  return `${meta.emoji} ${meta.label}`;
};

export const planCategoryIds = (customs: CustomCategory[] = []): string[] => [
  ...CATEGORY_ORDER,
  ...customs.map((c) => c.id),
];
