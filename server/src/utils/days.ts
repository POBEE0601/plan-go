// 2026-08-31 여행 기간 → Day 개수 유틸

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
