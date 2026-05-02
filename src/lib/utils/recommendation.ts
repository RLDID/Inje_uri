import { DAILY_RECOMMENDATION_REFRESH_HOUR } from '@/lib/constants';

const HOUR_LABEL = '\uC2DC\uAC04';
const MINUTE_LABEL = '\uBD84';

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
  const totalMinutes = Math.ceil(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${Math.max(minutes, 1)}${MINUTE_LABEL}`;
  }

  return `${hours}${HOUR_LABEL} ${minutes}${MINUTE_LABEL}`;
}
