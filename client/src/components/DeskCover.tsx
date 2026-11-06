// 2026-11-06 데스크 카드 그림. 제목이 옆에 있으면 설명을 비워 중복 읽기를 막는다

interface DeskCoverProps {
  src: string;
  alt?: string;
  className?: string;
}

export default function DeskCover({
  src,
  alt = '',
  className = 'h-36',
}: DeskCoverProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={`bg-primary-50 object-cover ${className}`}
    />
  );
}
