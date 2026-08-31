// 2026-08-31 장소 검색·지도 UI 상태
import { create } from 'zustand';
import type { PlaceSearchResult } from '../types/travel';

interface MapUiStore {
  searchResults: PlaceSearchResult[];
  setSearchResults: (results: PlaceSearchResult[]) => void;
  clearSearchResults: () => void;
}

export const useMapUiStore = create<MapUiStore>((set) => ({
  searchResults: [],
  setSearchResults: (results) => set({ searchResults: results }),
  clearSearchResults: () => set({ searchResults: [] }),
}));
