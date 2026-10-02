// 2026-10-02 도로선용 Directions 호출 제거. 구글 지도 바로가기만 유지
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

// 2026-09-22 origin 생략 → 구글맵이 현위치를 출발지로 쓰는 길찾기
export const mapsDirFromHere = (place: Place): string => {
  const params = new URLSearchParams({
    api: '1',
    destination: `${place.lat},${place.lng}`,
  });
  if (place.googlePlaceId) {
    params.set('destination_place_id', place.googlePlaceId);
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
};
