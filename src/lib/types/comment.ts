export interface CommentListItemDto {
  commentId: number;
  content: string;
  createdAt: string;
  commenter: {
    userId: number;
    nickname: string;
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
    author: {
      userId: number;
      nickname: string;
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
