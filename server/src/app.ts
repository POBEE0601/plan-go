// 2026-08-31 배포게시판 라우트 등록
import cors from 'cors';
import express from 'express';
import authRouter from './routes/auth.js';
import boardRouter, { uploadsDir } from './routes/board.js';
import noticesRouter from './routes/notices.js';
import placesRouter from './routes/places.js';
import releasesRouter from './routes/releases.js';
import travelPlansRouter from './routes/travelPlans.js';

const app = express();

app.use(cors());
app.use(express.json());

// 업로드 파일 정적 제공 (미리보기용)
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
