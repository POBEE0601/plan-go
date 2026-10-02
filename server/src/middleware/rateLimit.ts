// 2026-10-02 분당 한도와 하루 한도를 이름별로 둔다
// 2026-09-01 Google Places/Directions 남용 방지 (메모리 분당 한도)
import type { NextFunction, Request, Response } from 'express';
import type { AuthRequest } from './auth.js';

interface Bucket {
  n: number;
  reset: number;
}

const hits = new Map<string, Bucket>();

export const rateLimit = (max: number, windowMs = 60_000, bucketName = 'path') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = (req as AuthRequest).userId;
    const id = userId || req.ip || 'anon';
    const scope = bucketName === 'path' ? req.path : bucketName;
    const key = `${scope}:${id}`;
    const now = Date.now();
    let bucket = hits.get(key);

    if (!bucket || now > bucket.reset) {
      bucket = { n: 0, reset: now + windowMs };
      hits.set(key, bucket);
    }

    bucket.n += 1;
    if (bucket.n > max) {
      res.status(429).json({
        message:
          windowMs >= 86_400_000
            ? '오늘 사용할 수 있는 지도 조회 횟수를 모두 썼습니다. 내일 다시 시도하세요.'
            : '요청이 너무 많습니다. 잠시 후 다시 시도하세요.',
      });
      return;
    }

    next();
  };
};
