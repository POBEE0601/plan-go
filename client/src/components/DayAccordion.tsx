// 2026-09-01 좌측 일자 아코디언 (PC 사이드·모바일 점프)
import { ChevronDown } from 'lucide-react';
import { useTravelStore } from '../store/useTravelStore';
import { usePlanUiStore } from '../store/usePlanUiStore';
import {
  categoryEmoji,
  getDateForDay,
  getDayCount,
} from '../utils/days';

interface DayAccordionProps {
  onPickDay?: () => void;
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

  return (
    <div className="flex flex-col gap-1 p-2">
      {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => {
        const assignments = selectedPlan.dayAssignments
          .filter((d) => d.dayIndex === day)
          .sort((a, b) => a.order - b.order);
        const open = activeDay === day;
        const date = getDateForDay(selectedPlan.startDate, day);

        return (
          <div
            key={day}
            className={`overflow-hidden rounded-lg border ${
              open
                ? 'border-primary-200 bg-primary-50/40'
                : 'border-transparent bg-transparent'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setActiveDay(day);
                onPickDay?.();
              }}
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
                <p className="text-sm font-semibold text-slate-800">
                  {day}일차
                </p>
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
      })}
    </div>
  );
}
