'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getChatRooms } from '@/lib/api/chat';
import { getMe } from '@/lib/api/profile';
import { usePolling } from '@/lib/hooks/usePolling';
import {
  getChatExpiryNotificationCopy,
  getChatExpirySessionKey,
  getChatsInExpiryWarningWindow,
  getOtherParticipant,
} from '@/lib/utils/chat';
import { buildChatRoomHref, useCurrentRouteContext } from '@/lib/navigation';
import type { Chat, User } from '@/lib/types';

const BANNER_AUTO_DISMISS_MS = 1000 * 60;
const UNREAD_CHAT_NOTIFICATION_KEYS = {
  bannerDismissed: 'chat-unread:banner-dismissed',
} as const;

function readSessionFlag(key: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.sessionStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function writeSessionFlag(key: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(key, 'true');
  } catch {
    // Ignore storage failures and keep the UI working.
  }
}

function getUnreadChatNotificationKey(
  channel: keyof typeof UNREAD_CHAT_NOTIFICATION_KEYS,
  chat: Chat,
): string {
  return `${UNREAD_CHAT_NOTIFICATION_KEYS[channel]}:${chat.id}:${chat.lastMessage?.id ?? 'room'}`;
}

function getUnreadChatNotificationCopy(chat: Chat, currentUserId?: string) {
  const otherParticipant = currentUserId ? getOtherParticipant(chat, currentUserId) : chat.participants[1];
  const partnerName = otherParticipant?.user.nickname ?? '상대방';
  const isMatchStarted = chat.lastMessage?.type === 'system';
  const messagePreview = chat.lastMessage?.content?.trim();

  if (isMatchStarted) {
    return {
      title: '채팅이 연결되었어요',
      body: `${partnerName}님과 대화가 시작되었어요. 지금 확인해보세요.`,
      bannerTitle: '채팅이 연결되었어요',
      bannerBody: `${partnerName}님과 대화가 시작되었어요.`,
    };
  }

  return {
    title: `${partnerName}님이 메시지를 보냈어요`,
    body: messagePreview || '새 메시지가 도착했어요.',
    bannerTitle: '새 메시지가 도착했어요',
    bannerBody: `${partnerName}님: ${messagePreview || '메시지를 확인해보세요.'}`,
  };
}

