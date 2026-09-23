// 2026-09-23 아이디 저장
// 2026-09-23 최상단 중앙 로고
// 2026-09-01 모바일 여백 조정
// 2026-09-07 공식 로고 컴포넌트 적용
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, Loader2, LogIn } from 'lucide-react';
import PageBrandBar from '../components/PageBrandBar';
import { useAuthStore } from '../store/useAuthStore';

const SAVED_EMAIL_KEY = 'plan-go-saved-email';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error, clearError } = useAuthStore();

  const from = (location.state as { from?: string })?.from ?? '/dashboard';

  const [email, setEmail] = useState(
    () => localStorage.getItem(SAVED_EMAIL_KEY) ?? '',
  );
  const [password, setPassword] = useState('');
  const [rememberId, setRememberId] = useState(
    () => Boolean(localStorage.getItem(SAVED_EMAIL_KEY)),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);
    try {
      await login({ email, password });
      if (rememberId) localStorage.setItem(SAVED_EMAIL_KEY, email.trim());
      else localStorage.removeItem(SAVED_EMAIL_KEY);
      navigate(from, { replace: true });
    } catch {
      // store에서 error 처리
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-primary-50 to-slate-50">
      <PageBrandBar />
      <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-sm text-slate-500">계정에 로그인하세요</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
        >
          <h1 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-800">
            <LogIn className="h-5 w-5 text-primary-600" />
            로그인
          </h1>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="you@example.com"
                required
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="6자 이상"
                required
                disabled={isSubmitting}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={rememberId}
                onChange={(e) => setRememberId(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary-600"
              />
              아이디 저장
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            로그인
          </button>

          <p className="mt-6 text-center text-sm text-slate-500">
            계정이 없으신가요?{' '}
            <Link
              to="/register"
              className="font-medium text-primary-600 hover:underline"
            >
              회원가입
            </Link>
          </p>
        </form>
      </div>
      </div>
    </div>
  );
}
