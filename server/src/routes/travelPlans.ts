// 2026-09-04 초대 멤버 일정 나가기 API
// 2026-08-31 여행 계획·장소·Day·초대 API
import { Router } from 'express';
import {
  acceptInvite,
  addCustomCategory,
  addPlace,
  importUnassignedPlaces,
  assignPlaceToDay,
  createInviteLink,
  createTravelPlan,
  deletePlace,
  deleteTravelPlan,
  getInviteByToken,
  getTravelPlanById,
  getAccessiblePlans,
  getMemberRole,
  inviteByEmail,
  leavePlan,
  removeAssignment,
  removeCustomCategory,
  removeMember,
  reorderDay,
  updateAssignment,
  updateMemberRole,
  updatePlace,
  updatePrepMemo,
  addPrepItem,
  updatePrepItem,
  deletePrepItem,
  listExpenses,
  addExpense,
  deleteExpense,
  canWrite,
} from '../db/database.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { readReceipt } from '../services/receiptScan.js';
import type {
  AssignDayBody,
  CreateExpenseBody,
  CreatePlaceBody,
  CreateTravelPlanBody,
  InviteBody,
  MoveAssignmentBody,
} from '../types/travel.js';

const router = Router();

const param = (value: string | string[]): string =>
  Array.isArray(value) ? value[0] : value;

const handleError = (res: import('express').Response, err: unknown) => {
  const message =
    err instanceof Error ? err.message : '요청 처리 중 오류가 발생했습니다.';
  const status = /찾을 수 없|권한|이미|입력/.test(message) ? 400 : 500;
  res.status(status).json({ message });
};

// 2026-08-31 Supabase 비동기 API
router.get('/invites/:token', async (req, res) => {
  const found = await getInviteByToken(param(req.params.token));
  if (!found) {
    res.status(404).json({ message: '유효하지 않은 초대입니다.' });
    return;
  }
  res.json({
    planId: found.plan.id,
    planTitle: found.plan.title,
    role: found.member.role,
    email: found.member.email || null,
    status: found.member.status,
  });
});

router.use(authMiddleware);

