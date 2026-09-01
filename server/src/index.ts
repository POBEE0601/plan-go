// 2026-08-31 환경변수 로드 후 서버 시작 (ESM import 호이스팅 방지)
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envResult = config({ path: path.join(__dirname, '../.env') });

if (envResult.error) {
  console.warn('server/.env 로드 경고:', envResult.error.message);
}

if (!process.env.GOOGLE_MAPS_API_KEY) {
  console.warn(
    '경고: GOOGLE_MAPS_API_KEY가 비어 있습니다. server/.env를 확인하세요.',
  );
}

if (!process.env.DATABASE_URL?.trim()) {
  console.error(
    'DATABASE_URL이 없습니다. Supabase Connection string을 server/.env에 넣으세요.',
  );
  process.exit(1);
}

const { pingDb } = await import('./db/pool.js');
try {
  await pingDb();
  console.log('Supabase Postgres 연결 확인');
} catch (err) {
  console.error('Supabase 연결 실패:', err);
  process.exit(1);
}

const { default: app } = await import('./app.js');

const PORT = Number(process.env.PORT) || 3001;

if (process.env.NODE_ENV === 'production' && !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
  console.warn(
    '경고: SUPABASE_SERVICE_ROLE_KEY가 없습니다. 배포 환경에서 첨부 파일이 유지되지 않습니다.',
  );
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`plan-go API server running on port ${PORT}`);
});
