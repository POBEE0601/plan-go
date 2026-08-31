// 2026-08-31 Place·Day·Member 지원 DB 레이어
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import type {
  BoardAttachment,
  BoardComment,
  BoardCommentPublic,
  BoardLike,
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../data');
const dbPath = path.join(dataDir, 'db.json');

interface DbData {
  users: User[];
  travelPlans: TravelPlan[];
  // 2026-08-31 고객게시판
  boardPosts: BoardPost[];
  boardComments: BoardComment[];
  boardLikes: BoardLike[];
  // 2026-08-31 공지사항
  noticePosts: NoticePost[];
  // 2026-08-31 배포게시판
  releasePosts: ReleasePost[];
}

const defaultData = (): DbData => ({
  users: [],
  travelPlans: [],
  boardPosts: [],
  boardComments: [],
  boardLikes: [],
  noticePosts: [],
  releasePosts: [],
});

const normalizePlan = (plan: TravelPlan): TravelPlan => {
  const places = plan.places ?? [];
  const dayAssignments = plan.dayAssignments ?? [];
  let members = plan.members ?? [];

  // 소유자가 members에 없으면 추가
  if (!members.some((m) => m.role === 'owner' && m.userId === plan.userId)) {
    members = [
      {
        id: `owner-${plan.id}`,
        planId: plan.id,
        userId: plan.userId,
        email: '',
        name: 'Owner',
        role: 'owner',
        status: 'accepted',
        createdAt: new Date().toISOString(),
      },
      ...members.filter((m) => m.role !== 'owner' || m.userId !== plan.userId),
    ];
  }

  // 레거시 schedules → places 마이그레이션
  if ((!places.length) && plan.schedules?.length) {
    const migratedPlaces: Place[] = [];
    const migratedDays: DayAssignment[] = [];
    const dayCount = getDayCount(plan.startDate, plan.endDate);

    plan.schedules.forEach((s, idx) => {
      const placeId = `migrated-${s.id}`;
      migratedPlaces.push({
        id: placeId,
        planId: plan.id,
        name: s.title,
        address: s.location,
        lat: s.lat,
        lng: s.lng,
        category: 'other',
        memo: s.memo,
      });

      const start = new Date(`${plan.startDate}T00:00:00`);
      const date = new Date(`${s.date}T00:00:00`);
      let dayIndex =
        Math.round((date.getTime() - start.getTime()) / 86400000) + 1;
      if (Number.isNaN(dayIndex) || dayIndex < 1) dayIndex = 1;
      if (dayIndex > dayCount) dayIndex = dayCount;

      migratedDays.push({
        id: `day-${s.id}`,
        planId: plan.id,
        placeId,
        dayIndex,
        order: idx,
        time: s.time,
        memo: s.memo,
      });
    });

    return {
      ...plan,
      places: migratedPlaces,
      dayAssignments: migratedDays,
      members,
      schedules: undefined,
    };
  }

  return { ...plan, places, dayAssignments, members, schedules: undefined };
};

const ensureDataFile = (): void => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(defaultData(), null, 2), 'utf-8');
  }
};

const readDb = (): DbData => {
  ensureDataFile();
  const raw = fs.readFileSync(dbPath, 'utf-8');
  const data = JSON.parse(raw) as DbData;
  return {
    users: data.users ?? [],
    travelPlans: (data.travelPlans ?? []).map(normalizePlan),
    boardPosts: data.boardPosts ?? [],
    boardComments: data.boardComments ?? [],
    boardLikes: data.boardLikes ?? [],
    noticePosts: data.noticePosts ?? [],
    releasePosts: data.releasePosts ?? [],
  };
};

const writeDb = (data: DbData): void => {
  ensureDataFile();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
};

export const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const toPublicUser = (user: User): UserPublic => ({
  id: user.id,
  email: user.email,
  name: user.name,
  isAdmin: isAdminEmail(user.email),
});

