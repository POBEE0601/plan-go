// 2026-08-31 장소 간 이동: Maps JS 실제 소요시간 (추정 없음)
import { useEffect, useState } from 'react';
import { Bus, Car, ChevronRight, Footprints, Loader2 } from 'lucide-react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import {
  fetchJsRoutes,
  type JsRouteDetail,
  type TravelModeKey,
} from '../utils/jsDirections';
import type { Place } from '../types/travel';
import TransitDetailModal from './TransitDetailModal';

interface TransitHintProps {
  from: Place;
  to: Place;
  segmentKey: string;
}

const MODE_ORDER: TravelModeKey[] = ['walking', 'transit', 'driving'];

const modeIcon = (mode: TravelModeKey) => {
  if (mode === 'walking') return <Footprints className="h-3 w-3" />;
  if (mode === 'transit') return <Bus className="h-3 w-3" />;
  return <Car className="h-3 w-3" />;
};

const pickRecommended = (
  routes: Partial<Record<TravelModeKey, JsRouteDetail | null>>,
): JsRouteDetail | null => {
  const walking = routes.walking;
  if (walking && walking.distanceMeters <= 1200) return walking;
  if (routes.transit) return routes.transit;
  if (routes.driving) return routes.driving;
  return walking ?? null;
};

export default function TransitHint({ from, to, segmentKey }: TransitHintProps) {
  const { isLoaded } = useGoogleMaps();
  const [routes, setRoutes] = useState<
    Partial<Record<TravelModeKey, JsRouteDetail | null>>
  >({});
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailMode, setDetailMode] = useState<TravelModeKey>('transit');

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    setLoading(true);
    setRoutes({});

    fetchJsRoutes(from, to)
      .then((data) => {
        if (!cancelled) setRoutes(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, segmentKey, from.id, from.lat, from.lng, to.id, to.lat, to.lng]);

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center py-1 text-slate-300">
        <Loader2 className="h-3 w-3 animate-spin" />
      </div>
    );
  }

  const recommended = pickRecommended(routes);
  const recMode = recommended?.mode;

  const openDetail = (mode?: TravelModeKey) => {
    setDetailMode(mode ?? recMode ?? 'transit');
    setDetailOpen(true);
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => openDetail()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDetail();
          }
        }}
        className="my-0.5 w-full cursor-pointer rounded-md border border-dashed border-slate-200 bg-white/80 px-2 py-1.5 text-left transition hover:border-primary-300 hover:bg-primary-50/40"
        title="클릭하면 상세 경로를 볼 수 있습니다"
      >
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {MODE_ORDER.map((mode) => {
                const route = routes[mode];
                const isRec = mode === recMode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDetail(mode);
                    }}
                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] hover:ring-1 hover:ring-primary-200 ${
                      isRec
                        ? 'bg-primary-50 font-medium text-primary-700'
                        : 'text-slate-500'
                    }`}
                  >
                    {modeIcon(mode)}
                    {mode === 'walking'
                      ? '도보'
                      : mode === 'transit'
                        ? '대중교통'
                        : '차량'}{' '}
                    {route ? route.durationText : '확인'}
                  </button>
                );
              })}
            </div>
            <p className="mt-0.5 text-[10px] text-slate-400">
              {recommended
                ? `추천 · ${recommended.distanceText} · 클릭하여 상세 보기`
                : '실제 경로 · 클릭하여 지도에서 보기'}
            </p>
          </div>
          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
        </div>
      </div>

      <TransitDetailModal
        open={detailOpen}
        from={from}
        to={to}
        initialMode={detailMode}
        onClose={() => setDetailOpen(false)}
      />
    </>
  );
}
