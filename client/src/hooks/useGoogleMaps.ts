// 2026-08-31 Google Maps JS 로더를 한 번만 공유
import { useJsApiLoader } from '@react-google-maps/api';

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

export const GOOGLE_MAPS_LOADER_OPTIONS = {
  id: 'plan-go-google-maps',
  googleMapsApiKey: MAPS_KEY || '',
  language: 'ko',
};

export const useGoogleMaps = () => useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);

export const mapsEmbedKey = MAPS_KEY || '';
