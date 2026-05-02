import { NextRequest } from "next/server";
import { ok, fail } from "@/server/lib/response";
import { AppError } from "@/server/lib/app-error";
import { getAuthUser } from "@/server/lib/auth";
import { recordFeedView } from "@/server/services/content/feed.service";

/**
 * D-09: 피드 조회 기록 API
 *
 * 피드 상세/카드 노출 시 고유 조회자를 기록한다.
 * feed_views 테이블에 UPSERT — 이미 조회했으면 무시, 처음이면 새로 저장.
 * 중복 방지 제약 (feed_id, viewer_user_id) 으로 같은 사람이 여러 번 봐도 1건만 저장.
 *
 * @route POST /api/feeds/:id/view
 *
 * @requires 인증 - 로그인 사용자만 (viewer_user_id 필요)
 *
 * @param id - URL 경로의 피드 ID
 *
 * @returns 200 - 성공 (신규 기록 또는 이미 기록됨)
 * {
 *   success: true,
 *   data: { recorded: true }
 * }
 *
 * @returns 400 - 에러 (피드 없음, 파라미터 오류 등)
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see feed_views 테이블 (prisma/schema.prisma)
 * @see Analysis/d-part-detail_v2.md - D-09 상세 스펙
 */
export async function POST( // HTTP POST(쓰기) 메서드로 조회 기록을 DB에 저장하는 API
  request: NextRequest, // 요청 객체 (사용하지 않지만 Next.js API 핸들러 시그니처에 필요) 향후 쿠키 등에서 사용자 인증 정보 추출 시 활용 가능
  { params }: { params: Promise<{ id: string }> }, // URL 경로 매개변수 (피드 ID) - Next.js 라우팅에서 자동으로 전달
) {
  try {
    const { id } = await params;
    const feedId = Number(id);

    if (Number.isNaN(feedId) || !Number.isInteger(feedId)) {
      return fail("INVALID_FEED_ID", "유효하지 않은 피드 ID입니다.");
    }

    const user = await getAuthUser(request);
    if (!user) return fail("UNAUTHORIZED", "인증이 필요합니다.");
    const viewerUserId = user.id;

    const data = await recordFeedView(feedId, viewerUserId);
    return ok(data);
  } catch (error) {
    if (error instanceof AppError) return fail(error.code, error.message);
    console.error("[POST /api/feeds/:id/view]", error);
    return fail("INTERNAL_SERVER_ERROR", "조회 기록 저장 중 오류가 발생했습니다.");
  }
}
