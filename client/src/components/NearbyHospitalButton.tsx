// 2026-09-01 카드에 가장 가까운 의료시설 거리를 기본 표시
// 2026-09-01 장소 카드: 응급실 이모지 + 의료시설 문구
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Loader2, Phone, X } from 'lucide-react';
import { placesApi } from '../utils/api';
import { telHref } from '../data/emergencyGuide';
import type { NearbyHospital } from '../types/travel';

const listCache = new Map<string, NearbyHospital[]>();

interface NearbyHospitalButtonProps {
  lat?: number;
  lng?: number;
  placeName?: string;
}

export default function NearbyHospitalButton({
  lat,
  lng,
  placeName,
}: NearbyHospitalButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [hospitals, setHospitals] = useState<NearbyHospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const phonesFetched = useRef(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ right: 12, bottom: 12 });

  const hasCoords =
    lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);

  const placeKey = hasCoords ? `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}` : '';

  // 카드가 보이면 가장 가까운 곳 거리만 먼저 조회 (전화번호 없음)
  useEffect(() => {
    if (!hasCoords || !placeKey) {
      setHospitals([]);
      return;
    }

    const cached = listCache.get(placeKey);
    if (cached?.length) {
      setHospitals(cached);
      setError('');
      phonesFetched.current = cached.some((h) => Boolean(h.phone));
      return;
    }

    phonesFetched.current = false;

    let cancelled = false;
    setLoading(true);
    setError('');

    placesApi
      .nearbyHospitals(lat, lng, { limit: 5 })
      .then((data) => {
        if (cancelled) return;
        listCache.set(placeKey, data);
        setHospitals(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : '근처 병원 조회에 실패했습니다.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasCoords, lat, lng, placeKey]);

  // 목록을 열 때만 연락처 조회
  useEffect(() => {
    if (!open || !hasCoords || !placeKey) return;
    if (hospitals.length === 0 || phonesFetched.current) return;

    phonesFetched.current = true;
    let cancelled = false;
    setDetailLoading(true);
    placesApi
      .nearbyHospitals(lat, lng, { limit: 5, phones: true })
      .then((data) => {
        if (cancelled) return;
        listCache.set(placeKey, data);
        setHospitals(data);
      })
      .catch(() => {
        phonesFetched.current = false;
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, hasCoords, lat, lng, placeKey, hospitals.length]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!hasCoords) return null;

  const nearest = hospitals[0];

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({
        right: Math.max(8, window.innerWidth - rect.right),
        bottom: Math.max(8, window.innerHeight - rect.top + 8),
      });
    }
    setOpen((v) => !v);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="absolute bottom-1.5 right-1.5 z-10 flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11px] shadow-sm ring-1 ring-slate-200 hover:bg-rose-50"
        aria-label={`${placeName ?? '이 장소'} 근처 의료시설`}
        title="근처 의료시설"
      >
        <span aria-hidden>🚑</span>
        <span className="font-medium text-slate-700">의료시설</span>
        {loading && !nearest ? (
          <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
        ) : nearest ? (
          <span className="font-semibold text-slate-500">
            {nearest.distanceText}
          </span>
        ) : null}
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[70] w-[min(calc(100vw-1.5rem),18.5rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            style={{ right: pos.right, bottom: pos.bottom }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <p className="min-w-0 truncate text-sm font-semibold text-slate-800">
                {placeName ? `${placeName} 근처 의료시설` : '근처 의료시설'}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto p-2">
              {loading && hospitals.length === 0 && (
                <div className="flex justify-center py-6 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              )}
              {!loading && error && (
                <p className="px-2 py-3 text-xs text-red-600">{error}</p>
              )}
              {!loading && !error && hospitals.length === 0 && (
                <p className="px-2 py-3 text-xs text-slate-400">
                  근처에 표시할 병원이 없습니다.
                </p>
              )}
              {hospitals.map((h) => (
                  <div
                    key={h.googlePlaceId}
                    className="rounded-lg px-2 py-2 hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 text-[13px] font-medium text-slate-800">
                        {h.name}
                      </p>
                      <span className="shrink-0 text-[11px] font-bold text-rose-600">
                        {h.distanceText}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {h.facility}
                      {h.departments[0] ? ` · ${h.departments[0]}` : ''}
                    </p>
                    {detailLoading && !h.phone ? (
                      <p className="mt-1 text-[11px] text-slate-400">
                        연락처 확인 중…
                      </p>
                    ) : h.phone ? (
                      <a
                        href={telHref(h.phone)}
                        className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-primary-700"
                      >
                        <Phone className="h-3 w-3" />
                        {h.phone}
                      </a>
                    ) : (
                      <p className="mt-1 text-[11px] text-slate-400">
                        공개 연락처 없음
                      </p>
                    )}
                    <a
                      href={h.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-primary-700"
                    >
                      <ExternalLink className="h-3 w-3" />
                      지도
                    </a>
                  </div>
                ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
