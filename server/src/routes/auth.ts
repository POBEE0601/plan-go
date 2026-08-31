import { Router } from 'express';
import {
  createUser,
  getUserPublic,
  validateUser,
} from '../db/database.js';
import { authMiddleware, signToken, type AuthRequest } from '../middleware/auth.js';
import type { LoginBody, RegisterBody } from '../types/user.js';

const router = Router();

// 회원가입
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body as RegisterBody;

  if (!email?.trim() || !password || !name?.trim()) {
    res.status(400).json({ message: '이메일, 비밀번호, 이름은 필수입니다.' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ message: '비밀번호는 6자 이상이어야 합니다.' });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    res.status(400).json({ message: '올바른 이메일 형식이 아닙니다.' });
    return;
  }

  try {
    const user = await createUser(email, password, name);
    const token = signToken({ userId: user.id, email: user.email });
    res.status(201).json({ token, user });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : '회원가입에 실패했습니다.';
    res.status(409).json({ message });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  const { email, password } = req.body as LoginBody;

  if (!email?.trim() || !password) {
    res.status(400).json({ message: '이메일과 비밀번호를 입력해 주세요.' });
    return;
  }

  const user = await validateUser(email, password);
  if (!user) {
    res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email });
  res.json({ token, user });
});

// 2026-08-31 Supabase 비동기 조회
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  const user = await getUserPublic(req.userId!);
  if (!user) {
    res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    return;
  }
  res.json(user);
});

export default router;
