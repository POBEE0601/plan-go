// 2026-09-01 클릭 전 3모드 Directions 금지. 차량은 지도와 캐시 공유
// 2026-09-03 밀도 타임라인용 compact 칩
// 2026-09-04 라이트 모드에서 도보/대중교통 칩 대비 강화
// 2026-09-04 목록의 구글맵 버튼 제거. 팝업 도보 탭에서만 연결
import { useEffect, useState } from 'react';
import { Bus, Car, ChevronRight, Footprints } from 'lucide-react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import {
  fetchJsRoute,
  getCachedRoute,
  type JsRouteDetail,
  type TravelModeKey,
} from '../utils/jsDirections';
import type { Place } from '../types/travel';
import TransitDetailModal from './TransitDetailModal';

interface TransitHintProps {
  from: Place;
  to: Place;
  segmentKey: string;
  compact?: boolean;
}

const MODE_ORDER: TravelModeKey[] = ['walking', 'transit', 'driving'];

const modeIcon = (mode: TravelModeKey) => {
  if (mode === 'walking') return <Footprints className="h-3 w-3" />;
  if (mode === 'transit') return <Bus className="h-3 w-3" />;
  return <Car className="h-3 w-3" />;
};

const modeLabel = (mode: TravelModeKey) =>
  mode === 'walking' ? '도보' : mode === 'transit' ? '대중교통' : '차량';

export default function TransitHint({
  from,
  to,
  segmentKey,
  compact = false,
}: TransitHintProps) {
  const { isLoaded } = useGoogleMaps();
  const [driving, setDriving] = useState<JsRouteDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailMode, setDetailMode] = useState<TravelModeKey>('driving');

  useEffect(() => {
    const cached = getCachedRoute(from, to, 'driving');
    setDriving(cached.found ? cached.value : null);
    if (!isLoaded) return;

    let cancelled = false;
    // 지도와 같은 키라 진행 중이면 합류하고, 없으면 차량 1회만 조회
    fetchJsRoute(from, to, 'driving').then((route) => {
      if (!cancelled) setDriving(route);
    });

    return () => {
      cancelled = true;
    };
  }, [
    isLoaded,
    segmentKey,
    from.id,
    from.lat,
    from.lng,
    from.googlePlaceId,
    to.id,
    to.lat,
    to.lng,
    to.googlePlaceId,
  ]);

  const openDetail = (mode: TravelModeKey) => {
    setDetailMode(mode);
    setDetailOpen(true);
  };

  // 2026-09-03 밀도 타임라인용 한 줄 칩
  if (compact) {
    return (
      <>
        <div className="flex items-center justify-center gap-1 py-0.5">
          {MODE_ORDER.map((mode) => {
            const isDriving = mode === 'driving';
            return (
              <button
                key={mode}
                type="button"
                onClick={() => openDetail(mode)}
                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                  isDriving
                    ? 'bg-primary-50 font-medium text-primary-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {modeIcon(mode)}
                {isDriving && driving ? driving.durationText : modeLabel(mode)}
              </button>
            );
          })}
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

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => openDetail('driving')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDetail('driving');
          }
        }}
        className="my-0.5 w-full cursor-pointer rounded-md border border-dashed border-slate-200 bg-white/80 px-2 py-1.5 text-left transition hover:border-primary-300 hover:bg-primary-50/40"
        title="클릭하면 해당 수단의 상세 경로를 불러옵니다"
      >
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {MODE_ORDER.map((mode) => {
                const isDriving = mode === 'driving';
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDetail(mode);
                    }}
                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] hover:ring-1 hover:ring-primary-200 ${
                      isDriving
                        ? 'bg-primary-50 font-medium text-primary-700'
                        : 'text-slate-500'
                    }`}
                  >
                    {modeIcon(mode)}
                    {modeLabel(mode)}{' '}
                    {isDriving && driving ? driving.durationText : '보기'}
                  </button>
                );
              })}
            </div>
            <p className="mt-0.5 text-[10px] text-slate-400">
              {driving
                ? `차량 · ${driving.distanceText} · 다른 수단은 클릭 시 조회`
                : '경로 보기 · 도보·대중교통은 클릭 시에만 조회'}
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
