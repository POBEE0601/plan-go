// 2026-09-23 AI 대화 응답. 장소 카드와 메모 초안
import type { PlaceSearchResult } from './travel';

export interface AiChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AiPlacesAction {
  type: 'places';
  query: string;
  items: PlaceSearchResult[];
}

export interface AiMemoAction {
  type: 'memo';
  placeId: string;
  placeName: string;
  fromName: string;
  toName: string;
  draft: string;
}

export type AiAction = AiPlacesAction | AiMemoAction;

export interface AiChatResponse {
  reply: string;
  actions: AiAction[];
}
