// 2026-09-04 장기간 여행: 주 단위 그룹
// 2026-09-01 좌측 일자 아코디언 (PC 사이드·모바일 점프)
import { ChevronDown } from 'lucide-react';
import { useTravelStore } from '../store/useTravelStore';
import { usePlanUiStore } from '../store/usePlanUiStore';
import {
  categoryEmoji,
  formatDayMd,
  getDateForDay,
  getDayCount,
  isLongTrip,
  weekCount,
  weekOfDay,
  weekRange,
} from '../utils/days';
import type { DayAssignment, Place } from '../types/travel';

interface DayAccordionProps {
  onPickDay?: () => void;
}

function DayRow({
  day,
  date,
  assignments,
  placesById,
  open,
  onPick,
}: {
  day: number;
  date: string;
  assignments: DayAssignment[];
  placesById: Record<string, Place>;
  open: boolean;
  onPick: () => void;
}) {
  return (
    <div
      className={`overflow-hidden rounded-lg border ${
        open
          ? 'border-primary-200 bg-primary-50/40'
          : 'border-transparent bg-transparent'
      }`}
    >
      <button
        type="button"
        onClick={onPick}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
            open
              ? 'bg-primary-600 text-white'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {day}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">{day}일차</p>
          <p className="truncate text-[11px] text-slate-400">
            {date} · {assignments.length}곳
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <ul className="space-y-1 border-t border-primary-100 px-2 py-2">
          {assignments.length === 0 ? (
            <li className="px-2 py-2 text-[11px] text-slate-400">
              아직 배정된 장소가 없습니다
            </li>
          ) : (
            assignments.map((a) => {
              const place = placesById[a.placeId];
              if (!place) return null;
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-1.5 truncate px-2 py-1 text-xs text-slate-700"
                >
                  <span className="shrink-0">
                    {categoryEmoji(place.category)}
                  </span>
                  <span className="truncate">{place.name}</span>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

export default function DayAccordion({ onPickDay }: DayAccordionProps) {
  const selectedPlan = useTravelStore((s) => s.selectedPlan);
  const { activeDay, setActiveDay } = usePlanUiStore();

  if (!selectedPlan) {
    return (
      <p className="px-3 py-4 text-center text-xs text-slate-400">
        여행을 선택하면 일자가 표시됩니다
      </p>
    );
  }

  const dayCount = getDayCount(selectedPlan.startDate, selectedPlan.endDate);
  const placesById = Object.fromEntries(
    selectedPlan.places.map((p) => [p.id, p]),
  );
  const compact = isLongTrip(dayCount);
  const activeWeek = weekOfDay(activeDay);

  const assignmentsOf = (day: number) =>
    selectedPlan.dayAssignments
      .filter((d) => d.dayIndex === day)
      .sort((a, b) => a.order - b.order);

  const pickDay = (day: number) => {
    setActiveDay(day);
    onPickDay?.();
  };

  const renderDay = (day: number) => (
    <DayRow
      key={day}
      day={day}
      date={getDateForDay(selectedPlan.startDate, day)}
      assignments={assignmentsOf(day)}
      placesById={placesById}
      open={activeDay === day}
      onPick={() => pickDay(day)}
    />
  );

  if (!compact) {
    return (
      <div className="flex flex-col gap-1 p-2">
        {Array.from({ length: dayCount }, (_, i) => i + 1).map(renderDay)}
      </div>
    );
  }

  const weeks = Array.from({ length: weekCount(dayCount) }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-2 p-2">
      {weeks.map((week) => {
        const { start, end } = weekRange(week, dayCount);
        const open = week === activeWeek;
        const startMd = formatDayMd(
          getDateForDay(selectedPlan.startDate, start),
        );
        const endMd = formatDayMd(getDateForDay(selectedPlan.startDate, end));
        const placeCount = selectedPlan.dayAssignments.filter(
          (a) => a.dayIndex >= start && a.dayIndex <= end,
        ).length;

        return (
          <div
            key={week}
            className={`overflow-hidden rounded-lg border ${
              open ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                if (activeDay < start || activeDay > end) setActiveDay(start);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left"
            >
              <span className="text-xs font-bold text-slate-700">
                {week}주차
              </span>
              <span className="min-w-0 flex-1 truncate text-[11px] text-slate-400">
                {startMd}–{endMd} · {placeCount}곳
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition ${
                  open ? 'rotate-180' : ''
                }`}
              />
            </button>
            {open && (
              <div className="flex flex-col gap-1 border-t border-slate-100 p-1">
                {Array.from({ length: end - start + 1 }, (_, i) => start + i).map(
                  renderDay,
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
