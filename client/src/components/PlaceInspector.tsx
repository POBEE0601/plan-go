// 2026-09-03 선택 장소 상세 인스펙터 (목록 카드에서 이관)
import { Clock, MapPin, Star, X } from 'lucide-react';
import NearbyHospitalButton from './NearbyHospitalButton';
import { useTravelStore } from '../store/useTravelStore';
import { usePlanUiStore } from '../store/usePlanUiStore';
import { briefTypeLabels } from '../utils/placeBrief';
import { categoryBadge } from '../utils/days';
import type { DayAssignment, Place } from '../types/travel';

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
  const memo = assignment.memo || place.memo;
  const typeLabels = briefTypeLabels(place.types);

  const handleRemove = async () => {
    await removeFromDay(assignment.id);
    onClose();
  };

  return (
    <div
      className={`relative overflow-hidden bg-white ${
        variant === 'float'
          ? 'rounded-xl border border-slate-200 shadow-lg'
          : 'rounded-t-xl'
      }`}
    >
      <div className="flex items-start gap-3 p-3">
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

      {(assignment.time || memo) && (
        <div className="space-y-1 border-t border-slate-100 px-3 py-2">
          {assignment.time && (
            <p className="flex items-center gap-1 text-[12px] text-slate-600">
              <Clock className="h-3.5 w-3.5" />
              {assignment.time}
            </p>
          )}
          {memo && (
            <p className="text-[12px] leading-snug text-slate-600">{memo}</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-3 py-2">
        {canWrite && dayCount > 1 && (
          <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
            이동
            <select
              value={assignment.dayIndex}
              onChange={(e) => {
                const day = Number(e.target.value);
                void moveAssignment(assignment.id, day);
                setActiveDay(day, { keepSelection: true });
              }}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[12px] font-medium text-slate-700"
            >
              {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}일차
                </option>
              ))}
            </select>
          </label>
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
        <div className="relative ml-auto h-8 min-w-[6.5rem]">
          <NearbyHospitalButton
            lat={place.lat}
            lng={place.lng}
            placeName={place.name}
          />
        </div>
      </div>
    </div>
  );
}
