// 2026-08-31 공지사항 클라이언트 타입
import type { BoardAttachment } from './board';

export interface NoticePost {
  id: string;
  authorId: string;
  authorNameMasked: string;
  isAdmin: boolean;
  title: string;
  content: string;
  attachments: BoardAttachment[];
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  isMine: boolean;
}
