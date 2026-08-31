// 2026-08-31 고객게시판 (로그인 필수, 첨부 미리보기·댓글·좋아요)
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
  Heart,
  Loader2,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import FilePreviewModal from '../components/FilePreviewModal';
import Header from '../components/Header';
import { boardApi } from '../utils/api';
import type { BoardAttachment, BoardComment, BoardPost } from '../types/board';

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

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

function BoardList() {
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    boardApi
      .list()
      .then((data) => {
        if (!cancelled) setPosts(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '목록을 불러오지 못했습니다.');
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
          <h2 className="text-xl font-bold text-slate-900">고객게시판</h2>
          <p className="mt-1 text-sm text-slate-500">
            필요한 요청사항을 남겨 주세요. (로그인 회원 공개)
          </p>
        </div>
        <Link
          to="/board/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          글쓰기
        </Link>
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
          아직 게시글이 없습니다. 첫 요청을 남겨 보세요.
        </p>
      )}

      <ul className="space-y-2">
        {posts.map((post) => (
          <li key={post.id}>
            <Link
              to={`/board/${post.id}`}
              className="block rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-primary-200 hover:bg-primary-50/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">
                    {post.title}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    {post.isAdmin ? (
                      <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">
                        관리자
                      </span>
                    ) : (
                      <span>{post.authorNameMasked}</span>
                    )}
                    <span>· {formatDate(post.createdAt)}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5" />
                    {post.likeCount}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {post.commentCount}
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BoardEditor({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [kept, setKept] = useState<BoardAttachment[]>([]);
  const [preview, setPreview] = useState<BoardAttachment | null>(null);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    let cancelled = false;
    boardApi
      .get(id)
      .then((detail) => {
        if (cancelled) return;
        if (!detail.post.isMine) {
          setError('작성자만 수정할 수 있습니다.');
          return;
        }
        setTitle(detail.post.title);
        setContent(detail.post.content);
        setKept(detail.post.attachments);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '글을 불러오지 못했습니다.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, id]);

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
        const post = await boardApi.create({ title, content, files });
        navigate(`/board/${post.id}`, { replace: true });
      } else if (id) {
        const post = await boardApi.update(id, {
          title,
          content,
          keepAttachmentIds: kept.map((a) => a.id),
          files,
        });
        navigate(`/board/${post.id}`, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-slate-400">
        <Loader2 className="h-7 w-7 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link
        to={mode === 'edit' && id ? `/board/${id}` : '/board'}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        돌아가기
      </Link>
      <h2 className="mb-4 text-xl font-bold text-slate-900">
        {mode === 'create' ? '요청 작성' : '글 수정'}
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
            placeholder="요청 제목"
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
            placeholder="필요한 요청사항을 자세히 적어 주세요"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            첨부 (이미지·PDF, 최대 8개 / 5MB)
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            multiple
            onChange={(e) =>
              setFiles(Array.from(e.target.files ?? []).slice(0, 8))
            }
            className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
          />
          {files.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-slate-500">
              {files.map((f) => (
                <li key={f.name + f.size}>새 파일: {f.name}</li>
              ))}
            </ul>
          )}
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

function BoardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<BoardPost | null>(null);
  const [comments, setComments] = useState<BoardComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [preview, setPreview] = useState<BoardAttachment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    const detail = await boardApi.get(id);
    setPost(detail.post);
    setComments(detail.comments);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    load()
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '글을 불러오지 못했습니다.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleLike = async () => {
    if (!post || busy) return;
    setBusy(true);
    try {
      const result = await boardApi.toggleLike(post.id);
      setPost({
        ...post,
        likedByMe: result.liked,
        likeCount: result.likeCount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '좋아요 처리에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!post?.isMine) return;
    if (!window.confirm('이 글을 삭제할까요?')) return;
    setBusy(true);
    try {
      await boardApi.remove(post.id);
      navigate('/board', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.');
      setBusy(false);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !commentText.trim()) return;
    setBusy(true);
    try {
      const created = await boardApi.addComment(post.id, commentText.trim());
      setComments((prev) => [...prev, created]);
      setPost({ ...post, commentCount: post.commentCount + 1 });
      setCommentText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '댓글 등록에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('댓글을 삭제할까요?')) return;
    setBusy(true);
    try {
      await boardApi.removeComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      if (post) {
        setPost({ ...post, commentCount: Math.max(0, post.commentCount - 1) });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '댓글 삭제에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-slate-400">
        <Loader2 className="h-7 w-7 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <p className="text-sm text-red-600">{error || '글을 찾을 수 없습니다.'}</p>
        <Link to="/board" className="mt-3 inline-block text-sm text-primary-700">
          목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link
        to="/board"
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
              {post.isAdmin ? (
                <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">
                  관리자
                </span>
              ) : (
                <span>{post.authorNameMasked}</span>
              )}
              <span>· {formatDate(post.createdAt)}</span>
              {post.updatedAt !== post.createdAt ? <span>· 수정됨</span> : null}
            </p>
          </div>
          {post.isMine && (
            <div className="flex shrink-0 gap-1">
              <Link
                to={`/board/${post.id}/edit`}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                title="수정"
              >
                <Pencil className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                title="삭제"
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

        <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={handleLike}
            disabled={busy}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition ${
              post.likedByMe
                ? 'border-rose-200 bg-rose-50 text-rose-600'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Heart
              className={`h-4 w-4 ${post.likedByMe ? 'fill-current' : ''}`}
            />
            {post.likeCount}
          </button>
          <span className="inline-flex items-center gap-1 text-sm text-slate-500">
            <MessageSquare className="h-4 w-4" />
            댓글 {post.commentCount}
          </span>
        </div>
      </article>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <section className="mt-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">댓글</h3>
        <ul className="space-y-3">
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    {c.isAdmin ? (
                      <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">
                        관리자
                      </span>
                    ) : (
                      <span>{c.authorNameMasked}</span>
                    )}
                    <span>· {formatDate(c.createdAt)}</span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                    {c.content}
                  </p>
                </div>
                {c.isMine && (
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(c.id)}
                    className="text-xs text-slate-400 hover:text-red-500"
                  >
                    삭제
                  </button>
                )}
              </div>
            </li>
          ))}
          {comments.length === 0 && (
            <p className="text-sm text-slate-400">아직 댓글이 없습니다.</p>
          )}
        </ul>

        <form onSubmit={handleComment} className="mt-4 flex gap-2">
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="댓글을 입력하세요"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />
          <button
            type="submit"
            disabled={busy || !commentText.trim()}
            className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            등록
          </button>
        </form>
      </section>

      <FilePreviewModal file={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

export default function BoardPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <Routes>
        <Route index element={<BoardList />} />
        <Route path="new" element={<BoardEditor mode="create" />} />
        <Route path=":id" element={<BoardDetail />} />
        <Route path=":id/edit" element={<BoardEditor mode="edit" />} />
        <Route path="*" element={<Navigate to="/board" replace />} />
      </Routes>
    </div>
  );
}
