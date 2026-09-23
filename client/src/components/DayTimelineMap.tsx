// 2026-09-23 장소 이동은 한 번만 패닝하고 핀은 보이는 영역 중앙
// 2026-09-23 핀 팝업: 평점, 다크·라이트 색
// 2026-09-23 하단 시트 가림을 빼고 선택 장소로 카메라를 맞춤
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
import { GoogleMap, Marker, OverlayView, Polyline } from '@react-google-maps/api';
import { Loader2, MapPin, Star, X } from 'lucide-react';
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
  // 하단 시트 등 가림 높이(px). 핀이 보이는 영역 중앙에 오도록
  overlayPadding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  // 같은 장소가 하루에 두 번일 때 배정 전환도 따라가게
  focusToken?: string | null;
}

const mapContainerStyle = { width: '100%', height: '100%' };

const DEFAULT_PAD = { top: 72, right: 48, bottom: 24, left: 16 };
const FOLLOW_ZOOM = 13;

function shiftedCenter(
  map: google.maps.Map,
  target: google.maps.LatLngLiteral,
  padding: google.maps.Padding,
  zoom: number,
): google.maps.LatLngLiteral {
  const proj = map.getProjection();
  const dx = ((padding.left ?? 0) - (padding.right ?? 0)) / 2;
  const dy = ((padding.top ?? 0) - (padding.bottom ?? 0)) / 2;
  if (!proj) return target;
  const pt = proj.fromLatLngToPoint(new google.maps.LatLng(target.lat, target.lng));
  if (!pt) return target;
  const scale = 2 ** zoom;
  const next = proj.fromPointToLatLng(
    new google.maps.Point(pt.x - dx / scale, pt.y - dy / scale),
  );
  if (!next) return target;
  return { lat: next.lat(), lng: next.lng() };
}

function focusCamera(
  map: google.maps.Map,
  target: google.maps.LatLngLiteral,
  padding: google.maps.Padding,
) {
  const apply = () => {
    const center = shiftedCenter(map, target, padding, FOLLOW_ZOOM);
    const zoom = map.getZoom();
    const current = map.getCenter();
    const sameSpot =
      current != null &&
      Math.abs(current.lat() - center.lat) < 0.0004 &&
      Math.abs(current.lng() - center.lng) < 0.0004;
    if (zoom != null && Math.abs(zoom - FOLLOW_ZOOM) < 0.25) {
      if (sameSpot) return;
      map.panTo(center);
      return;
    }
    if (typeof map.moveCamera === 'function') {
      map.moveCamera({ center, zoom: FOLLOW_ZOOM });
      return;
    }
    map.setZoom(FOLLOW_ZOOM);
    map.setCenter(center);
  };
  // 투영이 없으면 빈 중심으로 먼저 점프하지 않고 한 번만 기다린다
  if (!map.getProjection()) {
    google.maps.event.addListenerOnce(map, 'idle', apply);
    return;
  }
  apply();
}

