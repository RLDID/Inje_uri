'use client';

import { Suspense } from 'react';
import { PageContainer } from '@/components/layout';
import { MyStoriesView } from '@/components/self-date/MyStoriesView';
import { useSafeBack } from '@/lib/navigation';

function SelfDateMyStoriesPageContent() {
  const { goBack } = useSafeBack({ fallbackPath: '/self-date' });

  return (
    <MyStoriesView
      ownerSection="self-date"
      title="내 피드"
      subtitle="작성한 피드와 보낸 반응을 함께 확인해요"
      onBack={goBack}
    />
  );
}

export default function SelfDateMyStoriesPage() {
  return (
    <Suspense fallback={<PageContainer><div /></PageContainer>}>
      <SelfDateMyStoriesPageContent />
    </Suspense>
  );
}
