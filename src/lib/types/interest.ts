import type { User } from './user';

export interface Interest {
  id: string;
  fromUser: User;
  toUserId: string;
  toUser?: User;
  message?: string;
  createdAt: Date;
  isRead: boolean;
  status: InterestStatus;
}

export type InterestStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface InterestListItem {
  interest: Interest;
  canStartChat: boolean;
}
