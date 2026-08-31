// 2026-08-31 로컬 JSON DB → Supabase Postgres
import bcrypt from 'bcryptjs';
import type { PoolClient } from 'pg';
import type {
  BoardAttachment,
  BoardComment,
  BoardCommentPublic,
  BoardPost,
  BoardPostPublic,
} from '../types/board.js';
import type { NoticePost, NoticePostPublic } from '../types/notice.js';
import type {
  DeployStatus,
  ReleasePost,
  ReleasePostPublic,
} from '../types/release.js';
import type {
  CreatePlaceBody,
  DayAssignment,
  MemberRole,
  Place,
  PlanMember,
  TravelPlan,
} from '../types/travel.js';
import type { User, UserPublic } from '../types/user.js';
import { isAdminEmail } from '../utils/admin.js';
import { getDayCount } from '../utils/days.js';
import { pool } from './pool.js';

export const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const asIso = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
};

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
};

const toPublicUser = (user: User): UserPublic => ({
  id: user.id,
  email: user.email,
  name: user.name,
  isAdmin: isAdminEmail(user.email),
});

const mapUser = (row: Record<string, unknown>): User => ({
  id: String(row.id),
  email: String(row.email),
  passwordHash: String(row.password_hash),
  name: String(row.name),
  createdAt: asIso(row.created_at),
});

const mapPlace = (row: Record<string, unknown>): Place => ({
  id: String(row.id),
  planId: String(row.plan_id),
  googlePlaceId: row.google_place_id ? String(row.google_place_id) : undefined,
  name: String(row.name),
  address: String(row.address ?? ''),
  lat: Number(row.lat),
  lng: Number(row.lng),
  category: (row.category as Place['category']) ?? 'other',
  rating: row.rating == null ? undefined : Number(row.rating),
  photoUrl: row.photo_url ? String(row.photo_url) : undefined,
  memo: row.memo ? String(row.memo) : undefined,
  types: parseJson<string[] | undefined>(row.types, undefined),
});

const mapAssignment = (row: Record<string, unknown>): DayAssignment => ({
  id: String(row.id),
  planId: String(row.plan_id),
  placeId: String(row.place_id),
  dayIndex: Number(row.day_index),
  order: Number(row.sort_order),
  time: row.time ? String(row.time) : undefined,
  memo: row.memo ? String(row.memo) : undefined,
});

const mapMember = (row: Record<string, unknown>): PlanMember => ({
  id: String(row.id),
  planId: String(row.plan_id),
  userId: String(row.user_id ?? ''),
  email: String(row.email ?? ''),
  name: String(row.name ?? ''),
  role: row.role as MemberRole,
  status: row.status as PlanMember['status'],
  inviteToken: row.invite_token ? String(row.invite_token) : undefined,
  createdAt: asIso(row.created_at),
});

const mapPlanRow = (row: Record<string, unknown>): Omit<
  TravelPlan,
  'places' | 'dayAssignments' | 'members'
> => ({
  id: String(row.id),
  userId: String(row.user_id),
  title: String(row.title),
  startDate: String(row.start_date),
  endDate: String(row.end_date),
  regionName: row.region_name ? String(row.region_name) : undefined,
  regionLat: row.region_lat == null ? undefined : Number(row.region_lat),
  regionLng: row.region_lng == null ? undefined : Number(row.region_lng),
});

const mapAttachments = (value: unknown): BoardAttachment[] =>
  parseJson<BoardAttachment[]>(value, []);

const mapBoardPost = (row: Record<string, unknown>): BoardPost => ({
  id: String(row.id),
  authorId: String(row.author_id),
  title: String(row.title),
  content: String(row.content),
  attachments: mapAttachments(row.attachments),
  createdAt: asIso(row.created_at),
  updatedAt: asIso(row.updated_at),
});

const mapNoticePost = (row: Record<string, unknown>): NoticePost => ({
  id: String(row.id),
  authorId: String(row.author_id),
  title: String(row.title),
  content: String(row.content),
  attachments: mapAttachments(row.attachments),
  viewCount: Number(row.view_count ?? 0),
  createdAt: asIso(row.created_at),
  updatedAt: asIso(row.updated_at),
});

const mapReleasePost = (row: Record<string, unknown>): ReleasePost => ({
  id: String(row.id),
  authorId: String(row.author_id),
  title: String(row.title),
  content: String(row.content),
  status: row.status as DeployStatus,
  releasedAt: asIso(row.released_at),
  attachments: mapAttachments(row.attachments),
  viewCount: Number(row.view_count ?? 0),
  createdAt: asIso(row.created_at),
  updatedAt: asIso(row.updated_at),
});

const withTx = async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const enrichMember = (member: PlanMember, users: User[]): PlanMember => {
  if (member.email && member.name && member.name !== 'Owner') return member;
  const user = users.find((u) => u.id === member.userId);
  if (!user) return member;
  return {
    ...member,
    email: member.email || user.email,
    name: member.name === 'Owner' || !member.name ? user.name : member.name,
  };
};

const loadUsersByIds = async (ids: string[]): Promise<User[]> => {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return [];
  const { rows } = await pool.query(
    `SELECT * FROM users WHERE id = ANY($1::text[])`,
    [unique],
  );
  return rows.map((r) => mapUser(r as Record<string, unknown>));
};

