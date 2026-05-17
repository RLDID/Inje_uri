'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PageContainer, PageContent, PageHeader } from '@/components/layout';
import { PLACEHOLDER_PROFILE_IMAGE } from '@/lib/constants';
import { getUserProfile } from '@/lib/api/users';
import { buildProfileDetailHref, type ProfileEntrySource, useSafeBack } from '@/lib/navigation';
import { formatRelativeTime, getUserAcademicLabel } from '@/lib/utils';
import { readRecentProfileViews, type RecentProfileView } from '@/lib/utils/recentProfiles';
import type { User } from '@/lib/types';

interface RecentProfileItem {
  view: RecentProfileView;
  user: User;
}

const DEFAULT_PROFILE_SOURCE: ProfileEntrySource = 'recommendation';

function RecentViewsPageContent() {
  const { goBack, currentPath } = useSafeBack({ fallbackPath: '/my' });
  const [recentProfiles, setRecentProfiles] = useState<RecentProfileItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecentProfiles() {
      const views = readRecentProfileViews();
      const items = await Promise.all(views.map(async (view) => {
        try {
          const detail = await getUserProfile(view.userId);
          return { view, user: detail.user };
        } catch {
          return null;
        }
      }));

      if (!cancelled) {
        setRecentProfiles(items.filter((item): item is RecentProfileItem => item !== null));
      }
    }

    void loadRecentProfiles();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageContainer>
      <PageHeader title="최근 본 사람" showBack onBack={goBack} showBorder={false} />

      <PageContent className="app-section-stack pb-36 pt-4">
        {recentProfiles.length === 0 ? (
          <div className="rounded-[24px] bg-[var(--color-surface-secondary)] px-6 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-[var(--color-text-muted)] shadow-[0_3px_10px_rgba(34,34,34,0.04)]">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21a8 8 0 0 0-16 0" />
                <circle cx="12" cy="8" r="4" />
              </svg>
            </div>
            <p className="mt-4 text-[15px] font-semibold text-[var(--color-text-primary)]">
              아직 본 프로필이 없어요
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              오늘 우리나 지금 우리에서 프로필을 둘러보면 여기에 시간순으로 모아둘게요.
            </p>
            <Link
              href="/match"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[var(--color-pink-cta)] px-5 text-sm font-semibold text-white shadow-[0_4px_10px_rgba(243,167,192,0.18)]"
            >
              오늘 우리 보러가기
            </Link>
          </div>
        ) : (
          <div className="content-stack">
            {recentProfiles.map(({ view, user }) => (
              <Link
                key={`${user.id}-${view.viewedAt}`}
                href={buildProfileDetailHref(user.id, view.source ?? DEFAULT_PROFILE_SOURCE, {
                  sourcePath: currentPath,
                  fallbackPath: currentPath,
                  sourceSection: 'my',
                })}
                className="block rounded-[22px] bg-[var(--color-surface)] px-4 py-4 shadow-[0_4px_12px_rgba(34,34,34,0.055)] transition-transform active:scale-[0.99]"
              >
                <div className="flex items-center gap-4">
                  <div className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-full bg-[var(--color-surface-secondary)] ring-4 ring-white shadow-[0_4px_10px_rgba(34,34,34,0.06)]">
                    <Image
                      src={user.profileImages[0] || PLACEHOLDER_PROFILE_IMAGE}
                      alt={user.nickname}
                      fill
                      sizes="68px"
                      className="object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
                        {user.nickname}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[13px] font-medium text-[var(--color-text-secondary)]">
                      {getUserAcademicLabel(user)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      {user.mbti && (
                        <span className="inline-flex h-7 items-center rounded-full bg-[var(--color-brand-pink)] px-3 text-[12px] font-semibold text-[var(--color-pink-cta)]">
                          {user.mbti}
                        </span>
                      )}
                      <span className="text-[12px] font-medium text-[var(--color-text-muted)]">
                        {formatRelativeTime(new Date(view.viewedAt))}
                      </span>
                    </div>
                  </div>

                  <svg className="h-5 w-5 shrink-0 text-[var(--color-text-tertiary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </PageContent>
    </PageContainer>
  );
}

export default function RecentViewsPage() {
  return (
    <Suspense fallback={<PageContainer><div /></PageContainer>}>
      <RecentViewsPageContent />
    </Suspense>
  );
}
