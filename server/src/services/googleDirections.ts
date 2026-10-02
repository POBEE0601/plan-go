// 2026-10-02 Distance Matrix 제거. Directions는 하루 캐시, 실패는 10분
// 2026-09-01 Directions/Distance Matrix 과금 가드 (재시도·3모드 자동 호출 제거)
// 콘솔 일일 쿼터: Google Cloud → API 및 서비스 → Directions API → 할당량
import { DAY_MS, recall, remember } from './mapsCache.js';

const MODE_LABEL: Record<string, string> = {
  walking: '도보',
  transit: '대중교통',
  driving: '차량',
};

const getApiKey = (): string => process.env.GOOGLE_MAPS_API_KEY ?? '';

const inferRegion = (lat: number, lng: number): string | undefined => {
  if (lat > 24 && lat < 46 && lng > 122 && lng < 146) return 'jp';
  if (lat > 33 && lat < 39 && lng > 124 && lng < 132) return 'kr';
  return undefined;
};

// --- Directions 상세 단계 ---

export interface RouteStep {
  instruction: string;
  distanceText: string;
  durationText: string;
  travelMode: string;
  transit?: {
    lineName: string;
    vehicleType: string;
    departureStop: string;
    arrivalStop: string;
    numStops?: number;
  };
}

export interface RouteDetail {
  mode: 'walking' | 'transit' | 'driving';
  label: string;
  durationText: string;
  distanceText: string;
  summary: string;
  steps: RouteStep[];
  estimated?: boolean;
  failReason?: string;
  /** Google 지도에서 열기 링크 */
  mapsUrl?: string;
}

interface GoogleDirectionsStep {
  html_instructions?: string;
  distance?: { text: string; value: number };
  duration?: { text: string; value: number };
  travel_mode?: string;
  transit_details?: {
    line?: {
      short_name?: string;
      name?: string;
      vehicle?: { type?: string; name?: string };
    };
    departure_stop?: { name?: string };
    arrival_stop?: { name?: string };
    num_stops?: number;
  };
}

