//KST 09:00 기준 미생성 유저 추천 배치 실행

import { prisma } from "@/server/db/prisma";
import { generateRecommendationsForUser } from "@/server/services/matching/recommendation.service";

const JOB_NAME = "daily_recommendations";

/** KST 오늘 날짜 (YYYY-MM-DD) */
function getKSTDateString(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  if (kst.getUTCHours() < 9) {
    kst.setUTCDate(kst.getUTCDate() - 1);
  }
  return kst.toISOString().split("T")[0];
}

/** 현재 KST 시각이 09:00 이후인지 확인 */
function isAfterNineAMKST(): boolean {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hours = kst.getUTCHours();
  const minutes = kst.getUTCMinutes();
  return hours > 9 || (hours === 9 && minutes >= 0);
}

export async function runDailyRecommendationJobIfNeeded(): Promise<void> {
  try {
    const today = getKSTDateString();

    // 오늘 이미 실행된 배치가 있는지 확인
    const todayStart = new Date(`${today}T00:00:00+09:00`);
    const existing = await prisma.internalJobRun.findFirst({
      where: {
        job_name: JOB_NAME,
        started_at: { gte: todayStart },
        status: { in: ["running", "success"] },
      },
    });

    if (existing) return;

    // 09:00 KST 이전이면 실행하지 않음
    if (!isAfterNineAMKST()) return;

    // 실행 기록 시작
    const jobRun = await prisma.internalJobRun.create({
      data: {
        job_name: JOB_NAME,
        started_at: new Date(),
        status: "running",
      },
    });

    let success = 0;
    let skipped = 0;
    let failed = 0;

    try {
      // 활성 유저 중 오늘 추천이 없는 유저만 조회
      const users = await prisma.user.findMany({
        where: { status: "active", onboarding_completed: true },
        select: { id: true },
      });

      const alreadyDone = await prisma.dailyRecommendation.findMany({
        where: { recommendation_date: new Date(today) },
        select: { user_id: true },
      });
      const alreadyDoneIds = new Set(alreadyDone.map((r) => r.user_id));

      const targets = users.filter((u) => !alreadyDoneIds.has(u.id));

      for (const user of targets) {
        try {
          const result = await generateRecommendationsForUser(user.id, today);
          if (result.generated) {
            success++;
          } else {
            skipped++;
          }
        } catch (e) {
          console.error("[dailyRecommendation.job] 유저 추천 생성 실패:", user.id, e);
          failed++;
        }
      }

      // 성공 기록
      await prisma.internalJobRun.update({
        where: { id: jobRun.id },
        data: {
          ended_at: new Date(),
          status: "success",
          summary: `total: ${targets.length}, success: ${success}, skipped: ${skipped}, failed: ${failed}`,
        },
      });
    } catch (err) {
      // 실패 기록
      await prisma.internalJobRun.update({
        where: { id: jobRun.id },
        data: {
          ended_at: new Date(),
          status: "failed",
          summary: err instanceof Error ? err.message : String(err),
        },
      });
    }
  } catch (err) {
    console.error("[dailyRecommendation.job]", err);
  }
}
