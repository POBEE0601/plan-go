// 2026-08-31 이메일·링크 초대 모달
import { useState } from 'react';
import {
  Check,
  Copy,
  Link2,
  Loader2,
  Mail,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { useTravelStore } from '../store/useTravelStore';

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
}

export default function InviteModal({ open, onClose }: InviteModalProps) {
  const {
    selectedPlan,
    inviteByEmail,
    createInviteLink,
    updateMemberRole,
    removeMember,
  } = useTravelStore();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [linkRole, setLinkRole] = useState<'editor' | 'viewer'>('viewer');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [lastLink, setLastLink] = useState('');
  const [copied, setCopied] = useState(false);

  if (!open || !selectedPlan) return null;

  const fullInviteUrl = (path: string) =>
    `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;

  const handleEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const { inviteUrl } = await inviteByEmail(email.trim(), role);
      const url = fullInviteUrl(inviteUrl);
      setLastLink(url);
      setMessage(`${email} 님에게 초대를 보냈습니다.`);
      setEmail('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '초대 실패');
    } finally {
      setBusy(false);
    }
  };

  const handleLinkInvite = async () => {
    setBusy(true);
    setMessage('');
    try {
      const { inviteUrl } = await createInviteLink(linkRole);
      const url = fullInviteUrl(inviteUrl);
      setLastLink(url);
      setMessage('초대 링크가 생성되었습니다.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '링크 생성 실패');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!lastLink) return;
    await navigator.clipboard.writeText(lastLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const members = selectedPlan.members.filter(
    (m) => !(m.name === '초대 링크' && m.status === 'pending'),
  );
  const pendingLinks = selectedPlan.members.filter(
    (m) => m.name === '초대 링크' && m.status === 'pending' && m.inviteToken,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <UserPlus className="h-5 w-5 text-primary-600" />
            일정 초대
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-5">
          <form onSubmit={handleEmailInvite} className="space-y-3">
            <p className="text-sm font-medium text-slate-700">
              <Mail className="mr-1 inline h-4 w-4" />
              이메일로 초대
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
            <div className="flex gap-2">
              <select
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as 'editor' | 'viewer')
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="editor">쓰기 (편집 가능)</option>
                <option value="viewer">읽기 (조회만)</option>
              </select>
              <button
                type="submit"
                disabled={busy}
                className="flex-1 rounded-lg bg-primary-600 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : '초대 보내기'}
              </button>
            </div>
          </form>

          <div className="space-y-3 border-t border-slate-100 pt-5">
            <p className="text-sm font-medium text-slate-700">
              <Link2 className="mr-1 inline h-4 w-4" />
              초대 링크 생성
            </p>
            <div className="flex gap-2">
              <select
                value={linkRole}
                onChange={(e) =>
                  setLinkRole(e.target.value as 'editor' | 'viewer')
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="viewer">읽기 링크</option>
                <option value="editor">쓰기 링크</option>
              </select>
              <button
                type="button"
                onClick={handleLinkInvite}
                disabled={busy}
                className="flex-1 rounded-lg border border-primary-200 bg-primary-50 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-60"
              >
                링크 만들기
              </button>
            </div>
          </div>

          {lastLink && (
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="mb-1 text-xs text-slate-500">초대 URL</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={lastLink}
                  className="flex-1 truncate rounded border border-slate-200 bg-white px-2 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-white"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          )}

          {message && (
            <p className="text-sm text-primary-700">{message}</p>
          )}

          <div className="border-t border-slate-100 pt-5">
            <p className="mb-3 text-sm font-medium text-slate-700">멤버</p>
            <ul className="space-y-2">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-800">
                      {m.name || m.email || '멤버'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {m.email} · {m.status === 'accepted' ? '참여중' : '대기'} ·{' '}
                      {m.role === 'owner'
                        ? '소유자'
                        : m.role === 'editor'
                          ? '쓰기'
                          : '읽기'}
                    </p>
                  </div>
                  {m.role !== 'owner' && (
                    <div className="flex items-center gap-1">
                      {m.status === 'accepted' && (
                        <select
                          value={m.role}
                          onChange={(e) =>
                            updateMemberRole(
                              m.id,
                              e.target.value as 'editor' | 'viewer',
                            )
                          }
                          className="rounded border border-slate-200 px-1 py-0.5 text-xs"
                        >
                          <option value="editor">쓰기</option>
                          <option value="viewer">읽기</option>
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => removeMember(m.id)}
                        className="rounded p-1 text-slate-300 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {pendingLinks.length > 0 && (
              <>
                <p className="mb-2 mt-4 text-sm font-medium text-slate-700">
                  활성 초대 링크
                </p>
                <ul className="space-y-2">
                  {pendingLinks.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs"
                    >
                      <span>
                        {m.role === 'editor' ? '쓰기' : '읽기'} 링크
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const url = fullInviteUrl(
                              `/invite/${m.inviteToken}`,
                            );
                            setLastLink(url);
                            navigator.clipboard.writeText(url);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                          }}
                          className="rounded bg-white px-2 py-1 text-primary-600"
                        >
                          복사
                        </button>
                        <button
                          type="button"
                          onClick={() => removeMember(m.id)}
                          className="rounded px-2 py-1 text-red-500"
                        >
                          삭제
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