const stripHtml = (html: string): string =>
  html
    .replace(/<div[^>]*>/gi, ' · ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

const fetchDirectionsOnce = async (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  mode: 'walking' | 'transit' | 'driving',
  extra: Record<string, string> = {},
  fromQuery?: string,
  toQuery?: string,
): Promise<{
  status: string;
  error_message?: string;
  routes?: {
    summary?: string;
    legs?: {
      distance?: { text: string };
      duration?: { text: string };
      steps?: GoogleDirectionsStep[];
    }[];
  }[];
}> => {
  const API_KEY = getApiKey();
  const origin = fromQuery?.trim() || `${fromLat},${fromLng}`;
  const destination = toQuery?.trim() || `${toLat},${toLng}`;

  const params = new URLSearchParams({
    origin,
    destination,
    mode,
    language: 'ko',
    key: API_KEY,
    ...extra,
  });

  if (mode === 'transit' && !params.has('departure_time')) {
    params.set('departure_time', String(Math.floor(Date.now() / 1000)));
  }

  const region = inferRegion(fromLat, fromLng);
  if (region && !params.has('region')) {
    params.set('region', region);
  }

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/directions/json?${params}`,
  );
  return (await res.json()) as {
    status: string;
    error_message?: string;
    routes?: {
      summary?: string;
      legs?: {
        distance?: { text: string };
        duration?: { text: string };
        steps?: GoogleDirectionsStep[];
      }[];
    }[];
  };
};

const parseDirectionsResponse = (
  data: {
    status: string;
    routes?: {
      summary?: string;
      legs?: {
        distance?: { text: string };
        duration?: { text: string };
        steps?: GoogleDirectionsStep[];
      }[];
    }[];
  },
  mode: 'walking' | 'transit' | 'driving',
): RouteDetail | null => {
  if (data.status !== 'OK' || !data.routes?.[0]?.legs?.[0]) return null;

  const route = data.routes[0];
  const leg = route.legs![0];
  const steps: RouteStep[] = (leg.steps ?? []).map((step) => {
    const base: RouteStep = {
      instruction: stripHtml(step.html_instructions ?? ''),
      distanceText: step.distance?.text ?? '',
      durationText: step.duration?.text ?? '',
      travelMode: (step.travel_mode ?? mode).toLowerCase(),
    };

    const td = step.transit_details;
    if (td) {
      base.transit = {
        lineName: td.line?.short_name || td.line?.name || '대중교통',
        vehicleType:
          td.line?.vehicle?.name || td.line?.vehicle?.type || 'TRANSIT',
        departureStop: td.departure_stop?.name ?? '',
        arrivalStop: td.arrival_stop?.name ?? '',
        numStops: td.num_stops,
      };
    }

    return base;
  });

  return {
    mode,
    label: MODE_LABEL[mode],
    durationText: leg.duration?.text ?? '',
    distanceText: leg.distance?.text ?? '',
    summary: route.summary || MODE_LABEL[mode],
    steps,
  };
};

const buildMapsUrl = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  mode: string,
  fromName?: string,
  toName?: string,
): string => {
  const origin = encodeURIComponent(fromName?.trim() || `${fromLat},${fromLng}`);
  const destination = encodeURIComponent(
    toName?.trim() || `${toLat},${toLng}`,
  );
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=${mode}`;
};

const fetchDirectionsDetail = async (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  mode: 'walking' | 'transit' | 'driving',
  fromName?: string,
  toName?: string,
): Promise<{ detail: RouteDetail | null; failReason?: string }> => {
  const API_KEY = getApiKey();
  if (!API_KEY) {
    return { detail: null, failReason: 'API 키가 없습니다.' };
  }

  const cacheKey = `dir:${mode}:${fromLat.toFixed(3)}:${fromLng.toFixed(3)}:${toLat.toFixed(3)}:${toLng.toFixed(3)}`;
  const cached = recall<{ detail: RouteDetail | null; failReason?: string }>(
    cacheKey,
  );
  if (cached) {
    if (!cached.detail) return cached;
    return {
      detail: {
        ...cached.detail,
        mapsUrl: buildMapsUrl(
          fromLat,
          fromLng,
          toLat,
          toLng,
          mode,
          fromName,
          toName,
        ),
      },
    };
  }

  // 2026-09-01 재시도 금지: 좌표 기준 1회만 호출
  const data = await fetchDirectionsOnce(fromLat, fromLng, toLat, toLng, mode);
  const detail = parseDirectionsResponse(data, mode);
  if (detail) {
    detail.mapsUrl = buildMapsUrl(
      fromLat,
      fromLng,
      toLat,
      toLng,
      mode,
      fromName,
      toName,
    );
    remember(cacheKey, { detail }, DAY_MS);
    return { detail };
  }

  const failReason =
    data.error_message ||
    (data.status === 'ZERO_RESULTS'
      ? 'Google Directions API가 이 구간의 상세 노선을 제공하지 않습니다. Google 지도 앱에서는 확인 가능할 수 있습니다.'
      : data.status === 'REQUEST_DENIED'
        ? 'Directions API 권한/결제/키 설정을 확인하세요.'
        : `Google 응답: ${data.status || 'UNKNOWN'}`);

  const missed = { detail: null, failReason };
  remember(cacheKey, missed, 10 * 60 * 1000);
  return missed;
};

export const getRouteDetails = async (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  fromName?: string,
  toName?: string,
  onlyMode?: 'walking' | 'transit' | 'driving',
): Promise<{
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  routes: RouteDetail[];
}> => {
  // 2026-09-01 기본은 요청한 1모드만. 3모드 병렬 호출 금지
  const modes = ['walking', 'transit', 'driving'] as const;
  const fetched = await Promise.all(
    modes.map(async (mode) => {
      if (onlyMode && mode !== onlyMode) {
        return { detail: null, failReason: 'not-requested' as string | undefined };
      }
      return fetchDirectionsDetail(
        fromLat,
        fromLng,
        toLat,
        toLng,
        mode,
        fromName,
        toName,
      );
    }),
  );

  const routes = modes.map((mode, i) => {
    const item = fetched[i];
    if (item.detail) return item.detail;
    return {
      mode,
      label: MODE_LABEL[mode],
      durationText: '',
      distanceText: '',
      summary: MODE_LABEL[mode],
      steps: [],
      estimated: false,
      failReason: item.failReason,
      mapsUrl: buildMapsUrl(
        fromLat,
        fromLng,
        toLat,
        toLng,
        mode,
        fromName,
        toName,
      ),
    };
  });

  return {
    from: { lat: fromLat, lng: fromLng },
    to: { lat: toLat, lng: toLng },
    routes,
  };
};
