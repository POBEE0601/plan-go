// 2026-09-01 모바일 여백 조정
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, MapPin, UserPlus } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, error, clearError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError('');

    if (password !== confirmPassword) {
      setLocalError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      setLocalError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({ name, email, password });
      navigate('/dashboard', { replace: true });
    } catch {
      // store에서 error 처리
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-primary-50 to-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
              <MapPin className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-slate-900">plan-go</span>
          </Link>
          <p className="mt-2 text-sm text-slate-500">
            plan-go와 함께 여행을 시작하세요
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
        >
          <h1 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-800">
            <UserPlus className="h-5 w-5 text-primary-600" />
            회원가입
          </h1>

          {displayError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {displayError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="홍길동"
                required
                disabled={isSubmitting}
              />
            </div>
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
                minLength={6}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                비밀번호 확인
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="비밀번호 재입력"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            가입하기
          </button>

          <p className="mt-6 text-center text-sm text-slate-500">
            이미 계정이 있으신가요?{' '}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:underline"
            >
              로그인
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
