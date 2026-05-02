import { NextRequest } from "next/server";
import { ok, fail } from "@/server/lib/response";
import { AppError } from "@/server/lib/app-error";
import { getAuthUser } from "@/server/lib/auth";
import { listMyCommentedFeeds } from "@/server/services/content/comment.service";

/**
 * D-07: 내가 댓글 단 피드 목록 API
 *
 * 내가 댓글을 남긴 피드와 댓글 정보를 함께 조회한다.
 * 삭제된 댓글 제외, banned 작성자 피드 제외, 차단 관계 피드 제외.
 * 최신순 정렬 (댓글 작성일 기준).
 *
 * @route GET /api/feeds/commented-by-me
 *
 * @requires 인증 - 로그인 사용자만
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: {
 *     items: Array<{
 *       comment: { commentId, content, createdAt },
 *       feed: { feedId, text, status, expiresAt, author: { userId, nickname, profileImage } }
 *     }>
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
 * @see Analysis/d-part-detail_v2.md - D-07 상세 스펙
 */
export async function GET(request: NextRequest) { // 내가 댓글 단 피드 목록을 조회하는 API
  try {
    const user = await getAuthUser(request);
    if (!user) return fail("UNAUTHORIZED", "인증이 필요합니다.");
    const currentUserId = user.id;

    const data = await listMyCommentedFeeds(currentUserId);
    return ok(data); // 성공 응답
  } catch (error) {
    if (error instanceof AppError) return fail(error.code, error.message);
    console.error("[GET /api/feeds/commented-by-me]", error); // 서버 에러 로그
    return fail("INTERNAL_SERVER_ERROR", "내 댓글 목록을 불러오는 중 오류가 발생했습니다."); // 실패 응답
  }
}
