// 2026-09-22 게시판 메뉴: 고객게시판 / 배포게시판 탭
import { NavLink } from 'react-router-dom';

export default function BoardSectionTabs() {
  const itemClass = ({ isActive }: { isActive: boolean }) =>
    `shrink-0 border-b-2 px-4 py-2.5 text-sm ${
      isActive
        ? 'border-primary-600 font-semibold text-slate-900'
        : 'border-transparent text-slate-400 hover:text-slate-600'
    }`;

  return (
    <nav
      className="flex overflow-x-auto border-b border-slate-100 bg-white px-2 lg:px-6"
      aria-label="게시판 구분"
    >
      <NavLink
        to="/board"
        className={itemClass}
        end={false}
      >
        고객게시판
      </NavLink>
      <NavLink to="/releases" className={itemClass} end={false}>
        배포게시판
      </NavLink>
    </nav>
  );
}
