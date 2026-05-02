'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { buildCurrentPath } from '@/lib/navigation';
import { recordAppHistory } from '@/lib/navigation/history';

export function NavigationTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPath = useMemo(
    () => buildCurrentPath(pathname, searchParams),
    [pathname, searchParams],
  );

  useEffect(() => {
    recordAppHistory(currentPath);
  }, [currentPath]);

  return null;
}
