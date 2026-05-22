import type { NextRequest } from "next/server";
import { ApiError, ERROR } from "@/server/lib/errors";
import { ok, fail } from "@/server/lib/response";
import { requireAdminRequest } from "@/server/lib/admin-auth";
import { resetTestData } from "@/server/services/matching/recommendation.service";

// POST: 배포 전 테스트 데이터 초기화
// 초기화 대상: chat_rooms, interests, daily_recommendations,
// recommendation_dismisses, recommendation_settings, internal_job_runs
export async function POST(req: NextRequest) {
  const batchSecret = process.env.BATCH_SECRET?.trim();
  const isBatchRequest = Boolean(batchSecret) && req.headers.get("x-batch-secret") === batchSecret;

  if (!requireAdminRequest(req) && !isBatchRequest) {
    return fail(ERROR.UNAUTHORIZED, "관리자 인증이 필요합니다.", 401);
  }

  try {
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
  } catch (error) {
    if (error instanceof ApiError) {
      return fail(error.code, error.message);
    }

    console.error("[POST /api/admin/recommendations/reset]", error);
    return fail(ERROR.INTERNAL_ERROR, "추천 데이터를 초기화하는 중 오류가 발생했습니다.");
  }
}
