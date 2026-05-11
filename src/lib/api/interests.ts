import { apiGet, apiPost } from '@/lib/api/client';
import { mapReceivedInterests } from '@/lib/api/mappers';
import type { Interest } from '@/lib/types';

export async function getReceivedInterests(currentUserId = ''): Promise<Interest[]> {
  return mapReceivedInterests(await apiGet('/api/interests/received'), currentUserId);
}

export async function acceptInterest(interestId: string | number) {
  return apiPost<{ interest_id: number; matched: boolean; chat_room_id: number | null }>(
    `/api/interests/${interestId}/accept`,
  );
}

export async function declineInterest(interestId: string | number) {
  return apiPost(`/api/interests/${interestId}/decline`);
}
