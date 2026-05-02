export const APP_NAME = '인제우리';

export const DAILY_RECOMMENDATION_COUNT = 3;
export const DAILY_RECOMMENDATION_REFRESH_HOUR = 9;
export const MAX_DAILY_SELECTION = 1;
export const STORY_EXPIRY_HOURS = 2;

export const MAX_PERSONALITY_KEYWORDS = 5;
export const MAX_INTEREST_KEYWORDS = 7;
export const MAX_VIBE_KEYWORDS = 3;
export const MAX_DEALBREAKER_KEYWORDS = 3;

export const PLACEHOLDER_PROFILE_IMAGE = 'data:image/svg+xml,' + encodeURIComponent(`
<svg width="400" height="500" viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="500" fill="#F3F4F6"/>
  <circle cx="200" cy="160" r="70" fill="#D1D5DB"/>
  <ellipse cx="200" cy="380" rx="110" ry="100" fill="#D1D5DB"/>
  <path d="M130 160 Q200 100 270 160" stroke="#E5E7EB" stroke-width="8" fill="none"/>
</svg>
`);

const FEMALE_AVATAR_IDS = [
  1, 5, 9, 10, 16, 20, 21, 23, 24, 25,
  26, 28, 29, 31, 32, 36, 38, 39, 40, 41,
  43, 44, 45, 47, 48, 49, 56, 57, 58, 59,
  60, 61, 63, 64, 65, 66, 68, 69,
];

const FALLBACK_IMAGE_SOURCES = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
];

export function getProfileImageUrl(userId: string, index = 0): string {
  const seed = hashCode(userId) + index * 7;
  const avatarIndex = Math.abs(seed) % FEMALE_AVATAR_IDS.length;
  return `https://i.pravatar.cc/400?img=${FEMALE_AVATAR_IDS[avatarIndex]}`;
}

export function getMultipleProfileImages(userId: string, count = 3): string[] {
  const images: string[] = [];
  for (let index = 0; index < count; index += 1) {
    images.push(getProfileImageUrl(userId, index));
  }
  return images;
}

export function getFallbackImage(index = 0): string {
  return FALLBACK_IMAGE_SOURCES[index % FALLBACK_IMAGE_SOURCES.length];
}

function hashCode(str: string): number {
  let hash = 0;
  for (let index = 0; index < str.length; index += 1) {
    const char = str.charCodeAt(index);
    hash = ((hash << 5) - hash) + char;
    hash &= hash;
  }
  return hash;
}

export const FEED_CATEGORY_OPTIONS = [
  { id: 'walk', label: '산책' },
  { id: 'cafe', label: '카페' },
  { id: 'food', label: '맛집' },
  { id: 'study', label: '공부' },
  { id: 'movie', label: '영화' },
  { id: 'drive', label: '드라이브' },
  { id: 'exercise', label: '운동' },
  { id: 'exhibition', label: '전시' },
  { id: 'drink', label: '술' },
  { id: 'book', label: '독서' },
  { id: 'talk', label: '수다' },
  { id: 'hobby', label: '취미' },
] as const;

export const SELFDATE_KEYWORD_OPTIONS = FEED_CATEGORY_OPTIONS;

export const FEED_FILTER_CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'walk', label: '산책' },
  { id: 'cafe', label: '카페' },
  { id: 'food', label: '맛집' },
  { id: 'study', label: '공부' },
  { id: 'other', label: '기타' },
] as const;

export type FeedFilterCategoryId = (typeof FEED_FILTER_CATEGORIES)[number]['id'];

const PRIMARY_FEED_CATEGORY_IDS = new Set([
  'walk',
  'cafe',
  'food',
  'study',
]);

export function getFeedFilterCategoryId(category?: string | string[] | null): FeedFilterCategoryId {
  if (!category || (Array.isArray(category) && category.length === 0)) {
    return 'all';
  }

  if (Array.isArray(category)) {
    const primaryCategory = category.find((item) => PRIMARY_FEED_CATEGORY_IDS.has(item));
    if (primaryCategory) {
      return primaryCategory as FeedFilterCategoryId;
    }

    return getFeedFilterCategoryId(category[0]);
  }

  return PRIMARY_FEED_CATEGORY_IDS.has(category) ? (category as FeedFilterCategoryId) : 'other';
}

export function getFeedCategoryLabel(category?: string | null): string {
  if (!category) {
    return '지금 우리';
  }

  return FEED_CATEGORY_OPTIONS.find((option) => option.id === category)?.label ?? '지금 우리';
}
