import { AppError } from "@/server/lib/app-error";
import { prisma } from "@/server/db/prisma";
import { CommentRepository } from "@/server/repositories/feed/comment.repository";
import * as chatRoomService from "@/server/services/conversation/chatRoom.service";
import { ERROR } from "@/server/lib/errors";
import type {
  CommentListDto,
  CommentListItemDto,
  CreateCommentResultDto,
  MyCommentedFeedItemDto,
  MyCommentedFeedListDto,
  SelectChatResultDto,
} from "@/lib/types/comment";
import type {
  CommentListRow,
  MyCommentedFeedRow,
} from "@/server/repositories/feed/comment.repository";

const repo = new CommentRepository(prisma);

function toCommentListItemDto(row: CommentListRow): CommentListItemDto {
  return {
    commentId: row.id,
    content: row.content,
    createdAt: row.created_at.toISOString(),
    commenter: {
      userId: row.commenter_user.id,
      nickname: row.commenter_user.nickname,
      profileImage: row.commenter_user.userProfileImages[0]?.image_url ?? null,
    },
  };
}

function toMyCommentedFeedItemDto(row: MyCommentedFeedRow): MyCommentedFeedItemDto {
  return {
    comment: {
      commentId: row.id,
      content: row.content,
      createdAt: row.created_at.toISOString(),
    },
    feed: {
      feedId: row.feed.id,
      text: row.feed.text,
      status: row.feed.status,
      expiresAt: row.feed.expires_at.toISOString(),
      author: {
        userId: row.feed.author_user.id,
        nickname: row.feed.author_user.nickname,
        profileImage: row.feed.author_user.userProfileImages[0]?.image_url ?? null,
      },
    },
  };
}

export async function createComment(
  currentUserId: number,
  feedId: number,
  content: string,
): Promise<CreateCommentResultDto> {
  const feed = await repo.findFeedForComment(feedId);

  if (!feed) {
    throw new AppError("FEED_NOT_FOUND", "존재하지 않는 피드입니다.");
  }

  if (feed.status !== "active") {
    throw new AppError("FEED_NOT_AVAILABLE", "활성 상태가 아닌 피드에는 댓글을 작성할 수 없습니다.");
  }

  if (feed.expires_at <= new Date()) {
    throw new AppError("FEED_NOT_AVAILABLE", "만료된 피드에는 댓글을 작성할 수 없습니다.");
  }

  if (feed.author_user_id === currentUserId) {
    throw new AppError("CANNOT_COMMENT_OWN_FEED", "본인의 피드에는 댓글을 작성할 수 없습니다.");
  }

  const blockExists = await repo.findBlockBetweenUsers(currentUserId, feed.author_user_id);
  if (blockExists) {
    throw new AppError("FEED_NOT_FOUND", "존재하지 않는 피드입니다.");
  }

  const existingComment = await repo.findExistingComment(feedId, currentUserId);
  if (existingComment) {
    throw new AppError("COMMENT_ALREADY_EXISTS", "이미 이 피드에 댓글을 작성했습니다.");
  }

  const comment = await repo.createComment(feedId, currentUserId, content.trim());
  return { commentId: comment.id };
}

export async function listComments(
  currentUserId: number,
  feedId: number,
): Promise<CommentListDto> {
  const feed = await repo.findFeedForComment(feedId);

  if (!feed) {
    throw new AppError("FEED_NOT_FOUND", "존재하지 않는 피드입니다.");
  }

  if (feed.status !== "active") {
    throw new AppError("FEED_NOT_AVAILABLE", "활성 상태가 아닌 피드입니다.");
  }

  if (feed.expires_at <= new Date()) {
    throw new AppError("FEED_NOT_AVAILABLE", "만료된 피드입니다.");
  }

  if (feed.author_user_id !== currentUserId) {
    throw new AppError("FEED_NOT_OWNER", "피드 작성자만 댓글을 확인할 수 있습니다.");
  }

  const blockedUserIds = await repo.findBlockedUserIds(currentUserId);
  const comments = await repo.findComments(feedId, blockedUserIds);

  return {
    items: comments.map(toCommentListItemDto),
  };
}

export async function listMyCommentedFeeds(currentUserId: number): Promise<MyCommentedFeedListDto> {
  const blockedUserIds = await repo.findBlockedUserIds(currentUserId);
  const comments = await repo.findMyCommentedFeeds(currentUserId, blockedUserIds);

  return {
    items: comments.map(toMyCommentedFeedItemDto),
  };
}

export async function selectChat(
  currentUserId: number,
  commentId: number,
): Promise<SelectChatResultDto> {
  const comment = await repo.findCommentForChat(commentId);

  if (!comment) {
    throw new AppError("COMMENT_NOT_FOUND", "존재하지 않는 댓글입니다.");
  }

  if (comment.deleted_at) {
    throw new AppError("COMMENT_DELETED", "삭제된 댓글입니다.");
  }

  if (comment.feed.author_user_id !== currentUserId) {
    throw new AppError("NOT_FEED_AUTHOR", "피드 작성자만 댓글을 선택할 수 있습니다.");
  }

  if (comment.feed.status !== "active") {
    throw new AppError("FEED_NOT_AVAILABLE", "활성 상태가 아닌 피드의 댓글은 선택할 수 없습니다.");
  }

  if (comment.commenter_user.status === "banned") {
    throw new AppError("COMMENTER_BANNED", "제재된 사용자의 댓글은 선택할 수 없습니다.");
  }

  const blockExists = await repo.findBlockBetweenUsers(currentUserId, comment.commenter_user_id);
  if (blockExists) {
    throw new AppError("BLOCKED_RELATIONSHIP", "차단 관계인 사용자의 댓글은 선택할 수 없습니다.");
  }

  const existingChatRoom = await repo.findExistingChatRoom(commentId);
  if (existingChatRoom) {
    throw new AppError("CHAT_ROOM_ALREADY_EXISTS", "이미 이 댓글로 생성된 채팅방이 있습니다.");
  }

  const chatRoom = await chatRoomService.createChatRoom({
    requestUserId: currentUserId,
    targetUserId: comment.commenter_user_id,
    sourceType: "comment",
    sourceCommentId: commentId,
  });

  if ("error" in chatRoom) {
    const error = chatRoom.error ?? ERROR.INTERNAL_ERROR;

    if (error === ERROR.DUPLICATE_ACTIVE_ROOM) {
      throw new AppError("CHAT_ROOM_ALREADY_EXISTS", "이미 활성화된 채팅방이 존재합니다.");
    }

    if (error === ERROR.REMATCH_TOO_SOON) {
      throw new AppError("REMATCH_TOO_SOON", "마지막 대화 종료 후 7일이 지나지 않았습니다.");
    }

    throw new AppError(error, "채팅방 생성에 실패했습니다.");
  }

  return { chatRoomId: chatRoom.chatRoomId };
}
