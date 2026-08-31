// 2026-08-31 Place·Day·초대 연동 Zustand 스토어
import { create } from 'zustand';
import type {
  DayAssignment,
  MemberRole,
  Place,
  PlaceSearchResult,
  TravelPlan,
} from '../types/travel';
import { travelApi } from '../utils/api';

interface TravelStore {
  travelPlans: TravelPlan[];
  selectedPlanId: string | null;
  selectedPlan: TravelPlan | null;
  myRole: MemberRole | null;
  isLoading: boolean;
  error: string | null;
  mapCenter: { lat: number; lng: number };
  mapZoom: number;
  selectedMapPlace: PlaceSearchResult | Place | null;

  fetchTravelPlans: () => Promise<void>;
  selectPlan: (id: string) => Promise<void>;
  addTravelPlan: (plan: {
    title: string;
    startDate: string;
    endDate: string;
    regionName: string;
    regionLat: number;
    regionLng: number;
  }) => Promise<void>;
  deleteTravelPlan: (id: string) => Promise<void>;
  refreshSelectedPlan: () => Promise<void>;

  addPlaceFromSearch: (result: PlaceSearchResult) => Promise<void>;
  deletePlace: (placeId: string) => Promise<void>;
  assignToDay: (placeId: string, dayIndex: number) => Promise<void>;
  moveAssignment: (
    assignmentId: string,
    dayIndex: number,
    order?: number,
  ) => Promise<void>;
  removeFromDay: (assignmentId: string) => Promise<void>;
  reorderDayAssignments: (
    dayIndex: number,
    orderedIds: string[],
  ) => Promise<void>;

  inviteByEmail: (
    email: string,
    role: 'editor' | 'viewer',
  ) => Promise<{ inviteUrl: string }>;
  createInviteLink: (
    role: 'editor' | 'viewer',
  ) => Promise<{ inviteUrl: string }>;
  updateMemberRole: (
    memberId: string,
    role: 'editor' | 'viewer',
  ) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;

  setMapCenter: (lat: number, lng: number, zoom?: number) => void;
  setSelectedMapPlace: (place: PlaceSearchResult | Place | null) => void;
  clearError: () => void;
  reset: () => void;
}

const canWriteRole = (role: MemberRole | null) =>
  role === 'owner' || role === 'editor';

