export * from './user';
export * from './interest';
export * from './chat';
export * from './story';
export * from './keywords';
export * from './feed';
export * from './comment';
export * from './safety';

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export type MainTab = 'match' | 'chat' | 'self-date' | 'my';
