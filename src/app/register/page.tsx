import { Suspense } from 'react';
import { RegisterPageClient } from '@/components/auth/RegisterPageClient';
import { MaintenancePageClient } from '@/components/maintenance/MaintenancePageClient';
import { getMaintenanceMode } from '@/server/services/system/maintenance.service';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const maintenanceMode = await getMaintenanceMode();

  if (maintenanceMode.enabled) {
    return <MaintenancePageClient />;
  }

  return (
    <Suspense fallback={null}>
      <RegisterPageClient />
    </Suspense>
  );
}
