// 2026-09-23 선택 장소로 카메라가 따라가며 이웃 핀까지 보이게
// 2026-09-22 카테고리 색 핀 + 클릭 시 장소명·카테고리
// 2026-09-14 모바일 카메라 컨트롤 숨김 (목록/검색 바와 겹침 방지)
// 2026-09-14 시트 접힘 시 지도 리사이즈·bounds 재맞춤
// 2026-09-16 장소 사이 차량 도로 경로 복구
// 2026-09-01 일차 타임라인 지도: 번호 핀 + 실제 도로 경로
// 2026-09-03 워크스페이스 캔버스: 검색 마커·빈 날에도 지도 유지
// 2026-09-04 목록형 패널용 헤더(showHeader)
// 2026-09-04 다크 테마 지도 스타일
import { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, InfoWindow, Marker, Polyline } from '@react-google-maps/api';
import { Loader2, MapPin } from 'lucide-react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { useMapUiStore } from '../store/useMapUiStore';
import { useTravelStore } from '../store/useTravelStore';
import { useThemeStore } from '../store/useThemeStore';
import { fetchJsRoute } from '../utils/jsDirections';
import { DARK_MAP_STYLES } from '../utils/mapTheme';
import { numberedPinIcon, pinColorOf } from '../utils/mapPin';
import { categoryBadge } from '../utils/days';
import type { Place, PlaceSearchResult } from '../types/travel';

interface DayTimelineMapProps {
  places: Place[];
  focusPlaceId?: string | null;
  onSelectPlace?: (placeId: string) => void;
  showHeader?: boolean;
  // 시트·검색바 토글처럼 컨테이너 크기가 바뀔 때 리사이즈 트리거
  layoutKey?: string;
}

const mapContainerStyle = { width: '100%', height: '100%' };

