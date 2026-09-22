// 2026-09-23 최상단 중앙 로고
// 2026-09-22 메뉴명 제거, 남는 폭에 여행 정보
// 2026-09-22 여행명 라인 우측에 여행별 액션
// 2026-09-22 모바일 상단: 큰 제목 + 아이콘 액션 (PC 헤더 대체)
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import BrandLogo from './BrandLogo';

interface MobileTopBarProps {
  title: string;
  meta?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  onSearch?: () => void;
  searchActive?: boolean;
  extra?: ReactNode;
  titleExtra?: ReactNode;
}

export default function MobileTopBar({
  title,
  meta,
  onBack,
  backLabel = '뒤로가기',
  onSearch,
  searchActive = false,
  extra,
  titleExtra,
}: MobileTopBarProps) {
  return (
    <header className="safe-top shrink-0 bg-white lg:hidden">
      <div className="relative flex h-11 items-center justify-between px-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="relative z-10 flex h-10 w-10 items-center justify-center rounded-lg text-slate-800"
            aria-label={backLabel}
          >
            <ArrowLeft className="h-6 w-6" strokeWidth={1.7} />
          </button>
        ) : (
          <span className="w-10" />
        )}
        <Link
          to="/dashboard"
          className="absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
          aria-label="plan-go 홈"
        >
          <BrandLogo size="sm" align="center" />
        </Link>
        <div className="relative z-10 flex items-center gap-0.5">
          {onSearch && (
            <button
              type="button"
              onClick={onSearch}
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                searchActive ? 'text-primary-600' : 'text-slate-700'
              }`}
              aria-label="검색"
              aria-pressed={searchActive}
            >
              <Search className="h-5 w-5" strokeWidth={1.7} />
            </button>
          )}
          {extra}
        </div>
      </div>
      <div className="flex items-center gap-2 px-5 pb-1.5 pt-0.5">
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold leading-tight tracking-tight text-slate-900">
          {title}
        </h1>
        {titleExtra ? <div className="shrink-0">{titleExtra}</div> : null}
      </div>
      {meta ? (
        <div className="flex min-w-0 items-center gap-x-1.5 overflow-hidden px-5 pb-2 text-xs text-slate-500">
          {meta}
        </div>
      ) : null}
    </header>
  );
}
