// 2026-11-06 글마다 다른 풍경. 나라 배너 사진과 겹치지 않는다

const COUNTRY_PHOTO: Record<string, string> = {
  JP: '/desk/photo-jp.jpg',
  TW: '/desk/photo-tw.jpg',
  VN: '/desk/photo-vn.jpg',
  TH: '/desk/photo-th.jpg',
  FR: '/desk/photo-fr.jpg',
  US: '/desk/photo-us.jpg',
};

const ARTICLE_PHOTO: Record<string, string> = {
  'jp-refund-2026': '/desk/scene-refund.jpg',
  'jp-year-end-hours': '/desk/scene-year-end.jpg',
  'fukuoka-airport-city': '/desk/scene-airport-jp.jpg',
  'esim-before-flight': '/desk/scene-window.jpg',
  'jpy-where': '/desk/scene-exchange.jpg',
  'card-fees': '/desk/scene-card.jpg',
  'japan-tax-rate': '/desk/scene-grocery.jpg',
  tipping: '/desk/scene-tip.jpg',
  suica: '/desk/scene-gate.jpg',
  'japan-taxi': '/desk/scene-taxi.jpg',
  'jr-private': '/desk/scene-trains.jpg',
  grab: '/desk/scene-grab.jpg',
  'airport-first-30': '/desk/scene-arrivals.jpg',
  'esim-install': '/desk/scene-hotel-phone.jpg',
  'wifi-vs-esim': '/desk/scene-wifi.jpg',
  'kakao-abroad': '/desk/scene-balcony.jpg',
  'roaming-cost': '/desk/scene-roaming.jpg',
  'lost-passport': '/desk/scene-embassy.jpg',
  'hospital-abroad': '/desk/scene-clinic.jpg',
  'emergency-numbers': '/desk/scene-nightstand.jpg',
  pickpocket: '/desk/scene-metro.jpg',
  'japan-plug': '/desk/scene-ryokan.jpg',
  'medicine-japan': '/desk/scene-drugstore.jpg',
  konbini: '/desk/scene-konbini.jpg',
  'season-01': '/desk/photo-winter.jpg',
  'season-02': '/desk/scene-dry.jpg',
  'season-03': '/desk/photo-spring.jpg',
  'season-04': '/desk/scene-taipei-rain.jpg',
  'season-05': '/desk/scene-platform.jpg',
  'season-06': '/desk/scene-rain-alley.jpg',
  'season-07': '/desk/scene-plaza.jpg',
  'season-08': '/desk/scene-festival.jpg',
  'season-09': '/desk/scene-dusk-plane.jpg',
  'season-10': '/desk/photo-autumn.jpg',
  'season-11': '/desk/scene-maple-hill.jpg',
  'season-12': '/desk/scene-lights.jpg',
};

export const CURRENCY_IMAGE: Record<string, string> = {
  JPY: COUNTRY_PHOTO.JP,
  USD: COUNTRY_PHOTO.US,
  EUR: COUNTRY_PHOTO.FR,
  TWD: COUNTRY_PHOTO.TW,
  THB: COUNTRY_PHOTO.TH,
  VND: COUNTRY_PHOTO.VN,
};

export const countryImage = (code: string): string =>
  COUNTRY_PHOTO[code.toUpperCase()] ?? COUNTRY_PHOTO.JP;

export const articleImage = (id: string): string =>
  ARTICLE_PHOTO[id] ?? COUNTRY_PHOTO.JP;
