'use client';

import { useCallback, useEffect, useState } from 'react';
import { getChatRooms } from '@/lib/api/chat';
import { getMe } from '@/lib/api/profile';
import { usePolling } from '@/lib/hooks/usePolling';
import { CHAT_UNREAD_REFRESH_EVENT } from '@/lib/utils/chat';
import { BottomNav } from '@/components/layout/BottomNav';
import type { Chat } from '@/lib/types';

function getUnreadActiveChatCount(rooms: Chat[]): number {
  return rooms
    .filter((chat) => chat.status === 'active' && chat.blockedByMe !== true)
    .reduce((sum, chat) => sum + chat.unreadCount, 0);
}

export function BottomNavWithUnread() {
  const [unreadChats, setUnreadChats] = useState(0);

  const loadUnreadCount = useCallback(async (options?: { silent?: boolean }) => {
    const isSilent = Boolean(options?.silent);
    try {
      const me = await getMe();
      const rooms = await getChatRooms(me);
      setUnreadChats(getUnreadActiveChatCount(rooms));
    } catch {
      if (!isSilent) {
        setUnreadChats(0);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialUnreadCount() {
      try {
        const me = await getMe();
        const rooms = await getChatRooms(me);
        if (!cancelled) {
          setUnreadChats(getUnreadActiveChatCount(rooms));
        }
      } catch {
        if (!cancelled) {
          setUnreadChats(0);
        }
      }
    }

    void loadInitialUnreadCount();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const refreshUnreadCount = () => {
      void loadUnreadCount({ silent: true });
    };

    window.addEventListener(CHAT_UNREAD_REFRESH_EVENT, refreshUnreadCount);

    return () => {
      window.removeEventListener(CHAT_UNREAD_REFRESH_EVENT, refreshUnreadCount);
    };
  }, [loadUnreadCount]);

  usePolling(() => loadUnreadCount({ silent: true }), {
    intervalMs: 5000,
    enabled: true,
    immediate: false,
  });

  return <BottomNav unreadChats={unreadChats} />;
}
