'use client';

import { Suspense, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { CountBadge } from '@/components/ui';
import { resolveOwnerSection } from '@/lib/navigation';
import type { MainTab } from '@/lib/types';

interface NavItem {
  id: MainTab;
  label: string;
  href: string;
  icon: (active: boolean) => ReactNode;
}

function HomeIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M4.25 10.85 12 4.25l7.75 6.6v8.15a1.75 1.75 0 0 1-1.75 1.75h-3.25v-5.4a1.2 1.2 0 0 0-1.2-1.2h-3.1a1.2 1.2 0 0 0-1.2 1.2v5.4H6a1.75 1.75 0 0 1-1.75-1.75v-8.15Z" />
      </svg>
    );
  }

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.25 10.85 12 4.25l7.75 6.6" />
      <path d="M6 10.5v8.35c0 .82.68 1.5 1.5 1.5h2.25v-5.2h4.5v5.2h2.25c.82 0 1.5-.68 1.5-1.5V10.5" />
    </svg>
  );
}

function GridIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <rect x="4.25" y="4.25" width="6.35" height="6.35" rx="1.65" />
        <rect x="13.4" y="4.25" width="6.35" height="6.35" rx="1.65" />
        <rect x="4.25" y="13.4" width="6.35" height="6.35" rx="1.65" />
        <rect x="13.4" y="13.4" width="6.35" height="6.35" rx="1.65" />
      </svg>
    );
  }

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      aria-hidden="true"
    >
      <rect x="4.5" y="4.5" width="6" height="6" rx="1.4" />
      <rect x="13.5" y="4.5" width="6" height="6" rx="1.4" />
      <rect x="4.5" y="13.5" width="6" height="6" rx="1.4" />
      <rect x="13.5" y="13.5" width="6" height="6" rx="1.4" />
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 4.25c-4.7 0-8.5 3.35-8.5 7.48 0 2.28 1.16 4.32 2.98 5.69l-.55 2.48a.7.7 0 0 0 1.02.75l2.84-1.56c.71.16 1.45.24 2.21.24 4.7 0 8.5-3.35 8.5-7.48S16.7 4.25 12 4.25Z" />
      </svg>
    );
  }

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 4.5c-4.56 0-8.25 3.2-8.25 7.15 0 2.18 1.12 4.12 2.88 5.43l-.53 2.38 2.73-1.5c.96.28 2.02.43 3.17.43 4.56 0 8.25-3.2 8.25-7.15S16.56 4.5 12 4.5Z" />
    </svg>
  );
}

function UserIcon({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="7.5" r="3.6" />
        <path d="M4.9 19.35c.68-3.32 3.36-5.45 7.1-5.45s6.42 2.13 7.1 5.45c.15.75-.43 1.4-1.19 1.4H6.09c-.76 0-1.34-.65-1.19-1.4Z" />
      </svg>
    );
  }

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="7.5" r="3.4" />
      <path d="M5 20.25c.68-3.45 3.33-5.45 7-5.45s6.32 2 7 5.45" />
    </svg>
  );
}

const navItems: NavItem[] = [
  {
    id: 'match',
    label: '오늘 우리',
    href: '/match',
    icon: (active) => <HomeIcon active={active} />,
  },
  {
    id: 'self-date',
    label: '지금 우리',
    href: '/self-date',
    icon: (active) => <GridIcon active={active} />,
  },
  {
    id: 'chat',
    label: '채팅',
    href: '/chat',
    icon: (active) => <ChatIcon active={active} />,
  },
  {
    id: 'my',
    label: '마이',
    href: '/my',
    icon: (active) => <UserIcon active={active} />,
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
    <>
      <nav
      className="fixed bottom-0 left-1/2 z-[120] w-full max-w-[430px] -translate-x-1/2 rounded-t-[28px] border-t border-[#F3F4F6] bg-[var(--color-surface)] shadow-[0_-6px_18px_rgba(34,34,34,0.045)]"
      aria-label="메인 메뉴"
    >
      <div className="mx-auto max-w-[430px]">
        <div className="grid h-[78px] grid-cols-4 pb-safe">
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
                  relative flex flex-col items-center justify-center gap-1 py-2
                  transition-colors duration-150
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-inset
                  ${isActive
                    ? 'text-[var(--color-pink-tab-active)]'
                    : 'text-[var(--color-text-tertiary)] active:text-[var(--color-text-secondary)]'
                  }
                `}
              >
                <div className="relative flex h-8 w-8 items-center justify-center transition-colors">
                  {item.icon(isActive)}
                  {badge > 0 && <CountBadge count={badge} />}
                </div>
                <span className={`whitespace-nowrap text-[11px] leading-tight ${isActive ? 'font-bold' : 'font-semibold'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
      </nav>
    </>
  );
}

export function BottomNav({ unreadChats = 0 }: BottomNavProps) {
  return (
    <Suspense fallback={(
      <>
        <nav
        className="fixed bottom-0 left-1/2 z-[120] w-full max-w-[430px] -translate-x-1/2 rounded-t-[28px] border-t border-[#F3F4F6] bg-[var(--color-surface)] shadow-[0_-6px_18px_rgba(34,34,34,0.045)]"
        aria-label="메인 메뉴"
      >
        <div className="mx-auto max-w-[430px]">
          <div className="grid h-[78px] grid-cols-4 pb-safe">
            {navItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col items-center justify-center gap-1 py-2 text-[var(--color-text-tertiary)]"
              >
                <div className="relative flex h-8 w-8 items-center justify-center">
                  {item.icon(false)}
                </div>
                <span className="whitespace-nowrap text-[11px] font-semibold leading-tight">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        </nav>
      </>
    )}
    >
      <BottomNavContent unreadChats={unreadChats} />
    </Suspense>
  );
}
