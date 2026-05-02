import { NextRequest } from "next/server";
import { AppError } from "@/server/lib/app-error";
import { ok, fail } from "@/server/lib/response";
import { getAuthUser } from "@/server/lib/auth";
import { createReport } from "@/server/services/content/safety.service";

/**
 * D-11: 공통 신고 API
 *
 * 프로필/피드/댓글/채팅방/메시지 신고를 공통 모델로 저장한다.
 * targetType에 따라 대상 테이블에서 존재 여부를 검증하고, reports 테이블에 기록한다.
 * alsoBlock = true이면 신고와 동시에 차단도 처리 (Prisma 묶음 처리 사용).
 *
 * @route POST /api/reports
 *
 * @requires 인증 - 로그인 사용자만 (reporter_user_id 필요)
 *
 * @param targetType - 신고 대상 종류 (필수, "user" | "feed" | "feed_comment" | "chat_room" | "message")
 * @param targetId - 신고 대상 ID (필수, number)
 * @param reasonType - 신고 유형 (필수, string)
 * @param description - 상세 설명 (선택, string)
 * @param alsoBlock - true이면 신고와 동시에 차단 (선택, boolean)
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: { reportId: number }
 * }
 *
 * @returns 400 - 에러 (파라미터 오류, 대상 없음, 자기 신고 등)
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see reports 테이블 (prisma/schema.prisma)
 * @see Analysis/d-part-detail_v2.md - D-11 상세 스펙
 */

const VALID_TARGET_TYPES = ["user", "feed", "feed_comment", "chat_room", "message"] as const; // 허용되는 신고 대상 종류
type TargetType = (typeof VALID_TARGET_TYPES)[number];

export async function POST(request: NextRequest) { // HTTP POST 메서드로 신고를 생성하는 API
  try {
    const user = await getAuthUser(request);
    if (!user) return fail("UNAUTHORIZED", "인증이 필요합니다.");

    const body = await request.json(); // 요청 바디에서 JSON 파싱
    const { targetType, targetId, reasonType, description, alsoBlock } = body as {
      targetType: unknown;
      targetId: unknown;
      reasonType: unknown;
      description: unknown;
      alsoBlock: unknown;
    };

    if (typeof targetType !== "string" || !VALID_TARGET_TYPES.includes(targetType as TargetType)) { // targetType 유효성 검증
      return fail("INVALID_TARGET_TYPE", `신고 대상 종류는 ${VALID_TARGET_TYPES.join(", ")} 중 하나여야 합니다.`);
    }

    if (typeof targetId !== "number" || !Number.isInteger(targetId)) { // targetId가 정수가 아닌 경우
      return fail("INVALID_TARGET_ID", "신고 대상 ID는 정수여야 합니다.");
    }

    if (typeof reasonType !== "string" || !reasonType.trim()) { // reasonType이 빈 문자열이거나 문자열이 아닌 경우
      return fail("INVALID_REASON_TYPE", "신고 유형은 빈 값이 아닌 문자열이어야 합니다.");
    }

    if (description !== undefined && typeof description !== "string") { // description이 있는데 문자열이 아닌 경우
      return fail("INVALID_DESCRIPTION", "상세 설명은 문자열이어야 합니다.");
    }

    const reporterUserId = user.id;

    const validatedType = targetType as TargetType; // 위에서 검증 완료된 targetType을 타입 단언
    const data = await createReport(reporterUserId, {
      targetType: validatedType,
      targetId,
      reasonType,
      description: (description as string | undefined) ?? null,
      alsoBlock: alsoBlock === true,
    });

    return ok(data); // 성공 응답
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message);
    }

    console.error("[POST /api/reports]", error); // 서버 에러 로그

    return fail("INTERNAL_SERVER_ERROR", "신고 처리 중 오류가 발생했습니다."); // 실패 응답
  }
}
