import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, isProtectedAppPath } from '@/lib/auth/constants';

const LAUNCH_AT_MS = new Date('2026-05-25T00:00:00+09:00').getTime();
const WAITING_ALIAS_PATH = '/p/w8t2k';
const WAITING_PATHS = new Set(['/waiting', '/p/w8t2k']);
const MATCH_ALIAS_PATH = '/p/a83k2';
const PRE_LAUNCH_RESTRICTED_PREFIXES = [
  '/match',
  '/interest',
  '/chat',
  '/self-date',
  '/my',
  '/p/a83k2',
  '/p/h7n4d',
  '/p/q91mz',
  '/p/r5t8u',
  '/p/m6y2p',
] as const;
const PRE_LAUNCH_ALLOWED_PREFIXES = [
  '/my/profile',
  '/my/ideal-type',
  '/p/m6y2p/profile',
  '/p/m6y2p/ideal-type',
] as const;

function hasPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isPreLaunchRestrictedPath(pathname: string): boolean {
  const isRestricted = PRE_LAUNCH_RESTRICTED_PREFIXES.some((prefix) => hasPathPrefix(pathname, prefix));

  if (!isRestricted) {
    return false;
  }

  return !PRE_LAUNCH_ALLOWED_PREFIXES.some((prefix) => hasPathPrefix(pathname, prefix));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isAuthenticated = request.cookies.has(SESSION_COOKIE_NAME);
  const isBeforeLaunch = Date.now() < LAUNCH_AT_MS;

  if (WAITING_PATHS.has(pathname) && !isBeforeLaunch) {
    return NextResponse.redirect(new URL(MATCH_ALIAS_PATH, request.url));
  }

  if (isBeforeLaunch && isPreLaunchRestrictedPath(pathname)) {
    return NextResponse.redirect(new URL(WAITING_ALIAS_PATH, request.url));
  }

  if (!isAuthenticated && isProtectedAppPath(pathname)) {
    const loginUrl = new URL('/p/l0g8n', request.url);
    const nextPath = `${pathname}${search}`;

    if (nextPath !== '/') {
      loginUrl.searchParams.set('next', nextPath);
    }

    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();

  if (isProtectedAppPath(pathname)) {
    response.headers.set('Cache-Control', 'no-store, max-age=0');
  }

  return response;
}

export const config = {
  matcher: [
    '/',
    '/match/:path*',
    '/interest/:path*',
    '/chat/:path*',
    '/self-date/:path*',
    '/my/:path*',
    '/waiting',
    '/p/:path*',
  ],
};
