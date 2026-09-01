// 2026-09-01 대시보드: 여행지 환율 표시
// 2026-09-01 일자 아코디언·단일 작업영역
// 2026-09-01 대시보드: 모바일 여행 목록 드로어 + 지도 오버레이
import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Compass,
  Loader2,
  UserPlus,
  X,
} from 'lucide-react';
import Header from '../components/Header';
import SidePanel from '../components/SidePanel';
import PlaceSearchBar from '../components/PlaceSearchBar';
import SquareMap from '../components/SquareMap';
import PlacePoolBoard from '../components/PlacePoolBoard';
import InviteModal from '../components/InviteModal';
import { useTravelStore } from '../store/useTravelStore';
import { usePlanUiStore } from '../store/usePlanUiStore';
import ExchangeRateBadge from '../components/ExchangeRateBadge';

export default function DashboardPage() {
  const {
    selectedPlan,
    selectedPlanId,
    myRole,
    isLoading,
    error,
    fetchTravelPlans,
    clearError,
  } = useTravelStore();
  const setActiveDay = usePlanUiStore((s) => s.setActiveDay);

  const [inviteOpen, setInviteOpen] = useState(false);
  // 지도는 기본 숨김 — 필요할 때만 표시
  const [mapVisible, setMapVisible] = useState(false);
  // 모바일에서만 사용하는 여행 목록 드로어
  const [plansOpen, setPlansOpen] = useState(false);
  const canWrite = myRole === 'owner' || myRole === 'editor';
  const isOwner = myRole === 'owner';

  useEffect(() => {
    fetchTravelPlans();
  }, [fetchTravelPlans]);

  useEffect(() => {
    setActiveDay(1);
  }, [selectedPlanId, setActiveDay]);

  useEffect(() => {
    if (!plansOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [plansOpen]);

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <Header
        onInvite={isOwner ? () => setInviteOpen(true) : undefined}
        onOpenPlans={() => setPlansOpen(true)}
        roleLabel={
          myRole === 'owner'
            ? '소유자'
            : myRole === 'editor'
              ? '쓰기'
              : myRole === 'viewer'
                ? '읽기'
                : undefined
        }
      />

      {error && (
        <div className="flex items-start justify-between gap-2 border-b border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:px-6">
          <div className="flex min-w-0 items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="break-words">{error}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="rounded p-1 hover:bg-red-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {plansOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            aria-label="여행 계획 닫기"
            onClick={() => setPlansOpen(false)}
          />
        )}
        <SidePanel open={plansOpen} onClose={() => setPlansOpen(false)} />

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {isLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center text-slate-400">
              <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary-500" />
              <p className="text-sm">여행 계획을 불러오는 중...</p>
            </div>
          ) : selectedPlan ? (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 sm:px-6 sm:py-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold text-slate-800 sm:text-lg">
                    {selectedPlan.title}
                  </h2>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 sm:text-sm">
                    {selectedPlan.regionName && (
                      <span className="text-primary-600">
                        {selectedPlan.regionName}
                      </span>
                    )}
                    <span>
                      {selectedPlan.startDate} ~ {selectedPlan.endDate}
                    </span>
                    <ExchangeRateBadge
                      lat={selectedPlan.regionLat}
                      lng={selectedPlan.regionLng}
                      placeName={[
                        selectedPlan.regionName,
                        selectedPlan.title,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    />
                    {!canWrite && (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                        읽기 전용
                      </span>
                    )}
                  </p>
                </div>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => setInviteOpen(true)}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-2.5 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100 sm:px-3"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span className="hidden sm:inline">초대</span>
                  </button>
                )}
              </div>

              <PlaceSearchBar
                canWrite={canWrite}
                mapVisible={mapVisible}
                onToggleMap={() => setMapVisible((v) => !v)}
              />

              <div className="relative flex min-h-0 flex-1 overflow-hidden">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <PlacePoolBoard canWrite={canWrite} />
                </div>
                {mapVisible && (
                  <SquareMap onClose={() => setMapVisible(false)} />
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-slate-400">
              <Compass className="mb-4 h-16 w-16 opacity-30" />
              <p className="text-base font-medium text-slate-500 sm:text-lg">
                여행 계획을 선택하거나 새로 만들어 보세요
              </p>
              <button
                type="button"
                onClick={() => setPlansOpen(true)}
                className="mt-4 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white lg:hidden"
              >
                여행 계획 보기
              </button>
            </div>
          )}
        </main>
      </div>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
