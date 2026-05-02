/**
 * @deprecated
 * POST /api/interests/send — 직접 호감 전송 (B파트 구현 명세서 v1.2 기준 필수 API 아님)
 * 추천/수락 흐름 외 직접 호감 전송 기능으로 일단 유지하되, 정식 문서 반영 전까지 optional로 관리.
 */
import type { NextRequest } from "next/server";
import { getAuthUser } from "@/server/lib/auth";
import { ApiError } from "@/server/lib/errors";
import { ERROR } from "@/server/lib/errors";
import { ok, fail } from "@/server/lib/response";
import { sendInterest } from "@/server/services/matching/interest.service";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return fail(ERROR.UNAUTHORIZED, "인증이 필요합니다.");
    const userId = user.id;
    const body = await req.json();
    const { to_user_id } = body;

    if (!to_user_id || typeof to_user_id !== "number") {
      return fail(ERROR.INVALID_INPUT, "to_user_id가 필요합니다.");
    }

    const data = await sendInterest(userId, to_user_id);
    return ok(data);
  } catch (e) {
    if (e instanceof ApiError) {
      return fail(e.code, e.message);
    }
    console.error("[POST /api/interests/send]", e);
    return fail(ERROR.INTERNAL_ERROR, "서버 오류가 발생했습니다.");
  }
}
