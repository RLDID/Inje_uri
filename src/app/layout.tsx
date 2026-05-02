import type { Metadata, Viewport } from 'next';
import { ToastProvider } from '@/components/ui';
import './globals.css';

export const metadata: Metadata = {
  title: '인제우리 - 인제대학교 소개팅 앱',
  description: '인제대학교 학생들을 위한 소개팅 서비스',
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
  themeColor: '#23BDD6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
