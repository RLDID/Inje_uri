'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { PLACEHOLDER_PROFILE_IMAGE } from '@/lib/constants';
import { getStoryTimeRemaining } from '@/lib/data';
import { buildCurrentPath, buildProfileDetailHref } from '@/lib/navigation';
import type { Story } from '@/lib/types';

interface StoryCardProps {
  story: Story;
}

export function StoryCard({ story }: StoryCardProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timeRemaining = getStoryTimeRemaining(story);
  const [imgError, setImgError] = useState(false);
  const imageSrc = imgError ? PLACEHOLDER_PROFILE_IMAGE : story.author.profileImages[0];
  const currentPath = buildCurrentPath(pathname, searchParams);

  if (timeRemaining.isExpired) {
    return null;
  }

  return (
    <Link
      href={buildProfileDetailHref(story.author.id, 'self-date', {
        sourcePath: currentPath,
        sourceSection: 'self-date',
        fallbackPath: currentPath,
      })}
    >
      <div className="flex w-20 snap-start flex-col items-center gap-2.5 transition-transform active:scale-95">
        <div
          className={`relative h-[76px] w-[76px] rounded-full p-[3px] shadow-sm ${
            timeRemaining.isExpiringSoon
              ? 'bg-gradient-to-tr from-orange-500 to-rose-500'
              : 'bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-secondary)]'
          }`}
        >
          <div className="h-full w-full overflow-hidden rounded-full bg-[var(--color-surface)] p-[2px]">
            <Image
              src={imageSrc}
              alt={story.author.nickname}
              width={68}
              height={68}
              className="h-full w-full rounded-full object-cover"
              onError={() => setImgError(true)}
            />
          </div>

          {timeRemaining.isExpiringSoon && (
            <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-white shadow-sm">
              {timeRemaining.minutes}분
            </div>
          )}
        </div>

        <span className="w-full truncate text-center text-xs font-medium text-[var(--color-text-secondary)]">
          {story.author.nickname}
        </span>
      </div>
    </Link>
  );
}

interface AddStoryButtonProps {
  hasActiveStory?: boolean;
}

export function AddStoryButton({ hasActiveStory = false }: AddStoryButtonProps) {
  return (
    <Link href="/self-date/create">
      <div className="flex w-20 snap-start flex-col items-center gap-2.5 transition-transform active:scale-95">
        <div
          className={`relative flex h-[76px] w-[76px] items-center justify-center rounded-full ${
            hasActiveStory
              ? 'bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-secondary)] p-[3px] shadow-sm'
              : 'bg-[var(--color-border)]'
          }`}
        >
          {hasActiveStory ? (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[var(--color-surface)] p-[2px]">
              <svg
                className="h-8 w-8 text-[var(--color-primary)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[var(--color-surface-secondary)]">
              <svg
                className="h-8 w-8 text-[var(--color-text-tertiary)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
          )}
        </div>

        <span className="w-full truncate text-center text-xs font-medium text-[var(--color-text-secondary)]">
          {hasActiveStory ? '내 스토리' : '스토리 추가'}
        </span>
      </div>
    </Link>
  );
}
