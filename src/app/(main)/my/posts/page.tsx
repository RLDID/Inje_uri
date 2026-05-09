'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { MyStoriesView } from '@/components/self-date/MyStoriesView';
import { useSafeBack } from '@/lib/navigation';

function MyPostsPageContent() {
  const { goBack } = useSafeBack({ fallbackPath: '/my' });
  const searchParams = useSearchParams();
  const isLikedTab = searchParams.get('tab') === 'liked';

  return (
    <MyStoriesView
      ownerSection="my"
      title={isLikedTab ? '좋아요한 피드' : '내 피드'}
      onBack={goBack}
      showTabs={false}
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
