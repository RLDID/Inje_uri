import type { User } from './user';

// 채팅 유형: 오늘 우리(24시간) vs 지금 우리(2시간)
export type ChatType = 'today' | 'now';

export interface Chat {
  id: string;
  participants: ChatParticipant[];
  lastMessage?: Message;
  unreadCount: number;
  status: ChatStatus;
  chatType: ChatType; // 채팅 유형 추가
  createdAt: Date;
  expiresAt: Date;
}

export interface ChatParticipant {
  user: User;
  joinedAt: Date;
  lastReadAt: Date;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: MessageType;
  systemKind?: SystemMessageKind;
  createdAt: Date;
  isRead: boolean;
}

export type MessageType = 'text' | 'image' | 'system';
export type SystemMessageKind = 'match_started' | 'chat_expiring';
export type ChatStatus = 'active' | 'expired' | 'blocked';

// 채팅방 제한 제거됨 - 무제한 채팅 가능
export interface ChatLimitInfo {
  currentCount: number;
}