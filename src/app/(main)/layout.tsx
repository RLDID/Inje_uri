import { Suspense } from 'react';
import { AuthSessionGuard } from '@/components/auth/AuthSessionGuard';
import { NavigationTracker } from '@/components/navigation/NavigationTracker';
import { ChatExpiryNotifier } from '@/components/chat/ChatExpiryNotifier';
import { BottomNavWithUnread } from '@/components/layout/BottomNavWithUnread';
import { MaintenancePageClient } from '@/components/maintenance/MaintenancePageClient';
import { PwaInstallLoginPopup } from '@/components/pwa/PwaInstallLoginPopup';
import { getMaintenanceMode } from '@/server/services/system/maintenance.service';

export const dynamic = 'force-dynamic';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const maintenanceMode = await getMaintenanceMode();

  if (maintenanceMode.enabled) {
    return <MaintenancePageClient />;
  }

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
      <Suspense fallback={null}>
        <PwaInstallLoginPopup />
      </Suspense>
      {children}
      <Suspense fallback={null}>
        <BottomNavWithUnread />
      </Suspense>
    </>
  );
}
