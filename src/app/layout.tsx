import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { AmplitudeRouteTracker } from '@/components/analytics/AmplitudeRouteTracker';
import { ToastProvider } from '@/components/ui';
import './globals.css';

export const metadata: Metadata = {
  title: '인제우리',
  description: '인제대학교 학생들을 위한 소개팅 서비스',
  icons: {
    icon: [
      {
        url: '/brand/bear-logo.png',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/brand/bear-hero-face2-icon.png',
        type: 'image/png',
        sizes: '1024x1024',
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '인제우리',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#F8FAFC',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ToastProvider>
          <Suspense fallback={null}>
            <AmplitudeRouteTracker />
          </Suspense>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
