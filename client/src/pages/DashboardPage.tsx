// 2026-08-31 대시보드: 검색 상단 + 일정 메인 + 정사각 지도(선택)
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

export default function DashboardPage() {
  const {
    selectedPlan,
    myRole,
    isLoading,
    error,
    fetchTravelPlans,
    clearError,
  } = useTravelStore();

  const [inviteOpen, setInviteOpen] = useState(false);
  // 지도는 기본 숨김 — 필요할 때만 정사각으로 표시
  const [mapVisible, setMapVisible] = useState(false);
  const canWrite = myRole === 'owner' || myRole === 'editor';
  const isOwner = myRole === 'owner';

  useEffect(() => {
    fetchTravelPlans();
  }, [fetchTravelPlans]);

  return (
    <div className="flex h-screen flex-col">
      <Header
        onInvite={isOwner ? () => setInviteOpen(true) : undefined}
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
        <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
          <button
            type="button"
            onClick={clearError}
            className="rounded p-0.5 hover:bg-red-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <SidePanel />

        <main className="flex flex-1 flex-col overflow-hidden">
          {isLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center text-slate-400">
              <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary-500" />
              <p className="text-sm">여행 계획을 불러오는 중...</p>
            </div>
          ) : selectedPlan ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    {selectedPlan.title}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {selectedPlan.regionName && (
                      <span className="mr-2 text-primary-600">
                        {selectedPlan.regionName}
                      </span>
                    )}
                    {selectedPlan.startDate} ~ {selectedPlan.endDate}
                    {!canWrite && (
                      <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs">
                        읽기 전용
                      </span>
                    )}
                  </p>
                </div>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => setInviteOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100"
                  >
                    <UserPlus className="h-4 w-4" />
                    초대
                  </button>
                )}
              </div>

              <PlaceSearchBar
                canWrite={canWrite}
                mapVisible={mapVisible}
                onToggleMap={() => setMapVisible((v) => !v)}
              />

              <div className="flex min-h-0 flex-1 overflow-hidden">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <PlacePoolBoard canWrite={canWrite} />
                </div>
                {mapVisible && (
                  <SquareMap onClose={() => setMapVisible(false)} />
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-slate-400">
              <Compass className="mb-4 h-16 w-16 opacity-30" />
              <p className="text-lg font-medium text-slate-500">
                여행 계획을 선택하거나 새로 만들어 보세요
              </p>
            </div>
          )}
        </main>
      </div>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
