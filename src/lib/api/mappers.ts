import { PLACEHOLDER_PROFILE_IMAGE } from '@/lib/constants';
import type {
  Chat,
  ChatRoomListItemDto,
  DailyRecommendation,
  FeedCategory,
  FeedDetailDto,
  FeedListItemDto,
  Interest,
  Message,
  RecommendationSettings,
  RawKeywordSelectionGroup,
  Story,
  User,
} from '@/lib/types';

export type ApiUserProfile = {
  user?: {
    id?: number | string;
    realName?: string;
    nickname?: string;
    age?: number | null;
    gender?: string;
    university?: string;
    department?: string;
    studentYear?: number;
    student_number?: number | string | null;
    studentNumber?: number | string | null;
    bio?: string | null;
    profileImages?: Array<string | { id?: number | string; imageUrl?: string | null; sortOrder?: number; isPrimary?: boolean }>;
    keywordSelections?: RawKeywordSelectionGroup[];
    createdAt?: string | null;
    lastActiveAt?: string | null;
  };
  profileImages?: Array<{ id?: number | string; imageUrl?: string | null; sortOrder?: number; isPrimary?: boolean }>;
  keywordSelections?: RawKeywordSelectionGroup[];
};

type TodayRecommendationDto = {
  recommendation_date: string;
  is_selection_made: boolean;
  selected_candidate_user_id: number | null;
  candidates: Array<{
    item_id: number;
    candidate_user_id: number;
    is_passed: boolean;
    blocked: boolean;
    profile: {
      nickname: string;
      gender: string;
      age: number | null;
      department: string;
      student_year: number;
      bio: string | null;
      primary_image_url: string | null;
      keywords: Array<{ category: string; label: string }>;
    } | null;
  }>;
};

type ReceivedInterestsDto = {
  interests: Array<{
    interest_id: number;
    from_user_id: number;
    created_at: string;
    profile: {
      nickname: string;
      age: number | null;
      department: string;
      student_year: number;
      bio: string | null;
      primary_image_url: string | null;
      gender: string;
    };
  }>;
};

export type ChatMessageDto = {
  id: number;
  sender_user_id: number;
  type: string;
  content: string;
  created_at: string;
};

type RecommendationSettingsDto = {
  exclude_same_department: boolean;
  reduce_same_year: boolean;
  preferred_age_min: number | null;
  preferred_age_max: number | null;
  filter_drinking: boolean;
  filter_smoking: boolean;
  updated_at: string | null;
};

const CATEGORY_TO_USER_FIELD: Record<string, keyof Pick<
  User,
  'lifestyle' | 'drinking' | 'smoking' | 'mbti' | 'personality' | 'conversationStyle' | 'interests' | 'desiredVibe' | 'dateStyle' | 'dealBreakers'
>> = {
  lifestyle: 'lifestyle',
  drinking: 'drinking',
  smoking: 'smoking',
  mbti: 'mbti',
  personality: 'personality',
  conversation: 'conversationStyle',
  interests: 'interests',
  desired_vibe: 'desiredVibe',
  date_style: 'dateStyle',
  deal_breakers: 'dealBreakers',
};

const MULTI_VALUE_FIELDS = new Set(['personality', 'interests', 'desiredVibe', 'dealBreakers']);

