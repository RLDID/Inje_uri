'use client';

import { useCallback, useEffect, useState } from 'react';
import { getChatRooms } from '@/lib/api/chat';
import { getMe } from '@/lib/api/profile';
import { usePolling } from '@/lib/hooks/usePolling';
import { BottomNav } from '@/components/layout/BottomNav';

export function BottomNavWithUnread() {
  const [unreadChats, setUnreadChats] = useState(0);

  const loadUnreadCount = useCallback(async (options?: { silent?: boolean }) => {
    const isSilent = Boolean(options?.silent);
    try {
      const me = await getMe();
      const rooms = await getChatRooms(me);
      setUnreadChats(rooms.reduce((sum, chat) => sum + chat.unreadCount, 0));
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
          setUnreadChats(rooms.reduce((sum, chat) => sum + chat.unreadCount, 0));
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

  usePolling(() => loadUnreadCount({ silent: true }), {
    intervalMs: 5000,
    enabled: true,
    immediate: false,
  });

  return <BottomNav unreadChats={unreadChats} />;
}
