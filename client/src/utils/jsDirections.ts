// 2026-09-16 지도 도로선용 driving Directions만 조회. 세션 캐시·inflight 공유
import type { Place } from '../types/travel';

export type TravelModeKey = 'walking' | 'transit' | 'driving';

export interface JsRouteDetail {
  overviewPath: google.maps.LatLngLiteral[];
}

const SESSION_KEY = 'plan-go-dir-cache-v2';
const SESSION_LIMIT = 80;

const cache = new Map<string, JsRouteDetail | null>();
const inflight = new Map<string, Promise<JsRouteDetail | null>>();

const toLiteral = (latLng: google.maps.LatLng): google.maps.LatLngLiteral => ({
  lat: latLng.lat(),
  lng: latLng.lng(),
});

const cacheKey = (
  from: Place,
  to: Place,
  mode: TravelModeKey,
): string =>
  `${from.googlePlaceId || `${from.lat},${from.lng}`}|${
    to.googlePlaceId || `${to.lat},${to.lng}`
  }|${mode}`;

const readSessionMap = (): Record<string, JsRouteDetail | null> => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, JsRouteDetail | null>;
  } catch {
    return {};
  }
};

const writeSession = (key: string, value: JsRouteDetail | null): void => {
  try {
    const all = readSessionMap();
    all[key] = value;
    const keys = Object.keys(all);
    if (keys.length > SESSION_LIMIT) {
      keys.slice(0, keys.length - SESSION_LIMIT).forEach((k) => {
        delete all[k];
      });
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(all));
  } catch {
    // 시크릿/용량 초과 시 메모리 캐시만 사용
  }
};

const remember = (key: string, value: JsRouteDetail | null): void => {
  cache.set(key, value);
  writeSession(key, value);
};

const getCachedRoute = (
  from: Place,
  to: Place,
  mode: TravelModeKey,
): { found: boolean; value: JsRouteDetail | null } => {
  const key = cacheKey(from, to, mode);
  if (cache.has(key)) {
    return { found: true, value: cache.get(key) ?? null };
  }
  const stored = readSessionMap()[key];
  if (stored !== undefined) {
    cache.set(key, stored);
    return { found: true, value: stored };
  }
  return { found: false, value: null };
};

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

const requestRoute = (
  origin: google.maps.LatLngLiteral,
  destination: google.maps.LatLngLiteral,
  mode: TravelModeKey,
): Promise<google.maps.DirectionsResult | null> =>
  new Promise((resolve) => {
    const svc = new google.maps.DirectionsService();
    svc.route(
      {
        origin,
        destination,
        travelMode:
          mode === 'walking'
            ? google.maps.TravelMode.WALKING
            : mode === 'transit'
              ? google.maps.TravelMode.TRANSIT
              : google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          resolve(result);
          return;
        }
        resolve(null);
      },
    );
  });

/** 모드당 1회. 실패해도 재시도하지 않음. 같은 키는 진행 중 Promise를 공유 */
export const fetchJsRoute = async (
  from: Place,
  to: Place,
  mode: TravelModeKey,
): Promise<JsRouteDetail | null> => {
  const key = cacheKey(from, to, mode);
  const cached = getCachedRoute(from, to, mode);
  if (cached.found) return cached.value;

  const pending = inflight.get(key);
  if (pending) return pending;

  const run = (async (): Promise<JsRouteDetail | null> => {
    if (typeof google === 'undefined' || !google.maps?.DirectionsService) {
      return null;
    }

    const raw = await requestRoute(
      { lat: from.lat, lng: from.lng },
      { lat: to.lat, lng: to.lng },
      mode,
    );
    const overviewPath = (raw?.routes[0]?.overview_path ?? []).map(toLiteral);
    const parsed = overviewPath.length ? { overviewPath } : null;
    remember(key, parsed);
    return parsed;
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, run);
  return run;
};
