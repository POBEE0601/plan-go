// 2026-10-06 관리자 전용: API 사용량·회원 목록
import { Router } from 'express';
import { isAdminUserId, listMembersForAdmin } from '../db/database.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { getUsageSummary } from '../services/apiUsage.js';

const router = Router();

router.use(authMiddleware);

router.get('/overview', async (req: AuthRequest, res) => {
  if (!req.userId || !(await isAdminUserId(req.userId))) {
    res.status(403).json({ message: '관리자만 볼 수 있습니다.' });
    return;
  }

  const [{ month, usage }, members] = await Promise.all([
    getUsageSummary(),
    listMembersForAdmin(),
  ]);
  res.json({ month, usage, members });
});

export default router;
