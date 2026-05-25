'use client';

import { Suspense, startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/brand';
import { PageContainer, PageContent } from '@/components/layout';
import { ProfileCardCarousel } from '@/components/match/ProfileCardCarousel';
import { useToast } from '@/components/ui';
import { getChatRooms } from '@/lib/api/chat';
import { getFeedComments, getMyFeeds } from '@/lib/api/feeds';
import { getReceivedInterests } from '@/lib/api/interests';
import { getMe } from '@/lib/api/profile';
import { getTodayRecommendation, selectRecommendation } from '@/lib/api/recommendations';
import { trackTodayWooriHeartSent } from '@/lib/analytics';
import { usePolling } from '@/lib/hooks/usePolling';
import { getOtherParticipant, isChatInExpiryWarningWindow } from '@/lib/utils/chat';
import { buildChatRoomHref, readRouteViewState, writeRouteViewState } from '@/lib/navigation';
import { getDailyRecommendationRefreshLabel } from '@/lib/utils';
import type { Chat, DailyRecommendation, FeedReaction, Interest, User } from '@/lib/types';

const MATCH_VIEW_STATE_KEY = 'match:daily-recommendation';
const MATCH_READ_NOTIFICATION_IDS_KEY = 'match:read-notification-ids';
const MATCH_DELETED_NOTIFICATION_IDS_KEY = 'match:deleted-notification-ids';
const MATCH_NOTIFICATION_STORAGE_PREFIX = 'injeuri:match-notifications:';
const INTEREST_HIDDEN_USER_IDS_KEY = 'interest:hidden-user-ids';
const INTEREST_CHAT_STARTED_USER_IDS_KEY = 'interest:chat-started-user-ids';
const MATCH_HEADER_HINT_STEP_MS = 2500;
const UPDATE_NOTICE_NOTIFICATION: MatchNotification = {
  id: 'notice-2026-05-25-now-woori-update',
  href: '/my/notice',
  title: '새로운 업데이트가 있어요',
  description: '지금우리 피드와 닉네임 변경 신청 안내를 확인해보세요.',
  createdAt: new Date('2026-05-25T20:00:00+09:00'),
  unread: true,
};

type MatchHeaderHint = 'heart' | 'notification';

const EMPTY_RECOMMENDATION: DailyRecommendation = {
  date: new Date().toISOString().slice(0, 10),
  users: [],
  viewedCount: 0,
  isSelectionMade: false,
};

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

interface FeedReactionNotificationItem {
  storyId: string;
  reaction: FeedReaction;
}

function addUserIdToRouteState(key: string, userId: string): string[] {
  const currentIds = readRouteViewState<string[]>(key, []);
  const nextIds = Array.from(new Set([...currentIds, userId]));
  writeRouteViewState<string[]>(key, nextIds);

  return nextIds;
}

function normalizeNotificationIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0)));
}

function readStoredNotificationIds(key: string): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(`${MATCH_NOTIFICATION_STORAGE_PREFIX}${key}`);
    return storedValue ? normalizeNotificationIds(JSON.parse(storedValue)) : [];
  } catch {
    return [];
  }
}

function writeStoredNotificationIds(key: string, ids: string[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      `${MATCH_NOTIFICATION_STORAGE_PREFIX}${key}`,
      JSON.stringify(normalizeNotificationIds(ids)),
    );
  } catch {
    // Ignore storage failures to avoid breaking the notification panel.
  }
}

function formatNotificationTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const period = hours < 12 ? '오전' : '오후';
  const displayHours = hours % 12 || 12;

  return `${period} ${displayHours}:${minutes}`;
}

function ActionHintBadge({
  id,
  isVisible,
  label,
}: {
  id: string;
  isVisible: boolean;
  label: string;
}) {
  return (
    <span
      id={id}
      role="tooltip"
      className={`pointer-events-none absolute right-0 top-full z-[70] mt-2 whitespace-nowrap rounded-lg bg-[var(--color-text-primary)] px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {label}
    </span>
  );
}

function BellIcon({
  hasUnread,
  isOpen,
  onClick,
  showHint,
}: {
  hasUnread: boolean;
  isOpen: boolean;
  onClick: () => void;
  showHint: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-text-primary)] transition-colors active:bg-[var(--color-chip-background)] ${
        showHint
          ? 'bg-[var(--color-like-active)]'
          : isOpen
          ? 'bg-[var(--color-chip-background)]'
          : ''
      }`}
      aria-label="받은 알림"
      aria-describedby="match-notification-tooltip"
      aria-expanded={isOpen}
      title="받은 알림"
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8.8a6 6 0 0 0-12 0c0 7-3 7-3 8.5h18c0-1.5-3-1.5-3-8.5" />
        <path d="M9.8 20a2.4 2.4 0 0 0 4.4 0" />
      </svg>
      {hasUnread && (
        <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-[var(--color-pink-cta)] ring-2 ring-white" />
      )}
      <ActionHintBadge id="match-notification-tooltip" isVisible={showHint} label="받은 알림" />
    </button>
  );
}

