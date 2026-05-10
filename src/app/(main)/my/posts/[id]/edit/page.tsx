'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { PageContainer, PageContent } from '@/components/layout';
import { BottomSheet, useToast } from '@/components/ui';
import { feedCategoriesToKeywordIds, getFeed, updateFeed } from '@/lib/api/feeds';
import { SELFDATE_KEYWORD_OPTIONS } from '@/lib/constants';
import { useSafeBack } from '@/lib/navigation';
import { analyzeFeedImage, type FeedImageAsset } from '@/lib/utils/feedImage';
import type { FeedCategory, Story } from '@/lib/types';

type PickerSource = 'camera' | 'library';

const MAX_SELECTED_IMAGES = 4;
const MAX_SELECTED_KEYWORDS = 4;

function getStoryCategoryList(story: Story): FeedCategory[] {
  if (story.categories && story.categories.length > 0) {
    return story.categories;
  }

  return story.category ? [story.category] : [];
}

function createFeedImageAssetFromUrl(url: string, index: number): FeedImageAsset {
  return {
    previewUrl: url,
    fileName: `feed-image-${index + 1}`,
    fileSize: 0,
    mimeType: 'image/*',
    width: 0,
    height: 0,
    aspectRatio: 1,
    warnings: [],
  };
}

async function feedImageAssetToFile(asset: FeedImageAsset, index: number): Promise<File> {
  const response = await fetch(asset.previewUrl);
  const blob = await response.blob();
  const extension = asset.mimeType === 'image/png' ? 'png' : asset.mimeType === 'image/gif' ? 'gif' : 'jpg';
  return new File([blob], asset.fileName || `feed-image-${index + 1}.${extension}`, {
    type: asset.mimeType || blob.type || 'image/jpeg',
  });
}

