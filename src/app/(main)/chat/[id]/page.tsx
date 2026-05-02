'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { PageContainer } from '@/components/layout';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { BottomSheet, Button, CenteredModal, useToast } from '@/components/ui';
import {
  createChatExpiringSystemMessage,
  currentUser,
  getChatById,
  getChatExpirySessionKey,
  getChatRemainingTime,
  getMessagesForChat,
} from '@/lib/data';
import { PLACEHOLDER_PROFILE_IMAGE } from '@/lib/constants';
import { buildProfileDetailHref, useCurrentRouteContext, useSafeBack } from '@/lib/navigation';
import type { Message } from '@/lib/types';

type ChatAction = 'leave' | 'block' | 'report' | null;

function readSessionValue(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionValue(key: string, value: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Ignore storage failures and keep the room usable.
  }
}

function sortMessages(messages: Message[]): Message[] {
  return [...messages].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

function ChatRoomPageContent() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { currentPath, ownerSection } = useCurrentRouteContext();
  const { goBack } = useSafeBack({ fallbackPath: '/chat' });
  const chatId = params.id as string;

  const chat = useMemo(() => getChatById(chatId), [chatId]);
  const initialMessages = useMemo(() => getMessagesForChat(chatId), [chatId]);

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ChatAction>(null);
  const [leaveRoomOnSubmit, setLeaveRoomOnSubmit] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [timeInfo, setTimeInfo] = useState({
    hours: 0,
    minutes: 0,
    totalMinutes: 0,
    isExpired: false,
    isExpiringSoon: false,
    timeLabel: '로딩 중...',
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherParticipant = chat?.participants.find((participant) => participant.user.id !== currentUser.id);
  const otherUser = otherParticipant?.user;
  const imageSrc = imgError ? PLACEHOLDER_PROFILE_IMAGE : (otherUser?.profileImages[0] || PLACEHOLDER_PROFILE_IMAGE);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (!chat) {
      return;
    }

    const updateTimeInfo = () => {
      const { hours, minutes, totalMinutes, isExpired, isExpiringSoon } = getChatRemainingTime(chat);
      const timeLabel = isExpired
        ? '만료됨'
        : hours > 0
          ? `${hours}시간 ${minutes}분 남음`
          : `${minutes}분 남음`;

      setTimeInfo({ hours, minutes, totalMinutes, isExpired, isExpiringSoon, timeLabel });
    };

    updateTimeInfo();
    const interval = window.setInterval(updateTimeInfo, 60000);

    return () => {
      window.clearInterval(interval);
    };
  }, [chat]);

  useEffect(() => {
    if (!chat) {
      return;
    }

    const { totalMinutes, isExpired } = getChatRemainingTime(chat);
    if (isExpired || totalMinutes <= 0 || totalMinutes > 60) {
      return;
    }

    const roomSystemKey = getChatExpirySessionKey('roomSystem', chat.id);

    setMessages((prevMessages) => {
      if (prevMessages.some((message) => message.type === 'system' && message.systemKind === 'chat_expiring')) {
        return prevMessages;
      }

      const storedCreatedAt = readSessionValue(roomSystemKey);
      const createdAt = storedCreatedAt ? new Date(storedCreatedAt) : new Date();

      if (!storedCreatedAt) {
        writeSessionValue(roomSystemKey, createdAt.toISOString());
      }

      return sortMessages([...prevMessages, createChatExpiringSystemMessage(chat, createdAt)]);
    });
  }, [chat, timeInfo.totalMinutes, timeInfo.isExpired]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!chat || !otherUser) {
    return (
      <PageContainer withBottomNav={false}>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-[var(--color-text-secondary)]">채팅방을 찾을 수 없어요.</p>
        </div>
      </PageContainer>
    );
  }

  const { isExpired, isExpiringSoon, timeLabel } = timeInfo;

  const openProfileDetail = () => {
    router.push(buildProfileDetailHref(otherUser.id, 'chat', {
      sourcePath: currentPath,
      sourceSection: ownerSection,
      fallbackPath: currentPath,
    }));
  };

  const handleSend = (content: string) => {
    if (isExpired) {
      return;
    }

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      chatId,
      senderId: currentUser.id,
      content,
      type: 'text',
      createdAt: new Date(),
      isRead: false,
    };

    setMessages((prevMessages) => sortMessages([...prevMessages, newMessage]));
  };

  const openConfirm = (action: Exclude<ChatAction, null>) => {
    setShowMenu(false);
    setLeaveRoomOnSubmit(false);
    setConfirmAction(action);
  };

  const closeConfirm = () => {
    setConfirmAction(null);
    setLeaveRoomOnSubmit(false);
  };

  const confirmActionHandler = () => {
    if (confirmAction === 'leave') {
      closeConfirm();
      router.push('/chat');
      return;
    }

    if (confirmAction === 'block') {
      showToast('상대방을 차단했어요.', 'success');

      if (leaveRoomOnSubmit) {
        closeConfirm();
        router.push('/chat');
        return;
      }

      closeConfirm();
      return;
    }

    if (confirmAction === 'report') {
      showToast('신고가 접수되었고 대화 내역이 함께 제출되었어요.', 'success');

      if (leaveRoomOnSubmit) {
        closeConfirm();
        router.push('/chat');
        return;
      }

      closeConfirm();
      return;
    }

    closeConfirm();
  };

  const getActionConfig = (action: ChatAction) => {
    switch (action) {
      case 'leave':
        return {
          title: '채팅방을 나가시겠어요?',
          description: '나가면 대화 내용은 삭제되고 복구할 수 없어요.',
          confirmText: '나가기',
          showLeaveCheckbox: false,
        };
      case 'block':
        return {
          title: '이 사용자를 차단할까요?',
          description: '차단하면 이후 메시지를 주고받을 수 없어요. 필요하면 채팅방 나가기도 함께 선택할 수 있어요.',
          confirmText: '차단하기',
          showLeaveCheckbox: true,
        };
      case 'report':
        return {
          title: '이 사용자를 신고할까요?',
          description: '신고하면 대화 내역이 자동으로 함께 제출돼요. 필요하면 채팅방 나가기도 함께 선택할 수 있어요.',
          confirmText: '신고하기',
          showLeaveCheckbox: true,
        };
      default:
        return {
          title: '',
          description: '',
          confirmText: '',
          showLeaveCheckbox: false,
        };
    }
  };

  const confirmConfig = confirmAction ? getActionConfig(confirmAction) : null;

  return (
    <PageContainer withBottomNav={true}>
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex min-h-14 max-w-[430px] items-center gap-1.5 px-2.5 py-2 sm:gap-2 sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-text-secondary)]"
              aria-label="이전으로"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <button
              type="button"
              onClick={openProfileDetail}
              className={`h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[var(--color-surface-secondary)] transition-transform active:scale-[0.98] sm:h-9 sm:w-9 ${isExpired ? 'opacity-50' : ''}`}
              aria-label={`${otherUser.nickname} 프로필 보기`}
            >
              <Image
                src={imageSrc}
                alt={otherUser.nickname}
                width={36}
                height={36}
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            </button>

            <div className="min-w-0 flex-1 pr-1">
              <p className={`truncate text-[15px] leading-5 font-semibold ${isExpired ? 'text-[var(--color-text-tertiary)]' : 'text-[var(--color-text-primary)]'}`}>
                {otherUser.nickname}
              </p>
              <p
                className={`truncate text-[11px] leading-4 ${
                  isExpired
                    ? 'text-[var(--color-time-expired)]'
                    : isExpiringSoon
                      ? 'text-[var(--color-time-expiring)]'
                      : 'text-[var(--color-time-normal)]'
                }`}
              >
                {timeLabel}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowMenu(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-text-secondary)]"
            aria-label="채팅 옵션 열기"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="6" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="18" r="2" />
            </svg>
          </button>
        </div>
      </header>

      <div className="pb-[48px] pt-14">
        <div className="flex flex-col items-center py-6">
          <div className="flex items-center">
            <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-white bg-[var(--color-surface-secondary)] shadow-md">
              <Image
                src={currentUser.profileImages[0] || PLACEHOLDER_PROFILE_IMAGE}
                alt="내 프로필"
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="-ml-4 h-16 w-16 overflow-hidden rounded-full border-2 border-white bg-[var(--color-surface-secondary)] shadow-md">
              <Image
                src={imageSrc}
                alt={otherUser.nickname}
                width={64}
                height={64}
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold text-[var(--color-text-primary)]">축하합니다</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">특별한 우리들의 대화가 시작되었어요</p>
        </div>

        {isExpired && (
          <div className="border-b border-[var(--color-border)] bg-[var(--color-time-expired-bg)] px-4 py-3">
            <div className="flex items-center justify-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-time-expired)]">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <p className="text-sm font-medium text-[var(--color-time-expired)]">대화 시간이 만료되었어요</p>
            </div>
            <p className="mt-1 text-center text-xs text-[var(--color-time-expired)]">더 이상 메시지를 보낼 수 없어요.</p>
          </div>
        )}

        <div className="px-4 pt-4">
          {messages
            .filter((message) => !(message.type === 'system' && message.systemKind === 'match_started'))
            .map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="fixed bottom-[60px] left-0 right-0 z-40 bg-[var(--color-surface)]">
        <div className="mx-auto max-w-[430px]">
          <ChatInput
            onSend={handleSend}
            disabled={isExpired}
            placeholder={isExpired ? '대화 시간이 만료되었어요' : '메시지를 입력해보세요...'}
          />
        </div>
      </div>

      <CenteredModal isOpen={showMenu} onClose={() => setShowMenu(false)}>
        <div className="py-2">
          <button
            type="button"
            onClick={() => openConfirm('leave')}
            className="w-full px-6 py-4 text-left text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-secondary)]"
          >
            채팅방 나가기
          </button>
          <button
            type="button"
            onClick={() => openConfirm('report')}
            className="w-full px-6 py-4 text-left text-red-500 transition-colors hover:bg-red-50"
          >
            신고하기
          </button>
          <button
            type="button"
            onClick={() => openConfirm('block')}
            className="w-full px-6 py-4 text-left text-red-500 transition-colors hover:bg-red-50"
          >
            차단하기
          </button>
        </div>
      </CenteredModal>

      {confirmConfig && (
        <BottomSheet isOpen={true} onClose={closeConfirm}>
          <div className="p-6 pt-2">
            <h3 className="mb-2 text-center text-lg font-semibold tracking-[-0.02em]">{confirmConfig.title}</h3>
            {confirmConfig.description && (
              <p className="mb-4 text-center text-sm leading-6 text-[var(--color-text-secondary)]">
                {confirmConfig.description}
              </p>
            )}

            {confirmConfig.showLeaveCheckbox && (
              <label className="mb-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-3">
                <input
                  type="checkbox"
                  checked={leaveRoomOnSubmit}
                  onChange={(event) => setLeaveRoomOnSubmit(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">채팅방도 함께 나가기</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">
                    체크하면 제출 후 채팅 목록으로 이동해요.
                  </p>
                </div>
              </label>
            )}

            <div className="flex flex-col gap-2">
              <Button onClick={confirmActionHandler} variant={confirmAction === 'leave' ? 'primary' : 'danger'} size="md" fullWidth>
                {confirmConfig.confirmText}
              </Button>
              <Button onClick={closeConfirm} variant="secondary" size="md" fullWidth>
                취소
              </Button>
            </div>
          </div>
        </BottomSheet>
      )}
    </PageContainer>
  );
}

export default function ChatRoomPage() {
  return (
    <Suspense fallback={<PageContainer withBottomNav={false}><div /></PageContainer>}>
      <ChatRoomPageContent />
    </Suspense>
  );
}
