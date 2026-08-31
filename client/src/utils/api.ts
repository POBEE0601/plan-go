// 2026-08-31 인증·여행·장소·초대·게시판·배포 API 클라이언트
import type {
  BoardComment,
  BoardPost,
  BoardPostDetail,
} from '../types/board';
import type { NoticePost } from '../types/notice';
import type { DeployStatus, ReleasePost } from '../types/release';
import type {
  DayAssignment,
  InvitePreview,
  Place,
  PlaceSearchResult,
  PlanMember,
  RouteDetailsResponse,
  TransitSummary,
  TravelPlan,
} from '../types/travel';
import type { AuthResponse, LoginData, RegisterData, User } from '../types/user';

const API_BASE = '/api';
const TOKEN_KEY = 'plan-go-token';

export const getStoredToken = (): string | null =>
  localStorage.getItem(TOKEN_KEY);

export const setStoredToken = (token: string): void =>
  localStorage.setItem(TOKEN_KEY, token);

export const removeStoredToken = (): void =>
  localStorage.removeItem(TOKEN_KEY);

async function request<T>(
  url: string,
  options?: RequestInit,
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (auth) {
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  } else {
    // 공개 API라도 로그인 상태면 토큰 전달 (관리자 버튼 등)
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && auth) {
    removeStoredToken();
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: '요청 처리 중 오류가 발생했습니다.',
    }));
    throw new Error(error.message ?? '요청 처리 중 오류가 발생했습니다.');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/** multipart 업로드 (Content-Type 자동 설정) */
async function requestForm<T>(
  url: string,
  form: FormData,
  method: 'POST' | 'PATCH' = 'POST',
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${url}`, {
    method,
    headers,
    body: form,
  });

  if (response.status === 401) {
    removeStoredToken();
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: '요청 처리 중 오류가 발생했습니다.',
    }));
    throw new Error(error.message ?? '요청 처리 중 오류가 발생했습니다.');
  }

  return response.json() as Promise<T>;
}

export const authApi = {
  register: (data: RegisterData) =>
    request<AuthResponse>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify(data) },
      false,
    ),
  login: (data: LoginData) =>
    request<AuthResponse>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(data) },
      false,
    ),
  me: () => request<User>('/auth/me'),
};

export const placesApi = {
  search: (q: string, lat?: number, lng?: number) => {
    const params = new URLSearchParams({ q });
    if (lat != null) params.set('lat', String(lat));
    if (lng != null) params.set('lng', String(lng));
    return request<PlaceSearchResult[]>(`/places/search?${params}`);
  },

  transit: (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
    const params = new URLSearchParams({
      fromLat: String(fromLat),
      fromLng: String(fromLng),
      toLat: String(toLat),
      toLng: String(toLng),
    });
    return request<TransitSummary>(`/places/transit?${params}`);
  },

  directions: (
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
    fromName?: string,
    toName?: string,
  ) => {
    const params = new URLSearchParams({
      fromLat: String(fromLat),
      fromLng: String(fromLng),
      toLat: String(toLat),
      toLng: String(toLng),
    });
    if (fromName) params.set('fromName', fromName);
    if (toName) params.set('toName', toName);
    return request<RouteDetailsResponse>(`/places/directions?${params}`);
  },
};

export const boardApi = {
  list: () => request<BoardPost[]>('/board/posts'),

  get: (id: string) => request<BoardPostDetail>(`/board/posts/${id}`),

  create: (data: { title: string; content: string; files?: File[] }) => {
    const form = new FormData();
    form.append('title', data.title);
    form.append('content', data.content);
    (data.files ?? []).forEach((f) => form.append('files', f));
    return requestForm<BoardPost>('/board/posts', form);
  },

  update: (
    id: string,
    data: {
      title: string;
      content: string;
      keepAttachmentIds: string[];
      files?: File[];
    },
  ) => {
    const form = new FormData();
    form.append('title', data.title);
    form.append('content', data.content);
    form.append('keepAttachmentIds', JSON.stringify(data.keepAttachmentIds));
    (data.files ?? []).forEach((f) => form.append('files', f));
    return requestForm<BoardPost>(`/board/posts/${id}`, form, 'PATCH');
  },

  remove: (id: string) =>
    request<void>(`/board/posts/${id}`, { method: 'DELETE' }),

  addComment: (postId: string, content: string) =>
    request<BoardComment>(`/board/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  removeComment: (commentId: string) =>
    request<void>(`/board/comments/${commentId}`, { method: 'DELETE' }),

  toggleLike: (postId: string) =>
    request<{ liked: boolean; likeCount: number }>(
      `/board/posts/${postId}/like`,
      { method: 'POST' },
    ),
};