export default function MyPostEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { goBack } = useSafeBack({ fallbackPath: '/my/posts' });
  const { showToast } = useToast();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const [story, setStory] = useState<Story | null>(null);
  const [text, setText] = useState('');
  const [selectedImages, setSelectedImages] = useState<FeedImageAsset[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<FeedCategory[]>([]);
  const [deleteImageIds, setDeleteImageIds] = useState<string[]>([]);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const isValid = text.trim().length > 0 && selectedCategories.length > 0;

  useEffect(() => {
    let cancelled = false;

    async function loadStory() {
      try {
        const nextStory = await getFeed(params.id);
        if (cancelled) {
          return;
        }

        setStory(nextStory);
        setText(nextStory.content.text ?? '');
        setSelectedImages(nextStory.content.images.map(createFeedImageAssetFromUrl));
        setSelectedCategories(getStoryCategoryList(nextStory));
      } catch (error) {
        if (!cancelled) {
          showToast(error instanceof Error ? error.message : '피드를 불러오지 못했어요.', 'error');
        }
      }
    }

    void loadStory();

    return () => {
      cancelled = true;
    };
  }, [params.id, showToast]);

  const processSelectedFiles = async (files: File[]) => {
    const remainingSlots = MAX_SELECTED_IMAGES - selectedImages.length;

    if (remainingSlots <= 0) {
      showToast(`이미지는 ${MAX_SELECTED_IMAGES}장까지 등록할 수 있어요.`, 'info');
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      showToast(`이미지는 최대 ${MAX_SELECTED_IMAGES}장까지 등록할 수 있어요.`, 'info');
    }

    setIsProcessingImage(true);

    try {
      const nextImages = await Promise.all(filesToProcess.map((file) => analyzeFeedImage(file)));
      setSelectedImages((prevImages) => [...prevImages, ...nextImages].slice(0, MAX_SELECTED_IMAGES));
      showToast('사진을 추가했어요.', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : '이미지를 불러오지 못했어요. 다시 시도해주세요.',
        'error',
      );
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleImageSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    await processSelectedFiles(files);
    event.target.value = '';
  };

  const openPicker = (source: PickerSource) => {
    if (selectedImages.length >= MAX_SELECTED_IMAGES) {
      showToast(`이미지는 ${MAX_SELECTED_IMAGES}장까지 등록할 수 있어요.`, 'info');
      setShowImageOptions(false);
      return;
    }

    setShowImageOptions(false);
    const input = source === 'camera' ? cameraInputRef.current : libraryInputRef.current;
    input?.click();
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const removedImage = selectedImages[indexToRemove];
    const existingImage = story?.content.imageMetas?.find((image) => image.imageUrl === removedImage?.previewUrl);
    if (existingImage) {
      setDeleteImageIds((prevIds) => Array.from(new Set([...prevIds, existingImage.id])));
    }

    setSelectedImages((prevImages) => prevImages.filter((_, index) => index !== indexToRemove));
  };

  const handleCategoryToggle = (category: FeedCategory) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories((prevCategories) => prevCategories.filter((item) => item !== category));
      return;
    }

    if (selectedCategories.length >= MAX_SELECTED_KEYWORDS) {
      showToast(`카테고리는 ${MAX_SELECTED_KEYWORDS}개까지 선택할 수 있어요.`, 'info');
      return;
    }

    setSelectedCategories((prevCategories) => [...prevCategories, category]);
  };

  const handleSave = async () => {
    if (!story) {
      return;
    }

    if (selectedCategories.length === 0) {
      showToast('카테고리를 한 개 이상 선택해주세요.', 'error');
      return;
    }

    if (!text.trim()) {
      showToast('내용을 입력해주세요.', 'error');
      return;
    }

    try {
      const newImages = await Promise.all(
        selectedImages
          .filter((image) => image.previewUrl.startsWith('data:'))
          .map(feedImageAssetToFile),
      );

      await updateFeed({
        feedId: story.id,
        text: text.trim(),
        feedKeywordIds: feedCategoriesToKeywordIds(selectedCategories),
        images: newImages,
        deleteImageIds,
      });
      showToast('피드를 수정했어요.', 'success');
      router.replace('/my/posts');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '피드를 수정하지 못했어요.', 'error');
    }
  };

  if (!story) {
    return (
      <PageContainer withBottomNav={false}>
        <header className="sticky top-0 z-40 flex min-h-[76px] items-center bg-[var(--color-surface)]/95 px-5 py-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={goBack}
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-text-secondary)]"
            aria-label="뒤로가기"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-[20px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
            피드 수정하기
          </h1>
        </header>
        <PageContent className="px-5 py-10 text-center" noPadding>
          <p className="text-[var(--color-text-secondary)]">수정할 피드를 찾을 수 없어요.</p>
        </PageContent>
      </PageContainer>
    );
  }

  return (
    <PageContainer withBottomNav={false}>
      <header className="sticky top-0 z-40 flex min-h-[76px] items-center bg-[var(--color-surface)]/95 px-5 py-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={goBack}
          className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)]"
          aria-label="뒤로가기"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-[20px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
          피드 수정하기
        </h1>
      </header>

      <PageContent className="app-section-stack pb-36">
        <section className="section-card p-5 content-stack" style={{ border: 0, boxShadow: '0 4px 12px rgba(34,34,34,0.055)' }}>
          <div className="mobile-split-row">
            <div className="min-w-0">
              <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
                대표 이미지
              </h2>
              <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                내가 올렸던 사진을 확인하고 수정할 수 있어요.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowImageOptions(true)}
            disabled={isProcessingImage}
            className={`relative mx-auto flex aspect-square w-full max-w-[320px] overflow-hidden rounded-[28px] transition-all ${
              selectedImages.length > 0
                ? 'bg-[var(--color-surface)] shadow-[0_4px_12px_rgba(34,34,34,0.055)] ring-1 ring-[var(--color-border)]'
                : 'border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]'
            } ${isProcessingImage ? 'cursor-wait opacity-80' : 'active:scale-[0.99]'}`}
          >
            {selectedImages.length > 0 ? (
              <Image
                src={selectedImages[0].previewUrl}
                alt="대표 이미지 미리보기"
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center px-8 text-center">
                <span className="flex h-16 w-16 items-center justify-center text-[var(--color-blue-secondary)]">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <rect x="3" y="3" width="18" height="18" rx="2.5" />
                    <path d="M12 8v8M8 12h8" />
                  </svg>
                </span>
                <p className="mt-2.5 text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
                  사진을 여러 장 추가해보세요
                </p>
                <p className="mt-1 rounded-full bg-white px-3.5 py-1.5 text-sm leading-5 text-[var(--color-text-secondary)]">
                  최대 4장까지 등록할 수 있어요
                </p>
              </div>
            )}
          </button>

          {selectedImages.length > 0 && (
            <div className="mx-auto grid w-full max-w-[320px] grid-cols-4 gap-2" style={{ marginTop: 20 }}>
              {selectedImages.map((image, index) => (
                <div
                  key={`${image.previewUrl}-${index}`}
                  className="relative aspect-square overflow-hidden rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]"
                >
                  <Image
                    src={image.previewUrl}
                    alt={`첨부 이미지 ${index + 1}`}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[var(--color-text-secondary)] shadow-[0_2px_6px_rgba(34,34,34,0.18)] ring-1 ring-black/5"
                    aria-label={`첨부 이미지 ${index + 1} 삭제`}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {selectedImages.length < MAX_SELECTED_IMAGES && (
                <button
                  type="button"
                  onClick={() => setShowImageOptions(true)}
                  disabled={isProcessingImage}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition-colors active:bg-[var(--color-surface-secondary)] disabled:cursor-wait disabled:opacity-60"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span className="text-[11px] font-medium">추가</span>
                </button>
              )}
            </div>
          )}
        </section>

        <section className="section-card p-5 content-stack" style={{ border: 0, boxShadow: '0 4px 12px rgba(34,34,34,0.055)' }}>
          <div className="mobile-split-row">
            <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
              카테고리
            </h2>
            <span className={`text-sm ${selectedCategories.length >= MAX_SELECTED_KEYWORDS ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]'}`}>
              {selectedCategories.length}/{MAX_SELECTED_KEYWORDS}
            </span>
          </div>

          <div className="chip-wrap">
            {SELFDATE_KEYWORD_OPTIONS.map((option) => {
              const isSelected = selectedCategories.includes(option.id);

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleCategoryToggle(option.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                    isSelected
                      ? 'border-[var(--color-blue-secondary)] bg-[var(--color-blue-secondary)] text-white shadow-sm'
                      : 'border-transparent bg-[var(--color-chip-background)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
                  }`}
                  aria-pressed={isSelected}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="section-card p-5 content-stack" style={{ border: 0, boxShadow: '0 4px 12px rgba(34,34,34,0.055)' }}>
          <div className="mobile-split-row">
            <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
              내용
            </h2>
            <span className="text-xs text-[var(--color-text-tertiary)]">{text.length}/200</span>
          </div>

          <textarea
            value={text}
            onChange={(event) => setText(event.target.value.slice(0, 200))}
            placeholder="피드 내용을 수정해주세요."
            maxLength={200}
            rows={5}
            className="w-full resize-none rounded-2xl bg-[var(--color-surface)] px-4 py-4 text-base leading-7 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]/25"
          />
        </section>
      </PageContent>

      <div className="fixed bottom-[calc(var(--nav-height)+var(--spacing-safe-bottom)+28px)] right-4 z-40">
        <button
          type="button"
          onClick={() => {
            void handleSave();
          }}
          disabled={!isValid}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-like-active)] text-white shadow-[0_6px_14px_rgba(243,167,192,0.22)] transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-[var(--color-border)] disabled:text-[var(--color-text-tertiary)] disabled:shadow-none"
          aria-label="피드 수정 저장"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>

      <BottomSheet isOpen={showImageOptions} onClose={() => setShowImageOptions(false)} title="사진 첨부">
        <div className="px-4 pb-6">
          <button
            type="button"
            onClick={() => openPicker('camera')}
            disabled={isProcessingImage}
            className="flex w-full items-center gap-4 rounded-xl px-4 py-4 text-left transition-colors hover:bg-[var(--color-surface-secondary)] active:bg-[var(--color-border-light)] disabled:cursor-wait disabled:opacity-60"
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
                바로 촬영한 사진을 첨부해요.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openPicker('library')}
            disabled={isProcessingImage}
            className="flex w-full items-center gap-4 rounded-xl px-4 py-4 text-left transition-colors hover:bg-[var(--color-surface-secondary)] active:bg-[var(--color-border-light)] disabled:cursor-wait disabled:opacity-60"
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
                최대 4장까지 등록할 수 있어요.
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
        onChange={(event) => {
          void handleImageSelection(event);
        }}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          void handleImageSelection(event);
        }}
      />
    </PageContainer>
  );
}
