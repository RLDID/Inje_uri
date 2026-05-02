'use client';

import { Suspense } from 'react';
import { PageContainer } from '@/components/layout';
import { MyStoriesView } from '@/components/self-date/MyStoriesView';
import { useSafeBack } from '@/lib/navigation';

function MyPostsPageContent() {
  const { goBack } = useSafeBack({ fallbackPath: '/my' });

  return (
    <MyStoriesView
      ownerSection="my"
      title="내 피드"
      subtitle="작성한 피드와 보낸 반응을 함께 확인하세요"
      onBack={goBack}
    />
  );
}

export default function MyPostsPage() {
  return (
    <Suspense fallback={<PageContainer><div /></PageContainer>}>
      <MyPostsPageContent />
    </Suspense>
  );
}
