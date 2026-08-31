// 2026-08-31 랜딩: 공지·배포게시판 링크
import { Link } from 'react-router-dom';
import {
  Calendar,
  Globe,
  LogIn,
  MapPin,
  UserPlus,
  Users,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 via-white to-slate-50">
      <nav className="border-b border-slate-200/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
              <MapPin className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold text-slate-900">plan-go</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/notices"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              공지사항
            </Link>
            <Link
              to="/releases"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              배포게시판
            </Link>
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              로그인
            </Link>
            <Link
              to="/register"
              className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
            >
              <UserPlus className="h-4 w-4" />
              회원가입
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-wider text-primary-600">
          Plan Together, Record Forever
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          함께 계획하고,
          <br />
          <span className="text-primary-600">영원히 기록하는</span> 여행
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500">
          plan-go는 여행 일정을 쉽게 만들고 관리할 수 있는 플랫폼입니다.
          회원가입 후 나만의 여행 계획을 시작해 보세요.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/register"
            className="flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-primary-200 transition hover:bg-primary-700"
          >
            <UserPlus className="h-5 w-5" />
            무료로 시작하기
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <LogIn className="h-5 w-5" />
            로그인
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">일정 관리</h3>
            <p className="mt-2 text-sm text-slate-500">
              날짜별로 여행 일정을 추가하고 수정·삭제할 수 있습니다.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
              <Globe className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">장소 기록</h3>
            <p className="mt-2 text-sm text-slate-500">
              방문 장소와 메모, 위치 정보를 함께 저장합니다.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">내 계정</h3>
            <p className="mt-2 text-sm text-slate-500">
              회원별로 여행 계획이 안전하게 분리되어 관리됩니다.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-400">
        © 2026 plan-go. Plan Together, Record Forever.
      </footer>
    </div>
  );
}
