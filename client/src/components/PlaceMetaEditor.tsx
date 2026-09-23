// 2026-09-23 카테고리 이모지 프리셋에 커피잔·카페 음료 추가
// 2026-09-23 카테고리 창 오른쪽 닫기 버튼
// 2026-09-23 좁은 화면 카테고리 창은 하단 탭 위에 통째로 띄워 일정이 잘리지 않게
// 2026-09-23 저장 모달보다 카테고리 팝오버가 위에 오게
// 2026-09-23 커스텀 카테고리 추가·삭제, 팝오버를 body 포털로 표시
// 2026-09-22 일정 행: 카테고리·핀 색·한 줄 소개 (행 높이 고정)
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X } from 'lucide-react';
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  PIN_SWATCHES,
  categoryEmoji,
  categoryLabel,
  categoryMeta,
  resolvePinColor,
} from '../utils/days';
import { useTravelStore } from '../store/useTravelStore';
import type { Place } from '../types/travel';

const EMOJI_PRESETS = [
  '📌',
  '♨️',
  '🏨',
  '🚗',
  '✈️',
  '🏖️',
  '🎬',
  '🏥',
  '🌸',
  '☕',
  '🧋',
  '🍺',
  '🎿',
  '🎡',
  '🍜',
  '🏕️',
  '📸',
  '🎵',
];

interface PlaceMetaEditorProps {
  place: Place;
  canWrite: boolean;
}

