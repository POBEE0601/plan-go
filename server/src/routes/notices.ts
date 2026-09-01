// 2026-09-01 첨부를 Supabase Storage로 저장
// 2026-08-31 공지사항 API (비회원 조회 가능, 작성은 관리자만)
import { Router } from 'express';
import {
  createNoticePost,
  deleteNoticePost,
  getNoticePost,
  getNoticePostRaw,
  isAdminUserId,
  listNoticePosts,
  updateNoticePost,
} from '../db/database.js';
import {
  authMiddleware,
  optionalAuthMiddleware,
  type AuthRequest,
} from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { removeAttachments, saveUploads } from '../services/fileStore.js';

const param = (value: string | string[]): string =>
  Array.isArray(value) ? value[0] : value;

const requireAdmin = async (
  req: AuthRequest,
  res: import('express').Response,
): Promise<boolean> => {
  if (!req.userId || !(await isAdminUserId(req.userId))) {
    res.status(403).json({ message: '관리자만 공지사항을 작성·수정할 수 있습니다.' });
    return false;
  }
  return true;
};

const router = Router();

router.get('/posts', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  res.json(await listNoticePosts(req.userId));
});

router.get('/posts/:id', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  const post = await getNoticePost(param(req.params.id), req.userId, true);
  if (!post) {
    res.status(404).json({ message: '공지사항을 찾을 수 없습니다.' });
    return;
  }
  res.json(post);
});

router.post('/posts', authMiddleware, async (req: AuthRequest, res) => {
  if (!(await requireAdmin(req, res))) return;

  upload.array('files', 8)(req, res, async (err) => {
    if (err) {
      res.status(400).json({
        message: err instanceof Error ? err.message : '업로드에 실패했습니다.',
      });
      return;
    }

    const title = String(req.body.title ?? '').trim();
    const content = String(req.body.content ?? '').trim();
    if (!title || !content) {
      res.status(400).json({ message: '제목과 내용을 입력해 주세요.' });
      return;
    }

    try {
      const files = await saveUploads(
        req.files as Express.Multer.File[] | undefined,
      );
      const post = await createNoticePost(req.userId!, title, content, files);
      if (!post) {
        await removeAttachments(files);
        res.status(403).json({ message: '관리자만 공지사항을 작성할 수 있습니다.' });
        return;
      }
      res.status(201).json(post);
    } catch (err) {
      res.status(502).json({
        message: err instanceof Error ? err.message : '저장에 실패했습니다.',
      });
    }
  });
});

router.patch('/posts/:id', authMiddleware, async (req: AuthRequest, res) => {
  if (!(await requireAdmin(req, res))) return;

  upload.array('files', 8)(req, res, async (err) => {
    if (err) {
      res.status(400).json({
        message: err instanceof Error ? err.message : '업로드에 실패했습니다.',
      });
      return;
    }

    const existing = await getNoticePostRaw(param(req.params.id));
    if (!existing) {
      res.status(404).json({ message: '공지사항을 찾을 수 없습니다.' });
      return;
    }

    let keepIds: string[] = [];
    try {
      const raw = req.body.keepAttachmentIds;
      keepIds = raw
        ? (JSON.parse(typeof raw === 'string' ? raw : '[]') as string[])
        : existing.attachments.map((a) => a.id);
    } catch {
      keepIds = existing.attachments.map((a) => a.id);
    }

    const kept = existing.attachments.filter((a) => keepIds.includes(a.id));
    const removed = existing.attachments.filter((a) => !keepIds.includes(a.id));
    await removeAttachments(removed);

    const title =
      req.body.title != null ? String(req.body.title).trim() : existing.title;
    const content =
      req.body.content != null
        ? String(req.body.content).trim()
        : existing.content;

    if (!title || !content) {
      res.status(400).json({ message: '제목과 내용을 입력해 주세요.' });
      return;
    }

    const attachments = [
      ...kept,
      ...(await saveUploads(req.files as Express.Multer.File[] | undefined)),
    ];

    const updated = await updateNoticePost(param(req.params.id), req.userId!, {
      title,
      content,
      attachments,
    });
    if (!updated) {
      res.status(403).json({ message: '관리자만 수정할 수 있습니다.' });
      return;
    }
    res.json(updated);
  });
});

router.delete('/posts/:id', authMiddleware, async (req: AuthRequest, res) => {
  if (!(await requireAdmin(req, res))) return;

  const existing = await getNoticePostRaw(param(req.params.id));
  if (!existing) {
    res.status(404).json({ message: '공지사항을 찾을 수 없습니다.' });
    return;
  }

  const ok = await deleteNoticePost(param(req.params.id), req.userId!);
  if (!ok) {
    res.status(403).json({ message: '관리자만 삭제할 수 있습니다.' });
    return;
  }
  await removeAttachments(existing.attachments);
  res.status(204).send();
});

export default router;
