// 2026-08-31 Google Places 검색·상세 조회 서비스
import type { PlaceCategory, PlaceSearchResult } from '../types/travel.js';

// dotenv 로드 이후에 읽히도록 호출 시점에 조회
const getApiKey = (): string => process.env.GOOGLE_MAPS_API_KEY ?? '';

const mapCategory = (types: string[] = []): PlaceCategory => {
  if (types.some((t) => /restaurant|food|meal/.test(t))) return 'restaurant';
  if (types.some((t) => /cafe|bakery|bar/.test(t))) return 'cafe';
  if (types.some((t) => /lodging|hotel/.test(t))) return 'hotel';
  if (types.some((t) => /tourist|museum|park|zoo|aquarium|attraction/.test(t)))
    return 'attraction';
  return 'other';
};

const photoUrl = (photoReference?: string): string | undefined => {
  const API_KEY = getApiKey();
  if (!photoReference || !API_KEY) return undefined;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${API_KEY}`;
};

interface GoogleTextSearchResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry?: { location: { lat: number; lng: number } };
  rating?: number;
  photos?: { photo_reference: string }[];
  types?: string[];
}

export const searchPlaces = async (
  query: string,
  lat?: number,
  lng?: number,
): Promise<PlaceSearchResult[]> => {
  const API_KEY = getApiKey();
  if (!API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY가 설정되지 않았습니다.');
  }

  const params = new URLSearchParams({
    query,
    key: API_KEY,
    language: 'ko',
  });

  if (lat != null && lng != null) {
    params.set('location', `${lat},${lng}`);
    params.set('radius', '30000');
  }

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`,
  );
  const data = (await res.json()) as {
    status: string;
    results?: GoogleTextSearchResult[];
    error_message?: string;
  };

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(
      data.error_message ?? `Places 검색 실패: ${data.status}`,
    );
  }

  return (data.results ?? []).slice(0, 12).map((item) => {
    const types = item.types ?? [];
    return {
      googlePlaceId: item.place_id,
      name: item.name,
      address: item.formatted_address ?? '',
      lat: item.geometry?.location.lat ?? 0,
      lng: item.geometry?.location.lng ?? 0,
      rating: item.rating,
      photoUrl: photoUrl(item.photos?.[0]?.photo_reference),
      types,
      category: mapCategory(types),
    };
  });
};

export const getPlaceDetails = async (
  placeId: string,
): Promise<PlaceSearchResult | null> => {
  const API_KEY = getApiKey();
  if (!API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY가 설정되지 않았습니다.');
  }

  const params = new URLSearchParams({
    place_id: placeId,
    key: API_KEY,
    language: 'ko',
    fields:
      'place_id,name,formatted_address,geometry,rating,photos,types',
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params}`,
  );
  const data = (await res.json()) as {
    status: string;
    result?: GoogleTextSearchResult;
    error_message?: string;
  };

  if (data.status !== 'OK' || !data.result) {
    return null;
  }

  const item = data.result;
  const types = item.types ?? [];

  return {
    googlePlaceId: item.place_id,
    name: item.name,
    address: item.formatted_address ?? '',
    lat: item.geometry?.location.lat ?? 0,
    lng: item.geometry?.location.lng ?? 0,
    rating: item.rating,
    photoUrl: photoUrl(item.photos?.[0]?.photo_reference),
    types,
    category: mapCategory(types),
  };
};
