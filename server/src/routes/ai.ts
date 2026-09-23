// 2026-09-23 AI 대화. 일정 저장은 기존 장소 API가 담당한다
import { Router } from 'express';
import { getTravelPlanById } from '../db/database.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { chatWithGemini, type AiTurn } from '../services/geminiChat.js';

const router = Router();

router.use(authMiddleware);
router.use(rateLimit(12, 60_000));

router.post('/chat', async (req: AuthRequest, res) => {
  const body = req.body as { planId?: unknown; messages?: unknown };
  const messages = parseMessages(body.messages);
  if (!messages) {
    res.status(400).json({ message: '대화 내용이 올바르지 않습니다.' });
    return;
  }

  const planId = typeof body.planId === 'string' ? body.planId.trim() : '';
  try {
    const plan = planId
      ? await getTravelPlanById(planId, req.userId!)
      : null;
    if (planId && !plan) {
      res.status(404).json({ message: '여행 계획을 찾을 수 없습니다.' });
      return;
    }
    const result = await chatWithGemini({ plan, messages });
    res.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'AI 응답을 만들지 못했습니다.';
    const status = /GEMINI_API_KEY/.test(message) ? 503 : 502;
    res.status(status).json({ message });
  }
});

const parseMessages = (value: unknown): AiTurn[] | null => {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) {
    return null;
  }
  const messages: AiTurn[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const role = (item as { role?: unknown }).role;
    const text = (item as { text?: unknown }).text;
    if ((role !== 'user' && role !== 'model') || typeof text !== 'string') {
      return null;
    }
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 2000) return null;
    messages.push({ role, text: trimmed });
  }
  if (messages[messages.length - 1]?.role !== 'user') return null;
  return messages;
};

export default router;
