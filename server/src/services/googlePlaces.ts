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

// 2026-09-01 여행지 근처 병원·의원 (거리순)
export interface NearbyHospital {
  googlePlaceId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  distanceText: string;
  facility: string;
  departments: string[];
  rating?: number;
  openNow?: boolean;
  mapsUrl: string;
  phone?: string;
}

interface NearbySearchItem {
  place_id: string;
  name: string;
  vicinity?: string;
  formatted_address?: string;
  geometry?: { location: { lat: number; lng: number } };
  rating?: number;
  opening_hours?: { open_now?: boolean };
  types?: string[];
}

const toRad = (deg: number): number => (deg * Math.PI) / 180;

const haversineMeters = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number => {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
};

const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

const classifyHospital = (
  name: string,
  types: string[],
): { facility: string; departments: string[] } => {
  const departments: string[] = [];
  const add = (re: RegExp, label: string) => {
    if (re.test(name) && !departments.includes(label)) departments.push(label);
  };

  add(/이비인후|ENT|Oto-?rhino|耳鼻/i, '이비인후과');
  add(/안과|Ophthal|Eye\s*(Clinic|Hospital)|眼科/i, '안과');
  add(/치과|Dental|Dentist|歯科/i, '치과');
  add(/정형외과|Ortho|整形/i, '정형외과');
  add(/소아|Pediatric|Children|小児/i, '소아과');
  add(/피부|Derma|皮膚/i, '피부과');
  add(/산부|Obstet|Gynecol|産婦/i, '산부인과');
  add(/정신|Psychiatr|精神/i, '정신건강의학과');
  add(/내과|Internal Medicine|内科/i, '내과');
  add(/외과|Surgery|外科/i, '외과');
  add(/응급|Emergency|\bER\b|救急/i, '응급실');

  let facility = '병원';
  if (/대학병원|University Hospital|大学病院/i.test(name)) {
    facility = '대학병원';
  } else if (
    /종합병원|General Hospital|Medical Center|総合病院|市民病院|国立|Red Cross|적십자|メディカルセンター/i.test(
      name,
    )
  ) {
    facility = '종합병원';
  } else if (types.includes('dentist') || /치과|Dental/i.test(name)) {
    facility = '치과';
  } else if (types.includes('pharmacy') || /약국|Pharmacy|薬局/i.test(name)) {
    facility = '약국';
  } else if (
    /클리닉|Clinic|의원|医院|クリニック/i.test(name) ||
    types.includes('doctor')
  ) {
    facility = '의원·클리닉';
  } else if (types.includes('hospital')) {
    facility = '병원';
  }

  if (departments.length === 0) {
    if (facility === '대학병원' || facility === '종합병원') {
      departments.push('응급실·종합진료');
    } else if (facility === '치과') {
      departments.push('치과');
    } else {
      departments.push('일반진료');
    }
  }

  return { facility, departments };
};

const nearbyByType = async (
  lat: number,
  lng: number,
  type: string,
): Promise<NearbySearchItem[]> => {
  const API_KEY = getApiKey();
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    rankby: 'distance',
    type,
    language: 'ko',
    key: API_KEY,
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`,
  );
  const data = (await res.json()) as {
    status: string;
    results?: NearbySearchItem[];
    error_message?: string;
  };

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(
      data.error_message ?? `근처 병원 검색 실패: ${data.status}`,
    );
  }

  return data.results ?? [];
};

const getPlacePhone = async (placeId: string): Promise<string | undefined> => {
  const API_KEY = getApiKey();
  const params = new URLSearchParams({
    place_id: placeId,
    key: API_KEY,
    language: 'ko',
    fields: 'international_phone_number,formatted_phone_number',
  });
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params}`,
  );
  const data = (await res.json()) as {
    status: string;
    result?: {
      international_phone_number?: string;
      formatted_phone_number?: string;
    };
  };
  if (data.status !== 'OK' || !data.result) return undefined;
  return (
    data.result.international_phone_number ||
    data.result.formatted_phone_number
  );
};

export const searchNearbyHospitals = async (
  lat: number,
  lng: number,
  options?: { limit?: number; withPhones?: boolean },
): Promise<NearbyHospital[]> => {
  const API_KEY = getApiKey();
  if (!API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY가 설정되지 않았습니다.');
  }

  const limit = Math.min(Math.max(options?.limit ?? 5, 1), 8);
  const results = await nearbyByType(lat, lng, 'hospital');
  const origin = { lat, lng };
  const merged = new Map<string, NearbyHospital>();

  for (const item of results) {
    if (!item.place_id || merged.has(item.place_id)) continue;
    const loc = item.geometry?.location;
    if (!loc) continue;

    const types = item.types ?? [];
    const { facility, departments } = classifyHospital(item.name, types);
    const distanceMeters = haversineMeters(origin, loc);
    const mapsParams = new URLSearchParams({
      api: '1',
      query: item.name,
      query_place_id: item.place_id,
    });

    merged.set(item.place_id, {
      googlePlaceId: item.place_id,
      name: item.name,
      address: item.vicinity ?? item.formatted_address ?? '',
      lat: loc.lat,
      lng: loc.lng,
      distanceMeters,
      distanceText: formatDistance(distanceMeters),
      facility,
      departments,
      rating: item.rating,
      openNow: item.opening_hours?.open_now,
      mapsUrl: `https://www.google.com/maps/search/?${mapsParams.toString()}`,
    });
  }

  const top = [...merged.values()]
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, limit);

  if (options?.withPhones) {
    await Promise.all(
      top.map(async (h) => {
        h.phone = await getPlacePhone(h.googlePlaceId);
      }),
    );
  }

  return top;
};
