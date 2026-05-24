'use client';

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { PLACEHOLDER_PLACE_IMAGE, PLACE_IMAGE_FALLBACKS, PLACE_IMAGE_GALLERIES } from '@/lib/constants';
import type { ChatPlaceSuggestion } from '@/lib/types';

const CATEGORY_LABELS: Record<string, string> = {
  campus: '캠퍼스',
  cafe: '카페',
  park: '공원',
  restaurant: '밥',
  activity: '활동',
  coding: '컴공',
  gate: '입구',
};

const HIDDEN_PLACE_NAMES = new Set(['A동', 'D동', '백곰', '코딩하는 백곰이']);

const QUICK_IMAGE_ACTIONS = [
  { id: 'egg', label: 'egg', imageUrl: '/place/egg.png', alt: 'egg 이미지' },
  { id: 'coding', label: 'coding', imageUrl: '/place/coding.png', alt: 'coding 이미지' },
] as const;

export type PlaceQuickImageAction = (typeof QUICK_IMAGE_ACTIONS)[number];

interface PlaceSuggestionPanelProps {
  suggestions: ChatPlaceSuggestion[];
  collapsed: boolean;
  updatingSuggestionId: string | null;
  sendingImageId?: string | null;
  onCollapsedChange: (collapsed: boolean) => void;
  onDismiss?: () => void;
  onGalleryOpenChange?: (isOpen: boolean) => void;
  onSelect: (suggestionId: string) => void;
  onSendImage?: (action: PlaceQuickImageAction) => void;
}

interface GalleryTarget {
  placeName: string;
  categoryCode: string;
  categoryName: string;
  images: string[];
}

function getCategoryLabel(code: string, fallback: string): string {
  return CATEGORY_LABELS[code] ?? fallback;
}

function isTriggeredPlaceSuggestion(suggestion: ChatPlaceSuggestion): boolean {
  return suggestion.triggeredKeyword === suggestion.place.name;
}

function SendArrowIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  );
}

function PlaceImage({ src, alt, name }: { src: string | null; alt: string; name: string }) {
  const [hasError, setHasError] = useState(false);
  const fallback = PLACE_IMAGE_FALLBACKS[name] ?? PLACEHOLDER_PLACE_IMAGE;
  const imageSrc = hasError || !src ? fallback : src;

  return (
    <Image
      src={imageSrc}
      alt={alt}
      width={144}
      height={96}
      className="h-full w-full object-cover"
      onError={() => setHasError(true)}
    />
  );
}

const GalleryImage = memo(function GalleryImage({
  src,
  alt,
  onError,
}: {
  src: string;
  alt: string;
  onError: () => void;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 430px) 100vw, 430px"
      className="object-contain"
      priority
      onError={onError}
    />
  );
});

function getPlaceGallery(name: string, imageUrl: string | null): string[] {
  const gallery = PLACE_IMAGE_GALLERIES[name] ?? [];
  const fallback = PLACE_IMAGE_FALLBACKS[name] ?? PLACEHOLDER_PLACE_IMAGE;
  const candidates = [imageUrl ?? '', ...gallery, fallback];
  const seen = new Set<string>();

  return candidates.filter((item) => {
    if (!item) return false;
    if (seen.has(item)) return false;
    seen.add(item);
    return true;
  });
}

