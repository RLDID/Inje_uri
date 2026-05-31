'use client';

import { Suspense, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { PageContainer, PageContent } from '@/components/layout';
import { BottomSheet, CenteredModal, useToast } from '@/components/ui';
import { createFeed, feedCategoriesToKeywordCodes } from '@/lib/api/feeds';
import { trackNowWooriFeedCreated } from '@/lib/analytics';
import {
  FESTIVAL_FEED_CATEGORY_SELECTED_CLASS,
  FESTIVAL_FEED_CATEGORY_UNSELECTED_CLASS,
  SELFDATE_KEYWORD_OPTIONS,
  isFestivalFeedCategory,
} from '@/lib/constants';
import { useSafeBack } from '@/lib/navigation';
import {
  analyzeFeedImage,
  clampFeedImageCrop,
  cropFeedImageToSquare,
  type FeedImageAsset,
  type FeedImageCrop,
} from '@/lib/utils/feedImage';
import type { FeedCategory } from '@/lib/types';

type PickerSource = 'camera' | 'library';
type CameraPermissionState = PermissionState | 'unknown' | 'unsupported';

const MAX_SELECTED_KEYWORDS = 4;
const MAX_SELECTED_IMAGES = 4;
const IMAGE_EDITOR_FRAME_SIZE = 280;
const IMAGE_EDITOR_MIN_ZOOM = 1;
const IMAGE_EDITOR_MAX_ZOOM = 2.6;
const INITIAL_IMAGE_CROP: FeedImageCrop = {
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
};
const VISIBLE_SELFDATE_KEYWORD_OPTIONS = SELFDATE_KEYWORD_OPTIONS.filter((option) => !isFestivalFeedCategory(option.id));

async function feedImageAssetToFile(asset: FeedImageAsset, index: number): Promise<File> {
  const response = await fetch(asset.previewUrl);
  const blob = await response.blob();
  const extension = asset.mimeType === 'image/png' ? 'png' : asset.mimeType === 'image/gif' ? 'gif' : 'jpg';
  return new File([blob], asset.fileName || `feed-image-${index + 1}.${extension}`, {
    type: asset.mimeType || blob.type || 'image/jpeg',
  });
}

function CreateStoryPageContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const { goBack } = useSafeBack({ fallbackPath: '/self-date' });
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const cancelSelectionTimerRef = useRef<number | null>(null);
  const imageDragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originOffsetX: number;
    originOffsetY: number;
  } | null>(null);

  const [text, setText] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<FeedCategory[]>([]);
  const [selectedImages, setSelectedImages] = useState<FeedImageAsset[]>([]);
  const [draftImage, setDraftImage] = useState<FeedImageAsset | null>(null);
  const [pendingImageQueue, setPendingImageQueue] = useState<FeedImageAsset[]>([]);
  const [cropDraft, setCropDraft] = useState<FeedImageCrop>(INITIAL_IMAGE_CROP);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [showImageCropEditor, setShowImageCropEditor] = useState(false);
  const [pendingPicker, setPendingPicker] = useState<PickerSource | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isApplyingCrop, setIsApplyingCrop] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<CameraPermissionState>('unknown');
  const [isImageDropActive, setIsImageDropActive] = useState(false);

  const isValid = text.trim().length > 0 && selectedCategories.length > 0;
  const supportsDirectCameraCapture = useMemo(
    () => typeof document !== 'undefined' && 'capture' in document.createElement('input'),
    [],
  );
  const editorMetrics = useMemo(() => {
    if (!draftImage) {
      return null;
    }

    const baseScale = Math.max(IMAGE_EDITOR_FRAME_SIZE / draftImage.width, IMAGE_EDITOR_FRAME_SIZE / draftImage.height);
    const scale = baseScale * cropDraft.zoom;

    return {
      renderedWidth: draftImage.width * scale,
      renderedHeight: draftImage.height * scale,
    };
  }, [cropDraft.zoom, draftImage]);

  useEffect(() => {
    if (
      typeof navigator === 'undefined'
      || !('permissions' in navigator)
      || typeof navigator.permissions.query !== 'function'
    ) {
      setCameraPermission('unsupported');
      return;
    }

    let isMounted = true;

    const syncPermission = async () => {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (!isMounted) {
          return;
        }

        const updatePermission = () => setCameraPermission(permissionStatus.state);
        updatePermission();
        permissionStatus.onchange = updatePermission;
      } catch {
        if (isMounted) {
          setCameraPermission('unknown');
        }
      }
    };

    void syncPermission();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!pendingPicker) {
      return;
    }

    const schedulePickerCancelReset = () => {
      if (cancelSelectionTimerRef.current) {
        window.clearTimeout(cancelSelectionTimerRef.current);
      }

      cancelSelectionTimerRef.current = window.setTimeout(() => {
        setPendingPicker(null);
        setIsProcessingImage(false);
        showToast(
          pendingPicker === 'camera'
            ? '촬영이 완료되지 않았어요. 권한을 확인하거나 사진 보관함에서 다시 선택해보세요.'
            : '사진 선택이 취소되었어요.',
          'info',
        );
      }, 700);
    };

    const handleWindowFocus = () => {
      schedulePickerCancelReset();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        schedulePickerCancelReset();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('pageshow', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('pageshow', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (cancelSelectionTimerRef.current) {
        window.clearTimeout(cancelSelectionTimerRef.current);
        cancelSelectionTimerRef.current = null;
      }
    };
  }, [pendingPicker, showToast]);

  const resetPickerState = () => {
    if (cancelSelectionTimerRef.current) {
      window.clearTimeout(cancelSelectionTimerRef.current);
      cancelSelectionTimerRef.current = null;
    }

    setPendingPicker(null);
    setIsProcessingImage(false);
  };

  const resetCropEditor = () => {
    imageDragStateRef.current = null;
    setDraftImage(null);
    setPendingImageQueue([]);
    setCropDraft(INITIAL_IMAGE_CROP);
    setShowImageCropEditor(false);
    setIsApplyingCrop(false);
  };

  const openPicker = (source: PickerSource) => {
    if (selectedImages.length >= MAX_SELECTED_IMAGES) {
      showToast(`이미지는 ${MAX_SELECTED_IMAGES}개까지만 등록할 수 있어요.`, 'info');
      setShowImageOptions(false);
      return;
    }

    const input = source === 'camera' ? cameraInputRef.current : libraryInputRef.current;
    if (!input) {
      showToast('이 환경에서는 사진 선택을 지원하지 않아요.', 'error');
      return;
    }

    resetPickerState();
    setShowImageOptions(false);
    setPendingPicker(source);
    setIsProcessingImage(true);
    input.value = '';
    input.click();
  };

  const beginCropFlow = (nextImage: FeedImageAsset) => {
    setDraftImage(nextImage);
    setCropDraft(INITIAL_IMAGE_CROP);
    setShowImageCropEditor(true);
  };

  const processSelectedFiles = async (files: File[], source: PickerSource) => {
    resetPickerState();
    const remainingSlots = MAX_SELECTED_IMAGES - selectedImages.length;

    if (remainingSlots <= 0) {
      showToast(`이미지는 ${MAX_SELECTED_IMAGES}개까지만 등록할 수 있어요.`, 'info');
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      showToast(`이미지는 최대 ${MAX_SELECTED_IMAGES}개까지 등록할 수 있어요.`, 'info');
    }

    setIsProcessingImage(true);

    try {
      const nextImages = await Promise.all(filesToProcess.map((file) => analyzeFeedImage(file)));
      const [firstImage, ...queuedImages] = nextImages;

      if (!firstImage) {
        return;
      }

      setPendingImageQueue(queuedImages);
      beginCropFlow(firstImage);
      showToast(
        source === 'camera'
          ? '촬영한 사진을 불러왔어요. 정사각형 안에서 위치를 맞춰주세요.'
          : '사진을 불러왔어요. 정사각형 안에서 위치를 맞춰주세요.',
        'info',
      );

    } catch (error) {
      showToast(
        error instanceof Error ? error.message : '이미지를 불러오지 못했어요. 다시 시도해주세요.',
        'error',
      );
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleTakePhoto = () => {
    if (cameraPermission === 'denied') {
      showToast('카메라 권한이 꺼져 있어 사진 보관함으로 연결할게요.', 'warning');
      openPicker('library');
      return;
    }

    if (!supportsDirectCameraCapture) {
      showToast('이 브라우저에서는 사진 보관함에서 사진을 선택해주세요.', 'info');
      openPicker('library');
      return;
    }

    openPicker('camera');
  };

  const handleImageSelection = async (event: ChangeEvent<HTMLInputElement>, source: PickerSource) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      event.target.value = '';
      resetPickerState();
      return;
    }

    try {
      await processSelectedFiles(files, source);
    } finally {
      event.target.value = '';
    }
  };

  const handleImageDrop = async (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsImageDropActive(false);

    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length === 0) {
      return;
    }

    await processSelectedFiles(files, 'library');
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prevImages) => prevImages.filter((_, imageIndex) => imageIndex !== index));
  };

  const handleCategoryToggle = (category: FeedCategory) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories((prevCategories) => prevCategories.filter((item) => item !== category));
      return;
    }

    if (selectedCategories.length >= MAX_SELECTED_KEYWORDS) {
      showToast('카테고리는 4개까지만 선택할 수 있어요.', 'info');
      return;
    }

    setSelectedCategories((prevCategories) => [...prevCategories, category]);
  };

  const handleCropZoomChange = (value: number) => {
    if (!draftImage) {
      return;
    }

    setCropDraft((prevCrop) => (
      clampFeedImageCrop(draftImage, { ...prevCrop, zoom: value }, IMAGE_EDITOR_FRAME_SIZE)
    ));
  };

  const handleCropPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draftImage) {
      return;
    }

    event.preventDefault();
    imageDragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originOffsetX: cropDraft.offsetX,
      originOffsetY: cropDraft.offsetY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleCropPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draftImage || !imageDragStateRef.current || imageDragStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - imageDragStateRef.current.startX;
    const deltaY = event.clientY - imageDragStateRef.current.startY;

    setCropDraft(
      clampFeedImageCrop(
        draftImage,
        {
          ...cropDraft,
          offsetX: imageDragStateRef.current.originOffsetX + deltaX,
          offsetY: imageDragStateRef.current.originOffsetY + deltaY,
        },
        IMAGE_EDITOR_FRAME_SIZE,
      ),
    );
  };

  const handleCropPointerRelease = (event: React.PointerEvent<HTMLDivElement>) => {
    if (imageDragStateRef.current?.pointerId !== event.pointerId) {
      return;
    }

    imageDragStateRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleConfirmCrop = async () => {
    if (!draftImage) {
      return;
    }

    setIsApplyingCrop(true);

    try {
      const nextImage = await cropFeedImageToSquare(draftImage, cropDraft, IMAGE_EDITOR_FRAME_SIZE);
      setSelectedImages((prevImages) => [...prevImages, nextImage]);
      setCropDraft(INITIAL_IMAGE_CROP);

      const [nextDraftImage, ...nextQueue] = pendingImageQueue;

      if (nextDraftImage) {
        setPendingImageQueue(nextQueue);
        setDraftImage(nextDraftImage);
        showToast('다음 이미지 위치를 맞춰주세요.', 'info');
        return;
      }

      setShowImageCropEditor(false);
      setDraftImage(null);
      setPendingImageQueue([]);
      showToast('대표 이미지를 추가했어요.', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : '이미지 편집을 마치지 못했어요. 다시 시도해주세요.',
        'error',
      );
    } finally {
      setIsApplyingCrop(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedCategories.length === 0) {
      showToast('카테고리를 선택해주세요.', 'error');
      return;
    }

    if (!text.trim()) {
      showToast('내용을 입력해주세요.', 'error');
      return;
    }

    try {
      const images = await Promise.all(selectedImages.map(feedImageAssetToFile));
      await createFeed({
        text: text.trim(),
        feedKeywordCodes: feedCategoriesToKeywordCodes(selectedCategories),
        images,
      });
      trackNowWooriFeedCreated({
        categoryCount: selectedCategories.length,
        imageCount: images.length,
        textLength: text.trim().length,
      });
      showToast('피드를 올렸어요!', 'success');
      router.push('/self-date?filter=all');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '피드를 올리지 못했어요.', 'error');
    }
  };

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
            <path
              d="M15 6 9 12l6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-[20px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
          새 피드 생성
        </h1>
      </header>

      <PageContent className="app-section-stack pb-36">
        <div
          className="rounded-[24px] px-4 py-3.5 shadow-[0_3px_8px_rgba(34,34,34,0.055)]"
          style={{
            background: 'var(--color-chip-background)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </div>
            <p className="break-keep text-[14px] font-medium leading-6 text-[var(--color-text-secondary)]">
              지금 우리 피드는 2시간 동안만 보여요
            </p>
          </div>
        </div>

        <section className="section-card p-5 content-stack" style={{ border: 0, boxShadow: '0 4px 12px rgba(34,34,34,0.055)' }}>
          <div className="mobile-split-row">
            <div className="min-w-0">
              <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
                대표이미지
              </h2>
              <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                사진을 여러 장 선택하고, 각 사진의 보일 위치를 맞춰주세요.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowImageOptions(true)}
            onDragOver={(event) => {
              event.preventDefault();
              setIsImageDropActive(true);
            }}
            onDragLeave={() => setIsImageDropActive(false)}
            onDrop={(event) => {
              void handleImageDrop(event);
            }}
            disabled={isProcessingImage}
            className={`relative flex aspect-square w-full max-w-[320px] overflow-hidden rounded-[28px] transition-all ${
              selectedImages.length > 0
                ? 'bg-[var(--color-surface)] shadow-[0_4px_12px_rgba(34,34,34,0.055)] ring-1 ring-[var(--color-border)]'
                : 'border border-dashed bg-[var(--color-surface)]'
            } mx-auto ${selectedImages.length === 0 ? 'mb-1' : ''} ${isImageDropActive ? 'border-[var(--color-focus)] ring-2 ring-[var(--color-focus)]/15' : 'border-[var(--color-border)]'} ${isProcessingImage ? 'cursor-wait opacity-80' : 'active:scale-[0.99]'}`}
          >
            {selectedImages.length > 0 ? (
              <>
                <Image
                  src={selectedImages[0].previewUrl}
                  alt="첨부 이미지 미리보기"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </>
            ) : (
              <>
                <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-8 text-center">
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
                    최대 4장까지 등록할 수 있어요.
                  </p>
                </div>
              </>
            )}
          </button>

          {selectedImages.length > 0 && (
            <div className="mx-auto grid w-full max-w-[320px] grid-cols-4 gap-2" style={{ marginTop: 20 }}>
              {selectedImages.map((image, index) => (
                <div key={`${image.fileName}-${index}`} className="relative aspect-square overflow-hidden rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]">
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

          {cameraPermission === 'denied' && (
            <div className="compact-note-muted text-sm leading-6 text-[var(--color-text-secondary)]">
              카메라 권한이 꺼져 있어요. 브라우저 설정에서 권한을 켜거나 사진 보관함을 이용해주세요.
            </div>
          )}
        </section>

        <section className="section-card p-5 content-stack" style={{ border: 0, boxShadow: '0 4px 12px rgba(34,34,34,0.055)' }}>
          <div className="mobile-split-row">
            <div className="min-w-0">
              <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
                카테고리
              </h2>
            </div>
            <div className="shrink-0 self-start">
              <span className={`text-sm ${selectedCategories.length >= MAX_SELECTED_KEYWORDS ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]'}`}>
                {selectedCategories.length}/{MAX_SELECTED_KEYWORDS}
              </span>
            </div>
          </div>

          <div className="chip-wrap">
            {VISIBLE_SELFDATE_KEYWORD_OPTIONS.map((option) => {
              const isSelected = selectedCategories.includes(option.id);

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleCategoryToggle(option.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                    isFestivalFeedCategory(option.id)
                      ? isSelected
                        ? FESTIVAL_FEED_CATEGORY_SELECTED_CLASS
                        : FESTIVAL_FEED_CATEGORY_UNSELECTED_CLASS
                      : isSelected
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
            <div className="min-w-0">
              <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
                내용
              </h2>
              <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                학교 안에서 만나기 좋은 장소를 추천하듯 적어보세요.
              </p>
            </div>
          </div>

          <textarea
            data-clarity-mask
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="예: 중앙도서관 1층 테이블이 조용해서 같이 공부하기 좋아요. 끝나고 바로 앞 카페 가도 좋을 것 같아요."
            maxLength={200}
            rows={5}
            className="w-full resize-none rounded-2xl bg-[var(--color-surface)] px-4 py-4 text-base leading-7 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]/25"
          />
          <p className="text-right text-xs text-[var(--color-text-tertiary)]">{text.length}/200</p>
        </section>
      </PageContent>

      <div className="fixed bottom-[calc(var(--nav-height)+var(--spacing-safe-bottom)+28px)] right-4 z-40">
        <button
          type="button"
          onClick={() => {
            void handleSubmit();
          }}
          disabled={!isValid}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-like-active)] text-white shadow-[0_6px_14px_rgba(243,167,192,0.22)] transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-[var(--color-border)] disabled:text-[var(--color-text-tertiary)] disabled:shadow-none"
          aria-label="피드 올리기"
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
            onClick={handleTakePhoto}
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
                최대 4장까지 불러와 정사각형으로 맞춰볼 수 있어요.
              </p>
            </div>
          </button>
        </div>
      </BottomSheet>

      <CenteredModal
        isOpen={showImageCropEditor}
        onClose={() => {
          if (isApplyingCrop) {
            return;
          }
          resetCropEditor();
        }}
        title="대표이미지 편집"
      >
        <div className="px-4 pb-5 pt-4">
          <p className="text-center text-sm leading-6 text-[var(--color-text-secondary)]">
            정사각형 안에 보일 위치를 맞춘 뒤 확인을 눌러주세요.
          </p>

          <div className="mt-4 flex justify-center">
            <div
              role="presentation"
              onPointerDown={handleCropPointerDown}
              onPointerMove={handleCropPointerMove}
              onPointerUp={handleCropPointerRelease}
              onPointerCancel={handleCropPointerRelease}
              className="relative h-[280px] w-[280px] overflow-hidden rounded-[28px] bg-[var(--color-surface-secondary)] ring-1 ring-[var(--color-border-light)]"
              style={{ touchAction: 'none' }}
            >
              {draftImage && editorMetrics && (
                <div
                  className="pointer-events-none absolute left-1/2 top-1/2"
                  style={{
                    transform: `translate(-50%, -50%) translate(${cropDraft.offsetX}px, ${cropDraft.offsetY}px)`,
                  }}
                >
                  <Image
                    src={draftImage.previewUrl}
                    alt="첨부 이미지 편집 미리보기"
                    width={draftImage.width}
                    height={draftImage.height}
                    unoptimized
                    draggable={false}
                    className="max-w-none select-none object-cover"
                    style={{
                      width: `${editorMetrics.renderedWidth}px`,
                      height: `${editorMetrics.renderedHeight}px`,
                    }}
                  />
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/70" />
              <div className="pointer-events-none absolute left-1/3 top-0 h-full w-px bg-white/25" />
              <div className="pointer-events-none absolute left-2/3 top-0 h-full w-px bg-white/25" />
              <div className="pointer-events-none absolute top-1/3 h-px w-full bg-white/25" />
              <div className="pointer-events-none absolute top-2/3 h-px w-full bg-white/25" />
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-[var(--color-text-tertiary)]">
              <span>축소</span>
              <span>확대</span>
            </div>
            <input
              type="range"
              min={IMAGE_EDITOR_MIN_ZOOM}
              max={IMAGE_EDITOR_MAX_ZOOM}
              step="0.01"
              value={cropDraft.zoom}
              onChange={(event) => handleCropZoomChange(Number(event.target.value))}
              className="w-full accent-[var(--color-pink-cta)]"
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={resetCropEditor}
              disabled={isApplyingCrop}
              className="flex h-11 items-center justify-center rounded-2xl bg-[var(--color-surface-secondary)] text-sm font-semibold text-[var(--color-text-secondary)] transition-colors active:bg-[var(--color-border-light)] disabled:opacity-60"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => {
                void handleConfirmCrop();
              }}
              disabled={isApplyingCrop}
              className="flex h-11 items-center justify-center rounded-2xl bg-[var(--color-action-primary)] text-sm font-semibold text-[var(--color-action-primary-text)] transition-transform active:scale-[0.99] disabled:opacity-60"
            >
              {isApplyingCrop ? '적용 중...' : '확인'}
            </button>
          </div>
        </div>
      </CenteredModal>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          void handleImageSelection(event, 'camera');
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
          void handleImageSelection(event, 'library');
        }}
      />
    </PageContainer>
  );
}

export default function CreateStoryPage() {
  return (
    <Suspense fallback={<PageContainer withBottomNav={false}><div /></PageContainer>}>
      <CreateStoryPageContent />
    </Suspense>
  );
}
