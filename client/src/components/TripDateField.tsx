// 2026-09-23 여행 날짜는 칸 안에 두고, 종료 달력은 시작일이 있는 달부터 연다
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TripDateFieldProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder: string;
  disabled?: boolean;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const parseYmd = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

const toYmd = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const formatLabel = (value: string): string => {
  const date = parseYmd(value);
  if (!date) return '';
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
};

export default function TripDateField({
  value,
  onChange,
  min,
  max,
  placeholder,
  disabled = false,
}: TripDateFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => new Date());

  const openCalendar = () => {
    if (disabled) return;
    const anchor = parseYmd(value) ?? parseYmd(min ?? '') ?? new Date();
    setCursor(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const dayCount = new Date(year, month + 1, 0).getDate();
  const cells: Array<string | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: dayCount }, (_, index) =>
      toYmd(new Date(year, month, index + 1)),
    ),
  ];

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openCalendar())}
        className="flex h-10 w-full min-w-0 items-center rounded-lg border border-slate-400 bg-white px-3 text-left text-sm text-slate-800 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-60"
      >
        <span className={`truncate ${value ? '' : 'text-slate-400'}`}>
          {value ? formatLabel(value) : placeholder}
        </span>
      </button>

      {open && (
        <div className="mt-1 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
          <div className="mb-1 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
              aria-label="이전 달"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-xs font-semibold text-slate-700">
              {year}년 {month + 1}월
            </p>
            <button
              type="button"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
              aria-label="다음 달"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] text-slate-400">
            {WEEKDAYS.map((label) => (
              <span key={label} className="py-1">
                {label}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((ymd, index) => {
              if (!ymd) return <span key={`empty-${index}`} />;
              const blocked = Boolean((min && ymd < min) || (max && ymd > max));
              const selected = ymd === value;
              return (
                <button
                  key={ymd}
                  type="button"
                  disabled={blocked}
                  onClick={() => {
                    onChange(ymd);
                    setOpen(false);
                  }}
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs ${
                    selected
                      ? 'bg-primary-600 font-semibold text-white'
                      : blocked
                        ? 'text-slate-300'
                        : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {Number(ymd.slice(8))}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
