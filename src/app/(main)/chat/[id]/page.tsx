'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { PageContainer } from '@/components/layout';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { BottomSheet, Button, CenteredModal, useToast } from '@/components/ui';
import {
  createChatExpiringSystemMessage,
  CHAT_UNREAD_REFRESH_EVENT,
  getChatExpirySessionKey,
  getChatRemainingTime,
  normalizeChatMessages,
} from '@/lib/utils/chat';
import {
  getChatMessages,
  getChatRooms,
  leaveChatRoom,
  markChatRoomRead,
  sendChatMessage,
} from '@/lib/api/chat';
import { getMe } from '@/lib/api/profile';
import { blockUser, reportTarget } from '@/lib/api/safety';
import { trackChatOpened } from '@/lib/analytics';
import { PLACEHOLDER_PROFILE_IMAGE } from '@/lib/constants';
import { usePolling } from '@/lib/hooks/usePolling';
import { buildProfileDetailHref, useCurrentRouteContext, useSafeBack } from '@/lib/navigation';
import type { Chat, Message, User } from '@/lib/types';

type ChatAction = 'leave' | 'block' | 'report' | null;
type ChatRoomRestriction = 'reported' | 'blocked' | null;

const CHAT_ROOM_RESTRICTION_PREFIX = 'chat-room:restriction:';
const CHAT_ROOM_REPORTED_PREFIX = 'chat-room:reported:';

function getChatRoomRestrictionKey(chatId: string): string {
  return `${CHAT_ROOM_RESTRICTION_PREFIX}${chatId}`;
}

function getChatRoomReportedKey(chatId: string): string {
  return `${CHAT_ROOM_REPORTED_PREFIX}${chatId}`;
}

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

function removeSessionValue(key: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

function sortMessages(messages: Message[]): Message[] {
  return [...messages].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

function mergeMessagesById(currentMessages: Message[], nextMessages: Message[]): Message[] {
  const messageMap = new Map<string, Message>();

  currentMessages.forEach((message) => {
    messageMap.set(message.id, message);
  });

  nextMessages.forEach((message) => {
    messageMap.set(message.id, message);
  });

  return sortMessages([...messageMap.values()]);
}

function getLastReadableMessage(messages: Message[]): Message | undefined {
  return messages
    .filter((message) => message.type !== 'system')
    .at(-1);
}

function isChatStartedSystemMessage(message: Message): boolean {
  return message.type === 'system' && (message.systemKind === 'match_started' || !message.systemKind);
}

function isNearPageBottom(threshold = 160): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return true;
  }

  const scrollTop = window.scrollY;
  const viewportHeight = window.innerHeight;
  const pageHeight = document.documentElement.scrollHeight;

  return pageHeight - (scrollTop + viewportHeight) <= threshold;
}

