// 2026-08-31 헤더: 공지·게시판·게스트/로그인 대응
import { Link, useNavigate } from 'react-router-dom';
import {
  LogIn,
  LogOut,
  MapPin,
  Megaphone,
  MessageSquareText,
  User,
  UserPlus,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useTravelStore } from '../store/useTravelStore';

interface HeaderProps {
  onInvite?: () => void;
  roleLabel?: string;
}

export default function Header({ onInvite, roleLabel }: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const resetTravel = useTravelStore((s) => s.reset);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    resetTravel();
    navigate('/');
  };

  return (
    <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                plan-go
              </h1>
              <p className="text-sm text-slate-500">
                Plan Together, Record Forever
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
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

        <div className="flex items-center gap-3">
          <Link
            to="/notices"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 sm:hidden"
          >
            <Megaphone className="h-3.5 w-3.5" />
            공지
          </Link>
          {roleLabel && (
            <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 sm:inline">
              {roleLabel}
            </span>
          )}
          {onInvite && (
            <button
              type="button"
              onClick={onInvite}
              className="hidden items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 sm:flex"
            >
              <UserPlus className="h-4 w-4" />
              초대
            </button>
          )}
          {isAuthenticated && user ? (
            <>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <User className="h-4 w-4 text-slate-400" />
                <span className="font-medium">{user.name}</span>
                {user.isAdmin && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                    관리자
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                <LogIn className="h-4 w-4" />
                로그인
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
              >
                <UserPlus className="h-4 w-4" />
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
