// 2026-09-23 AI 화면에 하단 홈바를 다시 두고, 말풍선은 둥근 유리처럼
// 2026-09-23 제미나이 Neural Expressive 대화 화면
// 2026-09-23 AI 대화: 사용법, 장소 선택 추가, 이동 메모 초안
import { useEffect, useRef, useState } from 'react';
import { SendHorizontal } from 'lucide-react';
import Header from '../components/Header';
import GeminiMark from '../components/GeminiMark';
import MobileTabBar from '../components/MobileTabBar';
import MobileTopBar from '../components/MobileTopBar';
import { useAuthStore } from '../store/useAuthStore';
import { useTravelStore } from '../store/useTravelStore';
import type { AiAction, AiMemoAction, AiPlacesAction } from '../types/ai';
import type { PlaceSearchResult } from '../types/travel';
import { travelApi, aiApi } from '../utils/api';
import { categoryLabel, dayOptionLabel, getDayCount } from '../utils/days';

interface ChatItem {
  id: string;
  role: 'user' | 'model';
  text: string;
  actions?: AiAction[];
}

const newId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function AiPage() {
  const travelPlans = useTravelStore((s) => s.travelPlans);
  const selectedPlan = useTravelStore((s) => s.selectedPlan);
  const selectedPlanId = useTravelStore((s) => s.selectedPlanId);
  const myRole = useTravelStore((s) => s.myRole);
  const fetchTravelPlans = useTravelStore((s) => s.fetchTravelPlans);
  const selectPlan = useTravelStore((s) => s.selectPlan);
  const refreshSelectedPlan = useTravelStore((s) => s.refreshSelectedPlan);
  const canWrite = myRole === 'owner' || myRole === 'editor';
  const userName = useAuthStore((s) => s.user?.name);

  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const prevPlanId = useRef<string | null>(null);

  useEffect(() => {
    if (travelPlans.length === 0) void fetchTravelPlans();
  }, [fetchTravelPlans, travelPlans.length]);

  useEffect(() => {
    if (prevPlanId.current && prevPlanId.current !== selectedPlanId) {
      setMessages([]);
    }
    prevPlanId.current = selectedPlanId;
  }, [selectedPlanId]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || pending) return;
    const next: ChatItem[] = [
      ...messages,
      { id: newId(), role: 'user', text },
    ];
    setMessages(next);
    setInput('');
    setPending(true);
    try {
      const result = await aiApi.chat({
        planId: selectedPlanId ?? undefined,
        messages: next.map((item) => ({ role: item.role, text: item.text })),
      });
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: 'model',
          text: result.reply,
          actions: result.actions,
        },
      ]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'AI 응답을 받지 못했습니다.';
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: 'model', text: message },
      ]);
    } finally {
      setPending(false);
    }
  };

  const suggestions = buildSuggestions(selectedPlan?.regionName, selectedPlan?.places.length ?? 0);

  return (
    <div className={`gemini-shell flex h-svh flex-col overflow-hidden ${pending ? 'is-thinking' : ''}`}>
      <div className="gemini-aurora" aria-hidden />
      <div className="hidden lg:block">
        <Header />
      </div>
      <MobileTopBar title="Plan AI" meta={<span className="truncate">{selectedPlan?.title ?? '여행 도우미'}</span>} />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="gemini-toolbar">
          <label className="shrink-0" htmlFor="ai-plan">
            여행
          </label>
          <select
            id="ai-plan"
            value={selectedPlanId ?? ''}
            onChange={(e) => {
              if (e.target.value) void selectPlan(e.target.value);
            }}
          >
            {travelPlans.length === 0 && <option value="">여행 없음</option>}
            {travelPlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.title}
              </option>
            ))}
          </select>
          {selectedPlan && !canWrite && <span className="gemini-readonly">읽기 전용</span>}
        </div>

        <div
          ref={listRef}
          className={`gemini-thread ${messages.length === 0 ? 'is-empty' : ''}`}
        >
          {messages.length === 0 && (
            <div className="gemini-hero">
              <GeminiMark className="gemini-hero-mark" />
              <h2>안녕하세요{userName ? `, ${userName}` : ''}</h2>
              <p>장소, 이동, 사용법을 물어보세요.</p>
              <div className="gemini-chips">
                {suggestions.map((item) => (
                  <button key={item} type="button" onClick={() => void send(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="gemini-column">
            {messages.map((item) =>
              item.role === 'user' ? (
                <div key={item.id} className="gemini-user">
                  <p>{item.text}</p>
                </div>
              ) : (
                <div key={item.id} className="gemini-model">
                  <GeminiMark className="mt-0.5 h-6 w-6 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="gemini-prose">{item.text}</p>
                    {item.actions?.map((action, index) =>
                      action.type === 'places' ? (
                        <PlacesCard
                          key={`${item.id}-places-${index}`}
                          action={action}
                          canWrite={canWrite}
                          planId={selectedPlan?.id ?? null}
                          startDate={selectedPlan?.startDate}
                          endDate={selectedPlan?.endDate}
                          onChanged={refreshSelectedPlan}
                        />
                      ) : (
                        <MemoCard
                          key={`${item.id}-memo-${index}`}
                          action={action}
                          canWrite={canWrite}
                          planId={selectedPlan?.id ?? null}
                          places={selectedPlan?.places ?? []}
                          onChanged={refreshSelectedPlan}
                        />
                      ),
                    )}
                  </div>
                </div>
              ),
            )}

            {pending && (
              <div className="gemini-model">
                <GeminiMark className="gemini-spin h-6 w-6 shrink-0" />
                <p className="gemini-muted">생각 중</p>
              </div>
            )}
          </div>
        </div>

        <form
          className="gemini-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            placeholder="Plan AI에게 물어보기"
          />
          <button type="submit" disabled={pending || !input.trim()} aria-label="보내기">
            <SendHorizontal className="h-4 w-4" />
          </button>
        </form>
      </div>
      <MobileTabBar />
    </div>
  );
}

const buildSuggestions = (regionName?: string, placeCount = 0): string[] => {
  const items = [
    '장소를 일정에 어떻게 넣나요?',
    '메모는 어디서 바꾸나요?',
  ];
  if (regionName) items.unshift(`${regionName} 근처 맛집`);
  if (placeCount >= 2) items.unshift('등록한 장소 사이 이동 방법을 알려줘');
  return items.slice(0, 4);
};

function PlacesCard({
  action,
  canWrite,
  planId,
  startDate,
  endDate,
  onChanged,
}: {
  action: AiPlacesAction;
  canWrite: boolean;
  planId: string | null;
  startDate?: string;
  endDate?: string;
  onChanged: () => Promise<void>;
}) {
  const dayCount =
    startDate && endDate ? getDayCount(startDate, endDate) : 1;
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [dayIndex, setDayIndex] = useState(1);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const selected = action.items.filter((item) => picked[item.googlePlaceId]);

  const addSelected = async () => {
    if (!planId || !canWrite || selected.length === 0 || busy) return;
    setBusy(true);
    setNote(null);
    const added: string[] = [];
    const failed: string[] = [];
    try {
      const plan = await travelApi.getPlan(planId);
      for (const item of selected) {
        try {
          const placeId = await ensurePlace(planId, plan.places, item);
          const assigned = plan.dayAssignments.some(
            (row) => row.placeId === placeId && row.dayIndex === dayIndex,
          );
          if (!assigned) {
            const created = await travelApi.assignDay(planId, {
              placeId,
              dayIndex,
            });
            plan.dayAssignments.push(created);
          }
          const stored = plan.places.find((place) => place.id === placeId);
          if (!stored) {
            plan.places.push({
              id: placeId,
              planId,
              googlePlaceId: item.googlePlaceId,
              name: item.name,
              address: item.address,
              lat: item.lat,
              lng: item.lng,
              category: item.category,
            });
          }
          added.push(item.name);
        } catch {
          failed.push(item.name);
        }
      }
      await onChanged();
      const dayLabel = startDate
        ? dayOptionLabel(dayIndex, startDate)
        : `${dayIndex}일차`;
      setNote(
        [
          added.length ? `${added.length}곳을 ${dayLabel}에 넣었습니다.` : '',
          failed.length ? `실패: ${failed.join(', ')}` : '',
        ]
          .filter(Boolean)
          .join(' '),
      );
      if (failed.length === 0) setPicked({});
    } catch (err) {
      setNote(err instanceof Error ? err.message : '일정에 넣지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gemini-card">
      <p className="gemini-kicker">검색 · {action.query}</p>
      <ul className="mt-2 space-y-2">
        {action.items.length === 0 && (
          <li className="gemini-muted text-sm">검색 결과가 없습니다.</li>
        )}
        {action.items.map((item) => (
          <li key={item.googlePlaceId}>
            <label className="gemini-place">
              <input
                type="checkbox"
                className="mt-1"
                checked={Boolean(picked[item.googlePlaceId])}
                onChange={(e) =>
                  setPicked((prev) => ({
                    ...prev,
                    [item.googlePlaceId]: e.target.checked,
                  }))
                }
                disabled={!canWrite}
              />
              {item.photoUrl ? (
                <img
                  src={item.photoUrl}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="h-12 w-12 shrink-0 rounded-lg gemini-photo" />
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{item.name}</span>
                <span className="gemini-muted block text-[11px]">
                  {categoryLabel(item.category)}
                  {item.rating != null ? ` · ${item.rating.toFixed(1)}` : ''}
                </span>
                <span className="gemini-muted block truncate text-[11px]">
                  {item.address}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {canWrite && action.items.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <select
            value={dayIndex}
            onChange={(e) => setDayIndex(Number(e.target.value))}
            className="gemini-field h-9 min-w-0 flex-1 px-3 text-sm"
            aria-label="추가할 날짜"
          >
            {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => (
              <option key={day} value={day}>
                {startDate ? dayOptionLabel(day, startDate) : `${day}일차`}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void addSelected()}
            disabled={busy || selected.length === 0}
            className="gemini-action"
          >
            {busy ? '추가 중' : `${selected.length}곳 추가`}
          </button>
        </div>
      )}
      {note && <p className="gemini-muted mt-2 text-xs">{note}</p>}
    </div>
  );
}

const ensurePlace = async (
  planId: string,
  places: { id: string; googlePlaceId?: string; name: string }[],
  item: PlaceSearchResult,
): Promise<string> => {
  const existing = places.find(
    (place) =>
      place.googlePlaceId === item.googlePlaceId || place.name === item.name,
  );
  if (existing) return existing.id;
  const created = await travelApi.addPlace(planId, {
    googlePlaceId: item.googlePlaceId,
    name: item.name,
    address: item.address,
    lat: item.lat,
    lng: item.lng,
    category: item.category,
    rating: item.rating,
    photoUrl: item.photoUrl,
    types: item.types,
  });
  places.push(created);
  return created.id;
};

function MemoCard({
  action,
  canWrite,
  planId,
  places,
  onChanged,
}: {
  action: AiMemoAction;
  canWrite: boolean;
  planId: string | null;
  places: { id: string; name: string; memo?: string }[];
  onChanged: () => Promise<void>;
}) {
  const [placeId, setPlaceId] = useState(action.placeId);
  const [draft, setDraft] = useState(action.draft);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const save = async () => {
    if (!planId || !canWrite || !draft.trim() || busy) return;
    const target = places.find((place) => place.id === placeId);
    if (!target) {
      setNote('메모를 넣을 장소를 일정에서 찾지 못했습니다.');
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const existing = target.memo?.trim() ?? '';
      const text = draft.trim();
      const next =
        existing && !existing.includes(text) ? `${existing}\n${text}` : existing || text;
      await travelApi.updatePlace(planId, placeId, { memo: next });
      await onChanged();
      setSaved(true);
      setNote(`${target.name} 메모에 추가했습니다.`);
    } catch (err) {
      setNote(err instanceof Error ? err.message : '메모를 저장하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gemini-card">
      <p className="gemini-kicker">
        {action.fromName} → {action.toName}
      </p>
      <label className="gemini-muted mt-2 block text-[11px]" htmlFor={`memo-${action.placeId}`}>
        이 장소 메모에 이어 붙입니다
      </label>
      <select
        id={`memo-${action.placeId}`}
        value={placeId}
        onChange={(e) => setPlaceId(e.target.value)}
        disabled={!canWrite || saved}
        className="gemini-field mt-1 h-9 w-full px-3 text-sm"
      >
        {places.map((place) => (
          <option key={place.id} value={place.id}>
            {place.name}
          </option>
        ))}
      </select>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        readOnly={!canWrite || saved}
        rows={6}
        className="gemini-field mt-2 w-full px-3 py-2 text-sm leading-5"
      />
      {canWrite && (
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy || saved || !draft.trim()}
          className="gemini-action mt-2"
        >
          {saved ? '추가됨' : busy ? '저장 중' : '메모에 추가'}
        </button>
      )}
      {note && <p className="gemini-muted mt-2 text-xs">{note}</p>}
    </div>
  );
}
