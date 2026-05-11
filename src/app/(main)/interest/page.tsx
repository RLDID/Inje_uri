'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { InterestCard } from '@/components/interest';
import { PageContainer, PageContent, PageHeader, PageSection } from '@/components/layout';
import { useToast } from '@/components/ui';
import { acceptInterest, declineInterest, getReceivedInterests } from '@/lib/api/interests';
import { getMe } from '@/lib/api/profile';
import { usePolling } from '@/lib/hooks/usePolling';
import {
  buildChatRoomHref,
  buildProfileDetailHref,
  useCurrentRouteContext,
  useSafeBack,
} from '@/lib/navigation';
import type { Interest } from '@/lib/types';

type InterestSectionState = 'pending' | 'matched' | 'chat_available' | 'expired';

function appendProfileDetailParams(
  href: string,
  params: Record<string, string | number | null | undefined>,
): string {
  const [pathAndQuery, hash = ''] = href.split('#');
  const [pathname, query = ''] = pathAndQuery.split('?');
  const searchParams = new URLSearchParams(query);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return `${pathname}${queryString ? `?${queryString}` : ''}${hash ? `#${hash}` : ''}`;
}

function getInterestSectionState(interest: Interest): InterestSectionState {
  if (interest.status === 'pending') return 'pending';
  if (interest.status === 'accepted') return 'matched';
  return 'expired';
}

function groupInterestsByState(interests: Interest[]): Record<InterestSectionState, Interest[]> {
  return interests.reduce<Record<InterestSectionState, Interest[]>>(
    (groups, interest) => {
      groups[getInterestSectionState(interest)].push(interest);
      return groups;
    },
    {
      pending: [],
      matched: [],
      chat_available: [],
      expired: [],
    },
  );
}

function SectionBlock({
  title,
  description,
  badge,
  titleClassName = 'text-[15px]',
  children,
}: {
  title: string;
  description: string;
  badge?: string;
  titleClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="content-stack">
      <div>
        <h2 className={`${titleClassName} font-semibold text-[var(--color-text-primary)]`}>{title}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">{description}</p>
          {badge && (
            <span className="inline-flex items-center rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
              {badge}
            </span>
          )}
        </div>
      </div>
      <div className="content-stack-compact">{children}</div>
    </section>
  );
}

function NoInterestsWithActions() {
  return (
    <PageSection className="content-stack items-center px-6 py-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-secondary)]">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-[var(--color-text-secondary)]"
          aria-hidden="true"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
        </svg>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">아직 받은 하트가 없어요</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
          프로필을 채우면 새로운 하트를 받을 수 있어요
        </p>
      </div>

      <div className="action-stack w-full">
        <Link
          href="/my/profile/edit#profile-photos"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--color-action-primary)] px-4 py-3 text-sm font-semibold text-[var(--color-action-primary-text)]"
        >
          프로필 사진 등록하기
        </Link>
        <Link
          href="/my/settings"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--color-surface-secondary)] px-4 py-3 text-sm font-semibold text-[var(--color-text-secondary)]"
        >
          추천 설정 보기
        </Link>
        <Link
          href="/self-date/create"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--color-surface-secondary)] px-4 py-3 text-sm font-semibold text-[var(--color-text-secondary)]"
        >
          지금우리 글 올리기
        </Link>
      </div>
    </PageSection>
  );
}

function InterestPageContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const { currentPath, ownerSection } = useCurrentRouteContext();
  const { goBack } = useSafeBack();
  const [viewedAt] = useState(() => Date.now());
  const [receivedInterests, setReceivedInterests] = useState<Interest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshReceivedInterests = useCallback(async () => {
    try {
      const me = await getMe();
      const interests = await getReceivedInterests(me.id);
      setReceivedInterests(interests);
    } catch {
      // Keep the current list during background polling; the next tick can retry.
    }
  }, []);

  usePolling(refreshReceivedInterests, {
    intervalMs: 7000,
    enabled: true,
    immediate: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadReceivedInterests() {
      try {
        const me = await getMe();
        const interests = await getReceivedInterests(me.id);
        if (!cancelled) {
          setReceivedInterests(interests);
        }
      } catch (error) {
        if (!cancelled) {
          showToast(error instanceof Error ? error.message : '받은 하트를 불러오지 못했어요.', 'error');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadReceivedInterests();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const visibleReceivedInterests = useMemo(
    () => receivedInterests.filter((interest) => interest.status === 'pending'),
    [receivedInterests],
  );

  const receivedGroups = useMemo(
    () => groupInterestsByState(visibleReceivedInterests),
    [visibleReceivedInterests],
  );

  const handleSendBackInterest = async (interestId: string) => {
    const acceptedInterest = receivedInterests.find((interest) => interest.id === interestId);

    if (!acceptedInterest) {
      return;
    }

    try {
      const result = await acceptInterest(interestId);
      setReceivedInterests((prevInterests) => prevInterests.filter((interest) => interest.id !== interestId));
      await refreshReceivedInterests();
      showToast('채팅방이 열렸어요.', 'success');

      if (result.chat_room_id) {
        router.push(buildChatRoomHref(String(result.chat_room_id), {
          sourcePath: currentPath,
          fallbackPath: currentPath,
        }));
        return;
      }

      router.push('/chat');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '하트를 수락하지 못했어요.', 'error');
    }
  };

  const handleSkipInterest = async (interestId: string) => {
    try {
      await declineInterest(interestId);
      setReceivedInterests((prevInterests) => prevInterests.filter((interest) => interest.id !== interestId));
      await refreshReceivedInterests();
      showToast('하트를 거절했어요.', 'info');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '하트를 거절하지 못했어요.', 'error');
    }
  };

  const handleViewProfile = (interest: Interest) => {
    const profileHref = buildProfileDetailHref(interest.fromUser.id, 'interest', {
      sourcePath: currentPath,
      sourceSection: ownerSection,
      fallbackPath: currentPath,
    });

    router.push(appendProfileDetailParams(profileHref, {
      interestId: interest.id,
    }));
  };

  const receivedActiveCount = receivedGroups.pending.length;

  return (
    <PageContainer>
      <PageHeader
        title=""
        showBack
        onBack={goBack}
      />

      <PageContent className="app-section-stack px-5 py-4">
        {isLoading ? (
          <PageSection className="px-6 py-10 text-center text-sm text-[var(--color-text-secondary)]">
            받은 하트를 불러오는 중이에요
          </PageSection>
        ) : receivedActiveCount === 0 ? (
          <NoInterestsWithActions />
        ) : (
          <SectionBlock
            title="받은 하트"
            description="나를 좋아하는 사람"
            badge={`총 ${receivedGroups.pending.length}명`}
            titleClassName="text-[22px] leading-8"
          >
            {receivedGroups.pending.map((interest) => (
              <InterestCard
                key={interest.id}
                interest={interest}
                canStartChat
                onStartChat={() => handleSendBackInterest(interest.id)}
                onViewProfile={() => handleViewProfile(interest)}
                onSkip={() => handleSkipInterest(interest.id)}
                nowMs={viewedAt}
              />
            ))}
          </SectionBlock>
        )}
      </PageContent>
    </PageContainer>
  );
}

export default function InterestPage() {
  return (
    <Suspense fallback={<PageContainer><div /></PageContainer>}>
      <InterestPageContent />
    </Suspense>
  );
}
