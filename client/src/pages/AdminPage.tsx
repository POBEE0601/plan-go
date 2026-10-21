// 2026-10-21 관리자만 국가·기간 여행 알림을 등록한다
// 2026-10-06 관리자 전용: API 무료 한도 사용량, 회원·최근 로그인
import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, RefreshCw, Shield } from 'lucide-react';
import AppPageShell from '../components/AppPageShell';
import { useAuthStore } from '../store/useAuthStore';
import type { AdminOverview, ApiUsageItem } from '../types/admin';
import type { TravelAlert } from '../types/travel';
import { adminApi } from '../utils/api';

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatMonth = (month: string): string => {
  const [year, mon] = month.split('-');
  return `${year}년 ${Number(mon)}월`;
};

const formatCount = (value: number): string => value.toLocaleString('ko-KR');

const barTone = (used: number, limit: number): string => {
  const ratio = used / limit;
  if (ratio >= 1) return 'bg-red-500';
  if (ratio >= 0.8) return 'bg-amber-500';
  return 'bg-primary-500';
};

function UsageCard({ item }: { item: ApiUsageItem }) {
  const capped = item.limit != null && item.limit > 0;
  const ratio = capped ? Math.min(item.used / item.limit!, 1) : 0;
  const percent = capped ? Math.round((item.used / item.limit!) * 100) : 0;

  return (
    <article className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-800">{item.label}</h3>
          <p className="mt-0.5 text-xs text-slate-400">{item.detail}</p>
        </div>
        <p className="shrink-0 text-right text-sm font-semibold text-slate-800">
          {formatCount(item.used)}
          {capped ? (
            <span className="font-medium text-slate-400">
              {' '}
              / {formatCount(item.limit!)}
            </span>
          ) : (
            <span className="font-medium text-slate-400">회</span>
          )}
        </p>
      </div>
      {capped && (
        <div className="mt-3">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuenow={item.used}
            aria-valuemin={0}
            aria-valuemax={item.limit!}
            aria-label={`${item.label} 사용량`}
          >
            <div
              className={`h-full rounded-full ${barTone(item.used, item.limit!)}`}
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-400">{percent}%</p>
        </div>
      )}
      {item.today != null && (
        <p className="mt-2 text-xs text-slate-500">오늘 {formatCount(item.today)}회</p>
      )}
      {item.note && <p className="mt-2 text-xs text-slate-500">{item.note}</p>}
    </article>
  );
}

const ALERT_COUNTRIES = [
  { key: 'japan', label: '일본' },
  { key: 'korea', label: '한국' },
  { key: 'usa', label: '미국' },
  { key: 'china', label: '중국' },
  { key: 'taiwan', label: '대만' },
  { key: 'thailand', label: '태국' },
  { key: 'vietnam', label: '베트남' },
  { key: 'singapore', label: '싱가포르' },
  { key: 'france', label: '프랑스' },
  { key: 'uk', label: '영국' },
];

