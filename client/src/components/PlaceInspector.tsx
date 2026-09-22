// 2026-09-22 인스펙터에서 카테고리·핀 색·소개 편집
// 2026-09-07 모바일 메모 버튼이 시트 하단에 잘리지 않도록
// 2026-09-07 모바일 인라인 메모·PC 팝업 메모
// 2026-09-04 일차 이동을 DayMoveControl로 통일
// 2026-09-03 선택 장소 상세 인스펙터 (목록 카드에서 이관)
import { useState } from 'react';
import { Clock, MapPin, Star, StickyNote, X } from 'lucide-react';
import NearbyHospitalButton from './NearbyHospitalButton';
import DayMoveControl from './DayMoveControl';
import AssignmentMemoInline from './AssignmentMemoInline';
import AssignmentMemoModal from './AssignmentMemoModal';
import { useTravelStore } from '../store/useTravelStore';
import { usePlanUiStore } from '../store/usePlanUiStore';
import { briefTypeLabels } from '../utils/placeBrief';
import { categoryBadge, resolvePinColor } from '../utils/days';
import type { DayAssignment, Place } from '../types/travel';
import PlaceMetaEditor from './PlaceMetaEditor';

interface PlaceInspectorProps {
  assignment: DayAssignment;
  place: Place;
  dayCount: number;
  canWrite: boolean;
  onClose: () => void;
  variant?: 'float' | 'sheet';
}

export default function PlaceInspector({
  assignment,
  place,
  dayCount,
  canWrite,
  onClose,
  variant = 'float',
}: PlaceInspectorProps) {
  const { moveAssignment, removeFromDay } = useTravelStore();
  const setActiveDay = usePlanUiStore((s) => s.setActiveDay);
  const [memoOpen, setMemoOpen] = useState(false);
  const memo = assignment.memo;
  const typeLabels = briefTypeLabels(place.types);
  const isSheet = variant === 'sheet';

  const handleRemove = async () => {
    await removeFromDay(assignment.id);
    onClose();
  };

  return (
    <div
      className={`relative flex flex-col bg-white ${
        isSheet
          ? 'h-full min-h-0 flex-1 overflow-hidden rounded-t-xl'
          : 'overflow-hidden rounded-xl border border-slate-200 shadow-lg'
      }`}
    >
      <div className="flex shrink-0 items-start gap-3 p-3">
        {place.photoUrl && (
          <img
            src={place.photoUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-lg object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">
            {place.name}
          </p>
          {place.address && (
            <p className="mt-0.5 flex items-start gap-1 text-[11px] leading-snug text-slate-500">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="line-clamp-2">{place.address}</span>
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: resolvePinColor(place.category, place.pinColor),
              }}
            />
            <span className="rounded bg-slate-100 px-1.5 py-0.5">
              {categoryBadge(place.category)}
            </span>
            {typeLabels.map((label) => (
              <span
                key={label}
                className="rounded bg-slate-50 px-1.5 py-0.5"
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
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="인스펙터 닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="shrink-0 border-t border-slate-100 px-3 py-2">
        <PlaceMetaEditor place={place} canWrite={canWrite} />
      </div>

      {assignment.time && (
        <div className="shrink-0 border-t border-slate-100 px-3 py-2">
          <p className="flex items-center gap-1 text-[12px] text-slate-600">
            <Clock className="h-3.5 w-3.5" />
            {assignment.time}
          </p>
        </div>
      )}

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-100 px-3 py-2">
        {canWrite && dayCount > 1 && (
          <div className="min-w-0 flex-1">
            <DayMoveControl
              currentDay={assignment.dayIndex}
              dayCount={dayCount}
              size="md"
              onMove={(day) => {
                void moveAssignment(assignment.id, day);
                setActiveDay(day, { keepSelection: true });
              }}
            />
          </div>
        )}
        {canWrite && (
          <button
            type="button"
            onClick={() => void handleRemove()}
            className="rounded-md px-2 py-1 text-[12px] text-red-600 hover:bg-red-50"
          >
            일정에서 제거
          </button>
        )}
        {!isSheet && (
          <button
            type="button"
            onClick={() => setMemoOpen(true)}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium ${
              memo
                ? 'bg-primary-50 text-primary-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <StickyNote className="h-3.5 w-3.5" />
            메모
          </button>
        )}
        <div className="relative ml-auto h-8 min-w-[6.5rem]">
          <NearbyHospitalButton
            lat={place.lat}
            lng={place.lng}
            placeName={place.name}
          />
        </div>
      </div>

      {isSheet && (
        <AssignmentMemoInline
          assignmentId={assignment.id}
          memo={memo}
          canWrite={canWrite}
        />
      )}

      {!isSheet && (
        <AssignmentMemoModal
          open={memoOpen}
          assignmentId={assignment.id}
          placeName={place.name}
          memo={memo}
          canWrite={canWrite}
          onClose={() => setMemoOpen(false)}
        />
      )}
    </div>
  );
}
