import { NextRequest } from "next/server";
import { ok, fail } from "@/server/lib/response";
import { AppError } from "@/server/lib/app-error";
import { getAuthUser } from "@/server/lib/auth";
import { listFeeds, createFeed } from "@/server/services/content/feed.service";

/**
 * D-01: 피드 목록 조회 API
 *
 * 피드 탭 목록을 최신순으로 조회한다.
 * 활성(active) + 미만료 피드만, 차단 관계 양방향 필터, banned 사용자 제외.
 * 키워드 필터 + cursor 페이징 지원.
 *
 * @route GET /api/feeds
 *
 * @requires 인증 - 로그인 사용자만 (차단 필터에 사용자 ID 필요)
 *
 * @param keyword - 피드 키워드 이름 필터 (선택, query string)
 * @param cursor - 다음 목록 기준점 피드 ID (선택, query string)
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: {
 *     items: Array<{ feedId, text, status, createdAt, expiresAt, author, keywords, primaryImage, commentCount }>,
 *     nextCursor: number | null
 *   }
 * }
 *
 * @returns 400 - 에러
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see self_date_feeds, blocks, feed_keywords 테이블 (prisma/schema.prisma)
 * @see Analysis/d-part-detail_v2.md - D-01 상세 스펙
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return fail("UNAUTHORIZED", "인증이 필요합니다.");
    const currentUserId = user.id;

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword");
    const cursorParam = searchParams.get("cursor");

    const cursor = cursorParam ? Number(cursorParam) : null;
    if (cursorParam && (Number.isNaN(cursor) || !Number.isInteger(cursor))) {
      return fail("INVALID_CURSOR", "cursor는 정수여야 합니다.");
    }

    const data = await listFeeds(currentUserId, keyword, cursor);
    return ok(data);
  } catch (error) {
    if (error instanceof AppError) return fail(error.code, error.message);
    console.error("[GET /api/feeds]", error);
    return fail("INTERNAL_SERVER_ERROR", "피드 목록을 불러오는 중 오류가 발생했습니다.");
  }
}

/**
 * D-02: 피드 작성 API
 *
 * 새 피드를 작성한다.
 * 1인 1활성피드 검증 → 만료시간 계산 (app_settings) → 피드 + 키워드 묶음 생성.
 * 이미지 업로드는 저장소 구현 후 추가 예정 (현재 TODO).
 *
 * @route POST /api/feeds
 *
 * @requires 인증 - 로그인 사용자만 (author_user_id 필요)
 *
 * @param text - 피드 본문 (필수, string)
 * @param feedKeywordIds - 선택한 피드 키워드 ID 배열 (필수, number[])
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: { feedId: number, expiresAt: string }
 * }
 *
 * @returns 400 - 에러 (파라미터 오류, 이미 활성 피드 있음, 키워드 유효성 등)
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see self_date_feeds, self_date_feed_keywords, app_settings 테이블 (prisma/schema.prisma)
 * @see Analysis/d-part-detail_v2.md - D-02 상세 스펙
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return fail("UNAUTHORIZED", "인증이 필요합니다.");

    const body = await request.json();
    const { text, feedKeywordIds } = body as { text: unknown; feedKeywordIds: unknown };

    if (typeof text !== "string" || !text.trim()) {
      return fail("INVALID_TEXT", "피드 본문은 빈 값이 아닌 문자열이어야 합니다.");
    }

    if (!Array.isArray(feedKeywordIds) || feedKeywordIds.length === 0) {
      return fail("INVALID_KEYWORDS", "피드 키워드 ID 배열은 1개 이상이어야 합니다.");
    }

    const hasInvalidId = feedKeywordIds.some((id) => typeof id !== "number" || !Number.isInteger(id));
    if (hasInvalidId) {
      return fail("INVALID_KEYWORD_ID", "피드 키워드 ID는 모두 정수여야 합니다.");
    }

    const authorUserId = user.id;

    const data = await createFeed(authorUserId, text, feedKeywordIds as number[]);
    return ok(data);
  } catch (error) {
    if (error instanceof AppError) return fail(error.code, error.message);
    console.error("[POST /api/feeds]", error);
    return fail("INTERNAL_SERVER_ERROR", "피드 작성 중 오류가 발생했습니다.");
  }
}
