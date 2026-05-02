import { createHash, randomBytes } from 'node:crypto';
import type { NextRequest, NextResponse } from 'next/server';
import type { AuthSession, User } from '@/generated/prisma/client';
import {
  APP_AUTH_COOKIE_NAME,
  PRE_SIGNUP_COOKIE_MAX_AGE_SECONDS,
  PRE_SIGNUP_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from '@/lib/auth/constants';
import { ApiError, ERROR } from '@/server/lib/errors';
import {
  createAuthSession,
  deleteAuthSessionById,
  findSessionByTokenHashWithUser,
  touchAuthSession,
} from '@/server/repositories/auth/session.repository';
import {
  createPreSignupVerification,
  deletePreSignupVerificationByTokenHash,
  findPreSignupVerificationByTokenHash,
  prunePreSignupVerifications,
} from '@/server/repositories/auth/pre-signup.repository';

export { SESSION_COOKIE_NAME };
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const SESSION_TOUCH_INTERVAL_SECONDS = 60 * 5;

export const ACTIVE_USER_STATUS = 'active';
export const SUSPENDED_USER_STATUS = 'banned';
export const WITHDRAWN_USER_STATUS = 'withdrawn';

type SessionWithUser = AuthSession & { user: User };

export interface AuthContext {
  session: SessionWithUser;
  user: User;
  token: string;
}

export interface AuthUserSummary {
  id: number;
  nickname: string;
  status: User['status'];
  onboardingCompleted: boolean;
}

export interface PreSignupPayload {
  studentNumber: string;
  birthHash: string;
}

export type AuthedHandler<T> = (request: NextRequest, auth: AuthContext) => Promise<T> | T;

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashBirth(birth: string): string {
  return hashValue(birth);
}

export function hashSessionToken(token: string): string {
  return hashValue(token);
}

export function generateSessionToken(): string {
  return generateToken();
}

export function readSessionTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');

  if (!cookieHeader) {
    return null;
  }

  const cookie = cookieHeader
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!cookie) {
    return null;
  }

  const rawValue = cookie.slice(SESSION_COOKIE_NAME.length + 1);
  const value = decodeURIComponent(rawValue);
  return value || null;
}

export function readPreSignupTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(PRE_SIGNUP_COOKIE_NAME)?.value ?? null;
}

export async function createUserSession(userId: number) {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await createAuthSession({
    userId,
    tokenHash,
    expiresAt,
    lastSeenAt: new Date(),
  });

  return { token, expiresAt };
}

export async function deleteUserSession(sessionId: number) {
  await deleteAuthSessionById(sessionId);
}

export function attachSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  });
}

export function clearAppAccessCookie(response: NextResponse) {
  response.cookies.set(APP_AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
}

export function attachPreSignupCookie(response: NextResponse, token: string) {
  response.cookies.set(PRE_SIGNUP_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: PRE_SIGNUP_COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearPreSignupCookie(response: NextResponse) {
  response.cookies.set(PRE_SIGNUP_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function issuePreSignupVerification(studentNumber: string, birth: string): Promise<string> {
  const token = generateToken();
  const tokenHash = hashValue(token);
  const birthHash = hashBirth(birth);
  const expiresAt = new Date(Date.now() + PRE_SIGNUP_COOKIE_MAX_AGE_SECONDS * 1000);

  await prunePreSignupVerifications(studentNumber);
  await createPreSignupVerification({
    tokenHash,
    studentNumber,
    birthHash,
    expiresAt,
  });

  return token;
}

export async function consumePreSignupVerificationToken(token: string | null): Promise<PreSignupPayload | null> {
  if (!token) {
    return null;
  }

  const tokenHash = hashValue(token);
  const row = await findPreSignupVerificationByTokenHash(tokenHash);

  if (!row) {
    return null;
  }

  if (row.expires_at.getTime() <= Date.now()) {
    await deletePreSignupVerificationByTokenHash(row.token_hash);
    return null;
  }

  return {
    studentNumber: row.student_number,
    birthHash: row.birth_hash,
  };
}

export async function clearPreSignupVerificationToken(token: string | null) {
  if (!token) {
    return;
  }

  const tokenHash = hashValue(token);
  await deletePreSignupVerificationByTokenHash(tokenHash);
}

export function shouldTouchSession(lastSeenAt: Date | null | undefined): boolean {
  if (!lastSeenAt) {
    return true;
  }

  const now = Date.now();
  const elapsedSeconds = Math.floor((now - lastSeenAt.getTime()) / 1000);
  return elapsedSeconds >= SESSION_TOUCH_INTERVAL_SECONDS;
}

export function ensureActiveUser(user: User) {
  const isDeleted = user.deleted_at !== null;
  const isNotActive = user.status !== ACTIVE_USER_STATUS;

  if (isDeleted || isNotActive) {
    throw new ApiError(ERROR.FORBIDDEN, '현재 계정 상태로는 접근할 수 없습니다.');
  }
}

export async function resolveCurrentUser(request: Request): Promise<AuthContext | null> {
  const token = readSessionTokenFromRequest(request);
  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const session = await findSessionByTokenHashWithUser(tokenHash);

  if (!session) {
    return null;
  }

  if (session.expires_at.getTime() <= Date.now()) {
    await deleteAuthSessionById(session.id).catch(() => undefined);
    return null;
  }

  if (shouldTouchSession(session.last_seen_at)) {
    await touchAuthSession(session.id, new Date()).catch(() => undefined);
  }

  return {
    session,
    user: session.user,
    token,
  };
}

export function toAuthUserSummary(user: User): AuthUserSummary {
  return {
    id: user.id,
    nickname: user.nickname,
    status: user.status,
    onboardingCompleted: user.onboarding_completed,
  };
}

export async function getAuthUser(request: Request): Promise<User | null> {
  const auth = await resolveCurrentUser(request);
  if (!auth) return null;
  ensureActiveUser(auth.user);
  return auth.user;
}
