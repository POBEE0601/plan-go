// 2026-09-01 목적지 통화 → 원화 시세 (무료 API)
import { useEffect, useState } from 'react';
import {
  currencyFromPlace,
  type CountryCurrency,
} from '../utils/geoCurrency';

interface ExchangeState {
  info: CountryCurrency | null;
  krwPerUnit: number | null;
  loading: boolean;
}

const cache = new Map<string, number>();

export const useExchangeRate = (
  lat?: number,
  lng?: number,
  placeName?: string,
): ExchangeState => {
  const info = currencyFromPlace(lat, lng, placeName);
  const [krwPerUnit, setKrwPerUnit] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!info || info.code === 'KRW') {
      setKrwPerUnit(1);
      setLoading(false);
      return;
    }

    const cached = cache.get(info.code);
    if (cached != null) {
      setKrwPerUnit(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`https://open.er-api.com/v6/latest/${info.code}`)
      .then((res) => res.json())
      .then((data: { result?: string; rates?: Record<string, number> }) => {
        const krw = data.rates?.KRW;
        if (cancelled) return;
        if (data.result === 'success' && typeof krw === 'number' && krw > 0) {
          cache.set(info.code, krw);
          setKrwPerUnit(krw);
        } else {
          setKrwPerUnit(null);
        }
      })
      .catch(() => {
        if (!cancelled) setKrwPerUnit(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [info?.code, lat, lng, placeName]);

  return { info, krwPerUnit, loading };
};
