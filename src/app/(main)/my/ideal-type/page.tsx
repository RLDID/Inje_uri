'use client';

import { Suspense, useState } from 'react';
import { PageContainer, PageContent, PageHeader } from '@/components/layout';
import { useToast } from '@/components/ui';
import { KeywordSelector, ProfileSection } from '@/components/profile/KeywordSelector';
import { PROFILE_CATEGORIES } from '@/lib/types';
import { currentUser } from '@/lib/data';
import { useSafeBack } from '@/lib/navigation';

function IdealTypePageContent() {
  const { showToast } = useToast();
  const { goBack } = useSafeBack();

  const [profile, setProfile] = useState({
    vibe: [...currentUser.desiredVibe],
    dateStyle: currentUser.dateStyle || '',
    dealBreakers: [...currentUser.dealBreakers],
  });

  const partnerCategories = PROFILE_CATEGORIES.filter((category) => category.belongsTo === 'desiredPartner');

  const handleCategoryChange = (categoryId: string, value: string | string[]) => {
    setProfile((prevProfile) => ({ ...prevProfile, [categoryId]: value }));
  };

  const handleSave = () => {
    showToast('이상형 키워드를 저장했어요.', 'success');
    goBack();
  };

  return (
    <PageContainer>
      <PageHeader
        title="이상형 키워드"
        subtitle="내 프로필 소개와 분리해서, 원하는 만남 분위기와 상대 취향만 따로 정리해요."
        showBack
        onBack={goBack}
      />

      <PageContent className="app-section-stack pb-36">
        <ProfileSection title="이런 만남을 원해요">
          {partnerCategories.map((category) => (
            <KeywordSelector
              key={category.id}
              category={category}
              selected={profile[category.id as keyof typeof profile] as string | string[]}
              onChange={(value) => handleCategoryChange(category.id, value)}
            />
          ))}
        </ProfileSection>
      </PageContent>

      <div className="fixed bottom-[calc(var(--nav-height)+var(--spacing-safe-bottom)+12px)] right-4 z-40">
        <button
          type="button"
          onClick={handleSave}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-lg transition-transform active:scale-95"
          aria-label="저장하기"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>
    </PageContainer>
  );
}

export default function IdealTypePage() {
  return (
    <Suspense fallback={<PageContainer><div /></PageContainer>}>
      <IdealTypePageContent />
    </Suspense>
  );
}
