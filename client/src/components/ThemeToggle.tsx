// 2026-09-04 헤더·모바일 메뉴용 라이트/다크 전환
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

interface ThemeToggleProps {
  compact?: boolean;
}

export default function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={
        compact
          ? 'flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100'
          : 'flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-600 hover:bg-slate-50'
      }
      aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      title={isDark ? '라이트 모드' : '다크 모드'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {!compact && (isDark ? '라이트 모드' : '다크 모드')}
    </button>
  );
}
