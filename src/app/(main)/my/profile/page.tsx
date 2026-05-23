'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageContainer, PageContent, PageHeader } from '@/components/layout';
import { ProfilePreview } from '@/components/profile/ProfilePreview';
import { Button, useToast } from '@/components/ui';
import { getMe } from '@/lib/api/profile';
import { SECTION_ROOTS, useSafeBack } from '@/lib/navigation';
import type { User } from '@/lib/types';

function MyProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const isWaitingEntry = searchParams.get('waiting') === '1';
  const profileEditHref = isWaitingEntry
    ? `${SECTION_ROOTS.my}/profile/edit?waiting=1`
    : `${SECTION_ROOTS.my}/profile/edit`;
  const idealTypeHref = isWaitingEntry
    ? `${SECTION_ROOTS.my}/ideal-type?waiting=1`
    : `${SECTION_ROOTS.my}/ideal-type`;
  const { goBack } = useSafeBack({ fallbackPath: isWaitingEntry ? '/p/w8t2k' : SECTION_ROOTS.my });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showEditHint, setShowEditHint] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      try {
        const me = await getMe();
        if (!cancelled) {
          setCurrentUser(me);
        }
      } catch (error) {
        if (!cancelled) {
          showToast(error instanceof Error ? error.message : '내 프로필을 불러오지 못했어요.', 'error');
        }
      }
    }

    void loadMe();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setShowEditHint(false);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <PageContainer withBottomNav={!isWaitingEntry}>
      <PageHeader
        title="내 프로필"
        showBack
        onBack={goBack}
        showBorder={false}
      />

      <PageContent className={isWaitingEntry ? 'pb-28' : 'pb-36'} noPadding>
        {currentUser ? (
          <ProfilePreview user={currentUser} showEdit />
        ) : (
          <div className="px-[var(--page-padding-x)] py-20 text-center text-sm text-[var(--color-text-secondary)]">
            내 프로필을 불러오는 중이에요
          </div>
        )}

        <div className="px-[var(--page-padding-x)] pt-[var(--space-section)]">
          <Button variant="secondary" fullWidth size="lg" onClick={() => router.push(idealTypeHref)}>
            이상형 키워드 수정
          </Button>
        </div>
      </PageContent>

      <div className={`fixed right-4 z-40 ${isWaitingEntry ? 'bottom-[calc(var(--spacing-safe-bottom)+28px)]' : 'bottom-[calc(var(--nav-height)+var(--spacing-safe-bottom)+28px)]'}`}>
        <button
          type="button"
          onClick={() => router.push(profileEditHref)}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-like-active)] text-white shadow-[0_6px_14px_rgba(243,167,192,0.22)] transition-transform active:scale-95"
          aria-label="프로필 수정"
          aria-describedby="profile-edit-tooltip"
          title="프로필 수정"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          <span
            id="profile-edit-tooltip"
            role="tooltip"
            className={`pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-lg bg-[var(--color-text-primary)] px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${
              showEditHint ? 'opacity-100' : 'opacity-0'
            }`}
          >
            프로필 수정
          </span>
        </button>
      </div>
    </PageContainer>
  );
}

export default function MyProfilePage() {
  return (
    <Suspense fallback={<PageContainer><div /></PageContainer>}>
      <MyProfilePageContent />
    </Suspense>
  );
}
