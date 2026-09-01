// 2026-09-01 모바일: 하단 시트 레이아웃
// 2026-08-31 상세 길찾기: 실제 Directions + 지도 경로 + 스텝 스크롤 연동
import { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import {
  ArrowRight,
  Bus,
  Car,
  ExternalLink,
  Footprints,
  Loader2,
  MapPin,
  Navigation,
  TrainFront,
  X,
} from 'lucide-react';
import { useGoogleMaps, mapsEmbedKey } from '../hooks/useGoogleMaps';
import {
  buildMapsUrl,
  fetchJsRoutes,
  focusStepOnMap,
  type JsRouteDetail,
  type JsRouteStep,
  type TravelModeKey,
} from '../utils/jsDirections';
import type { Place } from '../types/travel';

interface TransitDetailModalProps {
  open: boolean;
  from: Place;
  to: Place;
  initialMode?: TravelModeKey;
  onClose: () => void;
}

const modeIcon = (mode: string, className = 'h-4 w-4') => {
  if (mode === 'walking' || mode === 'WALKING')
    return <Footprints className={className} />;
  if (mode === 'transit' || mode === 'TRANSIT' || mode === 'train')
    return <Bus className={className} />;
  return <Car className={className} />;
};

const modeLabel = (mode: TravelModeKey) =>
  mode === 'walking' ? '도보' : mode === 'transit' ? '대중교통' : '차량';

const navLabel = (mode: TravelModeKey) =>
  mode === 'driving'
    ? '구글 지도에서 내비 안내'
    : mode === 'transit'
      ? '구글 지도에서 대중교통 길찾기 열기'
      : '구글 지도에서 도보 길찾기 열기';

function MapsNavButton({ href, mode }: { href: string; mode: TravelModeKey }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700"
    >
      {mode === 'driving' ? (
        <Navigation className="h-3.5 w-3.5" />
      ) : (
        <ExternalLink className="h-3.5 w-3.5" />
      )}
      {navLabel(mode)}
    </a>
  );
}

const embedDirectionsUrl = (
  from: Place,
  to: Place,
  mode: TravelModeKey,
): string | null => {
  if (!mapsEmbedKey) return null;
  const origin = from.googlePlaceId
    ? `place_id:${from.googlePlaceId}`
    : `${from.lat},${from.lng}`;
  const destination = to.googlePlaceId
    ? `place_id:${to.googlePlaceId}`
    : `${to.lat},${to.lng}`;
  const params = new URLSearchParams({
    key: mapsEmbedKey,
    origin,
    destination,
    mode,
    language: 'ko',
    units: 'metric',
  });
  return `https://www.google.com/maps/embed/v1/directions?${params}`;
};

