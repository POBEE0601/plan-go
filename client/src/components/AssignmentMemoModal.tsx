// 2026-09-23 저장 탭: 배정 없으면 장소 메모로 저장
// 2026-09-07 PC: 일정 장소 메모 버튼·팝업 (장소당 1개)
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, StickyNote, X } from 'lucide-react';
import { useTravelStore } from '../store/useTravelStore';

export const ASSIGNMENT_MEMO_MAX = 2000;

interface AssignmentMemoModalProps {
  open: boolean;
  assignmentId?: string;
  placeId?: string;
  placeName: string;
  memo?: string;
  canWrite: boolean;
  onClose: () => void;
}

export default function AssignmentMemoModal({
  open,
  assignmentId,
  placeId,
  placeName,
  memo,
  canWrite,
  onClose,
}: AssignmentMemoModalProps) {
  const updateAssignmentMemo = useTravelStore((s) => s.updateAssignmentMemo);
  const updatePlaceMeta = useTravelStore((s) => s.updatePlaceMeta);
  const [draft, setDraft] = useState(memo ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setDraft(memo ?? '');
      setError('');
    }
  }, [open, assignmentId, placeId, memo]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const saved = (memo ?? '').trim();
  const next = draft.trim();
  const dirty = next !== saved;

  const persist = async (value: string) => {
    setSaving(true);
    setError('');
    try {
      if (assignmentId) {
        await updateAssignmentMemo(assignmentId, value);
      } else if (placeId) {
        await updatePlaceMeta(placeId, { memo: value });
      } else {
        throw new Error('메모를 저장할 대상이 없습니다.');
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '메모 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="assignment-memo-title"
        className="animate-rise-in max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:max-h-[90vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2
            id="assignment-memo-title"
            className="flex items-center gap-2 text-lg font-bold text-slate-800"
          >
            <StickyNote className="h-5 w-5 text-primary-600" />
            장소 메모
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <p className="truncate text-sm font-medium text-slate-700">{placeName}</p>
          <p className="text-[12px] text-slate-400">
            이 장소에는 메모를 하나만 등록할 수 있습니다.
          </p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, ASSIGNMENT_MEMO_MAX))}
            disabled={!canWrite || saving}
            rows={7}
            maxLength={ASSIGNMENT_MEMO_MAX}
            placeholder="이동 방법, 예약 번호, 만날 장소 등을 자유롭게 적어 두세요"
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 disabled:bg-slate-50"
          />
          <p className="text-right text-[11px] text-slate-400">
            {draft.length}/{ASSIGNMENT_MEMO_MAX}
          </p>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canWrite && saved ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void persist('')}
                className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                삭제
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              닫기
            </button>
            {canWrite && (
              <button
                type="button"
                disabled={saving || !dirty || (!saved && !next)}
                onClick={() => void persist(next)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saved ? '수정' : '저장'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface AssignmentMemoButtonProps {
  assignmentId: string;
  placeName: string;
  memo?: string;
  canWrite: boolean;
}

// 일차 카드 우측 빈 영역에 두는 메모 진입 버튼
export function AssignmentMemoButton({
  assignmentId,
  placeName,
  memo,
  canWrite,
}: AssignmentMemoButtonProps) {
  const [open, setOpen] = useState(false);
  const hasMemo = Boolean(memo?.trim());

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={`mb-7 flex min-h-[4.5rem] min-w-[4.75rem] max-w-[9rem] shrink-0 flex-col items-center justify-center gap-1 self-start rounded-lg border px-2 py-2 text-center ${
          hasMemo
            ? 'border-primary-200 bg-primary-50 text-primary-700'
            : 'border-dashed border-slate-200 bg-slate-50 text-slate-500 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700'
        }`}
        aria-label={hasMemo ? `${placeName} 메모 보기` : `${placeName} 메모 작성`}
      >
        <StickyNote className="h-4 w-4 shrink-0" />
        <span className="text-[12px] font-semibold">메모</span>
        {hasMemo ? (
          <span className="line-clamp-2 w-full text-[10px] font-normal leading-snug text-slate-500">
            {memo}
          </span>
        ) : (
          <span className="text-[10px] font-normal text-slate-400">
            {canWrite ? '작성' : '없음'}
          </span>
        )}
      </button>
      <AssignmentMemoModal
        open={open}
        assignmentId={assignmentId}
        placeName={placeName}
        memo={memo}
        canWrite={canWrite}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
