// 2026-09-01 검색 결과 카테고리 이모지
// 2026-09-01 모바일: 검색줄 압축·지도 버튼 아이콘화
// 2026-08-31 상단 장소 검색바 (지도와 분리)
// 2026-09-03 지도 위 오버레이 검색. 지도 토글 제거
// 2026-09-04 목록형(bar) / 지도형(overlay) 검색바 분기
// 2026-09-04 검색 입력 글자색이 배경에 묻히지 않도록 고정
// 2026-09-04 검색 결과 행 글자색 명시 (라이트 모드 가독성)
// 2026-09-04 검색 추가 시 풀이 아니라 선택 일차 일정에 바로 배정
import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Map as MapIcon,
  Plus,
  Search,
  Star,
  X,
} from 'lucide-react';
import { placesApi } from '../utils/api';
import { useTravelStore } from '../store/useTravelStore';
import { useMapUiStore } from '../store/useMapUiStore';
import { usePlanUiStore } from '../store/usePlanUiStore';
import { categoryBadge, categoryEmoji } from '../utils/days';
import type { PlaceSearchResult } from '../types/travel';

interface PlaceSearchBarProps {
  canWrite: boolean;
  variant?: 'overlay' | 'bar';
  mapVisible?: boolean;
  onToggleMap?: () => void;
}

