// 2026-08-31 장소·일자 배정·멤버 타입 정의

export type PlaceCategory =
  | 'attraction'
  | 'restaurant'
  | 'hotel'
  | 'cafe'
  | 'other';

export type MemberRole = 'owner' | 'editor' | 'viewer';

export type InviteStatus = 'pending' | 'accepted';

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
  status: InviteStatus;
  inviteToken?: string;
  createdAt: string;
}

// 레거시 Schedule (마이그레이션용)
export interface Schedule {
  id: string;
  title: string;
  location: string;
  date: string;
  time: string;
  memo: string;
  lat: number;
  lng: number;
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
  places: Place[];
  dayAssignments: DayAssignment[];
  members: PlanMember[];
  schedules?: Schedule[];
}

export interface CreateTravelPlanBody {
  title: string;
  startDate: string;
  endDate: string;
  regionName?: string;
  regionLat?: number;
  regionLng?: number;
}

export interface CreatePlaceBody {
  googlePlaceId?: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  category?: PlaceCategory;
  rating?: number;
  photoUrl?: string;
  memo?: string;
  types?: string[];
}

export interface AssignDayBody {
  placeId: string;
  dayIndex: number;
  time?: string;
  memo?: string;
}

export interface MoveAssignmentBody {
  dayIndex?: number;
  order?: number;
  time?: string;
  memo?: string;
}

export interface InviteBody {
  email?: string;
  role: 'editor' | 'viewer';
  createLink?: boolean;
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
