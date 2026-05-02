'use client';

import { useCallback, useEffect } from 'react';
import { ProfileCard } from './ProfileCard';
import type { User } from '@/lib/types';

interface ProfileCardCarouselProps {
  users: User[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  selectedUserId?: string;
  isSelectionMade?: boolean;
  onSelect?: (userId: string) => void;
}

export function ProfileCardCarousel({
  users,
  currentIndex,
  onIndexChange,
  selectedUserId,
  isSelectionMade = false,
  onSelect,
}: ProfileCardCarouselProps) {
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
    if (canGoNext) {
      goToIndex(currentIndex + 1);
    }
  }, [canGoNext, currentIndex, goToIndex]);

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
    <div className="relative select-none">
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
      />
    </div>
  );
}
