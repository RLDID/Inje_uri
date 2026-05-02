import type { NextRequest } from "next/server";
import { getAuthUser } from "@/server/lib/auth";
import { ApiError } from "@/server/lib/errors";
import { ERROR } from "@/server/lib/errors";
import { ok, fail } from "@/server/lib/response";
import { selectCandidate } from "@/server/services/matching/recommendation.service";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return fail(ERROR.UNAUTHORIZED, "인증이 필요합니다.");
    const userId = user.id;
    const body = await req.json();
    const { recommendation_item_id } = body;

    if (!recommendation_item_id || typeof recommendation_item_id !== "number") {
      return fail(ERROR.INVALID_INPUT, "recommendation_item_id가 필요합니다.");
    }

    const data = await selectCandidate(userId, recommendation_item_id);
    return ok(data);
  } catch (e) {
    if (e instanceof ApiError) {
      return fail(e.code, e.message);
    }
    console.error("[POST /api/recommendations/select]", e);
    return fail(ERROR.INTERNAL_ERROR, "서버 오류가 발생했습니다.");
  }
}
