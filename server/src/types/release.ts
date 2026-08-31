// 2026-08-31 배포게시판 타입
import type { BoardAttachment } from './board.js';

export const DEPLOY_STATUSES = [
  'scheduled',
  'in_progress',
  'completed',
  'delayed',
  'rollback',
] as const;

export type DeployStatus = (typeof DEPLOY_STATUSES)[number];

export const DEPLOY_STATUS_LABEL: Record<DeployStatus, string> = {
  scheduled: '예정',
  in_progress: '배포중',
  completed: '완료',
  delayed: '지연',
  rollback: '롤백',
};

export const isDeployStatus = (value: string): value is DeployStatus =>
  (DEPLOY_STATUSES as readonly string[]).includes(value);

export interface ReleasePost {
  id: string;
  authorId: string;
  title: string;
  content: string;
  status: DeployStatus;
  releasedAt: string;
  attachments: BoardAttachment[];
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReleasePostPublic {
  id: string;
  authorId: string;
  authorNameMasked: string;
  isAdmin: boolean;
  title: string;
  content: string;
  status: DeployStatus;
  releasedAt: string;
  attachments: BoardAttachment[];
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  isMine: boolean;
}
