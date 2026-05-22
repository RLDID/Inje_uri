'use client';

import { type TouchEvent, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { CategoryBadgeGroup } from '@/components/ui';
import { PLACEHOLDER_PROFILE_IMAGE } from '@/lib/constants';
import type { User } from '@/lib/types';
import {
  formatConversation,
  formatDateStyle,
  formatDrinking,
  formatLifestyle,
  formatSmoking,
  getKeywordLabel,
  getUserAcademicLabel,
} from '@/lib/utils';

type ProfileSource = 'recommendation' | 'interest' | 'self-date' | 'chat';

interface ProfilePreviewProps {
  user: User;
  showEdit?: boolean;
  source?: ProfileSource;
  onSendInterest?: () => void;
  isInterestSent?: boolean;
  isInterestDisabled?: boolean;
}

export function ProfilePreview({
  user,
  source,
  onSendInterest,
  isInterestSent = false,
  isInterestDisabled = false,
}: ProfilePreviewProps) {
  const showInterestButton = source === 'recommendation' && !!onSendInterest;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imageErrorIndexes, setImageErrorIndexes] = useState<Set<number>>(() => new Set());
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const imageList = useMemo(() => {
    const validImages = user.profileImages.filter((image) => image && image.trim() !== '');
    return validImages.length > 0 ? validImages : [PLACEHOLDER_PROFILE_IMAGE];
  }, [user.profileImages]);
  const safeActiveImageIndex = Math.min(activeImageIndex, imageList.length - 1);
  const activeImage = imageErrorIndexes.has(safeActiveImageIndex)
    ? PLACEHOLDER_PROFILE_IMAGE
    : imageList[safeActiveImageIndex];
  const goToProfileImage = (nextIndex: number) => {
    setActiveImageIndex(Math.max(0, Math.min(nextIndex, imageList.length - 1)));
  };
  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0].clientX;
    touchEndX.current = event.touches[0].clientX;
  };
  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    touchEndX.current = event.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > 45) {
      goToProfileImage(safeActiveImageIndex + (diff > 0 ? 1 : -1));
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  return (
    <div className="app-section-stack">
      <section className="overflow-hidden rounded-[24px] bg-[var(--color-surface)] shadow-[0_4px_12px_rgba(34,34,34,0.055)]">
        <div
          className="relative h-[360px] overflow-hidden bg-[var(--color-surface-secondary)]"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Image
            src={activeImage}
            alt={`${user.nickname} 프로필 이미지 ${safeActiveImageIndex + 1}`}
            fill
            priority
            sizes="(max-width: 430px) 100vw, 430px"
            className="object-cover"
            onError={() => {
              setImageErrorIndexes((prevIndexes) => {
                const nextIndexes = new Set(prevIndexes);
                nextIndexes.add(safeActiveImageIndex);
                return nextIndexes;
              });
            }}
          />

          {imageList.length > 1 && (
            <div className="absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
              {imageList.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => goToProfileImage(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === safeActiveImageIndex
                      ? 'w-5 bg-[var(--color-pink-cta)]'
                      : 'w-2 bg-white/80 shadow-[0_1px_3px_rgba(34,34,34,0.12)]'
                  }`}
                  aria-label={`프로필 이미지 ${index + 1} 보기`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="relative -mt-4 overflow-visible rounded-t-[24px] bg-[var(--color-surface)] px-5 pb-5 pt-5">
          <Image
            src="/brand/bear-hero-face2.png"
            alt=""
            width={96}
            height={96}
            className="pointer-events-none absolute right-6 top-8 z-0 h-24 w-24 rotate-[5deg] object-contain drop-shadow-[0_3px_5px_rgba(34,34,34,0.14)]"
            aria-hidden="true"
          />
        <div className="relative z-10 flex items-start justify-between gap-4 pr-20">
          <div className="min-w-0 flex-1">
            <div className="mobile-meta-stack">
              <div className="meta-wrap">
                <h2 className="text-[28px] font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
                  {user.nickname}
                </h2>
                {user.isGraduate && (
                  <span className="rounded-full bg-[var(--color-surface-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
                    졸업생
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">{getUserAcademicLabel(user)}</p>
            </div>
          </div>
        </div>

          {user.bio && (
            <div className="relative z-10 mt-5 rounded-[14px] border border-[var(--color-brand-pink)]/45 bg-[linear-gradient(100deg,#FFF8FA_0%,#FFF1F5_100%)] p-4">
              <p data-clarity-mask className="whitespace-pre-wrap text-sm leading-6 text-[var(--color-text-secondary)]">{user.bio}</p>
            </div>
          )}

          {showInterestButton && (
            <button
              type="button"
              onClick={onSendInterest}
              disabled={isInterestDisabled || isInterestSent}
              className={`relative z-10 mt-4 flex h-12 w-full items-center justify-center rounded-full text-[15px] font-semibold transition-transform active:scale-95 disabled:cursor-default ${
                isInterestSent
                  ? 'bg-[var(--color-brand-pink)] text-[var(--color-pink-cta)] opacity-70'
                  : isInterestDisabled
                    ? 'bg-[var(--color-surface-secondary)] text-[var(--color-text-tertiary)] opacity-70'
                    : 'bg-[var(--color-pink-cta)] text-white shadow-[0_3px_8px_rgba(243,167,192,0.24)]'
              }`}
              aria-label={isInterestSent ? 'Interest sent' : 'Send interest'}
            >
              <svg
                className="mr-2 h-5 w-5"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth={0}
                aria-hidden="true"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {isInterestSent ? '호감 보냄' : '호감 보내기'}
            </button>
          )}
        
          <section className="relative z-10 mt-6 border-t border-[var(--color-border-light)] pt-5">
        <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">저는 이런 사람이에요</h3>
        <div className="mt-4 space-y-3.5">
          {user.mbti && <CategoryBadgeGroup category="MBTI" items={[user.mbti]} variant="profilePink" size="md" layout="inline" />}
          {user.drinking && <CategoryBadgeGroup category="음주" items={[formatDrinking(user.drinking)]} variant="profileBlue" size="md" layout="inline" />}
          {user.smoking && <CategoryBadgeGroup category="흡연" items={[formatSmoking(user.smoking)]} variant="profileBlue" size="md" layout="inline" />}
          {user.lifestyle && <CategoryBadgeGroup category="라이프스타일" items={[formatLifestyle(user.lifestyle)]} variant="profileBlue" size="md" layout="inline" />}
          {user.conversationStyle && <CategoryBadgeGroup category="대화 스타일" items={[formatConversation(user.conversationStyle)]} variant="profileBlue" size="md" layout="inline" />}
          {user.personality.length > 0 && (
            <CategoryBadgeGroup
              category="성격"
              items={user.personality.map((personality) => getKeywordLabel('personality', personality))}
              variant="profileBlue"
              size="md"
              layout="inline"
            />
          )}
          {user.interests.length > 0 && (
            <CategoryBadgeGroup
              category="관심사"
              items={user.interests.map((interest) => getKeywordLabel('interests', interest))}
              variant="profileBlue"
              size="md"
              layout="inline"
            />
          )}
        </div>
      </section>

          <section className="relative z-10 mt-6 border-t border-[var(--color-border-light)] pt-5">
        <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">이런 만남을 원해요</h3>
        <div className="mt-4 space-y-3.5">
          {user.desiredVibe.length > 0 && (
            <CategoryBadgeGroup
              category="원하는 분위기"
              items={user.desiredVibe.map((vibe) => getKeywordLabel('desired_vibe', vibe))}
              variant="profilePink"
              size="md"
              layout="inline"
            />
          )}
          {user.dateStyle && (
            <CategoryBadgeGroup category="데이트 스타일" items={[formatDateStyle(user.dateStyle)]} variant="profileBlue" size="md" layout="inline" />
          )}
          {user.dealBreakers.length > 0 && (
            <CategoryBadgeGroup
              category="피하고 싶은 조건"
              items={user.dealBreakers.map((dealBreaker) => getKeywordLabel('deal_breakers', dealBreaker))}
              variant="profilePink"
              size="md"
              layout="inline"
            />
          )}
        </div>
      </section>
        </div>
      </section>
    </div>
  );
}
