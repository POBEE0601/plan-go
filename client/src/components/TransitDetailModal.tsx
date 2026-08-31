// 2026-08-31 이동수단 상세 경로 팝업
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Bus,
  Car,
  ExternalLink,
  Footprints,
  Loader2,
  MapPin,
  TrainFront,
  X,
} from 'lucide-react';
import { placesApi } from '../utils/api';
import type {
  Place,
  RouteDetail,
  RouteDetailsResponse,
  TransitOption,
} from '../types/travel';

interface TransitDetailModalProps {
  open: boolean;
  from: Place;
  to: Place;
  initialMode?: TransitOption['mode'];
  onClose: () => void;
}

const modeIcon = (mode: string, className = 'h-4 w-4') => {
  if (mode === 'walking' || mode === 'WALKING')
    return <Footprints className={className} />;
  if (mode === 'transit' || mode === 'TRANSIT' || mode === 'train')
    return <Bus className={className} />;
  return <Car className={className} />;
};

export default function TransitDetailModal({
  open,
  from,
  to,
  initialMode,
  onClose,
}: TransitDetailModalProps) {
  const [data, setData] = useState<RouteDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeMode, setActiveMode] = useState<TransitOption['mode']>(
    initialMode ?? 'transit',
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setData(null);
    setActiveMode(initialMode ?? 'transit');

    placesApi
      .directions(
        from.lat,
        from.lng,
        to.lat,
        to.lng,
        from.name || from.address,
        to.name || to.address,
      )
      .then((res) => {
        if (cancelled) return;
        setData(res);
        const preferred =
          res.routes.find((r) => r.mode === (initialMode ?? 'transit')) ??
          res.routes.find((r) => !r.estimated) ??
          res.routes[0];
        if (preferred) setActiveMode(preferred.mode);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : '상세 경로를 불러오지 못했습니다.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, from.id, from.lat, from.lng, to.id, to.lat, to.lng, initialMode]);

  if (!open) return null;

  const activeRoute: RouteDetail | undefined = data?.routes.find(
    (r) => r.mode === activeMode,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
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
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2 border-b border-slate-100 px-5 py-3">
          {(['walking', 'transit', 'driving'] as const).map((mode) => {
            const route = data?.routes.find((r) => r.mode === mode);
            const label =
              mode === 'walking'
                ? '도보'
                : mode === 'transit'
                  ? '대중교통'
                  : '차량';
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
                  {label}
                </span>
                <span className="text-[11px] text-slate-500">
                  {route?.durationText ?? '—'}
                </span>
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="mb-2 h-7 w-7 animate-spin text-primary-500" />
              <p className="text-sm">경로를 불러오는 중...</p>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          {!loading && !error && activeRoute && (
            <>
              <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">
                  {activeRoute.label} · {activeRoute.durationText}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {activeRoute.distanceText}
                  {activeRoute.summary ? ` · ${activeRoute.summary}` : ''}
                  {activeRoute.estimated ? ' · 예상 경로' : ''}
                </p>
                {activeRoute.estimated && (
                  <div className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] text-amber-800">
                    <p>
                      {activeRoute.failReason ||
                        '상세 경로를 불러오지 못해 예상 시간·거리를 표시합니다.'}
                    </p>
                    {activeRoute.failReason?.includes('권한') ||
                    activeRoute.failReason?.includes('결제') ? (
                      <p className="mt-1">
                        Google Cloud Console에서 Directions API 활성화와 결제
                        계정을 확인해 주세요.
                      </p>
                    ) : null}
                    {activeRoute.mapsUrl && (
                      <a
                        href={activeRoute.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-[11px] font-medium text-primary-700 ring-1 ring-primary-200 hover:bg-primary-50"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Google 지도에서 {activeRoute.label} 길찾기 열기
                      </a>
                    )}
                  </div>
                )}
              </div>

              <ol className="space-y-3">
                {activeRoute.steps.map((step, idx) => (
                  <li key={idx} className="flex gap-3">
                    <div className="flex w-6 shrink-0 flex-col items-center">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-[11px] font-semibold text-primary-700">
                        {idx + 1}
                      </span>
                      {idx < activeRoute.steps.length - 1 && (
                        <span className="mt-1 w-px flex-1 bg-slate-200" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pb-2">
                      {step.transit ? (
                        <div className="rounded-lg border border-primary-100 bg-primary-50/50 p-2.5">
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
                            {step.distanceText
                              ? ` · ${step.distanceText}`
                              : ''}
                          </p>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
