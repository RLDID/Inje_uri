'use client';

import { useCallback, useEffect, useRef } from 'react';
import { ProfileCard } from './ProfileCard';
import type { User } from '@/lib/types';

interface ProfileCardCarouselProps {
  users: User[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  selectedUserId?: string;
  isSelectionMade?: boolean;
  onSelect?: (userId: string) => void;
  currentUserInterests?: string[];
  currentUserKeywords?: User['keywords'];
}

export function ProfileCardCarousel({
  users,
  currentIndex,
  onIndexChange,
  selectedUserId,
  isSelectionMade = false,
  onSelect,
  currentUserInterests = [],
  currentUserKeywords = [],
}: ProfileCardCarouselProps) {
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < users.length - 1;

  const goToIndex = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(users.length - 1, index));
    onIndexChange(clampedIndex);
  }, [users.length, onIndexChange]);

  const handlePrev = useCallback(() => {
    if (canGoPrev) {
      goToIndex(currentIndex - 1);
    }
  }, [canGoPrev, currentIndex, goToIndex]);

  const handleNext = useCallback(() => {
    if (users.length > 1) {
      goToIndex((currentIndex + 1) % users.length);
    }
  }, [currentIndex, goToIndex, users.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        handlePrev();
      } else if (event.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext]);

  const currentUser = users[currentIndex];

  if (!currentUser) {
    return null;
  }

  return (
    <div
      className="relative mx-auto w-full max-w-none select-none"
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStartXRef.current = touch.clientX;
        touchStartYRef.current = touch.clientY;
        suppressClickRef.current = false;
      }}
      onTouchEnd={(event) => {
        if (touchStartXRef.current === null || touchStartYRef.current === null) {
          return;
        }

        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - touchStartXRef.current;
        const deltaY = touch.clientY - touchStartYRef.current;
        touchStartXRef.current = null;
        touchStartYRef.current = null;

        if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) {
          return;
        }

        suppressClickRef.current = true;

        if (deltaX < 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }}
      onClickCapture={(event) => {
        if (!suppressClickRef.current) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        suppressClickRef.current = false;
      }}
    >
      <ProfileCard
        key={currentUser.id}
        user={currentUser}
        source="recommendation"
        onPrev={handlePrev}
        onNext={handleNext}
        onSelect={onSelect ? () => onSelect(currentUser.id) : undefined}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        isSelected={selectedUserId === currentUser.id}
        isSelectable={Boolean(onSelect)}
        isSelectionMadeForOther={Boolean(isSelectionMade && selectedUserId && selectedUserId !== currentUser.id)}
        currentIndex={currentIndex}
        totalCount={users.length}
        currentUserInterests={currentUserInterests}
        currentUserKeywords={currentUserKeywords}
      />
    </div>
  );
}
