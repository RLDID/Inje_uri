'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type PointerEvent, type TouchEvent } from 'react';
import { PageContainer } from '@/components/layout';

type TitleSegment = {
  text: string;
  className?: string;
};

type MaintenancePanel =
  | {
    kind: 'notice';
    title: string;
    description: string;
    items: readonly string[];
  }
  | {
    kind: 'steps';
    tone: 'pink' | 'blue';
    items: readonly { title: string; description: string }[];
  }
  | {
    kind: 'install';
    items: readonly { platform: string; browser: string; steps: readonly string[] }[];
  };

type MaintenanceSlide = {
  id: string;
  badge: string | null;
  title: readonly (readonly TitleSegment[])[];
  description: readonly string[];
  imageSrc: string;
  imageFrameClassName: string;
  imageClassName: string;
  panel: MaintenancePanel;
};

const MAINTENANCE_SLIDES = [
  {
    id: 'maintenance',
    badge: '서버 점검',
    title: [
      [{ text: '인제우리는' }],
      [{ text: '점검 중이에요', className: 'text-[#A873F5]' }],
    ],
    description: ['조금만 기다려줘요.', '더 안정적으로 돌아오도록 빠르게 확인하고 있어요.'],
    imageSrc: '/brand/waiting/w%20(1).png',
    imageFrameClassName: 'h-[clamp(118px,22dvh,252px)] min-[390px]:h-[clamp(150px,27dvh,252px)] [@media(max-height:760px)]:h-[162px] [@media(max-height:700px)]:h-[170px]',
    imageClassName: 'h-[clamp(118px,22dvh,252px)] w-[clamp(118px,22dvh,252px)] min-[390px]:h-[clamp(150px,27dvh,252px)] min-[390px]:w-[clamp(150px,27dvh,252px)] [@media(max-height:760px)]:h-[162px] [@media(max-height:760px)]:w-[162px] [@media(max-height:700px)]:h-[170px] [@media(max-height:700px)]:w-[170px]',
    panel: {
      kind: 'notice',
      title: '잠시만 쉬어갈게요',
      description: '점검이 끝나면 바로 다시 이용할 수 있어요.',
      items: ['로그인과 프로필 이동은 잠시 닫혀 있어요.', '이 화면은 자동으로 계속 넘어가요.'],
    },
  },
  {
    id: 'today',
    badge: null,
    title: [
      [{ text: '오늘,' }],
      [
        { text: '우리', className: 'text-[#F574AE]' },
        { text: '를 만나는 공간' },
      ],
    ],
    description: ['오늘우리에서 하루 한 번', '나와 잘 맞을 수 있는 사람을 추천받을 수 있어요.'],
    imageSrc: '/brand/waiting/w%20(2).png',
    imageFrameClassName: 'h-[clamp(118px,22dvh,252px)] min-[390px]:h-[clamp(150px,27dvh,252px)] [@media(max-height:760px)]:h-[162px] [@media(max-height:700px)]:h-[170px]',
    imageClassName: 'h-[clamp(114px,21dvh,246px)] w-[clamp(114px,21dvh,246px)] min-[390px]:h-[clamp(146px,26dvh,246px)] min-[390px]:w-[clamp(146px,26dvh,246px)] [@media(max-height:760px)]:h-[158px] [@media(max-height:760px)]:w-[158px] [@media(max-height:700px)]:h-[166px] [@media(max-height:700px)]:w-[166px]',
    panel: {
      kind: 'steps',
      tone: 'pink',
      items: [
        { title: '오늘의 추천 확인', description: '매일 한 번 새로운 추천을 확인해요.' },
        { title: '하트 보내기', description: '관심이 가는 사람에게 하트를 보낼 수 있어요.' },
        { title: '서로 하트가 오면', description: '24시간 채팅방이 열려요.' },
      ],
    },
  },
  {
    id: 'now',
    badge: null,
    title: [
      [{ text: '지금 같이 갈' }],
      [
        { text: '사람', className: 'text-[#6F9DFB]' },
        { text: '을 찾아요' },
      ],
    ],
    description: ['밥, 산책, 카페처럼', '지금 같이 하고 싶은 일을 가볍게 올릴 수 있어요.'],
    imageSrc: '/brand/waiting/w%20(3).png',
    imageFrameClassName: 'h-[clamp(118px,22dvh,252px)] min-[390px]:h-[clamp(150px,27dvh,252px)] [@media(max-height:760px)]:h-[162px] [@media(max-height:700px)]:h-[170px]',
    imageClassName: 'h-[clamp(114px,21dvh,246px)] w-[clamp(114px,21dvh,246px)] min-[390px]:h-[clamp(146px,26dvh,246px)] min-[390px]:w-[clamp(146px,26dvh,246px)] [@media(max-height:760px)]:h-[158px] [@media(max-height:760px)]:w-[158px] [@media(max-height:700px)]:h-[166px] [@media(max-height:700px)]:w-[166px]',
    panel: {
      kind: 'steps',
      tone: 'blue',
      items: [
        { title: '지금 할 일을 올려요', description: '작성한 피드는 24시간 동안 보여요.' },
        { title: '관심 있는 글을 확인해요', description: '같이 하고 싶은 글에 하트를 보낼 수 있어요.' },
        { title: '서로 하트가 오면', description: '2시간 채팅방이 열려요.' },
      ],
    },
  },
  {
    id: 'install',
    badge: null,
    title: [
      [{ text: '홈 화면에서' }],
      [
        { text: '더 빠르게', className: 'text-[#A873F5]' },
        { text: ' 열어요' },
      ],
    ],
    description: ['주소를 매번 입력하지 않고', '인제우리를 바로 시작할 수 있어요.'],
    imageSrc: '/brand/bear-logo.png',
    imageFrameClassName: 'h-[clamp(108px,19dvh,216px)] min-[390px]:h-[clamp(138px,23dvh,226px)] [@media(max-height:700px)]:h-[154px]',
    imageClassName: 'h-[76px] w-[76px] min-[390px]:h-[88px] min-[390px]:w-[88px]',
    panel: {
      kind: 'install',
      items: [
        { platform: 'Galaxy', browser: '브라우저', steps: ['메뉴', '홈 화면에 추가'] },
        { platform: 'Galaxy', browser: 'Chrome', steps: ['메뉴', '홈 화면에 추가'] },
        { platform: 'iPhone', browser: 'Safari', steps: ['공유', '홈 화면에 추가'] },
      ],
    },
  },
] as const satisfies readonly MaintenanceSlide[];

