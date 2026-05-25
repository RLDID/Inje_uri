export interface CommentListItemDto {
  commentId: number;
  content: string;
  createdAt: string;
  commenter: {
    userId: number;
    nickname: string;
    gender: string;
    profileImage: string | null;
  };
}

export interface CommentListDto {
  items: CommentListItemDto[];
}

export interface CreateCommentResultDto {
  commentId: number;
}

export interface MyCommentedFeedItemDto {
  comment: {
    commentId: number;
    content: string;
    createdAt: string;
  };
  feed: {
    feedId: number;
    text: string;
    status: string;
    expiresAt: string;
    viewCount: number;
    images: Array<{ imageId: number; imageUrl: string; sortOrder: number }>;
    keywords: Array<{ feedKeywordId: number; code: string; name: string }>;
    author: {
      userId: number;
      nickname: string;
      gender: string;
      hideGender?: boolean;
      isOperator?: boolean;
      profileImage: string | null;
    };
  };
}

export interface MyCommentedFeedListDto {
  items: MyCommentedFeedItemDto[];
}

export interface SelectChatResultDto {
  chatRoomId: number;
}
