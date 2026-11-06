// 2026-11-06 나라 풍경 메인 배너
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { countryImage } from '../data/deskImages';
import { COUNTRIES } from '../data/travelDesk';

export default function DeskBanner() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(0);
  const count = COUNTRIES.length;

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [paused, count]);

  const go = (next: number) => {
    setIndex((next + count) % count);
  };

  return (
    <section
      className="relative overflow-hidden sm:rounded-3xl"
      aria-roledescription="carousel"
      aria-label="나라 풍경"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(event) => {
        touchX.current = event.changedTouches[0]?.clientX ?? 0;
      }}
      onTouchEnd={(event) => {
        const dx = (event.changedTouches[0]?.clientX ?? 0) - touchX.current;
        if (dx > 48) go(index - 1);
        if (dx < -48) go(index + 1);
      }}
    >
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {COUNTRIES.map((country, slideIndex) => (
          <article
            key={country.code}
            className="relative h-72 min-w-0 shrink-0 basis-full sm:h-96"
            aria-hidden={slideIndex !== index}
          >
            <img
              src={countryImage(country.code)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to top, rgba(15,23,42,.78), rgba(15,23,42,.08) 58%)',
              }}
            />
            <div className="absolute inset-x-0 bottom-0 p-5 pr-6 text-white sm:p-8">
              <p className="text-xs font-semibold tracking-wide text-white/80">
                {slideIndex + 1} / {count}
              </p>
              <h2 className="mt-1 text-3xl font-bold sm:text-4xl">{country.name}</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/90 line-clamp-2">
                {country.lead}
              </p>
              <Link
                to={`/desk/country/${country.code}`}
                className="mt-4 inline-flex rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-slate-900"
                tabIndex={slideIndex === index ? 0 : -1}
              >
                이 나라 데스크
              </Link>
            </div>
          </article>
        ))}
      </div>

      <button
        type="button"
        onClick={() => go(index - 1)}
        className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white"
        aria-label="이전 풍경"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => go(index + 1)}
        className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white"
        aria-label="다음 풍경"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-4 right-4 flex gap-1.5 sm:bottom-6">
        {COUNTRIES.map((country, slideIndex) => (
          <button
            key={country.code}
            type="button"
            aria-label={`${country.name} 풍경`}
            aria-current={slideIndex === index ? 'true' : undefined}
            onClick={() => go(slideIndex)}
            className={`h-1.5 rounded-full ${
              slideIndex === index ? 'w-6 bg-white' : 'w-1.5 bg-white/55'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
