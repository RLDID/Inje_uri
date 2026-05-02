//interests 테이블 CRUD + 매칭 확정/롤백

import { prisma } from "@/server/db/prisma";
import { Prisma } from "@/generated/prisma/client";

export interface InterestRow {
  id: number;
  from_user_id: number;
  to_user_id: number;
  status: string;
  matched_at: Date | null;
  declined_at: Date | null;
  created_at: Date;
  expires_at: Date | null;
}

export interface InterestWithProfile extends InterestRow {
  nickname: string;
  age: number | null;
  department: string;
  student_year: number;
  bio: string | null;
  primary_image_url: string | null;
}

/** pending 상태(매칭/거절 전)인 호감 조회 */
export async function findPendingInterest(
  fromUserId: number,
  toUserId: number,
): Promise<InterestRow | null> {
  const rows = await prisma.$queryRaw<InterestRow[]>`
    SELECT id, from_user_id, to_user_id, status,
           matched_at, declined_at, created_at, expires_at
    FROM interests
    WHERE from_user_id = ${fromUserId}
      AND to_user_id = ${toUserId}
      AND matched_at IS NULL
      AND declined_at IS NULL
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/** 역방향 pending 호감 조회 (매칭 판정용) */
export async function findReversePendingInterest(
  fromUserId: number,
  toUserId: number,
): Promise<InterestRow | null> {
  const rows = await prisma.$queryRaw<InterestRow[]>`
    SELECT id, from_user_id, to_user_id, status,
           matched_at, declined_at, created_at, expires_at
    FROM interests
    WHERE from_user_id = ${fromUserId}
      AND to_user_id = ${toUserId}
      AND matched_at IS NULL
      AND declined_at IS NULL
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/** 특정 유저에게 온 pending 호감 목록 + 프로필 */
export async function findReceivedInterestsWithProfile(
  userId: number,
  excludeUserIds: Set<number>,
): Promise<InterestWithProfile[]> {
  const excludeArray = excludeUserIds.size > 0 ? [...excludeUserIds] : [-1];

  return prisma.$queryRaw<InterestWithProfile[]>`
    SELECT
      i.id, i.from_user_id, i.to_user_id, i.status,
      i.matched_at, i.declined_at, i.created_at, i.expires_at,
      u.nickname, u.age, u.department, u.student_year, u.bio,
      upi.image_url AS primary_image_url
    FROM interests i
    JOIN users u ON u.id = i.from_user_id
    LEFT JOIN user_profile_images upi
      ON upi.user_id = u.id AND upi.is_primary = true
    WHERE i.to_user_id = ${userId}
      AND i.matched_at IS NULL
      AND i.declined_at IS NULL
      AND i.from_user_id NOT IN (${Prisma.join(excludeArray)})
    ORDER BY i.created_at DESC
  `;
}

/** 호감 ID로 단건 조회 */
export async function findInterestById(
  interestId: number,
): Promise<InterestRow | null> {
  const rows = await prisma.$queryRaw<InterestRow[]>`
    SELECT id, from_user_id, to_user_id, status,
           matched_at, declined_at, created_at, expires_at
    FROM interests
    WHERE id = ${interestId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/** 호감 INSERT */
export async function insertInterest(
  fromUserId: number,
  toUserId: number,
): Promise<{ id: number }> {
  const rows = await prisma.$queryRaw<{ id: number }[]>`
    INSERT INTO interests (from_user_id, to_user_id, status, created_at)
    VALUES (${fromUserId}, ${toUserId}, 'pending', NOW())
    RETURNING id
  `;
  return rows[0];
}

/** 호감 거절 처리 */
export async function declineInterestById(
  interestId: number,
): Promise<InterestRow | null> {
  const rows = await prisma.$queryRaw<InterestRow[]>`
    UPDATE interests
    SET declined_at = NOW(), status = 'declined'
    WHERE id = ${interestId}
      AND matched_at IS NULL
      AND declined_at IS NULL
    RETURNING id, from_user_id, to_user_id, status,
              matched_at, declined_at, created_at, expires_at
  `;
  return rows[0] ?? null;
}

/** 매칭 확정: 양쪽 Interest matched_at + status 업데이트 */
export async function confirmMatch(
  interestId1: number,
  interestId2: number,
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE interests
    SET matched_at = NOW(), status = 'accepted'
    WHERE id IN (${interestId1}, ${interestId2})
  `;
}

/** 매칭 롤백: 양쪽 Interest를 pending으로 복원 */
export async function rollbackMatch(
  interestId1: number,
  interestId2: number,
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE interests
    SET matched_at = NULL, status = 'pending'
    WHERE id IN (${interestId1}, ${interestId2})
  `;
}
