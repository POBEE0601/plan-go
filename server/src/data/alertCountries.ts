// 2026-10-21 알림은 국가만 맞춘다. 도시 이름만으로는 걸지 않는다

export const ALERT_COUNTRIES = [
  { key: 'japan', label: '일본', names: ['일본', 'japan', '日本'] },
  { key: 'korea', label: '한국', names: ['한국', '대한민국', 'korea'] },
  { key: 'usa', label: '미국', names: ['미국', 'usa', 'united states'] },
  { key: 'china', label: '중국', names: ['중국', 'china', '中国'] },
  { key: 'taiwan', label: '대만', names: ['대만', 'taiwan', '台灣'] },
  { key: 'thailand', label: '태국', names: ['태국', 'thailand'] },
  { key: 'vietnam', label: '베트남', names: ['베트남', 'vietnam'] },
  { key: 'singapore', label: '싱가포르', names: ['싱가포르', 'singapore'] },
  { key: 'france', label: '프랑스', names: ['프랑스', 'france'] },
  { key: 'uk', label: '영국', names: ['영국', 'uk', 'united kingdom'] },
] as const;

export type AlertCountryKey = (typeof ALERT_COUNTRIES)[number]['key'];

export const countryKeyFromRegion = (regionName?: string): AlertCountryKey | null => {
  const head = (regionName ?? '').toLowerCase().split('>')[0]?.trim() ?? '';
  if (!head) return null;
  for (const row of ALERT_COUNTRIES) {
    if (row.names.some((name) => head.includes(name.toLowerCase()))) return row.key;
  }
  return null;
};

export const countryLabel = (key: string): string =>
  ALERT_COUNTRIES.find((row) => row.key === key)?.label ?? key;

export const isAlertCountryKey = (key: string): key is AlertCountryKey =>
  ALERT_COUNTRIES.some((row) => row.key === key);