export default function DayTimelineMap({
  places,
  focusPlaceId,
  onSelectPlace,
  showHeader = false,
  layoutKey,
  overlayPadding,
  focusToken,
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
  const padTop = overlayPadding?.top ?? DEFAULT_PAD.top;
  const padRight = overlayPadding?.right ?? DEFAULT_PAD.right;
  const padBottom = overlayPadding?.bottom ?? DEFAULT_PAD.bottom;
  const padLeft = overlayPadding?.left ?? DEFAULT_PAD.left;
  const padding = useMemo(
    () => ({ top: padTop, right: padRight, bottom: padBottom, left: padLeft }),
    [padTop, padRight, padBottom, padLeft],
  );
  const paddingRef = useRef(padding);
  paddingRef.current = padding;
  const placesRef = useRef(places);
  placesRef.current = places;
  const bootCamera = useRef<{
    center: google.maps.LatLngLiteral;
    zoom: number;
  } | null>(null);
  const mapOptions = useMemo(
    () => ({
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
    }),
    [isLoaded, theme],
  );

  const fallbackCenter = useMemo(() => {
    if (selectedPlan?.regionLat != null && selectedPlan?.regionLng != null) {
      return { lat: selectedPlan.regionLat, lng: selectedPlan.regionLng };
    }
    return mapCenter;
  }, [selectedPlan?.regionLat, selectedPlan?.regionLng, mapCenter]);

  // center/zoom 을 매 렌더 새 객체로 넘기면 라이브러리가 카메라를 되돌려 깜빡인다
  if (!bootCamera.current) {
    const first = places[0];
    bootCamera.current = {
      center: first
        ? { lat: first.lat, lng: first.lng }
        : fallbackCenter,
      zoom: places.length ? FOLLOW_ZOOM : 11,
    };
  }
  const camera = bootCamera.current ?? {
    center: fallbackCenter,
    zoom: 11,
  };

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
    const list = placesRef.current;
    if (!map || !mapReady || !isLoaded) return;
    if (focusPlaceId && list.some((p) => p.id === focusPlaceId)) return;

    if (list.length === 1) {
      map.setCenter({ lat: list[0].lat, lng: list[0].lng });
      map.setZoom(14);
      return;
    }

    if (list.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      list.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      paths.forEach((path) => {
        path.forEach((pt) => bounds.extend(pt));
      });
      map.fitBounds(bounds, 56);
      return;
    }

    map.setCenter(fallbackCenter);
    map.setZoom(11);
  }, [isLoaded, mapReady, placeKey, paths, fallbackCenter, focusPlaceId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !isLoaded || layoutKey == null) return;
    google.maps.event.trigger(map, 'resize');
  }, [layoutKey, isLoaded, mapReady]);

  const focused = places.find((p) => p.id === focusPlaceId) ?? null;
  const focusLat = focused?.lat ?? null;
  const focusLng = focused?.lng ?? null;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !isLoaded || focusLat == null || focusLng == null) {
      return;
    }
    focusCamera(map, { lat: focusLat, lng: focusLng }, paddingRef.current);
  }, [
    focusPlaceId,
    focusToken,
    focusLat,
    focusLng,
    padTop,
    padRight,
    padBottom,
    padLeft,
    isLoaded,
    mapReady,
  ]);

  // 검색 결과가 생기면 첫 결과로 이동 (시트 가림 보정)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || searchResults.length === 0) return;
    const first = searchResults[0];
    focusCamera(map, { lat: first.lat, lng: first.lng }, padding);
  }, [searchKey, mapReady, searchResults.length, padding]);

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
          center={camera.center}
          zoom={camera.zoom}
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
          options={mapOptions}
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
              icon={numberedPinIcon(pinColorOf(place), i + 1)}
              onClick={() => {
                setInfoPlaceId(place.id);
                onSelectPlace?.(place.id);
              }}
            />
          ))}
          {infoPlace && (
            <OverlayView
              position={{ lat: infoPlace.lat, lng: infoPlace.lng }}
              mapPaneName={OverlayView.FLOAT_PANE}
              getPixelPositionOffset={(width, height) => ({
                x: -(width / 2),
                y: -(height + 46),
              })}
            >
              <div
                key={infoPlace.id}
                className={`pin-pop animate-pop-in w-52 rounded-2xl border px-3 py-2.5 shadow-lg ${
                  theme === 'dark'
                    ? 'border-slate-600 bg-slate-900 text-slate-100'
                    : 'border-slate-200 bg-white text-slate-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 text-sm font-semibold leading-snug">
                    {infoPlace.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => setInfoPlaceId(null)}
                    className={`-mr-1 -mt-1 rounded-md p-1 ${
                      theme === 'dark'
                        ? 'text-slate-400 hover:bg-slate-800'
                        : 'text-slate-400 hover:bg-slate-100'
                    }`}
                    aria-label="장소 정보 닫기"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span
                    className={`rounded-md px-1.5 py-0.5 ${
                      theme === 'dark'
                        ? 'bg-slate-800 text-slate-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {categoryBadge(infoPlace.category)}
                  </span>
                  {infoPlace.rating != null && (
                    <span className="inline-flex items-center gap-0.5 font-medium text-amber-500">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {infoPlace.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </OverlayView>
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