export function ChatExpiryNotifier() {
  const router = useRouter();
  const { currentPath, pathname } = useCurrentRouteContext();
  const [now, setNow] = useState(() => Date.now());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [dismissedBannerId, setDismissedBannerId] = useState<string | null>(null);
  const [dismissedUnreadBannerKey, setDismissedUnreadBannerKey] = useState<string | null>(null);
  const isChatRoom = pathname?.startsWith('/chat/') ?? false;

  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const interval = window.setInterval(refresh, 60000);

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const loadChats = useCallback(async (options?: { silent?: boolean }) => {
    const isSilent = Boolean(options?.silent);
    try {
      const me = await getMe();
      const rooms = await getChatRooms(me);
      setCurrentUser(me);
      setChats(rooms);
    } catch {
      if (!isSilent) {
        setCurrentUser(null);
        setChats([]);
      }
    }
  }, []);

  usePolling(() => loadChats({ silent: true }), {
    intervalMs: 7000,
    enabled: true,
    immediate: true,
  });

  const currentChatId = pathname?.startsWith('/chat/') ? pathname.split('/')[2] ?? null : null;
  const unreadChats = useMemo(
    () => chats
      .filter((chat) => (
        chat.status === 'active'
        && chat.unreadCount > 0
        && chat.lastMessage
        && chat.id !== currentChatId
      ))
      .sort((left, right) => (
        (right.lastMessage?.createdAt.getTime() ?? right.createdAt.getTime())
        - (left.lastMessage?.createdAt.getTime() ?? left.createdAt.getTime())
      )),
    [chats, currentChatId],
  );
  const expiringChats = useMemo(() => getChatsInExpiryWarningWindow(chats, now), [chats, now]);

  const activeBannerChat = useMemo(
    () =>
      isChatRoom
        ? null
        :
      expiringChats.find(
        (chat) =>
          chat.id !== currentChatId &&
          chat.id !== dismissedBannerId &&
          !readSessionFlag(getChatExpirySessionKey('bannerDismissed', chat.id)),
      ) ?? null,
    [currentChatId, dismissedBannerId, expiringChats, isChatRoom],
  );
  const activeBannerChatId = activeBannerChat?.id ?? null;
  const activeUnreadBannerChat = useMemo(
    () =>
      isChatRoom
        ? null
        : unreadChats.find((chat) => {
            const bannerKey = getUnreadChatNotificationKey('bannerDismissed', chat);
            return bannerKey !== dismissedUnreadBannerKey && !readSessionFlag(bannerKey);
          }) ?? null,
    [dismissedUnreadBannerKey, isChatRoom, unreadChats],
  );
  const activeUnreadBannerKey = activeUnreadBannerChat
    ? getUnreadChatNotificationKey('bannerDismissed', activeUnreadBannerChat)
    : null;

  useEffect(() => {
    if (!activeBannerChatId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      writeSessionFlag(getChatExpirySessionKey('bannerDismissed', activeBannerChatId));
      setDismissedBannerId(activeBannerChatId);
    }, BANNER_AUTO_DISMISS_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeBannerChatId]);

  useEffect(() => {
    if (!activeUnreadBannerKey) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      writeSessionFlag(activeUnreadBannerKey);
      setDismissedUnreadBannerKey(activeUnreadBannerKey);
    }, BANNER_AUTO_DISMISS_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeUnreadBannerKey]);

  if (activeUnreadBannerChat && activeUnreadBannerKey) {
    const copy = getUnreadChatNotificationCopy(activeUnreadBannerChat, currentUser?.id);

    return (
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[180] px-4 pt-[calc(env(safe-area-inset-top,0px)+8px)]">
        <div className="pointer-events-auto mx-auto flex max-w-[430px] items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 py-3 shadow-lg backdrop-blur">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-pink)] text-[var(--color-pink-cta)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
              <path d="M8 9h8M8 13h5" />
            </svg>
          </div>

          <button
            type="button"
            onClick={() => {
              writeSessionFlag(activeUnreadBannerKey);
              setDismissedUnreadBannerKey(activeUnreadBannerKey);
              router.push(buildChatRoomHref(activeUnreadBannerChat.id, {
                sourcePath: currentPath,
                fallbackPath: currentPath,
              }));
            }}
            className="min-w-0 flex-1 text-left"
          >
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{copy.bannerTitle}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--color-text-secondary)]">{copy.bannerBody}</p>
          </button>

          <button
            type="button"
            onClick={() => {
              writeSessionFlag(activeUnreadBannerKey);
              setDismissedUnreadBannerKey(activeUnreadBannerKey);
            }}
            className="shrink-0 rounded-full p-1 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-surface-secondary)]"
            aria-label="새 채팅 알림 닫기"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  if (!activeBannerChat) {
    return null;
  }

  const copy = getChatExpiryNotificationCopy(activeBannerChat, currentUser?.id);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[180] px-4 pt-[calc(env(safe-area-inset-top,0px)+8px)]">
      <div className="pointer-events-auto mx-auto flex max-w-[430px] items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 py-3 shadow-lg backdrop-blur">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-chip-background)] text-[var(--color-text-primary)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <button
          type="button"
          onClick={() => router.push(buildChatRoomHref(activeBannerChat.id, {
            sourcePath: currentPath,
            fallbackPath: currentPath,
          }))}
          className="min-w-0 flex-1 text-left"
        >
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{copy.bannerTitle}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">{copy.bannerBody}</p>
        </button>

        <button
          type="button"
          onClick={() => {
            writeSessionFlag(getChatExpirySessionKey('bannerDismissed', activeBannerChat.id));
            setDismissedBannerId(activeBannerChat.id);
          }}
          className="shrink-0 rounded-full p-1 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-surface-secondary)]"
          aria-label="대화 종료 알림 닫기"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
