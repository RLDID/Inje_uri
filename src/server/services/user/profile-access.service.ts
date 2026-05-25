import { prisma, type PrismaDbClient } from "@/server/db/prisma";

type QueryDb = Pick<PrismaDbClient, "$queryRaw">;
type ExistsRow = { exists: number };

function getKSTDateString(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  if (kst.getUTCHours() < 9) {
    kst.setUTCDate(kst.getUTCDate() - 1);
  }
  return kst.toISOString().split("T")[0];
}

async function hasAnyRow(rowsPromise: Promise<ExistsRow[]>): Promise<boolean> {
  const rows = await rowsPromise;
  return rows.length > 0;
}

async function hasTodayRecommendationAccess(
  viewerUserId: number,
  targetUserId: number,
  db: QueryDb,
): Promise<boolean> {
  const today = getKSTDateString();

  return hasAnyRow(db.$queryRaw<ExistsRow[]>`
    SELECT 1 AS exists
    FROM daily_recommendations dr
    JOIN daily_recommendation_items dri
      ON dri.daily_recommendation_id = dr.id
    WHERE dr.user_id = ${viewerUserId}
      AND dr.recommendation_date = CAST(${today} AS date)
      AND dri.candidate_user_id = ${targetUserId}
    LIMIT 1
  `);
}

async function hasInterestAccess(
  viewerUserId: number,
  targetUserId: number,
  db: QueryDb,
): Promise<boolean> {
  return hasAnyRow(db.$queryRaw<ExistsRow[]>`
    SELECT 1 AS exists
    FROM interests i
    WHERE (
        (i.from_user_id = ${viewerUserId} AND i.to_user_id = ${targetUserId})
        OR
        (i.from_user_id = ${targetUserId} AND i.to_user_id = ${viewerUserId})
      )
      AND i.declined_at IS NULL
      AND (
        (i.status = 'accepted' AND i.matched_at IS NOT NULL)
        OR
        (i.status = 'pending' AND (i.expires_at IS NULL OR i.expires_at > NOW()))
      )
    LIMIT 1
  `);
}

async function hasChatAccess(
  viewerUserId: number,
  targetUserId: number,
  db: QueryDb,
): Promise<boolean> {
  return hasAnyRow(db.$queryRaw<ExistsRow[]>`
    SELECT 1 AS exists
    FROM chat_rooms cr
    JOIN chat_room_participants viewer_participant
      ON viewer_participant.chat_room_id = cr.id
    JOIN chat_room_participants target_participant
      ON target_participant.chat_room_id = cr.id
    WHERE viewer_participant.user_id = ${viewerUserId}
      AND target_participant.user_id = ${targetUserId}
      AND viewer_participant.left_at IS NULL
      AND target_participant.left_at IS NULL
      AND cr.status IN ('active', 'expired', 'blocked')
    LIMIT 1
  `);
}

async function hasSelfDateAccess(
  viewerUserId: number,
  targetUserId: number,
  db: QueryDb,
): Promise<boolean> {
  const [targetHasVisibleFeed, targetCommentedOnViewerFeed] = await Promise.all([
    hasAnyRow(db.$queryRaw<ExistsRow[]>`
      SELECT 1 AS exists
      FROM self_date_feeds f
      WHERE f.author_user_id = ${targetUserId}
        AND f.status = 'active'
        AND f.expires_at > NOW()
      LIMIT 1
    `),
    hasAnyRow(db.$queryRaw<ExistsRow[]>`
      SELECT 1 AS exists
      FROM feed_comments c
      JOIN self_date_feeds f
        ON f.id = c.feed_id
      WHERE f.author_user_id = ${viewerUserId}
        AND c.commenter_user_id = ${targetUserId}
        AND c.deleted_at IS NULL
        AND f.status = 'active'
        AND f.expires_at > NOW()
      LIMIT 1
    `),
  ]);

  return targetHasVisibleFeed || targetCommentedOnViewerFeed;
}

export async function canViewUserProfile(
  viewerUserId: number,
  targetUserId: number,
  db: QueryDb = prisma,
): Promise<boolean> {
  if (viewerUserId === targetUserId) {
    return true;
  }

  const checks = await Promise.all([
    hasTodayRecommendationAccess(viewerUserId, targetUserId, db),
    hasInterestAccess(viewerUserId, targetUserId, db),
    hasChatAccess(viewerUserId, targetUserId, db),
    hasSelfDateAccess(viewerUserId, targetUserId, db),
  ]);

  return checks.some(Boolean);
}

export async function canTakeUserSafetyAction(
  actorUserId: number,
  targetUserId: number,
  db: QueryDb = prisma,
): Promise<boolean> {
  if (actorUserId === targetUserId) {
    return false;
  }

  return canViewUserProfile(actorUserId, targetUserId, db);
}
