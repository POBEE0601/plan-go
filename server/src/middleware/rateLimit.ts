// 2026-09-01 Google Places/Directions 남용 방지 (메모리 분당 한도)
import type { NextFunction, Request, Response } from 'express';
import type { AuthRequest } from './auth.js';

interface Bucket {
  n: number;
  reset: number;
}

const hits = new Map<string, Bucket>();

export const rateLimit = (max: number, windowMs = 60_000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = (req as AuthRequest).userId;
    const id = userId || req.ip || 'anon';
    const key = `${id}:${req.path}`;
    const now = Date.now();
    let bucket = hits.get(key);

    if (!bucket || now > bucket.reset) {
      bucket = { n: 0, reset: now + windowMs };
      hits.set(key, bucket);
    }

    bucket.n += 1;
    if (bucket.n > max) {
      res.status(429).json({
        message: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.',
      });
      return;
    }

    next();
  };
};
