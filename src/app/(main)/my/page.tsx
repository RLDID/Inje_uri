'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { PageContainer, PageContent, PageHeader, PageSection, SectionHeading } from '@/components/layout';
import { Badge, useToast } from '@/components/ui';
import { currentUser } from '@/lib/data';
import { PLACEHOLDER_PROFILE_IMAGE } from '@/lib/constants';
import { getUserAcademicLabel } from '@/lib/utils';

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
    id: 'ideal-type',
    label: '이상형 키워드 수정하기',
    description: '이런 만남을 원해요에 들어갈 키워드만 따로 관리해요.',
    href: '/my/ideal-type',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: '추천 설정',
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
    id: 'support',
    label: '고객센터',
    description: '문의와 이용 안내가 준비되는 대로 이곳에서 확인할 수 있어요.',
    comingSoonMessage: '고객센터 화면은 준비 중이에요.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
];

function MyPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (searchParams.get('tab') === 'feeds') {
      router.replace('/my/posts');
    }
  }, [router, searchParams]);

  if (searchParams.get('tab') === 'feeds') {
    return (
      <PageContainer>
        <div />
      </PageContainer>
    );
  }

  const imageSrc = imgError ? PLACEHOLDER_PROFILE_IMAGE : currentUser.profileImages[0];

  return (
    <PageContainer>
      <PageHeader title="마이" subtitle="프로필, 추천 설정, 이상형 키워드를 역할에 맞게 따로 관리해요." />

      <PageContent className="app-section-stack">
        <Link href="/my/profile" className="block">
          <PageSection className="p-0">
            <div className="flex items-start gap-4 p-5">
              <div className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-full bg-[var(--color-surface-secondary)] ring-2 ring-[var(--color-primary)]/15">
                <Image
                  src={imageSrc}
                  alt={currentUser.nickname}
                  width={76}
                  height={76}
                  className="h-full w-full object-cover"
                  onError={() => setImgError(true)}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="meta-wrap">
                  <span className="text-lg font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
                    {currentUser.nickname}
                  </span>
                  {currentUser.isGraduate && (
                    <span className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-secondary)]">
                      졸업생
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {getUserAcademicLabel(currentUser)}
                </p>
                <div className="mt-3 chip-wrap">
                  {currentUser.mbti && <Badge variant="primary" size="sm">{currentUser.mbti}</Badge>}
                </div>
              </div>

              <svg className="mt-1 h-5 w-5 shrink-0 text-[var(--color-text-tertiary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </PageSection>
        </Link>

        <PageSection>
          <SectionHeading
            eyebrow="Settings"
            title="설정과 관리"
          />

          <div className="mt-5 divide-y divide-[var(--color-border-light)] overflow-hidden rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-surface)]">
            {menuItems.map((item) => (
              'href' in item ? (
                <Link key={item.id} href={item.href} className="block">
                  <div className="flex items-start gap-4 px-4 py-4 transition-colors hover:bg-[var(--color-surface-secondary)]">
                    <span className="mt-0.5 shrink-0 text-[var(--color-text-secondary)]">{item.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[var(--color-text-primary)]">{item.label}</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">{item.description}</p>
                    </div>
                    <svg className="mt-1 h-5 w-5 shrink-0 text-[var(--color-text-tertiary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </Link>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => showToast(item.comingSoonMessage, 'info')}
                  className="flex w-full items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-[var(--color-surface-secondary)]"
                >
                  <span className="mt-0.5 shrink-0 text-[var(--color-text-secondary)]">{item.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--color-text-primary)]">{item.label}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">{item.description}</p>
                  </div>
                  <svg className="mt-1 h-5 w-5 shrink-0 text-[var(--color-text-tertiary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              )
            ))}
          </div>
        </PageSection>

        <div className="pb-6 text-center">
          <p className="text-xs text-[var(--color-text-tertiary)]">인제우리 v0.3.0</p>
          <div className="mt-3 flex justify-center gap-4 text-xs text-[var(--color-text-tertiary)]">
            <button className="transition-colors hover:text-[var(--color-text-secondary)]">이용약관</button>
            <span className="text-[var(--color-border)]">|</span>
            <button className="transition-colors hover:text-[var(--color-text-secondary)]">개인정보처리방침</button>
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
