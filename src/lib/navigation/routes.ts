import type { MainTab } from '@/lib/types';

export type AppSection = MainTab;
export type ProfileEntrySource = 'recommendation' | 'interest' | 'self-date' | 'chat';

export interface SearchParamsLike {
  get(name: string): string | null;
  toString(): string;
}

export interface NavigationContext {
  sourcePath?: string;
  sourceSection?: AppSection;
  fallbackPath?: string;
  targetSection?: AppSection;
}

const VALID_SECTIONS: AppSection[] = ['match', 'self-date', 'chat', 'my'];
const PROFILE_SOURCES: ProfileEntrySource[] = ['recommendation', 'interest', 'self-date', 'chat'];

export const SECTION_ROOTS: Record<AppSection, string> = {
  match: '/match',
  'self-date': '/self-date',
  chat: '/chat',
  my: '/my',
};

export const NAV_QUERY_KEYS = {
  sourcePath: 'from',
  fallbackPath: 'fallback',
  section: 'section',
  source: 'source',
} as const;

function isValidSection(value: string | null | undefined): value is AppSection {
  return VALID_SECTIONS.includes(value as AppSection);
}

function isProfileEntrySource(value: string | null | undefined): value is ProfileEntrySource {
  return PROFILE_SOURCES.includes(value as ProfileEntrySource);
}

export function isInternalAppPath(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.startsWith('/');
}

export function getSectionRoot(section: AppSection): string {
  return SECTION_ROOTS[section];
}

export function getSectionFromProfileSource(source: ProfileEntrySource): AppSection {
  switch (source) {
    case 'interest':
      return 'my';
    case 'self-date':
      return 'self-date';
    case 'chat':
      return 'chat';
    case 'recommendation':
    default:
      return 'match';
  }
}

export function cloneSearchParams(searchParams?: SearchParamsLike): URLSearchParams {
  return new URLSearchParams(searchParams?.toString() ?? '');
}

export function buildCurrentPath(pathname: string, searchParams?: SearchParamsLike): string {
  const params = cloneSearchParams(searchParams);
  params.delete(NAV_QUERY_KEYS.sourcePath);
  params.delete(NAV_QUERY_KEYS.fallbackPath);

  const nextSearch = params.toString();
  return nextSearch ? `${pathname}?${nextSearch}` : pathname;
}

function formatUrl(url: URL): string {
  return `${url.pathname}${url.search}${url.hash}`;
}

export function appendNavigationContext(targetPath: string, context: NavigationContext = {}): string {
  const url = new URL(targetPath, 'https://injeuri.local');

  if (context.sourcePath && isInternalAppPath(context.sourcePath)) {
    url.searchParams.set(NAV_QUERY_KEYS.sourcePath, context.sourcePath);
  }

  if (context.fallbackPath && isInternalAppPath(context.fallbackPath)) {
    url.searchParams.set(NAV_QUERY_KEYS.fallbackPath, context.fallbackPath);
  }

  if (context.targetSection) {
    url.searchParams.set(NAV_QUERY_KEYS.section, context.targetSection);
  }

  return formatUrl(url);
}

export function buildProfileDetailHref(
  userId: string,
  source: ProfileEntrySource,
  context: NavigationContext = {},
): string {
  const href = appendNavigationContext(`/match/${userId}`, {
    ...context,
    targetSection: context.targetSection ?? context.sourceSection ?? getSectionFromProfileSource(source),
  });
  const url = new URL(href, 'https://injeuri.local');
  url.searchParams.set(NAV_QUERY_KEYS.source, source);
  return formatUrl(url);
}

export function buildChatRoomHref(chatId: string, context: NavigationContext = {}): string {
  return appendNavigationContext(`/chat/${chatId}`, context);
}

export function buildSelfDateDetailHref(storyId: string, context: NavigationContext = {}): string {
  return appendNavigationContext(`/self-date/${storyId}`, context);
}

export function buildMyPostsHref(context: NavigationContext = {}): string {
  return appendNavigationContext('/my/posts', context);
}

export function buildSelfDateMyPostsHref(context: NavigationContext = {}): string {
  return appendNavigationContext('/self-date/mine', context);
}

export function resolveOwnerSection(pathname: string, searchParams?: SearchParamsLike): AppSection {
  const explicitSection = searchParams?.get(NAV_QUERY_KEYS.section);
  if (isValidSection(explicitSection)) {
    return explicitSection;
  }

  const source = searchParams?.get(NAV_QUERY_KEYS.source);
  if (isProfileEntrySource(source)) {
    return getSectionFromProfileSource(source);
  }

  if (pathname.startsWith('/interest') || pathname.startsWith('/my')) {
    return 'match';
  }

  if (pathname.startsWith('/chat')) {
    return 'chat';
  }

  if (pathname.startsWith('/self-date')) {
    return 'self-date';
  }

  return 'match';
}

export function getDefaultFallbackPath(pathname: string, searchParams?: SearchParamsLike): string {
  const explicitFallback = searchParams?.get(NAV_QUERY_KEYS.fallbackPath);
  if (isInternalAppPath(explicitFallback)) {
    return explicitFallback;
  }

  const sourcePath = searchParams?.get(NAV_QUERY_KEYS.sourcePath);
  if (isInternalAppPath(sourcePath)) {
    return sourcePath;
  }

  const source = searchParams?.get(NAV_QUERY_KEYS.source);
  if (isProfileEntrySource(source)) {
    return source === 'interest' ? '/interest' : getSectionRoot(getSectionFromProfileSource(source));
  }

  if (pathname.startsWith('/interest')) {
    return '/match';
  }

  if (
    pathname.startsWith('/my/profile')
    || pathname.startsWith('/my/settings')
    || pathname.startsWith('/my/posts')
    || pathname.startsWith('/my/ideal-type')
  ) {
    return '/my';
  }

  return getSectionRoot(resolveOwnerSection(pathname, searchParams));
}

export function pathsMatch(left?: string | null, right?: string | null): boolean {
  if (!left || !right) {
    return false;
  }

  return left === right;
}