async function loadMyFeedReactionItems(): Promise<FeedReactionNotificationItem[]> {
  const myFeeds = await getMyFeeds();
  const reactionGroups = await Promise.all(
    myFeeds.map(async (story) => {
      const reactions = await getFeedComments(story.id);
      return reactions.map((reaction) => ({
        storyId: story.id,
        reaction,
      }));
    }),
  );

  return reactionGroups.flat();
}

function HeaderHeartIcon({
  hasReceivedHeart,
  onClick,
  showHint,
}: {
  hasReceivedHeart: boolean;
  onClick: () => void;
  showHint: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex h-11 w-11 items-center justify-center rounded-full transition-all active:scale-95 ${
        hasReceivedHeart || showHint
          ? 'bg-[var(--color-brand-pink)] text-[var(--color-pink-cta)] shadow-[0_3px_7px_rgba(243,167,192,0.18)]'
          : 'text-[var(--color-text-primary)] active:bg-[var(--color-chip-background)]'
      }`}
      aria-label="받은 하트"
      aria-describedby="match-heart-tooltip"
      title="받은 하트"
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
      <ActionHintBadge id="match-heart-tooltip" isVisible={showHint} label="받은 하트" />
    </button>
  );
}

function RecommendationCardSkeleton() {
  return (
    <div
      className="w-full overflow-hidden rounded-[28px] border border-[#F4EDF2] bg-white px-5 pb-6 pt-5"
      aria-hidden="true"
    >
      <div className="animate-pulse">
        <div className="flex items-center gap-5">
          <div className="h-[142px] w-[142px] shrink-0 rounded-full bg-[#F4EEF3]" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-6 w-24 rounded-full bg-[#F4EEF3]" />
            <div className="h-4 w-32 rounded-full bg-[#F1F3F5]" />
            <div className="h-7 w-16 rounded-full bg-[#FFE3EE]" />
          </div>
        </div>
        <div className="mt-5 flex gap-2.5">
          <div className="h-9 w-20 rounded-full bg-[#F1F3F5]" />
          <div className="h-9 w-24 rounded-full bg-[#F1F3F5]" />
          <div className="h-9 w-16 rounded-full bg-[#F1F3F5]" />
        </div>
        <div className="mt-4 rounded-[18px] bg-[#FFF4F8] px-5 py-4">
          <div className="h-4 w-32 rounded-full bg-[#F5DDE7]" />
          <div className="mt-3 h-4 w-44 rounded-full bg-[#F1E8EE]" />
        </div>
        <div className="mt-6 flex justify-center gap-2.5">
          <div className="h-2.5 w-3 rounded-full bg-[#F3A7C0]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#E8E8E8]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#E8E8E8]" />
        </div>
        <div className="mt-5 h-14 rounded-[16px] bg-[#F3A7C0]/60" />
      </div>
    </div>
  );
}

function MatchPageContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [recommendation, setRecommendation] = useState<DailyRecommendation>(EMPTY_RECOMMENDATION);
  const [receivedInterests, setReceivedInterests] = useState<Interest[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [feedReactionItems, setFeedReactionItems] = useState<FeedReactionNotificationItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasRestoredViewState, setHasRestoredViewState] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [deletedNotificationIds, setDeletedNotificationIds] = useState<string[]>([]);
  const [hiddenInterestUserIdsForHeader, setHiddenInterestUserIdsForHeader] = useState<string[]>([]);
  const [activeHeaderHint, setActiveHeaderHint] = useState<MatchHeaderHint | null>('heart');

  useEffect(() => {
    const notificationHintTimeoutId = window.setTimeout(() => {
      setActiveHeaderHint('notification');
    }, MATCH_HEADER_HINT_STEP_MS);
    const hideHintTimeoutId = window.setTimeout(() => {
      setActiveHeaderHint(null);
    }, MATCH_HEADER_HINT_STEP_MS * 2);

    return () => {
      window.clearTimeout(notificationHintTimeoutId);
      window.clearTimeout(hideHintTimeoutId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMatchData() {
      const savedViewState = readRouteViewState<MatchViewState | null>(MATCH_VIEW_STATE_KEY, null);

      try {
        const me = await getMe();
        const [todayRecommendation, interests, rooms, feedReactions] = await Promise.all([
          getTodayRecommendation(),
          getReceivedInterests(me.id),
          getChatRooms(me),
          loadMyFeedReactionItems().catch((error) => {
            console.warn('[MatchPage] Failed to load feed reaction notifications', error);
            return [];
          }),
        ]);

        if (cancelled) {
          return;
        }

        const restoredUsers = todayRecommendation.users;
        const clampedIndex = Math.max(
          0,
          Math.min(savedViewState?.currentIndex ?? 0, Math.max(restoredUsers.length - 1, 0)),
        );
        const hasSelectedUser = Boolean(
          savedViewState?.selectedUserId &&
            restoredUsers.some((user) => user.id === savedViewState.selectedUserId),
        );

        startTransition(() => {
          setCurrentUser(me);
          setReceivedInterests(interests);
          setChats(rooms);
          setFeedReactionItems(feedReactions);
          setCurrentIndex(clampedIndex);
          setRecommendation({
            ...todayRecommendation,
            users: restoredUsers,
            viewedCount: savedViewState?.viewedCount ?? todayRecommendation.viewedCount,
            selectedUserId: hasSelectedUser ? savedViewState?.selectedUserId : todayRecommendation.selectedUserId,
            isSelectionMade: hasSelectedUser ? Boolean(savedViewState?.isSelectionMade) : todayRecommendation.isSelectionMade,
          });
          setHasRestoredViewState(true);
        });
      } catch (error) {
        if (!cancelled) {
          setHasRestoredViewState(true);
          showToast(error instanceof Error ? error.message : '추천 목록을 불러오지 못했습니다.', 'error');
        }
      }
    }

    void loadMatchData();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const refreshMatchData = useCallback(async () => {
    try {
      const me = currentUser ?? await getMe();
      const [todayRecommendation, interests, rooms, feedReactions] = await Promise.all([
        getTodayRecommendation(),
        getReceivedInterests(me.id),
        getChatRooms(me),
        loadMyFeedReactionItems().catch(() => []),
      ]);

      const visibleUsersFromServer = todayRecommendation.users;

      setCurrentUser(me);
      setReceivedInterests(interests);
      setChats(rooms);
      setFeedReactionItems(feedReactions);
      setCurrentIndex((prevIndex) => Math.min(prevIndex, Math.max(visibleUsersFromServer.length - 1, 0)));
      setRecommendation((prevRecommendation) => {
        const selectedUserStillVisible = Boolean(
          prevRecommendation.selectedUserId &&
            visibleUsersFromServer.some((user) => user.id === prevRecommendation.selectedUserId),
        );

        return {
          ...todayRecommendation,
          users: visibleUsersFromServer,
          viewedCount: Math.max(prevRecommendation.viewedCount, todayRecommendation.viewedCount),
          selectedUserId: selectedUserStillVisible
            ? prevRecommendation.selectedUserId
            : todayRecommendation.selectedUserId,
          isSelectionMade: selectedUserStillVisible
            ? prevRecommendation.isSelectionMade
            : todayRecommendation.isSelectionMade,
        };
      });
    } catch {
      // Keep the current recommendation and notification state during background polling.
    }
  }, [currentUser]);

  usePolling(refreshMatchData, {
    intervalMs: 7000,
    enabled: hasRestoredViewState,
    immediate: false,
  });

  useEffect(() => {
    if (!hasRestoredViewState) {
      return;
    }

    writeRouteViewState<MatchViewState>(MATCH_VIEW_STATE_KEY, {
      currentIndex,
      viewedCount: recommendation.viewedCount,
      selectedUserId: recommendation.selectedUserId,
      isSelectionMade: recommendation.isSelectionMade,
      hiddenUserIds: [],
    });
  }, [
    currentIndex,
    hasRestoredViewState,
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
    const syncNotificationIds = () => {
      const readIds = normalizeNotificationIds([
        ...readStoredNotificationIds(MATCH_READ_NOTIFICATION_IDS_KEY),
        ...readRouteViewState<string[]>(MATCH_READ_NOTIFICATION_IDS_KEY, []),
      ]);
      const deletedIds = normalizeNotificationIds([
        ...readStoredNotificationIds(MATCH_DELETED_NOTIFICATION_IDS_KEY),
        ...readRouteViewState<string[]>(MATCH_DELETED_NOTIFICATION_IDS_KEY, []),
      ]);

      setReadNotificationIds(readIds);
      setDeletedNotificationIds(deletedIds);
      writeStoredNotificationIds(MATCH_READ_NOTIFICATION_IDS_KEY, readIds);
      writeStoredNotificationIds(MATCH_DELETED_NOTIFICATION_IDS_KEY, deletedIds);
    };

    const frameId = window.requestAnimationFrame(syncNotificationIds);
    window.addEventListener('focus', syncNotificationIds);
    window.addEventListener('storage', syncNotificationIds);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('focus', syncNotificationIds);
      window.removeEventListener('storage', syncNotificationIds);
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

  const handleSelect = async (userId: string) => {
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

    const selectedRecommendationUser = recommendation.users[selectedIndex] as User & { recommendationItemId?: number };
    const recommendationItemId = selectedRecommendationUser.recommendationItemId;

    if (!recommendationItemId) {
      showToast('추천 항목 정보를 찾을 수 없어요.', 'error');
      return;
    }

    try {
      const result = await selectRecommendation(recommendationItemId);

      setCurrentIndex(selectedIndex);
      setRecommendation((prevRecommendation) => ({
        ...prevRecommendation,
        viewedCount: Math.max(prevRecommendation.viewedCount, selectedIndex + 1),
        selectedUserId: userId,
        isSelectionMade: true,
      }));
      void refreshMatchData();

      const hasPendingReceivedHeart = receivedInterests.some(
        (interest) => interest.status === 'pending' && interest.fromUser.id === userId,
      );
      const chatStartedUserIds = readRouteViewState<string[]>(INTEREST_CHAT_STARTED_USER_IDS_KEY, []);
      const hasChatStartedFromReceivedHeart = chatStartedUserIds.includes(userId);

      trackTodayWooriHeartSent({
        candidateRank: selectedIndex + 1,
        matched: Boolean(result.chat_room_id || hasChatStartedFromReceivedHeart),
        hadReceivedHeart: hasPendingReceivedHeart,
      });

      if (!hasPendingReceivedHeart) {
        showToast('하트를 보냈어요!', 'success');
        return;
      }

      addUserIdToRouteState(INTEREST_HIDDEN_USER_IDS_KEY, userId);
      addUserIdToRouteState(INTEREST_CHAT_STARTED_USER_IDS_KEY, userId);
      setHiddenInterestUserIdsForHeader((prevIds) => Array.from(new Set([...prevIds, userId])));

      showToast(
        result.chat_room_id || hasChatStartedFromReceivedHeart ? '채팅이 시작되었어요.' : '하트를 보냈어요!',
        result.chat_room_id || hasChatStartedFromReceivedHeart ? 'success' : 'info',
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : '하트를 보내지 못했어요.', 'error');
    }
  };

  const refreshLabel = now === null ? '--:--:--' : getDailyRecommendationRefreshLabel(now);
  const notificationNow = now ?? 0;
  const pendingReceivedInterests = useMemo(
    () => receivedInterests.filter((interest) => (
      interest.status === 'pending' && !hiddenInterestUserIdsForHeader.includes(interest.fromUser.id)
    )),
    [hiddenInterestUserIdsForHeader, receivedInterests],
  );
  const hasReceivedHeart = pendingReceivedInterests.length > 0;
  const rawNotifications = useMemo<MatchNotification[]>(() => {
    const items = chats.flatMap((chat) => {
      const partnerName = getOtherParticipant(chat, currentUser?.id ?? '')?.user.nickname ?? '상대방';
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

    const feedReactionNotifications: MatchNotification[] = feedReactionItems.map(({ storyId, reaction }) => ({
      id: `self-date-comment-${storyId}-${reaction.id}`,
      href: '/my/posts',
      title: `${reaction.fromUser.nickname}님이 내 피드에 반응을 남겼어요`,
      description: reaction.message
        ? '지금우리 내 피드에서 도착한 메시지를 확인해보세요.'
        : '지금우리 내 피드에서 도착한 반응을 확인해보세요.',
      createdAt: reaction.createdAt,
      unread: true,
    }));

    const receivedHeartNotifications = pendingReceivedInterests.map((interest) => ({
      id: `received-heart-${interest.id}`,
      href: '/interest',
      title: `${interest.fromUser.nickname}님이 하트를 보냈어요`,
      description: '오늘우리 받은 하트에서 확인해보세요.',
      createdAt: new Date(interest.createdAt),
      unread: !interest.isRead,
    }));

    return [UPDATE_NOTICE_NOTIFICATION, ...items, ...feedReactionNotifications, ...receivedHeartNotifications]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }, [chats, currentUser?.id, feedReactionItems, notificationNow, pendingReceivedInterests]);
  const notifications = useMemo(
    () => rawNotifications.filter((notification) => !deletedNotificationIds.includes(notification.id)),
    [deletedNotificationIds, rawNotifications],
  );
  const isNotificationUnread = (notification: MatchNotification) => (
    Boolean(notification.unread && !readNotificationIds.includes(notification.id))
  );
  const hasUnreadNotification = notifications.some(isNotificationUnread);

  const markNotificationsAsRead = (notificationIds: string[]) => {
    if (notificationIds.length === 0) {
      return;
    }

    setReadNotificationIds((prevIds) => {
      const nextIds = normalizeNotificationIds([...prevIds, ...notificationIds]);
      writeStoredNotificationIds(MATCH_READ_NOTIFICATION_IDS_KEY, nextIds);
      return nextIds;
    });
  };

  const handleNotificationClick = (notification: MatchNotification) => {
    markNotificationsAsRead([notification.id]);
    setIsNotificationPanelOpen(false);
    router.push(notification.href);
  };

  const handleNotificationPanelToggle = () => {
    setActiveHeaderHint(null);

    if (!isNotificationPanelOpen) {
      markNotificationsAsRead(notifications.map((notification) => notification.id));
    }

    setIsNotificationPanelOpen((isOpen) => !isOpen);
  };

  const handleClearNotifications = () => {
    const allNotificationIds = rawNotifications.map((notification) => notification.id);
    setDeletedNotificationIds(allNotificationIds);
    setReadNotificationIds(allNotificationIds);
    writeStoredNotificationIds(MATCH_DELETED_NOTIFICATION_IDS_KEY, allNotificationIds);
    writeStoredNotificationIds(MATCH_READ_NOTIFICATION_IDS_KEY, allNotificationIds);
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
            showHint={activeHeaderHint === 'heart'}
            onClick={() => {
              setActiveHeaderHint(null);
              router.push('/interest');
            }}
          />
          <BellIcon
            hasUnread={hasUnreadNotification}
            isOpen={isNotificationPanelOpen}
            showHint={activeHeaderHint === 'notification'}
            onClick={handleNotificationPanelToggle}
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
              {!hasRestoredViewState ? (
                <RecommendationCardSkeleton />
              ) : visibleUsers.length > 0 ? (
                <ProfileCardCarousel
                  users={visibleUsers}
                  currentIndex={visibleCurrentIndex}
                  onIndexChange={handleIndexChange}
                  selectedUserId={isSelectionLocked ? selectedUser?.id : undefined}
                  isSelectionMade={isSelectionLocked}
                  onSelect={handleSelect}
                  currentUserInterests={currentUser?.interests ?? []}
                  currentUserKeywords={currentUser?.keywords ?? []}
                />
              ) : (
                <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-[#F4EDF2] bg-white px-6 py-10 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-brand-pink)] text-[var(--color-pink-cta)]">
                    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </div>
                  <h3 className="mt-5 text-[20px] font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
                    {recommendation.isSelectionMade ? '오늘은 하트를 보냈어요' : '오늘의 추천이 아직 없어요'}
                  </h3>
                  <p className="mt-2 break-keep text-[14px] leading-6 text-[var(--color-text-secondary)]">
                    {recommendation.isSelectionMade
                      ? '내일 새로운 오늘우리 추천을 확인해보세요.'
                      : '추천이 준비되면 이곳에 프로필이 표시돼요.'}
                  </p>
                </div>
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
