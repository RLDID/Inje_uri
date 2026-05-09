'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer, PageContent, PageHeader } from '@/components/layout';
import { ProfilePreview } from '@/components/profile/ProfilePreview';
import { Button } from '@/components/ui';
import { currentUser } from '@/lib/data';
import { useSafeBack } from '@/lib/navigation';

function MyProfilePageContent() {
  const router = useRouter();
  const { goBack } = useSafeBack({ fallbackPath: '/my' });

  return (
    <PageContainer>
      <PageHeader
        title="내 프로필"
        showBack
        onBack={goBack}
        showBorder={false}
      />

      <PageContent className="pb-36" noPadding>
        <ProfilePreview user={currentUser} showEdit />

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
