// 2026-09-28 장소 목록 JSON(name·lat·lng·placeId)도 읽음
// 2026-09-28 구글 테이크아웃 저장 장소 JSON → 미배정 장소
export interface TakeoutPlace {
  name: string;
  address: string;
  lat: number;
  lng: number;
  googlePlaceId?: string;
  category?: string;
  photoUrl?: string;
  rating?: number;
  memo?: string;
  savedAt?: string;
  state?: string;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const text = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const num = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const cidFromUrl = (url: string): string | undefined => {
  const matched = url.match(/[?&]cid=(\d+)/);
  return matched ? `cid:${matched[1]}` : undefined;
};

const mapCategory = (raw: string): string | undefined => {
  const value = raw.toLowerCase();
  if (!value) return undefined;
  if (/카페|cafe|coffee|커피/.test(value)) return 'cafe';
  if (/디저트|베이커|빵|dessert|bakery/.test(value)) return 'dessert';
  if (/쇼핑|shop|마트|store/.test(value)) return 'shopping';
  if (/맛집|식당|레스토랑|restaurant|food|음식/.test(value)) return 'restaurant';
  if (/관광|명소|박물관|공원|attraction/.test(value)) return 'attraction';
  return raw.slice(0, 40);
};

const readExportPlace = (value: unknown): TakeoutPlace | null => {
  const row = asRecord(value);
  if (!row || row.geometry || row.type === 'Feature') return null;
  const lat = num(row.lat);
  const lng = num(row.lng);
  if (lat == null || lng == null) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const name = text(row.name) || text(row.originalName);
  const address = text(row.fullAddress) || text(row.address);
  if (!name && !address) return null;
  const placeId = text(row.placeId) || text(row.googlePlaceId);
  const rating = num(row.rating);
  const photo = text(row.imageUrl) || text(row.photoUrl);
  const note = text(row.note) || text(row.memo);
  const savedAt =
    text(row.dateAdded) || text(row.dateUpdated) || text(row.savedAt);
  return {
    name: (name || address).slice(0, 120),
    address: address.slice(0, 240),
    lat,
    lng,
    googlePlaceId: placeId || undefined,
    category: mapCategory(text(row.category)),
    photoUrl: photo || undefined,
    rating: rating ?? undefined,
    memo: note ? note.slice(0, 200) : undefined,
    savedAt: savedAt || undefined,
    state: text(row.state).slice(0, 40) || undefined,
  };
};

const readFeature = (value: unknown): TakeoutPlace | null => {
  const feature = asRecord(value);
  if (!feature) return null;
  const geometry = asRecord(feature.geometry);
  const coords = Array.isArray(geometry?.coordinates)
    ? geometry.coordinates
    : [];
  let lng = num(coords[0]);
  let lat = num(coords[1]);
  const props = asRecord(feature.properties) ?? {};
  const location =
    asRecord(props.location) ??
    asRecord(props.Location) ??
    {};
  const geo =
    asRecord(location['Geo Coordinates']) ??
    asRecord(location.geo_coordinates);
  if (lat == null || lng == null) {
    lat = num(geo?.Latitude) ?? num(geo?.latitude);
    lng = num(geo?.Longitude) ?? num(geo?.longitude);
  }
  if (lat == null || lng == null) return null;
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
    const swap = lat;
    lat = lng;
    lng = swap;
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  const name =
    text(location.name) ||
    text(location.business_name) ||
    text(location['Business Name']) ||
    text(props.Title) ||
    text(props.title) ||
    text(props.name);
  const address =
    text(location.address) ||
    text(location.Address) ||
    text(props.address);
  if (!name && !address) return null;

  const url =
    text(props.google_maps_url) ||
    text(props.GoogleMapsURL) ||
    text(location.url);
  return {
    name: (name || address).slice(0, 120),
    address: address.slice(0, 240),
    lat,
    lng,
    googlePlaceId: cidFromUrl(url),
  };
};

const collectRows = (raw: unknown): unknown[] => {
  if (Array.isArray(raw)) return raw;
  const root = asRecord(raw);
  if (!root) return [];
  if (Array.isArray(root.features)) return root.features;
  if (Array.isArray(root.places)) return root.places;
  if (Array.isArray(root.items)) return root.items;
  if (Array.isArray(root.data)) return root.data;
  if (root.lat != null || root.geometry) return [root];
  return [];
};

export const parseTakeoutPlaces = (raw: unknown): TakeoutPlace[] => {
  const rows = collectRows(raw);
  const places: TakeoutPlace[] = [];
  const seen = new Set<string>();
  for (const feature of rows) {
    const place = readExportPlace(feature) ?? readFeature(feature);
    if (!place) continue;
    if (
      place.googlePlaceId &&
      places.some((item) => item.googlePlaceId === place.googlePlaceId)
    ) {
      continue;
    }
    const key = `${place.name.toLowerCase()}|${place.lat.toFixed(4)}|${place.lng.toFixed(4)}`;
    if (seen.has(key)) {
      const prev = places.findIndex(
        (item) =>
          `${item.name.toLowerCase()}|${item.lat.toFixed(4)}|${item.lng.toFixed(4)}` ===
          key,
      );
      if (prev >= 0 && !places[prev].googlePlaceId && place.googlePlaceId) {
        places[prev] = place;
      }
      continue;
    }
    seen.add(key);
    places.push(place);
  }
  return places;
};
