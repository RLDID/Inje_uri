'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type PointerEvent, type TouchEvent } from 'react';
import { PageContainer } from '@/components/layout';
import { SECTION_ROOTS } from '@/lib/navigation';

const MY_PROFILE_HREF = `${SECTION_ROOTS.my}/profile?waiting=1`;
const LAUNCH_AT = new Date('2026-05-25T00:00:00+09:00').getTime();
const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const WAITING_SLIDES = [
  {
    id: 'open',
    badge: '+ 인제우리 준비 중 +',
    title: [
      [{ text: '인제우리가' }],
      [{ text: '곧 열려요', className: 'text-[#A873F5]' }],
    ],
    description: ['지금은 프로필을 먼저 준비하는 기간이에요.', '오픈되면 오늘우리와 지금우리를', '바로 사용할 수 있어요.'],
    imageSrc: '/brand/waiting/w%20(1).png',
    imageFrameClassName: 'h-[clamp(150px,27dvh,252px)]',
    imageClassName: 'h-[clamp(150px,27dvh,252px)] w-[clamp(150px,27dvh,252px)]',
    panel: {
      kind: 'countdown',
      eyebrow: '정식 오픈까지',
      day: 'D-03',
      time: '12:24:08',
    },
  },
  {
    id: 'today',
    badge: null,
    title: [
      [{ text: '오늘, 새로운' }],
      [
        { text: '우리', className: 'text-[#F574AE]' },
        { text: '를 만나요' },
      ],
    ],
    description: ['오늘우리는 하루에 한 번,', '나와 잘 맞을 수 있는 사람을 추천해주는 공간이에요.'],
    imageSrc: '/brand/waiting/w%20(2).png',
    imageFrameClassName: 'h-[clamp(150px,27dvh,252px)]',
    imageClassName: 'h-[clamp(146px,26dvh,246px)] w-[clamp(146px,26dvh,246px)]',
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
    badge: null,
    title: [
      [{ text: '지금, 같이 할' }],
      [
        { text: '사람', className: 'text-[#6F9DFB]' },
        { text: '을 찾아요' },
      ],
    ],
    description: ['밥, 산책, 카페, 공부처럼', '지금 같이 하고 싶은 일을 가볍게 올릴 수 있어요.'],
    imageSrc: '/brand/waiting/w%20(3).png',
    imageFrameClassName: 'h-[clamp(150px,27dvh,252px)]',
    imageClassName: 'h-[clamp(146px,26dvh,246px)] w-[clamp(146px,26dvh,246px)]',
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
] as const;
const LOOP_SLIDES = [...WAITING_SLIDES, WAITING_SLIDES[0]];
const AUTOPLAY_INTERVAL_MS = 5000;

const PANEL_STYLES = {
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
} as const;

function padTime(value: number): string {
  return String(value).padStart(2, '0');
}

function getLaunchCountdown() {
  const remainingMs = LAUNCH_AT - Date.now();
  const safeRemainingMs = Math.max(0, remainingMs);
  const days = Math.floor(safeRemainingMs / DAY_MS);
  const hours = Math.floor((safeRemainingMs % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((safeRemainingMs % HOUR_MS) / MINUTE_MS);
  const seconds = Math.floor((safeRemainingMs % MINUTE_MS) / SECOND_MS);

  return {
    day: `D-${padTime(days)}`,
    time: `${padTime(hours)}:${padTime(minutes)}:${padTime(seconds)}`,
    isOpen: remainingMs <= 0,
  };
}

export default function WaitingPage() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const [countdown, setCountdown] = useState<{ day: string; time: string; isOpen: boolean } | null>(null);
  const dragStartXRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const slideCount = WAITING_SLIDES.length;
  const logicalActiveIndex = activeIndex % slideCount;

  const goToSlide = (index: number) => {
    setIsResetting(false);
    setActiveIndex(Math.max(0, Math.min(index, slideCount - 1)));
  };

  const goToNextSlide = () => {
    setIsResetting(false);
    setActiveIndex((currentIndex) => (currentIndex >= slideCount ? 1 : currentIndex + 1));
  };

  const goToPreviousSlide = () => {
    setIsResetting(false);
    setActiveIndex((currentIndex) => (currentIndex <= 0 ? slideCount - 1 : currentIndex - 1));
  };

  useEffect(() => {
    if (isResetting) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setActiveIndex((currentIndex) => (currentIndex >= slideCount ? 1 : currentIndex + 1));
    }, AUTOPLAY_INTERVAL_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [activeIndex, isResetting, slideCount]);

  useEffect(() => {
    const refreshCountdown = () => {
      const nextCountdown = getLaunchCountdown();
      setCountdown(nextCountdown);

      if (nextCountdown.isOpen) {
        router.replace(SECTION_ROOTS.match);
      }
    };

    refreshCountdown();
    const timerId = window.setInterval(refreshCountdown, SECOND_MS);

    return () => {
      window.clearInterval(timerId);
    };
  }, [router]);

  const handleSlideTransitionEnd = () => {
    if (activeIndex !== slideCount) {
      return;
    }

    setIsResetting(true);
    setActiveIndex(0);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setIsResetting(false);
      });
    });
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') {
      return;
    }

    dragStartXRef.current = event.clientX;
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') {
      return;
    }

    const startX = dragStartXRef.current;
    dragStartXRef.current = null;

    if (startX === null) {
      return;
    }

    const distance = event.clientX - startX;
    if (Math.abs(distance) < 40) {
      return;
    }

    if (distance < 0) {
      goToNextSlide();
    } else {
      goToPreviousSlide();
    }
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
    } else {
      goToPreviousSlide();
    }
  };

  return (
    <PageContainer
      withBottomNav={false}
      className="bg-[#FAFAFA]"
    >
      <main className="h-dvh overflow-hidden px-3 py-3 min-[390px]:px-4 min-[390px]:py-4">
        <section
          className="flex h-[calc(100dvh-24px)] flex-col overflow-hidden rounded-[28px] border border-[#F0F0F0] bg-[#FDFCFD] px-5 pb-3 pt-4 text-center shadow-[0_16px_46px_rgba(28,31,35,0.08)] min-[390px]:h-[calc(100dvh-32px)] min-[390px]:px-6 min-[390px]:pb-4 min-[390px]:pt-7"
        >
          <div
            className="min-h-0 flex-1 overflow-hidden touch-pan-y"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => {
              dragStartXRef.current = null;
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={() => {
              touchStartXRef.current = null;
              touchStartYRef.current = null;
            }}
          >
            <div
              className={`flex h-full ${isResetting ? 'transition-none' : 'transition-transform duration-300 ease-out'}`}
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
              onTransitionEnd={handleSlideTransitionEnd}
            >
              {LOOP_SLIDES.map((slide, index) => (
                <article
                  key={`${slide.id}-${index}`}
                  className="flex h-full w-full shrink-0 flex-col px-1 pb-1 pt-2 min-[390px]:pt-4"
                >
                  <div className={`min-h-[clamp(118px,20dvh,164px)] ${slide.badge ? '' : 'pt-3 min-[390px]:pt-5'}`}>
                    {slide.badge ? (
                      <p className="mx-auto mb-3 inline-flex min-h-8 items-center rounded-full border border-[#E5D5FF] bg-[#F8F2FF] px-4 text-[13px] font-bold text-[#9A70F3] min-[390px]:mb-4 min-[390px]:min-h-9">
                        {slide.badge}
                      </p>
                    ) : null}

                    <h1 className="break-keep text-[30px] font-bold leading-[1.22] text-[#2D2D2D] min-[390px]:text-[32px] min-[390px]:leading-[1.28]">
                      {slide.title.map((line, lineIndex) => (
                        <span key={`${slide.id}-line-${lineIndex}`} className="block">
                          {line.map((segment) => (
                            <span
                              key={`${slide.id}-${lineIndex}-${segment.text}`}
                              className={'className' in segment ? segment.className : undefined}
                            >
                              {segment.text}
                            </span>
                          ))}
                        </span>
                      ))}
                    </h1>

                    <p className="mx-auto mt-3 max-w-[300px] break-keep text-[14px] leading-6 text-[#626262] min-[390px]:mt-4 min-[390px]:text-[15px] min-[390px]:leading-7">
                      {slide.description.map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </p>
                  </div>

                  <div className={`relative mt-1 flex shrink-0 items-end justify-center overflow-hidden bg-[#FDFCFD] ${slide.imageFrameClassName}`}>
                    <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-[linear-gradient(180deg,#FDFCFD_0%,rgba(253,252,253,0)_100%)]" />
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-[linear-gradient(0deg,#FDFCFD_0%,rgba(253,252,253,0)_100%)]" />
                    <span className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-[linear-gradient(90deg,#FDFCFD_0%,rgba(253,252,253,0)_100%)]" />
                    <span className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-[linear-gradient(270deg,#FDFCFD_0%,rgba(253,252,253,0)_100%)]" />
                    <Image
                      src={slide.imageSrc}
                      alt=""
                      width={640}
                      height={760}
                      priority={slide.id === 'open' && index === 0}
                      draggable={false}
                      className={`${slide.imageClassName} object-contain object-bottom blur-[0.2px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_56%,#000_50%,rgba(0,0,0,0.72)_68%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_70%_70%_at_50%_56%,#000_50%,rgba(0,0,0,0.72)_68%,transparent_100%)]`}
                    />
                  </div>

                  {slide.panel.kind === 'countdown' ? (
                    <div className="mx-1 mb-1 mt-2 overflow-hidden rounded-[22px] bg-white/92 px-4 py-3 ring-1 ring-[#F1ECFA] min-[390px]:py-4">
                      <p className="text-[13px] font-medium text-[#595959] min-[390px]:text-[14px]">{slide.panel.eyebrow}</p>
                      <p className="mt-2 text-[36px] font-bold leading-none text-[#9B72F0] min-[390px]:mt-3 min-[390px]:text-[42px]">{countdown?.day ?? 'D-00'}</p>
                      <p className="mt-2 font-mono text-[23px] font-semibold leading-none text-[#303030] min-[390px]:mt-3 min-[390px]:text-[26px]">{countdown?.time ?? '00:00:00'}</p>
                    </div>
                  ) : (
                    <StepPanel tone={slide.panel.tone} items={slide.panel.items} />
                  )}
                </article>
              ))}
            </div>
          </div>

          <div className="mt-1 flex shrink-0 justify-center gap-3 min-[390px]:mt-2">
            {WAITING_SLIDES.map((slide, index) => (
              <button
                type="button"
                key={`${slide.id}-dot`}
                onClick={() => goToSlide(index)}
                className={`h-3 w-3 rounded-full transition-colors ${logicalActiveIndex === index ? 'bg-[#A873F5]' : 'bg-[#E8E8E8]'}`}
                aria-label={`${index + 1}번째 대기 화면 보기`}
                aria-current={logicalActiveIndex === index ? 'true' : undefined}
              />
            ))}
          </div>

          <Link
            href={MY_PROFILE_HREF}
            className="mt-3 flex min-h-12 w-full shrink-0 items-center justify-center rounded-[20px] bg-[var(--color-pink-cta)] px-5 text-[16px] font-bold text-white shadow-[0_12px_24px_rgba(243,167,192,0.22)] transition hover:bg-[var(--color-action-primary-hover)] active:scale-[0.99] min-[390px]:mt-4 min-[390px]:min-h-14 min-[390px]:text-[17px]"
          >
            내 프로필 확인하기
          </Link>
        </section>
      </main>
    </PageContainer>
  );
}

function StepPanel({
  tone,
  items,
}: {
  tone: 'pink' | 'blue';
  items: readonly { title: string; description: string }[];
}) {
  const styles = PANEL_STYLES[tone];

  return (
    <div className={`mx-1 mb-1 mt-2 overflow-hidden rounded-[22px] px-4 py-2.5 text-left ring-1 ring-white/80 min-[390px]:px-5 min-[390px]:py-3 ${styles.background}`}>
      {items.map((item, index) => (
        <div
          key={item.title}
          className={`flex gap-3 py-2 min-[390px]:gap-4 min-[390px]:py-3 ${index > 0 ? `border-t ${styles.divider}` : ''}`}
        >
          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold min-[390px]:h-8 min-[390px]:w-8 min-[390px]:text-[13px] ${styles.number}`}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <p className="break-keep text-[14px] font-bold leading-5 text-[#2F2F2F] min-[390px]:text-[15px] min-[390px]:leading-6">{item.title}</p>
            <p className="mt-0.5 break-keep text-[11px] leading-4 text-[#626262] min-[390px]:text-[12px] min-[390px]:leading-5">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
