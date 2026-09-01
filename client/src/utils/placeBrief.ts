// 2026-09-01 장소 카드용 짧은 유형 라벨
const TYPE_LABEL: Record<string, string> = {
  airport: '공항',
  lodging: '숙소',
  park: '공원',
  tourist_attraction: '관광명소',
  restaurant: '식당',
  cafe: '카페',
  bar: '바',
  bakery: '베이커리',
  museum: '박물관',
  art_gallery: '미술관',
  zoo: '동물원',
  aquarium: '수족관',
  amusement_park: '놀이공원',
  shopping_mall: '쇼핑몰',
  store: '상점',
  supermarket: '마트',
  subway_station: '지하철',
  train_station: '기차역',
  transit_station: '환승역',
  bus_station: '버스 터미널',
  church: '교회',
  hindu_temple: '사원',
  mosque: '모스크',
  shrine: '신사',
  spa: '스파',
  stadium: '경기장',
  university: '대학',
  library: '도서관',
  movie_theater: '영화관',
  night_club: '클럽',
  natural_feature: '자연',
};

const SKIP_TYPES = new Set([
  'point_of_interest',
  'establishment',
  'premise',
  'geocode',
  'political',
  'route',
  'street_address',
  'plus_code',
]);

export const briefTypeLabels = (types?: string[], limit = 3): string[] => {
  if (!types?.length) return [];
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const type of types) {
    if (SKIP_TYPES.has(type)) continue;
    const label = TYPE_LABEL[type];
    if (!label || seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
    if (labels.length >= limit) break;
  }
  return labels;
};
