// 2026-11-06 일본 출국 환급 참고. 외부 조회는 하지 않는다
import type { ExpenseRefundStatus, PlanExpense, TravelPlan } from '../types/travel';
import { currencyFromPlace } from './geoCurrency';
import { localDateStamp } from './days';

export const JAPAN_REFUND_START = '2026-11-01';
const TAX_RATE = 1.1;
const THRESHOLD_EXCLUDED = 5000;

export const tripUsesJapanRefund = (
  plan: Pick<TravelPlan, 'endDate' | 'regionLat' | 'regionLng' | 'regionName' | 'title'>,
): boolean => {
  if (plan.endDate < JAPAN_REFUND_START) return false;
  const info = currencyFromPlace(
    plan.regionLat,
    plan.regionLng,
    [plan.regionName, plan.title].filter(Boolean).join(' '),
  );
  return info?.code === 'JPY';
};

export const estimatedRefundYen = (amount: number): number =>
  Math.round((amount * 10) / 110);

export const taxExcludedYen = (amount: number): number => amount / TAX_RATE;

export const REFUND_LABEL: Record<ExpenseRefundStatus, string> = {
  pending: '가져갈 예정',
  checked: '출국 확인',
  done: '환급 완료',
};

export const nextRefundStatus = (
  status: ExpenseRefundStatus,
): ExpenseRefundStatus => {
  if (status === 'pending') return 'checked';
  if (status === 'checked') return 'done';
  return 'pending';
};

const merchantKey = (name: string): string =>
  name.trim().toLowerCase().replace(/\s+/g, '');

export interface RefundGroup {
  merchant: string;
  dayIndex: number | null;
  taxExcluded: number;
  shortfall: number;
}

export const refundGroups = (items: PlanExpense[]): RefundGroup[] => {
  const map = new Map<string, RefundGroup>();
  for (const item of items) {
    if (!item.refundStatus || item.currency !== 'JPY') continue;
    const key = `${item.dayIndex ?? 'x'}|${merchantKey(item.merchant)}`;
    const current = map.get(key) ?? {
      merchant: item.merchant,
      dayIndex: item.dayIndex,
      taxExcluded: 0,
      shortfall: 0,
    };
    current.taxExcluded += taxExcludedYen(item.amount);
    map.set(key, current);
  }
  return [...map.values()]
    .map((group) => ({
      ...group,
      shortfall: Math.max(0, Math.ceil(THRESHOLD_EXCLUDED - group.taxExcluded)),
    }))
    .filter((group) => group.shortfall > 0);
};

export const showKioskHint = (
  plan: Pick<TravelPlan, 'endDate'>,
  activeDay: number,
  dayCount: number,
): boolean => activeDay === dayCount || plan.endDate === localDateStamp();
