// 2026-09-16 장소 사이 직선거리 문구 제거
// 2026-09-15 칩 클릭 시 하단 바로가기 시트. 구글맵은 시트에서만 연결
import { useState } from 'react';
import { Bus, Car, ChevronRight, Footprints } from 'lucide-react';
import type { TravelModeKey } from '../utils/jsDirections';
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

function ModeChip({
  mode,
  compact,
  onOpen,
}: {
  mode: TravelModeKey;
  compact: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={
        compact
          ? 'inline-flex items-center gap-0.5 rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700 hover:bg-primary-100'
          : 'inline-flex items-center gap-1 rounded-full bg-primary-50 px-1.5 py-0.5 text-[11px] font-medium text-primary-700 hover:bg-primary-100 hover:ring-1 hover:ring-primary-200'
      }
    >
      {modeIcon(mode)}
      {modeLabel(mode)}
    </button>
  );
}

export default function TransitHint({
  from,
  to,
  compact = false,
}: TransitHintProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailMode, setDetailMode] = useState<TravelModeKey>('driving');

  const openDetail = (mode: TravelModeKey) => {
    setDetailMode(mode);
    setDetailOpen(true);
  };

  const modal = (
    <TransitDetailModal
      open={detailOpen}
      from={from}
      to={to}
      initialMode={detailMode}
      onClose={() => setDetailOpen(false)}
    />
  );

  if (compact) {
    return (
      <>
        <div className="flex flex-wrap items-center justify-center gap-1 py-0.5">
          {MODE_ORDER.map((mode) => (
            <ModeChip
              key={mode}
              mode={mode}
              compact
              onOpen={() => openDetail(mode)}
            />
          ))}
        </div>
        {modal}
      </>
    );
  }

  return (
    <>
      <div className="my-0.5 w-full rounded-md border border-dashed border-slate-200 bg-white/80 px-2 py-1.5">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {MODE_ORDER.map((mode) => (
                <ModeChip
                  key={mode}
                  mode={mode}
                  compact={false}
                  onOpen={() => openDetail(mode)}
                />
              ))}
            </div>
            <p className="mt-0.5 text-[10px] text-slate-400">
              탭하면 구글 지도 바로가기
            </p>
          </div>
          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
        </div>
      </div>
      {modal}
    </>
  );
}
