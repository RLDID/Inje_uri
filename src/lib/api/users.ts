import { apiGet } from '@/lib/api/client';
import { mapUserProfileToUser, type ApiUserProfile } from '@/lib/api/mappers';
import type { User } from '@/lib/types';

export interface UserProfileDetail {
  user: User;
  relationship: {
    hasActiveChat: boolean;
    chatRoomId: number | null;
    isBlockedByMe: boolean;
    isBlockedMe: boolean;
  };
}

export async function getUserProfile(userId: string | number): Promise<UserProfileDetail> {
  const data = await apiGet<ApiUserProfile & { relationship?: UserProfileDetail['relationship'] }>(`/api/users/${userId}`);
  return {
    user: mapUserProfileToUser(data),
    relationship: data.relationship ?? {
      hasActiveChat: false,
      chatRoomId: null,
      isBlockedByMe: false,
      isBlockedMe: false,
    },
  };
}
