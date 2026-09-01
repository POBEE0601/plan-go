// 2026-09-01 모바일 헤더 대응
// 2026-08-31 공지사항 게시판 (비회원 조회, 관리자만 작성, 조회수)
import { useEffect, useState } from 'react';
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  ArrowLeft,
  Eye,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import FilePreviewModal from '../components/FilePreviewModal';
import Header from '../components/Header';
import { noticeApi } from '../utils/api';
import { useAuthStore } from '../store/useAuthStore';
import type { BoardAttachment } from '../types/board';
import type { NoticePost } from '../types/notice';

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

function AuthorLabel({
  name,
  isAdmin,
}: {
  name: string;
  isAdmin?: boolean;
}) {
  if (isAdmin) {
    return (
      <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">
        관리자
      </span>
    );
  }
  return <span>{name}</span>;
}

function AttachmentList({
  files,
  onPreview,
  removable,
  onRemove,
}: {
  files: BoardAttachment[];
  onPreview: (f: BoardAttachment) => void;
  removable?: boolean;
  onRemove?: (id: string) => void;
}) {
  if (!files.length) return null;
  return (
    <ul className="mt-2 space-y-1">
      {files.map((f) => (
        <li
          key={f.id}
          className="flex items-center gap-2 text-sm text-slate-600"
        >
          <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <button
            type="button"
            onClick={() => onPreview(f)}
            className="truncate text-left text-primary-700 underline-offset-2 hover:underline"
          >
            {f.originalName}
          </button>
          {removable && onRemove && (
            <button
              type="button"
              onClick={() => onRemove(f.id)}
              className="ml-auto text-xs text-slate-400 hover:text-red-500"
            >
              제거
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function NoticeList() {
  const isAdmin = useAuthStore((s) => s.user?.isAdmin);
  const [posts, setPosts] = useState<NoticePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    noticeApi
      .list()
      .then((data) => {
        if (!cancelled) setPosts(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : '목록을 불러오지 못했습니다.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">공지사항</h2>
          <p className="mt-1 text-sm text-slate-500">
            비회원도 조회할 수 있습니다. 작성은 관리자만 가능합니다.
          </p>
        </div>
        {isAdmin && (
          <Link
            to="/notices/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            공지 작성
          </Link>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="h-7 w-7 animate-spin text-primary-500" />
        </div>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      {!loading && !error && posts.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-400">
          등록된 공지사항이 없습니다.
        </p>
      )}

      <ul className="space-y-2">
        {posts.map((post) => (
          <li key={post.id}>
            <Link
              to={`/notices/${post.id}`}
              className="block rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-primary-200 hover:bg-primary-50/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">
                    {post.title}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <AuthorLabel
                      name={post.authorNameMasked}
                      isAdmin={post.isAdmin}
                    />
                    <span>· {formatDate(post.createdAt)}</span>
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-400">
                  <Eye className="h-3.5 w-3.5" />
                  {post.viewCount}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NoticeEditor({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.user?.isAdmin);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [kept, setKept] = useState<BoardAttachment[]>([]);
  const [preview, setPreview] = useState<BoardAttachment | null>(null);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      setError('관리자만 공지사항을 작성할 수 있습니다.');
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (mode !== 'edit' || !id || !isAdmin) return;
    let cancelled = false;
    noticeApi
      .get(id)
      .then((post) => {
        if (cancelled) return;
        setTitle(post.title);
        setContent(post.content);
        setKept(post.attachments);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : '글을 불러오지 못했습니다.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, id, isAdmin]);

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <p className="text-sm text-red-600">
          관리자만 공지사항을 작성할 수 있습니다.
        </p>
        <Link to="/notices" className="mt-3 inline-block text-sm text-primary-700">
          목록으로
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 입력해 주세요.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (mode === 'create') {
        const post = await noticeApi.create({ title, content, files });
        navigate(`/notices/${post.id}`, { replace: true });
      } else if (id) {
        const post = await noticeApi.update(id, {
          title,
          content,
          keepAttachmentIds: kept.map((a) => a.id),
          files,
        });
        navigate(`/notices/${post.id}`, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link
        to={mode === 'edit' && id ? `/notices/${id}` : '/notices'}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        돌아가기
      </Link>
      <h2 className="mb-4 text-xl font-bold text-slate-900">
        {mode === 'create' ? '공지 작성' : '공지 수정'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            제목
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            maxLength={120}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            내용
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            첨부 (이미지·PDF)
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            multiple
            onChange={(e) =>
              setFiles(Array.from(e.target.files ?? []).slice(0, 8))
            }
            className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-700"
          />
          <AttachmentList
            files={kept}
            onPreview={setPreview}
            removable
            onRemove={(aid) => setKept((prev) => prev.filter((a) => a.id !== aid))}
          />
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </form>
      <FilePreviewModal file={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

function NoticeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.user?.isAdmin);
  const [post, setPost] = useState<NoticePost | null>(null);
  const [preview, setPreview] = useState<BoardAttachment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    noticeApi
      .get(id)
      .then((data) => {
        if (!cancelled) setPost(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : '글을 불러오지 못했습니다.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDelete = async () => {
    if (!post || !isAdmin) return;
    if (!window.confirm('이 공지를 삭제할까요?')) return;
    setBusy(true);
    try {
      await noticeApi.remove(post.id);
      navigate('/notices', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.');
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <p className="text-sm text-red-600">{error || '공지를 찾을 수 없습니다.'}</p>
        <Link to="/notices" className="mt-3 inline-block text-sm text-primary-700">
          목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link
        to="/notices"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        목록
      </Link>

      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900">{post.title}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <AuthorLabel name={post.authorNameMasked} isAdmin={post.isAdmin} />
              <span>· {formatDate(post.createdAt)}</span>
              <span className="inline-flex items-center gap-1">
                · <Eye className="h-3 w-3" /> {post.viewCount}
              </span>
            </p>
          </div>
          {isAdmin && (
            <div className="flex shrink-0 gap-1">
              <Link
                to={`/notices/${post.id}/edit`}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {post.content}
        </div>
        <AttachmentList files={post.attachments} onPreview={setPreview} />
      </article>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <FilePreviewModal file={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

export default function NoticePage() {
  return (
    <div className="min-h-dvh bg-slate-50">
      <Header />
      <Routes>
        <Route index element={<NoticeList />} />
        <Route path="new" element={<NoticeEditor mode="create" />} />
        <Route path=":id" element={<NoticeDetail />} />
        <Route path=":id/edit" element={<NoticeEditor mode="edit" />} />
        <Route path="*" element={<Navigate to="/notices" replace />} />
      </Routes>
    </div>
  );
}
