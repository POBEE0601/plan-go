// 2026-09-23 지도 확대·축소는 작게, 다크·라이트 색으로
import type { RefObject } from 'react';
import type { ThemeMode } from '../store/useThemeStore';

interface MapZoomButtonsProps {
  mapRef: RefObject<google.maps.Map | null>;
  theme: ThemeMode;
}

export default function MapZoomButtons({ mapRef, theme }: MapZoomButtonsProps) {
  const step = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    const next = Math.min(21, Math.max(3, (map.getZoom() ?? 13) + delta));
    map.setZoom(next);
  };

  const button =
    theme === 'dark'
      ? 'bg-slate-900/95 text-slate-100 hover:bg-slate-800'
      : 'bg-white/95 text-slate-700 hover:bg-slate-50';
  const frame =
    theme === 'dark'
      ? 'border-slate-600'
      : 'border-slate-200';

  return (
    <div
      className={`absolute right-3 top-3 z-30 flex flex-col overflow-hidden rounded-lg border shadow-md ${frame}`}
    >
      <button
        type="button"
        onClick={() => step(1)}
        className={`flex h-8 w-8 items-center justify-center text-base leading-none ${button}`}
        aria-label="지도 확대"
      >
        +
      </button>
      <button
        type="button"
        onClick={() => step(-1)}
        className={`flex h-8 w-8 items-center justify-center border-t text-base leading-none ${button} ${frame}`}
        aria-label="지도 축소"
      >
        −
      </button>
    </div>
  );
}
