// 2026-10-02 사진 URL·도시 상세 일괄 조회를 빼 과금을 줄인다
// 2026-09-22 장소 카테고리 자동 분류 갱신
// 2026-08-31 Google Places 검색·상세 조회 서비스
import type {
  CitySearchResult,
  CitySuggestion,
  PlaceCategory,
  PlaceSearchResult,
} from '../types/travel.js';
import { DAY_MS, recall, remember } from './mapsCache.js';

// dotenv 로드 이후에 읽히도록 호출 시점에 조회
const getApiKey = (): string => process.env.GOOGLE_MAPS_API_KEY ?? '';

const mapCategory = (types: string[] = []): PlaceCategory => {
  if (types.some((t) => /bakery|dessert|ice_cream|confectionery|meal_takeaway/.test(t)))
    return 'dessert';
  if (types.some((t) => /cafe|coffee|tea/.test(t))) return 'cafe';
  if (types.some((t) => /restaurant|food|meal/.test(t))) return 'restaurant';
  if (
    types.some((t) =>
      /store|shop|mall|clothing|supermarket|department|convenience/.test(t),
    )
  )
    return 'shopping';
  return 'attraction';
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

  const cacheKey = `text:${query.trim().toLowerCase()}:${
    lat != null ? lat.toFixed(2) : ''
  }:${lng != null ? lng.toFixed(2) : ''}`;
  const cached = recall<PlaceSearchResult[]>(cacheKey);
  if (cached) return cached;

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

  const results = (data.results ?? []).slice(0, 8).map((item) => {
    const types = item.types ?? [];
    return {
      googlePlaceId: item.place_id,
      name: item.name,
      address: item.formatted_address ?? '',
      lat: item.geometry?.location.lat ?? 0,
      lng: item.geometry?.location.lng ?? 0,
      rating: item.rating,
      types,
      category: mapCategory(types),
    };
  });
  remember(cacheKey, results, DAY_MS);
  return results;
};

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GooglePlaceDetailsResult extends GoogleTextSearchResult {
  address_components?: AddressComponent[];
}

const componentName = (
  components: AddressComponent[] | undefined,
  type: string,
): string =>
  components?.find((c) => c.types.includes(type))?.long_name?.trim() ?? '';

const toCityResult = (
  item: GooglePlaceDetailsResult,
): CitySearchResult | null => {
  const types = item.types ?? [];
  const isPoi = types.some((t) =>
    /restaurant|lodging|store|cafe|bar|museum|park|airport|station|point_of_interest/.test(
      t,
    ),
  );
  const isCity = types.some((t) =>
    /locality|administrative_area_level_1|administrative_area_level_2|administrative_area_level_3|postal_town|country/.test(
      t,
    ),
  );
  if (isPoi && !isCity) return null;

  const countryName =
    componentName(item.address_components, 'country') ||
    item.formatted_address?.split(',').at(-1)?.trim() ||
    '';
  const cityName =
    componentName(item.address_components, 'locality') ||
    componentName(item.address_components, 'postal_town') ||
    componentName(item.address_components, 'administrative_area_level_1') ||
    item.name;
  if (!cityName || item.geometry?.location == null) return null;

  const label =
    countryName && countryName !== cityName
      ? `${countryName} > ${cityName}`
      : cityName;

  return {
    googlePlaceId: item.place_id,
    cityName,
    countryName: countryName || cityName,
    label,
    address: item.formatted_address ?? label,
    lat: item.geometry.location.lat,
    lng: item.geometry.location.lng,
  };
};

const fetchCityDetails = async (
  placeId: string,
): Promise<CitySearchResult | null> => {
  const API_KEY = getApiKey();
  const params = new URLSearchParams({
    place_id: placeId,
    key: API_KEY,
    language: 'ko',
    fields: 'place_id,name,formatted_address,geometry,address_components,types',
  });
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params}`,
  );
  const data = (await res.json()) as {
    status: string;
    result?: GooglePlaceDetailsResult;
  };
  if (data.status !== 'OK' || !data.result) return null;
  return toCityResult(data.result);
};

// 선택한 도시 1곳만 Place Details를 호출한다
export const getCityDetails = async (
  placeId: string,
): Promise<CitySearchResult | null> => {
  const API_KEY = getApiKey();
  if (!API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY가 설정되지 않았습니다.');
  }
  const cacheKey = `city:${placeId}`;
  const cached = recall<CitySearchResult>(cacheKey);
  if (cached) return cached;
  const detail = await fetchCityDetails(placeId);
  if (detail) remember(cacheKey, detail, 7 * DAY_MS);
  return detail;
};

// 2026-10-02 입력 중에는 자동완성만. 상세 좌표는 선택 후 1회
// 2026-09-04 일정 생성용 국가·도시 검색. POI는 제외
export const searchCities = async (
  query: string,
): Promise<CitySuggestion[]> => {
  const API_KEY = getApiKey();
  if (!API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY가 설정되지 않았습니다.');
  }

  const text = query.trim();
  const cacheKey = `ac:${text.toLowerCase()}`;
  const cached = recall<CitySuggestion[]>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    input: text,
    types: '(cities)',
    language: 'ko',
    key: API_KEY,
  });
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`,
  );
  const data = (await res.json()) as {
    status: string;
    predictions?: {
      place_id: string;
      description: string;
      structured_formatting?: { secondary_text?: string };
    }[];
    error_message?: string;
  };

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(data.error_message ?? `도시 검색 실패: ${data.status}`);
  }

  const suggestions = (data.predictions ?? []).slice(0, 5).map((item) => ({
    googlePlaceId: item.place_id,
    label: item.description,
    address: item.structured_formatting?.secondary_text || item.description,
  }));
  remember(cacheKey, suggestions, DAY_MS);
  return suggestions;
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

const readPlacePhone = async (
  placeId: string,
): Promise<{ ok: boolean; phone: string | null }> => {
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
  if (data.status !== 'OK') return { ok: false, phone: null };
  return {
    ok: true,
    phone:
      data.result?.international_phone_number ||
      data.result?.formatted_phone_number ||
      null,
  };
};

export const lookupPlacePhone = async (
  placeId: string,
): Promise<string | undefined> => {
  const API_KEY = getApiKey();
  if (!API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY가 설정되지 않았습니다.');
  }
  const cacheKey = `phone:${placeId}`;
  const cached = recall<{ phone: string | null }>(cacheKey);
  if (cached) return cached.phone ?? undefined;
  const result = await readPlacePhone(placeId);
  if (!result.ok) return undefined;
  remember(cacheKey, { phone: result.phone }, 7 * DAY_MS);
  return result.phone ?? undefined;
};

export const searchNearbyHospitals = async (
  lat: number,
  lng: number,
  options?: { limit?: number },
): Promise<NearbyHospital[]> => {
  const API_KEY = getApiKey();
  if (!API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY가 설정되지 않았습니다.');
  }

  const limit = Math.min(Math.max(options?.limit ?? 5, 1), 8);
  const cacheKey = `near:${lat.toFixed(3)}:${lng.toFixed(3)}:${limit}`;
  const cached = recall<NearbyHospital[]>(cacheKey);
  if (cached) return cached;

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
  remember(cacheKey, top, DAY_MS);
  return top;
};
