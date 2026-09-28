// 2026-09-28 일정 탭은 여행 홈으로 합치고, 지출 탭을 추가
// 2026-09-22 모바일 홈바 탭 식별자
export type DashboardMobileTab = 'home' | 'saved' | 'expenses' | 'tools';

export const DASHBOARD_TAB_LABEL: Record<DashboardMobileTab, string> = {
  home: '여행 홈',
  saved: '저장',
  expenses: '지출',
  tools: '도구',
};

export const parseDashboardTab = (
  value: string | null,
): DashboardMobileTab => {
  // 예전 일정 주소는 합쳐진 여행 홈으로 연다
  if (value === 'schedule') return 'home';
  if (value === 'saved' || value === 'expenses' || value === 'tools') {
    return value;
  }
  return 'home';
};
