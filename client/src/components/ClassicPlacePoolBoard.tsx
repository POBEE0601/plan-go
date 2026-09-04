// 2026-09-01 장소 풀 기본 접힘
// 2026-09-01 장소 카드 우측 하단 가까운 병원
// 2026-09-01 일차 카드 요약 정보 + 동선 지도
// 2026-09-01 일자 아코디언·단일 작업영역·카테고리 이모지
// 2026-09-01 모바일: 터치 드래그·삭제 버튼 노출
// 2026-08-31 장소 풀 + Day 보드 (드래그·버튼)
// 2026-09-04 목록형(클래식) 레이아웃으로 분리
// 2026-09-04 라이트 모드 작업영역 배경 고정
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
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  GripVertical,
  MapPin,
  Plus,
  Star,
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
import { briefTypeLabels } from '../utils/placeBrief';
import type { DayAssignment, Place, PlaceCategory } from '../types/travel';
import TransitHint from './TransitHint';
import DayTimelineMap from './DayTimelineMap';
import NearbyHospitalButton from './NearbyHospitalButton';

interface PlacePoolBoardProps {
  canWrite: boolean;
}

function PlaceCardContent({
  place,
  compact,
  pin,
  assignment,
}: {
  place: Place;
  compact?: boolean;
  pin?: number;
  assignment?: DayAssignment;
}) {
  const isDayCard = pin != null;
  const typeLabels = isDayCard ? briefTypeLabels(place.types) : [];
  const memo = assignment?.memo || place.memo;

  return (
    <div className="flex min-w-0 flex-1 items-start gap-2">
      {pin != null ? (
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-600 text-[11px] font-bold text-white">
          {pin}
        </span>
      ) : (
        <span
          className={`shrink-0 leading-none ${compact ? 'text-lg' : 'text-2xl'}`}
          title={categoryLabel(place.category)}
        >
          {categoryEmoji(place.category)}
        </span>
      )}
      {!compact && isDayCard && place.photoUrl && (
        <img
          src={place.photoUrl}
          alt=""
          className="h-14 w-14 shrink-0 rounded-lg object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      <div className="min-w-0 flex-1">
        <p
          className={`truncate font-medium text-slate-800 ${compact ? 'text-sm' : ''}`}
        >
          {place.name}
        </p>
        {!compact && place.address && (
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500">
            {place.address}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
          <span className="rounded bg-slate-100 px-1.5 py-0.5">
            {categoryBadge(place.category)}
          </span>
          {typeLabels.map((label) => (
            <span
              key={label}
              className="rounded bg-slate-50 px-1.5 py-0.5 text-slate-500"
            >
              {label}
            </span>
          ))}
          {place.rating != null && (
            <span className="flex items-center gap-0.5">
              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
              {place.rating}
            </span>
          )}
        </div>
        {!compact && isDayCard && assignment?.time && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
            <Clock className="h-3 w-3" />
            {assignment.time}
          </p>
        )}
        {!compact && isDayCard && memo && (
          <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{memo}</p>
        )}
      </div>
    </div>
  );
}

function SortableAssignment({
  assignment,
  place,
  pin,
  canWrite,
  dayCount,
  selected,
  onRemove,
  onMove,
  onFocus,
}: {
  assignment: DayAssignment;
  place: Place;
  pin: number;
  canWrite: boolean;
  dayCount: number;
  selected: boolean;
  onRemove: () => void;
  onMove: (day: number) => void;
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
      className={`group relative rounded-lg border bg-white p-2 pb-8 shadow-sm ${
        selected ? 'border-primary-400 ring-1 ring-primary-200' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start gap-1">
        {canWrite && (
          <button
            type="button"
            className="mt-0.5 min-h-10 min-w-10 cursor-grab touch-none p-1.5 text-slate-300 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={onFocus} className="min-w-0 flex-1 text-left">
          <PlaceCardContent
            place={place}
            pin={pin}
            assignment={assignment}
          />
        </button>
        {canWrite && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-1.5 text-slate-400 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {canWrite && dayCount > 1 && (
        <div className="mt-1.5 flex flex-wrap gap-1 pl-5">
          {Array.from({ length: dayCount }, (_, i) => i + 1)
            .filter((d) => d !== assignment.dayIndex)
            .map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onMove(d)}
                className="min-h-8 rounded bg-slate-50 px-2 py-1 text-[10px] text-slate-500 hover:bg-primary-50 hover:text-primary-700"
              >
                → {d}일차
              </button>
            ))}
        </div>
      )}
      <NearbyHospitalButton
        lat={place.lat}
        lng={place.lng}
        placeName={place.name}
      />
    </div>
  );
}

function DraggablePoolPlace({
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
      className="group rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
    >
      <div className="flex items-start gap-2">
        {canWrite && (
          <button
            type="button"
            className="mt-0.5 min-h-10 min-w-10 cursor-grab touch-none p-1.5 text-slate-300"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={onFocus} className="min-w-0 flex-1 text-left">
          <PlaceCardContent place={place} />
        </button>
        {canWrite && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {canWrite && (
        <button
          type="button"
          onClick={() => onAssign(activeDay)}
          className="mt-2 flex min-h-9 w-full items-center justify-center gap-1 rounded-md bg-primary-50 px-2.5 py-1.5 text-[12px] font-medium text-primary-700 hover:bg-primary-100"
        >
          <Plus className="h-3.5 w-3.5" />
          {activeDay}일차에 추가
        </button>
      )}
    </div>
  );
}

function DayWorkPanel({
  dayIndex,
  date,
  assignments,
  placesById,
  canWrite,
  dayCount,
}: {
  dayIndex: number;
  date: string;
  assignments: DayAssignment[];
  placesById: Record<string, Place>;
  canWrite: boolean;
  dayCount: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dayIndex}`,
    data: { type: 'day', dayIndex },
  });
  const { removeFromDay, moveAssignment } = useTravelStore();
  const ids = assignments.map((a) => a.id);
  const [focusPlaceId, setFocusPlaceId] = useState<string | null>(null);

  const orderedPlaces = assignments
    .map((a) => placesById[a.placeId])
    .filter((p): p is Place => Boolean(p));

  const focusAssignment = (placeId: string, assignmentId: string) => {
    setFocusPlaceId(placeId);
    document
      .getElementById(`day-place-${assignmentId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border lg:flex-row ${
        isOver
          ? 'border-primary-400 bg-primary-50/50'
          : 'border-slate-200 bg-slate-50'
      }`}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col order-2 lg:order-1">
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
            {assignments.length === 0 && (
              <p className="py-10 text-center text-sm text-slate-400">
                {canWrite
                  ? '장소 풀에서 드래그하거나 추가 버튼으로 이 날에 담으세요'
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
                      key={`transit-${prev.id}-${place.id}-${index}`}
                      from={prev}
                      to={place}
                      segmentKey={`${prev.id}->${place.id}@${index}`}
                    />
                  )}
                  <SortableAssignment
                    assignment={a}
                    place={place}
                    pin={index + 1}
                    canWrite={canWrite}
                    dayCount={dayCount}
                    selected={focusPlaceId === place.id}
                    onRemove={() => removeFromDay(a.id)}
                    onMove={(day) => moveAssignment(a.id, day)}
                    onFocus={() => setFocusPlaceId(place.id)}
                  />
                </Fragment>
              );
            })}
          </div>
        </div>
      </SortableContext>
      <div className="order-1 h-52 shrink-0 overflow-hidden border-b border-slate-200 lg:order-2 lg:h-auto lg:w-[min(42%,380px)] lg:border-b-0 lg:border-l">
        <DayTimelineMap
          places={orderedPlaces}
          focusPlaceId={focusPlaceId}
          onSelectPlace={(placeId) => {
            const assignment = assignments.find((a) => a.placeId === placeId);
            if (assignment) focusAssignment(placeId, assignment.id);
            else setFocusPlaceId(placeId);
          }}
          showHeader
        />
      </div>
      <p className="sr-only">
        {dayIndex}일차 {date}
      </p>
    </div>
  );
}

