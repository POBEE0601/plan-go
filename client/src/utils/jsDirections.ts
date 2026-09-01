// 2026-09-01 Directions 1회만·진행중 요청 합치기·세션 캐시 (자동 재시도 제거)
import type { Place } from '../types/travel';

export type TravelModeKey = 'walking' | 'transit' | 'driving';

export interface JsRouteStep {
  instruction: string;
  durationText: string;
  distanceText: string;
  travelMode: string;
  path: google.maps.LatLngLiteral[];
  start: google.maps.LatLngLiteral;
  end: google.maps.LatLngLiteral;
  transit?: {
    lineName: string;
    vehicleType: string;
    departureStop: string;
    arrivalStop: string;
    numStops?: number;
  };
}

export interface JsRouteDetail {
  mode: TravelModeKey;
  label: string;
  durationText: string;
  durationSec: number;
  distanceText: string;
  distanceMeters: number;
  summary: string;
  steps: JsRouteStep[];
  overviewPath: google.maps.LatLngLiteral[];
  mapsUrl: string;
}

const MODE_LABEL: Record<TravelModeKey, string> = {
  walking: '도보',
  transit: '대중교통',
  driving: '차량',
};

const SESSION_KEY = 'plan-go-dir-cache-v1';
const SESSION_LIMIT = 80;

const cache = new Map<string, JsRouteDetail | null>();
const inflight = new Map<string, Promise<JsRouteDetail | null>>();

const stripHtml = (html: string): string =>
  html
    .replace(/<div[^>]*>/gi, ' · ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

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

const travelModeOf = (mode: TravelModeKey): google.maps.TravelMode => {
  if (mode === 'walking') return google.maps.TravelMode.WALKING;
  if (mode === 'transit') return google.maps.TravelMode.TRANSIT;
  return google.maps.TravelMode.DRIVING;
};

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

/** 네트워크 없이 메모리·세션 캐시만 조회 */
export const getCachedRoute = (
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
  // 2026-09-01 origin=place_id: 는 Maps가 lace_id로 깨뜨림 → 이름 + origin_place_id 사용
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

const requestRoute = (
  origin: google.maps.LatLngLiteral,
  destination: google.maps.LatLngLiteral,
  mode: TravelModeKey,
): Promise<google.maps.DirectionsResult | null> =>
  new Promise((resolve) => {
    const svc = new google.maps.DirectionsService();
    const request: google.maps.DirectionsRequest = {
      origin,
      destination,
      travelMode: travelModeOf(mode),
    };
    if (mode === 'transit') {
      request.transitOptions = {
        departureTime: new Date(),
        modes: [
          google.maps.TransitMode.BUS,
          google.maps.TransitMode.RAIL,
          google.maps.TransitMode.SUBWAY,
          google.maps.TransitMode.TRAIN,
        ],
      };
    }
    svc.route(request, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK && result) {
        resolve(result);
        return;
      }
      resolve(null);
    });
  });

const parseResult = (
  result: google.maps.DirectionsResult,
  mode: TravelModeKey,
  from: Place,
  to: Place,
): JsRouteDetail | null => {
  const route = result.routes[0];
  const leg = route?.legs[0];
  if (!leg) return null;

  const steps: JsRouteStep[] = (leg.steps ?? []).map((step) => {
    const path = (step.path ?? []).map(toLiteral);
    const start = toLiteral(step.start_location);
    const end = toLiteral(step.end_location);
    const item: JsRouteStep = {
      instruction: stripHtml(step.instructions ?? ''),
      distanceText: step.distance?.text ?? '',
      durationText: step.duration?.text ?? '',
      travelMode: String(step.travel_mode ?? mode).toLowerCase(),
      path: path.length ? path : [start, end],
      start,
      end,
    };
    const td = step.transit;
    if (td) {
      item.transit = {
        lineName:
          td.line?.short_name || td.line?.name || MODE_LABEL.transit,
        vehicleType: td.line?.vehicle?.name || td.line?.vehicle?.type || 'TRANSIT',
        departureStop: td.departure_stop?.name ?? '',
        arrivalStop: td.arrival_stop?.name ?? '',
        numStops: td.num_stops,
      };
    }
    return item;
  });

  return {
    mode,
    label: MODE_LABEL[mode],
    durationText: leg.duration?.text ?? '',
    durationSec: leg.duration?.value ?? 0,
    distanceText: leg.distance?.text ?? '',
    distanceMeters: leg.distance?.value ?? 0,
    summary: route.summary || MODE_LABEL[mode],
    steps,
    overviewPath: (route.overview_path ?? []).map(toLiteral),
    mapsUrl: buildMapsUrl(from, to, mode),
  };
};

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
    const parsed = raw ? parseResult(raw, mode, from, to) : null;
    remember(key, parsed);
    return parsed;
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, run);
  return run;
};

export const focusStepOnMap = (
  map: google.maps.Map,
  step: JsRouteStep,
): void => {
  if (step.path.length > 2) {
    const bounds = new google.maps.LatLngBounds();
    step.path.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 56);
    const zoom = map.getZoom();
    if (zoom && zoom > 17) map.setZoom(17);
    return;
  }
  map.panTo(step.start);
  map.setZoom(16);
};
