'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui';
import { PLACEHOLDER_PROFILE_IMAGE } from '@/lib/constants';
import type { Interest } from '@/lib/types';
import { getUserAcademicLabel } from '@/lib/utils';

interface InterestPreviewCardProps {
  interest: Interest;
  onViewProfile: () => void;
}

function InterestPreviewCard({ interest, onViewProfile }: InterestPreviewCardProps) {
  const { fromUser } = interest;
  const [imgError, setImgError] = useState(false);
  const imageSrc =
    imgError ? PLACEHOLDER_PROFILE_IMAGE : (fromUser.profileImages[0] || PLACEHOLDER_PROFILE_IMAGE);

  return (
    <button
      type="button"
      onClick={onViewProfile}
      className="flex w-full items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left transition-colors hover:bg-[var(--color-surface-secondary)]"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
        <Image
          src={imageSrc}
          alt={fromUser.nickname}
          fill
          className="object-cover"
          onError={() => setImgError(true)}
        />
        {!interest.isRead && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-secondary)]" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="chip-wrap mb-0.5">
          <span className="font-medium text-[var(--color-text-primary)]">{fromUser.nickname}</span>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)]">{getUserAcademicLabel(fromUser)}</p>
      </div>

      <svg
        className="h-5 w-5 shrink-0 text-[var(--color-text-tertiary)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  );
}

interface InterestPreviewSectionProps {
  interests: Interest[];
  onViewProfile: (userId: string) => void;
}

export function InterestPreviewSection({ interests, onViewProfile }: InterestPreviewSectionProps) {
  const pendingInterests = interests.filter((interest) => interest.status === 'pending');
  const unreadCount = pendingInterests.filter((interest) => !interest.isRead).length;
  const previewInterests = pendingInterests.slice(0, 2);

  if (pendingInterests.length === 0) {
    return null;
  }

  return (
    <section className="content-stack">
      <div className="mobile-split-row items-center gap-3">
        <div className="chip-wrap">
          <h2 className="font-semibold text-[var(--color-text-primary)]">나를 좋아하는 사람</h2>
          {unreadCount > 0 && (
            <Badge variant="secondary" size="sm">
              {unreadCount}명
            </Badge>
          )}
        </div>

        <Link
          href="/interest"
          className="flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]"
        >
          전체 보기
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
      </div>

      <div className="content-stack-compact">
        {previewInterests.map((interest) => (
          <InterestPreviewCard
            key={interest.id}
            interest={interest}
            onViewProfile={() => onViewProfile(interest.fromUser.id)}
          />
        ))}
      </div>

      {pendingInterests.length > 2 && (
        <Link
          href="/interest"
          className="compact-note-muted justify-center rounded-2xl bg-[var(--color-surface-secondary)] px-4 py-3 text-center"
        >
          +{pendingInterests.length - 2}명 더 보기
        </Link>
      )}
    </section>
  );
}
