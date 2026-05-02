import type { Story } from '@/lib/types';
import { STORY_EXPIRY_HOURS, getFeedFilterCategoryId, type FeedFilterCategoryId } from '@/lib/constants';

const VIEWED_FEEDS_SESSION_KEY = 'session_viewed_feeds';

export function isValidFeed(story: Story): boolean {
  const now = Date.now();
  const expiresAt = new Date(story.expiresAt).getTime();
  return expiresAt > now;
}

export function getFeedRemainingTime(story: Story): {
  hours: number;
  minutes: number;
  totalMinutes: number;
  isExpiringSoon: boolean;
  isExpired: boolean;
  formatted: string;
} {
  const now = Date.now();
  const expiresAt = new Date(story.expiresAt).getTime();
  const diff = expiresAt - now;

  if (diff <= 0) {
    return {
      hours: 0,
      minutes: 0,
      totalMinutes: 0,
      isExpiringSoon: false,
      isExpired: true,
      formatted: '만료됨',
    };
  }

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const isExpiringSoon = hours < 1;

  const formatted = hours > 0 ? `${hours}시간 ${minutes}분 남음` : `${minutes}분 남음`;

  return {
    hours,
    minutes,
    totalMinutes,
    isExpiringSoon,
    isExpired: false,
    formatted,
  };
}

export function getViewedFeedIds(): Set<string> {
  if (typeof window === 'undefined') {
    return new Set();
  }

  try {
    const stored = sessionStorage.getItem(VIEWED_FEEDS_SESSION_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch {
    // ignore
  }

  return new Set();
}

export function markFeedAsViewed(feedId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const viewed = getViewedFeedIds();
    viewed.add(feedId);
    sessionStorage.setItem(VIEWED_FEEDS_SESSION_KEY, JSON.stringify([...viewed]));
  } catch {
    // ignore
  }
}

export function getStoryCategories(story: Pick<Story, 'category' | 'categories'>): NonNullable<Story['categories']> {
  const nextCategories = story.categories?.filter(Boolean) ?? [];

  if (nextCategories.length > 0) {
    return Array.from(new Set(nextCategories));
  }

  return story.category ? [story.category] : [];
}

export function getStoryFilterCategoryIds(story: Pick<Story, 'category' | 'categories'>): FeedFilterCategoryId[] {
  const categories = getStoryCategories(story);

  if (categories.length === 0) {
    return ['all'];
  }

  return Array.from(new Set(categories.map((category) => getFeedFilterCategoryId(category))));
}

export function matchesStoryFilter(
  story: Pick<Story, 'category' | 'categories'>,
  filter: FeedFilterCategoryId,
): boolean {
  if (filter === 'all') {
    return true;
  }

  return getStoryFilterCategoryIds(story).includes(filter);
}

export function shuffleFeeds(stories: Story[]): Story[] {
  const now = Date.now();
  const viewedIds = getViewedFeedIds();

  const validStories = stories.filter((story) => new Date(story.expiresAt).getTime() > now);

  const scored = validStories.map((story) => {
    let score = 0;

    score += Math.min(story.viewCount * 2, 30);

    const ageMinutes = (now - new Date(story.createdAt).getTime()) / (1000 * 60);
    if (ageMinutes < 30) {
      score += 40;
    } else if (ageMinutes < 60) {
      score += 20;
    }

    const remaining = getFeedRemainingTime(story);
    if (remaining.isExpiringSoon && remaining.totalMinutes > 10) {
      score += 10;
    }

    if (viewedIds.has(story.id)) {
      score -= 50;
    }

    score += Math.random() * 30 - 15;

    return { story, score };
  });

  scored.sort((left, right) => right.score - left.score);

  return scored.map((item) => item.story);
}

export function getMoreFeeds(
  allStories: Story[],
  currentlyShown: string[],
  count = 5,
): Story[] {
  const now = Date.now();
  const viewedIds = new Set(currentlyShown);

  const unseenStories = allStories.filter(
    (story) => new Date(story.expiresAt).getTime() > now && !viewedIds.has(story.id),
  );

  const shuffled = [...unseenStories].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function calculateExpiresAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + STORY_EXPIRY_HOURS * 60 * 60 * 1000);
}
