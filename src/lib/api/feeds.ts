import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api/client';
import { mapFeedDetailToStory, mapFeedListItemToStory } from '@/lib/api/mappers';
import { getMe } from '@/lib/api/profile';
import { PLACEHOLDER_PROFILE_IMAGE } from '@/lib/constants';
import type { FeedCategory, FeedDetailDto, FeedListDto, FeedReaction, Story } from '@/lib/types';

export async function getFeeds(keyword?: string | null, cursor?: string | null): Promise<{ items: Story[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  if (keyword) params.set('keyword', keyword);
  if (cursor) params.set('cursor', cursor);
  const query = params.toString();
  const data = await apiGet<FeedListDto>(`/api/feeds${query ? `?${query}` : ''}`);
  return {
    items: data.items.map(mapFeedListItemToStory),
    nextCursor: data.nextCursor,
  };
}

export async function getFeed(feedId: string | number): Promise<Story> {
  return mapFeedDetailToStory(await apiGet<FeedDetailDto>(`/api/feeds/${feedId}`));
}

export async function createFeed(input: { text: string; feedKeywordIds: number[]; images?: File[] }) {
  return apiPost('/api/feeds', buildFeedFormData(input));
}

export async function updateFeed(input: {
  feedId: string | number;
  text?: string;
  feedKeywordIds?: number[];
  images?: File[];
  deleteImageIds?: Array<string | number>;
}) {
  return apiPatch(`/api/feeds/${input.feedId}`, buildFeedFormData(input));
}

export async function deleteFeed(feedId: string | number) {
  return apiDelete(`/api/feeds/${feedId}`);
}

export async function recordFeedView(feedId: string | number) {
  return apiPost(`/api/feeds/${feedId}/view`);
}

export async function getMyFeeds(): Promise<Story[]> {
  const [data, me] = await Promise.all([
    apiGet<{ feed: null | {
      feedId: number;
      text: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      expiresAt: string;
      keywords: Array<{ feedKeywordId: number; name: string }>;
      images?: Array<{ imageId: number; imageUrl: string; sortOrder: number }>;
      commentCount: number;
    } }>('/api/feeds/mine'),
    getMe(),
  ]);

  if (!data.feed) return [];

  return [{
    id: String(data.feed.feedId),
    author: me,
    content: {
      text: data.feed.text,
      images: (data.feed.images ?? []).map((image) => image.imageUrl).filter(Boolean),
    },
    category: feedKeywordIdToCategory(data.feed.keywords[0]?.feedKeywordId),
    categories: data.feed.keywords.map((keyword) => feedKeywordIdToCategory(keyword.feedKeywordId)),
    viewCount: data.feed.commentCount,
    createdAt: new Date(data.feed.createdAt),
    expiresAt: new Date(data.feed.expiresAt),
    isExpired: new Date(data.feed.expiresAt).getTime() <= Date.now(),
    reactions: [],
  }];
}

export async function getMyCommentedFeeds(): Promise<Story[]> {
  const data = await apiGet<{
    items: Array<{
      comment: { commentId: number; content: string; createdAt: string };
      feed: {
        feedId: number;
        text: string;
        status: string;
        expiresAt: string;
        author: { userId: number; nickname: string; profileImage: string | null };
      };
    }>;
  }>('/api/feeds/commented-by-me');

  return data.items.map((item) => ({
    id: String(item.feed.feedId),
    author: {
      id: String(item.feed.author.userId),
      nickname: item.feed.author.nickname,
      age: 0,
      university: '인제대학교',
      department: '',
      studentYear: 1,
      gender: 'male',
      profileImages: item.feed.author.profileImage ? [item.feed.author.profileImage] : [PLACEHOLDER_PROFILE_IMAGE],
      personality: [],
      interests: [],
      desiredVibe: [],
      dealBreakers: [],
      lastActive: new Date(item.comment.createdAt),
      createdAt: new Date(item.comment.createdAt),
    },
    content: {
      text: item.feed.text,
      images: [],
    },
    category: 'hobby',
    categories: ['hobby'],
    viewCount: 0,
    createdAt: new Date(item.comment.createdAt),
    expiresAt: new Date(item.feed.expiresAt),
    isExpired: new Date(item.feed.expiresAt).getTime() <= Date.now(),
    reactions: [],
  }));
}

export async function getFeedKeywords() {
  return apiGet<{ items: Array<{ feedKeywordId: number; name: string; sortOrder: number }> }>('/api/feeds/keywords');
}

export async function getFeedComments(feedId: string | number): Promise<FeedReaction[]> {
  const data = await apiGet<{
    items: Array<{
      commentId: number;
      content: string;
      createdAt: string;
      commenter: { userId: number; nickname: string; profileImage: string | null };
    }>;
  }>(`/api/feeds/${feedId}/comments`);

  return data.items.map((item) => ({
    id: String(item.commentId),
    message: item.content,
    createdAt: new Date(item.createdAt),
    fromUser: {
      id: String(item.commenter.userId),
      nickname: item.commenter.nickname,
      age: 0,
      university: '인제대학교',
      department: '',
      studentYear: 1,
      gender: 'male',
      profileImages: item.commenter.profileImage ? [item.commenter.profileImage] : [PLACEHOLDER_PROFILE_IMAGE],
      personality: [],
      interests: [],
      desiredVibe: [],
      dealBreakers: [],
      lastActive: new Date(item.createdAt),
      createdAt: new Date(item.createdAt),
    },
  }));
}

export async function createFeedComment(feedId: string | number, content: string) {
  return apiPost(`/api/feeds/${feedId}/comments`, { content });
}

export async function selectFeedCommentChat(commentId: string | number) {
  return apiPost<{ chatRoomId: number }>(`/api/feeds/comments/${commentId}/select-chat`);
}

export function feedCategoriesToKeywordIds(categories: FeedCategory[]): number[] {
  const map: Record<FeedCategory, number> = {
    walk: 1,
    cafe: 2,
    food: 3,
    study: 4,
    movie: 5,
    drive: 6,
    exercise: 7,
    exhibition: 8,
    drink: 9,
    book: 10,
    talk: 11,
    hobby: 12,
  };
  return Array.from(new Set(categories.map((category) => map[category]).filter(Boolean)));
}

function buildFeedFormData(input: {
  text?: string;
  feedKeywordIds?: number[];
  images?: File[];
  deleteImageIds?: Array<string | number>;
}) {
  const formData = new FormData();
  if (input.text !== undefined) formData.append('text', input.text);
  if (input.feedKeywordIds !== undefined) formData.append('feedKeywordIds', JSON.stringify(input.feedKeywordIds));
  if (input.deleteImageIds !== undefined) formData.append('deleteImageIds', JSON.stringify(input.deleteImageIds));
  for (const image of input.images ?? []) {
    formData.append('images', image);
  }
  return formData;
}

function feedKeywordIdToCategory(feedKeywordId?: number): FeedCategory {
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
  return map[feedKeywordId ?? 0] ?? 'hobby';
}
