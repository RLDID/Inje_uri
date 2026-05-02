'use client';

import { useState } from 'react';
import { CenteredModal } from '@/components/ui/BottomSheet';

export function RecommendationNotice() {
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowPolicyModal(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--color-border-light)] bg-[var(--color-surface)] px-3 text-[12px] font-medium text-[var(--color-text-secondary)] shadow-[0_4px_12px_rgba(15,23,42,0.03)] transition-colors hover:border-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-border-light))] hover:text-[var(--color-primary)]"
      >
        <svg className="h-3.5 w-3.5 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <span>추천 기준 보기</span>
      </button>

      <CenteredModal isOpen={showPolicyModal} onClose={() => setShowPolicyModal(false)}>
        <div className="p-6">
          <h3 className="text-center text-lg font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
            오늘의 추천 안내
          </h3>

          <div className="mt-5 content-stack-compact">
            <PolicyItem
              badge="3"
              title="매일 3명의 추천을 확인해요"
              description="추천을 천천히 둘러보고, 마음이 가는 한 사람에게만 호감을 보낼 수 있어요."
              tone="primary"
            />
            <PolicyItem
              icon={(
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              )}
              title="추천은 정해진 시간 동안 열려 있어요"
              description="오늘의 추천은 남은 시간 안에서만 확인할 수 있고, 시간이 지나면 새로운 추천으로 이어져요."
              tone="neutral"
            />
            <PolicyItem
              icon={(
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              )}
              title="호감이 이어지면 다음 흐름으로 연결돼요"
              description="서로 호감이면 받은 호감 목록에서 자연스럽게 다음 단계로 이어질 수 있어요."
              tone="secondary"
            />
          </div>
        </div>
      </CenteredModal>
    </>
  );
}

function PolicyItem({
  title,
  description,
  badge,
  icon,
  tone,
}: {
  title: string;
  description: string;
  badge?: string;
  icon?: React.ReactNode;
  tone: 'primary' | 'neutral' | 'secondary';
}) {
  const toneClass = {
    primary: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]',
    neutral: 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]',
    secondary: 'bg-[var(--color-secondary-light)] text-[var(--color-secondary)]',
  }[tone];

  return (
    <div className="section-card-muted flex items-start gap-3 p-4">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toneClass}`}>
        {badge ? <span className="text-sm font-bold">{badge}</span> : icon}
      </div>
      <div className="min-w-0">
        <p className="break-keep font-semibold text-[var(--color-text-primary)]">{title}</p>
        <p className="mt-1 break-keep text-sm leading-6 text-[var(--color-text-secondary)]">{description}</p>
      </div>
    </div>
  );
}
