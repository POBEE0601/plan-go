// 2026-09-01 검색 결과 카테고리 이모지
// 2026-09-01 모바일: 검색줄 압축·지도 버튼 아이콘화
// 2026-08-31 상단 장소 검색바 (지도와 분리)
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
import { categoryBadge, categoryEmoji } from '../utils/days';
import type { PlaceSearchResult } from '../types/travel';

interface PlaceSearchBarProps {
  canWrite: boolean;
  mapVisible: boolean;
  onToggleMap: () => void;
}

export default function PlaceSearchBar({
  canWrite,
  mapVisible,
  onToggleMap,
}: PlaceSearchBarProps) {
  const {
    mapCenter,
    setMapCenter,
    selectedMapPlace,
    setSelectedMapPlace,
    addPlaceFromSearch,
  } = useTravelStore();
  const { searchResults, setSearchResults } = useMapUiStore();

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
        if (!mapVisible) onToggleMap();
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
      await addPlaceFromSearch(place);
    } catch {
      // store error
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="shrink-0 border-b border-slate-200 bg-white">
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5"
      >
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="장소 검색"
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary-500 sm:py-2"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="shrink-0 rounded-lg bg-primary-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60 sm:px-4 sm:py-2"
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : '검색'}
        </button>
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
      </form>

      {searchError && (
        <p className="bg-red-50 px-4 py-1.5 text-xs text-red-600">{searchError}</p>
      )}

      {(searchResults.length > 0 ||
        (selectedMapPlace && isSearchResult(selectedMapPlace))) && (
        <div className="border-t border-slate-100">
          <button
            type="button"
            onClick={() => setResultsOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-1.5 text-xs text-slate-500 hover:bg-slate-50"
          >
            <span>검색 결과 {searchResults.length}개</span>
            {resultsOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          {resultsOpen && (
            <div className="max-h-40 overflow-y-auto border-t border-slate-50 sm:max-h-28">
              {selectedMapPlace && isSearchResult(selectedMapPlace) && (
                <div className="flex items-start gap-3 border-b border-slate-100 bg-primary-50/40 px-4 py-2">
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
                      <span className="sm:hidden">추가</span>
                      <span className="hidden sm:inline">풀에 추가</span>
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
                    if (!mapVisible) onToggleMap();
                  }}
                  className={`flex min-h-11 w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-slate-50 sm:py-1.5 ${
                    selectedMapPlace &&
                    isSearchResult(selectedMapPlace) &&
                    selectedMapPlace.googlePlaceId === r.googlePlaceId
                      ? 'bg-primary-50'
                      : ''
                  }`}
                >
                  <span className="shrink-0 text-base">
                    {categoryEmoji(r.category)}
                  </span>
                  <span className="truncate font-medium">{r.name}</span>
                  <span className="truncate text-xs text-slate-400">
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
