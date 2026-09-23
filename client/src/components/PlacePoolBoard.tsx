// 2026-09-23 여행홈 시트 최소 높이는 가로 카드까지
// 2026-09-23 일정 검색·지도 돋보기·하단 시트 드래그
// 2026-09-22 모바일 홈바: 지도/일정 전용 화면
// 2026-09-15 일차 헤더 차량 합산 시간 제거
// 2026-09-14 모바일 지도 전체 보기: 검색바·목록 숨김
// 2026-09-07 장소 상세 시트가 메모 영역을 채우도록
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
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GripVertical,
  List,
  MapPin,
  Maximize2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useTravelStore } from '../store/useTravelStore';
import { usePlanUiStore } from '../store/usePlanUiStore';
import {
  categoryBadge,
  categoryEmoji,
  categoryLabel,
  getDateForDay,
  getDayCount,
  planCategoryIds,
  resolvePinColor,
} from '../utils/days';
import type { DayAssignment, Place, PlaceCategory } from '../types/travel';
import TransitHint from './TransitHint';
import DayTimelineMap from './DayTimelineMap';
import DayTabs from './DayTabs';
import PlaceInspector from './PlaceInspector';
import PlaceSearchBar from './PlaceSearchBar';
import PlaceMetaEditor from './PlaceMetaEditor';
import AssignmentPeekActions from './AssignmentPeekActions';
import DayPlaceCarousel from './DayPlaceCarousel';
import ResizablePlaceSheet from './ResizablePlaceSheet';
import { useMapUiStore } from '../store/useMapUiStore';

interface PlacePoolBoardProps {
  canWrite: boolean;
  // 2026-09-22 모바일 홈바: 지도/일정 전용 화면
  mobilePane?: 'map' | 'schedule';
}

// 2026-09-15 일차 헤더에서 차량 합산 시간 제거 (Directions 호출 절약)

// 2026-09-22 첫 줄: 번호·장소명·현위치 길찾기·메모 미리보기
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
      className={`flex min-h-11 items-start gap-0.5 rounded-lg px-1 py-1 ${
        selected ? 'bg-primary-50 ring-1 ring-primary-200' : 'hover:bg-slate-50'
      }`}
      data-assignment-id={assignment.id}
    >
      {canWrite && (
        <button
          type="button"
          className="mt-0.5 min-h-9 min-w-8 cursor-grab touch-none p-1 text-slate-300 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex min-h-9 min-w-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onFocus}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{
                backgroundColor: resolvePinColor(place.category, place.pinColor),
              }}
            >
              {pin}
            </span>
            <span className="truncate text-sm font-medium text-slate-800">
              {place.name}
            </span>
          </button>
          <AssignmentPeekActions place={place} memo={assignment.memo} />
        </div>
        <div className="pl-7">
          <PlaceMetaEditor place={place} canWrite={canWrite} />
        </div>
      </div>
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

