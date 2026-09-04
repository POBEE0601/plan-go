// 2026-08-31 장소·일자·멤버 클라이언트 타입

export type PlaceCategory =
  | 'attraction'
  | 'restaurant'
  | 'hotel'
  | 'cafe'
  | 'other';

export type MemberRole = 'owner' | 'editor' | 'viewer';

export interface Place {
  id: string;
  planId: string;
  googlePlaceId?: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: PlaceCategory;
  rating?: number;
  photoUrl?: string;
  memo?: string;
  types?: string[];
}

export interface DayAssignment {
  id: string;
  planId: string;
  placeId: string;
  dayIndex: number;
  order: number;
  time?: string;
  memo?: string;
}

export interface PlanMember {
  id: string;
  planId: string;
  userId: string;
  email: string;
  name: string;
  role: MemberRole;
  status: 'pending' | 'accepted';
  inviteToken?: string;
  createdAt: string;
}

export interface PrepItem {
  id: string;
  planId: string;
  label: string;
  checked: boolean;
  sortOrder: number;
  isTemplate: boolean;
  detail: string;
}

export interface TravelPlan {
  id: string;
  userId: string;
  title: string;
  startDate: string;
  endDate: string;
  // 2026-08-31 여행 대표 지역 (지도 시작 위치)
  regionName?: string;
  regionLat?: number;
  regionLng?: number;
  prepMemo?: string;
  prepItems?: PrepItem[];
  places: Place[];
  dayAssignments: DayAssignment[];
  members: PlanMember[];
  myRole?: MemberRole;
}

// 2026-09-01 비상 팝업: 근처 병원
export interface NearbyHospital {
  googlePlaceId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  distanceText: string;
  facility: string;
  departments: string[];
  rating?: number;
  openNow?: boolean;
  mapsUrl: string;
  phone?: string;
}

export interface PlaceSearchResult {
  googlePlaceId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  photoUrl?: string;
  types: string[];
  category: PlaceCategory;
}

export interface CitySearchResult {
  googlePlaceId: string;
  cityName: string;
  countryName: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
}

export interface InvitePreview {
  planId: string;
  planTitle: string;
  role: 'editor' | 'viewer';
  email: string | null;
  status: string;
}

export interface TransitOption {
  mode: 'walking' | 'transit' | 'driving';
  label: string;
  durationText: string;
  durationSec: number;
  distanceText: string;
  distanceMeters: number;
}

export interface TransitSummary {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  options: TransitOption[];
  recommended: TransitOption | null;
}

export interface RouteStep {
  instruction: string;
  distanceText: string;
  durationText: string;
  travelMode: string;
  transit?: {
    lineName: string;
    vehicleType: string;
    departureStop: string;
    arrivalStop: string;
    numStops?: number;
  };
}

export interface RouteDetail {
  mode: 'walking' | 'transit' | 'driving';
  label: string;
  durationText: string;
  distanceText: string;
  summary: string;
  steps: RouteStep[];
  estimated?: boolean;
  failReason?: string;
  mapsUrl?: string;
}

export interface RouteDetailsResponse {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  routes: RouteDetail[];
}
