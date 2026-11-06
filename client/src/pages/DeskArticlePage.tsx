// 2026-11-06 데스크 글
import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import DeskCover from '../components/DeskCover';
import DeskShell from '../components/DeskShell';
import { articleImage } from '../data/deskImages';
import {
  TOPIC_LABEL,
  findArticle,
  relatedArticles,
} from '../data/travelDesk';

export default function DeskArticlePage() {
  const { id } = useParams();
  const article = id ? findArticle(id) : undefined;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!article) return <Navigate to="/" replace />;

  const related = relatedArticles(article);

  return (
    <DeskShell>
      <article className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <Link to="/" className="text-sm font-medium text-primary-700">
          소식 홈
        </Link>
        <DeskCover
          src={articleImage(article.id)}
          alt={article.title}
          className="mt-4 h-52 w-full rounded-2xl sm:h-72"
        />
        <p className="mt-4 text-xs font-semibold text-primary-700">
          {TOPIC_LABEL[article.topic]}
          {article.kind === 'issue' ? ' · 이번 주 이슈' : ''}
          {article.month ? ` · ${article.month}월` : ''}
          {' · '}
          {article.minutes}분
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {article.title}
        </h1>
        <p className="mt-3 text-base text-slate-600">{article.dek}</p>
        <div className="mt-6 space-y-4 text-[15px] leading-7 text-slate-700">
          {article.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-primary-100 bg-primary-50 px-4 py-4">
          <p className="text-xs font-semibold text-primary-700">이렇게 하면 됩니다</p>
          <p className="mt-1 text-sm leading-6 text-slate-800">{article.action}</p>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-400">
          여행 전 확인용 안내입니다. 규정과 요금은 바뀔 수 있으니 공식 안내를 함께 보세요.
        </p>
        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm font-semibold text-slate-800">이어서 보기</h2>
            <ul className="mt-3 space-y-2">
              {related.map((item) => (
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
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </DeskShell>
  );
}
