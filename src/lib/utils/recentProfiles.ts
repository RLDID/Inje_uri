import type { ProfileEntrySource } from '@/lib/navigation';

export interface RecentProfileView {
  userId: string;
  viewedAt: string;
  source?: ProfileEntrySource;
}

const RECENT_PROFILE_VIEWS_STORAGE_KEY = 'injeuri:recent-profile-views';
const MAX_RECENT_PROFILE_VIEWS = 50;

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
      .map((item): RecentProfileView | null => {
        if (typeof item === 'string') {
          return { userId: item, viewedAt: new Date().toISOString() };
        }

        if (item && typeof item === 'object' && typeof (item as RecentProfileView).userId === 'string') {
          return {
            userId: (item as RecentProfileView).userId,
            viewedAt: typeof (item as RecentProfileView).viewedAt === 'string'
              ? (item as RecentProfileView).viewedAt
              : new Date().toISOString(),
            source: (item as RecentProfileView).source,
          };
        }

        return null;
      })
      .filter((item): item is RecentProfileView => item !== null);
  } catch {
    return [];
  }
}

export function recordRecentProfileView(userId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const nextIds = [
      userId,
      ...readRecentProfileViews().map((item) => item.userId).filter((storedUserId) => storedUserId !== userId),
    ].slice(0, MAX_RECENT_PROFILE_VIEWS);

    window.localStorage.setItem(RECENT_PROFILE_VIEWS_STORAGE_KEY, JSON.stringify(nextIds));
  } catch {
    // Ignore storage errors so profile detail never breaks on private browsing modes.
  }
}
