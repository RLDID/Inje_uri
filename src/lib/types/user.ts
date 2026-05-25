// User Types
export interface User {
  id: string;
  nickname: string;
  age: number;
  university: string;
  department: string;
  studentYear: number;
  studentNumber?: number | string;
  gender: 'male' | 'female';
  hideGender?: boolean;
  isOperator?: boolean;
  profileImages: string[];
  profileImageMetas?: Array<{
    id: string;
    imageUrl: string;
    sortOrder: number;
    isPrimary?: boolean;
  }>;
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
  keywords?: UserProfileKeyword[];

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
  excludeSmokers: boolean;
  excludeFrequentDrinkers: boolean;
  preferredAgeRange: { min: number; max: number };
  pendingChanges?: Partial<RecommendationSettings>;
  lastUpdated: Date;
}

export interface UserProfileKeyword {
  category: string;
  code: string;
  label: string;
}
