'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const LOGIN_PATH = '/p/l0g8n';

const INVALID_SESSION_CODES = new Set([
  'UNAUTHORIZED',
  'SESSION_EXPIRED',
  'ACCOUNT_SUSPENDED',
  'ACCOUNT_WITHDRAWN',
]);

type ApiErrorPayload = {
  success?: boolean;
  error?: {
    code?: string;
  };
};

async function isCurrentSessionValid(signal: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/me', {
      cache: 'no-store',
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-store',
      },
      signal,
    });

    const payload = await response.json().catch(() => null) as ApiErrorPayload | null;

    if (response.ok && payload?.success !== false) {
      return true;
    }

    const errorCode = payload?.error?.code;
    if (errorCode && INVALID_SESSION_CODES.has(errorCode)) {
      return false;
    }

    return response.status !== 401;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return true;
    }

    return true;
  }
}

export function AuthSessionGuard() {
  const router = useRouter();

  useEffect(() => {
    let disposed = false;
    let activeController: AbortController | null = null;

    const verifySession = async () => {
      activeController?.abort();
      activeController = new AbortController();

      const isValid = await isCurrentSessionValid(activeController.signal);

      if (!disposed && !isValid) {
        router.replace(LOGIN_PATH);
        router.refresh();
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        void verifySession();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void verifySession();
      }
    };

    void verifySession();
    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      disposed = true;
      activeController?.abort();
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router]);

  return null;
}
