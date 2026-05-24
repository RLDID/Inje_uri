//daily_recommendations 테이블 조회/생성

import { prisma } from "@/server/db/prisma";
import type { PrismaTransactionClient } from "@/server/db/prisma";

export interface CandidateRow {
  item_id: number;
  candidate_user_id: number;
  rank_order: number;
  passed_at: Date | null;
  nickname: string;
  gender: string;
  age: number | null;
  department: string;
  student_year: number;
  bio: string | null;
  primary_image_url: string | null;
}

export interface RecommendationRow {
  id: number;
  user_id: number;
  recommendation_date: Date;
  selected_candidate_user_id: number | null;
  selected_at: Date | null;
  generated_at: Date;
}

export interface RecommendationItemRow {
  id: number;
  daily_recommendation_id: number;
  candidate_user_id: number;
  rank_order: number;
  passed_at: Date | null;
}

/** 오늘 추천 레코드 조회 */
export async function findTodayRecommendation(
  userId: number,
  today: string,
): Promise<RecommendationRow | null> {
  const rows = await prisma.$queryRaw<RecommendationRow[]>`
    SELECT id, user_id, recommendation_date, selected_candidate_user_id,
           selected_at, generated_at
    FROM daily_recommendations
    WHERE user_id = ${userId}
      AND recommendation_date = ${today}::date
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/** 추천 후보 + 프로필 조회 */
export async function findCandidatesWithProfile(
  dailyRecommendationId: number,
): Promise<CandidateRow[]> {
  return prisma.$queryRaw<CandidateRow[]>`
    SELECT
      dri.id        AS item_id,
      dri.candidate_user_id,
      dri.rank_order,
      dri.passed_at,
      u.nickname,
      u.gender,
      u.age,
      u.department,
      u.student_year,
      u.bio,
      upi.image_url AS primary_image_url
    FROM daily_recommendation_items dri
    JOIN users u ON u.id = dri.candidate_user_id
    LEFT JOIN user_profile_images upi
      ON upi.user_id = u.id AND upi.is_primary = true
    WHERE dri.daily_recommendation_id = ${dailyRecommendationId}
      AND u.status = 'active'
      AND u.onboarding_completed = true
      AND u.deleted_at IS NULL
    ORDER BY dri.rank_order ASC
  `;
}

/** 특정 item이 오늘 해당 유저의 추천에 속하는지 확인 */
export async function findItemInTodayRecommendation(
  userId: number,
  itemId: number,
  today: string,
): Promise<RecommendationItemRow | null> {
  const rows = await prisma.$queryRaw<RecommendationItemRow[]>`
    SELECT dri.id, dri.daily_recommendation_id, dri.candidate_user_id,
           dri.rank_order, dri.passed_at
    FROM daily_recommendation_items dri
    JOIN daily_recommendations dr ON dr.id = dri.daily_recommendation_id
    WHERE dri.id = ${itemId}
      AND dr.user_id = ${userId}
      AND dr.recommendation_date = ${today}::date
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/** 추천 선택 처리: selected_candidate_user_id 업데이트 */
export async function updateRecommendationSelection(
  recommendationId: number,
  candidateUserId: number,
): Promise<boolean> {
  const result = await prisma.$executeRaw`
    UPDATE daily_recommendations
    SET selected_candidate_user_id = ${candidateUserId},
        selected_at = NOW()
    WHERE id = ${recommendationId}
      AND selected_candidate_user_id IS NULL
  `;
  return result > 0;
}

/** 선택된 item 외 나머지 item passed_at 처리 */
export async function passOtherItems(
  dailyRecommendationId: number,
  selectedItemId: number,
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE daily_recommendation_items
    SET passed_at = NOW()
    WHERE daily_recommendation_id = ${dailyRecommendationId}
      AND id != ${selectedItemId}
      AND passed_at IS NULL
  `;
}

/** 단일 item passed_at 처리 */
export async function passItem(itemId: number): Promise<void> {
  await prisma.$executeRaw`
    UPDATE daily_recommendation_items
    SET passed_at = NOW()
    WHERE id = ${itemId}
      AND passed_at IS NULL
  `;
}

/** 단일 item passed_at 처리 (트랜잭션 내 호출용) */
export async function passItemInTx(
  tx: PrismaTransactionClient,
  itemId: number,
): Promise<void> {
  await tx.$executeRaw`
    UPDATE daily_recommendation_items
    SET passed_at = NOW()
    WHERE id = ${itemId}
      AND passed_at IS NULL
  `;
}

/** 추천 배치용 — 최근 N일 내 추천된 user_id 목록 조회 */
export async function getRecentlyRecommendedUserIds(
  userId: number,
  withinDays: number,
  today: string,
): Promise<Set<number>> {
  const rows = await prisma.$queryRaw<{ candidate_user_id: number }[]>`
    SELECT DISTINCT dri.candidate_user_id
    FROM daily_recommendation_items dri
    JOIN daily_recommendations dr ON dr.id = dri.daily_recommendation_id
    WHERE dr.user_id = ${userId}
      AND dr.recommendation_date >= (${today}::date - ${withinDays}::int)
  `;
  return new Set(rows.map((r) => r.candidate_user_id));
}

/**
 * 매칭 완료 후 특정 유저의 오늘 추천 목록에서 상대방 후보 item을 passed_at 처리
 * 매칭된 상대방이 더 이상 추천 목록에 노출되지 않도록 한다.
 */
export async function passMatchedCandidateItem(
  userId: number,
  candidateUserId: number,
  today: string,
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE daily_recommendation_items dri
    SET passed_at = NOW()
    FROM daily_recommendations dr
    WHERE dri.daily_recommendation_id = dr.id
      AND dr.user_id = ${userId}
      AND dr.recommendation_date = ${today}::date
      AND dri.candidate_user_id = ${candidateUserId}
      AND dri.passed_at IS NULL
  `;
}

/** 추천 배치용 — DailyRecommendation + Items 생성 */
export async function createDailyRecommendation(
  userId: number,
  today: string,
  candidateIds: number[],
): Promise<number> {
  if (candidateIds.length !== 3 || new Set(candidateIds).size !== 3) {
    throw new Error("추천 후보는 정확히 3명의 고유 사용자여야 합니다.");
  }

  return prisma.$transaction(async (tx) => {
    const recRows = await tx.$queryRaw<{ id: number }[]>`
      INSERT INTO daily_recommendations (user_id, recommendation_date, generated_at)
      VALUES (${userId}, ${today}::date, NOW())
      ON CONFLICT (user_id, recommendation_date) DO NOTHING
      RETURNING id
    `;

    if (recRows.length === 0) {
      const existingRows = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM daily_recommendations
        WHERE user_id = ${userId}
          AND recommendation_date = ${today}::date
        LIMIT 1
      `;
      if (!existingRows[0]) throw new Error("추천 생성 실패");
      return existingRows[0].id;
    }

    const recId = recRows[0].id;

    for (let i = 0; i < candidateIds.length; i++) {
      await tx.$executeRaw`
        INSERT INTO daily_recommendation_items
          (daily_recommendation_id, candidate_user_id, rank_order)
        VALUES (${recId}, ${candidateIds[i]}, ${i + 1})
      `;
    }

    return recId;
  });
}

export async function deleteAllDailyRecommendations(): Promise<number> {
  const result = await prisma.dailyRecommendation.deleteMany({});
  return result.count;
}

export async function deleteAllRecommendationDismisses(): Promise<number> {
  const result = await prisma.recommendationDismiss.deleteMany({});
  return result.count;
}

export async function deleteAllRecommendationSettings(): Promise<number> {
  const result = await prisma.recommendationSetting.deleteMany({});
  return result.count;
}

export async function deleteRecommendationJobRuns(): Promise<number> {
  const result = await prisma.internalJobRun.deleteMany({
    where: { job_name: 'daily_recommendations' },
  });
  return result.count;
}