const assemblePlans = async (
  planRows: Record<string, unknown>[],
): Promise<TravelPlan[]> => {
  if (!planRows.length) return [];
  const ids = planRows.map((r) => String(r.id));

  const [placeRes, dayRes, memberRes] = await Promise.all([
    pool.query(`SELECT * FROM places WHERE plan_id = ANY($1::text[])`, [ids]),
    pool.query(
      `SELECT * FROM day_assignments WHERE plan_id = ANY($1::text[]) ORDER BY day_index, sort_order`,
      [ids],
    ),
    pool.query(`SELECT * FROM plan_members WHERE plan_id = ANY($1::text[])`, [
      ids,
    ]),
  ]);

  const places = placeRes.rows.map((r) => mapPlace(r as Record<string, unknown>));
  const days = dayRes.rows.map((r) =>
    mapAssignment(r as Record<string, unknown>),
  );
  const members = memberRes.rows.map((r) =>
    mapMember(r as Record<string, unknown>),
  );

  const userIds = [
    ...planRows.map((r) => String(r.user_id)),
    ...members.map((m) => m.userId),
  ];
  const users = await loadUsersByIds(userIds);

  return planRows.map((row) => {
    const base = mapPlanRow(row);
    const planMembers = members.filter((m) => m.planId === base.id);
    let nextMembers = planMembers;

    if (!nextMembers.some((m) => m.role === 'owner' && m.userId === base.userId)) {
      nextMembers = [
        {
          id: `owner-${base.id}`,
          planId: base.id,
          userId: base.userId,
          email: '',
          name: 'Owner',
          role: 'owner',
          status: 'accepted',
          createdAt: new Date().toISOString(),
        },
        ...nextMembers.filter(
          (m) => m.role !== 'owner' || m.userId !== base.userId,
        ),
      ];
    }

    return {
      ...base,
      places: places.filter((p) => p.planId === base.id),
      dayAssignments: days.filter((d) => d.planId === base.id),
      members: nextMembers.map((m) => enrichMember(m, users)),
    };
  });
};

const loadPlan = async (id: string): Promise<TravelPlan | null> => {
  const { rows } = await pool.query(`SELECT * FROM travel_plans WHERE id = $1`, [
    id,
  ]);
  if (!rows.length) return null;
  const [plan] = await assemblePlans([rows[0] as Record<string, unknown>]);
  return plan ?? null;
};

// --- Access ---

export const getMemberRole = (
  plan: TravelPlan,
  userId: string,
): MemberRole | null => {
  const member = plan.members.find(
    (m) => m.userId === userId && m.status === 'accepted',
  );
  if (member) return member.role;
  if (plan.userId === userId) return 'owner';
  return null;
};

export const canRead = (plan: TravelPlan, userId: string): boolean =>
  getMemberRole(plan, userId) != null;

export const canWrite = (plan: TravelPlan, userId: string): boolean => {
  const role = getMemberRole(plan, userId);
  return role === 'owner' || role === 'editor';
};

export const canManage = (plan: TravelPlan, userId: string): boolean =>
  getMemberRole(plan, userId) === 'owner';

const requireWritablePlan = async (
  planId: string,
  userId: string,
): Promise<TravelPlan | null> => {
  const plan = await loadPlan(planId);
  if (!plan || !canWrite(plan, userId)) return null;
  return plan;
};

// --- User ---

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [
    email.toLowerCase(),
  ]);
  return rows[0] ? mapUser(rows[0] as Record<string, unknown>) : null;
};

export const findUserById = async (id: string): Promise<User | null> => {
  const { rows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
  return rows[0] ? mapUser(rows[0] as Record<string, unknown>) : null;
};

export const createUser = async (
  email: string,
  password: string,
  name: string,
): Promise<UserPublic> => {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw new Error('이미 사용 중인 이메일입니다.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user: User = {
    id: generateId(),
    email: normalizedEmail,
    passwordHash,
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };

  try {
    await pool.query(
      `INSERT INTO users (id, email, password_hash, name, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, user.email, user.passwordHash, user.name, user.createdAt],
    );
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '23505') throw new Error('이미 사용 중인 이메일입니다.');
    throw err;
  }

  return toPublicUser(user);
};

export const validateUser = async (
  email: string,
  password: string,
): Promise<UserPublic | null> => {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? toPublicUser(user) : null;
};

export const getUserPublic = async (id: string): Promise<UserPublic | null> => {
  const user = await findUserById(id);
  return user ? toPublicUser(user) : null;
};

export const isAdminUserId = async (userId: string): Promise<boolean> => {
  const user = await findUserById(userId);
  return isAdminEmail(user?.email);
};

// --- Travel Plan ---

export const getAccessiblePlans = async (
  userId: string,
): Promise<TravelPlan[]> => {
  const { rows } = await pool.query(
    `SELECT DISTINCT p.*
     FROM travel_plans p
     LEFT JOIN plan_members m ON m.plan_id = p.id
     WHERE p.user_id = $1
        OR (m.user_id = $1 AND m.status = 'accepted')
     ORDER BY p.id DESC`,
    [userId],
  );
  return assemblePlans(rows as Record<string, unknown>[]);
};

export const getTravelPlanById = async (
  id: string,
  userId?: string,
): Promise<TravelPlan | null> => {
  const plan = await loadPlan(id);
  if (!plan) return null;
  if (userId && !canRead(plan, userId)) return null;
  return plan;
};

export const createTravelPlan = async (
  userId: string,
  title: string,
  startDate: string,
  endDate: string,
  region?: { regionName: string; regionLat: number; regionLng: number },
): Promise<TravelPlan> => {
  const user = await findUserById(userId);
  const id = generateId();
  const memberId = generateId();
  const now = new Date().toISOString();

  await withTx(async (client) => {
    await client.query(
      `INSERT INTO travel_plans
        (id, user_id, title, start_date, end_date, region_name, region_lat, region_lng)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        userId,
        title,
        startDate,
        endDate,
        region?.regionName ?? null,
        region?.regionLat ?? null,
        region?.regionLng ?? null,
      ],
    );
    await client.query(
      `INSERT INTO plan_members
        (id, plan_id, user_id, email, name, role, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'owner', 'accepted', $6)`,
      [memberId, id, userId, user?.email ?? '', user?.name ?? 'Owner', now],
    );
  });

  const plan = await loadPlan(id);
  if (!plan) throw new Error('여행 계획 생성에 실패했습니다.');
  return plan;
};

