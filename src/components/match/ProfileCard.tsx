'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui';
import { PLACEHOLDER_PROFILE_IMAGE } from '@/lib/constants';
import { currentUser } from '@/lib/data';
import { buildProfileDetailHref, useCurrentRouteContext } from '@/lib/navigation';
import type { User } from '@/lib/types';
import { getKeywordLabel, getUserAcademicLabel } from '@/lib/utils';

const INTEREST_CHIP_GAP = 10;

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
  onNext,
  onSelect,
  isSelected = false,
  isSelectable = false,
  isSelectionMadeForOther = false,
  currentIndex = 0,
  totalCount = 1,
}: ProfileCardProps) {
  const router = useRouter();
  const { currentPath, ownerSection } = useCurrentRouteContext();

  const profileImage = user.profileImages[0] || PLACEHOLDER_PROFILE_IMAGE;
  const interestLabels = useMemo(
    () => user.interests.map((interest) => ({
      interest,
      label: getKeywordLabel('interests', interest),
    })),
    [user.interests],
  );
  const [visibleInterestCount, setVisibleInterestCount] = useState(() => Math.min(interestLabels.length, 4));
  const interestRowRef = useRef<HTMLDivElement>(null);
  const measureChipRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const measureMoreChipRef = useRef<HTMLSpanElement>(null);
  const displayedInterests = interestLabels.slice(0, visibleInterestCount);
  const hiddenInterestCount = Math.max(interestLabels.length - displayedInterests.length, 0);
  const commonInterests = user.interests.filter((interest) => currentUser.interests.includes(interest));
  const displayedCommonInterests = commonInterests.slice(0, 3);
  const pageCount = Math.min(Math.max(totalCount, 1), 3);
  const activePageIndex = Math.min(currentIndex, pageCount - 1);
  const hasMultipleProfiles = pageCount > 1;

  useEffect(() => {
    const row = interestRowRef.current;

    if (!row) {
      return;
    }

    const updateVisibleInterests = () => {
      const availableWidth = row.clientWidth;

      if (availableWidth <= 0) {
        return;
      }

      const chipWidths = interestLabels.map((_, index) => (
        measureChipRefs.current[index]?.offsetWidth ?? 0
      ));
      const moreChipWidth = measureMoreChipRef.current?.offsetWidth ?? 48;
      let usedWidth = 0;
      let nextVisibleCount = 0;

      for (let index = 0; index < chipWidths.length; index += 1) {
        const chipWidth = chipWidths[index];
        const widthWithGap = nextVisibleCount > 0 ? INTEREST_CHIP_GAP + chipWidth : chipWidth;
        const hiddenCountAfterThisChip = interestLabels.length - (index + 1);
        const reservedMoreWidth = hiddenCountAfterThisChip > 0
          ? INTEREST_CHIP_GAP + moreChipWidth
          : 0;

        if (usedWidth + widthWithGap + reservedMoreWidth > availableWidth) {
          break;
        }

        usedWidth += widthWithGap;
        nextVisibleCount += 1;
      }

      const safeVisibleCount = interestLabels.length > 0
        ? Math.max(1, nextVisibleCount)
        : 0;

      setVisibleInterestCount((prevCount) => (
        prevCount === safeVisibleCount ? prevCount : safeVisibleCount
      ));
    };

    updateVisibleInterests();

    const resizeObserver = new ResizeObserver(updateVisibleInterests);
    resizeObserver.observe(row);
    window.addEventListener('resize', updateVisibleInterests);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateVisibleInterests);
    };
  }, [interestLabels]);

  const handleCardClick = () => {
    router.push(buildProfileDetailHref(user.id, source, {
      sourcePath: currentPath,
      sourceSection: ownerSection,
      fallbackPath: currentPath,
    }));
  };

  const handleSelectClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();

    if (isSelected || isSelectionMadeForOther) {
      return;
    }

    onSelect?.();
  };

  const handleNextClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();

    onNext?.();
  };

  const selectButtonLabel = isSelected
    ? '하트를 보냈어요'
    : isSelectionMadeForOther
      ? '오늘은 선택 완료'
      : '하트 보내기';

  return (
    <Card
      variant="outline"
      padding="none"
      clickable
      className="relative w-full overflow-hidden rounded-[28px] border-white bg-white shadow-none"
      onClick={handleCardClick}
    >
      <div className="pb-6 pt-3">
        <div className="flex items-center gap-5">
          <div className="relative h-[140px] w-[140px] shrink-0 overflow-hidden rounded-full bg-[var(--color-surface-secondary)] ring-4 ring-white shadow-[0_5px_12px_rgba(34,34,34,0.08)]">
            <Image
              src={profileImage}
              alt={`${user.nickname} 프로필`}
              fill
              className="object-cover"
              sizes="140px"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[22px] font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
                {user.nickname}
              </h3>
              {user.isVerified && (
                <span
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5BAEF6] text-white shadow-sm"
                  aria-label="학교 인증"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m5 12 4 4 10-10" />
                  </svg>
                </span>
              )}
            </div>

            <p className="mt-1.5 truncate text-[14px] font-medium text-[var(--color-text-secondary)]">
              {getUserAcademicLabel(user)}
            </p>
            {user.mbti && (
              <div className="mt-2 flex">
                <span className="inline-flex h-7 items-center rounded-full bg-[var(--color-brand-pink)] px-3 text-[12px] font-semibold text-[var(--color-pink-cta)]">
                  {user.mbti}
                </span>
              </div>
            )}
          </div>
        </div>

        <div ref={interestRowRef} className="mt-4 flex min-h-9 flex-nowrap gap-2.5 overflow-hidden">
          {displayedInterests.map(({ interest, label }) => (
            <span
              key={interest}
              className="inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-full bg-[var(--color-surface-secondary)] px-4 py-1.5 text-[14px] font-medium text-[var(--color-text-secondary)]"
            >
              {label}
            </span>
          ))}
          {hiddenInterestCount > 0 && (
            <span className="inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-full bg-[var(--color-surface-secondary)] px-4 py-1.5 text-[14px] font-medium text-[var(--color-text-secondary)]">
              +{hiddenInterestCount}
            </span>
          )}
        </div>
        <div className="invisible pointer-events-none absolute -z-10 flex gap-2.5 whitespace-nowrap" aria-hidden="true">
          {interestLabels.map(({ interest, label }, index) => (
            <span
              key={interest}
              ref={(node) => {
                measureChipRefs.current[index] = node;
              }}
              className="inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-full px-4 py-1.5 text-[14px] font-medium"
            >
              {label}
            </span>
          ))}
          <span
            ref={measureMoreChipRef}
            className="inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-full px-4 py-1.5 text-[14px] font-medium"
          >
            +99
          </span>
        </div>

        <div className="mt-3 rounded-[18px] bg-[var(--color-chip-background)] px-5 py-4">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 text-[#5BAEF6]" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.8 14.9 8.7l6.5.95-4.7 4.58 1.1 6.47L12 17.65 6.2 20.7l1.1-6.47-4.7-4.58 6.5-.95L12 2.8Z" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                공통 관심사 {commonInterests.length}개
              </p>
              <p className="mt-1 truncate text-[14px] font-medium text-[var(--color-text-secondary)]">
                {displayedCommonInterests.length > 0
                  ? displayedCommonInterests.map((interest) => getKeywordLabel('interests', interest)).join(', ')
                  : '아직 겹치는 관심사가 없어요'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2.5" aria-label={`추천 ${activePageIndex + 1} / ${pageCount}`}>
          {Array.from({ length: pageCount }).map((_, index) => (
            <span
              key={index}
              className={`h-2.5 rounded-full transition-all ${
                index === activePageIndex
                  ? 'w-3 bg-[var(--color-pink-cta)]'
                  : 'w-2.5 bg-[var(--color-border)]'
              }`}
            />
          ))}
        </div>

        {isSelectable && (
          <>
            <button
              type="button"
              onClick={handleSelectClick}
              disabled={isSelected || isSelectionMadeForOther}
              className={`mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-[16px] text-[16px] font-semibold text-white transition-transform active:scale-[0.99] disabled:cursor-default ${
                isSelectionMadeForOther
                  ? 'bg-[var(--color-border)] text-[var(--color-text-muted)] shadow-none'
                  : isSelected
                    ? 'bg-[#e9799f] shadow-[0_4px_10px_rgba(233,121,159,0.28)]'
                    : 'bg-[var(--color-pink-cta)] shadow-[0_3px_7px_rgba(243,167,192,0.14)]'
              }`}
              aria-label={selectButtonLabel}
              aria-pressed={isSelected}
            >
              <svg className={`h-5 w-5 transition-transform ${isSelected ? 'scale-110 drop-shadow-[0_1px_2px_rgba(128,24,62,0.22)]' : ''}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {selectButtonLabel}
            </button>

            {hasMultipleProfiles && (
              <button
                type="button"
                onClick={handleNextClick}
                className="mt-3 flex min-h-9 w-full items-center justify-center gap-2 rounded-[12px] text-[14px] font-medium text-[var(--color-text-secondary)] transition-colors active:bg-[var(--color-chip-background)] hover:text-[var(--color-text-primary)]"
                aria-label="다음 사람 보기"
              >
                다음 사람 보기
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                  <path d="M21 3v6h-6" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
