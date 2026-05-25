'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const START_IMAGE_PATH = '/brand/start-page/start0.png';
const START_SCREEN_HOLD_MS = 900;
const FADE_OUT_MS = 320;
const START_SCREEN_SEEN_KEY = 'injeuri:start-screen-seen';

let hasShownStartScreenInRuntime = false;

export function StartPageAnimation() {
  const [isExiting, setIsExiting] = useState(false);
  const [isVisible, setIsVisible] = useState(() => !hasShownStartScreenInRuntime);

  useEffect(() => {
    const hideWithoutAnimation = () => {
      document.documentElement.dataset.startScreenSeen = 'true';
      const hideTimer = window.setTimeout(() => setIsVisible(false), 0);

      return () => window.clearTimeout(hideTimer);
    };

    if (hasShownStartScreenInRuntime) {
      return hideWithoutAnimation();
    }

    try {
      if (window.sessionStorage.getItem(START_SCREEN_SEEN_KEY) === 'true') {
        hasShownStartScreenInRuntime = true;
        return hideWithoutAnimation();
      }

      window.sessionStorage.setItem(START_SCREEN_SEEN_KEY, 'true');
    } catch {
      // If storage is unavailable, the runtime flag still prevents repeats during client navigation.
    }

    hasShownStartScreenInRuntime = true;

    const image = new window.Image();
    image.src = START_IMAGE_PATH;
    const exitTimer = window.setTimeout(() => setIsExiting(true), START_SCREEN_HOLD_MS);
    const hideTimer = window.setTimeout(() => {
      document.documentElement.dataset.startScreenSeen = 'true';
      setIsVisible(false);
    }, START_SCREEN_HOLD_MS + FADE_OUT_MS);

    return () => {
      image.onload = null;
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="start-screen-overlay fixed inset-0 z-[220] flex h-[100dvh] w-screen justify-center overflow-hidden bg-white transition-opacity"
      style={{
        opacity: isExiting ? 0 : 1,
        transitionDuration: `${FADE_OUT_MS}ms`,
      }}
    >
      <div className="relative h-[100dvh] w-full max-w-[430px] overflow-hidden bg-white">
        <Image
          src={START_IMAGE_PATH}
          alt=""
          fill
          priority
          unoptimized
          sizes="(max-width: 430px) 100vw, 430px"
          className="object-contain"
          draggable={false}
        />
      </div>
    </div>
  );
}
