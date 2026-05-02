// recommendation_dismisses 테이블 UPSERT

import { prisma } from "@/server/db/prisma";
import { Prisma } from "@/generated/prisma/client";

/** 관심없음 UPSERT (독립 실행): 기존 레코드 있으면 expires_at 갱신, 없으면 INSERT */
export async function upsertDismiss(
  userId: number,
  dismissedUserId: number,
  dailyRecommendationId: number,
  expiresAt: Date,
): Promise<{ id: number }> {
  await prisma.$executeRaw`
    INSERT INTO recommendation_dismisses
      (user_id, dismissed_user_id, daily_recommendation_id, expires_at, created_at)
    VALUES (${userId}, ${dismissedUserId}, ${dailyRecommendationId}, ${expiresAt}, NOW())
    ON CONFLICT (user_id, dismissed_user_id)
    DO UPDATE SET
      expires_at = ${expiresAt},
      daily_recommendation_id = ${dailyRecommendationId}
  `;

  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM recommendation_dismisses
    WHERE user_id = ${userId} AND dismissed_user_id = ${dismissedUserId}
    LIMIT 1
  `;

  return rows[0];
}

/** 관심없음 UPSERT (트랜잭션 내 호출용): passed_at 업데이트와 원자적으로 처리 */
export async function upsertDismissInTx(
  tx: Prisma.TransactionClient,
  userId: number,
  dismissedUserId: number,
  dailyRecommendationId: number,
  expiresAt: Date,
): Promise<void> {
  await tx.$executeRaw`
    INSERT INTO recommendation_dismisses
      (user_id, dismissed_user_id, daily_recommendation_id, expires_at, created_at)
    VALUES (${userId}, ${dismissedUserId}, ${dailyRecommendationId}, ${expiresAt}, NOW())
    ON CONFLICT (user_id, dismissed_user_id)
    DO UPDATE SET
      expires_at = ${expiresAt},
      daily_recommendation_id = ${dailyRecommendationId}
  `;
}

/** dismiss 레코드 id 조회 (트랜잭션 완료 후 호출) */
export async function getDismissId(
  userId: number,
  dismissedUserId: number,
): Promise<{ id: number }> {
  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM recommendation_dismisses
    WHERE user_id = ${userId} AND dismissed_user_id = ${dismissedUserId}
    LIMIT 1
  `;
  return rows[0];
}
