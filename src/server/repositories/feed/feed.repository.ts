import type { PrismaClient, Prisma } from "@/generated/prisma/client";

const FEED_PAGE_SIZE = 20;

const feedListSelect = {
  id: true,
  text: true,
  status: true,
  created_at: true,
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
  keywords: {
    select: {
      feed_keyword: {
        select: { feed_keyword_id: true, name: true },
      },
    },
  },
  images: {
    orderBy: { sort_order: "asc" as const },
    select: { image_url: true },
    take: 1,
  },
  _count: { select: { comments: true } },
} satisfies Prisma.SelfDateFeedSelect;

export type FeedListRow = Prisma.SelfDateFeedGetPayload<{ select: typeof feedListSelect }>;

const feedDetailSelect = {
  id: true,
  text: true,
  status: true,
  created_at: true,
  updated_at: true,
  expires_at: true,
  boost_score: true,
  author_user_id: true,
  author_user: {
    select: {
      id: true,
      nickname: true,
      gender: true,
      department: true,
      student_year: true,
      bio: true,
      status: true,
      userProfileImages: {
        orderBy: { sort_order: "asc" as const },
        select: { image_url: true, sort_order: true, is_primary: true },
      },
    },
  },
  keywords: {
    select: {
      feed_keyword: {
        select: { feed_keyword_id: true, name: true },
      },
    },
  },
  images: {
    orderBy: { sort_order: "asc" as const },
    select: { id: true, image_url: true, sort_order: true },
  },
  _count: { select: { comments: true } },
} satisfies Prisma.SelfDateFeedSelect;

const feedForUpdateSelect = {
  id: true,
  author_user_id: true,
  text: true,
  status: true,
  expires_at: true,
} satisfies Prisma.SelfDateFeedSelect;

const feedForViewSelect = {
  id: true,
  status: true,
} satisfies Prisma.SelfDateFeedSelect;

export type FeedDetailRow = Prisma.SelfDateFeedGetPayload<{ select: typeof feedDetailSelect }>;
export type FeedForUpdateRow = Prisma.SelfDateFeedGetPayload<{ select: typeof feedForUpdateSelect }>;
export type FeedForViewRow = Prisma.SelfDateFeedGetPayload<{ select: typeof feedForViewSelect }>;

export class FeedRepository {
  constructor(private readonly db: PrismaClient) {}

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

  async findActiveFeeds(
    where: Prisma.SelfDateFeedWhereInput,
  ): Promise<FeedListRow[]> {
    return this.db.selfDateFeed.findMany({
      where,
      orderBy: [
        { boost_score: "asc" },
        { id: "desc" },
      ],
      take: FEED_PAGE_SIZE + 1,
      select: feedListSelect,
    });
  }

  async findActiveFeedByUser(
    userId: number,
    now: Date,
  ) {
    return this.db.selfDateFeed.findFirst({
      where: {
        author_user_id: userId,
        status: "active",
        expires_at: { gt: now },
      },
      select: { id: true },
    });
  }

  async findFeedById(feedId: number): Promise<FeedDetailRow | null> {
    return this.db.selfDateFeed.findUnique({
      where: { id: feedId },
      select: feedDetailSelect,
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

  async findFeedForUpdate(feedId: number): Promise<FeedForUpdateRow | null> {
    return this.db.selfDateFeed.findUnique({
      where: { id: feedId },
      select: feedForUpdateSelect,
    });
  }

  async updateFeedText(
    tx: Prisma.TransactionClient,
    feedId: number,
    text: string,
    now: Date,
  ) {
    return tx.selfDateFeed.update({
      where: { id: feedId },
      data: { text, updated_at: now },
    });
  }

  async replaceFeedKeywords(
    tx: Prisma.TransactionClient,
    feedId: number,
    feedKeywordIds: number[],
  ) {
    await tx.selfDateFeedKeyword.deleteMany({
      where: { feed_id: feedId },
    });

    await tx.selfDateFeedKeyword.createMany({
      data: feedKeywordIds.map((feedKeywordId) => ({
        feed_id: feedId,
        feed_keyword_id: feedKeywordId,
      })),
    });
  }

  async softDeleteFeed(feedId: number) {
    return this.db.selfDateFeed.update({
      where: { id: feedId },
      data: { status: "deleted", updated_at: new Date() },
    });
  }

  async findFeedForView(feedId: number): Promise<FeedForViewRow | null> {
    return this.db.selfDateFeed.findUnique({
      where: { id: feedId },
      select: feedForViewSelect,
    });
  }

  async upsertFeedView(feedId: number, viewerUserId: number) {
    return this.db.feedView.upsert({
      where: {
        feed_id_viewer_user_id: {
          feed_id: feedId,
          viewer_user_id: viewerUserId,
        },
      },
      create: {
        feed_id: feedId,
        viewer_user_id: viewerUserId,
      },
      update: {},
    });
  }

  async findActiveKeywordsByIds(ids: number[]) {
    return this.db.feedKeyword.findMany({
      where: {
        feed_keyword_id: { in: ids },
        is_active: true,
      },
      select: { feed_keyword_id: true },
    });
  }

  async findActiveKeywords() {
    return this.db.feedKeyword.findMany({
      where: { is_active: true },
      orderBy: { sort_order: "asc" },
      select: {
        feed_keyword_id: true,
        name: true,
        sort_order: true,
      },
    });
  }

  async findAppSetting(key: string) {
    return this.db.appSetting.findUnique({
      where: { key },
      select: { value: true },
    });
  }

  async createFeedWithKeywords(
    tx: Prisma.TransactionClient,
    data: { authorUserId: number; text: string; expiresAt: Date },
    feedKeywordIds: number[],
  ) {
    const feed = await tx.selfDateFeed.create({
      data: {
        author_user_id: data.authorUserId,
        text: data.text,
        expires_at: data.expiresAt,
      },
      select: { id: true, expires_at: true },
    });

    await tx.selfDateFeedKeyword.createMany({
      data: feedKeywordIds.map((kwId) => ({
        feed_id: feed.id,
        feed_keyword_id: kwId,
      })),
    });

    return feed;
  }
}
