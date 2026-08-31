// 2026-08-31 고객게시판 클라이언트 타입
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
  authorNameMasked: string;
  isAdmin?: boolean;
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

export interface BoardComment {
  id: string;
  postId: string;
  authorId: string;
  authorNameMasked: string;
  isAdmin?: boolean;
  content: string;
  createdAt: string;
  isMine: boolean;
}

export interface BoardPostDetail {
  post: BoardPost;
  comments: BoardComment[];
}
