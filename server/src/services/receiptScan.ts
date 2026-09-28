// 2026-09-28 영수증 사진을 Gemini로 읽어 지출 입력값만 돌려준다
import type { ExpenseMethod } from '../types/travel.js';

export interface ReceiptDraft {
  amount: number | null;
  currency: string | null;
  merchant: string;
  paidAt: string | null;
  method: ExpenseMethod | null;
}

const getModel = (): string =>
  process.env.GEMINI_MODEL?.trim() || 'gemini-3.6-flash';

const SYSTEM = [
  '영수증 사진에서 결제 정보만 JSON으로 뽑는다.',
  'amount: 손님이 낸 합계 숫자. 세금만 있는 줄, 거스름돈은 쓰지 않는다.',
  'currency: ISO 4217. 엔화는 JPY, 원화는 KRW, 달러는 USD, 유로는 EUR.',
  'merchant: 가게 이름. 없으면 빈 문자열.',
  'paidAt: YYYY-MM-DD. 없으면 null.',
  'method: 현금이면 cash, 카드·전자결제면 card, 모르면 null.',
  '읽을 수 없으면 amount는 null.',
].join('\n');

const parseAmount = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 1_000_000_000) {
    return Math.round(value * 100) / 100;
  }
  if (typeof value !== 'string') return null;
  const n = Number(value.replace(/,/g, '').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n) || n <= 0 || n >= 1_000_000_000) return null;
  return Math.round(n * 100) / 100;
};

const parseCurrency = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : null;
};

const parsePaidAt = (value: unknown): string | null => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
};

const parseMethod = (value: unknown): ExpenseMethod | null => {
  if (value === 'cash' || value === 'card' || value === 'other') return value;
  return null;
};

const parseDraft = (text: string): ReceiptDraft => {
  const trimmed = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return { amount: null, currency: null, merchant: '', paidAt: null, method: null };
  }
  let row: Record<string, unknown> = {};
  try {
    row = JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    row = {};
  }
  const merchant = typeof row.merchant === 'string' ? row.merchant.trim().slice(0, 80) : '';
  return {
    amount: parseAmount(row.amount),
    currency: parseCurrency(row.currency),
    merchant,
    paidAt: parsePaidAt(row.paidAt),
    method: parseMethod(row.method),
  };
};

export const readReceipt = async (
  mimeType: string,
  data: string,
): Promise<ReceiptDraft> => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다. server/.env에 넣어 주세요.');
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(getModel())}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data } },
            { text: '이 영수증을 읽어 JSON만 반환한다.' },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 400,
        responseMimeType: 'application/json',
      },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const payload = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(payload.error?.message || '영수증을 읽지 못했습니다.');
  }
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
  if (!text.trim()) throw new Error('영수증에서 금액을 찾지 못했습니다.');
  return parseDraft(text);
};
