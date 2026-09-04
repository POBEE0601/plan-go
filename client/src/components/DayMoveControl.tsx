// 2026-09-04 어제/내일 빠른 이동 + 전 일차 드롭다운
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTravelStore } from '../store/useTravelStore';
import { dayOptionLabel } from '../utils/days';

interface DayMoveControlProps {
  currentDay: number;
  dayCount: number;
  onMove: (day: number) => void;
  size?: 'sm' | 'md';
}

export default function DayMoveControl({
  currentDay,
  dayCount,
  onMove,
  size = 'sm',
}: DayMoveControlProps) {
  const startDate = useTravelStore((s) => s.selectedPlan?.startDate);
  if (dayCount <= 1) return null;

  const compact = size === 'sm';
  const prevDay = currentDay - 1;
  const nextDay = currentDay + 1;
  const canPrev = prevDay >= 1;
  const canNext = nextDay <= dayCount;

  const go = (day: number) => {
    if (day < 1 || day > dayCount || day === currentDay) return;
    onMove(day);
  };

  const btnClass = compact
    ? 'inline-flex min-h-8 shrink-0 items-center gap-0.5 rounded bg-slate-50 px-1.5 text-[10px] font-medium text-slate-600 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-50 disabled:hover:text-slate-600'
    : 'inline-flex min-h-8 shrink-0 items-center gap-0.5 rounded-md bg-slate-50 px-2 text-[11px] font-medium text-slate-600 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-50 disabled:hover:text-slate-600';

  const selectClass = compact
    ? 'min-h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[11px] font-medium text-slate-700'
    : 'min-h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[12px] font-medium text-slate-700';

  return (
    <div className="flex min-w-0 items-center gap-1">
      <button
        type="button"
        disabled={!canPrev}
        onClick={() => go(prevDay)}
        className={btnClass}
        aria-label="어제로 이동"
      >
        <ChevronLeft className="h-3 w-3" />
        어제
      </button>
      <select
        value={currentDay}
        aria-label="일차 이동"
        onChange={(e) => go(Number(e.target.value))}
        className={selectClass}
      >
        {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {startDate ? dayOptionLabel(d, startDate) : `${d}일차`}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!canNext}
        onClick={() => go(nextDay)}
        className={btnClass}
        aria-label="내일로 이동"
      >
        내일
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}
