// 2026-10-21 외부 일정을 읽어 확인한 줄만 저장한다. 메모장은 만들지 않는다
import { useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { ItineraryRow, TravelPlan } from '../types/travel';
import { getDayCount } from '../utils/days';
import { travelApi } from '../utils/api';

interface ItineraryImportModalProps {
  open: boolean;
  plan: TravelPlan;
  onClose: () => void;
  onApplied: (note: string) => void;
}

interface DraftRow extends ItineraryRow {
  key: string;
  query: string;
  included: boolean;
}

export default function ItineraryImportModal({
  open,
  plan,
  onClose,
  onApplied,
}: ItineraryImportModalProps) {
  const dayCount = getDayCount(plan.startDate, plan.endDate);
  const [text, setText] = useState('');
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const days = useMemo(
    () => Array.from({ length: dayCount }, (_, index) => index + 1),
    [dayCount],
  );

  if (!open) return null;

  const close = () => {
    if (parsing || applying) return;
    setText('');
    setRows([]);
    setTruncated(false);
    setError('');
    onClose();
  };

  const read = async () => {
    setParsing(true);
    setError('');
    try {
      const parsed = await travelApi.parseItinerary(plan.id, text);
      setTruncated(parsed.truncated);
      setRows(
        parsed.items.map((item, index) => ({
          ...item,
          key: `${index}-${item.name}`,
          query: item.name,
          included: Boolean(item.match),
        })),
      );
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : '일정을 읽지 못했습니다.');
    } finally {
      setParsing(false);
    }
  };

  const patch = (key: string, next: Partial<DraftRow>) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...next } : row)),
    );
  };

  const apply = async () => {
    const picked = rows.filter((row) => row.included && row.name.trim());
    if (picked.length === 0) {
      setError('넣을 줄을 선택해 주세요.');
      return;
    }
    setApplying(true);
    setError('');
    try {
      const result = await travelApi.applyItinerary(
        plan.id,
        picked.map((row) => ({
          dayIndex: row.dayIndex,
          time: row.time,
          name: row.name.trim(),
          memo: row.memo.trim(),
          googlePlaceId:
            row.name.trim() === row.query ? row.match?.googlePlaceId : undefined,
        })),
      );
      const missed =
        result.missed.length > 0 ? `\n찾지 못함: ${result.missed.join(', ')}` : '';
      onApplied(`${result.added}곳을 일정에 넣었습니다.${missed}`);
      setText('');
      setRows([]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '일정을 저장하지 못했습니다.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="flex h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:h-auto sm:max-h-[88vh] sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800">일정 가져오기</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              붙여 넣은 글은 일정으로만 읽습니다. 확인한 줄만 저장됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={4000}
            rows={6}
            placeholder={'1일차 10:00 호텔 체크인\n1일차 12:30 국제거리\n2일차 09:00 츄라우미'}
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500"
          />
          <button
            type="button"
            disabled={parsing || !text.trim()}
            onClick={() => void read()}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {parsing ? '읽는 중…' : '일정 읽기'}
          </button>
          {truncated && (
            <p className="text-xs text-amber-700">30줄까지만 읽었습니다.</p>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
          {rows.length > 0 && (
            <ul className="space-y-2">
              {rows.map((row) => (
                <li
                  key={row.key}
                  className={`rounded-xl border px-3 py-2 ${
                    row.match ? 'border-slate-200' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row.included}
                      onChange={(e) => patch(row.key, { included: e.target.checked })}
                      aria-label="이 줄 저장"
                    />
                    <select
                      value={row.dayIndex}
                      onChange={(e) =>
                        patch(row.key, { dayIndex: Number(e.target.value) })
                      }
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                    >
                      {days.map((day) => (
                        <option key={day} value={day}>
                          {day}일차
                        </option>
                      ))}
                    </select>
                    <input
                      value={row.time}
                      onChange={(e) => patch(row.key, { time: e.target.value })}
                      placeholder="시간"
                      className="w-20 rounded-md border border-slate-200 px-2 py-1 text-xs"
                    />
                    <input
                      value={row.name}
                      onChange={(e) => patch(row.key, { name: e.target.value })}
                      className="min-w-32 flex-1 rounded-md border border-slate-200 px-2 py-1 text-xs"
                    />
                  </div>
                  <input
                    value={row.memo}
                    onChange={(e) => patch(row.key, { memo: e.target.value })}
                    placeholder="메모"
                    className="mt-2 w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                  />
                  <p className={`mt-1 text-[11px] ${row.match ? 'text-slate-500' : 'text-red-600'}`}>
                    {row.name.trim() !== row.query
                      ? '이름을 고치면 저장할 때 다시 찾습니다.'
                      : row.match
                        ? `찾음: ${row.match.name}`
                        : '장소를 찾지 못했습니다. 이름을 고치거나 빼 주세요.'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            disabled={applying || rows.length === 0}
            onClick={() => void apply()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {applying && <Loader2 className="h-4 w-4 animate-spin" />}
            일정에 넣기
          </button>
        </div>
      </div>
    </div>
  );
}
