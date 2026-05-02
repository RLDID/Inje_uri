'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getChatExpiryNotificationCopy,
  getChatExpirySessionKey,
  getChatsInExpiryWarningWindow,
  mockChats,
} from '@/lib/data';
import { buildChatRoomHref, useCurrentRouteContext } from '@/lib/navigation';

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

  const currentChatId = pathname?.startsWith('/chat/') ? pathname.split('/')[2] ?? null : null;
  const expiringChats = useMemo(() => getChatsInExpiryWarningWindow(mockChats, now), [now]);

  useEffect(() => {
    expiringChats.forEach((chat) => {
      if (chat.id === currentChatId) {
        return;
      }

      const copy = getChatExpiryNotificationCopy(chat);

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
  }, [currentChatId, expiringChats, router]);

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

  if (!activeBannerChat) {
    return null;
  }

  const copy = getChatExpiryNotificationCopy(activeBannerChat);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-[calc(env(safe-area-inset-top,0px)+8px)]">
      <div className="pointer-events-auto mx-auto flex max-w-[430px] items-start gap-3 rounded-2xl border border-[var(--color-primary)]/15 bg-[var(--color-surface)]/95 px-4 py-3 shadow-lg backdrop-blur">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
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