export const deleteTravelPlan = async (
  id: string,
  userId: string,
): Promise<boolean> => {
  const plan = await loadPlan(id);
  if (!plan || !canManage(plan, userId)) return false;
  await pool.query(`DELETE FROM travel_plans WHERE id = $1`, [id]);
  return true;
};

// --- Places ---

export const addPlace = async (
  planId: string,
  userId: string,
  body: CreatePlaceBody,
): Promise<Place | null> => {
  const plan = await requireWritablePlan(planId, userId);
  if (!plan) return null;

  if (
    body.googlePlaceId &&
    plan.places.some((pl) => pl.googlePlaceId === body.googlePlaceId)
  ) {
    throw new Error('이미 등록된 장소입니다.');
  }

  const created: Place = {
    id: generateId(),
    planId,
    googlePlaceId: body.googlePlaceId,
    name: body.name.trim(),
    address: body.address?.trim() ?? '',
    lat: body.lat,
    lng: body.lng,
    category: body.category ?? 'other',
    rating: body.rating,
    photoUrl: body.photoUrl,
    memo: body.memo,
    types: body.types,
  };

  await pool.query(
    `INSERT INTO places
      (id, plan_id, google_place_id, name, address, lat, lng, category, rating, photo_url, memo, types)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      created.id,
      created.planId,
      created.googlePlaceId ?? null,
      created.name,
      created.address,
      created.lat,
      created.lng,
      created.category,
      created.rating ?? null,
      created.photoUrl ?? null,
      created.memo ?? null,
      created.types ? JSON.stringify(created.types) : null,
    ],
  );

  return created;
};

export const updatePlace = async (
  planId: string,
  userId: string,
  placeId: string,
  updates: Partial<CreatePlaceBody>,
): Promise<Place | null> => {
  const plan = await requireWritablePlan(planId, userId);
  if (!plan) return null;

  const current = plan.places.find((pl) => pl.id === placeId);
  if (!current) throw new Error('장소를 찾을 수 없습니다.');

  const next: Place = {
    ...current,
    ...updates,
    id: placeId,
    planId,
    name: updates.name != null ? updates.name : current.name,
    address: updates.address != null ? updates.address : current.address,
  };

  await pool.query(
    `UPDATE places SET
      google_place_id = $1, name = $2, address = $3, lat = $4, lng = $5,
      category = $6, rating = $7, photo_url = $8, memo = $9, types = $10
     WHERE id = $11 AND plan_id = $12`,
    [
      next.googlePlaceId ?? null,
      next.name,
      next.address,
      next.lat,
      next.lng,
      next.category,
      next.rating ?? null,
      next.photoUrl ?? null,
      next.memo ?? null,
      next.types ? JSON.stringify(next.types) : null,
      placeId,
      planId,
    ],
  );

  return next;
};

export const deletePlace = async (
  planId: string,
  userId: string,
  placeId: string,
): Promise<boolean> => {
  const plan = await requireWritablePlan(planId, userId);
  if (!plan) return false;
  if (!plan.places.some((pl) => pl.id === placeId)) {
    throw new Error('장소를 찾을 수 없습니다.');
  }
  await pool.query(`DELETE FROM places WHERE id = $1 AND plan_id = $2`, [
    placeId,
    planId,
  ]);
  return true;
};

// --- Day assignments ---

export const assignPlaceToDay = async (
  planId: string,
  userId: string,
  placeId: string,
  dayIndex: number,
  time?: string,
  memo?: string,
): Promise<DayAssignment | null> => {
  const plan = await requireWritablePlan(planId, userId);
  if (!plan) return null;

  if (!plan.places.some((pl) => pl.id === placeId)) {
    throw new Error('장소를 찾을 수 없습니다.');
  }

  const maxDay = getDayCount(plan.startDate, plan.endDate);
  if (dayIndex < 1 || dayIndex > maxDay) {
    throw new Error(`dayIndex는 1~${maxDay} 사이여야 합니다.`);
  }

  const sameDay = plan.dayAssignments.filter((d) => d.dayIndex === dayIndex);
  const created: DayAssignment = {
    id: generateId(),
    planId,
    placeId,
    dayIndex,
    order: sameDay.length,
    time,
    memo,
  };

  await pool.query(
    `INSERT INTO day_assignments
      (id, plan_id, place_id, day_index, sort_order, time, memo)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      created.id,
      created.planId,
      created.placeId,
      created.dayIndex,
      created.order,
      created.time ?? null,
      created.memo ?? null,
    ],
  );

  return created;
};

