import { NextRequest } from "next/server";
import { AppError } from "@/server/lib/app-error";
import { ok, fail } from "@/server/lib/response";
import { getAuthUser } from "@/server/lib/auth";
import { blockUser, listBlocks, unblockUser } from "@/server/services/content/safety.service";

/**
 * D-16: 차단 목록 조회 API
 *
 * 로그인 사용자가 차단한 사용자 목록을 조회한다.
 * 활성 차단(unblocked_at이 null)만 반환.
 *
 * @route GET /api/blocks
 *
 * @requires 인증 - 로그인 사용자만
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: {
 *     items: Array<{ blockId, blockedUser: { userId, nickname, profileImage }, reason, createdAt }>
 *   }
 * }
 *
 * @returns 400 - 에러
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see blocks, users 테이블 (prisma/schema.prisma)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return fail("UNAUTHORIZED", "인증이 필요합니다.");
    const currentUserId = user.id;
    const data = await listBlocks(currentUserId);

    return ok(data);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message);
    }

    console.error("[GET /api/blocks]", error);

    return fail("INTERNAL_SERVER_ERROR", "차단 목록을 불러오는 중 오류가 발생했습니다.");
  }
}

/**
 * D-12: 사용자 차단 API
 *
 * 사용자 간 차단 관계를 생성한다.
 * blocks 테이블에 차단 기록을 추가하며, 차단 즉시 피드/댓글 목록에서 해당 사용자 콘텐츠가 필터링된다.
 * 중복 방지 제약 (blocker_user_id, blocked_user_id) 으로 같은 관계가 두 번 들어가지 않는다.
 *
 * @route POST /api/blocks
 *
 * @requires 인증 - 로그인 사용자만 (blocker_user_id 필요)
 *
 * @param blockedUserId - 차단 대상 사용자 ID (필수, number)
 * @param reason - 차단 사유 (선택, string)
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: { blockId: number }
 * }
 *
 * @returns 400 - 에러 (파라미터 오류, 자기 차단, 대상 없음, 이미 차단됨 등)
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see blocks 테이블 (prisma/schema.prisma)
 * @see Analysis/d-part-detail_v2.md - D-12 상세 스펙
 */
export async function POST(request: NextRequest) { // HTTP POST 메서드로 사용자 차단 관계를 생성하는 API
  try {
    const user = await getAuthUser(request);
    if (!user) return fail("UNAUTHORIZED", "인증이 필요합니다.");

    const body = await request.json(); // 요청 바디에서 JSON 파싱
    const { blockedUserId, reason } = body as { blockedUserId: unknown; reason: unknown }; // 차단 대상 ID + 사유 추출

    if (typeof blockedUserId !== "number" || !Number.isInteger(blockedUserId)) { // blockedUserId가 정수가 아닌 경우
      return fail("INVALID_BLOCKED_USER_ID", "차단 대상 사용자 ID가 유효하지 않습니다.");
    }

    if (reason !== undefined && typeof reason !== "string") { // reason이 있는데 문자열이 아닌 경우
      return fail("INVALID_REASON", "차단 사유가 string이 아닙니다.");
    }

    const blockerUserId = user.id;

    const data = await blockUser(blockerUserId, blockedUserId, (reason as string | undefined) ?? null);

    return ok(data); // 성공 응답
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message);
    }

    console.error("[POST /api/blocks]", error); // 서버 에러 로그

    return fail("INTERNAL_SERVER_ERROR", "차단 처리 중 오류가 발생했습니다."); // 실패 응답
  }
}

/**
 * D-17: 차단 해제 API
 *
 * 차단 관계를 해제한다 (soft delete — unblocked_at에 현재 시각 기록).
 * 본인이 차단한 관계만 해제 가능.
 *
 * @route DELETE /api/blocks
 *
 * @requires 인증 - 로그인 사용자만
 *
 * @param blockId - 차단 ID (필수, number — request body)
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: { unblocked: true }
 * }
 *
 * @returns 400 - 에러 (파라미터 오류, 차단 없음, 이미 해제됨 등)
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see blocks 테이블 (prisma/schema.prisma)
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return fail("UNAUTHORIZED", "인증이 필요합니다.");

    const body = await request.json();
    const { blockId } = body as { blockId: unknown };

    if (typeof blockId !== "number" || !Number.isInteger(blockId)) {
      return fail("INVALID_BLOCK_ID", "차단 ID가 유효하지 않습니다.");
    }

    const currentUserId = user.id;

    const data = await unblockUser(currentUserId, blockId);

    return ok(data);
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message);
    }

    console.error("[DELETE /api/blocks]", error);

    return fail("INTERNAL_SERVER_ERROR", "차단 해제 중 오류가 발생했습니다.");
  }
}
