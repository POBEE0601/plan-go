// 2026-10-21 확인된 줄만 일정에 넣는다. 좌표는 다시 검색한 결과만 쓴다
import {
  addPlace,
  assignPlaceToDay,
  canWrite,
  getTravelPlanById,
} from '../db/database.js';
import type { ItineraryApplyResult, ItineraryApplyRow, Place } from '../types/travel.js';
import { getDayCount } from '../utils/days.js';
import { searchPlaces } from './googlePlaces.js';

const MAX_ROWS = 30;

const normalizeTime = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '';
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return '';
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const asRow = (value: unknown): ItineraryApplyRow | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 80) : '';
  const dayIndex = Number(raw.dayIndex);
  if (!name || !Number.isInteger(dayIndex)) return null;
  const memo = typeof raw.memo === 'string' ? raw.memo.trim().slice(0, 200) : '';
  const googlePlaceId =
    typeof raw.googlePlaceId === 'string' ? raw.googlePlaceId.trim().slice(0, 200) : '';
  return {
    dayIndex,
    time: normalizeTime(raw.time),
    name,
    memo,
    googlePlaceId: googlePlaceId || undefined,
  };
};

export const applyItineraryRows = async (
  planId: string,
  userId: string,
  rawRows: unknown,
): Promise<ItineraryApplyResult> => {
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    throw new Error('넣을 일정이 없습니다.');
  }
  if (rawRows.length > MAX_ROWS) {
    throw new Error('한 번에 30줄까지만 넣을 수 있습니다.');
  }
  const plan = await getTravelPlanById(planId, userId, { hydratePhotos: false });
  if (!plan) throw new Error('여행 계획을 찾을 수 없습니다.');
  if (!canWrite(plan, userId)) throw new Error('일정을 수정할 권한이 없습니다.');

  const maxDay = getDayCount(plan.startDate, plan.endDate);
  const missed: string[] = [];
  let added = 0;
  let places: Place[] = plan.places;

  for (const value of rawRows) {
    const row = asRow(value);
    if (!row || row.dayIndex < 1 || row.dayIndex > maxDay) {
      const name = row?.name;
      if (name) missed.push(name);
      continue;
    }
    let hit: Awaited<ReturnType<typeof searchPlaces>>[number] | undefined;
    try {
      const found = await searchPlaces(row.name, plan.regionLat, plan.regionLng);
      hit =
        found.find((item) => item.googlePlaceId === row.googlePlaceId) ?? found[0];
    } catch {
      missed.push(row.name);
      continue;
    }
    if (!hit) {
      missed.push(row.name);
      continue;
    }
    let place = places.find((item) => item.googlePlaceId === hit?.googlePlaceId);
    if (!place) {
      try {
        const created = await addPlace(planId, userId, {
          googlePlaceId: hit.googlePlaceId,
          name: hit.name,
          address: hit.address,
          lat: hit.lat,
          lng: hit.lng,
          category: hit.category,
          rating: hit.rating,
          photoReference: hit.photoReference,
          types: hit.types,
        });
        place = created ?? undefined;
      } catch (err) {
        const message = err instanceof Error ? err.message : '';
        if (!message.includes('이미')) {
          missed.push(row.name);
          continue;
        }
        const fresh = await getTravelPlanById(planId, userId, {
          hydratePhotos: false,
        });
        places = fresh?.places ?? places;
        place = places.find((item) => item.googlePlaceId === hit?.googlePlaceId);
      }
    }
    if (!place) {
      missed.push(row.name);
      continue;
    }
    if (!places.some((item) => item.id === place?.id)) {
      places = [...places, place];
    }
    const assigned = await assignPlaceToDay(
      planId,
      userId,
      place.id,
      row.dayIndex,
      row.time || undefined,
      row.memo || undefined,
    );
    if (!assigned) {
      missed.push(row.name);
      continue;
    }
    added += 1;
  }

  return { added, missed };
};
