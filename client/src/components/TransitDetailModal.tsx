// 2026-09-15 길찾기 하단 시트: 구글맵 바로가기 버튼만
import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import {
  ArrowRight,
  Bus,
  Car,
  ExternalLink,
  Footprints,
  MapPin,
  X,
} from 'lucide-react';
import { buildMapsUrl, type TravelModeKey } from '../utils/jsDirections';
import type { Place } from '../types/travel';

interface TransitDetailModalProps {
  open: boolean;
  from: Place;
  to: Place;
  initialMode?: TravelModeKey;
  onClose: () => void;
}

const MODES: TravelModeKey[] = ['walking', 'transit', 'driving'];

const modeIcon = (mode: TravelModeKey) => {
  if (mode === 'walking') return <Footprints className="h-4 w-4" />;
  if (mode === 'transit') return <Bus className="h-4 w-4" />;
  return <Car className="h-4 w-4" />;
};

const navLabel = (mode: TravelModeKey) =>
  mode === 'driving'
    ? '구글 지도에서 차량 길찾기 열기'
    : mode === 'transit'
      ? '구글 지도에서 대중교통 길찾기 열기'
      : '구글 지도에서 도보 길찾기 열기';

export default function TransitDetailModal({
  open,
  from,
  to,
  initialMode,
  onClose,
}: TransitDetailModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="transit-detail-title"
        className="w-full max-w-md rounded-t-2xl bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-xl sm:rounded-2xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="transit-detail-title"
              className="text-lg font-bold text-slate-800"
            >
              길찾기
            </h2>
            <p className="mt-1 flex items-center gap-1 truncate text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary-500" />
              <span className="truncate">{from.name}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{to.name}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {MODES.map((mode) => {
            const selected = initialMode === mode;
            return (
              <a
                key={mode}
                href={buildMapsUrl(from, to, mode)}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                  selected
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-primary-50 text-primary-800 hover:bg-primary-100'
                }`}
              >
                {modeIcon(mode)}
                {navLabel(mode)}
                <ExternalLink className="h-4 w-4" />
              </a>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
