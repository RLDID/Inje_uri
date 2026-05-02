import type { Interest } from '@/lib/types';
import { currentUser, mockUsers } from './users';

export const mockInterests: Interest[] = [
  {
    id: 'interest-1',
    fromUser: mockUsers[0],
    toUserId: currentUser.id,
    message: '프로필 분위기가 좋아 보여서 먼저 호감 남겨봤어요.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
    isRead: false,
    status: 'pending',
  },
  {
    id: 'interest-2',
    fromUser: mockUsers[1],
    toUserId: currentUser.id,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    isRead: true,
    status: 'pending',
  },
];

export const mockSentInterests: Interest[] = [
  {
    id: 'sent-interest-1',
    fromUser: currentUser,
    toUserId: mockUsers[2].id,
    toUser: mockUsers[2],
    message: '카페 좋아하신다고 해서 가볍게 반응 남겼어요.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    isRead: false,
    status: 'pending',
  },
  {
    id: 'sent-interest-2',
    fromUser: currentUser,
    toUserId: mockUsers[3].id,
    toUser: mockUsers[3],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    isRead: true,
    status: 'accepted',
  },
];

export function getUnreadInterestCount(): number {
  return mockInterests.filter((interest) => !interest.isRead && interest.status === 'pending').length;
}

export function getPendingInterests(): Interest[] {
  return mockInterests.filter((interest) => interest.status === 'pending');
}

export function getSentInterests(): Interest[] {
  return mockSentInterests;
}

export function getPendingSentInterests(): Interest[] {
  return mockSentInterests.filter((interest) => interest.status === 'pending');
}
