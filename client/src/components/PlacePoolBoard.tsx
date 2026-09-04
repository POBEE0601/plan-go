// 2026-09-03 밀도 타임라인 + 지도 캔버스 + 풀 슬라이드오버 + 모바일 시트
// 2026-09-04 모바일 타임라인 행 터치 영역 확대
// 2026-09-04 모바일 시트 높이·스크롤 수정 (마지막 장소가 잘리지 않게)
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  GripVertical,
  MapPin,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useTravelStore } from '../store/useTravelStore';
import { usePlanUiStore } from '../store/usePlanUiStore';
import {
  CATEGORY_ORDER,
  categoryBadge,
  categoryEmoji,
  categoryLabel,
  getDateForDay,
  getDayCount,
} from '../utils/days';
import { getCachedRoute } from '../utils/jsDirections';
import type { DayAssignment, Place, PlaceCategory } from '../types/travel';
import TransitHint from './TransitHint';
import DayTimelineMap from './DayTimelineMap';
import DayTabs from './DayTabs';
import PlaceInspector from './PlaceInspector';
import PlaceSearchBar from './PlaceSearchBar';

interface PlacePoolBoardProps {
  canWrite: boolean;
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h <= 0) return `약 ${Math.max(1, m)}분`;
  if (m === 0) return `약 ${h}시간`;
  return `약 ${h}시간 ${m}분`;
}

function dayDrivingSummary(
  assignments: DayAssignment[],
  placesById: Record<string, Place>,
): string {
  const places = assignments
    .map((a) => placesById[a.placeId])
    .filter((p): p is Place => Boolean(p));
  let total = 0;
  let has = false;
  for (let i = 1; i < places.length; i += 1) {
    const cached = getCachedRoute(places[i - 1], places[i], 'driving');
    if (cached.found && cached.value) {
      total += cached.value.durationSec;
      has = true;
    }
  }
  const count = `${assignments.length}곳`;
  return has ? `${count} · ${formatDuration(total)}` : count;
}

