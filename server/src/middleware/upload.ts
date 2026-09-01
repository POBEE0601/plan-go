// 2026-09-01 공통 메모리 업로드 (디스크 대신 Storage/로컬 저장 계층으로 넘김)
import multer from 'multer';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error('이미지(jpg/png/webp/gif) 또는 PDF만 업로드할 수 있습니다.'));
      return;
    }
    cb(null, true);
  },
});
