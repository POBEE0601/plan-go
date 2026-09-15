// 2026-09-15 Directions API 호출 제거. 구글맵 외부 링크만 생성
import type { Place } from '../types/travel';

export type TravelModeKey = 'walking' | 'transit' | 'driving';

export const buildMapsUrl = (
  from: Place,
  to: Place,
  mode: TravelModeKey,
): string => {
  // origin=place_id: 는 Maps가 lace_id로 깨뜨림 → 이름 + origin_place_id 사용
  const params = new URLSearchParams({
    api: '1',
    origin: from.name?.trim() || `${from.lat},${from.lng}`,
    destination: to.name?.trim() || `${to.lat},${to.lng}`,
    travelmode: mode,
  });
  if (from.googlePlaceId) params.set('origin_place_id', from.googlePlaceId);
  if (to.googlePlaceId) params.set('destination_place_id', to.googlePlaceId);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
};
