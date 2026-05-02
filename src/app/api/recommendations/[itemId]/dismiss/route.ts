import type { NextRequest } from "next/server";
import { getAuthUser } from "@/server/lib/auth";
import { ApiError } from "@/server/lib/errors";
import { ERROR } from "@/server/lib/errors";
import { ok, fail } from "@/server/lib/response";
import { dismissCandidate } from "@/server/services/matching/recommendation.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const user = await getAuthUser(req);
    if (!user) return fail(ERROR.UNAUTHORIZED, "인증이 필요합니다.");
    const userId = user.id;
    const { itemId } = await params;
    const parsedItemId = parseInt(itemId, 10);

    if (isNaN(parsedItemId) || parsedItemId <= 0) {
      return fail(ERROR.INVALID_INPUT, "유효하지 않은 추천 항목 ID입니다.");
    }

    const data = await dismissCandidate(userId, parsedItemId);
    return ok(data);
  } catch (e) {
    if (e instanceof ApiError) {
      return fail(e.code, e.message);
    }
    console.error("[POST /api/recommendations/[itemId]/dismiss]", e);
    return fail(ERROR.INTERNAL_ERROR, "서버 오류가 발생했습니다.");
  }
}
