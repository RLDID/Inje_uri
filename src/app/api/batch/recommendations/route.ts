import type { NextRequest } from "next/server";
import { ApiError } from "@/server/lib/errors";
import { ERROR } from "@/server/lib/errors";
import { ok, fail } from "@/server/lib/response";
import { prisma } from "@/server/db/prisma";
import { generateRecommendationsForUser } from "@/server/services/matching/recommendation.service";

/** KST 오늘 날짜 (YYYY-MM-DD) */
function getKSTDateString(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

// ─────────────────────────────────────────────
// POST: 오늘 추천 배치 생성
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-batch-secret");
    if (secret !== process.env.BATCH_SECRET) {
      return fail(ERROR.UNAUTHORIZED, "인증되지 않은 요청입니다.");
    }

    const today = getKSTDateString();

    // 활성 유저 중 오늘 추천이 없는 유저만 추출
    const users = await prisma.user.findMany({
      where: {
        status: "active",
        onboarding_completed: true,
      },
      select: { id: true },
    });

    const alreadyDone = await prisma.dailyRecommendation.findMany({
      where: { recommendation_date: new Date(today) },
      select: { user_id: true },
    });
    const alreadyDoneIds = new Set(alreadyDone.map((r) => r.user_id));

    const targets = users.filter((u) => !alreadyDoneIds.has(u.id));

    let success = 0;
    let failed = 0;

    for (const user of targets) {
      try {
        await generateRecommendationsForUser(user.id, today);
        success++;
      } catch (e) {
        console.error("[POST /api/batch/recommendations] 유저 추천 생성 실패:", user.id, e);
        failed++;
      }
    }

    return ok({
      date: today,
      total: targets.length,
      success,
      failed,
    });
  } catch (e) {
    if (e instanceof ApiError) {
      return fail(e.code, e.message);
    }
    console.error("[POST /api/batch/recommendations]", e);
    return fail(ERROR.INTERNAL_ERROR, "서버 오류가 발생했습니다.");
  }
}
