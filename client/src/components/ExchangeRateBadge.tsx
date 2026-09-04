// 2026-09-01 선택한 여행지 국가 환율 배지
// 2026-09-04 다크 모드에서 배지 글자가 배경에 묻히지 않도록 대비 고정
import { Banknote } from 'lucide-react';
import { useExchangeRate } from '../hooks/useExchangeRate';

interface ExchangeRateBadgeProps {
  lat?: number;
  lng?: number;
  placeName?: string;
}

const formatWon = (n: number): string =>
  Math.round(n).toLocaleString('ko-KR');

export default function ExchangeRateBadge({
  lat,
  lng,
  placeName,
}: ExchangeRateBadgeProps) {
  const { info, krwPerUnit, loading } = useExchangeRate(lat, lng, placeName);

  if (!info) return null;

  const unit = info.displayUnit;
  const won =
    krwPerUnit != null ? krwPerUnit * unit : null;

  return (
    <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900 sm:text-xs">
      <Banknote className="h-3 w-3 shrink-0" />
      {info.code === 'KRW' ? (
        '한국 원'
      ) : loading && won == null ? (
        `${info.countryKo} ${info.unitName} 환율 조회 중`
      ) : won != null ? (
        `${info.countryKo} · ${unit.toLocaleString('ko-KR')}${info.unitName} = ${formatWon(won)}원`
      ) : (
        `${info.countryKo} ${info.code}`
      )}
    </span>
  );
}
