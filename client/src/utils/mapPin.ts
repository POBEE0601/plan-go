// 2026-09-28 저장 지도 핀은 카테고리마다 속 모양을 달리한다
// 2026-09-28 번호 0은 글자 없는 핀 (저장 지도)
// 2026-09-23 같은 핀은 아이콘 객체를 재사용해 장소 이동 때 다시 그리지 않음
// 2026-09-23 선택해도 핀 크기를 유지해 깜빡임을 줄임
// 2026-09-22 카테고리 색 번호 핀 SVG
import { categoryMeta, PIN_SWATCHES, resolvePinColor } from '../utils/days';
import type { Place } from '../types/travel';

export const pinColorOf = (place: Place): string =>
  resolvePinColor(place.category, place.pinColor);

const iconCache = new Map<string, google.maps.Icon>();

export const numberedPinIcon = (
  color: string,
  n: number,
  selected = false,
): google.maps.Icon => {
  const key = `${color}|${n}|${selected ? 1 : 0}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const stroke = selected ? '#ffffff' : 'rgba(15,23,42,0.28)';
  const w = 34;
  const h = 42;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 34 42">
    <path d="M17 1.5c-7.5 0-13.5 6-13.5 13.4 0 9.4 13.5 25 13.5 25s13.5-15.6 13.5-25C30.5 7.5 24.5 1.5 17 1.5z" fill="${color}" stroke="${stroke}" stroke-width="1.5"/>
    ${n > 0 ? `<text x="17" y="18.5" text-anchor="middle" font-size="12" font-weight="700" font-family="Arial,sans-serif" fill="#fff">${n}</text>` : ''}
  </svg>`;
  const icon: google.maps.Icon = {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(w, h),
    anchor: new google.maps.Point(w / 2, h - 2),
  };
  iconCache.set(key, icon);
  return icon;
};

const GLYPH: Record<string, string> = {
  attraction:
    '<path d="M8 20.5 14 12l3 4 3.2-5.2L26 20.5z" fill="#fff"/>',
  cafe:
    '<path d="M11 12.2h7.2v2.4a2.6 2.6 0 0 1-2.6 2.6h-2a2.6 2.6 0 0 1-2.6-2.6zM18.2 12.8h1.8a1.5 1.5 0 0 1 0 3h-1.8" fill="none" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/>',
  restaurant:
    '<path d="M13 10.5v8.5M11.4 10.5v2.4M14.6 10.5v2.4M20.2 10.5c.9 1.2.9 2.4 0 3.6v5" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>',
  dessert:
    '<path d="M17 10.8 23.2 20H10.8z" fill="#fff"/>',
  shopping:
    '<path d="M12.2 13.2h9.6v7.2h-9.6zM14.4 13.2v-1.4a2.6 2.6 0 0 1 5.2 0v1.4" fill="none" stroke="#fff" stroke-width="1.4"/>',
  lodging: '<path d="M11 20v-6.8L17 10l6 3.2V20h-4.2v-3.4h-3.6V20z" fill="#fff"/>',
  airport:
    '<path d="M8.5 16.8h17M17 11.2v8.6M12.2 14.6 17 11.2l4.8 3.4" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  star: '<path d="M17 10.2 18.6 14h4l-3.2 2.4 1.2 3.8L17 17.8 13.4 20.2l1.2-3.8L11.4 14h4z" fill="#fff"/>',
  diamond: '<path d="M17 10.2 22.4 16 17 21.2 11.6 16z" fill="#fff"/>',
  flag: '<path d="M12.5 10.2v10.2M12.5 10.6h7.2l-1.6 2.4 1.6 2.4H12.5" fill="none" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/>',
};

const extraKinds = ['star', 'diamond', 'flag'] as const;

const categoryGlyph = (category: string): { kind: string; color: string } => {
  const meta = categoryMeta(category);
  const text = `${category} ${meta.label} ${meta.emoji}`;
  const known: [RegExp, string][] = [
    [/관광|구경|명소|🌳|attraction/, 'attraction'],
    [/카페|☕|cafe/, 'cafe'],
    [/맛집|식당|레스토랑|restaurant/, 'restaurant'],
    [/디저트|포장|베이커|dessert/, 'dessert'],
    [/쇼핑|shop|🛍️/, 'shopping'],
    [/숙소|호텔|🏨|hotel/, 'lodging'],
    [/공항|✈️|airport/, 'airport'],
  ];
  const matched = known.find(([pattern]) => pattern.test(text));
  if (matched) return { kind: matched[1], color: meta.pinColor };
  if (meta.emoji !== '📌') return { kind: 'star', color: meta.pinColor };
  const hash = [...category].reduce(
    (sum, ch) => (sum * 33 + ch.charCodeAt(0)) >>> 0,
    7,
  );
  return {
    kind: extraKinds[hash % extraKinds.length],
    color: PIN_SWATCHES[(hash >>> 4) % PIN_SWATCHES.length],
  };
};

// 2026-09-28 저장 지도용. 번호 대신 카테고리 모양
export const categoryPinIcon = (
  place: Place,
  selected = false,
): google.maps.Icon => {
  const glyph = categoryGlyph(place.category);
  const color = place.pinColor || glyph.color;
  const key = `cat|${color}|${glyph.kind}|${selected ? 1 : 0}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const stroke = selected ? '#ffffff' : 'rgba(15,23,42,0.28)';
  const w = 34;
  const h = 42;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 34 42">
    <path d="M17 1.5c-7.5 0-13.5 6-13.5 13.4 0 9.4 13.5 25 13.5 25s13.5-15.6 13.5-25C30.5 7.5 24.5 1.5 17 1.5z" fill="${color}" stroke="${stroke}" stroke-width="1.5"/>
    ${GLYPH[glyph.kind] ?? GLYPH.star}
  </svg>`;
  const icon: google.maps.Icon = {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(w, h),
    anchor: new google.maps.Point(w / 2, h - 2),
  };
  iconCache.set(key, icon);
  return icon;
};
