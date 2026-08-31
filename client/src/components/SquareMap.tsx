// 2026-08-31 정사각형 지도 패널 (기본 숨김, 우측 슬롯)
import { useEffect, useRef } from 'react';
import {
  GoogleMap,
  Marker,
} from '@react-google-maps/api';
import { Loader2, Map as MapIcon, X } from 'lucide-react';
import { useTravelStore } from '../store/useTravelStore';
import { useMapUiStore } from '../store/useMapUiStore';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
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

  const mapRef = useRef<google.maps.Map | null>(null);

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
    <aside className="flex w-[min(100%,340px)] shrink-0 flex-col border-l border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <MapIcon className="h-4 w-4 text-primary-600" />
          지도
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="지도 닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
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

      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
        정사각 지도입니다. 검색하거나 장소를 선택하면 중심이 이동합니다.
      </p>
    </aside>
  );
}
