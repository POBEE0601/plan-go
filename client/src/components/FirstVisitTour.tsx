// 2026-09-23 처음 여행 홈에 들어오면 짧은 안내를 한 번만 보여 준다
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'plan-go-home-tour';

const STEPS = [
  {
    selector: '[aria-label="장소 검색"]',
    title: '장소 찾기',
    body: '왼쪽 돋보기로 장소를 검색하세요.',
  },
  {
    selector: '[aria-label="장소 검색"]',
    title: '일정에 담기',
    body: '검색 결과에서 ‘이 날에 추가’를 누르면 일정에 들어갑니다.',
  },
  {
    selector: '[data-sheet-min]',
    title: '지도가 따라옵니다',
    body: '아래 카드를 넘기면 지도가 그 장소로 이동합니다.',
  },
  {
    selector: 'a[href="/dashboard?tab=schedule"]',
    title: '메모와 카테고리',
    body: '일정 탭에서 장소를 누르면 메모와 카테고리를 바꿀 수 있습니다.',
  },
];

interface Hole {
  top: number;
  left: number;
  width: number;
  height: number;
}

const readSeen = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return true;
  }
};

const markSeen = () => {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // 저장이 막혀 있어도 이번 화면에서는 닫는다
  }
};

export default function FirstVisitTour() {
  const [step, setStep] = useState(0);
  const [seen, setSeen] = useState(readSeen);
  const [hole, setHole] = useState<Hole | null>(null);

  const current = STEPS[step];

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
    markSeen();
    setSeen(true);
  };

  const next = () => {
    if (step >= STEPS.length - 1) finish();
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
          {step + 1} / {STEPS.length}
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
            {step >= STEPS.length - 1 ? '알겠어요' : '다음'}
          </button>
        </div>
      </div>
    </div>
  );
}
