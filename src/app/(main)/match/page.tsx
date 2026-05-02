'use client';

import { Suspense, startTransition, useEffect, useState } from 'react';
import { PageContainer, PageContent, PageHeader } from '@/components/layout';
import { InterestBanner } from '@/components/match/InterestBanner';
import { ProfileCardCarousel } from '@/components/match/ProfileCardCarousel';
import { RecommendationNotice } from '@/components/match/RecommendationNotice';
import { useToast } from '@/components/ui';
import { APP_NAME } from '@/lib/constants';
import { mockDailyRecommendation, mockInterests } from '@/lib/data';
import { readRouteViewState, writeRouteViewState } from '@/lib/navigation';
import { getDailyRecommendationRefreshLabel } from '@/lib/utils';

const MATCH_VIEW_STATE_KEY = 'match:daily-recommendation';

interface MatchViewState {
  currentIndex: number;
  viewedCount: number;
  selectedUserId?: string;
  isSelectionMade: boolean;
}

function MatchPageContent() {
  const { showToast } = useToast();
  const [recommendation, setRecommendation] = useState(mockDailyRecommendation);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasRestoredViewState, setHasRestoredViewState] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const savedViewState = readRouteViewState<MatchViewState | null>(MATCH_VIEW_STATE_KEY, null);

    startTransition(() => {
      if (!savedViewState) {
        setHasRestoredViewState(true);
        return;
      }

      const clampedIndex = Math.max(
        0,
        Math.min(savedViewState.currentIndex, Math.max(mockDailyRecommendation.users.length - 1, 0)),
      );
      const hasSelectedUser = Boolean(
        savedViewState.selectedUserId &&
          mockDailyRecommendation.users.some((user) => user.id === savedViewState.selectedUserId),
      );

      setCurrentIndex(clampedIndex);
      setRecommendation((prevRecommendation) => ({
        ...prevRecommendation,
        viewedCount: savedViewState.viewedCount,
        selectedUserId: hasSelectedUser ? savedViewState.selectedUserId : undefined,
        isSelectionMade: hasSelectedUser ? savedViewState.isSelectionMade : false,
      }));
      setHasRestoredViewState(true);
    });
  }, []);

  useEffect(() => {
    if (!hasRestoredViewState) {
      return;
    }

    writeRouteViewState<MatchViewState>(MATCH_VIEW_STATE_KEY, {
      currentIndex,
      viewedCount: recommendation.viewedCount,
      selectedUserId: recommendation.selectedUserId,
      isSelectionMade: recommendation.isSelectionMade,
    });
  }, [
    currentIndex,
    hasRestoredViewState,
    recommendation.isSelectionMade,
    recommendation.selectedUserId,
    recommendation.viewedCount,
  ]);

  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const interval = window.setInterval(refresh, 60000);

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const selectedUser = recommendation.selectedUserId
    ? recommendation.users.find((user) => user.id === recommendation.selectedUserId)
    : undefined;
  const isSelectionLocked = recommendation.isSelectionMade && !!selectedUser;
  const visibleUsers = isSelectionLocked && selectedUser ? [selectedUser] : recommendation.users;
  const visibleCurrentIndex = isSelectionLocked
    ? 0
    : Math.min(currentIndex, Math.max(recommendation.users.length - 1, 0));

  const handleIndexChange = (newIndex: number) => {
    if (isSelectionLocked) {
      return;
    }

    setCurrentIndex(newIndex);
    setRecommendation((prevRecommendation) => ({
      ...prevRecommendation,
      viewedCount: Math.max(prevRecommendation.viewedCount, newIndex + 1),
    }));
  };

  const handleSelect = (userId: string) => {
    if (isSelectionLocked) {
      if (recommendation.selectedUserId === userId) {
        return;
      }

      showToast('오늘은 이미 호감을 보냈어요.', 'info');
      return;
    }

    const selectedIndex = recommendation.users.findIndex((user) => user.id === userId);

    if (selectedIndex < 0) {
      return;
    }

    setCurrentIndex(selectedIndex);
    setRecommendation((prevRecommendation) => ({
      ...prevRecommendation,
      viewedCount: Math.max(prevRecommendation.viewedCount, selectedIndex + 1),
      selectedUserId: userId,
      isSelectionMade: true,
    }));
    showToast('호감을 보냈어요!', 'success');
  };

  const brandAction = (
    <div className="rounded-full bg-[var(--color-primary-light)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
      {APP_NAME}
    </div>
  );

  return (
    <PageContainer>
      <PageHeader
        title="오늘 우리"
        subtitle="보고싶은 우리를 선택하세요"
        action={brandAction}
      />

      <PageContent className="px-5 pb-32">
        <div className="mb-6">
          <InterestBanner interests={mockInterests} />
        </div>

        <section>
          <div className="mb-5">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">
                  Daily Pick
                </p>
                <h2 className="mt-1 break-keep text-[22px] font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
                  오늘의 추천
                </h2>
              </div>

              <div className="shrink-0 pb-0.5">
                <RecommendationNotice />
              </div>
            </div>

            <div
              className="mt-4 flex items-center gap-3 rounded-[24px] px-4 py-3.5"
              style={{
                background: 'linear-gradient(135deg, #f8fcfc 0%, #eff7f8 52%, #f9fcfc 100%)',
              }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[var(--color-primary)] shadow-[0_8px_18px_rgba(16,152,173,0.08)] ring-1 ring-[color-mix(in_srgb,var(--color-primary)_8%,white)]">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold tracking-[0.04em] text-[var(--color-text-tertiary)]">
                  남은 시간
                </p>
                <p className="mt-1 break-keep text-[14px] font-medium leading-5 text-[var(--color-text-secondary)]">
                  추천이 바뀌기 전까지예요
                </p>
              </div>

              <div className="shrink-0 rounded-full bg-white px-3.5 py-2 text-[15px] font-semibold leading-none text-[var(--color-primary)] shadow-[0_10px_20px_rgba(16,152,173,0.08)] ring-1 ring-white/80 tabular-nums">
                {getDailyRecommendationRefreshLabel(now)}
              </div>
            </div>
          </div>

          {visibleUsers.length > 0 && (
            <ProfileCardCarousel
              users={visibleUsers}
              currentIndex={visibleCurrentIndex}
              onIndexChange={handleIndexChange}
              selectedUserId={isSelectionLocked ? selectedUser?.id : undefined}
              isSelectionMade={isSelectionLocked}
              onSelect={handleSelect}
            />
          )}
        </section>
      </PageContent>
    </PageContainer>
  );
}

export default function MatchPage() {
  return (
    <Suspense fallback={<PageContainer><div /></PageContainer>}>
      <MatchPageContent />
    </Suspense>
  );
}
