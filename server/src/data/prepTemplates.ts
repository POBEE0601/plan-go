// 2026-10-21 유아·임산부 수는 고정 문구만 준비 항목으로 넣는다
// 2026-09-04 여행 준비 기본 체크리스트 템플릿
export const PREP_TEMPLATE_LABELS = [
  '여권',
  '비자 / 입국 서류',
  '항공권',
  '숙소 예약 확인',
  '환전 / 해외결제 카드',
  '여행자 보험',
  '유심 / eSIM',
  '충전기 / 보조배터리',
  '상비약',
  '멀티 어댑터',
] as const;

export const PARTY_PREP = [
  {
    detail: 'party:infant',
    labels: ['유모차·아기띠', '분유·기내 액체류', '수유실·기저귀'],
  },
  {
    detail: 'party:pregnant',
    labels: ['임산부 좌석·통로', '산모 수첩·상비약', '가까운 산부인과'],
  },
] as const;
