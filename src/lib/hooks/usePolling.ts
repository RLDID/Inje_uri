'use client';

import { useEffect, useRef } from 'react';

interface UsePollingOptions {
  intervalMs: number;
  enabled?: boolean;
  immediate?: boolean;
  pauseWhenHidden?: boolean;
}

export function usePolling(
  callback: () => Promise<void> | void,
  {
    intervalMs,
    enabled = true,
    immediate = false,
    pauseWhenHidden = true,
  }: UsePollingOptions,
) {
  const callbackRef = useRef(callback);
  const isRunningRef = useRef(false);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || intervalMs <= 0 || typeof window === 'undefined') {
      return undefined;
    }

    const shouldPause = () => (
      pauseWhenHidden &&
      typeof document !== 'undefined' &&
      document.visibilityState === 'hidden'
    );

    const run = async () => {
      if (isRunningRef.current || shouldPause()) {
        return;
      }

      isRunningRef.current = true;
      try {
        await callbackRef.current();
      } catch {
        // Polling errors are retried on the next tick by design.
      } finally {
        isRunningRef.current = false;
      }
    };

    if (immediate) {
      void run();
    }

    const intervalId = window.setInterval(() => {
      void run();
    }, intervalMs);

    const handleVisibilityChange = () => {
      if (!pauseWhenHidden || document.visibilityState === 'visible') {
        void run();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, immediate, intervalMs, pauseWhenHidden]);
}
