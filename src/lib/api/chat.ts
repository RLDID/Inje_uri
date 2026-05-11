import { apiGet, apiPatch, apiPost } from '@/lib/api/client';
import { mapChatListItem, mapChatMessage, type ChatMessageDto } from '@/lib/api/mappers';
import type { Chat, ChatRoomListItemDto, Message, User } from '@/lib/types';

export async function getChatRooms(currentUser: User | null, tab: 'all' | 'unread' = 'all'): Promise<Chat[]> {
  const query = tab === 'unread' ? '?tab=unread' : '';
  const data = await apiGet<{ rooms: ChatRoomListItemDto[] }>(`/api/chat-room${query}`);
  return data.rooms.map((room) => mapChatListItem(room, currentUser));
}

export async function getChatRoom(roomId: string | number) {
  return apiGet(`/api/chat-room/${roomId}`);
}

export async function getChatMessages(roomId: string | number, cursor?: string | number, limit = 30): Promise<Message[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', String(cursor));
  const data = await apiGet<{ messages: ChatMessageDto[] }>(`/api/chat-room/${roomId}/messages?${params.toString()}`);
  return [...data.messages].reverse().map((message) => mapChatMessage(message, String(roomId)));
}

export async function sendChatMessage(roomId: string | number, content: string): Promise<Message> {
  const data = await apiPost<{ message: ChatMessageDto }>(`/api/chat-room/${roomId}/messages`, { content });
  return mapChatMessage(data.message, String(roomId));
}

export async function markChatRoomRead(roomId: string | number, lastReadMessageId: string | number) {
  return apiPost(`/api/chat-room/${roomId}/read`, { lastReadMessageId: Number(lastReadMessageId) });
}

export async function leaveChatRoom(roomId: string | number) {
  return apiPatch(`/api/chat-room/${roomId}/leave`);
}

export async function blockChatRoom(roomId: string | number) {
  return apiPatch(`/api/chat-room/${roomId}/block`);
}
