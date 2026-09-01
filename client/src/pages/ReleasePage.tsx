// 2026-09-01 모바일 헤더 대응
// 2026-08-31 배포게시판 (비회원 조회, 관리자만 작성, 목록: 일시|제목|배포상태)
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
import { releaseApi } from '../utils/api';
import { useAuthStore } from '../store/useAuthStore';
import type { BoardAttachment } from '../types/board';
import type { DeployStatus, ReleasePost } from '../types/release';
import {
  DEPLOY_STATUS_LABEL,
  DEPLOY_STATUSES,
} from '../types/release';

const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const toDatetimeLocal = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const statusClass: Record<DeployStatus, string> = {
  scheduled: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-800',
  delayed: 'bg-orange-100 text-orange-800',
  rollback: 'bg-red-100 text-red-700',
};

function StatusBadge({ status }: { status: DeployStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass[status]}`}
    >
      {DEPLOY_STATUS_LABEL[status]}
    </span>
  );
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

function ReleaseList() {
  const isAdmin = useAuthStore((s) => s.user?.isAdmin);
  const [posts, setPosts] = useState<ReleasePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    releaseApi
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
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">배포게시판</h2>
          <p className="mt-1 text-sm text-slate-500">
            배포 이력과 상태를 확인할 수 있습니다. 작성은 관리자만 가능합니다.
          </p>
        </div>
        {isAdmin && (
          <Link
            to="/releases/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            배포 등록
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
          등록된 배포 내역이 없습니다.
        </p>
      )}

      {!loading && !error && posts.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <th className="w-[180px] px-4 py-3">일시</th>
                <th className="px-4 py-3">제목</th>
                <th className="w-[110px] px-4 py-3 text-center">배포상태</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr
                  key={post.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-primary-50/40"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    <Link to={`/releases/${post.id}`} className="block">
                      {formatDateTime(post.releasedAt)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/releases/${post.id}`}
                      className="block font-medium text-slate-800 hover:text-primary-700"
                    >
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link to={`/releases/${post.id}`} className="inline-flex">
                      <StatusBadge status={post.status} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReleaseEditor({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.user?.isAdmin);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<DeployStatus>('scheduled');
  const [releasedAt, setReleasedAt] = useState(() =>
    toDatetimeLocal(new Date().toISOString()),
  );
  const [files, setFiles] = useState<File[]>([]);
  const [kept, setKept] = useState<BoardAttachment[]>([]);
  const [preview, setPreview] = useState<BoardAttachment | null>(null);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      setError('관리자만 배포 글을 작성할 수 있습니다.');
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (mode !== 'edit' || !id || !isAdmin) return;
    let cancelled = false;
    releaseApi
      .get(id)
      .then((post) => {
        if (cancelled) return;
        setTitle(post.title);
        setContent(post.content);
        setStatus(post.status);
        setReleasedAt(toDatetimeLocal(post.releasedAt));
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
      <div className="mx-auto max-w-4xl px-4 py-6">
        <p className="text-sm text-red-600">
          관리자만 배포게시판을 작성할 수 있습니다.
        </p>
        <Link to="/releases" className="mt-3 inline-block text-sm text-primary-700">
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
    if (!releasedAt) {
      setError('배포 일시를 입력해 주세요.');
      return;
    }
    setSaving(true);
    setError('');
    const releasedAtIso = new Date(releasedAt).toISOString();
    try {
      if (mode === 'create') {
        const post = await releaseApi.create({
          title,
          content,
          status,
          releasedAt: releasedAtIso,
          files,
        });
        navigate(`/releases/${post.id}`, { replace: true });
      } else if (id) {
        const post = await releaseApi.update(id, {
          title,
          content,
          status,
          releasedAt: releasedAtIso,
          keepAttachmentIds: kept.map((a) => a.id),
          files,
        });
        navigate(`/releases/${post.id}`, { replace: true });
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
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Link
        to={mode === 'edit' && id ? `/releases/${id}` : '/releases'}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        돌아가기
      </Link>
      <h2 className="mb-4 text-xl font-bold text-slate-900">
        {mode === 'create' ? '배포 등록' : '배포 수정'}
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              일시
            </label>
            <input
              type="datetime-local"
              value={releasedAt}
              onChange={(e) => setReleasedAt(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              배포상태
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as DeployStatus)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            >
              {DEPLOY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {DEPLOY_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
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

function ReleaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.user?.isAdmin);
  const [post, setPost] = useState<ReleasePost | null>(null);
  const [preview, setPreview] = useState<BoardAttachment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    releaseApi
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
    if (!window.confirm('이 배포 글을 삭제할까요?')) return;
    setBusy(true);
    try {
      await releaseApi.remove(post.id);
      navigate('/releases', { replace: true });
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
      <div className="mx-auto max-w-4xl px-4 py-6">
        <p className="text-sm text-red-600">{error || '배포 글을 찾을 수 없습니다.'}</p>
        <Link to="/releases" className="mt-3 inline-block text-sm text-primary-700">
          목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Link
        to="/releases"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        목록
      </Link>

      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2">
              <StatusBadge status={post.status} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{post.title}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <span>배포 일시 · {formatDateTime(post.releasedAt)}</span>
              <span className="inline-flex items-center gap-1">
                · <Eye className="h-3 w-3" /> {post.viewCount}
              </span>
            </p>
          </div>
          {isAdmin && (
            <div className="flex shrink-0 gap-1">
              <Link
                to={`/releases/${post.id}/edit`}
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

export default function ReleasePage() {
  return (
    <div className="min-h-dvh bg-slate-50">
      <Header />
      <Routes>
        <Route index element={<ReleaseList />} />
        <Route path="new" element={<ReleaseEditor mode="create" />} />
        <Route path=":id" element={<ReleaseDetail />} />
        <Route path=":id/edit" element={<ReleaseEditor mode="edit" />} />
        <Route path="*" element={<Navigate to="/releases" replace />} />
      </Routes>
    </div>
  );
}
