import { readRouteViewState, writeRouteViewState } from '@/lib/navigation';

const SELF_DATE_INTEREST_STATE_KEY = 'self-date:interest-state';

interface SelfDateInterestState {
  likedFeedIds: string[];
}

export function readSelfDateLikedFeedIds(): string[] {
  const savedState = readRouteViewState<SelfDateInterestState>(SELF_DATE_INTEREST_STATE_KEY, {
    likedFeedIds: [],
  });

  return Array.from(new Set(savedState.likedFeedIds));
}

export function writeSelfDateLikedFeedIds(likedFeedIds: string[]): void {
  writeRouteViewState<SelfDateInterestState>(SELF_DATE_INTEREST_STATE_KEY, {
    likedFeedIds: Array.from(new Set(likedFeedIds)),
  });
}
