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

  const partnerCategories = PROFILE_CATEGORIES
    .filter((category) => category.belongsTo === 'desiredPartner')
    .map((category) => ({
      ...category,
      options: category.options.map((option) => ({
        id: option.id,
        label: option.label,
      })),
    }));

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
        showBack
        onBack={goBack}
      />

      <PageContent className="app-section-stack pb-36">
        <ProfileSection title="이런 만남을 원해요" className="!border-0 !px-0 !shadow-none">
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

      <div className="fixed bottom-[calc(var(--nav-height)+var(--spacing-safe-bottom)+28px)] right-4 z-40">
        <button
          type="button"
          onClick={handleSave}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-like-active)] text-white shadow-[0_6px_14px_rgba(243,167,192,0.22)] transition-transform active:scale-95"
          aria-label="저장하기"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
