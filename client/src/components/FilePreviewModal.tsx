// 2026-08-31 첨부 파일명 클릭 시 미리보기
import { Download, FileText, X } from 'lucide-react';
import type { BoardAttachment } from '../types/board';

interface FilePreviewModalProps {
  file: BoardAttachment | null;
  onClose: () => void;
}

export default function FilePreviewModal({
  file,
  onClose,
}: FilePreviewModalProps) {
  if (!file) return null;

  const isImage = file.mimeType.startsWith('image/');
  const isPdf = file.mimeType === 'application/pdf';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="truncate text-sm font-medium text-slate-800">
            {file.originalName}
          </p>
          <div className="flex items-center gap-1">
            <a
              href={file.url}
              download={file.originalName}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
              title="다운로드"
            >
              <Download className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-50 p-4">
          {isImage && (
            <img
              src={file.url}
              alt={file.originalName}
              className="max-h-[75vh] max-w-full rounded object-contain"
            />
          )}
          {isPdf && (
            <iframe
              title={file.originalName}
              src={file.url}
              className="h-[75vh] w-full rounded border-0 bg-white"
            />
          )}
          {!isImage && !isPdf && (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
              <FileText className="h-12 w-12" />
              <p className="text-sm">미리보기를 지원하지 않는 파일입니다.</p>
              <a
                href={file.url}
                download={file.originalName}
                className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm text-white hover:bg-primary-700"
              >
                다운로드
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
