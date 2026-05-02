import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/lib/app-error";
import { FeedRepository } from "@/server/repositories/feed/feed.repository";
import type { FeedDetailRow, FeedListRow } from "@/server/repositories/feed/feed.repository";
import type {
  CreateFeedResultDto,
  FeedDetailDto,
  FeedListDto,
  FeedListItemDto,
  KeywordListDto,
  KeywordListItemDto,
} from "@/lib/types/feed";

const FEED_PAGE_SIZE = 20;

const repo = new FeedRepository(prisma);

function toFeedListItemDto(row: FeedListRow): FeedListItemDto {
  return {
    feedId: row.id,
    text: row.text,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    author: {
      userId: row.author_user.id,
      nickname: row.author_user.nickname,
      profileImage: row.author_user.userProfileImages[0]?.image_url ?? null,
    },
    keywords: row.keywords.map((k) => ({
      feedKeywordId: k.feed_keyword.feed_keyword_id,
      name: k.feed_keyword.name,
    })),
    primaryImage: row.images[0]?.image_url ?? null,
    commentCount: row._count.comments,
  };
}

function toFeedDetailDto(row: FeedDetailRow): FeedDetailDto {
  return {
    feed: {
      feedId: row.id,
      text: row.text,
      status: row.status,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      expiresAt: row.expires_at.toISOString(),
      boostScore: row.boost_score,
      author: {
        userId: row.author_user.id,
        nickname: row.author_user.nickname,
        gender: row.author_user.gender,
        department: row.author_user.department,
        studentYear: row.author_user.student_year,
        bio: row.author_user.bio,
        profileImages: row.author_user.userProfileImages.map((img) => ({
          imageUrl: img.image_url,
          sortOrder: img.sort_order,
          isPrimary: img.is_primary,
        })),
      },
      keywords: row.keywords.map((keyword) => ({
        feedKeywordId: keyword.feed_keyword.feed_keyword_id,
        name: keyword.feed_keyword.name,
      })),
      images: row.images.map((image) => ({
        imageId: image.id,
        imageUrl: image.image_url,
        sortOrder: image.sort_order,
      })),
      commentCount: row._count.comments,
    },
  };
}

function toKeywordListItemDto(row: {
  feed_keyword_id: number;
  name: string;
  sort_order: number;
}): KeywordListItemDto {
  return {
    feedKeywordId: row.feed_keyword_id,
    name: row.name,
    sortOrder: row.sort_order,
  };
}

export async function listFeeds(
  currentUserId: number,
  keyword: string | null,
  cursor: number | null,
): Promise<FeedListDto> {
  const now = new Date();
  const blockedUserIds = await repo.findBlockedUserIds(currentUserId);

  const where: Prisma.SelfDateFeedWhereInput = {
    status: "active",
    expires_at: { gt: now },
    author_user: { status: { not: "banned" } },
  };

  if (blockedUserIds.size > 0) where.author_user_id = { notIn: [...blockedUserIds] };
  if (keyword) where.keywords = { some: { feed_keyword: { name: keyword } } };
  if (cursor) where.id = { lt: cursor };

  const rows = await repo.findActiveFeeds(where);

  const hasNextPage = rows.length > FEED_PAGE_SIZE;
  const slice = hasNextPage ? rows.slice(0, FEED_PAGE_SIZE) : rows;

  return {
    items: slice.map(toFeedListItemDto),
    nextCursor: hasNextPage ? slice[slice.length - 1].id : null,
  };
}

export async function createFeed(
  authorUserId: number,
  text: string,
  feedKeywordIds: number[],
): Promise<CreateFeedResultDto> {
  const now = new Date();

  const existing = await repo.findActiveFeedByUser(authorUserId, now);
  if (existing) {
    throw new AppError("FEED_ALREADY_ACTIVE", "이미 활성 상태인 피드가 있습니다. 기존 피드가 만료된 후 작성해주세요.");
  }

  const validKeywords = await repo.findActiveKeywordsByIds(feedKeywordIds);
  if (validKeywords.length !== feedKeywordIds.length) {
    throw new AppError("INVALID_KEYWORD_ID", "존재하지 않거나 비활성 상태인 키워드가 포함되어 있습니다.");
  }

  const festivalSetting = await repo.findAppSetting("festival_mode");
  const expirySetting = await repo.findAppSetting("feed_expiry_hours");

  const isFestivalMode = festivalSetting?.value === "true";
  const defaultExpiryHours = isFestivalMode ? 2 : 24;
  const expiryHours = expirySetting ? Number(expirySetting.value) : defaultExpiryHours;
  const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);

  const feed = await prisma.$transaction(async (tx) => {
    return repo.createFeedWithKeywords(tx, { authorUserId, text: text.trim(), expiresAt }, feedKeywordIds);
  });

  return {
    feedId: feed.id,
    expiresAt: feed.expires_at.toISOString(),
  };
}