// 2026-09-23 투명한 검색 버튼은 테두리를 더 굵게
// 2026-09-23 지도 검색 버튼을 테마 안에서 더 잘 보이게
// 2026-09-23 코드가 목록을 스크롤할 때는 선택을 바꾸지 않음
// 2026-09-23 선택 장소로 맞출 때 시트 전체가 밀리지 않게 목록만 스크롤
// 2026-09-23 목록 스크롤일 때만 따라가게 해서 카드 선택과 싸우지 않게
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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const userScrollRef = useRef(false);

  const setListRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    scrollRef.current = node;
  };

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    let timer = 0;
    const arm = () => {
      window.clearTimeout(timer);
      userScrollRef.current = true;
    };
    const disarm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        userScrollRef.current = false;
      }, 350);
    };
    root.addEventListener('pointerdown', arm);
    root.addEventListener('wheel', arm, { passive: true });
    root.addEventListener('pointerup', disarm);
    root.addEventListener('pointercancel', disarm);
    return () => {
      window.clearTimeout(timer);
      root.removeEventListener('pointerdown', arm);
      root.removeEventListener('wheel', arm);
      root.removeEventListener('pointerup', disarm);
      root.removeEventListener('pointercancel', disarm);
    };
  }, [assignments]);

  useEffect(() => {
    if (!selectedAssignmentId) return;
    const el = document.getElementById(`day-place-${selectedAssignmentId}`);
    const root = scrollRef.current;
    if (!el || !root || !root.contains(el)) return;
    const er = el.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    // 접힌 시트에서는 목록이 안 보이므로 조상(시트)을 밀지 않는다
    if (rr.height < 8) return;
    if (er.top >= rr.top + 8 && er.bottom <= rr.bottom - 8) return;
    const top = er.top - rr.top + root.scrollTop;
    root.scrollTo({ top: Math.max(0, top - 8), behavior: 'smooth' });
  }, [selectedAssignmentId]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!userScrollRef.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          );
        const id = (visible[0]?.target as HTMLElement | undefined)?.dataset
          .assignmentId;
        if (id) selectAssignment(id, { soft: true });
      },
      { root, rootMargin: '-8% 0px -62% 0px', threshold: 0.15 },
    );
    root.querySelectorAll('[data-assignment-id]').forEach((el) => {
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, [assignments, selectAssignment]);

  return (
    <div
      ref={setListRef}
      className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-1 pb-[max(1.5rem,env(safe-area-inset-bottom))] ${
        isOver ? 'bg-primary-50/70' : ''
      }`}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {assignments.length === 0 && (
          <p className="px-2 py-8 text-center text-xs text-slate-400">
            {canWrite
              ? '지도의 돋보기로 장소를 찾아 이 날에 담으세요'
              : '아직 배정된 장소가 없습니다'}
          </p>
        )}
        {assignments
          .map((a) => ({ a, place: placesById[a.placeId] }))
          .filter(
            (row): row is { a: DayAssignment; place: Place } =>
              Boolean(row.place),
          )
          .map(({ a, place }, index, rows) => {
          const prev = index > 0 ? rows[index - 1].place : null;
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
        {planCategoryIds(selectedPlan.customCategories).map((cat) => {
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
  onMapFocus,
  showPool = true,
}: {
  canWrite: boolean;
  onMapFocus?: () => void;
  showPool?: boolean;
}) {
  const selectedPlan = useTravelStore((s) => s.selectedPlan);
  const { activeDay, poolOpen, togglePool } = usePlanUiStore();
  if (!selectedPlan) return null;

  const assignments = selectedPlan.dayAssignments
    .filter((d) => d.dayIndex === activeDay)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-3 py-2">
      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">
        {activeDay}일차
        <span className="ml-1 font-normal text-slate-400">
          {getDateForDay(selectedPlan.startDate, activeDay)} ·{' '}
          {assignments.length}곳
        </span>
      </p>
      {onMapFocus && (
        <button
          type="button"
          onClick={onMapFocus}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-primary-700"
          aria-label="지도 전체 보기"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          지도
        </button>
      )}
      {showPool && (
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
      )}
      {!canWrite && (
        <span className="shrink-0 text-[10px] text-slate-400">읽기</span>
      )}
    </div>
  );
}

export default function PlacePoolBoard({
  canWrite,
  mobilePane,
}: PlacePoolBoardProps) {
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
    setPoolOpen,
    sheetSnap,
    setSheetSnap,
  } = usePlanUiStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  // 2026-09-23 하단 시트 높이를 지도 가시 영역 보정에 사용
  const [sheetHeight, setSheetHeight] = useState(0);
  const onSheetHeight = useCallback((h: number) => setSheetHeight(h), []);
  // 2026-09-23 지도 좌측 돋보기로 검색바 토글 (기본 숨김)
  const [mapSearchOpen, setMapSearchOpen] = useState(false);
  // 지도 전체 보기 중 검색바만 따로 다시 열기
  const [mapFocusSearch, setMapFocusSearch] = useState(false);
  // DevTools 모바일·주소창 때문에 레이아웃보다 시각 뷰포트가 짧을 때 하단 여백
  const [mapDockBottom, setMapDockBottom] = useState(24);
  const [isDesktop, setIsDesktop] = useState(
    () => window.matchMedia('(min-width: 1024px)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    setMapSearchOpen(false);
    useMapUiStore.getState().clearSearchResults();
  }, [mobilePane]);

  useEffect(() => {
    if (sheetSnap !== 'collapsed') setMapFocusSearch(false);
  }, [sheetSnap]);

  useEffect(() => {
    const updateDockBottom = () => {
      const vv = window.visualViewport;
      const clipped = vv
        ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
        : 0;
      setMapDockBottom(Math.max(24, clipped + 16));
    };
    updateDockBottom();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', updateDockBottom);
    vv?.addEventListener('scroll', updateDockBottom);
    window.addEventListener('resize', updateDockBottom);
    return () => {
      vv?.removeEventListener('resize', updateDockBottom);
      vv?.removeEventListener('scroll', updateDockBottom);
      window.removeEventListener('resize', updateDockBottom);
    };
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
    if (!assignment) return;
    if (mobilePane === 'map' || mobilePane === 'schedule') {
      selectAssignment(assignment.id, { soft: true });
      return;
    }
    selectAssignment(assignment.id, {
      keepSheet: !isDesktop && sheetSnap === 'collapsed',
    });
  };

  useEffect(() => {
    if (!assignments.length) return;
    const inDay = assignments.some((a) => a.id === selectedAssignmentId);
    if (!inDay) selectAssignment(assignments[0].id, { soft: true });
  }, [assignments, selectedAssignmentId, selectAssignment]);

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

  const mapFocus = !isDesktop && sheetSnap === 'collapsed';

  const enterMapFocus = () => {
    closeInspector();
    setPoolOpen(false);
    setMapFocusSearch(false);
    setSheetSnap('collapsed');
  };

  const exitMapFocusToList = () => {
    setMapFocusSearch(false);
    setSheetSnap('half');
  };

  // 2026-09-14 접힘(지도 전체) → 반열림 → 전체 → 반열림
  const onGrabber = () => {
    if (sheetSnap === 'collapsed') {
      exitMapFocusToList();
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
  const sheetHeightClass = sheetSnap === 'full' ? 'h-[88%]' : 'h-[62%]';

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

  const useMobileMap = !isDesktop && mobilePane === 'map';
  const useMobileSchedule = !isDesktop && mobilePane === 'schedule';
  const useMobilePlan = useMobileMap || useMobileSchedule;

  const toggleMapSearch = () => {
    setMapSearchOpen((open) => {
      if (open) useMapUiStore.getState().clearSearchResults();
      return !open;
    });
  };

  const mapSearchOverlay = (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 p-3">
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={toggleMapSearch}
          className={`pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-md ${
            mapSearchOpen
              ? 'border border-primary-200 bg-primary-600 text-white'
              : 'border-2 border-primary-400 bg-primary-50 text-primary-700'
          }`}
          aria-label={mapSearchOpen ? '검색 닫기' : '장소 검색'}
          aria-pressed={mapSearchOpen}
        >
          <Search className="h-5 w-5" strokeWidth={1.8} />
        </button>
        {mapSearchOpen && (
          <div className="pointer-events-auto min-w-0 flex-1">
            <PlaceSearchBar canWrite={canWrite} />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {useMobilePlan ? (
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-white">
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <DayTimelineMap
              places={orderedPlaces}
              focusPlaceId={focusPlaceId}
              focusToken={selectedAssignmentId}
              onSelectPlace={onSelectMapPlace}
              layoutKey={`${useMobileSchedule ? 'mob-schedule' : 'mob-map'}-${mapSearchOpen ? 's' : 'n'}`}
              overlayPadding={{
                top: mapSearchOpen ? 96 : 72,
                right: 48,
                bottom: Math.max(24, sheetHeight + 12),
                left: 12,
              }}
            />
            {mapSearchOverlay}
            <ResizablePlaceSheet
              defaultToMin={!useMobileSchedule}
              defaultRatio={useMobileSchedule ? 0.5 : 0.34}
              minPx={useMobileSchedule ? 176 : 96}
              onHeightChange={onSheetHeight}
            >
              {useMobileSchedule ? (
                inspectorOpen && sheetInspector ? (
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <DayTabs canWrite={canWrite} />
                    {sheetInspector}
                  </div>
                ) : (
                  <>
                    <DayTabs canWrite={canWrite} />
                    <TimelineChrome canWrite={canWrite} showPool={false} />
                    <CompactTimeline
                      dayIndex={activeDay}
                      assignments={assignments}
                      placesById={placesById}
                      canWrite={canWrite}
                    />
                  </>
                )
              ) : (
                <>
                  <div data-sheet-min className="shrink-0">
                    <DayTabs canWrite={canWrite} />
                    <DayPlaceCarousel
                      assignments={assignments}
                      placesById={placesById}
                      selectedAssignmentId={selectedAssignmentId}
                      onSelect={(id) => selectAssignment(id, { soft: true })}
                    />
                  </div>
                  <CompactTimeline
                    dayIndex={activeDay}
                    assignments={assignments}
                    placesById={placesById}
                    canWrite={canWrite}
                  />
                </>
              )}
            </ResizablePlaceSheet>
          </div>
        </div>
      ) : (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <DayTabs canWrite={canWrite} />

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {isDesktop && (
            <aside className="relative flex w-[280px] shrink-0 flex-col border-r border-slate-200 bg-white">
              <TimelineChrome canWrite={canWrite} />
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
              focusToken={selectedAssignmentId}
              onSelectPlace={onSelectMapPlace}
              layoutKey={`${isDesktop ? 'desk' : 'mob'}-${sheetSnap}-${mapFocusSearch ? 's' : 'n'}`}
            />
            {(!mapFocus || mapFocusSearch) && (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <PlaceSearchBar canWrite={canWrite} />
                  </div>
                  {!isDesktop && !mapFocus && (
                    <button
                      type="button"
                      onClick={enterMapFocus}
                      className="pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white/95 text-slate-700 shadow-sm"
                      aria-label="지도 전체 보기"
                      title="지도 전체 보기"
                    >
                      <Maximize2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            )}
            {mapFocus && (
              <div
                className="pointer-events-none absolute inset-x-0 z-20 flex justify-center px-3"
                style={{
                  bottom: `calc(${mapDockBottom}px + env(safe-area-inset-bottom, 0px))`,
                }}
              >
                <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 p-1 shadow-lg">
                  <button
                    type="button"
                    onClick={exitMapFocusToList}
                    className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <List className="h-4 w-4" />
                    목록
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapFocusSearch((v) => !v)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium ${
                      mapFocusSearch
                        ? 'bg-primary-600 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Search className="h-4 w-4" />
                    검색
                  </button>
                </div>
              </div>
            )}
            {isDesktop && inspectorOpen && inspector && (
              <div className="absolute bottom-3 right-3 z-20 w-80">
                {inspector}
              </div>
            )}
          </div>

          {!isDesktop && !mapFocus && (
          <div
            className={`absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-2xl border-t border-slate-200 bg-white shadow-[0_-8px_24px_rgba(15,23,42,0.12)] ${sheetHeightClass}`}
          >
            <button
              type="button"
              onClick={onGrabber}
              className="flex w-full flex-col items-center pb-1 pt-2"
              aria-label="일정 시트 접기/펼치기"
            >
              <span className="h-1 w-10 rounded-full bg-slate-300" />
            </button>
            <TimelineChrome
              canWrite={canWrite}
              onMapFocus={enterMapFocus}
            />
            {inspectorOpen && sheetSnap === 'full' ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
          </div>
          )}
        </div>
      </div>
      )}

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
