// 2026-09-01 대시보드 UI: 선택 일자·좌측 메뉴 접기
import { create } from 'zustand';

interface PlanUiStore {
  activeDay: number;
  sidebarCollapsed: boolean;
  setActiveDay: (day: number) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const usePlanUiStore = create<PlanUiStore>((set) => ({
  activeDay: 1,
  sidebarCollapsed: false,
  setActiveDay: (day) => set({ activeDay: Math.max(1, day) }),
  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
