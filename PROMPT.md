# plan-go 프로젝트 초기 개발 지침서

이 프로젝트는 여행 스케줄 관리 웹 서비스 'plan-go'입니다.
기술 스택: React, TypeScript, Vite, Tailwind CSS, Lucide-react, Zustand

아래 1, 2, 3단계를 순서대로 생략 없이 모두 구현해 주세요.

---

## 1단계: 프로젝트 초기화 및 환경 설정
1. Tailwind CSS 설정을 위한 `tailwind.config.js` 및 `postcss.config.js` 파일 생성 및 설정
2. `src/index.css`에 Tailwind 기본 지시어(@tailwind base 등) 추가
3. 프로젝트 폴더 구조 생성:
   - `src/components` (UI 컴포넌트)
   - `src/hooks` (커스텀 훅)
   - `src/store` (Zustand 상태)
   - `src/types` (TypeScript 타입 정의)
   - `src/utils` (공통 유틸리티)

---

## 2단계: 타입 정의 및 Zustand 상태 관리 작성
1. `src/types/travel.ts` 생성:
   - `Schedule` 인터페이스: id, title, location, date, time, memo, lat, lng
   - `TravelPlan` 인터페이스: id, title, startDate, endDate, schedules (Schedule 배열)
2. `src/store/useTravelStore.ts` 생성:
   - Zustand를 사용해 전체 여행 계획 리스트, 현재 선택된 여행 계획 상태 관리
   - 여행 계획 추가, 삭제, 일정(Schedule) 추가, 삭제, 수정 함수 작성

---

## 3단계: 기본 UI 및 메인 레이아웃 구현
`src/App.tsx`와 기본 레이아웃 컴포넌트를 구현:
- Tailwind CSS와 `lucide-react` 아이콘 사용
- 상단 Header: 'plan-go' 로고 및 'Plan Together, Record Forever' 서브 타이틀
- 좌측 SidePanel: 여행 계획 목록 및 새 여행 계획 추가 버튼
- 메인 영역: 선택된 여행의 날짜별 일정 리스트 및 일정 추가 폼
- **주의사항**: 코드 생략 없이 전체 코드를 작성할 것