// 2026-10-21 인원과 유아·임산부 준비 항목은 이 화면에서만 보여 준다
// 2026-10-06 체크리스트는 칸을 벗어날 때 저장. 쓰는 중에는 서버 값으로 되돌리지 않는다
// 2026-09-04 여행 준비 체크리스트·자유 메모
// 2026-09-04 제목 클릭 시 항목별 상세 펼침. 진행 바는 헤더로 이동
import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ClipboardList,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useTravelStore } from '../store/useTravelStore';
import type { PlanPartyInput, PrepItem } from '../types/travel';
import PartyCountFields from './PartyCountFields';

interface PrepBoardModalProps {
  open: boolean;
  canWrite: boolean;
  onClose: () => void;
}

function PrepItemRow({
  item,
  canWrite,
  expanded,
  onToggleExpand,
}: {
  item: PrepItem;
  canWrite: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const { togglePrepItem, updatePrepItemDetail, deletePrepItem } =
    useTravelStore();
  const [detail, setDetail] = useState(item.detail ?? '');
  const [saving, setSaving] = useState(false);
  const focusedRef = useRef(false);
  const detailRef = useRef(detail);
  detailRef.current = detail;

  useEffect(() => {
    if (focusedRef.current) return;
    setDetail(item.detail ?? '');
  }, [item.id, item.detail]);

  const saveDetail = async () => {
    if (!canWrite) return;
    const value = detailRef.current;
    if (value === (item.detail ?? '')) return;
    setSaving(true);
    try {
      await updatePrepItemDetail(item.id, value);
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="rounded-lg px-1 py-1 hover:bg-slate-50">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canWrite}
          onClick={() => togglePrepItem(item.id, !item.checked)}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
            item.checked
              ? 'border-primary-500 bg-primary-600 text-white'
              : 'border-slate-300 bg-white text-transparent'
          } ${canWrite ? '' : 'opacity-70'}`}
          aria-pressed={item.checked}
          aria-label={item.checked ? '완료 해제' : '완료 표시'}
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex min-w-0 flex-1 items-center gap-1 py-1 text-left"
          aria-expanded={expanded}
        >
          <span
            className={`min-w-0 flex-1 truncate text-sm font-medium ${
              item.checked ? 'text-slate-400 line-through' : 'text-slate-800'
            }`}
          >
            {item.label}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </button>
        {canWrite && (
          <button
            type="button"
            onClick={() => deletePrepItem(item.id)}
            className="rounded p-2 text-slate-300 hover:bg-red-50 hover:text-red-500"
            aria-label={`${item.label} 삭제`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {expanded && (
        <div className="ml-11 mt-1 pb-2 pr-1">
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            onFocus={() => {
              focusedRef.current = true;
            }}
            onBlur={() => {
              focusedRef.current = false;
              void saveDetail();
            }}
            disabled={!canWrite}
            rows={3}
            maxLength={4000}
            placeholder="예약번호, 준비 메모 등 상세 내용을 적어 두세요"
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary-500 disabled:bg-slate-50"
          />
          <p className="mt-0.5 text-right text-[11px] text-slate-400">
            {saving ? '저장 중…' : canWrite ? '칸 밖을 누르면 저장' : '읽기 전용'}
          </p>
        </div>
      )}
    </li>
  );
}

export default function PrepBoardModal({
  open,
  canWrite,
  onClose,
}: PrepBoardModalProps) {
  const { selectedPlan, updatePrepMemo, addPrepItem, updatePlanParty } = useTravelStore();

  const items = selectedPlan?.prepItems ?? [];
  const doneCount = items.filter((i) => i.checked).length;
  const progress =
    items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

  const [memo, setMemo] = useState(selectedPlan?.prepMemo ?? '');
  const [newLabel, setNewLabel] = useState('');
  const [savingMemo, setSavingMemo] = useState(false);
  const [adding, setAdding] = useState(false);
  const [savingParty, setSavingParty] = useState(false);
  const [partyError, setPartyError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const memoFocused = useRef(false);
  const memoRef = useRef(memo);
  memoRef.current = memo;

  useEffect(() => {
    if (!open || memoFocused.current) return;
    setMemo(selectedPlan?.prepMemo ?? '');
  }, [open, selectedPlan?.id, selectedPlan?.prepMemo]);

  useEffect(() => {
    if (open) setExpandedId(null);
  }, [open, selectedPlan?.id]);

  const flushMemo = async () => {
    if (!canWrite || !selectedPlan) return;
    const value = memoRef.current;
    if (value === (selectedPlan.prepMemo ?? '')) return;
    setSavingMemo(true);
    try {
      await updatePrepMemo(value);
    } finally {
      setSavingMemo(false);
    }
  };

  if (!open || !selectedPlan) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite || !newLabel.trim()) return;
    setAdding(true);
    try {
      const created = await addPrepItem(newLabel.trim());
      setNewLabel('');
      if (created) setExpandedId(created.id);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="flex h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:h-auto sm:max-h-[88vh] sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1 pr-2">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
              <ClipboardList className="h-5 w-5 text-primary-600" />
              여행 준비
            </h2>
            <p className="mt-0.5 truncate text-sm text-slate-500">
              {selectedPlan.title}
              {items.length > 0 ? ` · ${doneCount}/${items.length} 완료` : ''}
            </p>
            {items.length > 0 && (
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"
                title={`준비 진행률 ${progress}%`}
                aria-label={`준비 진행률 ${progress}%`}
              >
                <div
                  className="h-full rounded-full bg-primary-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              void flushMemo();
              onClose();
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          <PartyCountFields
            value={{
              adults: selectedPlan.adults ?? 1,
              children: selectedPlan.children ?? 0,
              infants: selectedPlan.infants ?? 0,
              pregnant: Boolean(selectedPlan.pregnant),
            }}
            disabled={!canWrite || savingParty}
            onChange={(next: PlanPartyInput) => {
              setSavingParty(true);
              setPartyError('');
              void updatePlanParty(next)
                .catch((err: unknown) => {
                  setPartyError(
                    err instanceof Error ? err.message : '인원을 저장하지 못했습니다.',
                  );
                })
                .finally(() => setSavingParty(false));
            }}
          />
          {partyError && <p className="mt-1 text-[11px] text-red-600">{partyError}</p>}
          <p className="mb-3 mt-1 text-[11px] text-slate-400">
            인원은 이 화면에서만 보입니다. 유아나 임산부를 켜면 준비 항목이 더해지고, 끄면 아직 체크하지 않은 항목만 빠집니다.
            {savingParty ? ' 저장 중…' : ''}
          </p>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            체크리스트
          </p>
          <p className="mb-2 text-[11px] text-slate-400">
            제목을 누르면 상세 내용을 열고 적을 수 있습니다.
          </p>
          <ul className="space-y-1">
            {items.length === 0 && (
              <li className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">
                아직 준비 항목이 없습니다.
              </li>
            )}
            {items.map((item) => (
              <PrepItemRow
                key={item.id}
                item={item}
                canWrite={canWrite}
                expanded={expandedId === item.id}
                onToggleExpand={() =>
                  setExpandedId((cur) => (cur === item.id ? null : item.id))
                }
              />
            ))}
          </ul>

          {canWrite && (
            <form onSubmit={handleAdd} className="mt-3 flex gap-2">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="제목 추가 (예: 국제운전면허)"
                maxLength={80}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary-500"
              />
              <button
                type="submit"
                disabled={adding || !newLabel.trim()}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {adding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                추가
              </button>
            </form>
          )}

          <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            전체 메모
          </p>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            onFocus={() => {
              memoFocused.current = true;
            }}
            onBlur={() => {
              memoFocused.current = false;
              void flushMemo();
            }}
            disabled={!canWrite}
            rows={5}
            maxLength={8000}
            placeholder="일정 전체에 해당하는 메모를 적어 두세요"
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary-500 disabled:bg-slate-50"
          />
          <p className="mt-1 text-right text-[11px] text-slate-400">
            {savingMemo ? '저장 중…' : canWrite ? '칸 밖을 누르면 저장' : '읽기 전용'}
          </p>
        </div>
      </div>
    </div>
  );
}