router.post('/invites/:token/accept', async (req: AuthRequest, res) => {
  try {
    const plan = await acceptInvite(param(req.params.token), req.userId!);
    if (!plan) {
      res.status(404).json({ message: '초대를 수락할 수 없습니다.' });
      return;
    }
    res.json(plan);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/', async (req: AuthRequest, res) => {
  res.json(await getAccessiblePlans(req.userId!));
});

router.get('/:id', async (req: AuthRequest, res) => {
  const plan = await getTravelPlanById(param(req.params.id), req.userId!);
  if (!plan) {
    res.status(404).json({ message: '여행 계획을 찾을 수 없습니다.' });
    return;
  }
  res.json({
    ...plan,
    myRole: getMemberRole(plan, req.userId!),
  });
});

router.post('/', async (req: AuthRequest, res) => {
  const { title, startDate, endDate, regionName, regionLat, regionLng } =
    req.body as CreateTravelPlanBody;
  if (!title?.trim() || !startDate || !endDate) {
    res.status(400).json({ message: '제목, 시작일, 종료일은 필수입니다.' });
    return;
  }
  if (!regionName?.trim() || regionLat == null || regionLng == null) {
    res.status(400).json({ message: '여행 지역을 선택해 주세요.' });
    return;
  }
  const plan = await createTravelPlan(
    req.userId!,
    title.trim(),
    startDate,
    endDate,
    {
      regionName: regionName.trim(),
      regionLat: Number(regionLat),
      regionLng: Number(regionLng),
    },
  );
  res.status(201).json(plan);
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const deleted = await deleteTravelPlan(param(req.params.id), req.userId!);
  if (!deleted) {
    res.status(404).json({ message: '삭제할 수 없습니다. (소유자만 가능)' });
    return;
  }
  res.status(204).send();
});

// Places
router.post('/:planId/places', async (req: AuthRequest, res) => {
  try {
    const body = req.body as CreatePlaceBody;
    if (!body.name?.trim() || body.lat == null || body.lng == null) {
      res.status(400).json({ message: 'name, lat, lng은 필수입니다.' });
      return;
    }
    const place = await addPlace(param(req.params.planId), req.userId!, body);
    if (!place) {
      res.status(403).json({ message: '장소를 추가할 권한이 없습니다.' });
      return;
    }
    res.status(201).json(place);
  } catch (err) {
    handleError(res, err);
  }
});

// 2026-09-28 구글 테이크아웃 저장 장소. 일정 일차에는 넣지 않음
router.post('/:planId/places/import', async (req: AuthRequest, res) => {
  try {
    const places = (req.body as { places?: CreatePlaceBody[] }).places;
    if (!Array.isArray(places) || places.length === 0) {
      res.status(400).json({ message: '가져올 장소를 입력해 주세요.' });
      return;
    }
    const result = await importUnassignedPlaces(
      param(req.params.planId),
      req.userId!,
      places,
    );
    if (!result) {
      res.status(403).json({ message: '장소를 추가할 권한이 없습니다.' });
      return;
    }
    res.status(201).json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.patch('/:planId/places/:placeId', async (req: AuthRequest, res) => {
  try {
    const place = await updatePlace(
      param(req.params.planId),
      req.userId!,
      param(req.params.placeId),
      req.body,
    );
    if (!place) {
      res.status(403).json({ message: '수정 권한이 없거나 장소가 없습니다.' });
      return;
    }
    res.json(place);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/:planId/places/:placeId', async (req: AuthRequest, res) => {
  try {
    const ok = await deletePlace(
      param(req.params.planId),
      req.userId!,
      param(req.params.placeId),
    );
    if (!ok) {
      res.status(403).json({ message: '삭제 권한이 없거나 장소가 없습니다.' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

// 2026-09-23 여행별 커스텀 카테고리
router.post('/:planId/custom-categories', async (req: AuthRequest, res) => {
  try {
    const body = req.body as {
      emoji?: string;
      label?: string;
      pinColor?: string;
    };
    const created = await addCustomCategory(
      param(req.params.planId),
      req.userId!,
      body,
    );
    if (!created) {
      res.status(403).json({ message: '카테고리를 추가할 권한이 없습니다.' });
      return;
    }
    res.status(201).json(created);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete(
  '/:planId/custom-categories/:categoryId',
  async (req: AuthRequest, res) => {
    try {
      const plan = await removeCustomCategory(
        param(req.params.planId),
        req.userId!,
        param(req.params.categoryId),
      );
      if (!plan) {
        res.status(403).json({ message: '카테고리를 삭제할 권한이 없습니다.' });
        return;
      }
      res.json({
        ...plan,
        myRole: getMemberRole(plan, req.userId!),
      });
    } catch (err) {
      handleError(res, err);
    }
  },
);

// Day assignments
router.post('/:planId/days', async (req: AuthRequest, res) => {
  try {
    const body = req.body as AssignDayBody;
    if (!body.placeId || !body.dayIndex) {
      res.status(400).json({ message: 'placeId, dayIndex는 필수입니다.' });
      return;
    }
    const assignment = await assignPlaceToDay(
      param(req.params.planId),
      req.userId!,
      body.placeId,
      body.dayIndex,
      body.time,
      body.memo,
    );
    if (!assignment) {
      res.status(403).json({ message: '배정 권한이 없습니다.' });
      return;
    }
    res.status(201).json(assignment);
  } catch (err) {
    handleError(res, err);
  }
});

router.patch('/:planId/days/:assignmentId', async (req: AuthRequest, res) => {
  try {
    const body = req.body as MoveAssignmentBody;
    const updated = await updateAssignment(
      param(req.params.planId),
      req.userId!,
      param(req.params.assignmentId),
      body,
    );
    if (!updated) {
      res.status(403).json({ message: '수정 권한이 없거나 배정이 없습니다.' });
      return;
    }
    res.json(updated);
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/:planId/days/:dayIndex/reorder', async (req: AuthRequest, res) => {
  try {
    const ids = (req.body as { orderedIds: string[] }).orderedIds;
    if (!Array.isArray(ids)) {
      res.status(400).json({ message: 'orderedIds 배열이 필요합니다.' });
      return;
    }
    const result = await reorderDay(
      param(req.params.planId),
      req.userId!,
      Number(param(req.params.dayIndex)),
      ids,
    );
    if (!result) {
      res.status(403).json({ message: '정렬 권한이 없습니다.' });
      return;
    }
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/:planId/days/:assignmentId', async (req: AuthRequest, res) => {
  try {
    const ok = await removeAssignment(
      param(req.params.planId),
      req.userId!,
      param(req.params.assignmentId),
    );
    if (!ok) {
      res.status(403).json({ message: '삭제 권한이 없거나 배정이 없습니다.' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

// Members / invites
router.post('/:planId/invites', async (req: AuthRequest, res) => {
  try {
    const body = req.body as InviteBody;
    if (!body.role || !['editor', 'viewer'].includes(body.role)) {
      res.status(400).json({ message: 'role은 editor 또는 viewer여야 합니다.' });
      return;
    }

    const planId = param(req.params.planId);

    if (body.createLink) {
      const linkInvite = await createInviteLink(planId, req.userId!, body.role);
      if (!linkInvite) {
        res.status(403).json({ message: '초대 권한이 없습니다. (소유자만)' });
        return;
      }
      res.status(201).json({
        ...linkInvite,
        inviteUrl: `/invite/${linkInvite.inviteToken}`,
      });
      return;
    }

    if (!body.email?.trim()) {
      res.status(400).json({ message: 'email 또는 createLink가 필요합니다.' });
      return;
    }

    const member = await inviteByEmail(
      planId,
      req.userId!,
      body.email,
      body.role,
    );
    if (!member) {
      res.status(403).json({ message: '초대 권한이 없습니다. (소유자만)' });
      return;
    }
    res.status(201).json({
      ...member,
      inviteUrl: `/invite/${member.inviteToken}`,
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.patch('/:planId/members/:memberId', async (req: AuthRequest, res) => {
  const role = (req.body as { role: 'editor' | 'viewer' }).role;
  if (!role || !['editor', 'viewer'].includes(role)) {
    res.status(400).json({ message: 'role은 editor 또는 viewer여야 합니다.' });
    return;
  }
  const member = await updateMemberRole(
    param(req.params.planId),
    req.userId!,
    param(req.params.memberId),
    role,
  );
  if (!member) {
    res.status(403).json({ message: '권한 변경에 실패했습니다.' });
    return;
  }
  res.json(member);
});

router.delete('/:planId/members/:memberId', async (req: AuthRequest, res) => {
  const ok = await removeMember(
    param(req.params.planId),
    req.userId!,
    param(req.params.memberId),
  );
  if (!ok) {
    res.status(403).json({ message: '멤버 제거에 실패했습니다.' });
    return;
  }
  res.status(204).send();
});

// 2026-09-04 초대받은 사람이 일정에서 나가기
router.post('/:planId/leave', async (req: AuthRequest, res) => {
  const result = await leavePlan(param(req.params.planId), req.userId!);
  if (result === 'owner') {
    res.status(400).json({
      message: '소유자는 나갈 수 없습니다. 계획을 삭제해 주세요.',
    });
    return;
  }
  if (result !== 'ok') {
    res.status(403).json({ message: '이 여행에서 나갈 수 없습니다.' });
    return;
  }
  res.status(204).send();
});

// 여행 준비 메모·체크리스트
router.patch('/:planId/prep/memo', async (req: AuthRequest, res) => {
  try {
    const memo = String((req.body as { memo?: string }).memo ?? '');
    const saved = await updatePrepMemo(
      param(req.params.planId),
      req.userId!,
      memo,
    );
    if (saved == null) {
      res.status(403).json({ message: '메모를 수정할 권한이 없습니다.' });
      return;
    }
    res.json({ memo: saved });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/:planId/prep/items', async (req: AuthRequest, res) => {
  try {
    const label = String((req.body as { label?: string }).label ?? '');
    const item = await addPrepItem(
      param(req.params.planId),
      req.userId!,
      label,
    );
    if (!item) {
      res.status(403).json({ message: '항목을 추가할 권한이 없습니다.' });
      return;
    }
    res.status(201).json(item);
  } catch (err) {
    handleError(res, err);
  }
});

router.patch('/:planId/prep/items/:itemId', async (req: AuthRequest, res) => {
  try {
    const item = await updatePrepItem(
      param(req.params.planId),
      req.userId!,
      param(req.params.itemId),
      req.body as { checked?: boolean; label?: string; detail?: string },
    );
    if (!item) {
      res.status(403).json({ message: '항목을 수정할 권한이 없습니다.' });
      return;
    }
    res.json(item);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/:planId/prep/items/:itemId', async (req: AuthRequest, res) => {
  try {
    const ok = await deletePrepItem(
      param(req.params.planId),
      req.userId!,
      param(req.params.itemId),
    );
    if (!ok) {
      res.status(403).json({ message: '항목을 삭제할 권한이 없습니다.' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

// 2026-09-28 영수증 사진 → 지출 입력값. 저장은 사용자가 확인한 뒤 한다
router.post(
  '/:planId/expenses/scan',
  rateLimit(8, 60_000),
  async (req: AuthRequest, res) => {
    try {
      const plan = await getTravelPlanById(param(req.params.planId), req.userId!);
      if (!plan || !canWrite(plan, req.userId!)) {
        res.status(403).json({ message: '지출을 추가할 권한이 없습니다.' });
        return;
      }
      const mimeType = (req.body as { mimeType?: unknown }).mimeType;
      const data = (req.body as { data?: unknown }).data;
      if (
        (mimeType !== 'image/jpeg' &&
          mimeType !== 'image/png' &&
          mimeType !== 'image/webp') ||
        typeof data !== 'string' ||
        data.length < 32 ||
        data.length > 6_000_000
      ) {
        res.status(400).json({ message: '영수증 이미지를 확인해 주세요.' });
        return;
      }
      const draft = await readReceipt(mimeType, data);
      res.json(draft);
    } catch (err) {
      const message = err instanceof Error ? err.message : '영수증을 읽지 못했습니다.';
      const status = /GEMINI_API_KEY/.test(message) ? 503 : 502;
      res.status(status).json({ message });
    }
  },
);

// 2026-09-28 여행 지출
router.get('/:planId/expenses', async (req: AuthRequest, res) => {
  try {
    const items = await listExpenses(param(req.params.planId), req.userId!);
    if (!items) {
      res.status(403).json({ message: '지출을 볼 권한이 없습니다.' });
      return;
    }
    res.json(items);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/:planId/expenses', async (req: AuthRequest, res) => {
  try {
    const item = await addExpense(
      param(req.params.planId),
      req.userId!,
      req.body as CreateExpenseBody,
    );
    if (!item) {
      res.status(403).json({ message: '지출을 추가할 권한이 없습니다.' });
      return;
    }
    res.status(201).json(item);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/:planId/expenses/:expenseId', async (req: AuthRequest, res) => {
  try {
    const ok = await deleteExpense(
      param(req.params.planId),
      req.userId!,
      param(req.params.expenseId),
    );
    if (!ok) {
      res.status(403).json({ message: '지출을 삭제할 권한이 없습니다.' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