export default function TransitDetailModal({
  open,
  from,
  to,
  initialMode,
  onClose,
}: TransitDetailModalProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [routes, setRoutes] = useState<
    Partial<Record<TravelModeKey, JsRouteDetail | null>>
  >({});
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<TravelModeKey>(
    initialMode ?? 'transit',
  );
  const [activeStep, setActiveStep] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const itemRefs = useRef<Record<number, HTMLLIElement | null>>({});
  const skipObserver = useRef(false);

  useEffect(() => {
    if (!open || !isLoaded) return;
    let cancelled = false;
    setLoading(true);
    setRoutes({});
    setActiveMode(initialMode ?? 'transit');
    setActiveStep(0);

    fetchJsRoutes(from, to)
      .then((data) => {
        if (cancelled) return;
        setRoutes(data);
        const preferred =
          data[initialMode ?? 'transit'] ??
          data.transit ??
          data.driving ??
          data.walking;
        if (preferred) setActiveMode(preferred.mode);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, isLoaded, from.id, to.id, from.lat, to.lat, initialMode]);

  const activeRoute = routes[activeMode] ?? null;
  const steps = activeRoute?.steps ?? [];
  const embedUrl = !activeRoute
    ? embedDirectionsUrl(from, to, activeMode)
    : null;
  const mapsUrl = buildMapsUrl(from, to, activeMode);

  const mapCenter = useMemo(
    () => ({
      lat: (from.lat + to.lat) / 2,
      lng: (from.lng + to.lng) / 2,
    }),
    [from.lat, from.lng, to.lat, to.lng],
  );

  const highlightPath = steps[activeStep]?.path ?? [];

  useEffect(() => {
    setActiveStep(0);
    itemRefs.current = {};
  }, [activeMode]);

  useEffect(() => {
    const map = mapRef.current;
    const step = steps[activeStep];
    if (!map || !step) return;
    focusStepOnMap(map, step);
  }, [activeStep, activeMode, steps]);

  useEffect(() => {
    const root = listRef.current;
    if (!root || !steps.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (skipObserver.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const idx = Number((visible.target as HTMLElement).dataset.step);
        if (!Number.isNaN(idx)) setActiveStep(idx);
      },
      {
        root,
        threshold: [0.35, 0.6, 0.9],
        rootMargin: '-12% 0px -55% 0px',
      },
    );

    Object.values(itemRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [steps, activeMode]);

  const selectStep = (idx: number) => {
    skipObserver.current = true;
    setActiveStep(idx);
    itemRefs.current[idx]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
    window.setTimeout(() => {
      skipObserver.current = false;
    }, 400);
  };

  const onMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    const route = routes[activeMode];
    if (route?.overviewPath.length) {
      const bounds = new google.maps.LatLngBounds();
      route.overviewPath.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 40);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-3">
      <div className="flex h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:h-[88vh] sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-800">상세 길찾기</h2>
            <p className="mt-1 flex items-center gap-1 truncate text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary-500" />
              <span className="truncate">{from.name}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{to.name}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2 border-b border-slate-100 px-3 py-2 sm:px-5 sm:py-3">
          {(['walking', 'transit', 'driving'] as const).map((mode) => {
            const route = routes[mode];
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setActiveMode(mode)}
                className={`flex flex-1 flex-col items-center rounded-xl border px-2 py-2 text-xs transition ${
                  activeMode === mode
                    ? 'border-primary-300 bg-primary-50 text-primary-800'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span className="mb-1 flex items-center gap-1 font-medium">
                  {modeIcon(mode, 'h-3.5 w-3.5')}
                  {modeLabel(mode)}
                </span>
                <span className="text-[11px] text-slate-500">
                  {loading
                    ? '조회 중'
                    : route
                      ? route.durationText
                      : '지도에서 확인'}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div
            ref={listRef}
            className="min-h-0 flex-1 overflow-y-auto px-5 py-4 md:max-w-[380px] md:border-r md:border-slate-100"
          >
            {loading || !isLoaded ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 className="mb-2 h-7 w-7 animate-spin text-primary-500" />
                <p className="text-sm">실제 경로를 불러오는 중...</p>
              </div>
            ) : loadError ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                Maps를 불러오지 못했습니다. API 키를 확인하세요.
              </p>
            ) : activeRoute ? (
              <>
                <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">
                    {activeRoute.label} · {activeRoute.durationText}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {activeRoute.distanceText}
                    {activeRoute.summary ? ` · ${activeRoute.summary}` : ''}
                  </p>
                  {(activeMode === 'driving' || activeMode === 'transit') && (
                    <MapsNavButton href={mapsUrl} mode={activeMode} />
                  )}
                </div>
                <ol className="space-y-3">
                  {steps.map((step, idx) => (
                    <StepItem
                      key={`${activeMode}-${idx}`}
                      step={step}
                      index={idx}
                      active={idx === activeStep}
                      isLast={idx === steps.length - 1}
                      onSelect={() => selectStep(idx)}
                      itemRef={(el) => {
                        itemRefs.current[idx] = el;
                      }}
                    />
                  ))}
                </ol>
              </>
            ) : (
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <p className="font-medium text-slate-800">
                  {modeLabel(activeMode)} 상세 경로를 API로 받지 못했습니다.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  오른쪽 지도는 Google 지도 길찾기 결과입니다. 목록을 보려면
                  아래 링크로 지도를 여세요.
                </p>
                <MapsNavButton href={mapsUrl} mode={activeMode} />
              </div>
            )}
          </div>

          <div className="relative h-56 shrink-0 border-t border-slate-100 md:h-auto md:flex-1 md:border-t-0">
            {isLoaded && activeRoute ? (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={mapCenter}
                zoom={11}
                onLoad={onMapLoad}
                onUnmount={() => {
                  mapRef.current = null;
                }}
                options={{
                  streetViewControl: false,
                  mapTypeControl: false,
                  fullscreenControl: false,
                  zoomControl: true,
                }}
              >
                {activeRoute.overviewPath.length > 1 && (
                  <Polyline
                    path={activeRoute.overviewPath}
                    options={{
                      strokeColor: '#94a3b8',
                      strokeWeight: 6,
                      strokeOpacity: 0.9,
                    }}
                  />
                )}
                {highlightPath.length > 1 && (
                  <Polyline
                    path={highlightPath}
                    options={{
                      strokeColor: '#2563eb',
                      strokeWeight: 8,
                      strokeOpacity: 1,
                      zIndex: 2,
                    }}
                  />
                )}
                {steps[activeStep] && (
                  <Marker
                    position={steps[activeStep].start}
                    label={{
                      text: String(activeStep + 1),
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: '700',
                    }}
                  />
                )}
              </GoogleMap>
            ) : embedUrl ? (
              <iframe
                title={`${modeLabel(activeMode)} 경로`}
                src={embedUrl}
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-slate-50 text-xs text-slate-400">
                지도를 불러오는 중...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepItem({
  step,
  index,
  active,
  isLast,
  onSelect,
  itemRef,
}: {
  step: JsRouteStep;
  index: number;
  active: boolean;
  isLast: boolean;
  onSelect: () => void;
  itemRef: (el: HTMLLIElement | null) => void;
}) {
  return (
    <li
      ref={itemRef}
      data-step={index}
      onClick={onSelect}
      className={`flex cursor-pointer gap-3 rounded-xl p-1.5 transition ${
        active ? 'bg-primary-50 ring-1 ring-primary-200' : 'hover:bg-slate-50'
      }`}
    >
      <div className="flex w-6 shrink-0 flex-col items-center">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
            active
              ? 'bg-primary-600 text-white'
              : 'bg-primary-100 text-primary-700'
          }`}
        >
          {index + 1}
        </span>
        {!isLast && <span className="mt-1 w-px flex-1 bg-slate-200" />}
      </div>
      <div className="min-w-0 flex-1 pb-2">
        {step.transit ? (
          <div className="rounded-lg border border-primary-100 bg-white p-2.5">
            <p className="flex items-center gap-1.5 text-sm font-medium text-primary-800">
              <TrainFront className="h-3.5 w-3.5" />
              {step.transit.lineName}
              <span className="font-normal text-primary-600">
                ({step.transit.vehicleType})
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {step.transit.departureStop}
              <ArrowRight className="mx-1 inline h-3 w-3" />
              {step.transit.arrivalStop}
              {step.transit.numStops != null &&
                ` · ${step.transit.numStops}정거장`}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {step.durationText} · {step.distanceText}
            </p>
          </div>
        ) : (
          <>
            <p className="flex items-start gap-1.5 text-sm text-slate-700">
              <span className="mt-0.5 text-slate-400">
                {modeIcon(step.travelMode, 'h-3.5 w-3.5')}
              </span>
              {step.instruction || '이동'}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {step.durationText}
              {step.distanceText ? ` · ${step.distanceText}` : ''}
            </p>
          </>
        )}
      </div>
    </li>
  );
}