export const isAdminUserId = (userId: string): boolean => {
  const user = findUserById(userId);
  return isAdminEmail(user?.email);
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

const enrichPlan = (plan: TravelPlan, users: User[]): TravelPlan => ({
  ...normalizePlan(plan),
  members: normalizePlan(plan).members.map((m) => enrichMember(m, users)),
});

// --- User ---

export const findUserByEmail = (email: string): User | null => {
  const db = readDb();
  return db.users.find((u) => u.email === email.toLowerCase()) ?? null;
};

export const findUserById = (id: string): User | null => {
  const db = readDb();
  return db.users.find((u) => u.id === id) ?? null;
};

export const createUser = async (
  email: string,
  password: string,
  name: string,
): Promise<UserPublic> => {
  const db = readDb();
  const normalizedEmail = email.toLowerCase().trim();

  if (db.users.some((u) => u.email === normalizedEmail)) {
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

  db.users.push(user);
  writeDb(db);
  return toPublicUser(user);
};

export const validateUser = async (
  email: string,
  password: string,
): Promise<UserPublic | null> => {
  const user = findUserByEmail(email);
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? toPublicUser(user) : null;
};

export const getUserPublic = (id: string): UserPublic | null => {
  const user = findUserById(id);
  return user ? toPublicUser(user) : null;
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

// --- Travel Plan ---

export const getAccessiblePlans = (userId: string): TravelPlan[] => {
  const db = readDb();
  return db.travelPlans
    .filter((p) => canRead(p, userId))
    .map((p) => enrichPlan(p, db.users))
    .sort((a, b) => b.id.localeCompare(a.id));
};

export const getTravelPlanById = (
  id: string,
  userId?: string,
): TravelPlan | null => {
  const db = readDb();
  const plan = db.travelPlans.find((p) => p.id === id);
  if (!plan) return null;
  if (userId && !canRead(plan, userId)) return null;
  return enrichPlan(plan, db.users);
};

export const createTravelPlan = (
  userId: string,
  title: string,
  startDate: string,
  endDate: string,
  region?: { regionName: string; regionLat: number; regionLng: number },
): TravelPlan => {
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  const id = generateId();

  const newPlan: TravelPlan = {
    id,
    userId,
    title,
    startDate,
    endDate,
    regionName: region?.regionName,
    regionLat: region?.regionLat,
    regionLng: region?.regionLng,
    places: [],
    dayAssignments: [],
    members: [
      {
        id: generateId(),
        planId: id,
        userId,
        email: user?.email ?? '',
        name: user?.name ?? 'Owner',
        role: 'owner',
        status: 'accepted',
        createdAt: new Date().toISOString(),
      },
    ],
  };

  db.travelPlans.unshift(newPlan);
  writeDb(db);
  return enrichPlan(newPlan, db.users);
};

export const deleteTravelPlan = (id: string, userId: string): boolean => {
  const db = readDb();
  const index = db.travelPlans.findIndex((p) => p.id === id);
  if (index === -1) return false;
  if (!canManage(db.travelPlans[index], userId)) return false;
  db.travelPlans.splice(index, 1);
  writeDb(db);
  return true;
};

const updatePlan = (
  planId: string,
  userId: string,
  mutator: (plan: TravelPlan) => void,
  writeRequired = true,
): TravelPlan | null => {
  const db = readDb();
  const plan = db.travelPlans.find((p) => p.id === planId);
  if (!plan) return null;
  if (writeRequired && !canWrite(plan, userId)) return null;
  if (!writeRequired && !canRead(plan, userId)) return null;

  mutator(plan);
  writeDb(db);
  return enrichPlan(plan, db.users);
};

// --- Places ---

export const addPlace = (
  planId: string,
  userId: string,
  body: CreatePlaceBody,
): Place | null => {
  let created: Place | null = null;

  const plan = updatePlan(planId, userId, (p) => {
    if (
      body.googlePlaceId &&
      p.places.some((pl) => pl.googlePlaceId === body.googlePlaceId)
    ) {
      throw new Error('이미 등록된 장소입니다.');
    }

    created = {
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
    p.places.push(created);
  });

  if (!plan) return null;
  return created;
};

export const updatePlace = (
  planId: string,
  userId: string,
  placeId: string,
  updates: Partial<CreatePlaceBody>,
): Place | null => {
  let updated: Place | null = null;
  const plan = updatePlan(planId, userId, (p) => {
    const idx = p.places.findIndex((pl) => pl.id === placeId);
    if (idx === -1) throw new Error('장소를 찾을 수 없습니다.');
    p.places[idx] = { ...p.places[idx], ...updates, id: placeId, planId };
    updated = p.places[idx];
  });
  if (!plan) return null;
  return updated;
};

export const deletePlace = (
  planId: string,
  userId: string,
  placeId: string,
): boolean => {
  const plan = updatePlan(planId, userId, (p) => {
    const before = p.places.length;
    p.places = p.places.filter((pl) => pl.id !== placeId);
    p.dayAssignments = p.dayAssignments.filter((d) => d.placeId !== placeId);
    if (p.places.length === before) throw new Error('장소를 찾을 수 없습니다.');
  });
  return plan != null;
};

// --- Day assignments ---

export const assignPlaceToDay = (
  planId: string,
  userId: string,
  placeId: string,
  dayIndex: number,
  time?: string,
  memo?: string,
): DayAssignment | null => {
  let created: DayAssignment | null = null;

  const plan = updatePlan(planId, userId, (p) => {
    const place = p.places.find((pl) => pl.id === placeId);
    if (!place) throw new Error('장소를 찾을 수 없습니다.');

    const maxDay = getDayCount(p.startDate, p.endDate);
    if (dayIndex < 1 || dayIndex > maxDay) {
      throw new Error(`dayIndex는 1~${maxDay} 사이여야 합니다.`);
    }

    const sameDay = p.dayAssignments.filter((d) => d.dayIndex === dayIndex);
    created = {
      id: generateId(),
      planId,
      placeId,
      dayIndex,
      order: sameDay.length,
      time,
      memo,
    };
    p.dayAssignments.push(created);
  });

  if (!plan) return null;
  return created;
};

export const updateAssignment = (
  planId: string,
  userId: string,
  assignmentId: string,
  updates: { dayIndex?: number; order?: number; time?: string; memo?: string },
): DayAssignment | null => {
  let updated: DayAssignment | null = null;

  const plan = updatePlan(planId, userId, (p) => {
    const idx = p.dayAssignments.findIndex((d) => d.id === assignmentId);
    if (idx === -1) throw new Error('배정을 찾을 수 없습니다.');

    const current = p.dayAssignments[idx];
    const nextDay = updates.dayIndex ?? current.dayIndex;
    const maxDay = getDayCount(p.startDate, p.endDate);
    if (nextDay < 1 || nextDay > maxDay) {
      throw new Error(`dayIndex는 1~${maxDay} 사이여야 합니다.`);
    }

    p.dayAssignments[idx] = {
      ...current,
      dayIndex: nextDay,
      order: updates.order ?? current.order,
      time: updates.time ?? current.time,
      memo: updates.memo ?? current.memo,
    };
    updated = p.dayAssignments[idx];

    // 같은 Day 내 order 재정렬
    const dayItems = p.dayAssignments
      .filter((d) => d.dayIndex === nextDay)
      .sort((a, b) => a.order - b.order);

    if (updates.order != null) {
      const moving = dayItems.find((d) => d.id === assignmentId)!;
      const others = dayItems.filter((d) => d.id !== assignmentId);
      others.splice(Math.min(updates.order, others.length), 0, moving);
      others.forEach((item, i) => {
        const target = p.dayAssignments.find((d) => d.id === item.id)!;
        target.order = i;
        if (item.id === assignmentId) updated = target;
      });
    }
  });

  if (!plan) return null;
  return updated;
};

export const removeAssignment = (
  planId: string,
  userId: string,
  assignmentId: string,
): boolean => {
  const plan = updatePlan(planId, userId, (p) => {
    const before = p.dayAssignments.length;
    p.dayAssignments = p.dayAssignments.filter((d) => d.id !== assignmentId);
    if (p.dayAssignments.length === before) {
      throw new Error('배정을 찾을 수 없습니다.');
    }
  });
  return plan != null;
};

export const reorderDay = (
  planId: string,
  userId: string,
  dayIndex: number,
  orderedAssignmentIds: string[],
): DayAssignment[] | null => {
  let result: DayAssignment[] | null = null;

  const plan = updatePlan(planId, userId, (p) => {
    orderedAssignmentIds.forEach((id, order) => {
      const item = p.dayAssignments.find((d) => d.id === id);
      if (item) {
        item.dayIndex = dayIndex;
        item.order = order;
      }
    });
    result = p.dayAssignments
      .filter((d) => d.dayIndex === dayIndex)
      .sort((a, b) => a.order - b.order);
  });

  if (!plan) return null;
  return result;
};

// --- Invites ---

export const inviteByEmail = (
  planId: string,
  ownerId: string,
  email: string,
  role: 'editor' | 'viewer',
): PlanMember | null => {
  let created: PlanMember | null = null;
  const normalized = email.toLowerCase().trim();

  const db = readDb();
  const plan = db.travelPlans.find((p) => p.id === planId);
  if (!plan || !canManage(plan, ownerId)) return null;

  if (plan.members.some((m) => m.email === normalized && m.status === 'accepted')) {
    throw new Error('이미 참여 중인 멤버입니다.');
  }

  const existingUser = db.users.find((u) => u.email === normalized);
  const inviteToken = generateId();

  // pending 중복 제거
  plan.members = plan.members.filter(
    (m) => !(m.email === normalized && m.status === 'pending'),
  );

  created = {
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
  plan.members.push(created);
  writeDb(db);
  return created;
};

export const createInviteLink = (
  planId: string,
  ownerId: string,
  role: 'editor' | 'viewer',
): PlanMember | null => {
  let created: PlanMember | null = null;

  const db = readDb();
  const plan = db.travelPlans.find((p) => p.id === planId);
  if (!plan || !canManage(plan, ownerId)) return null;

  created = {
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
  plan.members.push(created);
  writeDb(db);
  return created;
};

export const getInviteByToken = (token: string): {
  plan: TravelPlan;
  member: PlanMember;
} | null => {
  const db = readDb();
  for (const plan of db.travelPlans) {
    const member = plan.members.find((m) => m.inviteToken === token);
    if (member) {
      return { plan: enrichPlan(plan, db.users), member };
    }
  }
  return null;
};

export const acceptInvite = (
  token: string,
  userId: string,
): TravelPlan | null => {
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return null;

  for (const plan of db.travelPlans) {
    const member = plan.members.find((m) => m.inviteToken === token);
    if (!member) continue;

    if (member.status === 'accepted' && member.userId === userId) {
      return enrichPlan(plan, db.users);
    }

    // 링크 초대: 동일 토큰으로 새 멤버 생성 (링크는 재사용 가능)
    if (!member.email && member.name === '초대 링크') {
      if (canRead(plan, userId)) {
        return enrichPlan(plan, db.users);
      }
      plan.members.push({
        id: generateId(),
        planId: plan.id,
        userId,
        email: user.email,
        name: user.name,
        role: member.role,
        status: 'accepted',
        createdAt: new Date().toISOString(),
      });
      writeDb(db);
      return enrichPlan(plan, db.users);
    }

    // 이메일 초대
    if (member.email && member.email !== user.email) {
      throw new Error('이 초대는 다른 이메일 계정용입니다.');
    }

    member.userId = userId;
    member.email = user.email;
    member.name = user.name;
    member.status = 'accepted';
    member.inviteToken = undefined;
    writeDb(db);
    return enrichPlan(plan, db.users);
  }

  return null;
};

export const updateMemberRole = (
  planId: string,
  ownerId: string,
  memberId: string,
  role: 'editor' | 'viewer',
): PlanMember | null => {
  let updated: PlanMember | null = null;
  const db = readDb();
  const plan = db.travelPlans.find((p) => p.id === planId);
  if (!plan || !canManage(plan, ownerId)) return null;

  const member = plan.members.find((m) => m.id === memberId);
  if (!member || member.role === 'owner') return null;

  member.role = role;
  updated = member;
  writeDb(db);
  return updated;
};

export const removeMember = (
  planId: string,
  ownerId: string,
  memberId: string,
): boolean => {
  const db = readDb();
  const plan = db.travelPlans.find((p) => p.id === planId);
  if (!plan || !canManage(plan, ownerId)) return false;

  const member = plan.members.find((m) => m.id === memberId);
  if (!member || member.role === 'owner') return false;

  plan.members = plan.members.filter((m) => m.id !== memberId);
  writeDb(db);
  return true;
};

// --- 2026-08-31 고객게시판 ---

/** 작성자명: 첫 글자만 보이고 나머지는 * */
export const maskAuthorName = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return '*';
  const first = [...trimmed][0];
  return first + '*'.repeat(Math.max(trimmed.length - 1, 1));
};

/** 관리자면 '관리자', 아니면 마스킹 이름 */
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
  users: User[],
  comments: BoardComment[],
  likes: BoardLike[],
): BoardPostPublic => {
  const author = users.find((u) => u.id === post.authorId);
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
    likeCount: likes.filter((l) => l.postId === post.id).length,
    likedByMe: likes.some((l) => l.postId === post.id && l.userId === viewerId),
    commentCount: comments.filter((c) => c.postId === post.id).length,
    isMine: post.authorId === viewerId,
  };
};

const toCommentPublic = (
  comment: BoardComment,
  viewerId: string,
  users: User[],
): BoardCommentPublic => {
  const author = users.find((u) => u.id === comment.authorId);
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

export const listBoardPosts = (viewerId: string): BoardPostPublic[] => {
  const db = readDb();
  return [...db.boardPosts]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .map((p) =>
      toPostPublic(p, viewerId, db.users, db.boardComments, db.boardLikes),
    );
};

export const getBoardPost = (
  postId: string,
  viewerId: string,
): {
  post: BoardPostPublic;
  comments: BoardCommentPublic[];
} | null => {
  const db = readDb();
  const post = db.boardPosts.find((p) => p.id === postId);
  if (!post) return null;

  const comments = db.boardComments
    .filter((c) => c.postId === postId)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    .map((c) => toCommentPublic(c, viewerId, db.users));

  return {
    post: toPostPublic(
      post,
      viewerId,
      db.users,
      db.boardComments,
      db.boardLikes,
    ),
    comments,
  };
};

export const createBoardPost = (
  authorId: string,
  title: string,
  content: string,
  attachments: BoardAttachment[] = [],
): BoardPostPublic => {
  const db = readDb();
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
  db.boardPosts.push(post);
  writeDb(db);
  return toPostPublic(
    post,
    authorId,
    db.users,
    db.boardComments,
    db.boardLikes,
  );
};

export const updateBoardPost = (
  postId: string,
  authorId: string,
  data: {
    title?: string;
    content?: string;
    attachments?: BoardAttachment[];
  },
): BoardPostPublic | null => {
  const db = readDb();
  const post = db.boardPosts.find((p) => p.id === postId);
  if (!post || post.authorId !== authorId) return null;

  if (data.title != null) post.title = data.title.trim();
  if (data.content != null) post.content = data.content.trim();
  if (data.attachments != null) post.attachments = data.attachments;
  post.updatedAt = new Date().toISOString();
  writeDb(db);

  return toPostPublic(
    post,
    authorId,
    db.users,
    db.boardComments,
    db.boardLikes,
  );
};

export const deleteBoardPost = (postId: string, authorId: string): boolean => {
  const db = readDb();
  const post = db.boardPosts.find((p) => p.id === postId);
  if (!post || post.authorId !== authorId) return false;

  db.boardPosts = db.boardPosts.filter((p) => p.id !== postId);
  db.boardComments = db.boardComments.filter((c) => c.postId !== postId);
  db.boardLikes = db.boardLikes.filter((l) => l.postId !== postId);
  writeDb(db);
  return true;
};

export const addBoardComment = (
  postId: string,
  authorId: string,
  content: string,
): BoardCommentPublic | null => {
  const db = readDb();
  if (!db.boardPosts.some((p) => p.id === postId)) return null;

  const comment: BoardComment = {
    id: generateId(),
    postId,
    authorId,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };
  db.boardComments.push(comment);
  writeDb(db);
  return toCommentPublic(comment, authorId, db.users);
};

export const deleteBoardComment = (
  commentId: string,
  authorId: string,
): boolean => {
  const db = readDb();
  const comment = db.boardComments.find((c) => c.id === commentId);
  if (!comment || comment.authorId !== authorId) return false;
  db.boardComments = db.boardComments.filter((c) => c.id !== commentId);
  writeDb(db);
  return true;
};

export const toggleBoardLike = (
  postId: string,
  userId: string,
): { liked: boolean; likeCount: number } | null => {
  const db = readDb();
  if (!db.boardPosts.some((p) => p.id === postId)) return null;

  const existing = db.boardLikes.find(
    (l) => l.postId === postId && l.userId === userId,
  );
  if (existing) {
    db.boardLikes = db.boardLikes.filter(
      (l) => !(l.postId === postId && l.userId === userId),
    );
  } else {
    db.boardLikes.push({
      postId,
      userId,
      createdAt: new Date().toISOString(),
    });
  }
  writeDb(db);

  return {
    liked: !existing,
    likeCount: db.boardLikes.filter((l) => l.postId === postId).length,
  };
};

export const getBoardPostRaw = (postId: string): BoardPost | null => {
  const db = readDb();
  return db.boardPosts.find((p) => p.id === postId) ?? null;
};

// --- 2026-08-31 공지사항 ---

const toNoticePublic = (
  post: NoticePost,
  viewerId: string | undefined,
  users: User[],
): NoticePostPublic => {
  const author = users.find((u) => u.id === post.authorId);
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

export const listNoticePosts = (
  viewerId?: string,
): NoticePostPublic[] => {
  const db = readDb();
  return [...db.noticePosts]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .map((p) => toNoticePublic(p, viewerId, db.users));
};

export const getNoticePost = (
  postId: string,
  viewerId?: string,
  incrementView = true,
): NoticePostPublic | null => {
  const db = readDb();
  const post = db.noticePosts.find((p) => p.id === postId);
  if (!post) return null;

  if (incrementView) {
    post.viewCount = (post.viewCount ?? 0) + 1;
    writeDb(db);
  }

  return toNoticePublic(post, viewerId, db.users);
};

export const createNoticePost = (
  authorId: string,
  title: string,
  content: string,
  attachments: BoardAttachment[] = [],
): NoticePostPublic | null => {
  if (!isAdminUserId(authorId)) return null;

  const db = readDb();
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
  db.noticePosts.push(post);
  writeDb(db);
  return toNoticePublic(post, authorId, db.users);
};

export const updateNoticePost = (
  postId: string,
  authorId: string,
  data: {
    title?: string;
    content?: string;
    attachments?: BoardAttachment[];
  },
): NoticePostPublic | null => {
  if (!isAdminUserId(authorId)) return null;

  const db = readDb();
  const post = db.noticePosts.find((p) => p.id === postId);
  if (!post) return null;

  if (data.title != null) post.title = data.title.trim();
  if (data.content != null) post.content = data.content.trim();
  if (data.attachments != null) post.attachments = data.attachments;
  post.updatedAt = new Date().toISOString();
  writeDb(db);
  return toNoticePublic(post, authorId, db.users);
};

export const deleteNoticePost = (postId: string, authorId: string): boolean => {
  if (!isAdminUserId(authorId)) return false;
  const db = readDb();
  const exists = db.noticePosts.some((p) => p.id === postId);
  if (!exists) return false;
  db.noticePosts = db.noticePosts.filter((p) => p.id !== postId);
  writeDb(db);
  return true;
};

export const getNoticePostRaw = (postId: string): NoticePost | null => {
  const db = readDb();
  return db.noticePosts.find((p) => p.id === postId) ?? null;
};

// --- 2026-08-31 배포게시판 ---

const toReleasePublic = (
  post: ReleasePost,
  viewerId: string | undefined,
  users: User[],
): ReleasePostPublic => {
  const author = users.find((u) => u.id === post.authorId);
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

export const listReleasePosts = (
  viewerId?: string,
): ReleasePostPublic[] => {
  const db = readDb();
  return [...db.releasePosts]
    .sort(
      (a, b) =>
        new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime(),
    )
    .map((p) => toReleasePublic(p, viewerId, db.users));
};

export const getReleasePost = (
  postId: string,
  viewerId?: string,
  incrementView = true,
): ReleasePostPublic | null => {
  const db = readDb();
  const post = db.releasePosts.find((p) => p.id === postId);
  if (!post) return null;

  if (incrementView) {
    post.viewCount = (post.viewCount ?? 0) + 1;
    writeDb(db);
  }

  return toReleasePublic(post, viewerId, db.users);
};

export const createReleasePost = (
  authorId: string,
  title: string,
  content: string,
  status: DeployStatus,
  releasedAt: string,
  attachments: BoardAttachment[] = [],
): ReleasePostPublic | null => {
  if (!isAdminUserId(authorId)) return null;

  const db = readDb();
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
  db.releasePosts.push(post);
  writeDb(db);
  return toReleasePublic(post, authorId, db.users);
};

export const updateReleasePost = (
  postId: string,
  authorId: string,
  data: {
    title?: string;
    content?: string;
    status?: DeployStatus;
    releasedAt?: string;
    attachments?: BoardAttachment[];
  },
): ReleasePostPublic | null => {
  if (!isAdminUserId(authorId)) return null;

  const db = readDb();
  const post = db.releasePosts.find((p) => p.id === postId);
  if (!post) return null;

  if (data.title != null) post.title = data.title.trim();
  if (data.content != null) post.content = data.content.trim();
  if (data.status != null) post.status = data.status;
  if (data.releasedAt != null) post.releasedAt = data.releasedAt;
  if (data.attachments != null) post.attachments = data.attachments;
  post.updatedAt = new Date().toISOString();
  writeDb(db);
  return toReleasePublic(post, authorId, db.users);
};

export const deleteReleasePost = (postId: string, authorId: string): boolean => {
  if (!isAdminUserId(authorId)) return false;
  const db = readDb();
  const exists = db.releasePosts.some((p) => p.id === postId);
  if (!exists) return false;
  db.releasePosts = db.releasePosts.filter((p) => p.id !== postId);
  writeDb(db);
  return true;
};

export const getReleasePostRaw = (postId: string): ReleasePost | null => {
  const db = readDb();
  return db.releasePosts.find((p) => p.id === postId) ?? null;
};
