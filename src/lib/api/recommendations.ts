import { apiGet, apiPost } from '@/lib/api/client';
import { mapTodayRecommendation } from '@/lib/api/mappers';
import type { DailyRecommendation } from '@/lib/types';

export async function getTodayRecommendation(): Promise<DailyRecommendation> {
  return mapTodayRecommendation(await apiGet('/api/recommendations/today'));
}

export async function selectRecommendation(itemId: number) {
  return apiPost<{ interest_id: number; matched: boolean; chat_room_id: number | null }>(
    '/api/recommendations/select',
    { recommendation_item_id: itemId },
  );
}

export async function dismissRecommendation(itemId: number) {
  return apiPost(`/api/recommendations/${itemId}/dismiss`);
}