export const useTravelStore = create<TravelStore>((set, get) => ({
  travelPlans: [],
  selectedPlanId: null,
  selectedPlan: null,
  myRole: null,
  isLoading: false,
  error: null,
  mapCenter: { lat: 37.5665, lng: 126.978 },
  mapZoom: 11,
  selectedMapPlace: null,

  fetchTravelPlans: async () => {
    set({ isLoading: true, error: null });
    try {
      const travelPlans = await travelApi.getPlans();
      const { selectedPlanId } = get();
      const validSelectedId = travelPlans.some((p) => p.id === selectedPlanId)
        ? selectedPlanId
        : (travelPlans[0]?.id ?? null);

      set({ travelPlans, isLoading: false });

      if (validSelectedId) {
        await get().selectPlan(validSelectedId);
      } else {
        set({
          selectedPlanId: null,
          selectedPlan: null,
          myRole: null,
        });
      }
    } catch (err) {
      set({
        isLoading: false,
        error:
          err instanceof Error
            ? err.message
            : '여행 계획을 불러오지 못했습니다.',
      });
    }
  },

  selectPlan: async (id) => {
    set({ error: null });
    try {
      const plan = await travelApi.getPlan(id);
      // 등록 장소가 있으면 첫 장소, 없으면 계획 지역으로 지도 시작
      const firstPlace = plan.places[0];
      let mapCenter = get().mapCenter;
      let mapZoom = 11;
      if (firstPlace) {
        mapCenter = { lat: firstPlace.lat, lng: firstPlace.lng };
        mapZoom = 13;
      } else if (plan.regionLat != null && plan.regionLng != null) {
        mapCenter = { lat: plan.regionLat, lng: plan.regionLng };
        mapZoom = 11;
      }
      set({
        selectedPlanId: id,
        selectedPlan: plan,
        myRole: (plan.myRole as MemberRole) ?? null,
        mapCenter,
        mapZoom,
        selectedMapPlace: null,
      });
    } catch (err) {
      set({
        error:
          err instanceof Error
            ? err.message
            : '여행 계획을 불러오지 못했습니다.',
      });
    }
  },

  addTravelPlan: async (plan) => {
    set({ error: null });
    try {
      const newPlan = await travelApi.createPlan(plan);
      set((state) => ({
        travelPlans: [newPlan, ...state.travelPlans],
      }));
      await get().selectPlan(newPlan.id);
    } catch (err) {
      set({
        error:
          err instanceof Error
            ? err.message
            : '여행 계획 추가에 실패했습니다.',
      });
      throw err;
    }
  },

  deleteTravelPlan: async (id) => {
    set({ error: null });
    try {
      await travelApi.deletePlan(id);
      const travelPlans = get().travelPlans.filter((p) => p.id !== id);
      set({ travelPlans });
      if (get().selectedPlanId === id) {
        if (travelPlans[0]) await get().selectPlan(travelPlans[0].id);
        else
          set({
            selectedPlanId: null,
            selectedPlan: null,
            myRole: null,
          });
      }
    } catch (err) {
      set({
        error:
          err instanceof Error
            ? err.message
            : '여행 계획 삭제에 실패했습니다.',
      });
      throw err;
    }
  },

  refreshSelectedPlan: async () => {
    const id = get().selectedPlanId;
    if (id) await get().selectPlan(id);
  },

  addPlaceFromSearch: async (result) => {
    const plan = get().selectedPlan;
    if (!plan || !canWriteRole(get().myRole)) {
      set({ error: '장소를 추가할 권한이 없습니다.' });
      return;
    }
    try {
      const place = await travelApi.addPlace(plan.id, {
        googlePlaceId: result.googlePlaceId,
        name: result.name,
        address: result.address,
        lat: result.lat,
        lng: result.lng,
        category: result.category,
        rating: result.rating,
        photoUrl: result.photoUrl,
        types: result.types,
      });
      set((state) => ({
        selectedPlan: state.selectedPlan
          ? {
              ...state.selectedPlan,
              places: [...state.selectedPlan.places, place],
            }
          : null,
        mapCenter: { lat: place.lat, lng: place.lng },
        mapZoom: 13,
        selectedMapPlace: place,
        travelPlans: state.travelPlans.map((p) =>
          p.id === plan.id
            ? { ...p, places: [...(p.places ?? []), place] }
            : p,
        ),
      }));
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : '장소 등록에 실패했습니다.',
      });
      throw err;
    }
  },

  deletePlace: async (placeId) => {
    const plan = get().selectedPlan;
    if (!plan || !canWriteRole(get().myRole)) return;
    try {
      await travelApi.deletePlace(plan.id, placeId);
      set((state) => ({
        selectedPlan: state.selectedPlan
          ? {
              ...state.selectedPlan,
              places: state.selectedPlan.places.filter((p) => p.id !== placeId),
              dayAssignments: state.selectedPlan.dayAssignments.filter(
                (d) => d.placeId !== placeId,
              ),
            }
          : null,
      }));
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : '장소 삭제에 실패했습니다.',
      });
    }
  },

  assignToDay: async (placeId, dayIndex) => {
    const plan = get().selectedPlan;
    if (!plan || !canWriteRole(get().myRole)) return;
    try {
      const assignment = await travelApi.assignDay(plan.id, {
        placeId,
        dayIndex,
      });
      set((state) => ({
        selectedPlan: state.selectedPlan
          ? {
              ...state.selectedPlan,
              dayAssignments: [
                ...state.selectedPlan.dayAssignments,
                assignment,
              ],
            }
          : null,
      }));
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : 'Day 배정에 실패했습니다.',
      });
    }
  },

  moveAssignment: async (assignmentId, dayIndex, order) => {
    const plan = get().selectedPlan;
    if (!plan || !canWriteRole(get().myRole)) return;
    try {
      const updated = await travelApi.updateAssignment(plan.id, assignmentId, {
        dayIndex,
        order,
      });
      set((state) => ({
        selectedPlan: state.selectedPlan
          ? {
              ...state.selectedPlan,
              dayAssignments: state.selectedPlan.dayAssignments.map((d) =>
                d.id === assignmentId ? updated : d,
              ),
            }
          : null,
      }));
      await get().refreshSelectedPlan();
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : '일정 이동에 실패했습니다.',
      });
    }
  },

  removeFromDay: async (assignmentId) => {
    const plan = get().selectedPlan;
    if (!plan || !canWriteRole(get().myRole)) return;
    try {
      await travelApi.removeAssignment(plan.id, assignmentId);
      set((state) => ({
        selectedPlan: state.selectedPlan
          ? {
              ...state.selectedPlan,
              dayAssignments: state.selectedPlan.dayAssignments.filter(
                (d) => d.id !== assignmentId,
              ),
            }
          : null,
      }));
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : '일정 제거에 실패했습니다.',
      });
    }
  },

  reorderDayAssignments: async (dayIndex, orderedIds) => {
    const plan = get().selectedPlan;
    if (!plan || !canWriteRole(get().myRole)) return;

    // 낙관적 업데이트
    set((state) => {
      if (!state.selectedPlan) return state;
      const others = state.selectedPlan.dayAssignments.filter(
        (d) => d.dayIndex !== dayIndex,
      );
      const reordered: DayAssignment[] = orderedIds.map((id, order) => {
        const existing = state.selectedPlan!.dayAssignments.find(
          (d) => d.id === id,
        )!;
        return { ...existing, dayIndex, order };
      });
      return {
        selectedPlan: {
          ...state.selectedPlan,
          dayAssignments: [...others, ...reordered],
        },
      };
    });

    try {
      await travelApi.reorderDay(plan.id, dayIndex, orderedIds);
    } catch (err) {
      await get().refreshSelectedPlan();
      set({
        error:
          err instanceof Error ? err.message : '순서 변경에 실패했습니다.',
      });
    }
  },

  inviteByEmail: async (email, role) => {
    const plan = get().selectedPlan;
    if (!plan || get().myRole !== 'owner') {
      throw new Error('초대는 소유자만 가능합니다.');
    }
    const result = await travelApi.inviteEmail(plan.id, { email, role });
    await get().refreshSelectedPlan();
    return { inviteUrl: result.inviteUrl };
  },

  createInviteLink: async (role) => {
    const plan = get().selectedPlan;
    if (!plan || get().myRole !== 'owner') {
      throw new Error('초대는 소유자만 가능합니다.');
    }
    const result = await travelApi.inviteLink(plan.id, role);
    await get().refreshSelectedPlan();
    return { inviteUrl: result.inviteUrl };
  },

  updateMemberRole: async (memberId, role) => {
    const plan = get().selectedPlan;
    if (!plan) return;
    await travelApi.updateMemberRole(plan.id, memberId, role);
    await get().refreshSelectedPlan();
  },

  removeMember: async (memberId) => {
    const plan = get().selectedPlan;
    if (!plan) return;
    await travelApi.removeMember(plan.id, memberId);
    await get().refreshSelectedPlan();
  },

  setMapCenter: (lat, lng, zoom) =>
    set({
      mapCenter: { lat, lng },
      ...(zoom != null ? { mapZoom: zoom } : {}),
    }),
  setSelectedMapPlace: (place) => set({ selectedMapPlace: place }),
  clearError: () => set({ error: null }),
  reset: () =>
    set({
      travelPlans: [],
      selectedPlanId: null,
      selectedPlan: null,
      myRole: null,
      isLoading: false,
      error: null,
      selectedMapPlace: null,
      mapZoom: 11,
    }),
}));
