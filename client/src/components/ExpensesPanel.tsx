// 2026-11-06 일본 여행은 결제마다 출국 환급 여부를 적는다
// 2026-09-28 영수증 사진으로 입력칸을 채우고, 읽는 동안 퍼센트를 보여 준다
// 2026-09-28 여행 지출: 직접 입력, 일차·장소·통화별 합계
import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ImagePlus, Plus, Trash2, Wallet } from 'lucide-react';
import { useTravelStore } from '../store/useTravelStore';
import { usePlanUiStore } from '../store/usePlanUiStore';
import { travelApi } from '../utils/api';
import { compressReceiptImage } from '../utils/receiptImage';
import { currencyFromPlace } from '../utils/geoCurrency';
import { formatDayMd, getDateForDay, getDayCount } from '../utils/days';
import type { ExpenseMethod, ExpenseRefundStatus, PlanExpense } from '../types/travel';
import {
  estimatedRefundYen,
  nextRefundStatus,
  REFUND_LABEL,
  refundGroups,
  showKioskHint,
  tripUsesJapanRefund,
} from '../utils/japanRefund';
import ConfirmDialog from './ConfirmDialog';

interface ExpensesPanelProps {
  canWrite: boolean;
}

const METHODS: { id: ExpenseMethod; label: string }[] = [
  { id: 'cash', label: '현금' },
  { id: 'card', label: '카드' },
  { id: 'other', label: '기타' },
];

const methodLabel = (method: ExpenseMethod): string =>
  METHODS.find((item) => item.id === method)?.label ?? '기타';

