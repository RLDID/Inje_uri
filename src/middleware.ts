import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, isProtectedAppPath } from '@/lib/auth/constants';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isAuthenticated = request.cookies.has(SESSION_COOKIE_NAME);

  if (!isAuthenticated && isProtectedAppPath(pathname)) {
    const loginUrl = new URL('/', request.url);
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
  ],
};
