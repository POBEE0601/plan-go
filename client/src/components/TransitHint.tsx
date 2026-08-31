// 2026-08-31 장소 간 이동수단 요약 + 클릭 시 상세 팝업
import { useEffect, useState } from 'react';
import { Bus, Car, ChevronRight, Footprints, Loader2 } from 'lucide-react';
import { placesApi } from '../utils/api';
import type { Place, TransitOption, TransitSummary } from '../types/travel';
import TransitDetailModal from './TransitDetailModal';

interface TransitHintProps {
  from: Place;
  to: Place;
  /** 일차 내 구간 식별자 — 순서 바뀌면 값이 바뀌어 재요청 */
  segmentKey: string;
}

const modeIcon = (mode: TransitOption['mode']) => {
  if (mode === 'walking') return <Footprints className="h-3 w-3" />;
  if (mode === 'transit') return <Bus className="h-3 w-3" />;
  return <Car className="h-3 w-3" />;
};

export default function TransitHint({ from, to, segmentKey }: TransitHintProps) {
  const [summary, setSummary] = useState<TransitSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailMode, setDetailMode] = useState<TransitOption['mode']>('transit');

  useEffect(() => {
    let cancelled = false;
    setSummary(null);
    setLoading(true);

    placesApi
      .transit(from.lat, from.lng, to.lat, to.lng)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [segmentKey, from.id, from.lat, from.lng, to.id, to.lat, to.lng]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-1 text-slate-300">
        <Loader2 className="h-3 w-3 animate-spin" />
      </div>
    );
  }

  if (!summary?.options.length) return null;

  const ordered = (['walking', 'transit', 'driving'] as const)
    .map((mode) => summary.options.find((o) => o.mode === mode))
    .filter((o): o is TransitOption => o != null);

  const recMode = summary.recommended?.mode;

  const openDetail = (mode?: TransitOption['mode']) => {
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
              {ordered.map((o) => {
                const isRec = o.mode === recMode;
                return (
                  <button
                    key={o.mode}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDetail(o.mode);
                    }}
                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] hover:ring-1 hover:ring-primary-200 ${
                      isRec
                        ? 'bg-primary-50 font-medium text-primary-700'
                        : 'text-slate-500'
                    }`}
                  >
                    {modeIcon(o.mode)}
                    {o.label} {o.durationText}
                  </button>
                );
              })}
            </div>
            {summary.recommended && (
              <p className="mt-0.5 text-[10px] text-slate-400">
                추천 · {summary.recommended.distanceText} · 클릭하여 상세 보기
              </p>
            )}
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
