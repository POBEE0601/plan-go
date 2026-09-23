// 2026-09-23 제미나이 공식 마크. 하단 탭 아이콘 속성도 받는다
type GeminiMarkProps = {
  className?: string;
  strokeWidth?: number;
  fill?: string;
};

export default function GeminiMark({ className }: GeminiMarkProps) {
  return (
    <img
      src="/Google_Gemini_icon_2025.svg.webp"
      alt=""
      className={`object-contain ${className ?? ''}`}
    />
  );
}
