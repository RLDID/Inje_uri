import { Suspense } from 'react';
import { LoginPageClient } from '@/components/auth/LoginPageClient';

export default function Home() {
  return (
    <Suspense fallback={null}>
      <LoginPageClient />
    </Suspense>
  );
}