function getDateTime(value: Date | string | undefined): number {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getChatShellSignature(chat: Chat | null): string {
  if (!chat) return '';

  const participants = chat.participants
    .map((participant) => `${participant.user.id}:${participant.user.nickname}:${participant.user.profileImages[0] ?? ''}`)
    .join('|');

  return [
    chat.id,
    chat.status,
    chat.blockedByMe === true ? 'blockedByMe' : '',
    chat.chatType,
    getDateTime(chat.createdAt),
    getDateTime(chat.expiresAt),
    participants,
  ].join('::');
}

function isSameUserShell(left: User | null, right: User): boolean {
  return Boolean(
    left &&
      left.id === right.id &&
      left.nickname === right.nickname &&
      left.profileImages[0] === right.profileImages[0],
  );
}

function ChatRoomPageContent() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { currentPath, ownerSection } = useCurrentRouteContext();
  const { goBack } = useSafeBack({ fallbackPath: '/chat' });
  const chatId = params.id as string;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ChatAction>(null);
  const [leaveRoomOnSubmit, setLeaveRoomOnSubmit] = useState(false);
  const [reportDescription, setReportDescription] = useState('');
  const [imgError, setImgError] = useState(false);
  const [roomRestriction, setRoomRestriction] = useState<ChatRoomRestriction>(null);
  const [hasReportedRoom, setHasReportedRoom] = useState(false);
  const [timeInfo, setTimeInfo] = useState({
    hours: 0,
    minutes: 0,
    totalMinutes: 0,
    isExpired: false,
    isExpiringSoon: false,
    timeLabel: '로딩 중...',
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const didInitialScrollRef = useRef(false);
  const trackedChatOpenIdRef = useRef<string | null>(null);
  const lastReadMessageIdRef = useRef<string | null>(null);

  const otherParticipant = currentUser
    ? chat?.participants.find((participant) => participant.user.id !== currentUser.id)
    : undefined;
  const otherUser = otherParticipant?.user;
  const imageSrc = imgError ? PLACEHOLDER_PROFILE_IMAGE : (otherUser?.profileImages[0] || PLACEHOLDER_PROFILE_IMAGE);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    });
  }, []);

  const applyLoadedMessages = useCallback((
    nextMessages: Message[],
    options?: { merge?: boolean; forceScroll?: boolean; smooth?: boolean },
  ) => {
    const shouldScrollAfterLoad = Boolean(options?.forceScroll) || isNearPageBottom();
    const lastMessage = getLastReadableMessage(nextMessages);

    setMessages((prevMessages) => (
      options?.merge ? mergeMessagesById(prevMessages, nextMessages) : nextMessages
    ));

    if (lastMessage && lastReadMessageIdRef.current !== lastMessage.id) {
      const nextReadMessageId = lastMessage.id;
      lastReadMessageIdRef.current = nextReadMessageId;
      void markChatRoomRead(chatId, nextReadMessageId).catch(() => {
        if (lastReadMessageIdRef.current === nextReadMessageId) {
          lastReadMessageIdRef.current = null;
        }
      });
    }

    if (!didInitialScrollRef.current || shouldScrollAfterLoad) {
      didInitialScrollRef.current = true;
      scrollToBottom(options?.smooth === false ? 'auto' : 'smooth');
    }
  }, [chatId, scrollToBottom]);

  const loadRoom = useCallback(async (options?: { silent?: boolean; forceScroll?: boolean }) => {
    const isSilent = Boolean(options?.silent);

    try {
      const me = await getMe();
      const rooms = await getChatRooms(me);
      const room = rooms.find((item) => item.id === chatId) ?? null;
      const shouldHideMessages = room?.blockedByMe === true;
      const roomMessages = room && !shouldHideMessages ? await getChatMessages(chatId) : [];
      const normalizedMessages = room && !shouldHideMessages ? normalizeChatMessages(room, roomMessages) : [];

      setCurrentUser((prevUser) => (isSameUserShell(prevUser, me) ? prevUser : me));
      setChat((prevChat) => (
        getChatShellSignature(prevChat) === getChatShellSignature(room) ? prevChat : room
      ));
      applyLoadedMessages(normalizedMessages, {
        merge: isSilent,
        forceScroll: options?.forceScroll,
        smooth: isSilent,
      });
    } catch {
      if (!isSilent) {
        setCurrentUser(null);
        setChat(null);
        setMessages([]);
      }
    }
  }, [applyLoadedMessages, chatId]);

  const refreshMessages = useCallback(async (options?: { forceScroll?: boolean }) => {
    if (chat?.blockedByMe === true || roomRestriction === 'blocked') {
      return;
    }

    try {
      const roomMessages = await getChatMessages(chatId);
      const normalizedMessages = chat ? normalizeChatMessages(chat, roomMessages) : roomMessages;
      applyLoadedMessages(normalizedMessages, {
        merge: true,
        forceScroll: options?.forceScroll,
      });
    } catch {
      // Keep the current messages during background polling; the next tick can retry.
    }
  }, [applyLoadedMessages, chat, chatId, roomRestriction]);

  usePolling(() => loadRoom({
    silent: didInitialScrollRef.current,
    forceScroll: !didInitialScrollRef.current,
  }), {
    intervalMs: 30000,
    enabled: Boolean(chatId),
    immediate: true,
  });

  usePolling(() => refreshMessages(), {
    intervalMs: 3000,
    enabled: Boolean(chat),
    immediate: false,
  });

  useEffect(() => {
    if (!chat || trackedChatOpenIdRef.current === chat.id) {
      return;
    }

    trackedChatOpenIdRef.current = chat.id;
    const { isExpired } = getChatRemainingTime(chat);
    trackChatOpened({
      chatType: chat.chatType,
      chatStatus: chat.status,
      entrySection: ownerSection,
      isExpired,
    });
  }, [chat, ownerSection]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
    if (!chat) {
      setRoomRestriction(null);
      setHasReportedRoom(false);
      return;
    }

    const storedRestriction = readSessionValue(getChatRoomRestrictionKey(chat.id));
    const storedReported = readSessionValue(getChatRoomReportedKey(chat.id));
    setRoomRestriction(
      chat.blockedByMe === true
        ? 'blocked'
        : storedRestriction === 'reported'
          ? 'reported'
          : null,
    );
    setHasReportedRoom(storedReported === 'true' || storedRestriction === 'reported');
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [chat]);

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

    const timeoutId = window.setTimeout(() => {
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
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [chat, timeInfo.totalMinutes, timeInfo.isExpired]);

  useEffect(() => {
    if (!chat || !roomRestriction || !timeInfo.isExpired) {
      return;
    }

    removeSessionValue(getChatRoomRestrictionKey(chat.id));
    showToast('채팅방 유지 시간이 끝나 목록으로 이동해요.', 'info');
    router.push('/chat');
  }, [chat, roomRestriction, router, showToast, timeInfo.isExpired]);

  if (!currentUser || !chat || !otherUser) {
    return (
      <PageContainer withBottomNav={false}>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-[var(--color-text-secondary)]">채팅방을 찾을 수 없어요.</p>
        </div>
      </PageContainer>
    );
  }

  const { isExpired, isExpiringSoon, timeLabel } = timeInfo;
  const isBlockedByMe = roomRestriction === 'blocked' || chat.blockedByMe === true;
  const isBlockedRoom = isBlockedByMe || chat.status === 'blocked';
  const isRoomRestricted = isBlockedByMe || roomRestriction === 'reported' || chat.status === 'blocked';
  const isChatDisabled = isExpired || isRoomRestricted;

  const openProfileDetail = () => {
    router.push(buildProfileDetailHref(otherUser.id, 'chat', {
      sourcePath: currentPath,
      sourceSection: ownerSection,
      fallbackPath: currentPath,
    }));
  };

  const handleSend = async (content: string) => {
    if (isChatDisabled) {
      return;
    }

    try {
      const newMessage = await sendChatMessage(chatId, content);
      setMessages((prevMessages) => sortMessages([...prevMessages, newMessage]));
      scrollToBottom();
      await refreshMessages({ forceScroll: true });
    } catch (error) {
      showToast(error instanceof Error ? error.message : '메시지를 보내지 못했습니다.', 'error');
    }
  };

  const openConfirm = (action: Exclude<ChatAction, null>) => {
    if (action === 'report' && hasReportedRoom) {
      showToast('이미 신고한 채팅방이에요.', 'info');
      setShowMenu(false);
      return;
    }

    if (roomRestriction === 'blocked' && action === 'block') {
      showToast('이미 차단한 채팅방이에요.', 'info');
      setShowMenu(false);
      return;
    }

    if (roomRestriction === 'reported' && action === 'report') {
      showToast('이미 신고한 채팅방이에요.', 'info');
      setShowMenu(false);
      return;
    }

    setShowMenu(false);
    setLeaveRoomOnSubmit(false);
    setConfirmAction(action);
  };

  const closeConfirm = () => {
    setConfirmAction(null);
    setLeaveRoomOnSubmit(false);
    setReportDescription('');
  };

  const confirmActionHandler = async () => {
    if (confirmAction === 'leave') {
      try {
        await leaveChatRoom(chat.id);
        window.dispatchEvent(new Event(CHAT_UNREAD_REFRESH_EVENT));
        closeConfirm();
        router.push('/chat');
      } catch (error) {
        showToast(error instanceof Error ? error.message : '채팅방을 나가지 못했습니다.', 'error');
      }
      return;
    }

    if (confirmAction === 'block') {
      try {
        await blockUser(otherUser.id);
      } catch (error) {
        showToast(error instanceof Error ? error.message : '차단하지 못했습니다.', 'error');
        return;
      }
      showToast('상대방을 차단했어요.', 'success');
      writeSessionValue(getChatRoomRestrictionKey(chat.id), 'blocked');
      setRoomRestriction('blocked');
      setMessages([]);
      lastReadMessageIdRef.current = null;
      setChat((prevChat) => (
        prevChat
          ? { ...prevChat, blockedByMe: true, unreadCount: 0 }
          : prevChat
      ));
      window.dispatchEvent(new Event(CHAT_UNREAD_REFRESH_EVENT));

      if (leaveRoomOnSubmit) {
        try {
          await leaveChatRoom(chat.id);
        } catch {
          // The block request already succeeded; leaving is optional here.
        }
        closeConfirm();
        router.push('/chat');
        return;
      }

      closeConfirm();
      return;
    }

    if (confirmAction === 'report') {
      const description = reportDescription.trim();
      if (!description) {
        showToast('신고 사유를 입력해주세요.', 'error');
        return;
      }

      try {
        await reportTarget({
          targetType: 'chat_room',
          targetId: chat.id,
          reasonType: 'inappropriate',
          description,
          alsoBlock: false,
        });
      } catch (error) {
        showToast(error instanceof Error ? error.message : '신고하지 못했습니다.', 'error');
        return;
      }

      writeSessionValue(getChatRoomReportedKey(chat.id), 'true');
      setHasReportedRoom(true);
      if (roomRestriction !== 'blocked') {
        writeSessionValue(getChatRoomRestrictionKey(chat.id), 'reported');
        setRoomRestriction('reported');
      }

      showToast('신고가 접수되었고 대화 내역이 함께 제출되었어요.', 'success');

      if (leaveRoomOnSubmit) {
        try {
          await leaveChatRoom(chat.id);
        } catch {
          // Reporting already succeeded; leaving is optional here.
        }
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
          description: '차단하면 이 채팅방에서 메시지를 볼 수 없고 보낼 수 없어요. 상대방에게 차단 사실은 표시되지 않아요.',
          confirmText: '차단하기',
          showLeaveCheckbox: true,
        };
      case 'report':
        return {
          title: '이 사용자를 신고할까요?',
          description: '운영팀이 확인할 수 있게 신고 사유를 적어주세요. 대화 내역도 함께 제출돼요.',
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
        <div className="mx-auto flex min-h-[76px] max-w-[430px] items-center gap-1.5 px-2.5 py-3 sm:gap-2 sm:px-4">
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
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
        </div>
      </header>

      <div className={`${isChatDisabled ? 'pb-[calc(var(--nav-height)+var(--spacing-safe-bottom)+24px)]' : 'pb-[calc(var(--nav-height)+var(--spacing-safe-bottom)+0px)]'} pt-[76px]`}>
        <div className="flex flex-col items-center py-6">
          <div className="relative h-[112px] w-[184px]">
            <div className="absolute left-4 top-0 h-20 w-20 overflow-hidden rounded-full border-[3px] border-white bg-[var(--color-surface-secondary)] shadow-[0_4px_12px_rgba(34,34,34,0.12)]">
              <Image
                src={currentUser.profileImages[0] || PLACEHOLDER_PROFILE_IMAGE}
                alt="내 프로필"
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute right-4 top-0 h-20 w-20 overflow-hidden rounded-full border-[3px] border-white bg-[var(--color-surface-secondary)] shadow-[0_4px_12px_rgba(34,34,34,0.12)]">
              <Image
                src={imageSrc}
                alt={otherUser.nickname}
                width={80}
                height={80}
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            </div>
            <div className="absolute left-1/2 top-[36px] z-30 flex -translate-x-1/2 items-center justify-center">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" className="text-[#FF6FA0] drop-shadow-[0_3px_4px_rgba(255,111,160,0.34)]" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <Image
              src="/brand/bear-hero-face2.png"
              alt=""
              width={82}
              height={82}
              priority
              className="pointer-events-none absolute left-1/2 top-[58px] z-20 h-[62px] w-[62px] -translate-x-1/2 object-contain drop-shadow-[0_3px_6px_rgba(34,34,34,0.12)]"
            />
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
            .filter((message) => !isChatStartedSystemMessage(message))
            .map((message) => (
              <ChatBubble key={message.id} message={message} currentUserId={currentUser.id} />
            ))}
          {isBlockedRoom && (
            <div className="my-5 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-surface-secondary)] px-4 py-2 text-[13px] font-semibold text-[var(--color-text-secondary)] shadow-[0_3px_8px_rgba(34,34,34,0.055)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M15 9 9 15M9 9l6 6" />
                </svg>
                {isBlockedByMe ? '차단한 사용자입니다' : '대화가 제한되었어요'}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {!isChatDisabled && (
        <div className="fixed bottom-[calc(78px+var(--spacing-safe-bottom)+0px)] left-0 right-0 z-[110] bg-[var(--color-surface)]">
        <div className="pointer-events-none absolute left-0 right-0 top-full h-[calc(78px+var(--spacing-safe-bottom))] bg-[var(--color-surface)]" aria-hidden="true" />
        <div className="mx-auto max-w-[430px]">
          <ChatInput
            onSend={handleSend}
            disabled={false}
            placeholder={isExpired ? '대화 시간이 만료되었어요' : '메시지를 입력해보세요...'}
          />
        </div>
        </div>
      )}

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
            className="w-full px-6 py-4 text-left text-[var(--color-error)] transition-colors hover:bg-[var(--color-error-bg)]"
          >
            신고하기
          </button>
          <button
            type="button"
            onClick={() => openConfirm('block')}
            className="w-full px-6 py-4 text-left text-[var(--color-error)] transition-colors hover:bg-[var(--color-error-bg)]"
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

            {confirmAction === 'report' && (
              <div className="mb-5">
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

            {confirmConfig.showLeaveCheckbox && (
              <label className="mb-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-3">
                <input
                  type="checkbox"
                  checked={leaveRoomOnSubmit}
                  onChange={(event) => setLeaveRoomOnSubmit(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-pink-cta)] focus:ring-[var(--color-focus)]"
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
              <Button
                onClick={confirmActionHandler}
                variant={confirmAction === 'leave' ? 'primary' : 'danger'}
                size="md"
                fullWidth
                disabled={confirmAction === 'report' && !reportDescription.trim()}
              >
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
