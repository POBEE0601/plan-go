// 2026-09-01 해외 여행 비상 연락·대처 안내 (한국 여행자 기준)
import { currencyFromPlace } from '../utils/geoCurrency';

export interface EmergencyItem {
  label: string;
  number?: string;
  detail: string;
  href?: string;
}

export interface EmergencyGuide {
  countryKo: string;
  local: EmergencyItem[];
  consular: EmergencyItem[];
  extra: EmergencyItem[];
}

interface ConsulatePick {
  match: RegExp;
  name: string;
  number: string;
  detail: string;
}

const CALL_CENTER: EmergencyItem = {
  label: '영사안전콜센터',
  number: '+82-2-3210-0404',
  detail: '24시간. 사건사고 접수, 여권 안내, 긴급 통역(2번).',
};

const SAFETY_SITE: EmergencyItem = {
  label: '해외안전여행',
  detail: '공관 연락처·여행경보는 외교부 0404에서 확인하세요.',
  href: 'https://www.0404.go.kr',
};

const LOST_PASSPORT: EmergencyItem = {
  label: '여권 분실',
  detail:
    '현지 경찰에 분실 신고 후 가까운 한국 공관에서 여행증명서(임시여권)를 신청하세요.',
};

const INTERPRET: EmergencyItem = {
  label: '긴급 통역',
  number: '+82-2-3210-0404',
  detail:
    '영사안전콜센터 2번. 영·중·일·베트남·프·러·스페인어 3자 통역(경찰·병원 현장).',
};

const MONEY: EmergencyItem = {
  label: '긴급 송금',
  detail:
    '소지품을 잃으면 영사안전콜센터로 신속해외송금(국내 가족이 입금 → 공관 수령)을 문의하세요.',
};

const COMMON_EXTRA: EmergencyItem[] = [LOST_PASSPORT, INTERPRET, MONEY];

const EU_ISO_HINTS: Array<[RegExp, string]> = [
  [/프랑스|paris|파리|france/i, 'FR'],
  [/독일|berlin|munich|뮌헨|germany/i, 'DE'],
  [/이탈리아|로마|rome|milan|밀라노|italy|venice|베네치아/i, 'IT'],
  [/스페인|마드리드|바르셀로나|spain|madrid|barcelona/i, 'ES'],
  [/네덜란드|암스테르담|netherlands|amsterdam/i, 'NL'],
];

const pickConsulate = (
  placeName: string,
  options: ConsulatePick[],
  fallback: EmergencyItem,
): EmergencyItem => {
  const hit = options.find((o) => o.match.test(placeName));
  if (!hit) return fallback;
  return {
    label: hit.name,
    number: hit.number,
    detail: hit.detail,
  };
};

const guideOf = (
  countryKo: string,
  local: EmergencyItem[],
  consular: EmergencyItem[],
  extra: EmergencyItem[] = [],
): EmergencyGuide => ({
  countryKo,
  local,
  consular: [CALL_CENTER, ...consular, SAFETY_SITE],
  extra: [...extra, ...COMMON_EXTRA],
});

