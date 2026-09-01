// 2026-09-01 비상연락용 iso2 국가 코드
// 2026-09-01 여행 좌표·지명으로 국가 통화 추정
export interface CountryCurrency {
  countryKo: string;
  code: string;
  unitName: string;
  /** 표시 단위 (엔화 100엔, 동화 10,000동 등) */
  displayUnit: number;
  iso2: string;
}

const KRW: CountryCurrency = {
  countryKo: '한국',
  code: 'KRW',
  unitName: '원',
  displayUnit: 1,
  iso2: 'KR',
};

const JPY: CountryCurrency = {
  countryKo: '일본',
  code: 'JPY',
  unitName: '엔',
  displayUnit: 100,
  iso2: 'JP',
};
const USD: CountryCurrency = {
  countryKo: '미국',
  code: 'USD',
  unitName: '달러',
  displayUnit: 1,
  iso2: 'US',
};
const EUR: CountryCurrency = {
  countryKo: '유로존',
  code: 'EUR',
  unitName: '유로',
  displayUnit: 1,
  iso2: 'EU',
};
const GBP: CountryCurrency = {
  countryKo: '영국',
  code: 'GBP',
  unitName: '파운드',
  displayUnit: 1,
  iso2: 'GB',
};
const TWD: CountryCurrency = {
  countryKo: '대만',
  code: 'TWD',
  unitName: '대만달러',
  displayUnit: 1,
  iso2: 'TW',
};
const HKD: CountryCurrency = {
  countryKo: '홍콩',
  code: 'HKD',
  unitName: '홍콩달러',
  displayUnit: 1,
  iso2: 'HK',
};
const CNY: CountryCurrency = {
  countryKo: '중국',
  code: 'CNY',
  unitName: '위안',
  displayUnit: 1,
  iso2: 'CN',
};
const THB: CountryCurrency = {
  countryKo: '태국',
  code: 'THB',
  unitName: '밧',
  displayUnit: 10,
  iso2: 'TH',
};
const VND: CountryCurrency = {
  countryKo: '베트남',
  code: 'VND',
  unitName: '동',
  displayUnit: 10000,
  iso2: 'VN',
};
const SGD: CountryCurrency = {
  countryKo: '싱가포르',
  code: 'SGD',
  unitName: '싱가포르달러',
  displayUnit: 1,
  iso2: 'SG',
};
const AUD: CountryCurrency = {
  countryKo: '호주',
  code: 'AUD',
  unitName: '호주달러',
  displayUnit: 1,
  iso2: 'AU',
};
const CAD: CountryCurrency = {
  countryKo: '캐나다',
  code: 'CAD',
  unitName: '캐나다달러',
  displayUnit: 1,
  iso2: 'CA',
};
const PHP: CountryCurrency = {
  countryKo: '필리핀',
  code: 'PHP',
  unitName: '페소',
  displayUnit: 1,
  iso2: 'PH',
};
const IDR: CountryCurrency = {
  countryKo: '인도네시아',
  code: 'IDR',
  unitName: '루피아',
  displayUnit: 10000,
  iso2: 'ID',
};
const MYR: CountryCurrency = {
  countryKo: '말레이시아',
  code: 'MYR',
  unitName: '링깃',
  displayUnit: 1,
  iso2: 'MY',
};

const NAME_HINTS: Array<[RegExp, CountryCurrency]> = [
  [/일본|japan|tokyo|osaka|도쿄|오사카|후쿠오카|삿포로|나고야|교토|오키나와|홋카이도|나리타|간사이/i, JPY],
  [/한국|korea|서울|부산|제주/i, KRW],
  [/대만|taiwan|타이베이|taipei/i, TWD],
  [/홍콩|hong\s*kong/i, HKD],
  [/중국|china|베이징|상하이|beijing|shanghai/i, CNY],
  [/태국|thailand|방콕|bangkok|푸켓|치앙마이/i, THB],
  [/베트남|vietnam|하노이|호치민|다낭/i, VND],
  [/싱가포르|singapore/i, SGD],
  [/미국|usa|united states|뉴욕|하와이|괌|로스앤젤레스/i, USD],
  [/영국|uk|london|런던/i, GBP],
  [/프랑스|paris|파리|독일|berlin|이탈리아|로마|스페인|마드리드|네덜란드/i, EUR],
  [/호주|australia|시드니|멜버른/i, AUD],
  [/캐나다|canada|토론토|밴쿠버/i, CAD],
  [/필리핀|philippines|마닐라|세부/i, PHP],
  [/인도네시아|indonesia|발리|자카르타/i, IDR],
  [/말레이시아|malaysia|쿠알라룸푸르/i, MYR],
];

export const currencyFromPlace = (
  lat?: number,
  lng?: number,
  placeName?: string,
): CountryCurrency | null => {
  const name = placeName?.trim() ?? '';
  for (const [re, cur] of NAME_HINTS) {
    if (name && re.test(name)) return cur;
  }

  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }

  if (lat >= 33 && lat <= 38.7 && lng >= 124.5 && lng <= 132) return KRW;
  if (lat >= 21.8 && lat <= 25.4 && lng >= 119.9 && lng <= 122.1) return TWD;
  if (lat >= 22.15 && lat <= 22.58 && lng >= 113.8 && lng <= 114.5) return HKD;
  if (lat >= 1.15 && lat <= 1.48 && lng >= 103.6 && lng <= 104.1) return SGD;
  if (lat >= 24 && lat <= 46 && lng >= 122.5 && lng <= 146) return JPY;
  if (lat >= 5.5 && lat <= 20.6 && lng >= 97.2 && lng <= 105.8) return THB;
  if (lat >= 8.4 && lat <= 23.5 && lng >= 102 && lng <= 109.8) return VND;
  if (lat >= 4.5 && lat <= 21 && lng >= 116.8 && lng <= 126.7) return PHP;
  if (lat >= 0.8 && lat <= 7.6 && lng >= 99.6 && lng <= 119.4) return MYR;
  if (lat >= -11 && lat <= 6.2 && lng >= 95 && lng <= 141) return IDR;
  if (lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135) return CNY;
  if (lat >= 24 && lat <= 49.5 && lng >= -125 && lng <= -66) return USD;
  if (lat >= 49.8 && lat <= 59 && lng >= -8.7 && lng <= 1.8) return GBP;
  if (lat >= 35 && lat <= 71 && lng >= -10 && lng <= 40) return EUR;
  if (lat >= -44 && lat <= -10 && lng >= 113 && lng <= 154) return AUD;
  if (lat >= 41.6 && lat <= 83 && lng >= -141 && lng <= -52) return CAD;

  return null;
};
