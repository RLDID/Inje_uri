import { Suspense } from 'react';
import { LoginPageClient } from '@/components/auth/LoginPageClient';
import { MaintenancePageClient } from '@/components/maintenance/MaintenancePageClient';
import { getMaintenanceMode } from '@/server/services/system/maintenance.service';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const maintenanceMode = await getMaintenanceMode();

  if (maintenanceMode.enabled) {
    return <MaintenancePageClient />;
  }

  return (
    <Suspense fallback={null}>
      <LoginPageClient />
    </Suspense>
  );
}
