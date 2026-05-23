import type { Chat, ChatType, Message } from '@/lib/types';

export const CHAT_EXPIRY_WARNING_MINUTES = 60;
export const CHAT_UNREAD_REFRESH_EVENT = 'injeuri:chat-unread-refresh';

export const CHAT_EXPIRY_SESSION_KEYS = {
  inApp: 'chat-expiry:in-app',
  roomSystem: 'chat-expiry:room-system',
  bannerDismissed: 'chat-expiry:banner-dismissed',
} as const;

function createSystemMessage(
  chatId: string,
  content: string,
  createdAt: Date,
  systemKind: 'match_started' | 'chat_expiring',
): Message {
  return {
    id: `system-${chatId}-${systemKind}`,
    chatId,
    senderId: 'system',
    content,
    type: 'system',
    systemKind,
    createdAt,
    isRead: true,
  };
}

function getMatchStartedMessageContent(chatType: ChatType): string {
  return chatType === 'today'
    ? '매칭이 성사되었어요! 24시간 동안 서로를 알아가 보세요.'
    : '서로 관심을 확인하고 대화가 시작되었어요! 2시간 동안 편하게 이야기해보세요.';
}

export function createMatchStartedSystemMessage(chatId: string, chatType: ChatType, createdAt: Date): Message {
  return createSystemMessage(chatId, getMatchStartedMessageContent(chatType), createdAt, 'match_started');
}

export function getChatRemainingTime(chat: Chat, now = Date.now()) {
  const remaining = new Date(chat.expiresAt).getTime() - now;

  if (remaining <= 0) {
    return {
      hours: 0,
      minutes: 0,
      totalMinutes: 0,
      isExpired: true,
      isExpiringSoon: false,
    };
  }

  const totalMinutes = Math.floor(remaining / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    hours,
    minutes,
    totalMinutes,
    isExpired: false,
    isExpiringSoon: totalMinutes <= CHAT_EXPIRY_WARNING_MINUTES,
  };
}

export function formatChatRemainingLabel(totalMinutes: number): string {
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`;
  }

  return `${totalMinutes}분`;
}

export function getOtherParticipant(chat: Chat, currentUserId: string) {
  return chat.participants.find((participant) => participant.user.id !== currentUserId);
}

export function getChatExpiryNotificationCopy(chat: Chat, currentUserId?: string) {
  const otherParticipant = currentUserId ? getOtherParticipant(chat, currentUserId) : chat.participants[1];
  const partnerName = otherParticipant?.user.nickname ?? '상대방';
  const { totalMinutes } = getChatRemainingTime(chat);
  const remainingLabel = formatChatRemainingLabel(totalMinutes);

  return {
    title: `${partnerName}님과의 대화가 곧 종료돼요`,
    body: `${remainingLabel} 뒤에 채팅이 종료됩니다. 필요한 이야기는 지금 마무리해보세요.`,
    toastMessage: `${partnerName}님과의 채팅이 ${remainingLabel} 뒤 종료돼요.`,
    bannerTitle: '대화 종료 1시간 전',
    bannerBody: `${partnerName}님과의 채팅이 ${remainingLabel} 뒤 종료돼요. 지금 확인해보세요.`,
    systemMessage: '대화가 곧 종료돼요. 필요한 이야기는 지금 마무리해보세요.',
  };
}

export function createChatExpiringSystemMessage(
  chat: Chat,
  createdAt = new Date(),
  currentUserId?: string,
): Message {
  return createSystemMessage(
    chat.id,
    getChatExpiryNotificationCopy(chat, currentUserId).systemMessage,
    createdAt,
    'chat_expiring',
  );
}

export function normalizeChatMessages(
  chat: Pick<Chat, 'id' | 'chatType' | 'createdAt'>,
  messages: Message[],
): Message[] {
  const messageMap = new Map<string, Message>();
  [...messages]
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
    .forEach((message) => {
      if (!messageMap.has(message.id)) {
        messageMap.set(message.id, message);
      }
    });

  const nextMessages = [...messageMap.values()];
  if (nextMessages.some((message) => message.type === 'system' && message.systemKind === 'match_started')) {
    return nextMessages;
  }

  return [
    createMatchStartedSystemMessage(chat.id, chat.chatType, new Date(new Date(chat.createdAt).getTime() - 1000)),
    ...nextMessages,
  ];
}

export function isChatInExpiryWarningWindow(chat: Chat, now = Date.now()): boolean {
  const { totalMinutes, isExpired } = getChatRemainingTime(chat, now);
  return !isExpired && totalMinutes > 0 && totalMinutes <= CHAT_EXPIRY_WARNING_MINUTES;
}

export function getChatsInExpiryWarningWindow(chats: Chat[], now = Date.now()): Chat[] {
  return chats
    .filter((chat) => chat.status === 'active' && isChatInExpiryWarningWindow(chat, now))
    .sort(
      (left, right) =>
        getChatRemainingTime(left, now).totalMinutes - getChatRemainingTime(right, now).totalMinutes,
    );
}

export function getChatExpirySessionKey(
  channel: keyof typeof CHAT_EXPIRY_SESSION_KEYS,
  chatId: string,
): string {
  return `${CHAT_EXPIRY_SESSION_KEYS[channel]}:${chatId}`;
}
