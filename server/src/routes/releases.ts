// 2026-08-31 배포게시판 API (비회원 조회 가능, 작성은 관리자만)
import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import {
  createReleasePost,
  deleteReleasePost,
  generateId,
  getReleasePost,
  getReleasePostRaw,
  isAdminUserId,
  listReleasePosts,
  updateReleasePost,
} from '../db/database.js';
import {
  authMiddleware,
  optionalAuthMiddleware,
  type AuthRequest,
} from '../middleware/auth.js';
import type { BoardAttachment } from '../types/board.js';
import { isDeployStatus } from '../types/release.js';
import { uploadsDir } from './board.js';

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
        // ignore
      }
    }
  }
};

const param = (value: string | string[]): string =>
  Array.isArray(value) ? value[0] : value;

const parseReleasedAt = (raw: unknown, fallback: string): string => {
  const value = String(raw ?? '').trim();
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString();
};

const requireAdmin = async (
  req: AuthRequest,
  res: import('express').Response,
): Promise<boolean> => {
  if (!req.userId || !(await isAdminUserId(req.userId))) {
    res.status(403).json({ message: '관리자만 배포게시판을 작성·수정할 수 있습니다.' });
    return false;
  }
  return true;
};

const router = Router();

router.get('/posts', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  res.json(await listReleasePosts(req.userId));
});

router.get('/posts/:id', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  const post = await getReleasePost(param(req.params.id), req.userId, true);
  if (!post) {
    res.status(404).json({ message: '배포 글을 찾을 수 없습니다.' });
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
    const status = String(req.body.status ?? '').trim();
    const files = toAttachments(req.files as Express.Multer.File[] | undefined);

    if (!title || !content) {
      removeFiles(files);
      res.status(400).json({ message: '제목과 내용을 입력해 주세요.' });
      return;
    }
    if (!isDeployStatus(status)) {
      removeFiles(files);
      res.status(400).json({ message: '배포상태를 선택해 주세요.' });
      return;
    }

    const releasedAt = parseReleasedAt(req.body.releasedAt, new Date().toISOString());
    const post = await createReleasePost(
      req.userId!,
      title,
      content,
      status,
      releasedAt,
      files,
    );
    if (!post) {
      removeFiles(files);
      res.status(403).json({ message: '관리자만 배포 글을 작성할 수 있습니다.' });
      return;
    }
    res.status(201).json(post);
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

    const existing = await getReleasePostRaw(param(req.params.id));
    if (!existing) {
      removeFiles(toAttachments(req.files as Express.Multer.File[] | undefined));
      res.status(404).json({ message: '배포 글을 찾을 수 없습니다.' });
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
      req.body.title != null ? String(req.body.title).trim() : existing.title;
    const content =
      req.body.content != null
        ? String(req.body.content).trim()
        : existing.content;
    const statusRaw =
      req.body.status != null ? String(req.body.status).trim() : existing.status;

    if (!title || !content) {
      removeFiles(toAttachments(req.files as Express.Multer.File[] | undefined));
      res.status(400).json({ message: '제목과 내용을 입력해 주세요.' });
      return;
    }
    if (!isDeployStatus(statusRaw)) {
      removeFiles(toAttachments(req.files as Express.Multer.File[] | undefined));
      res.status(400).json({ message: '배포상태를 선택해 주세요.' });
      return;
    }

    const attachments = [
      ...kept,
      ...toAttachments(req.files as Express.Multer.File[] | undefined),
    ];

    const updated = await updateReleasePost(param(req.params.id), req.userId!, {
      title,
      content,
      status: statusRaw,
      releasedAt: parseReleasedAt(req.body.releasedAt, existing.releasedAt),
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

  const existing = await getReleasePostRaw(param(req.params.id));
  if (!existing) {
    res.status(404).json({ message: '배포 글을 찾을 수 없습니다.' });
    return;
  }

  const ok = await deleteReleasePost(param(req.params.id), req.userId!);
  if (!ok) {
    res.status(403).json({ message: '관리자만 삭제할 수 있습니다.' });
    return;
  }
  removeFiles(existing.attachments);
  res.status(204).send();
});

export default router;
