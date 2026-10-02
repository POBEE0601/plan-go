// 2026-10-02 Place Photo URL은 열릴 때마다 과금되므로 응답·저장에서 뺀다

export const publicPhotoUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  const value = url.trim();
  if (!value) return undefined;
  if (/maps\.googleapis\.com\/maps\/api\/place\/photo/i.test(value)) return undefined;
  if (/[?&]photo_reference=/i.test(value)) return undefined;
  return value;
};
