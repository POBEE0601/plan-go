// 2026-10-02 같은 장소·구간 조회가 구글에 반복되지 않도록 프로세스 메모리에 보관

interface Entry<T> {
  exp: number;
  value: T;
}

const store = new Map<string, Entry<unknown>>();

export const DAY_MS = 24 * 60 * 60 * 1000;

export const recall = <T>(key: string): T | undefined => {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.exp <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return hit.value as T;
};

export const remember = <T>(key: string, value: T, ttlMs: number): void => {
  if (store.size > 400) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(key, { exp: Date.now() + ttlMs, value });
};
