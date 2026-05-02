'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getPreviousAppPath } from '@/lib/navigation/history';
import {
  buildCurrentPath,
  getDefaultFallbackPath,
  getSectionRoot,
  NAV_QUERY_KEYS,
  resolveOwnerSection,
  type AppSection,
} from '@/lib/navigation/routes';

interface SafeBackOptions {
  fallbackPath?: string;
  enableBrowserFallback?: boolean;
}

export function useCurrentRouteContext() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPath = useMemo(
    () => buildCurrentPath(pathname, searchParams),
    [pathname, searchParams],
  );
  const ownerSection = useMemo(
    () => resolveOwnerSection(pathname, searchParams),
    [pathname, searchParams],
  );
  const defaultFallbackPath = useMemo(
    () => getDefaultFallbackPath(pathname, searchParams),
    [pathname, searchParams],
  );

  return {
    pathname,
    searchParams,
    currentPath,
    ownerSection,
    defaultFallbackPath,
    sourcePath: searchParams.get(NAV_QUERY_KEYS.sourcePath) ?? undefined,
  };
}

export function useSafeBack(options: SafeBackOptions = {}) {
  const router = useRouter();
  const {
    currentPath,
    ownerSection,
    defaultFallbackPath,
    sourcePath,
  } = useCurrentRouteContext();

  const fallbackPath = sourcePath ?? options.fallbackPath ?? defaultFallbackPath ?? getSectionRoot(ownerSection);
  const browserFallbackEnabled = options.enableBrowserFallback ?? true;
  const historyTrapRef = useRef<string | null>(null);

  useEffect(() => {
    const previousPath = getPreviousAppPath(currentPath);
    if (!browserFallbackEnabled || previousPath || !fallbackPath || historyTrapRef.current === currentPath) {
      return;
    }

    historyTrapRef.current = currentPath;
    const fallbackState = {
      ...(window.history.state ?? {}),
      __injeuriFallbackTarget: fallbackPath,
    };

    window.history.replaceState(fallbackState, '', window.location.href);
    window.history.pushState({ __injeuriBackTrap: true }, '', window.location.href);

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as { __injeuriFallbackTarget?: string } | null;
      if (state?.__injeuriFallbackTarget) {
        router.replace(state.__injeuriFallbackTarget);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [browserFallbackEnabled, currentPath, fallbackPath, router]);

  const goBack = useCallback(() => {
    const previousPath = getPreviousAppPath(currentPath);
    if (previousPath) {
      router.back();
      return;
    }

    router.replace(fallbackPath);
  }, [currentPath, fallbackPath, router]);

  return {
    goBack,
    currentPath,
    ownerSection,
    fallbackPath,
    sourcePath,
  };
}

export function useSectionRoot(section: AppSection): string {
  return getSectionRoot(section);
}
