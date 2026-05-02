'use client';

import { CategoryBadgeGroup, ImageCarousel } from '@/components/ui';
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

  return (
    <div className="app-section-stack">
      <div className="overflow-hidden rounded-[28px] border border-[var(--color-border-light)] bg-[var(--color-surface)] shadow-md">
        <ImageCarousel images={user.profileImages} aspectRatio="4/5" alt={`${user.nickname} profile`} showIndicators />
      </div>

      <section className="section-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mobile-meta-stack">
              <div className="meta-wrap">
                <h2 className="text-[28px] font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">{user.nickname}</h2>
                {user.isGraduate && (
                  <span className="rounded-full bg-[var(--color-surface-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
                    졸업생
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">{getUserAcademicLabel(user)}</p>
            </div>
          </div>

          {showInterestButton && (
            <button
              type="button"
              onClick={onSendInterest}
              disabled={isInterestDisabled || isInterestSent}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition-transform active:scale-95 ${
                isInterestSent
                  ? 'border-[var(--color-secondary)] bg-[var(--color-secondary)] text-white'
                  : isInterestDisabled
                    ? 'border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-tertiary)] opacity-60'
                    : 'border-[var(--color-secondary)]/20 bg-[var(--color-secondary-light)] text-[var(--color-secondary)] shadow-[0_8px_24px_rgba(242,130,129,0.18)]'
              }`}
              aria-label={isInterestSent ? 'Interest sent' : 'Send interest'}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill={isInterestSent ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={isInterestSent ? 0 : 2}
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          )}
        </div>

        {user.bio && (
          <div className="section-card-muted mt-5 p-4">
            <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--color-text-secondary)]">{user.bio}</p>
          </div>
        )}
      </section>

      <section className="section-card p-5">
        <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">저는 이런 사람이에요</h3>
        <div className="mt-4 content-stack-compact">
          {user.mbti && <CategoryBadgeGroup category="MBTI" items={[user.mbti]} variant="primary" size="md" />}
          {user.drinking && <CategoryBadgeGroup category="음주" items={[formatDrinking(user.drinking)]} variant="default" size="md" />}
          {user.smoking && <CategoryBadgeGroup category="흡연" items={[formatSmoking(user.smoking)]} variant="default" size="md" />}
          {user.lifestyle && <CategoryBadgeGroup category="라이프스타일" items={[formatLifestyle(user.lifestyle)]} variant="default" size="md" />}
          {user.conversationStyle && <CategoryBadgeGroup category="대화 스타일" items={[formatConversation(user.conversationStyle)]} variant="default" size="md" />}
          {user.personality.length > 0 && (
            <CategoryBadgeGroup
              category="성격"
              items={user.personality.map((personality) => getKeywordLabel('personality', personality))}
              variant="default"
              size="md"
            />
          )}
          {user.interests.length > 0 && (
            <CategoryBadgeGroup
              category="관심사"
              items={user.interests.map((interest) => getKeywordLabel('interests', interest))}
              variant="info"
              size="md"
            />
          )}
        </div>
      </section>

      <section className="section-card p-5">
        <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">이런 만남을 원해요</h3>
        <div className="mt-4 content-stack-compact">
          {user.desiredVibe.length > 0 && (
            <CategoryBadgeGroup
              category="원하는 분위기"
              items={user.desiredVibe.map((vibe) => getKeywordLabel('vibe', vibe))}
              variant="primary"
              size="md"
            />
          )}
          {user.dateStyle && (
            <CategoryBadgeGroup category="데이트 스타일" items={[formatDateStyle(user.dateStyle)]} variant="success" size="md" />
          )}
          {user.dealBreakers.length > 0 && (
            <CategoryBadgeGroup
              category="피하고 싶은 조건"
              items={user.dealBreakers.map((dealBreaker) => getKeywordLabel('dealBreakers', dealBreaker))}
              variant="error"
              size="md"
            />
          )}
        </div>
      </section>
    </div>
  );
}
