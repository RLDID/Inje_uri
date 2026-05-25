import { createHmac } from 'node:crypto';
import { ApiError, ERROR } from '@/server/lib/errors';
import {
  deleteAuthRateLimitRows,
  findAuthRateLimitRows,
  type RateLimitKey,
  upsertAuthRateLimitFailure,
} from '@/server/repositories/auth/rate-limit.repository';

type AuthRateLimitFeature = 'inje-check' | 'account-recovery';

export interface AuthRateLimitBucket {
  scope: string;
  key: string;
  maxFailures: number;
}

export interface AuthRateLimitSet {
  checkBuckets: AuthRateLimitBucket[];
  resetBuckets: AuthRateLimitBucket[];
}

const DEFAULT_TARGET_MAX_FAILURES = 3;
const DEFAULT_IP_MAX_FAILURES = 3;
const DEFAULT_WINDOW_SECONDS = 15 * 60;
const DEFAULT_BLOCK_SECONDS = 30 * 60;

function readPositiveIntegerEnv(name: string, defaultValue: number): number {
  const rawValue = process.env[name];
  if (!rawValue) {
    return defaultValue;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return defaultValue;
  }

  return parsed;
}

function getRateLimitSecret(): string {
  const secret = process.env.AUTH_HASH_SECRET ?? process.env.AUTH_SECRET ?? process.env.SESSION_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_HASH_SECRET or AUTH_SECRET is required for auth rate limit keys.');
  }

  return 'injeuri-auth-rate-limit-development-secret';
}

function getTargetMaxFailures(): number {
  return readPositiveIntegerEnv('AUTH_RATE_LIMIT_TARGET_MAX_FAILURES', DEFAULT_TARGET_MAX_FAILURES);
}

function getIpMaxFailures(): number {
  return readPositiveIntegerEnv('AUTH_RATE_LIMIT_IP_MAX_FAILURES', DEFAULT_IP_MAX_FAILURES);
}

function getWindowMs(): number {
  return readPositiveIntegerEnv('AUTH_RATE_LIMIT_WINDOW_SECONDS', DEFAULT_WINDOW_SECONDS) * 1000;
}

function getBlockMs(): number {
  return readPositiveIntegerEnv('AUTH_RATE_LIMIT_BLOCK_SECONDS', DEFAULT_BLOCK_SECONDS) * 1000;
}

function hashRateLimitKey(scope: string, key: string): string {
  return createHmac('sha256', getRateLimitSecret()).update(`${scope}:${key}`).digest('hex');
}

function normalizeClientIp(value: string | null): string | null {
  const normalized = value?.split(',')[0]?.trim().toLowerCase();
  return normalized || null;
}

export function getClientIpFromRequest(request: Request): string {
  return (
    normalizeClientIp(request.headers.get('cf-connecting-ip'))
    ?? normalizeClientIp(request.headers.get('x-real-ip'))
    ?? normalizeClientIp(request.headers.get('x-forwarded-for'))
    ?? 'unknown'
  );
}

export function buildAuthRateLimitSet(
  feature: AuthRateLimitFeature,
  request: Request,
  studentNumber: string,
): AuthRateLimitSet {
  const clientIp = getClientIpFromRequest(request);
  const normalizedStudentNumber = studentNumber.trim();
  const ipBucket = {
    scope: `${feature}:ip`,
    key: clientIp,
    maxFailures: getIpMaxFailures(),
  };
  const targetBucket = {
    scope: `${feature}:ip-student`,
    key: `${clientIp}:${normalizedStudentNumber}`,
    maxFailures: getTargetMaxFailures(),
  };

  return {
    checkBuckets: [ipBucket, targetBucket],
    resetBuckets: [targetBucket],
  };
}

function hashBuckets(buckets: AuthRateLimitBucket[]): Array<RateLimitKey & { maxFailures: number }> {
  return buckets.map((bucket) => ({
    scope: bucket.scope,
    keyHash: hashRateLimitKey(bucket.scope, bucket.key),
    maxFailures: bucket.maxFailures,
  }));
}

function buildRateLimitMessage(blockedUntil: Date, now: Date): string {
  const retryAfterMinutes = Math.max(1, Math.ceil((blockedUntil.getTime() - now.getTime()) / 60_000));
  return `인증 시도가 여러 번 실패했습니다. ${retryAfterMinutes}분 후 다시 시도해주세요.`;
}

export async function assertAuthRateLimitAllowed(buckets: AuthRateLimitBucket[]) {
  const now = new Date();
  const hashedBuckets = hashBuckets(buckets);
  const rows = await findAuthRateLimitRows(hashedBuckets);
  const activeBlocks = rows
    .filter((row) => row.blocked_until && row.blocked_until.getTime() > now.getTime())
    .sort((left, right) => (left.blocked_until?.getTime() ?? 0) - (right.blocked_until?.getTime() ?? 0));
  const activeBlock = activeBlocks[0];

  if (activeBlock?.blocked_until) {
    throw new ApiError(ERROR.RATE_LIMITED, buildRateLimitMessage(activeBlock.blocked_until, now));
  }
}

export async function recordAuthRateLimitFailure(buckets: AuthRateLimitBucket[]) {
  const now = new Date();
  const windowMs = getWindowMs();
  const blockMs = getBlockMs();
  const hashedBuckets = hashBuckets(buckets);
  const rows = await findAuthRateLimitRows(hashedBuckets);
  const rowMap = new Map(rows.map((row) => [`${row.scope}:${row.key_hash}`, row]));

  await Promise.all(hashedBuckets.map(async (bucket) => {
    const row = rowMap.get(`${bucket.scope}:${bucket.keyHash}`);
    const isWindowExpired = !row || now.getTime() - row.window_started_at.getTime() >= windowMs;
    const failedCount = isWindowExpired ? 1 : row.failed_count + 1;
    const windowStartedAt = isWindowExpired ? now : row.window_started_at;
    const blockedUntil = failedCount >= bucket.maxFailures
      ? new Date(now.getTime() + blockMs)
      : null;

    await upsertAuthRateLimitFailure({
      scope: bucket.scope,
      keyHash: bucket.keyHash,
      failedCount,
      windowStartedAt,
      lastFailedAt: now,
      blockedUntil,
    });
  }));
}

export async function clearAuthRateLimitFailures(buckets: AuthRateLimitBucket[]) {
  const hashedBuckets = hashBuckets(buckets);
  await deleteAuthRateLimitRows(hashedBuckets);
}
