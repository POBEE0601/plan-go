// 2026-09-04 장기간 여행 일차 윈도우·주차 헬퍼
// 2026-09-01 카테고리 이모지 배지
// 2026-08-31 일자 계산 유틸

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