export default function PlaceSearchBar({
  canWrite,
  variant = 'overlay',
  mapVisible = false,
  onToggleMap,
}: PlaceSearchBarProps) {
  const {
    mapCenter,
    setMapCenter,
    selectedMapPlace,
    setSelectedMapPlace,
    addPlaceFromSearch,
    assignToDay,
    selectedPlan,
    clearError,
  } = useTravelStore();
  const { searchResults, setSearchResults, clearSearchResults } =
    useMapUiStore();
  const activeDay = usePlanUiStore((s) => s.activeDay);
  const setSheetSnap = usePlanUiStore((s) => s.setSheetSnap);
  const setPoolOpen = usePlanUiStore((s) => s.setPoolOpen);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [resultsOpen, setResultsOpen] = useState(true);

  const isSearchResult = (
    place: unknown,
  ): place is PlaceSearchResult =>
    !!place && typeof place === 'object' && !('planId' in (place as object));

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError('');
    setResultsOpen(true);
    try {
      const data = await placesApi.search(
        query.trim(),
        mapCenter.lat,
        mapCenter.lng,
      );
      setSearchResults(data);
      if (data[0]) {
        setMapCenter(data[0].lat, data[0].lng, 14);
        setSelectedMapPlace(data[0]);
        if (variant === 'bar' && !mapVisible) onToggleMap?.();
      }
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : '검색에 실패했습니다.',
      );
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (place: PlaceSearchResult) => {
    if (!canWrite) return;
    setAdding(true);
    try {
      // 이미 풀에 있는 장소는 재등록하지 않고 일차만 배정
      const existing = selectedPlan?.places.find(
        (p) => p.googlePlaceId && p.googlePlaceId === place.googlePlaceId,
      );
      let placeId = existing?.id;
      if (!placeId) {
        try {
          const created = await addPlaceFromSearch(place);
          placeId = created?.id;
        } catch (err) {
          const msg = err instanceof Error ? err.message : '';
          if (!msg.includes('이미 등록된')) throw err;
          clearError();
          await useTravelStore.getState().refreshSelectedPlan();
          placeId = useTravelStore
            .getState()
            .selectedPlan?.places.find(
              (p) => p.googlePlaceId === place.googlePlaceId,
            )?.id;
        }
      }
      if (!placeId) return;
      const onDay = useTravelStore
        .getState()
        .selectedPlan?.dayAssignments.some(
          (a) => a.placeId === placeId && a.dayIndex === activeDay,
        );
      if (!onDay) await assignToDay(placeId, activeDay);
      // 하단 일정 목록이 보이도록 풀/검색 카드를 닫고 시트를 연다
      setPoolOpen(false);
      setSheetSnap('half');
      clearSearchResults();
      setResultsOpen(false);
    } catch {
      // store error
    } finally {
      setAdding(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSearchError('');
    clearSearchResults();
    if (selectedMapPlace && isSearchResult(selectedMapPlace)) {
      setSelectedMapPlace(null);
    }
  };

  const hasResults =
    searchResults.length > 0 ||
    (selectedMapPlace && isSearchResult(selectedMapPlace));

  const isBar = variant === 'bar';

  return (
    <div
      className={
        isBar
          ? 'shrink-0 border-b border-slate-200 bg-white'
          : 'pointer-events-auto w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-sm'
      }
    >
      <form
        onSubmit={handleSearch}
        className={
          isBar
            ? 'flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5'
            : 'flex items-center gap-2 px-2 py-2'
        }
      >
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="장소 검색"
            className={`w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 text-sm text-slate-900 caret-slate-900 outline-none placeholder:text-slate-400 focus:border-primary-500 ${
              isBar ? 'pr-3 py-2.5 sm:py-2' : 'pr-8'
            }`}
          />
          {!isBar && (query || hasResults) && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
              aria-label="검색 지우기"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={searching}
          className="shrink-0 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : '검색'}
        </button>
        {isBar && onToggleMap && (
          <button
            type="button"
            onClick={onToggleMap}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2.5 text-xs font-medium transition sm:px-3 sm:py-2 ${
              mapVisible
                ? 'border-primary-200 bg-primary-50 text-primary-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {mapVisible ? (
              <>
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">지도 닫기</span>
              </>
            ) : (
              <>
                <MapIcon className="h-4 w-4" />
                <span className="hidden sm:inline">지도 보기</span>
              </>
            )}
          </button>
        )}
      </form>

      {searchError && (
        <p className="bg-red-50 px-3 py-1.5 text-xs text-red-600">{searchError}</p>
      )}

      {hasResults && (
        <div className="border-t border-slate-100">
          <button
            type="button"
            onClick={() => setResultsOpen((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            <span>검색 결과 {searchResults.length}개</span>
            {resultsOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          {resultsOpen && (
            <div className="max-h-40 overflow-y-auto border-t border-slate-50">
              {selectedMapPlace && isSearchResult(selectedMapPlace) && (
                <div className="flex items-start gap-3 border-b border-slate-100 bg-primary-50/40 px-3 py-2">
                  {selectedMapPlace.photoUrl && (
                    <img
                      src={selectedMapPlace.photoUrl}
                      alt=""
                      className="h-11 w-11 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {categoryEmoji(selectedMapPlace.category)}{' '}
                      {selectedMapPlace.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {selectedMapPlace.address}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="rounded bg-primary-50 px-1.5 py-0.5 text-primary-700">
                        {categoryBadge(selectedMapPlace.category)}
                      </span>
                      {selectedMapPlace.rating != null && (
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {selectedMapPlace.rating}
                        </span>
                      )}
                    </div>
                  </div>
                  {canWrite && (
                    <button
                      type="button"
                      disabled={adding}
                      onClick={() => handleAdd(selectedMapPlace)}
                      className="flex shrink-0 items-center gap-1 rounded-lg bg-primary-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                    >
                      {adding ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      {activeDay}일차에 추가
                    </button>
                  )}
                </div>
              )}
              {searchResults.map((r) => (
                <button
                  key={r.googlePlaceId}
                  type="button"
                  onClick={() => {
                    setSelectedMapPlace(r);
                    setMapCenter(r.lat, r.lng, 14);
                    if (variant === 'bar' && !mapVisible) onToggleMap?.();
                  }}
                  className={`flex min-h-11 w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-800 hover:bg-slate-50 ${
                    selectedMapPlace &&
                    isSearchResult(selectedMapPlace) &&
                    selectedMapPlace.googlePlaceId === r.googlePlaceId
                      ? 'bg-primary-50'
                      : 'bg-white'
                  }`}
                >
                  <span className="shrink-0 text-base">
                    {categoryEmoji(r.category)}
                  </span>
                  <span className="truncate font-medium text-slate-800">
                    {r.name}
                  </span>
                  <span className="truncate text-xs text-slate-600">
                    {r.address}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
