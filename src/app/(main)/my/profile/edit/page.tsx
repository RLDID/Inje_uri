'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PageContainer, PageHeader, PageContent } from '@/components/layout';
import { KeywordSelector, ProfileSection } from '@/components/profile/KeywordSelector';
import { useToast } from '@/components/ui';
import { PROFILE_CATEGORIES } from '@/lib/types';
import { currentUser } from '@/lib/data';
import { PLACEHOLDER_PROFILE_IMAGE } from '@/lib/constants';
import { useSafeBack } from '@/lib/navigation';

function EditProfilePageContent() {
  const { showToast } = useToast();
  const { goBack } = useSafeBack({ fallbackPath: '/my/profile' });

  const [photos, setPhotos] = useState<string[]>(
    currentUser.profileImages?.length > 0 ? currentUser.profileImages : [],
  );
  const [brokenPhotoIndices, setBrokenPhotoIndices] = useState<number[]>([]);
  const [profile, setProfile] = useState({
    lifestyle: currentUser.lifestyle || '',
    drinking: currentUser.drinking || '',
    smoking: currentUser.smoking || '',
    mbti: currentUser.mbti || '',
    personality: [...currentUser.personality],
    conversation: currentUser.conversationStyle || '',
    interests: [...currentUser.interests],
    bio: currentUser.bio || '',
  });

  const handleCategoryChange = (categoryId: string, value: string | string[]) => {
    setProfile((prevProfile) => ({ ...prevProfile, [categoryId]: value }));
  };

  const handleAddPhoto = (index: number) => {
    setPhotos((prevPhotos) => {
      const nextPhotos = [...prevPhotos];
      nextPhotos[index] = `https://picsum.photos/seed/${Date.now()}-${index}/400/500`;
      return nextPhotos;
    });
    setBrokenPhotoIndices((prevIndices) => prevIndices.filter((photoIndex) => photoIndex !== index));
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prevPhotos) => prevPhotos.filter((_, photoIndex) => photoIndex !== index));
    setBrokenPhotoIndices([]);
  };

  const handlePhotoError = (index: number) => {
    setBrokenPhotoIndices((prevIndices) => (
      prevIndices.includes(index) ? prevIndices : [...prevIndices, index]
    ));
  };

  const hasMinPhotos = photos.length >= 1;

  const handleSave = () => {
    if (!hasMinPhotos) {
      showToast('프로필 사진은 1장 이상 등록해주세요.', 'error');
      return;
    }

    showToast('프로필 소개를 업데이트했어요.', 'success');
    goBack();
  };

  const aboutMeCategories = PROFILE_CATEGORIES.filter((category) => category.belongsTo === 'aboutMe');

  return (
    <PageContainer withBottomNav={false}>
      <PageHeader
        title="프로필 수정"
        subtitle="이 화면에서는 나를 소개하는 정보만 가볍게 정리해요."
        showBack
        onBack={goBack}
      />

      <PageContent className="app-section-stack pb-36">
        <ProfileSection
          id="profile-photos"
          title="프로필 사진"
          description="대표 사진은 가장 먼저 보이는 정보예요. 너무 많은 설명보다 사진 한 장의 첫 인상이 더 중요해요."
          required
        >
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div
                key={index}
                className="relative aspect-[4/5] overflow-hidden rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-secondary)]"
              >
                {photos[index] ? (
                  <>
                    <Image
                      src={brokenPhotoIndices.includes(index) ? PLACEHOLDER_PROFILE_IMAGE : photos[index]}
                      alt={`프로필 사진 ${index + 1}`}
                      fill
                      className="object-cover"
                      onError={() => handlePhotoError(index)}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50"
                      aria-label={`프로필 사진 ${index + 1} 제거`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                    {index === 0 && (
                      <span className="absolute bottom-1.5 left-1.5 rounded-md bg-[var(--color-primary)] px-2 py-0.5 text-xs font-medium text-white">
                        대표
                      </span>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAddPhoto(index)}
                    className="flex h-full w-full flex-col items-center justify-center gap-1 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-surface-secondary)]"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    {index === 0 && <span className="text-xs">필수</span>}
                  </button>
                )}
              </div>
            ))}
          </div>
          {!hasMinPhotos && (
            <p className="text-xs text-[var(--color-secondary)]">
              프로필 사진은 1장 이상 등록해야 저장할 수 있어요.
            </p>
          )}
        </ProfileSection>

        <ProfileSection
          title="나는 이런 사람이에요"
          description="메인 화면에서 다 보여주지 않기 때문에 소개와 키워드만 깔끔하게 정리해도 충분해요."
        >
          <div className="space-y-2">
            <textarea
              value={profile.bio}
              onChange={(event) => setProfile((prevProfile) => ({ ...prevProfile, bio: event.target.value }))}
              placeholder="예: 여유로운 카페를 좋아하고, 편하게 대화하는 시간을 좋아해요."
              maxLength={100}
              rows={3}
              className="w-full resize-none rounded-xl bg-[var(--color-surface-secondary)] px-4 py-3 text-base leading-6 placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
            />
            <p className="text-right text-xs text-[var(--color-text-tertiary)]">{profile.bio.length}/100</p>
          </div>

          {aboutMeCategories.map((category) => (
            <KeywordSelector
              key={category.id}
              category={category}
              selected={profile[category.id as keyof typeof profile] as string | string[]}
              onChange={(value) => handleCategoryChange(category.id, value)}
            />
          ))}
        </ProfileSection>

        <div className="section-card-muted rounded-2xl p-4">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">다른 설정은 따로 관리해요</p>
          <div className="mt-3 action-stack text-sm text-[var(--color-text-secondary)]">
            <Link href="/my/ideal-type" className="flex items-center justify-between rounded-xl bg-white px-4 py-3">
              <span>이상형 키워드 수정하기</span>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
            <Link href="/my/settings" className="flex items-center justify-between rounded-xl bg-white px-4 py-3">
              <span>추천 설정 보기</span>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          </div>
        </div>
      </PageContent>

      <div className="fixed bottom-[calc(var(--nav-height)+var(--spacing-safe-bottom)+12px)] right-4 z-40">
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasMinPhotos}
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

export default function EditProfilePage() {
  return (
    <Suspense fallback={<PageContainer><div /></PageContainer>}>
      <EditProfilePageContent />
    </Suspense>
  );
}
