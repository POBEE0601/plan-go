// 2026-09-22 여행별 준비·비상연락 (홈/일정 제목 우측)
import { ClipboardList, ShieldAlert } from 'lucide-react';
import { useTravelStore } from '../store/useTravelStore';

interface PlanQuickActionsProps {
  onPrep: () => void;
  onEmergency: () => void;
  compact?: boolean;
}

export default function PlanQuickActions({
  onPrep,
  onEmergency,
  compact = false,
}: PlanQuickActionsProps) {
  const selectedPlan = useTravelStore((s) => s.selectedPlan);
  const prepItems = selectedPlan?.prepItems ?? [];
  const prepDone = prepItems.filter((i) => i.checked).length;

  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={onPrep}
        className={
          compact
            ? 'flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700'
            : 'flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50'
        }
        aria-label="여행 준비"
      >
        <ClipboardList className="h-4 w-4 text-primary-600" />
        {!compact && <span className="hidden sm:inline">준비</span>}
        {prepItems.length > 0 && (
          <span className="text-[11px] text-slate-500">
            {prepDone}/{prepItems.length}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={onEmergency}
        className={
          compact
            ? 'flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-rose-500'
            : 'flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-rose-50'
        }
        aria-label="비상 연락망"
      >
        <ShieldAlert className="h-4 w-4 text-rose-500" />
        {!compact && <span className="hidden sm:inline">비상</span>}
      </button>
    </div>
  );
}
