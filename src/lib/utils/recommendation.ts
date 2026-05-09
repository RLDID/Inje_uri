import { DAILY_RECOMMENDATION_REFRESH_HOUR } from '@/lib/constants';

const formatTimeUnit = (value: number) => String(value).padStart(2, '0');

export function getNextDailyRecommendationRefresh(nowMs = Date.now()): Date {
  const now = new Date(nowMs);
  const nextRefresh = new Date(now);

  nextRefresh.setHours(DAILY_RECOMMENDATION_REFRESH_HOUR, 0, 0, 0);

  if (now >= nextRefresh) {
    nextRefresh.setDate(nextRefresh.getDate() + 1);
  }

  return nextRefresh;
}

export function getDailyRecommendationRefreshLabel(nowMs = Date.now()): string {
  const nextRefresh = getNextDailyRecommendationRefresh(nowMs);
  const diffMs = Math.max(nextRefresh.getTime() - nowMs, 0);
  const totalSeconds = Math.ceil(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${formatTimeUnit(hours)}:${formatTimeUnit(minutes)}:${formatTimeUnit(seconds)}`;
}
