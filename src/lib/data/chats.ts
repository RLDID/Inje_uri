import type { Chat, ChatLimitInfo, ChatType, Message } from '@/lib/types';
import { currentUser, mockUsers } from './users';

export const CHAT_EXPIRY_WARNING_MINUTES = 60;

export const CHAT_EXPIRY_SESSION_KEYS = {
  inApp: 'chat-expiry:in-app',
  browser: 'chat-expiry:browser',
  roomSystem: 'chat-expiry:room-system',
  bannerDismissed: 'chat-expiry:banner-dismissed',
} as const;

function getMatchStartedMessageContent(chatType: ChatType): string {
  return chatType === 'today'
    ? '매칭이 성사되었어요! 24시간 동안 서로를 알아가 보세요 ✨'
    : '서로 호감을 확인하고 대화가 시작되었어요! 2시간 동안 편하게 이야기해보세요 💬';
}

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

export function createMatchStartedSystemMessage(chatId: string, chatType: ChatType, createdAt: Date): Message {
  return createSystemMessage(chatId, getMatchStartedMessageContent(chatType), createdAt, 'match_started');
}

export function getChatRemainingTime(chat: Chat, now = Date.now()): {
  hours: number;
  minutes: number;
  totalMinutes: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
} {
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

export function getChatExpiryNotificationCopy(chat: Chat) {
  const otherParticipant = getOtherParticipant(chat);
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
): Message {
  return createSystemMessage(
    chat.id,
    getChatExpiryNotificationCopy(chat).systemMessage,
    createdAt,
    'chat_expiring',
  );
}

export function hasSystemMessage(messages: Message[], systemKind: 'match_started' | 'chat_expiring'): boolean {
  return messages.some((message) => message.type === 'system' && message.systemKind === systemKind);
}

function sortMessages(messages: Message[]): Message[] {
  return [...messages].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

function dedupeMessages(messages: Message[]): Message[] {
  const messageMap = new Map<string, Message>();

  sortMessages(messages).forEach((message) => {
    if (!messageMap.has(message.id)) {
      messageMap.set(message.id, message);
    }
  });

  return [...messageMap.values()];
}

function getLatestRenderableMessage(messages: Message[]): Message | undefined {
  const sortedMessages = sortMessages(messages);
  const nonSystemMessages = sortedMessages.filter((message) => message.type !== 'system');
  const latestNonSystemMessage = nonSystemMessages[nonSystemMessages.length - 1];
  const latestMessage = sortedMessages[sortedMessages.length - 1];

  return latestNonSystemMessage ?? latestMessage;
}

export function normalizeChatMessages(
  chat: Pick<Chat, 'id' | 'chatType' | 'createdAt'>,
  messages: Message[],
): Message[] {
  const nextMessages = dedupeMessages(messages);

  if (hasSystemMessage(nextMessages, 'match_started')) {
    return sortMessages(nextMessages);
  }

  return sortMessages([
    createMatchStartedSystemMessage(chat.id, chat.chatType, new Date(new Date(chat.createdAt).getTime() - 1000)),
    ...nextMessages,
  ]);
}

function buildChatExpirySeed(
  id: string,
  chatType: ChatType,
  participants: Chat['participants'],
  unreadCount: number,
  status: Chat['status'],
  createdAt: Date,
  expiresAt: Date,
): Omit<Chat, 'lastMessage'> {
  return {
    id,
    chatType,
    participants,
    unreadCount,
    status,
    createdAt,
    expiresAt,
  };
}

const mockMessages: Message[] = [
  createMatchStartedSystemMessage('chat-1', 'now', new Date(Date.now() - 1000 * 60 * 60 * 2 - 1000)),
  {
    id: 'msg-1',
    chatId: 'chat-1',
    senderId: mockUsers[0].id,
    content: '안녕하세요! 프로필 보고 연락드려요 ㅎㅎ',
    type: 'text',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    isRead: true,
  },
  {
    id: 'msg-2',
    chatId: 'chat-1',
    senderId: currentUser.id,
    content: '안녕하세요~ 반가워요!',
    type: 'text',
    createdAt: new Date(Date.now() - 1000 * 60 * 60),
    isRead: true,
  },
  {
    id: 'msg-3',
    chatId: 'chat-1',
    senderId: mockUsers[0].id,
    content: '뭐하고 계세요? ㅎㅎ',
    type: 'text',
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
    isRead: false,
  },
  createMatchStartedSystemMessage('chat-2', 'today', new Date(Date.now() - 1000 * 60 * 120 - 1000)),
  {
    id: 'msg-4',
    chatId: 'chat-2',
    senderId: mockUsers[1].id,
    content: '오늘 추천에서 봤어요! 취미가 비슷한 것 같아서요',
    type: 'text',
    createdAt: new Date(Date.now() - 1000 * 60 * 120),
    isRead: true,
  },
  {
    id: 'msg-5',
    chatId: 'chat-2',
    senderId: currentUser.id,
    content: '맞아요! 저도 음악 좋아해요',
    type: 'text',
    createdAt: new Date(Date.now() - 1000 * 60 * 90),
    isRead: true,
  },
  {
    id: 'msg-6',
    chatId: 'chat-2',
    senderId: mockUsers[1].id,
    content: '어떤 장르 좋아하세요?',
    type: 'text',
    createdAt: new Date(Date.now() - 1000 * 60 * 60),
    isRead: false,
  },
  createMatchStartedSystemMessage('chat-3', 'now', new Date(Date.now() - 1000 * 60 * 45 - 1000)),
  {
    id: 'msg-7',
    chatId: 'chat-3',
    senderId: mockUsers[2].id,
    content: '지금 학교에 계세요?',
    type: 'text',
    createdAt: new Date(Date.now() - 1000 * 60 * 45),
    isRead: false,
  },
  createMatchStartedSystemMessage('chat-4', 'today', new Date(Date.now() - 1000 * 60 * 180 - 1000)),
  {
    id: 'msg-8',
    chatId: 'chat-4',
    senderId: currentUser.id,
    content: '안녕하세요!',
    type: 'text',
    createdAt: new Date(Date.now() - 1000 * 60 * 180),
    isRead: true,
  },
];

const chatSeeds: Omit<Chat, 'lastMessage'>[] = [
  buildChatExpirySeed(
    'chat-1',
    'now',
    [
      {
        user: currentUser,
        joinedAt: new Date(Date.now() - 1000 * 60 * 30),
        lastReadAt: new Date(Date.now() - 1000 * 60 * 60),
      },
      {
        user: mockUsers[0],
        joinedAt: new Date(Date.now() - 1000 * 60 * 30),
        lastReadAt: new Date(),
      },
    ],
    1,
    'active',
    new Date(Date.now() - 1000 * 60 * 30),
    new Date(Date.now() + 1000 * 60 * 90),
  ),
  buildChatExpirySeed(
    'chat-2',
    'today',
    [
      {
        user: currentUser,
        joinedAt: new Date(Date.now() - 1000 * 60 * 120),
        lastReadAt: new Date(Date.now() - 1000 * 60 * 90),
      },
      {
        user: mockUsers[1],
        joinedAt: new Date(Date.now() - 1000 * 60 * 120),
        lastReadAt: new Date(),
      },
    ],
    1,
    'active',
    new Date(Date.now() - 1000 * 60 * 120),
    new Date(Date.now() + 1000 * 60 * 60 * 22),
  ),
  buildChatExpirySeed(
    'chat-3',
    'now',
    [
      {
        user: currentUser,
        joinedAt: new Date(Date.now() - 1000 * 60 * 45),
        lastReadAt: new Date(Date.now() - 1000 * 60 * 60),
      },
      {
        user: mockUsers[2],
        joinedAt: new Date(Date.now() - 1000 * 60 * 45),
        lastReadAt: new Date(),
      },
    ],
    1,
    'active',
    new Date(Date.now() - 1000 * 60 * 45),
    new Date(Date.now() + 1000 * 60 * 75),
  ),
  buildChatExpirySeed(
    'chat-4',
    'today',
    [
      {
        user: currentUser,
        joinedAt: new Date(Date.now() - 1000 * 60 * 180),
        lastReadAt: new Date(),
      },
      {
        user: mockUsers[3],
        joinedAt: new Date(Date.now() - 1000 * 60 * 180),
        lastReadAt: new Date(),
      },
    ],
    0,
    'active',
    new Date(Date.now() - 1000 * 60 * 180),
    new Date(Date.now() + 1000 * 60 * 60 * 21),
  ),
];

export const mockMessagesByChat: Record<string, Message[]> = Object.fromEntries(
  chatSeeds.map((chatSeed) => [
    chatSeed.id,
    normalizeChatMessages(
      chatSeed,
      mockMessages.filter((message) => message.chatId === chatSeed.id),
    ),
  ]),
);

export const mockChats: Chat[] = chatSeeds.map((chatSeed) => ({
  ...chatSeed,
  lastMessage: getLatestRenderableMessage(mockMessagesByChat[chatSeed.id]),
}));

export function getChatLimitInfo(): ChatLimitInfo {
  const activeChats = mockChats.filter((chat) => chat.status === 'active');
  return {
    currentCount: activeChats.length,
  };
}

export function getChatById(id: string): Chat | undefined {
  return mockChats.find((chat) => chat.id === id);
}

export function getMessagesForChat(chatId: string): Message[] {
  const chat = getChatById(chatId);
  const messages = mockMessagesByChat[chatId] || [];

  return chat ? normalizeChatMessages(chat, messages) : sortMessages(messages);
}

export function getOtherParticipant(chat: Chat): typeof chat.participants[0] | undefined {
  return chat.participants.find((participant) => participant.user.id !== currentUser.id);
}

export function getTotalUnreadCount(): number {
  return mockChats.reduce((sum, chat) => sum + chat.unreadCount, 0);
}

export function isChatExpired(chat: Chat): boolean {
  return getChatRemainingTime(chat).isExpired;
}

export function isChatInExpiryWarningWindow(chat: Chat, now = Date.now()): boolean {
  const { totalMinutes, isExpired } = getChatRemainingTime(chat, now);
  return !isExpired && totalMinutes > 0 && totalMinutes <= CHAT_EXPIRY_WARNING_MINUTES;
}

export function getChatsInExpiryWarningWindow(chats: Chat[] = mockChats, now = Date.now()): Chat[] {
  return chats
    .filter((chat) => chat.status === 'active' && isChatInExpiryWarningWindow(chat, now))
    .sort(
      (left, right) =>
        getChatRemainingTime(left, now).totalMinutes - getChatRemainingTime(right, now).totalMinutes,
    );
}

export function getExistingChatWithUser(userId: string): Chat | undefined {
  return mockChats.find(
    (chat) => chat.status === 'active' && chat.participants.some((participant) => participant.user.id === userId),
  );
}

export type ChatButtonStatus =
  | { type: 'can_create' }
  | { type: 'existing_chat'; chatId: string };

export function getChatButtonStatus(targetUserId: string): ChatButtonStatus {
  const existingChat = getExistingChatWithUser(targetUserId);
  if (existingChat) {
    return { type: 'existing_chat', chatId: existingChat.id };
  }

  return { type: 'can_create' };
}

export function getChatExpirySessionKey(
  channel: keyof typeof CHAT_EXPIRY_SESSION_KEYS,
  chatId: string,
): string {
  return `${CHAT_EXPIRY_SESSION_KEYS[channel]}:${chatId}`;
}
