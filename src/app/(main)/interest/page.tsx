'use client';

import { Suspense, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { InterestCard } from '@/components/interest';
import { PageContainer, PageContent, PageHeader, PageSection } from '@/components/layout';
import { useToast } from '@/components/ui';
import { getChatButtonStatus, mockInterests } from '@/lib/data';
import {
  buildChatRoomHref,
  buildProfileDetailHref,
  readRouteViewState,
  useCurrentRouteContext,
  useSafeBack,
  writeRouteViewState,
} from '@/lib/navigation';
import type { Interest } from '@/lib/types';

const INTEREST_HIDDEN_USER_IDS_KEY = 'interest:hidden-user-ids';
const INTEREST_CHAT_STARTED_USER_IDS_KEY = 'interest:chat-started-user-ids';
type InterestSectionState = 'pending' | 'matched' | 'chat_available' | 'expired';

const subscribeToHiddenInterestUserIds = () => () => undefined;

function getHiddenInterestUserIdsSnapshot() {
  return JSON.stringify(readRouteViewState<string[]>(INTEREST_HIDDEN_USER_IDS_KEY, []));
}

function getHiddenInterestUserIdsServerSnapshot() {
  return '[]';
}

function addUserIdToRouteState(key: string, userId: string): string[] {
  const currentIds = readRouteViewState<string[]>(key, []);
  const nextIds = Array.from(new Set([...currentIds, userId]));
  writeRouteViewState<string[]>(key, nextIds);

  return nextIds;
}

function getInterestSectionState(interest: Interest, targetUserId: string): InterestSectionState {
  if (interest.status === 'pending') {
    return 'pending';
  }

  if (interest.status === 'accepted') {
    return getChatButtonStatus(targetUserId).type === 'existing_chat' ? 'chat_available' : 'matched';
  }

  return 'expired';
}

function groupInterestsByState(
  interests: Interest[],
  getTargetUserId: (interest: Interest) => string,
): Record<InterestSectionState, Interest[]> {
  return interests.reduce<Record<InterestSectionState, Interest[]>>(
    (groups, interest) => {
      const sectionState = getInterestSectionState(interest, getTargetUserId(interest));
      groups[sectionState].push(interest);
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
          프로필을 채우면 새로운 하트를 받을 수 있어요.
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
          지금 우리 글 올리기
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
  const hiddenInterestUserIdsSnapshot = useSyncExternalStore(
    subscribeToHiddenInterestUserIds,
    getHiddenInterestUserIdsSnapshot,
    getHiddenInterestUserIdsServerSnapshot,
  );
  const hiddenInterestUserIds = useMemo(() => {
    try {
      return JSON.parse(hiddenInterestUserIdsSnapshot) as string[];
    } catch {
      return [];
    }
  }, [hiddenInterestUserIdsSnapshot]);
  const [receivedInterests, setReceivedInterests] = useState(mockInterests);
  const visibleReceivedInterests = useMemo(
    () => receivedInterests.filter((interest) => interest.status === 'pending' && !hiddenInterestUserIds.includes(interest.fromUser.id)),
    [hiddenInterestUserIds, receivedInterests],
  );

  const receivedGroups = useMemo(
    () => groupInterestsByState(visibleReceivedInterests, (interest) => interest.fromUser.id),
    [visibleReceivedInterests],
  );

  const handleSendBackInterest = (interestId: string) => {
    const acceptedInterest = receivedInterests.find((interest) => interest.id === interestId);

    if (!acceptedInterest) {
      return;
    }

    const nextHiddenIds = Array.from(new Set([...hiddenInterestUserIds, acceptedInterest.fromUser.id]));
    writeRouteViewState<string[]>(INTEREST_HIDDEN_USER_IDS_KEY, nextHiddenIds);
    addUserIdToRouteState(INTEREST_CHAT_STARTED_USER_IDS_KEY, acceptedInterest.fromUser.id);
    setReceivedInterests((prevInterests) => prevInterests.filter((interest) => interest.id !== interestId));
    showToast('채팅방이 열렸어요.', 'success');

    const chatStatus = getChatButtonStatus(acceptedInterest.fromUser.id);

    if (chatStatus.type === 'existing_chat') {
      router.push(buildChatRoomHref(chatStatus.chatId, {
        sourcePath: currentPath,
        fallbackPath: currentPath,
      }));
      return;
    }

    router.push('/chat');
  };

  const handleSkipInterest = (interestId: string) => {
    const skippedInterest = receivedInterests.find((interest) => interest.id === interestId);

    if (skippedInterest) {
      const nextIds = Array.from(new Set([...hiddenInterestUserIds, skippedInterest.fromUser.id]));
      writeRouteViewState<string[]>(INTEREST_HIDDEN_USER_IDS_KEY, nextIds);
    }

    setReceivedInterests((prevInterests) => prevInterests.filter((interest) => interest.id !== interestId));
    showToast('하트를 거절했어요.', 'info');
  };

  const handleViewProfile = (userId: string) => {
    router.push(buildProfileDetailHref(userId, 'interest', {
      sourcePath: currentPath,
      sourceSection: ownerSection,
      fallbackPath: currentPath,
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
        {receivedActiveCount === 0 ? (
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
                onViewProfile={() => handleViewProfile(interest.fromUser.id)}
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
