// 2026-11-06 메인 배너는 나라 풍경 슬라이드. 아래는 섹션으로 나눈다
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import DeskBanner from '../components/DeskBanner';
import DeskCover from '../components/DeskCover';
import DeskShell from '../components/DeskShell';
import { CURRENCY_IMAGE, articleImage, countryImage } from '../data/deskImages';
import {
  COUNTRIES,
  DESK_CURRENCIES,
  GUIDES,
  ISSUES,
  SEASONS,
  TOPIC_LABEL,
  type DeskArticle,
  type DeskTopic,
} from '../data/travelDesk';
import {
  foreignForKrw,
  formatForeign,
  useDeskRates,
} from '../hooks/useDeskRates';
import { noticeApi, releaseApi } from '../utils/api';

const GUIDE_SECTIONS: Array<{ id: DeskTopic; title: string; note: string }> = [
  { id: 'money', title: '돈', note: '환전, 카드, 팁, 세금' },
  { id: 'move', title: '이동', note: '교통카드, 열차, 공항, 호출' },
  { id: 'connect', title: '통신', note: '이심, 와이파이, 로밍' },
  { id: 'safety', title: '안전', note: '여권, 병원, 긴급번호' },
  { id: 'country', title: '현지에서', note: '콘센트, 약, 편의점' },
];

const JUMPS = [
  ['#issues', '소식'],
  ['#rates', '환율'],
  ['#countries', '나라'],
  ['#guides', '가이드'],
  ['#seasons', '시즌'],
];

