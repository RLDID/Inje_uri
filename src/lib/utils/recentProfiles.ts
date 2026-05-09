import type { ProfileEntrySource } from '@/lib/navigation';

export interface RecentProfileView {
  userId: string;
  viewedAt: string;
  source?: ProfileEntrySource;
}

const RECENT_PROFILE_VIEWS_STORAGE_KEY = 'injeuri:recent-profile-views';
const MAX_RECENT_PROFILE_VIEWS = 50;

function isRecentProfileView(value: unknown): value is RecentProfileView {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as Partial<RecentProfileView>;
  return typeof item.userId === 'string' && typeof item.viewedAt === 'string';
}

export function readRecentProfileViews(): RecentProfileView[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(RECENT_PROFILE_VIEWS_STORAGE_KEY);
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .filter(isRecentProfileView)
      .filter((item) => !Number.isNaN(new Date(item.viewedAt).getTime()))
      .sort((first, second) => (
        new Date(second.viewedAt).getTime() - new Date(first.viewedAt).getTime()
      ));
  } catch {
    return [];
  }
}

export function recordRecentProfileView(userId: string, source?: ProfileEntrySource): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const nextViews: RecentProfileView[] = [
      {
        userId,
        viewedAt: new Date().toISOString(),
        source,
      },
      ...readRecentProfileViews().filter((item) => item.userId !== userId),
    ].slice(0, MAX_RECENT_PROFILE_VIEWS);

    window.localStorage.setItem(RECENT_PROFILE_VIEWS_STORAGE_KEY, JSON.stringify(nextViews));
  } catch {
    // Ignore storage errors so profile detail never breaks on private browsing modes.
  }
}