export const updateAssignment = async (
  planId: string,
  userId: string,
  assignmentId: string,
  updates: { dayIndex?: number; order?: number; time?: string; memo?: string },
): Promise<DayAssignment | null> => {
  const plan = await requireWritablePlan(planId, userId);
  if (!plan) return null;

  const current = plan.dayAssignments.find((d) => d.id === assignmentId);
  if (!current) throw new Error('배정을 찾을 수 없습니다.');

  const nextDay = updates.dayIndex ?? current.dayIndex;
  const maxDay = getDayCount(plan.startDate, plan.endDate);
  if (nextDay < 1 || nextDay > maxDay) {
    throw new Error(`dayIndex는 1~${maxDay} 사이여야 합니다.`);
  }

  let next: DayAssignment = {
    ...current,
    dayIndex: nextDay,
    order: updates.order ?? current.order,
    time: updates.time ?? current.time,
    memo: updates.memo ?? current.memo,
  };

  await withTx(async (client) => {
    await client.query(
      `UPDATE day_assignments
       SET day_index = $1, sort_order = $2, time = $3, memo = $4
       WHERE id = $5 AND plan_id = $6`,
      [
        next.dayIndex,
        next.order,
        next.time ?? null,
        next.memo ?? null,
        assignmentId,
        planId,
      ],
    );

    if (updates.order != null) {
      const { rows } = await client.query(
        `SELECT * FROM day_assignments
         WHERE plan_id = $1 AND day_index = $2
         ORDER BY sort_order`,
        [planId, nextDay],
      );
      const dayItems = rows.map((r) =>
        mapAssignment(r as Record<string, unknown>),
      );
      const moving = dayItems.find((d) => d.id === assignmentId);
      if (!moving) return;
      const others = dayItems.filter((d) => d.id !== assignmentId);
      others.splice(Math.min(updates.order!, others.length), 0, moving);
      for (let i = 0; i < others.length; i += 1) {
        await client.query(
          `UPDATE day_assignments SET sort_order = $1 WHERE id = $2`,
          [i, others[i].id],
        );
        if (others[i].id === assignmentId) {
          next = { ...others[i], dayIndex: nextDay, order: i };
        }
      }
    }
  });

  return next;
};

export const removeAssignment = async (
  planId: string,
  userId: string,
  assignmentId: string,
): Promise<boolean> => {
  const plan = await requireWritablePlan(planId, userId);
  if (!plan) return false;
  if (!plan.dayAssignments.some((d) => d.id === assignmentId)) {
    throw new Error('배정을 찾을 수 없습니다.');
  }
  await pool.query(
    `DELETE FROM day_assignments WHERE id = $1 AND plan_id = $2`,
    [assignmentId, planId],
  );
  return true;
};

export const reorderDay = async (
  planId: string,
  userId: string,
  dayIndex: number,
  orderedAssignmentIds: string[],
): Promise<DayAssignment[] | null> => {
  const plan = await requireWritablePlan(planId, userId);
  if (!plan) return null;

  await withTx(async (client) => {
    for (let order = 0; order < orderedAssignmentIds.length; order += 1) {
      await client.query(
        `UPDATE day_assignments
         SET day_index = $1, sort_order = $2
         WHERE id = $3 AND plan_id = $4`,
        [dayIndex, order, orderedAssignmentIds[order], planId],
      );
    }
  });

  const { rows } = await pool.query(
    `SELECT * FROM day_assignments
     WHERE plan_id = $1 AND day_index = $2
     ORDER BY sort_order`,
    [planId, dayIndex],
  );
  return rows.map((r) => mapAssignment(r as Record<string, unknown>));
};

// --- Invites ---

export const inviteByEmail = async (
  planId: string,
  ownerId: string,
  email: string,
  role: 'editor' | 'viewer',
): Promise<PlanMember | null> => {
  const plan = await loadPlan(planId);
  if (!plan || !canManage(plan, ownerId)) return null;

  const normalized = email.toLowerCase().trim();
  if (plan.members.some((m) => m.email === normalized && m.status === 'accepted')) {
    throw new Error('이미 참여 중인 멤버입니다.');
  }

  const existingUser = await findUserByEmail(normalized);
  const inviteToken = generateId();

  await pool.query(
    `DELETE FROM plan_members
     WHERE plan_id = $1 AND email = $2 AND status = 'pending'`,
    [planId, normalized],
  );

  const created: PlanMember = {
    id: generateId(),
    planId,
    userId: existingUser?.id ?? '',
    email: normalized,
    name: existingUser?.name ?? normalized,
    role,
    status: 'pending',
    inviteToken,
    createdAt: new Date().toISOString(),
  };

  await pool.query(
    `INSERT INTO plan_members
      (id, plan_id, user_id, email, name, role, status, invite_token, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      created.id,
      created.planId,
      created.userId,
      created.email,
      created.name,
      created.role,
      created.status,
      created.inviteToken,
      created.createdAt,
    ],
  );

  return created;
};

export const createInviteLink = async (
  planId: string,
  ownerId: string,
  role: 'editor' | 'viewer',
): Promise<PlanMember | null> => {
  const plan = await loadPlan(planId);
  if (!plan || !canManage(plan, ownerId)) return null;

  const created: PlanMember = {
    id: generateId(),
    planId,
    userId: '',
    email: '',
    name: '초대 링크',
    role,
    status: 'pending',
    inviteToken: generateId(),
    createdAt: new Date().toISOString(),
  };

  await pool.query(
    `INSERT INTO plan_members
      (id, plan_id, user_id, email, name, role, status, invite_token, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      created.id,
      created.planId,
      created.userId,
      created.email,
      created.name,
      created.role,
      created.status,
      created.inviteToken,
      created.createdAt,
    ],
  );

  return created;
};

