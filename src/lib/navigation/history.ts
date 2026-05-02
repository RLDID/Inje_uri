const APP_HISTORY_STORAGE_KEY = 'injeuri:navigation-history';
const MAX_HISTORY_LENGTH = 50;

function readHistory(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.sessionStorage.getItem(APP_HISTORY_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry): entry is string => typeof entry === 'string' && entry.startsWith('/'));
  } catch {
    return [];
  }
}

function writeHistory(history: string[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(APP_HISTORY_STORAGE_KEY, JSON.stringify(history.slice(-MAX_HISTORY_LENGTH)));
  } catch {
    // Ignore storage failures and keep navigation working.
  }
}

export function recordAppHistory(path: string): void {
  if (!path.startsWith('/')) {
    return;
  }

  const history = readHistory();
  if (history[history.length - 1] === path) {
    return;
  }

  writeHistory([...history, path]);
}

export function getPreviousAppPath(currentPath?: string): string | undefined {
  const history = readHistory();
  if (history.length < 2) {
    return undefined;
  }

  if (!currentPath) {
    return history[history.length - 2];
  }

  const currentIndex = history.lastIndexOf(currentPath);
  if (currentIndex > 0) {
    return history[currentIndex - 1];
  }

  return history[history.length - 2];
}
