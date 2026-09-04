// 2026-09-04 초대 멤버 휴지통은 나가기, 삭제는 방장만
// 2026-09-04 장기간 여행: 접힌 레일 일차 압축
// 2026-09-01 도시별 비상 연락망 버튼
// 2026-09-01 PC 메뉴 접기 + 일자 아코디언
// 2026-09-01 모바일: 드로어로 전환, 계획 선택 시 자동 닫힘
// 2026-08-31 여행 계획 생성 시 지역 선택 지원
// 2026-09-03 일자 목록 중복 제거. 사이드는 계획만
// 2026-09-04 목록형일 때만 일자 아코디언 복구
// 2026-09-04 여행 생성 위치를 국가 > 도시로 제한
import { useEffect, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import EmergencyModal from './EmergencyModal';
import DayAccordion from './DayAccordion';
import { useTravelStore } from '../store/useTravelStore';
import { useAuthStore } from '../store/useAuthStore';
import { usePlanUiStore } from '../store/usePlanUiStore';
import { placesApi } from '../utils/api';
import { dayOptionLabel, getDayCount, isLongTrip } from '../utils/days';
import type { CitySearchResult, TravelPlan } from '../types/travel';

const isPlanOwner = (plan: TravelPlan, userId?: string): boolean => {
  if (!userId) return false;
  if (plan.userId === userId) return true;
  return (plan.members ?? []).some(
    (m) =>
      m.userId === userId && m.role === 'owner' && m.status === 'accepted',
  );
};

const ownsListedPlan = (
  plan: TravelPlan,
  userId: string | undefined,
  selectedPlanId: string | null,
  myRole: string | null,
): boolean =>
  (selectedPlanId === plan.id && myRole === 'owner') ||
  isPlanOwner(plan, userId);

interface SidePanelProps {
  open?: boolean;
  onClose?: () => void;
}

export default function SidePanel({ open = true, onClose }: SidePanelProps) {
  const {
    travelPlans,
    selectedPlan,
    selectedPlanId,
    selectPlan,
    addTravelPlan,
    deleteTravelPlan,
    leaveTravelPlan,
    myRole,
  } = useTravelStore();
  const userId = useAuthStore((s) => s.user?.id);
  const { activeDay, setActiveDay, sidebarCollapsed, toggleSidebar, layoutMode } =
    usePlanUiStore();

  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [regionQuery, setRegionQuery] = useState('');
  const [regionResults, setRegionResults] = useState<CitySearchResult[]>([]);
  const [selectedRegion, setSelectedRegion] =
    useState<CitySearchResult | null>(null);
  const [searchingRegion, setSearchingRegion] = useState(false);
  const [regionError, setRegionError] = useState('');
  const [emergencyPlan, setEmergencyPlan] = useState<TravelPlan | null>(null);

  // 지역명 입력 후 짧은 디바운스로 자동 검색
  useEffect(() => {
    if (selectedRegion && regionQuery === selectedRegion.label) return;
    if (!regionQuery.trim() || regionQuery.trim().length < 2) {
      setRegionResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingRegion(true);
      setRegionError('');
      try {
        // 국가·도시만 검색. 세부 장소는 일정에서 등록
        const data = await placesApi.searchCities(regionQuery.trim());
        setRegionResults(data.slice(0, 6));
      } catch (err) {
        setRegionError(
          err instanceof Error ? err.message : '지역 검색에 실패했습니다.',
        );
        setRegionResults([]);
      } finally {
        setSearchingRegion(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [regionQuery, selectedRegion]);

  const resetForm = () => {
    setTitle('');
    setStartDate('');
    setEndDate('');
    setRegionQuery('');
    setRegionResults([]);
    setSelectedRegion(null);
    setRegionError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate) return;
    if (!selectedRegion) {
      setRegionError('검색 결과에서 도시를 선택해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addTravelPlan({
        title: title.trim(),
        startDate,
        endDate,
        regionName: selectedRegion.label,
        regionLat: selectedRegion.lat,
        regionLng: selectedRegion.lng,
      });
      setActiveDay(1);
      resetForm();
      setShowForm(false);
      onClose?.();
    } catch {
      // store에서 error 상태 처리
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePlan = async (
    e: React.MouseEvent,
    plan: TravelPlan,
  ) => {
    e.stopPropagation();
    const owner = ownsListedPlan(plan, userId, selectedPlanId, myRole);

    if (owner) {
      if (
        !window.confirm(
          `'${plan.title}' 여행 계획을 삭제하시겠습니까?\n모든 일정이 삭제되며 되돌릴 수 없습니다.`,
        )
      ) {
        return;
      }
      try {
        await deleteTravelPlan(plan.id);
      } catch {
        // store에서 error 상태 처리
      }
      return;
    }

    if (
      !window.confirm(
        `'${plan.title}' 여행에서 나가시겠습니까?\n일정 자체는 삭제되지 않으며, 내 목록에서만 사라집니다.`,
      )
    ) {
      return;
    }
    try {
      await leaveTravelPlan(plan.id);
    } catch {
      // store에서 error 상태 처리
    }
  };

  const pickRegion = (region: CitySearchResult) => {
    setSelectedRegion(region);
    setRegionQuery(region.label);
    setRegionResults([]);
    setRegionError('');
  };

  const dayCount = selectedPlan
    ? getDayCount(selectedPlan.startDate, selectedPlan.endDate)
    : 0;

  const compactRail = isLongTrip(dayCount);

  // PC에서 접힌 레일: 일자 전환만 빠르게. 모바일은 항상 전체 패널
  return (
    <>
      {sidebarCollapsed && (
        <aside
          className={`hidden shrink-0 flex-col border-r border-slate-200 bg-white lg:flex ${
            compactRail ? 'w-16' : 'w-14'
          }`}
        >
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex h-12 w-full items-center justify-center text-slate-500 hover:bg-slate-50"
            aria-label="메뉴 펼치기"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              toggleSidebar();
              setShowForm(true);
            }}
            className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white hover:bg-primary-700"
            aria-label="새 계획"
          >
            <Plus className="h-4 w-4" />
          </button>
          <div className="mt-3 flex flex-1 flex-col items-center gap-1 overflow-y-auto px-1 pb-3">
            {compactRail ? (
              <>
                <button
                  type="button"
                  disabled={activeDay <= 1}
                  onClick={() => setActiveDay(activeDay - 1)}
                  className="flex h-8 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="이전 일차"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-xs font-bold text-white">
                  {activeDay}
                </span>
                <button
                  type="button"
                  disabled={dayCount > 0 && activeDay >= dayCount}
                  onClick={() => setActiveDay(activeDay + 1)}
                  className="flex h-8 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="다음 일차"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                {selectedPlan && (
                  <select
                    value={activeDay}
                    aria-label="일차 점프"
                    onChange={(e) => setActiveDay(Number(e.target.value))}
                    className="mt-1 w-12 rounded border border-slate-200 bg-white py-1 text-center text-[10px] font-medium text-slate-700"
                  >
                    {Array.from({ length: dayCount }, (_, i) => i + 1).map(
                      (d) => (
                        <option key={d} value={d}>
                          {dayOptionLabel(d, selectedPlan.startDate)}
                        </option>
                      ),
                    )}
                  </select>
                )}
              </>
            ) : (
              Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setActiveDay(day)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold ${
                    activeDay === day
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  aria-label={`${day}일차`}
                >
                  {day}
                </button>
              ))
            )}
          </div>
        </aside>
      )}

    <aside
      className={`flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-200 max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-40 max-lg:shadow-xl max-lg:pt-[env(safe-area-inset-top)] max-lg:pb-[env(safe-area-inset-bottom)] ${
        sidebarCollapsed ? 'lg:hidden' : ''
      } ${open ? 'translate-x-0' : 'max-lg:-translate-x-full'}`}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-700">여행 계획</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex min-h-10 items-center gap-1 rounded-lg bg-primary-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-primary-700"
          >
            <Plus className="h-3.5 w-3.5" />
            새 계획
          </button>
          <button
            type="button"
            onClick={toggleSidebar}
            className="hidden h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 lg:flex"
            aria-label="메뉴 접기"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 lg:hidden"
              aria-label="여행 계획 닫기"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="border-b border-slate-100 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              새 여행 계획
            </span>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              type="text"
              placeholder="여행 제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              required
              disabled={isSubmitting}
            />

            <div className="relative">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="도시 검색 (예: 도쿄, 오사카)"
                  value={regionQuery}
                  onChange={(e) => {
                    setRegionQuery(e.target.value);
                    setSelectedRegion(null);
                  }}
                  className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-8 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  required
                  disabled={isSubmitting}
                />
                {searchingRegion && (
                  <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-primary-500" />
                )}
              </div>

              <p className="mt-1 text-[11px] text-slate-400">
                국가 &gt; 도시만 선택합니다. 세부 장소는 일정에서 추가하세요.
              </p>

              {selectedRegion && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-primary-700">
                  <MapPin className="h-3 w-3" />
                  선택됨: {selectedRegion.label}
                </p>
              )}

              {regionError && (
                <p className="mt-1 text-[11px] text-red-600">{regionError}</p>
              )}

              {regionResults.length > 0 && !selectedRegion && (
                <ul className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {regionResults.map((r) => (
                    <li key={r.googlePlaceId}>
                      <button
                        type="button"
                        onClick={() => pickRegion(r)}
                        className="flex w-full flex-col px-3 py-2 text-left hover:bg-primary-50"
                      >
                        <span className="text-sm font-medium text-slate-800">
                          {r.label}
                        </span>
                        <span className="truncate text-[11px] text-slate-400">
                          {r.address}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              required
              disabled={isSubmitting}
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              required
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              추가
            </button>
          </form>
        </div>
      )}

      <ul
        className={
          layoutMode === 'classic'
            ? 'max-h-48 shrink-0 overflow-y-auto p-2 lg:max-h-[42%]'
            : 'min-h-0 flex-1 overflow-y-auto p-2'
        }
      >
        {travelPlans.length === 0 ? (
          <li className="px-3 py-8 text-center text-sm text-slate-400">
            아직 여행 계획이 없습니다.
            <br />
            새 계획을 추가해 보세요.
          </li>
        ) : (
          travelPlans.map((plan) => {
            const owner = ownsListedPlan(plan, userId, selectedPlanId, myRole);
            return (
            <li key={plan.id}>
              <div
                className={`group mb-1 flex w-full items-start rounded-lg px-2 py-2.5 transition ${
                  selectedPlanId === plan.id
                    ? 'bg-primary-50 text-primary-800 ring-1 ring-primary-200'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    void selectPlan(plan.id);
                    setActiveDay(1);
                    onClose?.();
                  }}
                  className="min-w-0 flex-1 px-1 text-left"
                >
                  <p className="truncate text-sm font-medium">{plan.title}</p>
                  {plan.regionName && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-primary-600">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {plan.regionName}
                    </p>
                  )}
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                    <Calendar className="h-3 w-3 shrink-0" />
                    {plan.startDate} ~ {plan.endDate}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    장소 {(plan.places ?? []).length}개 · 배정{' '}
                    {(plan.dayAssignments ?? []).length}개
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setEmergencyPlan(plan)}
                  className="ml-0.5 shrink-0 rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                  aria-label={`${plan.regionName || plan.title} 비상 안내`}
                  title="비상 연락망"
                >
                  <ShieldAlert className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleRemovePlan(e, plan)}
                  className="shrink-0 rounded p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100"
                  aria-label={owner ? '여행 계획 삭제' : '여행에서 나가기'}
                  title={owner ? '계획 삭제' : '여행에서 나가기'}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
            );
          })
        )}
      </ul>

      {layoutMode === 'classic' && (
        <div className="hidden min-h-0 flex-1 flex-col border-t border-slate-200 lg:flex">
          <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            일자별 일정
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <DayAccordion onPickDay={onClose} />
          </div>
        </div>
      )}
    </aside>
    <EmergencyModal
      open={emergencyPlan != null}
      onClose={() => setEmergencyPlan(null)}
      regionName={emergencyPlan?.regionName || emergencyPlan?.title}
      lat={emergencyPlan?.regionLat ?? emergencyPlan?.places?.[0]?.lat}
      lng={emergencyPlan?.regionLng ?? emergencyPlan?.places?.[0]?.lng}
      placeName={[emergencyPlan?.regionName, emergencyPlan?.title]
        .filter(Boolean)
        .join(' ')}
    />
    </>
  );
}
