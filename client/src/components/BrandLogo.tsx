// 2026-09-23 가운데 정렬 옵션
// 2026-09-07 첨부 공식 로고 PNG를 PC/모바일에서 그대로 표시
// 2026-09-07 검정 배경 제거 후 투명 PNG로 헤더에 합성
// 2026-09-07 다크모드용 밝은 워드마크 로고로 흰 박스 제거
type BrandLogoSize = 'sm' | 'md' | 'lg';

interface BrandLogoProps {
  size?: BrandLogoSize;
  titleAs?: 'span' | 'h1';
  className?: string;
  align?: 'left' | 'center';
}

const SIZE_CLASS: Record<BrandLogoSize, string> = {
  sm: 'h-9 max-w-[10.5rem] sm:h-10 sm:max-w-[13rem]',
  md: 'h-11 max-w-[13rem] sm:h-12 sm:max-w-[17rem]',
  lg: 'h-16 max-w-[18rem] sm:h-24 sm:max-w-[24rem]',
};

export default function BrandLogo({
  size = 'md',
  titleAs = 'span',
  className = '',
  align = 'left',
}: BrandLogoProps) {
  const objectAlign = align === 'center' ? 'object-center' : 'object-left';
  const imgClass = `block w-auto object-contain ${objectAlign} ${SIZE_CLASS[size]}`;

  return (
    <span className={`inline-flex min-w-0 items-center ${className}`}>
      {titleAs === 'h1' && <h1 className="sr-only">plan-go</h1>}
      <img
        src="/logo.png?v=2"
        alt={titleAs === 'h1' ? '' : 'plan-go'}
        className={`${imgClass} dark:hidden`}
      />
      <img
        src="/logo-dark.png?v=1"
        alt=""
        className={`${imgClass} hidden dark:block`}
      />
    </span>
  );
}
