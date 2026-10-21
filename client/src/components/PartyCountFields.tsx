// 2026-10-21 성인·아동·유아 수와 임산부 여부만 받는다
import { Minus, Plus } from 'lucide-react';
import type { PlanPartyInput } from '../types/travel';

interface PartyCountFieldsProps {
  value: PlanPartyInput;
  onChange: (next: PlanPartyInput) => void;
  disabled?: boolean;
}

function Stepper({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-slate-600">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={disabled || value <= min}
          onClick={() => onChange(value - 1)}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 disabled:opacity-40"
          aria-label={`${label} 줄이기`}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-5 text-center text-sm font-medium text-slate-800">{value}</span>
        <button
          type="button"
          disabled={disabled || value >= max}
          onClick={() => onChange(value + 1)}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 disabled:opacity-40"
          aria-label={`${label} 늘리기`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function PartyCountFields({
  value,
  onChange,
  disabled,
}: PartyCountFieldsProps) {
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] text-slate-400">인원만 저장합니다. 이름과 생년월일은 받지 않습니다.</p>
      <Stepper
        label="성인"
        value={value.adults}
        min={1}
        max={20}
        disabled={disabled}
        onChange={(adults) => onChange({ ...value, adults })}
      />
      <Stepper
        label="아동"
        value={value.children}
        min={0}
        max={20}
        disabled={disabled}
        onChange={(children) => onChange({ ...value, children })}
      />
      <Stepper
        label="유아"
        value={value.infants}
        min={0}
        max={10}
        disabled={disabled}
        onChange={(infants) => onChange({ ...value, infants })}
      />
      <label className="flex items-center justify-between gap-2 text-xs text-slate-600">
        임산부 동행
        <input
          type="checkbox"
          checked={value.pregnant}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, pregnant: e.target.checked })}
          className="h-4 w-4 accent-primary-600"
        />
      </label>
    </div>
  );
}