function CompactAssignmentRow({
  assignment,
  place,
  pin,
  canWrite,
  selected,
  onFocus,
}: {
  assignment: DayAssignment;
  place: Place;
  pin: number;
  canWrite: boolean;
  selected: boolean;
  onFocus: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: assignment.id,
      data: { type: 'assignment', assignment, place },
      disabled: !canWrite,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      id={`day-place-${assignment.id}`}
      ref={setNodeRef}
      style={style}
      className={`flex min-h-11 items-center gap-0.5 rounded-lg px-1 py-0.5 ${
        selected ? 'bg-primary-50 ring-1 ring-primary-200' : 'hover:bg-slate-50'
      }`}
    >
      {canWrite && (
        <button
          type="button"
          className="min-h-9 min-w-8 cursor-grab touch-none p-1 text-slate-300 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={onFocus}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-2 py-1 text-left"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
          {pin}
        </span>
        <span className="truncate text-sm font-medium text-slate-800">
          {place.name}
        </span>
        <span
          className="ml-auto shrink-0 text-sm"
          title={categoryLabel(place.category)}
        >
          {categoryEmoji(place.category)}
        </span>
      </button>
    </div>
  );
}

function CompactPoolPlace({
  place,
  canWrite,
  activeDay,
  onDelete,
  onAssign,
  onFocus,
}: {
  place: Place;
  canWrite: boolean;
  activeDay: number;
  onDelete: () => void;
  onAssign: (day: number) => void;
  onFocus: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: `pool-${place.id}`,
      data: { type: 'pool', place },
      disabled: !canWrite,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1.5 py-1"
    >
      {canWrite && (
        <button
          type="button"
          className="min-h-9 min-w-8 cursor-grab touch-none p-1 text-slate-300"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={onFocus}
        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
      >
        <span title={categoryLabel(place.category)}>
          {categoryEmoji(place.category)}
        </span>
        <span className="truncate text-[13px] font-medium text-slate-800">
          {place.name}
        </span>
      </button>
      {canWrite && (
        <>
          <button
            type="button"
            onClick={() => onAssign(activeDay)}
            className="flex h-8 items-center gap-0.5 rounded-md bg-primary-50 px-1.5 text-[11px] font-medium text-primary-700 hover:bg-primary-100"
          >
            <Plus className="h-3 w-3" />
            {activeDay}일
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
            aria-label="장소 삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

function CompactTimeline({
  dayIndex,
  assignments,
  placesById,
  canWrite,
}: {
  dayIndex: number;
  assignments: DayAssignment[];
  placesById: Record<string, Place>;
  canWrite: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dayIndex}`,
    data: { type: 'day', dayIndex },
  });
  const selectedAssignmentId = usePlanUiStore((s) => s.selectedAssignmentId);
  const selectAssignment = usePlanUiStore((s) => s.selectAssignment);
  const ids = assignments.map((a) => a.id);

  useEffect(() => {
    if (!selectedAssignmentId) return;
    document
      .getElementById(`day-place-${selectedAssignmentId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedAssignmentId]);

  return (
    <div
      ref={setNodeRef}
      className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-1 pb-[max(1.5rem,env(safe-area-inset-bottom))] ${
        isOver ? 'bg-primary-50/70' : ''
      }`}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {assignments.length === 0 && (
          <p className="px-2 py-8 text-center text-xs text-slate-400">
            {canWrite
              ? '풀에서 드래그하거나 추가해 이 날에 담으세요'
              : '아직 배정된 장소가 없습니다'}
          </p>
        )}
        {assignments.map((a, index) => {
          const place = placesById[a.placeId];
          if (!place) return null;
          const prev =
            index > 0 ? placesById[assignments[index - 1].placeId] : null;
          return (
            <Fragment key={a.id}>
              {prev && (
                <TransitHint
                  from={prev}
                  to={place}
                  segmentKey={`${prev.id}->${place.id}@${index}`}
                  compact
                />
              )}
              <CompactAssignmentRow
                assignment={a}
                place={place}
                pin={index + 1}
                canWrite={canWrite}
                selected={selectedAssignmentId === a.id}
                onFocus={() => selectAssignment(a.id)}
              />
            </Fragment>
          );
        })}
      </SortableContext>
    </div>
  );
}

function PoolPanel({ canWrite }: { canWrite: boolean }) {
  const {
    selectedPlan,
    assignToDay,
    deletePlace,
    setMapCenter,
    setSelectedMapPlace,
  } = useTravelStore();
  const { activeDay, setPoolOpen } = usePlanUiStore();
  const [poolFilter, setPoolFilter] = useState<PlaceCategory | 'all'>('all');

  const filteredPlaces = useMemo(() => {
    const places = selectedPlan?.places ?? [];
    if (poolFilter === 'all') return places;
    return places.filter((p) => p.category === poolFilter);
  }, [selectedPlan, poolFilter]);

  const poolIds = useMemo(
    () => filteredPlaces.map((p) => `pool-${p.id}`),
    [filteredPlaces],
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    selectedPlan?.places.forEach((p) => {
      counts[p.category] = (counts[p.category] ?? 0) + 1;
    });
    return counts;
  }, [selectedPlan]);

  if (!selectedPlan) return null;

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
        <MapPin className="h-4 w-4 text-primary-600" />
        <p className="text-sm font-semibold text-slate-700">
          장소 풀
          <span className="ml-1 font-normal text-slate-400">
            ({selectedPlan.places.length})
          </span>
        </p>
        <button
          type="button"
          onClick={() => setPoolOpen(false)}
          className="ml-auto rounded p-1 text-slate-400 hover:bg-slate-100"
          aria-label="풀 닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex gap-1 overflow-x-auto px-2 py-2">
        <button
          type="button"
          onClick={() => setPoolFilter('all')}
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            poolFilter === 'all'
              ? 'bg-slate-800 text-white'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          전체
        </button>
        {CATEGORY_ORDER.map((cat) => {
          const count = categoryCounts[cat] ?? 0;
          if (!count) return null;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setPoolFilter(cat)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                poolFilter === cat
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {categoryBadge(cat)} {count}
            </button>
          );
        })}
      </div>
      <SortableContext items={poolIds} strategy={verticalListSortingStrategy}>
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2 pb-3">
          {filteredPlaces.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              {selectedPlan.places.length === 0
                ? '지도에서 장소를 검색해 풀에 추가하세요'
                : '이 카테고리의 장소가 없습니다'}
            </p>
          ) : (
            filteredPlaces.map((place) => (
              <CompactPoolPlace
                key={place.id}
                place={place}
                canWrite={canWrite}
                activeDay={activeDay}
                onDelete={() => deletePlace(place.id)}
                onAssign={(day) => assignToDay(place.id, day)}
                onFocus={() => {
                  setMapCenter(place.lat, place.lng);
                  setSelectedMapPlace(place);
                }}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function TimelineChrome({
  canWrite,
  placesById,
}: {
  canWrite: boolean;
  placesById: Record<string, Place>;
}) {
  const selectedPlan = useTravelStore((s) => s.selectedPlan);
  const { activeDay, poolOpen, togglePool } = usePlanUiStore();
  if (!selectedPlan) return null;

  const assignments = selectedPlan.dayAssignments
    .filter((d) => d.dayIndex === activeDay)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">
        {activeDay}일차
        <span className="ml-1 font-normal text-slate-400">
          {getDateForDay(selectedPlan.startDate, activeDay)} ·{' '}
          {dayDrivingSummary(assignments, placesById)}
        </span>
      </p>
      <button
        type="button"
        onClick={togglePool}
        className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium ${
          poolOpen
            ? 'bg-primary-600 text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
      >
        풀 {selectedPlan.places.length}
      </button>
      {!canWrite && (
        <span className="shrink-0 text-[10px] text-slate-400">읽기</span>
      )}
    </div>
  );
}

export default function PlacePoolBoard({ canWrite }: PlacePoolBoardProps) {
  const {
    selectedPlan,
    assignToDay,
    moveAssignment,
    reorderDayAssignments,
  } = useTravelStore();
  const {
    activeDay,
    setActiveDay,
    selectedAssignmentId,
    selectAssignment,
    inspectorOpen,
    closeInspector,
    poolOpen,
    sheetSnap,
    setSheetSnap,
  } = usePlanUiStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(
    () => window.matchMedia('(min-width: 1024px)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 8 },
    }),
  );

  const dayCount = selectedPlan
    ? getDayCount(selectedPlan.startDate, selectedPlan.endDate)
    : 0;

  useEffect(() => {
    if (dayCount > 0 && activeDay > dayCount) setActiveDay(1);
  }, [activeDay, dayCount, setActiveDay]);

  const placesById = useMemo(() => {
    const map: Record<string, Place> = {};
    selectedPlan?.places.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [selectedPlan]);

  const assignments = useMemo(() => {
    if (!selectedPlan) return [];
    return selectedPlan.dayAssignments
      .filter((d) => d.dayIndex === activeDay)
      .sort((a, b) => a.order - b.order);
  }, [selectedPlan, activeDay]);

  const orderedPlaces = assignments
    .map((a) => placesById[a.placeId])
    .filter((p): p is Place => Boolean(p));

  const selectedAssignment =
    selectedPlan?.dayAssignments.find((d) => d.id === selectedAssignmentId) ??
    null;
  const selectedPlace = selectedAssignment
    ? (placesById[selectedAssignment.placeId] ?? null)
    : null;
  const focusPlaceId = selectedPlace?.id ?? null;

  const onSelectMapPlace = (placeId: string) => {
    const assignment = assignments.find((a) => a.placeId === placeId);
    if (assignment) selectAssignment(assignment.id);
  };

  if (!selectedPlan) return null;

  const resolveTargetDay = (
    overId: string,
    overData: Record<string, unknown> | undefined,
  ): number | null => {
    if (overData?.type === 'day') return overData.dayIndex as number;
    if (overData?.type === 'assignment') {
      return (overData.assignment as DayAssignment).dayIndex;
    }
    if (overId.startsWith('day-tab-')) {
      return Number(overId.replace('day-tab-', ''));
    }
    if (overId.startsWith('day-')) {
      return Number(overId.replace('day-', ''));
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    if (!canWrite) return;

    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overId = String(over.id);
    const overData = over.data.current as Record<string, unknown> | undefined;

    if (activeData?.type === 'pool') {
      const place = activeData.place as Place;
      const targetDay = resolveTargetDay(overId, overData);
      if (targetDay) {
        await assignToDay(place.id, targetDay);
        setActiveDay(targetDay);
      }
      return;
    }

    if (activeData?.type === 'assignment') {
      const assignment = activeData.assignment as DayAssignment;
      const targetDay = resolveTargetDay(overId, overData) ?? assignment.dayIndex;

      if (targetDay !== assignment.dayIndex) {
        await moveAssignment(assignment.id, targetDay);
        setActiveDay(targetDay, { keepSelection: true });
        return;
      }

      const dayItems = selectedPlan.dayAssignments
        .filter((d) => d.dayIndex === targetDay)
        .sort((a, b) => a.order - b.order);

      const oldIndex = dayItems.findIndex((d) => d.id === assignment.id);
      let newIndex = dayItems.findIndex((d) => d.id === overId);
      if (newIndex === -1) newIndex = dayItems.length - 1;
      if (oldIndex === newIndex) return;

      const reordered = [...dayItems];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      await reorderDayAssignments(
        targetDay,
        reordered.map((d) => d.id),
      );
    }
  };

  const activePlace = (() => {
    if (!activeId) return null;
    if (activeId.startsWith('pool-')) {
      return placesById[activeId.replace('pool-', '')] ?? null;
    }
    const a = selectedPlan.dayAssignments.find((d) => d.id === activeId);
    return a ? (placesById[a.placeId] ?? null) : null;
  })();

  // 2026-09-04 접힘 → 반열림 → 전체 → 반열림. 핸들로 목록을 더 펼 수 있게
  const onGrabber = () => {
    if (sheetSnap === 'collapsed') {
      setSheetSnap('half');
      return;
    }
    if (sheetSnap === 'half') {
      setSheetSnap('full');
      return;
    }
    closeInspector();
    setSheetSnap('half');
  };

  // 지도 영역 대비 비율이라 DevTools·실기기 모두 같은 비율로 보임
  const sheetHeight =
    sheetSnap === 'collapsed'
      ? 'h-16'
      : sheetSnap === 'full'
        ? 'h-[88%]'
        : 'h-[62%]';

  const inspector = selectedAssignment && selectedPlace && (
    <PlaceInspector
      assignment={selectedAssignment}
      place={selectedPlace}
      dayCount={dayCount}
      canWrite={canWrite}
      onClose={closeInspector}
      variant="float"
    />
  );

  const sheetInspector = selectedAssignment && selectedPlace && (
    <PlaceInspector
      assignment={selectedAssignment}
      place={selectedPlace}
      dayCount={dayCount}
      canWrite={canWrite}
      onClose={closeInspector}
      variant="sheet"
    />
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <DayTabs canWrite={canWrite} />

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {isDesktop && (
            <aside className="relative flex w-[280px] shrink-0 flex-col border-r border-slate-200 bg-white">
              <TimelineChrome canWrite={canWrite} placesById={placesById} />
              <CompactTimeline
                dayIndex={activeDay}
                assignments={assignments}
                placesById={placesById}
                canWrite={canWrite}
              />
              {poolOpen && <PoolPanel canWrite={canWrite} />}
            </aside>
          )}

          <div className="relative min-w-0 flex-1">
            <DayTimelineMap
              places={orderedPlaces}
              focusPlaceId={focusPlaceId}
              onSelectPlace={onSelectMapPlace}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3">
              <PlaceSearchBar canWrite={canWrite} />
            </div>
            {isDesktop && inspectorOpen && inspector && (
              <div className="absolute bottom-3 right-3 z-20 w-80">
                {inspector}
              </div>
            )}
          </div>

          {!isDesktop && (
          <div
            className={`absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-2xl border-t border-slate-200 bg-white shadow-[0_-8px_24px_rgba(15,23,42,0.12)] ${sheetHeight}`}
          >
            <button
              type="button"
              onClick={onGrabber}
              className="flex w-full flex-col items-center pb-1 pt-2"
              aria-label="일정 시트 접기/펼치기"
            >
              <span className="h-1 w-10 rounded-full bg-slate-300" />
              {sheetSnap === 'collapsed' && (
                <p className="mt-1 text-xs text-slate-500">
                  {activeDay}일차 · {dayDrivingSummary(assignments, placesById)}
                </p>
              )}
            </button>
            {sheetSnap !== 'collapsed' && (
              <>
                <TimelineChrome canWrite={canWrite} placesById={placesById} />
                {inspectorOpen && sheetSnap === 'full' ? (
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {sheetInspector}
                  </div>
                ) : (
                  <CompactTimeline
                    dayIndex={activeDay}
                    assignments={assignments}
                    placesById={placesById}
                    canWrite={canWrite}
                  />
                )}
                {poolOpen && <PoolPanel canWrite={canWrite} />}
              </>
            )}
          </div>
          )}
        </div>
      </div>

      <DragOverlay>
        {activePlace && (
          <div className="flex w-52 items-center gap-2 rounded-lg border border-primary-300 bg-white px-2 py-1.5 shadow-lg">
            <span>{categoryEmoji(activePlace.category)}</span>
            <span className="truncate text-sm font-medium">{activePlace.name}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
