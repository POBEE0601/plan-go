// 2026-08-31 초대 수락 페이지
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Loader2, MapPin, UserPlus } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { travelApi } from '../utils/api';
import type { InvitePreview } from '../types/travel';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;
    travelApi
      .getInvite(token)
      .then(setPreview)
      .catch((err) =>
        setError(err instanceof Error ? err.message : '초대를 불러올 수 없습니다.'),
      )
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/invite/${token}` } });
      return;
    }
    setAccepting(true);
    try {
      await travelApi.acceptInvite(token);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '초대 수락 실패');
    } finally {
      setAccepting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-50 to-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link to="/" className="mb-6 inline-flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
            <MapPin className="h-4 w-4" />
          </div>
          <span className="font-bold text-slate-900">plan-go</span>
        </Link>

        <h1 className="mb-2 flex items-center gap-2 text-xl font-bold text-slate-800">
          <UserPlus className="h-5 w-5 text-primary-600" />
          여행 일정 초대
        </h1>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {preview && (
          <>
            <p className="text-slate-600">
              <span className="font-semibold text-slate-800">
                {preview.planTitle}
              </span>
              에 초대되었습니다.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              권한:{' '}
              <span className="font-medium text-primary-700">
                {preview.role === 'editor' ? '쓰기 (편집 가능)' : '읽기 (조회만)'}
              </span>
            </p>
            {preview.email && (
              <p className="mt-1 text-sm text-slate-400">
                초대 대상: {preview.email}
              </p>
            )}

            <button
              type="button"
              onClick={handleAccept}
              disabled={accepting}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {accepting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isAuthenticated ? '초대 수락하고 참여하기' : '로그인 후 수락하기'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