const GUIDES: Record<string, (placeName: string) => EmergencyGuide> = {
  KR: () =>
    guideOf(
      '한국',
      [
        { label: '경찰', number: '112', detail: '범죄·긴급 신고.' },
        { label: '구급·소방', number: '119', detail: '응급환자·화재.' },
        {
          label: '관광통역',
          number: '1330',
          detail: '한국관광공사 1330. 다국어 관광·응급 안내.',
        },
      ],
      [],
    ),
  JP: (placeName) =>
    guideOf(
      '일본',
      [
        { label: '경찰', number: '110', detail: '범죄·사고. 영어 대응 가능한 경우가 많습니다.' },
        { label: '구급·소방', number: '119', detail: '응급환자·화재. ambulance / fire 라고 말하세요.' },
      ],
      [
        pickConsulate(
          placeName,
          [
            {
              match: /오사카|osaka|교토|kyoto|고베|kobe|간사이|kansai/i,
              name: '주오사카 총영사관',
              number: '+81-6-6261-9221',
              detail: '간사이 여권·사건사고. 근무 외는 아래 긴급전화·콜센터.',
            },
            {
              match: /후쿠오카|fukuoka|기타큐슈|나가사키|nagasaki/i,
              name: '주후쿠오카 총영사관',
              number: '+81-92-771-0461',
              detail: '규슈 여권·사건사고 안내.',
            },
            {
              match: /삿포로|sapporo|홋카이도|hokkaido/i,
              name: '주삿포로 총영사관',
              number: '+81-11-218-1881',
              detail: '홋카이도 여권·사건사고 안내.',
            },
            {
              match: /나고야|nagoya|아이치|aichi/i,
              name: '주나고야 총영사관',
              number: '+81-52-202-4301',
              detail: '중부 여권·사건사고 안내.',
            },
            {
              match: /오키나와|okinawa|나하|naha/i,
              name: '주나하 총영사관',
              number: '+81-98-832-5701',
              detail: '오키나와 여권·사건사고 안내.',
            },
          ],
          {
            label: '주일본 대사관 영사과',
            number: '+81-3-3455-2601',
            detail: '도쿄. 여권 분실·사건사고. 대표 +81-3-3452-7611.',
          },
        ),
        {
          label: '대사관 긴급(야간·휴일)',
          number: '+81-70-2153-5454',
          detail: '사건사고 긴급 연락. 평일 낮에는 영사과로 먼저 연락하세요.',
        },
      ],
    ),
  TH: () =>
    guideOf('태국', [
      { label: '경찰', number: '191', detail: '일반 범죄·사고 신고.' },
      { label: '관광경찰', number: '1155', detail: '관광객 대상. 영어 응대가 비교적 수월합니다.' },
      { label: '구급', number: '1669', detail: '응급 환자 이송.' },
      { label: '소방', number: '199', detail: '화재 신고.' },
    ], [
      {
        label: '주태국 대사관',
        number: '+66-2-247-7537',
        detail: '방콕. 여권·영사 민원은 영사과로 연결됩니다.',
      },
      {
        label: '대사관 당직(근무 외)',
        number: '+66-81-914-5803',
        detail: '야간·휴일 사건사고 긴급 연락.',
      },
    ]),
  US: (placeName) =>
    guideOf('미국', [
      { label: '긴급', number: '911', detail: '경찰·구급·소방 통합. 주소를 또박또박 말하세요.' },
    ], [
      pickConsulate(
        placeName,
        [
          {
            match: /로스앤젤레스|la\b|los angeles|엘에이/i,
            name: '주로스앤젤레스 총영사관',
            number: '+1-213-385-9300',
            detail: '남가주 여권·사건사고.',
          },
          {
            match: /뉴욕|new york|\bny\b/i,
            name: '주뉴욕 총영사관',
            number: '+1-646-674-6000',
            detail: '뉴욕 일원 여권·사건사고.',
          },
          {
            match: /샌프란|san francisco|\bsf\b/i,
            name: '주샌프란시스코 총영사관',
            number: '+1-415-352-0700',
            detail: '북가주 여권·사건사고.',
          },
          {
            match: /하와이|hawaii|호놀룰루|honolulu/i,
            name: '주호놀룰루 총영사관',
            number: '+1-808-595-6109',
            detail: '하와이 여권·사건사고.',
          },
          {
            match: /괌|guam/i,
            name: '주괌 총영사관',
            number: '+1-671-647-6488',
            detail: '괌 여권·사건사고.',
          },
        ],
        {
          label: '주미국 대사관',
          number: '+1-202-939-5600',
          detail: '워싱턴 D.C. 영사 민원.',
        },
      ),
      {
        label: '대사관 근무 외 긴급',
        number: '+1-202-641-8761',
        detail: '야간·휴일 사건사고. 관할 총영사관이 있으면 그쪽으로 먼저 연락하세요.',
      },
    ]),
  CN: (placeName) =>
    guideOf('중국', [
      { label: '경찰', number: '110', detail: '범죄·사고 신고.' },
      { label: '구급', number: '120', detail: '응급 환자.' },
      { label: '소방', number: '119', detail: '화재 신고.' },
    ], [
      pickConsulate(
        placeName,
        [
          {
            match: /상하이|shanghai/i,
            name: '주상하이 총영사관',
            number: '+86-21-6295-5000',
            detail: '상하이 여권·사건사고.',
          },
          {
            match: /광저우|guangzhou|광동|광둥/i,
            name: '주광저우 총영사관',
            number: '+86-20-8613-5000',
            detail: '광둥 여권·사건사고.',
          },
          {
            match: /칭다오|qingdao|청도/i,
            name: '주칭다오 총영사관',
            number: '+86-532-8897-6001',
            detail: '산둥 여권·사건사고.',
          },
        ],
        {
          label: '주중국 대사관',
          number: '+86-10-8531-0700',
          detail: '베이징. 여권·사건사고는 영사과로 문의하세요.',
        },
      ),
    ]),
  HK: () =>
    guideOf('홍콩', [
      { label: '긴급', number: '999', detail: '경찰·구급·소방.' },
    ], [
      {
        label: '주홍콩 총영사관',
        number: '+852-2529-4141',
        detail: '여권 분실·사건사고 영사 조력.',
      },
    ]),
  TW: () =>
    guideOf('대만', [
      { label: '경찰', number: '110', detail: '범죄·사고 신고.' },
      { label: '구급·소방', number: '119', detail: '응급환자·화재.' },
    ], [
      {
        label: '주타이베이 대표부',
        number: '+886-2-2758-8320',
        detail: '여권·사건사고. 대사관 대신 대표부가 영사 업무를 합니다.',
      },
    ]),
  VN: (placeName) =>
    guideOf('베트남', [
      { label: '경찰', number: '113', detail: '범죄·사고 신고.' },
      { label: '구급', number: '115', detail: '응급 환자.' },
      { label: '소방', number: '114', detail: '화재 신고.' },
    ], [
      pickConsulate(
        placeName,
        [
          {
            match: /호치민|ho chi minh|사이공|saigon|다낭|danang|da nang/i,
            name: '주호치민 총영사관',
            number: '+84-28-3822-5757',
            detail: '남부·다낭 일원 여권·사건사고.',
          },
        ],
        {
          label: '주베트남 대사관',
          number: '+84-24-3831-5110',
          detail: '하노이. 여권·사건사고 영사 조력.',
        },
      ),
    ]),
  SG: () =>
    guideOf('싱가포르', [
      { label: '경찰·구급', number: '999', detail: '범죄·응급.' },
      { label: '소방·구급', number: '995', detail: '화재·응급 이송.' },
    ], [
      {
        label: '주싱가포르 대사관',
        number: '+65-6256-1188',
        detail: '여권 분실·사건사고 영사 조력.',
      },
    ]),
  GB: () =>
    guideOf('영국', [
      { label: '긴급', number: '999', detail: '경찰·구급·소방. 비긴급 경찰은 101.' },
    ], [
      {
        label: '주영국 대사관',
        number: '+44-20-2276-4325',
        detail: '런던. 여권·사건사고는 영사과·콜센터로 문의하세요.',
      },
    ]),
  AU: () =>
    guideOf('호주', [
      { label: '긴급', number: '000', detail: '경찰·구급·소방.' },
    ], [
      {
        label: '주호주 대사관',
        number: '+61-2-6270-4100',
        detail: '캔버라. 시드니·멜버른은 해당 총영사관이 더 가깝습니다.',
      },
    ]),
  CA: () =>
    guideOf('캐나다', [
      { label: '긴급', number: '911', detail: '경찰·구급·소방.' },
    ], [
      {
        label: '주캐나다 대사관',
        number: '+1-613-244-5010',
        detail: '오타와. 토론토·밴쿠버는 총영사관으로 연락하세요.',
      },
    ]),
  PH: () =>
    guideOf('필리핀', [
      { label: '긴급', number: '911', detail: '경찰·구급 통합 신고.' },
    ], [
      {
        label: '주필리핀 대사관',
        number: '+63-2-8856-9210',
        detail: '마닐라. 여권·사건사고 영사 조력.',
      },
    ]),
  ID: () =>
    guideOf('인도네시아', [
      { label: '경찰', number: '110', detail: '범죄 신고. 112도 연결되는 지역이 있습니다.' },
      { label: '구급', number: '118', detail: '응급 환자. 지역에 따라 119.' },
    ], [
      {
        label: '주인니 대사관',
        number: '+62-21-2967-2555',
        detail: '자카르타. 발리는 주덴파사르 총영사관이 가깝습니다.',
      },
    ]),
  MY: () =>
    guideOf('말레이시아', [
      { label: '긴급', number: '999', detail: '경찰·구급·소방.' },
    ], [
      {
        label: '주말레이시아 대사관',
        number: '+60-3-4251-2336',
        detail: '쿠알라룸푸르. 여권·사건사고 영사 조력.',
      },
    ]),
  FR: () =>
    guideOf('프랑스', [
      { label: '통합 긴급', number: '112', detail: 'EU 공통 긴급번호.' },
      { label: '경찰', number: '17', detail: '범죄 신고.' },
      { label: '구급', number: '15', detail: 'SAMU 응급의료.' },
    ], [
      {
        label: '주프랑스 대사관',
        number: '+33-1-4756-1900',
        detail: '파리. 여권 분실·사건사고 영사 조력.',
      },
    ]),
  DE: () =>
    guideOf('독일', [
      { label: '경찰', number: '110', detail: '범죄·사고.' },
      { label: '구급·소방', number: '112', detail: '응급환자·화재.' },
    ], [
      {
        label: '주독일 대사관',
        number: '+49-30-26065-0',
        detail: '베를린. 여권·사건사고는 영사과로 문의하세요.',
      },
    ]),
  IT: () =>
    guideOf('이탈리아', [
      { label: '통합 긴급', number: '112', detail: 'EU 공통. 경찰 113, 구급 118도 사용합니다.' },
    ], [
      {
        label: '주이탈리아 대사관',
        number: '+39-06-802461',
        detail: '로마. 여권 분실·사건사고 영사 조력.',
      },
    ]),
  ES: () =>
    guideOf('스페인', [
      { label: '통합 긴급', number: '112', detail: '경찰·구급·소방.' },
    ], [
      {
        label: '주스페인 대사관',
        number: '+34-91-353-2000',
        detail: '마드리드. 여권·사건사고 영사 조력.',
      },
    ]),
  NL: () =>
    guideOf('네덜란드', [
      { label: '긴급', number: '112', detail: '경찰·구급·소방.' },
    ], [
      {
        label: '주네덜란드 대사관',
        number: '+31-70-371-0711',
        detail: '헤이그. 여권·사건사고 영사 조력.',
      },
    ]),
  EU: () =>
    guideOf('유럽', [
      { label: '통합 긴급', number: '112', detail: 'EU 대부분 국가 공통 긴급번호.' },
    ], []),
};

const genericGuide = (countryKo: string): EmergencyGuide =>
  guideOf(countryKo, [
    {
      label: '현지 긴급전화',
      detail: '호텔 직원·경찰에 emergency / police / ambulance를 요청하세요.',
    },
  ], []);

export const getEmergencyGuide = (
  lat?: number,
  lng?: number,
  placeName?: string,
): EmergencyGuide => {
  const name = placeName?.trim() ?? '';
  for (const [re, iso] of EU_ISO_HINTS) {
    if (name && re.test(name) && GUIDES[iso]) return GUIDES[iso](name);
  }

  const currency = currencyFromPlace(lat, lng, name);
  const iso = currency?.iso2;
  if (iso && GUIDES[iso]) return GUIDES[iso](name);
  return genericGuide(currency?.countryKo ?? '여행지');
};

export const telHref = (number: string): string =>
  `tel:${number.replace(/[^\d+]/g, '')}`;
