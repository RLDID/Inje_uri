'use client';

import { Suspense, startTransition, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/brand';
import { PageContainer, PageContent } from '@/components/layout';
import { ProfileCardCarousel } from '@/components/match/ProfileCardCarousel';
import { useToast } from '@/components/ui';
import {
  getOtherParticipant,
  getMyStories,
  isChatInExpiryWarningWindow,
  mockChats,
  mockDailyRecommendation,
  mockInterests,
} from '@/lib/data';
import { buildChatRoomHref, readRouteViewState, writeRouteViewState } from '@/lib/navigation';
import { getDailyRecommendationRefreshLabel } from '@/lib/utils';

const MATCH_VIEW_STATE_KEY = 'match:daily-recommendation';
const MATCH_READ_NOTIFICATION_IDS_KEY = 'match:read-notification-ids';
const MATCH_DELETED_NOTIFICATION_IDS_KEY = 'match:deleted-notification-ids';
const INTEREST_HIDDEN_USER_IDS_KEY = 'interest:hidden-user-ids';
const INTEREST_CHAT_STARTED_USER_IDS_KEY = 'interest:chat-started-user-ids';

interface MatchViewState {
  currentIndex: number;
  viewedCount: number;
  selectedUserId?: string;
  isSelectionMade: boolean;
  hiddenUserIds?: string[];
}

interface MatchNotification {
  id: string;
  href: string;
  title: string;
  description: string;
  createdAt: Date;
  unread?: boolean;
}

function addUserIdToRouteState(key: string, userId: string): string[] {
  const currentIds = readRouteViewState<string[]>(key, []);
  const nextIds = Array.from(new Set([...currentIds, userId]));
  writeRouteViewState<string[]>(key, nextIds);

  return nextIds;
}

function formatNotificationTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const period = hours < 12 ? '오전' : '오후';
  const displayHours = hours % 12 || 12;

  return `${period} ${displayHours}:${minutes}`;
}

function BellIcon({
  hasUnread,
  isOpen,
  onClick,
}: {
  hasUnread: boolean;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-text-primary)] transition-colors active:bg-[var(--color-chip-background)] ${
        isOpen ? 'bg-[var(--color-chip-background)]' : ''
      }`}
      aria-label="알림"
      aria-expanded={isOpen}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8.8a6 6 0 0 0-12 0c0 7-3 7-3 8.5h18c0-1.5-3-1.5-3-8.5" />
        <path d="M9.8 20a2.4 2.4 0 0 0 4.4 0" />
      </svg>
      {hasUnread && (
        <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-[var(--color-pink-cta)] ring-2 ring-white" />
      )}
    </button>
  );
}

function HeaderHeartIcon({
  hasReceivedHeart,
  onClick,
}: {
  hasReceivedHeart: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-all active:scale-95 ${
        hasReceivedHeart
          ? 'bg-[var(--color-brand-pink)] text-[var(--color-pink-cta)] shadow-[0_3px_7px_rgba(243,167,192,0.18)]'
          : 'text-[var(--color-text-primary)] active:bg-[var(--color-chip-background)]'
      }`}
      aria-label="받은 하트"
    >
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 20.45c-.38 0-.74-.14-1.02-.38-3.7-3.18-6.13-5.38-7.29-6.6-1.18-1.22-1.77-2.57-1.77-4.05 0-1.3.43-2.38 1.28-3.23.86-.86 1.93-1.29 3.21-1.29 1.48 0 2.74.62 3.8 1.85L12 8.81l1.79-2.06c1.06-1.23 2.33-1.85 3.8-1.85 1.28 0 2.35.43 3.21 1.29.85.85 1.28 1.93 1.28 3.23 0 1.48-.59 2.83-1.77 4.05-1.16 1.22-3.59 3.42-7.29 6.6-.28.24-.64.38-1.02.38Z"
          fill={hasReceivedHeart ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={hasReceivedHeart ? '1.35' : '1.85'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {hasReceivedHeart && (
          <path
            d="M7.2 7.25c-.87.34-1.42 1.15-1.42 2.12"
            stroke="white"
            strokeWidth="1.35"
            strokeLinecap="round"
            opacity="0.75"
          />
        )}
      </svg>
      {hasReceivedHeart && (
        <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[var(--color-pink-cta)] ring-2 ring-white shadow-[0_1px_3px_rgba(243,167,192,0.22)]" />
      )}
    </button>
  );
}

function MatchPageContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const [recommendation, setRecommendation] = useState(mockDailyRecommendation);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>([]);
  const [hasRestoredViewState, setHasRestoredViewState] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [deletedNotificationIds, setDeletedNotificationIds] = useState<string[]>([]);
  const [hiddenInterestUserIdsForHeader, setHiddenInterestUserIdsForHeader] = useState<string[]>([]);

  useEffect(() => {
    const savedViewState = readRouteViewState<MatchViewState | null>(MATCH_VIEW_STATE_KEY, null);

    startTransition(() => {
      if (!savedViewState) {
        setHasRestoredViewState(true);
        return;
      }

      const restoredHiddenUserIds = savedViewState.hiddenUserIds ?? [];
      const restoredHiddenUserIdSet = new Set(restoredHiddenUserIds);
      const restoredUsers = mockDailyRecommendation.users.filter((user) => !restoredHiddenUserIdSet.has(user.id));
      const clampedIndex = Math.max(
        0,
        Math.min(savedViewState.currentIndex, Math.max(restoredUsers.length - 1, 0)),
      );
      const hasSelectedUser = Boolean(
        savedViewState.selectedUserId &&
          restoredUsers.some((user) => user.id === savedViewState.selectedUserId),
      );

      setCurrentIndex(clampedIndex);
      setHiddenUserIds(restoredHiddenUserIds);
      setRecommendation((prevRecommendation) => ({
        ...prevRecommendation,
        users: restoredUsers,
        viewedCount: savedViewState.viewedCount,
        selectedUserId: hasSelectedUser ? savedViewState.selectedUserId : undefined,
        isSelectionMade: hasSelectedUser ? savedViewState.isSelectionMade : false,
      }));
      setHasRestoredViewState(true);
    });
  }, []);

  useEffect(() => {
    if (!hasRestoredViewState) {
      return;
    }

    writeRouteViewState<MatchViewState>(MATCH_VIEW_STATE_KEY, {
      currentIndex,
      viewedCount: recommendation.viewedCount,
      selectedUserId: recommendation.selectedUserId,
      isSelectionMade: recommendation.isSelectionMade,
      hiddenUserIds,
    });
  }, [
    currentIndex,
    hasRestoredViewState,
    hiddenUserIds,
    recommendation.isSelectionMade,
    recommendation.selectedUserId,
    recommendation.viewedCount,
  ]);

  useEffect(() => {
    const refresh = () => setNow(Date.now());
    refresh();
    const interval = window.setInterval(refresh, 1000);

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setReadNotificationIds(readRouteViewState<string[]>(MATCH_READ_NOTIFICATION_IDS_KEY, []));
      setDeletedNotificationIds(readRouteViewState<string[]>(MATCH_DELETED_NOTIFICATION_IDS_KEY, []));
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    const syncHiddenInterestUserIds = () => {
      setHiddenInterestUserIdsForHeader(readRouteViewState<string[]>(INTEREST_HIDDEN_USER_IDS_KEY, []));
    };

    syncHiddenInterestUserIds();
    window.addEventListener('focus', syncHiddenInterestUserIds);
    window.addEventListener('storage', syncHiddenInterestUserIds);

    return () => {
      window.removeEventListener('focus', syncHiddenInterestUserIds);
      window.removeEventListener('storage', syncHiddenInterestUserIds);
    };
  }, []);

  const selectedUser = recommendation.selectedUserId
    ? recommendation.users.find((user) => user.id === recommendation.selectedUserId)
    : undefined;
  const isSelectionLocked = recommendation.isSelectionMade && !!selectedUser;
  const visibleUsers = isSelectionLocked && selectedUser ? [selectedUser] : recommendation.users;
  const visibleCurrentIndex = isSelectionLocked
    ? 0
    : Math.min(currentIndex, Math.max(recommendation.users.length - 1, 0));

  const handleIndexChange = (newIndex: number) => {
    if (isSelectionLocked) {
      return;
    }

    setCurrentIndex(newIndex);
    setRecommendation((prevRecommendation) => ({
      ...prevRecommendation,
      viewedCount: Math.max(prevRecommendation.viewedCount, newIndex + 1),
    }));
  };

  const handleSelect = (userId: string) => {
    if (isSelectionLocked) {
      if (recommendation.selectedUserId === userId) {
        return;
      }

      showToast('오늘은 이미 하트를 보냈어요.', 'info');
      return;
    }

    const selectedIndex = recommendation.users.findIndex((user) => user.id === userId);

    if (selectedIndex < 0) {
      return;
    }

    setCurrentIndex(selectedIndex);
    setRecommendation((prevRecommendation) => ({
      ...prevRecommendation,
      viewedCount: Math.max(prevRecommendation.viewedCount, selectedIndex + 1),
      selectedUserId: userId,
      isSelectionMade: true,
    }));

    const hasPendingReceivedHeart = mockInterests.some(
      (interest) => interest.status === 'pending' && interest.fromUser.id === userId,
    );

    if (!hasPendingReceivedHeart) {
      showToast('하트를 보냈어요!', 'success');
      return;
    }

    const chatStartedUserIds = readRouteViewState<string[]>(INTEREST_CHAT_STARTED_USER_IDS_KEY, []);
    const hasChatStartedFromReceivedHeart = chatStartedUserIds.includes(userId);

    addUserIdToRouteState(INTEREST_HIDDEN_USER_IDS_KEY, userId);
    addUserIdToRouteState(INTEREST_CHAT_STARTED_USER_IDS_KEY, userId);

    showToast(
      hasChatStartedFromReceivedHeart ? '이미 채팅방이 열린 상대입니다.' : '채팅이 시작되었어요.',
      hasChatStartedFromReceivedHeart ? 'info' : 'success',
    );
  };

  const refreshLabel = now === null ? '--:--:--' : getDailyRecommendationRefreshLabel(now);
  const notificationNow = now ?? 0;
  const pendingReceivedInterests = useMemo(
    () => mockInterests.filter((interest) => (
      interest.status === 'pending' && !hiddenInterestUserIdsForHeader.includes(interest.fromUser.id)
    )),
    [hiddenInterestUserIdsForHeader],
  );
  const hasReceivedHeart = pendingReceivedInterests.length > 0;
  const rawNotifications = useMemo<MatchNotification[]>(() => {
    const items = mockChats.flatMap((chat) => {
      const partnerName = getOtherParticipant(chat)?.user.nickname ?? '상대방';
      const startedNotification: MatchNotification = {
        id: `${chat.id}-started`,
        href: buildChatRoomHref(chat.id, { fallbackPath: '/chat' }),
        title: '채팅이 연결되었어요',
        description: `${partnerName}님과 대화가 시작되었어요.`,
        createdAt: new Date(chat.createdAt),
        unread: chat.unreadCount > 0,
      };

      if (!isChatInExpiryWarningWindow(chat, notificationNow)) {
        return [startedNotification];
      }

      const expiryNotification: MatchNotification = {
        id: `${chat.id}-expiry`,
        href: buildChatRoomHref(chat.id, { fallbackPath: '/chat' }),
        title: '채팅 종료 1시간 전',
        description: `${partnerName}님과의 채팅이 곧 종료돼요. 필요한 이야기는 지금 마무리해보세요.`,
        createdAt: new Date(new Date(chat.expiresAt).getTime() - 1000 * 60 * 60),
        unread: true,
      };

      return [expiryNotification, startedNotification];
    });

    const feedReactionNotifications = getMyStories().flatMap((story) => (
      (story.reactions ?? []).map((reaction) => ({
        id: `self-date-reaction-${reaction.id}`,
        href: '/my/posts',
        title: `${reaction.fromUser.nickname}님이 내 피드에 하트를 보냈어요`,
        description: '지금우리 내 피드에서 도착한 하트를 확인해보세요.',
        createdAt: new Date(reaction.createdAt),
        unread: true,
      }))
    ));

    const receivedHeartNotifications = pendingReceivedInterests.map((interest) => ({
      id: `received-heart-${interest.id}`,
      href: '/interest',
      title: `${interest.fromUser.nickname}님이 하트를 보냈어요`,
      description: '오늘우리 받은 하트에서 확인해보세요.',
      createdAt: new Date(interest.createdAt),
      unread: !interest.isRead,
    }));

    return [...items, ...feedReactionNotifications, ...receivedHeartNotifications]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }, [notificationNow, pendingReceivedInterests]);
  const notifications = useMemo(
    () => rawNotifications.filter((notification) => !deletedNotificationIds.includes(notification.id)),
    [deletedNotificationIds, rawNotifications],
  );
  const isNotificationUnread = (notification: MatchNotification) => (
    Boolean(notification.unread && !readNotificationIds.includes(notification.id))
  );
  const hasUnreadNotification = notifications.some(isNotificationUnread);
  const handleNotificationClick = (notification: MatchNotification) => {
    setReadNotificationIds((prevIds) => {
      const nextIds = prevIds.includes(notification.id) ? prevIds : [...prevIds, notification.id];
      writeRouteViewState<string[]>(MATCH_READ_NOTIFICATION_IDS_KEY, nextIds);
      return nextIds;
    });
    setIsNotificationPanelOpen(false);
    router.push(notification.href);
  };
  const handleClearNotifications = () => {
    const allNotificationIds = rawNotifications.map((notification) => notification.id);
    setDeletedNotificationIds(allNotificationIds);
    setReadNotificationIds(allNotificationIds);
    writeRouteViewState<string[]>(MATCH_DELETED_NOTIFICATION_IDS_KEY, allNotificationIds);
    writeRouteViewState<string[]>(MATCH_READ_NOTIFICATION_IDS_KEY, allNotificationIds);
    setIsNotificationPanelOpen(false);
    showToast('알림을 모두 삭제했어요.', 'success');
  };

  return (
    <PageContainer withBottomNav={false}>
      <header className="sticky top-0 z-40 flex min-h-[76px] items-center justify-between bg-[var(--color-surface)]/95 px-5 py-3 backdrop-blur-xl">
        <BrandLogo
          variant="lg"
          framed={false}
          logoClassName="drop-shadow-[0_2px_2px_rgba(34,34,34,0.12)]"
        />
        <div className="flex items-center gap-1">
          <HeaderHeartIcon
            hasReceivedHeart={hasReceivedHeart}
            onClick={() => router.push('/interest')}
          />
          <BellIcon
            hasUnread={hasUnreadNotification}
            isOpen={isNotificationPanelOpen}
            onClick={() => setIsNotificationPanelOpen((isOpen) => !isOpen)}
          />
        </div>
      </header>

      {isNotificationPanelOpen && (
        <div className="fixed inset-0 z-[130]">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-transparent"
            aria-label="알림 닫기"
            onClick={() => setIsNotificationPanelOpen(false)}
          />
          <section className="absolute left-1/2 top-[82px] w-[calc(100%-32px)] max-w-[390px] -translate-x-1/2 overflow-hidden rounded-[24px] border border-[#F3F4F6] bg-white shadow-[0_10px_24px_rgba(34,34,34,0.08)]">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">알림</h2>
              <button
                type="button"
                onClick={handleClearNotifications}
                disabled={notifications.length === 0}
                className="text-[12px] font-semibold text-[var(--color-text-muted)] transition-colors active:text-[var(--color-text-primary)] disabled:opacity-40"
              >
                전체삭제
              </button>
            </div>
            <div className="max-h-[360px] overflow-y-auto px-2 pb-2">
              {notifications.length > 0 ? notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className="flex w-full gap-3 rounded-[18px] px-3 py-3 text-left transition-colors active:bg-[var(--color-chip-background)]"
                >
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                    isNotificationUnread(notification) ? 'bg-[var(--color-pink-cta)]' : 'bg-[var(--color-border)]'
                  }`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="truncate text-[14px] font-semibold text-[var(--color-text-primary)]">
                        {notification.title}
                      </span>
                      <span className="shrink-0 text-[11px] font-medium text-[var(--color-text-muted)]">
                        {formatNotificationTime(notification.createdAt)}
                      </span>
                    </span>
                    <span className="mt-1 block text-[12px] leading-5 text-[var(--color-text-secondary)]">
                      {notification.description}
                    </span>
                  </span>
                </button>
              )) : (
                <div className="px-3 py-8 text-center text-[13px] font-medium text-[var(--color-text-muted)]">
                  받은 알림이 없어요.
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <PageContent noPadding>
        <section
          className="relative min-h-[300px] overflow-hidden rounded-t-[32px] border border-white/80 border-b-0 px-5 pb-0 pt-20 shadow-[0_8px_22px_rgba(174,198,207,0.12)]"
          style={{
            background:
              'linear-gradient(104deg, #FFDCE8 0%, #F8EEF4 28%, #C2E9FF 58%, #C2E9FF 100%)',
          }}
        >
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/65 blur-3xl" />
          <div className="absolute -bottom-10 left-8 h-24 w-24 rounded-full bg-white/50 blur-3xl" />

          <Image
            src="/brand/bear-hero-paw.png"
            alt=""
            width={58}
            height={58}
            priority
            className="pointer-events-none absolute right-10 top-[66px] z-40 h-10 w-10 rotate-[-36deg] object-contain opacity-95 brightness-118 saturate-[0.82] drop-shadow-[0_2px_3px_rgba(34,34,34,0.12)]"
          />
          <Image
            src="/brand/bear-hero-face.png"
            alt=""
            width={156}
            height={156}
            priority
            className="pointer-events-none absolute right-[14px] top-[134px] z-50 h-[150px] w-[150px] object-contain drop-shadow-[0_5px_9px_rgba(34,34,34,0.075)]"
          />
          <Image
            src="/brand/bear-hero-hand.png"
            alt=""
            width={64}
            height={64}
            priority
            className="pointer-events-none absolute right-[130px] top-[206px] z-[90] h-[44px] w-[44px] rotate-[2deg] object-contain drop-shadow-[0_3px_3px_rgba(34,34,34,0.14)]"
          />
          <Image
            src="/brand/bear-hero-hand.png"
            alt=""
            width={64}
            height={64}
            priority
            className="pointer-events-none absolute right-[-4px] top-[196px] z-[80] h-[44px] w-[44px] rotate-[-19deg] scale-x-[-1] object-contain drop-shadow-[0_2px_1px_rgba(34,34,34,0.12)]"
          />

          <div className="relative z-20 mx-auto flex max-w-[370px] -translate-y-6 items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="break-keep text-[26px] font-semibold leading-9 tracking-[-0.03em] text-[var(--color-text-primary)]">
                오늘, 새로운 우리?
              </h2>
              <p className="mt-2 max-w-[210px] break-keep text-[15px] font-normal leading-6 text-[var(--color-text-secondary)]">
                매일 한 사람과 연결될
                <br />
                기회를 드려요.
              </p>
            </div>

            <div className="h-24 w-24 shrink-0" aria-hidden="true" />
          </div>

          <div className="relative z-[70] -mx-5 mt-[56px] min-h-[calc(100dvh-360px)] overflow-hidden rounded-t-[24px] bg-white px-[30px] pb-24 pt-[30px] shadow-[0_-3px_4px_rgba(34,34,34,0.12),0_6px_14px_rgba(174,198,207,0.08)] ring-1 ring-white backdrop-blur max-[345px]:mt-[22px]">
            <div className="relative z-10 flex items-center justify-between gap-3">
              <span className="inline-flex items-center rounded-full bg-[var(--color-pink-cta)] px-3.5 py-1.5 text-[14px] font-semibold text-white shadow-sm">
                오늘의 추천
              </span>
              <div className="flex items-center gap-2 text-right">
                <p className="text-[15px] font-medium text-[var(--color-text-muted)]">남은 시간</p>
                <p className="text-[16px] font-bold tabular-nums text-[var(--color-pink-cta)]">
                  {refreshLabel}
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-3">
              {visibleUsers.length > 0 && (
                <ProfileCardCarousel
                  users={visibleUsers}
                  currentIndex={visibleCurrentIndex}
                  onIndexChange={handleIndexChange}
                  selectedUserId={isSelectionLocked ? selectedUser?.id : undefined}
                  isSelectionMade={isSelectionLocked}
                  onSelect={handleSelect}
                />
              )}
            </div>

          </div>
        </section>
      </PageContent>
    </PageContainer>
  );
}

export default function MatchPage() {
  return (
    <Suspense fallback={<PageContainer><div /></PageContainer>}>
      <MatchPageContent />
    </Suspense>
  );
}
