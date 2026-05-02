import type { RecommendationSettings } from '@/lib/types';

export const RECOMMENDATION_SETTINGS_STORAGE_KEY = 'injeuri:recommendation-settings';

export function normalizeRecommendationSettings(
  rawSettings: Partial<RecommendationSettings> | null | undefined,
  fallback: RecommendationSettings,
): RecommendationSettings {
  const nextMin = Number(rawSettings?.preferredAgeRange?.min ?? fallback.preferredAgeRange.min);
  const nextMaxCandidate = Number(rawSettings?.preferredAgeRange?.max ?? fallback.preferredAgeRange.max);
  const nextMax = Math.max(nextMin, nextMaxCandidate);

  return {
    excludeSameDepartment: rawSettings?.excludeSameDepartment ?? fallback.excludeSameDepartment,
    reduceSameYear: rawSettings?.reduceSameYear ?? fallback.reduceSameYear,
    preferredAgeRange: {
      min: nextMin,
      max: nextMax,
    },
    pendingChanges: undefined,
    lastUpdated: rawSettings?.lastUpdated ? new Date(rawSettings.lastUpdated) : fallback.lastUpdated,
  };
}

export function readRecommendationSettings(fallback: RecommendationSettings): RecommendationSettings {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(RECOMMENDATION_SETTINGS_STORAGE_KEY);
    if (!rawValue) {
      return fallback;
    }

    return normalizeRecommendationSettings(JSON.parse(rawValue), fallback);
  } catch {
    return fallback;
  }
}

export function persistRecommendationSettings(settings: RecommendationSettings): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      RECOMMENDATION_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...settings,
        lastUpdated: settings.lastUpdated.toISOString(),
      }),
    );
  } catch {
    // Ignore storage failures and keep the in-memory draft.
  }
}