export async function getFeedDetail(
  currentUserId: number,
  feedId: number,
): Promise<FeedDetailDto> {
  const feed = await repo.findFeedById(feedId);
  if (!feed) {
    throw new AppError("FEED_NOT_FOUND", "존재하지 않는 피드입니다.");
  }

  if (feed.author_user.status === "banned") {
    throw new AppError("FEED_NOT_FOUND", "존재하지 않는 피드입니다.");
  }

  if (feed.status !== "active") {
    throw new AppError("FEED_NOT_AVAILABLE", "활성 상태가 아닌 피드입니다.");
  }

  if (feed.expires_at <= new Date()) {
    throw new AppError("FEED_NOT_AVAILABLE", "만료된 피드입니다.");
  }

  if (feed.author_user_id !== currentUserId) {
    const block = await repo.findBlockBetweenUsers(currentUserId, feed.author_user_id);
    if (block) {
      throw new AppError("FEED_NOT_FOUND", "존재하지 않는 피드입니다.");
    }
  }

  return toFeedDetailDto(feed);
}

export async function updateFeed(
  currentUserId: number,
  feedId: number,
  text: string | undefined,
  feedKeywordIds: number[] | undefined,
): Promise<{ updated: true }> {
  const feed = await repo.findFeedForUpdate(feedId);
  if (!feed) {
    throw new AppError("FEED_NOT_FOUND", "존재하지 않는 피드입니다.");
  }

  if (feed.author_user_id !== currentUserId) {
    throw new AppError("FEED_NOT_OWNER", "본인이 작성한 피드만 수정할 수 있습니다.");
  }

  if (feed.status !== "active") {
    throw new AppError("FEED_NOT_AVAILABLE", "활성 상태가 아닌 피드는 수정할 수 없습니다.");
  }

  const now = new Date();
  if (feed.expires_at <= now) {
    throw new AppError("FEED_NOT_AVAILABLE", "만료된 피드는 수정할 수 없습니다.");
  }

  if (feedKeywordIds) {
    const validKeywords = await repo.findActiveKeywordsByIds(feedKeywordIds);
    if (validKeywords.length !== feedKeywordIds.length) {
      throw new AppError("INVALID_KEYWORD_ID", "존재하지 않거나 비활성 상태인 키워드가 포함되어 있습니다.");
    }
  }

  await prisma.$transaction(async (tx) => {
    const nextText = text?.trim() ?? feed.text;
    await repo.updateFeedText(tx, feedId, nextText, now);
    if (feedKeywordIds) await repo.replaceFeedKeywords(tx, feedId, feedKeywordIds);
  });

  return { updated: true };
}

export async function deleteFeed(
  currentUserId: number,
  feedId: number,
): Promise<{ deleted: true }> {
  const feed = await repo.findFeedForUpdate(feedId);
  if (!feed) {
    throw new AppError("FEED_NOT_FOUND", "존재하지 않는 피드입니다.");
  }

  if (feed.author_user_id !== currentUserId) {
    throw new AppError("FEED_NOT_OWNER", "본인이 작성한 피드만 삭제할 수 있습니다.");
  }

  if (feed.status === "deleted") {
    throw new AppError("FEED_ALREADY_DELETED", "이미 삭제된 피드입니다.");
  }

  await repo.softDeleteFeed(feedId);
  return { deleted: true };
}

export async function recordFeedView(
  feedId: number,
  viewerUserId: number,
): Promise<{ recorded: true }> {
  const feed = await repo.findFeedForView(feedId);
  if (!feed) {
    throw new AppError("FEED_NOT_FOUND", "존재하지 않는 피드입니다.");
  }

  if (feed.status !== "active") {
    throw new AppError("FEED_NOT_ACTIVE", "활성 상태가 아닌 피드입니다.");
  }

  await repo.upsertFeedView(feedId, viewerUserId);
  return { recorded: true };
}

export async function listKeywords(): Promise<KeywordListDto> {
  const rows = await repo.findActiveKeywords();
  return {
    items: rows.map(toKeywordListItemDto),
  };
}
