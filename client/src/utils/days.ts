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

export const categoryLabel = (category: string): string => {
  const map: Record<string, string> = {
    attraction: '관광',
    restaurant: '맛집',
    hotel: '숙소',
    cafe: '카페',
    other: '기타',
  };
  return map[category] ?? category;
};
