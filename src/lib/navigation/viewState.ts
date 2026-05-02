const VIEW_STATE_PREFIX = 'injeuri:view-state:';

export function readRouteViewState<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const rawValue = window.sessionStorage.getItem(`${VIEW_STATE_PREFIX}${key}`);
    if (!rawValue) {
      return fallback;
    }

    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

export function writeRouteViewState<T>(key: string, value: T): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(`${VIEW_STATE_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // Ignore storage failures to avoid breaking navigation.
  }
}
