'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer, PageContent, PageHeader } from '@/components/layout';
import { ProfilePreview } from '@/components/profile/ProfilePreview';
import { Button, useToast } from '@/components/ui';
import { getMe } from '@/lib/api/profile';
import { useSafeBack } from '@/lib/navigation';
import type { User } from '@/lib/types';

function MyProfilePageContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const { goBack } = useSafeBack({ fallbackPath: '/my' });
  const [currentUser, setCurrentUser] = useState<User | null>(null);

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

  return (
    <PageContainer>
      <PageHeader
        title="내 프로필"
        showBack
        onBack={goBack}
        showBorder={false}
      />

      <PageContent className="pb-36" noPadding>
        {currentUser ? (
          <ProfilePreview user={currentUser} showEdit />
        ) : (
          <div className="px-[var(--page-padding-x)] py-20 text-center text-sm text-[var(--color-text-secondary)]">
            내 프로필을 불러오는 중이에요
          </div>
        )}

        <div className="px-[var(--page-padding-x)] pt-[var(--space-section)]">
          <Button variant="secondary" fullWidth size="lg" onClick={() => router.push('/my/ideal-type')}>
            이상형 키워드 수정
          </Button>
        </div>
      </PageContent>

      <div className="fixed bottom-[calc(var(--nav-height)+var(--spacing-safe-bottom)+28px)] right-4 z-40">
        <button
          type="button"
          onClick={() => router.push('/my/profile/edit')}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-like-active)] text-white shadow-[0_6px_14px_rgba(243,167,192,0.22)] transition-transform active:scale-95"
          aria-label="프로필 수정"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
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
