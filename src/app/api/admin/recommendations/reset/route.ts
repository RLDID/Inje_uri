import type { NextRequest } from "next/server";
import { ApiError } from "@/server/lib/errors";
import { ERROR } from "@/server/lib/errors";
import { ok, fail } from "@/server/lib/response";
import { resetTestData } from "@/server/services/matching/recommendation.service";

// ─────────────────────────────────────────────
// POST: 배포 전 테스트 데이터 초기화
// 초기화 대상: chat_rooms, interests, daily_recommendations,
//              recommendation_dismisses, recommendation_settings,
//              internal_job_runs (daily_recommendations)
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-batch-secret");
    if (secret !== process.env.BATCH_SECRET) {
      return fail(ERROR.UNAUTHORIZED, "인증되지 않은 요청입니다.", 401);
    }

    const deleted = await resetTestData();

    return ok({
      deleted: {
        chat_rooms: deleted.chatRooms,
        interests: deleted.interests,
        daily_recommendations: deleted.recommendations,
        recommendation_dismisses: deleted.dismisses,
        recommendation_settings: deleted.settings,
        internal_job_runs: deleted.jobRuns,
      },
    });
  } catch (e) {
    if (e instanceof ApiError) {
      return fail(e.code, e.message);
    }
    console.error("[POST /api/admin/recommendations/reset]", e);
    return fail(ERROR.INTERNAL_ERROR, "서버 오류가 발생했습니다.");
  }
}
