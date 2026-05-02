'use client';

import { useRouter } from 'next/navigation';
import { Badge, Card, ImageCarousel } from '@/components/ui';
import { buildProfileDetailHref, useCurrentRouteContext } from '@/lib/navigation';
import type { User } from '@/lib/types';
import { getKeywordLabel, getUserAcademicLabel } from '@/lib/utils';

interface ProfileCardProps {
  user: User;
  source?: 'recommendation' | 'interest' | 'self-date';
  onPrev?: () => void;
  onNext?: () => void;
  onSelect?: () => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  isSelected?: boolean;
  isSelectable?: boolean;
  isSelectionMadeForOther?: boolean;
  currentIndex?: number;
  totalCount?: number;
}

export function ProfileCard({
  user,
  source = 'recommendation',
  onPrev,
  onNext,
  onSelect,
  canGoPrev = false,
  canGoNext = false,
  isSelected = false,
  isSelectable = false,
  isSelectionMadeForOther = false,
  currentIndex = 0,
  totalCount = 1,
}: ProfileCardProps) {
  const router = useRouter();
  const { currentPath, ownerSection } = useCurrentRouteContext();

  const interests = user.interests.slice(0, 3);

  const handleCardClick = () => {
    router.push(buildProfileDetailHref(user.id, source, {
      sourcePath: currentPath,
      sourceSection: ownerSection,
      fallbackPath: currentPath,
    }));
  };

  const handleArrowClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    direction: 'prev' | 'next',
  ) => {
    event.stopPropagation();
    event.preventDefault();

    if (direction === 'prev') {
      onPrev?.();
      return;
    }

    onNext?.();
  };

  const handleSelectClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    onSelect?.();
  };

  const selectButtonClassName = isSelected
    ? 'border-[var(--color-secondary)] bg-[var(--color-secondary)] text-white shadow-[0_12px_28px_rgba(242,130,129,0.28)]'
    : isSelectionMadeForOther
      ? 'border-white/40 bg-white/70 text-[var(--color-text-tertiary)] opacity-80 backdrop-blur-sm'
      : 'border-white/40 bg-white/90 text-[var(--color-secondary)] shadow-[0_12px_28px_rgba(15,23,42,0.16)] backdrop-blur-sm';
  const showCardNavigation = totalCount > 1 && !isSelected;

  return (
    <Card
      variant="elevated"
      padding="none"
      clickable
      className="relative overflow-hidden"
      onClick={handleCardClick}
    >
      <div className="relative">
        <ImageCarousel
          images={user.profileImages}
          aspectRatio="4/5"
          alt={`${user.nickname} profile`}
          showIndicators
          showCountBadge={false}
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {isSelectable && (
          <button
            type="button"
            onClick={handleSelectClick}
            disabled={isSelectionMadeForOther}
            aria-label={isSelected ? 'Selected profile' : 'Send interest'}
            aria-pressed={isSelected}
            className={`absolute bottom-4 right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full border transition-transform active:scale-95 disabled:cursor-default ${selectButtonClassName}`}
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill={isSelected ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={isSelected ? 0 : 2}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        )}

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-5 text-white">
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-bold tracking-tight">{user.nickname}</h3>
            {user.isGraduate && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium">
                졸업생
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-white/80">{getUserAcademicLabel(user)}</p>
        </div>
      </div>

      <div className="p-4 pb-5">
        <div className="flex flex-wrap gap-1.5">
          {user.mbti && <Badge variant="primary" size="sm">{user.mbti}</Badge>}
          {interests.map((interest) => (
            <Badge key={interest} variant="default" size="sm">
              {getKeywordLabel('interests', interest)}
            </Badge>
          ))}
        </div>

        {user.bio && (
          <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {user.bio}
          </p>
        )}

        {showCardNavigation && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={(event) => handleArrowClick(event, 'prev')}
              disabled={!canGoPrev}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] transition-transform active:scale-95 disabled:opacity-35"
              aria-label="Previous profile"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <div className="rounded-full bg-[var(--color-surface-secondary)] px-3.5 py-2 text-center">
              <p className="text-[14px] font-semibold leading-none text-[var(--color-text-primary)]">
                <span className="tabular-nums text-[var(--color-primary)]">{currentIndex + 1}</span>
                <span className="mx-1 text-[var(--color-text-tertiary)]">/</span>
                <span className="tabular-nums">{totalCount}</span>
                <span className="ml-1 text-[var(--color-text-secondary)]">번째</span>
              </p>
            </div>

            <button
              type="button"
              onClick={(event) => handleArrowClick(event, 'next')}
              disabled={!canGoNext}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] transition-transform active:scale-95 disabled:opacity-35"
              aria-label="Next profile"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
