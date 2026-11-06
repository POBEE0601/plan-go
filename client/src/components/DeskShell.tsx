// 2026-11-06 여행 데스크 셸. 계획 화면의 일정 메뉴와 분리한다
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Globe2, Map, Newspaper } from 'lucide-react';
import Header from './Header';
import { useAuthStore } from '../store/useAuthStore';

export default function DeskShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-50 pb-16 lg:pb-0">
      <Header />
      {children}
      <DeskTabBar />
    </div>
  );
}

function DeskTabBar() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { pathname, hash } = useLocation();
  const onDesk = pathname === '/' || pathname.startsWith('/desk');
  const planTo = isAuthenticated ? '/dashboard' : '/login';

  const items = [
    {
      id: 'home',
      to: '/',
      label: '메인',
      Icon: Newspaper,
      active: onDesk && hash !== '#guides' && hash !== '#countries',
    },
    {
      id: 'guides',
      to: '/#guides',
      label: '가이드',
      Icon: BookOpen,
      active: pathname === '/' && hash === '#guides',
    },
    {
      id: 'countries',
      to: '/#countries',
      label: '나라',
      Icon: Globe2,
      active: pathname === '/' && hash === '#countries',
    },
    {
      id: 'plan',
      to: planTo,
      label: '계획',
      Icon: Map,
      active: pathname.startsWith('/dashboard'),
      state: isAuthenticated ? undefined : { from: '/dashboard' },
    },
  ] as const;

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white lg:hidden"
      aria-label="데스크 메뉴"
    >
      <ul className="grid grid-cols-4">
        {items.map(({ id, to, label, Icon, active, ...rest }) => (
          <li key={id}>
            <Link
              to={to}
              state={'state' in rest ? rest.state : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 py-1.5 ${
                active ? 'text-slate-900' : 'text-slate-400'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.7} />
              <span
                className={`text-[10px] leading-none ${
                  active ? 'font-semibold' : 'font-medium'
                }`}
              >
                {label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
