'use client';

import { Suspense, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PageContainer, PageContent, PageHeader } from '@/components/layout';
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
      <PageHeader
        title="채팅"
        subtitle="이어지고 있는 대화를 한곳에서 확인해보세요."
      />

      <PageContent className="space-y-3 pb-4 pt-3" noPadding>
        <div className="flex gap-2 px-5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`
                flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors
                ${activeTab === tab.id
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)]'
                }
              `}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`
                  text-xs font-semibold
                  ${activeTab === tab.id ? 'text-white/80' : 'text-[var(--color-text-tertiary)]'}
                `}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
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
