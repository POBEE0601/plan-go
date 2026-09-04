// 2026-09-04 장기간 여행: 근처 일차 윈도우 + 점프
// 2026-09-03 상단 일자 탭 + 일차 이동 드롭 타겟
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { useTravelStore } from '../store/useTravelStore';
import { usePlanUiStore } from '../store/usePlanUiStore';
import {
  dayOptionLabel,
  getDateForDay,
  getDayCount,
  isLongTrip,
  nearbyDays,
} from '../utils/days';

interface DayTabsProps {
  canWrite: boolean;
}

function DayTab({
  day,
  date,
  count,
  active,
  canWrite,
  onSelect,
}: {
  day: number;
  date: string;
  count: number;
  active: boolean;
  canWrite: boolean;
  onSelect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-tab-${day}`,
    data: { type: 'day', dayIndex: day },
    disabled: !canWrite,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      className={`flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-left transition ${
        isOver
          ? 'bg-primary-100 ring-2 ring-primary-400'
          : active
            ? 'bg-primary-600 text-white'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
    >
      <span className="text-sm font-bold">{day}일차</span>
      <span
        className={`text-[11px] ${
          active && !isOver ? 'text-primary-100' : 'text-slate-500'
        }`}
      >
        {date.slice(5)} · {count}
      </span>
    </button>
  );
}

export default function DayTabs({ canWrite }: DayTabsProps) {
  const selectedPlan = useTravelStore((s) => s.selectedPlan);
  const { activeDay, setActiveDay } = usePlanUiStore();

  if (!selectedPlan) return null;

  const dayCount = getDayCount(selectedPlan.startDate, selectedPlan.endDate);
  const compact = isLongTrip(dayCount);
  const visibleDays = compact
    ? nearbyDays(activeDay, dayCount, 3)
    : Array.from({ length: dayCount }, (_, i) => i + 1);

  const countOf = (day: number) =>
    selectedPlan.dayAssignments.filter((a) => a.dayIndex === day).length;

  return (
    <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 sm:px-4">
      {compact && (
        <button
          type="button"
          disabled={activeDay <= 1}
          onClick={() => setActiveDay(activeDay - 1)}
          className="flex h-10 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="이전 일차"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {visibleDays.map((day) => (
        <DayTab
          key={day}
          day={day}
          date={getDateForDay(selectedPlan.startDate, day)}
          count={countOf(day)}
          active={activeDay === day}
          canWrite={canWrite}
          onSelect={() => setActiveDay(day)}
        />
      ))}
      {compact && (
        <>
          <select
            value={activeDay}
            aria-label="일차 점프"
            onChange={(e) => setActiveDay(Number(e.target.value))}
            className="h-10 shrink-0 rounded-lg border border-slate-200 bg-white px-2 text-[12px] font-medium text-slate-700"
          >
            {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {dayOptionLabel(d, selectedPlan.startDate)}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={activeDay >= dayCount}
            onClick={() => setActiveDay(activeDay + 1)}
            className="flex h-10 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="다음 일차"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
