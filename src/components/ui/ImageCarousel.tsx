'use client';

import { useState, useRef, TouchEvent, MouseEvent as ReactMouseEvent, useCallback, useMemo } from 'react';
import Image from 'next/image';

const PLACEHOLDER_PROFILE_IMAGE = 'data:image/svg+xml,' + encodeURIComponent(`
<svg width="400" height="500" viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="500" fill="#F3F4F6"/>
  <circle cx="200" cy="160" r="70" fill="#D1D5DB"/>
  <ellipse cx="200" cy="380" rx="110" ry="100" fill="#D1D5DB"/>
  <path d="M130 160 Q200 100 270 160" stroke="#E5E7EB" stroke-width="8" fill="none"/>
</svg>
`);

type AspectRatio = '1/1' | '4/5' | '3/4';

interface ImageCarouselProps {
  images: string[];
  aspectRatio?: AspectRatio;
  fallbackImage?: string;
  alt?: string;
  className?: string;
  showIndicators?: boolean;
  showCountBadge?: boolean;
}

const aspectRatioStyles: Record<AspectRatio, string> = {
  '1/1': 'aspect-square',
  '4/5': 'aspect-[4/5]',
  '3/4': 'aspect-[3/4]',
};

export function ImageCarousel({
  images,
  aspectRatio = '4/5',
  fallbackImage = PLACEHOLDER_PROFILE_IMAGE,
  alt = '프로필 이미지',
  className = '',
  showIndicators = true,
  showCountBadge = true,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errorIndices, setErrorIndices] = useState<Set<number>>(new Set());
  const [loadingIndices, setLoadingIndices] = useState<Set<number>>(new Set([0]));

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const lastSwipeAt = useRef(0);
  const mouseStartX = useRef(0);
  const mouseEndX = useRef(0);
  const isMouseDragging = useRef(false);

  const imageList = useMemo(() => {
    const validImages = images.filter((image) => image && image.trim() !== '');
    return validImages.length > 0 ? validImages : [fallbackImage];
  }, [images, fallbackImage]);

  const totalImages = imageList.length;

  const getImageSrc = useCallback((index: number) => {
    const src = imageList[index];
    if (!src || errorIndices.has(index)) {
      return fallbackImage;
    }
    return src;
  }, [errorIndices, imageList, fallbackImage]);

  const handleImageError = (index: number) => {
    setErrorIndices((prev) => new Set(prev).add(index));
    setLoadingIndices((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const handleImageLoad = (index: number) => {
    setLoadingIndices((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const goToNext = () => {
    if (currentIndex < totalImages - 1) {
      setCurrentIndex(currentIndex + 1);
      setLoadingIndices((prev) => new Set(prev).add(currentIndex + 1));
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToIndex = (index: number) => {
    if (index >= 0 && index < totalImages) {
      setCurrentIndex(index);
    }
  };

  const commitSwipe = (diff: number) => {
    const minSwipeDistance = 50;

    if (Math.abs(diff) <= minSwipeDistance) {
      return;
    }

    lastSwipeAt.current = Date.now();

    if (diff > 0) {
      goToNext();
    } else {
      goToPrev();
    }
  };

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    commitSwipe(diff);

    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const handleMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    mouseStartX.current = event.clientX;
    mouseEndX.current = event.clientX;
    isMouseDragging.current = true;
  };

  const handleMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!isMouseDragging.current) {
      return;
    }

    mouseEndX.current = event.clientX;

    if (Math.abs(mouseEndX.current - mouseStartX.current) > 6) {
      event.preventDefault();
    }
  };

  const finishMouseDrag = () => {
    if (!isMouseDragging.current) {
      return;
    }

    const diff = mouseStartX.current - mouseEndX.current;
    commitSwipe(diff);

    mouseStartX.current = 0;
    mouseEndX.current = 0;
    isMouseDragging.current = false;
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-[var(--color-surface-secondary)] ${aspectRatioStyles[aspectRatio]} ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={finishMouseDrag}
      onMouseLeave={finishMouseDrag}
      onDragStart={(event) => event.preventDefault()}
      onClickCapture={(event) => {
        if (Date.now() - lastSwipeAt.current < 400) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <div className="relative h-full w-full">
        <Image
          src={getImageSrc(currentIndex)}
          alt={`${alt} ${currentIndex + 1}`}
          fill
          className="object-cover"
          onError={() => handleImageError(currentIndex)}
          onLoad={() => handleImageLoad(currentIndex)}
          priority={currentIndex === 0}
          sizes="(max-width: 430px) 100vw, 430px"
        />

        {loadingIndices.has(currentIndex) && (
          <div className="skeleton absolute inset-0 bg-[var(--color-surface-secondary)]" />
        )}
      </div>

      {showIndicators && totalImages > 1 && (
        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
          {imageList.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                goToIndex(index);
              }}
              className={`
                h-2 rounded-full transition-all duration-200
                ${index === currentIndex ? 'w-5 bg-white' : 'w-2 bg-white/50 hover:bg-white/70'}
              `}
              aria-label={`이미지 ${index + 1}로 이동`}
            />
          ))}
        </div>
      )}

      {showCountBadge && totalImages > 1 && (
        <div className="absolute top-3 right-3 z-20 rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {currentIndex + 1} / {totalImages}
        </div>
      )}
    </div>
  );
}
