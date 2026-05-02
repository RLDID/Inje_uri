'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Chat } from '@/lib/types';
import { formatChatTime } from '@/lib/utils';
import { PLACEHOLDER_PROFILE_IMAGE } from '@/lib/constants';
import { currentUser, getChatRemainingTime } from '@/lib/data';
import { CenteredModal } from '@/components/ui/BottomSheet';
import { useToast } from '@/components/ui';
import { buildChatRoomHref, buildProfileDetailHref, useCurrentRouteContext } from '@/lib/navigation';

interface ChatPreviewProps {
  chat: Chat;
  showTypeBadge?: boolean;
}

export function ChatPreview({ chat, showTypeBadge = false }: ChatPreviewProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { currentPath, ownerSection } = useCurrentRouteContext();
  const [imgError, setImgError] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const otherParticipant = chat.participants.find((participant) => participant.user.id !== currentUser.id);
  const user = otherParticipant?.user;

  if (!user) return null;

  const imageSrc = imgError ? PLACEHOLDER_PROFILE_IMAGE : user.profileImages[0];
  const { hours, minutes, isExpired } = getChatRemainingTime(chat);
  
  const chatTypeDuration = chat.chatType === 'today' ? '24H' : '2H';

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(true);
  };

  const handleViewProfile = () => {
    setShowMenu(false);
    router.push(buildProfileDetailHref(user.id, 'chat', {
      sourcePath: currentPath,
      sourceSection: ownerSection,
      fallbackPath: currentPath,
    }));
  };

  const handleLeaveChat = () => {
    setShowMenu(false);
    setShowLeaveConfirm(true);
  };

  const handleReport = () => {
    setShowMenu(false);
    showToast('신고/차단 기능은 준비 중입니다.', 'info');
  };
  
  const confirmLeave = () => {
    setShowLeaveConfirm(false);
    showToast('채팅방을 나갔습니다.', 'success');
  };

  return (
    <>
      <Link
        href={buildChatRoomHref(chat.id, {
          sourcePath: currentPath,
          fallbackPath: currentPath,
        })}
        className="block"
      >
        <div className="flex items-center gap-3.5 px-0 py-4 transition-colors hover:bg-[var(--color-surface-secondary)] active:bg-[var(--color-surface-secondary)]">
          <div className="relative shrink-0">
            <div className={`h-14 w-14 overflow-hidden rounded-full bg-[var(--color-surface-secondary)] ring-1 ring-[var(--color-border-light)] ${isExpired ? 'opacity-55' : ''}`}>
              <Image
                src={imageSrc}
                alt={user.nickname}
                width={56}
                height={56}
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            </div>
            {chat.unreadCount > 0 && !isExpired && (
              <div className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--color-secondary)] px-1.5 text-xs font-bold text-white shadow-sm">
                {chat.unreadCount}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className={`truncate text-[15px] font-semibold ${isExpired ? 'text-[var(--color-text-tertiary)]' : 'text-[var(--color-text-primary)]'}`}>
                  {user.nickname}
                </span>
                {/* 채팅 유형 배지 - 24H 파랑, 2H 빨강 */}
                {showTypeBadge && (
                  <span className={`
                    rounded px-1.5 py-0.5 text-[10px] font-bold
                    ${chat.chatType === 'today' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-rose-100 text-rose-600'
                    }
                  `}>
                    {chatTypeDuration}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {/* 남은 시간 - 작게 */}
                <span
                  className={`text-[10px] font-medium ${
                    isExpired
                      ? 'text-gray-400'
                      : 'text-[var(--color-text-tertiary)]'
                  }`}
                >
                  {isExpired ? '만료' : hours > 0 ? `${hours}h` : `${minutes}m`}
                </span>
                {chat.lastMessage && (
                  <span suppressHydrationWarning className="text-[10px] text-[var(--color-text-tertiary)]">
                    {formatChatTime(new Date(chat.lastMessage.createdAt))}
                  </span>
                )}
              </div>
            </div>

            {isExpired ? (
              <p className="text-sm text-[var(--color-text-tertiary)]">대화 시간이 만료되었어요</p>
            ) : chat.lastMessage ? (
              <p className={`truncate text-sm leading-6 ${chat.unreadCount > 0 ? 'font-semibold text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                {chat.lastMessage.content}
              </p>
            ) : (
              <p className="text-sm text-[var(--color-text-tertiary)]">대화를 시작해 보세요</p>
            )}
          </div>

          <button
            onClick={handleMenuClick}
            className="shrink-0 rounded-full p-2.5 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-surface-secondary)]"
            aria-label="채팅 메뉴"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="6" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="18" r="2" />
            </svg>
          </button>
        </div>
      </Link>

      <CenteredModal isOpen={showMenu} onClose={() => setShowMenu(false)}>
        <div className="py-2">
          <button onClick={handleViewProfile} className="w-full px-6 py-3.5 text-left text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-secondary)]">
            상대 프로필 보기
          </button>
          <button onClick={handleLeaveChat} className="w-full px-6 py-3.5 text-left text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-secondary)]">
            채팅방 나가기
          </button>
          <button onClick={handleReport} className="w-full px-6 py-3.5 text-left text-[var(--color-error)] transition-colors hover:bg-rose-50">
            신고/차단
          </button>
        </div>
      </CenteredModal>

      <CenteredModal isOpen={showLeaveConfirm} onClose={() => setShowLeaveConfirm(false)}>
        <div className="p-6 text-center">
          <p className="text-lg font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">채팅방을 나가시겠습니까?</p>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">나간 채팅방은 복구할 수 없어요.</p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setShowLeaveConfirm(false)}
              className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3.5 font-semibold text-[var(--color-text-secondary)]"
            >
              취소
            </button>
            <button onClick={confirmLeave} className="flex-1 rounded-xl bg-[var(--color-error)] py-3.5 font-semibold text-white">
              나가기
            </button>
          </div>
        </div>
      </CenteredModal>
    </>
  );
}
