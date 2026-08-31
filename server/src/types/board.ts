// 2026-08-31 고객게시판 타입
export interface BoardAttachment {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface BoardPost {
  id: string;
  authorId: string;
  title: string;
  content: string;
  attachments: BoardAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface BoardComment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface BoardLike {
  postId: string;
  userId: string;
  createdAt: string;
}

export interface BoardPostPublic {
  id: string;
  authorId: string;
  authorNameMasked: string;
  isAdmin: boolean;
  title: string;
  content: string;
  attachments: BoardAttachment[];
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  isMine: boolean;
}

export interface BoardCommentPublic {
  id: string;
  postId: string;
  authorId: string;
  authorNameMasked: string;
  isAdmin: boolean;
  content: string;
  createdAt: string;
  isMine: boolean;
}
