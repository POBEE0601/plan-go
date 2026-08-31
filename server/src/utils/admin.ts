// 2026-08-31 관리자 계정 판별
export const ADMIN_EMAIL = 'rcj19970815@gmail.com';

export const isAdminEmail = (email?: string | null): boolean =>
  (email ?? '').trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
