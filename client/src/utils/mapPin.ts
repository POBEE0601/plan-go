// 2026-09-23 같은 핀은 아이콘 객체를 재사용해 장소 이동 때 다시 그리지 않음
// 2026-09-23 선택해도 핀 크기를 유지해 깜빡임을 줄임
// 2026-09-22 카테고리 색 번호 핀 SVG
import { resolvePinColor } from '../utils/days';
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
    <text x="17" y="18.5" text-anchor="middle" font-size="12" font-weight="700" font-family="Arial,sans-serif" fill="#fff">${n}</text>
  </svg>`;
  const icon: google.maps.Icon = {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(w, h),
    anchor: new google.maps.Point(w / 2, h - 2),
  };
  iconCache.set(key, icon);
  return icon;
};
