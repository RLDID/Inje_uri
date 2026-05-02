import { NextRequest } from "next/server";
import { ok, fail } from "@/server/lib/response";
import { AppError } from "@/server/lib/app-error";
import { getAuthUser } from "@/server/lib/auth";
import { createComment, listComments } from "@/server/services/content/comment.service";

/**
 * D-06: 댓글 작성 API
 *
 * 피드에 댓글(=호감 표현)을 남긴다.
 * 활성(active) + 미만료 피드에만 작성 가능.
 * 1인 1댓글 (feed_id, commenter_user_id) 중복 방지.
 * 자기 피드에는 댓글 불가. 차단 관계 시 404 처리.
 *
 * @route POST /api/feeds/:id/comments
 *
 * @requires 인증 - 로그인 사용자만
 *
 * @param id - URL 경로의 피드 ID
 * @param content - 댓글 본문 (필수, string)
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: { commentId: number }
 * }
 *
 * @returns 400 - 에러
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see feed_comments, self_date_feeds, blocks 테이블 (prisma/schema.prisma)
 * @see Analysis/d-part-detail_v2.md - D-06 상세 스펙
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const feedId = Number(id);
    if (Number.isNaN(feedId) || !Number.isInteger(feedId)) {
      return fail("INVALID_FEED_ID", "유효하지 않은 피드 ID입니다.");
    }

    const body = await request.json();
    const { content } = body as { content: unknown };
    if (typeof content !== "string" || !content.trim()) {
      return fail("INVALID_CONTENT", "댓글 본문은 빈 값이 아닌 문자열이어야 합니다.");
    }

    const user = await getAuthUser(request);
    if (!user) return fail("UNAUTHORIZED", "인증이 필요합니다.");
    const currentUserId = user.id;
    const data = await createComment(currentUserId, feedId, content);
    return ok(data);
  } catch (error) {
    if (error instanceof AppError) return fail(error.code, error.message);
    console.error("[POST /api/feeds/:id/comments]", error);
    return fail("INTERNAL_SERVER_ERROR", "댓글 작성 중 오류가 발생했습니다.");
  }
}

/**
 * D-05: 피드 댓글 목록 조회 API
 *
 * 특정 피드의 댓글 목록을 조회한다.
 * 삭제된 댓글(soft delete) 제외, banned 사용자 댓글 제외, 차단 관계 양방향 필터.
 * 피드 존재 + 접근 권한 검증 (D-03과 동일한 검증).
 *
 * @route GET /api/feeds/:id/comments
 *
 * @requires 인증 - 로그인 사용자만 (차단 필터에 사용자 ID 필요)
 *
 * @param id - URL 경로의 피드 ID
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: {
 *     items: Array<{ commentId, content, createdAt, commenter: { userId, nickname, profileImage } }>
 *   }
 * }
 *
 * @returns 400 - 에러
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see feed_comments, self_date_feeds, blocks, users 테이블 (prisma/schema.prisma)
 * @see Analysis/d-part-detail_v2.md - D-05 상세 스펙
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
    const data = await listComments(currentUserId, feedId);
    return ok(data);
  } catch (error) {
    if (error instanceof AppError) return fail(error.code, error.message);
    console.error("[GET /api/feeds/:id/comments]", error);
    return fail("INTERNAL_SERVER_ERROR", "댓글 목록을 불러오는 중 오류가 발생했습니다.");
  }
}
