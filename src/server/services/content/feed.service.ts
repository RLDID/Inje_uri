import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/lib/app-error";
import { FeedRepository } from "@/server/repositories/feed/feed.repository";
import type { FeedDetailRow, FeedListRow } from "@/server/repositories/feed/feed.repository";
import {
  removeStoredFeedImage,
  saveFeedImageFile,
} from "@/server/services/content/feed-image-storage";
import { decodeFeedCursor, encodeFeedCursor } from "@/lib/utils/cursor";
import {
  isAdminOperatorEmail,
} from "@/server/services/admin/admin-operator.constants";
import type {
  CreateFeedResultDto,
  FeedDetailDto,
  FeedListDto,
  FeedListItemDto,
  KeywordListDto,
  KeywordListItemDto,
  RecordFeedViewResultDto,
} from "@/lib/types/feed";

const FEED_PAGE_SIZE = 20;
const MAX_FEED_TEXT_LENGTH = 200;
const MAX_FEED_IMAGES = 4;

const repo = new FeedRepository(prisma);

type FeedKeywordInput = {
  ids?: number[] | null;
  codes?: string[] | null;
};

function normalizeFeedText(text: string): string {
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new AppError("INVALID_TEXT", "피드 본문은 빈 값이 아닌 문자열이어야 합니다.");
  }

  if (trimmedText.length > MAX_FEED_TEXT_LENGTH) {
    throw new AppError("INVALID_TEXT", `피드 본문은 ${MAX_FEED_TEXT_LENGTH}자 이하로 입력해주세요.`);
  }

  return trimmedText;
}

function assertFeedImageCount(imageCount: number) {
  if (imageCount > MAX_FEED_IMAGES) {
    throw new AppError("INVALID_INPUT", `이미지는 최대 ${MAX_FEED_IMAGES}개까지 등록할 수 있습니다.`);
  }
}

function toFeedListItemDto(
  row: FeedListRow,
  options: { commentedFeedIds?: Set<number>; currentUserId?: number } = {},
): FeedListItemDto {
  const isOperator = isAdminOperatorEmail(row.author_user.email);
  const isMine = row.author_user.id === options.currentUserId;

  return {
    feedId: row.id,
    text: row.text,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    author: {
      userId: row.author_user.id,
      nickname: row.author_user.nickname,
      gender: row.author_user.gender,
      hideGender: isOperator || !row.author_user.onboarding_completed,
      isOperator,
      profileImage: row.author_user.userProfileImages[0]?.image_url ?? null,
    },
    keywords: row.keywords.map((k) => ({
      feedKeywordId: k.feed_keyword.feed_keyword_id,
      code: k.feed_keyword.code,
      name: k.feed_keyword.name,
    })),
    primaryImage: row.images[0]?.image_url ?? null,
    images: row.images.map((image) => ({
      imageId: image.id,
      imageUrl: image.image_url,
      sortOrder: image.sort_order,
    })),
    commentCount: row._count.comments,
    viewCount: row._count.views,
    commentedByMe: options.commentedFeedIds?.has(row.id) ?? false,
    isMine,
  };
}

function toFeedDetailDto(
  row: FeedDetailRow,
  options: { commentedByMe?: boolean; currentUserId?: number } = {},
): FeedDetailDto {
  const isOperator = isAdminOperatorEmail(row.author_user.email);
  const isMine = row.author_user_id === options.currentUserId;

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
        hideGender: isOperator || !row.author_user.onboarding_completed,
        isOperator,
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
        code: keyword.feed_keyword.code,
        name: keyword.feed_keyword.name,
      })),
      images: row.images.map((image) => ({
        imageId: image.id,
        imageUrl: image.image_url,
        sortOrder: image.sort_order,
      })),
      commentCount: row._count.comments,
      viewCount: row._count.views,
      commentedByMe: options.commentedByMe ?? false,
      isMine,
    },
  };
}

