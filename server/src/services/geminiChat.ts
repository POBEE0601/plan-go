// 2026-09-23 Gemini는 기존 장소 검색·길찾기만 호출하고, 저장은 하지 않는다
import type { Place, TravelPlan } from '../types/travel.js';
import { searchPlaces } from './googlePlaces.js';
import {
  getRouteDetails,
  type RouteDetail,
} from './googleDirections.js';

export interface AiTurn {
  role: 'user' | 'model';
  text: string;
}

export interface AiPlacesAction {
  type: 'places';
  query: string;
  items: Awaited<ReturnType<typeof searchPlaces>>;
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

interface GeminiPart {
  text?: string;
  thought?: boolean;
  functionCall?: {
    name?: string;
    args?: Record<string, unknown> | string;
    id?: string;
  };
  functionResponse?: unknown;
  thoughtSignature?: string;
}

interface GeminiContent {
  role?: string;
  parts?: GeminiPart[];
}

interface GeminiResponse {
  candidates?: { content?: GeminiContent; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
}

const APP_GUIDE = [
  'plan-go 사용법:',
  '- 여행 계획은 국가·도시만 고른다. 공항·숙소·맛집 같은 세부 장소는 일정 화면에서 추가한다.',
  '- 여행 홈: 지도와 장소 검색. 돋보기로 검색한 뒤 결과에서 원하는 날에 추가한다.',
  '- 일정 탭: 날짜별 장소. 장소를 누르면 한 줄 소개(메모), 카테고리, 핀 색을 바꾼다.',
  '- 저장 탭: 여행에 담아 둔 장소 목록.',
  '- 게시판: 글 목록. 도구 탭: 초대, 공지, 테마, 로그아웃.',
  '- 준비·비상은 여행 홈과 일정 제목 옆에 있다.',
  '- 소유자만 멤버를 초대할 수 있고, 권한은 편집 또는 읽기다.',
  '- AI 화면: 맛집·장소를 물으면 검색 카드가 나오고, 고른 것만 일정에 넣는다. 두 장소의 이동을 물으면 출발 장소 메모 초안이 나오며, 확인해야 저장된다.',
].join('\n');

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'search_places',
        description:
          '여행 지역 근처의 실제 장소를 Google Places로 검색한다. 맛집·카페·관광지·쇼핑을 물을 때 호출한다. 결과를 지어내지 않는다.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: {
              type: 'STRING',
              description: '검색어. 예: 롯폰기 맛집',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_route',
        description:
          '계획에 등록된 두 장소 사이의 이동 방법을 조회한다. 출발 장소 메모 초안은 서버가 만든다. place id는 계획 맥락에 있는 값만 쓴다.',
        parameters: {
          type: 'OBJECT',
          properties: {
            fromPlaceId: {
              type: 'STRING',
              description: '출발 장소 id',
            },
            toPlaceId: {
              type: 'STRING',
              description: '도착 장소 id',
            },
          },
          required: ['fromPlaceId', 'toPlaceId'],
        },
      },
    ],
  },
];

// 2026-09-23 신규 키는 gemini-3.6-flash 만 받는다
const getModel = (): string =>
  process.env.GEMINI_MODEL?.trim() || 'gemini-3.6-flash';

const planContext = (plan: TravelPlan | null): string => {
  if (!plan) {
    return '선택된 여행 계획이 없다. 사용법 질문만 답하고, 장소 검색·이동은 계획을 고르라고 안내한다.';
  }

  const places = plan.places.slice(0, 80).map((place) => {
    const memo = place.memo ? ` | 메모: ${place.memo.slice(0, 80)}` : '';
    return `- id=${place.id} | ${place.name} | ${place.address}${memo}`;
  });
  const days = plan.dayAssignments.slice(0, 80).map((row) => {
    const name =
      plan.places.find((place) => place.id === row.placeId)?.name ?? row.placeId;
    return `- ${row.dayIndex}일차 | ${name} | placeId=${row.placeId}`;
  });

  return [
    `여행: ${plan.title}`,
    `기간: ${plan.startDate} ~ ${plan.endDate}`,
    plan.regionName
      ? `지역: ${plan.regionName} (${plan.regionLat ?? ''}, ${plan.regionLng ?? ''})`
      : '지역: 없음',
    places.length ? `장소:\n${places.join('\n')}` : '장소: 없음',
    days.length ? `일정:\n${days.join('\n')}` : '일정: 없음',
  ].join('\n');
};

const findPlace = (places: Place[], token: string): Place | 'ambiguous' | null => {
  const raw = token.trim();
  if (!raw) return null;
  const byId = places.find((place) => place.id === raw);
  if (byId) return byId;

  const q = raw.toLowerCase();
  const hits = places.filter((place) => {
    const name = place.name.toLowerCase();
    return name === q || name.includes(q) || q.includes(name);
  });
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) return 'ambiguous';
  return null;
};

