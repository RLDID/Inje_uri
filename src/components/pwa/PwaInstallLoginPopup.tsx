'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';
import {
  clearPwaInstallPopupPending,
  dismissPwaInstallPopupPermanently,
  shouldShowPwaInstallPopup,
} from '@/lib/pwa/loginInstallPrompt';

type SlideTone = 'pink' | 'blue' | 'purple';

type SlideSegment = {
  text: string;
  className?: string;
};

type GuideSlide = {
  id: string;
  badge?: string;
  title: readonly (readonly SlideSegment[])[];
  description: readonly string[];
  imageSrc: string;
  imageKind: 'phone' | 'icon';
  panel:
    | {
        kind: 'steps';
        tone: SlideTone;
        items: readonly { title: string; description: string }[];
      }
    | {
        kind: 'install';
        items: readonly { platform: string; browser: string; steps: readonly string[] }[];
      };
};

const GUIDE_SLIDES: readonly GuideSlide[] = [
  {
    id: 'install',
    badge: '+ 인제우리 이용 팁 +',
    title: [
      [{ text: '홈 화면에서' }],
      [
        { text: '앱처럼', className: 'text-[#A873F5]' },
        { text: ' 열어요' },
      ],
    ],
    description: ['주소를 매번 입력하지 않고', '인제우리를 바로 시작할 수 있어요.'],
    imageSrc: '/brand/bear-logo.png',
    imageKind: 'icon',
    panel: {
      kind: 'install',
      items: [
        { platform: 'Galaxy', browser: '브라우저', steps: ['점 세개', '홈 화면에 추가'] },
        { platform: 'Galaxy', browser: 'Chrome', steps: ['점 세개', '홈 화면에 추가'] },
        { platform: 'iPhone', browser: 'Safari', steps: ['점 세개', '공유', '홈 화면에 추가'] },
      ],
    },
  },
  {
    id: 'today',
    title: [
      [{ text: '오늘, 새로운' }],
      [
        { text: '우리', className: 'text-[#F574AE]' },
        { text: '를 만나요' },
      ],
    ],
    description: ['오늘우리는 하루에 한 번,', '나와 잘 맞을 수 있는 사람을 추천해주는 공간이에요.'],
    imageSrc: '/brand/waiting/w%20(2).png',
    imageKind: 'phone',
    panel: {
      kind: 'steps',
      tone: 'pink',
      items: [
        { title: '오늘의 추천 확인', description: '매일 한 번 새로운 추천을 확인해요.' },
        { title: '하트 보내기', description: '관심이 가는 사람에게 하트를 보내요.' },
        { title: '서로 하트가 닿으면', description: '24시간 채팅방이 열려요.' },
      ],
    },
  },
  {
    id: 'now',
    title: [
      [{ text: '지금, 같이 할' }],
      [
        { text: '사람', className: 'text-[#6F9DFB]' },
        { text: '을 찾아요' },
      ],
    ],
    description: ['밥, 산책, 카페, 공부처럼', '지금 같이 하고 싶은 일을 가볍게 올릴 수 있어요.'],
    imageSrc: '/brand/waiting/w%20(3).png',
    imageKind: 'phone',
    panel: {
      kind: 'steps',
      tone: 'blue',
      items: [
        { title: '지금 할 일을 올려요', description: '작성한 피드는 24시간 동안 보여요.' },
        { title: '관심 있는 글을 확인해요.', description: '같이 하고 싶은 글에 하트를 보낼 수 있어요.' },
        { title: '서로 하트가 닿으면', description: '2시간 채팅방이 열려요.' },
      ],
    },
  },
];

const PANEL_STYLES: Record<SlideTone, { background: string; number: string; divider: string }> = {
  pink: {
    background: 'bg-[linear-gradient(135deg,rgba(255,239,247,0.96),rgba(255,248,251,0.98))]',
    number: 'bg-[#F78BBC] text-white',
    divider: 'border-[#F7CFE0]',
  },
  blue: {
    background: 'bg-[linear-gradient(135deg,rgba(237,247,255,0.96),rgba(247,251,255,0.98))]',
    number: 'bg-[#75A7FA] text-white',
    divider: 'border-[#CFE2FF]',
  },
  purple: {
    background: 'bg-[linear-gradient(135deg,rgba(248,242,255,0.98),rgba(239,247,255,0.98))]',
    number: 'bg-[#A873F5] text-white',
    divider: 'border-[#DED2FF]',
  },
};

