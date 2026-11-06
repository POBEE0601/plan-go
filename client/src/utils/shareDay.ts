// 2026-11-06 당일 일정을 글자로 보낸다. 길찾기 API는 부르지 않는다
import type { DayAssignment, Place, TravelPlan } from '../types/travel';
import { getDateForDay } from './days';
import { mapsPlaceSearch } from './jsDirections';

export const buildDayShareText = (
  plan: TravelPlan,
  dayIndex: number,
  assignments: DayAssignment[],
  placesById: Record<string, Place>,
): string => {
  const lines = [
    plan.title,
    `${dayIndex}일차 ${getDateForDay(plan.startDate, dayIndex)}`,
  ];
  if (assignments.length === 0) {
    lines.push('이 날에 담긴 장소가 없습니다.');
    return lines.join('\n');
  }
  assignments.forEach((assignment, index) => {
    const place = placesById[assignment.placeId];
    if (!place) return;
    const time = assignment.time ? `${assignment.time} ` : '';
    lines.push(`${index + 1}. ${time}${place.name}`);
    if (assignment.memo?.trim()) lines.push(`   ${assignment.memo.trim()}`);
    lines.push(`   ${mapsPlaceSearch(place)}`);
  });
  return lines.join('\n');
};

export const shareOrCopyText = async (
  text: string,
  title: string,
): Promise<'shared' | 'copied' | 'cancelled'> => {
  const narrow = window.matchMedia('(max-width: 767px)').matches;
  if (narrow && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
};
