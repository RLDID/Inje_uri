import { Suspense } from 'react';
import { AccountRecoveryPageClient } from '@/components/auth/AccountRecoveryPageClient';

export default function AccountRecoveryPage() {
  return (
    <Suspense fallback={null}>
      <AccountRecoveryPageClient />
    </Suspense>
  );
}
