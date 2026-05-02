import { ok, fail } from "@/server/lib/response";
import { AppError } from "@/server/lib/app-error";
import { listKeywords } from "@/server/services/content/feed.service";

/**
 * D-10: 피드 키워드 목록 API
 *
 * 피드 작성/필터에 필요한 키워드 목록을 반환한다.
 * feed_keywords 테이블에서 is_active = true인 항목만 sort_order 오름차순으로 조회.
 *
 * @route GET /api/feed-keywords
 *
 * @requires 인증 - 미정 (비로그인 접근 허용 여부 정책 확인 필요)
 *
 * @param 없음 - 요청 파라미터 없이 호출
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: {
 *     items: [
 *       { feedKeywordId: number, name: string, sortOrder: number }
 *     ]
 *   }
 * }
 *
 * @returns 400 - 서버 에러
 * {
 *   success: false,
 *   error: { code: "INTERNAL_SERVER_ERROR", message: string }
 * }
 *
 * @see feed_keywords 테이블 (prisma/schema.prisma)
 * @see Analysis/d-part-detail_v2.md - D-10 상세 스펙
 */
export async function GET() {// HTTP GET(조회) 메서드로 피드 키워드 목록을 반환하는 API
  try {
    const data = await listKeywords();
    return ok(data); // 성공 응답
  } catch (error) { // 에러 처리: 콘솔에 에러 로그 출력 후 클라이언트에 400 응답 반환
    if (error instanceof AppError) return fail(error.code, error.message);
    console.error("[GET /api/feed-keywords]", error); // 서버 에러 로그 출력
    return fail("INTERNAL_SERVER_ERROR", "키워드 목록을 불러오는 중 오류가 발생했습니다."); // 실패 응답
  }
}
