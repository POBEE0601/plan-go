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

  useEffect(() => {
    if (!selectedAssignmentId) return;
    const root = scrollerRef.current;
    if (!root) return;
    const card = root.querySelector<HTMLElement>(
      `[data-carousel-id="${selectedAssignmentId}"]`,
    );
    if (!card) return;
    const cardMid = card.offsetLeft + card.offsetWidth / 2;
    const target = cardMid - root.clientWidth / 2;
    skipScrollRef.current = true;
    root.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    window.setTimeout(() => {
      skipScrollRef.current = false;
    }, 280);
  }, [selectedAssignmentId]);

  const pickCentered = () => {
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
    if (bestId && bestId !== selectedAssignmentId) onSelect(bestId);
  };

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
      onScroll={pickCentered}
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
            onClick={() => onSelect(assignment.id)}
            className={`flex w-[min(78vw,20rem)] shrink-0 snap-center items-center gap-3 rounded-2xl border bg-white p-3 text-left shadow-sm ${
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
