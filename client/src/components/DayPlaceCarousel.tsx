// 2026-09-23 가로로 넘기면 가운데 카드만 고르고, 드래그 클릭은 선택을 되돌리지 않음
// 2026-09-23 카드가 직접 고른 장소는 다시 스크롤하지 않아 선택이 되돌아가지 않음
// 2026-09-23 스와이프가 끝난 뒤에만 장소를 골라 지도가 왕복하지 않게
// 2026-09-23 핀 번호는 보이는 장소 순서와 동일
// 2026-09-23 여행 홈: 가로 스와이프 카드가 지도 초점을 바꿈
import { useEffect, useRef } from 'react';
import type { DayAssignment, Place } from '../types/travel';
import { categoryBadge, categoryEmoji, resolvePinColor } from '../utils/days';

interface DayPlaceCarouselProps {
  assignments: DayAssignment[];
  placesById: Record<string, Place>;
  selectedAssignmentId: string | null;
  onSelect: (assignmentId: string) => void;
}

export default function DayPlaceCarousel({
  assignments,
  placesById,
  selectedAssignmentId,
  onSelect,
}: DayPlaceCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const aligningRef = useRef(false);
  const dragRef = useRef({ x: 0, moved: false });
  // 캐러셀이 고른 id. 효과에서 비우지 않아 같은 선택으로 스크롤을 되돌리지 않는다
  const pickedIdRef = useRef<string | null>(null);
  const selectedRef = useRef(selectedAssignmentId);
  selectedRef.current = selectedAssignmentId;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const centeredId = () => {
    const root = scrollerRef.current;
    if (!root) return '';
    const mid = root.scrollLeft + root.clientWidth / 2;
    let bestId = '';
    let bestDist = Number.POSITIVE_INFINITY;
    Array.from(root.children).forEach((child) => {
      const el = child as HTMLElement;
      const id = el.dataset.carouselId;
      if (!id) return;
      const center = el.offsetLeft + el.offsetWidth / 2;
      const dist = Math.abs(center - mid);
      if (dist < bestDist) {
        bestDist = dist;
        bestId = id;
      }
    });
    return bestId;
  };

  const commitCentered = () => {
    if (aligningRef.current) return;
    const bestId = centeredId();
    if (!bestId || bestId === selectedRef.current) return;
    pickedIdRef.current = bestId;
    onSelectRef.current(bestId);
  };

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    let frame = 0;
    const schedule = () => {
      if (aligningRef.current) return;
      dragRef.current.moved = true;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(commitCentered);
    };
    root.addEventListener('scroll', schedule, { passive: true });
    root.addEventListener('scrollend', schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      root.removeEventListener('scroll', schedule);
      root.removeEventListener('scrollend', schedule);
    };
  }, [assignments]);

  useEffect(() => {
    if (!selectedAssignmentId) return;
    if (pickedIdRef.current === selectedAssignmentId) return;
    const root = scrollerRef.current;
    if (!root) return;
    const card = root.querySelector<HTMLElement>(
      `[data-carousel-id="${selectedAssignmentId}"]`,
    );
    if (!card) return;
    const cardMid = card.offsetLeft + card.offsetWidth / 2;
    const target = Math.max(0, cardMid - root.clientWidth / 2);
    if (Math.abs(root.scrollLeft - target) < 8) return;
    aligningRef.current = true;
    pickedIdRef.current = selectedAssignmentId;
    root.scrollTo({ left: target, behavior: 'smooth' });
    const release = () => {
      aligningRef.current = false;
    };
    root.addEventListener('scrollend', release, { once: true });
    const backup = window.setTimeout(release, 520);
    return () => {
      window.clearTimeout(backup);
      root.removeEventListener('scrollend', release);
      aligningRef.current = false;
    };
  }, [selectedAssignmentId]);

  if (assignments.length === 0) {
    return (
      <p className="px-5 py-4 text-sm text-slate-400">
        이 날에 담은 장소가 없습니다.
      </p>
    );
  }

  return (
    <div
      ref={scrollerRef}
      className="flex snap-x snap-mandatory touch-pan-x gap-3 overflow-x-auto px-4 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      onPointerDown={(e) => {
        dragRef.current = { x: e.clientX, moved: false };
      }}
      onPointerMove={(e) => {
        if (Math.abs(e.clientX - dragRef.current.x) > 8) {
          dragRef.current.moved = true;
        }
      }}
    >
      {assignments
        .map((assignment) => ({
          assignment,
          place: placesById[assignment.placeId],
        }))
        .filter(
          (row): row is { assignment: DayAssignment; place: Place } =>
            Boolean(row.place),
        )
        .map(({ assignment, place }, index) => {
        const active = assignment.id === selectedAssignmentId;
        return (
          <button
            key={assignment.id}
            type="button"
            data-carousel-id={assignment.id}
            onClick={() => {
              if (dragRef.current.moved) {
                dragRef.current.moved = false;
                return;
              }
              if (assignment.id === selectedAssignmentId) return;
              pickedIdRef.current = assignment.id;
              onSelect(assignment.id);
            }}
            className={`flex w-[min(78vw,20rem)] shrink-0 snap-center items-center gap-3 rounded-2xl border bg-white p-3 text-left shadow-sm transition duration-200 ${
              active
                ? 'border-primary-400 ring-1 ring-primary-200'
                : 'border-slate-200'
            }`}
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{
                backgroundColor: resolvePinColor(place.category, place.pinColor),
              }}
            >
              {index + 1}
            </span>
            {place.photoUrl ? (
              <img
                src={place.photoUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-xl object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
                {categoryEmoji(place.category)}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-slate-800">
                {place.name}
              </span>
              <span className="mt-0.5 block truncate text-xs text-slate-500">
                {categoryBadge(place.category)}
                {place.memo ? ` · ${place.memo}` : ''}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
