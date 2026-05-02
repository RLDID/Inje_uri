//차단 관계 조회 (추천 후보 필터링용)

import { prisma } from "@/server/db/prisma";

/**
 * 양방향 차단 관계에 있는 유저 ID 목록을 반환한다.
 * blocker → blocked, blocked → blocker 양방향 모두 포함.
 */
export async function getBlockedUserIds(userId: number): Promise<Set<number>> {
  const rows = await prisma.$queryRaw<{ user_id: number }[]>`
    SELECT blocked_user_id AS user_id
    FROM blocks
    WHERE blocker_user_id = ${userId} AND unblocked_at IS NULL
    UNION
    SELECT blocker_user_id AS user_id
    FROM blocks
    WHERE blocked_user_id = ${userId} AND unblocked_at IS NULL
  `;

  return new Set(rows.map((r) => r.user_id));
}

/**
 * 두 유저 간 차단 관계가 존재하는지 확인한다.
 */
export async function hasBlockRelation(
  userIdA: number,
  userIdB: number,
): Promise<boolean> {
  const row = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) AS count
    FROM blocks
    WHERE unblocked_at IS NULL
      AND (
        (blocker_user_id = ${userIdA} AND blocked_user_id = ${userIdB})
        OR
        (blocker_user_id = ${userIdB} AND blocked_user_id = ${userIdA})
      )
  `;

  return Number(row[0].count) > 0;
}
