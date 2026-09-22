// 2026-09-23 모든 공개 페이지 최상단 중앙 로고
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';

interface PageBrandBarProps {
  homeTo?: string;
}

export default function PageBrandBar({ homeTo = '/' }: PageBrandBarProps) {
  return (
    <header className="safe-top relative z-20 flex h-14 shrink-0 items-center justify-center border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <Link to={homeTo} className="inline-flex items-center" aria-label="plan-go 홈">
        <BrandLogo size="sm" align="center" />
      </Link>
    </header>
  );
}
