'use client';

import { Suspense, useEffect, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { PageContainer, PageHeader, PageContent } from '@/components/layout';
import { KeywordSelector, ProfileSection } from '@/components/profile/KeywordSelector';
import { BottomSheet, useToast } from '@/components/ui';
import {
  ABOUT_ME_CATEGORY_CODES,
  PROFILE_CATEGORIES,
  type KeywordSelectionPayload,
} from '@/lib/types';
import { mapUserProfileToUser } from '@/lib/api/mappers';
import { deleteMyProfileImage, getMeProfileRaw, updateMe, uploadMyProfileImage } from '@/lib/api/profile';
import { PLACEHOLDER_PROFILE_IMAGE } from '@/lib/constants';
import { SECTION_ROOTS, useSafeBack } from '@/lib/navigation';
import {
  buildKeywordSelection,
  getKeywordSelectionValues,
  getProfileKeywordSelections,
  mergeKeywordSelections,
} from '@/lib/utils/profileKeywordSelections';

function buildKeywordSelections(profile: {
  lifestyle: string;
  drinking: string;
  smoking: string;
  mbti: string;
  personality: string[];
  conversation: string;
  interests: string[];
}): KeywordSelectionPayload[] {
  return ABOUT_ME_CATEGORY_CODES.map((categoryCode) => (
    buildKeywordSelection(categoryCode, profile[categoryCode])
  ));
}

function EditProfilePageContent() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const isWaitingEntry = searchParams.get('waiting') === '1';
  const { goBack } = useSafeBack({
    fallbackPath: isWaitingEntry ? `${SECTION_ROOTS.my}/profile?waiting=1` : `${SECTION_ROOTS.my}/profile`,
  });
  const idealTypeHref = isWaitingEntry
    ? `${SECTION_ROOTS.my}/ideal-type?waiting=1`
    : `${SECTION_ROOTS.my}/ideal-type`;
  const recommendationSettingsHref = `${SECTION_ROOTS.my}/settings`;

  const [photos, setPhotos] = useState<string[]>([]);
  const [photoIds, setPhotoIds] = useState<Array<string | undefined>>([]);
  const [pendingPhotoFiles, setPendingPhotoFiles] = useState<Record<string, File>>({});
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([]);
  const [brokenPhotoIndices, setBrokenPhotoIndices] = useState<number[]>([]);
  const [photoTargetIndex, setPhotoTargetIndex] = useState<number | null>(null);
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState<number | null>(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const [originalKeywordSelections, setOriginalKeywordSelections] = useState<KeywordSelectionPayload[] | null>(null);
  const [profile, setProfile] = useState({
    lifestyle: '',
    drinking: '',
    smoking: '',
    mbti: '',
    personality: [] as string[],
    conversation: '',
    interests: [] as string[],
    bio: '',
  });

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      try {
        const rawProfile = await getMeProfileRaw();
        if (cancelled) {
          return;
        }

        const me = mapUserProfileToUser(rawProfile);
        const keywordSelections = getProfileKeywordSelections(rawProfile);
        const imageMetas = me.profileImageMetas ?? me.profileImages.map((imageUrl, index) => ({
          id: undefined,
          imageUrl,
          sortOrder: index + 1,
        }));

        setOriginalKeywordSelections(keywordSelections);
        setPhotos(imageMetas.map((image) => image.imageUrl));
        setPhotoIds(imageMetas.map((image) => image.id));
        setProfile({
          lifestyle: getKeywordSelectionValues(keywordSelections, 'lifestyle')[0] ?? '',
          drinking: getKeywordSelectionValues(keywordSelections, 'drinking')[0] ?? '',
          smoking: getKeywordSelectionValues(keywordSelections, 'smoking')[0] ?? '',
          mbti: getKeywordSelectionValues(keywordSelections, 'mbti')[0] ?? '',
          personality: getKeywordSelectionValues(keywordSelections, 'personality'),
          conversation: getKeywordSelectionValues(keywordSelections, 'conversation')[0] ?? '',
          interests: getKeywordSelectionValues(keywordSelections, 'interests'),
          bio: me.bio || '',
        });
      } catch (error) {
        if (!cancelled) {
          showToast(error instanceof Error ? error.message : '프로필을 불러오지 못했어요.', 'error');
        }
      }
    }

    void loadMe();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const handleCategoryChange = (categoryId: string, value: string | string[]) => {
    const isEmptySelection = Array.isArray(value) ? value.length === 0 : value.length === 0;

    if (isEmptySelection) {
      showToast('키워드는 한 개 이상 선택해야 해요.', 'error');
      return;
    }

    setProfile((prevProfile) => ({ ...prevProfile, [categoryId]: value }));
  };

  const applyPhoto = (index: number, src: string) => {
    const replacedImageId = photoIds[index];
    if (replacedImageId) {
      setDeletedPhotoIds((prevIds) => Array.from(new Set([...prevIds, replacedImageId])));
    }

    setPhotos((prevPhotos) => {
      const nextPhotos = [...prevPhotos];
      nextPhotos[index] = src;
      return nextPhotos;
    });
    setPhotoIds((prevIds) => {
      const nextIds = [...prevIds];
      nextIds[index] = undefined;
      return nextIds;
    });
    setBrokenPhotoIndices((prevIndices) => prevIndices.filter((photoIndex) => photoIndex !== index));
  };

  const handleAddPhoto = (index: number) => {
    setPhotoTargetIndex(index);
    setShowPhotoOptions(true);
  };

  const handlePhotoSourceSelect = (source: 'camera' | 'library') => {
    setShowPhotoOptions(false);

    if (source === 'camera') {
      cameraInputRef.current?.click();
      return;
    }

    libraryInputRef.current?.click();
  };

  const handlePhotoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const targetIndex = photoTargetIndex;
    event.target.value = '';

    if (!file || targetIndex === null) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return;
      }

      applyPhoto(targetIndex, reader.result);
      setPendingPhotoFiles((prevFiles) => ({ ...prevFiles, [reader.result as string]: file }));
      setPhotoTargetIndex(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (index: number) => {
    const removedImageId = photoIds[index];
    if (removedImageId) {
      setDeletedPhotoIds((prevIds) => Array.from(new Set([...prevIds, removedImageId])));
    }

    setPhotos((prevPhotos) => prevPhotos.filter((_, photoIndex) => photoIndex !== index));
    setPhotoIds((prevIds) => prevIds.filter((_, photoIndex) => photoIndex !== index));
    setBrokenPhotoIndices([]);
    setPreviewPhotoIndex((currentIndex) => {
      if (currentIndex === null) {
        return null;
      }
      if (currentIndex === index) {
        return null;
      }
      return currentIndex > index ? currentIndex - 1 : currentIndex;
    });
  };

  const handlePhotoError = (index: number) => {
    setBrokenPhotoIndices((prevIndices) => (
      prevIndices.includes(index) ? prevIndices : [...prevIndices, index]
    ));
  };

  const hasMinPhotos = photos.length >= 1;
  const aboutMeCategories = PROFILE_CATEGORIES
    .filter((category) => category.belongsTo === 'aboutMe')
    .map((category) => ({
      ...category,
      options: category.options.map((option) => ({
        id: option.id,
        label: option.label,
      })),
    }));
  const hasRequiredKeywords = aboutMeCategories.every((category) => {
    const selected = profile[category.id as keyof typeof profile];
    return Array.isArray(selected) ? selected.length > 0 : Boolean(selected);
  });
  const hasBio = profile.bio.trim().length > 0;
  const previewPhoto = previewPhotoIndex !== null ? photos[previewPhotoIndex] : null;

  const handleSave = async () => {
    if (!hasMinPhotos) {
      showToast('프로필 사진은 1장 이상 등록해주세요.', 'error');
      return;
    }

    if (!hasRequiredKeywords) {
      showToast('키워드는 한 개 이상 선택해야 해요.', 'error');
      return;
    }

    const trimmedBio = profile.bio.trim();
    if (!trimmedBio) {
      showToast('자기소개를 입력해주세요.', 'error');
      return;
    }

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
        profile: { bio: trimmedBio },
        keywordSelections,
      });

      for (const imageId of deletedPhotoIds) {
        await deleteMyProfileImage(imageId);
      }

      for (const [index, src] of photos.entries()) {
        const file = pendingPhotoFiles[src];
        if (file) {
          await uploadMyProfileImage(file, index === 0);
        }
      }

      showToast('프로필 소개를 업데이트했어요.', 'success');
      goBack();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '프로필을 저장하지 못했어요.', 'error');
    }
  };

  return (
    <PageContainer withBottomNav={false}>
      <PageHeader
        title="프로필 수정"
        showBack
        onBack={goBack}
      />

      <PageContent className="app-section-stack pb-36">
        <ProfileSection
          id="profile-photos"
          title="프로필 사진"
          description="나를 가장 잘 나타낼 수 있는 사진을 올려보세요."
          required
          className="!border-0 !px-0 !shadow-none"
        >
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div
                key={index}
                className="relative aspect-[4/5] overflow-hidden rounded-xl bg-[var(--color-surface-secondary)]"
              >
                {photos[index] ? (
                  <>
                    <Image
                      src={brokenPhotoIndices.includes(index) ? PLACEHOLDER_PROFILE_IMAGE : photos[index]}
                      alt={`프로필 사진 ${index + 1}`}
                      fill
                      sizes="33vw"
                      unoptimized={photos[index]?.startsWith('data:')}
                      className="object-cover"
                      onError={() => handlePhotoError(index)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!brokenPhotoIndices.includes(index)) {
                          setPreviewPhotoIndex(index);
                        }
                      }}
                      className="absolute inset-0"
                      aria-label={`프로필 사진 ${index + 1} 크게 보기`}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/50"
                      aria-label={`프로필 사진 ${index + 1} 제거`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                    {index === 0 && (
                      <span className="absolute bottom-1.5 left-1.5 z-10 rounded-md bg-[var(--color-action-primary)] px-2 py-0.5 text-xs font-medium text-[var(--color-action-primary-text)]">
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
            <p className="text-xs text-[var(--color-text-secondary)]">
              프로필 사진은 1장 이상 등록해야 저장할 수 있어요.
            </p>
          )}
        </ProfileSection>

        <ProfileSection
          title="나는 이런 사람이에요"
          className="!border-0 !px-0 !shadow-none"
        >
          <div className="space-y-2">
            <textarea
              data-clarity-mask
              value={profile.bio}
              onChange={(event) => setProfile((prevProfile) => ({ ...prevProfile, bio: event.target.value }))}
              placeholder="예: 여유로운 카페를 좋아하고, 편하게 대화하는 시간을 좋아해요."
              maxLength={100}
              rows={3}
              className="w-full resize-none rounded-xl bg-[var(--color-surface)] px-4 py-3 text-base leading-6 placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]/30"
            />
            <div className="flex items-start justify-between gap-3">
              {!hasBio ? (
                <p className="text-xs text-[var(--color-text-secondary)]">
                  자기소개는 1자 이상 입력해야 저장할 수 있어요.
                </p>
              ) : null}
              <p className="shrink-0 text-right text-xs text-[var(--color-text-tertiary)]">{profile.bio.length}/100</p>
            </div>
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
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            {isWaitingEntry ? '이상형 키워드도 준비해요' : '다른 설정은 따로 관리해요'}
          </p>
          <div className="mt-3 action-stack text-sm text-[var(--color-text-secondary)]">
            <Link href={idealTypeHref} className="flex items-center justify-between rounded-xl bg-white px-4 py-3">
              <span>이상형 키워드 수정하기</span>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
            {!isWaitingEntry && (
              <Link href={recommendationSettingsHref} className="flex items-center justify-between rounded-xl bg-white px-4 py-3">
                <span>이상형 추천 설정</span>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </PageContent>

      <div className={`fixed right-4 z-40 ${isWaitingEntry ? 'bottom-[calc(var(--spacing-safe-bottom)+28px)]' : 'bottom-[calc(var(--nav-height)+var(--spacing-safe-bottom)+28px)]'}`}>
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasMinPhotos || !hasRequiredKeywords || !hasBio}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-like-active)] text-white shadow-[0_6px_14px_rgba(243,167,192,0.22)] transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-[var(--color-border)] disabled:text-[var(--color-text-tertiary)] disabled:shadow-none"
          aria-label="저장하기"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>

      {previewPhoto && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 px-4 py-8">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="프로필 사진 크게 보기 닫기"
            onClick={() => setPreviewPhotoIndex(null)}
          />

          <div className="relative z-10 flex w-full max-w-[430px] flex-col items-center gap-4">
            <div className="flex w-full items-center justify-between text-white">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                {(previewPhotoIndex ?? 0) + 1}/{photos.length}
              </span>
              <button
                type="button"
                onClick={() => setPreviewPhotoIndex(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur"
                aria-label="닫기"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[24px] bg-black">
              <Image
                src={previewPhoto}
                alt={`확대된 프로필 사진 ${(previewPhotoIndex ?? 0) + 1}`}
                fill
                sizes="(max-width: 430px) 100vw, 430px"
                unoptimized={previewPhoto.startsWith('data:')}
                className="object-contain"
                onError={() => {
                  if (previewPhotoIndex !== null) {
                    handlePhotoError(previewPhotoIndex);
                  }
                  setPreviewPhotoIndex(null);
                }}
              />
            </div>

            {photos.length > 1 && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewPhotoIndex((currentIndex) => (
                      currentIndex === null ? null : (currentIndex + photos.length - 1) % photos.length
                    ));
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur"
                  aria-label="이전 프로필 사진"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewPhotoIndex((currentIndex) => (
                      currentIndex === null ? null : (currentIndex + 1) % photos.length
                    ));
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur"
                  aria-label="다음 프로필 사진"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomSheet
        isOpen={showPhotoOptions}
        onClose={() => {
          setShowPhotoOptions(false);
          setPhotoTargetIndex(null);
        }}
        title="프로필 사진 추가"
      >
        <div className="px-4 pb-6">
          <button
            type="button"
            onClick={() => handlePhotoSourceSelect('camera')}
            className="flex w-full items-center gap-4 rounded-xl px-4 py-4 text-left transition-colors hover:bg-[var(--color-surface-secondary)] active:bg-[var(--color-border-light)]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-chip-background)] text-[var(--color-text-primary)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-[var(--color-text-primary)]">사진 찍기</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                바로 촬영한 사진을 프로필에 추가해요.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handlePhotoSourceSelect('library')}
            className="flex w-full items-center gap-4 rounded-xl px-4 py-4 text-left transition-colors hover:bg-[var(--color-surface-secondary)] active:bg-[var(--color-border-light)]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-brand-pink)] text-[var(--color-text-primary)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-[var(--color-text-primary)]">사진 보관함</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                저장된 사진 중 하나를 선택해요.
              </p>
            </div>
          </button>
        </div>
      </BottomSheet>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handlePhotoFileChange}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handlePhotoFileChange}
      />
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
