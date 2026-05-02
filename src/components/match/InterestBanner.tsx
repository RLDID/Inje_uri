'use client';

import Image from 'next/image';
import Link from 'next/link';
import { PLACEHOLDER_PROFILE_IMAGE } from '@/lib/constants';
import { currentUser } from '@/lib/data';
import { appendNavigationContext, useCurrentRouteContext } from '@/lib/navigation';
import type { Interest } from '@/lib/types';

interface InterestBannerProps {
  interests: Interest[];
}

export function InterestBanner({ interests }: InterestBannerProps) {
  const { currentPath, ownerSection } = useCurrentRouteContext();
  const pendingInterests = interests.filter((interest) => interest.status === 'pending');
  const count = pendingInterests.length;
  const previewUsers = pendingInterests.slice(0, 2).map((interest) => interest.fromUser);
  const emptyStateHref = appendNavigationContext('/my/ideal-type', {
    sourcePath: currentPath,
    fallbackPath: currentPath,
    targetSection: ownerSection,
  });

  if (count === 0) {
    return (
      <Link href={emptyStateHref} className="block">
        <div
          className="relative overflow-hidden rounded-[28px] border px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-primary) 8%, var(--color-border-light))',
            background: 'linear-gradient(135deg, #f7fbfb 0%, #eef4f6 52%, #e4eef1 100%)',
          }}
        >
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/75 blur-3xl" />

          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex rounded-full bg-white/82 px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-[var(--color-primary)] ring-1 ring-white/80">
                이상형 채우기
              </span>

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/82 text-[var(--color-primary)] shadow-[0_8px_18px_rgba(15,23,42,0.06)] ring-1 ring-white/80">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </div>

            <div className="mt-3">
              <p className="break-keep text-[16px] font-semibold leading-6 text-[var(--color-text-primary)]">
                아직 받은 호감이 없어요
              </p>
              <p className="mt-1 break-keep text-[13px] leading-5 text-[var(--color-text-secondary)]">
                이상형 키워드를 수정해보세요
              </p>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href="/interest" className="block">
      <div
        className="relative overflow-hidden rounded-[28px] border px-4 py-4 shadow-[0_10px_20px_rgba(16,152,173,0.08)]"
        style={{
          borderColor: 'color-mix(in srgb, var(--color-primary) 10%, var(--color-border-light))',
          background: 'linear-gradient(135deg, #f6fcfd 0%, #ddf2f5 48%, #bde5ea 100%)',
        }}
      >
        <div
          className="absolute inset-y-0 right-0 w-[46%]"
          style={{
            background:
              'radial-gradient(circle at top right, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0) 72%)',
          }}
        />
        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/45 blur-3xl" />

        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-[18px] bg-[var(--color-primary)] px-3 py-1.5 text-white shadow-[0_10px_20px_rgba(16,152,173,0.18)]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span className="text-[12px] font-semibold">{count}개</span>
            </div>

            <div className="inline-flex items-center justify-end rounded-[18px] bg-white/86 px-2 py-1 shadow-[0_10px_20px_rgba(15,23,42,0.08)] ring-1 ring-white/80">
              {previewUsers.map((user, index) => (
                <div
                  key={user.id}
                  className="relative h-10 w-10 overflow-hidden rounded-full border-[2.5px] border-white shadow-[0_8px_18px_rgba(15,23,42,0.10)]"
                  style={{
                    marginLeft: index > 0 ? '-12px' : '0',
                    zIndex: previewUsers.length - index,
                  }}
                >
                  <Image
                    src={user.profileImages[0] || PLACEHOLDER_PROFILE_IMAGE}
                    alt={user.nickname}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <p className="break-keep text-[16px] font-semibold leading-6 text-[var(--color-text-primary)]">
              {currentUser.nickname}님에게 도착한 호감이 있어요
            </p>
            <p className="mt-1 break-keep text-[13px] leading-5 text-[var(--color-text-secondary)]">
              지금 확인해보세요
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