function toKeywordListItemDto(row: {
  feed_keyword_id: number;
  code: string;
  name: string;
  sort_order: number;
}): KeywordListItemDto {
  return {
    feedKeywordId: row.feed_keyword_id,
    code: row.code,
    name: row.name,
    sortOrder: row.sort_order,
  };
}

async function resolveFeedKeywordIds(input: FeedKeywordInput): Promise<number[]> {
  if (input.codes && input.codes.length > 0) {
    const codes = [...new Set(input.codes)];
    const rows = await repo.findActiveKeywordsByCodes(codes);
    if (rows.length !== codes.length) {
      throw new AppError("INVALID_KEYWORD_ID", "존재하지 않거나 비활성 상태인 피드 키워드가 포함되어 있습니다.");
    }

    const idByCode = new Map(rows.map((row) => [row.code, row.feed_keyword_id]));
    return codes.map((code) => idByCode.get(code)).filter((id): id is number => typeof id === "number");
  }

  const ids = [...new Set(input.ids ?? [])];
  if (ids.length === 0) {
    throw new AppError("INVALID_KEYWORDS", "피드 키워드는 1개 이상이어야 합니다.");
  }

  const validKeywords = await repo.findActiveKeywordsByIds(ids);
  if (validKeywords.length !== ids.length) {
    throw new AppError("INVALID_KEYWORD_ID", "존재하지 않거나 비활성 상태인 피드 키워드가 포함되어 있습니다.");
  }

  return ids;
}

export async function listFeeds(
  currentUserId: number,
  keywords: string[] | null,
  cursor: string | null,
): Promise<FeedListDto> {
  const now = new Date();
  const [blockedUserIds, commentedFeedIds, reportedFeedIds] = await Promise.all([
    repo.findBlockedUserIds(currentUserId),
    repo.findCommentedFeedIdsByUser(currentUserId),
    repo.findReportedFeedIdsByUser(currentUserId),
  ]);

  const where: Prisma.SelfDateFeedWhereInput = {
    status: "active",
    expires_at: { gt: now },
    author_user: { status: { not: "banned" } },
  };

  if (blockedUserIds.size > 0) {
    where.author_user_id = { notIn: [...blockedUserIds] };
  }

  if (reportedFeedIds.size > 0) {
    where.id = { notIn: [...reportedFeedIds] };
  }

  const keywordFilters = [...new Set((keywords ?? []).map((keyword) => keyword.trim()).filter(Boolean))];

  if (keywordFilters.length > 0) {
    where.keywords = {
      some: {
        feed_keyword: {
          OR: [
            { code: { in: keywordFilters } },
            { name: { in: keywordFilters } },
          ],
        },
      },
    };
  }

  if (cursor) {
    const decoded = decodeFeedCursor(cursor);
    if (!decoded) {
      throw new AppError("INVALID_CURSOR", "유효하지 않은 cursor 입니다.");
    }
    where.OR = [
      { boost_score: { gt: decoded.boostScore } },
      { boost_score: decoded.boostScore, id: { lt: decoded.id } },
    ];
  }

  const rows = await repo.findActiveFeeds(where);

  const hasNextPage = rows.length > FEED_PAGE_SIZE;
  const slice = hasNextPage ? rows.slice(0, FEED_PAGE_SIZE) : rows;
  const lastRow = slice[slice.length - 1];

  return {
    items: slice.map((row) => toFeedListItemDto(row, { commentedFeedIds, currentUserId })),
    nextCursor:
      hasNextPage && lastRow
        ? encodeFeedCursor({ boostScore: lastRow.boost_score, id: lastRow.id })
        : null,
  };
}

