'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui';
import type { Interest } from '@/lib/types';
import { formatRelativeTime, getUserAcademicLabel } from '@/lib/utils';
import { PLACEHOLDER_PROFILE_IMAGE } from '@/lib/constants';

const NEW_INTEREST_BADGE_VISIBLE_MS = 1000 * 60 * 60 * 24;

interface InterestCardProps {
  interest: Interest;
  canStartChat: boolean;
  onStartChat: () => void;
  onViewProfile: () => void;
  onSkip?: () => void;
  nowMs?: number;
}

export function InterestCard({
  interest,
  canStartChat,
  onStartChat,
  onViewProfile,
  onSkip,
  nowMs,
}: InterestCardProps) {
  const { fromUser } = interest;
  const [imgError, setImgError] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const imageSrc = imgError ? PLACEHOLDER_PROFILE_IMAGE : (fromUser.profileImages[0] || PLACEHOLDER_PROFILE_IMAGE);
  const showNewBadge = interest.status === 'pending'
    && nowMs !== undefined
    && nowMs - interest.createdAt.getTime() < NEW_INTEREST_BADGE_VISIBLE_MS;

  return (
    <Card
      variant="default"
      padding="lg"
      clickable
      role="button"
      tabIndex={0}
      onClick={onViewProfile}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onViewProfile();
        }
      }}
      className={`relative border-0 ${
        showNewBadge
          ? 'shadow-[0_4px_12px_rgba(243,167,192,0.34)]'
          : 'shadow-[0_4px_12px_rgba(34,34,34,0.055)]'
      }`}
    >
      {onSkip && (
        <div className="absolute right-3 top-3 z-20">
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setIsMenuOpen((isOpen) => !isOpen);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors active:bg-[var(--color-chip-background)]"
            aria-label="호감 카드 옵션"
            aria-expanded={isMenuOpen}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="19" cy="12" r="1.8" />
            </svg>
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-10 w-36 overflow-hidden rounded-[16px] bg-white shadow-[0_6px_16px_rgba(34,34,34,0.12)] ring-1 ring-[var(--color-border-light)]">
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsMenuOpen(false);
                  onSkip();
                }}
                className="w-full px-4 py-3 text-left text-[13px] font-semibold text-[var(--color-text-secondary)] active:bg-[var(--color-chip-background)]"
              >
                하트 거절하기
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <div className="relative h-[72px] w-[72px] overflow-hidden rounded-full bg-[var(--color-surface-secondary)] ring-4 ring-white shadow-[0_5px_12px_rgba(34,34,34,0.08)]">
            <Image
              src={imageSrc}
              alt={fromUser.nickname}
              fill
              className="object-cover"
              onError={() => setImgError(true)}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1 pr-8">
          <div className="content-stack-compact">
            <div className="meta-wrap">
              <span className="text-[18px] font-semibold leading-6 text-[var(--color-text-primary)]">{fromUser.nickname}</span>
              {showNewBadge && (
                <span className="rounded-full bg-[var(--color-brand-pink)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-pink-cta)]">
                  새 호감
                </span>
              )}
              {fromUser.isGraduate && (
                <span className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-secondary)]">
                  졸업생
                </span>
              )}
            </div>

            <p className="text-sm text-[var(--color-text-secondary)]">{getUserAcademicLabel(fromUser)}</p>
            <p className="text-xs text-[var(--color-text-tertiary)]">{formatRelativeTime(new Date(interest.createdAt))}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 action-stack">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onStartChat();
          }}
          disabled={!canStartChat}
          className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-[16px] text-[16px] font-semibold text-white shadow-[0_3px_7px_rgba(243,167,192,0.14)] transition-transform active:scale-[0.99] disabled:cursor-default disabled:shadow-none ${
            canStartChat
              ? 'bg-[var(--color-pink-cta)]'
              : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'
          }`}
        >
          {canStartChat && (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          )}
          {canStartChat ? '채팅 시작하기' : '응답 종료'}
        </button>
      </div>
    </Card>
  );
}
