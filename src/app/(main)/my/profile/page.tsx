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
      />

      <PageContent className="app-section-stack pb-36">
        <ProfilePreview user={currentUser} showEdit />

        <Button variant="secondary" fullWidth size="lg" onClick={() => router.push('/my/ideal-type')}>
          이상형 키워드 수정
        </Button>
      </PageContent>

      <div className="fixed bottom-[calc(var(--nav-height)+var(--spacing-safe-bottom)+12px)] right-4 z-40">
        <button
          type="button"
          onClick={() => router.push('/my/profile/edit')}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-lg transition-transform active:scale-95"
          aria-label="프로필 수정"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
