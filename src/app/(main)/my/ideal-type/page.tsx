'use client';

import { Suspense, useEffect, useState } from 'react';
import { PageContainer, PageContent, PageHeader } from '@/components/layout';
import { useToast } from '@/components/ui';
import { KeywordSelector, ProfileSection } from '@/components/profile/KeywordSelector';
import { PROFILE_CATEGORIES, type User } from '@/lib/types';
import { getMe, updateMe } from '@/lib/api/profile';
import { useSafeBack } from '@/lib/navigation';

type KeywordSelectionPayload = {
  categoryCode: string;
  keywordCodes: string[];
};

function toKeywordCodes(value: string | string[] | null | undefined, lowercase = false): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.map((keywordCode) => (lowercase ? keywordCode.toLowerCase() : keywordCode));
}

function buildKeywordSelections(user: User, profile: {
  vibe: string[];
  dateStyle: string;
  dealBreakers: string[];
}): KeywordSelectionPayload[] {
  return [
    { categoryCode: 'lifestyle', keywordCodes: toKeywordCodes(user.lifestyle) },
    { categoryCode: 'drinking', keywordCodes: toKeywordCodes(user.drinking) },
    { categoryCode: 'smoking', keywordCodes: toKeywordCodes(user.smoking) },
    { categoryCode: 'mbti', keywordCodes: toKeywordCodes(user.mbti, true) },
    { categoryCode: 'personality', keywordCodes: toKeywordCodes(user.personality) },
    { categoryCode: 'conversation', keywordCodes: toKeywordCodes(user.conversationStyle) },
    { categoryCode: 'interests', keywordCodes: toKeywordCodes(user.interests) },
    { categoryCode: 'desired_vibe', keywordCodes: toKeywordCodes(profile.vibe) },
    { categoryCode: 'date_style', keywordCodes: toKeywordCodes(profile.dateStyle) },
    { categoryCode: 'deal_breakers', keywordCodes: toKeywordCodes(profile.dealBreakers) },
  ];
}

function IdealTypePageContent() {
  const { showToast } = useToast();
  const { goBack } = useSafeBack();

  const [profile, setProfile] = useState({
    vibe: [] as string[],
    dateStyle: '',
    dealBreakers: [] as string[],
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      try {
        const me = await getMe();
        if (!cancelled) {
          setCurrentUser(me);
          setProfile({
            vibe: [...me.desiredVibe],
            dateStyle: me.dateStyle || '',
            dealBreakers: [...me.dealBreakers],
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
    if (!currentUser) {
      showToast('내 정보를 불러온 뒤 다시 시도해주세요.', 'error');
      return;
    }

    try {
      await updateMe({
        keywordSelections: buildKeywordSelections(currentUser, profile),
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
