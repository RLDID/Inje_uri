import { NextRequest } from "next/server";
import { AppError } from "@/server/lib/app-error";
import { ok, fail } from "@/server/lib/response";
import { getAuthUser } from "@/server/lib/auth";
import { blockPhone } from "@/server/services/content/safety.service";

/**
 * D-13: 전화번호 기반 차단 API
 *
 * 전화번호 기반으로 보고 싶지 않은 사용자를 차단한다.
 * 전화번호는 원문 저장하지 않고 SHA-256 해시값으로만 저장 (개인정보 보호).
 * 중복 방지 제약 (user_id, phone_number_hash) 으로 같은 번호를 두 번 차단하지 않는다.
 *
 * @route POST /api/phone-blocks
 *
 * @requires 인증 - 로그인 사용자만 (user_id 필요)
 *
 * @param phoneNumberE164 - 국제 표준 전화번호 (필수, string, 예: "+821012345678")
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: { phoneBlockId: number }
 * }
 *
 * @returns 400 - 에러 (파라미터 오류, 이미 차단됨 등)
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see phone_blocks 테이블 (prisma/schema.prisma)
 * @see Analysis/d-part-detail_v2.md - D-13 상세 스펙
 */
export async function POST(request: NextRequest) { // HTTP POST(쓰기) 메서드로 전화번호 차단을 생성하는 API
  try {
    const user = await getAuthUser(request);
    if (!user) return fail("UNAUTHORIZED", "인증이 필요합니다.");

    const body = await request.json(); // 요청 바디에서 JSON 파싱
    const { phoneNumberE164 } = body as { phoneNumberE164: unknown }; // 전화번호 추출

    if (typeof phoneNumberE164 !== "string" || !phoneNumberE164.trim()) { // 전화번호가 문자열이 아니거나 빈 값인 경우
      return fail("INVALID_PHONE_NUMBER", "전화번호는 빈 값이 아닌 문자열이어야 합니다.");
    }

    const e164Regex = /^\+[1-9]\d{6,14}$/; // E.164 국제 전화번호 형식 검증 (+ 기호 + 국가코드 + 번호, 7~15자리)
    if (!e164Regex.test(phoneNumberE164)) { // 형식이 맞지 않으면 에러 반환
      return fail("INVALID_PHONE_FORMAT", "전화번호는 E.164 형식이어야 합니다. (예: +821012345678)");
    }

    const userId = user.id;

    const data = await blockPhone(userId, phoneNumberE164);

    return ok(data); // 성공 응답
  } catch (error) {
    if (error instanceof AppError) {
      return fail(error.code, error.message);
    }

    console.error("[POST /api/phone-blocks]", error); // 서버 에러 로그

    return fail("INTERNAL_SERVER_ERROR", "전화번호 차단 처리 중 오류가 발생했습니다."); // 실패 응답
  }
}
