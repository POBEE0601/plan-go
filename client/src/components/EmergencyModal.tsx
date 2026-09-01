// 2026-09-01 여행지 비상 연락·대처 팝업
import { ExternalLink, Phone, ShieldAlert, X } from 'lucide-react';
import {
  getEmergencyGuide,
  telHref,
  type EmergencyItem,
} from '../data/emergencyGuide';

interface EmergencyModalProps {
  open: boolean;
  onClose: () => void;
  regionName?: string;
  lat?: number;
  lng?: number;
  placeName?: string;
}

function ContactRow({ item }: { item: EmergencyItem }) {
  return (
    <li className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">{item.label}</p>
        {item.number && (
          <a
            href={telHref(item.number)}
            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white px-2 py-1 text-[12px] font-semibold text-primary-700 ring-1 ring-primary-100 hover:bg-primary-50"
          >
            <Phone className="h-3 w-3" />
            {item.number}
          </a>
        )}
      </div>
      <p className="mt-1 text-[12px] leading-snug text-slate-500">
        {item.detail}
      </p>
      {item.href && (
        <a
          href={item.href}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary-700 hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          사이트 열기
        </a>
      )}
    </li>
  );
}

export default function EmergencyModal({
  open,
  onClose,
  regionName,
  lat,
  lng,
  placeName,
}: EmergencyModalProps) {
  if (!open) return null;

  const guide = getEmergencyGuide(lat, lng, placeName);
  const title = regionName || guide.countryKo;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-h-[90vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
          <h2 className="flex min-w-0 items-center gap-2 text-base font-bold text-slate-800 sm:text-lg">
            <ShieldAlert className="h-5 w-5 shrink-0 text-rose-500" />
            <span className="truncate">{title} 비상 안내</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              현지 긴급
            </h3>
            <ul className="space-y-2">
              {guide.local.map((item) => (
                <ContactRow key={item.label} item={item} />
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              한국 공관 · 영사
            </h3>
            <ul className="space-y-2">
              {guide.consular.map((item) => (
                <ContactRow key={item.label} item={item} />
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              유형별 대처
            </h3>
            <ul className="space-y-2">
              {guide.extra.map((item) => (
                <ContactRow key={item.label} item={item} />
              ))}
            </ul>
          </div>
        </div>

        <p className="border-t border-slate-100 px-4 py-2 text-[11px] leading-snug text-slate-400 sm:px-5">
          번호는 바뀔 수 있습니다. 위급하면 현지 경찰·구급을 먼저 부르고, 영사안전콜센터로
          확인하세요.
        </p>
      </div>
    </div>
  );
}
