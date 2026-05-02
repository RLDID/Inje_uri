import { DAILY_RECOMMENDATION_COUNT } from '@/lib/constants';

interface RecommendationCounterProps {
  viewedCount: number;
  isSelectionMade: boolean;
  compact?: boolean;
}

export function RecommendationCounter({
  viewedCount,
  compact = false,
}: RecommendationCounterProps) {
  const dots = (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: DAILY_RECOMMENDATION_COUNT }).map((_, index) => (
        <span
          key={index}
          className={`h-2 w-2 rounded-full transition-colors ${
            index < viewedCount ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
          }`}
        />
      ))}
    </div>
  );

  if (compact) {
    return dots;
  }

  return (
    <div className="section-card-muted p-4">
      <div className="mobile-split-row">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">Today</p>
          <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">
            오늘의 추천 {DAILY_RECOMMENDATION_COUNT}명
          </p>
        </div>
        {dots}
      </div>
    </div>
  );
}
