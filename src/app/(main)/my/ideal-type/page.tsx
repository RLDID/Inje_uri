'use client';

import { Suspense, useEffect, useState } from 'react';
import { PageContainer, PageContent, PageHeader } from '@/components/layout';
import { useToast } from '@/components/ui';
import { KeywordSelector, ProfileSection } from '@/components/profile/KeywordSelector';
import { PROFILE_CATEGORIES } from '@/lib/types';
import { currentUser } from '@/lib/data';
import { useSafeBack } from '@/lib/navigation';
import {
  buildKeywordCodeSelections,
  keywordSelectionsToPreferenceState,
  mergeKeywordCodeSelections,
  type UserKeywordSelectionGroup,
} from '@/lib/profile-keyword-selections';

interface CurrentUserResponse {
  success?: boolean;
  data?: {
    keywordSelections?: UserKeywordSelectionGroup[];
  };
  error?: {
    message?: string;
  };
}

type SaveIdealTypeResponse = CurrentUserResponse;

function IdealTypePageContent() {
  const { showToast } = useToast();
  const { goBack } = useSafeBack();

  const [profile, setProfile] = useState({
    vibe: [...currentUser.desiredVibe],
    dateStyle: currentUser.dateStyle || '',
    dealBreakers: [...currentUser.dealBreakers],
  });
  const [existingKeywordSelections, setExistingKeywordSelections] = useState<UserKeywordSelectionGroup[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const partnerCategories = PROFILE_CATEGORIES.filter((category) => category.belongsTo === 'desiredPartner');

  useEffect(() => {
    let isActive = true;

    fetch('/api/users/me')
      .then(async (response) => {
        const payload = await response.json() as CurrentUserResponse;
        if (!response.ok || !payload.success || !payload.data || !isActive) {
          return;
        }

        const preferences = keywordSelectionsToPreferenceState(payload.data.keywordSelections);
        setExistingKeywordSelections(payload.data.keywordSelections ?? []);
        setProfile((prevProfile) => ({
          ...prevProfile,
          ...preferences,
        }));
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, []);

  const handleCategoryChange = (categoryId: string, value: string | string[]) => {
    setProfile((prevProfile) => ({ ...prevProfile, [categoryId]: value }));
  };

  const handleSave = async () => {
    if (!existingKeywordSelections) {
      showToast('이상형 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.', 'error');
      return;
    }

    setIsSaving(true);

    try {
      const changedSelections = buildKeywordCodeSelections(profile, partnerCategories, { includeEmpty: true });
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywordSelections: mergeKeywordCodeSelections(existingKeywordSelections, changedSelections),
        }),
      });
      const payload = await response.json() as SaveIdealTypeResponse;

      if (!response.ok || !payload.success) {
        showToast(payload.error?.message ?? '이상형 저장에 실패했습니다.', 'error');
        return;
      }

      setExistingKeywordSelections(payload.data?.keywordSelections ?? existingKeywordSelections);
      showToast('이상형 키워드를 저장했어요.', 'success');
      goBack();
    } catch {
      showToast('이상형 저장 중 문제가 발생했습니다.', 'error');
    } finally {
      setIsSaving(false);
    }
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
          disabled={isSaving}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-lg transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-[var(--color-border)] disabled:text-[var(--color-text-tertiary)] disabled:shadow-none"
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