export function PlaceSuggestionPanel({
  suggestions,
  collapsed,
  updatingSuggestionId,
  sendingImageId = null,
  onCollapsedChange,
  onDismiss,
  onGalleryOpenChange,
  onSelect,
  onSendImage,
}: PlaceSuggestionPanelProps) {
  const visibleSuggestions = useMemo(
    () => suggestions.filter((suggestion) => (
      suggestion.status === 'pending' && !HIDDEN_PLACE_NAMES.has(suggestion.place.name)
    )),
    [suggestions],
  );
  const [activeCategory, setActiveCategory] = useState('all');
  const [galleryTarget, setGalleryTarget] = useState<GalleryTarget | null>(null);
  const [galleryImageIndex, setGalleryImageIndex] = useState(0);
  const [failedGalleryImages, setFailedGalleryImages] = useState<Set<string>>(() => new Set());

  const categories = useMemo(() => {
    const categoryMap = new Map<string, string>();
    visibleSuggestions.forEach((suggestion) => {
      categoryMap.set(
        suggestion.place.category.code,
        getCategoryLabel(suggestion.place.category.code, suggestion.place.category.name),
      );
    });

    return Array.from(categoryMap.entries()).map(([code, label]) => ({ code, label }));
  }, [visibleSuggestions]);

  const filteredSuggestions = useMemo(() => {
    const filtered = activeCategory === 'all'
      ? visibleSuggestions
      : visibleSuggestions.filter((suggestion) => suggestion.place.category.code === activeCategory);

    return [...filtered].sort((left, right) => {
      const leftIsTriggered = isTriggeredPlaceSuggestion(left);
      const rightIsTriggered = isTriggeredPlaceSuggestion(right);
      if (leftIsTriggered !== rightIsTriggered) {
        return leftIsTriggered ? -1 : 1;
      }

      if (left.status === right.status) {
        return left.place.name.localeCompare(right.place.name, 'ko');
      }

      return left.status === 'accepted' ? -1 : 1;
    });
  }, [activeCategory, visibleSuggestions]);

  const galleryImages = galleryTarget?.images ?? [];
  const activeGalleryImage = galleryImages[galleryImageIndex] ?? PLACEHOLDER_PLACE_IMAGE;
  const galleryImageSrc = failedGalleryImages.has(activeGalleryImage)
    ? PLACEHOLDER_PLACE_IMAGE
    : activeGalleryImage;

  const closeGallery = useCallback(() => {
    setGalleryTarget(null);
    setGalleryImageIndex(0);
    setFailedGalleryImages(new Set());
    onGalleryOpenChange?.(false);
  }, [onGalleryOpenChange]);

  const openGallery = (suggestion: ChatPlaceSuggestion) => {
    setGalleryImageIndex(0);
    setFailedGalleryImages(new Set());
    setGalleryTarget({
      placeName: suggestion.place.name,
      categoryCode: suggestion.place.category.code,
      categoryName: suggestion.place.category.name,
      images: getPlaceGallery(suggestion.place.name, suggestion.place.imageUrl),
    });
    onGalleryOpenChange?.(true);
  };

  const goToPrevGalleryImage = useCallback(() => {
    setGalleryImageIndex((currentIndex) => (
      galleryImages.length > 0
        ? (currentIndex + galleryImages.length - 1) % galleryImages.length
        : currentIndex
    ));
  }, [galleryImages.length]);

  const goToNextGalleryImage = useCallback(() => {
    setGalleryImageIndex((currentIndex) => (
      galleryImages.length > 0
        ? (currentIndex + 1) % galleryImages.length
        : currentIndex
    ));
  }, [galleryImages.length]);

  const handleGalleryImageError = useCallback(() => {
    setFailedGalleryImages((prevImages) => {
      if (prevImages.has(activeGalleryImage)) {
        return prevImages;
      }

      return new Set(prevImages).add(activeGalleryImage);
    });
  }, [activeGalleryImage]);

  useEffect(() => {
    if (!galleryTarget) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeGallery();
      }
      if (event.key === 'ArrowLeft') {
        goToPrevGalleryImage();
      }
      if (event.key === 'ArrowRight') {
        goToNextGalleryImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeGallery, galleryTarget, goToNextGalleryImage, goToPrevGalleryImage]);

  useEffect(() => () => {
    onGalleryOpenChange?.(false);
  }, [onGalleryOpenChange]);

  if (visibleSuggestions.length === 0) {
    return null;
  }

  const imageActions = activeCategory === 'all' && onSendImage ? QUICK_IMAGE_ACTIONS : [];
  const totalCardCount = visibleSuggestions.length + (onSendImage ? QUICK_IMAGE_ACTIONS.length : 0);

  if (collapsed) {
    return (
      <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
        <button
          type="button"
          onClick={() => onCollapsedChange(false)}
          className="flex min-h-10 w-full items-center justify-between rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-secondary)] px-3 text-left"
        >
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">인제우리 추천 장소</span>
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">{totalCardCount}개 보기</span>
        </button>
      </div>
    );
  }

  return (
    <section className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[var(--color-text-primary)]">인제우리 추천 장소</p>
          <p className="mt-0.5 text-[11px] leading-4 text-[var(--color-text-secondary)]">사진을 눌러서 확인해보고, 장소를 제안해보세요</p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-surface-secondary)]"
            aria-label="추천 장소 닫기"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            activeCategory === 'all'
              ? 'border-[var(--color-text-primary)] bg-[var(--color-text-primary)] text-white'
              : 'border-[var(--color-border-light)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
          }`}
        >
          전체
        </button>
        {categories.map((category) => (
          <button
            key={category.code}
            type="button"
            onClick={() => setActiveCategory(category.code)}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              activeCategory === category.code
                ? 'border-[var(--color-text-primary)] bg-[var(--color-text-primary)] text-white'
                : 'border-[var(--color-border-light)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="mt-2 grid auto-cols-[132px] grid-flow-col gap-2 overflow-x-auto pb-1 min-[380px]:auto-cols-[148px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filteredSuggestions.map((suggestion) => {
          const isAccepted = suggestion.status === 'accepted';
          const isUpdating = updatingSuggestionId === suggestion.id;

          return (
            <article
              key={suggestion.id}
              className="overflow-hidden rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface)]"
            >
              <div className="relative h-[76px] w-full overflow-hidden bg-[var(--color-surface-secondary)] min-[380px]:h-20">
                <button
                  type="button"
                  onClick={() => openGallery(suggestion)}
                  className="absolute inset-0 block h-full w-full"
                  aria-label={`${suggestion.place.name} 사진 자세히 보기`}
                >
                  <PlaceImage src={suggestion.place.imageUrl} alt={suggestion.place.name} name={suggestion.place.name} />
                </button>
              </div>
              <div className="px-2.5 py-1.5">
                <p className="truncate text-[13px] font-bold leading-4 text-[var(--color-text-primary)]">{suggestion.place.name}</p>
                <div className="mt-0.5 flex items-center justify-between gap-1.5">
                  <p className="min-w-0 truncate text-[10px] font-medium text-[var(--color-text-tertiary)]">
                    {getCategoryLabel(suggestion.place.category.code, suggestion.place.category.name)}
                  </p>
                  <button
                    type="button"
                    onClick={() => onSelect(suggestion.id)}
                    disabled={isAccepted || isUpdating}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition active:scale-[0.96] disabled:cursor-default ${
                      isAccepted
                        ? 'bg-[var(--color-border)] text-white/85'
                        : 'bg-[var(--color-pink-cta)] disabled:opacity-70'
                    }`}
                    aria-label={`${suggestion.place.name} 여기 어때요 보내기`}
                    aria-busy={isUpdating}
                  >
                    <SendArrowIcon />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {imageActions.map((action) => {
          const isSending = sendingImageId === action.id;

          return (
            <article
              key={action.id}
              className="overflow-hidden rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface)]"
            >
              <div className="relative h-[76px] w-full overflow-hidden bg-[var(--color-surface-secondary)] min-[380px]:h-20">
                <Image
                  src={action.imageUrl}
                  alt={action.alt}
                  fill
                  sizes="148px"
                  className="object-contain p-1.5"
                />
              </div>
              <div className="px-2.5 py-1.5">
                <p className="truncate text-[13px] font-bold leading-4 text-[var(--color-text-primary)]">{action.label}</p>
                <div className="mt-0.5 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => onSendImage?.(action)}
                    disabled={Boolean(sendingImageId)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-pink-cta)] text-white shadow-sm transition active:scale-[0.96] disabled:cursor-default disabled:opacity-70"
                    aria-label={`${action.label} 이미지 보내기`}
                    aria-busy={isSending}
                  >
                    <SendArrowIcon />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onCollapsedChange(true)}
        className="mx-auto mt-1 flex h-7 w-12 items-center justify-center rounded-full text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-surface-secondary)]"
        aria-label="추천 장소 접기"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {galleryTarget && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[1000] bg-black/90 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+14px)] pt-[calc(env(safe-area-inset-top,0px)+12px)]"
          role="dialog"
          aria-modal="true"
          aria-label={`${galleryTarget.placeName} 사진 보기`}
        >
          <div className="mx-auto flex h-full max-w-[430px] flex-col">
            <div className="flex min-h-12 items-center justify-between gap-3 text-white">
              <div className="min-w-0">
                <p className="truncate text-[17px] font-bold">{galleryTarget.placeName}</p>
                <p className="mt-0.5 text-[11px] font-medium text-white/65">
                  {getCategoryLabel(galleryTarget.categoryCode, galleryTarget.categoryName)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeGallery}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur transition-colors active:bg-white/20"
                aria-label="사진 닫기"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="relative mt-2 min-h-0 flex-1 overflow-hidden rounded-2xl bg-black">
              <GalleryImage
                src={galleryImageSrc}
                alt={`${galleryTarget.placeName} 사진 ${galleryImageIndex + 1}`}
                onError={handleGalleryImageError}
              />

              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goToPrevGalleryImage}
                    className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition-colors active:bg-black/55"
                    aria-label="이전 사진"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={goToNextGalleryImage}
                    className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition-colors active:bg-black/55"
                    aria-label="다음 사진"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </>
              )}

              {galleryImages.length > 1 && (
                <span className="absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                  {galleryImageIndex + 1}/{galleryImages.length}
                </span>
              )}
            </div>

            {galleryImages.length > 1 && (
              <div className="mt-3 flex min-h-6 items-center justify-center gap-1.5">
                {galleryImages.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setGalleryImageIndex(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === galleryImageIndex ? 'w-5 bg-white' : 'w-2 bg-white/35'
                    }`}
                    aria-label={`${index + 1}번째 사진 보기`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </section>
  );
}