export const noticeApi = {
  list: () => request<NoticePost[]>('/notices/posts', undefined, false),

  get: (id: string) =>
    request<NoticePost>(`/notices/posts/${id}`, undefined, false),

  create: (data: { title: string; content: string; files?: File[] }) => {
    const form = new FormData();
    form.append('title', data.title);
    form.append('content', data.content);
    (data.files ?? []).forEach((f) => form.append('files', f));
    return requestForm<NoticePost>('/notices/posts', form);
  },

  update: (
    id: string,
    data: {
      title: string;
      content: string;
      keepAttachmentIds: string[];
      files?: File[];
    },
  ) => {
    const form = new FormData();
    form.append('title', data.title);
    form.append('content', data.content);
    form.append('keepAttachmentIds', JSON.stringify(data.keepAttachmentIds));
    (data.files ?? []).forEach((f) => form.append('files', f));
    return requestForm<NoticePost>(`/notices/posts/${id}`, form, 'PATCH');
  },

  remove: (id: string) =>
    request<void>(`/notices/posts/${id}`, { method: 'DELETE' }),
};

export const releaseApi = {
  list: () => request<ReleasePost[]>('/releases/posts', undefined, false),

  get: (id: string) =>
    request<ReleasePost>(`/releases/posts/${id}`, undefined, false),

  create: (data: {
    title: string;
    content: string;
    status: DeployStatus;
    releasedAt: string;
    files?: File[];
  }) => {
    const form = new FormData();
    form.append('title', data.title);
    form.append('content', data.content);
    form.append('status', data.status);
    form.append('releasedAt', data.releasedAt);
    (data.files ?? []).forEach((f) => form.append('files', f));
    return requestForm<ReleasePost>('/releases/posts', form);
  },

  update: (
    id: string,
    data: {
      title: string;
      content: string;
      status: DeployStatus;
      releasedAt: string;
      keepAttachmentIds: string[];
      files?: File[];
    },
  ) => {
    const form = new FormData();
    form.append('title', data.title);
    form.append('content', data.content);
    form.append('status', data.status);
    form.append('releasedAt', data.releasedAt);
    form.append('keepAttachmentIds', JSON.stringify(data.keepAttachmentIds));
    (data.files ?? []).forEach((f) => form.append('files', f));
    return requestForm<ReleasePost>(`/releases/posts/${id}`, form, 'PATCH');
  },

  remove: (id: string) =>
    request<void>(`/releases/posts/${id}`, { method: 'DELETE' }),
};

export const travelApi = {
  getPlans: () => request<TravelPlan[]>('/travel-plans'),

  getPlan: (id: string) =>
    request<TravelPlan & { myRole?: string }>(`/travel-plans/${id}`),

  createPlan: (data: {
    title: string;
    startDate: string;
    endDate: string;
    regionName: string;
    regionLat: number;
    regionLng: number;
  }) =>
    request<TravelPlan>('/travel-plans', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deletePlan: (id: string) =>
    request<void>(`/travel-plans/${id}`, { method: 'DELETE' }),

  addPlace: (
    planId: string,
    data: Omit<Place, 'id' | 'planId'> & { googlePlaceId?: string },
  ) =>
    request<Place>(`/travel-plans/${planId}/places`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deletePlace: (planId: string, placeId: string) =>
    request<void>(`/travel-plans/${planId}/places/${placeId}`, {
      method: 'DELETE',
    }),

  assignDay: (
    planId: string,
    data: { placeId: string; dayIndex: number; time?: string; memo?: string },
  ) =>
    request<DayAssignment>(`/travel-plans/${planId}/days`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAssignment: (
    planId: string,
    assignmentId: string,
    data: { dayIndex?: number; order?: number; time?: string; memo?: string },
  ) =>
    request<DayAssignment>(`/travel-plans/${planId}/days/${assignmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  reorderDay: (planId: string, dayIndex: number, orderedIds: string[]) =>
    request<DayAssignment[]>(
      `/travel-plans/${planId}/days/${dayIndex}/reorder`,
      {
        method: 'PUT',
        body: JSON.stringify({ orderedIds }),
      },
    ),

  removeAssignment: (planId: string, assignmentId: string) =>
    request<void>(`/travel-plans/${planId}/days/${assignmentId}`, {
      method: 'DELETE',
    }),

  inviteEmail: (
    planId: string,
    data: { email: string; role: 'editor' | 'viewer' },
  ) =>
    request<PlanMember & { inviteUrl: string }>(
      `/travel-plans/${planId}/invites`,
      { method: 'POST', body: JSON.stringify(data) },
    ),

  inviteLink: (planId: string, role: 'editor' | 'viewer') =>
    request<PlanMember & { inviteUrl: string }>(
      `/travel-plans/${planId}/invites`,
      {
        method: 'POST',
        body: JSON.stringify({ role, createLink: true }),
      },
    ),

  updateMemberRole: (
    planId: string,
    memberId: string,
    role: 'editor' | 'viewer',
  ) =>
    request<PlanMember>(`/travel-plans/${planId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  removeMember: (planId: string, memberId: string) =>
    request<void>(`/travel-plans/${planId}/members/${memberId}`, {
      method: 'DELETE',
    }),

  getInvite: (token: string) =>
    request<InvitePreview>(`/travel-plans/invites/${token}`, undefined, false),

  acceptInvite: (token: string) =>
    request<TravelPlan>(`/travel-plans/invites/${token}/accept`, {
      method: 'POST',
    }),
};
