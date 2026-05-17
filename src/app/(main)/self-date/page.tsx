'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BrandLogo } from '@/components/brand';
import { PageContainer, PageContent } from '@/components/layout';
import { FeedCard } from '@/components/self-date/FeedCard';
import { NoStories, BottomSheet, useToast } from '@/components/ui';
import { createFeedComment, getFeeds } from '@/lib/api/feeds';
import {
  buildProfileDetailHref,
  buildSelfDateMyPostsHref,
  buildSelfDateDetailHref,
  readRouteViewState,
  useCurrentRouteContext,
  writeRouteViewState,
} from '@/lib/navigation';
import { isValidFeed, matchesStoryFilter } from '@/lib/utils/feed';
import {
  FESTIVAL_FEED_CATEGORY_SELECTED_CLASS,
  FESTIVAL_FEED_CATEGORY_UNSELECTED_CLASS,
  FEED_FILTER_CATEGORIES,
  isFestivalFeedCategory,
  type FeedFilterCategoryId,
} from '@/lib/constants';
import {
  readSelfDateHiddenUserIds,
} from '@/lib/utils';
import type { Story } from '@/lib/types';

const SELF_DATE_VIEW_STATE_KEY = 'self-date:list';

interface SelfDateViewState {
  selectedFilter: FeedFilterCategoryId;
  shownIds: string[];
  hasReachedEnd: boolean;
  scrollY: number;
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

function SlidersIcon({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-text-primary)] transition-colors active:bg-[var(--color-chip-background)]"
      aria-label="내 글 보기"
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 7h5" />
        <path d="M15 7h5" />
        <circle cx="12" cy="7" r="2" />
        <path d="M4 17h9" />
        <path d="M19 17h1" />
        <circle cx="16" cy="17" r="2" />
      </svg>
    </button>
  );
}

