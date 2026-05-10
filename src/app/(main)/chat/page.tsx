'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PageContainer, PageContent } from '@/components/layout';
import { ChatPreview } from '@/components/chat/ChatPreview';
import { NoChats } from '@/components/ui';
import { getChatRooms } from '@/lib/api/chat';
import { getMe } from '@/lib/api/profile';
import { usePolling } from '@/lib/hooks/usePolling';
import type { Chat, User } from '@/lib/types';

type FilterTab = 'all' | 'unread';

function getTime(value: Date | string | undefined): number {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getChatListSignature(chats: Chat[]): string {
  return chats.map((chat) => {
    const otherUsers = chat.participants
      .map((participant) => `${participant.user.id}:${participant.user.nickname}:${participant.user.profileImages[0] ?? ''}`)
      .join('|');
    const lastMessage = chat.lastMessage
      ? `${chat.lastMessage.id}:${chat.lastMessage.content}:${getTime(chat.lastMessage.createdAt)}`
      : '';

    return [
      chat.id,
      chat.status,
      chat.unreadCount,
      getTime(chat.expiresAt),
      lastMessage,
      otherUsers,
    ].join('::');
  }).join('||');
}

function isSameUserShell(left: User | null, right: User): boolean {
  return Boolean(
    left &&
      left.id === right.id &&
      left.nickname === right.nickname &&
      left.profileImages[0] === right.profileImages[0],
  );
}

function ChatListPageContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const activeTab = useMemo<FilterTab>(() => {
    const currentTab = searchParams.get('tab');
    return currentTab === 'unread' ? 'unread' : 'all';
  }, [searchParams]);

  const loadChats = useCallback(async (options?: { silent?: boolean }) => {
    const isSilent = Boolean(options?.silent);
    if (!isSilent) {
      setIsLoading(true);
    }

    try {
      const me = await getMe();
      const rooms = await getChatRooms(me, activeTab);
      setCurrentUser((prevUser) => (isSameUserShell(prevUser, me) ? prevUser : me));
      setChats((prevChats) => (
        getChatListSignature(prevChats) === getChatListSignature(rooms) ? prevChats : rooms
      ));
    } catch {
      if (!isSilent) {
        setCurrentUser(null);
        setChats([]);
      }
    } finally {
      if (!isSilent) {
        setIsLoading(false);
      }
    }
  }, [activeTab]);

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  usePolling(() => loadChats({ silent: true }), {
    intervalMs: 5000,
    enabled: true,
    immediate: false,
  });

  const activeChats = chats.filter((chat) => chat.status === 'active');
  const filteredChats = activeTab === 'all'
    ? activeChats
    : activeChats.filter((chat) => chat.unreadCount > 0);

  const totalUnread = activeChats.filter((chat) => chat.unreadCount > 0).length;

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: 'all', label: '전체', count: activeChats.length },
    { id: 'unread', label: '읽지 않음', count: totalUnread },
  ];

  const handleTabChange = (nextTab: FilterTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === 'all') {
      params.delete('tab');
    } else {
      params.set('tab', nextTab);
    }

    const nextSearch = params.toString();
    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false });
  };

  const handleChatChanged = useCallback(() => {
    void loadChats({ silent: true });
  }, [loadChats]);

  return (
    <PageContainer>
      <header className="sticky top-0 z-40 flex min-h-[76px] items-center bg-[var(--color-surface)]/95 px-5 py-3 backdrop-blur-xl">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
          채팅
        </h1>
      </header>

      <PageContent className="space-y-3 pb-4 pt-1" noPadding>
        <div className="px-5">
          <div className="grid h-12 grid-cols-2 overflow-hidden rounded-full border border-[var(--color-border-light)] bg-[#F3F4F6]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`
                flex h-full items-center justify-center gap-1.5 rounded-full px-3.5 text-[15px] font-semibold transition-colors
                ${activeTab === tab.id
                  ? 'bg-[var(--color-pink-cta)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-white/55'
                }
              `}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`
                  text-[13px] font-semibold
                  ${activeTab === tab.id ? 'text-white' : 'text-[var(--color-text-tertiary)]'}
                `}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
          </div>
        </div>

        {isLoading ? (
          <div className="px-5 py-10 text-center text-sm text-[var(--color-text-tertiary)]">불러오는 중...</div>
        ) : filteredChats.length === 0 ? (
          <div className="px-5">
            <NoChats />
          </div>
        ) : (
          <div className="px-5">
            <div className="divide-y divide-[var(--color-border-light)]">
              {filteredChats.map((chat) => (
                <ChatPreview
                  key={chat.id}
                  chat={chat}
                  showTypeBadge
                  currentUserId={currentUser?.id ?? ''}
                  onChanged={handleChatChanged}
                />
              ))}
            </div>
          </div>
        )}
      </PageContent>
    </PageContainer>
  );
}

export default function ChatListPage() {
  return (
    <Suspense fallback={<PageContainer><div /></PageContainer>}>
      <ChatListPageContent />
    </Suspense>
  );
}
