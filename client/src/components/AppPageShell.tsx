// 2026-09-22 로그인 후 게시판·공지·배포 모바일 셸 (하단 홈바)
import type { ReactNode } from 'react';
import Header from './Header';
import MobileTabBar from './MobileTabBar';
import MobileTopBar from './MobileTopBar';
import { useAuthStore } from '../store/useAuthStore';

interface AppPageShellProps {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
}

export default function AppPageShell({
  title,
  extra,
  children,
}: AppPageShellProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return (
      <div className="min-h-dvh bg-slate-50">
        <Header />
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-slate-50 lg:h-auto lg:min-h-dvh lg:overflow-visible">
      <div className="hidden lg:block">
        <Header />
      </div>
      <MobileTopBar title={title} extra={extra} />
      <div className="min-h-0 flex-1 overflow-y-auto lg:overflow-visible">
        {children}
      </div>
      <MobileTabBar />
    </div>
  );
}
