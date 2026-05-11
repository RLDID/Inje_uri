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
} from '@/lib/utils/chat';
import { buildChatRoomHref, useCurrentRouteContext } from '@/lib/navigation';
import type { Chat, User } from '@/lib/types';

const BANNER_AUTO_DISMISS_MS = 1000 * 60;

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

export function ChatExpiryNotifier() {
  const router = useRouter();
  const { currentPath, pathname } = useCurrentRouteContext();
  const [now, setNow] = useState(() => Date.now());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [dismissedBannerId, setDismissedBannerId] = useState<string | null>(null);
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
  const expiringChats = useMemo(() => getChatsInExpiryWarningWindow(chats, now), [chats, now]);

  useEffect(() => {
    expiringChats.forEach((chat) => {
      if (chat.id === currentChatId) {
        return;
      }

      const copy = getChatExpiryNotificationCopy(chat, currentUser?.id);

      if (document.visibilityState === 'hidden' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const browserKey = getChatExpirySessionKey('browser', chat.id);
        if (readSessionFlag(browserKey)) {
          return;
        }

        const notification = new Notification(copy.title, {
          body: copy.body,
          tag: `chat-expiry-${chat.id}`,
        });

        notification.onclick = () => {
          window.focus();
          router.push(buildChatRoomHref(chat.id, { fallbackPath: '/chat' }));
          notification.close();
        };

        writeSessionFlag(browserKey);
        return;
      }

    });
  }, [currentChatId, currentUser?.id, expiringChats, router]);

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
