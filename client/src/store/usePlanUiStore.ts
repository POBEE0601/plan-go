// 2026-09-01 대시보드 UI: 선택 일자·좌측 메뉴 접기
// 2026-09-03 하이브리드 레이아웃: 선택 assignment·인스펙터·풀·모바일 시트
// 2026-09-04 목록형/지도형 레이아웃 전환 (localStorage 유지)
import { create } from 'zustand';

export type SheetSnap = 'collapsed' | 'half' | 'full';
export type DashboardLayoutMode = 'classic' | 'hybrid';

const LAYOUT_STORAGE_KEY = 'plan-go-dashboard-layout';

const readLayoutMode = (): DashboardLayoutMode => {
  try {
    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (stored === 'classic' || stored === 'hybrid') return stored;
  } catch {
    // private mode 등
  }
  return 'hybrid';
};

const persistLayoutMode = (mode: DashboardLayoutMode) => {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, mode);
  } catch {
    // ignore
  }
};

interface PlanUiStore {
  activeDay: number;
  sidebarCollapsed: boolean;
  selectedAssignmentId: string | null;
  inspectorOpen: boolean;
  poolOpen: boolean;
  sheetSnap: SheetSnap;
  layoutMode: DashboardLayoutMode;
  setActiveDay: (day: number, opts?: { keepSelection?: boolean }) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  selectAssignment: (id: string | null) => void;
  closeInspector: () => void;
  setInspectorOpen: (open: boolean) => void;
  setPoolOpen: (open: boolean) => void;
  togglePool: () => void;
  setSheetSnap: (snap: SheetSnap) => void;
  setLayoutMode: (mode: DashboardLayoutMode) => void;
  resetPlanUi: () => void;
}

export const usePlanUiStore = create<PlanUiStore>((set) => ({
  activeDay: 1,
  sidebarCollapsed: false,
  selectedAssignmentId: null,
  inspectorOpen: false,
  poolOpen: false,
  sheetSnap: 'half',
  layoutMode: readLayoutMode(),
  setActiveDay: (day, opts) =>
    set((s) => {
      const next = Math.max(1, day);
      const sameDay = next === s.activeDay;
      const keep = Boolean(opts?.keepSelection) || sameDay;
      return {
        activeDay: next,
        selectedAssignmentId: keep ? s.selectedAssignmentId : null,
        inspectorOpen: keep ? s.inspectorOpen : false,
        poolOpen: sameDay ? s.poolOpen : false,
      };
    }),
  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  selectAssignment: (id) =>
    set((s) => ({
      selectedAssignmentId: id,
      inspectorOpen: id != null,
      poolOpen: false,
      sheetSnap: id != null ? 'full' : s.sheetSnap === 'full' ? 'half' : s.sheetSnap,
    })),
  closeInspector: () =>
    set((s) => ({
      inspectorOpen: false,
      sheetSnap: s.sheetSnap === 'full' ? 'half' : s.sheetSnap,
    })),
  setInspectorOpen: (open) =>
    set((s) => ({
      inspectorOpen: open,
      sheetSnap: open ? 'full' : s.sheetSnap === 'full' ? 'half' : s.sheetSnap,
    })),
  setPoolOpen: (open) => set({ poolOpen: open }),
  togglePool: () => set((s) => ({ poolOpen: !s.poolOpen })),
  setSheetSnap: (snap) => set({ sheetSnap: snap }),
  setLayoutMode: (mode) => {
    persistLayoutMode(mode);
    set({ layoutMode: mode });
  },
  resetPlanUi: () =>
    set({
      activeDay: 1,
      selectedAssignmentId: null,
      inspectorOpen: false,
      poolOpen: false,
      sheetSnap: 'half',
    }),
}));
