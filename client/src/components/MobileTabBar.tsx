// 2026-09-22 모바일 하단 홈바 (여행 홈·일정·저장·게시판·도구)
import { Link, useLocation } from 'react-router-dom';
import {
  CalendarDays,
  Heart,
  MapPin,
  MessageCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { parseDashboardTab } from '../utils/mobileTabs';

const ITEMS = [
  {
    id: 'home',
    to: '/dashboard?tab=home',
    label: '여행 홈',
    Icon: MapPin,
  },
  {
    id: 'schedule',
    to: '/dashboard?tab=schedule',
    label: '일정',
    Icon: CalendarDays,
  },
  {
    id: 'saved',
    to: '/dashboard?tab=saved',
    label: '저장',
    Icon: Heart,
  },
  {
    id: 'board',
    to: '/board',
    label: '게시판',
    Icon: MessageCircle,
  },
  {
    id: 'tools',
    to: '/dashboard?tab=tools',
    label: '도구',
    Icon: SlidersHorizontal,
  },
] as const;

export default function MobileTabBar() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) return null;

  const params = new URLSearchParams(location.search);
  const dashTab = parseDashboardTab(params.get('tab'));
  const path = location.pathname;

  const isActive = (id: string): boolean => {
    if (id === 'board')
      return path.startsWith('/board') || path.startsWith('/releases');
    if (path.startsWith('/notices')) return id === 'tools';
    if (path.startsWith('/dashboard')) return id === dashTab;
    return false;
  };

  return (
    <nav
      className="safe-bottom z-30 shrink-0 border-t border-slate-200 bg-white lg:hidden"
      aria-label="주요 메뉴"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ id, to, label, Icon }) => {
          const active = isActive(id);
          return (
            <li key={id}>
              <Link
                to={to}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 py-1.5 ${
                  active ? 'text-slate-900' : 'text-slate-400'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon
                  className="h-5 w-5"
                  strokeWidth={active ? 2.2 : 1.7}
                  fill={id === 'saved' && active ? 'currentColor' : 'none'}
                />
                <span
                  className={`text-[10px] leading-none ${
                    active ? 'font-semibold' : 'font-medium'
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
