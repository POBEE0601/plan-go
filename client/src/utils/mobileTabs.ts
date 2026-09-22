// 2026-09-22 모바일 홈바 탭 식별자
export type DashboardMobileTab = 'home' | 'schedule' | 'saved' | 'tools';

export const DASHBOARD_TAB_LABEL: Record<DashboardMobileTab, string> = {
  home: '여행 홈',
  schedule: '일정',
  saved: '저장',
  tools: '도구',
};

export const parseDashboardTab = (
  value: string | null,
): DashboardMobileTab => {
  if (value === 'schedule' || value === 'saved' || value === 'tools') {
    return value;
  }
  return 'home';
};
