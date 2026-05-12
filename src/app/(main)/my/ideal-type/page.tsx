'use client';

import { Suspense, useEffect, useState } from 'react';
import { PageContainer, PageContent, PageHeader } from '@/components/layout';
import { useToast } from '@/components/ui';
import { KeywordSelector, ProfileSection } from '@/components/profile/KeywordSelector';
import {
  DESIRED_PARTNER_CATEGORY_CODES,
  PROFILE_CATEGORIES,
  type KeywordSelectionPayload,
} from '@/lib/types';
import { getMeProfileRaw, updateMe } from '@/lib/api/profile';
import { useSafeBack } from '@/lib/navigation';
import {
  buildKeywordSelection,
  getKeywordSelectionValues,
  getProfileKeywordSelections,
  mergeKeywordSelections,
} from '@/lib/utils/profileKeywordSelections';

function buildKeywordSelections(profile: {
  desired_vibe: string[];
  date_style: string;
  deal_breakers: string[];
}): KeywordSelectionPayload[] {
  return DESIRED_PARTNER_CATEGORY_CODES.map((categoryCode) => (
    buildKeywordSelection(categoryCode, profile[categoryCode])
  ));
}

function IdealTypePageContent() {
  const { showToast } = useToast();
  const { goBack } = useSafeBack();

  const [profile, setProfile] = useState({
    desired_vibe: [] as string[],
    date_style: '',
    deal_breakers: [] as string[],
  });
  const [originalKeywordSelections, setOriginalKeywordSelections] = useState<KeywordSelectionPayload[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      try {
        const rawProfile = await getMeProfileRaw();
        if (!cancelled) {
          const keywordSelections = getProfileKeywordSelections(rawProfile);
          setOriginalKeywordSelections(keywordSelections);
          setProfile({
            desired_vibe: getKeywordSelectionValues(keywordSelections, 'desired_vibe'),
            date_style: getKeywordSelectionValues(keywordSelections, 'date_style')[0] ?? '',
            deal_breakers: getKeywordSelectionValues(keywordSelections, 'deal_breakers'),
          });
        }
      } catch (error) {
        if (!cancelled) {
          showToast(error instanceof Error ? error.message : '이상형 설정을 불러오지 못했어요.', 'error');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadMe();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

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

  const handleSave = async () => {
    if (!originalKeywordSelections) {
      showToast('내 정보를 불러온 뒤 다시 시도해주세요.', 'error');
      return;
    }

    const { keywordSelections, missingCategoryCodes } = mergeKeywordSelections(
      originalKeywordSelections,
      buildKeywordSelections(profile),
    );

    if (!keywordSelections) {
      showToast(`기존 키워드 정보를 확인할 수 없어요: ${missingCategoryCodes.join(', ')}`, 'error');
      return;
    }

    try {
      await updateMe({
        keywordSelections,
      });
      showToast('이상형 키워드를 저장했어요.', 'success');
      goBack();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '이상형 키워드를 저장하지 못했어요.', 'error');
    }
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
          {isLoading ? (
            <div className="py-10 text-center text-sm text-[var(--color-text-secondary)]">
              이상형 설정을 불러오는 중이에요
            </div>
          ) : (
            partnerCategories.map((category) => (
              <KeywordSelector
                key={category.id}
                category={category}
                selected={profile[category.id as keyof typeof profile] as string | string[]}
                onChange={(value) => handleCategoryChange(category.id, value)}
              />
            ))
          )}
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
