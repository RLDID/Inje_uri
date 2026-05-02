export interface FeedAuthorDto {
  userId: number;
  nickname: string;
  profileImage: string | null;
}

export interface FeedKeywordDto {
  feedKeywordId: number;
  name: string;
}

export interface FeedListItemDto {
  feedId: number;
  text: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  author: FeedAuthorDto;
  keywords: FeedKeywordDto[];
  primaryImage: string | null;
  commentCount: number;
}

export interface FeedListDto {
  items: FeedListItemDto[];
  nextCursor: number | null;
}

export interface CreateFeedResultDto {
  feedId: number;
  expiresAt: string;
}

export interface FeedDetailAuthorDto {
  userId: number;
  nickname: string;
  gender: string;
  department: string;
  studentYear: number;
  bio: string | null;
  profileImages: Array<{ imageUrl: string; sortOrder: number; isPrimary: boolean }>;
}

export interface FeedDetailImageDto {
  imageId: number;
  imageUrl: string;
  sortOrder: number;
}

export interface FeedDetailDto {
  feed: {
    feedId: number;
    text: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
    boostScore: number;
    author: FeedDetailAuthorDto;
    keywords: FeedKeywordDto[];
    images: FeedDetailImageDto[];
    commentCount: number;
  };
}

export interface KeywordListItemDto {
  feedKeywordId: number;
  name: string;
  sortOrder: number;
}

export interface KeywordListDto {
  items: KeywordListItemDto[];
}
