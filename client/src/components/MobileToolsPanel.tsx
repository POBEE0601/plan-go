// 2026-09-22 도구 탭: 초대·공지·테마·로그아웃 (여행별 준비/비상은 홈·일정)
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Megaphone, UserPlus } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useAuthStore } from '../store/useAuthStore';
import { useTravelStore } from '../store/useTravelStore';

interface MobileToolsPanelProps {
  canInvite: boolean;
  onInvite: () => void;
}

export default function MobileToolsPanel({
  canInvite,
  onInvite,
}: MobileToolsPanelProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const reset = useTravelStore((s) => s.reset);

  const handleLogout = () => {
    logout();
    reset();
    navigate('/');
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-slate-50 px-4 py-3">
      {user && (
        <div className="mb-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">{user.name}</p>
          <p className="mt-0.5 text-xs text-slate-400">{user.email}</p>
          {user.isAdmin && (
            <span className="mt-2 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
              관리자
            </span>
          )}
        </div>
      )}

      {canInvite && (
        <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <button
            type="button"
            onClick={onInvite}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50"
          >
            <UserPlus className="h-5 w-5 text-primary-600" />
            <span className="text-sm font-medium text-slate-800">초대</span>
          </button>
        </div>
      )}

      <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <Link
          to="/notices"
          className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50"
        >
          <Megaphone className="h-5 w-5 text-slate-500" />
          <span className="text-sm font-medium text-slate-800">공지사항</span>
        </Link>
      </div>

      <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-2">
        <ThemeToggle />
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="mb-6 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600"
      >
        <LogOut className="h-4 w-4" />
        로그아웃
      </button>
    </div>
  );
}
