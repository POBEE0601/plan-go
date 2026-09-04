// 2026-09-01 모바일 헤더: 햄버거 메뉴·여행 목록 버튼·컴팩트 액션
// 2026-09-04 다크/라이트 전환 버튼
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LogIn,
  LogOut,
  MapPin,
  Megaphone,
  Menu,
  MessageSquareText,
  PanelLeft,
  Rocket,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useTravelStore } from '../store/useTravelStore';
import ThemeToggle from './ThemeToggle';

interface HeaderProps {
  onInvite?: () => void;
  roleLabel?: string;
  onOpenPlans?: () => void;
}

export default function Header({
  onInvite,
  roleLabel,
  onOpenPlans,
}: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const resetTravel = useTravelStore((s) => s.reset);
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);

  const handleLogout = () => {
    logout();
    resetTravel();
    setNavOpen(false);
    navigate('/');
  };

  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  const closeNav = () => setNavOpen(false);

  return (
    <header className="safe-top relative z-30 shrink-0 border-b border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:px-6 sm:py-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 sm:gap-6">
          {onOpenPlans && (
            <button
              type="button"
              onClick={onOpenPlans}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden"
              aria-label="여행 계획 목록 열기"
            >
              <PanelLeft className="h-5 w-5" />
            </button>
          )}

          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            className="flex min-w-0 items-center gap-2 sm:gap-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white sm:h-10 sm:w-10">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                plan-go
              </h1>
              <p className="hidden text-sm text-slate-500 sm:block">
                Plan Together, Record Forever
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {isAuthenticated && (
              <Link
                to="/dashboard"
                className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                내 여행
              </Link>
            )}
            <Link
              to="/notices"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              <Megaphone className="h-4 w-4" />
              공지사항
            </Link>
            <Link
              to="/releases"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              <Rocket className="h-4 w-4" />
              배포게시판
            </Link>
            {isAuthenticated && (
              <Link
                to="/board"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-50"
              >
                <MessageSquareText className="h-4 w-4" />
                고객게시판
              </Link>
            )}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <ThemeToggle compact />
          {roleLabel && (
            <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 sm:inline">
              {roleLabel}
            </span>
          )}
          {onInvite && (
            <button
              type="button"
              onClick={onInvite}
              className="hidden items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 lg:flex"
            >
              <UserPlus className="h-4 w-4" />
              초대
            </button>
          )}
          {isAuthenticated && user ? (
            <>
              <div className="hidden items-center gap-2 text-sm text-slate-600 md:flex">
                <User className="h-4 w-4 text-slate-400" />
                <span className="max-w-[8rem] truncate font-medium">
                  {user.name}
                </span>
                {user.isAdmin && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                    관리자
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-red-600 lg:flex"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 lg:inline-flex"
              >
                <LogIn className="h-4 w-4" />
                로그인
              </Link>
              <Link
                to="/register"
                className="hidden items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 lg:inline-flex"
              >
                <UserPlus className="h-4 w-4" />
                회원가입
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden"
            aria-label="메뉴 열기"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {navOpen && (
        <div className="lg:hidden">
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40"
            aria-label="메뉴 닫기"
            onClick={closeNav}
          />
          <div className="safe-bottom safe-top fixed inset-y-0 right-0 z-50 flex w-[min(100%,20rem)] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">메뉴</p>
              <button
                type="button"
                onClick={closeNav}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="메뉴 닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isAuthenticated && user && (
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
                <User className="h-4 w-4 text-slate-400" />
                <span className="font-medium">{user.name}</span>
                {roleLabel && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                    {roleLabel}
                  </span>
                )}
                {user.isAdmin && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                    관리자
                  </span>
                )}
              </div>
            )}

            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
              {isAuthenticated && (
                <Link
                  to="/dashboard"
                  onClick={closeNav}
                  className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm text-slate-700 hover:bg-slate-50"
                >
                  내 여행
                </Link>
              )}
              <Link
                to="/notices"
                onClick={closeNav}
                className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Megaphone className="h-4 w-4" />
                공지사항
              </Link>
              <Link
                to="/releases"
                onClick={closeNav}
                className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Rocket className="h-4 w-4" />
                배포게시판
              </Link>
              {isAuthenticated && (
                <Link
                  to="/board"
                  onClick={closeNav}
                  className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium text-primary-700 hover:bg-primary-50"
                >
                  <MessageSquareText className="h-4 w-4" />
                  고객게시판
                </Link>
              )}
              {onInvite && (
                <button
                  type="button"
                  onClick={() => {
                    closeNav();
                    onInvite();
                  }}
                  className="flex items-center gap-2 rounded-lg px-3 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <UserPlus className="h-4 w-4" />
                  초대
                </button>
              )}
            </nav>

            <div className="border-t border-slate-100 p-3">
              <div className="mb-2">
                <ThemeToggle />
              </div>
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  로그아웃
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    onClick={closeNav}
                    className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-600"
                  >
                    <LogIn className="h-4 w-4" />
                    로그인
                  </Link>
                  <Link
                    to="/register"
                    onClick={closeNav}
                    className="flex items-center justify-center gap-1 rounded-lg bg-primary-600 px-3 py-3 text-sm font-medium text-white"
                  >
                    <UserPlus className="h-4 w-4" />
                    회원가입
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
