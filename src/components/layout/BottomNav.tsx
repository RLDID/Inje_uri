'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { CountBadge } from '@/components/ui';
import { resolveOwnerSection } from '@/lib/navigation';
import type { MainTab } from '@/lib/types';

interface NavItem {
  id: MainTab;
  label: string;
  href: string;
  icon: (active: boolean) => React.ReactNode;
  badge?: number;
}

const navItems: NavItem[] = [
  {
    id: 'match',
    label: '오늘 우리',
    href: '/match',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    id: 'self-date',
    label: '지금 우리',
    href: '/self-date',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: 'chat',
    label: '채팅',
    href: '/chat',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'my',
    label: '마이',
    href: '/my',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

interface BottomNavProps {
  unreadChats?: number;
}

function BottomNavContent({ unreadChats = 0 }: BottomNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSection = resolveOwnerSection(pathname, searchParams);
  
  const getBadge = (id: MainTab) => {
    if (id === 'chat' && unreadChats > 0) return unreadChats;
    return 0;
  };
  
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface)] border-t border-[var(--color-border)]"
      aria-label="메인 메뉴"
    >
      <div className="max-w-[430px] mx-auto">
        <div className="grid grid-cols-4 h-[60px] pb-safe">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            const badge = getBadge(item.id);
            
            return (
              <Link
                key={item.id}
                href={item.href}
                replace
                aria-current={isActive ? 'page' : undefined}
                className={`
                  flex flex-col items-center justify-center gap-0.5
                  relative py-2
                  transition-colors duration-150
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-inset
                  ${isActive 
                    ? 'text-[var(--color-primary)]' 
                    : 'text-[var(--color-text-tertiary)] active:text-[var(--color-text-secondary)]'
                  }
                `}
              >
                <div className="relative">
                  {item.icon(isActive)}
                  {badge > 0 && <CountBadge count={badge} />}
                </div>
                <span className={`text-[10px] leading-tight whitespace-nowrap ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function BottomNav({ unreadChats = 0 }: BottomNavProps) {
  return (
    <Suspense fallback={
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface)] border-t border-[var(--color-border)]"
        aria-label="메인 메뉴"
      >
        <div className="max-w-[430px] mx-auto">
          <div className="grid grid-cols-4 h-[60px] pb-safe">
            {navItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col items-center justify-center gap-0.5 py-2 text-[var(--color-text-tertiary)]"
              >
                <div className="relative">
                  {item.icon(false)}
                </div>
                <span className="text-[10px] leading-tight whitespace-nowrap font-medium">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </nav>
    }>
      <BottomNavContent unreadChats={unreadChats} />
    </Suspense>
  );
}
