import type { User } from './user';

export interface FeedReaction {
  id: string;
  fromUser: User;
  message?: string;
  createdAt: Date;
}

export type FeedCategory =
  | 'walk'
  | 'cafe'
  | 'food'
  | 'study'
  | 'movie'
  | 'drive'
  | 'exercise'
  | 'exhibition'
  | 'drink'
  | 'book'
  | 'talk'
  | 'hobby'
  | 'festival';

export interface Story {
  id: string;
  author: User;
  content: StoryContent;
  category?: FeedCategory;
  categories?: FeedCategory[];
  viewCount: number;
  createdAt: Date;
  expiresAt: Date;
  isExpired: boolean;
  isLikedByMe?: boolean;
  isMine?: boolean;
  reactions?: FeedReaction[];
}

export interface StoryContent {
  text?: string;
  images: string[];
  imageMetas?: Array<{
    id: string;
    imageUrl: string;
    order: number;
  }>;
  question?: string;
}

export interface StoryView {
  storyId: string;
  viewerId: string;
  viewedAt: Date;
}

export interface StoryTimeRemaining {
  hours: number;
  minutes: number;
  isExpiringSoon: boolean;
  isExpired: boolean;
}
