// 2026-09-01 차량 경로 1회만 조회 (TransitHint와 캐시·inflight 공유)
// 2026-09-01 일차 타임라인 지도: 번호 핀 + 실제 도로 경로
import { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import { Loader2, MapPin } from 'lucide-react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { fetchJsRoute } from '../utils/jsDirections';
import type { Place } from '../types/travel';

interface DayTimelineMapProps {
  places: Place[];
  focusPlaceId?: string | null;
  onSelectPlace?: (placeId: string) => void;
}

const mapContainerStyle = { width: '100%', height: '100%' };

export default function DayTimelineMap({
  places,
  focusPlaceId,
  onSelectPlace,
}: DayTimelineMapProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [paths, setPaths] = useState<google.maps.LatLngLiteral[][]>([]);

  const placeKey = useMemo(
    () => places.map((p) => `${p.id}:${p.lat},${p.lng}`).join('|'),
    [places],
  );

  // 연속 장소 사이 차량 경로. 실패하면 직선으로 이음
  useEffect(() => {
    if (!isLoaded || places.length < 2) {
      setPaths([]);
      return;
    }

    let cancelled = false;
    const run = async () => {
      const segments = await Promise.all(
        places.slice(1).map(async (to, i) => {
          const from = places[i];
          const route = await fetchJsRoute(from, to, 'driving');
          if (route?.overviewPath.length) return route.overviewPath;
          return [
            { lat: from.lat, lng: from.lng },
            { lat: to.lat, lng: to.lng },
          ];
        }),
      );
      if (!cancelled) setPaths(segments);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, placeKey, places]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !isLoaded || places.length === 0) return;

    if (places.length === 1) {
      map.setCenter({ lat: places[0].lat, lng: places[0].lng });
      map.setZoom(14);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    places.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
    paths.forEach((path) => {
      path.forEach((pt) => bounds.extend(pt));
    });
    map.fitBounds(bounds, 56);
  }, [isLoaded, mapReady, places, paths]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusPlaceId) return;
    const place = places.find((p) => p.id === focusPlaceId);
    if (!place) return;
    map.panTo({ lat: place.lat, lng: place.lng });
    const zoom = map.getZoom() ?? 14;
    if (zoom < 13) map.setZoom(14);
  }, [focusPlaceId, places]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <p className="flex items-center gap-1.5 border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
        <MapPin className="h-3.5 w-3.5 text-primary-600" />
        일차 동선
      </p>
      <div className="relative min-h-0 flex-1 overflow-hidden bg-slate-100">
        {loadError ? (
          <div className="flex h-full items-center justify-center px-3 text-center text-xs text-red-600">
            Maps 로드 실패. API 키를 확인하세요.
          </div>
        ) : !isLoaded ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
          </div>
        ) : places.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-xs text-slate-400">
            이 날에 담은 장소가 지도에 표시됩니다
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={{ lat: places[0].lat, lng: places[0].lng }}
            zoom={12}
            onLoad={(map) => {
              mapRef.current = map;
              setMapReady(true);
              window.setTimeout(() => {
                google.maps.event.trigger(map, 'resize');
              }, 80);
            }}
            onUnmount={() => {
              mapRef.current = null;
              setMapReady(false);
            }}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              zoomControl: true,
              clickableIcons: false,
            }}
          >
            {paths.map((path, i) =>
              path.length > 1 ? (
                <Polyline
                  key={`path-${i}`}
                  path={path}
                  options={{
                    strokeColor: '#2563eb',
                    strokeWeight: 5,
                    strokeOpacity: 0.9,
                  }}
                />
              ) : null,
            )}
            {places.map((place, i) => (
              <Marker
                key={`${place.id}-${i}`}
                position={{ lat: place.lat, lng: place.lng }}
                title={`${i + 1}. ${place.name}`}
                zIndex={focusPlaceId === place.id ? 200 : 100 + i}
                label={{
                  text: String(i + 1),
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: '700',
                }}
                onClick={() => onSelectPlace?.(place.id)}
              />
            ))}
          </GoogleMap>
        )}
      </div>
    </div>
  );
}
