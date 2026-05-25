export interface FeedAuthorDto {
  userId: number;
  nickname: string;
  gender: string;
  hideGender?: boolean;
  isOperator?: boolean;
  profileImage: string | null;
}

export interface FeedKeywordDto {
  feedKeywordId: number;
  code: string;
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
  images?: Array<{
    imageId: number;
    imageUrl: string;
    sortOrder: number;
  }>;
  commentCount: number;
  viewCount: number;
  commentedByMe?: boolean;
  isMine?: boolean;
}

export interface FeedListDto {
  items: FeedListItemDto[];
  nextCursor: string | null;
}

export interface CreateFeedResultDto {
  feedId: number;
  expiresAt: string;
}

export interface FeedDetailAuthorDto {
  userId: number;
  nickname: string;
  gender: string;
  hideGender?: boolean;
  isOperator?: boolean;
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
    viewCount: number;
    commentedByMe?: boolean;
    isMine?: boolean;
  };
}

export interface RecordFeedViewResultDto {
  recorded: true;
  viewCount: number;
}

export interface KeywordListItemDto {
  feedKeywordId: number;
  code: string;
  name: string;
  sortOrder: number;
}

export interface KeywordListDto {
  items: KeywordListItemDto[];
}