function toDate(value?: string | Date | null): Date {
  if (!value) return new Date();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function normalizeGender(value?: string): User['gender'] {
  return value === 'female' ? 'female' : 'male';
}

function normalizeImages(images: unknown): string[] {
  if (!Array.isArray(images)) return [PLACEHOLDER_PROFILE_IMAGE];

  const urls = images
    .map((image) => (typeof image === 'string' ? image : image.imageUrl))
    .filter((imageUrl): imageUrl is string => Boolean(imageUrl));

  return urls.length > 0 ? urls : [PLACEHOLDER_PROFILE_IMAGE];
}

function normalizeImageMetas(images: unknown): User['profileImageMetas'] {
  if (!Array.isArray(images)) return undefined;

  return images
    .filter((image): image is { id?: number | string; imageUrl?: string | null; sortOrder?: number; isPrimary?: boolean } => (
      typeof image === 'object' && image !== null && 'imageUrl' in image
    ))
    .map((image, index) => ({
      id: String(image.id ?? index),
      imageUrl: image.imageUrl ?? PLACEHOLDER_PROFILE_IMAGE,
      sortOrder: image.sortOrder ?? index + 1,
      isPrimary: image.isPrimary,
    }))
    .filter((image) => Boolean(image.imageUrl));
}

function applyKeywordSelections(user: User, keywordSelections: RawKeywordSelectionGroup[]): User {
  const nextUser: User = { ...user };

  for (const group of keywordSelections) {
    const categoryCode = group.categoryCode ?? group.categoryName ?? '';
    const field = CATEGORY_TO_USER_FIELD[categoryCode];
    if (!field) continue;

    const values = (group.keywords ?? [])
      .map((keyword) => keyword.code ?? keyword.label)
      .filter((value): value is string => Boolean(value));

    if (MULTI_VALUE_FIELDS.has(field)) {
      (nextUser as unknown as Record<string, string[]>)[field] = values;
      continue;
    }

    if (values[0]) {
      (nextUser as unknown as Record<string, string>)[field] = field === 'mbti' ? values[0].toUpperCase() : values[0];
    }
  }

  return nextUser;
}

export function mapUserProfileToUser(input: ApiUserProfile): User {
  // Display-only mapper; do not use fallback values from this result to build save payloads.
  const source = input.user ?? {};
  const profileImages = normalizeImages(
    source.profileImages ?? input.profileImages,
  );
  const profileImageMetas = normalizeImageMetas(source.profileImages ?? input.profileImages);

  const baseUser: User = {
    id: String(source.id ?? ''),
    nickname: source.nickname ?? '알 수 없음',
    age: source.age ?? 0,
    university: source.university ?? '인제대학교',
    department: source.department ?? '',
    studentYear: source.studentYear ?? 1,
    studentNumber: source.studentNumber ?? source.student_number ?? undefined,
    gender: normalizeGender(source.gender),
    profileImages,
    profileImageMetas,
    bio: source.bio ?? undefined,
    personality: [],
    interests: [],
    desiredVibe: [],
    dealBreakers: [],
    isVerified: true,
    isGraduate: false,
    lastActive: toDate(source.lastActiveAt),
    createdAt: toDate(source.createdAt),
  };

  return applyKeywordSelections(baseUser, source.keywordSelections ?? input.keywordSelections ?? []);
}

export function mapTodayRecommendation(dto: TodayRecommendationDto): DailyRecommendation {
  const users = dto.candidates
    .filter((candidate) => !candidate.is_passed && !candidate.blocked && candidate.profile)
    .map((candidate) => {
      const profile = candidate.profile!;
        return {
          id: String(candidate.candidate_user_id),
          nickname: profile.nickname,
          age: profile.age ?? 0,
          university: '인제대학교',
          department: profile.department,
          studentYear: profile.student_year,
          gender: normalizeGender(profile.gender),
          profileImages: profile.primary_image_url ? [profile.primary_image_url] : [PLACEHOLDER_PROFILE_IMAGE],
          bio: profile.bio ?? undefined,
          personality: [],
          conversationStyle: undefined,
        interests: profile.keywords.map((keyword) => keyword.label),
        desiredVibe: [],
        dealBreakers: [],
        isVerified: true,
        isGraduate: false,
        lastActive: new Date(),
        createdAt: new Date(),
        recommendationItemId: candidate.item_id,
      } satisfies User & { recommendationItemId: number };
    });

  return {
    date: dto.recommendation_date,
    users,
    viewedCount: 1,
    selectedUserId: dto.selected_candidate_user_id ? String(dto.selected_candidate_user_id) : undefined,
    isSelectionMade: dto.is_selection_made,
  };
}

export function mapReceivedInterests(dto: ReceivedInterestsDto, currentUserId = ''): Interest[] {
  return dto.interests.map((item) => ({
    id: String(item.interest_id),
    fromUser: {
      id: String(item.from_user_id),
      nickname: item.profile.nickname,
      age: item.profile.age ?? 0,
      university: '인제대학교',
      department: item.profile.department,
      studentYear: item.profile.student_year,
      gender: normalizeGender(item.profile.gender),
      profileImages: item.profile.primary_image_url ? [item.profile.primary_image_url] : [PLACEHOLDER_PROFILE_IMAGE],
      bio: item.profile.bio ?? undefined,
      personality: [],
      interests: [],
      desiredVibe: [],
      dealBreakers: [],
      isVerified: true,
      isGraduate: false,
      lastActive: new Date(item.created_at),
      createdAt: new Date(item.created_at),
    },
    toUserId: currentUserId,
    createdAt: new Date(item.created_at),
    isRead: false,
    status: 'pending',
  }));
}

export function mapChatListItem(dto: ChatRoomListItemDto, currentUser: User | null): Chat {
  const me = currentUser ?? createMinimalUser('me', '나');
  const other = dto.otherUser
    ? createMinimalUser(String(dto.otherUser.userId), dto.otherUser.nickname, dto.otherUser.profileImage)
    : createMinimalUser('unknown', '알 수 없음');

  return {
    id: String(dto.roomId),
    participants: [
      { user: me, joinedAt: new Date(dto.createdAt), lastReadAt: new Date(dto.createdAt) },
      { user: other, joinedAt: new Date(dto.createdAt), lastReadAt: new Date(dto.createdAt) },
    ],
    lastMessage: dto.lastMessage
      ? {
          id: String(dto.lastMessage.id),
          chatId: String(dto.roomId),
          senderId: String(dto.lastMessage.senderUserId),
          content: dto.lastMessage.content,
          type: normalizeMessageType(dto.lastMessage.type),
          createdAt: new Date(dto.lastMessage.createdAt),
          isRead: dto.unreadCount === 0,
        }
      : undefined,
    unreadCount: dto.unreadCount,
    status: dto.status === 'closed' ? 'expired' : dto.status as Chat['status'],
    chatType: dto.expiresAt && new Date(dto.expiresAt).getTime() - new Date(dto.createdAt).getTime() > 3 * 60 * 60 * 1000 ? 'today' : 'now',
    createdAt: new Date(dto.createdAt),
    expiresAt: new Date(dto.expiresAt),
  };
}

export function mapChatMessage(dto: ChatMessageDto, chatId: string): Message {
  return {
    id: String(dto.id),
    chatId,
    senderId: String(dto.sender_user_id),
    content: dto.content,
    type: normalizeMessageType(dto.type),
    createdAt: new Date(dto.created_at),
    isRead: false,
  };
}

export function mapFeedListItemToStory(dto: FeedListItemDto): Story {
  return {
    id: String(dto.feedId),
    author: {
      ...createMinimalUser(String(dto.author.userId), dto.author.nickname, dto.author.profileImage),
      gender: normalizeGender(dto.author.gender),
    },
    content: {
      text: dto.text,
      images: getFeedImages(dto),
      imageMetas: (dto.images ?? []).map((image) => ({
        id: String(image.imageId),
        imageUrl: image.imageUrl ?? '',
        order: image.sortOrder ?? 0,
      })).filter((image) => Boolean(image.imageUrl)),
    },
    category: mapFeedKeywordToCategory(dto.keywords[0]),
    categories: dto.keywords.map(mapFeedKeywordToCategory),
    viewCount: dto.viewCount,
    createdAt: new Date(dto.createdAt),
    expiresAt: new Date(dto.expiresAt),
    isExpired: new Date(dto.expiresAt).getTime() <= Date.now(),
    reactions: [],
  };
}

export function mapFeedDetailToStory(dto: FeedDetailDto): Story {
  const feed = dto.feed;
  return {
    id: String(feed.feedId),
    author: {
      ...createMinimalUser(String(feed.author.userId), feed.author.nickname, feed.author.profileImages[0]?.imageUrl),
      gender: feed.author.gender === 'female' ? 'female' : 'male',
      department: feed.author.department,
      studentYear: feed.author.studentYear,
      bio: feed.author.bio ?? undefined,
      profileImages: feed.author.profileImages.map((image) => image.imageUrl).filter(Boolean),
    },
    content: {
      text: feed.text,
      images: feed.images.map((image) => image.imageUrl).filter(Boolean),
      imageMetas: feed.images.map((image) => ({
        id: String(image.imageId),
        imageUrl: image.imageUrl,
        order: image.sortOrder,
      })).filter((image) => Boolean(image.imageUrl)),
    },
    category: mapFeedKeywordToCategory(feed.keywords[0]),
    categories: feed.keywords.map(mapFeedKeywordToCategory),
    viewCount: feed.viewCount,
    createdAt: new Date(feed.createdAt),
    expiresAt: new Date(feed.expiresAt),
    isExpired: new Date(feed.expiresAt).getTime() <= Date.now(),
    reactions: [],
  };
}

export function mapRecommendationSettings(dto: RecommendationSettingsDto): RecommendationSettings {
  return {
    excludeSameDepartment: dto.exclude_same_department,
    reduceSameYear: dto.reduce_same_year,
    excludeSmokers: dto.filter_smoking,
    excludeFrequentDrinkers: dto.filter_drinking,
    preferredAgeRange: {
      min: dto.preferred_age_min ?? 20,
      max: dto.preferred_age_max ?? 29,
    },
    pendingChanges: undefined,
    lastUpdated: dto.updated_at ? new Date(dto.updated_at) : new Date(),
  };
}

export function mapRecommendationSettingsPatch(settings: RecommendationSettings) {
  return {
    exclude_same_department: settings.excludeSameDepartment,
    reduce_same_year: settings.reduceSameYear,
    preferred_age_min: settings.preferredAgeRange.min,
    preferred_age_max: settings.preferredAgeRange.max,
    filter_smoking: settings.excludeSmokers,
    filter_drinking: settings.excludeFrequentDrinkers,
  };
}

function createMinimalUser(id: string, nickname: string, imageUrl?: string | null): User {
  // Display-only mapper; do not use fallback values from this result to build save payloads.
  return {
    id,
    nickname,
    age: 0,
    university: '인제대학교',
    department: '',
    studentYear: 1,
    gender: 'male',
    profileImages: imageUrl ? [imageUrl] : [PLACEHOLDER_PROFILE_IMAGE],
    personality: [],
    interests: [],
    desiredVibe: [],
    dealBreakers: [],
    lastActive: new Date(),
    createdAt: new Date(),
  };
}

function normalizeMessageType(type: string): Message['type'] {
  if (type === 'image' || type === 'system') return type;
  return 'text';
}

function mapFeedKeywordToCategory(keyword?: { feedKeywordId?: number; code?: string }): FeedCategory {
  if (keyword?.code) {
    const codeMap: Record<string, FeedCategory> = {
      walk: 'walk',
      cafe: 'cafe',
      restaurant: 'food',
      study: 'study',
      movie: 'movie',
      drive: 'drive',
      exercise: 'exercise',
      exhibition: 'exhibition',
      drink: 'drink',
      reading: 'book',
      chat: 'talk',
      hobby: 'hobby',
      festival: 'festival',
    };
    return codeMap[keyword.code] ?? 'hobby';
  }

  const map: Record<number, FeedCategory> = {
    1: 'walk',
    2: 'cafe',
    3: 'food',
    4: 'study',
    5: 'movie',
    6: 'drive',
    7: 'exercise',
    8: 'exhibition',
    9: 'drink',
    10: 'book',
    11: 'talk',
    12: 'hobby',
  };
  return map[keyword?.feedKeywordId ?? 0] ?? 'hobby';
}

function getFeedImages(dto: FeedListItemDto & { images?: Array<{ imageUrl?: string | null }> }): string[] {
  const images = (dto.images ?? [])
    .map((image) => image.imageUrl)
    .filter((imageUrl): imageUrl is string => Boolean(imageUrl));

  if (images.length > 0) return images;
  return dto.primaryImage ? [dto.primaryImage] : [];
}