export async function createFeed(
  authorUserId: number,
  text: string,
  feedKeywordInput: FeedKeywordInput,
  images: File[] = [],
  options: { skipActiveFeedCheck?: boolean } = {},
): Promise<CreateFeedResultDto> {
  const now = new Date();
  const normalizedText = normalizeFeedText(text);
  assertFeedImageCount(images.length);

  if (!options.skipActiveFeedCheck) {
    const existing = await repo.findActiveFeedByUser(authorUserId, now);
    if (existing) {
      throw new AppError("FEED_ALREADY_ACTIVE", "이미 활성 상태인 피드가 있습니다. 기존 피드가 만료된 후 작성해주세요.");
    }
  }

  const feedKeywordIds = await resolveFeedKeywordIds(feedKeywordInput);

  const festivalSetting = await repo.findAppSetting("festival_mode");
  const expirySetting = await repo.findAppSetting("feed_expiry_hours");

  const isFestivalMode = festivalSetting?.value === "true";
  const defaultExpiryHours = isFestivalMode ? 2 : 24;
  const expiryHours = expirySetting ? Number(expirySetting.value) : defaultExpiryHours;
  const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);

  const imageUrls = await Promise.all(images.map((image) => saveFeedImageFile(image)));

  const feed = await prisma.$transaction(async (tx) => {
    const createdFeed = await repo.createFeedWithKeywords(tx, { authorUserId, text: normalizedText, expiresAt }, feedKeywordIds);
    await repo.createFeedImages(
      tx,
      createdFeed.id,
      imageUrls.map((imageUrl, index) => ({
        imageUrl,
        sortOrder: index + 1,
      })),
    );
    return createdFeed;
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

  const commentedByMe = Boolean(await repo.findExistingCommentByUser(feedId, currentUserId));

  return toFeedDetailDto(feed, { commentedByMe, currentUserId });
}

export async function updateFeed(
  currentUserId: number,
  feedId: number,
  text: string | undefined,
  feedKeywordInput: FeedKeywordInput | undefined,
  images: File[] = [],
  deleteImageIds: number[] = [],
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

  const normalizedText = text === undefined ? undefined : normalizeFeedText(text);
  const deleteImageIdSet = new Set(deleteImageIds);
  const existingImageIds = new Set(feed.images.map((image) => image.id));
  const deletedExistingImageCount = [...deleteImageIdSet].filter((imageId) => existingImageIds.has(imageId)).length;
  assertFeedImageCount(feed.images.length - deletedExistingImageCount + images.length);

  const feedKeywordIds = feedKeywordInput ? await resolveFeedKeywordIds(feedKeywordInput) : undefined;

  const imageUrls = await Promise.all(images.map((image) => saveFeedImageFile(image)));
  const deletedImageUrls: string[] = [];

  await prisma.$transaction(async (tx) => {
    const nextText = normalizedText ?? feed.text;
    await repo.updateFeedText(tx, feedId, nextText, now);
    if (feedKeywordIds) await repo.replaceFeedKeywords(tx, feedId, feedKeywordIds);

    const imagesToDelete = await repo.findFeedImagesByIds(tx, feedId, deleteImageIds);
    deletedImageUrls.push(...imagesToDelete.map((image) => image.image_url));
    await repo.deleteFeedImagesByIds(tx, feedId, deleteImageIds);

    const maxSortOrder = await repo.getMaxImageSortOrder(tx, feedId);
    await repo.createFeedImages(
      tx,
      feedId,
      imageUrls.map((imageUrl, index) => ({
        imageUrl,
        sortOrder: maxSortOrder + index + 1,
      })),
    );
  });

  await Promise.all(deletedImageUrls.map((imageUrl) => removeStoredFeedImage(imageUrl)));

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
): Promise<RecordFeedViewResultDto> {
  const feed = await repo.findFeedForView(feedId);
  if (!feed) {
    throw new AppError("FEED_NOT_FOUND", "존재하지 않는 피드입니다.");
  }

  if (feed.status !== "active") {
    throw new AppError("FEED_NOT_ACTIVE", "활성 상태가 아닌 피드입니다.");
  }

  if (feed.expires_at <= new Date()) {
    throw new AppError("FEED_NOT_ACTIVE", "만료된 피드입니다.");
  }

  await repo.upsertFeedView(feedId, viewerUserId);
  return {
    recorded: true,
    viewCount: await repo.countFeedViews(feedId),
  };
}

export async function listKeywords(): Promise<KeywordListDto> {
  const rows = await repo.findActiveKeywords();
  return {
    items: rows.map(toKeywordListItemDto),
  };
}
