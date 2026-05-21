import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, isProtectedAppPath } from '@/lib/auth/constants';

const LAUNCH_AT_MS = new Date('2026-05-25T00:00:00+09:00').getTime();
const WAITING_PATHS = new Set(['/waiting', '/p/w8t2k']);
const MATCH_ALIAS_PATH = '/p/a83k2';

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isAuthenticated = request.cookies.has(SESSION_COOKIE_NAME);

  if (WAITING_PATHS.has(pathname) && Date.now() >= LAUNCH_AT_MS) {
    return NextResponse.redirect(new URL(MATCH_ALIAS_PATH, request.url));
  }

  if (!isAuthenticated && isProtectedAppPath(pathname)) {
    const loginUrl = new URL('/p/l0g8n', request.url);
    const nextPath = `${pathname}${search}`;

    if (nextPath !== '/') {
      loginUrl.searchParams.set('next', nextPath);
    }

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
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
