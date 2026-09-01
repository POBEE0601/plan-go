// 2026-09-01 카테고리 이모지 배지
// 2026-08-31 일자 계산 유틸
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

export const CATEGORY_META: Record<
  string,
  { emoji: string; label: string }
> = {
  attraction: { emoji: '🎡', label: '관광' },
  restaurant: { emoji: '🍽️', label: '맛집' },
  hotel: { emoji: '🏨', label: '숙소' },
  cafe: { emoji: '☕', label: '카페' },
  other: { emoji: '📍', label: '기타' },
};

export const CATEGORY_ORDER = [
  'attraction',
  'restaurant',
  'cafe',
  'hotel',
  'other',
] as const;

export const categoryLabel = (category: string): string =>
  CATEGORY_META[category]?.label ?? category;

export const categoryEmoji = (category: string): string =>
  CATEGORY_META[category]?.emoji ?? '📍';

export const categoryBadge = (category: string): string => {
  const meta = CATEGORY_META[category];
  if (!meta) return category;
  return `${meta.emoji} ${meta.label}`;
};
