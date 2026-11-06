// 2026-11-06 안내는 저장된 장소·카드·시트만 가리킨다
// 2026-09-23 처음 여행 홈에 들어오면 짧은 안내를 한 번만 보여 준다
import { useEffect, useState } from 'react';

export interface TourStep {
  selector: string;
  title: string;
  body: string;
}

export const MOBILE_HOME_TOUR: TourStep[] = [
  {
    selector: '[data-sheet-min]',
    title: '지도가 따라옵니다',
    body: '아래 카드를 넘기면 지도가 그 장소로 이동합니다. 앞뒤 버튼으로 순서를 바꿉니다.',
  },
  {
    selector: '[aria-label="장소 영역 높이 조절"]',
    title: '일정 목록',
    body: '손잡이를 올리면 시간순 목록이 열립니다. 시간을 적고, 장소를 누르면 메모를 바꿉니다.',
  },
  {
    selector: '[data-tour="saved-tab"]',
    title: '저장한 장소',
    body: '저장 탭에서 이미 담아 둔 장소를 날짜에 넣습니다.',
  },
];

export const DESK_HOME_TOUR: TourStep[] = [
  {
    selector: '[data-tour="day-tabs"]',
    title: '일차',
    body: '오늘이 표시됩니다. 좌우 화살표로 일차를 바꿉니다.',
  },
  {
    selector: '[data-tour="expense-tab"]',
    title: '지출',
    body: '지출은 여기서 엽니다. 일본 여행이면 환급할 결제를 표시할 수 있습니다.',
  },
  {
    selector: '[data-tour="unassigned"]',
    title: '미배정',
    body: '아직 날짜에 넣지 않은 장소는 일정 아래에 같이 보입니다.',
  },
];

interface Hole {
  top: number;
  left: number;
  width: number;
  height: number;
}

const readSeen = (key: string): boolean => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return true;
  }
};

const markSeen = (key: string) => {
  try {
    localStorage.setItem(key, '1');
  } catch {
    // 저장이 막혀 있어도 이번 화면에서는 닫는다
  }
};

interface FirstVisitTourProps {
  storageKey: string;
  steps: TourStep[];
}

export default function FirstVisitTour({
  storageKey,
  steps,
}: FirstVisitTourProps) {
  const [step, setStep] = useState(0);
  const [seen, setSeen] = useState(() => readSeen(storageKey));
  const [hole, setHole] = useState<Hole | null>(null);

  const current = steps[Math.min(step, steps.length - 1)];

  useEffect(() => {
    if (seen) return;
    const place = () => {
      const el = document.querySelector(current.selector);
      if (!el) {
        setHole(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      const pad = 6;
      setHole({
        top: Math.max(8, rect.top - pad),
        left: Math.max(8, rect.left - pad),
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [current.selector, seen, step]);

  if (seen) return null;

  const finish = () => {
    markSeen(storageKey);
    setSeen(true);
  };

  const next = () => {
    if (step >= steps.length - 1) finish();
    else setStep((value) => value + 1);
  };

  const cardTop = hole
    ? hole.top + hole.height + 12 + 150 > window.innerHeight
      ? Math.max(12, hole.top - 150)
      : hole.top + hole.height + 12
    : Math.max(24, window.innerHeight * 0.35);

  return (
    <div className="pointer-events-none fixed inset-0 z-[80]">
      {hole && (
        <div
          className="absolute rounded-2xl ring-2 ring-white"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.62)',
          }}
        />
      )}
      {!hole && <div className="absolute inset-0 bg-slate-950/60" />}
      <div
        className="pointer-events-auto absolute inset-x-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg"
        style={{ top: cardTop }}
      >
        <p className="text-[11px] font-medium text-slate-400">
          {step + 1} / {steps.length}
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-900">{current.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{current.body}</p>
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={finish}
            className="rounded-lg px-2 py-1.5 text-sm text-slate-500"
          >
            건너뛰기
          </button>
          <button
            type="button"
            onClick={next}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            {step >= steps.length - 1 ? '알겠어요' : '다음'}
          </button>
        </div>
      </div>
    </div>
  );
}
