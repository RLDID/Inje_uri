import { createHash, createHmac, timingSafeEqual } from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';

export const ADMIN_COOKIE_NAME = 'injeuri_admin';
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
const ADMIN_SESSION_VERSION = 'v1';

function shouldUseSecureCookie(): boolean {
  return process.env.NODE_ENV === 'production';
}

function getAdminAccessCode(): string {
  return process.env.ADMIN_ACCESS_CODE?.trim() ?? '';
}

function getAdminSessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET?.trim() || getAdminAccessCode();
}

function hashValue(value: string): Buffer {
  return Buffer.from(createHash('sha256').update(value).digest('hex'));
}

function constantTimeEquals(left: string, right: string): boolean {
  const leftHash = hashValue(left);
  const rightHash = hashValue(right);

  if (leftHash.length !== rightHash.length) {
    return false;
  }

  return timingSafeEqual(leftHash, rightHash);
}

function signAdminSession(expiresAtMs: number): string {
  const secret = getAdminSessionSecret();

  if (!secret) {
    return '';
  }

  return createHmac('sha256', secret)
    .update(`${ADMIN_SESSION_VERSION}.${expiresAtMs}`)
    .digest('hex');
}

function readCookieValue(request: Request, cookieName: string): string | null {
  const cookieHeader = request.headers.get('cookie');

  if (!cookieHeader) {
    return null;
  }

  const cookie = cookieHeader
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${cookieName}=`));

  if (!cookie) {
    return null;
  }

  const rawValue = cookie.slice(cookieName.length + 1);
  return decodeURIComponent(rawValue) || null;
}

export function isAdminAuthConfigured(): boolean {
  return Boolean(getAdminAccessCode());
}

export function verifyAdminAccessCode(inputCode: string): boolean {
  const expectedCode = getAdminAccessCode();
  const normalizedInput = inputCode.trim();

  if (!expectedCode || !normalizedInput) {
    return false;
  }

  return constantTimeEquals(normalizedInput, expectedCode);
}

export function createAdminSessionToken(now = Date.now()): string {
  const expiresAtMs = now + ADMIN_SESSION_MAX_AGE_SECONDS * 1000;
  const signature = signAdminSession(expiresAtMs);

  if (!signature) {
    return '';
  }

  return `${ADMIN_SESSION_VERSION}.${expiresAtMs}.${signature}`;
}

export function verifyAdminSessionToken(token: string | null): boolean {
  if (!token) {
    return false;
  }

  const [version, expiresAtRaw, signature] = token.split('.');
  if (version !== ADMIN_SESSION_VERSION || !expiresAtRaw || !signature) {
    return false;
  }

  const expiresAtMs = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    return false;
  }

  const expectedSignature = signAdminSession(expiresAtMs);
  if (!expectedSignature || expectedSignature.length !== signature.length) {
    return false;
  }

  return constantTimeEquals(signature, expectedSignature);
}

export function isAdminRequestAuthenticated(request: Request): boolean {
  return verifyAdminSessionToken(readCookieValue(request, ADMIN_COOKIE_NAME));
}

export function attachAdminSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  });
}

export function requireAdminRequest(request: NextRequest | Request): boolean {
  return isAdminAuthConfigured() && isAdminRequestAuthenticated(request);
}
