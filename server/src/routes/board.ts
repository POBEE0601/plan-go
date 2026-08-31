// 2026-08-31 고객게시판 API (로그인 필수, 첨부 업로드)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Router } from 'express';
import multer from 'multer';
import {
  addBoardComment,
  createBoardPost,
  deleteBoardComment,
  deleteBoardPost,
  generateId,
  getBoardPost,
  getBoardPostRaw,
  listBoardPosts,
  toggleBoardLike,
  updateBoardPost,
} from '../db/database.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import type { BoardAttachment } from '../types/board.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error('이미지(jpg/png/webp/gif) 또는 PDF만 업로드할 수 있습니다.'));
      return;
    }
    cb(null, true);
  },
});

const toAttachments = (
  files: Express.Multer.File[] | undefined,
): BoardAttachment[] =>
  (files ?? []).map((f) => ({
    id: generateId(),
    originalName: Buffer.from(f.originalname, 'latin1').toString('utf8'),
    storedName: f.filename,
    mimeType: f.mimetype,
    size: f.size,
    url: `/uploads/${f.filename}`,
  }));

const removeFiles = (attachments: BoardAttachment[]): void => {
  for (const a of attachments) {
    const full = path.join(uploadsDir, a.storedName);
    if (fs.existsSync(full)) {
      try {
        fs.unlinkSync(full);
      } catch {
        // 파일 삭제 실패는 무시
      }
    }
  }
};

const router = Router();

const param = (value: string | string[]): string =>
  Array.isArray(value) ? value[0] : value;

// 로그인 사용자만 접근
router.use(authMiddleware);

// 목록
router.get('/posts', (req: AuthRequest, res) => {
  res.json(listBoardPosts(req.userId!));
});

// 상세
router.get('/posts/:id', (req: AuthRequest, res) => {
  const detail = getBoardPost(param(req.params.id), req.userId!);
  if (!detail) {
    res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    return;
  }
  res.json(detail);
});

// 작성
router.post('/posts', (req: AuthRequest, res) => {
  upload.array('files', 8)(req, res, (err) => {
    if (err) {
      res.status(400).json({
        message: err instanceof Error ? err.message : '업로드에 실패했습니다.',
      });
      return;
    }

    const title = String(req.body.title ?? '').trim();
    const content = String(req.body.content ?? '').trim();
    if (!title || !content) {
      removeFiles(toAttachments(req.files as Express.Multer.File[] | undefined));
      res.status(400).json({ message: '제목과 내용을 입력해 주세요.' });
      return;
    }

    const post = createBoardPost(
      req.userId!,
      title,
      content,
      toAttachments(req.files as Express.Multer.File[] | undefined),
    );
    res.status(201).json(post);
  });
});

// 수정 (작성자만)
router.patch('/posts/:id', (req: AuthRequest, res) => {
  upload.array('files', 8)(req, res, (err) => {
    if (err) {
      res.status(400).json({
        message: err instanceof Error ? err.message : '업로드에 실패했습니다.',
      });
      return;
    }

    const existing = getBoardPostRaw(param(req.params.id));
    if (!existing) {
      removeFiles(toAttachments(req.files as Express.Multer.File[] | undefined));
      res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
      return;
    }
    if (existing.authorId !== req.userId) {
      removeFiles(toAttachments(req.files as Express.Multer.File[] | undefined));
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
    removeFiles(removed);

    const title =
      req.body.title != null
        ? String(req.body.title).trim()
        : existing.title;
    const content =
      req.body.content != null
        ? String(req.body.content).trim()
        : existing.content;

    if (!title || !content) {
      removeFiles(toAttachments(req.files as Express.Multer.File[] | undefined));
      res.status(400).json({ message: '제목과 내용을 입력해 주세요.' });
      return;
    }

    const attachments = [
      ...kept,
      ...toAttachments(req.files as Express.Multer.File[] | undefined),
    ];

    const updated = updateBoardPost(param(req.params.id), req.userId!, {
      title,
      content,
      attachments,
    });
    if (!updated) {
      res.status(403).json({ message: '작성자만 수정할 수 있습니다.' });
      return;
    }
    res.json(updated);
  });
});

// 삭제 (작성자만)
router.delete('/posts/:id', (req: AuthRequest, res) => {
  const existing = getBoardPostRaw(param(req.params.id));
  if (!existing) {
    res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    return;
  }
  if (existing.authorId !== req.userId) {
    res.status(403).json({ message: '작성자만 삭제할 수 있습니다.' });
    return;
  }

  const ok = deleteBoardPost(param(req.params.id), req.userId!);
  if (!ok) {
    res.status(403).json({ message: '작성자만 삭제할 수 있습니다.' });
    return;
  }
  removeFiles(existing.attachments);
  res.status(204).send();
});

// 댓글
router.post('/posts/:id/comments', (req: AuthRequest, res) => {
  const content = String(req.body.content ?? '').trim();
  if (!content) {
    res.status(400).json({ message: '댓글 내용을 입력해 주세요.' });
    return;
  }
  const comment = addBoardComment(param(req.params.id), req.userId!, content);
  if (!comment) {
    res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    return;
  }
  res.status(201).json(comment);
});

router.delete('/comments/:id', (req: AuthRequest, res) => {
  const ok = deleteBoardComment(param(req.params.id), req.userId!);
  if (!ok) {
    res.status(403).json({ message: '작성자만 삭제할 수 있습니다.' });
    return;
  }
  res.status(204).send();
});

// 좋아요 토글
router.post('/posts/:id/like', (req: AuthRequest, res) => {
  const result = toggleBoardLike(param(req.params.id), req.userId!);
  if (!result) {
    res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    return;
  }
  res.json(result);
});

export default router;
