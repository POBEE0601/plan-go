// 2026-09-01 모바일: 전체 화면 오버레이, 데스크톱은 우측 정사각
// 2026-08-31 정사각형 지도 패널 (기본 숨김, 우측 슬롯)
// 2026-09-04 다크 테마 지도 스타일
import { useEffect, useRef } from 'react';
import {
  GoogleMap,
  Marker,
} from '@react-google-maps/api';
import { Loader2, Map as MapIcon, X } from 'lucide-react';
import { useTravelStore } from '../store/useTravelStore';
import { useMapUiStore } from '../store/useMapUiStore';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { useThemeStore } from '../store/useThemeStore';
import { DARK_MAP_STYLES } from '../utils/mapTheme';
import type { Place, PlaceSearchResult } from '../types/travel';

const mapContainerStyle = { width: '100%', height: '100%' };

interface SquareMapProps {
  onClose: () => void;
}

export default function SquareMap({ onClose }: SquareMapProps) {
  const {
    selectedPlan,
    mapCenter,
    mapZoom,
    setMapCenter,
    setSelectedMapPlace,
  } = useTravelStore();
  const searchResults = useMapUiStore((s) => s.searchResults);

  const { isLoaded, loadError } = useGoogleMaps();
  const theme = useThemeStore((s) => s.theme);

  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    mapRef.current?.setOptions({
      styles: theme === 'dark' ? DARK_MAP_STYLES : [],
    });
  }, [theme]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.panTo(mapCenter);
    mapRef.current.setZoom(mapZoom);
    window.setTimeout(() => {
      if (!mapRef.current) return;
      google.maps.event.trigger(mapRef.current, 'resize');
      mapRef.current.panTo(mapCenter);
    }, 80);
  }, [mapCenter, mapZoom]);

  const onMarkerClick = (place: Place | PlaceSearchResult) => {
    setSelectedMapPlace(place);
    setMapCenter(place.lat, place.lng, 15);
  };

  return (
    <aside className="flex shrink-0 flex-col bg-white max-lg:fixed max-lg:inset-0 max-lg:z-50 max-lg:p-4 max-lg:pt-[max(1rem,env(safe-area-inset-top))] max-lg:pb-[max(1rem,env(safe-area-inset-bottom))] lg:w-[min(100%,340px)] lg:border-l lg:border-slate-200 lg:p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <MapIcon className="h-4 w-4 text-primary-600" />
          지도
        </p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="지도 닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm lg:aspect-square lg:flex-none">
        {loadError ? (
          <div className="flex h-full items-center justify-center px-3 text-center text-xs text-red-600">
            Maps 로드 실패. API 키를 확인하세요.
          </div>
        ) : !isLoaded ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={mapZoom}
            onLoad={(map) => {
              mapRef.current = map;
              map.setCenter(mapCenter);
              map.setZoom(mapZoom);
            }}
            onUnmount={() => {
              mapRef.current = null;
            }}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              zoomControl: true,
              styles: theme === 'dark' ? DARK_MAP_STYLES : [],
            }}
          >
            {searchResults.map((r) => (
              <Marker
                key={r.googlePlaceId}
                position={{ lat: r.lat, lng: r.lng }}
                onClick={() => onMarkerClick(r)}
              />
            ))}
            {selectedPlan?.places.map((p) => (
              <Marker
                key={p.id}
                position={{ lat: p.lat, lng: p.lng }}
                onClick={() => onMarkerClick(p)}
                label={{ text: '★', color: '#2563eb', fontSize: '12px' }}
              />
            ))}
          </GoogleMap>
        )}
      </div>

      <p className="mt-2 hidden text-[11px] leading-relaxed text-slate-400 lg:block">
        정사각 지도입니다. 검색하거나 장소를 선택하면 중심이 이동합니다.
      </p>
    </aside>
  );
}