function MyFeedsIcon({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-text-primary)] transition-colors active:bg-[var(--color-chip-background)]"
      aria-label="My feeds"
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="8.5" r="3" />
        <path d="M5.5 19c1.1-3.2 3.5-5 6.5-5s5.4 1.8 6.5 5" />
      </svg>
    </Link>
  );
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
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const [heartTargetFeed, setHeartTargetFeed] = useState<Story | null>(null);
  const [interestMessage, setInterestMessage] = useState('');
  const [likedFeedIds, setLikedFeedIds] = useState<Set<string>>(() => new Set());
  const [pendingLikeFeedId, setPendingLikeFeedId] = useState<string | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

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
    let cancelled = false;
    const savedViewState = getSavedViewState();
    const savedSelectedFilter = isValidFilter(savedViewState.selectedFilter)
      ? savedViewState.selectedFilter
      : 'all';
    const initialFilter = isValidFilter(initialFilterParamRef.current)
      ? initialFilterParamRef.current
      : savedSelectedFilter;

    async function loadFeeds() {
      try {
        const hiddenUserIdSet = new Set(readSelfDateHiddenUserIds());
        const { items, nextCursor: cursor } = await getFeeds();
        if (cancelled) {
          return;
        }

        const stories = items.filter((story) => isValidFeed(story) && !hiddenUserIdSet.has(story.author.id));
        setSelectedFilter(initialFilter);
        setFeeds(stories);
        setShownIds(stories.map((story) => story.id));
        setNextCursor(cursor);
        setHasReachedEnd(cursor === null);
        appliedFilterParamRef.current = initialFilterParamRef.current;
        setIsHydrated(true);

        if (savedViewState.scrollY > 0) {
          window.setTimeout(() => {
            window.scrollTo({ top: savedViewState.scrollY, behavior: 'auto' });
          }, 0);
        }
      } catch (error) {
        if (!cancelled) {
          showToast(error instanceof Error ? error.message : '피드를 불러오지 못했어요.', 'error');
          setIsHydrated(true);
        }
      }
    }

    void loadFeeds();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

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

  const handleRefresh = useCallback(async () => {
    try {
      const hiddenUserIdSet = new Set(readSelfDateHiddenUserIds());
      const { items, nextCursor: cursor } = await getFeeds();
      const stories = items.filter((story) => isValidFeed(story) && !hiddenUserIdSet.has(story.author.id));
      setFeeds(stories);
      setShownIds(stories.map((feed) => feed.id));
      setNextCursor(cursor);
      setHasReachedEnd(cursor === null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      showToast(error instanceof Error ? error.message : '피드를 새로고침하지 못했어요.', 'error');
    }
  }, [showToast]);

  const triggerPullRefresh = useCallback(() => {
    setIsPullRefreshing(true);
    setPullDistance(64);
    void handleRefresh();
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
        if (entry.isIntersecting && !isLoadingMore && !hasReachedEnd && nextCursor) {
          setIsLoadingMore(true);

          getFeeds(null, nextCursor)
            .then(({ items, nextCursor: cursor }) => {
              const hiddenUserIdSet = new Set(readSelfDateHiddenUserIds());
              const moreFeeds = items.filter((story) => (
                isValidFeed(story) && !hiddenUserIdSet.has(story.author.id)
              ));

              if (moreFeeds.length > 0) {
                setFeeds((prevFeeds) => [...prevFeeds, ...moreFeeds]);
                setShownIds((prevIds) => [...prevIds, ...moreFeeds.map((feed) => feed.id)]);
              }

              setNextCursor(cursor);
              setHasReachedEnd(cursor === null);
            })
            .catch((error) => {
              showToast(error instanceof Error ? error.message : '피드를 더 불러오지 못했어요.', 'error');
            })
            .finally(() => {
              setIsLoadingMore(false);
            });
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasReachedEnd, isHydrated, isLoadingMore, nextCursor, showToast]);

  useEffect(() => {
    const interval = setInterval(() => {
      const hiddenUserIdSet = new Set(readSelfDateHiddenUserIds());
      setFeeds((prevFeeds) => prevFeeds.filter((feed) => (
        isValidFeed(feed)
        && !hiddenUserIdSet.has(feed.author.id)
      )));
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
      await createFeedComment(targetFeedId, message || '하트만 보냈어요.');
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

  const hiddenUserIds = new Set(readSelfDateHiddenUserIds());
  const filteredFeeds = feeds.filter((feed) => (
    !likedFeedIds.has(feed.id)
    && !hiddenUserIds.has(feed.author.id)
    && matchesStoryFilter(feed, selectedFilter)
  ));
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
      <header className="sticky top-0 z-40 flex min-h-[76px] items-center justify-between bg-[var(--color-surface)]/95 px-5 py-3 backdrop-blur-xl">
        <BrandLogo
          variant="lg"
          framed={false}
          logoClassName="drop-shadow-[0_2px_2px_rgba(34,34,34,0.12)]"
        />
        <div className="flex items-center gap-1">
          <MyFeedsIcon
            href={buildSelfDateMyPostsHref({
              sourcePath: currentPath,
              fallbackPath: currentPath,
            })}
          />
          <SlidersIcon onClick={() => setIsFilterOpen((prevIsFilterOpen) => !prevIsFilterOpen)} />
        </div>
        {/*
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
        */}
      </header>

      <div
        className={`sticky top-[76px] z-30 overflow-hidden bg-[var(--color-surface)] transition-[max-height,opacity,transform] duration-300 ease-out ${
          isFilterOpen
            ? 'max-h-20 translate-y-0 opacity-100'
            : 'pointer-events-none max-h-0 -translate-y-2 opacity-0'
        }`}
        aria-hidden={!isFilterOpen}
      >
        <div className="flex gap-2 overflow-x-auto px-5 py-2.5 scrollbar-hide">
          {FEED_FILTER_CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => updateFilter(category.id)}
              tabIndex={isFilterOpen ? 0 : -1}
              className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-semibold transition-colors ${
                isFestivalFeedCategory(category.id)
                  ? category.id === selectedFilter
                    ? FESTIVAL_FEED_CATEGORY_SELECTED_CLASS
                    : FESTIVAL_FEED_CATEGORY_UNSELECTED_CLASS
                  : category.id === selectedFilter
                  ? 'bg-[var(--color-pink-cta)] text-white shadow-sm'
                  : 'bg-[#F3F4F6] text-[var(--color-text-secondary)]'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {!isFilterOpen && (
        <div className="relative px-5 pb-1 pt-2">
          <Image
            src="/brand/bear-hero-hand2.png"
            alt=""
            width={52}
            height={52}
            className="pointer-events-none absolute right-[123px] top-[51px] z-[120] h-[30px] w-[30px] rotate-0 object-contain drop-shadow-[0_2px_1px_rgba(34,34,34,0.18)] max-[357px]:right-[117px] max-[357px]:top-[54px] max-[357px]:h-[27px] max-[357px]:w-[27px] max-[340px]:right-[91px] max-[340px]:h-[23px] max-[340px]:w-[23px]"
            aria-hidden="true"
          />
          <Image
            src="/brand/bear-hero-hand2.png"
            alt=""
            width={52}
            height={52}
            className="pointer-events-none absolute right-[37px] top-[51px] z-[120] h-[30px] w-[30px] rotate-0 scale-x-[-1] object-contain drop-shadow-[0_2px_1px_rgba(34,34,34,0.18)] max-[357px]:top-[54px] max-[357px]:h-[27px] max-[357px]:w-[27px] max-[340px]:right-[28px] max-[340px]:h-[23px] max-[340px]:w-[23px]"
            aria-hidden="true"
          />
          <div
            className="relative min-h-[60px] overflow-hidden rounded-[20px] px-4 py-2 shadow-[0_3px_7px_rgba(34,34,34,0.04)]"
            style={{
              background: 'linear-gradient(104deg, #FFDCE8 0%, #F8EEF4 28%, #C2E9FF 58%, #C2E9FF 100%)',
            }}
          >
            <Image
              src="/brand/bear-hero-face2.png"
              alt=""
              width={96}
              height={96}
              className="pointer-events-none absolute right-[34px] top-0 z-30 h-[84px] w-[84px] object-contain drop-shadow-[0_3px_5px_rgba(34,34,34,0.06)] max-[357px]:top-2 max-[357px]:h-[74px] max-[357px]:w-[74px] max-[340px]:right-[18px] max-[340px]:h-[68px] max-[340px]:w-[68px]"
              aria-hidden="true"
            />
            <Image
              src="/brand/bear-hero-hand2.png"
              alt=""
              width={52}
              height={52}
              className="hidden"
              aria-hidden="true"
            />
            <Image
              src="/brand/bear-hero-hand2.png"
              alt=""
              width={52}
              height={52}
              className="hidden"
              aria-hidden="true"
            />
            <div className="relative z-40 flex min-h-[44px] items-center gap-3 pr-[128px] max-[364px]:pr-[100px] max-[340px]:pr-[79px]">
              <span className="shrink-0 rounded-full bg-[var(--color-pink-cta)] px-2.5 py-0.5 text-[12px] font-semibold text-white shadow-[0_2px_5px_rgba(243,167,192,0.18)] max-[369px]:text-[11px]">
                지금 우리
              </span>
              <span className="hidden">
                지금 우리
              </span>
              <p className="ml-1 min-w-0 break-keep text-[11px] font-medium leading-[15px] text-[var(--color-text-primary)] max-[364px]:ml-0 max-[340px]:text-[10px] max-[340px]:leading-[13px]">
                지금 만나고 싶은 우리,
                <br />
                하트를 눌러보세요
              </p>
              <p className="hidden">
                <span className="text-[10px]">지금 만나고 싶은 우리, 하트를 눌러보세요</span>
                지금 만나고 싶은 사람에게 하트를 눌러보세요.
              </p>
            </div>
          </div>
        </div>
      )}

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
            {filteredFeeds.map((story, index) => (
              <FeedCard
                key={story.id}
                story={story}
                onCardClick={() => handleCardClick(story)}
                onHeartClick={() => handleHeartClick(story)}
                onProfileClick={() => handleProfileClick(story)}
                isLiked={likedFeedIds.has(story.id)}
                isLikePending={pendingLikeFeedId === story.id}
                priorityImage={index === 0}
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

      <div className="fixed bottom-[calc(var(--nav-height)+var(--spacing-safe-bottom)+28px)] right-4 z-40">
        <Link
          href="/self-date/create"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-like-active)] text-white shadow-[0_6px_14px_rgba(243,167,192,0.22)] transition-transform active:scale-95"
          aria-label="새 피드 작성"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </Link>
      </div>

      <BottomSheet
        isOpen={heartTargetFeed !== null}
        onClose={() => setHeartTargetFeed(null)}
        title="좋아요 보내기"
      >
        {heartTargetFeed && (
          <div className="px-5 pb-6 pt-2">
            <p className="mb-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              짧은 인사를 함께 보내도 좋고, 비워두면 하트만 전달돼요.
            </p>
            <textarea
              value={interestMessage}
              onChange={(event) => setInterestMessage(event.target.value.slice(0, 50))}
              placeholder="예: 안녕하세요, 저도 카페 좋아해요 :)"
              className="h-24 w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-[15px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-focus)] focus:outline-none"
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
                className="w-full rounded-xl bg-[var(--color-action-primary)] py-3 text-[15px] font-medium text-[var(--color-action-primary-text)]"
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
