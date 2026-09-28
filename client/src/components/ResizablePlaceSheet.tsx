// 2026-09-28 손잡이를 올리면 목록 높이로 스냅하고, 접힘 높이는 줄이지 않음
// 2026-09-23 여행홈 기본 높이는 가로 스크롤 최소 영역
// 2026-09-23 드래그 중에는 지도 리렌더 없이 높이를 바로 반영
// 2026-09-23 여행홈 최소 높이는 가로 카드 영역까지 실측
// 2026-09-23 높이 변경을 지도 패딩에 알림
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
  // 비율 대신 실측 최소 높이(가로 스크롤 영역)로 연다
  defaultToMin?: boolean;
  minPx?: number;
  onHeightChange?: (height: number) => void;
  // 최소보다 높아지면 목록 모드로 알림
  onExpandedChange?: (expanded: boolean) => void;
  // 지정하면 시트가 이 비율보다 낮을 때 그만큼 올린다
  liftToRatio?: number | null;
}

export default function ResizablePlaceSheet({
  children,
  defaultRatio = 0.38,
  defaultToMin = false,
  minPx = 168,
  onHeightChange,
  onExpandedChange,
  liftToRatio = null,
}: ResizablePlaceSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const grabberRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const heightRef = useRef(0);
  const [measuredMin, setMeasuredMin] = useState(minPx);
  const ratioRef = useRef(defaultRatio);
  const preferMinRef = useRef(defaultToMin);
  const drag = useRef({ active: false, startY: 0, startH: 0 });
  const floorRef = useRef(minPx);
  const expandedRef = useRef(false);
  const onExpandedRef = useRef(onExpandedChange);
  onExpandedRef.current = onExpandedChange;

  // 실측 최소가 있으면 그걸 쓰고, 없으면 minPx
  const floorPx = measuredMin || minPx;
  floorRef.current = floorPx;

  const publishExpanded = (nextHeight: number) => {
    const expanded = nextHeight > floorRef.current + 24;
    if (expanded === expandedRef.current) return;
    expandedRef.current = expanded;
    onExpandedRef.current?.(expanded);
  };

  const clampHeight = useCallback(
    (next: number) => {
      const parentH = sheetRef.current?.parentElement?.clientHeight ?? 0;
      const max = Math.max(floorPx, Math.round(parentH * MAX_RATIO));
      return Math.min(max, Math.max(floorPx, next));
    },
    [floorPx],
  );

  const measureMin = useCallback(() => {
    const minEl = bodyRef.current?.querySelector<HTMLElement>('[data-sheet-min]');
    const grabberH = grabberRef.current?.offsetHeight ?? 0;
    if (!minEl) return;
    const next = grabberH + minEl.offsetHeight;
    // 목록으로 바뀌어도 카드 높이를 바닥으로 유지
    setMeasuredMin((prev) => (next > prev ? next : prev));
  }, []);

  useLayoutEffect(() => {
    measureMin();
    const minEl = bodyRef.current?.querySelector('[data-sheet-min]');
    if (!minEl) return;
    const ro = new ResizeObserver(() => measureMin());
    ro.observe(minEl);
    if (grabberRef.current) ro.observe(grabberRef.current);
    return () => ro.disconnect();
  }, [measureMin]);

  useLayoutEffect(() => {
    const parentH = sheetRef.current?.parentElement?.clientHeight ?? 0;
    const modeChanged =
      ratioRef.current !== defaultRatio ||
      preferMinRef.current !== defaultToMin;
    ratioRef.current = defaultRatio;
    preferMinRef.current = defaultToMin;
    const opened = defaultToMin
      ? floorPx
      : Math.round(parentH * defaultRatio);
    setHeight((h) => {
      const next = !h || modeChanged ? clampHeight(opened) : clampHeight(h);
      heightRef.current = next;
      return next;
    });
    const onResize = () => {
      setHeight((h) => {
        const next = clampHeight(h);
        heightRef.current = next;
        return next;
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clampHeight, defaultRatio, defaultToMin, floorPx]);

  useLayoutEffect(() => {
    if (height) onHeightChange?.(height);
  }, [height, onHeightChange]);

  useLayoutEffect(() => {
    if (!height) return;
    publishExpanded(height);
  }, [height, floorPx]);

  // 장소 상세가 열리면 시트를 올려 내용이 보이게
  useLayoutEffect(() => {
    if (liftToRatio == null || drag.current.active) return;
    const parentH = sheetRef.current?.parentElement?.clientHeight ?? 0;
    const target = clampHeight(Math.round(parentH * liftToRatio));
    setHeight((h) => {
      const next = Math.max(h, target);
      heightRef.current = next;
      return next;
    });
  }, [liftToRatio, clampHeight]);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    drag.current = {
      active: true,
      startY: e.clientY,
      startH: heightRef.current || height,
    };
    const move = (ev: globalThis.PointerEvent) => {
      if (!drag.current.active) return;
      const next = clampHeight(
        drag.current.startH + (drag.current.startY - ev.clientY),
      );
      heightRef.current = next;
      if (sheetRef.current) sheetRef.current.style.height = `${next}px`;
      publishExpanded(next);
    };
    const up = () => {
      drag.current.active = false;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      const parentH = sheetRef.current?.parentElement?.clientHeight ?? 0;
      const floor = floorRef.current;
      const half = Math.round(parentH * 0.5);
      let next = heightRef.current;
      const expanded = next > floor + 24;
      if (!expanded) next = floor;
      else if (next < half) next = clampHeight(half);
      next = clampHeight(next);
      heightRef.current = next;
      publishExpanded(next);
      setHeight(next);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  useLayoutEffect(() => {
    if (!drag.current.active || !sheetRef.current) return;
    sheetRef.current.style.height = `${heightRef.current}px`;
  });

  return (
    <div
      ref={sheetRef}
      className="absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-clip rounded-t-2xl border-t border-slate-200 bg-white shadow-[0_-8px_24px_rgba(15,23,42,0.12)]"
      style={{
        height: (drag.current.active ? heightRef.current : height) || undefined,
      }}
    >
      <button
        ref={grabberRef}
        type="button"
        className="flex w-full shrink-0 touch-none flex-col items-center pb-2 pt-3"
        aria-label="장소 영역 높이 조절"
        onPointerDown={onPointerDown}
      >
        <span className="h-1 w-10 rounded-full bg-slate-300" />
      </button>
      <div
        ref={bodyRef}
        className="flex min-h-0 flex-1 flex-col overflow-clip"
      >
        {children}
      </div>
    </div>
  );
}
