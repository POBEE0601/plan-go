// 2026-09-23 첫 로딩: 진행률과 여행 글귀
import { useEffect, useRef, useState } from 'react';
import BrandLogo from './BrandLogo';

const QUOTES = [
  '짐은 가볍게, 마음은 넉넉하게.',
  '오늘은 골목 하나만 걸어도 충분합니다.',
  '서두르지 않은 길이 더 오래 남습니다.',
  '처음 보는 간판도 여행의 일부입니다.',
  '좋은 일정은 빈칸도 여행입니다.',
  '도착보다 가는 길이 더 선명할 때가 있습니다.',
];

interface BootSplashProps {
  done?: boolean;
  embedded?: boolean;
  onFinish?: () => void;
}

export default function BootSplash({
  done = false,
  embedded = false,
  onFinish,
}: BootSplashProps) {
  const started = useRef(Date.now());
  const [pct, setPct] = useState(6);
  const [quote, setQuote] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPct((p) => {
        if (p >= 92) return p;
        return Math.min(92, p + Math.max(1, Math.round((94 - p) * 0.12)));
      });
    }, 140);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setQuote((q) => (q + 1) % QUOTES.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!done) return;
    setPct(100);
  }, [done]);

  useEffect(() => {
    if (!done || pct < 100 || !onFinish) return;
    const elapsed = Date.now() - started.current;
    const wait = Math.max(280, 900 - elapsed);
    const t = window.setTimeout(onFinish, wait);
    return () => window.clearTimeout(t);
  }, [done, pct, onFinish]);

  return (
    <div
      className={`flex flex-col items-center justify-center bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 ${
        embedded ? 'min-h-0 flex-1 px-8' : 'fixed inset-0 z-[100] px-8'
      }`}
    >
      <BrandLogo size="sm" align="center" />
      <p
        key={quote}
        className="animate-fade-in mt-8 max-w-xs text-center text-[15px] leading-relaxed text-slate-600 dark:text-slate-300"
      >
        {QUOTES[quote]}
      </p>
      <div className="mt-8 w-full max-w-[14rem]">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-primary-600 transition-[width] duration-200 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-center text-xs tabular-nums text-slate-400">
          {pct}%
        </p>
      </div>
    </div>
  );
}