export const getInviteByToken = async (
  token: string,
): Promise<{ plan: TravelPlan; member: PlanMember } | null> => {
  const { rows } = await pool.query(
    `SELECT * FROM plan_members WHERE invite_token = $1`,
    [token],
  );
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  const member = mapMember(row);
  const plan = await loadPlan(member.planId);
  if (!plan) return null;
  return { plan, member };
};

export const acceptInvite = async (
  token: string,
  userId: string,
): Promise<TravelPlan | null> => {
  const user = await findUserById(userId);
  if (!user) return null;

  const found = await getInviteByToken(token);
  if (!found) return null;

  const { plan, member } = found;

  if (member.status === 'accepted' && member.userId === userId) {
    return plan;
  }

  if (!member.email && member.name === '초대 링크') {
    if (canRead(plan, userId)) return plan;
    await pool.query(
      `INSERT INTO plan_members
        (id, plan_id, user_id, email, name, role, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,'accepted',$7)`,
      [
        generateId(),
        plan.id,
        userId,
        user.email,
        user.name,
        member.role,
        new Date().toISOString(),
      ],
    );
    return loadPlan(plan.id);
  }

  if (member.email && member.email !== user.email) {
    throw new Error('이 초대는 다른 이메일 계정용입니다.');
  }

  await pool.query(
    `UPDATE plan_members
     SET user_id = $1, email = $2, name = $3, status = 'accepted', invite_token = NULL
     WHERE id = $4`,
    [userId, user.email, user.name, member.id],
  );

  return loadPlan(plan.id);
};

export const updateMemberRole = async (
  planId: string,
  ownerId: string,
  memberId: string,
  role: 'editor' | 'viewer',
): Promise<PlanMember | null> => {
  const plan = await loadPlan(planId);
  if (!plan || !canManage(plan, ownerId)) return null;

  const member = plan.members.find((m) => m.id === memberId);
  if (!member || member.role === 'owner') return null;

  const { rows } = await pool.query(
    `UPDATE plan_members SET role = $1 WHERE id = $2 AND plan_id = $3 RETURNING *`,
    [role, memberId, planId],
  );
  return rows[0] ? mapMember(rows[0] as Record<string, unknown>) : null;
};

export const removeMember = async (
  planId: string,
  ownerId: string,
  memberId: string,
): Promise<boolean> => {
  const plan = await loadPlan(planId);
  if (!plan || !canManage(plan, ownerId)) return false;

  const member = plan.members.find((m) => m.id === memberId);
  if (!member || member.role === 'owner') return false;

  await pool.query(`DELETE FROM plan_members WHERE id = $1 AND plan_id = $2`, [
    memberId,
    planId,
  ]);
  return true;
};

// --- 2026-08-31 고객게시판 ---

export const maskAuthorName = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return '*';
  const first = [...trimmed][0];
  return first + '*'.repeat(Math.max(trimmed.length - 1, 1));
};

export const displayAuthorName = (
  author: User | undefined,
  fallback = '익명',
): { name: string; isAdmin: boolean } => {
  if (author && isAdminEmail(author.email)) {
    return { name: '관리자', isAdmin: true };
  }
  return {
    name: maskAuthorName(author?.name ?? fallback),
    isAdmin: false,
  };
};

const toPostPublic = (
  post: BoardPost,
  viewerId: string,
  author: User | undefined,
  likeCount: number,
  likedByMe: boolean,
  commentCount: number,
): BoardPostPublic => {
  const display = displayAuthorName(author);
  return {
    id: post.id,
    authorId: post.authorId,
    authorNameMasked: display.name,
    isAdmin: display.isAdmin,
    title: post.title,
    content: post.content,
    attachments: post.attachments ?? [],
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    likeCount,
    likedByMe,
    commentCount,
    isMine: post.authorId === viewerId,
  };
};

const toCommentPublic = (
  comment: BoardComment,
  viewerId: string,
  author: User | undefined,
): BoardCommentPublic => {
  const display = displayAuthorName(author);
  return {
    id: comment.id,
    postId: comment.postId,
    authorId: comment.authorId,
    authorNameMasked: display.name,
    isAdmin: display.isAdmin,
    content: comment.content,
    createdAt: comment.createdAt,
    isMine: comment.authorId === viewerId,
  };
};

export const listBoardPosts = async (
  viewerId: string,
): Promise<BoardPostPublic[]> => {
  const { rows } = await pool.query(
    `SELECT p.*,
            u.name AS author_name,
            u.email AS author_email,
            (SELECT COUNT(*)::int FROM board_likes l WHERE l.post_id = p.id) AS like_count,
            (SELECT COUNT(*)::int FROM board_comments c WHERE c.post_id = p.id) AS comment_count,
            EXISTS(
              SELECT 1 FROM board_likes l
              WHERE l.post_id = p.id AND l.user_id = $1
            ) AS liked_by_me
     FROM board_posts p
     LEFT JOIN users u ON u.id = p.author_id
     ORDER BY p.created_at DESC`,
    [viewerId],
  );

  return rows.map((row) => {
    const rec = row as Record<string, unknown>;
    const author: User | undefined = rec.author_email
      ? {
          id: String(rec.author_id),
          email: String(rec.author_email),
          name: String(rec.author_name ?? ''),
          passwordHash: '',
          createdAt: '',
        }
      : undefined;
    return toPostPublic(
      mapBoardPost(rec),
      viewerId,
      author,
      Number(rec.like_count ?? 0),
      Boolean(rec.liked_by_me),
      Number(rec.comment_count ?? 0),
    );
  });
};

