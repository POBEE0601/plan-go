// 2026-09-23 저장 탭에서 일차별로 거르고, 전체는 일차 순으로 정렬
// 2026-09-23 저장 탭 장소 클릭 시 일정과 같은 메모·카테고리 모달
// 2026-09-23 저장 탭에서 카테고리·핀 색·한 줄 소개 수정
// 2026-09-22 저장 탭: 카테고리 칩 + 장소 목록 + 빈 화면
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Heart, Plus, Trash2 } from 'lucide-react';
import { useTravelStore } from '../store/useTravelStore';
import { usePlanUiStore } from '../store/usePlanUiStore';
import {
  categoryEmoji,
  categoryLabel,
  formatDayMd,
  getDateForDay,
  getDayCount,
  planCategoryIds,
} from '../utils/days';
import PlaceInspector from './PlaceInspector';
import type { PlaceCategory } from '../types/travel';

interface SavedPlacesPanelProps {
  canWrite: boolean;
  searchOpen?: boolean;
}

type DayFilter = 'all' | 'none' | number;

export default function SavedPlacesPanel({
  canWrite,
  searchOpen = false,
}: SavedPlacesPanelProps) {
  const navigate = useNavigate();
  const { selectedPlan, assignToDay, deletePlace } = useTravelStore();
  const activeDay = usePlanUiStore((s) => s.activeDay);
  const [poolFilter, setPoolFilter] = useState<PlaceCategory | 'all'>('all');
  const [dayFilter, setDayFilter] = useState<DayFilter>('all');
  const [query, setQuery] = useState('');
  const [inspectId, setInspectId] = useState<string | null>(null);

  const places = selectedPlan?.places ?? [];
  const dayCount = selectedPlan
    ? getDayCount(selectedPlan.startDate, selectedPlan.endDate)
    : 1;

  const assignmentsByPlace = useMemo(() => {
    const map = new Map<string, { dayIndex: number; order: number }[]>();
    for (const assignment of selectedPlan?.dayAssignments ?? []) {
      const list = map.get(assignment.placeId) ?? [];
      list.push({ dayIndex: assignment.dayIndex, order: assignment.order });
      map.set(assignment.placeId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.dayIndex - b.dayIndex || a.order - b.order);
    }
    return map;
  }, [selectedPlan?.dayAssignments]);

  useEffect(() => {
    setDayFilter('all');
  }, [selectedPlan?.id]);

  const filteredPlaces = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pickedDay =
      typeof dayFilter === 'number' && dayFilter >= 1 && dayFilter <= dayCount
        ? dayFilter
        : null;
    const list = places.filter((p) => {
      if (poolFilter !== 'all' && p.category !== poolFilter) return false;
      const days = assignmentsByPlace.get(p.id) ?? [];
      if (dayFilter === 'none' && days.length > 0) return false;
      if (pickedDay !== null && !days.some((a) => a.dayIndex === pickedDay)) {
        return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.address ?? '').toLowerCase().includes(q)
      );
    });
    const rank = (placeId: string) => {
      const rows = assignmentsByPlace.get(placeId) ?? [];
      if (pickedDay !== null) {
        return rows.find((a) => a.dayIndex === pickedDay)?.order ?? 0;
      }
      if (rows.length === 0) return Number.MAX_SAFE_INTEGER;
      return rows[0].dayIndex * 100000 + rows[0].order;
    };
    return list.sort(
      (a, b) => rank(a.id) - rank(b.id) || a.name.localeCompare(b.name, 'ko'),
    );
  }, [places, poolFilter, query, dayFilter, dayCount, assignmentsByPlace]);

  const inspectPlace = inspectId
    ? (places.find((p) => p.id === inspectId) ?? null)
    : null;
  const inspectAssignment = inspectPlace
    ? (selectedPlan?.dayAssignments.find(
        (a) => a.placeId === inspectPlace.id && a.dayIndex === activeDay,
      ) ??
      selectedPlan?.dayAssignments.find((a) => a.placeId === inspectPlace.id) ??
      null)
    : null;

  useEffect(() => {
    if (!inspectPlace) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInspectId(null);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [inspectPlace]);

  const assignedDaysOf = (placeId: string): number[] =>
    (assignmentsByPlace.get(placeId) ?? []).map((a) => a.dayIndex);

  if (!selectedPlan) return null;

  const tabs: { id: PlaceCategory | 'all'; label: string }[] = [
    { id: 'all', label: '전체' },
    ...planCategoryIds(selectedPlan.customCategories).map((cat) => ({
      id: cat,
      label: categoryLabel(cat),
    })),
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="shrink-0 overflow-x-auto border-b border-slate-100">
        <div className="flex min-w-max px-2">
          {tabs.map((tab) => {
            const active = poolFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPoolFilter(tab.id)}
                className={`shrink-0 border-b-2 px-3 py-2.5 text-sm ${
                  active
                    ? 'border-primary-600 font-semibold text-slate-900'
                    : 'border-transparent text-slate-400'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 overflow-x-auto border-b border-slate-100">
        <div className="flex min-w-max gap-1.5 px-3 py-2">
          {(
            [
              { id: 'all' as const, label: '전체 일차' },
              ...Array.from({ length: dayCount }, (_, i) => {
                const day = i + 1;
                return {
                  id: day as DayFilter,
                  label: `${day}일차 ${formatDayMd(
                    getDateForDay(selectedPlan.startDate, day),
                  )}`,
                };
              }),
              { id: 'none' as const, label: '미배정' },
            ] as { id: DayFilter; label: string }[]
          ).map((chip) => {
            const active = dayFilter === chip.id;
            return (
              <button
                key={String(chip.id)}
                type="button"
                aria-pressed={active}
                onClick={() => setDayFilter(chip.id)}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${
                  active
                    ? 'border-primary-600 bg-primary-600 font-semibold text-white'
                    : 'border-slate-400 bg-white text-slate-600'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {searchOpen && (
        <div className="shrink-0 border-b border-slate-100 px-4 py-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="저장한 장소 검색"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-500"
            autoFocus
          />
        </div>
      )}

      {filteredPlaces.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 text-center">
          <Heart
            className="mb-5 h-16 w-16 text-slate-200"
            strokeWidth={1.4}
          />
          <p className="text-base font-bold text-slate-800">
            장소를 저장하세요!
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {places.length === 0 ? (
              <>
                가고 싶은 장소를 저장해
                <br />
                여행 계획을 세워보세요.
              </>
            ) : (
              '이 조건에 맞는 장소가 없습니다.'
            )}
          </p>
          {places.length === 0 && (
            <button
              type="button"
              onClick={() => navigate('/dashboard?tab=home')}
              className="mt-5 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white"
            >
              여행 홈에서 검색
            </button>
          )}
        </div>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {filteredPlaces.map((place) => {
            const days = assignedDaysOf(place.id);
            return (
              <li
                key={place.id}
                className="border-b border-slate-100 px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setInspectId(place.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    {place.photoUrl ? (
                      <img
                        src={place.photoUrl}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">
                        {categoryEmoji(place.category)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-slate-800">
                        {place.name}
                      </span>
                      {place.address && (
                        <span className="mt-0.5 block truncate text-xs text-slate-400">
                          {place.address}
                        </span>
                      )}
                      <span className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                        {days.map((d) => (
                          <span
                            key={d}
                            className="rounded bg-primary-50 px-1.5 py-0.5 text-primary-700"
                          >
                            {d}일차
                          </span>
                        ))}
                      </span>
                    </span>
                  </button>
                  {canWrite && (
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <button
                        type="button"
                        onClick={() => assignToDay(place.id, activeDay)}
                        className="inline-flex h-8 items-center gap-0.5 rounded-md bg-primary-50 px-2 text-[11px] font-medium text-primary-700"
                      >
                        <Plus className="h-3 w-3" />
                        {activeDay}일
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePlace(place.id)}
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        aria-label="장소 삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {inspectPlace &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
            onClick={() => setInspectId(null)}
          >
            <div
              role="dialog"
              aria-label={`${inspectPlace.name} 상세`}
              className="animate-rise-in flex h-[min(88dvh,42rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <PlaceInspector
                assignment={inspectAssignment}
                place={inspectPlace}
                dayCount={dayCount}
                canWrite={canWrite}
                onClose={() => setInspectId(null)}
                variant="sheet"
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
