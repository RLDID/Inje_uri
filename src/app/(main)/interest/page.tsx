'use client';

import { Suspense, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { PageContainer, PageContent, PageHeader, PageSection } from '@/components/layout';
import { InterestCard } from '@/components/interest';
import { Button, useToast } from '@/components/ui';
import { getChatButtonStatus, mockInterests, mockSentInterests } from '@/lib/data';
import { PLACEHOLDER_PROFILE_IMAGE } from '@/lib/constants';
import {
  buildChatRoomHref,
  buildProfileDetailHref,
  useCurrentRouteContext,
  useSafeBack,
} from '@/lib/navigation';
import type { Interest } from '@/lib/types';
import { getUserAcademicLabel } from '@/lib/utils';

type TabType = 'received' | 'sent';
type InterestSectionState = 'pending' | 'matched' | 'chat_available' | 'expired';

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  return `${diffDay}일 전`;
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
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="content-stack">
      <div>
        <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">{description}</p>
      </div>
      <div className="content-stack-compact">{children}</div>
    </section>
  );
}


function SentInterestCard({
  interest,
  onViewProfile,
  actionLabel,
  onAction,
  statusLabel,
  statusColor,
  statusDescription,
}: {
  interest: Interest;
  onViewProfile: () => void;
  actionLabel?: string;
  onAction?: () => void;
  statusLabel: string;
  statusColor: string;
  statusDescription: string;
}) {
  const targetUser = interest.toUser;

  if (!targetUser) {
    return null;
  }

  return (
    <PageSection className="content-stack shadow-none">
      <div className="flex gap-3">
        <button type="button" onClick={onViewProfile} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[18px] bg-[var(--color-surface-secondary)]">
          <Image
            src={targetUser.profileImages[0] || PLACEHOLDER_PROFILE_IMAGE}
            alt={targetUser.nickname}
            fill
            className="object-cover"
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="mobile-meta-stack">
            <div className="meta-wrap">
              <button type="button" onClick={onViewProfile} className="font-semibold text-[var(--color-text-primary)]">
                {targetUser.nickname}
              </button>
              {targetUser.isGraduate && (
                <span className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-secondary)]">
                  졸업생
                </span>
              )}
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusColor}`}>
                {statusLabel}
              </span>
            </div>

            <p className="text-[13px] text-[var(--color-text-secondary)]">{getUserAcademicLabel(targetUser)}</p>

            {interest.message && (
              <div className="section-card-muted px-3.5 py-3">
                <p className="line-clamp-2 text-sm leading-6 text-[var(--color-text-secondary)]">&ldquo;{interest.message}&rdquo;</p>
              </div>
            )}

            <p className="text-sm leading-6 text-[var(--color-text-secondary)]">{statusDescription}</p>
            <p className="text-xs text-[var(--color-text-tertiary)]">{getTimeAgo(interest.createdAt)}</p>
          </div>
        </div>
      </div>

      <div className="action-stack">
        <Button variant="secondary" fullWidth size="md" onClick={onViewProfile}>
          프로필 보기
        </Button>
        <Button fullWidth size="md" onClick={onAction} disabled={!onAction}>
          {actionLabel ?? '상태 확인'}
        </Button>
      </div>
    </PageSection>
  );
}

function NoInterestsWithActions() {
  return (
    <PageSection className="content-stack items-center px-6 py-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-secondary)]">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-secondary)]">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
        </svg>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">아직 받은 호감이 없어요</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
          프로필 사진과 소개, 추천 설정을 다듬어두면 다음 반응이 더 자연스러워질 수 있어요.
        </p>
      </div>

      <div className="action-stack w-full">
        <Link
          href="/my/profile/edit#profile-photos"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white"
        >
          프로필 사진 다듬기
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

function NoSentInterests() {
  return (
    <PageSection className="content-stack items-center px-6 py-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-secondary)]">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-primary)]">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">아직 보낸 호감이 없어요</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
          오늘의 추천이나 지금 우리에서 마음이 가는 상대에게 먼저 반응해보세요.
        </p>
      </div>

      <div className="action-stack w-full">
        <Link
          href="/match"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white"
        >
          오늘의 추천 보기
        </Link>
        <Link
          href="/self-date"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--color-surface-secondary)] px-4 py-3 text-sm font-semibold text-[var(--color-text-secondary)]"
        >
          지금 우리 둘러보기
        </Link>
      </div>
    </PageSection>
  );
}

function InterestPageContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { currentPath, ownerSection } = useCurrentRouteContext();
  const { goBack } = useSafeBack();

  const [receivedInterests, setReceivedInterests] = useState(mockInterests);
  const [sentInterests] = useState(mockSentInterests);

  const activeTab: TabType = searchParams.get('tab') === 'sent' ? 'sent' : 'received';

  const receivedGroups = useMemo(
    () => groupInterestsByState(receivedInterests, (interest) => interest.fromUser.id),
    [receivedInterests],
  );
  const sentGroups = useMemo(
    () => groupInterestsByState(sentInterests, (interest) => interest.toUser?.id ?? interest.toUserId),
    [sentInterests],
  );

  const handleStartChat = (userId: string) => {
    const chatStatus = getChatButtonStatus(userId);

    if (chatStatus.type === 'existing_chat') {
      router.push(buildChatRoomHref(chatStatus.chatId, {
        sourcePath: currentPath,
        fallbackPath: currentPath,
      }));
      return;
    }

    showToast('대화를 시작할 준비가 됐어요.', 'success');
    router.push('/chat');
  };

  const handleSendBackInterest = (interestId: string) => {
    setReceivedInterests((prevInterests) => prevInterests.map((interest) => (
      interest.id === interestId
        ? { ...interest, status: 'accepted', isRead: true }
        : interest
    )));
    showToast('맞호감을 보냈어요. 이제 자연스럽게 이어질 수 있어요.', 'success');
  };

  const handleViewProfile = (userId: string) => {
    router.push(buildProfileDetailHref(userId, 'interest', {
      sourcePath: currentPath,
      sourceSection: ownerSection,
      fallbackPath: currentPath,
    }));
  };

  const handleTabChange = (nextTab: TabType) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === 'received') {
      params.delete('tab');
    } else {
      params.set('tab', nextTab);
    }

    const nextSearch = params.toString();
    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false });
  };

  const receivedActiveCount =
    receivedGroups.pending.length + receivedGroups.matched.length + receivedGroups.chat_available.length;
  const sentActiveCount =
    sentGroups.pending.length + sentGroups.matched.length + sentGroups.chat_available.length;

  return (
    <PageContainer>
      <PageHeader
        title="호감"
        subtitle={
          activeTab === 'received'
            ? `${receivedGroups.pending.length}명의 새로운 반응이 있어요.`
            : `${sentActiveCount}건의 보낸 호감 상태를 확인할 수 있어요.`
        }
        showBack
        onBack={goBack}
      />

      <div className="sticky top-[64px] z-30 border-b border-[var(--color-border-light)] bg-[var(--color-surface)]">
        <div className="flex">
          <button
            type="button"
            onClick={() => handleTabChange('received')}
            className={`flex-1 py-3 text-center text-[15px] font-medium transition-colors ${
              activeTab === 'received'
                ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'text-[var(--color-text-secondary)]'
            }`}
          >
            받은 호감
            {receivedGroups.pending.length > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-secondary)] px-1.5 text-xs font-semibold text-white">
                {receivedGroups.pending.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('sent')}
            className={`flex-1 py-3 text-center text-[15px] font-medium transition-colors ${
              activeTab === 'sent'
                ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'text-[var(--color-text-secondary)]'
            }`}
          >
            보낸 호감
            {sentActiveCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] px-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
                {sentActiveCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <PageContent className="app-section-stack px-5 py-4">
        {activeTab === 'received' ? (
          receivedActiveCount === 0 ? (
            <NoInterestsWithActions />
          ) : (
            <>
              {receivedGroups.pending.length > 0 && (
                <SectionBlock title="새로 받은 호감" description="프로필을 천천히 보고 괜찮다면 맞호감을 보내보세요.">
                  {receivedGroups.pending.map((interest) => (
                    <InterestCard
                      key={interest.id}
                      interest={interest}
                      canStartChat
                      onStartChat={() => handleSendBackInterest(interest.id)}
                      onViewProfile={() => handleViewProfile(interest.fromUser.id)}
                      primaryActionLabel="맞호감 보내기"
                      statusLabel="새 호감"
                      statusDescription="지금 바로 반응하지 않아도 괜찮아요. 먼저 둘러봐도 돼요."
                    />
                  ))}
                </SectionBlock>
              )}

              {receivedGroups.chat_available.length > 0 && (
                <SectionBlock title="바로 이어갈 수 있어요" description="서로 호감이 확인돼서 대화가 이미 열려 있어요.">
                  {receivedGroups.chat_available.map((interest) => (
                    <InterestCard
                      key={interest.id}
                      interest={interest}
                      canStartChat
                      onStartChat={() => handleStartChat(interest.fromUser.id)}
                      onViewProfile={() => handleViewProfile(interest.fromUser.id)}
                      primaryActionLabel="대화 이어가기"
                      statusLabel="채팅 가능"
                      statusDescription="바로 채팅으로 이동해 이야기를 이어가보세요."
                    />
                  ))}
                </SectionBlock>
              )}

              {receivedGroups.matched.length > 0 && (
                <SectionBlock title="매칭 완료" description="서로 호감이 확인됐어요. 다음 단계로 이어갈 수 있어요.">
                  {receivedGroups.matched.map((interest) => (
                    <InterestCard
                      key={interest.id}
                      interest={interest}
                      canStartChat
                      onStartChat={() => handleStartChat(interest.fromUser.id)}
                      onViewProfile={() => handleViewProfile(interest.fromUser.id)}
                      primaryActionLabel="채팅 시작하기"
                      statusLabel="매칭 완료"
                      statusDescription="이제 자연스럽게 대화를 시작해도 좋아요."
                    />
                  ))}
                </SectionBlock>
              )}

              {receivedGroups.expired.length > 0 && (
                <SectionBlock title="응답 종료" description="기간이 지나서 더 이상 이어지지 않는 호감이에요.">
                  {receivedGroups.expired.map((interest) => (
                    <InterestCard
                      key={interest.id}
                      interest={interest}
                      canStartChat={false}
                      onStartChat={() => undefined}
                      onViewProfile={() => handleViewProfile(interest.fromUser.id)}
                      statusLabel="종료"
                      statusDescription="지금은 확인만 할 수 있고, 다시 이어지지는 않아요."
                    />
                  ))}
                </SectionBlock>
              )}
            </>
          )
        ) : sentActiveCount === 0 && sentGroups.expired.length === 0 ? (
          <NoSentInterests />
        ) : (
          <>
            {sentGroups.pending.length > 0 && (
              <SectionBlock title="기다리는 중" description="상대가 아직 호감을 확인하는 중이에요.">
                {sentGroups.pending.map((interest) => (
                  <SentInterestCard
                    key={interest.id}
                    interest={interest}
                    onViewProfile={() => interest.toUser && handleViewProfile(interest.toUser.id)}
                    statusLabel="대기 중"
                    statusColor="bg-[var(--color-secondary-light)] text-[var(--color-secondary)]"
                    statusDescription="상대가 아직 답하기 전이에요. 잠시만 기다려보세요."
                  />
                ))}
              </SectionBlock>
            )}

            {sentGroups.chat_available.length > 0 && (
              <SectionBlock title="채팅 가능" description="서로 호감이 이어져서 바로 대화를 시작할 수 있어요.">
                {sentGroups.chat_available.map((interest) => (
                  <SentInterestCard
                    key={interest.id}
                    interest={interest}
                    onViewProfile={() => interest.toUser && handleViewProfile(interest.toUser.id)}
                    actionLabel="대화 이어가기"
                    onAction={() => interest.toUser && handleStartChat(interest.toUser.id)}
                    statusLabel="채팅 가능"
                    statusColor="bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                    statusDescription="채팅방이 열려 있어 지금 바로 이동할 수 있어요."
                  />
                ))}
              </SectionBlock>
            )}

            {sentGroups.matched.length > 0 && (
              <SectionBlock title="매칭 완료" description="상대도 호감을 확인했어요. 다음 단계로 이어질 수 있어요.">
                {sentGroups.matched.map((interest) => (
                  <SentInterestCard
                    key={interest.id}
                    interest={interest}
                    onViewProfile={() => interest.toUser && handleViewProfile(interest.toUser.id)}
                    actionLabel="채팅 시작하기"
                    onAction={() => interest.toUser && handleStartChat(interest.toUser.id)}
                    statusLabel="매칭 완료"
                    statusColor="bg-[var(--color-secondary-light)] text-[var(--color-secondary)]"
                    statusDescription="서로 마음이 이어졌어요. 편하게 대화를 시작해보세요."
                  />
                ))}
              </SectionBlock>
            )}

            {sentGroups.expired.length > 0 && (
              <SectionBlock title="응답 종료" description="기간이 지나 종료됐거나 더 이상 이어지지 않는 상태예요.">
                {sentGroups.expired.map((interest) => (
                  <SentInterestCard
                    key={interest.id}
                    interest={interest}
                    onViewProfile={() => interest.toUser && handleViewProfile(interest.toUser.id)}
                    statusLabel={interest.status === 'declined' ? '정리됨' : '만료됨'}
                    statusColor="bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]"
                    statusDescription="지금은 이 흐름을 다시 이어갈 수 없어요."
                  />
                ))}
              </SectionBlock>
            )}
          </>
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
