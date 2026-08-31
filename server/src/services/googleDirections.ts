// 2026-08-31 Google Distance Matrix로 이동수단 요약
export interface TransitOption {
  mode: 'walking' | 'transit' | 'driving';
  label: string;
  durationText: string;
  durationSec: number;
  distanceText: string;
  distanceMeters: number;
}

export interface TransitSummary {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  options: TransitOption[];
  recommended: TransitOption | null;
}

const getApiKey = (): string => process.env.GOOGLE_MAPS_API_KEY ?? '';

const MODE_LABEL: Record<string, string> = {
  walking: '도보',
  transit: '대중교통',
  driving: '차량',
};

const fetchMode = async (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  mode: 'walking' | 'transit' | 'driving',
): Promise<TransitOption | null> => {
  const API_KEY = getApiKey();
  if (!API_KEY) return null;

  const params = new URLSearchParams({
    origins: `${fromLat},${fromLng}`,
    destinations: `${toLat},${toLng}`,
    mode,
    language: 'ko',
    key: API_KEY,
  });

  // 대중교통은 departure_time 필수인 경우가 많음
  if (mode === 'transit') {
    params.set('departure_time', 'now');
  }

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`,
  );
  const data = (await res.json()) as {
    status: string;
    rows?: {
      elements: {
        status: string;
        duration?: { text: string; value: number };
        distance?: { text: string; value: number };
      }[];
    }[];
  };

  const element = data.rows?.[0]?.elements?.[0];
  if (!element || element.status !== 'OK' || !element.duration || !element.distance) {
    return null;
  }

  return {
    mode,
    label: MODE_LABEL[mode],
    durationText: element.duration.text,
    durationSec: element.duration.value,
    distanceText: element.distance.text,
    distanceMeters: element.distance.value,
  };
};

// API 실패 시 직선거리 기반 간단 추정
const haversineMeters = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (meters: number): string =>
  meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;

const formatDuration = (sec: number): string => {
  const m = Math.round(sec / 60);
  if (m < 60) return `약 ${m}분`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `약 ${h}시간 ${rem}분` : `약 ${h}시간`;
};

const estimateMode = (
  mode: 'walking' | 'transit' | 'driving',
  meters: number,
): TransitOption => {
  // 도보 4.5km/h, 대중교통 12km/h(+대기), 차량 30km/h 시내 가정
  const speedMps =
    mode === 'walking' ? 4500 / 3600 : mode === 'transit' ? 12000 / 3600 : 30000 / 3600;
  // 대중교통은 대기·환승 여유 +8분
  const waitSec = mode === 'transit' ? 8 * 60 : 0;
  const durationSec = Math.round(meters / speedMps) + waitSec;

  return {
    mode,
    label: MODE_LABEL[mode],
    durationText: formatDuration(durationSec),
    durationSec,
    distanceText: formatDistance(meters),
    distanceMeters: Math.round(meters),
  };
};

const estimateFallback = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): TransitOption[] => {
  const meters = haversineMeters(fromLat, fromLng, toLat, toLng);
  return (
    ['walking', 'transit', 'driving'] as const
  ).map((mode) => estimateMode(mode, meters));
};

const ensureAllModes = (
  options: TransitOption[],
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): TransitOption[] => {
  const meters =
    options[0]?.distanceMeters ??
    Math.round(haversineMeters(fromLat, fromLng, toLat, toLng));

  const byMode = new Map(options.map((o) => [o.mode, o]));
  (['walking', 'transit', 'driving'] as const).forEach((mode) => {
    if (!byMode.has(mode)) {
      byMode.set(mode, estimateMode(mode, meters));
    }
  });

  return ['walking', 'transit', 'driving'].map(
    (mode) => byMode.get(mode as TransitOption['mode'])!,
  );
};

const pickRecommended = (options: TransitOption[]): TransitOption | null => {
  if (!options.length) return null;
  const walking = options.find((o) => o.mode === 'walking');
  // 1.2km 이하는 도보 추천
  if (walking && walking.distanceMeters <= 1200) return walking;
  const transit = options.find((o) => o.mode === 'transit');
  if (transit) return transit;
  return [...options].sort((a, b) => a.durationSec - b.durationSec)[0];
};

export const getTransitSummary = async (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Promise<TransitSummary> => {
  const modes = ['walking', 'transit', 'driving'] as const;

  let options = (
    await Promise.all(
      modes.map((mode) => fetchMode(fromLat, fromLng, toLat, toLng, mode)),
    )
  ).filter((o): o is TransitOption => o != null);

  if (!options.length) {
    options = estimateFallback(fromLat, fromLng, toLat, toLng);
  } else {
    // Google transit이 자주 실패하므로 누락 모드는 추정으로 채움
    options = ensureAllModes(options, fromLat, fromLng, toLat, toLng);
  }

  return {
    from: { lat: fromLat, lng: fromLng },
    to: { lat: toLat, lng: toLng },
    options,
    recommended: pickRecommended(options),
  };
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

const inferRegion = (lat: number, lng: number): string | undefined => {
  // 일본
  if (lat > 24 && lat < 46 && lng > 122 && lng < 146) return 'jp';
  // 한국
  if (lat > 33 && lat < 39 && lng > 124 && lng < 132) return 'kr';
  return undefined;
};

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

  // 2026-08-31 대중교통: 좌표 → 장소명 순으로 재시도 (일본 등은 API 데이터 공백 많음)
  const region = inferRegion(fromLat, fromLng);
  const regionSuffix =
    region === 'jp' ? 'Japan' : region === 'kr' ? 'South Korea' : '';

  const queryPairs: Array<[string | undefined, string | undefined]> = [
    [undefined, undefined],
  ];
  if (mode === 'transit' && fromName?.trim() && toName?.trim()) {
    queryPairs.push([fromName.trim(), toName.trim()]);
    if (regionSuffix) {
      queryPairs.push([
        `${fromName.trim()}, ${regionSuffix}`,
        `${toName.trim()}, ${regionSuffix}`,
      ]);
    }
  }

  const attempts: Record<string, string>[] =
    mode === 'transit'
      ? [
          {},
          { transit_routing_preference: 'fewer_transfers' },
          { transit_routing_preference: 'less_walking' },
        ]
      : [{}];

  let lastStatus = '';
  let lastError = '';

  for (const [fromQuery, toQuery] of queryPairs) {
    for (const extra of attempts) {
      const data = await fetchDirectionsOnce(
        fromLat,
        fromLng,
        toLat,
        toLng,
        mode,
        extra,
        fromQuery,
        toQuery,
      );
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
        return { detail };
      }

      lastStatus = data.status;
      lastError = data.error_message ?? '';
      console.warn(
        `[directions] mode=${mode} status=${data.status}`,
        data.error_message ?? '',
        { extra, fromQuery, toQuery },
      );
    }
  }

  // ZERO_RESULTS는 결제 문제가 아님(일본 대중교통 API 미제공이 흔함)
  const failReason =
    lastError ||
    (lastStatus === 'ZERO_RESULTS'
      ? 'Google Directions API가 이 구간의 대중교통 상세 노선을 제공하지 않습니다. (일본 등 일부 지역에서 흔함) Google 지도 앱에서는 확인 가능할 수 있습니다.'
      : lastStatus === 'REQUEST_DENIED'
        ? 'Directions API 권한/결제/키 설정을 확인하세요.'
        : `Google 응답: ${lastStatus || 'UNKNOWN'}`);

  return { detail: null, failReason };
};

const estimateDetail = (
  mode: 'walking' | 'transit' | 'driving',
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  failReason?: string,
  fromName?: string,
  toName?: string,
): RouteDetail => {
  const opt = estimateMode(
    mode,
    haversineMeters(fromLat, fromLng, toLat, toLng),
  );

  return {
    mode,
    label: opt.label,
    durationText: opt.durationText,
    distanceText: opt.distanceText,
    summary: `${opt.label} 예상 경로`,
    estimated: true,
    failReason,
    mapsUrl: buildMapsUrl(
      fromLat,
      fromLng,
      toLat,
      toLng,
      mode,
      fromName,
      toName,
    ),
    steps: [
      {
        instruction: failReason
          ? `${opt.label} 상세 경로를 불러오지 못했습니다.`
          : `${opt.label}로 이동합니다 (상세 경로를 불러오지 못해 예상치입니다)`,
        distanceText: opt.distanceText,
        durationText: opt.durationText,
        travelMode: mode,
      },
    ],
  };
};

export const getRouteDetails = async (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  fromName?: string,
  toName?: string,
): Promise<{
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  routes: RouteDetail[];
}> => {
  const modes = ['walking', 'transit', 'driving'] as const;
  const fetched = await Promise.all(
    modes.map((mode) =>
      fetchDirectionsDetail(
        fromLat,
        fromLng,
        toLat,
        toLng,
        mode,
        fromName,
        toName,
      ),
    ),
  );

  const routes = modes.map((mode, i) => {
    const item = fetched[i];
    return (
      item.detail ??
      estimateDetail(
        mode,
        fromLat,
        fromLng,
        toLat,
        toLng,
        item.failReason,
        fromName,
        toName,
      )
    );
  });

  return {
    from: { lat: fromLat, lng: fromLng },
    to: { lat: toLat, lng: toLng },
    routes,
  };
};
