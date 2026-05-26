import { Suspense } from 'react';
import { AccountRecoveryPageClient } from '@/components/auth/AccountRecoveryPageClient';
import { MaintenancePageClient } from '@/components/maintenance/MaintenancePageClient';
import { getMaintenanceMode } from '@/server/services/system/maintenance.service';

export const dynamic = 'force-dynamic';

export default async function AccountRecoveryPage() {
  const maintenanceMode = await getMaintenanceMode();

  if (maintenanceMode.enabled) {
    return <MaintenancePageClient />;
  }

  return (
    <Suspense fallback={null}>
      <AccountRecoveryPageClient />
    </Suspense>
  );
}
