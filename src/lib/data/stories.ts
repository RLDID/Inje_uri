import type { Story, StoryTimeRemaining } from '@/lib/types';
import { currentUser, mockUsers } from './users';

export function getStoryTimeRemaining(story: Story): StoryTimeRemaining {
  const now = new Date();
  const expiresAt = new Date(story.expiresAt);
  const diff = expiresAt.getTime() - now.getTime();

  if (diff <= 0) {
    return { hours: 0, minutes: 0, isExpiringSoon: false, isExpired: true };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return {
    hours,
    minutes,
    isExpiringSoon: hours < 1,
    isExpired: false,
  };
}

export const mockStories: Story[] = [
  {
    id: 'story-1',
    author: mockUsers[0],
    content: {
      text: '오늘 날씨 좋아서 잠깐 산책할 사람 찾고 있어요.',
      images: ['https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=400'],
    },
    category: 'walk',
    categories: ['walk', 'cafe', 'food'],
    viewCount: 24,
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
    expiresAt: new Date(Date.now() + 1000 * 60 * 90),
    isExpired: false,
  },
  {
    id: 'story-2',
    author: mockUsers[2],
    content: {
      text: '수업 끝나고 아이스라떼 마시고 있어요. 잠깐 카페 갈 분 있을까요?',
      images: ['https://images.unsplash.com/photo-1544928147-79a2dbc1f389?w=400'],
    },
    category: 'cafe',
    categories: ['cafe', 'talk', 'book', 'food'],
    viewCount: 18,
    createdAt: new Date(Date.now() - 1000 * 60 * 60),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    isExpired: false,
  },
  {
    id: 'story-3',
    author: mockUsers[1],
    content: {
      text: '학교 앞에서 가볍게 밥 먹을 사람 구해요.',
      images: ['https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400'],
    },
    category: 'food',
    categories: ['food', 'cafe', 'walk'],
    viewCount: 31,
    createdAt: new Date(Date.now() - 1000 * 60 * 100),
    expiresAt: new Date(Date.now() + 1000 * 60 * 20),
    isExpired: false,
  },
  {
    id: 'story-4',
    author: mockUsers[5],
    content: {
      text: '도서관에서 과제 끝내고 있는데 같이 공부할 사람 있으면 반가워요.',
      images: [],
    },
    category: 'study',
    categories: ['study', 'cafe', 'book', 'talk'],
    viewCount: 12,
    createdAt: new Date(Date.now() - 1000 * 60 * 15),
    expiresAt: new Date(Date.now() + 1000 * 60 * 105),
    isExpired: false,
  },
  {
    id: 'story-5',
    author: mockUsers[3],
    content: {
      text: '오늘 저녁에 가볍게 영화 한 편 보고 들어갈 사람 있을까요?',
      images: ['https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400'],
    },
    category: 'movie',
    categories: ['movie', 'cafe', 'food'],
    viewCount: 17,
    createdAt: new Date(Date.now() - 1000 * 60 * 25),
    expiresAt: new Date(Date.now() + 1000 * 60 * 80),
    isExpired: false,
  },
  {
    id: 'story-6',
    author: mockUsers[4],
    content: {
      text: '밤공기 좋을 때 드라이브 잠깐 다녀올 사람 구해요.',
      images: ['https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400'],
    },
    category: 'drive',
    categories: ['drive', 'talk', 'cafe'],
    viewCount: 21,
    createdAt: new Date(Date.now() - 1000 * 60 * 40),
    expiresAt: new Date(Date.now() + 1000 * 60 * 65),
    isExpired: false,
  },
  {
    id: 'story-7',
    author: mockUsers[1],
    content: {
      text: '헬스장 가기 전에 가볍게 러닝이나 스트레칭 같이 하실 분!',
      images: ['https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400'],
    },
    category: 'exercise',
    categories: ['exercise', 'food', 'talk'],
    viewCount: 14,
    createdAt: new Date(Date.now() - 1000 * 60 * 20),
    expiresAt: new Date(Date.now() + 1000 * 60 * 95),
    isExpired: false,
  },
  {
    id: 'story-8',
    author: mockUsers[2],
    content: {
      text: '근처 전시 같이 보고 사진도 남길 사람 있으면 좋겠어요.',
      images: ['https://images.unsplash.com/photo-1500534623283-312aade485b7?w=400'],
    },
    category: 'exhibition',
    categories: ['exhibition', 'cafe', 'walk'],
    viewCount: 19,
    createdAt: new Date(Date.now() - 1000 * 60 * 35),
    expiresAt: new Date(Date.now() + 1000 * 60 * 70),
    isExpired: false,
  },
];

export const mockMyStories: Story[] = [
  {
    id: 'my-story-1',
    author: currentUser,
    content: {
      text: '주말에 카페 탐방 같이 하실 분 구해요.',
      images: ['https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400'],
    },
    category: 'cafe',
    categories: ['cafe', 'talk', 'food', 'walk'],
    viewCount: 15,
    createdAt: new Date(Date.now() - 1000 * 60 * 45),
    expiresAt: new Date(Date.now() + 1000 * 60 * 75),
    isExpired: false,
    reactions: [
      {
        id: 'reaction-1',
        fromUser: mockUsers[0],
        message: '안녕하세요! 저도 카페 좋아해요 ☕',
        createdAt: new Date(Date.now() - 1000 * 60 * 30),
      },
      {
        id: 'reaction-2',
        fromUser: mockUsers[1],
        message: '근처에 괜찮은 카페 알고 있어요.',
        createdAt: new Date(Date.now() - 1000 * 60 * 20),
      },
      {
        id: 'reaction-3',
        fromUser: mockUsers[2],
        message: undefined,
        createdAt: new Date(Date.now() - 1000 * 60 * 10),
      },
    ],
  },
];

export function getActiveStories(): Story[] {
  const now = new Date();
  return mockStories.filter((story) => new Date(story.expiresAt) > now);
}

export function getStoryById(id: string): Story | undefined {
  return mockStories.find((story) => story.id === id) || mockMyStories.find((story) => story.id === id);
}

export function getMyStories(): Story[] {
  const now = new Date();
  return mockMyStories.filter((story) => new Date(story.expiresAt) > now);
}

export function getMyStoryById(id: string): Story | undefined {
  return mockMyStories.find((story) => story.id === id);
}
