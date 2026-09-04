// 2026-09-03 상단 일자 탭 + 일차 이동 드롭 타겟
import { useDroppable } from '@dnd-kit/core';
import { useTravelStore } from '../store/useTravelStore';
import { usePlanUiStore } from '../store/usePlanUiStore';
import { getDateForDay, getDayCount } from '../utils/days';

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

  return (
    <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 sm:px-4">
      {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => {
        const count = selectedPlan.dayAssignments.filter(
          (a) => a.dayIndex === day,
        ).length;
        return (
          <DayTab
            key={day}
            day={day}
            date={getDateForDay(selectedPlan.startDate, day)}
            count={count}
            active={activeDay === day}
            canWrite={canWrite}
            onSelect={() => setActiveDay(day)}
          />
        );
      })}
    </div>
  );
}