export const getBoardPost = async (
  postId: string,
  viewerId: string,
): Promise<{ post: BoardPostPublic; comments: BoardCommentPublic[] } | null> => {
  const { rows } = await pool.query(
    `SELECT p.*,
            u.name AS author_name,
            u.email AS author_email,
            (SELECT COUNT(*)::int FROM board_likes l WHERE l.post_id = p.id) AS like_count,
            (SELECT COUNT(*)::int FROM board_comments c WHERE c.post_id = p.id) AS comment_count,
            EXISTS(
              SELECT 1 FROM board_likes l
              WHERE l.post_id = p.id AND l.user_id = $2
            ) AS liked_by_me
     FROM board_posts p
     LEFT JOIN users u ON u.id = p.author_id
     WHERE p.id = $1`,
    [postId, viewerId],
  );
  const rec = rows[0] as Record<string, unknown> | undefined;
  if (!rec) return null;

  const author: User | undefined = rec.author_email
    ? {
        id: String(rec.author_id),
        email: String(rec.author_email),
        name: String(rec.author_name ?? ''),
        passwordHash: '',
        createdAt: '',
      }
    : undefined;

  const commentRes = await pool.query(
    `SELECT c.*, u.name AS author_name, u.email AS author_email
     FROM board_comments c
     LEFT JOIN users u ON u.id = c.author_id
     WHERE c.post_id = $1
     ORDER BY c.created_at ASC`,
    [postId],
  );

  const comments = commentRes.rows.map((row) => {
    const c = row as Record<string, unknown>;
    const cAuthor: User | undefined = c.author_email
      ? {
          id: String(c.author_id),
          email: String(c.author_email),
          name: String(c.author_name ?? ''),
          passwordHash: '',
          createdAt: '',
        }
      : undefined;
    return toCommentPublic(
      {
        id: String(c.id),
        postId: String(c.post_id),
        authorId: String(c.author_id),
        content: String(c.content),
        createdAt: asIso(c.created_at),
      },
      viewerId,
      cAuthor,
    );
  });

  return {
    post: toPostPublic(
      mapBoardPost(rec),
      viewerId,
      author,
      Number(rec.like_count ?? 0),
      Boolean(rec.liked_by_me),
      Number(rec.comment_count ?? 0),
    ),
    comments,
  };
};

export const createBoardPost = async (
  authorId: string,
  title: string,
  content: string,
  attachments: BoardAttachment[] = [],
): Promise<BoardPostPublic> => {
  const now = new Date().toISOString();
  const post: BoardPost = {
    id: generateId(),
    authorId,
    title: title.trim(),
    content: content.trim(),
    attachments,
    createdAt: now,
    updatedAt: now,
  };

  await pool.query(
    `INSERT INTO board_posts
      (id, author_id, title, content, attachments, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      post.id,
      post.authorId,
      post.title,
      post.content,
      JSON.stringify(post.attachments),
      post.createdAt,
      post.updatedAt,
    ],
  );

  const detail = await getBoardPost(post.id, authorId);
  if (!detail) throw new Error('게시글 생성에 실패했습니다.');
  return detail.post;
};

export const updateBoardPost = async (
  postId: string,
  authorId: string,
  data: {
    title?: string;
    content?: string;
    attachments?: BoardAttachment[];
  },
): Promise<BoardPostPublic | null> => {
  const existing = await getBoardPostRaw(postId);
  if (!existing || existing.authorId !== authorId) return null;

  const title = data.title != null ? data.title.trim() : existing.title;
  const content = data.content != null ? data.content.trim() : existing.content;
  const attachments = data.attachments ?? existing.attachments;
  const updatedAt = new Date().toISOString();

  await pool.query(
    `UPDATE board_posts
     SET title = $1, content = $2, attachments = $3, updated_at = $4
     WHERE id = $5`,
    [title, content, JSON.stringify(attachments), updatedAt, postId],
  );

  const detail = await getBoardPost(postId, authorId);
  return detail?.post ?? null;
};

export const deleteBoardPost = async (
  postId: string,
  authorId: string,
): Promise<boolean> => {
  const existing = await getBoardPostRaw(postId);
  if (!existing || existing.authorId !== authorId) return false;
  await pool.query(`DELETE FROM board_posts WHERE id = $1`, [postId]);
  return true;
};

export const addBoardComment = async (
  postId: string,
  authorId: string,
  content: string,
): Promise<BoardCommentPublic | null> => {
  const existing = await getBoardPostRaw(postId);
  if (!existing) return null;

  const id = generateId();
  const createdAt = new Date().toISOString();
  await pool.query(
    `INSERT INTO board_comments (id, post_id, author_id, content, created_at)
     VALUES ($1,$2,$3,$4,$5)`,
    [id, postId, authorId, content.trim(), createdAt],
  );

  const author = await findUserById(authorId);
  return toCommentPublic(
    { id, postId, authorId, content: content.trim(), createdAt },
    authorId,
    author ?? undefined,
  );
};

export const deleteBoardComment = async (
  commentId: string,
  authorId: string,
): Promise<boolean> => {
  const result = await pool.query(
    `DELETE FROM board_comments WHERE id = $1 AND author_id = $2`,
    [commentId, authorId],
  );
  return (result.rowCount ?? 0) > 0;
};

export const toggleBoardLike = async (
  postId: string,
  userId: string,
): Promise<{ liked: boolean; likeCount: number } | null> => {
  const existing = await getBoardPostRaw(postId);
  if (!existing) return null;

  const found = await pool.query(
    `SELECT 1 FROM board_likes WHERE post_id = $1 AND user_id = $2`,
    [postId, userId],
  );

  if (found.rowCount) {
    await pool.query(
      `DELETE FROM board_likes WHERE post_id = $1 AND user_id = $2`,
      [postId, userId],
    );
  } else {
    await pool.query(
      `INSERT INTO board_likes (post_id, user_id, created_at) VALUES ($1,$2,$3)`,
      [postId, userId, new Date().toISOString()],
    );
  }

  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS n FROM board_likes WHERE post_id = $1`,
    [postId],
  );
  return {
    liked: !found.rowCount,
    likeCount: Number(countRes.rows[0]?.n ?? 0),
  };
};

