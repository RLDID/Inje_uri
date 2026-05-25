'use client';

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { PageContainer, PageContent } from '@/components/layout';
import { useToast } from '@/components/ui';
import { getMe } from '@/lib/api/profile';
import { logout } from '@/lib/api/settings';
import { PLACEHOLDER_PROFILE_IMAGE } from '@/lib/constants';
import type { User } from '@/lib/types';
import { getUserAcademicLabel } from '@/lib/utils';

const IDEAL_KEYWORD_CHIP_GAP = 8;
const LOGIN_PATH = '/p/l0g8n';

type MenuItem =
  | {
      id: string;
      label: string;
      description: string;
      href: string;
      icon: ReactNode;
    }
  | {
      id: string;
      label: string;
      description: string;
      comingSoonMessage: string;
      icon: ReactNode;
    };

const menuItems: MenuItem[] = [
  {
    id: 'notice',
    label: '공지사항',
    description: '인제우리의 새로운 소식과 안내를 확인해요.',
    comingSoonMessage: '공지사항 화면은 준비 중이에요.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: '이상형 추천 설정',
    description: '선호 페이즈와 추천 조건을 이곳에서 따로 관리해요.',
    href: '/my/settings',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    id: 'notification',
    label: '알림 설정',
    description: '학교 브라우저 알림 설정은 준비되는 대로 이곳에서 관리할 수 있어요.',
    comingSoonMessage: '알림 설정 화면은 준비 중이에요.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    id: 'blocks',
    label: '차단한 사용자',
    description: '내가 차단한 사용자를 확인하고 해제할 수 있어요.',
    href: '/my/blocks',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="M9 12h6" />
      </svg>
    ),
  },
  {
    id: 'support',
    label: '고객센터',
    description: '자주 묻는 질문과 안전/신고 안내를 확인할 수 있어요.',
    href: '/my/support',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
].filter((item) => item.id !== 'notification');

const idealKeywordLabelMap: Record<string, string> = {
  comfortable: '편안함',
  exciting: '설렘',
  intellectual: '대화 잘 통함',
  funny: '유머',
  serious: '진지한 만남',
  casual: '가볍게',
  restaurant: '맛집 탐방',
  cafe: '카페 투어',
  movie: '영화',
  walk: '산책',
  activity: '운동',
  home: '동네 데이트',
  concert: '공연',
  bookstore: '서점',
  'slow-replier': '빠른 답장',
  'no-plans': '약속 중요',
  'too-fast': '천천히',
};

function getIdealKeywordLabels(user: User | null) {
  if (!user) {
    return [];
  }

  const keywords = [
    ...user.desiredVibe,
    user.dateStyle,
    ...user.dealBreakers,
  ].filter((keyword): keyword is string => Boolean(keyword));

  return keywords.map((keyword) => idealKeywordLabelMap[keyword] ?? keyword);
}

function MyPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [imgError, setImgError] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const idealKeywords = useMemo(() => getIdealKeywordLabels(currentUser), [currentUser]);
  const [visibleIdealKeywordCount, setVisibleIdealKeywordCount] = useState(() => Math.min(idealKeywords.length, 4));
  const idealKeywordRowRef = useRef<HTMLDivElement>(null);
  const idealKeywordMeasureRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const idealKeywordMoreMeasureRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (searchParams.get('tab') === 'feeds') {
      router.replace('/my/posts');
    }
  }, [router, searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      try {
        const me = await getMe();
        if (!cancelled) {
          setCurrentUser(me);
        }
      } catch (error) {
        if (!cancelled) {
          showToast(error instanceof Error ? error.message : '내 정보를 불러오지 못했어요.', 'error');
        }
      }
    }

    void loadMe();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  useEffect(() => {
    const row = idealKeywordRowRef.current;

    if (!row) {
      return;
    }

    const updateVisibleIdealKeywords = () => {
      const availableWidth = row.clientWidth;

      if (availableWidth <= 0) {
        return;
      }

      const chipWidths = idealKeywords.map((_, index) => (
        idealKeywordMeasureRefs.current[index]?.offsetWidth ?? 0
      ));
      const moreChipWidth = idealKeywordMoreMeasureRef.current?.offsetWidth ?? 44;
      let usedWidth = 0;
      let nextVisibleCount = 0;

      for (let index = 0; index < chipWidths.length; index += 1) {
        const chipWidth = chipWidths[index];
        const widthWithGap = nextVisibleCount > 0 ? IDEAL_KEYWORD_CHIP_GAP + chipWidth : chipWidth;
        const hiddenCountAfterThisChip = idealKeywords.length - (index + 1);
        const reservedMoreWidth = hiddenCountAfterThisChip > 0
          ? IDEAL_KEYWORD_CHIP_GAP + moreChipWidth
          : 0;

        if (usedWidth + widthWithGap + reservedMoreWidth > availableWidth) {
          break;
        }

        usedWidth += widthWithGap;
        nextVisibleCount += 1;
      }

      const safeVisibleCount = idealKeywords.length > 0
        ? Math.max(1, nextVisibleCount)
        : 0;

      setVisibleIdealKeywordCount((prevCount) => (
        prevCount === safeVisibleCount ? prevCount : safeVisibleCount
      ));
    };

    updateVisibleIdealKeywords();

    const resizeObserver = new ResizeObserver(updateVisibleIdealKeywords);
    resizeObserver.observe(row);
    window.addEventListener('resize', updateVisibleIdealKeywords);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateVisibleIdealKeywords);
    };
  }, [idealKeywords]);

  if (searchParams.get('tab') === 'feeds') {
    return (
      <PageContainer>
        <div />
      </PageContainer>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
      setCurrentUser(null);
      router.replace(LOGIN_PATH);
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '로그아웃하지 못했어요.', 'error');
    }
  };

  if (!currentUser) {
    return (
      <PageContainer>
        <PageContent className="py-20 text-center text-sm text-[var(--color-text-secondary)]">
          내 정보를 불러오는 중이에요
        </PageContent>
      </PageContainer>
    );
  }

  const imageSrc = imgError ? PLACEHOLDER_PROFILE_IMAGE : (currentUser.profileImages[0] || PLACEHOLDER_PROFILE_IMAGE);
  const visibleIdealKeywords = idealKeywords.slice(0, visibleIdealKeywordCount);
  const hiddenIdealKeywordCount = Math.max(idealKeywords.length - visibleIdealKeywords.length, 0);

  return (
    <PageContainer>
      <header className="sticky top-0 z-40 flex min-h-[76px] items-center bg-[var(--color-surface)]/95 px-5 py-3 backdrop-blur-xl">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
          마이
        </h1>
      </header>

      <PageContent className="app-section-stack">
        <Link href="/my/profile" className="block">
          <section className="p-0">
            <div className="flex items-center gap-5 px-0 py-3">
              <div className="relative h-[140px] w-[140px] shrink-0 overflow-hidden rounded-full bg-[var(--color-surface-secondary)] ring-4 ring-white shadow-[0_5px_12px_rgba(34,34,34,0.08)]">
                <Image
                  src={imageSrc}
                  alt={currentUser.nickname}
                  fill
                  sizes="140px"
                  className="object-cover"
                  onError={() => setImgError(true)}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[22px] font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
                    {currentUser.nickname}
                  </span>
                  {/*
                    <span
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5BAEF6] text-white shadow-sm"
                      aria-label="학교 인증"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m5 12 4 4 10-10" />
                      </svg>
                    </span>
                  */}
                </div>
                <p className="mt-1.5 truncate text-[14px] font-medium text-[var(--color-text-secondary)]">
                  {getUserAcademicLabel(currentUser)}
                </p>
                {currentUser.mbti && (
                  <div className="mt-2 flex">
                    <span className="inline-flex h-7 items-center rounded-full bg-[var(--color-brand-pink)] px-3 text-[12px] font-semibold text-[var(--color-pink-cta)]">
                      {currentUser.mbti}
                    </span>
                  </div>
                )}
              </div>

              <svg className="mt-1 h-5 w-5 shrink-0 text-[var(--color-text-tertiary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </section>
        </Link>

        <section className="relative !mt-2 grid w-full grid-cols-3 overflow-hidden rounded-[20px] bg-white px-2 py-3">
          <span className="pointer-events-none absolute left-1/3 top-1/2 h-12 w-px -translate-y-1/2 bg-[var(--color-border-light)]" aria-hidden="true" />
          <span className="pointer-events-none absolute left-2/3 top-1/2 h-12 w-px -translate-y-1/2 bg-[var(--color-border-light)]" aria-hidden="true" />
          <Link href="/my/posts" className="group flex min-w-0 flex-col items-center justify-center gap-1.5 px-1.5 py-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white text-[var(--color-pink-cta)] transition-transform group-active:scale-95">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                <path d="m14 6 4 4" />
              </svg>
            </span>
            <span className="whitespace-nowrap text-[13px] font-semibold text-[var(--color-text-secondary)]">
              내가 쓴 피드
            </span>
          </Link>

          <Link href="/my/posts?tab=liked" className="group flex min-w-0 flex-col items-center justify-center gap-1.5 px-1.5 py-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white text-[var(--color-pink-cta)] transition-transform group-active:scale-95">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
              </svg>
            </span>
            <span className="whitespace-nowrap text-[13px] font-semibold text-[var(--color-text-secondary)]">
              좋아요한 피드
            </span>
          </Link>

          <Link href="/my/recent-views" className="group flex min-w-0 flex-col items-center justify-center gap-1.5 px-1.5 py-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white text-[#5BAEF6] transition-transform group-active:scale-95">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21a8 8 0 0 0-16 0" />
                <circle cx="12" cy="8" r="4" />
              </svg>
            </span>
            <span className="whitespace-nowrap text-[13px] font-semibold text-[var(--color-text-secondary)]">
              최근 본 사람
            </span>
          </Link>
        </section>

        <Link href="/my/ideal-type" className="relative block rounded-[20px] border border-[var(--color-border-light)] px-4 py-4 transition-transform active:scale-[0.99]" aria-label="이상형 키워드 수정하기">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[18px] font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">
              이상형 키워드
            </h2>
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </span>
          </div>
          <div ref={idealKeywordRowRef} className="mt-3 flex items-center gap-2 overflow-hidden">
            {visibleIdealKeywords.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex h-9 shrink-0 items-center rounded-full bg-[var(--color-surface-secondary)] px-3.5 text-[13px] font-semibold text-[var(--color-text-secondary)]"
              >
                {keyword}
              </span>
            ))}
            {hiddenIdealKeywordCount > 0 && (
              <span className="inline-flex h-9 shrink-0 items-center rounded-full bg-[var(--color-surface-secondary)] px-3.5 text-[13px] font-semibold text-[var(--color-text-secondary)]">
                +{hiddenIdealKeywordCount}
              </span>
            )}
          </div>
          <div className="invisible pointer-events-none absolute -z-10 flex gap-2 whitespace-nowrap" aria-hidden="true">
            {idealKeywords.map((keyword, index) => (
              <span
                key={`${keyword}-${index}`}
                ref={(node) => {
                  idealKeywordMeasureRefs.current[index] = node;
                }}
                className="inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-[13px] font-semibold"
              >
                {keyword}
              </span>
            ))}
            <span
              ref={idealKeywordMoreMeasureRef}
              className="inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-[13px] font-semibold"
            >
              +99
            </span>
          </div>
        </Link>

        <div className="divide-y divide-[var(--color-border-light)] overflow-hidden rounded-[20px] bg-[var(--color-surface)] shadow-[0_4px_14px_rgba(34,34,34,0.055)]">
            {menuItems.map((item) => (
              'href' in item ? (
                <Link key={item.id} href={item.href} className="block">
                  <div className="flex items-center gap-4 px-4 py-5 transition-colors hover:bg-[var(--color-surface-secondary)]">
                    <span className="shrink-0 text-[var(--color-text-secondary)]">{item.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[var(--color-text-primary)]">{item.label}</p>
                    </div>
                    <svg className="h-5 w-5 shrink-0 text-[var(--color-text-tertiary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </Link>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => showToast(item.comingSoonMessage, 'info')}
                  className="flex w-full items-center gap-4 px-4 py-5 text-left transition-colors hover:bg-[var(--color-surface-secondary)]"
                >
                  <span className="shrink-0 text-[var(--color-text-secondary)]">{item.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--color-text-primary)]">{item.label}</p>
                  </div>
                  <svg className="h-5 w-5 shrink-0 text-[var(--color-text-tertiary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              )
            ))}
        </div>

        <div className="pb-6 text-center">
          <button
            type="button"
            onClick={handleLogout}
            className="mx-auto mb-5 inline-flex h-11 items-center justify-center rounded-full bg-[var(--color-surface)] px-6 text-sm font-semibold text-[var(--color-text-secondary)] shadow-[0_3px_10px_rgba(34,34,34,0.06)] transition active:scale-[0.98]"
          >
            로그아웃
          </button>
          <div className="mt-3 flex justify-center gap-4 text-xs text-[var(--color-text-tertiary)]">
            <Link href="/my/terms" className="transition-colors hover:text-[var(--color-text-secondary)]">이용약관</Link>
            <span className="text-[var(--color-border)]">|</span>
            <Link href="/my/privacy" className="transition-colors hover:text-[var(--color-text-secondary)]">개인정보처리방침</Link>
          </div>
        </div>
      </PageContent>
    </PageContainer>
  );
}

export default function MyPage() {
  return (
    <Suspense fallback={<PageContainer><div /></PageContainer>}>
      <MyPageContent />
    </Suspense>
  );
}