export function PwaInstallLoginPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isLastSlide = activeIndex === GUIDE_SLIDES.length - 1;

  const closePopup = useCallback(() => {
    if (dontShowAgain) {
      dismissPwaInstallPopupPermanently();
    } else {
      clearPwaInstallPopupPending();
    }

    setIsOpen(false);
  }, [dontShowAgain]);

  const goToNextSlide = useCallback(() => {
    setActiveIndex((currentIndex) => Math.min(currentIndex + 1, GUIDE_SLIDES.length - 1));
  }, []);

  const goToPreviousSlide = useCallback(() => {
    setActiveIndex((currentIndex) => Math.max(currentIndex - 1, 0));
  }, []);

  useEffect(() => {
    if (!shouldShowPwaInstallPopup()) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      setIsOpen(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePopup();
      }

      if (event.key === 'ArrowLeft') {
        goToPreviousSlide();
      }

      if (event.key === 'ArrowRight') {
        goToNextSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closePopup, goToNextSlide, goToPreviousSlide, isOpen]);

  const handlePrimaryAction = () => {
    if (isLastSlide) {
      closePopup();
      return;
    }

    goToNextSlide();
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (startX === null || startY === null) {
      return;
    }

    const touch = event.changedTouches[0];
    const distanceX = touch.clientX - startX;
    const distanceY = touch.clientY - startY;
    if (Math.abs(distanceX) < 40 || Math.abs(distanceX) < Math.abs(distanceY) * 1.2) {
      return;
    }

    if (distanceX < 0) {
      goToNextSlide();
      return;
    }

    goToPreviousSlide();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center px-4 py-5" role="dialog" aria-modal="true" aria-label="홈 화면 추가 안내">
      <button type="button" className="absolute inset-0 bg-black/45" onClick={closePopup} aria-label="팝업 닫기" />

      <section className="relative flex max-h-[calc(100dvh-40px)] w-full max-w-[390px] flex-col overflow-hidden rounded-[28px] border border-[#F0F0F0] bg-[#FDFCFD] text-center shadow-[0_18px_54px_rgba(28,31,35,0.22)]">
        <header className="flex shrink-0 items-center justify-between border-b border-[#F0EDF5] px-4 py-3">
          <div className="min-w-0 text-left">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9A70F3]">PWA GUIDE</p>
            <h2 className="mt-0.5 text-[15px] font-bold text-[#2D2D2D]">홈 화면 추가 안내</h2>
          </div>
          <button
            type="button"
            onClick={closePopup}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#777] transition-colors hover:bg-[#F4F1F7]"
            aria-label="닫기"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        <div
          className="min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={() => {
            touchStartXRef.current = null;
            touchStartYRef.current = null;
          }}
        >
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {GUIDE_SLIDES.map((slide) => (
              <article key={slide.id} className="w-full shrink-0 px-5 pb-4 pt-4">
                <div className="min-h-[118px]">
                  {slide.badge ? (
                    <p className="mx-auto mb-3 inline-flex min-h-8 items-center rounded-full border border-[#E5D5FF] bg-[#F8F2FF] px-4 text-[12px] font-bold text-[#9A70F3]">
                      {slide.badge}
                    </p>
                  ) : null}

                  <h3 className="break-keep text-[27px] font-bold leading-[1.22] text-[#2D2D2D]">
                    {slide.title.map((line, lineIndex) => (
                      <span key={`${slide.id}-line-${lineIndex}`} className="block">
                        {line.map((segment) => (
                          <span key={`${slide.id}-${lineIndex}-${segment.text}`} className={segment.className}>
                            {segment.text}
                          </span>
                        ))}
                      </span>
                    ))}
                  </h3>

                  <p className="mx-auto mt-3 max-w-[300px] break-keep text-[13px] leading-6 text-[#626262]">
                    {slide.description.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </p>
                </div>

                {slide.imageKind === 'icon' ? (
                  <IconPreview imageSrc={slide.imageSrc} />
                ) : (
                  <PhonePreview imageSrc={slide.imageSrc} />
                )}

                {slide.panel.kind === 'install' ? (
                  <InstallPanel items={slide.panel.items} />
                ) : (
                  <StepPanel tone={slide.panel.tone} items={slide.panel.items} />
                )}
              </article>
            ))}
          </div>
        </div>

        <footer className="shrink-0 border-t border-[#F0EDF5] bg-white/92 px-5 pb-[calc(env(safe-area-inset-bottom,0px)+14px)] pt-3">
          <div className="mb-3 flex justify-center gap-2">
            {GUIDE_SLIDES.map((slide, index) => (
              <button
                type="button"
                key={`${slide.id}-dot`}
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 rounded-full transition-all ${activeIndex === index ? 'w-5 bg-[#A873F5]' : 'w-2.5 bg-[#E3E0E8]'}`}
                aria-label={`${index + 1}번째 안내 보기`}
                aria-current={activeIndex === index ? 'true' : undefined}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 text-left text-[13px] font-semibold text-[#626262]">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(event) => setDontShowAgain(event.target.checked)}
                className="h-4 w-4 shrink-0 rounded border-[#D9D4E6] accent-[#A873F5]"
              />
              <span>다시 보지 않기</span>
            </label>

            <button
              type="button"
              onClick={handlePrimaryAction}
              className="flex min-h-11 min-w-[96px] shrink-0 items-center justify-center rounded-full bg-[#A873F5] px-5 text-[14px] font-bold text-white shadow-[0_8px_18px_rgba(168,115,245,0.22)] transition-transform active:scale-[0.98]"
            >
              {isLastSlide ? '확인' : '다음'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function PhonePreview({ imageSrc }: { imageSrc: string }) {
  return (
    <div className="relative mt-3 flex h-[142px] shrink-0 items-end justify-center overflow-hidden bg-[#FDFCFD]">
      <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-[linear-gradient(180deg,#FDFCFD_0%,rgba(253,252,253,0)_100%)]" />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-[linear-gradient(0deg,#FDFCFD_0%,rgba(253,252,253,0)_100%)]" />
      <Image
        src={imageSrc}
        alt=""
        width={360}
        height={420}
        quality={100}
        draggable={false}
        className="h-[142px] w-[142px] object-contain object-bottom [mask-image:radial-gradient(ellipse_72%_70%_at_50%_56%,#000_52%,rgba(0,0,0,0.72)_70%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_72%_70%_at_50%_56%,#000_52%,rgba(0,0,0,0.72)_70%,transparent_100%)]"
      />
    </div>
  );
}

function IconPreview({ imageSrc }: { imageSrc: string }) {
  return (
    <div className="relative mt-3 flex h-[142px] shrink-0 items-center justify-center overflow-hidden bg-[#FDFCFD]">
      <div className="relative flex h-[118px] w-[118px] items-center justify-center rounded-[30px] bg-white shadow-[0_14px_36px_rgba(93,79,135,0.14)] ring-1 ring-[#EEE5FF]">
        <div className="absolute -left-3 top-4 h-5 w-5 rounded-full bg-[#F6CFE3]" />
        <div className="absolute -right-2 bottom-6 h-4 w-4 rounded-full bg-[#DDEBFF]" />
        <Image
          src={imageSrc}
          alt=""
          width={160}
          height={160}
          quality={100}
          draggable={false}
          className="h-[78px] w-[78px] rounded-[22px] object-contain"
        />
      </div>
    </div>
  );
}

function StepPanel({
  tone,
  items,
}: {
  tone: SlideTone;
  items: readonly { title: string; description: string }[];
}) {
  const styles = PANEL_STYLES[tone];

  return (
    <div className={`mx-1 mb-1 mt-3 shrink-0 overflow-hidden rounded-[22px] px-3.5 py-2 text-left ring-1 ring-white/80 ${styles.background}`}>
      {items.map((item, index) => (
        <div
          key={item.title}
          className={`flex gap-2.5 py-2 ${index > 0 ? `border-t ${styles.divider}` : ''}`}
        >
          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${styles.number}`}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <p className="break-keep text-[13px] font-bold leading-5 text-[#2F2F2F]">{item.title}</p>
            <p className="mt-0.5 break-keep text-[11px] leading-4 text-[#626262]">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function InstallPanel({
  items,
}: {
  items: readonly { platform: string; browser: string; steps: readonly string[] }[];
}) {
  return (
    <div className="mx-1 mb-1 mt-3 shrink-0 rounded-[22px] bg-[linear-gradient(135deg,rgba(248,242,255,0.98),rgba(239,247,255,0.98))] px-3 py-2 text-left ring-1 ring-white/80">
      <div className="grid gap-1.5">
        {items.map((item) => (
          <div key={`${item.platform}-${item.browser}`} className="rounded-[16px] bg-white/72 px-3 py-1.5 ring-1 ring-[#EEE5FF]">
            <p className="text-[13px] font-bold leading-5 text-[#2F2F2F]">
              {item.platform} <span className="text-[#8F72DD]">{item.browser}</span>
            </p>
            <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold leading-4 text-[#626262]">
              {item.steps.map((step, index) => (
                <span key={`${item.platform}-${step}`} className="flex min-w-0 items-center gap-1.5">
                  <span className="min-w-0 truncate">{step}</span>
                  {index < item.steps.length - 1 ? <span className="shrink-0 text-[#B79AF4]">›</span> : null}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
