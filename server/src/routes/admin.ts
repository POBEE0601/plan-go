// 2026-10-21 관리자 여행 알림 등록·삭제
// 2026-10-06 관리자 전용: API 사용량·회원 목록
import { Router } from 'express';
import {
  createTravelAlert,
  deleteTravelAlert,
  listAllAlerts,
} from '../db/alerts.js';
import { isAdminUserId, listMembersForAdmin } from '../db/database.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { getUsageSummary } from '../services/apiUsage.js';

const router = Router();

router.use(authMiddleware);

const requireAdmin = async (req: AuthRequest, res: import('express').Response) => {
  if (!req.userId || !(await isAdminUserId(req.userId))) {
    res.status(403).json({ message: '관리자만 볼 수 있습니다.' });
    return false;
  }
  return true;
};

router.get('/overview', async (req: AuthRequest, res) => {
  if (!(await requireAdmin(req, res))) return;

  const [{ month, usage }, members] = await Promise.all([
    getUsageSummary(),
    listMembersForAdmin(),
  ]);
  res.json({ month, usage, members });
});

router.get('/alerts', async (req: AuthRequest, res) => {
  if (!(await requireAdmin(req, res))) return;
  res.json(await listAllAlerts());
});

router.post('/alerts', async (req: AuthRequest, res) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const alert = await createTravelAlert(req.body ?? {});
    res.status(201).json(alert);
  } catch (err) {
    const message = err instanceof Error ? err.message : '알림을 저장하지 못했습니다.';
    res.status(400).json({ message });
  }
});

router.delete('/alerts/:id', async (req: AuthRequest, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const ok = await deleteTravelAlert(id);
  if (!ok) {
    res.status(404).json({ message: '알림을 찾을 수 없습니다.' });
    return;
  }
  res.status(204).send();
});

export default router;
