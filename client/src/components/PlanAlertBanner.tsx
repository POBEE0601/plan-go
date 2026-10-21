// 2026-10-21 알림 내용은 아이콘을 눌렀을 때만 카드로 보여 준다
import { X } from 'lucide-react';
import type { TravelAlert } from '../types/travel';

interface PlanAlertBannerProps {
  alerts: TravelAlert[];
  onDismiss: (alertId: string) => void;
}

export default function PlanAlertBanner({ alerts, onDismiss }: PlanAlertBannerProps) {
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <article
          key={alert.id}
          className={`rounded-xl border px-3 py-2 ${
            alert.severity === 'important'
              ? 'border-amber-300 bg-white'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800">
                {alert.countryLabel} · {alert.title}
              </p>
              <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-600">
                {alert.body}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                {alert.source ? `${alert.source} · ` : ''}
                확인 {alert.confirmedOn}
                {alert.endsOn ? ` · ${alert.startsOn}~${alert.endsOn}` : ` · ${alert.startsOn}부터`}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                관리자가 확인한 안내이며, 법적 효력이나 보상을 보장하지 않습니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(alert.id)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
              aria-label="이 알림 숨기기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
