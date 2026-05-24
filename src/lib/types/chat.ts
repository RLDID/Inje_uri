import type { User } from './user';

// 채팅 유형: 오늘 우리(24시간) vs 지금 우리(2시간)
export type ChatType = 'today' | 'now';

export interface Chat {
  id: string;
  participants: ChatParticipant[];
  lastMessage?: Message;
  unreadCount: number;
  status: ChatStatus;
  blockedByMe?: boolean;
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
export type PlaceSuggestionStatus = 'pending' | 'accepted' | 'dismissed';

// 채팅방 제한 제거됨 - 무제한 채팅 가능
export interface ChatLimitInfo {
  currentCount: number;
}

export interface ChatRoomListItemDto {
  roomId: number;
  status: 'active' | 'expired' | 'blocked' | 'closed';
  isBlocked: boolean;
  blockedByMe: boolean;
  createdAt: string;
  expiresAt: string;
  otherUser: {
    userId: number;
    nickname: string;
    profileImage: string | null;
  } | null;
  lastMessage: {
    id: number;
    content: string;
    type: string;
    senderUserId: number;
    createdAt: string;
  } | null;
  unreadCount: number;
}

export interface PlaceCategory {
  id: string;
  code: string;
  name: string;
}

export interface PlaceTag {
  id: string;
  tag: string;
}

export interface Place {
  id: string;
  name: string;
  address: string;
  imageUrl: string | null;
  description: string | null;
  category: PlaceCategory;
  tags: PlaceTag[];
}

export interface ChatPlaceSuggestion {
  id: string;
  roomId: string;
  placeId: string;
  triggeredKeyword: string | null;
  status: PlaceSuggestionStatus;
  suggestedAt: Date;
  place: Place;
}
