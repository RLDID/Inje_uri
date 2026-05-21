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

const ROUTE_PREFIX_ALIASES = [
  { canonical: '/match', alias: '/p/a83k2' },
  { canonical: '/interest', alias: '/p/h7n4d' },
  { canonical: '/chat', alias: '/p/q91mz' },
  { canonical: '/self-date', alias: '/p/r5t8u' },
  { canonical: '/my', alias: '/p/m6y2p' },
] as const;

export const SECTION_ROOTS: Record<AppSection, string> = {
  match: '/p/a83k2',
  'self-date': '/p/r5t8u',
  chat: '/p/q91mz',
  my: '/p/m6y2p',
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

function hasPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function toObfuscatedPath(path: string): string {
  const url = new URL(path, 'https://injeuri.local');
  const alias = ROUTE_PREFIX_ALIASES.find(({ canonical }) => hasPathPrefix(url.pathname, canonical));

  if (alias) {
    url.pathname = `${alias.alias}${url.pathname.slice(alias.canonical.length)}`;
  }

  return formatUrl(url);
}

function toCanonicalPathname(pathname: string): string {
  const alias = ROUTE_PREFIX_ALIASES.find(({ alias: aliasPath }) => hasPathPrefix(pathname, aliasPath));

  if (!alias) {
    return pathname;
  }

  return `${alias.canonical}${pathname.slice(alias.alias.length)}`;
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
  return toObfuscatedPath(nextSearch ? `${pathname}?${nextSearch}` : pathname);
}

function formatUrl(url: URL): string {
  return `${url.pathname}${url.search}${url.hash}`;
}

export function appendNavigationContext(targetPath: string, context: NavigationContext = {}): string {
  const url = new URL(targetPath, 'https://injeuri.local');

  if (context.sourcePath && isInternalAppPath(context.sourcePath)) {
    url.searchParams.set(NAV_QUERY_KEYS.sourcePath, toObfuscatedPath(context.sourcePath));
  }

  if (context.fallbackPath && isInternalAppPath(context.fallbackPath)) {
    url.searchParams.set(NAV_QUERY_KEYS.fallbackPath, toObfuscatedPath(context.fallbackPath));
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
  const href = appendNavigationContext(`/p/a83k2/${userId}`, {
    ...context,
    targetSection: context.targetSection ?? context.sourceSection ?? getSectionFromProfileSource(source),
  });
  const url = new URL(href, 'https://injeuri.local');
  url.searchParams.set(NAV_QUERY_KEYS.source, source);
  return formatUrl(url);
}

export function buildChatRoomHref(chatId: string, context: NavigationContext = {}): string {
  return appendNavigationContext(`/p/q91mz/${chatId}`, context);
}

export function buildSelfDateDetailHref(storyId: string, context: NavigationContext = {}): string {
  return appendNavigationContext(`/p/r5t8u/${storyId}`, context);
}

export function buildMyPostsHref(context: NavigationContext = {}): string {
  return appendNavigationContext('/p/m6y2p/posts', context);
}

export function buildSelfDateMyPostsHref(context: NavigationContext = {}): string {
  return appendNavigationContext('/p/r5t8u/mine', context);
}

export function resolveOwnerSection(pathname: string, searchParams?: SearchParamsLike): AppSection {
  const canonicalPathname = toCanonicalPathname(pathname);
  const explicitSection = searchParams?.get(NAV_QUERY_KEYS.section);
  if (isValidSection(explicitSection)) {
    return explicitSection;
  }

  const source = searchParams?.get(NAV_QUERY_KEYS.source);
  if (isProfileEntrySource(source)) {
    return getSectionFromProfileSource(source);
  }

  if (canonicalPathname.startsWith('/my')) {
    return 'my';
  }

  if (canonicalPathname.startsWith('/interest')) {
    return 'match';
  }

  if (canonicalPathname.startsWith('/chat')) {
    return 'chat';
  }

  if (canonicalPathname.startsWith('/self-date')) {
    return 'self-date';
  }

  return 'match';
}

export function getDefaultFallbackPath(pathname: string, searchParams?: SearchParamsLike): string {
  const canonicalPathname = toCanonicalPathname(pathname);
  const explicitFallback = searchParams?.get(NAV_QUERY_KEYS.fallbackPath);
  if (isInternalAppPath(explicitFallback)) {
    return toObfuscatedPath(explicitFallback);
  }

  const sourcePath = searchParams?.get(NAV_QUERY_KEYS.sourcePath);
  if (isInternalAppPath(sourcePath)) {
    return toObfuscatedPath(sourcePath);
  }

  const source = searchParams?.get(NAV_QUERY_KEYS.source);
  if (isProfileEntrySource(source)) {
    return source === 'interest' ? '/p/h7n4d' : getSectionRoot(getSectionFromProfileSource(source));
  }

  if (canonicalPathname.startsWith('/interest')) {
    return '/p/a83k2';
  }

  if (
    canonicalPathname.startsWith('/my/profile')
    || canonicalPathname.startsWith('/my/settings')
    || canonicalPathname.startsWith('/my/posts')
    || canonicalPathname.startsWith('/my/ideal-type')
  ) {
    return '/p/m6y2p';
  }

  return getSectionRoot(resolveOwnerSection(canonicalPathname, searchParams));
}

export function pathsMatch(left?: string | null, right?: string | null): boolean {
  if (!left || !right) {
    return false;
  }

  return toObfuscatedPath(left) === toObfuscatedPath(right);
}
