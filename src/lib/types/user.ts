// User Types
export interface User {
  id: string;
  nickname: string;
  age: number;
  university: string;
  department: string;
  studentYear: number;
  studentNumber?: number;
  gender: 'male' | 'female';
  profileImages: string[];
  bio?: string;

  // Profile Keywords
  lifestyle?: LifestyleType;
  drinking?: DrinkingType;
  smoking?: SmokingType;
  mbti?: MBTIType;
  personality: string[];
  conversationStyle?: ConversationType;
  interests: string[];

  // Partner Preferences
  desiredVibe: string[];
  dateStyle?: DateStyleType;
  dealBreakers: string[];

  // Metadata
  isVerified?: boolean;
  isGraduate?: boolean;
  lastActive: Date;
  createdAt: Date;
}

export interface UserProfile extends User {
  height?: number;
  hometown?: string;
}

export type LifestyleType = 'active' | 'homebody' | 'balanced';
export type DrinkingType = 'often' | 'sometimes' | 'never';
export type SmokingType = 'yes' | 'no';
export type MBTIType =
  | 'INTJ' | 'INTP' | 'ENTJ' | 'ENTP'
  | 'INFJ' | 'INFP' | 'ENFJ' | 'ENFP'
  | 'ISTJ' | 'ISFJ' | 'ESTJ' | 'ESFJ'
  | 'ISTP' | 'ISFP' | 'ESTP' | 'ESFP';
export type ConversationType = 'talkative' | 'listener' | 'depends';
export type DateStyleType =
  | 'restaurant'
  | 'cafe'
  | 'movie'
  | 'walk'
  | 'activity'
  | 'home'
  | 'concert'
  | 'bookstore';

export interface DailyRecommendation {
  date: string;
  users: User[];
  viewedCount: number;
  selectedUserId?: string;
  isSelectionMade: boolean;
}

export interface RecommendationSettings {
  excludeSameDepartment: boolean;
  reduceSameYear: boolean;
  preferredAgeRange: { min: number; max: number };
  pendingChanges?: Partial<RecommendationSettings>;
  lastUpdated: Date;
}
