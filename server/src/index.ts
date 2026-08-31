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

const { default: app } = await import('./app.js');

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, () => {
  console.log(`plan-go API server running on http://localhost:${PORT}`);
});
