import { prisma } from '@/server/db/prisma';

export interface RateLimitKey {
  scope: string;
  keyHash: string;
}

export async function findAuthRateLimitRows(keys: RateLimitKey[]) {
  if (keys.length === 0) {
    return [];
  }

  return prisma.authRateLimit.findMany({
    where: {
      OR: keys.map((key) => ({
        scope: key.scope,
        key_hash: key.keyHash,
      })),
    },
    select: {
      scope: true,
      key_hash: true,
      failed_count: true,
      window_started_at: true,
      blocked_until: true,
    },
  });
}

export async function upsertAuthRateLimitFailure(input: {
  scope: string;
  keyHash: string;
  failedCount: number;
  windowStartedAt: Date;
  lastFailedAt: Date;
  blockedUntil: Date | null;
}) {
  return prisma.authRateLimit.upsert({
    where: {
      scope_key_hash: {
        scope: input.scope,
        key_hash: input.keyHash,
      },
    },
    create: {
      scope: input.scope,
      key_hash: input.keyHash,
      failed_count: input.failedCount,
      window_started_at: input.windowStartedAt,
      last_failed_at: input.lastFailedAt,
      blocked_until: input.blockedUntil,
    },
    update: {
      failed_count: input.failedCount,
      window_started_at: input.windowStartedAt,
      last_failed_at: input.lastFailedAt,
      blocked_until: input.blockedUntil,
    },
  });
}

export async function deleteAuthRateLimitRows(keys: RateLimitKey[]) {
  if (keys.length === 0) {
    return;
  }

  await prisma.authRateLimit.deleteMany({
    where: {
      OR: keys.map((key) => ({
        scope: key.scope,
        key_hash: key.keyHash,
      })),
    },
  });
}
