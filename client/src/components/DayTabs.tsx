// 2026-11-06 좁은 화면은 6일부터 한 칸으로 넘긴다. 오늘은 표시하고 화살표로 이동
// 2026-09-04 장기간 여행: 근처 일차 윈도우 + 점프
// 2026-09-03 상단 일자 탭 + 일차 이동 드롭 타겟
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { useTravelStore } from '../store/useTravelStore';
import { usePlanUiStore } from '../store/usePlanUiStore';
import {
  dayOptionLabel,
  getDateForDay,
  getDayCount,
  isLongTrip,
  localDateStamp,
  nearbyDays,
} from '../utils/days';
import { BOARD_WIDE_MQ } from '../utils/layout';

interface DayTabsProps {
  canWrite: boolean;
}

function DayTab({
  day,
  date,
  count,
  active,
  today,
  canWrite,
  onSelect,
}: {
  day: number;
  date: string;
  count: number;
  active: boolean;
  today: boolean;
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
      {today && (
        <span
          className={`rounded px-1 py-0.5 text-[10px] font-semibold ${
            active && !isOver ? 'bg-white/20 text-white' : 'bg-primary-100 text-primary-700'
          }`}
        >
          오늘
        </span>
      )}
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
  const [narrow, setNarrow] = useState(
    () => !window.matchMedia(BOARD_WIDE_MQ).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(BOARD_WIDE_MQ);
    const onChange = () => setNarrow(!mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (!selectedPlan) return null;

  const dayCount = getDayCount(selectedPlan.startDate, selectedPlan.endDate);

  const compact = isLongTrip(dayCount);
  const stepper = narrow && dayCount >= 6;
  const visibleDays = compact
    ? nearbyDays(activeDay, dayCount, 3)
    : Array.from({ length: dayCount }, (_, i) => i + 1);
  const todayStamp = localDateStamp();
  const isToday = (day: number) =>
    getDateForDay(selectedPlan.startDate, day) === todayStamp;

  const countOf = (day: number) =>
    selectedPlan.dayAssignments.filter((a) => a.dayIndex === day).length;

  if (stepper) {
    return (
      <div
        data-tour="day-tabs"
        className="flex shrink-0 items-center gap-1.5 border-b border-slate-200 bg-white px-3 py-2"
      >
        <button
          type="button"
          disabled={activeDay <= 1}
          onClick={() => setActiveDay(activeDay - 1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 disabled:opacity-40"
          aria-label="이전 일차"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-slate-800">
          {dayOptionLabel(activeDay, selectedPlan.startDate)}
          {isToday(activeDay) ? ' · 오늘' : ''}
          <span className="ml-1 font-normal text-slate-400">
            {countOf(activeDay)}곳
          </span>
        </p>
        <button
          type="button"
          disabled={activeDay >= dayCount}
          onClick={() => setActiveDay(activeDay + 1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 disabled:opacity-40"
          aria-label="다음 일차"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      data-tour="day-tabs"
      className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 sm:px-4"
    >
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
          today={isToday(day)}
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
