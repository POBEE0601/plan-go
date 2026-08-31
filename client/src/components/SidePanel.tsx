// 2026-08-31 여행 계획 생성 시 지역 선택 지원
import { useEffect, useState } from 'react';
import {
  Calendar,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useTravelStore } from '../store/useTravelStore';
import { placesApi } from '../utils/api';
import type { PlaceSearchResult } from '../types/travel';

export default function SidePanel() {
  const {
    travelPlans,
    selectedPlanId,
    selectPlan,
    addTravelPlan,
    deleteTravelPlan,
  } = useTravelStore();

  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [regionQuery, setRegionQuery] = useState('');
  const [regionResults, setRegionResults] = useState<PlaceSearchResult[]>([]);
  const [selectedRegion, setSelectedRegion] =
    useState<PlaceSearchResult | null>(null);
  const [searchingRegion, setSearchingRegion] = useState(false);
  const [regionError, setRegionError] = useState('');

  // 지역명 입력 후 짧은 디바운스로 자동 검색
  useEffect(() => {
    if (selectedRegion && regionQuery === selectedRegion.name) return;
    if (!regionQuery.trim() || regionQuery.trim().length < 2) {
      setRegionResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingRegion(true);
      setRegionError('');
      try {
        // "지역/도시" 검색 정확도를 위해 키워드 보강
        const data = await placesApi.search(`${regionQuery.trim()} 여행`);
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
      setRegionError('검색 결과에서 지역을 선택해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addTravelPlan({
        title: title.trim(),
        startDate,
        endDate,
        regionName: selectedRegion.name,
        regionLat: selectedRegion.lat,
        regionLng: selectedRegion.lng,
      });
      resetForm();
      setShowForm(false);
    } catch {
      // store에서 error 상태 처리
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('이 여행 계획을 삭제하시겠습니까?')) return;

    try {
      await deleteTravelPlan(id);
    } catch {
      // store에서 error 상태 처리
    }
  };

  const pickRegion = (region: PlaceSearchResult) => {
    setSelectedRegion(region);
    setRegionQuery(region.name);
    setRegionResults([]);
    setRegionError('');
  };

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-700">여행 계획</h2>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 rounded-lg bg-primary-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-primary-700"
        >
          <Plus className="h-3.5 w-3.5" />
          새 계획
        </button>
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
                  placeholder="지역명 검색 (예: 제주, 오사카)"
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

              {selectedRegion && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-primary-700">
                  <MapPin className="h-3 w-3" />
                  선택됨: {selectedRegion.name}
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
                          {r.name}
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

      <ul className="flex-1 overflow-y-auto p-2">
        {travelPlans.length === 0 ? (
          <li className="px-3 py-8 text-center text-sm text-slate-400">
            아직 여행 계획이 없습니다.
            <br />
            새 계획을 추가해 보세요.
          </li>
        ) : (
          travelPlans.map((plan) => (
            <li key={plan.id}>
              <button
                type="button"
                onClick={() => void selectPlan(plan.id)}
                className={`group mb-1 flex w-full items-start justify-between rounded-lg px-3 py-2.5 text-left transition ${
                  selectedPlanId === plan.id
                    ? 'bg-primary-50 text-primary-800 ring-1 ring-primary-200'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="min-w-0 flex-1">
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
                    장소 {(plan.places ?? []).length}개 · Day 배정{' '}
                    {(plan.dayAssignments ?? []).length}개
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, plan.id)}
                  className="ml-1 shrink-0 rounded p-1 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                  aria-label="여행 계획 삭제"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </button>
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}
