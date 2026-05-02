import { Suspense } from 'react';
import { NavigationTracker } from '@/components/navigation/NavigationTracker';
import { ChatExpiryNotifier } from '@/components/chat/ChatExpiryNotifier';
import { BottomNav } from '@/components/layout/BottomNav';
import { getTotalUnreadCount } from '@/lib/data';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const unreadChats = getTotalUnreadCount();
  
  return (
    <>
      <Suspense fallback={null}>
        <NavigationTracker />
      </Suspense>
      <Suspense fallback={null}>
        <ChatExpiryNotifier />
      </Suspense>
      {children}
      <Suspense fallback={null}>
        <BottomNav unreadChats={unreadChats} />
      </Suspense>
    </>
  );
}
