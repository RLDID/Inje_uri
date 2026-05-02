import type { NextRequest } from "next/server";
import { getAuthUser } from "@/server/lib/auth";
import { ApiError } from "@/server/lib/errors";
import { ERROR } from "@/server/lib/errors";
import { ok, fail } from "@/server/lib/response";
import {
  getRecommendationSetting,
  updateRecommendationSetting,
} from "@/server/services/matching/recommendation-setting.service";

// ─────────────────────────────────────────────
// GET: 추천 설정 조회
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return fail(ERROR.UNAUTHORIZED, "인증이 필요합니다.");
    const userId = user.id;
    const data = await getRecommendationSetting(userId);
    return ok(data);
  } catch (e) {
    if (e instanceof ApiError) {
      return fail(e.code, e.message);
    }
    console.error("[GET /api/recommendation-settings]", e);
    return fail(ERROR.INTERNAL_ERROR, "서버 오류가 발생했습니다.");
  }
}

// ─────────────────────────────────────────────
// PATCH: 추천 설정 업데이트 (부분 업데이트 UPSERT)
// ─────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return fail(ERROR.UNAUTHORIZED, "인증이 필요합니다.");
    const userId = user.id;
    const body = await req.json();

    const { exclude_same_department, reduce_same_year, preferred_age_min, preferred_age_max } =
      body;

    const data = await updateRecommendationSetting(userId, {
      exclude_same_department,
      reduce_same_year,
      preferred_age_min,
      preferred_age_max,
    });
    return ok(data);
  } catch (e) {
    if (e instanceof ApiError) {
      return fail(e.code, e.message);
    }
    console.error("[PATCH /api/recommendation-settings]", e);
    return fail(ERROR.INTERNAL_ERROR, "서버 오류가 발생했습니다.");
  }
}