export const getBoardPostRaw = async (
  postId: string,
): Promise<BoardPost | null> => {
  const { rows } = await pool.query(`SELECT * FROM board_posts WHERE id = $1`, [
    postId,
  ]);
  return rows[0] ? mapBoardPost(rows[0] as Record<string, unknown>) : null;
};

// --- 2026-08-31 공지사항 ---

const toNoticePublic = (
  post: NoticePost,
  viewerId: string | undefined,
  author: User | undefined,
): NoticePostPublic => {
  const display = displayAuthorName(author);
  return {
    id: post.id,
    authorId: post.authorId,
    authorNameMasked: display.name,
    isAdmin: display.isAdmin,
    title: post.title,
    content: post.content,
    attachments: post.attachments ?? [],
    viewCount: post.viewCount ?? 0,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    isMine: !!viewerId && post.authorId === viewerId,
  };
};

const loadAuthor = async (authorId: string): Promise<User | undefined> =>
  (await findUserById(authorId)) ?? undefined;

export const listNoticePosts = async (
  viewerId?: string,
): Promise<NoticePostPublic[]> => {
  const { rows } = await pool.query(
    `SELECT n.*, u.name AS author_name, u.email AS author_email
     FROM notice_posts n
     LEFT JOIN users u ON u.id = n.author_id
     ORDER BY n.created_at DESC`,
  );
  return rows.map((row) => {
    const rec = row as Record<string, unknown>;
    const author: User | undefined = rec.author_email
      ? {
          id: String(rec.author_id),
          email: String(rec.author_email),
          name: String(rec.author_name ?? ''),
          passwordHash: '',
          createdAt: '',
        }
      : undefined;
    return toNoticePublic(mapNoticePost(rec), viewerId, author);
  });
};

export const getNoticePost = async (
  postId: string,
  viewerId?: string,
  incrementView = true,
): Promise<NoticePostPublic | null> => {
  if (incrementView) {
    await pool.query(
      `UPDATE notice_posts SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1`,
      [postId],
    );
  }
  const { rows } = await pool.query(
    `SELECT n.*, u.name AS author_name, u.email AS author_email
     FROM notice_posts n
     LEFT JOIN users u ON u.id = n.author_id
     WHERE n.id = $1`,
    [postId],
  );
  const rec = rows[0] as Record<string, unknown> | undefined;
  if (!rec) return null;
  const author: User | undefined = rec.author_email
    ? {
        id: String(rec.author_id),
        email: String(rec.author_email),
        name: String(rec.author_name ?? ''),
        passwordHash: '',
        createdAt: '',
      }
    : undefined;
  return toNoticePublic(mapNoticePost(rec), viewerId, author);
};

