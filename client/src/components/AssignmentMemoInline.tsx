// 2026-09-23 저장 탭: 배정 없으면 장소 메모로 저장
// 2026-09-07 모바일 하단 버튼이 시트에 잘리지 않도록 여백·축소
// 2026-09-07 모바일: 장소 상세 아래 인라인 메모 입력·수정·삭제
import { useEffect, useState } from 'react';
import { Loader2, StickyNote } from 'lucide-react';
import { useTravelStore } from '../store/useTravelStore';
import { ASSIGNMENT_MEMO_MAX } from './AssignmentMemoModal';

interface AssignmentMemoInlineProps {
  assignmentId?: string;
  placeId?: string;
  memo?: string;
  canWrite: boolean;
}

export default function AssignmentMemoInline({
  assignmentId,
  placeId,
  memo,
  canWrite,
}: AssignmentMemoInlineProps) {
  const updateAssignmentMemo = useTravelStore((s) => s.updateAssignmentMemo);
  const updatePlaceMeta = useTravelStore((s) => s.updatePlaceMeta);
  const [draft, setDraft] = useState(memo ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setDraft(memo ?? '');
    setMessage('');
  }, [assignmentId, placeId, memo]);

  const saved = (memo ?? '').trim();
  const next = draft.trim();
  const dirty = next !== saved;

  const persist = async (value: string) => {
    setSaving(true);
    setMessage('');
    try {
      if (assignmentId) {
        await updateAssignmentMemo(assignmentId, value);
      } else if (placeId) {
        await updatePlaceMeta(placeId, { memo: value });
      } else {
        throw new Error('메모를 저장할 대상이 없습니다.');
      }
      setMessage(value ? '저장했습니다.' : '메모를 삭제했습니다.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '메모 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (!canWrite && !saved) {
    return (
      <div className="flex min-h-0 flex-1 flex-col border-t border-slate-100 px-3 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-600">
          <StickyNote className="h-3.5 w-3.5" />
          메모
        </p>
        <p className="mt-2 text-[12px] text-slate-400">등록된 메모가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-slate-100 px-3 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-600">
          <StickyNote className="h-3.5 w-3.5" />
          메모
        </p>
        <span className="text-[10px] text-slate-400">장소당 1개</span>
      </div>
      {canWrite ? (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, ASSIGNMENT_MEMO_MAX))}
            disabled={saving}
            rows={3}
            maxLength={ASSIGNMENT_MEMO_MAX}
            placeholder="이 장소에 대한 메모를 입력하세요"
            className="min-h-0 w-full flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500"
          />
          <p className="mt-1 shrink-0 text-right text-[11px] text-slate-400">
            {draft.length}/{ASSIGNMENT_MEMO_MAX}
          </p>
          <div className="mt-2 flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={saving || !dirty || (!saved && !next)}
              onClick={() => void persist(next)}
              className="min-h-9 rounded-md bg-primary-600 px-3 py-2 text-[12px] font-semibold text-white hover:bg-primary-700 disabled:opacity-40"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                '수정'
              )}
            </button>
            <button
              type="button"
              disabled={saving || !saved}
              onClick={() => {
                setDraft('');
                void persist('');
              }}
              className="min-h-9 rounded-md px-3 py-2 text-[12px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
            >
              삭제
            </button>
            {message && (
              <span className="text-[11px] text-slate-500">{message}</span>
            )}
          </div>
        </>
      ) : (
        <p className="whitespace-pre-wrap pb-2 text-[13px] leading-relaxed text-slate-700">
          {saved}
        </p>
      )}
    </div>
  );
}
