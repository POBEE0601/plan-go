// 2026-08-31 Maps JS DirectionsService로 실제 경로 조회 (추정 없음)
import type { Place } from '../types/travel';

export type TravelModeKey = 'walking' | 'transit' | 'driving';

export interface JsRouteStep {
  instruction: string;
  distanceText: string;
  durationText: string;
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
  result: google.maps.DirectionsResult;
  mapsUrl: string;
}

const MODE_LABEL: Record<TravelModeKey, string> = {
  walking: '도보',
  transit: '대중교통',
  driving: '차량',
};

const cache = new Map<string, JsRouteDetail | null>();

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

export const buildMapsUrl = (
  from: Place,
  to: Place,
  mode: TravelModeKey,
): string => {
  const origin = encodeURIComponent(
    from.googlePlaceId
      ? `place_id:${from.googlePlaceId}`
      : from.name || `${from.lat},${from.lng}`,
  );
  const destination = encodeURIComponent(
    to.googlePlaceId
      ? `place_id:${to.googlePlaceId}`
      : to.name || `${to.lat},${to.lng}`,
  );
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=${mode}`;
};

const requestRoute = (
  origin: string | google.maps.Place | google.maps.LatLngLiteral,
  destination: string | google.maps.Place | google.maps.LatLngLiteral,
  mode: TravelModeKey,
  extra?: Partial<google.maps.DirectionsRequest>,
): Promise<google.maps.DirectionsResult | null> =>
  new Promise((resolve) => {
    const svc = new google.maps.DirectionsService();
    const request: google.maps.DirectionsRequest = {
      origin,
      destination,
      travelMode: travelModeOf(mode),
      ...extra,
    };
    if (mode === 'transit' && !request.transitOptions) {
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
    result,
    mapsUrl: buildMapsUrl(from, to, mode),
  };
};

export const fetchJsRoute = async (
  from: Place,
  to: Place,
  mode: TravelModeKey,
): Promise<JsRouteDetail | null> => {
  const key = cacheKey(from, to, mode);
  if (cache.has(key)) return cache.get(key) ?? null;
  if (typeof google === 'undefined' || !google.maps?.DirectionsService) {
    return null;
  }

  const extras: Partial<google.maps.DirectionsRequest>[] =
    mode === 'transit'
      ? [
          {
            transitOptions: {
              departureTime: new Date(),
              routingPreference:
                google.maps.TransitRoutePreference.FEWER_TRANSFERS,
            },
          },
          {
            transitOptions: {
              departureTime: new Date(),
              routingPreference:
                google.maps.TransitRoutePreference.LESS_WALKING,
            },
          },
          {},
        ]
      : [{}];

  const pairs: Array<
    [
      string | google.maps.Place | google.maps.LatLngLiteral,
      string | google.maps.Place | google.maps.LatLngLiteral,
    ]
  > = [];
  if (from.googlePlaceId && to.googlePlaceId) {
    pairs.push([
      { placeId: from.googlePlaceId },
      { placeId: to.googlePlaceId },
    ]);
  }
  pairs.push([
    { lat: from.lat, lng: from.lng },
    { lat: to.lat, lng: to.lng },
  ]);
  const fromNamed = [from.name, from.address].filter(Boolean).join(', ');
  const toNamed = [to.name, to.address].filter(Boolean).join(', ');
  if (fromNamed && toNamed) {
    pairs.push([fromNamed, toNamed]);
  }

  for (const extra of extras) {
    for (const [origin, destination] of pairs) {
      const raw = await requestRoute(origin, destination, mode, extra);
      const parsed = raw ? parseResult(raw, mode, from, to) : null;
      if (parsed) {
        cache.set(key, parsed);
        return parsed;
      }
    }
  }

  cache.set(key, null);
  return null;
};

export const fetchJsRoutes = async (
  from: Place,
  to: Place,
): Promise<Partial<Record<TravelModeKey, JsRouteDetail | null>>> => {
  const modes: TravelModeKey[] = ['walking', 'transit', 'driving'];
  const results = await Promise.all(
    modes.map((mode) => fetchJsRoute(from, to, mode)),
  );
  return {
    walking: results[0],
    transit: results[1],
    driving: results[2],
  };
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
