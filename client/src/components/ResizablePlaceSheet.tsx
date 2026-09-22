// 2026-09-23 여행홈·일정 하단 장소 영역을 드래그로 높이 조절
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react';

const MAX_RATIO = 0.9;

interface ResizablePlaceSheetProps {
  children: ReactNode;
  defaultRatio?: number;
  minPx?: number;
}

export default function ResizablePlaceSheet({
  children,
  defaultRatio = 0.38,
  minPx = 168,
}: ResizablePlaceSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const drag = useRef({ active: false, startY: 0, startH: 0 });

  const clampHeight = useCallback(
    (next: number) => {
      const parentH = sheetRef.current?.parentElement?.clientHeight ?? 0;
      const max = Math.max(minPx, Math.round(parentH * MAX_RATIO));
      return Math.min(max, Math.max(minPx, next));
    },
    [minPx],
  );

  useLayoutEffect(() => {
    const parentH = sheetRef.current?.parentElement?.clientHeight ?? 0;
    setHeight(clampHeight(Math.round(parentH * defaultRatio)));
    const onResize = () => {
      setHeight((h) => clampHeight(h));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clampHeight, defaultRatio]);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { active: true, startY: e.clientY, startH: height };
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!drag.current.active) return;
    const next = drag.current.startH + (drag.current.startY - e.clientY);
    setHeight(clampHeight(next));
  };

  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    drag.current.active = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div
      ref={sheetRef}
      className="absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-2xl border-t border-slate-200 bg-white shadow-[0_-8px_24px_rgba(15,23,42,0.12)]"
      style={{ height: height || undefined }}
    >
      <button
        type="button"
        className="flex w-full shrink-0 touch-none flex-col items-center pb-1.5 pt-2"
        aria-label="장소 영역 높이 조절"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className="h-1 w-10 rounded-full bg-slate-300" />
      </button>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