const formatRouteDraft = (
  fromName: string,
  toName: string,
  route: RouteDetail,
): string => {
  const lines = [`${fromName} → ${toName}`];
  const meta = [route.label, route.durationText, route.distanceText]
    .filter(Boolean)
    .join(' · ');
  if (meta) lines.push(meta);
  route.steps.slice(0, 10).forEach((step, index) => {
    const transit = step.transit
      ? ` (${step.transit.lineName} ${step.transit.departureStop} → ${step.transit.arrivalStop})`
      : '';
    const time = step.durationText ? ` · ${step.durationText}` : '';
    lines.push(`${index + 1}. ${step.instruction}${transit}${time}`.trim());
  });
  if (!route.steps.length && route.failReason) lines.push(route.failReason);
  if (route.mapsUrl) lines.push(route.mapsUrl);
  return lines.join('\n').slice(0, 1800);
};

const parseArgs = (args: unknown): Record<string, unknown> => {
  if (!args) return {};
  if (typeof args === 'string') {
    try {
      const parsed = JSON.parse(args) as unknown;
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  if (typeof args === 'object') return args as Record<string, unknown>;
  return {};
};

const asText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const chatWithGemini = async (input: {
  plan: TravelPlan | null;
  messages: AiTurn[];
}): Promise<{ reply: string; actions: AiAction[] }> => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다. server/.env에 넣어 주세요.');
  }

  const system = [
    '너는 plan-go 여행 도우미다. 한국어로 짧게 답한다.',
    '앱 사용법은 안내문에 있는 내용만 말한다.',
    '장소 이름, 주소, 평점, 이동 시간, 노선은 도구 결과에만 있는 값을 말한다.',
    '맛집·카페·관광·쇼핑을 물으면 search_places를 호출한다. 호출 전에는 가게 이름을 말하지 않는다.',
    '두 장소의 이동을 물으면 get_route를 호출한다. 장소가 여러 개로 보이면 id를 고르지 말고 사용자에게 물어본다.',
    '저장은 하지 않는다. 검색 결과와 이동 초안은 화면 카드로 사용자가 확인한다.',
    APP_GUIDE,
    planContext(input.plan),
  ].join('\n\n');

  const contents: GeminiContent[] = input.messages.map((message) => ({
    role: message.role,
    parts: [{ text: message.text.slice(0, 2000) }],
  }));

  const actions: AiAction[] = [];
  let reply = '';

  for (let round = 0; round < 4; round += 1) {
    const data = await generate(apiKey, system, contents);
    const content = data.candidates?.[0]?.content;
    const parts = content?.parts ?? [];
    const calls = parts.filter((part) => part.functionCall?.name);
    const text = parts
      .filter((part) => !part.thought && part.text)
      .map((part) => part.text ?? '')
      .join('')
      .trim();

    if (calls.length === 0) {
      reply = text;
      break;
    }

    contents.push(content ?? { role: 'model', parts });
    const responses: GeminiPart[] = [];
    for (const part of calls) {
      const name = part.functionCall?.name ?? '';
      const args = parseArgs(part.functionCall?.args);
      const outcome = await runTool(input.plan, name, args);
      if (outcome.action) {
        const index = actions.findIndex((item) => item.type === outcome.action?.type);
        if (index >= 0) actions.splice(index, 1);
        actions.push(outcome.action);
      }
      responses.push({
        functionResponse: {
          name,
          ...(part.functionCall?.id ? { id: part.functionCall.id } : {}),
          response: outcome.forModel,
        },
      });
    }
    contents.push({ role: 'user', parts: responses });
    if (text) reply = text;
  }

  const places = actions.find((item) => item.type === 'places');
  const memo = actions.find((item) => item.type === 'memo');
  if (!reply) {
    if (memo && memo.type === 'memo') {
      reply = `${memo.fromName}에서 ${memo.toName}까지 이동 초안입니다. 확인하면 출발 장소 메모에 추가됩니다.`;
    } else if (places && places.type === 'places') {
      reply = `"${places.query}" 검색 결과입니다. 일정에 넣을 장소만 고르세요.`;
    } else {
      reply = '답변을 만들지 못했습니다. 다시 물어봐 주세요.';
    }
  }

  return { reply, actions };
};

const toUserError = (err: unknown): Error => {
  const message = err instanceof Error ? err.message : '';
  if (/prepayment credits are depleted|billing/i.test(message)) {
    return new Error(
      '이 키는 선불 결제가 연결된 프로젝트인데 잔액이 없습니다. 무료로 쓰려면 결제 계정이 없는 AI Studio 프로젝트에서 키를 새로 발급해 넣어 주세요.',
    );
  }
  if (/no longer available/i.test(message)) {
    return new Error(
      '이 Gemini 모델은 새 키에서 쓸 수 없습니다. 모델은 gemini-3.6-flash를 사용합니다.',
    );
  }
  if (err instanceof Error && message) return err;
  return new Error('Gemini 요청에 실패했습니다.');
};

