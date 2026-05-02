import type { Prisma, PrismaClient } from "@/generated/prisma/client";

const commentListSelect = {
  id: true,
  content: true,
  created_at: true,
  commenter_user: {
    select: {
      id: true,
      nickname: true,
      userProfileImages: {
        where: { is_primary: true },
        select: { image_url: true },
        take: 1,
      },
    },
  },
} satisfies Prisma.FeedCommentSelect;

const myCommentedFeedSelect = {
  id: true,
  content: true,
  created_at: true,
  feed: {
    select: {
      id: true,
      text: true,
      status: true,
      expires_at: true,
      author_user: {
        select: {
          id: true,
          nickname: true,
          userProfileImages: {
            where: { is_primary: true },
            select: { image_url: true },
            take: 1,
          },
        },
      },
    },
  },
} satisfies Prisma.FeedCommentSelect;

const commentForChatSelect = {
  id: true,
  deleted_at: true,
  commenter_user_id: true,
  feed: {
    select: {
      id: true,
      author_user_id: true,
      status: true,
    },
  },
  commenter_user: {
    select: { status: true },
  },
} satisfies Prisma.FeedCommentSelect;

export type CommentListRow = Prisma.FeedCommentGetPayload<{ select: typeof commentListSelect }>;
export type MyCommentedFeedRow = Prisma.FeedCommentGetPayload<{ select: typeof myCommentedFeedSelect }>;
export type CommentForChatRow = Prisma.FeedCommentGetPayload<{ select: typeof commentForChatSelect }>;

export class CommentRepository {
  constructor(private readonly db: PrismaClient) {}

  async findFeedForComment(feedId: number) {
    return this.db.selfDateFeed.findUnique({
      where: { id: feedId },
      select: { id: true, status: true, expires_at: true, author_user_id: true },
    });
  }

  async findBlockBetweenUsers(userId1: number, userId2: number) {
    return this.db.block.findFirst({
      where: {
        unblocked_at: null,
        OR: [
          { blocker_user_id: userId1, blocked_user_id: userId2 },
          { blocker_user_id: userId2, blocked_user_id: userId1 },
        ],
      },
      select: { id: true },
    });
  }

  async findExistingComment(feedId: number, userId: number) {
    return this.db.feedComment.findUnique({
      where: {
        feed_id_commenter_user_id: {
          feed_id: feedId,
          commenter_user_id: userId,
        },
      },
      select: { id: true },
    });
  }

  async createComment(feedId: number, userId: number, content: string) {
    return this.db.feedComment.create({
      data: {
        feed_id: feedId,
        commenter_user_id: userId,
        content,
      },
      select: { id: true },
    });
  }

  async findBlockedUserIds(userId: number): Promise<Set<number>> {
    const rows = await this.db.block.findMany({
      where: {
        unblocked_at: null,
        OR: [
          { blocker_user_id: userId },
          { blocked_user_id: userId },
        ],
      },
      select: { blocker_user_id: true, blocked_user_id: true },
    });

    const ids = new Set<number>();
    for (const row of rows) {
      if (row.blocker_user_id === userId) ids.add(row.blocked_user_id);
      if (row.blocked_user_id === userId) ids.add(row.blocker_user_id);
    }

    return ids;
  }

  async findComments(feedId: number, blockedUserIds: Set<number>): Promise<CommentListRow[]> {
    return this.db.feedComment.findMany({
      where: {
        feed_id: feedId,
        deleted_at: null,
        commenter_user: {
          status: { not: "banned" },
        },
        ...(blockedUserIds.size > 0 ? { commenter_user_id: { notIn: [...blockedUserIds] } } : {}),
      },
      orderBy: { created_at: "asc" },
      select: commentListSelect,
    });
  }

  async findMyCommentedFeeds(userId: number, blockedUserIds: Set<number>): Promise<MyCommentedFeedRow[]> {
    return this.db.feedComment.findMany({
      where: {
        commenter_user_id: userId,
        deleted_at: null,
        feed: {
          author_user: {
            status: { not: "banned" },
          },
          ...(blockedUserIds.size > 0 ? { author_user_id: { notIn: [...blockedUserIds] } } : {}),
        },
      },
      orderBy: { created_at: "desc" },
      select: myCommentedFeedSelect,
    });
  }

  async findCommentForChat(commentId: number): Promise<CommentForChatRow | null> {
    return this.db.feedComment.findUnique({
      where: { id: commentId },
      select: commentForChatSelect,
    });
  }

  async findExistingChatRoom(commentId: number) {
    return this.db.chatRoom.findFirst({
      where: {
        source_comment_id: commentId,
        source_type: "comment",
      },
      select: { id: true },
    });
  }
}
