// 2026-09-01 게시 첨부를 Supabase Storage(배포) 또는 로컬 디스크(개발)에 저장
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { BoardAttachment } from '../types/board.js';

const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsDir = path.join(__dirname, '../../uploads');

const BUCKET = 'plan-go-uploads';

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const originalNameOf = (file: Express.Multer.File): string =>
  Buffer.from(file.originalname, 'latin1').toString('utf8');

const storedNameOf = (file: Express.Multer.File): string => {
  const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
};

export const resolveSupabaseUrl = (): string => {
  const explicit = process.env.SUPABASE_URL?.trim().replace(/\/$/, '');
  if (explicit) return explicit;

  const db = process.env.DATABASE_URL ?? '';
  const ref = db.match(/postgres\.([a-z0-9]+)/i)?.[1];
  return ref ? `https://${ref}.supabase.co` : '';
};

let client: SupabaseClient | null = null;
let bucketReady = false;

const getClient = (): SupabaseClient | null => {
  const url = resolveSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
};

const ensureBucket = async (sb: SupabaseClient): Promise<void> => {
  if (bucketReady) return;
  const { data } = await sb.storage.listBuckets();
  if (!data?.some((b) => b.name === BUCKET)) {
    const { error } = await sb.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
    });
    if (error && !/already exists/i.test(error.message)) {
      throw new Error(`Storage 버킷 생성 실패: ${error.message}`);
    }
  }
  bucketReady = true;
};

const saveLocal = (file: Express.Multer.File, storedName: string): string => {
  fs.writeFileSync(path.join(uploadsDir, storedName), file.buffer);
  return `/uploads/${storedName}`;
};

const saveCloud = async (
  sb: SupabaseClient,
  file: Express.Multer.File,
  storedName: string,
): Promise<string> => {
  await ensureBucket(sb);
  const { error } = await sb.storage.from(BUCKET).upload(storedName, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });
  if (error) {
    throw new Error(`파일 업로드에 실패했습니다: ${error.message}`);
  }
  const { data } = sb.storage.from(BUCKET).getPublicUrl(storedName);
  return data.publicUrl;
};

export const saveUploads = async (
  files: Express.Multer.File[] | undefined,
): Promise<BoardAttachment[]> => {
  const list = files ?? [];
  if (list.length === 0) return [];

  const sb = getClient();
  if (!sb && process.env.NODE_ENV === 'production') {
    throw new Error(
      '배포 환경에서는 SUPABASE_SERVICE_ROLE_KEY가 필요합니다. 첨부 파일이 유지되지 않습니다.',
    );
  }

  const attachments: BoardAttachment[] = [];
  for (const file of list) {
    const storedName = storedNameOf(file);
    const url = sb
      ? await saveCloud(sb, file, storedName)
      : saveLocal(file, storedName);
    attachments.push({
      id: generateId(),
      originalName: originalNameOf(file),
      storedName,
      mimeType: file.mimetype,
      size: file.size,
      url,
    });
  }
  return attachments;
};

export const removeAttachments = async (
  attachments: BoardAttachment[],
): Promise<void> => {
  if (attachments.length === 0) return;
  const sb = getClient();
  const cloudNames = attachments
    .filter((a) => a.url.startsWith('http'))
    .map((a) => a.storedName);
  const localNames = attachments
    .filter((a) => !a.url.startsWith('http'))
    .map((a) => a.storedName);

  if (sb && cloudNames.length) {
    await sb.storage.from(BUCKET).remove(cloudNames);
  }

  for (const name of localNames) {
    const full = path.join(uploadsDir, name);
    if (fs.existsSync(full)) {
      try {
        fs.unlinkSync(full);
      } catch {
        // 로컬 파일 삭제 실패는 무시
      }
    }
  }
};
