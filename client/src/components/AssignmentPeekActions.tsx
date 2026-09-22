// 2026-09-23 길찾기·메모 아이콘 버튼 크기 확대
// 2026-09-22 일정 행: 현위치 길찾기 + 저장된 메모 읽기 전용 팝업
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Navigation, StickyNote, X } from 'lucide-react';
import type { Place } from '../types/travel';
import { mapsDirFromHere } from '../utils/jsDirections';

interface MemoPeekModalProps {
  open: boolean;
  placeName: string;
  memo?: string;
  onClose: () => void;
}

function MemoPeekModal({
  open,
  placeName,
  memo,
  onClose,
}: MemoPeekModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const text = (memo ?? '').trim();

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="memo-peek-title"
        className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p
              id="memo-peek-title"
              className="text-sm font-semibold text-slate-900"
            >
              저장된 메모
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {placeName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 max-h-52 overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-700">
          {text || '저장된 메모가 없습니다.'}
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface AssignmentPeekActionsProps {
  place: Place;
  memo?: string;
}

export default function AssignmentPeekActions({
  place,
  memo,
}: AssignmentPeekActionsProps) {
  const [open, setOpen] = useState(false);
  const hasMemo = Boolean(memo?.trim());

  return (
    <div className="flex shrink-0 items-center gap-1">
      <a
        href={mapsDirFromHere(place)}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100"
        aria-label={`${place.name} 현위치에서 길찾기`}
        title="현위치에서 길찾기"
      >
        <Navigation className="h-5 w-5" strokeWidth={2.2} />
      </a>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={`flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-slate-50 ${
          hasMemo
            ? 'border-primary-200 bg-primary-50 text-primary-700'
            : 'border-slate-200 bg-white text-slate-500'
        }`}
        aria-label={`${place.name} 저장된 메모 보기`}
        title="저장된 메모"
      >
        <StickyNote className="h-5 w-5" strokeWidth={2.2} />
      </button>
      <MemoPeekModal
        open={open}
        placeName={place.name}
        memo={memo}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