export default function HomePage() {
  const location = useLocation();
  const month = new Date().getMonth() + 1;
  const { rates, ready } = useDeskRates();
  const [lines, setLines] = useState<Array<{ href: string; label: string }>>([]);

  useEffect(() => {
    const id = location.hash.replace('#', '');
    if (!id) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash]);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([noticeApi.list(), releaseApi.list()]).then(
      ([notices, releases]) => {
        if (cancelled) return;
        const next: Array<{ href: string; label: string }> = [];
        if (notices.status === 'fulfilled') {
          notices.value.slice(0, 2).forEach((post) => {
            next.push({ href: `/notices/${post.id}`, label: `공지 · ${post.title}` });
          });
        }
        if (releases.status === 'fulfilled') {
          releases.value.slice(0, 1).forEach((post) => {
            next.push({ href: `/releases/${post.id}`, label: `배포 · ${post.title}` });
          });
        }
        setLines(next);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DeskShell>
      <main className="mx-auto max-w-5xl px-4 pb-10 sm:py-8">
        <div className="flex items-center justify-between py-3 sm:py-0 sm:pb-4">
          <p className="text-sm font-semibold text-slate-800">여행 데스크</p>
          <Link
            to="/dashboard"
            className="shrink-0 rounded-xl bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white"
          >
            여행 계획하기
          </Link>
        </div>

        <div className="-mx-4 sm:mx-0">
          <DeskBanner />
        </div>

        <nav
          className="sticky top-0 z-20 -mx-4 mt-4 flex gap-2 overflow-x-auto border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur"
          aria-label="데스크 섹션"
        >
          {JUMPS.map(([to, label]) => (
            <a
              key={to}
              href={to}
              className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700"
            >
              {label}
            </a>
          ))}
        </nav>

        <Section id="issues" title="이번 주 소식" note="지금 읽어 두면 일정이 덜 흔들립니다.">
          <ul className="grid gap-3 sm:grid-cols-2">
            {ISSUES.map((issue) => (
              <li key={issue.id}>
                <StoryCard article={issue} />
              </li>
            ))}
          </ul>
        </Section>

        <Section
          id="rates"
          title="오늘의 환율"
          note={ready ? '1만 원으로 바꿀 때' : '시세를 불러오는 중'}
        >
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {DESK_CURRENCIES.map((item) => {
              const amount = foreignForKrw(rates, item.code);
              return (
                <li
                  key={item.code}
                  className="flex min-w-[10.5rem] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 py-2"
                >
                  <img
                    src={CURRENCY_IMAGE[item.code]}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-500">{item.country}</p>
                    <p className="mt-1 text-base font-bold text-slate-900">
                      {amount == null ? '—' : formatForeign(amount, item.code)}
                      <span className="ml-0.5 text-xs font-medium text-slate-500">
                        {item.label}
                      </span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section id="countries" title="나라 데스크" note="돈, 이동, 긴급번호를 나라마다 모아 두었습니다.">
          <ul className="flex gap-3 overflow-x-auto pb-1">
            {COUNTRIES.map((country) => {
              const amount = foreignForKrw(rates, country.currency);
              return (
                <li key={country.code} className="w-64 shrink-0">
                  <Link
                    to={`/desk/country/${country.code}`}
                    className="block overflow-hidden rounded-2xl border border-slate-200 bg-white"
                  >
                    <DeskCover src={countryImage(country.code)} className="h-36 w-full" />
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-slate-900">{country.name}</h3>
                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {amount == null
                          ? country.currencyName
                          : `1만 원 · ${formatForeign(amount, country.currency)}${country.currencyName}`}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">
                        {country.lead}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>

        <div id="guides" className="scroll-mt-16">
          {GUIDE_SECTIONS.map((section) => {
            const items = GUIDES.filter((guide) => guide.topic === section.id);
            if (items.length === 0) return null;
            return (
              <Section
                key={section.id}
                id={section.id}
                title={section.title}
                note={section.note}
              >
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((guide) => (
                    <li key={guide.id}>
                      <StoryCard article={guide} compact />
                    </li>
                  ))}
                </ul>
              </Section>
            );
          })}
        </div>

        <Section id="seasons" title={`${month}월에 보면 좋은 것`} note="달마다 날씨와 혼잡이 다릅니다.">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {SEASONS.map((season) => {
              const current = season.month === month;
              return (
                <li key={season.id}>
                  <Link
                    to={`/desk/${season.id}`}
                    className={`block overflow-hidden rounded-2xl border ${
                      current
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <DeskCover src={articleImage(season.id)} className="h-28 w-full" />
                    <div className="p-3">
                      <p className="text-[11px] font-semibold text-primary-700">
                        {season.month}월{current ? ' · 이번 달' : ''}
                      </p>
                      <h3 className="mt-1 text-sm font-semibold leading-snug text-slate-900">
                        {season.title}
                      </h3>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>

        <section className="mt-10 border-t border-slate-200 pt-4">
          <ul className="space-y-2">
            {lines.map((line) => (
              <li key={line.href}>
                <Link to={line.href} className="text-sm text-slate-600">
                  {line.label}
                </Link>
              </li>
            ))}
            <li className="flex gap-4 pt-1 text-sm">
              <Link to="/notices" className="font-medium text-slate-500">
                공지사항
              </Link>
              <Link to="/releases" className="font-medium text-slate-500">
                배포게시판
              </Link>
            </li>
          </ul>
        </section>
      </main>
    </DeskShell>
  );
}

function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16 mt-10">
      <div className="mb-3">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {note && <p className="mt-0.5 text-sm text-slate-500">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function StoryCard({
  article,
  compact = false,
}: {
  article: DeskArticle;
  compact?: boolean;
}) {
  return (
    <Link
      to={`/desk/${article.id}`}
      className="block h-full overflow-hidden rounded-2xl border border-slate-200 bg-white"
    >
      <DeskCover
        src={articleImage(article.id)}
        className={compact ? 'h-32 w-full' : 'h-40 w-full'}
      />
      <div className="p-4">
        <p className="text-[11px] font-semibold text-primary-700">
          {TOPIC_LABEL[article.topic]} · {article.minutes}분
        </p>
        <h3 className="mt-1 font-semibold leading-snug text-slate-900">{article.title}</h3>
        {!compact && (
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{article.dek}</p>
        )}
      </div>
    </Link>
  );
}
