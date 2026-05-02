import { NextRequest } from "next/server";
import { ok, fail } from "@/server/lib/response";
import { AppError } from "@/server/lib/app-error";
import { getAuthUser } from "@/server/lib/auth";
import { deleteFeed, getFeedDetail, updateFeed } from "@/server/services/content/feed.service";

/**
 * D-03: 피드 상세 조회 API
 *
 * 피드 상세와 작성자 요약, 키워드, 이미지, 댓글 수를 반환한다.
 * 활성(active) + 미만료 피드만 조회 가능. 차단 관계·banned 작성자는 404 처리.
 *
 * @route GET /api/feeds/:id
 *
 * @requires 인증 - 로그인 사용자만 (차단 관계 확인에 사용자 ID 필요)
 *
 * @param id - URL 경로의 피드 ID
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: {
 *     feed: {
 *       feedId, text, status, createdAt, updatedAt, expiresAt, boostScore,
 *       author: { userId, nickname, gender, department, studentYear, bio, profileImages },
 *       keywords, images, commentCount
 *     }
 *   }
 * }
 *
 * @returns 400 - 에러
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see self_date_feeds, users, user_profile_images 테이블 (prisma/schema.prisma)
 * @see Analysis/d-part-detail_v2.md - D-03 상세 스펙
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const feedId = Number(id);

    if (Number.isNaN(feedId) || !Number.isInteger(feedId)) {
      return fail("INVALID_FEED_ID", "유효하지 않은 피드 ID입니다.");
    }

    const user = await getAuthUser(request);
    if (!user) return fail("UNAUTHORIZED", "인증이 필요합니다.");
    const currentUserId = user.id;

    const data = await getFeedDetail(currentUserId, feedId);
    return ok(data);
  } catch (error) {
    if (error instanceof AppError) return fail(error.code, error.message);
    console.error("[GET /api/feeds/:id]", error);
    return fail("INTERNAL_SERVER_ERROR", "피드 상세를 불러오는 중 오류가 발생했습니다.");
  }
}

/**
 * D-04: 피드 수정 API
 *
 * 활성 피드의 본문/키워드를 수정한다.
 * 본인 피드만 수정 가능. expires_at은 변경하지 않는다 (정책: "수정 할 수 있으나 유지 시간과는 독립").
 * 키워드 수정 시 기존 연결 삭제 → 새 키워드 연결 (전체 교체).
 *
 * @route PATCH /api/feeds/:id
 *
 * @requires 인증 - 로그인 사용자만 (본인 피드 검증에 사용자 ID 필요)
 *
 * @param id - URL 경로의 피드 ID
 * @param text - 수정할 본문 (선택, string)
 * @param feedKeywordIds - 수정할 키워드 ID 배열 (선택, number[] — 전체 교체)
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: { updated: true }
 * }
 *
 * @returns 400 - 에러 (권한 없음, 피드 없음, 만료, 키워드 유효성 등)
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see self_date_feeds, self_date_feed_keywords, feed_keywords 테이블 (prisma/schema.prisma)
 * @see Analysis/d-part-detail_v2.md - D-04 상세 스펙
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const feedId = Number(id);

    if (Number.isNaN(feedId) || !Number.isInteger(feedId)) {
      return fail("INVALID_FEED_ID", "유효하지 않은 피드 ID입니다.");
    }

    const body = await request.json() as Record<string, unknown>;
    const text = body.text;
    const feedKeywordIds = body.feedKeywordIds;

    const hasText = text !== undefined;
    const hasKeywords = feedKeywordIds !== undefined;

    if (!hasText && !hasKeywords) {
      return fail("NO_UPDATE_FIELDS", "수정할 항목이 없습니다. text 또는 feedKeywordIds를 전달해주세요.");
    }

    if (hasText && (typeof text !== "string" || !text.trim())) {
      return fail("INVALID_TEXT", "피드 본문은 빈 값이 아닌 문자열이어야 합니다.");
    }

    if (hasKeywords) {
      if (!Array.isArray(feedKeywordIds) || feedKeywordIds.length === 0) {
        return fail("INVALID_KEYWORDS", "피드 키워드 ID 배열은 1개 이상이어야 합니다.");
      }

      const hasInvalidId = feedKeywordIds.some((kwId) => typeof kwId !== "number" || !Number.isInteger(kwId));
      if (hasInvalidId) {
        return fail("INVALID_KEYWORD_ID", "피드 키워드 ID는 모두 정수여야 합니다.");
      }
    }

    const user = await getAuthUser(request);
    if (!user) return fail("UNAUTHORIZED", "인증이 필요합니다.");
    const currentUserId = user.id;

    const data = await updateFeed(
      currentUserId,
      feedId,
      typeof text === "string" ? text : undefined,
      Array.isArray(feedKeywordIds) ? feedKeywordIds : undefined,
    );
    return ok(data);
  } catch (error) {
    if (error instanceof AppError) return fail(error.code, error.message);
    console.error("[PATCH /api/feeds/:id]", error);
    return fail("INTERNAL_SERVER_ERROR", "피드 수정 중 오류가 발생했습니다.");
  }
}

/**
 * D-14: 피드 삭제 API
 *
 * 본인 피드를 soft delete한다 (status를 "deleted"로 변경).
 * 이미 삭제된 피드는 중복 삭제 불가.
 *
 * @route DELETE /api/feeds/:id
 *
 * @requires 인증 - 로그인 사용자만 (본인 피드 검증에 사용자 ID 필요)
 *
 * @param id - URL 경로의 피드 ID
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: { deleted: true }
 * }
 *
 * @returns 400 - 에러 (권한 없음, 피드 없음, 이미 삭제됨 등)
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see self_date_feeds 테이블 (prisma/schema.prisma)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const feedId = Number(id);

    if (Number.isNaN(feedId) || !Number.isInteger(feedId)) {
      return fail("INVALID_FEED_ID", "유효하지 않은 피드 ID입니다.");
    }

    const user = await getAuthUser(request);
    if (!user) return fail("UNAUTHORIZED", "인증이 필요합니다.");
    const currentUserId = user.id;

    const data = await deleteFeed(currentUserId, feedId);
    return ok(data);
  } catch (error) {
    if (error instanceof AppError) return fail(error.code, error.message);
    console.error("[DELETE /api/feeds/:id]", error);
    return fail("INTERNAL_SERVER_ERROR", "피드 삭제 중 오류가 발생했습니다.");
  }
}
