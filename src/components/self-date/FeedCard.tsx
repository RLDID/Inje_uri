'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { Story } from '@/lib/types';
import { PLACEHOLDER_PROFILE_IMAGE, getFeedCategoryLabel } from '@/lib/constants';
import { getFeedRemainingTime, getStoryCategories, markFeedAsViewed } from '@/lib/utils/feed';
import { getUserAcademicLabel } from '@/lib/utils';

interface FeedCardProps {
  story: Story;
  onCardClick?: () => void;
  onHeartClick?: () => void;
  onProfileClick?: () => void;
  isLiked?: boolean;
  isLikePending?: boolean;
}

const PRIMARY_CATEGORY_PRIORITY = {
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
}: FeedCardProps) {
  const [imgError, setImgError] = useState(false);
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
  const authorAcademicLabel = author ? getUserAcademicLabel(author) : '프로필 정보를 불러올 수 없어요';
  const hasContentImage = content.images.length > 0;
  const displayImage = imgError
    ? PLACEHOLDER_PROFILE_IMAGE
    : hasContentImage
      ? content.images[0]
      : authorProfileImage;
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
    if (!author) {
      return;
    }
    onProfileClick?.();
  };

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
      className="cursor-pointer rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-surface)] p-4 transition-all hover:border-[var(--color-border)] active:scale-[0.99]"
      aria-label={`${authorNickname} 피드 보기`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={handleProfileClick}
          disabled={!author}
          className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]"
          aria-label={`${authorNickname} 프로필 보기`}
        >
          <Image
            src={authorProfileImage}
            alt={authorNickname}
            fill
            className="object-cover"
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="meta-wrap">
            <button
              type="button"
              onClick={handleProfileClick}
              disabled={!author}
              className="text-left font-semibold text-[var(--color-text-primary)] transition-opacity hover:opacity-80"
            >
              {authorNickname}
            </button>
            {author?.isGraduate && (
              <span className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-secondary)]">
                졸업생
              </span>
            )}
          </div>

          <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">{authorAcademicLabel}</p>

          <div className="mt-2 chip-wrap">
            {sortedStoryCategories.map((category) => (
              <span
                key={category}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  category in PRIMARY_CATEGORY_PRIORITY
                    ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                    : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]'
                }`}
              >
                {getFeedCategoryLabel(category)}
              </span>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleHeartClick}
          disabled={isLiked || isLikePending}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 disabled:cursor-not-allowed ${
            isLiked
              ? 'bg-[var(--color-secondary)] text-white'
              : isLikePending
                ? 'border border-[var(--color-secondary)]/20 bg-[var(--color-surface-secondary)] text-[var(--color-secondary)]/60'
                : 'border border-[var(--color-secondary)]/30 bg-[var(--color-surface-secondary)] text-[var(--color-secondary)]'
          }`}
          aria-label={heartAriaLabel}
          aria-pressed={isLiked}
        >
          <svg
            className="h-[18px] w-[18px]"
            viewBox="0 0 24 24"
            fill={isLiked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={isLiked ? 0 : 2}
            aria-hidden="true"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      <div className={`mt-3 ${hasContentImage ? 'grid grid-cols-[1fr_88px] gap-3' : ''}`}>
        <p className="line-clamp-3 text-[14px] leading-6 text-[var(--color-text-primary)]">
          {content.text}
        </p>

        {hasContentImage && (
          <div className="relative h-[88px] w-[88px] overflow-hidden rounded-xl bg-[var(--color-surface-secondary)]">
            <Image
              src={displayImage}
              alt={authorNickname}
              width={88}
              height={88}
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-text-tertiary)]">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
          </svg>
          {story.viewCount}명 확인
        </span>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            timeRemaining.isExpiringSoon
              ? 'bg-[var(--color-secondary-light)] text-[var(--color-secondary)]'
              : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]'
          }`}
        >
          {timeRemaining.formatted}
        </span>
      </div>
    </article>
  );
}