const LOOP_SLIDES = [...MAINTENANCE_SLIDES, MAINTENANCE_SLIDES[0]];
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

export function MaintenancePageClient() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const dragStartXRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const slideCount = MAINTENANCE_SLIDES.length;
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
    <PageContainer withBottomNav={false} className="bg-[#FAFAFA]">
      <main className="min-h-dvh touch-pan-y overflow-x-hidden px-3 py-3 min-[390px]:px-4 min-[390px]:py-4 [@media(max-height:650px)]:py-2">
        <section className="flex h-[calc(100dvh-24px)] flex-col overflow-hidden rounded-[28px] border border-[#F0F0F0] bg-[#FDFCFD] px-5 pb-4 pt-4 text-center shadow-[0_16px_46px_rgba(28,31,35,0.08)] min-[390px]:h-[calc(100dvh-32px)] min-[390px]:px-6 min-[390px]:pb-5 min-[390px]:pt-7 [@media(max-height:650px)]:h-auto [@media(max-height:650px)]:min-h-[calc(100dvh-16px)]">
          <div
            className="min-h-0 flex-1 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                  className="flex h-full min-h-0 w-full shrink-0 flex-col overflow-y-auto overscroll-contain px-1 pb-2 pt-2 [scrollbar-width:none] min-[390px]:pt-4 [&::-webkit-scrollbar]:hidden [@media(max-height:760px)]:pt-1"
                >
                  <div className={`shrink-0 ${slide.badge ? 'min-h-[clamp(110px,18dvh,164px)]' : 'min-h-[clamp(108px,16dvh,150px)] pt-3 min-[390px]:pt-5 [@media(max-height:760px)]:pt-2'}`}>
                    {slide.badge ? (
                      <p className="mx-auto mb-3 inline-flex min-h-8 items-center rounded-full border border-[#E5D5FF] bg-[#F8F2FF] px-4 text-[13px] font-bold text-[#9A70F3] min-[390px]:mb-4 min-[390px]:min-h-9">
                        {slide.badge}
                      </p>
                    ) : null}

                    <h1 className="break-keep text-[30px] font-bold leading-[1.22] text-[#2D2D2D] min-[390px]:text-[32px] min-[390px]:leading-[1.28] [@media(max-height:760px)]:text-[28px] [@media(max-height:760px)]:leading-[1.18]">
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

                    <p className="mx-auto mt-3 max-w-[310px] break-keep text-[14px] leading-6 text-[#626262] min-[390px]:mt-4 min-[390px]:text-[15px] min-[390px]:leading-7 [@media(max-height:760px)]:mt-2 [@media(max-height:760px)]:text-[13px] [@media(max-height:760px)]:leading-5">
                      {slide.description.map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </p>
                  </div>

                  {slide.panel.kind === 'install' ? (
                    <InstallPreview imageSrc={slide.imageSrc} frameClassName={slide.imageFrameClassName} imageClassName={slide.imageClassName} />
                  ) : (
                    <div className={`relative mt-3 flex shrink-0 items-end justify-center overflow-hidden bg-[#FDFCFD] [@media(max-height:760px)]:mt-2 [@media(max-height:650px)]:mt-4 ${slide.imageFrameClassName}`}>
                      <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-[linear-gradient(180deg,#FDFCFD_0%,rgba(253,252,253,0)_100%)]" />
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-[linear-gradient(0deg,#FDFCFD_0%,rgba(253,252,253,0)_100%)]" />
                      <span className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-[linear-gradient(90deg,#FDFCFD_0%,rgba(253,252,253,0)_100%)]" />
                      <span className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-[linear-gradient(270deg,#FDFCFD_0%,rgba(253,252,253,0)_100%)]" />
                      <Image
                        src={slide.imageSrc}
                        alt=""
                        width={640}
                        height={760}
                        quality={100}
                        priority={index === 0}
                        draggable={false}
                        className={`${slide.imageClassName} object-contain object-bottom [mask-image:radial-gradient(ellipse_70%_70%_at_50%_56%,#000_50%,rgba(0,0,0,0.72)_68%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_70%_70%_at_50%_56%,#000_50%,rgba(0,0,0,0.72)_68%,transparent_100%)]`}
                      />
                    </div>
                  )}

                  {slide.panel.kind === 'notice' ? (
                    <NoticePanel title={slide.panel.title} description={slide.panel.description} items={slide.panel.items} />
                  ) : slide.panel.kind === 'install' ? (
                    <InstallPanel items={slide.panel.items} />
                  ) : (
                    <StepPanel tone={slide.panel.tone} items={slide.panel.items} />
                  )}
                </article>
              ))}
            </div>
          </div>

          <div className="mt-2 flex shrink-0 justify-center gap-2.5 min-[390px]:mt-3 min-[390px]:gap-3">
            {MAINTENANCE_SLIDES.map((slide, index) => (
              <button
                type="button"
                key={`${slide.id}-dot`}
                onClick={() => goToSlide(index)}
                className={`h-2.5 w-2.5 rounded-full transition-colors min-[390px]:h-3 min-[390px]:w-3 ${logicalActiveIndex === index ? 'bg-[#A873F5]' : 'bg-[#E8E8E8]'}`}
                aria-label={`${index + 1}번째 점검 화면 보기`}
                aria-current={logicalActiveIndex === index ? 'true' : undefined}
              />
            ))}
          </div>
        </section>
      </main>
    </PageContainer>
  );
}

function NoticePanel({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: readonly string[];
}) {
  return (
    <div className="mx-1 mb-1 mt-3 shrink-0 overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,rgba(248,242,255,0.98),rgba(239,247,255,0.98))] px-4 py-3 text-left ring-1 ring-white/80 min-[390px]:px-5 min-[390px]:py-4 [@media(max-height:760px)]:mt-2 [@media(max-height:760px)]:py-2.5">
      <p className="text-[15px] font-bold leading-6 text-[#2F2F2F]">{title}</p>
      <p className="mt-1 break-keep text-[12px] leading-5 text-[#626262] min-[390px]:text-[13px]">{description}</p>
      <div className="mt-3 grid gap-1.5">
        {items.map((item) => (
          <p key={item} className="rounded-[14px] bg-white/74 px-3 py-2 text-[12px] font-semibold leading-5 text-[#575757] ring-1 ring-[#EEE5FF]">
            {item}
          </p>
        ))}
      </div>
    </div>
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
    <div className={`mx-1 mb-1 mt-3 shrink-0 overflow-hidden rounded-[22px] px-4 py-2.5 text-left ring-1 ring-white/80 min-[390px]:px-5 min-[390px]:py-3 [@media(max-height:760px)]:mt-2 [@media(max-height:760px)]:px-3.5 [@media(max-height:760px)]:py-1.5 ${styles.background}`}>
      {items.map((item, index) => (
        <div
          key={item.title}
          className={`flex gap-3 py-2 min-[390px]:gap-4 min-[390px]:py-3 [@media(max-height:760px)]:gap-2.5 [@media(max-height:760px)]:py-1.5 ${index > 0 ? `border-t ${styles.divider}` : ''}`}
        >
          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold min-[390px]:h-8 min-[390px]:w-8 min-[390px]:text-[13px] [@media(max-height:760px)]:h-7 [@media(max-height:760px)]:w-7 [@media(max-height:760px)]:text-[12px] ${styles.number}`}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <p className="break-keep text-[14px] font-bold leading-5 text-[#2F2F2F] min-[390px]:text-[15px] min-[390px]:leading-6 [@media(max-height:760px)]:text-[13px] [@media(max-height:760px)]:leading-5">{item.title}</p>
            <p className="mt-0.5 break-keep text-[11px] leading-4 text-[#626262] min-[390px]:text-[12px] min-[390px]:leading-5 [@media(max-height:760px)]:text-[11px] [@media(max-height:760px)]:leading-4">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function InstallPreview({
  imageSrc,
  frameClassName,
  imageClassName,
}: {
  imageSrc: string;
  frameClassName: string;
  imageClassName: string;
}) {
  return (
    <div className={`relative mt-3 flex shrink-0 items-center justify-center overflow-hidden bg-[#FDFCFD] [@media(max-height:650px)]:mt-4 ${frameClassName}`}>
      <div className="relative flex h-[118px] w-[118px] items-center justify-center rounded-[30px] bg-white shadow-[0_14px_36px_rgba(93,79,135,0.14)] ring-1 ring-[#EEE5FF] min-[390px]:h-[132px] min-[390px]:w-[132px]">
        <Image
          src={imageSrc}
          alt=""
          width={180}
          height={180}
          quality={100}
          draggable={false}
          className={`${imageClassName} rounded-[22px] object-contain`}
        />
      </div>
    </div>
  );
}

function InstallPanel({
  items,
}: {
  items: readonly { platform: string; browser: string; steps: readonly string[] }[];
}) {
  return (
    <div className="mx-1 mb-1 mt-3 shrink-0 rounded-[22px] bg-[linear-gradient(135deg,rgba(248,242,255,0.98),rgba(239,247,255,0.98))] px-3 py-2 text-left ring-1 ring-white/80 min-[390px]:px-4 min-[390px]:py-2.5">
      <div className="grid gap-1.5 min-[390px]:gap-2">
        {items.map((item) => (
          <div key={`${item.platform}-${item.browser}`} className="rounded-[16px] bg-white/72 px-3 py-1.5 ring-1 ring-[#EEE5FF] min-[390px]:px-4 min-[390px]:py-2">
            <p className="text-[13px] font-bold leading-5 text-[#2F2F2F] min-[390px]:text-[14px]">
              {item.platform} <span className="text-[#8F72DD]">{item.browser}</span>
            </p>
            <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold leading-4 text-[#626262] min-[390px]:gap-2 min-[390px]:text-[12px]">
              {item.steps.map((step, index) => (
                <span key={`${item.platform}-${step}`} className="flex min-w-0 items-center gap-1.5 min-[390px]:gap-2">
                  <span className="min-w-0 truncate">{step}</span>
                  {index < item.steps.length - 1 ? <span className="shrink-0 text-[#B79AF4]">→</span> : null}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
