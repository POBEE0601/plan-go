// 2026-09-01 CORS·캐시 비활성·업로드는 Storage 또는 로컬
// 2026-08-31 배포게시판 라우트 등록
import cors from 'cors';
import express from 'express';
import authRouter from './routes/auth.js';
import boardRouter from './routes/board.js';
import noticesRouter from './routes/notices.js';
import placesRouter from './routes/places.js';
import releasesRouter from './routes/releases.js';
import travelPlansRouter from './routes/travelPlans.js';
import { uploadsDir } from './services/fileStore.js';

const app = express();

app.set('trust proxy', 1);

const origins = (process.env.CLIENT_ORIGIN ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: origins.length > 0 ? origins : true,
  }),
);
app.use(express.json());

app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('CDN-Cache-Control', 'private, no-store');
  next();
});

// 로컬 개발 첨부 미리보기. 배포 파일은 Supabase public URL
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'plan-go-api' });
});

app.use('/api/auth', authRouter);
app.use('/api/places', placesRouter);
app.use('/api/travel-plans', travelPlansRouter);
app.use('/api/board', boardRouter);
app.use('/api/notices', noticesRouter);
app.use('/api/releases', releasesRouter);

app.use((_req, res) => {
  res.status(404).json({ message: '요청한 API를 찾을 수 없습니다.' });
});

export default app;