export default function DayTimelineMap({
  places,
  focusPlaceId,
  onSelectPlace,
  showHeader = false,
  layoutKey,
}: DayTimelineMapProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const searchResults = useMapUiStore((s) => s.searchResults);
  const theme = useThemeStore((s) => s.theme);
  const {
    mapCenter,
    selectedPlan,
    setMapCenter,
    setSelectedMapPlace,
  } = useTravelStore();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [paths, setPaths] = useState<google.maps.LatLngLiteral[][]>([]);
  const [infoPlaceId, setInfoPlaceId] = useState<string | null>(null);

  const fallbackCenter = useMemo(() => {
    if (selectedPlan?.regionLat != null && selectedPlan?.regionLng != null) {
      return { lat: selectedPlan.regionLat, lng: selectedPlan.regionLng };
    }
    return mapCenter;
  }, [selectedPlan?.regionLat, selectedPlan?.regionLng, mapCenter]);

  const placeKey = useMemo(
    () =>
      places
        .map(
          (p) =>
            `${p.id}:${p.lat},${p.lng}:${p.category}:${p.pinColor ?? ''}`,
        )
        .join('|'),
    [places],
  );

  const searchKey = useMemo(
    () => searchResults.map((r) => r.googlePlaceId).join('|'),
    [searchResults],
  );

  useEffect(() => {
    mapRef.current?.setOptions({
      styles: theme === 'dark' ? DARK_MAP_STYLES : [],
    });
  }, [theme]);

  // 연속 장소 사이 차량 도로 경로. 실패하면 직선으로 이음
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
    if (!map || !mapReady || !isLoaded) return;
    if (focusPlaceId && places.some((p) => p.id === focusPlaceId)) return;

    if (places.length === 1) {
      map.setCenter({ lat: places[0].lat, lng: places[0].lng });
      map.setZoom(14);
      return;
    }

    if (places.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      places.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      paths.forEach((path) => {
        path.forEach((pt) => bounds.extend(pt));
      });
      map.fitBounds(bounds, 56);
      return;
    }

    map.setCenter(fallbackCenter);
    map.setZoom(11);
  }, [isLoaded, mapReady, places, paths, fallbackCenter, focusPlaceId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !isLoaded || layoutKey == null) return;
    google.maps.event.trigger(map, 'resize');
  }, [layoutKey, isLoaded, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !isLoaded || !focusPlaceId) return;
    const idx = places.findIndex((p) => p.id === focusPlaceId);
    if (idx < 0) return;
    const focused = places[idx];
    const neighbors = [places[idx - 1], focused, places[idx + 1]].filter(
      (p): p is Place => Boolean(p),
    );
    if (neighbors.length >= 2) {
      const bounds = new google.maps.LatLngBounds();
      neighbors.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      map.fitBounds(bounds, 72);
      const t = window.setTimeout(() => {
        const z = map.getZoom();
        if (z != null && z > 16) map.setZoom(16);
        if (z != null && z < 13) map.setZoom(14);
      }, 80);
      return () => window.clearTimeout(t);
    }
    map.panTo({ lat: focused.lat, lng: focused.lng });
    const zoom = map.getZoom() ?? 14;
    if (zoom < 14) map.setZoom(15);
  }, [focusPlaceId, places, isLoaded, mapReady]);

  // 검색 결과가 생기면 첫 결과로 이동
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || searchResults.length === 0) return;
    const first = searchResults[0];
    map.panTo({ lat: first.lat, lng: first.lng });
    map.setZoom(14);
  }, [searchKey, mapReady, searchResults]);

  const onSearchMarkerClick = (result: PlaceSearchResult) => {
    setSelectedMapPlace(result);
    setMapCenter(result.lat, result.lng, 15);
  };

  const infoPlace = places.find((p) => p.id === infoPlaceId) ?? null;

  const mapBody = (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-slate-100">
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
          center={places[0] ? { lat: places[0].lat, lng: places[0].lng } : fallbackCenter}
          zoom={places.length ? 12 : 11}
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
            rotateControl: false,
            scaleControl: false,
            cameraControl: false,
            zoomControl: true,
            zoomControlOptions: isLoaded
              ? { position: google.maps.ControlPosition.RIGHT_TOP }
              : undefined,
            clickableIcons: false,
            styles: theme === 'dark' ? DARK_MAP_STYLES : [],
          }}
        >
          {paths.map((path, i) =>
            path.length > 1 ? (
              <Polyline
                key={`path-${i}`}
                path={path}
                options={{
                    strokeColor: theme === 'dark' ? '#60a5fa' : '#2563eb',
                  strokeWeight: 5,
                  strokeOpacity: 0.9,
                }}
              />
            ) : null,
          )}
          {searchResults.map((result) => (
            <Marker
              key={`search-${result.googlePlaceId}`}
              position={{ lat: result.lat, lng: result.lng }}
              title={result.name}
              zIndex={50}
              opacity={0.85}
              onClick={() => onSearchMarkerClick(result)}
            />
          ))}
          {places.map((place, i) => (
            <Marker
              key={`${place.id}-${i}-${place.pinColor ?? ''}-${place.category}`}
              position={{ lat: place.lat, lng: place.lng }}
              title={`${place.name} · ${categoryBadge(place.category)}`}
              zIndex={focusPlaceId === place.id ? 200 : 100 + i}
              icon={numberedPinIcon(
                pinColorOf(place),
                i + 1,
                focusPlaceId === place.id,
              )}
              onClick={() => {
                setInfoPlaceId(place.id);
                onSelectPlace?.(place.id);
              }}
            />
          ))}
          {infoPlace && (
            <InfoWindow
              position={{ lat: infoPlace.lat, lng: infoPlace.lng }}
              onCloseClick={() => setInfoPlaceId(null)}
            >
              <div className="min-w-[8rem] px-0.5 py-0.5">
                <p className="text-sm font-semibold text-slate-800">
                  {infoPlace.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {categoryBadge(infoPlace.category)}
                </p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      )}
    </div>
  );

  if (!showHeader) return mapBody;

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <p className="flex items-center gap-1.5 border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
        <MapPin className="h-3.5 w-3.5 text-primary-600" />
        일차 동선
      </p>
      <div className="relative min-h-0 flex-1 overflow-hidden">{mapBody}</div>
    </div>
  );
}