const generate = async (
  apiKey: string,
  system: string,
  contents: GeminiContent[],
): Promise<GeminiResponse> => {
  const model = getModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const base = {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    tools: TOOLS,
    toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
  };

  // 2026-09-23 thinkingBudget: 0 은 무료 키에서 선불 소진 오류로 떨어진다
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        ...base,
        generationConfig: { maxOutputTokens: 1024 },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await res.json()) as GeminiResponse;
    if (!res.ok) {
      const message = data.error?.message ?? `Gemini 요청 실패 (${res.status})`;
      const error = new Error(message);
      (error as Error & { status?: number }).status = res.status;
      throw error;
    }
    if (data.promptFeedback?.blockReason) {
      throw new Error('이 질문은 답변할 수 없습니다.');
    }
    if (!data.candidates?.length) {
      throw new Error('Gemini가 빈 응답을 반환했습니다.');
    }
    return data;
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new Error('Gemini 응답이 지연되고 있습니다. 잠시 후 다시 시도하세요.');
    }
    throw toUserError(err);
  }
};

const runTool = async (
  plan: TravelPlan | null,
  name: string,
  args: Record<string, unknown>,
): Promise<{ forModel: Record<string, unknown>; action?: AiAction }> => {
  if (name === 'search_places') return searchTool(plan, asText(args.query));
  if (name === 'get_route') {
    return routeTool(plan, asText(args.fromPlaceId), asText(args.toPlaceId));
  }
  return { forModel: { error: '알 수 없는 도구입니다.' } };
};

const searchTool = async (
  plan: TravelPlan | null,
  query: string,
): Promise<{ forModel: Record<string, unknown>; action?: AiAction }> => {
  const text = query.slice(0, 80);
  if (!text) return { forModel: { error: '검색어가 없습니다.' } };
  if (!plan) {
    return { forModel: { error: '여행 계획을 먼저 선택해야 장소를 검색할 수 있습니다.' } };
  }

  const lat = plan.regionLat ?? plan.places[0]?.lat;
  const lng = plan.regionLng ?? plan.places[0]?.lng;
  try {
    const items = (await searchPlaces(text, lat, lng)).slice(0, 8);
    return {
      forModel: {
        query: text,
        count: items.length,
        places: items.map((item) => ({
          name: item.name,
          address: item.address,
          rating: item.rating ?? null,
          category: item.category,
        })),
      },
      action: { type: 'places', query: text, items },
    };
  } catch (err) {
    return {
      forModel: {
        error: err instanceof Error ? err.message : '장소 검색에 실패했습니다.',
      },
    };
  }
};

const routeTool = async (
  plan: TravelPlan | null,
  fromToken: string,
  toToken: string,
): Promise<{ forModel: Record<string, unknown>; action?: AiAction }> => {
  if (!plan) {
    return { forModel: { error: '여행 계획을 먼저 선택해야 이동 방법을 찾을 수 있습니다.' } };
  }
  const from = findPlace(plan.places, fromToken);
  const to = findPlace(plan.places, toToken);
  if (from === 'ambiguous' || to === 'ambiguous') {
    return {
      forModel: {
        error: '같은 이름의 장소가 여러 개입니다. 사용자에게 어떤 장소인지 물어보세요.',
        places: plan.places.slice(0, 20).map((place) => ({
          id: place.id,
          name: place.name,
        })),
      },
    };
  }
  if (!from || !to) {
    return {
      forModel: {
        error: '계획에 등록된 장소에서 출발지 또는 도착지를 찾지 못했습니다.',
        places: plan.places.slice(0, 20).map((place) => ({
          id: place.id,
          name: place.name,
        })),
      },
    };
  }
  if (from.id === to.id) {
    return { forModel: { error: '출발지와 도착지가 같습니다.' } };
  }

  try {
    const route = await loadBestRoute(from, to);
    if (!route || (!route.steps.length && !route.durationText)) {
      return {
        forModel: {
          error: route?.failReason ?? '이 구간의 이동 정보를 찾지 못했습니다.',
        },
      };
    }
    const draft = formatRouteDraft(from.name, to.name, route);
    return {
      forModel: {
        fromName: from.name,
        toName: to.name,
        mode: route.label,
        durationText: route.durationText,
        distanceText: route.distanceText,
        draft,
      },
      action: {
        type: 'memo',
        placeId: from.id,
        placeName: from.name,
        fromName: from.name,
        toName: to.name,
        draft,
      },
    };
  } catch (err) {
    return {
      forModel: {
        error: err instanceof Error ? err.message : '길찾기에 실패했습니다.',
      },
    };
  }
};

const loadBestRoute = async (from: Place, to: Place): Promise<RouteDetail | null> => {
  const transit = await getRouteDetails(
    from.lat,
    from.lng,
    to.lat,
    to.lng,
    from.name,
    to.name,
    'transit',
  );
  const transitRoute = transit.routes.find((route) => route.mode === 'transit');
  if (transitRoute?.steps.length) return transitRoute;

  const driving = await getRouteDetails(
    from.lat,
    from.lng,
    to.lat,
    to.lng,
    from.name,
    to.name,
    'driving',
  );
  const drivingRoute = driving.routes.find((route) => route.mode === 'driving');
  if (drivingRoute && (drivingRoute.steps.length || drivingRoute.durationText)) {
    return drivingRoute;
  }
  return transitRoute ?? null;
};
