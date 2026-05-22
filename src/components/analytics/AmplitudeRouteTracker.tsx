'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackScreenView } from '@/lib/analytics';

function hasPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function normalizePath(pathname: string): string {
  if (hasPathPrefix(pathname, '/p/a83k2')) {
    return pathname === '/p/a83k2' ? '/p/a83k2' : '/p/a83k2/:id';
  }

  if (hasPathPrefix(pathname, '/p/q91mz')) {
    return pathname === '/p/q91mz' ? '/p/q91mz' : '/p/q91mz/:id';
  }

  if (hasPathPrefix(pathname, '/p/r5t8u')) {
    if (pathname === '/p/r5t8u') return '/p/r5t8u';
    if (pathname === '/p/r5t8u/create') return '/p/r5t8u/create';
    if (pathname === '/p/r5t8u/mine') return '/p/r5t8u/mine';
    return '/p/r5t8u/:id';
  }

  if (hasPathPrefix(pathname, '/p/m6y2p')) {
    if (pathname === '/p/m6y2p') return '/p/m6y2p';
    if (pathname.startsWith('/p/m6y2p/profile')) return '/p/m6y2p/profile';
    if (pathname.startsWith('/p/m6y2p/settings')) return '/p/m6y2p/settings';
    if (pathname.startsWith('/p/m6y2p/posts')) return '/p/m6y2p/posts';
    if (pathname.startsWith('/p/m6y2p/support')) return '/p/m6y2p/support';
    if (pathname.startsWith('/p/m6y2p/privacy')) return '/p/m6y2p/privacy';
    if (pathname.startsWith('/p/m6y2p/terms')) return '/p/m6y2p/terms';
    return '/p/m6y2p/:page';
  }

  if (hasPathPrefix(pathname, '/match')) return pathname === '/match' ? '/match' : '/match/:id';
  if (hasPathPrefix(pathname, '/interest')) return '/interest';
  if (hasPathPrefix(pathname, '/chat')) return pathname === '/chat' ? '/chat' : '/chat/:id';
  if (hasPathPrefix(pathname, '/self-date')) {
    if (pathname === '/self-date') return '/self-date';
    if (pathname === '/self-date/create') return '/self-date/create';
    if (pathname === '/self-date/mine') return '/self-date/mine';
    return '/self-date/:id';
  }
  if (hasPathPrefix(pathname, '/my')) {
    if (pathname === '/my') return '/my';
    if (pathname.startsWith('/my/profile')) return '/my/profile';
    if (pathname.startsWith('/my/settings')) return '/my/settings';
    if (pathname.startsWith('/my/posts')) return '/my/posts';
    if (pathname.startsWith('/my/support')) return '/my/support';
    if (pathname.startsWith('/my/privacy')) return '/my/privacy';
    if (pathname.startsWith('/my/terms')) return '/my/terms';
    return '/my/:page';
  }

  return pathname;
}

function getScreenInfo(pathname: string): { screen: string; section: string } {
  if (hasPathPrefix(pathname, '/p/a83k2') || hasPathPrefix(pathname, '/match')) {
    return pathname === '/p/a83k2' || pathname === '/match'
      ? { screen: 'today_woori', section: 'match' }
      : { screen: 'today_woori_profile', section: 'match' };
  }

  if (hasPathPrefix(pathname, '/p/h7n4d') || hasPathPrefix(pathname, '/interest')) {
    return { screen: 'received_hearts', section: 'match' };
  }

  if (hasPathPrefix(pathname, '/p/q91mz') || hasPathPrefix(pathname, '/chat')) {
    return pathname === '/p/q91mz' || pathname === '/chat'
      ? { screen: 'chat_list', section: 'chat' }
      : { screen: 'chat_room', section: 'chat' };
  }

  if (hasPathPrefix(pathname, '/p/r5t8u') || hasPathPrefix(pathname, '/self-date')) {
    if (pathname.endsWith('/create')) return { screen: 'now_woori_create', section: 'self-date' };
    if (pathname.endsWith('/mine')) return { screen: 'now_woori_my_posts', section: 'self-date' };
    return pathname === '/p/r5t8u' || pathname === '/self-date'
      ? { screen: 'now_woori', section: 'self-date' }
      : { screen: 'now_woori_detail', section: 'self-date' };
  }

  if (hasPathPrefix(pathname, '/p/m6y2p') || hasPathPrefix(pathname, '/my')) {
    if (pathname.includes('/profile')) return { screen: 'my_profile', section: 'my' };
    if (pathname.includes('/settings')) return { screen: 'my_settings', section: 'my' };
    if (pathname.includes('/posts')) return { screen: 'my_posts', section: 'my' };
    if (pathname.includes('/support')) return { screen: 'support', section: 'my' };
    if (pathname.includes('/privacy')) return { screen: 'privacy_policy', section: 'my' };
    if (pathname.includes('/terms')) return { screen: 'terms', section: 'my' };
    return { screen: 'my', section: 'my' };
  }

  if (pathname === '/waiting') return { screen: 'waiting', section: 'waiting' };
  if (pathname === '/login') return { screen: 'login', section: 'auth' };
  if (pathname === '/register') return { screen: 'register', section: 'auth' };

  return { screen: 'other', section: 'other' };
}

export function AmplitudeRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter');
  const screenInfo = useMemo(() => getScreenInfo(pathname), [pathname]);
  const normalizedPath = useMemo(() => normalizePath(pathname), [pathname]);

  useEffect(() => {
    trackScreenView({
      ...screenInfo,
      path: normalizedPath,
      filter,
    });
  }, [filter, normalizedPath, screenInfo]);

  return null;
}
