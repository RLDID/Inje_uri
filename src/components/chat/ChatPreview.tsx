'use client';

import { memo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Chat } from '@/lib/types';
import { formatChatTime } from '@/lib/utils';
import { PLACEHOLDER_PROFILE_IMAGE } from '@/lib/constants';
import { CHAT_UNREAD_REFRESH_EVENT, getChatRemainingTime, getOtherParticipant } from '@/lib/utils/chat';
import { CenteredModal } from '@/components/ui/BottomSheet';
import { useToast } from '@/components/ui';
import { blockChatRoom, leaveChatRoom } from '@/lib/api/chat';
import { reportTarget } from '@/lib/api/safety';
import { buildChatRoomHref, buildProfileDetailHref, useCurrentRouteContext } from '@/lib/navigation';

type ChatPreviewAction = 'report' | 'block';

interface ChatPreviewProps {
  chat: Chat;
  showTypeBadge?: boolean;
  currentUserId: string;
  onChanged?: () => void;
}

function getMessagePreview(chat: Chat): string {
  const message = chat.lastMessage;
  if (!message) return '';
  if (message.type === 'image') return '사진을 보냈어요';
  return message.content.trim();
}

function ChatPreviewComponent({ chat, showTypeBadge = false, currentUserId, onChanged }: ChatPreviewProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { currentPath, ownerSection } = useCurrentRouteContext();
  const [imgError, setImgError] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [safetyAction, setSafetyAction] = useState<ChatPreviewAction | null>(null);
  const [reportDescription, setReportDescription] = useState('');
  const [leaveRoomOnSubmit, setLeaveRoomOnSubmit] = useState(false);
  const [isSubmittingSafetyAction, setIsSubmittingSafetyAction] = useState(false);

  const otherParticipant = getOtherParticipant(chat, currentUserId);
  const user = otherParticipant?.user;

  if (!user) return null;

  const imageSrc = imgError ? PLACEHOLDER_PROFILE_IMAGE : user.profileImages[0];
  const { hours, minutes, totalMinutes, isExpired } = getChatRemainingTime(chat);
  const isBlockedByMe = chat.blockedByMe === true;
  const isBlocked = chat.status === 'blocked' || isBlockedByMe;
  const lastMessagePreview = getMessagePreview(chat);
  const expiredMessagePreview = lastMessagePreview;
  const remainingBadgeLabel = isBlocked ? (isBlockedByMe ? '차단' : '제한') : isExpired ? '0H' : `${Math.max(1, Math.ceil(totalMinutes / 60))}H`;

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

  const openSafetyAction = (action: ChatPreviewAction) => {
    setShowMenu(false);
    setSafetyAction(action);
    setReportDescription('');
    setLeaveRoomOnSubmit(false);
  };

  const closeSafetyAction = () => {
    if (isSubmittingSafetyAction) {
      return;
    }

    setSafetyAction(null);
    setReportDescription('');
    setLeaveRoomOnSubmit(false);
  };

  const confirmSafetyAction = async () => {
    if (!safetyAction) {
      return;
    }

    const description = reportDescription.trim();
    if (safetyAction === 'report' && !description) {
      showToast('신고 사유를 입력해주세요.', 'error');
      return;
    }

    setIsSubmittingSafetyAction(true);

    try {
      if (safetyAction === 'report') {
        await reportTarget({
          targetType: 'chat_room',
          targetId: chat.id,
          reasonType: 'inappropriate',
          description,
          alsoBlock: false,
        });
        showToast('신고가 접수되었고 대화 내역이 함께 제출되었어요.', 'success');
      } else {
        await blockChatRoom(chat.id);
        showToast('상대방을 차단했어요.', 'success');
      }

      if (leaveRoomOnSubmit) {
        try {
          await leaveChatRoom(chat.id);
        } catch {
          // Reporting/blocking already succeeded; leaving is optional here.
        }
      }

      setSafetyAction(null);
      setReportDescription('');
      setLeaveRoomOnSubmit(false);
      onChanged?.();
      window.dispatchEvent(new Event(CHAT_UNREAD_REFRESH_EVENT));
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : safetyAction === 'report'
            ? '신고하지 못했습니다.'
            : '차단하지 못했습니다.',
        'error',
      );
    } finally {
      setIsSubmittingSafetyAction(false);
    }
  };
  
  const confirmLeave = async () => {
    try {
      await leaveChatRoom(chat.id);
      setShowLeaveConfirm(false);
      onChanged?.();
      window.dispatchEvent(new Event(CHAT_UNREAD_REFRESH_EVENT));
      showToast('채팅방을 나갔습니다.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '채팅방을 나가지 못했습니다.', 'error');
    }
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
            <div className={`h-14 w-14 overflow-hidden rounded-full bg-[var(--color-surface-secondary)] ring-1 ring-[var(--color-border-light)] ${isExpired || isBlocked ? 'opacity-55' : ''}`}>
              <Image
                src={imageSrc}
                alt={user.nickname}
                width={56}
                height={56}
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            </div>
            {chat.unreadCount > 0 && !isExpired && !isBlocked && (
              <div className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--color-like-active)] px-1.5 text-xs font-bold text-white shadow-sm">
                {chat.unreadCount}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className={`truncate text-[15px] font-semibold ${isExpired || isBlocked ? 'text-[var(--color-text-tertiary)]' : 'text-[var(--color-text-primary)]'}`}>
                  {user.nickname}
                </span>
                {/* 채팅 유형 배지 - 24H 파랑, 2H 빨강 */}
                {showTypeBadge && (
                  <span className={`
                    rounded px-1.5 py-0.5 text-[10px] font-bold
                    ${isBlocked
                      ? 'bg-[var(--color-surface-secondary)] text-[var(--color-text-tertiary)]'
                      : chat.chatType === 'today'
                      ? 'bg-[var(--color-chip-background)] text-[var(--color-text-primary)]'
                      : 'bg-[var(--color-brand-pink)] text-[var(--color-text-primary)]'
                    }
                  `}>
                    {remainingBadgeLabel}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {/* 남은 시간 - 작게 */}
                <span
                  className={`hidden text-[10px] font-medium ${
                    isExpired
                      ? 'text-[var(--color-text-tertiary)]'
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

            {isBlocked ? (
              <p className="text-sm text-[var(--color-text-tertiary)]">
                {isBlockedByMe ? '차단한 사용자입니다' : '대화가 제한되었어요'}
              </p>
            ) : isExpired ? (
              <div className="flex min-w-0 items-center gap-1.5 text-sm leading-6">
                <span className="shrink-0 rounded bg-[var(--color-surface-secondary)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--color-text-tertiary)]">
                  만료됨
                </span>
                <span data-clarity-mask={expiredMessagePreview ? true : undefined} className="truncate text-[var(--color-text-secondary)]">
                  {expiredMessagePreview || '대화 시간이 만료되었어요'}
                </span>
              </div>
            ) : chat.lastMessage ? (
              <p data-clarity-mask className={`truncate text-sm leading-6 ${chat.unreadCount > 0 ? 'font-semibold text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                {lastMessagePreview}
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
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
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
          <button onClick={() => openSafetyAction('report')} className="w-full px-6 py-3.5 text-left text-[var(--color-error)] transition-colors hover:bg-[var(--color-error-bg)]">
            신고하기
          </button>
          <button onClick={() => openSafetyAction('block')} className="w-full px-6 py-3.5 text-left text-[var(--color-error)] transition-colors hover:bg-[var(--color-error-bg)]">
            차단하기
          </button>
        </div>
      </CenteredModal>

      <CenteredModal isOpen={safetyAction !== null} onClose={closeSafetyAction}>
        <div className="p-6">
          <p className="text-center text-lg font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
            {safetyAction === 'report' ? '이 사용자를 신고할까요?' : '이 사용자를 차단할까요?'}
          </p>
          <p className="mt-2 text-center text-sm leading-6 text-[var(--color-text-secondary)]">
            {safetyAction === 'report'
              ? '운영팀이 확인할 수 있게 신고 사유를 적어주세요. 대화 내역도 함께 제출돼요.'
              : '차단하면 이 채팅방에서 메시지를 볼 수 없고 보낼 수 없어요. 상대방에게 차단 사실은 표시되지 않아요.'}
          </p>

          {safetyAction === 'report' && (
            <div className="mt-5">
              <textarea
                value={reportDescription}
                onChange={(event) => setReportDescription(event.target.value.slice(0, 200))}
                placeholder="예: 불쾌한 메시지를 받았어요, 부적절한 대화였어요"
                maxLength={200}
                className="h-24 w-full resize-none rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]/20"
              />
              <p className="mt-1 text-right text-xs text-[var(--color-text-tertiary)]">{reportDescription.length}/200</p>
            </div>
          )}

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-3">
            <input
              type="checkbox"
              checked={leaveRoomOnSubmit}
              onChange={(event) => setLeaveRoomOnSubmit(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-pink-cta)] focus:ring-[var(--color-focus)]"
            />
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">채팅방도 함께 나가기</p>
              <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
                체크하면 처리 후 채팅방 목록에서 나가요.
              </p>
            </div>
          </label>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={closeSafetyAction}
              disabled={isSubmittingSafetyAction}
              className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3.5 font-semibold text-[var(--color-text-secondary)] disabled:opacity-60"
            >
              취소
            </button>
            <button
              type="button"
              onClick={confirmSafetyAction}
              disabled={isSubmittingSafetyAction || (safetyAction === 'report' && !reportDescription.trim())}
              className="flex-1 rounded-xl bg-[var(--color-error)] py-3.5 font-semibold text-white disabled:opacity-60"
            >
              {isSubmittingSafetyAction
                ? '처리 중...'
                : safetyAction === 'report'
                  ? '신고하기'
                  : '차단하기'}
            </button>
          </div>
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

function getDateTime(value: Date | string | undefined): number {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getOtherUserSignature(chat: Chat, currentUserId: string): string {
  const otherParticipant = getOtherParticipant(chat, currentUserId);
  const user = otherParticipant?.user;
  return user ? `${user.id}:${user.nickname}:${user.profileImages[0] ?? ''}` : '';
}

function getLastMessageSignature(chat: Chat): string {
  const message = chat.lastMessage;
  return message
    ? `${message.id}:${message.content}:${message.senderId}:${getDateTime(message.createdAt)}`
    : '';
}

export const ChatPreview = memo(ChatPreviewComponent, (prevProps, nextProps) => (
  prevProps.showTypeBadge === nextProps.showTypeBadge &&
  prevProps.currentUserId === nextProps.currentUserId &&
  prevProps.onChanged === nextProps.onChanged &&
  prevProps.chat.id === nextProps.chat.id &&
  prevProps.chat.status === nextProps.chat.status &&
  prevProps.chat.blockedByMe === nextProps.chat.blockedByMe &&
  prevProps.chat.chatType === nextProps.chat.chatType &&
  prevProps.chat.unreadCount === nextProps.chat.unreadCount &&
  getDateTime(prevProps.chat.expiresAt) === getDateTime(nextProps.chat.expiresAt) &&
  getOtherUserSignature(prevProps.chat, prevProps.currentUserId) === getOtherUserSignature(nextProps.chat, nextProps.currentUserId) &&
  getLastMessageSignature(prevProps.chat) === getLastMessageSignature(nextProps.chat)
));
