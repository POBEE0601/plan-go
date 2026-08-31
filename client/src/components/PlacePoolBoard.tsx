// 2026-08-31 장소 풀 + Day 보드 (드래그·버튼)
import {
  DndContext,
  DragOverlay,
  PointerSensor,
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
import { Fragment, useMemo, useState } from 'react';
import {
  CalendarDays,
  GripVertical,
  MapPin,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useTravelStore } from '../store/useTravelStore';
import {
  categoryLabel,
  getDateForDay,
  getDayCount,
} from '../utils/days';
import type { DayAssignment, Place } from '../types/travel';
import TransitHint from './TransitHint';

interface PlacePoolBoardProps {
  canWrite: boolean;
}

function PlaceCardContent({
  place,
  compact,
}: {
  place: Place;
  compact?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className={`truncate font-medium text-slate-800 ${compact ? 'text-sm' : ''}`}>
        {place.name}
      </p>
      {!compact && (
        <p className="truncate text-xs text-slate-400">{place.address}</p>
      )}
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
        <span className="rounded bg-slate-100 px-1.5 py-0.5">
          {categoryLabel(place.category)}
        </span>
        {place.rating != null && (
          <span className="flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
            {place.rating}
          </span>
        )}
      </div>
    </div>
  );
}

function SortableAssignment({
  assignment,
  place,
  canWrite,
  dayCount,
  onRemove,
  onMove,
}: {
  assignment: DayAssignment;
  place: Place;
  canWrite: boolean;
  dayCount: number;
  onRemove: () => void;
  onMove: (day: number) => void;
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
      ref={setNodeRef}
      style={style}
      className="group rounded-lg border border-slate-200 bg-white p-2 shadow-sm"
    >
      <div className="flex items-start gap-1">
        {canWrite && (
          <button
            type="button"
            className="mt-0.5 cursor-grab text-slate-300 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <PlaceCardContent place={place} compact />
        {canWrite && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-0.5 text-slate-300 opacity-0 hover:text-red-500 group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {canWrite && (
        <div className="mt-1.5 flex flex-wrap gap-1 pl-5">
          {Array.from({ length: dayCount }, (_, i) => i + 1)
            .filter((d) => d !== assignment.dayIndex)
            .map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onMove(d)}
                className="rounded bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-primary-50 hover:text-primary-700"
              >
                → Day {d}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

function DraggablePoolPlace({
  place,
  canWrite,
  dayCount,
  onDelete,
  onAssign,
  onFocus,
}: {
  place: Place;
  canWrite: boolean;
  dayCount: number;
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
            className="mt-0.5 cursor-grab text-slate-300"
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
            className="rounded p-1 text-slate-300 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {canWrite && (
        <div className="mt-2 flex flex-wrap gap-1 pl-6">
          {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onAssign(d)}
              className="flex items-center gap-0.5 rounded-md bg-primary-50 px-2 py-1 text-[11px] font-medium text-primary-700 hover:bg-primary-100"
            >
              <Plus className="h-3 w-3" />
              Day {d}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DayColumn({
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

  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 shrink-0 flex-col rounded-xl border ${
        isOver ? 'border-primary-400 bg-primary-50/50' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
        <CalendarDays className="h-4 w-4 text-primary-600" />
        <div>
          <p className="text-sm font-semibold text-slate-800">Day {dayIndex}</p>
          <p className="text-[11px] text-slate-400">{date}</p>
        </div>
        <span className="ml-auto text-xs text-slate-400">{assignments.length}</span>
      </div>

      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2" style={{ minHeight: 120 }}>
          {assignments.length === 0 && (
            <p className="py-6 text-center text-xs text-slate-400">
              장소를 드래그하거나
              <br />
              + Day 버튼으로 추가
            </p>
          )}
          {assignments.map((a, index) => {
            const place = placesById[a.placeId];
            if (!place) return null;
            const prev =
              index > 0
                ? placesById[assignments[index - 1].placeId]
                : null;
            // 길찾기는 sortable 카드 밖에 두어 순서 변경 시 구간이 확실히 갱신되게 함
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
                  canWrite={canWrite}
                  dayCount={dayCount}
                  onRemove={() => removeFromDay(a.id)}
                  onMove={(day) => moveAssignment(a.id, day)}
                />
              </Fragment>
            );
          })}
        </div>
      </SortableContext>
    </div>
  );
}

export default function PlacePoolBoard({ canWrite }: PlacePoolBoardProps) {
  const {
    selectedPlan,
    assignToDay,
    deletePlace,
    moveAssignment,
    reorderDayAssignments,
    setMapCenter,
    setSelectedMapPlace,
  } = useTravelStore();

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const dayCount = selectedPlan
    ? getDayCount(selectedPlan.startDate, selectedPlan.endDate)
    : 0;

  const placesById = useMemo(() => {
    const map: Record<string, Place> = {};
    selectedPlan?.places.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [selectedPlan]);

  const poolIds = useMemo(
    () => (selectedPlan?.places ?? []).map((p) => `pool-${p.id}`),
    [selectedPlan],
  );

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

    // 장소 풀 → Day
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

    // assignment 이동 / 정렬
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

      // 같은 Day 내 순서
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
    return a ? placesById[a.placeId] ?? null : null;
  })();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full flex-col gap-3 overflow-hidden p-4">
        <section className="shrink-0">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <MapPin className="h-4 w-4 text-primary-600" />
            장소 풀
            <span className="font-normal text-slate-400">
              ({selectedPlan.places.length})
            </span>
          </h3>
          <SortableContext items={poolIds} strategy={verticalListSortingStrategy}>
            <div className="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
              {selectedPlan.places.length === 0 ? (
                <p className="col-span-full py-6 text-center text-sm text-slate-400">
                  상단에서 장소를 검색해 풀에 추가하세요
                </p>
              ) : (
                selectedPlan.places.map((place) => (
                  <DraggablePoolPlace
                    key={place.id}
                    place={place}
                    canWrite={canWrite}
                    dayCount={dayCount}
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
        </section>

        <section className="min-h-0 flex-1 overflow-hidden">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">일자별 일정</h3>
          <div className="flex h-[calc(100%-1.5rem)] gap-3 overflow-x-auto pb-2">
            {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => (
              <DayColumn
                key={day}
                dayIndex={day}
                date={getDateForDay(selectedPlan.startDate, day)}
                assignments={selectedPlan.dayAssignments
                  .filter((d) => d.dayIndex === day)
                  .sort((a, b) => a.order - b.order)}
                placesById={placesById}
                canWrite={canWrite}
                dayCount={dayCount}
              />
            ))}
          </div>
        </section>
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
