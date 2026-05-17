'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { PageContainer, PageContent, PageHeader } from '@/components/layout';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useToast } from '@/components/ui/Toast';
import {
  FESTIVAL_FEED_CATEGORY_DISPLAY_CLASS,
  PLACEHOLDER_PROFILE_IMAGE,
  getFeedCategoryLabel,
  isFestivalFeedCategory,
} from '@/lib/constants';
import { createFeedComment, getFeed, recordFeedView } from '@/lib/api/feeds';
import { reportTarget } from '@/lib/api/safety';
import {
  buildProfileDetailHref,
  useCurrentRouteContext,
  useSafeBack,
} from '@/lib/navigation';
import {
  getUserAcademicLabel,
} from '@/lib/utils';
import { getFeedRemainingTime, getStoryCategories } from '@/lib/utils/feed';
import type { Story } from '@/lib/types';

type OverlayState = 'none' | 'menu' | 'report' | 'interest';

const PRIMARY_DETAIL_CATEGORIES = new Set(['festival', 'walk', 'cafe', 'food', 'study']);

function SelfDateDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { currentPath, ownerSection } = useCurrentRouteContext();
  const { goBack, fallbackPath } = useSafeBack({ fallbackPath: '/self-date' });
  const storyId = params.id as string;

  const [story, setStory] = useState<Story | null>(null);
  const [overlayState, setOverlayState] = useState<OverlayState>('none');
  const [interestMessage, setInterestMessage] = useState('');
  const [imgError, setImgError] = useState(false);
  const [contentImgErrorIndexes, setContentImgErrorIndexes] = useState<Set<number>>(() => new Set());
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);
  const [likedFeedIds, setLikedFeedIds] = useState<Set<string>>(() => new Set());
  const [timeRemaining, setTimeRemaining] = useState({
    hours: 0,
    minutes: 0,
    totalMinutes: 0,
    isExpiringSoon: false,
    isExpired: true,
    formatted: '만료됨',
  });

  useEffect(() => {
    let cancelled = false;

    async function loadStory() {
      try {
        const nextStory = await getFeed(storyId);
        if (cancelled) {
          return;
        }

        setStory(nextStory);
        setTimeRemaining(getFeedRemainingTime(nextStory));

        const viewResult = await recordFeedView(storyId);
        if (cancelled) {
          return;
        }

        setStory((currentStory) => (
          currentStory?.id === nextStory.id
            ? { ...currentStory, viewCount: viewResult.viewCount }
            : currentStory
        ));
      } catch (error) {
        if (!cancelled) {
          showToast(error instanceof Error ? error.message : '피드를 불러오지 못했어요.', 'error');
        }
      }
    }

    void loadStory();

    return () => {
      cancelled = true;
    };
  }, [showToast, storyId]);

  useEffect(() => {
    if (!story) {
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining(getFeedRemainingTime(story));
    }, 60_000);

    return () => clearInterval(interval);
  }, [story]);

  if (!story) {
    return (
      <PageContainer>
        <PageHeader title="지금 우리" showBack onBack={goBack} />
        <PageContent>
          <div className="content-stack items-center py-20 text-center">
            <p className="text-[var(--color-text-secondary)]">피드를 찾을 수 없어요.</p>
            <p className="text-sm text-[var(--color-text-tertiary)]">
              삭제되었거나 만료된 피드일 수 있어요.
            </p>
          </div>
        </PageContent>
      </PageContainer>
    );
  }

  const author = story.author;
  const profileImage = imgError
    ? PLACEHOLDER_PROFILE_IMAGE
    : (author.profileImages[0] || PLACEHOLDER_PROFILE_IMAGE);
  const contentImages = story.content.images;
  const activeContentImage = contentImages[activeImageIndex] ?? contentImages[0] ?? PLACEHOLDER_PROFILE_IMAGE;
  const hasActiveImageError = contentImgErrorIndexes.has(activeImageIndex);
  const previewImage = previewImageIndex !== null ? contentImages[previewImageIndex] : null;
  const isInterestSent = likedFeedIds.has(story.id);
  const isHeartDisabled = timeRemaining.isExpired || isInterestSent;
  const detailKeywords = getStoryCategories(story);

  const goToProfile = () => {
    router.push(
      buildProfileDetailHref(author.id, 'self-date', {
        sourcePath: currentPath,
        sourceSection: ownerSection,
        fallbackPath: currentPath,
      }),
    );
  };

  const openInterestSheet = () => {
    if (isHeartDisabled) {
      return;
    }

    setInterestMessage('');
    setOverlayState('interest');
  };

  const handleSubmitInterest = async () => {
    const message = interestMessage.trim();
    try {
      await createFeedComment(story.id, message || '하트만 보냈어요.');
      const nextLikedFeedIds = new Set(likedFeedIds);
      nextLikedFeedIds.add(story.id);
      setLikedFeedIds(nextLikedFeedIds);
      setOverlayState('none');
      setInterestMessage('');
      showToast(message ? '호감과 인사를 보냈어요.' : '호감을 보냈어요.', 'success');
      router.replace(fallbackPath);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '호감을 보내지 못했어요.', 'error');
    }
  };

  const handleReport = async () => {
    try {
      await reportTarget({
        targetType: 'feed',
        targetId: story.id,
        reasonType: 'inappropriate',
        description: null,
      });
      setOverlayState('none');
      showToast('신고가 접수되었어요.', 'success');
      router.replace(fallbackPath);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '신고를 접수하지 못했어요.', 'error');
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title=""
        showBack
        onBack={goBack}
        action={(
          <button
            type="button"
            onClick={() => setOverlayState('menu')}
            className="flex h-10 w-10 items-center justify-center text-[var(--color-text-secondary)]"
            aria-label="더보기"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
        )}
      />

      <PageContent>
        <section className="content-stack">
          <div className="mobile-split-row items-start gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <button
                type="button"
                onClick={goToProfile}
                className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[var(--color-surface-secondary)] transition-transform active:scale-95"
                aria-label={`${author.nickname} 프로필 보기`}
              >
                <Image
                  src={profileImage}
                  alt={author.nickname}
                  width={56}
                  height={56}
                  className="h-full w-full object-cover"
                  onError={() => setImgError(true)}
                />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[var(--color-text-primary)]">{author.nickname}</p>
                      {author.isGraduate && (
                        <span className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-secondary)]">
                          졸업생
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          timeRemaining.isExpired
                            ? 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]'
                            : timeRemaining.isExpiringSoon
                              ? 'bg-[var(--color-brand-pink)] text-[var(--color-text-primary)]'
                              : 'bg-[var(--color-chip-background)] text-[var(--color-text-primary)]'
                        }`}
                      >
                        {timeRemaining.formatted}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {getUserAcademicLabel(author)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openInterestSheet}
                    disabled={isHeartDisabled}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-pink)] transition-all active:scale-95 disabled:cursor-default ${
                      isInterestSent
                        ? 'text-[var(--color-pink-cta)] opacity-60'
                        : 'text-[var(--color-pink-cta)]'
                    }`}
                    aria-label={
                      isInterestSent
                        ? `${author.nickname}님에게 이미 호감을 보냈어요`
                        : `${author.nickname}님에게 호감 보내기`
                    }
                    aria-pressed={isInterestSent}
                  >
                    <svg
                      className="h-[18px] w-[18px]"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      stroke="currentColor"
                      strokeWidth={0}
                      aria-hidden="true"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden">
            {detailKeywords.map((category) => (
              <span
                key={category}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  isFestivalFeedCategory(category)
                    ? FESTIVAL_FEED_CATEGORY_DISPLAY_CLASS
                    : PRIMARY_DETAIL_CATEGORIES.has(category)
                    ? 'bg-[var(--color-chip-background)] text-[var(--color-text-primary)]'
                    : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]'
                }`}
              >
                {getFeedCategoryLabel(category)}
              </span>
            ))}
          </div>

          {contentImages.length > 0 && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  if (!hasActiveImageError) {
                    setPreviewImageIndex(activeImageIndex);
                  }
                }}
                className="relative aspect-[16/10] w-full overflow-hidden rounded-[10px] bg-[var(--color-surface-secondary)]"
                aria-label={`피드 이미지 ${activeImageIndex + 1} 크게 보기`}
              >
                {!hasActiveImageError ? (
                  <Image
                    src={activeContentImage}
                    alt={`피드 이미지 ${activeImageIndex + 1}`}
                    fill
                    sizes="(max-width: 430px) 100vw, 400px"
                    className="object-cover"
                    onError={() => {
                      setContentImgErrorIndexes((prevIndexes) => {
                        const nextIndexes = new Set(prevIndexes);
                        nextIndexes.add(activeImageIndex);
                        return nextIndexes;
                      });
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="text-[var(--color-text-tertiary)]"
                      aria-hidden="true"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                )}
              </button>

              {contentImages.length > 1 && (
                <>
                  <div className="flex items-center justify-center gap-1.5">
                    {contentImages.map((image, index) => (
                      <button
                        key={`${image}-dot-${index}`}
                        type="button"
                        onClick={() => setActiveImageIndex(index)}
                        className={`h-2 w-2 rounded-full transition-colors ${
                          index === activeImageIndex
                            ? 'bg-[var(--color-pink-cta)]'
                            : 'bg-[var(--color-border)]'
                        }`}
                        aria-label={`피드 이미지 ${index + 1} 선택`}
                      />
                    ))}
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    {contentImages.map((image, index) => {
                      const hasImageError = contentImgErrorIndexes.has(index);

                      return (
                        <button
                          key={`${image}-${index}`}
                          type="button"
                          onClick={() => setActiveImageIndex(index)}
                          className={`relative aspect-square w-full overflow-hidden rounded-[10px] bg-[var(--color-surface-secondary)] transition-all ${
                            index === activeImageIndex
                              ? 'ring-2 ring-[var(--color-pink-cta)]'
                              : 'ring-1 ring-[var(--color-border-light)]'
                          }`}
                          aria-label={`피드 이미지 ${index + 1} 보기`}
                        >
                          {!hasImageError ? (
                            <Image
                              src={image}
                              alt={`피드 이미지 ${index + 1}`}
                              fill
                              sizes="64px"
                              className="object-cover"
                              onError={() => {
                                setContentImgErrorIndexes((prevIndexes) => {
                                  const nextIndexes = new Set(prevIndexes);
                                  nextIndexes.add(index);
                                  return nextIndexes;
                                });
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <svg
                                width="26"
                                height="26"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                className="text-[var(--color-text-tertiary)]"
                                aria-hidden="true"
                              >
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                              </svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {false && contentImages.length > 0 && (
            <div className="space-y-2">
              <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 scrollbar-hide">
                {contentImages.map((image, index) => {
                  const hasImageError = contentImgErrorIndexes.has(index);

                  return (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => {
                        if (!hasImageError) {
                          setPreviewImageIndex(index);
                        }
                      }}
                      className={`relative shrink-0 overflow-hidden rounded-2xl bg-[var(--color-surface-secondary)] ${
                        contentImages.length === 1 ? 'aspect-square w-full' : 'h-44 w-44'
                      }`}
                      aria-label={`피드 이미지 ${index + 1} 크게 보기`}
                    >
                      {!hasImageError ? (
                        <Image
                          src={image}
                          alt={`피드 이미지 ${index + 1}`}
                          fill
                          sizes={contentImages.length === 1 ? '(max-width: 430px) 100vw, 400px' : '176px'}
                          className="object-cover"
                          onError={() => {
                            setContentImgErrorIndexes((prevIndexes) => {
                              const nextIndexes = new Set(prevIndexes);
                              nextIndexes.add(index);
                              return nextIndexes;
                            });
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <svg
                            width="44"
                            height="44"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className="text-[var(--color-text-tertiary)]"
                            aria-hidden="true"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        </div>
                      )}

                      {contentImages.length > 1 && (
                        <span className="absolute bottom-2 right-2 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-semibold text-white">
                          {index + 1}/{contentImages.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-[10px] bg-[var(--color-surface)] p-4 shadow-[0_4px_12px_rgba(34,34,34,0.055)]">
            <p className="whitespace-pre-wrap text-base leading-relaxed text-[var(--color-text-primary)]">
              {story.content.text}
            </p>

            <div className="mt-4 chip-wrap">
              {detailKeywords.map((category) => (
                <span
                  key={category}
                  className={`rounded-full px-4 py-1.5 text-[14px] font-semibold ${
                    isFestivalFeedCategory(category)
                      ? FESTIVAL_FEED_CATEGORY_DISPLAY_CLASS
                      : PRIMARY_DETAIL_CATEGORIES.has(category)
                      ? 'bg-[var(--color-chip-background)] text-[var(--color-text-primary)]'
                      : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  {getFeedCategoryLabel(category)}
                </span>
              ))}
            </div>
          </div>

          <div className="hidden">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>{story.viewCount}명이 확인했어요</span>
          </div>
        </section>
      </PageContent>

      {overlayState === 'menu' && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center px-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="닫기"
            onClick={() => setOverlayState('none')}
          />
          <div className="relative w-full max-w-xs overflow-hidden rounded-[24px] border border-[var(--color-border-light)] bg-[var(--color-surface)] shadow-lg">
            <div className="py-2">
              {false && (
              <button
                type="button"
                onClick={() => {
                  setOverlayState('none');
                  goToProfile();
                }}
                className="w-full px-6 py-4 text-left text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-secondary)]"
              >
                프로필 보기
              </button>
              )}
              <button
                type="button"
                onClick={() => setOverlayState('report')}
                className="w-full px-6 py-4 text-left text-[0px] text-[var(--color-error)] transition-colors hover:bg-[var(--color-error-bg)]"
              >
                <span className="text-base">피드 신고</span>
                글 신고
              </button>
            </div>
          </div>
        </div>
      )}

      {overlayState === 'report' && (
        <div className="fixed inset-0 z-[145] flex items-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="닫기"
            onClick={() => setOverlayState('none')}
          />
          <div className="relative w-full rounded-t-[24px] bg-[var(--color-surface)] px-6 pb-8 pt-5 shadow-xl">
            <h3 className="mb-2 text-center text-lg font-semibold tracking-[-0.02em]">이 피드를 신고할까요?</h3>
            <p className="mb-4 text-center text-sm leading-6 text-[var(--color-text-secondary)]">
              불쾌하거나 부적절한 내용인지 검토할 수 있도록 운영팀에 전달할게요.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleReport}
                className="min-h-12 rounded-xl bg-[var(--color-error)] px-4 py-3 text-sm font-semibold text-white"
              >
                신고하기
              </button>
              <button
                type="button"
                onClick={() => setOverlayState('none')}
                className="min-h-12 rounded-xl bg-[var(--color-surface-secondary)] px-4 py-3 text-sm font-semibold text-[var(--color-text-secondary)]"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 px-4 py-8">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="이미지 크게 보기 닫기"
            onClick={() => setPreviewImageIndex(null)}
          />

          <div className="relative z-10 flex w-full max-w-[430px] flex-col items-center gap-4">
            <div className="flex w-full items-center justify-between text-white">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                {(previewImageIndex ?? 0) + 1}/{contentImages.length}
              </span>
              <button
                type="button"
                onClick={() => setPreviewImageIndex(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur"
                aria-label="닫기"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[24px] bg-black">
              <Image
                src={previewImage}
                alt={`확대된 피드 이미지 ${(previewImageIndex ?? 0) + 1}`}
                fill
                sizes="(max-width: 430px) 100vw, 430px"
                className="object-contain"
              />
            </div>

            {contentImages.length > 1 && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewImageIndex((currentIndex) => (
                      currentIndex === null ? null : (currentIndex + contentImages.length - 1) % contentImages.length
                    ));
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur"
                  aria-label="이전 이미지"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewImageIndex((currentIndex) => (
                      currentIndex === null ? null : (currentIndex + 1) % contentImages.length
                    ));
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur"
                  aria-label="다음 이미지"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomSheet
        isOpen={overlayState === 'interest'}
        onClose={() => {
          setOverlayState('none');
          setInterestMessage('');
        }}
        title="호감 보내기"
      >
        <div className="px-5 pb-6 pt-2">
          <div className="section-card-muted mb-4 flex items-center gap-3 p-3">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
              <Image
                src={author.profileImages[0] || PLACEHOLDER_PROFILE_IMAGE}
                alt={author.nickname}
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[var(--color-text-primary)]">{author.nickname}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{getUserAcademicLabel(author)}</p>
            </div>
          </div>

          <p className="mb-2 text-sm leading-6 text-[var(--color-text-secondary)]">
            짧은 인사를 함께 보내도 좋고, 비워두면 하트만 전달돼요.
          </p>
          <textarea
            value={interestMessage}
            onChange={(event) => setInterestMessage(event.target.value.slice(0, 50))}
            placeholder="예: 분위기가 편안해서 반가웠어요 :)"
            className="h-24 w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-[15px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-focus)] focus:outline-none"
            maxLength={50}
          />
          <div className="mb-4 mt-1 text-right text-xs text-[var(--color-text-tertiary)]">
            {interestMessage.length}/50
          </div>

          <div className="action-stack">
            <button
              type="button"
              onClick={handleSubmitInterest}
              className="w-full rounded-xl bg-[var(--color-action-primary)] py-3 text-[15px] font-medium text-[var(--color-action-primary-text)]"
            >
              보내기
            </button>
          </div>
        </div>
      </BottomSheet>
    </PageContainer>
  );
}

export default function SelfDateDetailPage() {
  return (
    <Suspense fallback={<PageContainer><div /></PageContainer>}>
      <SelfDateDetailPageContent />
    </Suspense>
  );
}
