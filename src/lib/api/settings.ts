import { apiGet, apiPatch, apiPost } from '@/lib/api/client';
import { mapRecommendationSettings, mapRecommendationSettingsPatch } from '@/lib/api/mappers';
import type { RecommendationSettings } from '@/lib/types';

export async function getRecommendationSettings(): Promise<RecommendationSettings> {
  return mapRecommendationSettings(await apiGet('/api/recommendation-settings'));
}

export async function updateRecommendationSettings(settings: RecommendationSettings): Promise<RecommendationSettings> {
  return mapRecommendationSettings(
    await apiPatch('/api/recommendation-settings', mapRecommendationSettingsPatch(settings)),
  );
}

export async function logout() {
  return apiPost('/api/auth/logout');
}