export default function PlaceMetaEditor({
  place,
  canWrite,
}: PlaceMetaEditorProps) {
  const updatePlaceMeta = useTravelStore((s) => s.updatePlaceMeta);
  const addCustomCategory = useTravelStore((s) => s.addCustomCategory);
  const removeCustomCategory = useTravelStore((s) => s.removeCustomCategory);
  const customs =
    useTravelStore((s) => s.selectedPlan?.customCategories) ?? [];
  const [open, setOpen] = useState(false);
  const [intro, setIntro] = useState(place.memo ?? '');
  const [draftEmoji, setDraftEmoji] = useState('📌');
  const [draftLabel, setDraftLabel] = useState('');
  const [draftPin, setDraftPin] = useState<string>(PIN_SWATCHES[5]);
  const [adding, setAdding] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [asSheet, setAsSheet] = useState(false);
  const category = place.category;
  const color = resolvePinColor(place.category, place.pinColor);

  useEffect(() => {
    setIntro(place.memo ?? '');
  }, [place.id, place.memo]);

  useEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    const placeMenu = () => {
      const narrow = window.matchMedia('(max-width: 1023px)').matches;
      setAsSheet(narrow);
      if (narrow) {
        setMenuPos({ top: 0, left: 0 });
        return;
      }
      const el = boxRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const width = 256;
      const left = Math.min(
        Math.max(8, rect.left),
        window.innerWidth - width - 8,
      );
      const menuH = Math.min(menuRef.current?.scrollHeight ?? 420, 480);
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const top =
        spaceBelow >= menuH || spaceBelow >= rect.top
          ? rect.bottom + 6
          : Math.max(8, rect.top - 6 - menuH);
      setMenuPos({ top, left });
    };
    placeMenu();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (boxRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener('resize', placeMenu);
    document.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('resize', placeMenu);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  const saveIntro = () => {
    const next = intro.trim();
    if (next === (place.memo ?? '')) return;
    void updatePlaceMeta(place.id, { memo: next });
  };

  const setCategory = (next: string) => {
    const prevDefault = categoryMeta(place.category).pinColor;
    const keepCustom = place.pinColor && place.pinColor !== prevDefault;
    void updatePlaceMeta(place.id, {
      category: next,
      pinColor: keepCustom ? place.pinColor : categoryMeta(next).pinColor,
    });
  };

  const handleAddCustom = async () => {
    const label = draftLabel.trim();
    if (!label || adding) return;
    setAdding(true);
    try {
      const created = await addCustomCategory({
        emoji: draftEmoji,
        label,
        pinColor: draftPin,
      });
      if (created) {
        void updatePlaceMeta(place.id, {
          category: created.id,
          pinColor: created.pinColor,
        });
        setDraftLabel('');
      }
    } finally {
      setAdding(false);
    }
  };

  return (
    <div ref={boxRef} className="relative min-w-0">
      <div className="flex min-w-0 items-center gap-1">
        <button
          type="button"
          disabled={!canWrite}
          onClick={(e) => {
            e.stopPropagation();
            if (canWrite) setOpen((v) => !v);
          }}
          className="flex h-7 shrink-0 items-center gap-0.5 rounded-md px-1 text-sm hover:bg-slate-100 disabled:hover:bg-transparent"
          title={`${categoryLabel(category)} · 핀 색 변경`}
          aria-label="카테고리와 핀 색 설정"
        >
          <span>{categoryEmoji(category)}</span>
        </button>
        {canWrite ? (
          <input
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            onBlur={saveIntro}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="한 줄 소개"
            className="h-5 min-w-0 flex-1 border-0 bg-transparent px-0 text-[11px] leading-5 text-slate-500 outline-none placeholder:text-slate-300"
          />
        ) : (
          <p className="h-5 min-w-0 flex-1 truncate text-[11px] leading-5 text-slate-400">
            {place.memo || ' '}
          </p>
        )}
      </div>

      {open &&
        canWrite &&
        menuPos &&
        createPortal(
          <>
          {asSheet && (
            <button
              type="button"
              className="fixed inset-0 z-[90] bg-slate-900/40"
              aria-label="카테고리 닫기"
              onClick={() => setOpen(false)}
            />
          )}
          <div
            ref={menuRef}
            className={
              asSheet
                ? 'fixed inset-x-0 z-[91] max-h-[min(36rem,calc(100svh-7.5rem))] overflow-y-auto overscroll-contain rounded-t-2xl border-t border-slate-200 bg-white p-3 pb-4 shadow-lg bottom-[calc(env(safe-area-inset-bottom)+3rem)]'
                : 'fixed z-[90] max-h-[min(30rem,calc(100svh-1rem))] w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg'
            }
            style={asSheet ? undefined : { top: menuPos.top, left: menuPos.left }}
            onClick={(e) => e.stopPropagation()}
          >
          <div className="mb-1 flex items-center justify-between px-1">
            <p className="text-[10px] font-semibold text-slate-400">카테고리</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-7 items-center gap-0.5 rounded-lg px-1.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100"
              aria-label="카테고리 창 닫기"
            >
              <X className="h-3.5 w-3.5" />
              닫기
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {CATEGORY_ORDER.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-lg px-1.5 py-1 text-[11px] ${
                  category === cat
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {CATEGORY_META[cat].emoji} {CATEGORY_META[cat].label}
              </button>
            ))}
          </div>

          {customs.length > 0 && (
            <>
              <p className="px-1 pb-1 pt-2 text-[10px] font-semibold text-slate-400">
                내 카테고리
              </p>
              <div className="flex flex-wrap gap-1">
                {customs.map((cat) => (
                  <span
                    key={cat.id}
                    className={`inline-flex items-center rounded-lg text-[11px] ${
                      category === cat.id
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className="px-1.5 py-1"
                    >
                      {cat.emoji} {cat.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeCustomCategory(cat.id)}
                      className={`pr-1 ${
                        category === cat.id
                          ? 'text-white/80 hover:text-white'
                          : 'text-slate-400 hover:text-red-500'
                      }`}
                      aria-label={`${cat.label} 삭제`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </>
          )}

          <p className="px-1 pb-1 pt-2 text-[10px] font-semibold text-slate-400">
            커스텀 추가
          </p>
          <div className="mb-1.5 flex flex-wrap gap-1 px-1">
            {EMOJI_PRESETS.map((emo) => (
              <button
                key={emo}
                type="button"
                onClick={() => setDraftEmoji(emo)}
                className={`h-6 w-6 rounded text-sm ${
                  draftEmoji === emo
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                {emo}
              </button>
            ))}
          </div>
          <div className="mb-1.5 flex items-center gap-1 px-1">
            <input
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleAddCustom();
                }
              }}
              maxLength={20}
              placeholder="이름 (온천, 숙소…)"
              className="h-7 min-w-0 flex-1 rounded-lg border border-slate-200 px-2 text-[11px] outline-none focus:border-primary-400"
            />
            <button
              type="button"
              disabled={!draftLabel.trim() || adding}
              onClick={() => void handleAddCustom()}
              className="flex h-7 items-center gap-0.5 rounded-lg bg-slate-800 px-2 text-[11px] font-medium text-white disabled:opacity-40"
            >
              <Plus className="h-3 w-3" />
              추가
            </button>
          </div>
          <div className="mb-1 flex flex-wrap gap-1.5 px-1">
            {PIN_SWATCHES.map((swatch) => (
              <button
                key={`draft-${swatch}`}
                type="button"
                onClick={() => setDraftPin(swatch)}
                className={`h-4 w-4 rounded-full ${
                  draftPin.toLowerCase() === swatch.toLowerCase()
                    ? 'ring-2 ring-offset-1 ring-slate-800'
                    : 'ring-1 ring-slate-200'
                }`}
                style={{ backgroundColor: swatch }}
                aria-label={`커스텀 핀 색 ${swatch}`}
              />
            ))}
          </div>

          <p className="px-1 pb-1 pt-2 text-[10px] font-semibold text-slate-400">
            핀 색
          </p>
          <div className="flex flex-wrap gap-1.5 px-1">
            {PIN_SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() =>
                  void updatePlaceMeta(place.id, { pinColor: swatch })
                }
                className={`h-5 w-5 rounded-full ${
                  color.toLowerCase() === swatch.toLowerCase()
                    ? 'ring-2 ring-offset-1 ring-slate-800'
                    : 'ring-1 ring-slate-200'
                }`}
                style={{ backgroundColor: swatch }}
                aria-label={`핀 색 ${swatch}`}
              />
            ))}
          </div>
          </div>
          </>,
          document.body,
        )}
    </div>
  );
}
