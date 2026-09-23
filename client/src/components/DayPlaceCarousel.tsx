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
  const skipScrollRef = useRef(false);
  // 캐러셀이 고른 선택은 다시 가운데로 당기지 않는다. 당기면 스냅과 싸워 이전 장소로 돌아간다
  const pickedHereRef = useRef(false);
  const selectedRef = useRef(selectedAssignmentId);
  selectedRef.current = selectedAssignmentId;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const commitCentered = () => {
    const root = scrollerRef.current;
    if (!root || skipScrollRef.current) return;
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
    if (bestId && bestId !== selectedRef.current) {
      pickedHereRef.current = true;
      onSelectRef.current(bestId);
    }
  };

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    let settle = 0;
    const onScroll = () => {
      if (skipScrollRef.current) return;
      window.clearTimeout(settle);
      settle = window.setTimeout(commitCentered, 180);
    };
    const onScrollEnd = () => {
      window.clearTimeout(settle);
      if (skipScrollRef.current) {
        skipScrollRef.current = false;
        return;
      }
      commitCentered();
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    root.addEventListener('scrollend', onScrollEnd);
    return () => {
      window.clearTimeout(settle);
      root.removeEventListener('scroll', onScroll);
      root.removeEventListener('scrollend', onScrollEnd);
    };
  }, [assignments]);

  useEffect(() => {
    if (pickedHereRef.current) {
      pickedHereRef.current = false;
      return;
    }
    if (!selectedAssignmentId) return;
    const root = scrollerRef.current;
    if (!root) return;
    const card = root.querySelector<HTMLElement>(
      `[data-carousel-id="${selectedAssignmentId}"]`,
    );
    if (!card) return;
    const cardMid = card.offsetLeft + card.offsetWidth / 2;
    const target = Math.max(0, cardMid - root.clientWidth / 2);
    if (Math.abs(root.scrollLeft - target) < 8) return;
    skipScrollRef.current = true;
    root.scrollTo({ left: target, behavior: 'smooth' });
    const release = () => {
      skipScrollRef.current = false;
    };
    root.addEventListener('scrollend', release, { once: true });
    const backup = window.setTimeout(release, 520);
    return () => {
      window.clearTimeout(backup);
      root.removeEventListener('scrollend', release);
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
      className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
              if (assignment.id === selectedAssignmentId) return;
              pickedHereRef.current = true;
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
