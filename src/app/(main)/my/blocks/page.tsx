'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PageContainer, PageContent, PageHeader } from '@/components/layout';
import { Button, ConfirmSheet, useToast } from '@/components/ui';
import { getBlocks, unblockUser } from '@/lib/api/safety';
import { PLACEHOLDER_PROFILE_IMAGE } from '@/lib/constants';
import type { BlockListItemDto } from '@/lib/types/safety';

function formatBlockedDate(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function BlockedUserItem({
  item,
  isPending,
  onUnblock,
}: {
  item: BlockListItemDto;
  isPending: boolean;
  onUnblock: (item: BlockListItemDto) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const imageSrc = imgError ? PLACEHOLDER_PROFILE_IMAGE : (item.blockedUser.profileImage ?? PLACEHOLDER_PROFILE_IMAGE);
  const blockedDate = formatBlockedDate(item.createdAt);

  return (
    <li className="flex items-center gap-3 px-4 py-4">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[var(--color-surface-secondary)] ring-2 ring-white shadow-[0_3px_8px_rgba(34,34,34,0.07)]">
        <Image
          src={imageSrc}
          alt={item.blockedUser.nickname}
          fill
          sizes="56px"
          className="object-cover"
          onError={() => setImgError(true)}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-[var(--color-text-primary)]">
          {item.blockedUser.nickname}
        </p>
        <p className="mt-1 text-[12px] text-[var(--color-text-tertiary)]">
          {blockedDate ? `${blockedDate} 차단` : '차단됨'}
        </p>
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        loading={isPending}
        onClick={() => onUnblock(item)}
        className="shrink-0"
      >
        해제
      </Button>
    </li>
  );
}

export default function BlockedUsersPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [items, setItems] = useState<BlockListItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [targetItem, setTargetItem] = useState<BlockListItemDto | null>(null);
  const [pendingBlockId, setPendingBlockId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBlocks() {
      try {
        const data = await getBlocks();
        if (!cancelled) {
          setItems(data.items);
        }
      } catch (error) {
        if (!cancelled) {
          showToast(error instanceof Error ? error.message : '차단 목록을 불러오지 못했어요.', 'error');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadBlocks();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const handleUnblock = async () => {
    if (!targetItem || pendingBlockId) {
      return;
    }

    const blockId = targetItem.blockId;
    setPendingBlockId(blockId);

    try {
      await unblockUser(blockId);
      setItems((prevItems) => prevItems.filter((item) => item.blockId !== blockId));
      showToast(`${targetItem.blockedUser.nickname}님 차단을 해제했어요.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '차단을 해제하지 못했어요.', 'error');
    } finally {
      setPendingBlockId(null);
      setTargetItem(null);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="차단한 사용자"
        showBack
        onBack={() => router.push('/my')}
      />

      <PageContent className="pb-8">
        {isLoading ? (
          <div className="py-20 text-center text-sm text-[var(--color-text-secondary)]">
            차단 목록을 불러오는 중이에요
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-tertiary)]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <p className="mt-5 text-[16px] font-semibold text-[var(--color-text-primary)]">
              차단한 사용자가 없어요
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              차단한 사용자가 생기면 이곳에서 확인할 수 있어요.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-border-light)] overflow-hidden rounded-[20px] bg-[var(--color-surface)] shadow-[0_4px_14px_rgba(34,34,34,0.055)]">
            {items.map((item) => (
              <BlockedUserItem
                key={item.blockId}
                item={item}
                isPending={pendingBlockId === item.blockId}
                onUnblock={setTargetItem}
              />
            ))}
          </ul>
        )}
      </PageContent>

      <ConfirmSheet
        isOpen={Boolean(targetItem)}
        onClose={() => setTargetItem(null)}
        onConfirm={() => {
          void handleUnblock();
        }}
        title="차단을 해제할까요?"
        description={targetItem ? `${targetItem.blockedUser.nickname}님의 프로필과 피드가 다시 보일 수 있어요.` : undefined}
        confirmText="해제하기"
        cancelText="취소"
      />
    </PageContainer>
  );
}
