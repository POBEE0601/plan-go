// 2026-10-21 인원은 수만 받고 범위를 고정한다. 이름·생년월일은 받지 않는다

export interface PlanParty {
  adults: number;
  children: number;
  infants: number;
  pregnant: boolean;
}

const clampInt = (
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

export const clampParty = (raw: {
  adults?: unknown;
  children?: unknown;
  infants?: unknown;
  pregnant?: unknown;
}): PlanParty => ({
  adults: clampInt(raw.adults, 1, 20, 1),
  children: clampInt(raw.children, 0, 20, 0),
  infants: clampInt(raw.infants, 0, 10, 0),
  pregnant: raw.pregnant === true || raw.pregnant === 'true',
});
