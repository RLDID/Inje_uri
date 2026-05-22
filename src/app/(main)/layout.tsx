import { Suspense } from 'react';
import { AuthSessionGuard } from '@/components/auth/AuthSessionGuard';
import { NavigationTracker } from '@/components/navigation/NavigationTracker';
import { ChatExpiryNotifier } from '@/components/chat/ChatExpiryNotifier';
import { BottomNavWithUnread } from '@/components/layout/BottomNavWithUnread';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <AuthSessionGuard />
      </Suspense>
      <Suspense fallback={null}>
        <NavigationTracker />
      </Suspense>
      <Suspense fallback={null}>
        <ChatExpiryNotifier />
      </Suspense>
      {children}
      <Suspense fallback={null}>
        <BottomNavWithUnread />
      </Suspense>
    </>
  );
}
