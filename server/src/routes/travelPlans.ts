// 2026-08-31 여행 계획·장소·Day·초대 API
import { Router } from 'express';
import {
  acceptInvite,
  addPlace,
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
  removeAssignment,
  removeMember,
  reorderDay,
  updateAssignment,
  updateMemberRole,
  updatePlace,
} from '../db/database.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import type {
  AssignDayBody,
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
  const status = /찾을 수 없|권한|이미/.test(message) ? 400 : 500;
  res.status(status).json({ message });
};

// 초대 토큰 미리보기 (로그인 선택적 — 공개 정보만)
router.get('/invites/:token', (req, res) => {
  const found = getInviteByToken(param(req.params.token));
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

router.post('/invites/:token/accept', (req: AuthRequest, res) => {
  try {
    const plan = acceptInvite(param(req.params.token), req.userId!);
    if (!plan) {
      res.status(404).json({ message: '초대를 수락할 수 없습니다.' });
      return;
    }
    res.json(plan);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/', (req: AuthRequest, res) => {
  res.json(getAccessiblePlans(req.userId!));
});

router.get('/:id', (req: AuthRequest, res) => {
  const plan = getTravelPlanById(param(req.params.id), req.userId!);
  if (!plan) {
    res.status(404).json({ message: '여행 계획을 찾을 수 없습니다.' });
    return;
  }
  res.json({
    ...plan,
    myRole: getMemberRole(plan, req.userId!),
  });
});

router.post('/', (req: AuthRequest, res) => {
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
  const plan = createTravelPlan(req.userId!, title.trim(), startDate, endDate, {
    regionName: regionName.trim(),
    regionLat: Number(regionLat),
    regionLng: Number(regionLng),
  });
  res.status(201).json(plan);
});

router.delete('/:id', (req: AuthRequest, res) => {
  const deleted = deleteTravelPlan(param(req.params.id), req.userId!);
  if (!deleted) {
    res.status(404).json({ message: '삭제할 수 없습니다. (소유자만 가능)' });
    return;
  }
  res.status(204).send();
});

// Places
router.post('/:planId/places', (req: AuthRequest, res) => {
  try {
    const body = req.body as CreatePlaceBody;
    if (!body.name?.trim() || body.lat == null || body.lng == null) {
      res.status(400).json({ message: 'name, lat, lng은 필수입니다.' });
      return;
    }
    const place = addPlace(param(req.params.planId), req.userId!, body);
    if (!place) {
      res.status(403).json({ message: '장소를 추가할 권한이 없습니다.' });
      return;
    }
    res.status(201).json(place);
  } catch (err) {
    handleError(res, err);
  }
});

router.patch('/:planId/places/:placeId', (req: AuthRequest, res) => {
  try {
    const place = updatePlace(
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

router.delete('/:planId/places/:placeId', (req: AuthRequest, res) => {
  try {
    const ok = deletePlace(
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

// Day assignments
router.post('/:planId/days', (req: AuthRequest, res) => {
  try {
    const body = req.body as AssignDayBody;
    if (!body.placeId || !body.dayIndex) {
      res.status(400).json({ message: 'placeId, dayIndex는 필수입니다.' });
      return;
    }
    const assignment = assignPlaceToDay(
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

router.patch('/:planId/days/:assignmentId', (req: AuthRequest, res) => {
  try {
    const body = req.body as MoveAssignmentBody;
    const updated = updateAssignment(
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

router.put('/:planId/days/:dayIndex/reorder', (req: AuthRequest, res) => {
  try {
    const ids = (req.body as { orderedIds: string[] }).orderedIds;
    if (!Array.isArray(ids)) {
      res.status(400).json({ message: 'orderedIds 배열이 필요합니다.' });
      return;
    }
    const result = reorderDay(
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

router.delete('/:planId/days/:assignmentId', (req: AuthRequest, res) => {
  try {
    const ok = removeAssignment(
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
router.post('/:planId/invites', (req: AuthRequest, res) => {
  try {
    const body = req.body as InviteBody;
    if (!body.role || !['editor', 'viewer'].includes(body.role)) {
      res.status(400).json({ message: 'role은 editor 또는 viewer여야 합니다.' });
      return;
    }

    const planId = param(req.params.planId);

    if (body.createLink) {
      const linkInvite = createInviteLink(planId, req.userId!, body.role);
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

    const member = inviteByEmail(
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

router.patch('/:planId/members/:memberId', (req: AuthRequest, res) => {
  const role = (req.body as { role: 'editor' | 'viewer' }).role;
  if (!role || !['editor', 'viewer'].includes(role)) {
    res.status(400).json({ message: 'role은 editor 또는 viewer여야 합니다.' });
    return;
  }
  const member = updateMemberRole(
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

router.delete('/:planId/members/:memberId', (req: AuthRequest, res) => {
  const ok = removeMember(
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

export default router;
