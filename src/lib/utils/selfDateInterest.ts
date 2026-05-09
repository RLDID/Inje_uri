import { readRouteViewState, writeRouteViewState } from '@/lib/navigation';

const SELF_DATE_INTEREST_STATE_KEY = 'self-date:interest-state';

interface SelfDateInterestState {
  likedFeedIds: string[];
  reportedFeedIds?: string[];
  hiddenUserIds?: string[];
}

export function readSelfDateLikedFeedIds(): string[] {
  const savedState = readRouteViewState<SelfDateInterestState>(SELF_DATE_INTEREST_STATE_KEY, {
    likedFeedIds: [],
  });

  return Array.from(new Set(savedState.likedFeedIds));
}

export function writeSelfDateLikedFeedIds(likedFeedIds: string[]): void {
  const savedState = readRouteViewState<SelfDateInterestState>(SELF_DATE_INTEREST_STATE_KEY, {
    likedFeedIds: [],
    reportedFeedIds: [],
  });

  writeRouteViewState<SelfDateInterestState>(SELF_DATE_INTEREST_STATE_KEY, {
    likedFeedIds: Array.from(new Set(likedFeedIds)),
    reportedFeedIds: Array.from(new Set(savedState.reportedFeedIds ?? [])),
    hiddenUserIds: Array.from(new Set(savedState.hiddenUserIds ?? [])),
  });
}

export function readSelfDateReportedFeedIds(): string[] {
  const savedState = readRouteViewState<SelfDateInterestState>(SELF_DATE_INTEREST_STATE_KEY, {
    likedFeedIds: [],
    reportedFeedIds: [],
  });

  return Array.from(new Set(savedState.reportedFeedIds ?? []));
}

export function writeSelfDateReportedFeedIds(reportedFeedIds: string[]): void {
  const savedState = readRouteViewState<SelfDateInterestState>(SELF_DATE_INTEREST_STATE_KEY, {
    likedFeedIds: [],
    reportedFeedIds: [],
  });

  writeRouteViewState<SelfDateInterestState>(SELF_DATE_INTEREST_STATE_KEY, {
    likedFeedIds: Array.from(new Set(savedState.likedFeedIds)),
    reportedFeedIds: Array.from(new Set(reportedFeedIds)),
    hiddenUserIds: Array.from(new Set(savedState.hiddenUserIds ?? [])),
  });
}

export function readSelfDateHiddenUserIds(): string[] {
  const savedState = readRouteViewState<SelfDateInterestState>(SELF_DATE_INTEREST_STATE_KEY, {
    likedFeedIds: [],
    reportedFeedIds: [],
    hiddenUserIds: [],
  });

  return Array.from(new Set(savedState.hiddenUserIds ?? []));
}

export function writeSelfDateHiddenUserIds(hiddenUserIds: string[]): void {
  const savedState = readRouteViewState<SelfDateInterestState>(SELF_DATE_INTEREST_STATE_KEY, {
    likedFeedIds: [],
    reportedFeedIds: [],
    hiddenUserIds: [],
  });

  writeRouteViewState<SelfDateInterestState>(SELF_DATE_INTEREST_STATE_KEY, {
    likedFeedIds: Array.from(new Set(savedState.likedFeedIds)),
    reportedFeedIds: Array.from(new Set(savedState.reportedFeedIds ?? [])),
    hiddenUserIds: Array.from(new Set(hiddenUserIds)),
  });
}
