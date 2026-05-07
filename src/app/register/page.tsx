import { Suspense } from 'react';
import { RegisterPageClient } from '@/components/auth/RegisterPageClient';

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageClient />
    </Suspense>
  );
}
