// 2026-08-31 공지사항 타입
import type { BoardAttachment } from './board.js';

export interface NoticePost {
  id: string;
  authorId: string;
  title: string;
  content: string;
  attachments: BoardAttachment[];
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoticePostPublic {
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
