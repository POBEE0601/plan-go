// 2026-11-06 나라 데스크
import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import DeskCover from '../components/DeskCover';
import DeskShell from '../components/DeskShell';
import { articleImage, countryImage } from '../data/deskImages';
import { getEmergencyGuide, telHref } from '../data/emergencyGuide';
import {
  TOPIC_LABEL,
  articlesForCountry,
  findCountry,
} from '../data/travelDesk';
import {
  foreignForKrw,
  formatForeign,
  useDeskRates,
} from '../hooks/useDeskRates';

export default function CountryDeskPage() {
  const { code } = useParams();
  const country = code ? findCountry(code) : undefined;
  const { rates } = useDeskRates();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [code]);

  if (!country) return <Navigate to="/#countries" replace />;

  const amount = foreignForKrw(rates, country.currency);
  const guide = getEmergencyGuide(undefined, undefined, country.placeName);
  const contacts = [...guide.local, ...guide.consular.slice(0, 2)];
  const articles = articlesForCountry(country);

  return (
    <DeskShell>
      <article className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <Link to="/#countries" className="text-sm font-medium text-primary-700">
          나라 목록
        </Link>
        <DeskCover
          src={countryImage(country.code)}
          alt={country.name}
          className="mt-4 h-52 w-full rounded-2xl sm:h-72"
        />
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {country.name}
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">{country.lead}</p>
        <p className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {amount == null ? (
            '1만 원 환율을 불러오는 중입니다.'
          ) : (
            <>
              1만 원으로 약{' '}
              <span className="font-semibold text-slate-900">
                {formatForeign(amount, country.currency)}
                {country.currencyName}
              </span>
            </>
          )}
        </p>

        <Section title="돈" body={country.money} />
        <Section title="이동" body={country.transit} />
        <Section title="주의" body={country.caution} />

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-slate-800">떠나기 전에</h2>
          <ul className="mt-3 space-y-2">
            {country.before.map((item) => (
              <li
                key={item}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-slate-800">긴급 연락</h2>
          <ul className="mt-3 space-y-2">
            {contacts.map((item) => (
              <li
                key={`${item.label}-${item.number ?? item.detail}`}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <p className="text-sm font-medium text-slate-900">{item.label}</p>
                {item.number && (
                  <a
                    href={telHref(item.number)}
                    className="mt-0.5 block text-sm font-semibold text-primary-700"
                  >
                    {item.number}
                  </a>
                )}
                <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        {articles.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-slate-800">이 나라 글</h2>
            <ul className="mt-3 space-y-2">
              {articles.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/desk/${item.id}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2"
                  >
                    <DeskCover
                      src={articleImage(item.id)}
                      className="h-16 w-20 shrink-0 rounded-lg"
                    />
                    <div className="min-w-0 py-1 pr-2">
                      <p className="text-[11px] font-semibold text-primary-700">
                        {TOPIC_LABEL[item.topic]}
                      </p>
                      <p className="mt-0.5 font-medium text-slate-900">{item.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.dek}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="mt-6 text-xs leading-5 text-slate-400">
          번호와 규정은 바뀔 수 있습니다. 위급하면 현지 긴급번호와 영사콜센터를 이용하세요.
        </p>
      </article>
    </DeskShell>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      <p className="mt-2 text-[15px] leading-7 text-slate-700">{body}</p>
    </section>
  );
}
