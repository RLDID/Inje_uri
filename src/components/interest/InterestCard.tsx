'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button, Card } from '@/components/ui';
import type { Interest } from '@/lib/types';
import { formatRelativeTime, getUserAcademicLabel } from '@/lib/utils';
import { PLACEHOLDER_PROFILE_IMAGE } from '@/lib/constants';

interface InterestCardProps {
  interest: Interest;
  canStartChat: boolean;
  onStartChat: () => void;
  onViewProfile: () => void;
  primaryActionLabel?: string;
  statusLabel?: string;
  statusDescription?: string;
}

export function InterestCard({
  interest,
  canStartChat,
  onStartChat,
  onViewProfile,
  primaryActionLabel,
  statusLabel,
  statusDescription,
}: InterestCardProps) {
  const { fromUser } = interest;
  const [imgError, setImgError] = useState(false);
  const imageSrc = imgError ? PLACEHOLDER_PROFILE_IMAGE : (fromUser.profileImages[0] || PLACEHOLDER_PROFILE_IMAGE);

  return (
    <Card variant="default" padding="lg">
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={onViewProfile}
          className="relative shrink-0 transition-transform active:scale-95"
          aria-label={`${fromUser.nickname} 프로필 보기`}
        >
          <div className="relative h-[72px] w-[72px] overflow-hidden rounded-[20px] bg-[var(--color-surface-secondary)] ring-1 ring-[var(--color-border-light)]">
            <Image src={imageSrc} alt={fromUser.nickname} fill className="object-cover" onError={() => setImgError(true)} />
          </div>
          {!interest.isRead && (
            <span className="absolute -top-1 -right-1 rounded-full bg-[var(--color-secondary)] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              NEW
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="content-stack-compact">
            <div className="meta-wrap">
              <span className="text-[15px] font-semibold text-[var(--color-text-primary)]">{fromUser.nickname}</span>
              {fromUser.isGraduate && (
                <span className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-secondary)]">
                  졸업생
                </span>
              )}
            </div>

            <p className="text-sm text-[var(--color-text-secondary)]">{getUserAcademicLabel(fromUser)}</p>

            {statusLabel && (
              <div className="chip-wrap">
                <span className="rounded-full bg-[var(--color-secondary-light)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-secondary)]">
                  {statusLabel}
                </span>
              </div>
            )}

            {interest.message && (
              <div className="section-card-muted px-3.5 py-3">
                <p className="line-clamp-2 text-sm leading-6 text-[var(--color-text-secondary)]">&ldquo;{interest.message}&rdquo;</p>
              </div>
            )}

            {statusDescription && (
              <p className="text-sm leading-6 text-[var(--color-text-secondary)]">{statusDescription}</p>
            )}

            <p className="text-xs text-[var(--color-text-tertiary)]">{formatRelativeTime(new Date(interest.createdAt))}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 action-stack">
        <Button
          variant={canStartChat ? 'primary' : 'secondary'}
          size="md"
          fullWidth
          onClick={onStartChat}
          disabled={!canStartChat}
        >
          {canStartChat ? (primaryActionLabel ?? '맞호감 보내기') : '응답 종료'}
        </Button>
        <Button variant="ghost" size="md" fullWidth onClick={onViewProfile}>
          프로필 보기
        </Button>
      </div>
    </Card>
  );
}
