import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import type { JwtPayload } from '../types/user.js';

const JWT_SECRET =
  process.env.JWT_SECRET ?? 'plan-go-dev-secret-change-in-production';

export const signToken = (payload: JwtPayload): string =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

export const verifyToken = (token: string): JwtPayload =>
  jwt.verify(token, JWT_SECRET) as JwtPayload;

export interface AuthRequest extends Request {
  userId?: string;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: '로그인이 필요합니다.' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ message: '유효하지 않거나 만료된 토큰입니다.' });
  }
};

/** 토큰이 있으면 userId 설정, 없어도 통과 (비회원 조회용) */
export const optionalAuthMiddleware = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }
  try {
    const payload = verifyToken(authHeader.slice(7));
    req.userId = payload.userId;
  } catch {
    // 만료 토큰이어도 공개 조회는 허용
  }
  next();
};
