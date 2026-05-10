'use client';

import { Suspense, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PageContainer, PageContent } from '@/components/layout';
import { ChatPreview } from '@/components/chat/ChatPreview';
import { NoChats } from '@/components/ui';
import { mockChats } from '@/lib/data';

type FilterTab = 'all' | 'unread';

function ChatListPageContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = useMemo<FilterTab>(() => {
    const currentTab = searchParams.get('tab');
    return currentTab === 'unread' ? 'unread' : 'all';
  }, [searchParams]);

  const activeChats = mockChats.filter((chat) => chat.status === 'active');
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

        {filteredChats.length === 0 ? (
          <NoChats />
        ) : (
          <div className="px-5">
            <div className="divide-y divide-[var(--color-border-light)]">
              {filteredChats.map((chat) => (
                <ChatPreview key={chat.id} chat={chat} showTypeBadge />
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
