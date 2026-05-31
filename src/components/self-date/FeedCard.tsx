'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { Story } from '@/lib/types';
import {
  FESTIVAL_FEED_CATEGORY_DISPLAY_CLASS,
  PLACEHOLDER_PROFILE_IMAGE,
  getFeedCategoryLabel,
  isFestivalFeedCategory,
} from '@/lib/constants';
import { getFeedRemainingTime, getStoryCategories, markFeedAsViewed } from '@/lib/utils/feed';
import { getUserAcademicLabel } from '@/lib/utils';

interface FeedCardProps {
  story: Story;
  onCardClick?: () => void;
  onHeartClick?: () => void;
  onProfileClick?: () => void;
  isLiked?: boolean;
  isLikePending?: boolean;
  priorityImage?: boolean;
  showHeartButton?: boolean;
}

const PRIMARY_CATEGORY_PRIORITY = {
  festival: -1,
  walk: 0,
  cafe: 1,
  food: 2,
  study: 3,
} as const;

export function FeedCard({
  story,
  onCardClick,
  onHeartClick,
  onProfileClick,
  isLiked = false,
  isLikePending = false,
  priorityImage = false,
  showHeartButton = true,
}: FeedCardProps) {
  const [imageErrorIndexes, setImageErrorIndexes] = useState<Set<number>>(() => new Set());
  const [timeRemaining, setTimeRemaining] = useState(() => getFeedRemainingTime(story));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getFeedRemainingTime(story));
    }, 60000);

    return () => clearInterval(interval);
  }, [story]);

  if (timeRemaining.isExpired) {
    return null;
  }

  const { author, content } = story;
  const authorNickname = author?.nickname ?? '알 수 없는 사용자';
  const authorProfileImage = author?.profileImages[0] || PLACEHOLDER_PROFILE_IMAGE;
  const authorGender = author?.gender === 'female' ? 'female' : 'male';
  const genderLabel = authorGender === 'female' ? '여성' : '남성';
  const shouldShowGender = !author?.hideGender;
  const canOpenAuthorProfile = Boolean(author && !author.isOperator);
  const avatarBorderClass = !shouldShowGender
    ? 'border-[var(--color-border-light)]'
    : authorGender === 'female'
    ? 'border-[var(--color-pink-cta)]'
    : 'border-[var(--color-blue-secondary)]';
  const authorAcademicLabel = author ? getUserAcademicLabel(author) : '프로필 정보를 불러올 수 없어요';
  const displayImages = content.images.slice(0, 4);
  const hasContentImages = displayImages.length > 0;
  const hiddenImageCount = Math.max(content.images.length - displayImages.length, 0);
  const storyCategories = getStoryCategories(story);
  const sortedStoryCategories = [...storyCategories].sort((firstCategory, secondCategory) => {
    const firstPriority = PRIMARY_CATEGORY_PRIORITY[firstCategory as keyof typeof PRIMARY_CATEGORY_PRIORITY] ?? 99;
    const secondPriority =
      PRIMARY_CATEGORY_PRIORITY[secondCategory as keyof typeof PRIMARY_CATEGORY_PRIORITY] ?? 99;

    if (firstPriority !== secondPriority) {
      return firstPriority - secondPriority;
    }

    return storyCategories.indexOf(firstCategory) - storyCategories.indexOf(secondCategory);
  });

  const handleCardClick = () => {
    markFeedAsViewed(story.id);
    onCardClick?.();
  };

  const handleHeartClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onHeartClick?.();
  };

  const handleProfileClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!canOpenAuthorProfile) {
      return;
    }
    onProfileClick?.();
  };

  const renderImageTile = (image: string, index: number, className: string, sizes: string) => (
    <div
      key={`${image}-${index}`}
      className={`relative overflow-hidden bg-[var(--color-surface-secondary)] ${className}`}
    >
      <Image
        src={imageErrorIndexes.has(index) ? PLACEHOLDER_PROFILE_IMAGE : image}
        alt={`${authorNickname} 피드 이미지 ${index + 1}`}
        fill
        loading={priorityImage && index === 0 ? 'eager' : 'lazy'}
        sizes={sizes}
        className="object-cover"
        onError={() => {
          setImageErrorIndexes((prevIndexes) => {
            const nextIndexes = new Set(prevIndexes);
            nextIndexes.add(index);
            return nextIndexes;
          });
        }}
      />
      {hiddenImageCount > 0 && index === displayImages.length - 1 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/35 text-[15px] font-semibold text-white">
          +{hiddenImageCount}
        </div>
      )}
    </div>
  );

  const heartAriaLabel = isLiked
    ? `${authorNickname}님에게 이미 호감을 보냈어요`
    : isLikePending
      ? `${authorNickname}님에게 호감을 보내는 중이에요`
      : `${authorNickname}님에게 호감 보내기`;

  return (
    <article
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleCardClick();
        }
      }}
      className="cursor-pointer rounded-2xl bg-[var(--color-surface)] px-4 pb-3 pt-4 shadow-[0_4px_12px_rgba(34,34,34,0.055)] transition-all active:scale-[0.99]"
      aria-label={`${authorNickname} 피드 보기`}
    >
      {hasContentImages && (
        <div className="mb-2 overflow-hidden rounded-[16px] bg-[var(--color-surface-secondary)]">
          {displayImages.length === 1 &&
            renderImageTile(
              displayImages[0],
              0,
              'aspect-[16/9] w-full',
              '(max-width: 430px) calc(100vw - 32px), 398px',
            )}

          {displayImages.length === 2 && (
            <div className="grid grid-cols-2 gap-1.5">
              {displayImages.map((image, index) =>
                renderImageTile(
                  image,
                  index,
                  'aspect-[4/5]',
                  '(max-width: 430px) calc((100vw - 38px) / 2), 196px',
                ),
              )}
            </div>
          )}

          {displayImages.length === 3 && (
            <div className="grid h-[220px] grid-cols-[1.36fr_1fr] gap-1.5 min-[390px]:h-[238px]">
              {renderImageTile(displayImages[0], 0, 'h-full', '(max-width: 430px) 58vw, 230px')}
              <div className="grid min-h-0 grid-rows-2 gap-1.5">
                {displayImages.slice(1).map((image, sliceIndex) =>
                  renderImageTile(
                    image,
                    sliceIndex + 1,
                    'h-full',
                    '(max-width: 430px) 38vw, 162px',
                  ),
                )}
              </div>
            </div>
          )}

          {displayImages.length >= 4 && (
            <div className="grid grid-cols-2 gap-1.5">
              {displayImages.map((image, index) =>
                renderImageTile(
                  image,
                  index,
                  'aspect-[16/9]',
                  '(max-width: 430px) calc((100vw - 38px) / 2), 196px',
                ),
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={handleProfileClick}
          disabled={!canOpenAuthorProfile}
          className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 bg-[var(--color-surface-secondary)] shadow-sm ${canOpenAuthorProfile ? '' : 'cursor-default'} ${avatarBorderClass}`}
          aria-label={canOpenAuthorProfile ? `${authorNickname} 프로필 보기` : `${authorNickname} 운영자 프로필`}
        >
          <Image
            src={authorProfileImage}
            alt={authorNickname}
            fill
            className="object-cover"
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <button
              type="button"
              onClick={handleProfileClick}
              disabled={!canOpenAuthorProfile}
              className={`block min-w-0 truncate text-left font-semibold text-[var(--color-text-primary)] transition-opacity ${canOpenAuthorProfile ? 'hover:opacity-80' : 'cursor-default'}`}
            >
              {authorNickname}
            </button>
            {shouldShowGender && (
              <>
                <span className="shrink-0 text-[11px] font-medium text-[var(--color-text-tertiary)]" aria-hidden="true">
                  ·
                </span>
                <span className="shrink-0 text-[11px] font-medium text-[var(--color-text-secondary)]">
                  {genderLabel}
                </span>
              </>
            )}
            {author?.isGraduate && (
              <span className="shrink-0 rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-secondary)]">
                졸업생
              </span>
            )}
          </div>

          <div className="mt-1 chip-wrap">
            {sortedStoryCategories.map((category) => (
              <span
                key={category}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  isFestivalFeedCategory(category)
                    ? FESTIVAL_FEED_CATEGORY_DISPLAY_CLASS
                    : category in PRIMARY_CATEGORY_PRIORITY
                    ? 'bg-[var(--color-chip-background)] text-[var(--color-text-primary)]'
                    : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]'
                }`}
              >
                {getFeedCategoryLabel(category)}
              </span>
            ))}
          </div>

          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-medium text-[var(--color-text-tertiary)]">
            <span className="min-w-0 truncate">{authorAcademicLabel}</span>
          </div>
        </div>
      </div>

      <div className="mt-2">
        <p data-clarity-mask className="line-clamp-2 min-h-12 whitespace-pre-wrap break-words text-[14px] leading-6 text-[var(--color-text-primary)]">
          {content.text}
        </p>
      </div>

      <div className="mt-3 flex min-h-10 items-center justify-between gap-3">
        <span
          className={`text-[12px] font-semibold ${
            timeRemaining.isExpiringSoon
              ? 'text-[var(--color-pink-cta)]'
              : 'text-[var(--color-text-tertiary)]'
          }`}
        >
          {timeRemaining.formatted}
        </span>

        {showHeartButton && (
          <button
            type="button"
            onClick={handleHeartClick}
            disabled={isLiked || isLikePending}
            className={`flex h-10 w-10 shrink-0 items-center justify-center transition-all active:scale-95 disabled:cursor-default ${
              isLiked
                ? 'text-[var(--color-pink-cta)] opacity-60'
                : isLikePending
                  ? 'text-[var(--color-pink-cta)] opacity-50'
                  : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-pink-cta)]'
            }`}
            aria-label={heartAriaLabel}
            aria-pressed={isLiked}
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill={isLiked || isLikePending ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={isLiked || isLikePending ? 0 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        )}
      </div>
    </article>
  );
}
