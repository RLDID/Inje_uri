'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PageContainer, PageContent, PageHeader } from '@/components/layout';
import { FeedCard } from '@/components/self-date/FeedCard';
import { NoStories, BottomSheet, useToast } from '@/components/ui';
import { getActiveStories } from '@/lib/data';
import {
  buildProfileDetailHref,
  buildSelfDateDetailHref,
  buildSelfDateMyPostsHref,
  readRouteViewState,
  useCurrentRouteContext,
  writeRouteViewState,
} from '@/lib/navigation';
import { shuffleFeeds, getMoreFeeds, isValidFeed, matchesStoryFilter } from '@/lib/utils/feed';
import { FEED_FILTER_CATEGORIES, type FeedFilterCategoryId } from '@/lib/constants';
import { getUserAcademicLabel, readSelfDateLikedFeedIds, writeSelfDateLikedFeedIds } from '@/lib/utils';
import type { Story } from '@/lib/types';

const INITIAL_FEED_COUNT = 8;
const LOAD_MORE_COUNT = 4;
const SELF_DATE_VIEW_STATE_KEY = 'self-date:list';

interface SelfDateViewState {
  selectedFilter: FeedFilterCategoryId;
  shownIds: string[];
  hasReachedEnd: boolean;
  scrollY: number;
}

function submitFeedInterest() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 250);
  });
}

function isValidFilter(filter: string | null): filter is FeedFilterCategoryId {
  return !!filter && FEED_FILTER_CATEGORIES.some((category) => category.id === filter);
}

function getSavedViewState(): SelfDateViewState {
  return readRouteViewState<SelfDateViewState>(SELF_DATE_VIEW_STATE_KEY, {
    selectedFilter: 'all',
    shownIds: [],
    hasReachedEnd: false,
    scrollY: 0,
  });
}

function SelfDatePageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const pullStartYRef = useRef<number | null>(null);
  const { currentPath, ownerSection } = useCurrentRouteContext();

  const filterParam = searchParams.get('filter');
  const initialFilterParamRef = useRef(filterParam);
  const appliedFilterParamRef = useRef(filterParam);
  const [selectedFilter, setSelectedFilter] = useState<FeedFilterCategoryId>('all');
  const [isHydrated, setIsHydrated] = useState(false);
  const [feeds, setFeeds] = useState<Story[]>([]);
  const [shownIds, setShownIds] = useState<string[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const [heartTargetFeed, setHeartTargetFeed] = useState<Story | null>(null);
  const [interestMessage, setInterestMessage] = useState('');
  const [likedFeedIds, setLikedFeedIds] = useState<Set<string>>(() => new Set(readSelfDateLikedFeedIds()));
  const [pendingLikeFeedId, setPendingLikeFeedId] = useState<string | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const persistViewState = useCallback(
    (nextScrollY = typeof window !== 'undefined' ? window.scrollY : 0) => {
      writeRouteViewState<SelfDateViewState>(SELF_DATE_VIEW_STATE_KEY, {
        selectedFilter,
        shownIds,
        hasReachedEnd,
        scrollY: nextScrollY,
      });
    },
    [hasReachedEnd, selectedFilter, shownIds],
  );

  useEffect(() => {
    const likedFeedIdSet = new Set(readSelfDateLikedFeedIds());
    const stories = getActiveStories().filter((story) => isValidFeed(story) && !likedFeedIdSet.has(story.id));
    const savedViewState = getSavedViewState();
    const savedSelectedFilter = isValidFilter(savedViewState.selectedFilter)
      ? savedViewState.selectedFilter
      : 'all';
    const initialFilter = isValidFilter(initialFilterParamRef.current)
      ? initialFilterParamRef.current
      : savedSelectedFilter;
    const restoredFeeds = savedViewState.shownIds
      .map((id) => stories.find((story) => story.id === id))
      .filter((story): story is Story => !!story && isValidFeed(story));
    const initialFeeds =
      restoredFeeds.length > 0
        ? restoredFeeds
        : shuffleFeeds(stories).slice(0, INITIAL_FEED_COUNT);

    setSelectedFilter(initialFilter);
    setFeeds(initialFeeds);
    setShownIds(initialFeeds.map((story) => story.id));
    setHasReachedEnd(restoredFeeds.length > 0 ? savedViewState.hasReachedEnd : false);
    appliedFilterParamRef.current = initialFilterParamRef.current;
    setIsHydrated(true);

    if (savedViewState.scrollY > 0) {
      window.setTimeout(() => {
        window.scrollTo({ top: savedViewState.scrollY, behavior: 'auto' });
      }, 0);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated || appliedFilterParamRef.current === filterParam) {
      return;
    }

    appliedFilterParamRef.current = filterParam;
    setSelectedFilter(isValidFilter(filterParam) ? filterParam : 'all');
  }, [filterParam, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    persistViewState();
  }, [feeds, hasReachedEnd, isHydrated, persistViewState, selectedFilter, shownIds]);

  useEffect(() => {
    writeSelfDateLikedFeedIds(Array.from(likedFeedIds));
  }, [likedFeedIds]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const handleScroll = () => persistViewState(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isHydrated, persistViewState]);

  const updateFilter = (nextFilter: FeedFilterCategoryId) => {
    if (nextFilter === selectedFilter) {
      return;
    }

    setSelectedFilter(nextFilter);

    const params = new URLSearchParams(searchParams.toString());
    if (nextFilter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', nextFilter);
    }

    const nextSearch = params.toString();
    const nextPath = nextSearch ? `${pathname}?${nextSearch}` : pathname;
    router.replace(nextPath, { scroll: false });
  };

  const handleRefresh = useCallback(() => {
    const stories = getActiveStories().filter((story) => isValidFeed(story) && !likedFeedIds.has(story.id));
    const shuffled = shuffleFeeds(stories).slice(0, INITIAL_FEED_COUNT);
    setFeeds(shuffled);
    setShownIds(shuffled.map((feed) => feed.id));
    setHasReachedEnd(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [likedFeedIds]);

  const triggerPullRefresh = useCallback(() => {
    setIsPullRefreshing(true);
    setPullDistance(64);
    handleRefresh();
    window.setTimeout(() => {
      setIsPullRefreshing(false);
      setPullDistance(0);
    }, 500);
  }, [handleRefresh]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const target = loadMoreRef.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !isLoadingMore && !hasReachedEnd) {
          setIsLoadingMore(true);

          setTimeout(() => {
            const allStories = getActiveStories().filter((story) => isValidFeed(story) && !likedFeedIds.has(story.id));
            const moreFeeds = getMoreFeeds(allStories, shownIds, LOAD_MORE_COUNT);

            if (moreFeeds.length > 0) {
              setFeeds((prevFeeds) => [...prevFeeds, ...moreFeeds]);
              setShownIds((prevIds) => [...prevIds, ...moreFeeds.map((feed) => feed.id)]);
            } else {
              setHasReachedEnd(true);
            }

            setIsLoadingMore(false);
          }, 400);
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasReachedEnd, isHydrated, isLoadingMore, likedFeedIds, shownIds]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFeeds((prevFeeds) => prevFeeds.filter(isValidFeed));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleCardClick = (story: Story) => {
    router.push(
      buildSelfDateDetailHref(story.id, {
        sourcePath: currentPath,
        sourceSection: ownerSection,
        fallbackPath: currentPath,
      }),
    );
  };

  const handleHeartClick = (story: Story) => {
    if (likedFeedIds.has(story.id)) {
      showToast('이미 호감을 보낸 피드예요.', 'info');
      return;
    }

    if (pendingLikeFeedId === story.id) {
      return;
    }

    setHeartTargetFeed(story);
    setInterestMessage('');
  };

  const handleSendInterest = async () => {
    if (!heartTargetFeed) {
      return;
    }

    const targetFeed = heartTargetFeed;
    const targetFeedId = targetFeed.id;

    if (likedFeedIds.has(targetFeedId) || pendingLikeFeedId === targetFeedId) {
      return;
    }

    const message = interestMessage.trim();
    setPendingLikeFeedId(targetFeedId);
    setLikedFeedIds((prevLikedFeedIds) => new Set(prevLikedFeedIds).add(targetFeedId));
    setHeartTargetFeed(null);
    setInterestMessage('');

    try {
      await submitFeedInterest();
      showToast(message ? '호감과 인사를 보냈어요!' : '호감을 보냈어요!', 'success');
    } catch {
      setLikedFeedIds((prevLikedFeedIds) => {
        const nextLikedFeedIds = new Set(prevLikedFeedIds);
        nextLikedFeedIds.delete(targetFeedId);
        return nextLikedFeedIds;
      });
      setHeartTargetFeed(targetFeed);
      setInterestMessage(message);
      showToast('호감을 보내지 못했어요. 잠시 후 다시 시도해주세요.', 'error');
    } finally {
      setPendingLikeFeedId(null);
    }
  };

  const handleProfileClick = (story: Story) => {
    router.push(
      buildProfileDetailHref(story.author.id, 'self-date', {
        sourcePath: currentPath,
        sourceSection: ownerSection,
        fallbackPath: currentPath,
      }),
    );
  };

  const filteredFeeds = feeds.filter((feed) => !likedFeedIds.has(feed.id) && matchesStoryFilter(feed, selectedFilter));

  const myPostsHref = buildSelfDateMyPostsHref({
    sourcePath: currentPath,
    sourceSection: ownerSection,
    fallbackPath: currentPath,
  });

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    if (typeof window === 'undefined' || window.scrollY > 0 || isPullRefreshing) {
      return;
    }

    pullStartYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLElement>) => {
    if (typeof window === 'undefined' || pullStartYRef.current === null || window.scrollY > 0 || isPullRefreshing) {
      return;
    }

    const currentY = event.touches[0]?.clientY ?? 0;
    const delta = currentY - pullStartYRef.current;

    if (delta <= 0) {
      setPullDistance(0);
      return;
    }

    event.preventDefault();
    setPullDistance(Math.min(delta * 0.45, 72));
  };

  const handleTouchEnd = () => {
    if (pullStartYRef.current === null) {
      return;
    }

    pullStartYRef.current = null;

    if (pullDistance >= 56) {
      triggerPullRefresh();
      return;
    }

    setPullDistance(0);
  };

  return (
    <PageContainer>
      <PageHeader
        title="지금 우리"
        subtitle="2시간 동안만 열리는 가벼운 피드를 둘러보세요."
        action={(
          <Link
            href={myPostsHref}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)]"
            aria-label="내 피드 보기"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 9h6M9 13h6M9 17h4" />
            </svg>
          </Link>
        )}
      />

      <div className="sticky top-[72px] z-30 border-b border-[var(--color-border-light)] bg-[var(--color-surface)]">
        <div className="flex gap-2 overflow-x-auto px-5 py-2.5 scrollbar-hide">
          {FEED_FILTER_CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => updateFilter(category.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                selectedFilter === category.id
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <PageContent className="px-5 pb-36 pt-4" noPadding>
        <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          <div
            className="overflow-hidden transition-[height,opacity,margin] duration-200 ease-out"
            style={{
              height: pullDistance > 0 || isPullRefreshing ? 42 : 0,
              opacity: pullDistance > 0 || isPullRefreshing ? 1 : 0,
              marginBottom: pullDistance > 0 || isPullRefreshing ? 12 : 0,
            }}
          >
            <div className="flex h-full items-center justify-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
                <svg
                  className={`h-3.5 w-3.5 ${isPullRefreshing ? 'animate-spin' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  {isPullRefreshing ? (
                    <>
                      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                      <path d="M21 3v6h-6" />
                    </>
                  ) : (
                    <>
                      <path d="M12 5v14" />
                      <path d="m7 14 5 5 5-5" />
                    </>
                  )}
                </svg>
                {isPullRefreshing ? '피드를 새로 불러오는 중...' : '끌어내려 새로고침'}
              </div>
            </div>
          </div>

          {!isHydrated ? (
          <div className="content-stack">
            {[1, 2, 3].map((index) => (
              <div key={index} className="animate-pulse rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-surface)] p-4">
                <div className="flex gap-3">
                  <div className="h-12 w-12 rounded-full bg-[var(--color-surface-secondary)]" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 w-24 rounded bg-[var(--color-surface-secondary)]" />
                    <div className="h-3 w-32 rounded bg-[var(--color-surface-secondary)]" />
                    <div className="h-16 w-full rounded bg-[var(--color-surface-secondary)]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          ) : filteredFeeds.length === 0 ? (
          <NoStories />
          ) : (
          <div className="content-stack">
            {filteredFeeds.map((story) => (
              <FeedCard
                key={story.id}
                story={story}
                onCardClick={() => handleCardClick(story)}
                onHeartClick={() => handleHeartClick(story)}
                onProfileClick={() => handleProfileClick(story)}
                isLiked={likedFeedIds.has(story.id)}
                isLikePending={pendingLikeFeedId === story.id}
              />
            ))}

            <div ref={loadMoreRef} className="py-4">
              {isLoadingMore && (
                <div className="flex items-center justify-center gap-2 text-[var(--color-text-tertiary)]">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span className="text-sm">더 불러오는 중...</span>
                </div>
              )}
              {hasReachedEnd && (
                <p className="text-center text-sm text-[var(--color-text-tertiary)]">
                  지금 올라온 피드를 모두 확인했어요.
                </p>
              )}
            </div>
          </div>
          )}
        </div>
      </PageContent>

      <div className="fixed bottom-[calc(var(--nav-height)+var(--spacing-safe-bottom)+12px)] right-4 z-40">
        <Link
          href="/self-date/create"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-lg transition-transform active:scale-95"
          aria-label="새 피드 작성"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </Link>
      </div>

      <BottomSheet
        isOpen={heartTargetFeed !== null}
        onClose={() => setHeartTargetFeed(null)}
        title="호감 보내기"
      >
        {heartTargetFeed && (
          <div className="px-5 pb-6 pt-2">
            <div className="section-card-muted mb-4 flex items-center gap-3 p-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                <Image
                  src={heartTargetFeed.author.profileImages[0]}
                  alt={heartTargetFeed.author.nickname}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[var(--color-text-primary)]">{heartTargetFeed.author.nickname}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{getUserAcademicLabel(heartTargetFeed.author)}</p>
              </div>
            </div>

            <p className="mb-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              짧은 인사를 함께 보내도 좋고, 비워두면 하트만 전달돼요.
            </p>
            <textarea
              value={interestMessage}
              onChange={(event) => setInterestMessage(event.target.value.slice(0, 50))}
              placeholder="예: 안녕하세요, 저도 카페 좋아해요 :)"
              className="h-24 w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-[15px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none"
              maxLength={50}
            />
            <div className="mb-4 mt-1 text-right text-xs text-[var(--color-text-tertiary)]">
              {interestMessage.length}/50
            </div>

            <div className="action-stack">
              <button
                type="button"
                onClick={() => {
                  void handleSendInterest();
                }}
                className="w-full rounded-xl bg-[var(--color-secondary)] py-3 text-[15px] font-medium text-white"
              >
                보내기
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </PageContainer>
  );
}

export default function SelfDatePage() {
  return (
    <Suspense fallback={<PageContainer><div /></PageContainer>}>
      <SelfDatePageContent />
    </Suspense>
  );
}
