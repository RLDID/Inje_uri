import { Suspense } from 'react';
import { InjeCheckPageClient } from '@/components/auth/InjeCheckPageClient';

export default function Home() {
  return (
    <Suspense fallback={null}>
      <InjeCheckPageClient />
    </Suspense>
  );
}