function AdminAlerts() {
  const [alerts, setAlerts] = useState<TravelAlert[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    countryKey: 'japan',
    title: '',
    body: '',
    source: '',
    severity: 'important' as 'info' | 'important',
    startsOn: '',
    endsOn: '',
    confirmedOn: new Date().toISOString().slice(0, 10),
  });

  const load = () => {
    adminApi
      .alerts()
      .then(setAlerts)
      .catch((err) => {
        setError(err instanceof Error ? err.message : '알림을 불러오지 못했습니다.');
      });
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await adminApi.createAlert(form);
      setForm((current) => ({ ...current, title: '', body: '', source: '', endsOn: '' }));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '알림을 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-8">
      <h3 className="text-sm font-semibold text-slate-800">여행 알림</h3>
      <p className="mt-1 text-xs text-slate-500">
        국가와 여행 날짜가 겹치면 해당 계획에만 표시됩니다. 멤버는 등록할 수 없습니다.
      </p>
      <form onSubmit={(e) => void submit(e)} className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={form.countryKey}
            onChange={(e) => setForm({ ...form, countryKey: e.target.value })}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {ALERT_COUNTRIES.map((row) => (
              <option key={row.key} value={row.key}>
                {row.label}
              </option>
            ))}
          </select>
          <select
            value={form.severity}
            onChange={(e) =>
              setForm({ ...form, severity: e.target.value === 'info' ? 'info' : 'important' })
            }
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="important">중요</option>
            <option value="info">참고</option>
          </select>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="제목"
            maxLength={80}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
          />
          <textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="내용"
            maxLength={1000}
            rows={3}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            placeholder="출처"
            maxLength={200}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            type="date"
            value={form.startsOn}
            onChange={(e) => setForm({ ...form, startsOn: e.target.value })}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            aria-label="시작일"
          />
          <input
            type="date"
            value={form.endsOn}
            onChange={(e) => setForm({ ...form, endsOn: e.target.value })}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            aria-label="종료일"
          />
          <input
            type="date"
            value={form.confirmedOn}
            onChange={(e) => setForm({ ...form, confirmedOn: e.target.value })}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            aria-label="확인일"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {saving ? '저장 중…' : '알림 등록'}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </form>
      <ul className="mt-3 space-y-2">
        {alerts.map((alert) => (
          <li key={alert.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {alert.countryLabel} · {alert.title}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {alert.startsOn}
                  {alert.endsOn ? ` ~ ${alert.endsOn}` : ' ~'} · 확인 {alert.confirmedOn}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void adminApi.deleteAlert(alert.id).then(load);
                }}
                className="text-xs text-red-600"
              >
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AdminBody() {
  const isAdmin = useAuthStore((s) => s.user?.isAdmin);
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    adminApi
      .overview()
      .then(setData)
      .catch((err) => {
        setError(err instanceof Error ? err.message : '관리 정보를 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="hidden items-center gap-2 text-xl font-bold text-slate-900 lg:flex">
            <Shield className="h-5 w-5 text-amber-600" />
            관리
          </h2>
          <p className="text-sm text-slate-500 lg:mt-1">
            {data ? `${formatMonth(data.month)} · 한국 시간` : 'API 사용량과 회원'}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {loading && !data && (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="h-7 w-7 animate-spin text-primary-500" />
        </div>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {data && (
        <>
          <section>
            <h3 className="text-sm font-semibold text-slate-800">API 사용량</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              이 서버가 Google·Gemini에 보낸 횟수입니다. 캐시에 걸린 조회는 빠집니다.
              장소 사진을 제외한 항목은 이 화면을 넣은 뒤부터 쌓입니다. Google 무료
              한도는 미국 태평양 시간 매월 1일에 초기화됩니다. Gemini는 키로 남은
              한도를 조회할 수 없어 호출 횟수만 표시합니다. 지도 화면은 브라우저에서
              불러와 여기 숫자에 없습니다.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {data.usage.map((item) => (
                <UsageCard key={item.kind} item={item} />
              ))}
            </div>
          </section>

          <section className="mt-8">
            <h3 className="text-sm font-semibold text-slate-800">
              회원 <span className="font-medium text-slate-400">{data.members.length}명</span>
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              최근 로그인은 비밀번호로 들어온 시각입니다. 이 기능을 넣기 전의 접속은
              기록되지 않았습니다.
            </p>

            <div className="mt-3 hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">이름</th>
                    <th className="px-4 py-2.5 font-medium">이메일</th>
                    <th className="px-4 py-2.5 font-medium">가입</th>
                    <th className="px-4 py-2.5 font-medium">최근 로그인</th>
                  </tr>
                </thead>
                <tbody>
                  {data.members.map((member) => (
                    <tr key={member.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        <span className="inline-flex items-center gap-2">
                          {member.name}
                          {member.isAdmin && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                              관리자
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{member.email}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                        {formatDate(member.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                        {member.lastLoginAt ? formatDate(member.lastLoginAt) : '기록 없음'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="mt-3 space-y-2 md:hidden">
              {data.members.map((member) => (
                <li
                  key={member.id}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    {member.name}
                    {member.isAdmin && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                        관리자
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 break-all text-xs text-slate-500">{member.email}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    가입 {formatDate(member.createdAt)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    최근 로그인{' '}
                    {member.lastLoginAt ? formatDate(member.lastLoginAt) : '기록 없음'}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
      <AdminAlerts />
    </div>
  );
}

export default function AdminPage() {
  return (
    <AppPageShell title="관리">
      <AdminBody />
    </AppPageShell>
  );
}