const formatMoney = (amount: number, currency: string): string => {
  const digits = currency === 'KRW' || currency === 'JPY' ? 0 : 2;
  try {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('ko-KR')} ${currency}`;
  }
};

export default function ExpensesPanel({ canWrite }: ExpensesPanelProps) {
  const selectedPlan = useTravelStore((s) => s.selectedPlan);
  const activeDay = usePlanUiStore((s) => s.activeDay);
  const [items, setItems] = useState<PlanExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('KRW');
  const [merchant, setMerchant] = useState('');
  const [method, setMethod] = useState<ExpenseMethod>('cash');
  const [dayIndex, setDayIndex] = useState<number | ''>('');
  const [placeId, setPlaceId] = useState('');
  const [note, setNote] = useState('');
  const [scanPercent, setScanPercent] = useState<number | null>(null);
  const [refundWanted, setRefundWanted] = useState(false);
  const [refundMixed, setRefundMixed] = useState(false);
  const [refundOnly, setRefundOnly] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const albumRef = useRef<HTMLInputElement>(null);
  const scanCreep = useRef<number | null>(null);

  const planId = selectedPlan?.id ?? '';
  const dayCount = selectedPlan
    ? getDayCount(selectedPlan.startDate, selectedPlan.endDate)
    : 1;
  const places = selectedPlan?.places ?? [];

  const currencyOptions = useMemo(() => {
    const local = selectedPlan
      ? currencyFromPlace(
          selectedPlan.regionLat,
          selectedPlan.regionLng,
          [selectedPlan.regionName, selectedPlan.title].filter(Boolean).join(' '),
        )?.code
      : null;
    return Array.from(new Set([local, 'KRW', 'USD', 'JPY', 'EUR'].filter(Boolean))) as string[];
  }, [selectedPlan]);

  useEffect(() => {
    if (!planId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    travelApi
      .listExpenses(planId)
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '지출을 불러오지 못했습니다.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [planId]);

  useEffect(
    () => () => {
      if (scanCreep.current != null) {
        window.clearInterval(scanCreep.current);
        scanCreep.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    const local = currencyOptions[0];
    if (local) setCurrency(local);
    setDayIndex(activeDay >= 1 && activeDay <= dayCount ? activeDay : '');
    setFormOpen(false);
    setAmount('');
    setMerchant('');
    setNote('');
    setPlaceId('');
    setMethod('cash');
    // 여행이 바뀔 때만 입력칸을 초기화
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  const totals = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.currency, (map.get(item.currency) ?? 0) + item.amount);
    }
    return [...map.entries()];
  }, [items]);

  const japanTrip = selectedPlan ? tripUsesJapanRefund(selectedPlan) : false;
  const refundItems = items.filter(
    (item) => item.refundStatus === 'pending' || item.refundStatus === 'checked',
  );
  const refundEstimate = refundItems.reduce(
    (sum, item) => (item.currency === 'JPY' ? sum + estimatedRefundYen(item.amount) : sum),
    0,
  );
  const shortfalls = japanTrip ? refundGroups(items) : [];
  const kiosk =
    japanTrip &&
    selectedPlan &&
    refundItems.length > 0 &&
    showKioskHint(selectedPlan, activeDay, dayCount);
  const visibleItems = refundOnly
    ? items.filter((item) => item.refundStatus === 'pending' || item.refundStatus === 'checked')
    : items;

  if (!selectedPlan) return null;

  const resetForm = () => {
    setAmount('');
    setMerchant('');
    setNote('');
    setPlaceId('');
    setMethod('cash');
    setRefundWanted(false);
    setRefundMixed(false);
  };

  const saveRefund = async (
    item: PlanExpense,
    refundStatus: ExpenseRefundStatus | null,
    mixed: boolean,
  ) => {
    if (!selectedPlan) return;
    const prev = items;
    setItems((rows) =>
      rows.map((row) =>
        row.id === item.id
          ? { ...row, refundStatus, refundMixed: mixed && refundStatus != null }
          : row,
      ),
    );
    try {
      const updated = await travelApi.updateExpense(selectedPlan.id, item.id, {
        refundStatus,
        refundMixed: mixed && refundStatus != null,
      });
      setItems((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
    } catch (err) {
      setItems(prev);
      setError(err instanceof Error ? err.message : '환급 표시를 저장하지 못했습니다.');
    }
  };

  const submit = async () => {
    const value = Number(amount.replace(/,/g, ''));
    if (!Number.isFinite(value) || value <= 0) {
      setError('금액을 입력해 주세요.');
      return;
    }
    const name = merchant.trim();
    if (!name) {
      setError('사용처를 입력해 주세요.');
      return;
    }
    setPending(true);
    setError('');
    try {
      const created = await travelApi.addExpense(selectedPlan.id, {
        amount: value,
        currency,
        merchant: name,
        method,
        dayIndex: dayIndex === '' ? null : dayIndex,
        placeId: placeId || null,
        note: note.trim(),
        refundStatus:
          japanTrip && currency === 'JPY' && refundWanted ? 'pending' : null,
        refundMixed: japanTrip && currency === 'JPY' && refundWanted && refundMixed,
      });
      setItems((prev) => [created, ...prev]);
      resetForm();
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '지출을 저장하지 못했습니다.');
    } finally {
      setPending(false);
    }
  };

  const remove = async (id: string) => {
    if (!selectedPlan) return;
    setConfirmId(null);
    setError('');
    const prev = items;
    setItems((rows) => rows.filter((row) => row.id !== id));
    try {
      await travelApi.deleteExpense(selectedPlan.id, id);
    } catch (err) {
      setItems(prev);
      setError(err instanceof Error ? err.message : '지출을 삭제하지 못했습니다.');
    }
  };

  const placeName = (id: string | null): string =>
    places.find((place) => place.id === id)?.name ?? '';

  const stopScanCreep = () => {
    if (scanCreep.current != null) {
      window.clearInterval(scanCreep.current);
      scanCreep.current = null;
    }
  };

  const dayFromPaidAt = (paidAt: string): number | '' => {
    const start = new Date(`${selectedPlan.startDate}T00:00:00`);
    const paid = new Date(`${paidAt}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(paid.getTime())) return '';
    const day = Math.round((paid.getTime() - start.getTime()) / 86_400_000) + 1;
    if (day < 1 || day > dayCount) return '';
    return day;
  };

  const matchPlace = (merchantName: string): string => {
    const folded = merchantName.toLowerCase().replace(/\s+/g, '');
    if (folded.length < 2) return '';
    const hit = places.find((place) => {
      const name = place.name.toLowerCase().replace(/\s+/g, '');
      return name.length >= 2 && (name.includes(folded) || folded.includes(name));
    });
    return hit?.id ?? '';
  };

  const scanFile = async (file: File) => {
    setFormOpen(true);
    setError('');
    setScanPercent(4);
    stopScanCreep();
    try {
      const image = await compressReceiptImage(file);
      setScanPercent(8);
      const draft = await travelApi.scanReceipt(selectedPlan.id, image, (percent) => {
        const uploaded = Math.max(8, Math.min(40, percent));
        setScanPercent((prev) => Math.max(prev ?? 0, uploaded));
        if (uploaded >= 40 && scanCreep.current == null) {
          scanCreep.current = window.setInterval(() => {
            setScanPercent((value) => {
              if (value == null || value < 40 || value >= 92) return value;
              return Math.min(92, value + Math.max(1, Math.round((92 - value) * 0.12)));
            });
          }, 400);
        }
      });
      stopScanCreep();
      if (draft.amount != null) setAmount(String(draft.amount));
      if (draft.currency) setCurrency(draft.currency);
      if (draft.merchant) {
        setMerchant(draft.merchant);
        setPlaceId(matchPlace(draft.merchant));
      }
      if (draft.method) setMethod(draft.method);
      if (draft.paidAt) setDayIndex(dayFromPaidAt(draft.paidAt));
      setScanPercent(100);
      if (draft.amount == null) {
        setError('금액을 읽지 못했습니다. 직접 입력해 주세요.');
      }
      window.setTimeout(() => setScanPercent(null), 700);
    } catch (err) {
      stopScanCreep();
      setScanPercent(null);
      setError(err instanceof Error ? err.message : '영수증을 읽지 못했습니다.');
    }
  };

  const onPickReceipt = (list: FileList | null) => {
    const file = list?.[0];
    if (file) void scanFile(file);
  };

  const shownCurrencies = Array.from(new Set([...currencyOptions, currency]));
  const scanLabel =
    scanPercent == null
      ? ''
      : scanPercent < 40
        ? '사진 올리는 중'
        : scanPercent < 100
          ? '영수증 읽는 중'
          : '입력칸에 채웠습니다';

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <p className="text-xs font-medium text-slate-400">이 여행 합계</p>
        {totals.length === 0 ? (
          <p className="mt-1 text-lg font-bold text-slate-800">0</p>
        ) : (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {totals.map(([code, sum]) => (
              <p key={code} className="text-lg font-bold text-slate-900">
                {formatMoney(sum, code)}
              </p>
            ))}
          </div>
        )}
        <p className="mt-1 text-[11px] text-slate-400">
          직접 적거나 영수증 사진으로 칸을 채웁니다.
        </p>
        {japanTrip && (
          <div className="mt-2 space-y-1">
            <button
              type="button"
              onClick={() => setRefundOnly((value) => !value)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                refundOnly
                  ? 'bg-primary-600 text-white'
                  : 'bg-primary-50 text-primary-700'
              }`}
              aria-pressed={refundOnly}
            >
              환급 예정 {refundItems.length}건
              {refundEstimate > 0 ? ` · 대략 ${refundEstimate.toLocaleString('ko-KR')}엔` : ''}
            </button>
            <p className="text-[11px] leading-relaxed text-slate-400">
              예상액은 세금 포함 금액의 10/110입니다. 식품은 8%라 영수증과 다를 수 있습니다.
            </p>
            {shortfalls.map((group) => (
              <p
                key={`${group.dayIndex ?? 'x'}-${group.merchant}`}
                className="text-[11px] text-amber-700"
              >
                {group.merchant}
                {group.dayIndex != null ? ` · ${group.dayIndex}일차` : ''} 세전 약{' '}
                {Math.round(group.taxExcluded).toLocaleString('ko-KR')}엔, 5,000엔까지{' '}
                {group.shortfall.toLocaleString('ko-KR')}엔
              </p>
            ))}
            {kiosk && (
              <p className="text-[11px] leading-relaxed text-slate-600">
                수하물을 맡기기 전에 출국장 키오스크. 레드면 그 물건을 보여 줘야 합니다.
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="shrink-0 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      {canWrite && (
        <div className="shrink-0 px-4 pt-3">
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              onPickReceipt(e.target.files);
              e.target.value = '';
            }}
          />
          <input
            ref={albumRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              onPickReceipt(e.target.files);
              e.target.value = '';
            }}
          />
          {scanPercent != null && (
            <div className="mb-2">
              <div
                className="h-2 overflow-hidden rounded-full bg-slate-200"
                role="progressbar"
                aria-valuenow={scanPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={scanLabel}
              >
                <div
                  className="h-full rounded-full bg-primary-600 transition-[width] duration-300"
                  style={{ width: `${scanPercent}%` }}
                />
              </div>
              <p className="mt-1 text-xs font-medium text-slate-600">
                {scanPercent}% {scanLabel}
              </p>
            </div>
          )}
          {!formOpen ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-600 py-2.5 text-sm font-medium text-white"
              >
                <Plus className="h-4 w-4" />
                지출 추가
              </button>
              <button
                type="button"
                disabled={scanPercent != null}
                onClick={() => cameraRef.current?.click()}
                className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50"
                aria-label="영수증 촬영"
              >
                <Camera className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={scanPercent != null}
                onClick={() => albumRef.current?.click()}
                className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50"
                aria-label="영수증 사진 올리기"
              >
                <ImagePlus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <form
              className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={scanPercent != null && scanPercent < 100}
                  onClick={() => cameraRef.current?.click()}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-50"
                >
                  <Camera className="h-3.5 w-3.5" />
                  카메라
                </button>
                <button
                  type="button"
                  disabled={scanPercent != null && scanPercent < 100}
                  onClick={() => albumRef.current?.click()}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-50"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  앨범
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="금액"
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
                >
                  {shownCurrencies.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
              <input
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="사용처"
                maxLength={80}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500"
              />
              <div className="flex gap-1">
                {METHODS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMethod(item.id)}
                    className={`flex-1 rounded-lg border py-1.5 text-xs font-medium ${
                      method === item.id
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <select
                  value={dayIndex === '' ? '' : String(dayIndex)}
                  onChange={(e) =>
                    setDayIndex(e.target.value ? Number(e.target.value) : '')
                  }
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
                >
                  <option value="">일차 없음</option>
                  {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}일차 {formatDayMd(getDateForDay(selectedPlan.startDate, day))}
                    </option>
                  ))}
                </select>
                <select
                  value={placeId}
                  onChange={(e) => setPlaceId(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
                >
                  <option value="">장소 없음</option>
                  {places.map((place) => (
                    <option key={place.id} value={place.id}>
                      {place.name}
                    </option>
                  ))}
                </select>
              </div>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="메모 (선택)"
                maxLength={200}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500"
              />
              {japanTrip && currency === 'JPY' && (
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setRefundWanted((value) => !value)}
                    className={`w-full rounded-lg border py-2 text-xs font-medium ${
                      refundWanted
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-slate-200 text-slate-500'
                    }`}
                    aria-pressed={refundWanted}
                  >
                    환급 받을 물건
                  </button>
                  {refundWanted && (
                    <button
                      type="button"
                      onClick={() => setRefundMixed((value) => !value)}
                      className={`w-full rounded-lg border py-2 text-left text-xs leading-relaxed ${
                        refundMixed
                          ? 'border-amber-300 bg-amber-50 text-amber-800'
                          : 'border-slate-200 text-slate-500'
                      }`}
                      aria-pressed={refundMixed}
                    >
                      이 결제에 일본에서 쓸 물건이 섞임. 하나라도 확인이 안 되면 이 결제 전체가 빠질 수 있습니다.
                    </button>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="flex-1 rounded-lg border border-slate-200 py-2 text-sm text-slate-600"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 rounded-lg bg-primary-600 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {pending ? '저장 중' : '저장'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {loading ? (
        <p className="px-4 py-8 text-center text-sm text-slate-400">불러오는 중</p>
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <Wallet className="mb-4 h-14 w-14 text-slate-200" strokeWidth={1.4} />
          <p className="text-base font-bold text-slate-800">아직 지출이 없습니다</p>
          <p className="mt-2 text-sm text-slate-400">
            현금이나 카드로 쓴 금액을 적어 두세요.
          </p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {visibleItems.map((item) => (
            <li
              key={item.id}
              className="mb-2 flex items-start gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {item.merchant}
                </p>
                <p className="mt-0.5 text-sm font-medium text-slate-900">
                  {formatMoney(item.amount, item.currency)}
                </p>
                <p className="mt-1 flex flex-wrap gap-1 text-[11px] text-slate-500">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5">
                    {methodLabel(item.method)}
                  </span>
                  {item.dayIndex != null && (
                    <span className="rounded bg-primary-50 px-1.5 py-0.5 text-primary-700">
                      {item.dayIndex}일차
                    </span>
                  )}
                  {placeName(item.placeId) && (
                    <span className="truncate">{placeName(item.placeId)}</span>
                  )}
                </p>
                {item.note && (
                  <p className="mt-1 truncate text-xs text-slate-400">{item.note}</p>
                )}
                {japanTrip && item.currency === 'JPY' && canWrite && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.refundStatus ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            void saveRefund(
                              item,
                              nextRefundStatus(item.refundStatus!),
                              item.refundMixed,
                            )
                          }
                          className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700"
                        >
                          {REFUND_LABEL[item.refundStatus]}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void saveRefund(item, item.refundStatus, !item.refundMixed)
                          }
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            item.refundMixed
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {item.refundMixed ? '섞임' : '한 종류'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveRefund(item, null, false)}
                          className="rounded-full px-2 py-0.5 text-[11px] text-slate-400"
                        >
                          해제
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void saveRefund(item, 'pending', false)}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                      >
                        환급 받을 물건
                      </button>
                    )}
                  </div>
                )}
                {item.refundMixed && (
                  <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
                    하나라도 확인이 안 되면 이 결제 전체가 빠질 수 있습니다.
                  </p>
                )}
              </div>
              {canWrite && (
                <button
                  type="button"
                  onClick={() => setConfirmId(item.id)}
                  className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                  aria-label="지출 삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={confirmId != null}
        title="지출 삭제"
        body="이 지출을 삭제할까요?"
        onClose={() => setConfirmId(null)}
        onConfirm={() => {
          if (confirmId) void remove(confirmId);
        }}
      />
    </div>
  );
}
