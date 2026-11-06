// 2026-11-06 데스크 환율. 무료 시세 한 번으로 1만 원당 현지 금액을 계산한다
import { useEffect, useState } from 'react';

let cached: Record<string, number> | null = null;
let pending: Promise<Record<string, number> | null> | null = null;

const loadRates = (): Promise<Record<string, number> | null> => {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = fetch('https://open.er-api.com/v6/latest/USD')
      .then((res) => res.json())
      .then((data: { result?: string; rates?: Record<string, number> }) => {
        if (data.result === 'success' && data.rates?.KRW) {
          cached = data.rates;
          return data.rates;
        }
        return null;
      })
      .catch(() => null);
  }
  return pending;
};

export const foreignForKrw = (
  rates: Record<string, number> | null,
  code: string,
  krw = 10000,
): number | null => {
  if (!rates?.KRW || !rates[code]) return null;
  return (krw * rates[code]) / rates.KRW;
};

export const formatForeign = (amount: number, code: string): string => {
  const fraction = code === 'USD' || code === 'EUR' ? 2 : 0;
  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: fraction,
    minimumFractionDigits: fraction,
  }).format(amount);
};

export const useDeskRates = (): {
  rates: Record<string, number> | null;
  ready: boolean;
} => {
  const [rates, setRates] = useState<Record<string, number> | null>(cached);

  useEffect(() => {
    let cancelled = false;
    loadRates().then((next) => {
      if (!cancelled) setRates(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { rates, ready: rates != null };
};