export const createNoticePost = async (
  authorId: string,
  title: string,
  content: string,
  attachments: BoardAttachment[] = [],
): Promise<NoticePostPublic | null> => {
  if (!(await isAdminUserId(authorId))) return null;
  const now = new Date().toISOString();
  const post: NoticePost = {
    id: generateId(),
    authorId,
    title: title.trim(),
    content: content.trim(),
    attachments,
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  await pool.query(
    `INSERT INTO notice_posts
      (id, author_id, title, content, attachments, view_count, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,0,$6,$7)`,
    [
      post.id,
      post.authorId,
      post.title,
      post.content,
      JSON.stringify(post.attachments),
      post.createdAt,
      post.updatedAt,
    ],
  );
  const author = await loadAuthor(authorId);
  return toNoticePublic(post, authorId, author);
};

export const updateNoticePost = async (
  postId: string,
  authorId: string,
  data: {
    title?: string;
    content?: string;
    attachments?: BoardAttachment[];
  },
): Promise<NoticePostPublic | null> => {
  if (!(await isAdminUserId(authorId))) return null;
  const existing = await getNoticePostRaw(postId);
  if (!existing) return null;

  const title = data.title != null ? data.title.trim() : existing.title;
  const content = data.content != null ? data.content.trim() : existing.content;
  const attachments = data.attachments ?? existing.attachments;
  const updatedAt = new Date().toISOString();

  await pool.query(
    `UPDATE notice_posts
     SET title = $1, content = $2, attachments = $3, updated_at = $4
     WHERE id = $5`,
    [title, content, JSON.stringify(attachments), updatedAt, postId],
  );

  return getNoticePost(postId, authorId, false);
};

export const deleteNoticePost = async (
  postId: string,
  authorId: string,
): Promise<boolean> => {
  if (!(await isAdminUserId(authorId))) return false;
  const result = await pool.query(`DELETE FROM notice_posts WHERE id = $1`, [
    postId,
  ]);
  return (result.rowCount ?? 0) > 0;
};

export const getNoticePostRaw = async (
  postId: string,
): Promise<NoticePost | null> => {
  const { rows } = await pool.query(`SELECT * FROM notice_posts WHERE id = $1`, [
    postId,
  ]);
  return rows[0] ? mapNoticePost(rows[0] as Record<string, unknown>) : null;
};

// --- 2026-08-31 배포게시판 ---

const toReleasePublic = (
  post: ReleasePost,
  viewerId: string | undefined,
  author: User | undefined,
): ReleasePostPublic => {
  const display = displayAuthorName(author);
  return {
    id: post.id,
    authorId: post.authorId,
    authorNameMasked: display.name,
    isAdmin: display.isAdmin,
    title: post.title,
    content: post.content,
    status: post.status,
    releasedAt: post.releasedAt,
    attachments: post.attachments ?? [],
    viewCount: post.viewCount ?? 0,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    isMine: !!viewerId && post.authorId === viewerId,
  };
};

export const listReleasePosts = async (
  viewerId?: string,
): Promise<ReleasePostPublic[]> => {
  const { rows } = await pool.query(
    `SELECT r.*, u.name AS author_name, u.email AS author_email
     FROM release_posts r
     LEFT JOIN users u ON u.id = r.author_id
     ORDER BY r.released_at DESC`,
  );
  return rows.map((row) => {
    const rec = row as Record<string, unknown>;
    const author: User | undefined = rec.author_email
      ? {
          id: String(rec.author_id),
          email: String(rec.author_email),
          name: String(rec.author_name ?? ''),
          passwordHash: '',
          createdAt: '',
        }
      : undefined;
    return toReleasePublic(mapReleasePost(rec), viewerId, author);
  });
};

export const getReleasePost = async (
  postId: string,
  viewerId?: string,
  incrementView = true,
): Promise<ReleasePostPublic | null> => {
  if (incrementView) {
    await pool.query(
      `UPDATE release_posts SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1`,
      [postId],
    );
  }
  const { rows } = await pool.query(
    `SELECT r.*, u.name AS author_name, u.email AS author_email
     FROM release_posts r
     LEFT JOIN users u ON u.id = r.author_id
     WHERE r.id = $1`,
    [postId],
  );
  const rec = rows[0] as Record<string, unknown> | undefined;
  if (!rec) return null;
  const author: User | undefined = rec.author_email
    ? {
        id: String(rec.author_id),
        email: String(rec.author_email),
        name: String(rec.author_name ?? ''),
        passwordHash: '',
        createdAt: '',
      }
    : undefined;
  return toReleasePublic(mapReleasePost(rec), viewerId, author);
};

export const createReleasePost = async (
  authorId: string,
  title: string,
  content: string,
  status: DeployStatus,
  releasedAt: string,
  attachments: BoardAttachment[] = [],
): Promise<ReleasePostPublic | null> => {
  if (!(await isAdminUserId(authorId))) return null;
  const now = new Date().toISOString();
  const post: ReleasePost = {
    id: generateId(),
    authorId,
    title: title.trim(),
    content: content.trim(),
    status,
    releasedAt,
    attachments,
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  await pool.query(
    `INSERT INTO release_posts
      (id, author_id, title, content, status, released_at, attachments, view_count, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,0,$8,$9)`,
    [
      post.id,
      post.authorId,
      post.title,
      post.content,
      post.status,
      post.releasedAt,
      JSON.stringify(post.attachments),
      post.createdAt,
      post.updatedAt,
    ],
  );
  const author = await loadAuthor(authorId);
  return toReleasePublic(post, authorId, author);
};

export const updateReleasePost = async (
  postId: string,
  authorId: string,
  data: {
    title?: string;
    content?: string;
    status?: DeployStatus;
    releasedAt?: string;
    attachments?: BoardAttachment[];
  },
): Promise<ReleasePostPublic | null> => {
  if (!(await isAdminUserId(authorId))) return null;
  const existing = await getReleasePostRaw(postId);
  if (!existing) return null;

  const title = data.title != null ? data.title.trim() : existing.title;
  const content = data.content != null ? data.content.trim() : existing.content;
  const status = data.status ?? existing.status;
  const releasedAt = data.releasedAt ?? existing.releasedAt;
  const attachments = data.attachments ?? existing.attachments;
  const updatedAt = new Date().toISOString();

  await pool.query(
    `UPDATE release_posts
     SET title = $1, content = $2, status = $3, released_at = $4,
         attachments = $5, updated_at = $6
     WHERE id = $7`,
    [
      title,
      content,
      status,
      releasedAt,
      JSON.stringify(attachments),
      updatedAt,
      postId,
    ],
  );

  return getReleasePost(postId, authorId, false);
};

export const deleteReleasePost = async (
  postId: string,
  authorId: string,
): Promise<boolean> => {
  if (!(await isAdminUserId(authorId))) return false;
  const result = await pool.query(`DELETE FROM release_posts WHERE id = $1`, [
    postId,
  ]);
  return (result.rowCount ?? 0) > 0;
};

export const getReleasePostRaw = async (
  postId: string,
): Promise<ReleasePost | null> => {
  const { rows } = await pool.query(
    `SELECT * FROM release_posts WHERE id = $1`,
    [postId],
  );
  return rows[0] ? mapReleasePost(rows[0] as Record<string, unknown>) : null;
};
