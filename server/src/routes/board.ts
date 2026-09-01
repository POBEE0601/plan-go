// 2026-09-01 첨부를 Supabase Storage로 저장 (Vercel/Render 디스크 휘발 방지)
// 2026-08-31 고객게시판 API (로그인 필수, 첨부 업로드)
import { Router } from 'express';
import {
  addBoardComment,
  createBoardPost,
  deleteBoardComment,
  deleteBoardPost,
  getBoardPost,
  getBoardPostRaw,
  listBoardPosts,
  toggleBoardLike,
  updateBoardPost,
} from '../db/database.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { removeAttachments, saveUploads } from '../services/fileStore.js';

const router = Router();

const param = (value: string | string[]): string =>
  Array.isArray(value) ? value[0] : value;

// 로그인 사용자만 접근
router.use(authMiddleware);

// 2026-08-31 Supabase 비동기 조회
router.get('/posts', async (req: AuthRequest, res) => {
  res.json(await listBoardPosts(req.userId!));
});

router.get('/posts/:id', async (req: AuthRequest, res) => {
  const detail = await getBoardPost(param(req.params.id), req.userId!);
  if (!detail) {
    res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    return;
  }
  res.json(detail);
});

// 작성
router.post('/posts', (req: AuthRequest, res) => {
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
      const post = await createBoardPost(
        req.userId!,
        title,
        content,
        await saveUploads(req.files as Express.Multer.File[] | undefined),
      );
      res.status(201).json(post);
    } catch (err) {
      res.status(502).json({
        message: err instanceof Error ? err.message : '저장에 실패했습니다.',
      });
    }
  });
});

// 수정 (작성자만)
router.patch('/posts/:id', (req: AuthRequest, res) => {
  upload.array('files', 8)(req, res, async (err) => {
    if (err) {
      res.status(400).json({
        message: err instanceof Error ? err.message : '업로드에 실패했습니다.',
      });
      return;
    }

    const existing = await getBoardPostRaw(param(req.params.id));
    if (!existing) {
      res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
      return;
    }
    if (existing.authorId !== req.userId) {
      res.status(403).json({ message: '작성자만 수정할 수 있습니다.' });
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
      req.body.title != null
        ? String(req.body.title).trim()
        : existing.title;
    const content =
      req.body.content != null
        ? String(req.body.content).trim()
        : existing.content;

    if (!title || !content) {
      res.status(400).json({ message: '제목과 내용을 입력해 주세요.' });
      return;
    }

    try {
      const attachments = [
        ...kept,
        ...(await saveUploads(req.files as Express.Multer.File[] | undefined)),
      ];

      const updated = await updateBoardPost(param(req.params.id), req.userId!, {
        title,
        content,
        attachments,
      });
      if (!updated) {
        res.status(403).json({ message: '작성자만 수정할 수 있습니다.' });
        return;
      }
      res.json(updated);
    } catch (err) {
      res.status(502).json({
        message: err instanceof Error ? err.message : '저장에 실패했습니다.',
      });
    }
  });
});

// 삭제 (작성자만)
router.delete('/posts/:id', async (req: AuthRequest, res) => {
  const existing = await getBoardPostRaw(param(req.params.id));
  if (!existing) {
    res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    return;
  }
  if (existing.authorId !== req.userId) {
    res.status(403).json({ message: '작성자만 삭제할 수 있습니다.' });
    return;
  }

  const ok = await deleteBoardPost(param(req.params.id), req.userId!);
  if (!ok) {
    res.status(403).json({ message: '작성자만 삭제할 수 있습니다.' });
    return;
  }
  await removeAttachments(existing.attachments);
  res.status(204).send();
});

// 댓글
router.post('/posts/:id/comments', async (req: AuthRequest, res) => {
  const content = String(req.body.content ?? '').trim();
  if (!content) {
    res.status(400).json({ message: '댓글 내용을 입력해 주세요.' });
    return;
  }
  const comment = await addBoardComment(param(req.params.id), req.userId!, content);
  if (!comment) {
    res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    return;
  }
  res.status(201).json(comment);
});

router.delete('/comments/:id', async (req: AuthRequest, res) => {
  const ok = await deleteBoardComment(param(req.params.id), req.userId!);
  if (!ok) {
    res.status(403).json({ message: '작성자만 삭제할 수 있습니다.' });
    return;
  }
  res.status(204).send();
});

// 좋아요 토글
router.post('/posts/:id/like', async (req: AuthRequest, res) => {
  const result = await toggleBoardLike(param(req.params.id), req.userId!);
  if (!result) {
    res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    return;
  }
  res.json(result);
});

export default router;