export default function ClassicPlacePoolBoard({ canWrite }: PlacePoolBoardProps) {
  const {
    selectedPlan,
    assignToDay,
    deletePlace,
    moveAssignment,
    reorderDayAssignments,
    setMapCenter,
    setSelectedMapPlace,
  } = useTravelStore();
  const { activeDay, setActiveDay } = usePlanUiStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [poolOpen, setPoolOpen] = useState(false);
  const [poolFilter, setPoolFilter] = useState<PlaceCategory | 'all'>('all');
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
    const overData = over.data.current;

    if (activeData?.type === 'pool') {
      const place = activeData.place as Place;
      let targetDay: number | null = null;

      if (overData?.type === 'day') {
        targetDay = overData.dayIndex as number;
      } else if (overData?.type === 'assignment') {
        targetDay = (overData.assignment as DayAssignment).dayIndex;
      } else if (overId.startsWith('day-')) {
        targetDay = Number(overId.replace('day-', ''));
      }

      if (targetDay) await assignToDay(place.id, targetDay);
      return;
    }

    if (activeData?.type === 'assignment') {
      const assignment = activeData.assignment as DayAssignment;

      let targetDay = assignment.dayIndex;
      if (overData?.type === 'day') {
        targetDay = overData.dayIndex as number;
      } else if (overData?.type === 'assignment') {
        targetDay = (overData.assignment as DayAssignment).dayIndex;
      } else if (overId.startsWith('day-')) {
        targetDay = Number(overId.replace('day-', ''));
      }

      if (targetDay !== assignment.dayIndex) {
        await moveAssignment(assignment.id, targetDay);
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

  const assignmentsFor = (day: number) =>
    selectedPlan.dayAssignments
      .filter((d) => d.dayIndex === day)
      .sort((a, b) => a.order - b.order);

  const poolSection = (
    <section className="shrink-0">
      <button
        type="button"
        onClick={() => setPoolOpen((v) => !v)}
        className="mb-2 flex w-full items-center gap-2 text-left text-sm font-semibold text-slate-700"
      >
        <MapPin className="h-4 w-4 text-primary-600" />
        장소 풀
        <span className="font-normal text-slate-400">
          ({selectedPlan.places.length})
        </span>
        {poolOpen ? (
          <ChevronUp className="ml-auto h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="ml-auto h-4 w-4 text-slate-400" />
        )}
      </button>
      {poolOpen && (
        <>
          <div className="mb-2 flex gap-1 overflow-x-auto pb-1">
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
            <div className="grid max-h-40 gap-2 overflow-y-auto sm:max-h-52 lg:grid-cols-2 xl:grid-cols-3">
              {filteredPlaces.length === 0 ? (
                <p className="col-span-full py-6 text-center text-sm text-slate-400">
                  {selectedPlan.places.length === 0
                    ? '상단에서 장소를 검색해 풀에 추가하세요'
                    : '이 카테고리의 장소가 없습니다'}
                </p>
              ) : (
                filteredPlaces.map((place) => (
                  <DraggablePoolPlace
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
        </>
      )}
    </section>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
        {isDesktop ? (
          <section className="order-2 flex min-h-0 flex-1 flex-col bg-white px-4 pb-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <CalendarDays className="h-4 w-4 text-primary-600" />
              {activeDay}일차 작업
              <span className="font-normal text-slate-400">
                {getDateForDay(selectedPlan.startDate, activeDay)} ·{' '}
                {assignmentsFor(activeDay).length}곳
              </span>
            </h3>
            <DayWorkPanel
              dayIndex={activeDay}
              date={getDateForDay(selectedPlan.startDate, activeDay)}
              assignments={assignmentsFor(activeDay)}
              placesById={placesById}
              canWrite={canWrite}
              dayCount={dayCount}
            />
          </section>
        ) : (
          <div className="order-1 min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => {
              const open = activeDay === day;
              const items = assignmentsFor(day);
              return (
                <div
                  key={day}
                  className={`overflow-hidden rounded-xl border ${
                    open
                      ? 'border-primary-300 bg-white'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveDay(day)}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                        open
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-slate-600 ring-1 ring-slate-200'
                      }`}
                    >
                      {day}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">
                        {day}일차
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {getDateForDay(selectedPlan.startDate, day)} · {items.length}
                        곳
                        {items.slice(0, 4).map((a) => {
                          const p = placesById[a.placeId];
                          return p ? ` ${categoryEmoji(p.category)}` : '';
                        })}
                      </p>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition ${
                        open ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {open && (
                    <div className="border-t border-slate-100 px-2 pb-2 pt-1">
                      <div className="flex max-h-[70vh] min-h-[16rem] flex-col">
                        <DayWorkPanel
                          dayIndex={day}
                          date={getDateForDay(selectedPlan.startDate, day)}
                          assignments={items}
                          placesById={placesById}
                          canWrite={canWrite}
                          dayCount={dayCount}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 장소 풀: 모바일 하단, PC 상단 */}
        <div className="order-2 shrink-0 border-t border-slate-200 bg-white p-3 lg:order-1 lg:border-t-0 lg:px-4 lg:pb-0 lg:pt-4">
          {poolSection}
        </div>
      </div>

      <DragOverlay>
        {activePlace && (
          <div className="w-56 rounded-lg border border-primary-300 bg-white p-3 shadow-lg">
            <PlaceCardContent place={activePlace} compact />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
